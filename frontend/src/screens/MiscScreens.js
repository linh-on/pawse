// ─── FilterSettingsScreen ────────────────────────────────────────────────────

import React from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Header from '../components/Header';
import { colors, spacing, radii, shadows, typography } from '../theme';

const ToggleSwitch = ({ on }) => (
  <View style={[ts.track, on ? ts.on : ts.off]}>
    <View style={[ts.thumb, on ? ts.thumbOn : ts.thumbOff]} />
  </View>
);
const ts = StyleSheet.create({
  track:    { width: 48, height: 26, borderRadius: radii.full, padding: 3 },
  on:       { backgroundColor: colors.secondaryContainer },
  off:      { backgroundColor: colors.surfaceContainerHighest },
  thumb:    { width: 20, height: 20, borderRadius: radii.full, backgroundColor: '#fff', ...shadows.card },
  thumbOn:  { alignSelf: 'flex-end' },
  thumbOff: { alignSelf: 'flex-start' },
});

export const FilterSettingsScreen = () => {
  const insets = useSafeAreaInsets();
  const apps = [
    { name: 'Messenger', category: 'Social',  icon: 'chat',  iconBg: '#E8F1FF', iconColor: '#1877F2', on: true  },
    { name: 'Gmail',     category: 'Work',    icon: 'mail',  iconBg: '#F0F2F5', iconColor: '#444',    on: false },
  ];

  return (
    <View style={styles.screen}>
      <Header showProfile={false} />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: 120 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Banner */}
        <View style={[styles.banner, shadows.soft]}>
          <View style={styles.bannerIcon}>
            <MaterialIcons name="psychology-alt" size={42} color={colors.secondary} />
            <View style={styles.bannerBadge}>
              <MaterialIcons name="auto-awesome" size={12} color={colors.onPrimary} />
            </View>
          </View>
          <View style={styles.bannerText}>
            <Text style={styles.bannerTitle}>Your Smart Filter</Text>
            <Text style={styles.bannerSub}>
              I use AI to gently sort through your buzzes. If a message sounds like a "now" thing, I'll let it through.
            </Text>
          </View>
        </View>

        {/* App list */}
        <Text style={styles.sectionTitle}>App Notifications</Text>
        <View style={styles.appList}>
          {apps.map((app, i) => (
            <View key={i} style={[styles.appRow, shadows.card]}>
              <View style={[styles.appIcon, { backgroundColor: app.iconBg }]}>
                <MaterialIcons name={app.icon} size={22} color={app.iconColor} />
              </View>
              <View style={styles.appText}>
                <Text style={styles.appName}>{app.name}</Text>
                <Text style={styles.appCat}>{app.category}</Text>
              </View>
              <ToggleSwitch on={app.on} />
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

// ─── OverridesLogScreen ──────────────────────────────────────────────────────

export const OverridesLogScreen = () => {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.screen}>
      <Header />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: 120 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.logHeader}>
          <View style={styles.logLabelRow}>
            <MaterialIcons name="history" size={18} color={colors.secondary} />
            <Text style={[styles.sectionTitle, { color: colors.secondary, marginBottom: 0 }]}>
              Activity History
            </Text>
          </View>
          <Text style={styles.logTitle}>Override Log</Text>
        </View>

        <View style={[styles.overrideCard, shadows.card]}>
          <View style={styles.overrideTop}>
            <View style={styles.overrideLeft}>
              <View style={styles.errorIcon}>
                <MaterialIcons name="emergency-home" size={22} color={colors.error} />
              </View>
              <View>
                <Text style={styles.overrideTitle}>Emergency Unlock</Text>
                <Text style={styles.overrideStatus}>Override Triggered</Text>
              </View>
            </View>
            <Text style={styles.overrideTime}>10:45 AM</Text>
          </View>
          <View style={styles.overrideNote}>
            <Text style={styles.overrideNoteText}>
              "Urgent Slack message about project launch."
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

// ─── CalendarSyncScreen ──────────────────────────────────────────────────────

export const CalendarSyncScreen = () => {
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.screen}>
      <Header />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: 120 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Title row + box display toggle */}
        <View style={styles.calHeader}>
          <View>
            <Text style={[styles.sectionTitle, { color: colors.secondary }]}>CONNECTIONS</Text>
            <Text style={styles.logTitle}>Calendar Sync</Text>
          </View>
          <View style={[styles.boxCard, shadows.soft]}>
            <View>
              <Text style={styles.boxTitle}>Box Display</Text>
              <Text style={styles.boxSub}>Sync events to physical box</Text>
            </View>
            <View style={[ts.track, ts.on]}>
              <View style={[ts.thumb, ts.thumbOn]} />
            </View>
          </View>
        </View>

        {/* Calendar cards */}
        <View style={[styles.calCard, shadows.soft]}>
          <View style={styles.calCardTop}>
            <View style={[styles.calIcon, { backgroundColor: '#f1f3f4' }]}>
              <MaterialIcons name="event-available" size={30} color="#4285F4" />
            </View>
            <View style={styles.connectedPill}>
              <Text style={styles.connectedText}>CONNECTED</Text>
            </View>
          </View>
          <Text style={styles.calTitle}>Google Calendar</Text>
          <TouchableOpacity style={styles.manageBtn} activeOpacity={0.85}>
            <MaterialIcons name="settings" size={18} color={colors.onSurface} />
            <Text style={styles.manageBtnText}>Manage</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.calCard, shadows.soft]}>
          <View style={styles.calCardTop}>
            <View style={[styles.calIcon, { backgroundColor: '#1C1C1E' }]}>
              <MaterialIcons name="apple" size={30} color="#fff" />
            </View>
            <View style={[styles.connectedPill, { backgroundColor: colors.surfaceContainerHighest }]}>
              <Text style={[styles.connectedText, { color: colors.outline }]}>NOT LINKED</Text>
            </View>
          </View>
          <Text style={styles.calTitle}>Apple Calendar</Text>
          <TouchableOpacity style={[styles.manageBtn, { backgroundColor: colors.primaryContainer }]} activeOpacity={0.85}>
            <Text style={[styles.manageBtnText, { color: colors.onPrimaryContainer }]}>Connect Apple</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

// ─── Shared styles ───────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scroll: {
    paddingHorizontal: spacing.containerPadding,
    paddingTop: spacing.md,
    gap: spacing.gutter,
  },
  sectionTitle: {
    ...typography.labelCaps,
    color: colors.onSurfaceVariant,
    marginBottom: 4,
  },

  // FilterSettings
  banner: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radii['4xl'],
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: `${colors.orange}18`,
  },
  bannerIcon: {
    width: 80,
    height: 80,
    borderRadius: radii.full,
    backgroundColor: `${colors.secondaryContainer}30`,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  bannerBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 28,
    height: 28,
    borderRadius: radii.full,
    backgroundColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.surfaceContainerLowest,
  },
  bannerText: { flex: 1, gap: 6 },
  bannerTitle: { ...typography.h2, color: colors.primary },
  bannerSub:   { ...typography.bodySm, color: colors.onSurfaceVariant, lineHeight: 20 },
  appList:  { gap: spacing.sm },
  appRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radii.xl,
    padding: spacing.gutter,
    borderWidth: 1,
    borderColor: `${colors.orange}12`,
    gap: spacing.gutter,
  },
  appIcon: { width: 48, height: 48, borderRadius: radii.lg, alignItems: 'center', justifyContent: 'center' },
  appText: { flex: 1 },
  appName: { ...typography.bodyMd, fontWeight: '700', color: colors.onSurface },
  appCat:  { ...typography.bodySm, color: colors.outline },

  // Overrides
  logHeader: { gap: 4 },
  logLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  logTitle: { ...typography.h1, color: colors.onSurface },
  overrideCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radii['2xl'],
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: `${colors.errorContainer}60`,
  },
  overrideTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  overrideLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.gutter },
  errorIcon: {
    width: 48,
    height: 48,
    borderRadius: radii.xl,
    backgroundColor: colors.errorContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overrideTitle:  { ...typography.h3 },
  overrideStatus: { ...typography.bodySm, color: colors.error, fontWeight: '700' },
  overrideTime:   { ...typography.labelCaps, fontSize: 10, color: colors.onSurfaceVariant },
  overrideNote: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radii.lg,
    padding: spacing.gutter,
  },
  overrideNoteText: { ...typography.bodyMd, color: colors.onSurfaceVariant, fontStyle: 'italic' },

  // Calendar
  calHeader: { gap: spacing.gutter },
  boxCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radii['2xl'],
    padding: spacing.gutter,
    borderWidth: 1,
    borderColor: `${colors.orange}18`,
  },
  boxTitle: { ...typography.h3 },
  boxSub:   { ...typography.bodySm, color: colors.onSurfaceVariant },
  calCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radii['4xl'],
    padding: spacing.md,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: `${colors.orange}18`,
  },
  calCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  calIcon: {
    width: 56,
    height: 56,
    borderRadius: radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectedPill: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: radii.full,
  },
  connectedText: {
    ...typography.labelCaps,
    fontSize: 10,
    color: '#166534',
  },
  calTitle: { ...typography.h2, color: colors.onSurface },
  manageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.surfaceContainer,
    borderRadius: radii.full,
    paddingVertical: spacing.gutter,
  },
  manageBtnText: { ...typography.bodyMd, fontWeight: '700', color: colors.onSurface },
});
