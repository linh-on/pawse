import React, { useEffect, useState } from "react";
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

const DAYS = ["M", "T", "W", "T", "F", "S", "S"];
const MONTH_NAMES = [
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

const XP_PER_MINUTE = 2;
const XP_PER_LEVEL = 1000;

// Earliest week allowed (Jan 1 2026)
const MIN_DATE = new Date("2026-01-01T00:00:00");

const REWARD_DEFS = [
  { name: "Tiny Sprout", icon: "local-florist", minLevel: 1 },
  { name: "Lo-Fi Beanie", icon: "headset", minLevel: 2 },
  { name: "Warm Cocoa", icon: "local-cafe", minLevel: 5 },
  { name: "Comfy Scarf", icon: "favorite", minLevel: 10 },
  { name: "Sleepy Bug", icon: "nightlight", minLevel: 15 },
  { name: "Level 19", icon: "lock", minLevel: 19 },
  { name: "Level 24", icon: "lock", minLevel: 24 },
  { name: "Level 28", icon: "lock", minLevel: 28 },
  { name: "Level 30", icon: "lock", minLevel: 30 },
];

const MASCOT =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAFb7jjkY7NC_rkg3sSsGcNFn_sR9nbvDa0TNzK5TxPChSaCiPu-whKcwwYnarqWvGT2ugbEnmENbhqq7nC0PbNLUy7JnOBtcL8tgo4wH1AuTgI4C6Qtx280aMVHmlbwYDTCBJ7Z_OpC6kuI0fwt3Wm7tQMSdQckNWj9LkEoUBNMGoa-za19rKhTEwV-5A2gSPy1SuuHczBGQ-5uuSJImUrzvjDSm9wwCtb4UCC3dH9udT_9RJAH_pcH7CB3QmKWW3kArkr_DHxO3Ci";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Monday of the week that is `offset` weeks from the current week. */
const getWeekStart = (offset) => {
  const today = new Date();
  const daysFromMonday = (today.getDay() + 6) % 7; // Mon=0 … Sun=6
  const d = new Date(today);
  d.setDate(today.getDate() - daysFromMonday + offset * 7);
  d.setHours(0, 0, 0, 0);
  return d;
};

const getWeekEnd = (weekStart) => {
  const d = new Date(weekStart);
  d.setDate(weekStart.getDate() + 7);
  return d;
};

const fmtDate = (d) =>
  d.toLocaleDateString([], { month: "short", day: "numeric" });

const getWeekLabel = (offset) => {
  if (offset === 0) return "This Week";
  if (offset === -1) return "Last Week";
  const ws = getWeekStart(offset);
  const we = new Date(ws);
  we.setDate(ws.getDate() + 6);
  return `${fmtDate(ws)} – ${fmtDate(we)}`;
};

/**
 * Returns [0..1] bar heights for each of the 7 days in the given week,
 * plus the total focused minutes for that week.
 */
const buildWeekData = (sessions, weekOffset) => {
  const weekStart = getWeekStart(weekOffset);
  const weekEnd = getWeekEnd(weekStart);
  const totals = Array(7).fill(0);

  sessions
    .filter((s) => s.completed)
    .forEach((s) => {
      const date = new Date(s.started_at);
      if (date >= weekStart && date < weekEnd) {
        const index = Math.floor((date - weekStart) / (1000 * 60 * 60 * 24));
        if (index >= 0 && index < 7) totals[index] += s.duration_minutes || 0;
      }
    });

  const weekMinutes = totals.reduce((a, b) => a + b, 0);
  const max = Math.max(...totals, 1);
  const bars = totals.map((v) => Math.max(v / max, v > 0 ? 0.12 : 0));
  return { bars, weekMinutes };
};

const formatHours = (minutes) => {
  if (minutes === 0) return "No sessions";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
};

const getCurrentStreak = (sessions) => {
  const completedDays = new Set(
    sessions
      .filter((s) => s.completed)
      .map((s) => new Date(s.started_at).toDateString()),
  );
  let streak = 0;
  const cursor = new Date();
  if (!completedDays.has(cursor.toDateString()))
    cursor.setDate(cursor.getDate() - 1);
  while (completedDays.has(cursor.toDateString())) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
};

const getPeakFocusHour = (sessions) => {
  const totalsByHour = {};
  sessions
    .filter((s) => s.completed)
    .forEach((s) => {
      const hour = new Date(s.started_at).getHours();
      totalsByHour[hour] =
        (totalsByHour[hour] || 0) + (s.duration_minutes || 0);
    });
  const peak = Object.entries(totalsByHour).sort((a, b) => b[1] - a[1])[0];
  if (!peak) return "--";
  const d = new Date();
  d.setHours(Number(peak[0]), 0, 0, 0);
  return d.toLocaleTimeString([], { hour: "numeric" });
};

const buildMonthGrid = (sessions, year, month) => {
  const minutesByDay = {};
  sessions
    .filter((s) => s.completed)
    .forEach((s) => {
      // Use local date, not UTC (toISOString gives UTC which can be off by 1 day)
      const d2 = new Date(s.started_at);
      const key = `${d2.getFullYear()}-${String(d2.getMonth() + 1).padStart(2, "0")}-${String(d2.getDate()).padStart(2, "0")}`;
      minutesByDay[key] = (minutesByDay[key] || 0) + (s.duration_minutes || 0);
    });

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDow = new Date(year, month, 1).getDay();
  const leadingEmpties = (firstDow + 6) % 7;

  const cells = [];
  for (let i = 0; i < leadingEmpties; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const mins = minutesByDay[key] || 0;
    let intensity = 0;
    if (mins >= 60) intensity = 3;
    else if (mins >= 30) intensity = 2;
    else if (mins > 0) intensity = 1;
    cells.push({ day: d, intensity });
  }

  const rows = [];
  for (let i = 0; i < cells.length; i += 7) {
    const row = cells.slice(i, i + 7);
    while (row.length < 7) row.push(null);
    rows.push(row);
  }
  return rows;
};

function cellColor(intensity) {
  return [
    `${colors.primary}10`,
    `${colors.primaryContainer}80`,
    colors.primaryContainer,
    colors.primary,
  ][intensity];
}

const formatTime = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  const today = new Date();
  if (date.toDateString() === today.toDateString())
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
};

const buildLogItems = (sessions) => {
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
        description: `"${text}"`,
        time: formatTime(log.fired_at),
        icon: isCall ? "call" : "priority-high",
        duration: `Pause: ${session.duration_minutes || 0} mins`,
        source: "App: Notification",
        sortTime: new Date(log.fired_at || session.started_at).getTime(),
      });
    });
    if (session.completed) {
      items.push({
        id: `complete-${session.id}`,
        type: "completed",
        title: "Session Complete",
        status: "Pure Focus",
        description: null,
        time: formatTime(session.ended_at || session.started_at),
        icon: "check-circle-outline",
        duration: `Duration: ${session.duration_minutes || 0} mins`,
        source: "Earned: +25 Paws",
        sortTime: new Date(session.ended_at || session.started_at).getTime(),
      });
    } else {
      items.push({
        id: `unlock-${session.id}`,
        type: "unlock",
        title: "Emergency Unlock",
        status: "Override Triggered",
        description: "Session ended early before completion.",
        time: formatTime(session.ended_at || session.started_at),
        icon: "gpp-bad",
        duration: `Pause: ${session.duration_minutes || 0} mins`,
        source: "Reason: Manual Override",
        sortTime: new Date(session.ended_at || session.started_at).getTime(),
      });
    }
  });
  return items.sort((a, b) => b.sortTime - a.sortTime).slice(0, 30);
};

// ─── Component ────────────────────────────────────────────────────────────────

const StatsScreen = () => {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [tab, setTab] = useState("stats");
  const [sessions, setSessions] = useState([]);
  const [logFilter, setLogFilter] = useState("all");

  // Week navigation (0 = current week, negative = past)
  const [weekOffset, setWeekOffset] = useState(0);

  // Month grid navigation
  const now = new Date();
  const [gridYear, setGridYear] = useState(now.getFullYear());
  const [gridMonth, setGridMonth] = useState(now.getMonth());

  useEffect(() => {
    const fetchSessions = async () => {
      if (!user?.id) return;
      const { data, error } = await supabase
        .from("sessions")
        .select(
          `
          id, duration_minutes, started_at, ended_at, completed,
          notification_logs (id, text, predicted_label, was_allowed, fired_at)
        `,
        )
        .eq("user_id", user.id)
        .order("started_at", { ascending: false });
      if (!error && data) setSessions(data);
    };
    fetchSessions();
  }, [user?.id]);

  // ── Week navigation bounds ──
  const canGoBack = getWeekStart(weekOffset - 1) >= MIN_DATE;
  const canGoForward = weekOffset < 0;

  // ── Month navigation bounds ──
  const isCurrentMonth =
    gridYear === now.getFullYear() && gridMonth === now.getMonth();
  const goToPrevMonth = () => {
    if (gridMonth === 0) {
      setGridMonth(11);
      setGridYear((y) => y - 1);
    } else setGridMonth((m) => m - 1);
  };
  const goToNextMonth = () => {
    if (isCurrentMonth) return;
    if (gridMonth === 11) {
      setGridMonth(0);
      setGridYear((y) => y + 1);
    } else setGridMonth((m) => m + 1);
  };

  // ── Derived stats ──
  const completedMinutes = sessions
    .filter((s) => s.completed)
    .reduce((sum, s) => sum + (s.duration_minutes || 0), 0);

  const { bars: weekBars, weekMinutes } = buildWeekData(sessions, weekOffset);
  const streak = getCurrentStreak(sessions);
  const peakFocus = getPeakFocusHour(sessions);
  const grid = buildMonthGrid(sessions, gridYear, gridMonth);

  const totalXP = completedMinutes * XP_PER_MINUTE;
  const level = Math.floor(totalXP / XP_PER_LEVEL) + 1;
  const xpInLevel = totalXP % XP_PER_LEVEL;
  const xpProgress = xpInLevel / XP_PER_LEVEL;
  const rewards = REWARD_DEFS.map((r) => ({
    ...r,
    unlocked: level >= r.minLevel,
  }));

  const allLogItems = buildLogItems(sessions);
  const visibleLogItems = allLogItems.filter((item) => {
    if (logFilter === "all") return true;
    if (logFilter === "overrides")
      return item.type === "override" || item.type === "unlock";
    if (logFilter === "completed") return item.type === "completed";
    return true;
  });
  const overrideCount = allLogItems.filter(
    (item) => item.type === "override" || item.type === "unlock",
  ).length;
  const completedCount = allLogItems.filter(
    (item) => item.type === "completed",
  ).length;
  const focusShieldRate =
    allLogItems.length === 0
      ? 0
      : Math.round((completedCount / allLogItems.length) * 100);

  // ── Render ──
  const renderStats = () => (
    <>
      <View style={{ flexDirection: "row", gap: spacing.sm }}>
        <View style={[styles.peakCard, shadows.card]}>
          <Text style={styles.peakLabel}>PEAK FOCUS</Text>
          <Text style={styles.peakValue}>{peakFocus}</Text>
        </View>
        <View style={[styles.streakCard, shadows.card]}>
          <Text style={styles.streakLabel}>CURRENT STREAK</Text>
          <View
            style={{ flexDirection: "row", alignItems: "baseline", gap: 4 }}
          >
            <Text style={styles.streakNum}>{streak}</Text>
            <Text style={styles.streakUnit}>days</Text>
          </View>
          <View style={styles.streakBar}>
            <View
              style={[
                styles.streakBarFill,
                { width: `${Math.min(streak / 30, 1) * 100}%` },
              ]}
            />
          </View>
        </View>
      </View>

      {/* Weekly Focus — navigable */}
      <View style={[patterns.card, shadows.card, { gap: spacing.sm }]}>
        {/* Week header */}
        <View style={patterns.rowBetween}>
          <Text style={styles.cardTitle}>Weekly Focus</Text>
          <Text style={styles.cardMeta}>{formatHours(weekMinutes)}</Text>
        </View>

        <View style={styles.weekNav}>
          <TouchableOpacity
            style={[styles.weekArrow, !canGoBack && { opacity: 0.3 }]}
            onPress={() => canGoBack && setWeekOffset((o) => o - 1)}
            disabled={!canGoBack}
          >
            <MaterialIcons
              name="chevron-left"
              size={20}
              color={colors.warmBrown}
            />
          </TouchableOpacity>

          <Text style={styles.weekLabel}>{getWeekLabel(weekOffset)}</Text>

          <TouchableOpacity
            style={[styles.weekArrow, !canGoForward && { opacity: 0.3 }]}
            onPress={() => canGoForward && setWeekOffset((o) => o + 1)}
            disabled={!canGoForward}
          >
            <MaterialIcons
              name="chevron-right"
              size={20}
              color={colors.warmBrown}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.chartArea}>
          {weekBars.map((v, i) => (
            <View key={i} style={styles.chartCol}>
              <View style={[styles.chartBar, { height: `${v * 100}%` }]} />
            </View>
          ))}
        </View>

        <View style={{ flexDirection: "row", gap: 8, paddingTop: 4 }}>
          {DAYS.map((d, i) => (
            <Text key={i} style={styles.chartLabel}>
              {d}
            </Text>
          ))}
        </View>
      </View>

      {/* Consistency Grid — month view */}
      <View style={[patterns.card, shadows.card, { gap: spacing.sm }]}>
        <View style={patterns.rowBetween}>
          <TouchableOpacity onPress={goToPrevMonth} style={styles.monthArrow}>
            <MaterialIcons
              name="chevron-left"
              size={22}
              color={colors.warmBrown}
            />
          </TouchableOpacity>
          <Text style={styles.monthName}>
            {MONTH_NAMES[gridMonth]} {gridYear}
          </Text>
          <TouchableOpacity
            onPress={goToNextMonth}
            style={[styles.monthArrow, isCurrentMonth && { opacity: 0.3 }]}
            disabled={isCurrentMonth}
          >
            <MaterialIcons
              name="chevron-right"
              size={22}
              color={colors.warmBrown}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.legendRow}>
          <Text style={styles.legendLabel}>Less</Text>
          {[0, 1, 2, 3].map((i) => (
            <View
              key={i}
              style={[styles.legendCell, { backgroundColor: cellColor(i) }]}
            />
          ))}
          <Text style={styles.legendLabel}>More</Text>
        </View>

        <View style={styles.dowRow}>
          {DAYS.map((d, i) => (
            <Text key={i} style={styles.dowLabel}>
              {d}
            </Text>
          ))}
        </View>

        <View style={{ gap: 4 }}>
          {grid.map((row, ri) => (
            <View key={ri} style={{ flexDirection: "row", gap: 4 }}>
              {row.map((cell, ci) =>
                cell === null ? (
                  <View key={ci} style={styles.gridCell} />
                ) : (
                  <View
                    key={ci}
                    style={[
                      styles.gridCell,
                      { backgroundColor: cellColor(cell.intensity) },
                    ]}
                  />
                ),
              )}
            </View>
          ))}
        </View>
      </View>

      {/* XP / Mascot */}
      <View style={[patterns.card, shadows.card, { gap: spacing.gutter }]}>
        <View
          style={{
            flexDirection: "row",
            gap: spacing.sm,
            alignItems: "center",
          }}
        >
          <View style={styles.mascotAvatar}>
            <Image source={{ uri: MASCOT }} style={styles.mascotImg} />
            <View style={styles.levelBadge}>
              <Text style={styles.levelText}>{level}</Text>
            </View>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.mascotName}>Mochi the{"\n"}Calico</Text>
            <Text style={styles.xpLabel}>XP Progress</Text>
            <View style={{ gap: 4, marginTop: 4 }}>
              <View style={styles.xpBar}>
                <View
                  style={[
                    styles.xpBarFill,
                    { width: `${Math.round(xpProgress * 100)}%` },
                  ]}
                />
              </View>
              <Text style={styles.xpText}>
                {xpInLevel} / {XP_PER_LEVEL}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.rewardGrid}>
          {rewards.map((r, i) => (
            <View
              key={i}
              style={[styles.rewardCell, !r.unlocked && styles.rewardLocked]}
            >
              <MaterialIcons
                name={r.unlocked ? r.icon : "lock"}
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
    </>
  );

  const renderLog = () => (
    <>
      <View style={{ gap: 4 }}>
        <Text style={styles.eyebrow}>ACTIVITY HISTORY</Text>
        <Text style={styles.title}>Override Log</Text>
        <Text style={styles.subtitle}>
          A gentle look back at your session breaks and focus milestones.
        </Text>
      </View>

      <View style={styles.filterRow}>
        {[
          { id: "all", label: "All Activity" },
          { id: "overrides", label: "Overrides" },
          { id: "completed", label: "Completed" },
        ].map((item) => (
          <TouchableOpacity
            key={item.id}
            style={[
              styles.filterChip,
              logFilter === item.id && styles.filterChipActive,
            ]}
            onPress={() => setLogFilter(item.id)}
          >
            <Text
              style={[
                styles.filterText,
                logFilter === item.id && styles.filterTextActive,
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ gap: spacing.sm }}>
        {visibleLogItems.length === 0 ? (
          <View style={[patterns.card, shadows.card, styles.emptyCard]}>
            <MaterialIcons
              name="history"
              size={32}
              color={colors.outlineVariant}
            />
            <Text style={styles.emptyText}>No log activity yet.</Text>
          </View>
        ) : (
          visibleLogItems.map((item) => (
            <View key={item.id} style={[patterns.card, shadows.card]}>
              <View style={styles.logHeader}>
                <View
                  style={[
                    styles.logIcon,
                    item.type === "completed"
                      ? styles.successIcon
                      : styles.warningIcon,
                  ]}
                >
                  <MaterialIcons
                    name={item.icon}
                    size={18}
                    color={item.type === "completed" ? "#1F8A3F" : colors.error}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.logTitle}>{item.title}</Text>
                  <Text
                    style={[
                      styles.logStatus,
                      item.type === "completed"
                        ? styles.successText
                        : styles.warningText,
                    ]}
                  >
                    {item.status}
                  </Text>
                </View>
                <Text style={styles.logTime}>{item.time}</Text>
              </View>
              {item.description && (
                <View style={styles.descriptionBox}>
                  <Text style={styles.descriptionText}>{item.description}</Text>
                </View>
              )}
              <View style={styles.logFooter}>
                <View style={styles.footerItem}>
                  <MaterialIcons
                    name="timer"
                    size={13}
                    color={colors.outline}
                  />
                  <Text style={styles.footerText}>{item.duration}</Text>
                </View>
                <View style={styles.footerItem}>
                  <MaterialIcons
                    name={item.type === "completed" ? "emoji-events" : "apps"}
                    size={13}
                    color={colors.outline}
                  />
                  <Text style={styles.footerText}>{item.source}</Text>
                </View>
              </View>
            </View>
          ))
        )}
      </View>

      <View style={{ flexDirection: "row", gap: spacing.sm }}>
        <View style={[styles.summaryCard, shadows.card]}>
          <MaterialIcons
            name="health-and-safety"
            size={22}
            color={colors.primary}
          />
          <Text style={styles.summaryValue}>{focusShieldRate}%</Text>
          <Text style={styles.summaryLabel}>Focus Shield Rate</Text>
        </View>
        <View style={[styles.summaryCard, shadows.card]}>
          <MaterialIcons
            name="settings-backup-restore"
            size={22}
            color={colors.error}
          />
          <Text style={styles.summaryValue}>{overrideCount}</Text>
          <Text style={styles.summaryLabel}>Overrides this week</Text>
        </View>
      </View>
    </>
  );

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
        <View style={[styles.tabs, shadows.card]}>
          <TouchableOpacity
            style={[styles.tab, tab === "stats" && styles.tabActive]}
            onPress={() => setTab("stats")}
          >
            <Text
              style={[styles.tabText, tab === "stats" && styles.tabTextActive]}
            >
              Stats
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, tab === "log" && styles.tabActive]}
            onPress={() => setTab("log")}
          >
            <Text
              style={[styles.tabText, tab === "log" && styles.tabTextActive]}
            >
              Log
            </Text>
          </TouchableOpacity>
        </View>
        {tab === "stats" ? renderStats() : renderLog()}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  tabs: {
    flexDirection: "row",
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radii.full,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderRadius: radii.full,
  },
  tabActive: { backgroundColor: colors.surfaceContainerHigh },
  tabText: { ...typography.bodyMd, color: colors.outline, fontWeight: "600" },
  tabTextActive: { color: colors.warmBrown },

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
  streakNum: { ...typography.h2, fontSize: 24, color: colors.warmBrown },
  streakUnit: { ...typography.bodySm, color: colors.onSurfaceVariant },
  streakBar: {
    height: 4,
    backgroundColor: "rgba(255,255,255,0.5)",
    borderRadius: 2,
    marginTop: 4,
  },
  streakBarFill: {
    height: "100%",
    backgroundColor: colors.secondary,
    borderRadius: 2,
  },

  cardTitle: { ...typography.h3, fontSize: 16, color: colors.warmBrown },
  cardMeta: { ...typography.bodySm, fontSize: 12, color: colors.outline },

  // Week navigation
  weekNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radii.lg,
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  weekArrow: {
    width: 28,
    height: 28,
    borderRadius: radii.full,
    alignItems: "center",
    justifyContent: "center",
  },
  weekLabel: {
    ...typography.bodySm,
    fontSize: 12,
    color: colors.warmBrown,
    fontWeight: "600",
  },

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
  chartLabel: {
    flex: 1,
    textAlign: "center",
    ...typography.labelCaps,
    fontSize: 10,
    color: colors.outline,
  },

  // Month grid
  monthName: { ...typography.h3, fontSize: 16, color: colors.warmBrown },
  monthArrow: {
    width: 32,
    height: 32,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceContainerLow,
    alignItems: "center",
    justifyContent: "center",
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-end",
  },
  legendLabel: { ...typography.labelCaps, fontSize: 9, color: colors.outline },
  legendCell: { width: 12, height: 12, borderRadius: 2 },
  dowRow: { flexDirection: "row", gap: 4, marginBottom: 2 },
  dowLabel: {
    flex: 1,
    textAlign: "center",
    ...typography.labelCaps,
    fontSize: 9,
    color: colors.outline,
  },
  gridCell: { flex: 1, aspectRatio: 1, borderRadius: 4 },

  // XP
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

  // Log
  eyebrow: { ...typography.labelCaps, fontSize: 10, color: colors.primary },
  title: { ...typography.h1, fontSize: 26, color: colors.warmBrown },
  subtitle: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    marginTop: 4,
    lineHeight: 18,
  },
  filterRow: { flexDirection: "row", gap: 8, marginTop: spacing.sm },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceContainerLowest,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  filterChipActive: {
    backgroundColor: colors.primaryContainer,
    borderColor: colors.primaryContainer,
  },
  filterText: {
    ...typography.bodySm,
    fontSize: 11,
    color: colors.outline,
    fontWeight: "600",
  },
  filterTextActive: { color: colors.warmBrown },
  emptyCard: {
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xl,
  },
  emptyText: { ...typography.bodySm, color: colors.outline },
  logHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  logIcon: {
    width: 42,
    height: 42,
    borderRadius: radii.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  warningIcon: { backgroundColor: `${colors.error}15` },
  successIcon: { backgroundColor: "#D4F4DD" },
  logTitle: { ...typography.h3, fontSize: 15, color: colors.warmBrown },
  logStatus: { ...typography.labelCaps, fontSize: 10, marginTop: 3 },
  warningText: { color: colors.error },
  successText: { color: "#1F8A3F" },
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
});

export default StatsScreen;
