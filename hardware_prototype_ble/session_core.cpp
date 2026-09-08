#include "session_core.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>

namespace {

bool isPrintableAscii(char c) {
  return c >= 32 && c <= 126;
}

void trimInto(const char* src, size_t srcLen, char* out, size_t outLen) {
  if (outLen == 0) return;

  size_t start = 0;
  while (start < srcLen && (src[start] == ' ' || src[start] == '\t')) start++;

  size_t end = srcLen;
  while (end > start && (src[end - 1] == ' ' || src[end - 1] == '\t')) end--;

  size_t n = end - start;
  if (n > outLen - 1) n = outLen - 1;

  memcpy(out, src + start, n);
  out[n] = '\0';
}

void splitCommand(const char* raw,
                  char* verb, size_t verbLen,
                  char* payload, size_t payloadLen) {
  verb[0] = '\0';
  payload[0] = '\0';

  size_t rawLen = strlen(raw);
  const char* colon = strchr(raw, ':');

  if (colon != NULL && colon != raw) {
    trimInto(raw, (size_t)(colon - raw), verb, verbLen);
    trimInto(colon + 1, rawLen - (size_t)(colon - raw) - 1, payload, payloadLen);
  } else {
    trimInto(raw, rawLen, verb, verbLen);
  }
}

}

SessionCore::SessionCore(ILock& lock, IDisplay& display, IStatusSink& status)
    : _lock(lock), _display(display), _status(status),
      _state(STATE_IDLE), _sessionEnd(0), _resumeRemaining(0),
      _lastDebounce(0) {
  _urgentMsg[0] = '\0';
}

void SessionCore::begin() {
  _state = STATE_IDLE;
  _sessionEnd = 0;
  _resumeRemaining = 0;
  clearUrgent();
}

void SessionCore::clearUrgent() {
  _urgentMsg[0] = '\0';
}

int32_t SessionCore::remainingSecs(uint32_t now) const {
  int32_t delta = (int32_t)(_sessionEnd - now) / 1000;
  return delta < 0 ? 0 : delta;
}

void SessionCore::formatTime(int32_t secs, char* out) {
  if (secs < 0) secs = 0;
  if (secs > MAX_DISPLAY_SECS) secs = MAX_DISPLAY_SECS;
  snprintf(out, TIME_STR_LEN, "%02ld:%02ld", (long)(secs / 60), (long)(secs % 60));
}

void SessionCore::sanitizeLcdText(const char* in, char* out, size_t outLen) {
  if (outLen == 0) return;
  if (in == NULL) {
    out[0] = '\0';
    return;
  }

  char filtered[PAYLOAD_MAX_LEN + 1];
  size_t n = 0;
  for (size_t i = 0; in[i] != '\0' && n < sizeof(filtered) - 1; i++) {
    if (isPrintableAscii(in[i])) filtered[n++] = in[i];
  }
  filtered[n] = '\0';

  trimInto(filtered, n, out, outLen);
}

void SessionCore::buildStatusJson(char* out, size_t outLen, uint32_t now) const {
  int32_t rem = 0;
  if (_state == STATE_LOCKED || _state == STATE_URGENT) {
    rem = remainingSecs(now);
  } else if (_state == STATE_RESUME) {
    rem = (int32_t)(_resumeRemaining / 1000);
  }

  char code;
  switch (_state) {
    case STATE_IDLE: code = 'I'; break;
    case STATE_LOCKED: code = 'L'; break;
    case STATE_URGENT: code = 'U'; break;
    case STATE_RESUME: code = 'R'; break;
    default: code = 'D'; break;
  }

  char timeStr[TIME_STR_LEN];
  formatTime(rem, timeStr);
  snprintf(out, outLen, "{\"s\":\"%c\",\"r\":\"%s\"}", code, timeStr);
}

void SessionCore::notifyStatus(uint32_t now) {
  char json[STATUS_JSON_MAX_LEN];
  buildStatusJson(json, sizeof(json), now);
  _status.send(json);
}

void SessionCore::showCountdown(uint32_t now) {
  char timeStr[TIME_STR_LEN];
  formatTime(remainingSecs(now), timeStr);

  char line2[24];
  snprintf(line2, sizeof(line2), "%s LOCKED", timeStr);
  _display.show("Focus Session", line2);
}

void SessionCore::showResumePrompt() {
  char timeStr[TIME_STR_LEN];
  formatTime((int32_t)(_resumeRemaining / 1000), timeStr);

  char line2[24];
  snprintf(line2, sizeof(line2), "%s left", timeStr);
  _display.reset();
  _display.show("Continue? Y/N", line2);
}

void SessionCore::endSession() {
  _display.stopScroll();
  clearUrgent();
  _state = STATE_DONE;
  _lock.unlock();
  _display.reset();
  _display.show("  Session End ", "  Good work!  ");
}

void SessionCore::handleCommand(const char* raw, uint32_t now) {
  if (raw == NULL) return;

  char verb[VERB_MAX_LEN];
  char payload[PAYLOAD_MAX_LEN];
  splitCommand(raw, verb, sizeof(verb), payload, sizeof(payload));

  if (strcmp(verb, "start") == 0) {
    int minutes = atoi(payload);
    if (minutes > 0 && minutes <= MAX_SESSION_MINUTES) {
      _sessionEnd = now + (uint32_t)minutes * 60000UL;
      _state = STATE_LOCKED;
      clearUrgent();
      _lock.lock();
      _display.reset();
      showCountdown(now);
    }
  } else if (strcmp(verb, "urgent") == 0 && _state == STATE_LOCKED) {
    sanitizeLcdText(payload, _urgentMsg, sizeof(_urgentMsg));
    _state = STATE_URGENT;
    _display.startScroll(_urgentMsg);
  } else if (strcmp(verb, "respond") == 0 && _state == STATE_URGENT) {
    _display.stopScroll();
    clearUrgent();
    if (strcmp(payload, "yes") == 0) {
      _resumeRemaining = (_sessionEnd > now) ? (_sessionEnd - now) : 0;
      _lock.unlock();
      _state = STATE_RESUME;
      showResumePrompt();
    } else {
      _state = STATE_LOCKED;
      showCountdown(now);
    }
  } else if (strcmp(verb, "resume") == 0) {

    if (strncmp(payload, "yes", 3) == 0) {
      const char* secondColon = strchr(payload, ':');
      if (secondColon != NULL && secondColon != payload) {
        long appSecs = atol(secondColon + 1);
        if (appSecs > 0 && appSecs <= (long)MAX_SESSION_MINUTES * 60) {
          _resumeRemaining = (uint32_t)appSecs * 1000UL;
        }
      }
      _sessionEnd = now + _resumeRemaining;
      clearUrgent();
      _lock.lock();
      _state = STATE_LOCKED;
      _display.reset();
      showCountdown(now);
    } else {
      endSession();
    }
  } else if (strcmp(verb, "end") == 0) {
    endSession();
  } else if (strcmp(verb, "pause") == 0 &&
             (_state == STATE_LOCKED || _state == STATE_URGENT)) {
    int secs = atoi(payload);
    _resumeRemaining = (secs > 0) ? (uint32_t)secs * 1000UL
                                : ((_sessionEnd > now) ? (_sessionEnd - now) : 0);
    clearUrgent();
    _lock.unlock();
    _state = STATE_RESUME;
    showResumePrompt();
  }

  notifyStatus(now);
}

void SessionCore::onButton(ButtonId button, uint32_t now) {
  if (button == BUTTON_NONE) return;
  if (_state != STATE_URGENT && _state != STATE_RESUME) return;
  if (now - _lastDebounce <= DEBOUNCE_MS) return;
  _lastDebounce = now;

  if (_state == STATE_URGENT && button == BUTTON_YES) {
    _display.stopScroll();
    clearUrgent();
    _resumeRemaining = (_sessionEnd > now) ? (_sessionEnd - now) : 0;
    _lock.unlock();
    _state = STATE_RESUME;
    showResumePrompt();
    notifyStatus(now);
  } else if (_state == STATE_URGENT && button == BUTTON_NO) {
    _display.stopScroll();
    clearUrgent();
    _state = STATE_LOCKED;
    showCountdown(now);
    notifyStatus(now);
  } else if (_state == STATE_RESUME && button == BUTTON_YES) {
    _sessionEnd = now + _resumeRemaining;
    clearUrgent();
    _lock.lock();
    _state = STATE_LOCKED;
    showCountdown(now);
    notifyStatus(now);
  } else if (_state == STATE_RESUME && button == BUTTON_NO) {
    _state = STATE_DONE;
    _display.show("  Session End ", "  Good work!  ");
    notifyStatus(now);
  }
}

void SessionCore::update(uint32_t now) {
  if (_state == STATE_LOCKED && now >= _sessionEnd) {
    _lock.unlock();
    _state = STATE_DONE;
    _display.show("  Times Up!   ", "  Unlocked!   ");
    notifyStatus(now);
  }

  if (_state == STATE_URGENT) {
    _display.tickScroll();
  }
}

void SessionCore::onSecondTick(uint32_t now) {
  if (_state == STATE_LOCKED) {
    showCountdown(now);
  }
  notifyStatus(now);
}

void SessionCore::onConnectionChange(bool connected) {
  if (_state != STATE_IDLE && _state != STATE_DONE) return;

  if (connected) {
    _display.show(" PawseBuddy   ", " Phone linked  ");
  } else {
    _display.show(" PawseBuddy   ", "Waiting for BLE");
  }
}