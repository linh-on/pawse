import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  Alert,
  ActivityIndicator,
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
  tint,
} from "../theme";
import { responsive } from "../utils/responsive";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/AuthContext";

// ─── Plan definitions ─────────────────────────────────────────────────────────

const PLANS = {
  free: {
    id: "free",
    name: "Free",
    price: "$0",
    period: "forever",
    color: colors.outline,
    icon: "lock-open",
    perks: [
      { icon: "timer", text: "3 focus sessions per day" },
      { icon: "hourglass-top", text: "5-minute grace period" },
      { icon: "psychology", text: "Basic notification filter" },
      { icon: "school", text: "Student school mode" },
      { icon: "bar-chart", text: "Weekly stats only" },
    ],
    missing: [
      "Unlimited sessions",
      "Custom grace period",
      "AI Smart Filter",
      "Teacher & parent controls",
      "Full stats history",
    ],
  },
  focus_plus: {
    id: "focus_plus",
    name: "Focus+",
    price: "$4.99",
    period: "per month",
    color: colors.primary,
    icon: "workspace-premium",
    perks: [
      { icon: "all-inclusive", text: "Unlimited focus sessions" },
      { icon: "tune", text: "Custom grace period" },
      { icon: "auto-awesome", text: "Full AI-powered Smart Filter" },
      { icon: "cast-for-education", text: "Teacher & parent controls" },
      { icon: "leaderboard", text: "Full stats history & badges" },
      { icon: "contact-phone", text: "Trusted contacts bypass" },
      { icon: "palette", text: "Premium themes (coming soon)" },
    ],
    missing: [],
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (iso) => {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString([], {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

// ─── Component ────────────────────────────────────────────────────────────────

const SubscriptionScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const r = responsive(width);
  const { user, setUser } = useAuth();

  const [loading, setLoading] = useState(true);
  const [subData, setSubData] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    async function load() {
      if (!user?.id) return;
      const { data, error } = await supabase
        .from("users")
        .select(
          "subscription_tier, subscription_started_at, subscription_expires_at, subscription_cancelled_at",
        )
        .eq("id", user.id)
        .single();
      if (!error && data) setSubData(data);
      setLoading(false);
    }
    load();
  }, [user?.id]);

  const tier = subData?.subscription_tier ?? user?.subscription_tier ?? "free";
  const currentPlan = PLANS[tier] ?? PLANS.free;
  const otherPlan = tier === "free" ? PLANS.focus_plus : PLANS.free;
  const isCancelled = !!subData?.subscription_cancelled_at;
  const expiresAt = subData?.subscription_expires_at;
  const cancelledAt = subData?.subscription_cancelled_at;

  // Compute end date if cancelled
  const endDate = isCancelled ? fmtDate(expiresAt) : null;

  const handleCancel = () => {
    Alert.alert(
      "Cancel Focus+?",
      `Your subscription will remain active until ${fmtDate(expiresAt) ?? "the end of the billing period"}. After that, your account will revert to the Free plan.`,
      [
        { text: "Keep Subscription", style: "cancel" },
        {
          text: "Cancel Subscription",
          style: "destructive",
          onPress: confirmCancel,
        },
      ],
    );
  };

  const confirmCancel = async () => {
    setCancelling(true);
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("users")
      .update({ subscription_cancelled_at: now })
      .eq("id", user.id)
      .select("*")
      .single();
    setCancelling(false);
    if (error) {
      Alert.alert("Error", error.message);
      return;
    }
    setUser(data);
    setSubData((s) => ({ ...s, subscription_cancelled_at: now }));
    Alert.alert(
      "Subscription Cancelled",
      `You'll have access to Focus+ until ${fmtDate(expiresAt) ?? "your billing period ends"}.`,
    );
  };

  const handleReactivate = async () => {
    setCancelling(true);
    const { data, error } = await supabase
      .from("users")
      .update({ subscription_cancelled_at: null })
      .eq("id", user.id)
      .select("*")
      .single();
    setCancelling(false);
    if (error) {
      Alert.alert("Error", error.message);
      return;
    }
    setUser(data);
    setSubData((s) => ({ ...s, subscription_cancelled_at: null }));
    Alert.alert("Welcome back!", "Your Focus+ subscription is active again.");
  };

  if (loading) {
    return (
      <View
        style={[
          styles.screen,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.pageHeader}>
        <TouchableOpacity
          style={[styles.backBtn, shadows.card]}
          onPress={() => navigation.goBack()}
        >
          <MaterialIcons name="arrow-back" size={22} color={colors.warmBrown} />
        </TouchableOpacity>
        <Text style={styles.pageTitle}>Subscription</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingHorizontal: r.screenPadding,
            paddingBottom: insets.bottom + 80,
            maxWidth: r.contentMaxWidth,
            width: "100%",
            alignSelf: "center",
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Current plan card ── */}
        <View
          style={[
            styles.currentCard,
            { borderColor: `${currentPlan.color}44` },
            shadows.card,
          ]}
        >
          <View style={styles.currentCardTop}>
            <View
              style={[
                styles.planIconWrap,
                { backgroundColor: tint(currentPlan.color, 0.15) },
              ]}
            >
              <MaterialIcons
                name={currentPlan.icon}
                size={28}
                color={currentPlan.color}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.currentLabel}>CURRENT PLAN</Text>
              <Text style={[styles.currentName, { color: currentPlan.color }]}>
                {currentPlan.name}
              </Text>
            </View>
            <View style={styles.priceBlock}>
              <Text style={[styles.priceAmount, { color: currentPlan.color }]}>
                {currentPlan.price}
              </Text>
              <Text style={styles.pricePeriod}>{currentPlan.period}</Text>
            </View>
          </View>

          {/* Subscription status */}
          {tier === "focus_plus" && (
            <View style={styles.statusRow}>
              {isCancelled ? (
                <View
                  style={[
                    styles.statusPill,
                    { backgroundColor: tint(colors.error, 0.1) },
                  ]}
                >
                  <MaterialIcons name="cancel" size={14} color={colors.error} />
                  <Text style={[styles.statusText, { color: colors.error }]}>
                    Cancels {endDate ?? "at period end"}
                  </Text>
                </View>
              ) : (
                <View
                  style={[
                    styles.statusPill,
                    { backgroundColor: tint(colors.success, 0.1) },
                  ]}
                >
                  <MaterialIcons
                    name="check-circle"
                    size={14}
                    color={colors.success}
                  />
                  <Text style={[styles.statusText, { color: colors.success }]}>
                    Active{expiresAt ? ` · renews ${fmtDate(expiresAt)}` : ""}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Perks list */}
          <View style={styles.perksList}>
            {currentPlan.perks.map((p, i) => (
              <View key={i} style={styles.perkRow}>
                <View
                  style={[
                    styles.perkIcon,
                    { backgroundColor: tint(currentPlan.color, 0.12) },
                  ]}
                >
                  <MaterialIcons
                    name={p.icon}
                    size={15}
                    color={currentPlan.color}
                  />
                </View>
                <Text style={styles.perkText}>{p.text}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Upgrade / other plan card ── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>
            {tier === "free" ? "Upgrade to Focus+" : "Plan Comparison"}
          </Text>
        </View>

        <View
          style={[
            styles.otherCard,
            { borderColor: `${otherPlan.color}33` },
            shadows.card,
          ]}
        >
          <View style={styles.otherCardTop}>
            <View
              style={[
                styles.planIconWrap,
                { backgroundColor: tint(otherPlan.color, 0.12) },
              ]}
            >
              <MaterialIcons
                name={otherPlan.icon}
                size={22}
                color={otherPlan.color}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.otherName, { color: otherPlan.color }]}>
                {otherPlan.name}
              </Text>
            </View>
            <View style={styles.priceBlock}>
              <Text
                style={[
                  styles.priceAmount,
                  { color: otherPlan.color, fontSize: 18 },
                ]}
              >
                {otherPlan.price}
              </Text>
              <Text style={styles.pricePeriod}>{otherPlan.period}</Text>
            </View>
          </View>

          <View style={styles.perksList}>
            {otherPlan.perks.map((p, i) => (
              <View key={i} style={styles.perkRow}>
                <View
                  style={[
                    styles.perkIcon,
                    { backgroundColor: tint(otherPlan.color, 0.1) },
                  ]}
                >
                  <MaterialIcons
                    name={p.icon}
                    size={14}
                    color={otherPlan.color}
                  />
                </View>
                <Text style={styles.perkText}>{p.text}</Text>
              </View>
            ))}
          </View>

          {tier === "free" && (
            <TouchableOpacity
              style={[styles.upgradeBtn, { backgroundColor: otherPlan.color }]}
              onPress={() =>
                Alert.alert(
                  "Coming soon",
                  "Payment integration coming in a future update.",
                )
              }
              activeOpacity={0.85}
            >
              <MaterialIcons name="workspace-premium" size={18} color="#fff" />
              <Text style={styles.upgradeBtnText}>
                Upgrade to Focus+ · $4.99/mo
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Cancel / Reactivate (focus+ only) ── */}
        {tier === "focus_plus" && (
          <View style={[patterns.card, shadows.card, styles.cancelSection]}>
            {isCancelled ? (
              <>
                <View style={styles.cancelWarning}>
                  <MaterialIcons name="info" size={16} color={colors.error} />
                  <Text style={styles.cancelWarningText}>
                    Your Focus+ access ends on{" "}
                    {endDate ?? "the billing period end date"}. After that your
                    account will revert to Free.
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.reactivateBtn}
                  onPress={handleReactivate}
                  disabled={cancelling}
                >
                  {cancelling ? (
                    <ActivityIndicator
                      color={colors.onPrimaryContainer}
                      size="small"
                    />
                  ) : (
                    <>
                      <MaterialIcons
                        name="refresh"
                        size={18}
                        color={colors.onPrimaryContainer}
                      />
                      <Text style={styles.reactivateBtnText}>
                        Reactivate Subscription
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.cancelHint}>
                  Cancelling will keep your Focus+ features active until{" "}
                  <Text style={{ fontWeight: "700" }}>
                    {fmtDate(expiresAt) ?? "the end of your billing period"}
                  </Text>
                  . You won't be charged again.
                </Text>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={handleCancel}
                  disabled={cancelling}
                >
                  {cancelling ? (
                    <ActivityIndicator color={colors.error} size="small" />
                  ) : (
                    <Text style={styles.cancelBtnText}>
                      Cancel Subscription
                    </Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.surfaceContainerLow },
  pageHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.containerPadding,
    borderBottomWidth: 1,
    borderBottomColor: `${colors.orange}18`,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceContainerLowest,
    alignItems: "center",
    justifyContent: "center",
  },
  pageTitle: { ...typography.h3, color: colors.warmBrown },
  scroll: {
    paddingTop: spacing.md,
    paddingBottom: 60,
    gap: spacing.gutter,
  },

  // Current plan card
  currentCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radii["4xl"],
    padding: spacing.sm,
    borderWidth: 1.5,
    gap: spacing.sm,
  },
  currentCardTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  planIconWrap: {
    width: 52,
    height: 52,
    borderRadius: radii["2xl"],
    alignItems: "center",
    justifyContent: "center",
  },
  currentLabel: { ...typography.labelCaps, fontSize: 9, color: colors.outline },
  currentName: { ...typography.h2, fontSize: 20, flexShrink: 1 },

  priceBlock: { alignItems: "flex-end" },
  priceAmount: { ...typography.h2, fontSize: 20 },
  pricePeriod: { ...typography.bodySm, fontSize: 10, color: colors.outline },

  statusRow: { flexDirection: "row" },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.full,
  },
  statusText: { ...typography.labelCaps, fontSize: 10 },

  perksList: { gap: 8 },
  perkRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  perkIcon: {
    width: 28,
    height: 28,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
  },
  perkText: {
    ...typography.bodySm,
    color: colors.onSurface,
    flex: 1,
    fontSize: 13,
    flexShrink: 1,
  },

  missingBlock: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radii.lg,
    padding: spacing.sm,
    gap: 6,
  },
  missingLabel: {
    ...typography.labelCaps,
    fontSize: 9,
    color: colors.outline,
    marginBottom: 2,
  },
  missingRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  missingText: {
    ...typography.bodySm,
    fontSize: 12,
    color: colors.outlineVariant,
  },

  // Other plan card
  sectionHeader: { marginBottom: -spacing.unit },
  sectionTitle: { ...typography.h3, fontSize: 16, color: colors.warmBrown },
  otherCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radii["3xl"],
    padding: spacing.sm,
    borderWidth: 1,
    gap: spacing.sm,
  },
  otherCardTop: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  otherName: { ...typography.h3, fontSize: 17, flexShrink: 1 },

  upgradeBtn: {
    borderRadius: radii["2xl"],
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    marginTop: spacing.sm,
    ...shadows.soft,
  },
  upgradeBtnText: { ...typography.bodyMd, color: "#fff", fontWeight: "700" },

  // Cancel section
  cancelSection: { gap: spacing.sm },
  cancelWarning: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
    backgroundColor: tint(colors.error, 0.06),
    borderRadius: radii.lg,
    padding: spacing.sm,
  },
  cancelWarningText: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    flex: 1,
    lineHeight: 18,
  },
  cancelHint: {
    ...typography.bodySm,
    color: colors.onSurfaceVariant,
    lineHeight: 20,
  },
  cancelBtn: {
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: radii["2xl"],
    borderWidth: 1.5,
    borderColor: tint(colors.error, 0.4),
  },
  cancelBtnText: {
    ...typography.bodyMd,
    color: colors.error,
    fontWeight: "700",
  },

  reactivateBtn: {
    backgroundColor: colors.primaryContainer,
    borderRadius: radii["2xl"],
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  reactivateBtnText: {
    ...typography.bodyMd,
    color: colors.onPrimaryContainer,
    fontWeight: "700",
  },

  legalText: {
    ...typography.bodySm,
    fontSize: 10,
    color: colors.outlineVariant,
    textAlign: "center",
    lineHeight: 16,
  },
});

export default SubscriptionScreen;
