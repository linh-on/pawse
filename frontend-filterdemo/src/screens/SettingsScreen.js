import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Switch,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Header from "../components/Header";
import { colors, spacing, radii, shadows, typography } from "../theme";

const THEMES = [
  { id: "classic", name: "Classic", primary: "#FFB150", accent: "#FEF8F3" },
  { id: "dark", name: "Dark Fur", primary: "#5A5550", accent: "#2A2825" },
  { id: "sakura", name: "Sakura", primary: "#FEB2C2", accent: "#FFE8EE" },
];

const GRACE_OPTIONS = [5, 10, 15];

const SettingsScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [theme, setTheme] = useState("classic");
  const [grace, setGrace] = useState(10);
  const [chime, setChime] = useState(true);
  const [whiteNoise, setWhiteNoise] = useState(false);

  return (
    <View style={styles.screen}>
      <Header />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: 120 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Active Plan */}
        <View style={[styles.planCard, shadows.card]}>
          <View style={styles.planHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.planLabel}>ACTIVE PLAN</Text>
              <Text style={styles.planTitle}>Focus+ Member</Text>
              <Text style={styles.planSub}>
                Unlimited paws and premium sounds.
              </Text>
            </View>
            <View style={styles.planStar}>
              <MaterialIcons name="star" size={20} color={colors.primary} />
            </View>
          </View>
          <TouchableOpacity style={styles.manageBtn} activeOpacity={0.85}>
            <Text style={styles.manageBtnText}>Manage Subscription</Text>
          </TouchableOpacity>
        </View>

        {/* Display Theme */}
        <View style={[styles.card, shadows.card]}>
          <Text style={styles.cardTitle}>Display Theme</Text>
          <View style={styles.themeRow}>
            {THEMES.map((t) => (
              <TouchableOpacity
                key={t.id}
                style={[
                  styles.themeOption,
                  theme === t.id && styles.themeOptionActive,
                ]}
                onPress={() => setTheme(t.id)}
                activeOpacity={0.85}
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
                    theme === t.id && {
                      color: colors.primary,
                      fontWeight: "700",
                    },
                  ]}
                >
                  {t.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Grace Period */}
        <View style={[styles.card, shadows.card]}>
          <View style={styles.rowBetween}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Grace Period</Text>
              <Text style={styles.cardSub}>Time to return before failing</Text>
            </View>
            <Text style={styles.graceValue}>{grace}m</Text>
          </View>
          <View style={styles.graceRow}>
            {GRACE_OPTIONS.map((g, i) => (
              <TouchableOpacity
                key={g}
                style={[styles.graceDot, grace === g && styles.graceDotActive]}
                onPress={() => setGrace(g)}
              >
                {grace === g && <View style={styles.graceDotInner} />}
              </TouchableOpacity>
            ))}
            <View style={styles.graceTrack} />
          </View>
          <View style={styles.graceLabels}>
            <Text style={styles.graceLabel}>5 MIN</Text>
            <Text style={styles.graceLabel}>15 MIN</Text>
          </View>
        </View>

        {/* Session Audio */}
        <View style={[styles.card, shadows.card]}>
          <Text style={styles.cardTitle}>Session Audio</Text>

          <View style={styles.audioRow}>
            <View style={styles.audioIcon}>
              <MaterialIcons
                name="notifications-active"
                size={18}
                color={colors.primary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.audioName}>End Session Chime</Text>
              <Text style={styles.audioSub}>Play sound when finished</Text>
            </View>
            <Switch
              value={chime}
              onValueChange={setChime}
              trackColor={{
                false: colors.surfaceContainerHigh,
                true: colors.primary,
              }}
              thumbColor="#fff"
            />
          </View>

          <View style={styles.audioRow}>
            <View style={styles.audioIcon}>
              <MaterialIcons name="forest" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.audioName}>Ambient White Noise</Text>
              <Text style={styles.audioSub}>Rainy forest background</Text>
            </View>
            <Switch
              value={whiteNoise}
              onValueChange={setWhiteNoise}
              trackColor={{
                false: colors.surfaceContainerHigh,
                true: colors.primary,
              }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* Smart Filter link */}
        <TouchableOpacity
          style={[styles.linkRow, shadows.card]}
          onPress={() => navigation.navigate("FilterSettings")}
          activeOpacity={0.85}
        >
          <View
            style={[
              styles.audioIcon,
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

        {/* Parental Control PIN */}
        <View style={[styles.linkRow, shadows.card]}>
          <View
            style={[styles.audioIcon, { backgroundColor: `${colors.error}15` }]}
          >
            <MaterialIcons name="lock" size={18} color={colors.error} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.audioName}>Parental Control PIN</Text>
            <Text style={styles.audioSub}>
              Require PIN to change focus time
            </Text>
          </View>
          <Switch
            value={false}
            onValueChange={() => {}}
            trackColor={{
              false: colors.surfaceContainerHigh,
              true: colors.primary,
            }}
            thumbColor="#fff"
          />
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
  screen: { flex: 1, backgroundColor: colors.surfaceContainerLow },
  scroll: {
    paddingHorizontal: spacing.containerPadding,
    paddingTop: spacing.md,
    gap: spacing.gutter,
  },

  // Plan
  planCard: {
    backgroundColor: `${colors.primaryContainer}22`,
    borderRadius: radii["3xl"],
    padding: spacing.md,
    borderWidth: 1,
    borderColor: `${colors.orange}33`,
    gap: spacing.sm,
  },
  planHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
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
  planStar: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    backgroundColor: `${colors.primaryContainer}55`,
    alignItems: "center",
    justifyContent: "center",
  },
  manageBtn: {
    backgroundColor: colors.primaryContainer,
    borderRadius: radii["2xl"],
    paddingVertical: 12,
    alignItems: "center",
  },
  manageBtnText: {
    ...typography.bodyMd,
    color: colors.onPrimaryContainer,
    fontWeight: "700",
  },

  // Generic card
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radii["3xl"],
    padding: spacing.md,
    borderWidth: 1,
    borderColor: `${colors.orange}18`,
    gap: spacing.sm,
  },
  cardTitle: { ...typography.h3, fontSize: 16, color: colors.warmBrown },
  cardSub: { ...typography.bodySm, color: colors.outline, marginTop: 2 },
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

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
  graceLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  graceLabel: { ...typography.labelCaps, fontSize: 10, color: colors.outline },

  // Audio rows
  audioRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: 6,
  },
  audioIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    backgroundColor: `${colors.primaryContainer}33`,
    alignItems: "center",
    justifyContent: "center",
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

  // Link rows
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radii["3xl"],
    padding: spacing.md,
    borderWidth: 1,
    borderColor: `${colors.orange}18`,
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
