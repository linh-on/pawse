import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Header from "../components/Header";
import { colors, spacing, radii, shadows, typography } from "../theme";

const MASCOT_HOME =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAFb7jjkY7NC_rkg3sSsGcNFn_sR9nbvDa0TNzK5TxPChSaCiPu-whKcwwYnarqWvGT2ugbEnmENbhqq7nC0PbNLUy7JnOBtcL8tgo4wH1AuTgI4C6Qtx280aMVHmlbwYDTCBJ7Z_OpC6kuI0fwt3Wm7tQMSdQckNWj9LkEoUBNMGoa-za19rKhTEwV-5A2gSPy1SuuHczBGQ-5uuSJImUrzvjDSm9wwCtb4UCC3dH9udT_9RJAH_pcH7CB3QmKWW3kArkr_DHxO3Ci";

const MIN_MINUTES = 5;
const MAX_MINUTES = 120;
const STEP = 5;

const PREP_ITEMS = [
  { id: 1, label: "Silence phone notifications" },
  { id: 2, label: "Grab a glass of water" },
  { id: 3, label: "Ready the noise-cancelling headphones" },
];

// Full ring dial — solid color, no moving parts
const FocusDial = ({ minutes }) => (
  <View style={dialStyles.wrapper}>
    <View style={dialStyles.ring}>
      <View style={dialStyles.face}>
        <Text style={dialStyles.number}>{minutes}</Text>
        <Text style={dialStyles.unit}>MINS</Text>
      </View>
    </View>
  </View>
);

const dialStyles = StyleSheet.create({
  wrapper: { alignItems: "center", justifyContent: "center" },
  ring: {
    width: 148,
    height: 148,
    borderRadius: radii.full,
    borderWidth: 10,
    borderColor: colors.primaryContainer,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceContainerLowest,
  },
  face: { alignItems: "center" },
  number: { ...typography.h1, color: colors.warmBrown, lineHeight: 36 },
  unit: {
    ...typography.labelCaps,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
});

const HomeScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [minutes, setMinutes] = useState(45);
  const [checkedItems, setCheckedItems] = useState({
    1: true,
    2: false,
    3: false,
  });

  const adjustMinutes = (delta) => {
    setMinutes((prev) =>
      Math.min(MAX_MINUTES, Math.max(MIN_MINUTES, prev + delta)),
    );
  };

  const toggleCheck = (id) => {
    setCheckedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <View style={styles.screen}>
      <Header mascotSrc={MASCOT_HOME} />

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: 120 + insets.bottom },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Image
            source={{ uri: MASCOT_HOME }}
            style={styles.mascot}
            resizeMode="cover"
          />
          <Text style={styles.greeting}>Hi, Buddy!</Text>
          <Text style={styles.subtitle}>Ready for some focus time?</Text>
        </View>

        <View style={styles.statsRow}>
          <View style={[styles.statCard, shadows.card]}>
            <MaterialIcons
              name="schedule"
              size={22}
              color={colors.primaryContainer}
            />
            <Text style={styles.statLabel}>TODAY</Text>
            <Text style={styles.statValue}>2h 15m</Text>
          </View>
          <View style={[styles.statCard, shadows.card]}>
            <MaterialIcons
              name="local-fire-department"
              size={22}
              color={colors.secondary}
            />
            <Text style={styles.statLabel}>STREAK</Text>
            <Text style={styles.statValue}>5 days</Text>
          </View>
        </View>

        <View style={[styles.sessionCard, shadows.soft]}>
          <View style={styles.sessionHeader}>
            <Text style={styles.sessionTitle}>Focus Duration</Text>
            <View style={styles.minutesBadge}>
              <Text style={styles.minutesBadgeText}>{minutes} Mins</Text>
            </View>
          </View>

          <View style={styles.dialRow}>
            <TouchableOpacity
              style={styles.adjustBtn}
              onPress={() => adjustMinutes(-STEP)}
              disabled={minutes <= MIN_MINUTES}
            >
              <MaterialIcons
                name="remove"
                size={22}
                color={
                  minutes <= MIN_MINUTES
                    ? colors.outlineVariant
                    : colors.primary
                }
              />
            </TouchableOpacity>
            <FocusDial minutes={minutes} />
            <TouchableOpacity
              style={styles.adjustBtn}
              onPress={() => adjustMinutes(STEP)}
              disabled={minutes >= MAX_MINUTES}
            >
              <MaterialIcons
                name="add"
                size={22}
                color={
                  minutes >= MAX_MINUTES
                    ? colors.outlineVariant
                    : colors.primary
                }
              />
            </TouchableOpacity>
          </View>

          <View style={styles.prepSection}>
            <Text style={styles.prepTitle}>Quick Prep</Text>
            {PREP_ITEMS.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.prepRow}
                onPress={() => toggleCheck(item.id)}
                activeOpacity={0.7}
              >
                <View
                  style={[
                    styles.checkbox,
                    checkedItems[item.id] && styles.checkboxChecked,
                  ]}
                >
                  {checkedItems[item.id] && (
                    <MaterialIcons name="check" size={14} color="#fff" />
                  )}
                </View>
                <Text
                  style={[
                    styles.prepLabel,
                    checkedItems[item.id] && styles.prepLabelChecked,
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.startBtn, shadows.soft]}
            onPress={() =>
              navigation.navigate("ActiveSession", { durationMinutes: minutes })
            }
            activeOpacity={0.85}
          >
            <MaterialIcons
              name="play-arrow"
              size={26}
              color={colors.onPrimaryContainer}
            />
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
  hero: { alignItems: "center", gap: spacing.sm },
  mascot: { width: 180, height: 180, borderRadius: radii["2xl"] },
  greeting: {
    ...typography.h1,
    color: colors.warmBrown,
    marginTop: spacing.sm,
  },
  subtitle: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    fontStyle: "italic",
  },
  statsRow: { flexDirection: "row", gap: spacing.gutter },
  statCard: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radii["4xl"],
    padding: spacing.md,
    alignItems: "center",
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
  sessionCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radii["4xl"],
    padding: spacing.md,
    borderWidth: 1,
    borderColor: `${colors.orange}18`,
    gap: spacing.gutter,
  },
  sessionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
    fontWeight: "700",
  },
  dialRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.lg,
  },
  adjustBtn: {
    width: 44,
    height: 44,
    borderRadius: radii.full,
    backgroundColor: `${colors.orange}18`,
    alignItems: "center",
    justifyContent: "center",
  },
  prepSection: { gap: spacing.sm },
  prepTitle: { ...typography.h3, fontSize: 16, color: colors.warmBrown },
  prepRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: 4,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: radii.sm,
    borderWidth: 2,
    borderColor: colors.outlineVariant,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  prepLabel: {
    ...typography.bodyMd,
    fontSize: 14,
    color: colors.onSurfaceVariant,
    flex: 1,
  },
  prepLabelChecked: { color: colors.onSurface, fontWeight: "600" },
  startBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.primaryContainer,
    borderRadius: radii["3xl"],
    paddingVertical: spacing.md,
  },
  startBtnText: { ...typography.h2, color: colors.onPrimaryContainer },
});

export default HomeScreen;
