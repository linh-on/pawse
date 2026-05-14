import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
  Animated,
  StatusBar,
  Platform,
  useWindowDimensions,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";

import CircularProgress from "../components/CircularProgress";
import Header from "../components/Header";
import { useAuth } from "../lib/AuthContext";
import { supabase } from "../lib/supabase";
import {
  colors,
  spacing,
  radii,
  shadows,
  typography,
  patterns,
  tint,
} from "../theme";
import { responsive } from "../utils/responsive";
import { useNotifSimulator } from "./active-session/useNotifSimulator";
import { usePawseBox } from "../context/PawseBoxContext";
import UrgentModal from "./active-session/UrgentModal";
import NotifPanel from "./active-session/NotifPanel";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const genCode = (len = 6) =>
  Math.random()
    .toString(36)
    .toUpperCase()
    .slice(2, 2 + len);

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

const STATUS_COLOR = {
  present: colors.success,
  late: colors.orange,
  absent: colors.error,
  unmarked: colors.outlineVariant,
};
const STATUS_ICON = {
  present: "check-circle",
  late: "watch-later",
  absent: "cancel",
  unmarked: "remove-circle-outline",
};

const SESSION_EVENT_META = {
  joined: { label: "Joined", color: colors.success, icon: "login" },
  overrode: { label: "Overrode", color: colors.error, icon: "emergency" },
  rejoined: { label: "Rejoined", color: colors.success, icon: "refresh" },
  left: { label: "Left", color: colors.outline, icon: "logout" },
};

const fmt = (totalSecs) => {
  const s = Math.max(0, totalSecs);
  const m = Math.floor(s / 60)
    .toString()
    .padStart(2, "0");
  const sec = (s % 60).toString().padStart(2, "0");
  return `${m}:${sec}`;
};

const SCHOOL_GRACE_SECONDS = 10 * 60;

const normalizeSeconds = (value, fallback = 0) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.floor(n));
};

const parseClockTime = (value) => {
  if (!value || typeof value !== "string") return null;
  const parts = value.split(":").map((p) => Number(p));
  if (parts.some((n) => !Number.isFinite(n))) return null;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return null;
};

const cleanLCDText = (text = "") => {
  return String(text)
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/\s+/g, " ")
    .trim();
};

const makeLCDUrgentText = (entry) => {
  const raw =
    entry?.aiSummary || entry?.summary || entry?.text || "Urgent message";
  return cleanLCDText(raw).slice(0, 80);
};

const calcRemaining = (startedAt, durationMinutes) => {
  if (!startedAt || !durationMinutes) return 0;
  const endMs = new Date(startedAt).getTime() + durationMinutes * 60 * 1000;
  return Math.max(0, Math.floor((endMs - Date.now()) / 1000));
};

const todayStr = () => new Date().toISOString().slice(0, 10);
const addDaysStr = (s, n) => {
  const d = new Date(s + "T00:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
const fmtDateLabel = (s) => {
  const d = new Date(s + "T00:00:00");
  const today = todayStr();
  if (s === today) return "Today";
  if (s === addDaysStr(today, -1)) return "Yesterday";
  return d.toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
};

const ATT_DAYS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/**
 * Build a month grid for attendance. statusByDate is { "YYYY-MM-DD": "present"|"absent"|... }
 * Returns rows of 7 cells (null = empty leading/trailing, else { day, dateKey, status }).
 */
const buildAttendanceMonthGrid = (statusByDate, year, month) => {
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDow = new Date(year, month, 1).getDay();
  const leading = firstDow; // Sunday = 0, no offset needed
  const cells = [];
  for (let i = 0; i < leading; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ day: d, dateKey: key, status: statusByDate[key] ?? null });
  }
  const rows = [];
  for (let i = 0; i < cells.length; i += 7) {
    const row = cells.slice(i, i + 7);
    while (row.length < 7) row.push(null);
    rows.push(row);
  }
  return rows;
};

// Student calendar — soft pastel tones
const attCellColor = (status) => {
  if (status === "present") return "#A5D6A7"; // soft sage green
  if (status === "absent") return "#EF9A9A"; // soft rose
  if (status === "late") return "#FFE0B2"; // soft peach
  return `${colors.primary}10`;
};

// Teacher calendar — neutral; just shows whether the day has any records
const teacherCellColor = (hasData, isSelected) => {
  if (isSelected) return colors.primaryContainer;
  if (hasData) return `${colors.orange}30`;
  return `${colors.primary}10`;
};

// ─── Student Lock Screen ───────────────────────────────────────────────────────
// Full-screen takeover shown when school mode is active.
// Shows a countdown timer + single Override button — nothing else.

const StudentLockScreen = ({
  classInfo,
  session,
  focusSessionId,
  onOverride,
  onComplete,
}) => {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const r = responsive(width);

  // Compact School Mode timer layout for smaller phones.
  // The personal ActiveSession screen can be larger, but School Mode also has
  // the box status, AI filter status, and emergency controls on one screen.
  const isTinyScreen = height < 680;
  const isShortScreen = height < 760;
  const lockTimerSize = Math.round(
    Math.min(
      r.lockTimerSize ?? 260,
      width * (isTinyScreen ? 0.5 : isShortScreen ? 0.56 : 0.62),
      height * (isTinyScreen ? 0.24 : isShortScreen ? 0.27 : 0.3),
    ),
  );
  const lockTimerFaceSize = Math.max(
    126,
    lockTimerSize - (isTinyScreen ? 34 : 40),
  );
  const lockStrokeWidth = isTinyScreen ? 7 : 8;
  const lockIconSize = isTinyScreen ? 20 : isShortScreen ? 22 : 24;
  const lockTimerFontSize = isTinyScreen ? 36 : isShortScreen ? 42 : 48;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const {
    connected,
    state: boxState,
    remaining: boxRemaining,
    actions,
  } = usePawseBox();

  const totalSecs = (session?.duration_minutes ?? 0) * 60;
  const [remaining, setRemaining] = useState(() =>
    calcRemaining(session?.started_at, session?.duration_minutes),
  );
  const [schoolBreak, setSchoolBreak] = useState(false);
  const [pausedFocusSeconds, setPausedFocusSeconds] = useState(() =>
    calcRemaining(session?.started_at, session?.duration_minutes),
  );
  const [graceRemaining, setGraceRemaining] = useState(SCHOOL_GRACE_SECONDS);

  const hasFinishedRef = useRef(false);
  const boxSessionStartedRef = useRef(false);
  const focusSessionIdRef = useRef(focusSessionId ?? null);
  const prevBoxState = useRef(boxState);

  useEffect(() => {
    focusSessionIdRef.current = focusSessionId ?? null;
  }, [focusSessionId]);

  const saveNotificationLog = async (entry) => {
    const sessionId = focusSessionIdRef.current;
    if (!sessionId) return;

    const { error } = await supabase.from("notification_logs").insert({
      session_id: sessionId,
      text: entry.text,
      predicted_label: entry.predicted,
      was_allowed: entry.predicted === "urgent",
    });

    if (error) {
      console.warn("Could not save school notification log:", error.message);
    }
  };

  const sim = useNotifSimulator({
    onNotificationClassified: saveNotificationLog,
    onUrgentDetected: (entry) => {
      if (connected) {
        actions.sendUrgent(makeLCDUrgentText(entry));
      }
    },
    onUrgentDismiss: () => {
      if (connected) actions.respondUrgent(false);
    },
    userId: user?.id,
  });

  // School Mode should activate the same AI notification filter as a normal
  // personal focus session. The hook gates real Android notifications behind
  // isRunning, so start it automatically while this lock screen is mounted.
  useEffect(() => {
    sim.start?.();
    return () => sim.stop?.();
  }, []);

  const boxIsActive =
    connected &&
    (boxState === "LOCKED" ||
      boxState === "URGENT" ||
      boxState === "RESUME" ||
      boxState === "DONE");
  const boxRemainingSecs = boxIsActive ? parseClockTime(boxRemaining) : null;
  const displayRemaining =
    !schoolBreak && typeof boxRemainingSecs === "number" && boxRemainingSecs > 0
      ? Math.min(remaining, boxRemainingSecs)
      : remaining;

  const finishSchoolMode = useCallback(
    async ({ completed, override, skipHardwareEnd = false }) => {
      if (hasFinishedRef.current) return;
      hasFinishedRef.current = true;

      const endedAt = new Date().toISOString();

      if (connected && !skipHardwareEnd) {
        await actions.endSession();
      }

      if (session?.id) {
        await supabase
          .from("class_session_members")
          .update({
            left_at: endedAt,
            ...(override ? { override_at: endedAt } : {}),
          })
          .eq("session_id", session.id)
          .eq("student_id", user.id);
      }

      if (focusSessionIdRef.current) {
        await supabase
          .from("sessions")
          .update({ ended_at: endedAt, completed })
          .eq("id", focusSessionIdRef.current);
      }

      if (override) {
        await supabase.from("override_log").insert({
          student_id: user.id,
          class_id: classInfo?.id ?? session?.class_id ?? null,
          session_id: session?.id ?? null,
          overrode_at: endedAt,
        });
      }

      await supabase
        .from("school_mode")
        .update({
          is_on: false,
          locked: false,
          session_id: null,
          focus_session_id: null,
          updated_at: endedAt,
        })
        .eq("student_id", user.id);

      sim.stop?.();
      if (override) onOverride?.();
      else onComplete?.();
    },
    [
      actions,
      classInfo?.id,
      connected,
      onComplete,
      onOverride,
      session?.class_id,
      session?.id,
      sim,
      user?.id,
    ],
  );

  const enterSchoolBreak = useCallback(
    async ({ skipHardwarePause = false } = {}) => {
      if (hasFinishedRef.current) return;

      const pausedSeconds = Math.max(0, Math.floor(displayRemaining));
      setPausedFocusSeconds(pausedSeconds);
      setGraceRemaining(SCHOOL_GRACE_SECONDS);
      setSchoolBreak(true);
      sim.clearModal?.();

      if (connected && !skipHardwarePause) {
        await actions.pauseSession(pausedSeconds);
      }
    },
    [actions, connected, displayRemaining, sim],
  );

  const continueSchoolSession = useCallback(
    async ({ skipHardwareResume = false } = {}) => {
      if (hasFinishedRef.current) return;

      const seconds = normalizeSeconds(pausedFocusSeconds, displayRemaining);
      setRemaining(seconds);
      setSchoolBreak(false);
      setGraceRemaining(SCHOOL_GRACE_SECONDS);
      boxSessionStartedRef.current = true;

      if (connected && !skipHardwareResume) {
        await actions.resume(true, seconds);
      }
    },
    [actions, connected, displayRemaining, pausedFocusSeconds],
  );

  // When the student joins the teacher session, lock the servo and put the
  // teacher's remaining timer on the LCD. resume:yes:<seconds> is used instead
  // of start:<minutes> so late joiners do not restart the full class timer.
  useEffect(() => {
    if (
      !connected ||
      !session?.id ||
      boxSessionStartedRef.current ||
      schoolBreak
    ) {
      return;
    }

    const seconds = calcRemaining(session.started_at, session.duration_minutes);
    if (seconds <= 0) return;

    boxSessionStartedRef.current = true;
    actions.resume(true, seconds);
  }, [
    actions,
    connected,
    schoolBreak,
    session?.duration_minutes,
    session?.id,
    session?.started_at,
  ]);

  // Keep the ESP32 timer close to the teacher's shared class timer. The
  // firmware ignores sync while paused/resume, so this will not fight buttons.
  useEffect(() => {
    if (!connected || !session?.id || schoolBreak) return;

    const id = setInterval(() => {
      const seconds = calcRemaining(
        session.started_at,
        session.duration_minutes,
      );
      if (seconds > 0 && boxState === "LOCKED") {
        actions.syncTimer(seconds);
      }
    }, 15000);

    return () => clearInterval(id);
  }, [
    actions,
    boxState,
    connected,
    schoolBreak,
    session?.duration_minutes,
    session?.id,
    session?.started_at,
  ]);

  // Countdown tick. All students calculate from the teacher's shared
  // class_sessions.started_at, so late joiners see the correct remaining time.
  useEffect(() => {
    const id = setInterval(() => {
      if (schoolBreak) return;

      const next = calcRemaining(
        session?.started_at,
        session?.duration_minutes,
      );
      setRemaining(next);
      if (next <= 0) {
        finishSchoolMode({ completed: true, override: false });
      }
    }, 1000);
    return () => clearInterval(id);
  }, [
    finishSchoolMode,
    schoolBreak,
    session?.started_at,
    session?.duration_minutes,
  ]);

  // Grace countdown while the phone/box is unlocked for an urgent break.
  useEffect(() => {
    if (!schoolBreak) return;
    const id = setInterval(
      () => setGraceRemaining((r) => (r > 0 ? r - 1 : 0)),
      1000,
    );
    return () => clearInterval(id);
  }, [schoolBreak]);

  useEffect(() => {
    if (!schoolBreak || graceRemaining > 0) return;
    continueSchoolSession();
  }, [continueSchoolSession, graceRemaining, schoolBreak]);

  // Physical button sync, matching the individual flow:
  // URGENT + YES  -> unlock and enter break screen
  // URGENT + NO   -> dismiss urgent alert and keep locked
  // RESUME + YES  -> re-lock and continue timer
  // RESUME + NO   -> end/release school mode and notify teacher
  useEffect(() => {
    const prev = prevBoxState.current;
    prevBoxState.current = boxState;

    if (!connected || !boxState || boxState === prev) return;

    if (prev === "URGENT" && boxState === "RESUME") {
      enterSchoolBreak({ skipHardwarePause: true });
    } else if (prev === "URGENT" && boxState === "LOCKED") {
      sim.dismissModal?.();
    } else if (prev === "RESUME" && boxState === "LOCKED") {
      continueSchoolSession({ skipHardwareResume: true });
    } else if (prev === "RESUME" && boxState === "DONE") {
      finishSchoolMode({
        completed: false,
        override: true,
        skipHardwareEnd: true,
      });
    } else if (!schoolBreak && prev === "LOCKED" && boxState === "DONE") {
      finishSchoolMode({
        completed: true,
        override: false,
        skipHardwareEnd: true,
      });
    }
  }, [
    boxState,
    connected,
    continueSchoolSession,
    enterSchoolBreak,
    finishSchoolMode,
    schoolBreak,
    sim,
  ]);

  // Glow pulse (same as ActiveSession)
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.04,
          duration: 2400,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1.0,
          duration: 2400,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [pulseAnim]);

  const handleUrgentOverride = () => {
    enterSchoolBreak();
  };

  const handleGiveUp = () => {
    Alert.alert(
      "End School Mode?",
      "Your teacher will see that you overrode this session.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "End Session",
          style: "destructive",
          onPress: () => finishSchoolMode({ completed: false, override: true }),
        },
      ],
    );
  };

  // iOS gets a full notification simulator panel similar to the personal
  // ActiveSession screen. Android keeps the compact AI status pill — real
  // notification interception works there and there's nothing to "play".
  const isIOS = Platform.OS === "ios";
  const progress = totalSecs > 0 ? displayRemaining / totalSecs : 0;
  const graceProgress =
    SCHOOL_GRACE_SECONDS > 0 ? graceRemaining / SCHOOL_GRACE_SECONDS : 0;

  const BreakBody = (
    <>
      <View style={lockStyles.header}>
        <Text style={lockStyles.className}>{classInfo?.name ?? "Class"}</Text>
        <Text style={lockStyles.modeLabel}>EMERGENCY BREAK</Text>
      </View>

      <Animated.View
        style={{ transform: [{ scale: pulseAnim }], alignSelf: "center" }}
      >
        <CircularProgress
          size={lockTimerSize}
          strokeWidth={lockStrokeWidth}
          progress={graceProgress}
          trackColor={`${colors.error}22`}
          fillColor={colors.error}
        >
          <View
            style={[
              lockStyles.timerFace,
              {
                width: lockTimerFaceSize,
                height: lockTimerFaceSize,
                borderRadius: lockTimerFaceSize / 2,
                borderColor: `${colors.error}22`,
              },
            ]}
          >
            <MaterialIcons
              name="timer-off"
              size={lockIconSize}
              color={colors.error}
              style={{ marginBottom: isTinyScreen ? 3 : 5 }}
            />
            <Text
              style={[
                lockStyles.timerText,
                { color: colors.error, fontSize: lockTimerFontSize },
              ]}
            >
              {fmt(graceRemaining)}
            </Text>
            <Text style={lockStyles.timerSub}>grace left</Text>
          </View>
        </CircularProgress>
      </Animated.View>

      <View style={lockStyles.breakMeta}>
        <Text style={lockStyles.breakMetaText}>
          Focus timer paused at {fmt(pausedFocusSeconds)}.
        </Text>
        <Text style={lockStyles.breakMetaText}>
          Press YES on the box or Continue here to lock again.
        </Text>
      </View>

      <View style={lockStyles.breakActions}>
        <TouchableOpacity
          style={lockStyles.breakPrimaryBtn}
          onPress={() => continueSchoolSession()}
          activeOpacity={0.8}
        >
          <MaterialIcons name="lock" size={18} color="#fff" />
          <Text style={lockStyles.breakPrimaryText}>Continue Session</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={lockStyles.breakSecondaryBtn}
          onPress={handleGiveUp}
          activeOpacity={0.75}
        >
          <Text style={lockStyles.breakSecondaryText}>Give up for today</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  const Body = schoolBreak ? (
    BreakBody
  ) : (
    <>
      {/* Header */}
      <View style={lockStyles.header}>
        <Text style={lockStyles.className}>{classInfo?.name ?? "Class"}</Text>
        <Text style={lockStyles.modeLabel}>SCHOOL MODE</Text>
      </View>

      {/* Circular timer */}
      <Animated.View
        style={{ transform: [{ scale: pulseAnim }], alignSelf: "center" }}
      >
        <CircularProgress
          size={lockTimerSize}
          strokeWidth={lockStrokeWidth}
          progress={progress}
          trackColor={`${colors.orange}22`}
          fillColor={colors.orange}
        >
          <View
            style={[
              lockStyles.timerFace,
              {
                width: lockTimerFaceSize,
                height: lockTimerFaceSize,
                borderRadius: lockTimerFaceSize / 2,
              },
            ]}
          >
            <MaterialIcons
              name="lock"
              size={lockIconSize}
              color={colors.orange}
              style={{ marginBottom: isTinyScreen ? 3 : 5 }}
            />
            <Text
              style={[lockStyles.timerText, { fontSize: lockTimerFontSize }]}
            >
              {fmt(displayRemaining)}
            </Text>
            <Text style={lockStyles.timerSub}>remaining</Text>
          </View>
        </CircularProgress>
      </Animated.View>

      <View style={lockStyles.boxIndicator}>
        <View
          style={[
            lockStyles.boxDot,
            { backgroundColor: connected ? "#1F8A3F" : colors.outlineVariant },
          ]}
        />
        <Text
          style={[
            lockStyles.boxStatus,
            { color: connected ? "#1F8A3F" : `${colors.primaryFixedDim}88` },
          ]}
        >
          {connected
            ? boxState === "URGENT"
              ? "Box showing urgent alert"
              : "Box connected"
            : "Connect PawseBuddy before joining for servo + LCD"}
        </Text>
      </View>

      {isIOS ? (
        <NotifPanel
          feed={sim.feed}
          isRunning={sim.isRunning}
          mode={sim.mode}
          hasPermission={sim.hasPermission}
          onTogglePlay={sim.togglePlay}
          onFireNext={sim.fireNext}
          onRequestPermission={sim.requestPermission}
        />
      ) : (
        <View style={lockStyles.aiStatusBox}>
          <MaterialIcons
            name={sim.mode === "real" ? "notifications-active" : "psychology"}
            size={16}
            color={colors.orange}
          />
          <Text style={lockStyles.aiStatusText}>
            {sim.mode === "real"
              ? "AI filter active for real notifications"
              : "AI filter active in simulation mode"}
          </Text>
          {!sim.hasPermission && (
            <TouchableOpacity onPress={sim.requestPermission}>
              <Text style={lockStyles.permissionLink}>Enable</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <TouchableOpacity
        style={lockStyles.overrideBtn}
        onPress={() => enterSchoolBreak()}
        activeOpacity={0.75}
      >
        <View style={lockStyles.overrideCircle}>
          <MaterialIcons name="emergency" size={20} color={colors.outline} />
        </View>
        <Text style={lockStyles.overrideCaption}>In case of emergency</Text>
        <Text style={lockStyles.overrideLink}>Urgent Override</Text>
      </TouchableOpacity>

      <Text style={lockStyles.hint}>Stay focused 📚</Text>
    </>
  );

  return (
    <View
      style={[
        lockStyles.screen,
        {
          paddingTop: insets.top,
          paddingBottom: insets.bottom + 20,
        },
      ]}
    >
      <StatusBar barStyle="light-content" />

      {isIOS || schoolBreak ? (
        <ScrollView
          contentContainerStyle={[
            lockStyles.scrollContent,
            {
              paddingHorizontal: Math.min(
                r.screenPadding,
                isTinyScreen ? 14 : 18,
              ),
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {Body}
        </ScrollView>
      ) : (
        <View
          style={[
            lockStyles.androidWrap,
            {
              paddingHorizontal: Math.min(
                r.screenPadding,
                isTinyScreen ? 14 : 18,
              ),
              paddingTop: isTinyScreen ? spacing.sm : spacing.md,
              paddingBottom: isTinyScreen ? spacing.xs : spacing.sm,
              gap: isTinyScreen ? 6 : spacing.sm,
            },
          ]}
        >
          {Body}
        </View>
      )}

      <UrgentModal
        entry={sim.urgentModal}
        scale={sim.modalScale}
        opacity={sim.modalOpacity}
        connected={connected}
        onDismiss={sim.dismissModal}
        onOverride={handleUrgentOverride}
      />
    </View>
  );
};

const lockStyles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.onPrimaryFixed,
  },
  // iOS scroll layout — fits the NotifPanel under the timer
  scrollContent: {
    alignItems: "center",
    gap: spacing.sm,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  // Android — centered, compact, no scrolling
  androidWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "space-evenly",
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  header: { alignItems: "center", gap: 3 },
  className: {
    ...typography.h2,
    color: colors.primaryFixedDim,
    textAlign: "center",
    fontSize: 20,
    lineHeight: 24,
  },
  modeLabel: {
    ...typography.labelCaps,
    color: colors.orange,
    letterSpacing: 1.4,
    fontSize: 8,
  },
  timerFace: {
    width: 232,
    height: 232,
    borderRadius: 116,
    backgroundColor: `${colors.onPrimaryFixed}CC`,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: `${colors.orange}22`,
    ...shadows.timer,
  },
  timerText: {
    ...typography.timerDisplay,
    color: colors.primaryFixedDim,
    lineHeight: 54,
  },
  timerSub: {
    ...typography.labelCaps,
    color: `${colors.primaryFixedDim}88`,
    marginTop: 2,
    fontSize: 9,
  },
  hint: {
    ...typography.bodySm,
    color: `${colors.primaryFixedDim}66`,
    textAlign: "center",
    fontSize: 12,
  },
  aiStatusBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.full,
    backgroundColor: `${colors.orange}14`,
    borderWidth: 1,
    borderColor: `${colors.orange}25`,
    maxWidth: "100%",
  },
  aiStatusText: {
    ...typography.bodySm,
    color: `${colors.primaryFixedDim}AA`,
    fontSize: 11,
    lineHeight: 15,
    flexShrink: 1,
  },
  permissionLink: {
    ...typography.bodySm,
    color: colors.orange,
    fontWeight: "800",
    textDecorationLine: "underline",
  },
  overrideBtn: { alignItems: "center", gap: 3, paddingBottom: spacing.xs },
  overrideCircle: {
    width: 42,
    height: 42,
    borderRadius: radii.full,
    backgroundColor: `${colors.outline}18`,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: `${colors.outline}30`,
  },
  overrideCaption: {
    ...typography.labelCaps,
    color: `${colors.primaryFixedDim}55`,
    fontSize: 9,
  },
  overrideLink: {
    ...typography.bodySm,
    color: `${colors.primaryFixedDim}88`,
    fontWeight: "700",
    textDecorationLine: "underline",
    textDecorationStyle: "dotted",
  },

  boxIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.full,
    backgroundColor: `${colors.primaryFixedDim}10`,
    maxWidth: "100%",
  },
  boxDot: { width: 8, height: 8, borderRadius: 4 },
  boxStatus: {
    ...typography.labelCaps,
    fontSize: 8,
    lineHeight: 12,
    textAlign: "center",
    flexShrink: 1,
  },
  breakMeta: {
    alignItems: "center",
    gap: 3,
    paddingHorizontal: spacing.sm,
  },
  breakMetaText: {
    ...typography.bodySm,
    color: `${colors.primaryFixedDim}AA`,
    textAlign: "center",
    fontSize: 12,
    lineHeight: 16,
  },
  breakActions: {
    width: "100%",
    gap: 8,
    alignItems: "center",
  },
  breakPrimaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.orange,
    borderRadius: radii.full,
    paddingHorizontal: 18,
    paddingVertical: 10,
    minWidth: 190,
  },
  breakPrimaryText: {
    ...typography.bodySm,
    color: "#fff",
    fontWeight: "800",
  },
  breakSecondaryBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  breakSecondaryText: {
    ...typography.bodySm,
    color: `${colors.primaryFixedDim}88`,
    fontWeight: "700",
    textDecorationLine: "underline",
  },
});

// ─── Teacher View ─────────────────────────────────────────────────────────────

const TeacherView = () => {
  const { user } = useAuth();

  const [view, setView] = useState("list");
  const [classes, setClasses] = useState([]);
  const [selected, setSelected] = useState(null);
  const [activeSession, setActiveSession] = useState(null); // class_sessions row

  // Roster: enrolled in class vs joined session
  const [enrolled, setEnrolled] = useState([]); // class_members
  const [sessionMembers, setSessionMembers] = useState([]); // class_session_members

  // Create class
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newJoinCode, setNewJoinCode] = useState("");
  const [newStartDate, setNewStartDate] = useState(todayStr());
  const [creating, setCreating] = useState(false);

  // Start session modal
  const [sessionModal, setSessionModal] = useState(false);
  const [sessionCodeInput, setSessionCodeInput] = useState("");
  const [durationInput, setDurationInput] = useState("45");
  const [startingSession, setStartingSession] = useState(false);

  // Attendance — monthly calendar + selected day detail
  const now = new Date();
  const [gridYear, setGridYear] = useState(now.getFullYear());
  const [gridMonth, setGridMonth] = useState(now.getMonth());
  const [selectedDay, setSelectedDay] = useState(todayStr()); // null or "YYYY-MM-DD"
  const [monthAttendance, setMonthAttendance] = useState({}); // { "YYYY-MM-DD": { studentId: status } }
  const [dayAttendance, setDayAttendance] = useState({}); // { studentId: status } for selectedDay

  // ALL session members for persistent session log (not just active session)
  const [allSessionMembers, setAllSessionMembers] = useState([]);

  const pollRef = useRef(null);
  const activeSessionRef = useRef(null); // always current session for poll closure

  const loadClasses = useCallback(() => {
    async function run() {
      if (!user?.id) return;
      const { data } = await supabase
        .from("classes")
        .select("*")
        .eq("teacher_id", user.id)
        .order("created_at", { ascending: false });
      if (data) setClasses(data);
    }
    run();
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      loadClasses();
      return () => {
        if (pollRef.current) clearInterval(pollRef.current);
      };
    }, [loadClasses]),
  );

  // Takes IDs (not objects) so it never closes over stale references
  const loadRoster = useCallback(async (classId, sessionId) => {
    if (!classId) return;

    // Everyone enrolled in the class
    const { data: members } = await supabase
      .from("class_members")
      .select(
        "student_id, users!class_members_student_id_fkey(id, name, email)",
      )
      .eq("class_id", classId);
    if (members) setEnrolled(members);

    // Who has joined the active session
    if (sessionId) {
      const { data: sm } = await supabase
        .from("class_session_members")
        .select(
          "student_id, joined_at, override_at, left_at, rejoined_at, focus_session_id, users!class_session_members_student_id_fkey(id, name)",
        )
        .eq("session_id", sessionId);
      if (sm) setSessionMembers(sm);
    } else {
      setSessionMembers([]);
    }

    // ALL session members across ALL sessions for this class → persistent session log
    const { data: allSm } = await supabase
      .from("class_session_members")
      .select(
        "student_id, session_id, joined_at, override_at, left_at, rejoined_at, users!class_session_members_student_id_fkey(id, name)",
      )
      .eq("class_id", classId)
      .order("joined_at", { ascending: false });
    if (allSm) setAllSessionMembers(allSm);
  }, []);

  const openClass = async (cls) => {
    setSelected(cls);
    setView("detail");
    setSelectedDay(todayStr());
    setGridYear(now.getFullYear());
    setGridMonth(now.getMonth());

    // Load active session if any
    const { data: sess } = await supabase
      .from("class_sessions")
      .select(
        "id, class_id, session_code, duration_minutes, started_at, active",
      )
      .eq("class_id", cls.id)
      .eq("active", true)
      .maybeSingle();

    setActiveSession(sess ?? null);
    await loadRoster(cls.id, sess?.id ?? null);

    // Poll roster every 5s for real-time feel
    activeSessionRef.current = sess ?? null;
    if (pollRef.current) clearInterval(pollRef.current);
    const clsId = cls.id;
    pollRef.current = setInterval(
      () => loadRoster(clsId, activeSessionRef.current?.id ?? null),
      5000,
    );
  };

  const createClass = async () => {
    if (!newName.trim() || !newJoinCode.trim()) {
      Alert.alert("Fill in both fields.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(newStartDate)) {
      Alert.alert("Invalid start date", "Use the format YYYY-MM-DD.");
      return;
    }
    setCreating(true);
    const { error } = await supabase.from("classes").insert({
      teacher_id: user.id,
      name: newName.trim(),
      join_code: newJoinCode.trim().toUpperCase(),
      start_date: newStartDate,
      session_active: false,
    });
    setCreating(false);
    if (error) {
      Alert.alert(
        "Error",
        error.code === "23505" ? "That join code is taken." : error.message,
      );
      return;
    }
    setNewName("");
    setNewJoinCode("");
    setNewStartDate(todayStr());
    setShowCreate(false);
    loadClasses();
  };

  const startSession = async () => {
    const code = sessionCodeInput.trim().toUpperCase();
    const dur = parseInt(durationInput, 10);
    if (!code) {
      Alert.alert("Enter a session code.");
      return;
    }
    if (!dur || dur < 1) {
      Alert.alert("Enter a valid duration.");
      return;
    }

    setStartingSession(true);
    const startedAt = new Date().toISOString();

    // Insert class_sessions row
    const { data: sess, error } = await supabase
      .from("class_sessions")
      .insert({
        class_id: selected.id,
        teacher_id: user.id,
        session_code: code,
        duration_minutes: dur,
        started_at: startedAt,
        active: true,
      })
      .select()
      .single();

    if (error) {
      Alert.alert("Error", error.message);
      setStartingSession(false);
      return;
    }

    // Update classes quick-status
    await supabase
      .from("classes")
      .update({
        session_code: code,
        session_active: true,
        session_started_at: startedAt,
      })
      .eq("id", selected.id);

    activeSessionRef.current = sess;
    setActiveSession(sess);
    setSelected((s) => ({ ...s, session_active: true }));
    setStartingSession(false);
    setSessionModal(false);
    setSessionCodeInput("");
    setDurationInput("45");

    // Store session in ref so the poll closure always reads the latest
    activeSessionRef.current = sess;

    // Start polling roster with IDs — no stale closure risk
    if (pollRef.current) clearInterval(pollRef.current);
    const classId = selected.id;
    pollRef.current = setInterval(
      () => loadRoster(classId, activeSessionRef.current?.id ?? null),
      5000,
    );
    loadRoster(classId, sess.id);
  };

  const endSession = async () => {
    if (!activeSession) return;

    await supabase
      .from("class_sessions")
      .update({ active: false, ended_at: new Date().toISOString() })
      .eq("id", activeSession.id);

    await supabase
      .from("classes")
      .update({
        session_active: false,
        session_code: null,
        session_started_at: null,
      })
      .eq("id", selected.id);

    // Mark each student's personal focus session as completed.
    const { data: joinedRows } = await supabase
      .from("class_session_members")
      .select("focus_session_id")
      .eq("session_id", activeSession.id)
      .not("focus_session_id", "is", null);

    const focusSessionIds = (joinedRows || [])
      .map((row) => row.focus_session_id)
      .filter(Boolean);

    if (focusSessionIds.length > 0) {
      await supabase
        .from("sessions")
        .update({ completed: true, ended_at: new Date().toISOString() })
        .in("id", focusSessionIds);
    }

    await supabase
      .from("class_session_members")
      .update({ left_at: new Date().toISOString() })
      .eq("session_id", activeSession.id)
      .is("left_at", null);

    // Release all students
    await supabase
      .from("school_mode")
      .update({
        is_on: false,
        locked: false,
        session_id: null,
        focus_session_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq("class_id", selected.id);

    activeSessionRef.current = null;
    setActiveSession(null);
    setSelected((s) => ({ ...s, session_active: false }));
    setSessionMembers([]);
    if (pollRef.current) clearInterval(pollRef.current);
    // Refresh allSessionMembers so the session log stays up-to-date
    loadRoster(selected.id, null);
  };

  const loadAttendanceForMonth = useCallback(async (classId, year, month) => {
    if (!classId) return;
    const start = `${year}-${String(month + 1).padStart(2, "0")}-01`;
    const endDay = new Date(year, month + 1, 0).getDate();
    const end = `${year}-${String(month + 1).padStart(2, "0")}-${String(endDay).padStart(2, "0")}`;
    const { data } = await supabase
      .from("attendance")
      .select("student_id, status, date")
      .eq("class_id", classId)
      .gte("date", start)
      .lte("date", end);
    const map = {};
    (data || []).forEach((r) => {
      if (!map[r.date]) map[r.date] = {};
      map[r.date][r.student_id] = r.status;
    });
    setMonthAttendance(map);
  }, []);

  const loadDayAttendance = useCallback(async (classId, date) => {
    if (!classId || !date) {
      setDayAttendance({});
      return;
    }
    const { data } = await supabase
      .from("attendance")
      .select("student_id, status")
      .eq("class_id", classId)
      .eq("date", date);
    const map = {};
    (data || []).forEach((r) => {
      map[r.student_id] = r.status;
    });
    setDayAttendance(map);
  }, []);

  // Load month attendance when class or month changes
  useEffect(() => {
    if (selected?.id) loadAttendanceForMonth(selected.id, gridYear, gridMonth);
  }, [selected?.id, gridYear, gridMonth, loadAttendanceForMonth]);

  // Load day detail when selected day changes
  useEffect(() => {
    if (selected?.id && selectedDay)
      loadDayAttendance(selected.id, selectedDay);
  }, [selected?.id, selectedDay, loadDayAttendance]);

  const togglePresence = async (studentId) => {
    if (!selected?.id || !selectedDay) return;
    const current = dayAttendance[studentId];
    const next = current === "present" ? "absent" : "present";
    // Optimistic update
    setDayAttendance((m) => ({ ...m, [studentId]: next }));
    setMonthAttendance((m) => ({
      ...m,
      [selectedDay]: { ...(m[selectedDay] || {}), [studentId]: next },
    }));
    await supabase.from("attendance").upsert(
      {
        class_id: selected.id,
        student_id: studentId,
        date: selectedDay,
        status: next,
        marked_by: user.id,
      },
      { onConflict: "class_id,student_id,date" },
    );
  };

  // Teacher pulls a single student out of the active session (e.g. emergency).
  // Marks them as left, completes their personal focus session, and releases school_mode.
  const endStudentSession = async (studentId, studentName) => {
    if (!activeSession) return;
    Alert.alert(
      `End ${studentName ?? "this student"}'s session?`,
      "They'll be released from School Mode immediately.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "End",
          style: "destructive",
          onPress: async () => {
            const nowIso = new Date().toISOString();
            const member = sessionMembers.find(
              (x) => x.student_id === studentId,
            );

            await supabase
              .from("class_session_members")
              .update({ left_at: nowIso })
              .eq("session_id", activeSession.id)
              .eq("student_id", studentId);

            if (member?.focus_session_id) {
              await supabase
                .from("sessions")
                .update({ ended_at: nowIso, completed: true })
                .eq("id", member.focus_session_id);
            }

            await supabase
              .from("school_mode")
              .update({
                is_on: false,
                locked: false,
                session_id: null,
                focus_session_id: null,
                updated_at: nowIso,
              })
              .eq("student_id", studentId);

            // Refresh roster immediately
            loadRoster(selected.id, activeSession.id);
          },
        },
      ],
    );
  };

  // ── List view ──
  if (view === "list") {
    return (
      <>
        {/* Create class */}
        <TouchableOpacity
          style={[patterns.card, shadows.card, styles.section]}
          onPress={() => setShowCreate((v) => !v)}
          activeOpacity={0.8}
        >
          <View style={styles.headRow}>
            <View
              style={[
                styles.chip,
                { backgroundColor: tint(colors.secondary, 0.12) },
              ]}
            >
              <MaterialIcons name="add" size={18} color={colors.secondary} />
            </View>
            <Text style={styles.cardTitle}>Create a Class</Text>
            <MaterialIcons
              name={showCreate ? "expand-less" : "expand-more"}
              size={20}
              color={colors.outline}
            />
          </View>
          {showCreate && (
            <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
              <TextInput
                style={styles.input}
                value={newName}
                onChangeText={setNewName}
                placeholder="Class name (e.g. Science Period 2)"
                placeholderTextColor={colors.outlineVariant}
              />
              <TextInput
                style={styles.input}
                value={newJoinCode}
                onChangeText={(t) => setNewJoinCode(t.toUpperCase())}
                placeholder="Join code (e.g. SCIENCE2026-TOM)"
                placeholderTextColor={colors.outlineVariant}
                autoCapitalize="characters"
                autoCorrect={false}
              />
              <View>
                <Text style={[styles.label, { fontSize: 12, marginBottom: 4 }]}>
                  Start date
                </Text>
                <TextInput
                  style={styles.input}
                  value={newStartDate}
                  onChangeText={setNewStartDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={colors.outlineVariant}
                  keyboardType="numbers-and-punctuation"
                  autoCorrect={false}
                  maxLength={10}
                />
                <Text style={[styles.hint, { fontSize: 11, marginTop: 4 }]}>
                  Attendance will be tracked starting this day.
                </Text>
              </View>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={createClass}
                disabled={creating}
              >
                {creating ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.actionBtnText}>Create</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </TouchableOpacity>

        {classes.length === 0 ? (
          <View style={styles.empty}>
            <MaterialIcons
              name="cast-for-education"
              size={40}
              color={colors.outlineVariant}
            />
            <Text style={styles.emptyText}>
              No classes yet. Create one above.
            </Text>
          </View>
        ) : (
          classes.map((cls) => (
            <TouchableOpacity
              key={cls.id}
              style={[patterns.card, shadows.card, styles.section]}
              onPress={() => openClass(cls)}
              activeOpacity={0.8}
            >
              <View style={styles.headRow}>
                <View
                  style={[
                    styles.chip,
                    { backgroundColor: tint(colors.secondary, 0.1) },
                  ]}
                >
                  <MaterialIcons
                    name="class"
                    size={18}
                    color={colors.secondary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={styles.cardTitle}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.82}
                  >
                    {cls.name}
                  </Text>
                  <Text style={styles.hint}>{cls.join_code}</Text>
                </View>
                <LivePill active={cls.session_active} />
                <MaterialIcons
                  name="chevron-right"
                  size={20}
                  color={colors.outline}
                />
              </View>
            </TouchableOpacity>
          ))
        )}
      </>
    );
  }

  // ── Detail view ──
  // Build a chronological session log (joined / overrode / rejoined / left)
  // from ALL class_session_members across all sessions. Most recent first.
  const sessionLogEvents = (() => {
    const events = [];
    allSessionMembers.forEach((m) => {
      const name = m.users?.name;
      if (m.joined_at) {
        events.push({
          type: "joined",
          time: m.joined_at,
          name,
          studentId: m.student_id,
        });
      }
      if (m.override_at) {
        events.push({
          type: "overrode",
          time: m.override_at,
          name,
          studentId: m.student_id,
        });
      }
      if (m.rejoined_at) {
        events.push({
          type: "rejoined",
          time: m.rejoined_at,
          name,
          studentId: m.student_id,
        });
      }
      const overrideOnly =
        !!m.override_at &&
        !m.rejoined_at &&
        m.left_at &&
        Math.abs(
          new Date(m.left_at).getTime() - new Date(m.override_at).getTime(),
        ) < 1500;
      if (m.left_at && !overrideOnly) {
        events.push({
          type: "left",
          time: m.left_at,
          name,
          studentId: m.student_id,
        });
      }
    });
    events.sort((a, b) => new Date(b.time) - new Date(a.time));
    return events;
  })();

  return (
    <>
      <TouchableOpacity
        style={styles.backRow}
        onPress={() => {
          setView("list");
          if (pollRef.current) clearInterval(pollRef.current);
        }}
      >
        <MaterialIcons name="arrow-back" size={20} color={colors.primary} />
        <Text style={styles.backText}>All classes</Text>
      </TouchableOpacity>

      {/* Session control card */}
      <View style={[patterns.card, shadows.card, styles.section]}>
        <View style={styles.headRow}>
          <View
            style={[
              styles.chip,
              { backgroundColor: tint(colors.orange, 0.15) },
            ]}
          >
            <MaterialIcons name="play-circle" size={18} color={colors.orange} />
          </View>
          <Text
            style={[styles.cardTitle, { flex: 1 }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.82}
          >
            {selected?.name}
          </Text>
          <LivePill active={!!activeSession} />
        </View>

        {!activeSession ? (
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => setSessionModal(true)}
          >
            <MaterialIcons
              name="play-arrow"
              size={20}
              color={colors.onPrimaryContainer}
            />
            <Text style={styles.primaryBtnText}>Start Session</Text>
          </TouchableOpacity>
        ) : (
          <>
            <TeacherSessionTimer session={activeSession} />
            <View style={styles.sessionInfoRow}>
              <View style={styles.sessionInfoItem}>
                <Text style={styles.sessionInfoLabel}>DURATION</Text>
                <Text style={styles.sessionInfoValue}>
                  {activeSession.duration_minutes} min
                </Text>
              </View>
              <View style={styles.sessionInfoDivider} />
              <View style={styles.sessionInfoItem}>
                <Text style={styles.sessionInfoLabel}>IN SESSION</Text>
                <Text style={styles.sessionInfoValue}>
                  {sessionMembers.length}
                </Text>
              </View>
              <View style={styles.sessionInfoDivider} />
              <View style={styles.sessionInfoItem}>
                <Text style={styles.sessionInfoLabel}>ENROLLED</Text>
                <Text style={styles.sessionInfoValue}>{enrolled.length}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={[
                styles.primaryBtn,
                {
                  backgroundColor: tint(colors.error, 0.12),
                  marginTop: spacing.sm,
                },
              ]}
              onPress={() =>
                Alert.alert(
                  "End Session?",
                  "All students will be released from School Mode.",
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "End Session",
                      style: "destructive",
                      onPress: endSession,
                    },
                  ],
                )
              }
            >
              <MaterialIcons name="stop" size={20} color={colors.error} />
              <Text style={[styles.primaryBtnText, { color: colors.error }]}>
                End Session
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Roster — enrolled + session status */}
      {enrolled.length > 0 && (
        <View style={[patterns.card, shadows.card, styles.section]}>
          <View style={styles.headRow}>
            <View
              style={[
                styles.chip,
                { backgroundColor: tint(colors.primary, 0.1) },
              ]}
            >
              <MaterialIcons name="people" size={18} color={colors.primary} />
            </View>
            <Text style={styles.cardTitle}>Students ({enrolled.length})</Text>
            {activeSession && (
              <Text style={styles.hint}>
                {
                  sessionMembers.filter(
                    (m) => !m.left_at && (!m.override_at || m.rejoined_at),
                  ).length
                }{" "}
                in session
              </Text>
            )}
          </View>

          {/* ── Attendance monthly calendar ── */}
          <View style={patterns.rowBetween}>
            <TouchableOpacity
              style={styles.monthArrow}
              onPress={() => {
                if (gridMonth === 0) {
                  setGridMonth(11);
                  setGridYear((y) => y - 1);
                } else setGridMonth((m) => m - 1);
              }}
            >
              <MaterialIcons
                name="chevron-left"
                size={20}
                color={colors.warmBrown}
              />
            </TouchableOpacity>
            <Text style={styles.monthName}>
              {MONTH_NAMES[gridMonth]} {gridYear}
            </Text>
            <TouchableOpacity
              style={[
                styles.monthArrow,
                gridYear === now.getFullYear() &&
                  gridMonth === now.getMonth() && { opacity: 0.3 },
              ]}
              onPress={() => {
                if (
                  gridYear === now.getFullYear() &&
                  gridMonth === now.getMonth()
                )
                  return;
                if (gridMonth === 11) {
                  setGridMonth(0);
                  setGridYear((y) => y + 1);
                } else setGridMonth((m) => m + 1);
              }}
              disabled={
                gridYear === now.getFullYear() && gridMonth === now.getMonth()
              }
            >
              <MaterialIcons
                name="chevron-right"
                size={20}
                color={colors.warmBrown}
              />
            </TouchableOpacity>
          </View>

          {/* Legend */}
          <View style={styles.legendRow}>
            <View
              style={[
                styles.legendCell,
                { backgroundColor: `${colors.orange}30` },
              ]}
            />
            <Text style={styles.legendLabel}>Has records</Text>
            <View
              style={[
                styles.legendCell,
                { backgroundColor: colors.primaryContainer },
              ]}
            />
            <Text style={styles.legendLabel}>Selected</Text>
          </View>

          {/* Day-of-week header */}
          <View style={styles.dowRow}>
            {ATT_DAYS.map((d, i) => (
              <Text key={i} style={styles.dowLabel}>
                {d}
              </Text>
            ))}
          </View>

          {/* Grid */}
          <View style={{ gap: 4 }}>
            {(() => {
              const hasDataSet = new Set(Object.keys(monthAttendance));
              const grid = buildAttendanceMonthGrid({}, gridYear, gridMonth);
              return grid.map((row, ri) => (
                <View key={ri} style={{ flexDirection: "row", gap: 4 }}>
                  {row.map((cell, ci) =>
                    cell === null ? (
                      <View key={ci} style={styles.gridCell} />
                    ) : (
                      <TouchableOpacity
                        key={ci}
                        style={[
                          styles.gridCell,
                          {
                            backgroundColor: teacherCellColor(
                              hasDataSet.has(cell.dateKey),
                              selectedDay === cell.dateKey,
                            ),
                          },
                          selectedDay === cell.dateKey &&
                            styles.gridCellSelected,
                        ]}
                        onPress={() => setSelectedDay(cell.dateKey)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.gridDayNum,
                            selectedDay === cell.dateKey && {
                              color: colors.onPrimaryContainer,
                              fontWeight: "800",
                            },
                          ]}
                        >
                          {cell.day}
                        </Text>
                      </TouchableOpacity>
                    ),
                  )}
                </View>
              ));
            })()}
          </View>

          {/* Day detail — student list with toggles */}
          {selectedDay && (
            <View style={styles.dayDetailSection}>
              <Text style={[styles.label, { marginBottom: 4 }]}>
                {fmtDateLabel(selectedDay)}
              </Text>
              {enrolled.map((m) => {
                const s = m.users;
                const smember = sessionMembers.find(
                  (x) => x.student_id === m.student_id,
                );
                const inSessionNow =
                  !!smember &&
                  !smember.left_at &&
                  (!smember.override_at || smember.rejoined_at);
                const overrodeNow =
                  !!smember?.override_at && !smember?.rejoined_at;
                const leftNow = !!smember?.left_at && !overrodeNow;

                let statusLabel = "Not joined";
                let statusColor = colors.outline;
                let statusDot = colors.outlineVariant;
                if (inSessionNow) {
                  statusLabel = "In session";
                  statusColor = colors.success;
                  statusDot = colors.success;
                } else if (overrodeNow) {
                  statusLabel = "Overrode";
                  statusColor = colors.error;
                  statusDot = colors.error;
                } else if (leftNow) {
                  statusLabel = "Left";
                  statusColor = colors.outline;
                  statusDot = colors.outlineVariant;
                }

                const isPresent = dayAttendance[m.student_id] === "present";

                return (
                  <View key={m.student_id} style={styles.studentRow}>
                    <View style={styles.studentInfo}>
                      <View
                        style={[
                          styles.chip,
                          { backgroundColor: tint(colors.primary, 0.08) },
                        ]}
                      >
                        <MaterialIcons
                          name="person"
                          size={16}
                          color={colors.primary}
                        />
                      </View>
                      <View>
                        <Text style={styles.label}>{s?.name ?? "Unknown"}</Text>
                        {activeSession ? (
                          <View style={styles.inlineRow}>
                            <View
                              style={[
                                styles.dot,
                                { backgroundColor: statusDot },
                              ]}
                            />
                            <Text
                              style={[
                                styles.statusText,
                                { color: statusColor },
                              ]}
                            >
                              {statusLabel}
                            </Text>
                          </View>
                        ) : (
                          <Text style={styles.hint}>Enrolled</Text>
                        )}
                      </View>
                    </View>
                    <View style={styles.rowActions}>
                      {activeSession && inSessionNow && (
                        <TouchableOpacity
                          style={styles.endStudentBtn}
                          onPress={() =>
                            endStudentSession(m.student_id, s?.name)
                          }
                          activeOpacity={0.7}
                        >
                          <MaterialIcons
                            name="logout"
                            size={14}
                            color={colors.error}
                          />
                        </TouchableOpacity>
                      )}
                      <TouchableOpacity
                        style={[
                          styles.toggleBtn,
                          isPresent
                            ? {
                                backgroundColor: tint(colors.success, 0.15),
                                borderColor: colors.success,
                              }
                            : {
                                backgroundColor: "transparent",
                                borderColor: colors.outlineVariant,
                              },
                        ]}
                        onPress={() => togglePresence(m.student_id)}
                        activeOpacity={0.7}
                      >
                        <MaterialIcons
                          name={isPresent ? "check" : "check-box-outline-blank"}
                          size={14}
                          color={isPresent ? colors.success : colors.outline}
                        />
                        <Text
                          style={[
                            styles.toggleText,
                            {
                              color: isPresent
                                ? colors.success
                                : colors.outline,
                            },
                          ]}
                        >
                          {isPresent ? "Present" : "Absent"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      )}

      {/* Session log — filtered to selected day */}
      {selectedDay &&
        (() => {
          const dayEvents = sessionLogEvents.filter(
            (e) => e.time && e.time.slice(0, 10) === selectedDay,
          );
          if (dayEvents.length === 0) return null;
          return (
            <View style={[patterns.card, shadows.card, styles.section]}>
              <View style={styles.headRow}>
                <View
                  style={[
                    styles.chip,
                    { backgroundColor: tint(colors.error, 0.1) },
                  ]}
                >
                  <MaterialIcons
                    name="emergency"
                    size={18}
                    color={colors.error}
                  />
                </View>
                <Text style={styles.cardTitle}>Session Log</Text>
                <Text style={styles.hint}>{fmtDateLabel(selectedDay)}</Text>
              </View>
              {dayEvents.map((e, i) => {
                const meta = SESSION_EVENT_META[e.type];
                return (
                  <View
                    key={`${e.type}-${e.studentId}-${e.time}-${i}`}
                    style={styles.recordRow}
                  >
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.label} numberOfLines={1}>
                        {e.name ?? "Unknown"}
                      </Text>
                      <Text style={styles.hint} numberOfLines={1}>
                        {new Date(e.time).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.pill,
                        {
                          backgroundColor: tint(meta.color, 0.1),
                          flexShrink: 0,
                        },
                      ]}
                    >
                      <Text
                        style={[styles.pillText, { color: meta.color }]}
                        numberOfLines={1}
                      >
                        {meta.label}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          );
        })()}

      {/* Start session modal */}
      <Modal visible={sessionModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.cardTitle}>Start Session</Text>

            <Text style={[styles.label, { marginTop: spacing.sm }]}>
              Session code
            </Text>
            <Text style={styles.hint}>
              Type your own or generate one. Tell students verbally.
            </Text>
            <View style={[styles.inputRow, { marginTop: 6 }]}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={sessionCodeInput}
                onChangeText={(t) => setSessionCodeInput(t.toUpperCase())}
                placeholder="e.g. FOCUS1"
                placeholderTextColor={colors.outlineVariant}
                autoCapitalize="characters"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={styles.generateBtn}
                onPress={() => setSessionCodeInput(genCode(6))}
              >
                <MaterialIcons
                  name="refresh"
                  size={16}
                  color={colors.primary}
                />
                <Text style={styles.generateBtnText}>Generate</Text>
              </TouchableOpacity>
            </View>

            <Text style={[styles.label, { marginTop: spacing.sm }]}>
              Duration (minutes)
            </Text>
            <View style={styles.durationRow}>
              <TouchableOpacity
                style={styles.durationStep}
                onPress={() =>
                  setDurationInput((v) =>
                    String(Math.max(5, (parseInt(v) || 45) - 5)),
                  )
                }
              >
                <MaterialIcons
                  name="remove"
                  size={20}
                  color={colors.warmBrown}
                />
              </TouchableOpacity>
              <TextInput
                style={styles.durationInput}
                value={durationInput}
                onChangeText={setDurationInput}
                keyboardType="number-pad"
                maxLength={3}
              />
              <TouchableOpacity
                style={styles.durationStep}
                onPress={() =>
                  setDurationInput((v) =>
                    String(Math.min(180, (parseInt(v) || 45) + 5)),
                  )
                }
              >
                <MaterialIcons name="add" size={20} color={colors.warmBrown} />
              </TouchableOpacity>
              <Text style={styles.durationUnit}>min</Text>
            </View>

            <View style={[styles.inputRow, { marginTop: spacing.md }]}>
              <TouchableOpacity
                style={[styles.cancelBtn, { flex: 1 }]}
                onPress={() => {
                  setSessionModal(false);
                  setSessionCodeInput("");
                }}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { flex: 1 }]}
                onPress={startSession}
                disabled={startingSession}
              >
                {startingSession ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.actionBtnText}>Start</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
};

// ─── Parent View ──────────────────────────────────────────────────────────────

const ParentView = () => {
  const { user } = useAuth();
  const [child, setChild] = useState(null);
  const [childEmail, setChildEmail] = useState("");
  const [linking, setLinking] = useState(false);
  const [attendance, setAttendance] = useState([]);
  const [homeTimer, setHomeTimer] = useState(45);
  const [schoolModeOn, setSchoolModeOn] = useState(false);

  const load = useCallback(() => {
    async function run() {
      if (!user?.id) return;
      const { data: link } = await supabase
        .from("parent_links")
        .select(
          "student_id, users!parent_links_student_id_fkey(id, name, email)",
        )
        .eq("parent_id", user.id)
        .maybeSingle();
      if (link?.users) {
        setChild(link.users);
        loadChildData(link.student_id);
      }
    }
    run();
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const loadChildData = async (studentId) => {
    const { data: att } = await supabase
      .from("attendance")
      .select("date, status, classes(name)")
      .eq("student_id", studentId)
      .order("date", { ascending: false })
      .limit(10);
    if (att) setAttendance(att);

    const { data: sm } = await supabase
      .from("school_mode")
      .select("is_on")
      .eq("student_id", studentId)
      .maybeSingle();
    if (sm) setSchoolModeOn(sm.is_on);

    const { data: ht } = await supabase
      .from("home_timers")
      .select("duration_minutes")
      .eq("student_id", studentId)
      .eq("active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (ht) setHomeTimer(ht.duration_minutes);
  };

  const linkChild = async () => {
    if (!childEmail.trim()) return;
    setLinking(true);
    const { data: student, error } = await supabase
      .from("users")
      .select("id, name, email")
      .eq("email", childEmail.trim().toLowerCase())
      .eq("role", "student")
      .maybeSingle();
    if (error || !student) {
      Alert.alert("Not found", "No student account found with that email.");
      setLinking(false);
      return;
    }
    await supabase
      .from("parent_links")
      .upsert(
        { parent_id: user.id, student_id: student.id },
        { onConflict: "parent_id,student_id" },
      );
    setChild(student);
    setChildEmail("");
    setLinking(false);
    loadChildData(student.id);
  };

  const saveTimer = async () => {
    if (!child) return;
    await supabase
      .from("home_timers")
      .update({ active: false })
      .eq("student_id", child.id);
    await supabase.from("home_timers").insert({
      student_id: child.id,
      set_by: user.id,
      duration_minutes: homeTimer,
      active: true,
    });
    Alert.alert("Saved", `${homeTimer} min timer set for ${child.name}.`);
  };

  const stepTimer = (delta) =>
    setHomeTimer((v) => Math.max(5, Math.min(120, v + delta)));

  if (!child) {
    return (
      <View style={[patterns.card, shadows.card, styles.section]}>
        <View style={styles.headRow}>
          <View
            style={[
              styles.chip,
              { backgroundColor: tint(colors.tertiary, 0.12) },
            ]}
          >
            <MaterialIcons
              name="child-care"
              size={18}
              color={colors.tertiary}
            />
          </View>
          <Text style={styles.cardTitle}>Link Your Child</Text>
        </View>
        <Text style={styles.hint}>Enter your child's Pawse account email.</Text>
        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, { flex: 1 }]}
            value={childEmail}
            onChangeText={setChildEmail}
            placeholder="child@example.com"
            placeholderTextColor={colors.outlineVariant}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={linkChild}
            disabled={linking}
          >
            {linking ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.actionBtnText}>Link</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <>
      {/* Child status */}
      <View style={[patterns.card, shadows.card, styles.section]}>
        <View style={styles.headRow}>
          <View
            style={[
              styles.chip,
              { backgroundColor: tint(colors.tertiary, 0.12) },
            ]}
          >
            <MaterialIcons
              name="child-care"
              size={18}
              color={colors.tertiary}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={styles.cardTitle}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.82}
            >
              {child.name}
            </Text>
            <Text style={styles.hint}>{child.email}</Text>
          </View>
          <View
            style={[
              styles.pill,
              {
                backgroundColor: schoolModeOn
                  ? tint(colors.success, 0.12)
                  : tint(colors.outline, 0.08),
              },
            ]}
          >
            <View
              style={[
                styles.dot,
                {
                  backgroundColor: schoolModeOn
                    ? colors.success
                    : colors.outlineVariant,
                },
              ]}
            />
            <Text
              style={[
                styles.pillText,
                { color: schoolModeOn ? colors.success : colors.outline },
              ]}
            >
              {schoolModeOn ? "In class" : "Free"}
            </Text>
          </View>
        </View>
      </View>

      {/* Home timer */}
      <View style={[patterns.card, shadows.card, styles.section]}>
        <View style={styles.headRow}>
          <View
            style={[
              styles.chip,
              { backgroundColor: tint(colors.orange, 0.15) },
            ]}
          >
            <MaterialIcons name="timer" size={18} color={colors.orange} />
          </View>
          <Text style={styles.cardTitle}>Home Focus Timer</Text>
        </View>
        {schoolModeOn ? (
          <Text style={styles.hint}>
            Teacher controls the timer during class.
          </Text>
        ) : (
          <>
            <Text style={styles.hint}>
              Set focused screen-away time for home.
            </Text>
            <View style={styles.timerRow}>
              <Text style={styles.label}>Duration</Text>
              <View style={styles.counter}>
                <TouchableOpacity onPress={() => stepTimer(-5)}>
                  <MaterialIcons
                    name="remove"
                    size={20}
                    color={colors.warmBrown}
                  />
                </TouchableOpacity>
                <Text style={styles.counterText}>{homeTimer} min</Text>
                <TouchableOpacity onPress={() => stepTimer(5)}>
                  <MaterialIcons
                    name="add"
                    size={20}
                    color={colors.warmBrown}
                  />
                </TouchableOpacity>
              </View>
            </View>
            <TouchableOpacity style={styles.primaryBtn} onPress={saveTimer}>
              <MaterialIcons
                name="save"
                size={18}
                color={colors.onPrimaryContainer}
              />
              <Text style={styles.primaryBtnText}>Save Timer</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Attendance */}
      <View style={[patterns.card, shadows.card, styles.section]}>
        <View style={styles.headRow}>
          <View
            style={[
              styles.chip,
              { backgroundColor: tint(colors.primary, 0.1) },
            ]}
          >
            <MaterialIcons
              name="event-available"
              size={18}
              color={colors.primary}
            />
          </View>
          <Text style={styles.cardTitle}>Attendance</Text>
        </View>
        {attendance.length === 0 ? (
          <Text style={styles.hint}>No attendance records yet.</Text>
        ) : (
          attendance.map((a, i) => (
            <View key={i} style={styles.recordRow}>
              <View>
                <Text style={styles.label}>
                  {new Date(a.date + "T00:00:00").toLocaleDateString([], {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                </Text>
                {a.classes?.name && (
                  <Text style={styles.hint}>{a.classes.name}</Text>
                )}
              </View>
              <StatusPill status={a.status} />
            </View>
          ))
        )}
      </View>
    </>
  );
};

// ─── Shared small components ──────────────────────────────────────────────────

// Live countdown badge for the teacher when a class session is running
const TeacherSessionTimer = ({ session }) => {
  const [remaining, setRemaining] = useState(() =>
    calcRemaining(session?.started_at, session?.duration_minutes),
  );

  useEffect(() => {
    setRemaining(calcRemaining(session?.started_at, session?.duration_minutes));
    const id = setInterval(() => {
      setRemaining(
        calcRemaining(session?.started_at, session?.duration_minutes),
      );
    }, 1000);
    return () => clearInterval(id);
  }, [session?.started_at, session?.duration_minutes]);

  const total = (session?.duration_minutes ?? 0) * 60;
  const progress = total > 0 ? remaining / total : 0;

  return (
    <View style={styles.teacherTimerWrap}>
      <CircularProgress
        size={120}
        strokeWidth={8}
        progress={progress}
        trackColor={`${colors.orange}22`}
        fillColor={colors.orange}
      >
        <View style={styles.teacherTimerFace}>
          <Text style={styles.teacherTimerText}>{fmt(remaining)}</Text>
          <Text style={styles.teacherTimerSub}>remaining</Text>
        </View>
      </CircularProgress>
    </View>
  );
};

const LivePill = ({ active }) => (
  <View
    style={[
      styles.pill,
      {
        backgroundColor: active
          ? tint(colors.success, 0.12)
          : tint(colors.outline, 0.08),
      },
    ]}
  >
    <View
      style={[
        styles.dot,
        { backgroundColor: active ? colors.success : colors.outlineVariant },
      ]}
    />
    <Text
      style={[
        styles.pillText,
        { color: active ? colors.success : colors.outline },
      ]}
    >
      {active ? "Live" : "Idle"}
    </Text>
  </View>
);

const StatusPill = ({ status }) => (
  <View
    style={[styles.pill, { backgroundColor: tint(STATUS_COLOR[status], 0.12) }]}
  >
    <MaterialIcons
      name={STATUS_ICON[status]}
      size={12}
      color={STATUS_COLOR[status]}
    />
    <Text style={[styles.pillText, { color: STATUS_COLOR[status] }]}>
      {cap(status)}
    </Text>
  </View>
);

// ─── Root ─────────────────────────────────────────────────────────────────────

const ROLE_META = {
  student: { subtitle: "Student", icon: "school", color: colors.primary },
  teacher: {
    subtitle: "Teacher",
    icon: "cast-for-education",
    color: colors.secondary,
  },
  parent: {
    subtitle: "Parent",
    icon: "family-restroom",
    color: colors.tertiary,
  },
};

const SchoolScreen = () => {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const r = responsive(width);
  const role = (user?.role ?? "student").toLowerCase();
  const meta = ROLE_META[role] ?? ROLE_META.student;

  // Student lock screen needs to bypass all chrome
  // We render StudentView which handles its own full-screen internally
  if (role === "student") {
    return <StudentViewWrapper insets={insets} meta={meta} />;
  }

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" />
      <Header />
      <View style={styles.roleHeader}>
        <Text style={styles.pageSubtitle}>{meta.subtitle} view</Text>
      </View>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingHorizontal: r.screenPadding,
            maxWidth: r.wideContentMaxWidth,
            width: "100%",
            alignSelf: "center",
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {role === "teacher" && <TeacherView />}
        {role === "parent" && <ParentView />}
      </ScrollView>
    </View>
  );
};

// StudentViewWrapper: either shows lock screen (full screen) or normal scrollable UI
const StudentViewWrapper = ({ insets, meta }) => {
  // StudentView manages its own lock state internally and returns
  // StudentLockScreen (full screen) or the normal list/detail UI.
  // We wrap in a flex:1 container so it fills correctly either way.
  return (
    <View style={{ flex: 1, backgroundColor: colors.surfaceContainerLow }}>
      <StatusBar barStyle="dark-content" />
      {/* Header — hidden when lock screen is showing (lock screen sets its own StatusBar) */}
      <StudentViewInner insets={insets} meta={meta} />
    </View>
  );
};

// Inner wrapper that conditionally shows header or not
const StudentViewInner = ({ insets, meta }) => {
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const r = responsive(width);

  const [view, setView] = useState("list");
  const [classes, setClasses] = useState([]);
  const [selected, setSelected] = useState(null);
  const [attendanceByDate, setAttendanceByDate] = useState({}); // { "YYYY-MM-DD": "present"|"absent"|... }

  const sNow = new Date();
  const [sGridYear, setSGridYear] = useState(sNow.getFullYear());
  const [sGridMonth, setSGridMonth] = useState(sNow.getMonth());

  const [showJoin, setShowJoin] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joinLoading, setJoinLoading] = useState(false);

  const [schoolModeOn, setSchoolModeOn] = useState(false);
  const [activeSession, setActiveSession] = useState(null);

  const [sessionModal, setSessionModal] = useState(false);
  const [sessionCodeInput, setSessionCodeInput] = useState("");

  // ── Same "put your phone in the box" countdown as personal focus ──
  // The student only gets written into school_mode/class_session_members
  // after this finishes, so the teacher sees them join when the box locks.
  const [joinCountdown, setJoinCountdown] = useState(null);
  const [startingSchoolMode, setStartingSchoolMode] = useState(false);
  const joinCountdownAnim = useRef(new Animated.Value(1)).current;
  const pendingSchoolJoinRef = useRef(null);

  // IMPORTANT: this was missing in v2. Without it, pressing Turn On
  // writes the student into class_session_members, but the local UI can crash
  // before setActiveSession/setSchoolModeOn runs, so the teacher sees the
  // student joined while the student does not see the timer.
  const activeSessionRef = useRef(null);

  const loadAll = useCallback(() => {
    async function run() {
      if (!user?.id) return;
      const { data: members } = await supabase
        .from("class_members")
        .select(
          "class_id, classes(id, name, join_code, session_active, session_started_at)",
        )
        .eq("student_id", user.id);
      if (members) setClasses(members.map((m) => m.classes).filter(Boolean));

      const { data: sm } = await supabase
        .from("school_mode")
        .select("is_on, locked, class_id, session_id, focus_session_id")
        .eq("student_id", user.id)
        .maybeSingle();

      if (sm?.is_on && sm?.session_id) {
        const { data: sess } = await supabase
          .from("class_sessions")
          .select(
            "id, class_id, duration_minutes, started_at, session_code, active",
          )
          .eq("id", sm.session_id)
          .maybeSingle();
        if (sess?.active) {
          setSchoolModeOn(true);
          activeSessionRef.current = {
            ...sess,
            focus_session_id: sm.focus_session_id ?? null,
          };
          setActiveSession({
            ...sess,
            focus_session_id: sm.focus_session_id ?? null,
          });
        } else {
          await supabase
            .from("school_mode")
            .update({
              is_on: false,
              locked: false,
              session_id: null,
              focus_session_id: null,
              updated_at: new Date().toISOString(),
            })
            .eq("student_id", user.id);
          setSchoolModeOn(false);
          setActiveSession(null);
        }
      } else {
        setSchoolModeOn(false);
        setActiveSession(null);
      }
    }
    run();
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      loadAll();
      const id = setInterval(loadAll, 5000);
      return () => clearInterval(id);
    }, [loadAll]),
  );

  const openClass = async (cls) => {
    setSelected(cls);
    setView("detail");

    const { data: att } = await supabase
      .from("attendance")
      .select("date, status")
      .eq("student_id", user.id)
      .eq("class_id", cls.id)
      .order("date", { ascending: false });

    const byDate = {};
    (att || []).forEach((a) => {
      byDate[a.date] = a.status;
    });
    setAttendanceByDate(byDate);
  };

  const joinClass = async () => {
    if (!joinCode.trim()) return;
    setJoinLoading(true);
    const { data: cls, error } = await supabase
      .from("classes")
      .select("id, name")
      .eq("join_code", joinCode.trim().toUpperCase())
      .maybeSingle();
    if (error || !cls) {
      Alert.alert("Not found", "Check the class code with your teacher.");
      setJoinLoading(false);
      return;
    }
    await supabase
      .from("class_members")
      .upsert(
        { class_id: cls.id, student_id: user.id },
        { onConflict: "class_id,student_id" },
      );
    setJoinCode("");
    setShowJoin(false);
    setJoinLoading(false);
    loadAll();
    Alert.alert("Joined!", `You're now in ${cls.name}.`);
  };

  const handleTurnOn = () => {
    if (!selected?.session_active) {
      Alert.alert(
        "No active session",
        "Your teacher hasn't started a session yet.",
      );
      return;
    }
    setSessionModal(true);
  };

  const cancelSchoolCountdown = () => {
    pendingSchoolJoinRef.current = null;
    setStartingSchoolMode(false);
    setJoinCountdown(null);
  };

  const createOrReuseFocusSession = async (classSession) => {
    // One personal `sessions` row per student per teacher-led class session.
    // This lets existing notification_logs keep using notification_logs.session_id
    // while school_mode still points to class_sessions.session_id.
    const { data: existingMember } = await supabase
      .from("class_session_members")
      .select("id, focus_session_id")
      .eq("session_id", classSession.id)
      .eq("student_id", user.id)
      .maybeSingle();

    if (existingMember?.focus_session_id)
      return existingMember.focus_session_id;

    const { data: focusSession, error: focusError } = await supabase
      .from("sessions")
      .insert({
        user_id: user.id,
        duration_minutes: classSession.duration_minutes,
        started_at: classSession.started_at,
        completed: false,
        school_class_session_id: classSession.id,
        school_class_id: classSession.class_id,
      })
      .select("id")
      .single();

    if (focusError) {
      Alert.alert("Could not start school timer", focusError.message);
      return null;
    }

    await supabase
      .from("class_session_members")
      .update({ focus_session_id: focusSession.id })
      .eq("session_id", classSession.id)
      .eq("student_id", user.id);

    return focusSession.id;
  };

  const finalizeSchoolModeJoin = async () => {
    const pending = pendingSchoolJoinRef.current;
    if (!pending || !user?.id) {
      setStartingSchoolMode(false);
      return;
    }

    setStartingSchoolMode(true);
    const { code, classId } = pending;

    const { data: sess } = await supabase
      .from("class_sessions")
      .select(
        "id, class_id, duration_minutes, started_at, session_code, active",
      )
      .eq("id", pending.sessionId)
      .eq("class_id", classId)
      .eq("active", true)
      .maybeSingle();

    if (!sess || sess.session_code !== code) {
      pendingSchoolJoinRef.current = null;
      setStartingSchoolMode(false);
      Alert.alert(
        "Session ended",
        "Your teacher's session is no longer active.",
      );
      return;
    }

    // Re-check membership after the countdown so we don't use stale data.
    const { data: existing } = await supabase
      .from("class_session_members")
      .select("id, joined_at, override_at, focus_session_id")
      .eq("session_id", sess.id)
      .eq("student_id", user.id)
      .maybeSingle();

    const isRejoin = !!existing?.override_at;
    const nowIso = new Date().toISOString();

    if (existing) {
      // Update — preserve joined_at, clear left_at + override_at, set rejoined_at on rejoin
      await supabase
        .from("class_session_members")
        .update({
          left_at: null,
          ...(isRejoin ? { override_at: null, rejoined_at: nowIso } : {}),
        })
        .eq("id", existing.id);
    } else {
      await supabase.from("class_session_members").insert({
        session_id: sess.id,
        class_id: classId,
        student_id: user.id,
        joined_at: nowIso,
      });
    }

    const focusSessionId = await createOrReuseFocusSession(sess);
    if (!focusSessionId) {
      pendingSchoolJoinRef.current = null;
      setStartingSchoolMode(false);
      return;
    }

    if (isRejoin) {
      // Reopen the personal sessions row
      await supabase
        .from("sessions")
        .update({ ended_at: null, completed: false })
        .eq("id", focusSessionId);

      // Mark the most recent open override_log entry as rejoined → notifies teacher
      await supabase
        .from("override_log")
        .update({ rejoined_at: nowIso, session_code_used: code })
        .eq("session_id", sess.id)
        .eq("student_id", user.id)
        .is("rejoined_at", null);
    }

    await supabase.from("school_mode").upsert(
      {
        student_id: user.id,
        is_on: true,
        locked: true,
        class_id: classId,
        session_id: sess.id,
        focus_session_id: focusSessionId,
        updated_at: nowIso,
      },
      { onConflict: "student_id" },
    );

    pendingSchoolJoinRef.current = null;
    activeSessionRef.current = { ...sess, focus_session_id: focusSessionId };
    setActiveSession({ ...sess, focus_session_id: focusSessionId });
    setSchoolModeOn(true);
    setStartingSchoolMode(false);
  };

  const confirmSessionCode = async () => {
    const code = sessionCodeInput.trim().toUpperCase();
    if (!code || startingSchoolMode || joinCountdown !== null) return;

    setStartingSchoolMode(true);

    const { data: sess } = await supabase
      .from("class_sessions")
      .select(
        "id, class_id, duration_minutes, started_at, session_code, active",
      )
      .eq("class_id", selected.id)
      .eq("active", true)
      .maybeSingle();

    if (!sess || sess.session_code !== code) {
      Alert.alert("Wrong code", "Check with your teacher and try again.");
      setStartingSchoolMode(false);
      return;
    }

    pendingSchoolJoinRef.current = {
      classId: selected.id,
      sessionId: sess.id,
      code,
    };

    setSessionModal(false);
    setSessionCodeInput("");
    setJoinCountdown(10);
    setStartingSchoolMode(false);
  };

  useEffect(() => {
    if (joinCountdown === null) return;

    if (joinCountdown <= 0) {
      setJoinCountdown(null);
      finalizeSchoolModeJoin();
      return;
    }

    joinCountdownAnim.setValue(1.3);
    Animated.timing(joinCountdownAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();

    const id = setTimeout(
      () => setJoinCountdown((c) => (c === null ? null : c - 1)),
      1000,
    );
    return () => clearTimeout(id);
  }, [joinCountdown, joinCountdownAnim]);

  const handleOverride = () => {
    setSchoolModeOn(false);
    setActiveSession(null);
  };

  // IMPORTANT: render this BEFORE the full-screen School Mode lock screen.
  // Otherwise the lock screen can take over so fast that the student never sees
  // the same “Put your phone in the box” countdown used on HomeScreen.
  if (joinCountdown !== null) {
    return (
      <View style={styles.screen}>
        <Header />
        <Modal
          visible={joinCountdown !== null}
          transparent
          animationType="fade"
          statusBarTranslucent
        >
          <View style={styles.overlayBackdrop}>
            <View style={[styles.overlayCard, shadows.soft]}>
              <MaterialIcons
                name="phonelink-lock"
                size={48}
                color={colors.primaryContainer}
              />

              <Text style={styles.overlayTitle}>Put your phone in the box</Text>
              <Text style={styles.overlaySubtitle}>
                School Mode will begin in
              </Text>

              <Animated.Text
                style={[
                  styles.overlayCountdown,
                  { transform: [{ scale: joinCountdownAnim }] },
                ]}
              >
                {joinCountdown}
              </Animated.Text>

              <View style={styles.overlayProgressTrack}>
                <View
                  style={[
                    styles.overlayProgressFill,
                    {
                      width: `${((10 - (joinCountdown ?? 0)) / 10) * 100}%`,
                    },
                  ]}
                />
              </View>

              <TouchableOpacity
                style={styles.overlayCancelBtn}
                onPress={cancelSchoolCountdown}
                activeOpacity={0.75}
              >
                <Text style={styles.overlayCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  // Full screen lock — no header, no scroll
  if (schoolModeOn && activeSession) {
    const classInfo =
      classes.find((c) => c.id === activeSession.class_id) ?? selected;
    return (
      <StudentLockScreen
        classInfo={classInfo}
        session={activeSession}
        focusSessionId={activeSession.focus_session_id}
        onOverride={handleOverride}
        onComplete={handleOverride}
      />
    );
  }

  // Normal UI
  return (
    <View style={{ flex: 1 }}>
      <Header />
      <View style={styles.roleHeader}>
        <Text style={styles.pageSubtitle}>{meta.subtitle} view</Text>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingHorizontal: r.screenPadding,
            maxWidth: r.contentMaxWidth,
            width: "100%",
            alignSelf: "center",
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Join class */}
        <TouchableOpacity
          style={[patterns.card, shadows.card, styles.section]}
          onPress={() => setShowJoin((v) => !v)}
          activeOpacity={0.8}
        >
          <View style={styles.headRow}>
            <View
              style={[
                styles.chip,
                { backgroundColor: tint(colors.primary, 0.12) },
              ]}
            >
              <MaterialIcons name="add" size={18} color={colors.primary} />
            </View>
            <Text style={styles.cardTitle}>Join a Class</Text>
            <MaterialIcons
              name={showJoin ? "expand-less" : "expand-more"}
              size={20}
              color={colors.outline}
            />
          </View>
          {showJoin && (
            <View style={[styles.inputRow, { marginTop: spacing.sm }]}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={joinCode}
                onChangeText={(t) => setJoinCode(t.toUpperCase())}
                placeholder="e.g. SCIENCE2026-TOM"
                placeholderTextColor={colors.outlineVariant}
                autoCapitalize="characters"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={joinClass}
                disabled={joinLoading}
              >
                {joinLoading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.actionBtnText}>Join</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </TouchableOpacity>

        {view === "list" &&
          (classes.length === 0 ? (
            <View style={styles.empty}>
              <MaterialIcons
                name="school"
                size={40}
                color={colors.outlineVariant}
              />
              <Text style={styles.emptyText}>
                No classes yet. Join one above.
              </Text>
            </View>
          ) : (
            classes.map((cls) => (
              <TouchableOpacity
                key={cls.id}
                style={[patterns.card, shadows.card, styles.section]}
                onPress={() => openClass(cls)}
                activeOpacity={0.8}
              >
                <View style={styles.headRow}>
                  <View
                    style={[
                      styles.chip,
                      { backgroundColor: tint(colors.primary, 0.1) },
                    ]}
                  >
                    <MaterialIcons
                      name="class"
                      size={18}
                      color={colors.primary}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={styles.cardTitle}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.82}
                    >
                      {cls.name}
                    </Text>
                    <Text style={styles.hint}>{cls.join_code}</Text>
                  </View>
                  <LivePill active={cls.session_active} />
                  <MaterialIcons
                    name="chevron-right"
                    size={20}
                    color={colors.outline}
                  />
                </View>
              </TouchableOpacity>
            ))
          ))}

        {view === "detail" && (
          <>
            <TouchableOpacity
              style={styles.backRow}
              onPress={() => setView("list")}
            >
              <MaterialIcons
                name="arrow-back"
                size={20}
                color={colors.primary}
              />
              <Text style={styles.backText}>All classes</Text>
            </TouchableOpacity>

            <View style={[patterns.card, shadows.card, styles.section]}>
              <View style={styles.headRow}>
                <View
                  style={[
                    styles.chip,
                    { backgroundColor: tint(colors.primary, 0.1) },
                  ]}
                >
                  <MaterialIcons
                    name="class"
                    size={18}
                    color={colors.primary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={styles.cardTitle}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.82}
                  >
                    {selected?.name}
                  </Text>
                  <Text style={styles.hint}>{selected?.join_code}</Text>
                </View>
                <LivePill active={selected?.session_active} />
              </View>

              <TouchableOpacity
                style={[
                  styles.primaryBtn,
                  !selected?.session_active && { opacity: 0.35 },
                ]}
                onPress={handleTurnOn}
                disabled={!selected?.session_active}
              >
                <MaterialIcons
                  name="lock"
                  size={18}
                  color={colors.onPrimaryContainer}
                />
                <Text style={styles.primaryBtnText}>Turn on School Mode</Text>
              </TouchableOpacity>

              {!selected?.session_active && (
                <Text style={[styles.hint, { textAlign: "center" }]}>
                  Waiting for your teacher to start a session.
                </Text>
              )}
            </View>

            <View style={[patterns.card, shadows.card, styles.section]}>
              <View style={styles.headRow}>
                <View
                  style={[
                    styles.chip,
                    { backgroundColor: tint(colors.primary, 0.1) },
                  ]}
                >
                  <MaterialIcons
                    name="event-available"
                    size={18}
                    color={colors.primary}
                  />
                </View>
                <Text style={styles.cardTitle}>My Attendance</Text>
              </View>

              {/* Month nav */}
              <View style={patterns.rowBetween}>
                <TouchableOpacity
                  style={styles.monthArrow}
                  onPress={() => {
                    if (sGridMonth === 0) {
                      setSGridMonth(11);
                      setSGridYear((y) => y - 1);
                    } else setSGridMonth((m) => m - 1);
                  }}
                >
                  <MaterialIcons
                    name="chevron-left"
                    size={20}
                    color={colors.warmBrown}
                  />
                </TouchableOpacity>
                <Text style={styles.monthName}>
                  {MONTH_NAMES[sGridMonth]} {sGridYear}
                </Text>
                <TouchableOpacity
                  style={[
                    styles.monthArrow,
                    sGridYear === sNow.getFullYear() &&
                      sGridMonth === sNow.getMonth() && { opacity: 0.3 },
                  ]}
                  onPress={() => {
                    if (
                      sGridYear === sNow.getFullYear() &&
                      sGridMonth === sNow.getMonth()
                    )
                      return;
                    if (sGridMonth === 11) {
                      setSGridMonth(0);
                      setSGridYear((y) => y + 1);
                    } else setSGridMonth((m) => m + 1);
                  }}
                  disabled={
                    sGridYear === sNow.getFullYear() &&
                    sGridMonth === sNow.getMonth()
                  }
                >
                  <MaterialIcons
                    name="chevron-right"
                    size={20}
                    color={colors.warmBrown}
                  />
                </TouchableOpacity>
              </View>

              {/* Legend */}
              <View style={styles.legendRow}>
                <View
                  style={[styles.legendCell, { backgroundColor: "#A5D6A7" }]}
                />
                <Text style={styles.legendLabel}>Present</Text>
                <View
                  style={[styles.legendCell, { backgroundColor: "#EF9A9A" }]}
                />
                <Text style={styles.legendLabel}>Absent</Text>
              </View>

              {/* DOW header */}
              <View style={styles.dowRow}>
                {ATT_DAYS.map((d, i) => (
                  <Text key={i} style={styles.dowLabel}>
                    {d}
                  </Text>
                ))}
              </View>

              {/* Grid */}
              <View style={{ gap: 4 }}>
                {buildAttendanceMonthGrid(
                  attendanceByDate,
                  sGridYear,
                  sGridMonth,
                ).map((row, ri) => (
                  <View key={ri} style={{ flexDirection: "row", gap: 4 }}>
                    {row.map((cell, ci) =>
                      cell === null ? (
                        <View key={ci} style={styles.gridCell} />
                      ) : (
                        <View
                          key={ci}
                          style={[
                            styles.gridCell,
                            {
                              backgroundColor: cell.status
                                ? attCellColor(cell.status)
                                : `${colors.primary}10`,
                            },
                          ]}
                        >
                          <Text style={styles.gridDayNum}>{cell.day}</Text>
                        </View>
                      ),
                    )}
                  </View>
                ))}
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {/* Session code modal */}
      <Modal visible={sessionModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.cardTitle}>Enter Session Code</Text>
            <Text style={styles.hint}>
              Your teacher will tell you this at the start of class.
            </Text>
            <TextInput
              style={styles.codeInput}
              value={sessionCodeInput}
              onChangeText={(t) => setSessionCodeInput(t.toUpperCase())}
              placeholder="Enter code"
              placeholderTextColor={colors.outlineVariant}
              autoCapitalize="characters"
              autoFocus
            />
            <View style={styles.inputRow}>
              <TouchableOpacity
                style={[styles.cancelBtn, { flex: 1 }]}
                onPress={() => {
                  setSessionModal(false);
                  setSessionCodeInput("");
                }}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  { flex: 1 },
                  startingSchoolMode && { opacity: 0.65 },
                ]}
                onPress={confirmSessionCode}
                disabled={startingSchoolMode}
              >
                {startingSchoolMode ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.actionBtnText}>Turn On</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── "Put your phone in the box" countdown overlay ── */}
      <Modal
        visible={joinCountdown !== null}
        transparent
        animationType="fade"
        statusBarTranslucent
      >
        <View style={styles.overlayBackdrop}>
          <View style={[styles.overlayCard, shadows.soft]}>
            <MaterialIcons
              name="phonelink-lock"
              size={48}
              color={colors.primaryContainer}
            />

            <Text style={styles.overlayTitle}>Put your phone in the box</Text>
            <Text style={styles.overlaySubtitle}>
              School Mode will begin in
            </Text>

            <Animated.Text
              style={[
                styles.overlayCountdown,
                { transform: [{ scale: joinCountdownAnim }] },
              ]}
            >
              {joinCountdown}
            </Animated.Text>

            <View style={styles.overlayProgressTrack}>
              <View
                style={[
                  styles.overlayProgressFill,
                  { width: `${((10 - (joinCountdown ?? 0)) / 10) * 100}%` },
                ]}
              />
            </View>

            <TouchableOpacity
              style={styles.overlayCancelBtn}
              onPress={cancelSchoolCountdown}
              activeOpacity={0.75}
            >
              <Text style={styles.overlayCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surfaceContainerLow },
  pageHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: `${colors.orange}18`,
  },
  roleHeader: {
    paddingHorizontal: spacing.containerPadding,
    paddingTop: spacing.xs,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: `${colors.orange}14`,
  },
  pageTitle: { ...typography.h3, color: colors.warmBrown },
  pageSubtitle: {
    ...typography.labelCaps,
    fontSize: 11,
    letterSpacing: 1.4,
    color: colors.outline,
  },
  scroll: {
    paddingTop: spacing.md,
    paddingBottom: 120,
    gap: spacing.gutter,
  },

  section: { gap: spacing.sm },
  headRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flexWrap: "nowrap",
  },
  backRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  backText: { ...typography.bodyMd, color: colors.primary, fontWeight: "600" },
  inlineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },

  empty: { alignItems: "center", gap: spacing.sm, paddingVertical: spacing.xl },
  emptyText: {
    ...typography.bodyMd,
    color: colors.outline,
    textAlign: "center",
  },

  cardTitle: {
    ...typography.h3,
    fontSize: 15,
    color: colors.warmBrown,
    flexShrink: 1,
  },
  label: {
    ...typography.bodyMd,
    fontSize: 14,
    color: colors.onSurface,
    fontWeight: "600",
  },
  hint: {
    ...typography.bodySm,
    color: colors.outline,
    marginTop: 2,
    fontSize: 13,
  },
  statusText: { ...typography.labelCaps, fontSize: 9 },

  chip: {
    width: 34,
    height: 34,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: radii.full,
  },
  pillText: { ...typography.labelCaps, fontSize: 9, includeFontPadding: false },
  dot: { width: 6, height: 6, borderRadius: 3 },

  inputRow: { flexDirection: "row", gap: spacing.sm, alignItems: "center" },
  input: {
    ...typography.bodyMd,
    color: colors.onSurface,
    backgroundColor: colors.surfaceContainer,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  codeInput: {
    ...typography.h2,
    fontSize: 22,
    letterSpacing: 4,
    color: colors.warmBrown,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
    textAlign: "center",
    paddingVertical: 10,
    width: "100%",
  },
  actionBtn: {
    backgroundColor: colors.primary,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtnText: { ...typography.bodySm, color: "#fff", fontWeight: "700" },
  cancelBtn: {
    borderRadius: radii.lg,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  cancelBtnText: {
    ...typography.bodySm,
    color: colors.primary,
    fontWeight: "600",
  },

  overlayBackdrop: {
    flex: 1,
    backgroundColor: "rgba(30,20,10,0.72)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.containerPadding,
  },
  overlayCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radii["4xl"],
    padding: spacing.xl,
    alignItems: "center",
    gap: spacing.sm,
  },
  overlayTitle: {
    ...typography.h2,
    color: colors.warmBrown,
    textAlign: "center",
  },
  overlaySubtitle: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    textAlign: "center",
  },
  overlayCountdown: {
    ...typography.timerDisplay,
    fontSize: 56,
    color: colors.primary,
    marginVertical: 2,
  },
  overlayProgressTrack: {
    width: "100%",
    height: 8,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceContainer,
    overflow: "hidden",
    marginTop: 4,
  },
  overlayProgressFill: {
    height: "100%",
    borderRadius: radii.full,
    backgroundColor: colors.primaryContainer,
  },
  overlayCancelBtn: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  overlayCancelText: {
    ...typography.bodySm,
    color: colors.primary,
    fontWeight: "700",
  },

  generateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  generateBtnText: {
    ...typography.bodySm,
    color: colors.primary,
    fontWeight: "600",
  },

  primaryBtn: {
    backgroundColor: colors.primaryContainer,
    borderRadius: radii["2xl"],
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  primaryBtnText: {
    ...typography.bodyMd,
    color: colors.onPrimaryContainer,
    fontWeight: "700",
  },

  // Session info strip (teacher live view)
  teacherTimerWrap: {
    alignItems: "center",
    marginTop: spacing.sm,
    marginBottom: 4,
  },
  teacherTimerFace: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.surfaceContainerLowest,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: `${colors.orange}22`,
  },
  teacherTimerText: {
    ...typography.h2,
    fontSize: 22,
    color: colors.warmBrown,
    letterSpacing: -1,
  },
  teacherTimerSub: {
    ...typography.labelCaps,
    fontSize: 9,
    color: colors.outline,
    marginTop: 2,
  },

  sessionInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: tint(colors.success, 0.06),
    borderRadius: radii.lg,
    padding: spacing.sm,
    marginTop: spacing.sm,
    gap: 0,
  },
  sessionInfoItem: { flex: 1, alignItems: "center", gap: 2 },
  sessionInfoLabel: {
    ...typography.labelCaps,
    fontSize: 9,
    color: colors.outline,
  },
  sessionInfoValue: { ...typography.h3, fontSize: 18, color: colors.warmBrown },
  sessionInfoDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.outlineVariant,
  },

  // Roster
  studentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },
  studentInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flex: 1,
  },
  attBtns: { flexDirection: "row", gap: 6 },
  attBtn: {
    width: 28,
    height: 28,
    borderRadius: radii.full,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },

  // Right-side actions in a roster row (end-session button + presence toggle)
  rowActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  endStudentBtn: {
    width: 28,
    height: 28,
    borderRadius: radii.full,
    borderWidth: 1.5,
    borderColor: colors.error,
    backgroundColor: tint(colors.error, 0.08),
    alignItems: "center",
    justifyContent: "center",
  },
  toggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.full,
    borderWidth: 1.5,
  },
  toggleText: {
    ...typography.labelCaps,
    fontSize: 10,
  },

  // Attendance monthly calendar
  monthArrow: {
    width: 32,
    height: 32,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: "center",
    justifyContent: "center",
  },
  monthName: { ...typography.h3, fontSize: 16, color: colors.warmBrown },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-end",
  },
  legendLabel: { ...typography.labelCaps, fontSize: 9, color: colors.outline },
  legendCell: { width: 12, height: 12, borderRadius: 3 },
  dowRow: { flexDirection: "row", gap: 4, marginBottom: 2 },
  dowLabel: {
    flex: 1,
    textAlign: "center",
    ...typography.labelCaps,
    fontSize: 9,
    color: colors.outline,
  },
  gridCell: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  gridCellSelected: {
    borderWidth: 2,
    borderColor: colors.warmBrown,
  },
  gridDayNum: {
    ...typography.bodySm,
    fontSize: 11,
    color: colors.warmBrown,
  },
  dayDetailSection: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
  },

  // Session log event icon chip
  eventIcon: {
    width: 28,
    height: 28,
    borderRadius: radii.full,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },

  recordRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
  },

  timerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  counter: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    borderRadius: radii.full,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  counterText: {
    ...typography.bodySm,
    color: colors.warmBrown,
    minWidth: 56,
    textAlign: "center",
  },

  // Duration picker in teacher modal
  durationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: 6,
  },
  durationStep: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceContainer,
    alignItems: "center",
    justifyContent: "center",
  },
  durationInput: {
    ...typography.h2,
    fontSize: 22,
    color: colors.warmBrown,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
    minWidth: 60,
    textAlign: "center",
    paddingVertical: 4,
  },
  durationUnit: { ...typography.bodyMd, color: colors.outline },

  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(30,20,10,0.6)",
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.containerPadding,
  },
  modalCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radii["4xl"],
    padding: spacing.md,
    width: "100%",
    gap: spacing.sm,
    ...shadows.soft,
  },
});

export default SchoolScreen;
