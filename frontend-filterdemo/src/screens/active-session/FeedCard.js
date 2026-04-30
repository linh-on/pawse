import React, { useEffect, useRef } from "react";
import { View, Text, Animated, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { colors, spacing, radii, typography } from "../../theme";

const FeedCard = ({ entry }) => {
  const isUrgent = entry.predicted === "urgent";
  const slideAnim = useRef(new Animated.Value(40)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 80, friction: 12 }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={[
      styles.card,
      isUrgent ? styles.cardUrgent : styles.cardSuppressed,
      { transform: [{ translateY: slideAnim }], opacity: opacityAnim },
    ]}>
      <View style={[
        styles.cardIconWrap,
        { backgroundColor: isUrgent ? `${colors.error}15` : colors.surfaceContainer },
      ]}>
        <MaterialIcons
          name={isUrgent ? "notifications-active" : "notifications-off"}
          size={18}
          color={isUrgent ? colors.error : colors.outline}
        />
      </View>
      <View style={styles.cardContent}>
        <Text style={[styles.cardBadge, { color: isUrgent ? colors.error : colors.outline }]}>
          {isUrgent ? "ALLOWED THROUGH" : "SUPPRESSED"}
        </Text>
        <Text style={[styles.cardText, !isUrgent && { color: colors.outline }]} numberOfLines={2}>
          {entry.text}
        </Text>
        {!entry.correct && (
          <Text style={styles.cardWrong}>⚠ misclassified (true: {entry.trueLabel})</Text>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: "row", alignItems: "flex-start",
    borderRadius: radii.xl, padding: spacing.sm,
    borderWidth: 1, gap: 10,
  },
  cardUrgent: { backgroundColor: `${colors.error}08`, borderColor: `${colors.error}30` },
  cardSuppressed: { backgroundColor: colors.surfaceContainerLow, borderColor: colors.outlineVariant },
  cardIconWrap: {
    width: 36, height: 36, borderRadius: radii.md,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  cardContent: { flex: 1, gap: 3 },
  cardBadge: { ...typography.labelCaps, fontSize: 9 },
  cardText: { ...typography.bodySm, fontSize: 12, color: colors.onSurface, lineHeight: 17 },
  cardWrong: { ...typography.labelCaps, fontSize: 9, color: colors.tertiary, marginTop: 2 },
});

export default FeedCard;
