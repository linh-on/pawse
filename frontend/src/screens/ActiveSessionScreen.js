import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Animated,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import CircularProgress from '../components/CircularProgress';
import Header from '../components/Header';
import { colors, spacing, radii, shadows, typography } from '../theme';

const TOTAL_SECONDS = 45 * 60;

const fmt = (secs) => {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
};

const ActiveSessionScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [remaining, setRemaining] = useState(TOTAL_SECONDS);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Countdown
  useEffect(() => {
    const id = setInterval(() => {
      setRemaining((r) => (r > 0 ? r - 1 : 0));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Subtle glow pulse
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.04, duration: 2400, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.0,  duration: 2400, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const progress = remaining / TOTAL_SECONDS;

  return (
    <View style={styles.screen}>
      <Header badge="Focus Active" showProfile={false} />

      <View style={[styles.body, { paddingBottom: insets.bottom + spacing.xl }]}>

        {/* Title */}
        <View style={styles.titleBlock}>
          <Text style={styles.title}>Deep Focus Session</Text>
          <Text style={styles.subtitle}>Your phone is tucked away for a while.</Text>
        </View>

        {/* Ring + timer */}
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <CircularProgress
            size={288}
            strokeWidth={10}
            progress={progress}
            trackColor={colors.surfaceContainerHighest}
            fillColor={colors.primaryContainer}
          >
            <View style={[styles.timerFace, shadows.timer]}>
              <MaterialIcons
                name="lock"
                size={30}
                color={colors.primaryContainer}
                style={{ marginBottom: 6 }}
              />
              <Text style={styles.timerText}>{fmt(remaining)}</Text>
              <Text style={styles.timerSub}>remaining</Text>
            </View>
          </CircularProgress>
        </Animated.View>

        {/* Info chips */}
        <View style={styles.chipsRow}>
          <View style={styles.chip}>
            <View style={[styles.chipIcon, { backgroundColor: `${colors.orange}18` }]}>
              <MaterialIcons name="energy-savings-leaf" size={20} color={colors.primary} />
            </View>
            <Text style={styles.chipValue}>12 XP</Text>
            <Text style={styles.chipLabel}>Potential gain</Text>
          </View>

          <View style={styles.chip}>
            <View style={[styles.chipIcon, { backgroundColor: `${colors.secondaryFixed}55` }]}>
              <MaterialIcons name="auto-awesome" size={20} color={colors.secondary} />
            </View>
            <Text style={styles.chipValue}>Level 4</Text>
            <Text style={styles.chipLabel}>Streak progress</Text>
          </View>
        </View>

        {/* Emergency override */}
        <TouchableOpacity
          style={styles.overrideBtn}
          onPress={() => navigation.navigate('Home')}
          activeOpacity={0.75}
        >
          <View style={styles.overrideCircle}>
            <MaterialIcons name="emergency" size={24} color={colors.outline} />
          </View>
          <Text style={styles.overrideCaption}>In case of emergency</Text>
          <Text style={styles.overrideLink}>Urgent Override</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },

  body: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.containerPadding,
    paddingTop: spacing.xl,
  },

  titleBlock: { alignItems: 'center', gap: 6 },
  title:    { ...typography.h2, color: colors.onSurface },
  subtitle: { ...typography.bodySm, color: colors.onSurfaceVariant },

  timerFace: {
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: colors.surfaceContainerLowest,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: `${colors.orange}22`,
  },
  timerText: {
    ...typography.timerDisplay,
    color: colors.onPrimaryFixed,
  },
  timerSub: {
    ...typography.labelCaps,
    color: colors.outline,
    marginTop: 6,
  },

  chipsRow: {
    flexDirection: 'row',
    gap: spacing.gutter,
    width: '100%',
  },
  chip: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radii['2xl'],
    padding: spacing.gutter,
    gap: 6,
    borderWidth: 1,
    borderColor: `${colors.orange}22`,
  },
  chipIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipValue: { ...typography.h3, fontSize: 16, color: colors.onSurface },
  chipLabel: { ...typography.bodySm, fontSize: 12, color: colors.outline },

  overrideBtn: { alignItems: 'center', gap: 6 },
  overrideCircle: {
    width: 56,
    height: 56,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  overrideCaption: {
    ...typography.labelCaps,
    color: colors.outline,
    fontSize: 10,
  },
  overrideLink: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    fontWeight: '700',
    textDecorationLine: 'underline',
    textDecorationStyle: 'dotted',
  },
});

export default ActiveSessionScreen;
