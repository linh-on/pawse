import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  TextInput,
} from "react-native";

import { useNavigation } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Header from "../components/Header";
import {
  colors,
  spacing,
  radii,
  shadows,
  typography,
  patterns,
} from "../theme";
import { responsive } from "../utils/responsive";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/AuthContext";

const THEMES = [
  { id: "classic", name: "Classic", primary: "#FFB150", accent: "#FEF8F3" },
  { id: "dark", name: "Dark Fur", primary: "#5A5550", accent: "#2A2825" },
  { id: "sakura", name: "Sakura", primary: "#FEB2C2", accent: "#FFE8EE" },
];
const SettingsScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const r = responsive(width);
  const { user } = useAuth();

  const theme = "classic";
  const [grace, setGrace] = useState(10);

  const tier = user?.subscription_tier ?? "free";
  const isFree = tier === "free";
  const planName = isFree ? "Free Plan" : "Focus+ Member";
  const planSub = isFree
    ? "Up to 3 sessions per day."
    : "Unlimited paws and premium features.";

  useEffect(() => {
    const fetchPreferences = async () => {
      if (!user?.id) return;

      const { data, error } = await supabase
        .from("preferences")
        .select("grace_period_minutes")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!error && data) {
        setGrace(data.grace_period_minutes || 10);
      }
    };

    fetchPreferences();
  }, [user?.id]);

  const updatePreference = async (updates) => {
    if (!user?.id) return;

    await supabase
      .from("preferences")
      .upsert({ user_id: user.id, ...updates }, { onConflict: "user_id" });
  };

  const handleGraceChange = (value) => {
    setGrace(value);
    updatePreference({ grace_period_minutes: value });
  };

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
        {/* Active Plan */}
        <View
          style={[
            styles.planCard,
            shadows.card,
            isFree && {
              backgroundColor: colors.surfaceContainerLow,
              borderColor: `${colors.outline}22`,
            },
          ]}
        >
          <View style={{ gap: 2 }}>
            <Text style={styles.planLabel}>ACTIVE PLAN</Text>
            <Text style={styles.planTitle}>{planName}</Text>
            <Text style={styles.planSub}>{planSub}</Text>
          </View>
          <TouchableOpacity
            style={styles.manageBtn}
            activeOpacity={0.85}
            onPress={() => navigation.navigate("Subscription")}
          >
            <Text style={styles.manageBtnText}>Manage Subscription</Text>
          </TouchableOpacity>
        </View>

        {/* Smart Filter link */}
        <TouchableOpacity
          style={[patterns.row, shadows.card]}
          onPress={() => navigation.navigate("FilterSettings")}
          activeOpacity={0.85}
        >
          <View
            style={[
              patterns.circleIcon,
              { backgroundColor: `${colors.primary}15` },
            ]}
          >
            <MaterialIcons name="psychology" size={18} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.audioName}>Smart Filter</Text>
            <Text style={styles.audioSub}>Manage notification rules</Text>
          </View>
          <MaterialIcons
            name="chevron-right"
            size={22}
            color={colors.outline}
          />
        </TouchableOpacity>

        {/* Display Theme */}
        <View style={[patterns.card, shadows.card, { gap: spacing.sm }]}>
          <View style={patterns.rowBetween}>
            <Text style={styles.cardTitle}>Display Theme</Text>
            <View style={styles.comingSoonTag}>
              <Text style={styles.comingSoonText}>Coming Soon</Text>
            </View>
          </View>

          <Text style={styles.cardSub}>Classic mode is currently active.</Text>

          <View style={styles.themeRow}>
            {THEMES.map((t) => {
              const isClassic = t.id === theme;
              return (
                <View
                  key={t.id}
                  style={[
                    styles.themeOption,
                    isClassic && styles.themeOptionActive,
                    !isClassic && styles.themeOptionDisabled,
                  ]}
                >
                  <View
                    style={[styles.themeSwatch, { backgroundColor: t.accent }]}
                  >
                    <View
                      style={[
                        styles.themeSwatchBar,
                        { backgroundColor: t.primary },
                      ]}
                    />
                  </View>
                  <Text
                    style={[
                      styles.themeName,
                      isClassic && {
                        color: colors.primary,
                        fontWeight: "700",
                      },
                      !isClassic && { color: colors.outlineVariant },
                    ]}
                  >
                    {t.name}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Grace Period */}
        <View style={[patterns.card, shadows.card, { gap: spacing.sm }]}>
          <View style={patterns.rowBetween}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Grace Period</Text>
              <Text style={styles.cardSub}>Time to return before failing</Text>
            </View>
          </View>
          <View style={styles.graceInputRow}>
            <TextInput
              style={styles.graceInput}
              value={String(grace)}
              onChangeText={(t) => {
                const n = parseInt(t) || 0;
                setGrace(n);
              }}
              onBlur={() => {
                const clamped = Math.max(1, grace);
                setGrace(clamped);
                handleGraceChange(clamped);
              }}
              keyboardType="number-pad"
              maxLength={3}
            />
            <Text style={styles.graceUnit}>minutes</Text>
          </View>
        </View>

        {/* Sign Out */}
        <TouchableOpacity
          style={styles.signOut}
          onPress={() =>
            navigation.reset({ index: 0, routes: [{ name: "SignIn" }] })
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
  // Plan card — uses tinted variant of patterns.card
  planCard: {
    ...patterns.card,
    gap: spacing.sm,
  },
  planLabel: { ...typography.labelCaps, color: colors.primary, fontSize: 10 },
  planTitle: {
    ...typography.h2,
    fontSize: 22,
    color: colors.warmBrown,
    marginTop: 4,
  },
  planSub: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    marginTop: 4,
  },
  manageBtn: {
    ...patterns.buttonPrimary,
    paddingVertical: 12,
    borderRadius: radii["2xl"],
  },
  graceInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  graceInput: {
    ...typography.h2,
    color: colors.primary,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
    minWidth: 60,
    textAlign: "center",
    paddingVertical: 4,
  },
  graceUnit: { ...typography.bodyMd, color: colors.onSurfaceVariant },
  manageBtnText: {
    ...typography.bodyMd,
    color: colors.onPrimaryContainer,
    fontWeight: "700",
  },

  // Card titles
  cardTitle: { ...typography.h3, fontSize: 16, color: colors.warmBrown },
  cardSub: { ...typography.bodySm, color: colors.outline, marginTop: 2 },

  // Theme picker
  themeRow: { flexDirection: "row", gap: spacing.sm, marginTop: 4 },
  themeOption: {
    flex: 1,
    alignItems: "center",
    gap: 6,
    padding: spacing.unit,
    borderRadius: radii.lg,
    borderWidth: 2,
    borderColor: "transparent",
  },
  themeOptionActive: { borderColor: colors.primary },
  themeOptionDisabled: { opacity: 0.45 },
  comingSoonTag: {
    backgroundColor: `${colors.primary}15`,
    borderRadius: radii.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  comingSoonText: {
    ...typography.labelCaps,
    fontSize: 9,
    color: colors.primary,
    fontWeight: "700",
  },
  themeSwatch: {
    width: "100%",
    height: 50,
    borderRadius: radii.md,
    justifyContent: "flex-end",
    padding: 6,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  themeSwatchBar: { height: 6, borderRadius: radii.sm },
  themeName: { ...typography.bodySm, fontSize: 12, color: colors.onSurface },

  // Grace
  graceValue: { ...typography.h2, color: colors.primary },
  graceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginVertical: 6,
    position: "relative",
    paddingHorizontal: 4,
  },
  graceTrack: {
    position: "absolute",
    left: 14,
    right: 14,
    top: "50%",
    height: 4,
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: 2,
    zIndex: -1,
  },
  graceDot: {
    width: 24,
    height: 24,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  graceDotActive: { backgroundColor: colors.primary, width: 28, height: 28 },
  graceDotInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#fff",
  },
  graceLabel: { ...typography.labelCaps, fontSize: 10, color: colors.outline },

  // Audio
  audioRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: 6,
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

  // Sign out
  signOut: {
    alignItems: "center",
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
  },
  signOutText: { ...typography.bodyMd, color: colors.error, fontWeight: "700" },
});

export default SettingsScreen;
