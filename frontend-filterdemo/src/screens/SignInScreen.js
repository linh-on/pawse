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
  ActivityIndicator,
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

const MASCOT =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAFb7jjkY7NC_rkg3sSsGcNFn_sR9nbvDa0TNzK5TxPChSaCiPu-whKcwwYnarqWvGT2ugbEnmENbhqq7nC0PbNLUy7JnOBtcL8tgo4wH1AuTgI4C6Qtx280aMVHmlbwYDTCBJ7Z_OpC6kuI0fwt3Wm7tQMSdQckNWj9LkEoUBNMGoa-za19rKhTEwV-5A2gSPy1SuuHczBGQ-5uuSJImUrzvjDSm9wwCtb4UCC3dH9udT_9RJAH_pcH7CB3QmKWW3kArkr_DHxO3Ci";

const SignInScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { setUser } = useAuth();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  // Demo sign-in: looks up the email in users table, signs in if found
  const handleSignIn = async () => {
    if (!email.trim()) {
      Alert.alert("Email required", "Enter an email to sign in.");
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", email.trim().toLowerCase())
      .maybeSingle();
    setLoading(false);

    if (error) {
      Alert.alert("Connection error", error.message);
      return;
    }

    if (!data) {
      Alert.alert(
        "User not found",
        "No demo user exists for this email. Try one of the seeded accounts: buddy@pawse.app or bob@pawse.app.",
      );
      return;
    }

    setUser(data);
    navigation.reset({ index: 0, routes: [{ name: "Main" }] });
  };

  // Quick-pick a seeded demo user
  const useDemoAccount = (demoEmail) => {
    setEmail(demoEmail);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { paddingTop: insets.top + spacing.lg }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
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
            autoCorrect={false}
          />
        </View>

        <TouchableOpacity
          style={[
            patterns.buttonPrimary,
            shadows.soft,
            { borderRadius: radii["2xl"], marginTop: spacing.sm },
            loading && { opacity: 0.6 },
          ]}
          onPress={handleSignIn}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.onPrimaryContainer} />
          ) : (
            <Text style={styles.signInText}>Sign In</Text>
          )}
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>QUICK DEMO</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Quick-pick buttons for seeded accounts */}
        <View style={{ gap: 8 }}>
          {["buddy@pawse.app", "bob@pawse.app"].map((e) => (
            <TouchableOpacity
              key={e}
              style={styles.demoBtn}
              onPress={() => useDemoAccount(e)}
            >
              <MaterialIcons
                name="account-circle"
                size={18}
                color={colors.warmBrown}
              />
              <Text style={styles.demoBtnText}>{e}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Demo mode — no password required</Text>
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

  demoBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: 10,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLowest,
  },
  demoBtnText: {
    ...typography.bodySm,
    color: colors.warmBrown,
    fontWeight: "600",
  },

  footer: {
    alignItems: "center",
    paddingBottom: spacing.lg,
    paddingTop: spacing.md,
  },
  footerText: {
    ...typography.bodySm,
    color: colors.outline,
    fontStyle: "italic",
  },
});

export default SignInScreen;
