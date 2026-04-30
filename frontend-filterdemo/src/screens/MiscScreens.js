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
import {
  colors,
  spacing,
  radii,
  shadows,
  typography,
  patterns,
} from "../theme";

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
    <View style={patterns.screen}>
      <StatusBar barStyle="dark-content" />

      {/* Header with back */}
      <View style={[patterns.pageHeader, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={[styles.backBtn, shadows.card]}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={22} color={colors.warmBrown} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pawse</Text>
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
            I use AI to gently sort through your buzzes. If a message sounds
            like a "now" thing, I'll let it through. If it's a "later" thing,
            I'll keep it tucked away so you can focus on yourself.
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
            <TouchableOpacity>
              <Text style={styles.addNew}>+ Add New</Text>
            </TouchableOpacity>
          </View>
          {CONTACTS.map((c, i) => (
            <View key={i} style={[patterns.row, shadows.card]}>
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

        {/* Quiet Zone */}
        <View style={{ gap: spacing.sm }}>
          <Text style={styles.sectionTitle}>Quiet Zone Apps</Text>
          {QUIET_APPS.map((q, i) => (
            <View key={i} style={[patterns.row, shadows.card]}>
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

  // Brain card
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

  // Section header text
  sectionTitle: { ...typography.h3, fontSize: 17, color: colors.warmBrown },
  urgentOnly: { ...typography.labelCaps, fontSize: 11, color: colors.primary },
  addNew: { ...typography.bodySm, color: colors.primary, fontWeight: "700" },

  // Row icons (square corners, not circles)
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
