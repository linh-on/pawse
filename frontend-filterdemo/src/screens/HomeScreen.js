import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  TextInput,
  Animated,
  Modal,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Header from "../components/Header";
import { colors, spacing, radii, shadows, typography } from "../theme";
import { responsive } from "../utils/responsive";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/AuthContext";

const DEFAULT_PREP = [
  { label: "Silence phone notifications" },
  { label: "Grab a glass of water" },
  { label: "Ready the noise-cancelling headphones" },
];

const formatMinutes = (minutes) => {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hrs > 0 && mins > 0) return `${hrs}h ${mins}m`;
  if (hrs > 0) return `${hrs}h`;
  return `${mins}m`;
};

const getCurrentStreak = (sessions) => {
  const completedDays = new Set(
    sessions
      .filter((s) => s.completed)
      .map((s) => new Date(s.started_at).toDateString()),
  );
  let streak = 0;
  const cursor = new Date();
  if (!completedDays.has(cursor.toDateString())) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (completedDays.has(cursor.toDateString())) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
};

const PRESETS = [15, 30, 45, 60];

const FocusDial = ({ minutes, onChange }) => {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;

  const adjustHours = (delta) => {
    const newHrs = Math.max(0, Math.min(8, hrs + delta));
    const total = newHrs * 60 + mins;
    onChange(Math.max(1, total));
  };

  const adjustMins = (delta) => {
    const newMins = (((mins + delta) % 60) + 60) % 60;
    const total = hrs * 60 + newMins;
    onChange(Math.max(1, total));
  };

  const isPreset = PRESETS.includes(minutes);

  return (
    <View style={dialStyles.wrapper}>
      {/* Hour / Minute steppers */}
      <View style={dialStyles.stepperRow}>
        {/* Hours */}
        <View style={dialStyles.stepperGroup}>
          <TouchableOpacity
            style={dialStyles.stepBtn}
            onPress={() => adjustHours(-1)}
            activeOpacity={0.7}
          >
            <MaterialIcons
              name="remove"
              size={20}
              color={colors.onSurfaceVariant}
            />
          </TouchableOpacity>
          <View
            style={[
              dialStyles.stepValue,
              !isPreset && dialStyles.stepValueCustom,
            ]}
          >
            <Text style={dialStyles.stepNumber}>{hrs}</Text>
            <Text style={dialStyles.stepLabel}>hr</Text>
          </View>
          <TouchableOpacity
            style={dialStyles.stepBtn}
            onPress={() => adjustHours(1)}
            activeOpacity={0.7}
          >
            <MaterialIcons
              name="add"
              size={20}
              color={colors.onSurfaceVariant}
            />
          </TouchableOpacity>
        </View>

        <Text style={dialStyles.stepColon}>:</Text>

        {/* Minutes */}
        <View style={dialStyles.stepperGroup}>
          <TouchableOpacity
            style={dialStyles.stepBtn}
            onPress={() => adjustMins(-1)}
            activeOpacity={0.7}
          >
            <MaterialIcons
              name="remove"
              size={20}
              color={colors.onSurfaceVariant}
            />
          </TouchableOpacity>
          <View
            style={[
              dialStyles.stepValue,
              !isPreset && dialStyles.stepValueCustom,
            ]}
          >
            <Text style={dialStyles.stepNumber}>
              {String(mins).padStart(2, "0")}
            </Text>
            <Text style={dialStyles.stepLabel}>min</Text>
          </View>
          <TouchableOpacity
            style={dialStyles.stepBtn}
            onPress={() => adjustMins(1)}
            activeOpacity={0.7}
          >
            <MaterialIcons
              name="add"
              size={20}
              color={colors.onSurfaceVariant}
            />
          </TouchableOpacity>
        </View>
      </View>
      {/* Preset chips */}
      <View style={dialStyles.presetRow}>
        {PRESETS.map((p) => (
          <TouchableOpacity
            key={p}
            style={[
              dialStyles.presetChip,
              minutes === p && dialStyles.presetChipActive,
            ]}
            onPress={() => onChange(p)}
            activeOpacity={0.75}
          >
            <Text
              style={[
                dialStyles.presetText,
                minutes === p && dialStyles.presetTextActive,
              ]}
            >
              {formatMinutes(p)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
};

const dialStyles = StyleSheet.create({
  wrapper: { width: "100%", alignItems: "center", gap: spacing.md },
  presetRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
  },
  presetChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceContainer,
    borderWidth: 1,
    borderColor: "transparent",
  },
  presetChipActive: {
    backgroundColor: colors.primaryContainer,
    borderColor: `${colors.primary}40`,
  },
  presetText: {
    ...typography.bodySm,
    fontWeight: "700",
    color: colors.onSurfaceVariant,
  },
  presetTextActive: {
    color: colors.onPrimaryContainer,
  },
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  stepperGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  stepBtn: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceContainer,
    alignItems: "center",
    justifyContent: "center",
  },
  stepValue: {
    alignItems: "center",
    minWidth: 48,
  },
  stepValueCustom: {
    // subtle highlight when using a non-preset custom time
  },
  stepNumber: {
    ...typography.h2,
    fontSize: 28,
    color: colors.warmBrown,
  },
  stepLabel: {
    ...typography.labelCaps,
    fontSize: 9,
    color: colors.outline,
    marginTop: -2,
  },
  stepColon: {
    ...typography.h2,
    fontSize: 24,
    color: colors.outlineVariant,
    marginHorizontal: 2,
    marginBottom: 12,
  },
});

const HomeScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const r = responsive(width);
  const { user } = useAuth();

  const [minutes, setMinutes] = useState(45);
  const [todayMinutes, setTodayMinutes] = useState(0);
  const [streak, setStreak] = useState(0);
  const [loadingStats, setLoadingStats] = useState(true);
  const [prepItems, setPrepItems] = useState([]);
  const [checkedItems, setCheckedItems] = useState({});
  const [editMode, setEditMode] = useState(false);

  // ── "Put your phone in the box" countdown ──────────────
  const [countdown, setCountdown] = useState(null); // null = not active
  const countdownAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (countdown === null) return;

    if (countdown <= 0) {
      setCountdown(null);
      navigation.navigate("ActiveSession", { durationMinutes: minutes });
      return;
    }

    // Pulse animation on each tick
    countdownAnim.setValue(1.3);
    Animated.timing(countdownAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();

    const id = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [countdown, minutes, navigation, countdownAnim]);

  const startCountdown = () => {
    if (countdown !== null) return;
    setCountdown(10);
  };

  const cancelCountdown = () => {
    setCountdown(null);
  };

  const fetchHomeStats = useCallback(async () => {
    if (!user?.id) {
      setLoadingStats(false);
      return;
    }
    setLoadingStats(true);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const { data, error } = await supabase
      .from("sessions")
      .select("id, duration_minutes, started_at, completed")
      .eq("user_id", user.id)
      .order("started_at", { ascending: false });
    if (!error && data) {
      const todayTotal = data
        .filter((s) => s.completed && new Date(s.started_at) >= todayStart)
        .reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
      setTodayMinutes(todayTotal);
      setStreak(getCurrentStreak(data));
    }
    setLoadingStats(false);
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      fetchHomeStats();
    }, [fetchHomeStats]),
  );

  useEffect(() => {
    const fetchPrep = async () => {
      if (!user?.id) return;
      const { data, error } = await supabase
        .from("quick_prep_items")
        .select("id, label, sort_order")
        .eq("user_id", user.id)
        .order("sort_order", { ascending: true });
      if (!error && data && data.length > 0) {
        setPrepItems(data);
        setCheckedItems({ [data[0].id]: true });
      } else {
        const defaults = DEFAULT_PREP.map((p, i) => ({
          id: `default-${i}`,
          label: p.label,
          sort_order: i,
        }));
        setPrepItems(defaults);
        setCheckedItems({ "default-0": true });
      }
    };
    fetchPrep();
  }, [user?.id]);

  const toggleCheck = (id) =>
    setCheckedItems((prev) => ({ ...prev, [id]: !prev[id] }));

  const updateLabel = (id, text) =>
    setPrepItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, label: text } : item)),
    );

  const deleteItem = async (id) => {
    setPrepItems((prev) => prev.filter((item) => item.id !== id));
    if (!String(id).startsWith("default-")) {
      await supabase.from("quick_prep_items").delete().eq("id", id);
    }
  };

  const addItem = () => {
    const tempId = `new-${Date.now()}`;
    setPrepItems((prev) => [
      ...prev,
      { id: tempId, label: "", sort_order: prev.length },
    ]);
  };

  const saveEdits = async () => {
    if (!user?.id) {
      setEditMode(false);
      return;
    }
    const saved = [];
    for (let i = 0; i < prepItems.length; i++) {
      const item = prepItems[i];
      const label = item.label.trim();
      if (!label) continue;
      if (
        String(item.id).startsWith("default-") ||
        String(item.id).startsWith("new-")
      ) {
        const { data, error } = await supabase
          .from("quick_prep_items")
          .insert({ user_id: user.id, label, sort_order: i })
          .select("id, label, sort_order")
          .single();
        if (!error && data) saved.push(data);
      } else {
        const { data, error } = await supabase
          .from("quick_prep_items")
          .update({ label, sort_order: i })
          .eq("id", item.id)
          .select("id, label, sort_order")
          .single();
        if (!error && data) saved.push(data);
      }
    }
    setPrepItems(saved);
    setEditMode(false);
  };

  return (
    <View style={styles.screen}>
      <Header />
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingBottom: 120 + insets.bottom,
            paddingHorizontal: r.screenPadding,
            maxWidth: r.contentMaxWidth,
            width: "100%",
            alignSelf: "center",
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Text style={styles.greeting}>
            Hi, {user?.name?.split(" ")[0] || "there"}!
          </Text>
          <Text style={styles.subtitle}>Ready for some focus time?</Text>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, shadows.card]}>
            <MaterialIcons
              name="schedule"
              size={22}
              color={colors.primaryContainer}
            />
            <Text style={styles.statLabel} numberOfLines={1}>
              TODAY
            </Text>
            <Text style={styles.statValue}>
              {loadingStats ? "..." : formatMinutes(todayMinutes)}
            </Text>
          </View>
          <View style={[styles.statCard, shadows.card]}>
            <MaterialIcons
              name="local-fire-department"
              size={22}
              color={colors.secondary}
            />
            <Text style={styles.statLabel} numberOfLines={1}>
              STREAK
            </Text>
            <Text style={styles.statValue}>
              {loadingStats ? "..." : `${streak} days`}
            </Text>
          </View>
        </View>

        <View style={[styles.sessionCard, shadows.soft]}>
          <View style={styles.sessionHeader}>
            <Text style={styles.sessionTitle}>Focus Duration</Text>
            <View style={styles.minutesBadge}>
              <Text style={styles.minutesBadgeText}>
                {formatMinutes(minutes)}
              </Text>
            </View>
          </View>

          <FocusDial minutes={minutes} onChange={setMinutes} />

          <View style={styles.prepSection}>
            <View style={styles.prepHeader}>
              <Text style={styles.prepTitle}>Quick Prep</Text>
              {editMode ? (
                <TouchableOpacity onPress={saveEdits} style={styles.editBtn}>
                  <MaterialIcons
                    name="check"
                    size={15}
                    color={colors.onPrimaryContainer}
                  />
                  <Text style={styles.editBtnText}>Done</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={() => setEditMode(true)}
                  style={styles.editBtnGhost}
                >
                  <MaterialIcons name="edit" size={14} color={colors.primary} />
                  <Text style={styles.editBtnGhostText}>Edit</Text>
                </TouchableOpacity>
              )}
            </View>

            {prepItems.map((item) =>
              editMode ? (
                <View key={item.id} style={styles.editRow}>
                  <MaterialIcons
                    name="drag-handle"
                    size={20}
                    color={colors.outlineVariant}
                  />
                  <TextInput
                    style={styles.editInput}
                    value={item.label}
                    onChangeText={(t) => updateLabel(item.id, t)}
                    placeholder="Add a prep step..."
                    placeholderTextColor={colors.outlineVariant}
                  />
                  <TouchableOpacity onPress={() => deleteItem(item.id)}>
                    <MaterialIcons
                      name="close"
                      size={18}
                      color={colors.error}
                    />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  key={item.id}
                  style={styles.prepRow}
                  onPress={() => toggleCheck(item.id)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.checkbox,
                      checkedItems[item.id] && styles.checkboxChecked,
                    ]}
                  >
                    {checkedItems[item.id] && (
                      <MaterialIcons name="check" size={14} color="#fff" />
                    )}
                  </View>
                  <Text
                    style={[
                      styles.prepLabel,
                      checkedItems[item.id] && styles.prepLabelChecked,
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ),
            )}

            {editMode && (
              <TouchableOpacity style={styles.addItemBtn} onPress={addItem}>
                <MaterialIcons name="add" size={16} color={colors.primary} />
                <Text style={styles.addItemText}>Add item</Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity
            style={[styles.startBtn, shadows.soft]}
            onPress={startCountdown}
            activeOpacity={0.85}
          >
            <MaterialIcons
              name="play-arrow"
              size={26}
              color={colors.onPrimaryContainer}
            />
            <Text style={styles.startBtnText}>Start Session</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ── "Put your phone in the box" countdown overlay ── */}
      <Modal
        visible={countdown !== null}
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
              Your session will begin when the timer ends
            </Text>

            <Animated.Text
              style={[
                styles.overlayCountdown,
                { transform: [{ scale: countdownAnim }] },
              ]}
            >
              {countdown}
            </Animated.Text>

            <View style={styles.overlayProgressTrack}>
              <View
                style={[
                  styles.overlayProgressFill,
                  { width: `${((10 - (countdown ?? 0)) / 10) * 100}%` },
                ]}
              />
            </View>

            <TouchableOpacity
              style={styles.overlayCancelBtn}
              onPress={cancelCountdown}
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

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surfaceContainerLow },
  scroll: { paddingTop: spacing.md, gap: spacing.gutter },
  hero: { alignItems: "center", gap: spacing.sm },
  greeting: {
    ...typography.h1,
    color: colors.warmBrown,
    marginTop: spacing.sm,
  },
  subtitle: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    fontStyle: "italic",
  },
  statsRow: { flexDirection: "row", gap: 10 },
  statCard: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radii["4xl"],
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: "center",
    borderWidth: 1,
    borderColor: `${colors.orange}18`,
    gap: 6,
  },
  statLabel: {
    ...typography.labelCaps,
    color: colors.onSurfaceVariant,
    fontSize: 9,
    marginTop: 4,
    letterSpacing: 0.3,
    textAlign: "center",
  },
  statValue: { ...typography.h2, color: colors.warmBrown, textAlign: "center" },
  sessionCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radii["4xl"],
    padding: spacing.md,
    borderWidth: 1,
    borderColor: `${colors.orange}18`,
    gap: spacing.gutter,
  },
  sessionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sessionTitle: { ...typography.h3, color: colors.warmBrown },
  minutesBadge: {
    backgroundColor: `${colors.primary}15`,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: radii.full,
  },
  minutesBadgeText: {
    ...typography.bodySm,
    color: colors.primary,
    fontWeight: "700",
  },
  prepSection: { gap: spacing.sm },
  prepHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  prepTitle: { ...typography.h3, fontSize: 16, color: colors.warmBrown },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.primaryContainer,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.full,
  },
  editBtnText: {
    ...typography.bodySm,
    color: colors.onPrimaryContainer,
    fontWeight: "700",
    fontSize: 12,
  },
  editBtnGhost: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: `${colors.primary}40`,
  },
  editBtnGhostText: {
    ...typography.bodySm,
    color: colors.primary,
    fontWeight: "700",
    fontSize: 12,
  },
  prepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: 4,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: radii.sm,
    borderWidth: 2,
    borderColor: colors.outlineVariant,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  prepLabel: {
    ...typography.bodyMd,
    fontSize: 14,
    color: colors.onSurfaceVariant,
    flex: 1,
  },
  prepLabelChecked: { color: colors.onSurface, fontWeight: "600" },
  editRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: 4,
  },
  editInput: {
    flex: 1,
    ...typography.bodyMd,
    fontSize: 14,
    color: colors.onSurface,
    borderBottomWidth: 1,
    borderBottomColor: colors.outlineVariant,
    paddingVertical: 4,
  },
  addItemBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  addItemText: {
    ...typography.bodySm,
    color: colors.primary,
    fontWeight: "700",
  },
  startBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.primaryContainer,
    borderRadius: radii["3xl"],
    paddingVertical: spacing.md,
  },
  startBtnText: { ...typography.h2, color: colors.onPrimaryContainer },

  // ── Countdown overlay ─────────────────────
  overlayBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  overlayCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radii["4xl"],
    paddingVertical: spacing.xl + spacing.md,
    paddingHorizontal: spacing.xl,
    alignItems: "center",
    gap: spacing.md,
    width: "100%",
    maxWidth: 340,
    borderWidth: 1,
    borderColor: `${colors.orange}18`,
  },
  overlayTitle: {
    ...typography.h2,
    color: colors.warmBrown,
    textAlign: "center",
    fontSize: 20,
  },
  overlaySubtitle: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    textAlign: "center",
    lineHeight: 20,
  },
  overlayCountdown: {
    ...typography.timerDisplay,
    fontSize: 64,
    color: colors.primaryContainer,
    marginVertical: spacing.sm,
  },
  overlayProgressTrack: {
    width: "100%",
    height: 6,
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: 3,
    overflow: "hidden",
  },
  overlayProgressFill: {
    height: "100%",
    backgroundColor: colors.primaryContainer,
    borderRadius: 3,
  },
  overlayCancelBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
  },
  overlayCancelText: {
    ...typography.bodySm,
    color: colors.outline,
    fontWeight: "700",
    textDecorationLine: "underline",
    textDecorationStyle: "dotted",
  },
});

export default HomeScreen;
