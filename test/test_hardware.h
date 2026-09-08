#pragma once

#include <string>
#include <vector>

#include "hardware_interfaces.h"

class TestLock : public ILock {
public:
  TestLock() : locked(false), lockCalls(0), unlockCalls(0) {}

  void lock() override {
    locked = true;
    lockCalls++;
  }

  void unlock() override {
    locked = false;
    unlockCalls++;
  }

  bool isLocked() const override { return locked; }

  bool locked;
  int lockCalls;
  int unlockCalls;
};

class TestDisplay : public IDisplay {
public:
  TestDisplay() : scrolling(false), resetCalls(0), scrollTicks(0) {}

  void reset() override { resetCalls++; }

  void show(const char* line1, const char* line2) override {
    top = line1;
    bottom = line2;
  }

  void startScroll(const char* msg) override {
    scrollText = msg;
    scrolling = true;
  }

  void stopScroll() override { scrolling = false; }

  void tickScroll() override { scrollTicks++; }

  std::string top;
  std::string bottom;
  std::string scrollText;
  bool scrolling;
  int resetCalls;
  int scrollTicks;
};

class TestStatusSink : public IStatusSink {
public:
  void send(const char* json) override { sent.push_back(json); }

  std::string last() const { return sent.empty() ? "" : sent.back(); }

  std::vector<std::string> sent;
};
