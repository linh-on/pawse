import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Switch,
} from "react-native";
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

const EVENTS = [
  {
    id: 1,
    time: "09:00 AM",
    title: "Daily Catchup",
    sub: "Product Team sync",
    tag: null,
    accent: colors.primaryContainer,
    icon: "group",
  },
  {
    id: 2,
    time: "12:00 PM",
    title: "Vet Appointment",
    sub: "Luna's checkup",
    tag: "PET CLINIC SE2",
    accent: colors.secondaryFixed,
    icon: "pets",
  },
  {
    id: 3,
    time: "03:00 PM",
    title: "Walk in the Park",
    sub: "Fresh air break",
    tag: "SUNSET TIME",
    accent: colors.tertiaryFixed,
    icon: "directions-walk",
  },
];

const CalendarScreen = () => {
  const insets = useSafeAreaInsets();
  const [boxDisplay, setBoxDisplay] = useState(true);
  const [appleConnected, setAppleConnected] = useState(false);

  return (
    <View style={patterns.screen}>
      <Header />

      <ScrollView
        contentContainerStyle={[
          patterns.scrollContent,
          { paddingBottom: 120 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Title */}
        <View style={{ gap: 4 }}>
          <Text style={styles.eyebrow}>CONNECTIONS</Text>
          <Text style={styles.title}>Calendar Sync</Text>
          <Text style={styles.subtitle}>
            Keep your schedule in view. Connect your digital calendars to your
            Pawse physical box for gentle reminders.
          </Text>
        </View>

        {/* Box display toggle */}
        <View style={[patterns.row, shadows.card]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.toggleTitle}>Box Display</Text>
            <Text style={styles.toggleSub}>Sync events to physical box</Text>
          </View>
          <Switch
            value={boxDisplay}
            onValueChange={setBoxDisplay}
            trackColor={{
              false: colors.surfaceContainerHigh,
              true: colors.primary,
            }}
            thumbColor="#fff"
          />
        </View>

        {/* Google Calendar */}
        <View style={[patterns.card, shadows.card, { gap: spacing.sm }]}>
          <View style={patterns.rowBetween}>
            <View
              style={[
                styles.connectorIcon,
                { backgroundColor: `${colors.primary}18` },
              ]}
            >
              <MaterialIcons name="event" size={26} color={colors.primary} />
            </View>
            <View style={[patterns.badge, { backgroundColor: "#D4F4DD" }]}>
              <Text style={styles.statusConnectedText}>CONNECTED</Text>
            </View>
          </View>
          <Text style={styles.connectorTitle}>Google Calendar</Text>
          <Text style={styles.connectorSub}>
            Personal and shared Google Workspace calendars.
          </Text>
          <TouchableOpacity
            style={patterns.buttonSecondary}
            activeOpacity={0.85}
          >
            <MaterialIcons name="settings" size={16} color={colors.warmBrown} />
            <Text style={styles.manageBtnText}>Manage Connection</Text>
          </TouchableOpacity>
        </View>

        {/* Apple Calendar */}
        <View style={[patterns.card, shadows.card, { gap: spacing.sm }]}>
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
                { backgroundColor: colors.surfaceContainer },
              ]}
            >
              <Text style={styles.statusNotLinkedText}>NOT LINKED</Text>
            </View>
          </View>
          <Text style={styles.connectorTitle}>Apple Calendar</Text>
          <Text style={styles.connectorSub}>
            iCloud and local macOS/iOS calendar sync.
          </Text>
          <TouchableOpacity
            style={[
              patterns.buttonPrimary,
              shadows.soft,
              { paddingVertical: 12, borderRadius: radii["2xl"] },
            ]}
            onPress={() => setAppleConnected(true)}
            activeOpacity={0.85}
          >
            <MaterialIcons
              name="add"
              size={18}
              color={colors.onPrimaryContainer}
            />
            <Text style={styles.connectBtnText}>Connect Apple Calendar</Text>
          </TouchableOpacity>
        </View>

        {/* Upcoming on Box */}
        <View style={[patterns.card, shadows.card, { gap: spacing.sm }]}>
          <View
            style={[
              patterns.rowBetween,
              { alignItems: "center", gap: spacing.sm },
            ]}
          >
            <View
              style={[
                patterns.circleIcon,
                {
                  backgroundColor: `${colors.primary}18`,
                  marginRight: spacing.sm,
                },
              ]}
            >
              <MaterialIcons name="schedule" size={18} color={colors.primary} />
            </View>
            <Text style={[styles.upcomingTitle, { flex: 1 }]}>
              Upcoming on{"\n"}Box
            </Text>
            <TouchableOpacity>
              <Text style={styles.viewAll}>View All</Text>
            </TouchableOpacity>
          </View>

          <View style={{ gap: spacing.sm, marginTop: 4 }}>
            {EVENTS.map((e) => (
              <View
                key={e.id}
                style={[styles.eventCard, { borderLeftColor: e.accent }]}
              >
                <Text style={styles.eventTime}>{e.time}</Text>
                <Text style={styles.eventTitle}>{e.title}</Text>
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
                >
                  <MaterialIcons
                    name={e.icon}
                    size={14}
                    color={colors.outline}
                  />
                  <Text style={styles.eventSub}>{e.sub}</Text>
                </View>
                {e.tag && (
                  <View
                    style={[
                      patterns.badge,
                      {
                        backgroundColor: `${colors.tertiary}15`,
                        marginTop: 6,
                        paddingVertical: 3,
                      },
                    ]}
                  >
                    <Text style={styles.eventTagText}>{e.tag}</Text>
                  </View>
                )}
              </View>
            ))}
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

  toggleTitle: {
    ...typography.bodyMd,
    fontSize: 15,
    color: colors.onSurface,
    fontWeight: "700",
  },
  toggleSub: {
    ...typography.bodySm,
    fontSize: 12,
    color: colors.outline,
    marginTop: 2,
  },

  connectorIcon: {
    width: 50,
    height: 50,
    borderRadius: radii.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  statusConnectedText: {
    ...typography.labelCaps,
    fontSize: 10,
    color: "#1F8A3F",
  },
  statusNotLinkedText: {
    ...typography.labelCaps,
    fontSize: 10,
    color: colors.outline,
  },
  connectorTitle: {
    ...typography.h2,
    fontSize: 20,
    color: colors.warmBrown,
    marginTop: 4,
  },
  connectorSub: { ...typography.bodySm, color: colors.onSurfaceVariant },

  manageBtnText: {
    ...typography.bodyMd,
    color: colors.warmBrown,
    fontWeight: "700",
  },
  connectBtnText: {
    ...typography.bodyMd,
    color: colors.onPrimaryContainer,
    fontWeight: "700",
  },

  upcomingTitle: { ...typography.h3, fontSize: 18, color: colors.warmBrown },
  viewAll: { ...typography.bodySm, color: colors.primary, fontWeight: "700" },

  eventCard: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radii.lg,
    padding: spacing.sm,
    borderLeftWidth: 4,
    gap: 4,
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
});

export default CalendarScreen;
