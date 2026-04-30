import React from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Header from '../components/Header';
import { colors, spacing, radii, shadows, typography } from '../theme';

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const HEIGHTS = [40, 60, 95, 70, 55, 30, 25]; // % of bar area

const StatsScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.screen}>
      <Header />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: 120 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Tab switcher */}
        <View style={styles.tabBar}>
          <View style={styles.tabActive}>
            <Text style={styles.tabActiveText}>Stats</Text>
          </View>
          <TouchableOpacity
            style={styles.tab}
            onPress={() => navigation.navigate('Rewards')}
          >
            <Text style={styles.tabText}>Rewards</Text>
          </TouchableOpacity>
        </View>

        {/* Top row: Peak + Streak */}
        <View style={styles.topRow}>
          {/* Peak focus */}
          <View style={[styles.peakCard, shadows.card]}>
            <Text style={[styles.cardLabel, { color: colors.tertiaryContainer }]}>Peak Focus</Text>
            <Text style={[styles.peakTime, { color: colors.onSurface }]}>2 PM</Text>
            <View style={styles.trendRow}>
              <MaterialIcons name="trending-up" size={16} color={colors.primary} />
              <Text style={[styles.trendText, { color: colors.primary }]}>+12%</Text>
            </View>
          </View>

          {/* Streak */}
          <TouchableOpacity
            style={[styles.streakCard, shadows.card]}
            onPress={() => navigation.navigate('Overrides')}
            activeOpacity={0.85}
          >
            <Text style={[styles.cardLabel, { color: colors.secondary }]}>Streak</Text>
            <Text style={styles.streakNumber}>14</Text>
            <View style={styles.streakTrack}>
              <View style={[styles.streakFill, { width: '70%' }]} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Bar chart */}
        <View style={[styles.chartCard, shadows.soft]}>
          <Text style={styles.chartTitle}>Weekly Focus</Text>
          <View style={styles.barArea}>
            {HEIGHTS.map((h, i) => (
              <View key={i} style={styles.barCol}>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: `${h}%`,
                        backgroundColor: i === 2
                          ? colors.primaryContainer
                          : `${colors.primaryContainer}55`,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.dayLabel}>{DAYS[i]}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scroll: {
    paddingHorizontal: spacing.containerPadding,
    paddingTop: spacing.md,
    gap: spacing.gutter,
  },

  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainer,
    borderRadius: radii.xl,
    padding: 4,
  },
  tabActive: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radii.lg,
    alignItems: 'center',
    ...shadows.card,
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  tabActiveText: { ...typography.bodySm, color: colors.onSurface, fontWeight: '700' },
  tabText:       { ...typography.bodySm, color: colors.onSurfaceVariant },

  topRow: { flexDirection: 'row', gap: spacing.gutter },

  peakCard: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radii['4xl'],
    padding: spacing.md,
    gap: 6,
    borderWidth: 1,
    borderColor: `${colors.orange}18`,
  },
  streakCard: {
    flex: 1,
    backgroundColor: `${colors.secondaryContainer}30`,
    borderRadius: radii['4xl'],
    padding: spacing.md,
    gap: 6,
    borderWidth: 1,
    borderColor: `${colors.secondaryFixedDim}50`,
  },
  cardLabel: { ...typography.labelCaps, fontSize: 10 },
  peakTime: { ...typography.h2 },
  streakNumber: { ...typography.h1, color: colors.secondary },
  trendRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  trendText: { ...typography.bodySm },
  streakTrack: {
    height: 8,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radii.full,
    overflow: 'hidden',
    marginTop: 4,
  },
  streakFill: {
    height: '100%',
    backgroundColor: colors.secondary,
    borderRadius: radii.full,
  },

  chartCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radii['4xl'],
    padding: spacing.md,
    borderWidth: 1,
    borderColor: `${colors.orange}18`,
  },
  chartTitle: { ...typography.h3, color: colors.onSurface, marginBottom: spacing.md },
  barArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 160,
    paddingHorizontal: 4,
  },
  barCol: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
    height: '100%',
    justifyContent: 'flex-end',
  },
  barTrack: {
    flex: 1,
    width: '70%',
    justifyContent: 'flex-end',
  },
  bar: {
    width: '100%',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  dayLabel: { ...typography.labelCaps, fontSize: 10, color: colors.onSurfaceVariant },
});

export default StatsScreen;
