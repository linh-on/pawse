// ActiveSessionScreen.js
import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import CircularProgress from "../components/CircularProgress";
import Header from "../components/Header";
import { usePawseBox } from "../context/PawseBoxContext";
import { colors, spacing, radii, shadows, typography } from "../theme";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/AuthContext";
import { responsive } from "../utils/responsive";

import { fmt, parseTime } from "./active-session/utils";
import { useNotifSimulator } from "./active-session/useNotifSimulator";
import NotifPanel from "./active-session/NotifPanel";
import UrgentModal from "./active-session/UrgentModal";

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

const ActiveSessionScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const r = responsive(width);
  const timerSize = r.timerSize;
  const timerFaceSize = Math.max(190, timerSize - 48);

  const { user } = useAuth();
  const {
    durationMinutes = 45,
    initialRemainingSeconds,
    existingSessionId,
  } = route.params ?? {};

  const TOTAL_SECONDS = durationMinutes * 60;

  const {
    connected,
    state: boxState,
    remaining: boxRemaining,
    actions,
  } = usePawseBox();

  const [localRemaining, setLocalRemaining] = useState(
    typeof initialRemainingSeconds === "number"
      ? initialRemainingSeconds
      : TOTAL_SECONDS,
  );

  const isResumingFromGrace = Boolean(
    existingSessionId && typeof initialRemainingSeconds === "number",
  );

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const sessionStartedRef = useRef(false);
  const dbSessionIdRef = useRef(existingSessionId ?? null);
  const sessionFinishedRef = useRef(false);
  const hasNavigatedRef = useRef(false);
  const sessionStartedWithoutBoxRef = useRef(!connected);

  // Fix: track whether the box has transitioned OUT of DONE since mount.
  // If the box was already DONE when we arrived (leftover from last session),
  // we must not treat that as "current session finished".
  const boxHasBeenActiveRef = useRef(boxState !== "DONE");

  useEffect(() => {
    if (boxState !== "DONE") {
      boxHasBeenActiveRef.current = true;
    }
  }, [boxState]);

  const saveNotificationLog = async (entry) => {
    if (!dbSessionIdRef.current) return;
    const { error } = await supabase.from("notification_logs").insert({
      session_id: dbSessionIdRef.current,
      text: entry.text,
      predicted_label: entry.predicted,
      was_allowed: entry.predicted === "urgent",
    });
    if (error) console.warn("Could not save notification log:", error.message);
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

  // Auto-start listening when in real mode
  useEffect(() => {
    if (sim.mode === "real") sim.start();
  }, [sim.mode]);

  useEffect(() => {
    let mounted = true;
    const createSession = async () => {
      if (!user?.id) return;
      if (existingSessionId) {
        dbSessionIdRef.current = existingSessionId;
        return;
      }
      const { data, error } = await supabase
        .from("sessions")
        .insert({
          user_id: user.id,
          duration_minutes: durationMinutes,
          started_at: new Date().toISOString(),
          completed: false,
        })
        .select("id")
        .single();
      if (error) {
        console.warn("Could not create focus session:", error.message);
        return;
      }
      if (mounted) dbSessionIdRef.current = data.id;
    };
    createSession();
    return () => {
      mounted = false;
    };
  }, [user?.id, durationMinutes, existingSessionId]);

  const finishDbSession = async (completed) => {
    if (!dbSessionIdRef.current || sessionFinishedRef.current) return;
    sessionFinishedRef.current = true;

    if (!completed && connected) {
      await actions.endSession();
    }

    const { error } = await supabase
      .from("sessions")
      .update({ ended_at: new Date().toISOString(), completed })
      .eq("id", dbSessionIdRef.current);
    if (error) console.warn("Could not update focus session:", error.message);
  };

  useEffect(() => {
    if (!connected || sessionStartedRef.current) return;

    if (sessionStartedWithoutBoxRef.current) {
      sessionStartedRef.current = true;
      return;
    }

    const seconds = Math.max(0, Math.floor(localRemaining));
    if (isResumingFromGrace) {
      actions.resume(true, seconds);
    } else {
      actions.startSession(Math.ceil(seconds / 60));
    }
    sessionStartedRef.current = true;
  }, [connected, localRemaining, isResumingFromGrace, actions]);

  useEffect(() => {
    const id = setInterval(
      () => setLocalRemaining((r) => (r > 0 ? r - 1 : 0)),
      1000,
    );
    return () => clearInterval(id);
  }, []);

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

  const boxIsActive =
    connected &&
    (boxState === "LOCKED" ||
      boxState === "URGENT" ||
      boxState === "RESUME" ||
      boxState === "DONE");
  const boxRemainingSecs = boxIsActive ? parseTime(boxRemaining) : null;
  const remainingSecs =
    typeof boxRemainingSecs === "number" && boxRemainingSecs > 0
      ? Math.min(localRemaining, boxRemainingSecs)
      : localRemaining;

  const goToGracePeriod = useCallback(async () => {
    const pausedSeconds = Math.max(0, Math.floor(remainingSecs));
    if (connected) {
      await actions.pauseSession(pausedSeconds);
    }
    sim.clearModal();
    navigation.replace("GracePeriod", {
      durationMinutes,
      remainingSeconds: pausedSeconds,
      sessionId: dbSessionIdRef.current,
    });
  }, [connected, remainingSecs, actions, sim, navigation, durationMinutes]);

  const prevBoxState = useRef(boxState);
  useEffect(() => {
    if (
      connected &&
      prevBoxState.current === "URGENT" &&
      boxState !== "URGENT"
    ) {
      if (boxState === "RESUME") {
        sim.dismissModal();
        if (!hasNavigatedRef.current) {
          hasNavigatedRef.current = true;
          goToGracePeriod();
        }
      } else if (boxState === "LOCKED") {
        sim.dismissModal();
      }
    }
    prevBoxState.current = boxState;
  }, [boxState, connected, sim, goToGracePeriod]);

  const displayTime = fmt(remainingSecs);
  const progress = TOTAL_SECONDS > 0 ? remainingSecs / TOTAL_SECONDS : 0;

  useEffect(() => {
    const localTimerDone = remainingSecs <= 0;
    // Only treat box DONE as session-complete if the box has been active
    // during THIS session (guards against leftover DONE from previous session)
    const boxTimerDone =
      connected && boxState === "DONE" && boxHasBeenActiveRef.current;

    if ((localTimerDone || boxTimerDone) && !hasNavigatedRef.current) {
      hasNavigatedRef.current = true;
      sim.clearModal();
      finishDbSession(true).then(() => navigation.replace("HomeScreen"));
    }
  }, [remainingSecs, boxState, connected, sim, navigation]);

  return (
    <View style={styles.screen}>
      <Header badge="Focus Active" showProfile={false} />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingBottom: insets.bottom + spacing.xl,
            paddingHorizontal: r.screenPadding,
            maxWidth: r.contentMaxWidth,
            width: "100%",
            alignSelf: "center",
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleBlock}>
          <Text style={styles.title}>Deep Focus Session</Text>
          <Text style={styles.subtitle}>
            Your phone is tucked away for a while.
          </Text>

          <View style={styles.boxIndicator}>
            <View
              style={[
                styles.boxDot,
                {
                  backgroundColor: connected
                    ? "#1F8A3F"
                    : colors.outlineVariant,
                },
              ]}
            />
            <Text
              style={[
                styles.boxStatus,
                { color: connected ? "#1F8A3F" : colors.outline },
              ]}
            >
              {connected ? "Box connected" : "Box offline"}
            </Text>
          </View>

          {sessionStartedWithoutBoxRef.current && !connected && (
            <View style={styles.noBoxBanner}>
              <MaterialIcons
                name="bluetooth-disabled"
                size={16}
                color={colors.error}
              />
              <Text style={styles.noBoxText}>
                Box wasn't connected at start — connect before your next session
                for full sync.
              </Text>
            </View>
          )}
        </View>

        <Animated.View
          style={[styles.ringWrap, { transform: [{ scale: pulseAnim }] }]}
        >
          <CircularProgress
            size={timerSize}
            strokeWidth={10}
            progress={progress}
            trackColor={colors.surfaceContainerHighest}
            fillColor={colors.primaryContainer}
          >
            <View
              style={[
                styles.timerFace,
                shadows.timer,
                {
                  width: timerFaceSize,
                  height: timerFaceSize,
                  borderRadius: timerFaceSize / 2,
                },
              ]}
            >
              <MaterialIcons
                name="lock"
                size={30}
                color={colors.primaryContainer}
                style={{ marginBottom: 6 }}
              />
              <Text style={styles.timerText}>{displayTime}</Text>
              <Text style={styles.timerSub}>remaining</Text>
            </View>
          </CircularProgress>
        </Animated.View>

        <NotifPanel
          feed={sim.feed}
          isRunning={sim.isRunning}
          mode={sim.mode}
          hasPermission={sim.hasPermission}
          onTogglePlay={sim.togglePlay}
          onFireNext={sim.fireNext}
          onRequestPermission={sim.requestPermission}
        />

        <TouchableOpacity
          style={styles.overrideBtn}
          onPress={goToGracePeriod}
          activeOpacity={0.75}
        >
          <View style={styles.overrideCircle}>
            <MaterialIcons name="emergency" size={24} color={colors.outline} />
          </View>
          <Text style={styles.overrideCaption}>In case of emergency</Text>
          <Text style={styles.overrideLink}>Urgent Override</Text>
        </TouchableOpacity>
      </ScrollView>

      <UrgentModal
        entry={sim.urgentModal}
        scale={sim.modalScale}
        opacity={sim.modalOpacity}
        connected={connected}
        onDismiss={sim.dismissModal}
        onOverride={goToGracePeriod}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scroll: {
    alignItems: "center",
    paddingTop: spacing.xl,
    gap: spacing.lg,
  },
  titleBlock: { alignItems: "center", gap: 6, width: "100%" },
  title: { ...typography.h2, color: colors.onSurface },
  subtitle: { ...typography.bodySm, color: colors.onSurfaceVariant },
  boxIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  boxDot: { width: 8, height: 8, borderRadius: 4 },
  boxStatus: { ...typography.labelCaps, fontSize: 10 },
  noBoxBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: `${colors.error}15`,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: `${colors.error}30`,
    marginTop: 8,
    width: "100%",
  },
  noBoxText: {
    ...typography.bodySm,
    color: colors.error,
    flex: 1,
    lineHeight: 18,
  },
  ringWrap: { alignItems: "center" },
  timerFace: {
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: colors.surfaceContainerLowest,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: `${colors.orange}22`,
  },
  timerText: { ...typography.timerDisplay, color: colors.onPrimaryFixed },
  timerSub: { ...typography.labelCaps, color: colors.outline, marginTop: 6 },
  overrideBtn: { alignItems: "center", gap: 6 },
  overrideCircle: {
    width: 56,
    height: 56,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceContainer,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  overrideCaption: {
    ...typography.labelCaps,
    color: colors.outline,
    fontSize: 10,
  },
  overrideLink: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    fontWeight: "700",
    textDecorationLine: "underline",
    textDecorationStyle: "dotted",
  },
});

export default ActiveSessionScreen;
