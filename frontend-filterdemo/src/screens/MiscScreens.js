import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Switch,
  StatusBar,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  colors,
  spacing,
  radii,
  shadows,
  typography,
  patterns,
  tint,
} from "../theme";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/AuthContext";

// ─── Smart Filter Screen ──────────────────────────────────────────────────────
export const FilterSettingsScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  // ── App notification toggles ──
  const [apps, setApps] = useState({
    messenger: true,
    gmail: false,
    store: false,
  });

  const APPS = [
    {
      id: "messenger",
      name: "Messenger",
      sub: "Social Networking",
      icon: "chat",
      color: colors.secondary,
    },
    {
      id: "gmail",
      name: "Gmail",
      sub: "Work & Productivity",
      icon: "mail",
      color: colors.primary,
    },
    {
      id: "store",
      name: "Store",
      sub: "Shopping",
      icon: "shopping-bag",
      color: colors.tertiary,
    },
  ];

  // ── Trusted contacts ──
  const [contacts, setContacts] = useState([]);
  const [quietApps, setQuietApps] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newNote, setNewNote] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchFilterData = async () => {
    if (!user?.id) return;
    const [
      { data: contactRows, error: contactError },
      { data: appRows, error: appError },
    ] = await Promise.all([
      supabase
        .from("trusted_contacts")
        .select("id, name, note, always_urgent")
        .eq("user_id", user.id)
        .order("name", { ascending: true }),
      supabase
        .from("blocked_apps")
        .select("id, app_name, category")
        .eq("user_id", user.id)
        .order("app_name", { ascending: true }),
    ]);
    if (!contactError && contactRows) setContacts(contactRows);
    if (!appError && appRows) setQuietApps(appRows);
  };

  useEffect(() => {
    fetchFilterData();
  }, [user?.id]);

  const handleAddContact = async () => {
    if (!newName.trim()) {
      Alert.alert("Name required", "Enter a name for this contact.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("trusted_contacts").insert({
      user_id: user.id,
      name: newName.trim(),
      note: newNote.trim() || null,
      always_urgent: true,
    });
    setSaving(false);
    if (error) {
      Alert.alert("Error", error.message);
      return;
    }
    setNewName("");
    setNewNote("");
    setShowAddModal(false);
    fetchFilterData();
  };

  const handleDeleteContact = (contact) => {
    Alert.alert(
      `Remove ${contact.name}?`,
      "Their messages will no longer bypass the AI filter.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            await supabase
              .from("trusted_contacts")
              .delete()
              .eq("id", contact.id);
            fetchFilterData();
          },
        },
      ],
    );
  };

  const getBlockedAppIcon = (category) => {
    if (category === "games") return "sports-esports";
    if (category === "entertainment") return "play-circle";
    if (category === "social") return "chat";
    return "block";
  };

  return (
    <View style={patterns.screen}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={[patterns.pageHeader, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={[styles.backBtn, shadows.card]}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={22} color={colors.warmBrown} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Smart Filter</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          patterns.scrollContent,
          { paddingBottom: 120 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Brain card */}
        <View
          style={[
            patterns.card,
            shadows.card,
            {
              alignItems: "center",
              gap: spacing.sm,
              borderColor: `${colors.orange}22`,
            },
          ]}
        >
          <View style={styles.brainIconWrap}>
            <MaterialIcons
              name="psychology"
              size={32}
              color={colors.secondary}
            />
            <View style={styles.brainBadge}>
              <MaterialIcons name="bolt" size={12} color="#fff" />
            </View>
          </View>
          <Text style={styles.brainTitle}>Your Smart Filter</Text>
          <Text style={styles.brainText}>
            I use AI to sort through your notifications. Urgent messages get
            through. Everything else waits. Trusted contacts always get through
            — no AI needed.
          </Text>
        </View>

        {/* App Notifications */}
        <View style={{ gap: spacing.sm }}>
          <View style={patterns.sectionHeader}>
            <Text style={styles.sectionTitle}>App Notifications</Text>
            <Text style={styles.urgentOnly}>Urgent Only</Text>
          </View>
          {APPS.map((app) => (
            <View key={app.id} style={[patterns.row, shadows.card]}>
              <View
                style={[styles.rowIcon, { backgroundColor: `${app.color}18` }]}
              >
                <MaterialIcons name={app.icon} size={20} color={app.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowName}>{app.name}</Text>
                <Text style={styles.rowSub}>{app.sub}</Text>
              </View>
              <Switch
                value={apps[app.id]}
                onValueChange={(v) => setApps((p) => ({ ...p, [app.id]: v }))}
                trackColor={{
                  false: colors.surfaceContainerHigh,
                  true: colors.secondary,
                }}
                thumbColor="#fff"
              />
            </View>
          ))}
        </View>

        {/* Trusted Contacts */}
        <View style={{ gap: spacing.sm }}>
          <View style={patterns.sectionHeader}>
            <Text style={styles.sectionTitle}>Trusted Contacts</Text>
            <TouchableOpacity onPress={() => setShowAddModal(true)}>
              <Text style={styles.addNew}>+ Add New</Text>
            </TouchableOpacity>
          </View>

          {/* How it works explanation */}
          <View style={styles.howItWorks}>
            <MaterialIcons
              name="auto-awesome"
              size={14}
              color={colors.primary}
            />
            <Text style={styles.howItWorksText}>
              When a notification mentions a trusted contact's name or keywords,
              the AI skips the filter and lets it through immediately.
            </Text>
          </View>

          {contacts.length === 0 ? (
            <View style={[patterns.card, styles.emptyContacts]}>
              <MaterialIcons
                name="person-add"
                size={28}
                color={colors.outlineVariant}
              />
              <Text style={styles.emptyText}>No trusted contacts yet.</Text>
              <Text style={styles.emptyHint}>
                Add someone like "Mom" and their messages will always get
                through.
              </Text>
            </View>
          ) : (
            contacts.map((c) => (
              <View key={c.id} style={[patterns.row, shadows.card]}>
                <View
                  style={[
                    styles.rowIcon,
                    { backgroundColor: tint(colors.primary, 0.12) },
                  ]}
                >
                  <MaterialIcons
                    name="person"
                    size={20}
                    color={colors.primary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowName}>{c.name}</Text>
                  {c.note ? (
                    <Text style={styles.rowSub}>Keywords: {c.note}</Text>
                  ) : (
                    <Text style={styles.rowSub}>Always urgent</Text>
                  )}
                </View>
                <View style={styles.alwaysTag}>
                  <MaterialIcons
                    name="check-circle"
                    size={12}
                    color={colors.success}
                  />
                  <Text style={styles.alwaysTagText}>Always through</Text>
                </View>
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => handleDeleteContact(c)}
                >
                  <MaterialIcons
                    name="close"
                    size={16}
                    color={colors.outline}
                  />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* ── Add Contact Modal ── */}
      <Modal visible={showAddModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Trusted Contact</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowAddModal(false);
                  setNewName("");
                  setNewNote("");
                }}
              >
                <MaterialIcons name="close" size={22} color={colors.outline} />
              </TouchableOpacity>
            </View>

            {/* How AI uses this */}
            <View style={styles.aiExplain}>
              <MaterialIcons
                name="psychology"
                size={16}
                color={colors.secondary}
              />
              <Text style={styles.aiExplainText}>
                The AI will check each notification for this person's name and
                keywords. Any match = instant pass-through, no filtering.
              </Text>
            </View>

            {/* Name field */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>NAME</Text>
              <TextInput
                style={styles.fieldInput}
                value={newName}
                onChangeText={setNewName}
                placeholder="e.g. Mom, Dad, Alex"
                placeholderTextColor={colors.outlineVariant}
                autoFocus
              />
              <Text style={styles.fieldHint}>
                The exact name as it might appear in a notification.
              </Text>
            </View>

            {/* Keywords field */}
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>
                EXTRA KEYWORDS <Text style={styles.optional}>(optional)</Text>
              </Text>
              <TextInput
                style={styles.fieldInput}
                value={newNote}
                onChangeText={setNewNote}
                placeholder="e.g. mama, home, emergency"
                placeholderTextColor={colors.outlineVariant}
              />
              <Text style={styles.fieldHint}>
                Other words the AI should watch for from this person. Separate
                with commas.
              </Text>
            </View>

            {/* Example */}
            {(newName.trim() || newNote.trim()) && (
              <View style={styles.exampleBox}>
                <Text style={styles.exampleLabel}>
                  HOW THE AI WILL READ THIS
                </Text>
                <Text style={styles.exampleText}>
                  Any notification containing{" "}
                  {[
                    newName.trim(),
                    ...newNote
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  ]
                    .filter(Boolean)
                    .map((k, i) => (
                      <Text key={i} style={styles.exampleKeyword}>
                        "{k}"{" "}
                      </Text>
                    ))}
                  will always be marked urgent.
                </Text>
              </View>
            )}

            {/* Buttons */}
            <View style={styles.modalBtns}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => {
                  setShowAddModal(false);
                  setNewName("");
                  setNewNote("");
                }}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.saveBtn,
                  (!newName.trim() || saving) && { opacity: 0.4 },
                ]}
                onPress={handleAddContact}
                disabled={!newName.trim() || saving}
              >
                {saving ? (
                  <ActivityIndicator
                    color={colors.onPrimaryContainer}
                    size="small"
                  />
                ) : (
                  <Text style={styles.saveBtnText}>Add Contact</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// ─── Other misc screens ───────────────────────────────────────────────────────
export const OverridesLogScreen = () => (
  <View style={patterns.screen}>
    <View style={styles.placeholder}>
      <Text style={styles.placeholderTitle}>Overrides Log</Text>
      <Text style={styles.placeholderText}>
        Recent emergency unlocks will appear here.
      </Text>
    </View>
  </View>
);

export const CalendarSyncScreen = () => (
  <View style={patterns.screen}>
    <View style={styles.placeholder}>
      <Text style={styles.placeholderTitle}>Calendar Sync</Text>
      <Text style={styles.placeholderText}>
        Connect your calendar to auto-schedule focus time.
      </Text>
    </View>
  </View>
);

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceContainerLowest,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { ...typography.h3, color: colors.orange },

  brainIconWrap: {
    width: 64,
    height: 64,
    borderRadius: radii.full,
    backgroundColor: `${colors.secondaryFixed}55`,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  brainBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 22,
    height: 22,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.surfaceContainerLowest,
  },
  brainTitle: {
    ...typography.h2,
    fontSize: 22,
    color: colors.warmBrown,
    marginTop: 4,
  },
  brainText: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    textAlign: "center",
    lineHeight: 20,
  },

  sectionTitle: { ...typography.h3, fontSize: 17, color: colors.warmBrown },
  urgentOnly: { ...typography.labelCaps, fontSize: 11, color: colors.primary },
  addNew: { ...typography.bodySm, color: colors.primary, fontWeight: "700" },

  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
  },
  rowName: {
    ...typography.bodyMd,
    fontSize: 14,
    color: colors.onSurface,
    fontWeight: "600",
  },
  rowSub: {
    ...typography.bodySm,
    fontSize: 12,
    color: colors.outline,
    marginTop: 2,
  },

  alwaysTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: tint(colors.success, 0.1),
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: radii.full,
  },
  alwaysTagText: {
    ...typography.labelCaps,
    fontSize: 8,
    color: colors.success,
  },

  deleteBtn: {
    width: 28,
    height: 28,
    borderRadius: radii.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceContainerHigh,
    marginLeft: 4,
  },

  howItWorks: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
    backgroundColor: tint(colors.primary, 0.06),
    borderRadius: radii.lg,
    padding: spacing.sm,
  },
  howItWorksText: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    flex: 1,
    lineHeight: 18,
  },

  emptyContacts: {
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  emptyText: { ...typography.bodyMd, color: colors.outline, fontWeight: "600" },
  emptyHint: {
    ...typography.bodySm,
    color: colors.outlineVariant,
    textAlign: "center",
  },

  manageBtn: {
    alignItems: "center",
    paddingVertical: spacing.sm,
    marginTop: 4,
  },
  manageBtnText: {
    ...typography.bodyMd,
    color: colors.primary,
    fontWeight: "700",
  },

  // ── Modal ──
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(30,20,10,0.55)",
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
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalTitle: { ...typography.h3, color: colors.warmBrown },

  aiExplain: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
    backgroundColor: tint(colors.secondary, 0.08),
    borderRadius: radii.lg,
    padding: spacing.sm,
  },
  aiExplainText: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    flex: 1,
    lineHeight: 18,
  },

  fieldGroup: { gap: 4 },
  fieldLabel: { ...typography.labelCaps, fontSize: 10, color: colors.outline },
  optional: {
    ...typography.labelCaps,
    fontSize: 10,
    color: colors.outlineVariant,
    textTransform: "none",
  },
  fieldInput: {
    ...typography.bodyMd,
    color: colors.onSurface,
    backgroundColor: colors.surfaceContainer,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  fieldHint: {
    ...typography.bodySm,
    fontSize: 11,
    color: colors.outlineVariant,
    lineHeight: 16,
  },

  exampleBox: {
    backgroundColor: tint(colors.primary, 0.06),
    borderRadius: radii.lg,
    padding: spacing.sm,
    gap: 4,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  exampleLabel: { ...typography.labelCaps, fontSize: 9, color: colors.primary },
  exampleText: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    lineHeight: 18,
  },
  exampleKeyword: { color: colors.primary, fontWeight: "700" },

  modalBtns: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.sm },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radii["2xl"],
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  cancelBtnText: {
    ...typography.bodyMd,
    color: colors.outline,
    fontWeight: "600",
  },
  saveBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radii["2xl"],
    alignItems: "center",
    backgroundColor: colors.primaryContainer,
  },
  saveBtnText: {
    ...typography.bodyMd,
    color: colors.onPrimaryContainer,
    fontWeight: "700",
  },

  placeholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.lg,
  },
  placeholderTitle: { ...typography.h2, color: colors.warmBrown },
  placeholderText: {
    ...typography.bodyMd,
    color: colors.outline,
    textAlign: "center",
    marginTop: 8,
  },
});
