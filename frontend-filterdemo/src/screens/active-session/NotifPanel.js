import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { colors, spacing, radii, shadows, typography } from "../../theme";
import FeedCard from "./FeedCard";

/**
 * Notification simulation panel.
 * Includes: header with controls, stats pills, feed list.
 */
const NotifPanel = ({
  feed, isRunning,
  onTogglePlay, onFireNext,
}) => {
  const urgentCount = feed.filter((e) => e.predicted === "urgent").length;
  const suppressedCount = feed.filter((e) => e.predicted === "non_urgent").length;

  return (
    <View style={styles.section}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Notification Filter</Text>
          <Text style={styles.subtitle}>Live simulation</Text>
        </View>
        <View style={styles.controls}>
          <TouchableOpacity
            style={[styles.ctrlBtn, { backgroundColor: `${colors.orange}18` }]}
            onPress={onFireNext}
          >
            <MaterialIcons name="skip-next" size={18} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.ctrlBtn, isRunning
              ? { backgroundColor: `${colors.secondaryFixed}88` }
              : { backgroundColor: colors.primaryContainer }]}
            onPress={onTogglePlay}
          >
            <MaterialIcons
              name={isRunning ? "pause" : "play-arrow"}
              size={18}
              color={isRunning ? colors.secondary : colors.onPrimaryContainer}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Stats pills */}
      <View style={styles.stats}>
        <View style={[styles.pill, {
          borderColor: `${colors.error}33`,
          backgroundColor: `${colors.error}08`,
        }]}>
          <MaterialIcons name="notifications-active" size={14} color={colors.error} />
          <Text style={[styles.pillNum, { color: colors.error }]}>{urgentCount}</Text>
          <Text style={styles.pillLabel}>Allowed</Text>
        </View>
        <View style={[styles.pill, {
          borderColor: `${colors.outline}33`,
          backgroundColor: colors.surfaceContainer,
        }]}>
          <MaterialIcons name="notifications-off" size={14} color={colors.outline} />
          <Text style={[styles.pillNum, { color: colors.warmBrown }]}>{suppressedCount}</Text>
          <Text style={styles.pillLabel}>Suppressed</Text>
        </View>
      </View>

      {/* Feed */}
      {feed.length === 0 ? (
        <View style={styles.empty}>
          <MaterialIcons name="notifications-none" size={32} color={colors.outlineVariant} />
          <Text style={styles.emptyText}>Press play to start simulation</Text>
        </View>
      ) : (
        <View style={styles.feedList}>
          {feed.map((entry) => <FeedCard key={entry.id} entry={entry} />)}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    width: "100%", backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radii["3xl"], padding: spacing.gutter,
    borderWidth: 1, borderColor: `${colors.orange}22`,
    gap: spacing.sm, ...shadows.card,
  },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { ...typography.h3, fontSize: 16, color: colors.warmBrown },
  subtitle: { ...typography.bodySm, fontSize: 11, color: colors.outline, marginTop: 2 },
  controls: { flexDirection: "row", gap: 8 },
  ctrlBtn: {
    width: 36, height: 36, borderRadius: radii.full,
    alignItems: "center", justifyContent: "center",
  },
  stats: { flexDirection: "row", gap: 8 },
  pill: {
    flex: 1, flexDirection: "row", alignItems: "center", gap: 6,
    paddingVertical: 8, paddingHorizontal: 10,
    borderRadius: radii.lg, borderWidth: 1,
  },
  pillNum: { ...typography.h3, fontSize: 16, color: colors.warmBrown },
  pillLabel: { ...typography.labelCaps, fontSize: 9, color: colors.outline },
  empty: { alignItems: "center", paddingVertical: spacing.lg, gap: 8 },
  emptyText: { ...typography.bodySm, color: colors.outlineVariant, textAlign: "center" },
  feedList: { gap: 8 },
});

export default NotifPanel;
