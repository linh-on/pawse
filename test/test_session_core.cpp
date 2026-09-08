#include <gtest/gtest.h>

#include <cstring>
#include <string>

#include "test_hardware.h"
#include "session_core.h"

namespace {

struct Box {
  TestLock lock;
  TestDisplay display;
  TestStatusSink status;
  SessionCore core;

  Box() : core(lock, display, status) { core.begin(); }

  void startSession(int minutes, uint32_t now) {
    char cmd[32];
    snprintf(cmd, sizeof(cmd), "start:%d", minutes);
    core.handleCommand(cmd, now);
  }
};

}

TEST(StartCommand, LocksAndEntersLockedState) {
  Box box;
  box.core.handleCommand("start:25", 1000);

  EXPECT_EQ(box.core.state(), STATE_LOCKED);
  EXPECT_TRUE(box.lock.isLocked());
  EXPECT_EQ(box.core.remainingSecs(1000), 1500);
}

TEST(StartCommand, IgnoresZeroMinutes) {
  Box box;
  box.core.handleCommand("start:0", 0);

  EXPECT_EQ(box.core.state(), STATE_IDLE);
  EXPECT_FALSE(box.lock.isLocked());
}

TEST(StartCommand, IgnoresACommandWithNoPayload) {
  Box box;
  box.core.handleCommand("start", 0);

  EXPECT_EQ(box.core.state(), STATE_IDLE);
}

TEST(StartCommand, ToleratesWhitespaceAroundVerbAndPayload) {
  Box box;
  box.core.handleCommand("  start : 5 ", 0);

  EXPECT_EQ(box.core.state(), STATE_LOCKED);
  EXPECT_EQ(box.core.remainingSecs(0), 300);
}

TEST(StartCommand, RejectsSessionsLongerThanADay) {
  Box box;
  box.startSession(1441, 0);

  EXPECT_EQ(box.core.state(), STATE_IDLE);
}

TEST(StartCommand, AcceptsTheLongestAllowedSession) {
  Box box;
  box.startSession(1440, 0);

  EXPECT_EQ(box.core.state(), STATE_LOCKED);
  EXPECT_EQ(box.core.remainingSecs(0), 86400);
}

TEST(UnknownCommand, IsANoOp) {
  Box box;
  box.core.handleCommand("detonate", 0);

  EXPECT_EQ(box.core.state(), STATE_IDLE);
  EXPECT_FALSE(box.lock.isLocked());
}

TEST(Countdown, StaysLockedUntilTheLastMillisecond) {
  Box box;
  box.startSession(10, 0);
  box.core.update(599999);

  EXPECT_EQ(box.core.state(), STATE_LOCKED);
  EXPECT_TRUE(box.lock.isLocked());
}

TEST(Countdown, UnlocksWhenTheSessionExpires) {
  Box box;
  box.startSession(10, 0);
  box.core.update(600000);

  EXPECT_EQ(box.core.state(), STATE_DONE);
  EXPECT_FALSE(box.lock.isLocked());
}

TEST(Countdown, SecondTickRefreshesTheDisplayedTime) {
  Box box;
  box.startSession(10, 0);
  ASSERT_EQ(box.display.bottom, "10:00 LOCKED");

  box.core.onSecondTick(60000);

  EXPECT_EQ(box.display.bottom, "09:00 LOCKED");
}

TEST(UrgentCommand, EntersUrgentAndStartsScrolling) {
  Box box;
  box.startSession(10, 0);
  box.core.handleCommand("urgent:call from mom", 1000);

  EXPECT_EQ(box.core.state(), STATE_URGENT);
  EXPECT_TRUE(box.display.scrolling);
  EXPECT_EQ(box.display.scrollText, "call from mom");
}

TEST(UrgentCommand, StripsNonPrintableCharactersAndTrims) {
  Box box;
  box.startSession(10, 0);
  box.core.handleCommand("urgent:  hi\x01\x02 there  ", 1000);

  EXPECT_EQ(std::string(box.core.urgentMessage()), "hi there");
}

TEST(UrgentCommand, TruncatesMessagesToTheDisplayBuffer) {
  Box box;
  box.startSession(10, 0);

  std::string longMessage = "urgent:" + std::string(200, 'a');
  box.core.handleCommand(longMessage.c_str(), 1000);

  EXPECT_LE(strlen(box.core.urgentMessage()),
            static_cast<size_t>(SessionCore::URGENT_MAX_LEN));
}

TEST(UrgentCommand, IsIgnoredWhenNoSessionIsLocked) {
  Box box;
  box.core.handleCommand("urgent:call from mom", 0);

  EXPECT_EQ(box.core.state(), STATE_IDLE);
  EXPECT_FALSE(box.display.scrolling);
}

TEST(RespondCommand, DoesNotUnlockWithoutAnUrgentAlert) {
  Box box;
  box.startSession(30, 0);
  ASSERT_TRUE(box.lock.isLocked());

  box.core.handleCommand("respond:yes", 1000);

  EXPECT_TRUE(box.lock.isLocked());
}

TEST(RespondCommand, UnlocksAfterAnUrgentAlert) {
  Box box;
  box.startSession(30, 0);
  box.core.handleCommand("urgent:call from mom", 1000);
  box.core.handleCommand("respond:yes", 2000);

  EXPECT_EQ(box.core.state(), STATE_RESUME);
  EXPECT_FALSE(box.lock.isLocked());
}

TEST(RespondCommand, RespondNoReturnsToTheCountdown) {
  Box box;
  box.startSession(30, 0);
  box.core.handleCommand("urgent:call from mom", 1000);
  box.core.handleCommand("respond:no", 2000);

  EXPECT_EQ(box.core.state(), STATE_LOCKED);
  EXPECT_TRUE(box.lock.isLocked());
  EXPECT_FALSE(box.display.scrolling);
}

TEST(PauseCommand, IsIgnoredWhenNoSessionIsRunning) {
  Box box;
  box.core.handleCommand("pause", 1000);

  EXPECT_EQ(box.core.state(), STATE_IDLE);
}

TEST(PauseCommand, UnlocksAndPromptsDuringASession) {
  Box box;
  box.startSession(30, 0);
  box.core.handleCommand("pause", 1000);

  EXPECT_EQ(box.core.state(), STATE_RESUME);
  EXPECT_FALSE(box.lock.isLocked());
  EXPECT_EQ(box.display.top, "Continue? Y/N");
}

TEST(ResumeCommand, RelocksWithTheTimeThatWasLeft) {
  Box box;
  box.startSession(30, 0);
  box.core.handleCommand("pause", 1000);
  box.core.handleCommand("resume:yes", 2000);

  EXPECT_EQ(box.core.state(), STATE_LOCKED);
  EXPECT_TRUE(box.lock.isLocked());
  EXPECT_EQ(box.core.remainingSecs(2000), 1799);
}

TEST(ResumeCommand, UsesTheSecondsSuppliedByTheApp) {
  Box box;
  box.startSession(30, 0);
  box.core.handleCommand("pause", 1000);
  box.core.handleCommand("resume:yes:120", 2000);

  EXPECT_EQ(box.core.remainingSecs(2000), 120);
}

TEST(ResumeCommand, RejectsAppSuppliedTimeLongerThanADay) {
  Box box;
  box.startSession(30, 0);
  box.core.handleCommand("pause", 1000);
  box.core.handleCommand("resume:yes:200000", 2000);

  EXPECT_LE(box.core.remainingSecs(2000), 86400);
}

TEST(ResumeCommand, ResumeNoEndsTheSession) {
  Box box;
  box.startSession(30, 0);
  box.core.handleCommand("pause", 1000);
  box.core.handleCommand("resume:no", 2000);

  EXPECT_EQ(box.core.state(), STATE_DONE);
  EXPECT_FALSE(box.lock.isLocked());
}

TEST(EndCommand, UnlocksAndFinishesTheSession) {
  Box box;
  box.startSession(30, 0);
  box.core.handleCommand("end", 1000);

  EXPECT_EQ(box.core.state(), STATE_DONE);
  EXPECT_FALSE(box.lock.isLocked());
}

TEST(Buttons, NoDuringUrgentReturnsToTheCountdown) {
  Box box;
  box.startSession(30, 0);
  box.core.handleCommand("urgent:call from mom", 1000);
  box.core.onButton(BUTTON_NO, 2000);

  EXPECT_EQ(box.core.state(), STATE_LOCKED);
  EXPECT_TRUE(box.lock.isLocked());
}

TEST(Buttons, PressesInsideTheDebounceWindowAreIgnored) {
  Box box;
  box.startSession(30, 0);
  box.core.handleCommand("urgent:call from mom", 1000);
  box.core.onButton(BUTTON_NO, 2000);
  ASSERT_EQ(box.core.state(), STATE_LOCKED);

  box.core.handleCommand("urgent:again", 2100);
  box.core.onButton(BUTTON_NO, 2200);
  EXPECT_EQ(box.core.state(), STATE_URGENT);

  box.core.onButton(BUTTON_NO, 2400);
  EXPECT_EQ(box.core.state(), STATE_LOCKED);
}

TEST(Buttons, AreIgnoredWhileTheSessionIsLocked) {
  Box box;
  box.startSession(30, 0);
  box.core.onButton(BUTTON_YES, 5000);

  EXPECT_EQ(box.core.state(), STATE_LOCKED);
  EXPECT_TRUE(box.lock.isLocked());
}

TEST(StatusJson, ReportsLockedStateAndRemainingTime) {
  Box box;
  box.startSession(25, 0);

  EXPECT_EQ(box.status.last(), "{\"s\":\"L\",\"r\":\"25:00\"}");
}

TEST(StatusJson, ReportsDoneAfterTheSessionEnds) {
  Box box;
  box.startSession(30, 0);
  box.core.handleCommand("end", 1000);

  EXPECT_EQ(box.status.last(), "{\"s\":\"D\",\"r\":\"00:00\"}");
}

TEST(TimeFormatting, OutputAlwaysFitsTheFirmwareBuffer) {
  char out[32];
  SessionCore::formatTime(600000, out);

  EXPECT_LE(strlen(out), 7u);
}