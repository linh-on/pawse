/*
 *  PawseBuddy — BLE version
 *  ESP32-DevKitV1 · Arduino IDE
 *
 *  Replaces the WiFi-AP + WebServer communication layer with BLE.
 *  All servo / LCD / button / state-machine logic is unchanged.
 *
 *  BLE design
 *  ──────────
 *  Service UUID:        "12345678-1234-1234-1234-123456789abc"
 *  STATUS  characteristic (Read + Notify):
 *        UUID "abcd0001-1234-1234-1234-123456789abc"
 *        Value = JSON string identical to old /status response
 *        Notified every ~1 s so the phone stays in sync.
 *
 *  COMMAND characteristic (Write):
 *        UUID "abcd0002-1234-1234-1234-123456789abc"
 *        Write a UTF-8 string in the format   VERB:payload
 *          start:30          → start 30-minute session
 *          urgent:Mom called → send urgent message
 *          respond:yes       → unlock (or respond:no to dismiss)
 *          resume:yes        → re-lock & continue (or resume:no to end)
 *
 *  Board:   "ESP32 Dev Module" in Arduino IDE
 *  Library: ESP32 BLE Arduino (bundled with the ESP32 board package)
 */

#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include <LiquidCrystal.h>
#include <ESP32Servo.h>

// ── Pins ─────────────────────────────────────────────────
LiquidCrystal lcd(19, 18, 23, 22, 21, 5);
const int SERVO_PIN = 25;
const int YES_PIN   = 32;
const int NO_PIN    = 33;

// ── Servo angles ─────────────────────────────────────────
const int LOCKED_ANGLE   = 0;
const int UNLOCKED_ANGLE = 90;

// ── BLE UUIDs ────────────────────────────────────────────
#define SERVICE_UUID        "12345678-1234-1234-1234-123456789abc"
#define STATUS_CHAR_UUID    "abcd0001-1234-1234-1234-123456789abc"
#define COMMAND_CHAR_UUID   "abcd0002-1234-1234-1234-123456789abc"

BLECharacteristic *pStatusChar = nullptr;
BLECharacteristic *pCommandChar = nullptr;
bool deviceConnected = false;

Servo lockServo;

// ── State (unchanged) ────────────────────────────────────
enum State { IDLE, LOCKED, URGENT, RESUME, DONE };
State state = IDLE;

unsigned long sessionEnd      = 0;
String        urgentMsg       = "";
unsigned long lastLCDRefresh  = 0;
unsigned long lastDebounce    = 0;
const unsigned long DEBOUNCE_MS = 300;
unsigned long resumeRemaining = 0;

// ── LCD Scroll State (unchanged) ─────────────────────────
#define LCD_COLS 16
#define SCROLL_DELAY_MS 350
#define SCROLL_INITIAL_PAUSE_MS 1200

String scrollText = "";
int scrollPos = 0;
unsigned long lastScrollTime = 0;
bool scrollActive = false;

void startScroll(const String& msg) {
  scrollPos = 0;
  lastScrollTime = millis();
  lcd.setCursor(0, 0);
  lcd.print("URGENT ALERT!   ");
  lcd.setCursor(0, 1);
  lcd.print("                ");
  lcd.setCursor(0, 1);
  if (msg.length() <= LCD_COLS) {
    lcd.print(msg);
    scrollActive = false;
  } else {
    lcd.print(msg.substring(0, LCD_COLS));
    scrollText = msg + "    ";
    scrollActive = true;
  }
}

void tickScroll() {
  if (!scrollActive) return;
  unsigned long now = millis();
  unsigned long d = (scrollPos == 0) ? SCROLL_INITIAL_PAUSE_MS : SCROLL_DELAY_MS;
  if (now - lastScrollTime < d) return;
  lastScrollTime = now;
  scrollPos++;
  if (scrollPos >= (int)scrollText.length()) scrollPos = 0;
  lcd.setCursor(0, 1);
  for (int i = 0; i < LCD_COLS; i++) {
    int idx = (scrollPos + i) % scrollText.length();
    lcd.print(scrollText.charAt(idx));
  }
}

void stopScroll() {
  scrollActive = false;
  scrollPos = 0;
}

// ── Helpers (unchanged) ──────────────────────────────────
void setLock(bool unlock) {
  lockServo.write(unlock ? UNLOCKED_ANGLE : LOCKED_ANGLE);
  delay(500);
}

void lcdShow(String line1, String line2) {
  while (line1.length() < 16) line1 += " ";
  while (line2.length() < 16) line2 += " ";
  lcd.setCursor(0, 0); lcd.print(line1.substring(0, 16));
  lcd.setCursor(0, 1); lcd.print(line2.substring(0, 16));
}

String formatTime(long secs) {
  if (secs < 0) secs = 0;
  char buf[8];
  sprintf(buf, "%02ld:%02ld", secs / 60, secs % 60);
  return String(buf);
}

void refreshCountdown() {
  long rem = max(0L, (long)(sessionEnd - millis()) / 1000);
  lcdShow("Focus Session", formatTime(rem) + " LOCKED");
}

// ── Build the status JSON (same format as old /status) ───
String buildStatusJson() {
  long rem = 0;
  if (state == LOCKED || state == URGENT)
    rem = max(0L, (long)(sessionEnd - millis()) / 1000);
  else if (state == RESUME)
    rem = (long)(resumeRemaining / 1000);

  // Single-char state codes match STATE_MAP in usePawseBox.js
  char s;
  switch (state) {
    case IDLE:   s = 'I'; break;
    case LOCKED: s = 'L'; break;
    case URGENT: s = 'U'; break;
    case RESUME: s = 'R'; break;
    default:     s = 'D'; break;
  }

  // Short keys: {"s":"L","r":"30:47","u":""}
  // Max length ~40 bytes — fits comfortably in default MTU
  String json = "{\"s\":\"";
  json += s;
  json += "\",\"r\":\"";
  json += formatTime(rem);
  json += "\",\"u\":\"";
  json += urgentMsg;
  json += "\"}";
  return json;
}

// ── Notify the phone of the current status ───────────────
unsigned long lastNotify = 0;
const unsigned long NOTIFY_INTERVAL_MS = 1000;

void notifyStatus() {
  if (!deviceConnected || !pStatusChar) return;
  String json = buildStatusJson();
  pStatusChar->setValue(json.c_str());
  pStatusChar->notify();
}

// ── Command handler (replaces HTTP handlers) ─────────────
// Format: "verb:payload"   e.g. "start:30" or "respond:yes"
void handleCommand(const String& raw) {
  int colon = raw.indexOf(':');
  String verb    = (colon > 0) ? raw.substring(0, colon) : raw;
  String payload = (colon > 0) ? raw.substring(colon + 1) : "";
  verb.trim();
  payload.trim();

  Serial.println("BLE CMD → " + verb + " | " + payload);

  if (verb == "start") {
    int m = payload.toInt();
    if (m > 0) {
      sessionEnd = millis() + (unsigned long)m * 60000UL;
      state = LOCKED;
      setLock(false);
      urgentMsg = "";
      lcd.begin(16, 2);
      refreshCountdown();
    }
  }
  else if (verb == "urgent" && state == LOCKED) {
    urgentMsg = payload.substring(0, 20);  // ← cap here
    state = URGENT;
    startScroll(urgentMsg);
  }
  else if (verb == "respond") {
    if (payload == "yes") {
      stopScroll();
      resumeRemaining = (sessionEnd > millis()) ? (sessionEnd - millis()) : 0;
      setLock(true);
      state = RESUME;
      String remStr = formatTime(resumeRemaining / 1000);
      lcd.begin(16, 2); 
      lcdShow("Continue? Y/N ", remStr + " left");
    } else {
      stopScroll();
      state = LOCKED;
      urgentMsg = "";
      refreshCountdown();
    }
  }
  else if (verb == "resume") {
    // payload may be "yes" or "yes:1823" (seconds from app)
    bool doResume = payload.startsWith("yes");
    if (doResume) {
      // Check for optional :seconds suffix sent by the app
      int secondColon = payload.indexOf(':');
      if (secondColon > 0) {
        unsigned long appSecs = payload.substring(secondColon + 1).toInt();
        if (appSecs > 0) resumeRemaining = appSecs * 1000UL;
      }
      sessionEnd = millis() + resumeRemaining;
      setLock(false);
      state = LOCKED;
      urgentMsg = "";
      refreshCountdown();
    } else {
      state = DONE;
      lcdShow("  Session End ", "  Good work!  ");
    }
  }
  else if (verb == "pause") {
    int secs = payload.toInt();
    resumeRemaining = (secs > 0)
      ? (unsigned long)secs * 1000UL
      : ((sessionEnd > millis()) ? (sessionEnd - millis()) : 0);
    setLock(true);                            // unlock the box
    state = RESUME;
    String remStr = formatTime(resumeRemaining / 1000);
    lcd.begin(16, 2);
    lcdShow("Continue? Y/N ", remStr + " left");
  }

  // Immediately push new status after any command
  notifyStatus();
}

// ── BLE Callbacks ────────────────────────────────────────
class ServerCallbacks : public BLEServerCallbacks {
  void onConnect(BLEServer* pServer) override {
    deviceConnected = true;
    Serial.println("BLE: Phone connected");
    lcdShow(" PawseBuddy   ", " Phone linked  ");
  }
  void onDisconnect(BLEServer* pServer) override {
    deviceConnected = false;
    Serial.println("BLE: Phone disconnected");
    // Restart advertising so phone can reconnect
    BLEDevice::startAdvertising();
    if (state == IDLE || state == DONE)
      lcdShow(" PawseBuddy   ", "Waiting for BLE");
  }
};

class CommandCallbacks : public BLECharacteristicCallbacks {
  void onWrite(BLECharacteristic *pChar) override {
    String value = pChar->getValue().c_str();
    if (value.length() > 0) {
      handleCommand(value);
    }
  }
};

// ── Setup ────────────────────────────────────────────────
void setup() {
  Serial.begin(115200);

  lockServo.attach(SERVO_PIN);
  setLock(true);  // start unlocked

  pinMode(YES_PIN, INPUT_PULLUP);
  pinMode(NO_PIN,  INPUT_PULLUP);

  lcd.begin(16, 2);
  delay(500);
  lcdShow(" PawseBuddy   ", "Starting BLE...");

  // ── Initialize BLE ──
  BLEDevice::init("PawseBuddy");
  BLEDevice::setMTU(517);
  BLEServer *pServer = BLEDevice::createServer();
  pServer->setCallbacks(new ServerCallbacks());

  BLEService *pService = pServer->createService(SERVICE_UUID);

  // STATUS — read + notify
  pStatusChar = pService->createCharacteristic(
    STATUS_CHAR_UUID,
    BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY
  );
  pStatusChar->addDescriptor(new BLE2902());  // required for notifications
  pStatusChar->setValue("{\"state\":\"IDLE\",\"remaining\":\"00:00\",\"urgentMsg\":\"\"}");

  // COMMAND — write
  pCommandChar = pService->createCharacteristic(
    COMMAND_CHAR_UUID,
    BLECharacteristic::PROPERTY_WRITE
  );
  pCommandChar->setCallbacks(new CommandCallbacks());

  pService->start();

  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(true);
  pAdvertising->setMinPreferred(0x06);
  BLEDevice::startAdvertising();

  Serial.println("BLE advertising as 'PawseBuddy'");
  lcdShow(" PawseBuddy   ", "Waiting for BLE");
}

// ── Loop (hardware logic unchanged) ──────────────────────
void loop() {
  unsigned long now = millis();

  // Timer expired → auto unlock
  if (state == LOCKED && now >= sessionEnd) {
    setLock(true);
    state = DONE;
    lcdShow("  Times Up!   ", "  Unlocked!   ");
    notifyStatus();
  }

  // Scroll the urgent message on the LCD
  if (state == URGENT) {
    tickScroll();
  }

  // Physical YES/NO buttons — URGENT state
  if (state == URGENT && now - lastDebounce > DEBOUNCE_MS) {
    if (digitalRead(YES_PIN) == LOW) {
      lastDebounce = now;
      stopScroll();
      resumeRemaining = (sessionEnd > millis()) ? (sessionEnd - millis()) : 0;
      setLock(true);
      state = RESUME;
      String remStr = formatTime(resumeRemaining / 1000);
      lcd.begin(16, 2);
      lcdShow("Continue? Y/N", remStr + " left");
      notifyStatus();
    } else if (digitalRead(NO_PIN) == LOW) {
      lastDebounce = now;
      stopScroll();
      state = LOCKED;
      urgentMsg = "";
      refreshCountdown();
      notifyStatus();
    }
  }

  // Physical YES/NO buttons — RESUME state
  if (state == RESUME && now - lastDebounce > DEBOUNCE_MS) {
    if (digitalRead(YES_PIN) == LOW) {
      lastDebounce = now;
      sessionEnd = millis() + resumeRemaining;
      setLock(false);
      state = LOCKED;
      urgentMsg = "";
      refreshCountdown();
      notifyStatus();
    } else if (digitalRead(NO_PIN) == LOW) {
      lastDebounce = now;
      state = DONE;
      lcdShow("  Session End ", "  Good work!  ");
      notifyStatus();
    }
  }

  // Refresh LCD countdown every second
  if (state == LOCKED && now - lastLCDRefresh >= 1000) {
    lastLCDRefresh = now;
    refreshCountdown();
  }

  // Push status notification every second so phone stays in sync
  if (now - lastNotify >= NOTIFY_INTERVAL_MS) {
    lastNotify = now;
    notifyStatus();
  }
}
