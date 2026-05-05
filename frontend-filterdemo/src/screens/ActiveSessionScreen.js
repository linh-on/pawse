// ActiveSessionScreen.js — only the NotifPanel call and sim hook usage changed.
// Everything else is identical to the original.
//
// Changes vs original:
//   1. sim now returns mode, hasPermission, requestPermission
//   2. NotifPanel receives those three new props

import React, { useState, useEffect, useRef } from "react";
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
import { usePawseBox } from "../hooks/usePawseBox";
import { colors, spacing, radii, shadows, typography } from "../theme";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/AuthContext";
import { responsive } from "../utils/responsive";

import { fmt, parseTime } from "./active-session/utils";
import { useNotifSimulator } from "./active-session/useNotifSimulator";
import NotifPanel from "./active-session/NotifPanel";
import UrgentModal from "./active-session/UrgentModal";

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

  const { connected, state: boxState, remaining: boxRemaining, actions } = usePawseBox();

  const [localRemaining, setLocalRemaining] = useState(
    typeof initialRemainingSeconds === "number"
      ? initialRemainingSeconds
      : TOTAL_SECONDS,
  );

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const sessionStartedRef = useRef(false);
  const dbSessionIdRef = useRef(existingSessionId ?? null);
  const sessionFinishedRef = useRef(false);
  const hasNavigatedRef = useRef(false);

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
      if (connected) actions.sendUrgent(entry.text.slice(0, 16));
    },
    onUrgentDismiss: () => {
      if (connected) actions.respondUrgent(false);
    },
    userId: user?.id,
  });

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
    const { error } = await supabase
      .from("sessions")
      .update({ ended_at: new Date().toISOString(), completed })
      .eq("id", dbSessionIdRef.current);
    if (error) console.warn("Could not update focus session:", error.message);
  };

  useEffect(() => {
    if (connected && !sessionStartedRef.current) {
      actions.startSession(Math.ceil(localRemaining / 60));
      sessionStartedRef.current = true;
    }
  }, [connected, localRemaining]);

  useEffect(() => {
    if (connected) return;
    const id = setInterval(
      () => setLocalRemaining((r) => (r > 0 ? r - 1 : 0)),
      1000,
    );
    return () => clearInterval(id);
  }, [connected]);

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

  const remainingSecs = connected ? parseTime(boxRemaining) : localRemaining;

  // Auto-dismiss the urgent modal when the hardware resolves it (user pressed
  // Yes/No on the physical buttons). The box state leaves "URGENT" → "LOCKED".
  const prevBoxState = useRef(boxState);
  useEffect(() => {
    if (
      connected &&
      prevBoxState.current === "URGENT" &&
      boxState !== "URGENT" &&
      sim.urgentModal
    ) {
      sim.dismissModal();
    }
    prevBoxState.current = boxState;
  }, [boxState, connected, sim]);
  const displayTime = connected ? boxRemaining : fmt(localRemaining);
  const progress = TOTAL_SECONDS > 0 ? remainingSecs / TOTAL_SECONDS : 0;

  useEffect(() => {
    if (remainingSecs <= 0 && !hasNavigatedRef.current) {
      hasNavigatedRef.current = true;
      sim.clearModal();
      finishDbSession(true).then(() => navigation.replace("HomeScreen"));
    }
  }, [remainingSecs, sim, navigation]);

  function goToGracePeriod() {
    if (connected) actions.respondUrgent(true);
    sim.clearModal();
    navigation.replace("GracePeriod", {
      durationMinutes,
      remainingSeconds: remainingSecs,
      sessionId: dbSessionIdRef.current,
    });
  }

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
                { width: timerFaceSize, height: timerFaceSize, borderRadius: timerFaceSize / 2 },
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

        {/* ── Updated NotifPanel call — passes mode + permission props ── */}
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