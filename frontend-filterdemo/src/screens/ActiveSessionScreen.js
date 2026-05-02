import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ScrollView,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import CircularProgress from "../components/CircularProgress";
import Header from "../components/Header";
import { usePawseBox } from "../hooks/usePawseBox";
import { colors, spacing, radii, shadows, typography } from "../theme";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/AuthContext";

import { fmt, parseTime } from "./active-session/utils";
import { useNotifSimulator } from "./active-session/useNotifSimulator";
import NotifPanel from "./active-session/NotifPanel";
import UrgentModal from "./active-session/UrgentModal";

// ─── Modes ────────────────────────────────────────────────────────────────────
// "focus"  — normal countdown, phone in box
// "grace"  — override pressed, grace period counting down
//            user can Continue (resume focus) or let it expire (restart focus)

const ActiveSessionScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const { durationMinutes = 45 } = route.params ?? {};
  const TOTAL_SECONDS = durationMinutes * 60;

  const { connected, remaining: boxRemaining, actions } = usePawseBox();

  // ── Core timer state ──
  const [mode, setMode] = useState("focus"); // "focus" | "grace"
  const [localRemaining, setLocalRemaining] = useState(TOTAL_SECONDS);
  const [gracePeriodSecs, setGracePeriodSecs] = useState(10 * 60); // default 10 min
  const [graceRemaining, setGraceRemaining] = useState(10 * 60);

  // Snapshot of focus time when override was pressed — used to resume
  const pausedFocusRef = useRef(null);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const sessionStartedRef = useRef(false);
  const dbSessionIdRef = useRef(null);
  const sessionFinishedRef = useRef(false);
  const hasNavigatedRef = useRef(false);

  // ── Fetch grace period from user preferences ──
  useEffect(() => {
    async function fetchGrace() {
      if (!user?.id) return;
      const { data } = await supabase
        .from("preferences")
        .select("grace_period_minutes")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data?.grace_period_minutes) {
        const secs = data.grace_period_minutes * 60;
        setGracePeriodSecs(secs);
        setGraceRemaining(secs);
      }
    }
    fetchGrace();
  }, [user?.id]);

  // ── Notification simulator ──
  const saveNotificationLog = async (entry) => {
    if (!dbSessionIdRef.current) return;
    await supabase.from("notification_logs").insert({
      session_id: dbSessionIdRef.current,
      text: entry.text,
      predicted_label: entry.predicted,
      was_allowed: entry.predicted === "urgent",
    });
  };

  const sim = useNotifSimulator({
    onNotificationClassified: saveNotificationLog,
    onUrgentDetected: (entry) => {
      if (connected) actions.sendUrgent(entry.text.slice(0, 16));
    },
    onUrgentDismiss: () => {
      if (connected) actions.respondUrgent(false);
    },
  });

  // ── Create DB session row on mount ──
  useEffect(() => {
    let mounted = true;
    async function createSession() {
      if (!user?.id) return;
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
        console.warn("Could not create session:", error.message);
        return;
      }
      if (mounted) dbSessionIdRef.current = data.id;
    }
    createSession();
    return () => {
      mounted = false;
    };
  }, [user?.id, durationMinutes]);

  const finishDbSession = async (completed) => {
    if (!dbSessionIdRef.current || sessionFinishedRef.current) return;
    sessionFinishedRef.current = true;
    await supabase
      .from("sessions")
      .update({ ended_at: new Date().toISOString(), completed })
      .eq("id", dbSessionIdRef.current);
  };

  // ── Tell box to start when first connected ──
  useEffect(() => {
    if (connected && !sessionStartedRef.current) {
      actions.startSession(durationMinutes);
      sessionStartedRef.current = true;
    }
  }, [connected, durationMinutes]);

  // ── Focus countdown (local fallback when box not connected) ──
  useEffect(() => {
    if (connected) return; // box drives the timer
    if (mode !== "focus") return; // paused during grace
    const id = setInterval(
      () => setLocalRemaining((r) => (r > 0 ? r - 1 : 0)),
      1000,
    );
    return () => clearInterval(id);
  }, [connected, mode]);

  // ── Grace countdown ──
  useEffect(() => {
    if (mode !== "grace") return;
    const id = setInterval(
      () => setGraceRemaining((r) => (r > 0 ? r - 1 : 0)),
      1000,
    );
    return () => clearInterval(id);
  }, [mode]);

  // ── Grace expired → restart focus timer from full duration ──
  useEffect(() => {
    if (mode !== "grace") return;
    if (graceRemaining <= 0) {
      // Grace over — restart focus from full duration
      setLocalRemaining(TOTAL_SECONDS);
      setGraceRemaining(gracePeriodSecs); // reset grace for potential future use
      pausedFocusRef.current = null;
      setMode("focus");
    }
  }, [graceRemaining, mode]);

  // ── Focus timer hit zero → session complete ──
  const remainingSecs = connected ? parseTime(boxRemaining) : localRemaining;
  const displayTime = connected ? boxRemaining : fmt(localRemaining);
  const focusProgress = remainingSecs / TOTAL_SECONDS;

  useEffect(() => {
    if (mode !== "focus") return;
    if (remainingSecs <= 0 && !hasNavigatedRef.current) {
      hasNavigatedRef.current = true;
      sim.clearModal();
      finishDbSession(true).then(() => navigation.navigate("Home"));
    }
  }, [remainingSecs, mode]);

  // ── Glow pulse ──
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
  }, []);

  // ── Override: enter grace mode ──
  function handleOverride() {
    sim.clearModal();
    // Snapshot remaining focus time so we can resume it
    pausedFocusRef.current = connected
      ? parseTime(boxRemaining)
      : localRemaining;
    setGraceRemaining(gracePeriodSecs); // fresh grace countdown
    setMode("grace");
  }

  // ── Continue: exit grace, resume focus from snapshot ──
  function handleContinue() {
    if (pausedFocusRef.current !== null) {
      setLocalRemaining(pausedFocusRef.current);
      pausedFocusRef.current = null;
    }
    setMode("focus");
  }

  // ── End session entirely (from grace screen) ──
  async function handleEndSession() {
    await finishDbSession(false);
    navigation.navigate("Home");
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // GRACE MODE SCREEN
  // ─────────────────────────────────────────────────────────────────────────────
  if (mode === "grace") {
    const graceProgress = graceRemaining / gracePeriodSecs;

    return (
      <View style={styles.screen}>
        <Header badge="Grace Period" showProfile={false} />

        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingBottom: insets.bottom + spacing.xl },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Title */}
          <View style={styles.titleBlock}>
            <Text style={styles.title}>Taking a break?</Text>
            <Text style={styles.subtitle}>
              Your session is paused. Continue before the grace period ends.
            </Text>
          </View>

          {/* Grace countdown ring — red tint */}
          <Animated.View
            style={[styles.ringWrap, { transform: [{ scale: pulseAnim }] }]}
          >
            <CircularProgress
              size={288}
              strokeWidth={10}
              progress={graceProgress}
              trackColor={colors.surfaceContainerHighest}
              fillColor={colors.error}
            >
              <View
                style={[
                  styles.timerFace,
                  { borderColor: `${colors.error}22` },
                  shadows.timer,
                ]}
              >
                <MaterialIcons
                  name="timer-off"
                  size={30}
                  color={colors.error}
                  style={{ marginBottom: 6 }}
                />
                <Text style={[styles.timerText, { color: colors.error }]}>
                  {fmt(graceRemaining)}
                </Text>
                <Text style={styles.timerSub}>grace left</Text>
              </View>
            </CircularProgress>
          </Animated.View>

          {/* Paused focus time */}
          <View style={styles.pausedBadge}>
            <MaterialIcons
              name="pause-circle"
              size={16}
              color={colors.outline}
            />
            <Text style={styles.pausedText}>
              Focus paused at {fmt(pausedFocusRef.current ?? localRemaining)}
            </Text>
          </View>

          {/* Continue button */}
          <TouchableOpacity
            style={styles.continueBtn}
            onPress={handleContinue}
            activeOpacity={0.85}
          >
            <MaterialIcons
              name="play-arrow"
              size={22}
              color={colors.onPrimaryContainer}
            />
            <Text style={styles.continueBtnText}>Continue Session</Text>
          </TouchableOpacity>

          {/* End session — small, at the bottom */}
          <TouchableOpacity
            style={styles.overrideBtn}
            onPress={handleEndSession}
            activeOpacity={0.75}
          >
            <View style={styles.overrideCircle}>
              <MaterialIcons name="stop" size={24} color={colors.outline} />
            </View>
            <Text style={styles.overrideCaption}>Give up for today</Text>
            <Text style={styles.overrideLink}>End Session</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // FOCUS MODE SCREEN (unchanged layout)
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <View style={styles.screen}>
      <Header badge="Focus Active" showProfile={false} />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + spacing.xl },
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
        </View>

        <Animated.View
          style={[styles.ringWrap, { transform: [{ scale: pulseAnim }] }]}
        >
          <CircularProgress
            size={288}
            strokeWidth={10}
            progress={focusProgress}
            trackColor={colors.surfaceContainerHighest}
            fillColor={colors.primaryContainer}
          >
            <View style={[styles.timerFace, shadows.timer]}>
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
          onTogglePlay={sim.togglePlay}
          onFireNext={sim.fireNext}
        />

        <TouchableOpacity
          style={styles.overrideBtn}
          onPress={handleOverride}
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
        onOverride={handleOverride}
      />
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scroll: {
    alignItems: "center",
    paddingHorizontal: spacing.containerPadding,
    paddingTop: spacing.xl,
    gap: spacing.lg,
  },
  titleBlock: { alignItems: "center", gap: 6 },
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

  // Grace-specific
  pausedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.surfaceContainer,
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  pausedText: { ...typography.bodySm, color: colors.outline },
  continueBtn: {
    backgroundColor: colors.primaryContainer,
    borderRadius: radii["3xl"],
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    ...shadows.soft,
  },
  continueBtnText: {
    ...typography.h3,
    fontSize: 16,
    color: colors.onPrimaryContainer,
  },

  // Override / End button (same pattern, used in both modes)
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
