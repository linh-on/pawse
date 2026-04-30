import React from 'react';
import {
  View, Text, TouchableOpacity, Image, StyleSheet, StatusBar, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, radii, typography } from '../theme';

const MASCOT_URI =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBR1HqsqztT0L1sW6_5DjqJiHO31Ds9hshGKZTWNkQMBcNeSPiKlsq-5tC04s6ifqv-NvX-fO0J0dSqiTTn28dLl5Y1OoBVf3IqxgNnZ1yMk3ZUeB4HbO_jmrptuz2IGIkGCXcNG-2rXvpbnGk15TBqshKz4_kPNjz9swAqkuUXY_TJZkWag_Yhq_lMFGechOTygo62GdoG6o-2SpFESjPNEmHjTEJawLaEkdTCALZJcbY28vQg-0Pfg2KkJLYf3F1TrI_UgPH4QwsK';
const PROFILE_URI =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDFf66XVpfWKaaPQ5VXeJ9CnLYJOuG5pYlP69zwiD95-7ggVWwsKNVDVg0MRYXrOeSAOzEAUSNJsyS1TqOOCUqs-2gF695A5eOB_AW1wzuJnPNqrBHL5GuXVZKxnk3iVrX7vCtHPR6N0Qj076KqIKaztPlX2NfbZK1cx6OTlcaRXS-R2lj-4XWqFLs5rBtVGLumb88WfswLAuaCc3iOPSfdMFNWBq0ffzO4fo9M7FYPJ5YlN70TUJHUP4X9KPHGqoW1-guyMzrgyM9B';

/**
 * Shared app header.
 * Props:
 *   title        – string (default "Pawse")
 *   showProfile  – bool   (default true)
 *   mascotSrc    – image URI override
 *   badge        – optional badge label shown next to lock icon (active-session variant)
 */
const Header = ({
  title = 'Pawse',
  showProfile = true,
  mascotSrc = MASCOT_URI,
  badge = null,
}) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrapper, { paddingTop: insets.top + 8 }]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.surfaceContainerLow} />

      {/* Left — logo */}
      <View style={styles.left}>
        <View style={styles.mascotRing}>
          <Image source={{ uri: mascotSrc }} style={styles.mascotImage} />
        </View>
        <Text style={styles.wordmark}>{title}</Text>
      </View>

      {/* Right — actions */}
      <View style={styles.right}>
        {badge ? (
          <View style={styles.badge}>
            <MaterialIcons name="lock" size={14} color={colors.tertiary} />
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        ) : (
          <TouchableOpacity style={styles.iconBtn} activeOpacity={0.7}>
            <MaterialIcons name="bluetooth-connected" size={22} color={colors.primaryContainer} />
          </TouchableOpacity>
        )}
        {showProfile && !badge && (
          <View style={styles.avatarRing}>
            <Image source={{ uri: PROFILE_URI }} style={styles.avatar} />
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.unit * 1.5,
    backgroundColor: colors.surfaceContainerLow,
    borderBottomWidth: 1,
    borderBottomColor: `${colors.orange}22`,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  mascotRing: {
    width: 34,
    height: 34,
    borderRadius: radii.full,
    backgroundColor: `${colors.primaryContainer}22`,
    overflow: 'hidden',
  },
  mascotImage: {
    width: '100%',
    height: '100%',
  },
  wordmark: {
    ...typography.h3,
    color: colors.orange,
    letterSpacing: -0.5,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconBtn: {
    padding: 8,
    borderRadius: radii.full,
  },
  avatarRing: {
    width: 34,
    height: 34,
    borderRadius: radii.full,
    borderWidth: 1.5,
    borderColor: colors.outlineVariant,
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: colors.surfaceContainer,
    borderRadius: radii.full,
  },
  badgeText: {
    ...typography.labelCaps,
    color: colors.onSurfaceVariant,
    fontSize: 10,
  },
});

export default Header;
