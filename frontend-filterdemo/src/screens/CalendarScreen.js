import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
  Alert,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Header from "../components/Header";
import {
  colors,
  spacing,
  radii,
  shadows,
  typography,
  patterns,
} from "../theme";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/AuthContext";

const PREVIEW_COUNT = 3;

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const FULL_MONTH_NAMES = [
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
const YEARS = [2026, 2027, 2028];

const daysInMonth = (month, year) => new Date(year, month + 1, 0).getDate();

// Build initial picker values from today
const todayDefaults = () => {
  const now = new Date();
  let h = now.getHours();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return {
    month: now.getMonth(),
    day: now.getDate(),
    year: now.getFullYear(),
    hour: h,
    minute: 0,
    ampm,
  };
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatEventTime = (time) => {
  if (!time) return "";
  const [hours, minutes] = time.split(":");
  const d = new Date();
  d.setHours(Number(hours), Number(minutes || 0), 0, 0);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
};

const formatEventDate = (dateStr) => {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  if (d.getTime() === today.getTime()) return "Today";
  if (d.getTime() === tomorrow.getTime()) return "Tomorrow";
  return d.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const isPastEvent = (dateStr, timeStr) => {
  if (!dateStr) return false;
  const [h, m] = (timeStr || "00:00").split(":");
  const d = new Date(dateStr + "T00:00:00");
  d.setHours(Number(h), Number(m), 0, 0);
  return d < new Date();
};

const getEventAccent = (source) => {
  if (source === "google") return colors.primaryContainer;
  if (source === "manual") return colors.tertiaryFixed;
  return colors.secondaryFixed;
};

const getEventIcon = (tag) => {
  const text = (tag || "").toLowerCase();
  if (text.includes("homework")) return "menu-book";
  if (text.includes("family")) return "family-restroom";
  if (text.includes("sport")) return "sports-basketball";
  if (text.includes("pet")) return "pets";
  if (text.includes("team")) return "group";
  return "event";
};

// ─── Component ────────────────────────────────────────────────────────────────

const CalendarScreen = () => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [events, setEvents] = useState([]);
  const [showAll, setShowAll] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // Text fields
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [tag, setTag] = useState("");

  // Picker state
  const [picks, setPicks] = useState(todayDefaults());

  const updatePick = (key, val) =>
    setPicks((p) => {
      const next = { ...p, [key]: val };
      // Clamp day if month/year changes shrinks available days
      const maxDay = daysInMonth(next.month, next.year);
      if (next.day > maxDay) next.day = maxDay;
      return next;
    });

  useEffect(() => {
    fetchEvents();
  }, [user?.id]);

  const fetchEvents = async () => {
    if (!user?.id) return;
    const { data, error } = await supabase
      .from("calendar_events")
      .select("id, title, subtitle, event_time, event_date, tag, source")
      .eq("user_id", user.id)
      .order("event_date", { ascending: true })
      .order("event_time", { ascending: true });
    if (!error && data) setEvents(data);
  };

  const resetForm = () => {
    setTitle("");
    setSubtitle("");
    setTag("");
    setPicks(todayDefaults());
  };

  const handleAdd = async () => {
    if (!title.trim()) {
      Alert.alert("Missing field", "Title is required.");
      return;
    }
    if (!subtitle.trim()) {
      Alert.alert("Missing field", "Description is required.");
      return;
    }

    // Build date string YYYY-MM-DD
    const mm = String(picks.month + 1).padStart(2, "0");
    const dd = String(picks.day).padStart(2, "0");
    const eventDate = `${picks.year}-${mm}-${dd}`;

    // Build time string HH:MM:SS
    let h = picks.hour;
    if (picks.ampm === "AM" && h === 12) h = 0;
    if (picks.ampm === "PM" && h !== 12) h += 12;
    const eventTime = `${String(h).padStart(2, "0")}:${String(picks.minute).padStart(2, "0")}:00`;

    setSaving(true);
    const { error } = await supabase.from("calendar_events").insert({
      user_id: user.id,
      title: title.trim(),
      subtitle: subtitle.trim(),
      event_date: eventDate,
      event_time: eventTime,
      tag: tag.trim() || null,
      source: "manual",
    });
    setSaving(false);

    if (error) {
      Alert.alert("Error", error.message);
      return;
    }

    resetForm();
    setShowForm(false);
    fetchEvents();
  };

  const handleDelete = (id) => {
    Alert.alert("Delete event", "Remove this event?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setDeletingId(id);
          await supabase.from("calendar_events").delete().eq("id", id);
          setDeletingId(null);
          fetchEvents();
        },
      },
    ]);
  };

  const visibleEvents = showAll ? events : events.slice(0, PREVIEW_COUNT);
  const maxDay = daysInMonth(picks.month, picks.year);

  return (
    <View style={patterns.screen}>
      <Header />

      <ScrollView
        contentContainerStyle={[
          patterns.scrollContent,
          { paddingBottom: 120 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        // Automatically shrinks scroll area when keyboard appears (iOS 15+)
        automaticallyAdjustKeyboardInsets
      >
        {/* ── Upcoming on Box ───────────────────────────────────── */}
        <View style={[patterns.card, shadows.card, { gap: spacing.sm }]}>
          <View style={[patterns.rowBetween, { alignItems: "center" }]}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: spacing.sm,
              }}
            >
              <View
                style={[
                  patterns.circleIcon,
                  { backgroundColor: `${colors.primary}18` },
                ]}
              >
                <MaterialIcons
                  name="schedule"
                  size={18}
                  color={colors.primary}
                />
              </View>
              <Text style={styles.upcomingTitle}>Upcoming on Box</Text>
            </View>
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() => {
                setShowForm((v) => !v);
                resetForm();
              }}
            >
              <MaterialIcons
                name={showForm ? "close" : "add"}
                size={16}
                color={colors.onPrimaryContainer}
              />
              <Text style={styles.addBtnText}>
                {showForm ? "Cancel" : "Add"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── Add form ─────────────────────────────────────── */}
          {showForm && (
            <View style={styles.form}>
              <Text style={styles.formTitle}>New Event</Text>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>TITLE *</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={title}
                  onChangeText={setTitle}
                  placeholder="e.g. Study session"
                  placeholderTextColor={colors.outlineVariant}
                  returnKeyType="next"
                />
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>DESCRIPTION *</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={subtitle}
                  onChangeText={setSubtitle}
                  placeholder="e.g. Chapter 4 review"
                  placeholderTextColor={colors.outlineVariant}
                  returnKeyType="next"
                />
              </View>

              {/* Date pickers */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>DATE</Text>
                <View style={styles.pickerRow}>
                  {/* Month */}
                  <View style={styles.pickerCol}>
                    <Picker
                      selectedValue={picks.month}
                      onValueChange={(v) => updatePick("month", v)}
                      style={styles.picker}
                      itemStyle={styles.pickerItem}
                    >
                      {MONTH_NAMES.map((m, i) => (
                        <Picker.Item key={m} label={m} value={i} />
                      ))}
                    </Picker>
                  </View>
                  {/* Day */}
                  <View style={[styles.pickerCol, { flex: 0.7 }]}>
                    <Picker
                      selectedValue={picks.day}
                      onValueChange={(v) => updatePick("day", v)}
                      style={styles.picker}
                      itemStyle={styles.pickerItem}
                    >
                      {Array.from({ length: maxDay }, (_, i) => i + 1).map(
                        (d) => (
                          <Picker.Item key={d} label={String(d)} value={d} />
                        ),
                      )}
                    </Picker>
                  </View>
                  {/* Year */}
                  <View style={[styles.pickerCol, { flex: 0.9 }]}>
                    <Picker
                      selectedValue={picks.year}
                      onValueChange={(v) => updatePick("year", v)}
                      style={styles.picker}
                      itemStyle={styles.pickerItem}
                    >
                      {YEARS.map((y) => (
                        <Picker.Item key={y} label={String(y)} value={y} />
                      ))}
                    </Picker>
                  </View>
                </View>
              </View>

              {/* Time pickers */}
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>TIME</Text>
                <View style={styles.pickerRow}>
                  {/* Hour */}
                  <View style={styles.pickerCol}>
                    <Picker
                      selectedValue={picks.hour}
                      onValueChange={(v) => updatePick("hour", v)}
                      style={styles.picker}
                      itemStyle={styles.pickerItem}
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                        <Picker.Item key={h} label={String(h)} value={h} />
                      ))}
                    </Picker>
                  </View>
                  {/* Minute */}
                  <View style={styles.pickerCol}>
                    <Picker
                      selectedValue={picks.minute}
                      onValueChange={(v) => updatePick("minute", v)}
                      style={styles.picker}
                      itemStyle={styles.pickerItem}
                    >
                      {Array.from({ length: 60 }, (_, i) => i).map((m) => (
                        <Picker.Item
                          key={m}
                          label={String(m).padStart(2, "0")}
                          value={m}
                        />
                      ))}
                    </Picker>
                  </View>
                  {/* AM/PM */}
                  {/* AM/PM */}
                  <View style={[styles.pickerCol, { flex: 0.8 }]}>
                    <Picker
                      selectedValue={picks.ampm}
                      onValueChange={(v) => updatePick("ampm", v)}
                      style={styles.picker}
                      itemStyle={styles.pickerItemSm} // ← smaller style
                    >
                      <Picker.Item label="AM" value="AM" />
                      <Picker.Item label="PM" value="PM" />
                    </Picker>
                  </View>
                </View>
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>TAG (optional)</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={tag}
                  onChangeText={setTag}
                  placeholder="homework, family, sport…"
                  placeholderTextColor={colors.outlineVariant}
                  returnKeyType="done"
                  onSubmitEditing={handleAdd}
                />
              </View>

              <TouchableOpacity
                style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                onPress={handleAdd}
                disabled={saving}
              >
                <MaterialIcons
                  name="check"
                  size={16}
                  color={colors.onPrimaryContainer}
                />
                <Text style={styles.saveBtnText}>
                  {saving ? "Saving…" : "Save Event"}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Event list ───────────────────────────────────── */}
          {events.length === 0 && !showForm ? (
            <View style={styles.empty}>
              <MaterialIcons
                name="event-busy"
                size={28}
                color={colors.outlineVariant}
              />
              <Text style={styles.emptyText}>
                No events yet. Tap Add to create one.
              </Text>
            </View>
          ) : (
            <View style={{ gap: spacing.sm, marginTop: 4 }}>
              {visibleEvents.map((e) => {
                const past = isPastEvent(e.event_date, e.event_time);
                return (
                  <View
                    key={e.id}
                    style={[
                      styles.eventCard,
                      {
                        borderLeftColor: past
                          ? colors.error
                          : getEventAccent(e.source),
                      },
                      past && styles.eventCardPast,
                    ]}
                  >
                    <View style={styles.eventRow}>
                      <View style={{ flex: 1, gap: 3 }}>
                        <View style={styles.eventMeta}>
                          {e.event_date && (
                            <Text style={styles.eventDate}>
                              {formatEventDate(e.event_date)}
                            </Text>
                          )}
                          {e.event_date && e.event_time && (
                            <Text style={styles.eventMetaDot}>·</Text>
                          )}
                          {e.event_time && (
                            <Text style={styles.eventTime}>
                              {formatEventTime(e.event_time)}
                            </Text>
                          )}
                        </View>
                        <Text style={styles.eventTitle}>{e.title}</Text>
                        {e.subtitle ? (
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 6,
                            }}
                          >
                            {e.tag && (
                              <MaterialIcons
                                name={getEventIcon(e.tag)}
                                size={14}
                                color={colors.outline}
                              />
                            )}
                            <Text style={styles.eventSub}>{e.subtitle}</Text>
                          </View>
                        ) : null}
                        <View
                          style={{
                            flexDirection: "row",
                            gap: 6,
                            flexWrap: "wrap",
                            marginTop: 2,
                          }}
                        >
                          {e.tag && (
                            <View
                              style={[
                                patterns.badge,
                                {
                                  backgroundColor: `${colors.tertiary}15`,
                                  paddingVertical: 3,
                                },
                              ]}
                            >
                              <Text style={styles.eventTagText}>{e.tag}</Text>
                            </View>
                          )}
                          {past && (
                            <View
                              style={[
                                patterns.badge,
                                {
                                  backgroundColor: `${colors.error}12`,
                                  paddingVertical: 3,
                                },
                              ]}
                            >
                              <MaterialIcons
                                name="warning-amber"
                                size={10}
                                color={colors.error}
                              />
                              <Text
                                style={[
                                  styles.eventTagText,
                                  { color: colors.error, marginLeft: 2 },
                                ]}
                              >
                                PAST DUE
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                      <TouchableOpacity
                        onPress={() => handleDelete(e.id)}
                        style={styles.deleteBtn}
                        disabled={deletingId === e.id}
                      >
                        <MaterialIcons
                          name="delete-outline"
                          size={18}
                          color={
                            deletingId === e.id
                              ? colors.outlineVariant
                              : colors.error
                          }
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}

              {events.length > PREVIEW_COUNT && (
                <TouchableOpacity
                  style={styles.viewAllBtn}
                  onPress={() => setShowAll((v) => !v)}
                >
                  <Text style={styles.viewAllText}>
                    {showAll ? "Show Less" : `View All (${events.length})`}
                  </Text>
                  <MaterialIcons
                    name={showAll ? "expand-less" : "expand-more"}
                    size={16}
                    color={colors.primary}
                  />
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* ── Page title ───────────────────────────────────────── */}
        <View style={{ gap: 4 }}>
          <Text style={styles.eyebrow}>CONNECTIONS</Text>
          <Text style={styles.title}>Calendar Sync</Text>
          <Text style={styles.subtitle}>
            Connect your digital calendars to your Pawse box for gentle
            reminders.
          </Text>
        </View>

        {/* ── Google Calendar — Coming Soon ───────────────────── */}
        <View
          style={[
            patterns.card,
            shadows.card,
            { gap: spacing.sm, opacity: 0.75 },
          ]}
        >
          <View style={patterns.rowBetween}>
            <View
              style={[
                styles.connectorIcon,
                { backgroundColor: `${colors.primary}18` },
              ]}
            >
              <MaterialIcons name="event" size={26} color={colors.primary} />
            </View>
            <View
              style={[
                patterns.badge,
                { backgroundColor: `${colors.orange}20` },
              ]}
            >
              <Text style={styles.statusComingSoonText}>COMING SOON</Text>
            </View>
          </View>
          <Text style={styles.connectorTitle}>Google Calendar</Text>
          <Text style={styles.connectorSub}>
            Personal and shared Google Workspace calendars.
          </Text>
          <View style={styles.comingSoonBar}>
            <MaterialIcons
              name="construction"
              size={14}
              color={colors.outline}
            />
            <Text style={styles.comingSoonNote}>Integration in progress</Text>
          </View>
        </View>

        {/* ── Apple Calendar — Coming Soon ─────────────────────── */}
        <View
          style={[
            patterns.card,
            shadows.card,
            { gap: spacing.sm, opacity: 0.75 },
          ]}
        >
          <View style={patterns.rowBetween}>
            <View
              style={[
                styles.connectorIcon,
                { backgroundColor: colors.surfaceContainer },
              ]}
            >
              <MaterialIcons name="apple" size={26} color={colors.warmBrown} />
            </View>
            <View
              style={[
                patterns.badge,
                { backgroundColor: `${colors.orange}20` },
              ]}
            >
              <Text style={styles.statusComingSoonText}>COMING SOON</Text>
            </View>
          </View>
          <Text style={styles.connectorTitle}>Apple Calendar</Text>
          <Text style={styles.connectorSub}>
            iCloud and local macOS/iOS calendar sync.
          </Text>
          <View style={styles.comingSoonBar}>
            <MaterialIcons
              name="construction"
              size={14}
              color={colors.outline}
            />
            <Text style={styles.comingSoonNote}>Integration in progress</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  eyebrow: { ...typography.labelCaps, fontSize: 10, color: colors.primary },
  title: { ...typography.h1, fontSize: 26, color: colors.warmBrown },
  subtitle: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    marginTop: 4,
    lineHeight: 18,
  },

  upcomingTitle: { ...typography.h3, fontSize: 18, color: colors.warmBrown },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.primaryContainer,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.full,
  },
  addBtnText: {
    ...typography.bodySm,
    color: colors.onPrimaryContainer,
    fontWeight: "700",
    fontSize: 12,
  },

  // Form
  form: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radii.xl,
    padding: spacing.sm,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  formTitle: { ...typography.h3, fontSize: 15, color: colors.warmBrown },
  fieldGroup: { gap: 4 },
  fieldLabel: { ...typography.labelCaps, fontSize: 10, color: colors.outline },
  fieldInput: {
    ...typography.bodyMd,
    fontSize: 14,
    color: colors.onSurface,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },

  // Picker grid
  pickerRow: {
    flexDirection: "row",
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    overflow: "hidden",
  },
  pickerCol: { flex: 1 },
  picker: { width: "100%" },
  pickerItem: { ...typography.bodyMd, color: colors.warmBrown, fontSize: 16 },

  saveBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.primaryContainer,
    borderRadius: radii["2xl"],
    paddingVertical: 11,
    marginTop: 4,
  },
  saveBtnText: {
    ...typography.bodyMd,
    color: colors.onPrimaryContainer,
    fontWeight: "700",
  },

  // Empty
  empty: { alignItems: "center", paddingVertical: spacing.lg, gap: 8 },
  emptyText: {
    ...typography.bodySm,
    color: colors.outlineVariant,
    textAlign: "center",
  },

  // Events
  eventCard: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radii.lg,
    padding: spacing.sm,
    borderLeftWidth: 4,
  },
  eventCardPast: { backgroundColor: `${colors.error}06` },
  eventRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  eventMeta: { flexDirection: "row", alignItems: "center", gap: 4 },
  eventDate: { ...typography.labelCaps, fontSize: 10, color: colors.primary },
  eventMetaDot: {
    ...typography.labelCaps,
    fontSize: 10,
    color: colors.outlineVariant,
  },
  eventTime: { ...typography.labelCaps, fontSize: 10, color: colors.outline },
  eventTitle: {
    ...typography.bodyMd,
    fontSize: 15,
    color: colors.warmBrown,
    fontWeight: "700",
  },
  eventSub: { ...typography.bodySm, fontSize: 12, color: colors.outline },
  eventTagText: {
    ...typography.labelCaps,
    fontSize: 9,
    color: colors.tertiary,
  },
  deleteBtn: { padding: 4, marginTop: 2 },

  viewAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 8,
  },
  viewAllText: {
    ...typography.bodySm,
    color: colors.primary,
    fontWeight: "700",
  },
  pickerItemSm: { ...typography.bodyMd, color: colors.warmBrown, fontSize: 14 },

  // Connectors
  connectorIcon: {
    width: 50,
    height: 50,
    borderRadius: radii.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  connectorTitle: {
    ...typography.h2,
    fontSize: 20,
    color: colors.warmBrown,
    marginTop: 4,
  },
  connectorSub: { ...typography.bodySm, color: colors.onSurfaceVariant },
  statusComingSoonText: {
    ...typography.labelCaps,
    fontSize: 10,
    color: colors.primary,
  },
  comingSoonBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radii.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
  },
  comingSoonNote: { ...typography.bodySm, fontSize: 12, color: colors.outline },
});

export default CalendarScreen;
