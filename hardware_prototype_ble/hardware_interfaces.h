#pragma once

class ILock {
public:
  virtual ~ILock() {}
  virtual void lock() = 0;
  virtual void unlock() = 0;
  virtual bool isLocked() const = 0;
};

class IDisplay {
public:
  virtual ~IDisplay() {}

  virtual void reset() = 0;

  virtual void show(const char* line1, const char* line2) = 0;

  virtual void startScroll(const char* msg) = 0;
  virtual void stopScroll() = 0;
  virtual void tickScroll() = 0;
};

class IStatusSink {
public:
  virtual ~IStatusSink() {}

  virtual void send(const char* json) = 0;
};
