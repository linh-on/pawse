#pragma once

#include <stddef.h>
#include <stdint.h>

#include "hardware_interfaces.h"

enum SessionState {
  STATE_IDLE,
  STATE_LOCKED,
  STATE_URGENT,
  STATE_RESUME,
  STATE_DONE
};

enum ButtonId {
  BUTTON_NONE,
  BUTTON_YES,
  BUTTON_NO
};

class SessionCore {
public:
  static const uint32_t DEBOUNCE_MS = 300;
  static const size_t URGENT_MAX_LEN = 80;
  static const size_t VERB_MAX_LEN = 16;
  static const size_t PAYLOAD_MAX_LEN = 128;
  static const size_t STATUS_JSON_MAX_LEN = 40;

  SessionCore(ILock& lock, IDisplay& display, IStatusSink& status);

  void begin();

  void handleCommand(const char* raw, uint32_t now);
  void onButton(ButtonId button, uint32_t now);
  void onSecondTick(uint32_t now);
  void update(uint32_t now);
  void onConnectionChange(bool connected);

  SessionState state() const { return _state; }
  const char* urgentMessage() const { return _urgentMsg; }
  int32_t remainingSecs(uint32_t now) const;
  void buildStatusJson(char* out, size_t outLen, uint32_t now) const;

  static void formatTime(int32_t secs, char* out);
  static void sanitizeLcdText(const char* in, char* out, size_t outLen);

private:
  void showCountdown(uint32_t now);
  void showResumePrompt();
  void endSession();
  void notifyStatus(uint32_t now);
  void clearUrgent();

  ILock& _lock;
  IDisplay& _display;
  IStatusSink& _status;

  SessionState _state;
  uint32_t _sessionEnd;
  uint32_t _resumeRemaining;
  uint32_t _lastDebounce;
  char _urgentMsg[URGENT_MAX_LEN + 1];
};
