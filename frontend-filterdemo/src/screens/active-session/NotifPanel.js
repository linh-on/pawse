import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { colors, spacing, radii, shadows, typography } from "../../theme";
import FeedCard from "./FeedCard";

/**
 * NotifPanel
 *
 * Adds a permission banner when running on Android without notification access.
 * In "real" mode, play/pause controls still work as a gate — incoming
 * notifications are only classified while isRunning is true.
 * The "skip" button always injects a sim notification for manual testing.
 */
const NotifPanel = ({
  feed,
  isRunning,
  mode,
  hasPermission,
  onTogglePlay,
  onFireNext,
  onRequestPermission,
}) => {
  const urgentCount = feed.filter((e) => e.predicted === "urgent").length;
  const suppressedCount = feed.filter(
    (e) => e.predicted === "non_urgent",
  ).length;
  const isReal = mode === "real";

  return (
    <View style={styles.section}>
      {/* Permission banner — Android only, shown when access not granted */}
      {Platform.OS === "android" && !hasPermission && (
        <TouchableOpacity
          style={styles.permBanner}
          onPress={onRequestPermission}
          activeOpacity={0.85}
        >
          <MaterialIcons
            name="notifications-off"
            size={16}
            color={colors.error}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.permTitle}>Notification access needed</Text>
            <Text style={styles.permSub}>
              Tap to open Android settings and enable it for Pawse.
            </Text>
          </View>
          <MaterialIcons name="chevron-right" size={18} color={colors.error} />
        </TouchableOpacity>
      )}

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Notification Filter</Text>
          <View style={styles.modeRow}>
            <View
              style={[
                styles.modeDot,
                { backgroundColor: isReal ? "#1F8A3F" : colors.primary },
              ]}
            />
            <Text style={styles.subtitle}>
              {isReal ? "Live — real notifications" : "Simulation mode"}
            </Text>
          </View>
        </View>
        <View style={styles.controls}>
          {/* Skip always fires a sim notification for manual testing */}
          <TouchableOpacity
            style={[styles.ctrlBtn, { backgroundColor: `${colors.orange}18` }]}
            onPress={onFireNext}
          >
            <MaterialIcons name="skip-next" size={18} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.ctrlBtn,
              isRunning
                ? { backgroundColor: `${colors.secondaryFixed}88` }
                : { backgroundColor: colors.primaryContainer },
            ]}
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
        <View
          style={[
            styles.pill,
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
          <Text style={[styles.pillNum, { color: colors.error }]}>
            {urgentCount}
          </Text>
          <Text style={styles.pillLabel}>Allowed</Text>
        </View>
        <View
          style={[
            styles.pill,
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
          <Text style={[styles.pillNum, { color: colors.warmBrown }]}>
            {suppressedCount}
          </Text>
          <Text style={styles.pillLabel}>Suppressed</Text>
        </View>
      </View>

      {/* Feed */}
      {feed.length === 0 ? (
        <View style={styles.empty}>
          <MaterialIcons
            name="notifications-none"
            size={32}
            color={colors.outlineVariant}
          />
          <Text style={styles.emptyText}>
            {isReal
              ? isRunning
                ? "Waiting for notifications…"
                : "Press play to start filtering real notifications"
              : "Press play to start simulation"}
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
  );
};

const styles = StyleSheet.create({
  section: {
    width: "100%",
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radii["3xl"],
    padding: spacing.gutter,
    borderWidth: 1,
    borderColor: `${colors.orange}22`,
    gap: spacing.sm,
    ...shadows.card,
  },
  permBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: `${colors.error}10`,
    borderRadius: radii.xl,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: `${colors.error}30`,
  },
  permTitle: {
    ...typography.bodySm,
    color: colors.error,
    fontWeight: "700",
    fontSize: 12,
  },
  permSub: {
    ...typography.bodySm,
    color: colors.error,
    fontSize: 11,
    opacity: 0.8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: { ...typography.h3, fontSize: 16, color: colors.warmBrown },
  modeRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 2 },
  modeDot: { width: 7, height: 7, borderRadius: 4 },
  subtitle: { ...typography.bodySm, fontSize: 11, color: colors.outline },
  controls: { flexDirection: "row", gap: 8 },
  ctrlBtn: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    alignItems: "center",
    justifyContent: "center",
  },
  stats: { flexDirection: "row", gap: 8 },
  pill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: radii.lg,
    borderWidth: 1,
  },
  pillNum: { ...typography.h3, fontSize: 16, color: colors.warmBrown },
  pillLabel: { ...typography.labelCaps, fontSize: 9, color: colors.outline },
  empty: { alignItems: "center", paddingVertical: spacing.lg, gap: 8 },
  emptyText: {
    ...typography.bodySm,
    color: colors.outlineVariant,
    textAlign: "center",
  },
  feedList: { gap: 8 },
});

export default NotifPanel;
