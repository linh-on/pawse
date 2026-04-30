import React from 'react';
import {
  View, Text, Image, ScrollView, TouchableOpacity, StyleSheet,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Header from '../components/Header';
import { colors, spacing, radii, shadows, typography } from '../theme';

const MASCOT_REWARDS =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDFnej600EdvuANV9glKB3XJX9FT_RWwu5WmoMjWcSRpvrAJvutqxUPXDSt5ZWgQUuQ_jQrk-5TZTTOclDdnoJamY5XVA1LBeUWEhytvIpxprio_kpYfd9p1iowL8r150EKlvrXQQ6kccxHA-M4AI1Ymmm2ldVg11ALFc7RKb4WHECMkR3ORl8jJ-iKtkFAFeUhrZBtLSWBcy5h8ojIEHs9nU-Tawb3Lcb-Tv0kT0pfxxC2ytOxRsD182sxgYgzeUEhb_Lwu6dLYRzq';

const ITEMS = [
  { icon: 'energy-savings-leaf', label: 'Sprout',  color: colors.tertiary,   locked: false },
  { icon: 'headphones',          label: 'Beanie',  color: colors.secondary,  locked: false },
  { icon: 'lock',                label: 'Lv 15',   color: colors.outline,    locked: true  },
  { icon: 'local-cafe',          label: 'Cocoa',   color: colors.primary,    locked: false },
  { icon: 'checkroom',           label: 'Scarf',   color: colors.primary,    locked: false, active: true },
  { icon: 'lock',                label: 'Lv 20',   color: colors.outline,    locked: true  },
];

const RewardsScreen = () => {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.screen}>
      <Header />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: 120 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Character card */}
        <View style={[styles.characterCard, shadows.soft]}>
          <View style={styles.mascotWrapper}>
            <Image source={{ uri: MASCOT_REWARDS }} style={styles.mascotImg} />
            <View style={styles.levelBadge}>
              <Text style={styles.levelBadgeText}>12</Text>
            </View>
          </View>
          <View style={styles.characterInfo}>
            <Text style={styles.characterName}>Mochi the Calico</Text>
            <View style={styles.xpTrack}>
              <View style={[styles.xpFill, { width: '78%' }]} />
            </View>
            <Text style={styles.xpLabel}>780 / 1000 XP</Text>
          </View>
        </View>

        {/* Accessory grid */}
        <View style={styles.grid}>
          {ITEMS.map((item, i) => (
            <TouchableOpacity
              key={i}
              style={[
                styles.gridItem,
                item.locked ? styles.gridItemLocked : shadows.card,
                item.active && styles.gridItemActive,
              ]}
              activeOpacity={item.locked ? 1 : 0.8}
            >
              <View
                style={[
                  styles.gridIcon,
                  !item.locked && { backgroundColor: `${colors.primaryContainer}30` },
                ]}
              >
                <MaterialIcons
                  name={item.icon}
                  size={24}
                  color={item.locked ? colors.outline : item.color}
                />
              </View>
              <Text style={[styles.gridLabel, item.locked && { color: colors.outline }]}>
                {item.label}
              </Text>
              {item.active && (
                <View style={styles.activeDot} />
              )}
            </TouchableOpacity>
          ))}
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

  characterCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: 40,
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderWidth: 1,
    borderColor: `${colors.orange}18`,
  },
  mascotWrapper: { position: 'relative' },
  mascotImg: {
    width: 96,
    height: 96,
    borderRadius: radii['3xl'],
  },
  levelBadge: {
    position: 'absolute',
    bottom: -6,
    right: -6,
    width: 32,
    height: 32,
    borderRadius: radii.full,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.surfaceContainerLowest,
    ...shadows.card,
  },
  levelBadgeText: { color: '#fff', fontWeight: '700', fontSize: 12 },

  characterInfo: { flex: 1, gap: 10 },
  characterName: { ...typography.h2, color: colors.onSurface },
  xpTrack: {
    height: 14,
    backgroundColor: colors.surfaceContainer,
    borderRadius: radii.full,
    overflow: 'hidden',
  },
  xpFill: {
    height: '100%',
    backgroundColor: colors.primaryContainer,
    borderRadius: radii.full,
  },
  xpLabel: {
    ...typography.labelCaps,
    color: colors.primary,
    fontSize: 10,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.gutter,
  },
  gridItem: {
    width: '30%',
    aspectRatio: 1,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radii['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: `${colors.orange}18`,
    position: 'relative',
  },
  gridItemLocked: {
    backgroundColor: colors.surfaceContainerLow,
    borderStyle: 'dashed',
    opacity: 0.5,
  },
  gridItemActive: {
    borderColor: colors.primaryContainer,
    borderWidth: 2,
  },
  gridIcon: {
    width: 48,
    height: 48,
    borderRadius: radii.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridLabel: {
    ...typography.labelCaps,
    fontSize: 10,
    color: colors.onSurface,
  },
  activeDot: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: radii.full,
    backgroundColor: colors.primaryContainer,
  },
});

export default RewardsScreen;
