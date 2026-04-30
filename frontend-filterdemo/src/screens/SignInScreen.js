import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
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

const MASCOT =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAFb7jjkY7NC_rkg3sSsGcNFn_sR9nbvDa0TNzK5TxPChSaCiPu-whKcwwYnarqWvGT2ugbEnmENbhqq7nC0PbNLUy7JnOBtcL8tgo4wH1AuTgI4C6Qtx280aMVHmlbwYDTCBJ7Z_OpC6kuI0fwt3Wm7tQMSdQckNWj9LkEoUBNMGoa-za19rKhTEwV-5A2gSPy1SuuHczBGQ-5uuSJImUrzvjDSm9wwCtb4UCC3dH9udT_9RJAH_pcH7CB3QmKWW3kArkr_DHxO3Ci";

const SignInScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSignIn = () => {
    navigation.reset({ index: 0, routes: [{ name: "Main" }] });
  };

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { paddingTop: insets.top + spacing.lg }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      {/* Hero */}
      <View
        style={{
          alignItems: "center",
          gap: spacing.sm,
          paddingTop: spacing.lg,
        }}
      >
        <Image source={{ uri: MASCOT }} style={styles.mascot} />
        <Text style={styles.title}>Welcome to Pawse</Text>
        <Text style={styles.subtitle}>Your smart focus companion</Text>
      </View>

      {/* Form */}
      <View style={[patterns.card, shadows.card, { gap: spacing.sm }]}>
        <Text style={styles.label}>Email</Text>
        <View style={styles.inputWrap}>
          <MaterialIcons name="mail-outline" size={20} color={colors.outline} />
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor={colors.outlineVariant}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <Text style={styles.label}>Password</Text>
        <View style={styles.inputWrap}>
          <MaterialIcons name="lock-outline" size={20} color={colors.outline} />
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor={colors.outlineVariant}
            secureTextEntry
          />
        </View>

        <TouchableOpacity style={{ alignSelf: "flex-end", marginTop: 4 }}>
          <Text style={styles.forgotText}>Forgot password?</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            patterns.buttonPrimary,
            shadows.soft,
            { borderRadius: radii["2xl"], marginTop: spacing.sm },
          ]}
          onPress={handleSignIn}
        >
          <Text style={styles.signInText}>Sign In</Text>
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity style={styles.socialBtn} onPress={handleSignIn}>
          <MaterialIcons
            name="account-circle"
            size={20}
            color={colors.warmBrown}
          />
          <Text style={styles.socialText}>Continue with Google</Text>
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>Don't have an account?</Text>
        <TouchableOpacity onPress={handleSignIn}>
          <Text style={styles.footerLink}> Sign Up</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLow,
    paddingHorizontal: spacing.containerPadding,
    justifyContent: "space-between",
  },
  mascot: { width: 100, height: 100, borderRadius: radii["2xl"] },
  title: {
    ...typography.h1,
    fontSize: 28,
    color: colors.warmBrown,
    marginTop: spacing.sm,
  },
  subtitle: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    fontStyle: "italic",
  },

  label: {
    ...typography.labelCaps,
    color: colors.onSurfaceVariant,
    fontSize: 11,
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surfaceContainer,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.sm,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  input: { flex: 1, ...typography.bodyMd, color: colors.onSurface },
  forgotText: {
    ...typography.bodySm,
    color: colors.primary,
    fontWeight: "600",
  },
  signInText: {
    ...typography.h3,
    fontSize: 16,
    color: colors.onPrimaryContainer,
  },

  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginVertical: spacing.sm,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.outlineVariant },
  dividerText: { ...typography.labelCaps, color: colors.outline, fontSize: 10 },

  socialBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderRadius: radii["2xl"],
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  socialText: {
    ...typography.bodyMd,
    color: colors.warmBrown,
    fontWeight: "600",
  },

  footer: {
    flexDirection: "row",
    justifyContent: "center",
    paddingBottom: spacing.lg,
    paddingTop: spacing.md,
  },
  footerText: { ...typography.bodyMd, color: colors.onSurfaceVariant },
  footerLink: {
    ...typography.bodyMd,
    color: colors.primary,
    fontWeight: "700",
  },
});

export default SignInScreen;
