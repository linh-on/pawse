import React, { useState, useEffect, useRef } from "react";
import MODEL from "../../model.json";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ScrollView,
  Modal,
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import CircularProgress from "../components/CircularProgress";
import Header from "../components/Header";
import { colors, spacing, radii, shadows, typography } from "../theme";

const fmt = (secs) => {
  const m = Math.floor(secs / 60)
    .toString()
    .padStart(2, "0");
  const s = (secs % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
};

const NOTIFICATION_POOL = [
  {
    text: "FRAUD ALERT: A purchase of $847.00 at an unknown merchant was attempted on your card.",
    label: "urgent",
  },
  { text: "Mom: Call me RIGHT NOW. It's about Dad. Please.", label: "urgent" },
  {
    text: "Low battery: 5% remaining. Connect to a charger or your device will shut down.",
    label: "urgent",
  },
  {
    text: "ALERT: Sign-in to your Google account from a new device in Kyiv, Ukraine. Not you?",
    label: "urgent",
  },
  {
    text: "EMERGENCY ALERT: Flash flood warning for your area until 9:00 PM.",
    label: "urgent",
  },
  {
    text: "Missed call from Dad (3 times). Call back when you can.",
    label: "urgent",
  },
  {
    text: "Fire detected: Nest Protect in Kitchen is sensing smoke. Check your home immediately.",
    label: "urgent",
  },
  {
    text: "Your password was changed. If you didn't do this, reset your account immediately.",
    label: "urgent",
  },
  {
    text: "Delivery failed: Final attempt tomorrow — reschedule now or package returns.",
    label: "urgent",
  },
  {
    text: "Your meeting 'Client Presentation' begins in 8 minutes. Join now.",
    label: "urgent",
  },
  {
    text: "Hinge: Emma liked your profile and sent you a message.",
    label: "non_urgent",
  },
  {
    text: "Your Amazon package was delivered to your front door at 2:14 PM.",
    label: "non_urgent",
  },
  {
    text: "Spotify: New album from Taylor Swift is now available. Listen now.",
    label: "non_urgent",
  },
  {
    text: "LinkedIn: You appeared in 24 searches this week.",
    label: "non_urgent",
  },
  {
    text: "Reddit: u/throwaway_7821 replied to your comment in r/personalfinance.",
    label: "non_urgent",
  },
  {
    text: "Flash sale: 40% off sitewide at Lululemon — today only. Shop now.",
    label: "non_urgent",
  },
  {
    text: "Instagram: @sofia_travels mentioned you in a story.",
    label: "non_urgent",
  },
  {
    text: "ESPN: Final score — Lakers 114, Celtics 108. LeBron dropped 34 points.",
    label: "non_urgent",
  },
  {
    text: "Your DoorDash order is being prepared. Estimated delivery: 28–38 minutes.",
    label: "non_urgent",
  },
  {
    text: "Duolingo: You're on a 14-day streak! Don't break it — do today's lesson.",
    label: "non_urgent",
  },
  {
    text: "Order confirmed: #114-8823901. Your AirPods will ship in 1–2 days.",
    label: "non_urgent",
  },
  {
    text: "Google Photos: Your memories from 3 years ago are ready. Take a look.",
    label: "non_urgent",
  },
];

function tfidfClassify(text) {
  const { vocabulary, idf, coef, intercept, ngram_range } = MODEL;
  const tokens = text.toLowerCase().match(/\b\w+\b/g) || [];
  const ngrams = [];
  for (let n = ngram_range[0]; n <= ngram_range[1]; n++) {
    for (let i = 0; i <= tokens.length - n; i++) {
      ngrams.push(tokens.slice(i, i + n).join(" "));
    }
  }
  const tf = {};
  ngrams.forEach((ng) => {
    if (vocabulary[ng] !== undefined) {
      tf[vocabulary[ng]] = (tf[vocabulary[ng]] || 0) + 1;
    }
  });
  let score = intercept;
  Object.entries(tf).forEach(([idx, count]) => {
    const i = parseInt(idx);
    score += count * idf[i] * coef[i];
  });
  return score > 0 ? "urgent" : "non_urgent";
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const ActiveSessionScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const route = useRoute(); // import useRoute from '@react-navigation/native'
  const { durationMinutes = 45 } = route.params ?? {};
  const TOTAL_SECONDS = durationMinutes * 60;

  const [remaining, setRemaining] = useState(TOTAL_SECONDS);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  const [feed, setFeed] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [urgentModal, setUrgentModal] = useState(null);
  const [pool, setPool] = useState(() => shuffle(NOTIFICATION_POOL));
  const [poolIndex, setPoolIndex] = useState(0);
  const modalScale = useRef(new Animated.Value(0.85)).current;
  const modalOpacity = useRef(new Animated.Value(0)).current;
  const feedRef = useRef(null);
  const poolRef = useRef(pool);
  const poolIndexRef = useRef(poolIndex);
  const modalOpenRef = useRef(false);
  const intervalRef = useRef(null);
  const isRunningRef = useRef(false);
  poolRef.current = pool;
  poolIndexRef.current = poolIndex;
  isRunningRef.current = isRunning;

  // Countdown
  useEffect(() => {
    const id = setInterval(
      () => setRemaining((r) => (r > 0 ? r - 1 : 0)),
      1000,
    );
    return () => clearInterval(id);
  }, []);

  // Glow pulse
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

  // Auto-fire interval
  useEffect(() => {
    if (!isRunning) {
      clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => fireNext(), 2800);
    return () => clearInterval(intervalRef.current);
  }, [isRunning]);

  const progress = remaining / TOTAL_SECONDS;

  function fireNext() {
    let idx = poolIndexRef.current;
    let currentPool = poolRef.current;

    if (idx >= currentPool.length) {
      const newPool = shuffle(NOTIFICATION_POOL);
      setPool(newPool);
      poolRef.current = newPool;
      idx = 0;
      setPoolIndex(0);
    }

    const notif = currentPool[idx];
    setPoolIndex(idx + 1);
    poolIndexRef.current = idx + 1;

    const predicted = tfidfClassify(notif.text);
    const entry = {
      id: Date.now(),
      text: notif.text,
      trueLabel: notif.label,
      predicted,
      correct: predicted === notif.label,
    };

    if (predicted === "urgent") {
      showModal(entry);
    } else {
      setFeed((prev) => [entry, ...prev].slice(0, 20));
    }
  }

  function showModal(entry) {
    modalOpenRef.current = true;
    clearInterval(intervalRef.current); // stop interval until dismissed
    setUrgentModal(entry);
    modalScale.setValue(0.85);
    modalOpacity.setValue(0);
    Animated.parallel([
      Animated.spring(modalScale, {
        toValue: 1,
        useNativeDriver: true,
        tension: 90,
        friction: 10,
      }),
      Animated.timing(modalOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }

  function dismissModal() {
    modalOpenRef.current = false;
    // restart interval only if auto-play was active
    if (isRunningRef.current) {
      intervalRef.current = setInterval(() => fireNext(), 2800);
    }
    Animated.timing(modalOpacity, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      if (urgentModal) setFeed((prev) => [urgentModal, ...prev].slice(0, 20));
      setUrgentModal(null);
    });
  }

  const urgentCount = feed.filter((e) => e.predicted === "urgent").length;
  const suppressedCount = feed.filter(
    (e) => e.predicted === "non_urgent",
  ).length;

  return (
    <View style={styles.screen}>
      <Header badge="Focus Active" showProfile={false} />

      <ScrollView
        ref={feedRef}
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
        </View>

        <Animated.View
          style={[styles.ringWrap, { transform: [{ scale: pulseAnim }] }]}
        >
          <CircularProgress
            size={288}
            strokeWidth={10}
            progress={progress}
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
              <Text style={styles.timerText}>{fmt(remaining)}</Text>
              <Text style={styles.timerSub}>remaining</Text>
            </View>
          </CircularProgress>
        </Animated.View>

        <View style={styles.demoSection}>
          <View style={styles.demoHeader}>
            <View>
              <Text style={styles.demoTitle}>Notification Filter</Text>
              <Text style={styles.demoSubtitle}>Live simulation</Text>
            </View>
            <View style={styles.demoControls}>
              <TouchableOpacity
                style={[
                  styles.ctrlBtn,
                  { backgroundColor: `${colors.orange}18` },
                ]}
                onPress={fireNext}
              >
                <MaterialIcons
                  name="skip-next"
                  size={18}
                  color={colors.primary}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.ctrlBtn,
                  isRunning
                    ? { backgroundColor: `${colors.secondaryFixed}88` }
                    : { backgroundColor: colors.primaryContainer },
                ]}
                onPress={() => setIsRunning((v) => !v)}
              >
                <MaterialIcons
                  name={isRunning ? "pause" : "play-arrow"}
                  size={18}
                  color={
                    isRunning ? colors.secondary : colors.onPrimaryContainer
                  }
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.demoStats}>
            <View
              style={[
                styles.statPill,
                {
                  borderColor: `${colors.error}33`,
                  backgroundColor: `${colors.error}08`,
                },
              ]}
            >
              <MaterialIcons
                name="notifications-active"
                size={14}
                color={colors.error}
              />
              <Text style={[styles.statPillNum, { color: colors.error }]}>
                {urgentCount}
              </Text>
              <Text style={styles.statPillLabel}>Allowed</Text>
            </View>
            <View
              style={[
                styles.statPill,
                {
                  borderColor: `${colors.outline}33`,
                  backgroundColor: colors.surfaceContainer,
                },
              ]}
            >
              <MaterialIcons
                name="notifications-off"
                size={14}
                color={colors.outline}
              />
              <Text style={[styles.statPillNum, { color: colors.warmBrown }]}>
                {suppressedCount}
              </Text>
              <Text style={styles.statPillLabel}>Suppressed</Text>
            </View>
          </View>

          {feed.length === 0 ? (
            <View style={styles.emptyFeed}>
              <MaterialIcons
                name="notifications-none"
                size={32}
                color={colors.outlineVariant}
              />
              <Text style={styles.emptyText}>
                Press play to start simulation
              </Text>
            </View>
          ) : (
            <View style={styles.feedList}>
              {feed.map((entry) => (
                <FeedCard key={entry.id} entry={entry} />
              ))}
            </View>
          )}
        </View>

        <TouchableOpacity
          style={styles.overrideBtn}
          onPress={() => navigation.navigate("Home")}
          activeOpacity={0.75}
        >
          <View style={styles.overrideCircle}>
            <MaterialIcons name="emergency" size={24} color={colors.outline} />
          </View>
          <Text style={styles.overrideCaption}>In case of emergency</Text>
          <Text style={styles.overrideLink}>Urgent Override</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal transparent visible={!!urgentModal} animationType="none">
        <View style={styles.modalOverlay}>
          <Animated.View
            style={[
              styles.modalCard,
              shadows.soft,
              { transform: [{ scale: modalScale }], opacity: modalOpacity },
            ]}
          >
            <View style={styles.modalBadgeRow}>
              <View style={styles.modalBadge}>
                <MaterialIcons
                  name="notifications-active"
                  size={14}
                  color={colors.error}
                />
                <Text style={styles.modalBadgeText}>URGENT NOTIFICATION</Text>
              </View>
            </View>
            <Text style={styles.modalBody}>{urgentModal?.text}</Text>
            <View style={styles.modalMeta}>
              <MaterialIcons
                name="info-outline"
                size={14}
                color={colors.outline}
              />
              <Text style={styles.modalMetaText}>
                Classified as urgent — allowed through filter
              </Text>
            </View>
            <TouchableOpacity
              style={styles.modalDismiss}
              onPress={dismissModal}
              activeOpacity={0.85}
            >
              <Text style={styles.modalDismissText}>Dismiss</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
};

const FeedCard = ({ entry }) => {
  const isUrgent = entry.predicted === "urgent";
  const slideAnim = useRef(new Animated.Value(40)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 12,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[
        styles.card,
        isUrgent ? styles.cardUrgent : styles.cardSuppressed,
        { transform: [{ translateY: slideAnim }], opacity: opacityAnim },
      ]}
    >
      <View
        style={[
          styles.cardIconWrap,
          {
            backgroundColor: isUrgent
              ? `${colors.error}15`
              : colors.surfaceContainer,
          },
        ]}
      >
        <MaterialIcons
          name={isUrgent ? "notifications-active" : "notifications-off"}
          size={18}
          color={isUrgent ? colors.error : colors.outline}
        />
      </View>
      <View style={styles.cardContent}>
        <Text
          style={[
            styles.cardBadge,
            { color: isUrgent ? colors.error : colors.outline },
          ]}
        >
          {isUrgent ? "ALLOWED THROUGH" : "SUPPRESSED"}
        </Text>
        <Text
          style={[styles.cardText, !isUrgent && { color: colors.outline }]}
          numberOfLines={2}
        >
          {entry.text}
        </Text>
        {!entry.correct && (
          <Text style={styles.cardWrong}>
            ⚠ misclassified (true: {entry.trueLabel})
          </Text>
        )}
      </View>
    </Animated.View>
  );
};

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
  demoSection: {
    width: "100%",
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radii["3xl"],
    padding: spacing.gutter,
    borderWidth: 1,
    borderColor: `${colors.orange}22`,
    gap: spacing.sm,
    ...shadows.card,
  },
  demoHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  demoTitle: { ...typography.h3, fontSize: 16, color: colors.warmBrown },
  demoSubtitle: {
    ...typography.bodySm,
    fontSize: 11,
    color: colors.outline,
    marginTop: 2,
  },
  demoControls: { flexDirection: "row", gap: 8 },
  ctrlBtn: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    alignItems: "center",
    justifyContent: "center",
  },
  demoStats: { flexDirection: "row", gap: 8 },
  statPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: radii.lg,
    borderWidth: 1,
  },
  statPillNum: { ...typography.h3, fontSize: 16, color: colors.warmBrown },
  statPillLabel: {
    ...typography.labelCaps,
    fontSize: 9,
    color: colors.outline,
  },
  emptyFeed: { alignItems: "center", paddingVertical: spacing.lg, gap: 8 },
  emptyText: {
    ...typography.bodySm,
    color: colors.outlineVariant,
    textAlign: "center",
  },
  feedList: { gap: 8 },
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderRadius: radii.xl,
    padding: spacing.sm,
    borderWidth: 1,
    gap: 10,
  },
  cardUrgent: {
    backgroundColor: `${colors.error}08`,
    borderColor: `${colors.error}30`,
  },
  cardSuppressed: {
    backgroundColor: colors.surfaceContainerLow,
    borderColor: colors.outlineVariant,
  },
  cardIconWrap: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  cardContent: { flex: 1, gap: 3 },
  cardBadge: { ...typography.labelCaps, fontSize: 9 },
  cardText: {
    ...typography.bodySm,
    fontSize: 12,
    color: colors.onSurface,
    lineHeight: 17,
  },
  cardWrong: {
    ...typography.labelCaps,
    fontSize: 9,
    color: colors.tertiary,
    marginTop: 2,
  },
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(29,27,25,0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.md,
  },
  modalCard: {
    width: "100%",
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radii["3xl"],
    padding: spacing.md,
    borderWidth: 1,
    borderColor: `${colors.error}30`,
    gap: spacing.sm,
  },
  modalBadgeRow: { flexDirection: "row" },
  modalBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: `${colors.error}12`,
    borderRadius: radii.full,
    alignSelf: "flex-start",
  },
  modalBadgeText: {
    ...typography.labelCaps,
    fontSize: 10,
    color: colors.error,
  },
  modalBody: { ...typography.bodyMd, color: colors.onSurface, lineHeight: 22 },
  modalMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
  },
  modalMetaText: {
    ...typography.bodySm,
    fontSize: 12,
    color: colors.outline,
    flex: 1,
  },
  modalDismiss: {
    backgroundColor: colors.primaryContainer,
    borderRadius: radii["2xl"],
    paddingVertical: spacing.sm,
    alignItems: "center",
  },
  modalDismissText: {
    ...typography.h3,
    fontSize: 16,
    color: colors.onPrimaryContainer,
  },
});

export default ActiveSessionScreen;
