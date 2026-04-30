import React, { useState } from 'react';
import {
  View, Text, Image, TouchableOpacity, ScrollView, StyleSheet, TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, radii, shadows, typography } from '../theme';

const PROFILE_AVATAR =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDFf66XVpfWKaaPQ5VXeJ9CnLYJOuG5pYlP69zwiD95-7ggVWwsKNVDVg0MRYXrOeSAOzEAUSNJsyS1TqOOCUqs-2gF695A5eOB_AW1wzuJnPNqrBHL5GuXVZKxnk3iVrX7vCtHPR6N0Qj076KqIKaztPlX2NfbZK1cx6OTlcaRXS-R2lj-4XWqFLs5rBtVGLumb88WfswLAuaCc3iOPSfdMFNWBq0ffzO4fo9M7FYPJ5YlN70TUJHUP4X9KPHGqoW1-guyMzrgyM9B';

const ProfileScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState('Buddy Pawson');
  const [birthday, setBirthday] = useState('March 14, 2008');
  const [email] = useState('buddy@pawse.app');

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={22} color={colors.warmBrown} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + spacing.xl }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={[styles.avatarRing, shadows.card]}>
            <Image source={{ uri: PROFILE_AVATAR }} style={styles.avatar} />
            <TouchableOpacity style={styles.editAvatar}>
              <MaterialIcons name="edit" size={14} color="#fff" />
            </TouchableOpacity>
          </View>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.email}>{email}</Text>
        </View>

        {/* Stat row */}
        <View style={styles.statsRow}>
          <View style={[styles.statCard, shadows.card]}>
            <Text style={styles.statValue}>14</Text>
            <Text style={styles.statLabel}>DAY STREAK</Text>
          </View>
          <View style={[styles.statCard, shadows.card]}>
            <Text style={styles.statValue}>12</Text>
            <Text style={styles.statLabel}>LEVEL</Text>
          </View>
          <View style={[styles.statCard, shadows.card]}>
            <Text style={styles.statValue}>42h</Text>
            <Text style={styles.statLabel}>FOCUSED</Text>
          </View>
        </View>

        {/* Personal info */}
        <View style={[styles.card, shadows.card]}>
          <Text style={styles.cardTitle}>Personal Info</Text>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Name</Text>
            <TextInput
              style={styles.fieldInput}
              value={name} onChangeText={setName}
            />
          </View>

          <View style={styles.fieldDivider} />

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Birthday</Text>
            <TextInput
              style={styles.fieldInput}
              value={birthday} onChangeText={setBirthday}
            />
          </View>

          <View style={styles.fieldDivider} />

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Email</Text>
            <Text style={[styles.fieldInput, { color: colors.outline }]}>{email}</Text>
          </View>
        </View>

        {/* Save button */}
        <TouchableOpacity style={[styles.saveBtn, shadows.soft]} onPress={() => navigation.goBack()}>
          <Text style={styles.saveBtnText}>Save Changes</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surfaceContainerLow },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingBottom: spacing.unit * 1.5,
    backgroundColor: colors.surfaceContainerLow,
    borderBottomWidth: 1, borderBottomColor: `${colors.orange}22`,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: radii.full,
    backgroundColor: colors.surfaceContainerLowest,
    alignItems: 'center', justifyContent: 'center', ...shadows.card,
  },
  headerTitle: { ...typography.h3, color: colors.warmBrown },

  scroll: { paddingHorizontal: spacing.containerPadding, paddingTop: spacing.md, gap: spacing.gutter },

  avatarSection: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.md },
  avatarRing: {
    width: 110, height: 110, borderRadius: radii.full,
    backgroundColor: colors.surfaceContainerLowest, padding: 4,
    position: 'relative',
  },
  avatar: { width: '100%', height: '100%', borderRadius: radii.full },
  editAvatar: {
    position: 'absolute', bottom: 4, right: 4,
    width: 28, height: 28, borderRadius: radii.full,
    backgroundColor: colors.primary,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff',
  },
  name: { ...typography.h1, fontSize: 24, color: colors.warmBrown, marginTop: 4 },
  email: { ...typography.bodyMd, color: colors.outline },

  statsRow: { flexDirection: 'row', gap: spacing.sm },
  statCard: {
    flex: 1, backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radii['2xl'], padding: spacing.sm,
    alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: `${colors.orange}18`,
  },
  statValue: { ...typography.h2, fontSize: 20, color: colors.warmBrown },
  statLabel: { ...typography.labelCaps, fontSize: 9, color: colors.outline },

  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radii['3xl'], padding: spacing.md,
    borderWidth: 1, borderColor: `${colors.orange}18`,
    gap: spacing.sm,
  },
  cardTitle: { ...typography.h3, fontSize: 16, color: colors.warmBrown, marginBottom: 4 },

  field: { gap: 4, paddingVertical: 8 },
  fieldLabel: { ...typography.labelCaps, fontSize: 10, color: colors.outline },
  fieldInput: { ...typography.bodyMd, color: colors.onSurface, padding: 0 },
  fieldDivider: { height: 1, backgroundColor: colors.outlineVariant },

  saveBtn: {
    backgroundColor: colors.primaryContainer, borderRadius: radii['3xl'],
    paddingVertical: spacing.md, alignItems: 'center',
  },
  saveBtnText: { ...typography.h3, fontSize: 16, color: colors.onPrimaryContainer },
});

export default ProfileScreen;
