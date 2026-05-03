import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
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

const formatTime = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) {
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
};

const buildOverrideLogItems = (sessions) => {
  const items = [];

  sessions.forEach((session) => {
    const urgentLogs =
      session.notification_logs?.filter(
        (log) => log.predicted_label === "urgent" && log.was_allowed,
      ) || [];

    urgentLogs.forEach((log) => {
      const text = log.text || "";
      const isCall =
        text.toLowerCase().includes("call") ||
        text.toLowerCase().includes("mom") ||
        text.toLowerCase().includes("dad");

      items.push({
        id: `log-${log.id}`,
        type: "override",
        title: isCall ? "Call Override" : "Emergency Alert",
        status: isCall ? "Incoming Priority" : "Override Triggered",
        description: text ? `"${text}"` : "Urgent notification was allowed through.",
        time: formatTime(log.fired_at),
        icon: isCall ? "call" : "priority-high",
        duration: `Session: ${session.duration_minutes || 0} mins`,
        source: "App: Notification",
        sortTime: new Date(log.fired_at || session.started_at).getTime(),
      });
    });

    if (!session.completed) {
      items.push({
        id: `unlock-${session.id}`,
        type: "unlock",
        title: "Emergency Unlock",
        status: "Manual Override",
        description: "Session ended early before completion.",
        time: formatTime(session.ended_at || session.started_at),
        icon: "gpp-bad",
        duration: `Session: ${session.duration_minutes || 0} mins`,
        source: "Reason: Manual Override",
        sortTime: new Date(session.ended_at || session.started_at).getTime(),
      });
    }
  });

  return items.sort((a, b) => b.sortTime - a.sortTime);
};

const OverrideLogScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    const fetchSessions = async () => {
      if (!user?.id) return;

      const { data, error } = await supabase
        .from("sessions")
        .select(
          `id, duration_minutes, started_at, ended_at, completed,
           notification_logs (id, text, predicted_label, was_allowed, fired_at)`,
        )
        .eq("user_id", user.id)
        .order("started_at", { ascending: false });

      if (!error && data) setSessions(data);
    };

    fetchSessions();
  }, [user?.id]);

  const overrideItems = buildOverrideLogItems(sessions);
  const urgentAllowedCount = overrideItems.filter((i) => i.type === "override").length;
  const manualUnlockCount = overrideItems.filter((i) => i.type === "unlock").length;

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
        <TouchableOpacity
          style={styles.backRow}
          onPress={() => navigation.goBack()}
          activeOpacity={0.75}
        >
          <MaterialIcons name="chevron-left" size={22} color={colors.warmBrown} />
          <Text style={styles.backText}>Back to Stats</Text>
        </TouchableOpacity>

        <View style={{ gap: 4 }}>
          <Text style={styles.eyebrow}>ACTIVITY HISTORY</Text>
          <Text style={styles.logTitle}>Override Log</Text>
          <Text style={styles.logSubtitle}>
            Emergency unlocks and urgent notifications that passed through during focus sessions.
          </Text>
        </View>

        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          <View style={[styles.summaryCard, shadows.card]}>
            <MaterialIcons name="priority-high" size={22} color={colors.error} />
            <Text style={styles.summaryValue}>{urgentAllowedCount}</Text>
            <Text style={styles.summaryLabel}>Urgent Alerts</Text>
          </View>
          <View style={[styles.summaryCard, shadows.card]}>
            <MaterialIcons name="settings-backup-restore" size={22} color={colors.error} />
            <Text style={styles.summaryValue}>{manualUnlockCount}</Text>
            <Text style={styles.summaryLabel}>Manual Unlocks</Text>
          </View>
        </View>

        <View style={{ gap: spacing.sm }}>
          {overrideItems.length === 0 ? (
            <View style={[patterns.card, shadows.card, styles.emptyCard]}>
              <MaterialIcons name="verified-user" size={32} color={colors.success} />
              <Text style={styles.emptyTitle}>No overrides yet.</Text>
              <Text style={styles.emptyText}>
                Emergency alerts and manual unlocks will appear here.
              </Text>
            </View>
          ) : (
            overrideItems.map((item) => (
              <View key={item.id} style={[patterns.card, shadows.card]}>
                <View style={styles.logHeader}>
                  <View style={styles.warningIcon}>
                    <MaterialIcons name={item.icon} size={18} color={colors.error} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.logItemTitle}>{item.title}</Text>
                    <Text style={styles.warningText}>{item.status}</Text>
                  </View>
                  <Text style={styles.logTime}>{item.time}</Text>
                </View>

                <View style={styles.descriptionBox}>
                  <Text style={styles.descriptionText}>{item.description}</Text>
                </View>

                <View style={styles.logFooter}>
                  <View style={styles.footerItem}>
                    <MaterialIcons name="timer" size={13} color={colors.outline} />
                    <Text style={styles.footerText}>{item.duration}</Text>
                  </View>
                  <View style={styles.footerItem}>
                    <MaterialIcons name="apps" size={13} color={colors.outline} />
                    <Text style={styles.footerText}>{item.source}</Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 2,
    paddingVertical: 4,
  },
  backText: {
    ...typography.bodySm,
    color: colors.warmBrown,
    fontWeight: "700",
  },
  eyebrow: { ...typography.labelCaps, fontSize: 10, color: colors.primary },
  logTitle: { ...typography.h1, fontSize: 26, color: colors.warmBrown },
  logSubtitle: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    marginTop: 4,
    lineHeight: 18,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radii["3xl"],
    padding: spacing.md,
    borderWidth: 1,
    borderColor: `${colors.orange}18`,
    gap: 6,
  },
  summaryValue: { ...typography.h2, fontSize: 22, color: colors.warmBrown },
  summaryLabel: {
    ...typography.bodySm,
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
  emptyCard: {
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xl,
  },
  emptyTitle: {
    ...typography.h3,
    fontSize: 16,
    color: colors.warmBrown,
  },
  emptyText: {
    ...typography.bodySm,
    color: colors.outline,
    textAlign: "center",
    lineHeight: 18,
  },
  logHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  warningIcon: {
    width: 42,
    height: 42,
    borderRadius: radii.lg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: `${colors.error}15`,
  },
  logItemTitle: { ...typography.h3, fontSize: 15, color: colors.warmBrown },
  warningText: {
    ...typography.labelCaps,
    fontSize: 10,
    marginTop: 3,
    color: colors.error,
  },
  logTime: { ...typography.labelCaps, fontSize: 9, color: colors.outline },
  descriptionBox: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radii.lg,
    padding: spacing.sm,
    marginTop: spacing.sm,
  },
  descriptionText: {
    ...typography.bodySm,
    fontSize: 12,
    color: colors.onSurfaceVariant,
    fontStyle: "italic",
    lineHeight: 18,
  },
  logFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  footerItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexShrink: 1,
  },
  footerText: {
    ...typography.bodySm,
    fontSize: 11,
    color: colors.onSurfaceVariant,
  },
});

export default OverrideLogScreen;
