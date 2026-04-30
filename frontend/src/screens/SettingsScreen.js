import React from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Header from '../components/Header';
import { colors, spacing, radii, shadows, typography } from '../theme';

const ToggleSwitch = ({ on }) => (
  <View style={[toggleStyles.track, on ? toggleStyles.trackOn : toggleStyles.trackOff]}>
    <View style={[toggleStyles.thumb, on ? toggleStyles.thumbOn : toggleStyles.thumbOff]} />
  </View>
);
const toggleStyles = StyleSheet.create({
  track: {
    width: 48,
    height: 26,
    borderRadius: radii.full,
    padding: 3,
  },
  trackOn:  { backgroundColor: colors.primaryContainer },
  trackOff: { backgroundColor: colors.surfaceContainerHighest },
  thumb: {
    width: 20,
    height: 20,
    borderRadius: radii.full,
    backgroundColor: '#fff',
    ...shadows.card,
  },
  thumbOn:  { marginLeft: 'auto' },
  thumbOff: { marginLeft: 0 },
});

const SettingRow = ({ icon, iconBg, iconColor, title, subtitle, onPress, rightEl }) => (
  <TouchableOpacity
    style={rowStyles.row}
    onPress={onPress}
    activeOpacity={onPress ? 0.7 : 1}
  >
    <View style={[rowStyles.iconWrap, { backgroundColor: iconBg }]}>
      <MaterialIcons name={icon} size={22} color={iconColor} />
    </View>
    <View style={rowStyles.text}>
      <Text style={rowStyles.title}>{title}</Text>
      <Text style={rowStyles.sub}>{subtitle}</Text>
    </View>
    {rightEl ?? (
      <MaterialIcons name="chevron-right" size={24} color={colors.onSurfaceVariant} />
    )}
  </TouchableOpacity>
);
const rowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radii['3xl'],
    padding: spacing.md,
    borderWidth: 1,
    borderColor: `${colors.orange}18`,
    gap: spacing.gutter,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1 },
  title: { ...typography.h3 },
  sub: { ...typography.bodySm, color: colors.outline, marginTop: 2 },
});

const ThemeChip = ({ label, dark, active }) => (
  <View style={chipStyles.wrap}>
    <View style={[
      chipStyles.preview,
      dark ? chipStyles.previewDark : chipStyles.previewLight,
      active && chipStyles.previewActive,
    ]}>
      <View style={[chipStyles.previewBar, dark ? chipStyles.barDark : chipStyles.barLight]} />
    </View>
    <Text style={[chipStyles.label, active && { color: colors.primary, fontWeight: '700' }]}>
      {label}
    </Text>
  </View>
);
const chipStyles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 6 },
  preview: {
    width: 72,
    height: 88,
    borderRadius: radii.xl,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
    padding: 8,
  },
  previewLight: { backgroundColor: colors.surfaceContainerLow },
  previewDark:  { backgroundColor: '#1C1C1E' },
  previewActive: { borderColor: colors.primary, ...shadows.card },
  previewBar: { height: 22, borderRadius: radii.sm },
  barLight: { backgroundColor: `${colors.surfaceContainerLowest}CC` },
  barDark:  { backgroundColor: '#2C2C2E' },
  label: { ...typography.bodySm, color: colors.onSurface },
});

const SettingsScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.screen}>
      <Header />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: 120 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Subscription card */}
        <View style={[styles.subCard, shadows.soft]}>
          <View style={styles.subRow}>
            <View style={styles.subText}>
              <View style={styles.planPill}>
                <Text style={styles.planPillText}>ACTIVE PLAN</Text>
              </View>
              <Text style={[styles.planTitle, { marginTop: 6 }]}>Focus+ Member</Text>
              <Text style={styles.planSub}>Unlimited paws and premium sounds.</Text>
            </View>
            <View style={styles.starBadge}>
              <MaterialIcons name="star" size={22} color={colors.primary} />
            </View>
          </View>
          <TouchableOpacity style={styles.manageBtn} activeOpacity={0.85}>
            <Text style={styles.manageBtnText}>Manage Subscription</Text>
          </TouchableOpacity>
        </View>

        {/* Setting rows */}
        <SettingRow
          icon="psychology-alt"
          iconBg={`${colors.secondaryContainer}30`}
          iconColor={colors.secondary}
          title="Smart Filter"
          subtitle="Manage AI notification sorting"
          onPress={() => navigation.navigate('FilterSettings')}
        />

        <SettingRow
          icon="calendar-month"
          iconBg={`${colors.primaryContainer}18`}
          iconColor={colors.primary}
          title="Calendar Sync"
          subtitle="Connect digital schedules"
          onPress={() => navigation.navigate('CalendarSync')}
        />

        {/* Theme selector */}
        <View style={[styles.themeCard, shadows.card]}>
          <Text style={styles.themeTitle}>Display Theme</Text>
          <View style={styles.themeRow}>
            <ThemeChip label="Classic" active />
            <ThemeChip label="Dark Fur" dark />
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surface },
  scroll: {
    paddingHorizontal: spacing.containerPadding,
    paddingTop: spacing.md,
    gap: spacing.gutter,
  },

  subCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radii['4xl'],
    padding: spacing.md,
    borderWidth: 1,
    borderColor: `${colors.orange}18`,
    gap: spacing.gutter,
  },
  subRow: { flexDirection: 'row', justifyContent: 'space-between' },
  subText: { gap: 4 },
  planPill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.tertiaryFixed,
    borderRadius: radii.full,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  planPillText: {
    ...typography.labelCaps,
    color: colors.onTertiaryFixedVariant,
    fontSize: 10,
  },
  planTitle: { ...typography.h2, color: colors.onSurface },
  planSub:   { ...typography.bodySm, color: colors.outline, marginTop: 2 },
  starBadge: {
    width: 48,
    height: 48,
    backgroundColor: `${colors.primaryContainer}20`,
    borderRadius: radii.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  manageBtn: {
    backgroundColor: colors.primaryContainer,
    borderRadius: radii.xl,
    paddingVertical: spacing.gutter,
    alignItems: 'center',
  },
  manageBtnText: { ...typography.bodyMd, color: colors.onPrimaryContainer, fontWeight: '700' },

  themeCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radii['3xl'],
    padding: spacing.md,
    borderWidth: 1,
    borderColor: `${colors.orange}18`,
    gap: spacing.gutter,
  },
  themeTitle: { ...typography.h3 },
  themeRow: { flexDirection: 'row', gap: spacing.gutter },
});

export default SettingsScreen;
