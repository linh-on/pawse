#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include <LiquidCrystal.h>
#include <ESP32Servo.h>

#include "session_core.h"

const int LCD_RS = 19, LCD_EN = 18, LCD_D4 = 23, LCD_D5 = 22, LCD_D6 = 21, LCD_D7 = 5;
const int SERVO_PIN = 25;
const int YES_PIN = 32;
const int NO_PIN = 33;

const int LOCKED_ANGLE = 0;
const int UNLOCKED_ANGLE = 90;

#define SERVICE_UUID "12345678-1234-1234-1234-123456789abc"
#define STATUS_CHAR_UUID "abcd0001-1234-1234-1234-123456789abc"
#define COMMAND_CHAR_UUID "abcd0002-1234-1234-1234-123456789abc"

const int LCD_COLS = 16;
const int LCD_ROWS = 2;
const unsigned long SCROLL_DELAY_MS = 350;
const unsigned long SCROLL_INITIAL_PAUSE_MS = 1200;

const size_t CMD_MAX_LEN = 128;
const int CMD_QUEUE_LEN = 8;

struct Command {
  char text[CMD_MAX_LEN];
};

class LockController : public ILock {
public:
  LockController(int pin, int lockedAngle, int unlockedAngle)
    : _pin(pin), _lockedAngle(lockedAngle), _unlockedAngle(unlockedAngle), _locked(false) {}

  void begin() {
    _servo.attach(_pin);
    unlock();
  }

  void lock() override { _servo.write(_lockedAngle); _locked = true; settle(); }
  void unlock() override { _servo.write(_unlockedAngle); _locked = false; settle(); }

  bool isLocked() const override { return _locked; }

private:
  void settle() { delay(500); }

  Servo _servo;
  int _pin;
  int _lockedAngle;
  int _unlockedAngle;
  bool _locked;
};

class DisplayController : public IDisplay {
public:
  DisplayController(int rs, int en, int d4, int d5, int d6, int d7)
    : _lcd(rs, en, d4, d5, d6, d7), _scrollPos(0), _lastScrollTime(0), _scrollActive(false) {}

  void begin() { _lcd.begin(LCD_COLS, LCD_ROWS); }

  void reset() override { _lcd.begin(LCD_COLS, LCD_ROWS); }

  void show(const char* line1, const char* line2) override {
    String a(line1);
    String b(line2);
    while (a.length() < LCD_COLS) a += " ";
    while (b.length() < LCD_COLS) b += " ";
    _lcd.setCursor(0, 0); _lcd.print(a.substring(0, LCD_COLS));
    _lcd.setCursor(0, 1); _lcd.print(b.substring(0, LCD_COLS));
  }

  void startScroll(const char* msg) override {
    String text(msg);
    _scrollPos = 0;
    _lastScrollTime = millis();

    _lcd.setCursor(0, 0);
    _lcd.print("URGENT ALERT!   ");
    _lcd.setCursor(0, 1);
    _lcd.print("                ");
    _lcd.setCursor(0, 1);

    if (text.length() <= LCD_COLS) {
      _lcd.print(text);
      _scrollActive = false;
    } else {
      _lcd.print(text.substring(0, LCD_COLS));
      _scrollText = text + "    ";
      _scrollActive = true;
    }
  }

  void tickScroll() override {
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

  void stopScroll() override {
    _scrollActive = false;
    _scrollPos = 0;
  }

private:
  LiquidCrystal _lcd;
  String _scrollText;
  int _scrollPos;
  unsigned long _lastScrollTime;
  bool _scrollActive;
};

class BleTransport : public IStatusSink {
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
    _statusChar->addDescriptor(new BLE2902());
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

  void send(const char* json) override {
    if (!_connected || !_statusChar) return;
    _statusChar->setValue(json);
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
    _connected = connected;
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
      BLEDevice::startAdvertising();
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
  QueueHandle_t _queue;
  volatile bool _connected;
  volatile bool _connectionChanged;
  volatile unsigned long _dropped;
};

hw_timer_t* secondTimer = nullptr;
portMUX_TYPE tickMux = portMUX_INITIALIZER_UNLOCKED;
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

LockController lockBox(SERVO_PIN, LOCKED_ANGLE, UNLOCKED_ANGLE);
DisplayController display(LCD_RS, LCD_EN, LCD_D4, LCD_D5, LCD_D6, LCD_D7);
BleTransport ble;

SessionCore core(lockBox, display, ble);

ButtonId readButton() {
  if (digitalRead(YES_PIN) == LOW) return BUTTON_YES;
  if (digitalRead(NO_PIN)  == LOW) return BUTTON_NO;
  return BUTTON_NONE;
}

void setup() {
  Serial.begin(115200);

  lockBox.begin();

  pinMode(YES_PIN, INPUT_PULLUP);
  pinMode(NO_PIN,  INPUT_PULLUP);

  display.begin();
  delay(500);
  display.show(" PawseBuddy   ", "Starting BLE...");

  ble.begin("PawseBuddy");
  startSecondTimer();
  core.begin();

  Serial.println("BLE advertising as 'PawseBuddy'");
  display.show(" PawseBuddy   ", "Waiting for BLE");
}

void loop() {
  unsigned long now = millis();

  Command cmd;
  while (ble.pollCommand(cmd)) {
    Serial.print("BLE CMD -> ");
    Serial.println(cmd.text);
    core.handleCommand(cmd.text, millis());
  }

  if (ble.consumeConnectionChange()) {
    Serial.println(ble.isConnected() ? "BLE: Phone connected" : "BLE: Phone disconnected");
    core.onConnectionChange(ble.isConnected());
  }

  core.update(now);
  core.onButton(readButton(), now);

  if (consumeTick()) {
    core.onSecondTick(now);
  }
}
