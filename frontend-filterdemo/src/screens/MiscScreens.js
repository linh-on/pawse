import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Switch,
  StatusBar,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, spacing, radii, shadows, typography } from "../theme";

// ─── Smart Filter Screen ──────────────────────────────────────────────────────
export const FilterSettingsScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

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

  const CONTACTS = [
    { name: "Mom", note: "Always Urgent", color: colors.primary },
    { name: "Alex (Work)", note: "Always Urgent", color: colors.secondary },
  ];

  const QUIET_APPS = [
    { name: "Streaming & Entertainment", icon: "play-circle" },
    { name: "Gaming Apps", icon: "sports-esports" },
  ];

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="dark-content" />

      {/* Custom header with back button */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={22} color={colors.warmBrown} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pawse</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: 120 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Brain card */}
        <View style={[styles.brainCard, shadows.card]}>
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
            I use AI to gently sort through your buzzes. If a message sounds
            like a "now" thing, I'll let it through. If it's a "later" thing,
            I'll keep it tucked away so you can focus on yourself.
          </Text>
        </View>

        {/* App Notifications */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>App Notifications</Text>
            <Text style={styles.urgentOnly}>Urgent Only</Text>
          </View>
          {APPS.map((app) => (
            <View key={app.id} style={[styles.row, shadows.card]}>
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
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Trusted Contacts</Text>
            <TouchableOpacity>
              <Text style={styles.addNew}>+ Add New</Text>
            </TouchableOpacity>
          </View>
          {CONTACTS.map((c, i) => (
            <View key={i} style={[styles.row, shadows.card]}>
              <View
                style={[styles.rowIcon, { backgroundColor: `${c.color}22` }]}
              >
                <MaterialIcons name="person" size={20} color={c.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowName}>{c.name}</Text>
                <Text style={styles.rowSub}>{c.note}</Text>
              </View>
              <MaterialIcons
                name="star"
                size={20}
                color={`${colors.secondary}88`}
              />
            </View>
          ))}
        </View>

        {/* Quiet Zone Apps */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quiet Zone Apps</Text>
          {QUIET_APPS.map((q, i) => (
            <View key={i} style={[styles.row, shadows.card]}>
              <View
                style={[
                  styles.rowIcon,
                  { backgroundColor: colors.surfaceContainer },
                ]}
              >
                <MaterialIcons name={q.icon} size={20} color={colors.outline} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowName}>{q.name}</Text>
              </View>
              <MaterialIcons name="block" size={20} color={colors.error} />
            </View>
          ))}
          <TouchableOpacity style={styles.manageBtn}>
            <Text style={styles.manageBtnText}>Manage Blocked List</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

// ─── Other misc screens (kept for navigator) ───────────────────────────────────
export const OverridesLogScreen = () => (
  <View style={styles.screen}>
    <View style={styles.placeholder}>
      <Text style={styles.placeholderTitle}>Overrides Log</Text>
      <Text style={styles.placeholderText}>
        Recent emergency unlocks will appear here.
      </Text>
    </View>
  </View>
);

export const CalendarSyncScreen = () => (
  <View style={styles.screen}>
    <View style={styles.placeholder}>
      <Text style={styles.placeholderTitle}>Calendar Sync</Text>
      <Text style={styles.placeholderText}>
        Connect your calendar to auto-schedule focus time.
      </Text>
    </View>
  </View>
);

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surfaceContainerLow },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.unit * 1.5,
    backgroundColor: colors.surfaceContainerLow,
    borderBottomWidth: 1,
    borderBottomColor: `${colors.orange}22`,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceContainerLowest,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.card,
  },
  headerTitle: { ...typography.h3, color: colors.orange },

  scroll: {
    paddingHorizontal: spacing.containerPadding,
    paddingTop: spacing.md,
    gap: spacing.gutter,
  },

  // Brain card
  brainCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radii["3xl"],
    padding: spacing.md,
    borderWidth: 1,
    borderColor: `${colors.orange}22`,
    alignItems: "center",
    gap: spacing.sm,
  },
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

  // Sections
  section: { gap: spacing.sm },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  sectionTitle: { ...typography.h3, fontSize: 17, color: colors.warmBrown },
  urgentOnly: { ...typography.labelCaps, fontSize: 11, color: colors.primary },
  addNew: { ...typography.bodySm, color: colors.primary, fontWeight: "700" },

  // Row
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radii["2xl"],
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: `${colors.orange}18`,
  },
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

  // Manage btn
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
