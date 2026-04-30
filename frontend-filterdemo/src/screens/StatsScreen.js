import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Header from "../components/Header";
import { colors, spacing, radii, shadows, typography } from "../theme";

const DAYS = ["M", "T", "W", "T", "F", "S", "S"];
const WEEK_DATA = [0.6, 0.4, 0.8, 0.5, 0.9, 0.3, 0.7];

// Heatmap intensity per cell (0-3)
const GRID = [
  [1, 2, 0, 1, 3, 2, 1],
  [2, 3, 2, 1, 2, 3, 2],
  [0, 1, 2, 3, 2, 1, 0],
  [1, 2, 1, 0, 1, 2, 3],
  [2, 1, 0, 1, 2, 3, 2],
  [3, 2, 1, 2, 1, 0, 1],
];

const REWARDS = [
  { name: "Tiny Sprout", icon: "local-florist", unlocked: true },
  { name: "Lo-Fi Beanie", icon: "headset", unlocked: true },
  { name: "Level 19", icon: "lock", unlocked: false },
  { name: "Warm Cocoa", icon: "local-cafe", unlocked: true },
  { name: "Comfy Scarf", icon: "favorite", unlocked: true },
  { name: "Level 24", icon: "lock", unlocked: false },
  { name: "Sleepy Bug", icon: "nightlight", unlocked: true },
  { name: "Level 28", icon: "lock", unlocked: false },
  { name: "Level 30", icon: "lock", unlocked: false },
];

const MASCOT =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAFb7jjkY7NC_rkg3sSsGcNFn_sR9nbvDa0TNzK5TxPChSaCiPu-whKcwwYnarqWvGT2ugbEnmENbhqq7nC0PbNLUy7JnOBtcL8tgo4wH1AuTgI4C6Qtx280aMVHmlbwYDTCBJ7Z_OpC6kuI0fwt3Wm7tQMSdQckNWj9LkEoUBNMGoa-za19rKhTEwV-5A2gSPy1SuuHczBGQ-5uuSJImUrzvjDSm9wwCtb4UCC3dH9udT_9RJAH_pcH7CB3QmKWW3kArkr_DHxO3Ci";

const StatsScreen = () => {
  const insets = useSafeAreaInsets();
  const [tab, setTab] = useState("stats");

  return (
    <View style={styles.screen}>
      <Header />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: 120 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Top row */}
        <View style={styles.topRow}>
          <View style={[styles.peakCard, shadows.card]}>
            <Text style={styles.peakLabel}>PEAK FOCUS</Text>
            <Text style={styles.peakValue}>2 PM</Text>
            <Text style={styles.peakDelta}>↗ +12% vs last week</Text>
          </View>
          <View style={[styles.streakCard, shadows.card]}>
            <Text style={styles.streakLabel}>CURRENT STREAK</Text>
            <View style={styles.streakRow}>
              <Text style={styles.streakNum}>14</Text>
              <Text style={styles.streakUnit}>days</Text>
            </View>
            <View style={styles.streakBar}>
              <View style={styles.streakBarFill} />
            </View>
          </View>
        </View>

        {/* Weekly Focus chart */}
        <View style={[styles.card, shadows.card]}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>Weekly Focus</Text>
            <Text style={styles.cardMeta}>42.5 hrs total</Text>
          </View>
          <View style={styles.chartArea}>
            {WEEK_DATA.map((v, i) => (
              <View key={i} style={styles.chartCol}>
                <View style={[styles.chartBar, { height: `${v * 100}%` }]} />
              </View>
            ))}
          </View>
          <View style={styles.chartLabels}>
            {DAYS.map((d, i) => (
              <Text key={i} style={styles.chartLabel}>
                {d}
              </Text>
            ))}
          </View>
        </View>

        {/* Consistency Grid */}
        <View style={[styles.card, shadows.card]}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>Consistency Grid</Text>
            <View style={styles.legendRow}>
              {[0, 1, 2, 3].map((i) => (
                <View
                  key={i}
                  style={[styles.legendCell, { backgroundColor: cellColor(i) }]}
                />
              ))}
            </View>
          </View>
          <View style={styles.grid}>
            {GRID.map((row, ri) => (
              <View key={ri} style={styles.gridRow}>
                {row.map((cell, ci) => (
                  <View
                    key={ci}
                    style={[
                      styles.gridCell,
                      { backgroundColor: cellColor(cell) },
                    ]}
                  />
                ))}
              </View>
            ))}
          </View>
        </View>

        {/* Mascot card */}
        <View style={[styles.mascotCard, shadows.card]}>
          <View style={styles.mascotHeader}>
            <View style={styles.mascotAvatar}>
              <Image source={{ uri: MASCOT }} style={styles.mascotImg} />
              <View style={styles.levelBadge}>
                <Text style={styles.levelText}>12</Text>
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.mascotName}>Mochi the{"\n"}Calico</Text>
              <Text style={styles.xpLabel}>XP Progress</Text>
              <View style={styles.xpRow}>
                <View style={styles.xpBar}>
                  <View style={[styles.xpBarFill, { width: "78%" }]} />
                </View>
                <Text style={styles.xpText}>780 / 1000</Text>
              </View>
            </View>
          </View>

          {/* Reward grid */}
          <View style={styles.rewardGrid}>
            {REWARDS.map((r, i) => (
              <View
                key={i}
                style={[styles.rewardCell, !r.unlocked && styles.rewardLocked]}
              >
                <MaterialIcons
                  name={r.icon}
                  size={22}
                  color={r.unlocked ? colors.primary : colors.outlineVariant}
                />
                <Text
                  style={[
                    styles.rewardName,
                    !r.unlocked && { color: colors.outlineVariant },
                  ]}
                >
                  {r.name}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

function cellColor(intensity) {
  const map = [
    `${colors.primary}10`,
    `${colors.primaryContainer}80`,
    colors.primaryContainer,
    colors.primary,
  ];
  return map[intensity];
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surfaceContainerLow },
  scroll: {
    paddingHorizontal: spacing.containerPadding,
    paddingTop: spacing.md,
    gap: spacing.gutter,
  },

  // Tabs
  tabs: {
    flexDirection: "row",
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radii.full,
    padding: 4,
    ...shadows.card,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: radii.full,
  },
  tabActive: { backgroundColor: colors.surfaceContainerHigh },
  tabText: { ...typography.bodyMd, color: colors.outline, fontWeight: "600" },
  tabTextActive: { color: colors.warmBrown },

  // Top row
  topRow: { flexDirection: "row", gap: spacing.sm },
  peakCard: {
    flex: 1,
    backgroundColor: `${colors.primaryContainer}22`,
    borderRadius: radii["2xl"],
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: `${colors.orange}33`,
    gap: 4,
  },
  peakLabel: { ...typography.labelCaps, color: colors.primary, fontSize: 9 },
  peakValue: { ...typography.h2, fontSize: 22, color: colors.warmBrown },
  peakDelta: { ...typography.bodySm, fontSize: 11, color: colors.primary },

  streakCard: {
    flex: 1,
    backgroundColor: `${colors.secondaryFixed}55`,
    borderRadius: radii["2xl"],
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: `${colors.secondary}33`,
    gap: 4,
  },
  streakLabel: {
    ...typography.labelCaps,
    color: colors.secondary,
    fontSize: 9,
  },
  streakRow: { flexDirection: "row", alignItems: "baseline", gap: 4 },
  streakNum: { ...typography.h2, fontSize: 24, color: colors.warmBrown },
  streakUnit: { ...typography.bodySm, color: colors.onSurfaceVariant },
  streakBar: {
    height: 4,
    backgroundColor: "rgba(255,255,255,0.5)",
    borderRadius: 2,
    marginTop: 4,
  },
  streakBarFill: {
    width: "70%",
    height: "100%",
    backgroundColor: colors.secondary,
    borderRadius: 2,
  },

  // Generic card
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radii["3xl"],
    padding: spacing.md,
    borderWidth: 1,
    borderColor: `${colors.orange}18`,
    gap: spacing.sm,
  },
  cardTitle: { ...typography.h3, fontSize: 16, color: colors.warmBrown },
  cardMeta: { ...typography.bodySm, fontSize: 12, color: colors.outline },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  // Chart
  chartArea: {
    height: 100,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
  },
  chartCol: { flex: 1, height: "100%", justifyContent: "flex-end" },
  chartBar: {
    backgroundColor: colors.primaryContainer,
    borderRadius: radii.sm,
    minHeight: 4,
  },
  chartLabels: { flexDirection: "row", gap: 8, paddingTop: 4 },
  chartLabel: {
    flex: 1,
    textAlign: "center",
    ...typography.labelCaps,
    fontSize: 10,
    color: colors.outline,
  },

  // Heatmap grid
  legendRow: { flexDirection: "row", gap: 3 },
  legendCell: { width: 12, height: 12, borderRadius: 2 },
  grid: { gap: 4 },
  gridRow: { flexDirection: "row", gap: 4 },
  gridCell: { flex: 1, aspectRatio: 1, borderRadius: 4 },

  // Mascot
  mascotCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radii["3xl"],
    padding: spacing.md,
    borderWidth: 1,
    borderColor: `${colors.orange}18`,
    gap: spacing.gutter,
  },
  mascotHeader: { flexDirection: "row", gap: spacing.sm, alignItems: "center" },
  mascotAvatar: { position: "relative" },
  mascotImg: {
    width: 70,
    height: 70,
    borderRadius: radii.lg,
    backgroundColor: `${colors.primaryContainer}33`,
  },
  levelBadge: {
    position: "absolute",
    bottom: -4,
    right: -4,
    backgroundColor: colors.primary,
    width: 26,
    height: 26,
    borderRadius: radii.full,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  levelText: { color: "#fff", fontWeight: "800", fontSize: 11 },
  mascotName: { ...typography.h2, fontSize: 18, color: colors.warmBrown },
  xpLabel: {
    ...typography.bodySm,
    fontSize: 11,
    color: colors.outline,
    marginTop: 6,
  },
  xpRow: { gap: 4, marginTop: 4 },
  xpBar: {
    height: 8,
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: 4,
    overflow: "hidden",
  },
  xpBarFill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: 4,
  },
  xpText: {
    ...typography.bodySm,
    fontSize: 11,
    color: colors.outline,
    alignSelf: "flex-end",
  },

  // Rewards grid
  rewardGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "space-between",
  },
  rewardCell: {
    width: "31%",
    aspectRatio: 1,
    backgroundColor: `${colors.primaryContainer}15`,
    borderRadius: radii.lg,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: 6,
  },
  rewardLocked: { backgroundColor: colors.surfaceContainerHigh, opacity: 0.6 },
  rewardName: {
    ...typography.labelCaps,
    fontSize: 9,
    color: colors.warmBrown,
    textAlign: "center",
  },
});

export default StatsScreen;
