import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Modal,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { colors, spacing, radii, shadows, typography } from "../../theme";

/**
 * Urgent notification modal.
 * Shows when an urgent notification is detected by the classifier.
 *
 * onDismiss:
 *   Keeps the phone locked and continues the focus session.
 *
 * onOverride:
 *   Treats the urgent notification as an emergency override.
 *   The parent screen should stop/end the session and navigate home.
 */
const UrgentModal = ({
  entry,
  scale,
  opacity,
  connected,
  onDismiss,
  onOverride,
}) => (
  <Modal transparent visible={!!entry} animationType="none">
    <View style={styles.overlay}>
      <Animated.View
        style={[
          styles.card,
          shadows.soft,
          { transform: [{ scale }], opacity },
        ]}
      >
        <View style={styles.badgeRow}>
          <View style={styles.badge}>
            <MaterialIcons
              name="notifications-active"
              size={14}
              color={colors.error}
            />
            <Text style={styles.badgeText}>URGENT NOTIFICATION</Text>
          </View>
        </View>

        <Text style={styles.body}>{entry?.text}</Text>

        <View style={styles.meta}>
          <MaterialIcons name="info-outline" size={14} color={colors.outline} />
          <Text style={styles.metaText}>
            {connected
              ? "Sent to box — choose whether to stay locked or override"
              : "Classified as urgent — choose whether to keep focusing or stop"}
          </Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.keepLockedBtn}
            onPress={onDismiss}
            activeOpacity={0.85}
          >
            <MaterialIcons
              name="lock"
              size={16}
              color={colors.onPrimaryContainer}
            />
            <Text style={styles.keepLockedText}>Keep Locked</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.overrideBtn}
            onPress={onOverride}
            activeOpacity={0.85}
          >
            <MaterialIcons name="emergency" size={16} color={colors.error} />
            <Text style={styles.overrideText}>Override & End</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  </Modal>
);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(29,27,25,0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.md,
  },
  card: {
    width: "100%",
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radii["3xl"],
    padding: spacing.md,
    borderWidth: 1,
    borderColor: `${colors.error}30`,
    gap: spacing.sm,
  },
  badgeRow: { flexDirection: "row" },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: `${colors.error}12`,
    borderRadius: radii.full,
    alignSelf: "flex-start",
  },
  badgeText: {
    ...typography.labelCaps,
    fontSize: 10,
    color: colors.error,
  },
  body: {
    ...typography.bodyMd,
    color: colors.onSurface,
    lineHeight: 22,
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
  },
  metaText: {
    ...typography.bodySm,
    fontSize: 12,
    color: colors.outline,
    flex: 1,
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  keepLockedBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.primaryContainer,
    borderRadius: radii["2xl"],
    paddingVertical: spacing.sm,
  },
  keepLockedText: {
    ...typography.h3,
    fontSize: 16,
    color: colors.onPrimaryContainer,
  },
  overrideBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: `${colors.error}12`,
    borderRadius: radii["2xl"],
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: `${colors.error}30`,
  },
  overrideText: {
    ...typography.h3,
    fontSize: 16,
    color: colors.error,
  },
});

export default UrgentModal;
