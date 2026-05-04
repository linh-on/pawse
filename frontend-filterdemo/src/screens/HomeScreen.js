import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  TextInput,
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Header from "../components/Header";
import { colors, spacing, radii, shadows, typography } from "../theme";
import { responsive } from "../utils/responsive";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/AuthContext";
import { Picker } from "@react-native-picker/picker";

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

const FocusDial = ({ minutes, onChange }) => {
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const hours = Array.from({ length: 9 }, (_, i) => i);
  const minuteOptions = Array.from({ length: 60 }, (_, i) => i);

  const handleHourChange = (v) => onChange(Math.max(1, v * 60 + mins));
  const handleMinChange = (v) => onChange(Math.max(1, hrs * 60 + v));

  return (
    <View style={dialStyles.wrapper}>
      <View style={dialStyles.row}>
        <View style={dialStyles.column}>
          <Picker
            selectedValue={hrs}
            onValueChange={handleHourChange}
            style={dialStyles.picker}
            itemStyle={dialStyles.pickerItem}
          >
            {hours.map((h) => (
              <Picker.Item key={h} label={`${h} hr`} value={h} />
            ))}
          </Picker>
        </View>
        <View style={dialStyles.column}>
          <Picker
            selectedValue={mins}
            onValueChange={handleMinChange}
            style={dialStyles.picker}
            itemStyle={dialStyles.pickerItem}
          >
            {minuteOptions.map((m) => (
              <Picker.Item key={m} label={`${m} min`} value={m} />
            ))}
          </Picker>
        </View>
      </View>
    </View>
  );
};

const dialStyles = StyleSheet.create({
  wrapper: { width: "100%", alignItems: "center" },
  row: { flexDirection: "row", width: "100%" },
  column: { flex: 1 },
  picker: { width: "100%" },
  pickerItem: { ...typography.h2, color: colors.warmBrown, fontSize: 20 },
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

  // Re-fetch stats every time the screen is focused (including returning from ActiveSession)
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
            <Text style={styles.statLabel} numberOfLines={1}>TODAY</Text>
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
            <Text style={styles.statLabel} numberOfLines={1}>STREAK</Text>
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
            onPress={() =>
              navigation.navigate("ActiveSession", { durationMinutes: minutes })
            }
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
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surfaceContainerLow },
  scroll: {
    paddingTop: spacing.md,
    gap: spacing.gutter,
  },
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
});

export default HomeScreen;
