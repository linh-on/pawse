#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include <LiquidCrystal.h>
#include <ESP32Servo.h>

const int LCD_RS = 19, LCD_EN = 18, LCD_D4 = 23, LCD_D5 = 22, LCD_D6 = 21, LCD_D7 = 5;
const int SERVO_PIN = 25;
const int YES_PIN   = 32;
const int NO_PIN    = 33;


const int LOCKED_ANGLE   = 0;
const int UNLOCKED_ANGLE = 90;


#define SERVICE_UUID  "12345678-1234-1234-1234-123456789abc"
#define STATUS_CHAR_UUID  "abcd0001-1234-1234-1234-123456789abc"
#define COMMAND_CHAR_UUID "abcd0002-1234-1234-1234-123456789abc"


const int LCD_COLS = 16;
const int LCD_ROWS = 2;
const unsigned long SCROLL_DELAY_MS         = 350;
const unsigned long SCROLL_INITIAL_PAUSE_MS = 1200;


const size_t CMD_MAX_LEN   = 128;
const int    CMD_QUEUE_LEN = 8;

struct Command {
  char text[CMD_MAX_LEN];
};

class LockController {
public:
  LockController(int pin, int lockedAngle, int unlockedAngle)
    : _pin(pin), _lockedAngle(lockedAngle), _unlockedAngle(unlockedAngle), _locked(false) {}

  void begin() {
    _servo.attach(_pin);
    unlock();
  }

  void lock()   { _servo.write(_lockedAngle);   _locked = true;  settle(); }
  void unlock() { _servo.write(_unlockedAngle); _locked = false; settle(); }

  bool isLocked() const { return _locked; }

private:
  void settle() { delay(500); }

  Servo _servo;
  int   _pin;
  int   _lockedAngle;
  int   _unlockedAngle;
  bool  _locked;
};

class DisplayController {
public:
  DisplayController(int rs, int en, int d4, int d5, int d6, int d7)
    : _lcd(rs, en, d4, d5, d6, d7), _scrollPos(0), _lastScrollTime(0), _scrollActive(false) {}

  void begin() { _lcd.begin(LCD_COLS, LCD_ROWS); }
  void reset() { _lcd.begin(LCD_COLS, LCD_ROWS); }

  void show(String line1, String line2) {
    while (line1.length() < LCD_COLS) line1 += " ";
    while (line2.length() < LCD_COLS) line2 += " ";
    _lcd.setCursor(0, 0); _lcd.print(line1.substring(0, LCD_COLS));
    _lcd.setCursor(0, 1); _lcd.print(line2.substring(0, LCD_COLS));
  }

  void showCountdown(long remainingSecs) {
    show("Focus Session", formatTime(remainingSecs) + " LOCKED");
  }

  void startScroll(const String& msg) {
    _scrollPos      = 0;
    _lastScrollTime = millis();

    _lcd.setCursor(0, 0);
    _lcd.print("URGENT ALERT!   ");
    _lcd.setCursor(0, 1);
    _lcd.print("                ");
    _lcd.setCursor(0, 1);

    if (msg.length() <= LCD_COLS) {
      _lcd.print(msg);
      _scrollActive = false;
    } else {
      _lcd.print(msg.substring(0, LCD_COLS));
      _scrollText   = msg + "    ";
      _scrollActive = true;
    }
  }

  void tickScroll() {
    if (!_scrollActive) return;

    unsigned long now = millis();
    unsigned long waitFor = (_scrollPos == 0) ? SCROLL_INITIAL_PAUSE_MS : SCROLL_DELAY_MS;
    if (now - _lastScrollTime < waitFor) return;

    _lastScrollTime = now;
    _scrollPos++;
    if (_scrollPos >= (int)_scrollText.length()) _scrollPos = 0;

    _lcd.setCursor(0, 1);
    for (int i = 0; i < LCD_COLS; i++) {
      int idx = (_scrollPos + i) % _scrollText.length();
      _lcd.print(_scrollText.charAt(idx));
    }
  }

  void stopScroll() {
    _scrollActive = false;
    _scrollPos    = 0;
  }

  static String formatTime(long secs) {
    if (secs < 0) secs = 0;
    char buf[8];
    sprintf(buf, "%02ld:%02ld", secs / 60, secs % 60);
    return String(buf);
  }

private:
  LiquidCrystal _lcd;
  String        _scrollText;
  int           _scrollPos;
  unsigned long _lastScrollTime;
  bool          _scrollActive;
};



class BleTransport {
public:
  BleTransport()
    : _statusChar(nullptr), _commandChar(nullptr),
      _queue(nullptr), _connected(false), _connectionChanged(false), _dropped(0) {}

  void begin(const char* deviceName) {
    _queue = xQueueCreate(CMD_QUEUE_LEN, sizeof(Command));

    BLEDevice::init(deviceName);
    BLEDevice::setMTU(517);

    BLEServer* server = BLEDevice::createServer();
    server->setCallbacks(new ServerCallbacks(this));

    BLEService* service = server->createService(SERVICE_UUID);

    _statusChar = service->createCharacteristic(
      STATUS_CHAR_UUID,
      BLECharacteristic::PROPERTY_READ | BLECharacteristic::PROPERTY_NOTIFY
    );
    _statusChar->addDescriptor(new BLE2902());   // required for notifications
    _statusChar->setValue("{\"s\":\"I\",\"r\":\"00:00\"}");

    _commandChar = service->createCharacteristic(
      COMMAND_CHAR_UUID,
      BLECharacteristic::PROPERTY_WRITE
    );
    _commandChar->setCallbacks(new CommandCallbacks(this));

    service->start();

    BLEAdvertising* advertising = BLEDevice::getAdvertising();
    advertising->addServiceUUID(SERVICE_UUID);
    advertising->setScanResponse(true);
    advertising->setMinPreferred(0x06);
    BLEDevice::startAdvertising();
  }

  bool pollCommand(Command& out) {
    if (!_queue) return false;
    return xQueueReceive(_queue, &out, 0) == pdTRUE;
  }

  void sendStatus(const String& json) {
    if (!_connected || !_statusChar) return;
    _statusChar->setValue(json.c_str());
    _statusChar->notify();
  }

  bool isConnected() const { return _connected; }
  bool consumeConnectionChange() {
    if (!_connectionChanged) return false;
    _connectionChanged = false;
    return true;
  }

  unsigned long droppedCommands() const { return _dropped; }

private:
  void pushCommand(const String& text) {
    Command cmd;
    text.toCharArray(cmd.text, CMD_MAX_LEN);
    if (xQueueSend(_queue, &cmd, 0) != pdTRUE) {
      _dropped++;   
    }
  }

  void setConnected(bool connected) {
    _connected         = connected;
    _connectionChanged = true;
  }

  class ServerCallbacks : public BLEServerCallbacks {
  public:
    explicit ServerCallbacks(BleTransport* owner) : _owner(owner) {}

    void onConnect(BLEServer*) override {
      _owner->setConnected(true);
    }

    void onDisconnect(BLEServer*) override {
      _owner->setConnected(false);
      BLEDevice::startAdvertising();   // let the phone reconnect
    }

  private:
    BleTransport* _owner;
  };

  class CommandCallbacks : public BLECharacteristicCallbacks {
  public:
    explicit CommandCallbacks(BleTransport* owner) : _owner(owner) {}

    void onWrite(BLECharacteristic* chr) override {
      String value = chr->getValue().c_str();
      if (value.length() > 0) _owner->pushCommand(value);
    }

  private:
    BleTransport* _owner;
  };

  BLECharacteristic* _statusChar;
  BLECharacteristic* _commandChar;
  QueueHandle_t      _queue;
  volatile bool      _connected;
  volatile bool      _connectionChanged;
  volatile unsigned long _dropped;
};


hw_timer_t*   secondTimer = nullptr;
portMUX_TYPE  tickMux     = portMUX_INITIALIZER_UNLOCKED;
volatile bool tickPending = false;

void IRAM_ATTR onSecondTick() {
  portENTER_CRITICAL_ISR(&tickMux);
  tickPending = true;
  portEXIT_CRITICAL_ISR(&tickMux);
}

bool consumeTick() {
  bool fired = false;
  portENTER_CRITICAL(&tickMux);
  if (tickPending) {
    tickPending = false;
    fired = true;
  }
  portEXIT_CRITICAL(&tickMux);
  return fired;
}

void startSecondTimer() {
#if ESP_ARDUINO_VERSION_MAJOR >= 3
  secondTimer = timerBegin(1000000);                 
  timerAttachInterrupt(secondTimer, &onSecondTick);
  timerAlarm(secondTimer, 1000000, true, 0);          
#else
  secondTimer = timerBegin(0, 80, true);              
  timerAttachInterrupt(secondTimer, &onSecondTick, true);
  timerAlarmWrite(secondTimer, 1000000, true);
  timerAlarmEnable(secondTimer);
#endif
}


enum State { IDLE, LOCKED, URGENT, RESUME, DONE };

LockController    lockBox(SERVO_PIN, LOCKED_ANGLE, UNLOCKED_ANGLE);
DisplayController display(LCD_RS, LCD_EN, LCD_D4, LCD_D5, LCD_D6, LCD_D7);
BleTransport      ble;

State         state           = IDLE;
unsigned long sessionEnd      = 0;
unsigned long resumeRemaining = 0;
String        urgentMsg       = "";

unsigned long lastDebounce = 0;
const unsigned long DEBOUNCE_MS = 300;

long remainingSecs() {
  return max(0L, (long)(sessionEnd - millis()) / 1000);
}

String buildStatusJson() {
  long rem = 0;
  if (state == LOCKED || state == URGENT)      rem = remainingSecs();
  else if (state == RESUME)                    rem = (long)(resumeRemaining / 1000);

  // Single-char state codes match STATE_MAP in usePawseBox.js
  char s;
  switch (state) {
    case IDLE:   s = 'I'; break;
    case LOCKED: s = 'L'; break;
    case URGENT: s = 'U'; break;
    case RESUME: s = 'R'; break;
    default:     s = 'D'; break;
  }

  String json = "{\"s\":\"";
  json += s;
  json += "\",\"r\":\"";
  json += DisplayController::formatTime(rem);
  json += "\"}";
  return json;
}

void notifyStatus() {
  ble.sendStatus(buildStatusJson());
}

String cleanLCDText(const String& text) {
  String output = "";
  for (unsigned int i = 0; i < text.length(); i++) {
    char c = text.charAt(i);
    if (c >= 32 && c <= 126) output += c;
  }
  output.trim();
  return output;
}

void showResumePrompt() {
  String remStr = DisplayController::formatTime(resumeRemaining / 1000);
  display.reset();
  display.show("Continue? Y/N", remStr + " left");
}

void endSession() {
  display.stopScroll();
  urgentMsg = "";
  state = DONE;
  lockBox.unlock();
  display.reset();
  display.show("  Session End ", "  Good work!  ");
}

void handleCommand(const String& raw) {
  int    colon   = raw.indexOf(':');
  String verb    = (colon > 0) ? raw.substring(0, colon) : raw;
  String payload = (colon > 0) ? raw.substring(colon + 1) : "";
  verb.trim();
  payload.trim();

  Serial.println("BLE CMD -> " + verb + " | " + payload);

  if (verb == "start") {
    int minutes = payload.toInt();
    if (minutes > 0) {
      sessionEnd = millis() + (unsigned long)minutes * 60000UL;
      state      = LOCKED;
      urgentMsg  = "";
      lockBox.lock();
      display.reset();
      display.showCountdown(remainingSecs());
    }
  }
  else if (verb == "urgent" && state == LOCKED) {
    urgentMsg = cleanLCDText(payload).substring(0, 80);
    state     = URGENT;
    display.startScroll(urgentMsg);
  }
  else if (verb == "respond") {
    display.stopScroll();
    urgentMsg = "";
    if (payload == "yes") {
      resumeRemaining = (sessionEnd > millis()) ? (sessionEnd - millis()) : 0;
      lockBox.unlock();
      state = RESUME;
      showResumePrompt();
    } else {
      state = LOCKED;
      display.showCountdown(remainingSecs());
    }
  }
  else if (verb == "resume") {
    // payload may be "yes" or "yes:1823" (seconds from the app)
    if (payload.startsWith("yes")) {
      int secondColon = payload.indexOf(':');
      if (secondColon > 0) {
        unsigned long appSecs = payload.substring(secondColon + 1).toInt();
        if (appSecs > 0) resumeRemaining = appSecs * 1000UL;
      }
      sessionEnd = millis() + resumeRemaining;
      urgentMsg  = "";
      lockBox.lock();
      state = LOCKED;
      display.reset();
      display.showCountdown(remainingSecs());
    } else {
      endSession();
    }
  }
  else if (verb == "end") {
    endSession();
  }
  else if (verb == "pause") {
    int secs = payload.toInt();
    resumeRemaining = (secs > 0)
      ? (unsigned long)secs * 1000UL
      : ((sessionEnd > millis()) ? (sessionEnd - millis()) : 0);
    urgentMsg = "";
    lockBox.unlock();
    state = RESUME;
    showResumePrompt();
  }

  notifyStatus();   // push new status after any command
}

int readButton(unsigned long now) {
  if (now - lastDebounce <= DEBOUNCE_MS) return -1;

  if (digitalRead(YES_PIN) == LOW) { lastDebounce = now; return YES_PIN; }
  if (digitalRead(NO_PIN)  == LOW) { lastDebounce = now; return NO_PIN;  }
  return -1;
}



void setup() {
  Serial.begin(115200);

  lockBox.begin();     // starts unlocked

  pinMode(YES_PIN, INPUT_PULLUP);
  pinMode(NO_PIN,  INPUT_PULLUP);

  display.begin();
  delay(500);
  display.show(" PawseBuddy   ", "Starting BLE...");

  ble.begin("PawseBuddy");
  startSecondTimer();

  Serial.println("BLE advertising as 'PawseBuddy'");
  display.show(" PawseBuddy   ", "Waiting for BLE");
}

void loop() {
  unsigned long now = millis();

  Command cmd;
  while (ble.pollCommand(cmd)) {
    handleCommand(String(cmd.text));
  }

  if (ble.consumeConnectionChange()) {
    if (ble.isConnected()) {
      Serial.println("BLE: Phone connected");
      if (state == IDLE || state == DONE)
        display.show(" PawseBuddy   ", " Phone linked  ");
    } else {
      Serial.println("BLE: Phone disconnected");
      if (state == IDLE || state == DONE)
        display.show(" PawseBuddy   ", "Waiting for BLE");
    }
  }

  if (state == LOCKED && now >= sessionEnd) {
    lockBox.unlock();
    state = DONE;
    display.show("  Times Up!   ", "  Unlocked!   ");
    notifyStatus();
  }

  if (state == URGENT) {
    display.tickScroll();
  }

  if (state == URGENT || state == RESUME) {
    int pressed = readButton(now);

    if (state == URGENT && pressed == YES_PIN) {
      display.stopScroll();
      urgentMsg = "";
      resumeRemaining = (sessionEnd > millis()) ? (sessionEnd - millis()) : 0;
      lockBox.unlock();
      state = RESUME;
      showResumePrompt();
      notifyStatus();
    }
    else if (state == URGENT && pressed == NO_PIN) {
      display.stopScroll();
      urgentMsg = "";
      state = LOCKED;
      display.showCountdown(remainingSecs());
      notifyStatus();
    }
    else if (state == RESUME && pressed == YES_PIN) {
      sessionEnd = millis() + resumeRemaining;
      urgentMsg  = "";
      lockBox.lock();
      state = LOCKED;
      display.showCountdown(remainingSecs());
      notifyStatus();
    }
    else if (state == RESUME && pressed == NO_PIN) {
      state = DONE;
      display.show("  Session End ", "  Good work!  ");
      notifyStatus();
    }
  }

  if (consumeTick()) {
    if (state == LOCKED) {
      display.showCountdown(remainingSecs());
    }
    notifyStatus();
  }
}
