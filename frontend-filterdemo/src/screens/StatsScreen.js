import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
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
  tint,
} from "../theme";
import { responsive } from "../utils/responsive";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/AuthContext";

// ─── Constants ────────────────────────────────────────────────────────────────

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
const MIN_DATE = new Date("2026-01-01T00:00:00");

// ─── Titles — earned by level ─────────────────────────────────────────────────
const TITLES = [
  { minLevel: 1, title: "Restless Paw", icon: "pets", color: colors.outline },
  {
    minLevel: 3,
    title: "Curious Cat",
    icon: "visibility",
    color: colors.tertiary,
  },
  {
    minLevel: 5,
    title: "Focused Feline",
    icon: "center-focus-strong",
    color: colors.primary,
  },
  {
    minLevel: 8,
    title: "Deep Diver",
    icon: "self-improvement",
    color: colors.secondary,
  },
  { minLevel: 12, title: "Zen Paws", icon: "spa", color: colors.success },
  { minLevel: 18, title: "Laser Beam", icon: "bolt", color: colors.orange },
  {
    minLevel: 25,
    title: "Paw Master",
    icon: "military-tech",
    color: colors.primary,
  },
];

const getTitle = (level) => {
  let current = TITLES[0];
  for (const t of TITLES) {
    if (level >= t.minLevel) current = t;
  }
  return current;
};

const getNextTitle = (level) => TITLES.find((t) => t.minLevel > level) ?? null;

// ─── Badges — earned from real behavior ──────────────────────────────────────
// Each badge has: id, name, desc, icon, color, check(stats) → bool

const BADGE_DEFS = [
  {
    id: "first_session",
    name: "First Paw",
    desc: "Complete your first session",
    icon: "flag",
    color: colors.primary,
    check: (s) => s.completedSessions >= 1,
  },
  {
    id: "streak_3",
    name: "Hat Trick",
    desc: "3-day focus streak",
    icon: "local-fire-department",
    color: colors.orange,
    check: (s) => s.streak >= 3,
  },
  {
    id: "streak_7",
    name: "Week Warrior",
    desc: "7-day focus streak",
    icon: "whatshot",
    color: colors.error,
    check: (s) => s.streak >= 7,
  },
  {
    id: "streak_30",
    name: "Iron Paw",
    desc: "30-day focus streak",
    icon: "workspace-premium",
    color: colors.secondary,
    check: (s) => s.streak >= 30,
  },
  {
    id: "hours_5",
    name: "5h Club",
    desc: "5 total hours of focus",
    icon: "schedule",
    color: colors.primary,
    check: (s) => s.totalMinutes >= 300,
  },
  {
    id: "hours_24",
    name: "Day Spent",
    desc: "24 total hours of focus",
    icon: "timelapse",
    color: colors.secondary,
    check: (s) => s.totalMinutes >= 1440,
  },
  {
    id: "hours_100",
    name: "Century",
    desc: "100 total hours of focus",
    icon: "emoji-events",
    color: colors.orange,
    check: (s) => s.totalMinutes >= 6000,
  },
  {
    id: "sessions_10",
    name: "Habit Forming",
    desc: "10 completed sessions",
    icon: "repeat",
    color: colors.tertiary,
    check: (s) => s.completedSessions >= 10,
  },
  {
    id: "sessions_50",
    name: "Dedicated",
    desc: "50 completed sessions",
    icon: "star",
    color: colors.orange,
    check: (s) => s.completedSessions >= 50,
  },
  {
    id: "no_override",
    name: "Pure Focus",
    desc: "Complete 5 sessions with no overrides",
    icon: "shield",
    color: colors.success,
    check: (s) => s.cleanSessions >= 5,
  },
  {
    id: "shield_80",
    name: "Disciplined",
    desc: "80%+ focus shield rate (min 10 sessions)",
    icon: "security",
    color: colors.success,
    check: (s) => s.completedSessions >= 10 && s.shieldRate >= 80,
  },
  {
    id: "long_session",
    name: "Marathon",
    desc: "Complete a 90+ minute session",
    icon: "hourglass-full",
    color: colors.secondary,
    check: (s) => s.longestSession >= 90,
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getWeekStart = (offset) => {
  const today = new Date();
  const daysFromMonday = (today.getDay() + 6) % 7;
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

const buildWeekData = (sessions, weekOffset) => {
  const weekStart = getWeekStart(weekOffset);
  const weekEnd = getWeekEnd(weekStart);
  const totals = Array(7).fill(0);
  sessions
    .filter((s) => s.completed)
    .forEach((s) => {
      const date = new Date(s.started_at);
      if (date >= weekStart && date < weekEnd) {
        const idx = Math.floor((date - weekStart) / (1000 * 60 * 60 * 24));
        if (idx >= 0 && idx < 7) totals[idx] += s.duration_minutes || 0;
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
  const byHour = {};
  sessions
    .filter((s) => s.completed)
    .forEach((s) => {
      const h = new Date(s.started_at).getHours();
      byHour[h] = (byHour[h] || 0) + (s.duration_minutes || 0);
    });
  const peak = Object.entries(byHour).sort((a, b) => b[1] - a[1])[0];
  if (!peak) return "--";
  const d = new Date();
  d.setHours(Number(peak[0]), 0, 0, 0);
  return d.toLocaleTimeString([], { hour: "numeric" });
};

const buildMonthGrid = (sessions, year, month) => {
  const byDay = {};
  sessions
    .filter((s) => s.completed)
    .forEach((s) => {
      const d = new Date(s.started_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      byDay[key] = (byDay[key] || 0) + (s.duration_minutes || 0);
    });
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDow = new Date(year, month, 1).getDay();
  const leadingEmpties = (firstDow + 6) % 7;
  const cells = [];
  for (let i = 0; i < leadingEmpties; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const mins = byDay[key] || 0;
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

const cellColor = (intensity) =>
  [
    `${colors.primary}10`,
    `${colors.primaryContainer}80`,
    colors.primaryContainer,
    colors.primary,
  ][intensity];

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
        source: `Earned: +${(session.duration_minutes || 0) * XP_PER_MINUTE} XP`,
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
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const r = responsive(width);
  const { user } = useAuth();

  const [tab, setTab] = useState("stats");
  const [sessions, setSessions] = useState([]);
  const [logFilter, setLogFilter] = useState("all");
  const [weekOffset, setWeekOffset] = useState(0);

  const now = new Date();
  const [gridYear, setGridYear] = useState(now.getFullYear());
  const [gridMonth, setGridMonth] = useState(now.getMonth());

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

  // ── Week nav ──
  const canGoBack = getWeekStart(weekOffset - 1) >= MIN_DATE;
  const canGoForward = weekOffset < 0;

  // ── Month nav ──
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
  const completedSessions = sessions.filter((s) => s.completed);
  const totalMinutes = completedSessions.reduce(
    (s, x) => s + (x.duration_minutes || 0),
    0,
  );
  const streak = getCurrentStreak(sessions);
  const peakFocus = getPeakFocusHour(sessions);
  const longestSession = completedSessions.reduce(
    (max, s) => Math.max(max, s.duration_minutes || 0),
    0,
  );
  const cleanSessions = completedSessions.filter((s) => {
    const hasUrgent = s.notification_logs?.some(
      (l) => l.predicted_label === "urgent" && l.was_allowed,
    );
    return !hasUrgent;
  }).length;
  const allLogItems = buildLogItems(sessions);
  const overrideCount = allLogItems.filter(
    (i) => i.type === "override" || i.type === "unlock",
  ).length;
  const completedCount = allLogItems.filter(
    (i) => i.type === "completed",
  ).length;
  const shieldRate =
    allLogItems.length === 0
      ? 0
      : Math.round((completedCount / allLogItems.length) * 100);

  // ── XP / Level ──
  const totalXP = totalMinutes * XP_PER_MINUTE;
  const level = Math.floor(totalXP / XP_PER_LEVEL) + 1;
  const xpInLevel = totalXP % XP_PER_LEVEL;
  const xpProgress = xpInLevel / XP_PER_LEVEL;

  const currentTitle = getTitle(level);
  const nextTitle = getNextTitle(level);

  // ── Badges ──
  const statsObj = {
    totalMinutes,
    streak,
    completedSessions: completedSessions.length,
    cleanSessions,
    shieldRate,
    longestSession,
  };
  const badges = BADGE_DEFS.map((b) => ({ ...b, earned: b.check(statsObj) }));
  const earnedCount = badges.filter((b) => b.earned).length;

  // ── Chart data ──
  const { bars: weekBars, weekMinutes } = buildWeekData(sessions, weekOffset);
  const grid = buildMonthGrid(sessions, gridYear, gridMonth);

  const visibleLogItems = allLogItems.filter((item) => {
    if (logFilter === "all") return true;
    if (logFilter === "overrides")
      return item.type === "override" || item.type === "unlock";
    if (logFilter === "completed") return item.type === "completed";
    return true;
  });

  // ── Render: Stats tab ──
  const renderStats = () => (
    <>
      {/* Override Log shortcut */}
      <TouchableOpacity
        style={[patterns.row, shadows.card]}
        onPress={() => navigation.navigate("OverrideLog")}
        activeOpacity={0.85}
      >
        <View
          style={[
            patterns.circleIcon,
            { backgroundColor: `${colors.error}15` },
          ]}
        >
          <MaterialIcons name="history" size={18} color={colors.error} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.audioName}>Override Log</Text>
          <Text style={styles.audioSub}>
            Review emergency unlocks and allowed urgent notifications
          </Text>
        </View>
        <View style={styles.logCountPill}>
          <Text style={styles.logCountText}>{overrideCount}</Text>
        </View>
        <MaterialIcons name="chevron-right" size={22} color={colors.outline} />
      </TouchableOpacity>
      {/* Weekly Focus */}
      <View style={[patterns.card, shadows.card, { gap: spacing.sm }]}>
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

      {/* Month grid */}
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
    </>
  );

  // ── Render: Game tab ──
  const renderGame = () => (
    <>
      {/* ── Level & Title card ── */}
      <View style={[patterns.card, shadows.card, { gap: spacing.sm }]}>
        {/* Title row */}
        <View style={styles.titleRow}>
          <View
            style={[
              styles.titleIconWrap,
              { backgroundColor: tint(currentTitle.color, 0.15) },
            ]}
          >
            <MaterialIcons
              name={currentTitle.icon}
              size={28}
              color={currentTitle.color}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardMeta}>CURRENT TITLE</Text>
            <Text style={[styles.titleText, { color: currentTitle.color }]}>
              {currentTitle.title}
            </Text>
          </View>
          {/* Level badge */}
          <View style={styles.levelBubble}>
            <Text style={styles.levelBubbleLabel}>LVL</Text>
            <Text style={styles.levelBubbleNum}>{level}</Text>
          </View>
        </View>

        {/* XP bar */}
        <View style={{ gap: 6 }}>
          <View style={styles.xpBarTrack}>
            <View
              style={[
                styles.xpBarFill,
                { width: `${Math.round(xpProgress * 100)}%` },
              ]}
            />
          </View>
          <View
            style={{ flexDirection: "row", justifyContent: "space-between" }}
          >
            <Text style={styles.xpSubtext}>
              {xpInLevel} / {XP_PER_LEVEL} XP
            </Text>
            {nextTitle && (
              <Text style={styles.xpSubtext}>
                Next:{" "}
                <Text style={{ color: nextTitle.color, fontWeight: "700" }}>
                  {nextTitle.title}
                </Text>{" "}
                @ Lvl {nextTitle.minLevel}
              </Text>
            )}
          </View>
        </View>

        {/* Stats strip */}
        <View style={styles.statsStrip}>
          {[
            {
              label: "SESSIONS",
              value: completedSessions.length,
              icon: "check-circle-outline",
            },
            {
              label: "TOTAL TIME",
              value: formatHours(totalMinutes),
              icon: "schedule",
            },
          ].map((s, i) => (
            <View key={i} style={styles.statsStripItem}>
              <MaterialIcons name={s.icon} size={14} color={colors.outline} />
              <Text style={styles.statsStripValue}>{s.value}</Text>
              <Text style={styles.statsStripLabel}>{s.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── Badges — Coming Soon ── */}
      <View style={[patterns.card, shadows.card, { gap: spacing.sm }]}>
        <View style={patterns.rowBetween}>
          <Text style={styles.cardTitle}>Badges</Text>
          <View style={styles.comingSoonPill}>
            <Text style={styles.comingSoonText}>Coming Soon</Text>
          </View>
        </View>
        <View style={styles.comingSoonBlock}>
          <MaterialIcons
            name="military-tech"
            size={36}
            color={colors.outlineVariant}
          />
          <Text style={styles.comingSoonTitle}>Badges are on the way</Text>
          <Text style={styles.comingSoonDesc}>
            Earn badges for streaks, focus hours, and clean sessions. Keep
            building your habit — they'll be ready soon.
          </Text>
        </View>
      </View>

      {/* ── Leaderboard — Coming Soon ── */}
      <View style={[patterns.card, shadows.card, { gap: spacing.sm }]}>
        <View style={patterns.rowBetween}>
          <Text style={styles.cardTitle}>Leaderboard</Text>
          <View style={styles.comingSoonPill}>
            <Text style={styles.comingSoonText}>Coming Soon</Text>
          </View>
        </View>
        <View style={styles.comingSoonBlock}>
          <MaterialIcons
            name="leaderboard"
            size={36}
            color={colors.outlineVariant}
          />
          <Text style={styles.comingSoonTitle}>Compete with friends</Text>
          <Text style={styles.comingSoonDesc}>
            See how your focus time stacks up against your class or friends.
            Invite others to join Pawse.
          </Text>
        </View>
      </View>

      {/* ── Challenges — Coming Soon ── */}
      <View style={[patterns.card, shadows.card, { gap: spacing.sm }]}>
        <View style={patterns.rowBetween}>
          <Text style={styles.cardTitle}>Weekly Challenges</Text>
          <View style={styles.comingSoonPill}>
            <Text style={styles.comingSoonText}>Coming Soon</Text>
          </View>
        </View>
        <View style={styles.comingSoonBlock}>
          <MaterialIcons
            name="emoji-events"
            size={36}
            color={colors.outlineVariant}
          />
          <Text style={styles.comingSoonTitle}>Beat the week</Text>
          <Text style={styles.comingSoonDesc}>
            New challenges every Monday — focus for 5 hours, hit a 7-day streak,
            or complete 10 sessions without overrides.
          </Text>
        </View>
      </View>
    </>
  );

  // ── Render: Log tab ──
  const renderLog = () => (
    <>
      <View style={{ gap: 4 }}>
        <Text style={styles.eyebrow}>ACTIVITY HISTORY</Text>
        <Text style={styles.logTitle}>Session Log</Text>
        <Text style={styles.logSubtitle}>
          A look back at your focus sessions and overrides.
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
                    color={
                      item.type === "completed" ? colors.success : colors.error
                    }
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.logItemTitle}>{item.title}</Text>
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
          <Text style={styles.summaryValue}>{shieldRate}%</Text>
          <Text style={styles.summaryLabel}>Focus Shield Rate</Text>
        </View>
        <View style={[styles.summaryCard, shadows.card]}>
          <MaterialIcons
            name="settings-backup-restore"
            size={22}
            color={colors.error}
          />
          <Text style={styles.summaryValue}>{overrideCount}</Text>
          <Text style={styles.summaryLabel}>Total Overrides</Text>
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
          {
            paddingBottom: 120 + insets.bottom,
            paddingHorizontal: r.screenPadding,
            maxWidth: r.contentMaxWidth,
            width: "100%",
            alignSelf: "center",
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.tabs, shadows.card]}>
          {[
            { id: "stats", label: "Stats" },
            { id: "game", label: "Game" },
          ].map((t) => (
            <TouchableOpacity
              key={t.id}
              style={[styles.tab, tab === t.id && styles.tabActive]}
              onPress={() => setTab(t.id)}
            >
              <Text
                style={[styles.tabText, tab === t.id && styles.tabTextActive]}
              >
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {tab === "stats" ? renderStats() : renderGame()}
      </ScrollView>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

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

  // ── Level / Title ──
  titleRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  titleIconWrap: {
    width: 56,
    height: 56,
    borderRadius: radii["2xl"],
    alignItems: "center",
    justifyContent: "center",
  },
  titleText: { ...typography.h2, fontSize: 20 },
  levelBubble: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    borderRadius: radii["2xl"],
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 52,
  },
  levelBubbleLabel: {
    ...typography.labelCaps,
    color: "#fff",
    fontSize: 8,
    opacity: 0.8,
  },
  levelBubbleNum: {
    color: "#fff",
    fontWeight: "900",
    fontSize: 22,
    lineHeight: 26,
  },

  xpBarTrack: {
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
  xpSubtext: { ...typography.bodySm, fontSize: 11, color: colors.outline },

  statsStrip: {
    flexDirection: "row",
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radii.lg,
    padding: spacing.sm,
    gap: 0,
  },
  statsStripItem: { flex: 1, alignItems: "center", gap: 3 },
  statsStripValue: { ...typography.h3, fontSize: 16, color: colors.warmBrown },
  statsStripLabel: {
    ...typography.labelCaps,
    fontSize: 8,
    color: colors.outline,
  },

  // ── Badges ──
  badgeGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  badgeCell: {
    width: "30%",
    alignItems: "center",
    gap: 5,
    padding: spacing.unit,
  },
  badgeLocked: { opacity: 0.45 },
  badgeIconWrap: {
    width: 44,
    height: 44,
    borderRadius: radii.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeName: {
    ...typography.labelCaps,
    fontSize: 9,
    color: colors.warmBrown,
    textAlign: "center",
  },
  badgeDesc: {
    ...typography.bodySm,
    fontSize: 9,
    color: colors.outline,
    textAlign: "center",
    lineHeight: 13,
  },

  // ── Log ──
  eyebrow: { ...typography.labelCaps, fontSize: 10, color: colors.primary },
  logTitle: { ...typography.h1, fontSize: 26, color: colors.warmBrown },
  logSubtitle: {
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
  successIcon: { backgroundColor: `${colors.success}15` },
  logItemTitle: { ...typography.h3, fontSize: 15, color: colors.warmBrown },
  logStatus: { ...typography.labelCaps, fontSize: 10, marginTop: 3 },
  warningText: { color: colors.error },
  successText: { color: colors.success },
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

  audioName: {
    ...typography.bodyMd,
    fontSize: 14,
    color: colors.onSurface,
    fontWeight: "600",
  },
  audioSub: {
    ...typography.bodySm,
    fontSize: 12,
    color: colors.outline,
    marginTop: 2,
  },
  logCountPill: {
    minWidth: 28,
    height: 28,
    borderRadius: radii.full,
    backgroundColor: `${colors.error}12`,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  logCountText: {
    ...typography.labelCaps,
    fontSize: 11,
    color: colors.error,
    fontWeight: "800",
  },
});

export default StatsScreen;
