import React, { useEffect, useRef, useState } from "react";
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
import { colors, spacing, radii, shadows, typography } from "../theme";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/AuthContext";
import { responsive } from "../utils/responsive";
import { fmt } from "./active-session/utils";

const DEFAULT_GRACE_SECONDS = 10 * 60;

const GracePeriodScreen = () => {
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
    remainingSeconds = durationMinutes * 60,
    sessionId,
  } = route.params ?? {};

  const [gracePeriodSecs, setGracePeriodSecs] = useState(DEFAULT_GRACE_SECONDS);
  const [graceRemaining, setGraceRemaining] = useState(DEFAULT_GRACE_SECONDS);
  const [isEnding, setIsEnding] = useState(false);

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const hasLeftRef = useRef(false);

  useEffect(() => {
    async function fetchGracePeriod() {
      if (!user?.id) return;

      const { data, error } = await supabase
        .from("preferences")
        .select("grace_period_minutes")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!error && data?.grace_period_minutes) {
        const seconds = Math.max(1, data.grace_period_minutes) * 60;
        setGracePeriodSecs(seconds);
        setGraceRemaining(seconds);
      }
    }

    fetchGracePeriod();
  }, [user?.id]);

  useEffect(() => {
    const id = setInterval(
      () => setGraceRemaining((r) => (r > 0 ? r - 1 : 0)),
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

  const continueSession = () => {
    if (hasLeftRef.current) return;
    hasLeftRef.current = true;

    navigation.replace("ActiveSession", {
      durationMinutes,
      initialRemainingSeconds: remainingSeconds,
      existingSessionId: sessionId,
    });
  };

  const giveUpForToday = async () => {
    if (hasLeftRef.current || isEnding) return;
    hasLeftRef.current = true;
    setIsEnding(true);

    if (sessionId) {
      const { error } = await supabase
        .from("sessions")
        .update({ ended_at: new Date().toISOString(), completed: false })
        .eq("id", sessionId);

      if (error) console.warn("Could not end session:", error.message);
    }

    navigation.replace("HomeScreen");
  };

  // If grace runs out, restart a fresh focus timer.
  useEffect(() => {
    if (graceRemaining > 0 || hasLeftRef.current) return;
    hasLeftRef.current = true;

    navigation.replace("ActiveSession", {
      durationMinutes,
      initialRemainingSeconds: durationMinutes * 60,
      existingSessionId: sessionId,
    });
  }, [graceRemaining, durationMinutes, navigation, sessionId]);

  const graceProgress =
    gracePeriodSecs > 0 ? graceRemaining / gracePeriodSecs : 0;

  return (
    <View style={styles.screen}>
      <Header badge="Grace Period" showProfile={false} />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingHorizontal: r.screenPadding,
            paddingBottom: insets.bottom + 160,
            maxWidth: r.contentMaxWidth,
            width: "100%",
            alignSelf: "center",
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleBlock}>
          <Text style={styles.title}>Taking a break?</Text>
          <Text style={styles.subtitle}>
            Your session is paused. Continue before the grace period ends.
          </Text>
        </View>

        <Animated.View
          style={[styles.ringWrap, { transform: [{ scale: pulseAnim }] }]}
        >
          <CircularProgress
            size={timerSize}
            strokeWidth={10}
            progress={graceProgress}
            trackColor={colors.surfaceContainerHighest}
            fillColor={colors.error}
          >
            <View
              style={[
                styles.timerFace,
                {
                  width: timerFaceSize,
                  height: timerFaceSize,
                  borderRadius: timerFaceSize / 2,
                  borderColor: `${colors.error}22`,
                },
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

        <View style={styles.pausedBadge}>
          <MaterialIcons name="pause-circle" size={16} color={colors.outline} />
          <Text style={styles.pausedText}>
            Focus paused at {fmt(remainingSeconds)}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.continueBtn}
          onPress={continueSession}
          activeOpacity={0.85}
        >
          <MaterialIcons
            name="play-arrow"
            size={22}
            color={colors.onPrimaryContainer}
          />
          <Text style={styles.continueBtnText}>Continue Session</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.giveUpBtn, isEnding && { opacity: 0.5 }]}
          onPress={giveUpForToday}
          disabled={isEnding}
          activeOpacity={0.75}
        >
          <View style={styles.giveUpCircle}>
            <MaterialIcons name="stop" size={24} color={colors.outline} />
          </View>
          <Text style={styles.giveUpCaption}>Give up for today</Text>
          <Text style={styles.giveUpLink}>
            {isEnding ? "Ending..." : "End Session"}
          </Text>
        </TouchableOpacity>
      </ScrollView>
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
  subtitle: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    textAlign: "center",
    maxWidth: 320,
    lineHeight: 20,
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
  pausedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.surfaceContainer,
    borderRadius: radii.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    maxWidth: "100%",
  },
  pausedText: { ...typography.bodySm, color: colors.outline, flexShrink: 1 },
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
  giveUpBtn: { alignItems: "center", gap: 6, paddingVertical: spacing.sm },
  giveUpCircle: {
    width: 56,
    height: 56,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceContainer,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  giveUpCaption: {
    ...typography.labelCaps,
    color: colors.outline,
    fontSize: 10,
  },
  giveUpLink: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    fontWeight: "700",
    textDecorationLine: "underline",
    textDecorationStyle: "dotted",
  },
});

export default GracePeriodScreen;
