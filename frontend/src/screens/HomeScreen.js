import React, { useState } from 'react';
import {
  View, Text, Image, TouchableOpacity, ScrollView, StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Header from '../components/Header';
import { colors, spacing, radii, shadows, typography } from '../theme';

const MASCOT_HOME =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuAFb7jjkY7NC_rkg3sSsGcNFn_sR9nbvDa0TNzK5TxPChSaCiPu-whKcwwYnarqWvGT2ugbEnmENbhqq7nC0PbNLUy7JnOBtcL8tgo4wH1AuTgI4C6Qtx280aMVHmlbwYDTCBJ7Z_OpC6kuI0fwt3Wm7tQMSdQckNWj9LkEoUBNMGoa-za19rKhTEwV-5A2gSPy1SuuHczBGQ-5uuSJImUrzvjDSm9wwCtb4UCC3dH9udT_9RJAH_pcH7CB3QmKWW3kArkr_DHxO3Ci';

// Simple arc knob dial — pure RN (no SVG dependency on this screen)
const FocusDial = ({ minutes = 45 }) => {
  const progress = minutes / 60; // fraction of 60-min arc

  return (
    <View style={dialStyles.wrapper}>
      {/* Outer ring */}
      <View style={dialStyles.ring}>
        {/* Inner face */}
        <View style={dialStyles.face}>
          <Text style={dialStyles.number}>{minutes}</Text>
          <Text style={dialStyles.unit}>MINS</Text>
        </View>
        {/* Thumb dot at top */}
        <View style={dialStyles.thumb} />
      </View>
    </View>
  );
};

const dialStyles = StyleSheet.create({
  wrapper: { alignItems: 'center', paddingVertical: spacing.md },
  ring: {
    width: 160,
    height: 160,
    borderRadius: radii.full,
    borderWidth: 10,
    borderColor: colors.surfaceContainer,
    borderTopColor: colors.primaryContainer,
    borderRightColor: colors.primaryContainer,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-135deg' }],
  },
  face: {
    transform: [{ rotate: '135deg' }],
    alignItems: 'center',
  },
  number: {
    ...typography.h1,
    color: colors.warmBrown,
    lineHeight: 36,
  },
  unit: {
    ...typography.labelCaps,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  thumb: {
    position: 'absolute',
    top: -8,
    left: '50%',
    marginLeft: -8,
    width: 16,
    height: 16,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
    borderWidth: 3,
    borderColor: '#fff',
    ...shadows.card,
  },
});

const HomeScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.screen}>
      <Header mascotSrc={MASCOT_HOME} />

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: 120 + insets.bottom }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero mascot */}
        <View style={styles.hero}>
          <View style={styles.glowCircle} />
          <Image source={{ uri: MASCOT_HOME }} style={styles.mascot} resizeMode="contain" />
          <Text style={styles.greeting}>Hi, Buddy!</Text>
          <Text style={styles.subtitle}>Ready for some focus time?</Text>
        </View>

        {/* Stat chips */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, shadows.card]}>
            <MaterialIcons name="schedule" size={22} color={colors.primaryContainer} />
            <Text style={styles.statLabel}>TODAY</Text>
            <Text style={styles.statValue}>2h 15m</Text>
          </View>
          <View style={[styles.statCard, shadows.card]}>
            <MaterialIcons name="local-fire-department" size={22} color={colors.secondary} />
            <Text style={styles.statLabel}>STREAK</Text>
            <Text style={styles.statValue}>5 days</Text>
          </View>
        </View>

        {/* Session card */}
        <View style={[styles.sessionCard, shadows.soft]}>
          <View style={styles.sessionHeader}>
            <Text style={styles.sessionTitle}>Focus Duration</Text>
            <View style={styles.minutesBadge}>
              <Text style={styles.minutesBadgeText}>45 Mins</Text>
            </View>
          </View>

          <FocusDial minutes={45} />

          <TouchableOpacity
            style={[styles.startBtn, shadows.soft]}
            onPress={() => navigation.navigate('ActiveSession')}
            activeOpacity={0.85}
          >
            <MaterialIcons name="play-arrow" size={26} color={colors.onPrimaryContainer} />
            <Text style={styles.startBtnText}>Start Session</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surfaceContainerLow },

  scroll: {
    paddingHorizontal: spacing.containerPadding,
    paddingTop: spacing.md,
    gap: spacing.gutter,
  },

  // Hero
  hero: { alignItems: 'center', paddingTop: spacing.unit, paddingBottom: spacing.md },
  glowCircle: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: `${colors.orange}18`,
    top: 0,
  },
  mascot: { width: 180, height: 180, zIndex: 1 },
  greeting: {
    ...typography.h1,
    color: colors.warmBrown,
    marginTop: spacing.sm,
  },
  subtitle: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    fontStyle: 'italic',
    marginTop: 4,
  },

  // Stats row
  statsRow: { flexDirection: 'row', gap: spacing.gutter },
  statCard: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radii['4xl'],
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: `${colors.orange}18`,
    gap: 6,
  },
  statLabel: {
    ...typography.labelCaps,
    color: colors.onSurfaceVariant,
    fontSize: 10,
    marginTop: 4,
  },
  statValue: { ...typography.h2, color: colors.warmBrown },

  // Session card
  sessionCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radii['4xl'],
    padding: spacing.md,
    borderWidth: 1,
    borderColor: `${colors.orange}18`,
    gap: spacing.lg,
  },
  sessionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sessionTitle: { ...typography.h3, color: colors.warmBrown },
  minutesBadge: {
    backgroundColor: `${colors.primary}15`,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: radii.full,
  },
  minutesBadgeText: {
    ...typography.bodySm,
    color: colors.primary,
    fontWeight: '700',
  },

  // Start button
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primaryContainer,
    borderRadius: radii['3xl'],
    paddingVertical: spacing.md,
  },
  startBtnText: {
    ...typography.h2,
    color: colors.onPrimaryContainer,
  },
});

export default HomeScreen;
