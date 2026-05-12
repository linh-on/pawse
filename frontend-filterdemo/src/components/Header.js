import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import { colors, spacing, radii, typography } from "../theme";
import { useAuth } from "../lib/AuthContext";
import { usePawseBox } from "../context/PawseBoxContext";

const Header = ({ title = "Pawse", showProfile = true, badge = null }) => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user } = useAuth();
  const avatarUrl = user?.avatar_url ?? null;
  const { connected, scanning, connect, disconnect } = usePawseBox();

  const handleBleTap = () => {
    if (scanning) return;
    if (connected) {
      disconnect();
    } else {
      connect();
    }
  };

  return (
    <View style={[styles.wrapper, { paddingTop: insets.top + 8 }]}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={colors.surfaceContainerLow}
      />

      <View style={styles.left}>
        <Text style={styles.wordmark}>{title}</Text>
      </View>

      <View style={styles.right}>
        {badge ? (
          <View style={styles.badge}>
            <MaterialIcons name="lock" size={14} color={colors.tertiary} />
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        ) : null}

        {/* ── BLE Button ── */}
        <TouchableOpacity
          style={[styles.bleBtn, connected && styles.bleBtnConnected]}
          onPress={handleBleTap}
          activeOpacity={0.7}
          disabled={scanning}
        >
          {scanning ? (
            <ActivityIndicator size={14} color={colors.primary} />
          ) : (
            <MaterialIcons
              name={connected ? "bluetooth-connected" : "bluetooth"}
              size={18}
              color={connected ? "#fff" : colors.primaryContainer}
            />
          )}
          <Text
            style={[styles.bleBtnText, connected && styles.bleBtnTextConnected]}
          >
            {scanning ? "Scanning..." : connected ? "Connected" : "Connect"}
          </Text>
        </TouchableOpacity>

        {showProfile && !badge && (
          <TouchableOpacity
            style={styles.avatarRing}
            onPress={() => navigation.navigate("Profile")}
            activeOpacity={0.75}
          >
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <MaterialIcons name="person" size={20} color={colors.outline} />
              </View>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.unit * 1.5,
    backgroundColor: colors.surfaceContainerLow,
    borderBottomWidth: 1,
    borderBottomColor: `${colors.orange}22`,
  },
  left: { flexDirection: "row", alignItems: "center", gap: 10 },
  wordmark: { ...typography.h3, color: colors.orange, letterSpacing: -0.5 },
  right: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  avatarRing: {
    width: 34,
    height: 34,
    borderRadius: radii.full,
    borderWidth: 1.5,
    borderColor: colors.outlineVariant,
    overflow: "hidden",
  },
  avatar: { width: "100%", height: "100%" },
  avatarPlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surfaceContainer,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
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

  // ── BLE Button ──
  bleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.full,
    backgroundColor: `${colors.primary}10`,
    borderWidth: 1,
    borderColor: `${colors.primary}25`,
  },
  bleBtnConnected: {
    backgroundColor: "#1F8A3F",
    borderColor: "#1F8A3F",
  },
  bleBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.primaryContainer,
    letterSpacing: 0.2,
  },
  bleBtnTextConnected: {
    color: "#fff",
  },
});

export default Header;
