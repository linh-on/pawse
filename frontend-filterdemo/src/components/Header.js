import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  StatusBar,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { MaterialIcons } from "@expo/vector-icons";
import { colors, spacing, radii, typography } from "../theme";
import { useAuth } from "../lib/AuthContext";

const Header = ({ title = "Pawse", showProfile = true, badge = null }) => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { user } = useAuth();
  const avatarUrl = user?.avatar_url ?? null;

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
        ) : (
          <TouchableOpacity style={styles.iconBtn} activeOpacity={0.7}>
            <MaterialIcons
              name="bluetooth-connected"
              size={22}
              color={colors.primaryContainer}
            />
          </TouchableOpacity>
        )}
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
  iconBtn: { padding: 8, borderRadius: radii.full },
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
});

export default Header;
