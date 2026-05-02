import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TextInput,
  Alert,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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

const XP_PER_MINUTE = 2;
const XP_PER_LEVEL = 1000;

const formatBirthday = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString + "T00:00:00");
  return date.toLocaleDateString([], {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const toDatabaseDate = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toISOString().slice(0, 10);
};

const getCurrentStreak = (sessions) => {
  const completedDays = new Set(
    sessions
      .filter((s) => s.completed)
      .map((s) => new Date(s.started_at).toDateString()),
  );
  let streak = 0;
  const cursor = new Date();
  if (!completedDays.has(cursor.toDateString())) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (completedDays.has(cursor.toDateString())) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
};

const formatFocused = (minutes) => {
  const hrs = Math.round(minutes / 60);
  return `${hrs}h`;
};

const ProfileScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { user, setUser } = useAuth();

  const [name, setName] = useState(user?.name || "");
  const [birthday, setBirthday] = useState(formatBirthday(user?.birthday));
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || "");
  const email = user?.email || "";

  // Computed stats from sessions
  const [streak, setStreak] = useState(0);
  const [level, setLevel] = useState(1);
  const [totalMinutes, setTotalMinutes] = useState(0);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    setName(user?.name || "");
    setBirthday(formatBirthday(user?.birthday));
    setAvatarUrl(user?.avatar_url || "");
  }, [user]);

  useEffect(() => {
    const fetchStats = async () => {
      if (!user?.id) {
        setLoadingStats(false);
        return;
      }
      setLoadingStats(true);

      const { data, error } = await supabase
        .from("sessions")
        .select("duration_minutes, started_at, completed")
        .eq("user_id", user.id);

      if (!error && data) {
        const completed = data.filter((s) => s.completed);
        const mins = completed.reduce(
          (sum, s) => sum + (s.duration_minutes || 0),
          0,
        );
        const totalXP = mins * XP_PER_MINUTE;
        const lvl = Math.floor(totalXP / XP_PER_LEVEL) + 1;

        setTotalMinutes(mins);
        setLevel(lvl);
        setStreak(getCurrentStreak(data));
      }

      setLoadingStats(false);
    };

    fetchStats();
  }, [user?.id]);

  const handleSave = async () => {
    if (!user?.id) return;

    const updates = {
      name: name.trim(),
      birthday: toDatabaseDate(birthday),
      avatar_url: avatarUrl.trim() || null,
    };

    const { data, error } = await supabase
      .from("users")
      .update(updates)
      .eq("id", user.id)
      .select("*")
      .single();

    if (error) {
      Alert.alert("Could not save profile", error.message);
      return;
    }

    setUser(data);
    Alert.alert("Saved", "Your profile has been updated.");
  };

  return (
    <View style={patterns.screen}>
      <View style={[patterns.pageHeader, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          style={[styles.backBtn, shadows.card]}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={22} color={colors.warmBrown} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          patterns.scrollContent,
          { paddingBottom: insets.bottom + spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar */}
        <View
          style={{
            alignItems: "center",
            gap: spacing.sm,
            paddingVertical: spacing.md,
          }}
        >
          <View style={[styles.avatarRing, shadows.card]}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <MaterialIcons
                  name="person"
                  size={44}
                  color={colors.outlineVariant}
                />
              </View>
            )}
          </View>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.email}>{email}</Text>
        </View>

        {/* Stats — live from DB */}
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          {[
            {
              v: loadingStats ? "…" : `${streak}`,
              l: "DAY STREAK",
              icon: "local-fire-department",
              color: colors.secondary,
            },
            {
              v: loadingStats ? "…" : `${level}`,
              l: "LEVEL",
              icon: "star",
              color: colors.primary,
            },
            {
              v: loadingStats ? "…" : formatFocused(totalMinutes),
              l: "FOCUSED",
              icon: "schedule",
              color: colors.primaryContainer,
            },
          ].map((s, i) => (
            <View
              key={i}
              style={[
                patterns.cardSm,
                shadows.card,
                { flex: 1, alignItems: "center", gap: 4, padding: spacing.sm },
              ]}
            >
              <MaterialIcons name={s.icon} size={18} color={s.color} />
              <Text style={styles.statValue}>{s.v}</Text>
              <Text style={styles.statLabel}>{s.l}</Text>
            </View>
          ))}
        </View>

        {/* Personal info */}
        <View style={[patterns.card, shadows.card, { gap: spacing.sm }]}>
          <Text style={styles.cardTitle}>Personal Info</Text>

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Name</Text>
            <TextInput
              style={styles.fieldInput}
              value={name}
              onChangeText={setName}
            />
          </View>
          <View style={styles.fieldDivider} />

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Birthday</Text>
            <TextInput
              style={styles.fieldInput}
              value={birthday}
              onChangeText={setBirthday}
            />
          </View>
          <View style={styles.fieldDivider} />

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Email</Text>
            <Text style={[styles.fieldInput, { color: colors.outline }]}>
              {email}
            </Text>
          </View>
          <View style={styles.fieldDivider} />

          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Avatar URL</Text>
            <TextInput
              style={styles.fieldInput}
              value={avatarUrl}
              onChangeText={setAvatarUrl}
              placeholder="https://..."
              placeholderTextColor={colors.outlineVariant}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </View>

        <TouchableOpacity
          style={[patterns.buttonPrimary, shadows.soft]}
          onPress={handleSave}
        >
          <Text style={styles.saveBtnText}>Save Changes</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.signOutBtn}
          onPress={() =>
            Alert.alert("Sign Out", "Are you sure you want to sign out?", [
              { text: "Cancel", style: "cancel" },
              {
                text: "Sign Out",
                style: "destructive",
                onPress: () => {
                  setUser(null);
                  navigation.reset({ index: 0, routes: [{ name: "SignIn" }] });
                },
              },
            ])
          }
          activeOpacity={0.7}
        >
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceContainerLowest,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { ...typography.h3, color: colors.warmBrown },

  avatarRing: {
    width: 110,
    height: 110,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceContainerLowest,
    padding: 4,
    position: "relative",
  },
  avatar: { width: "100%", height: "100%", borderRadius: radii.full },
  avatarPlaceholder: {
    width: "100%",
    height: "100%",
    borderRadius: radii.full,
    backgroundColor: colors.surfaceContainer,
    alignItems: "center",
    justifyContent: "center",
  },
  editAvatar: {
    position: "absolute",
    bottom: 4,
    right: 4,
    width: 28,
    height: 28,
    borderRadius: radii.full,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  name: {
    ...typography.h1,
    fontSize: 24,
    color: colors.warmBrown,
    marginTop: 4,
  },
  email: { ...typography.bodyMd, color: colors.outline },

  statValue: { ...typography.h2, fontSize: 20, color: colors.warmBrown },
  statLabel: { ...typography.labelCaps, fontSize: 9, color: colors.outline },

  cardTitle: {
    ...typography.h3,
    fontSize: 16,
    color: colors.warmBrown,
    marginBottom: 4,
  },
  field: { gap: 4, paddingVertical: 8 },
  fieldLabel: { ...typography.labelCaps, fontSize: 10, color: colors.outline },
  fieldInput: { ...typography.bodyMd, color: colors.onSurface, padding: 0 },
  fieldDivider: { height: 1, backgroundColor: colors.outlineVariant },

  saveBtnText: {
    ...typography.h3,
    fontSize: 16,
    color: colors.onPrimaryContainer,
  },
  signOutBtn: {
    alignItems: "center",
    paddingVertical: spacing.md,
  },
  signOutText: { ...typography.bodyMd, color: colors.error, fontWeight: "700" },
});

export default ProfileScreen;
