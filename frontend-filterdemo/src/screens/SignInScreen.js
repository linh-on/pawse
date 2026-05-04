import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  KeyboardAvoidingView,
  ScrollView,
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
import { responsive } from "../utils/responsive";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/AuthContext";

const SignInScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const r = responsive(width);
  const { setUser } = useAuth();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

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
        "No demo user exists for this email. Try one of the seeded accounts: buddy@pawse.app, teacher@pawse.app, or parent@pawse.app.",
      );
      return;
    }

    setUser(data);
    navigation.reset({ index: 0, routes: [{ name: "Main" }] });
  };

  const useDemoAccount = (demoEmail) => {
    setEmail(demoEmail);
  };

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + spacing.md,
            paddingBottom: insets.bottom + spacing.lg,
            paddingHorizontal: r.screenPadding,
          },
        ]}
      >
        <View style={styles.hero}>
          <Image
            source={require("../../assets/pawse_logo.png")}
            style={styles.logo}
          />
          <Text style={styles.title}>Welcome to Pawse</Text>
          <Text style={styles.subtitle}>Your smart focus companion</Text>
        </View>

        <View
          style={[
            patterns.card,
            shadows.card,
            styles.formCard,
            { maxWidth: r.contentMaxWidth },
          ]}
        >
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
              {
                borderRadius: radii["2xl"],
                marginTop: spacing.sm,
                paddingVertical: 10,
              },
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

          <View style={{ gap: 8 }}>
            {[
              {
                email: "buddy@pawse.app",
                label: "Student",
                icon: "school",
                color: colors.primary,
              },
              {
                email: "teacher@pawse.app",
                label: "Teacher",
                icon: "cast-for-education",
                color: colors.secondary,
              },
              {
                email: "parent@pawse.app",
                label: "Parent",
                icon: "family-restroom",
                color: colors.tertiary,
              },
            ].map(({ email: e, label, icon, color }) => (
              <TouchableOpacity
                key={e}
                style={styles.demoBtn}
                onPress={() => useDemoAccount(e)}
              >
                <View
                  style={[
                    styles.demoRoleBadge,
                    { backgroundColor: `${color}18` },
                  ]}
                >
                  <MaterialIcons name={icon} size={15} color={color} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.demoBtnText} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.82}>{e}</Text>
                  <Text style={styles.demoRoleText}>{label}</Text>
                </View>
                <MaterialIcons
                  name="chevron-right"
                  size={16}
                  color={colors.outlineVariant}
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Demo mode — no password required</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLow,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    gap: spacing.md,
  },
  hero: { alignItems: "center", gap: spacing.xs },
  formCard: { gap: spacing.sm, width: "100%", alignSelf: "center" },
  logo: { width: 88, height: 88, resizeMode: "contain" },
  title: {
    ...typography.h1,
    fontSize: 26,
    color: colors.warmBrown,
    marginTop: spacing.xs,
    textAlign: "center",
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
    paddingTop: 12,
    paddingBottom: 12,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
  },
  input: {
    flex: 1,
    ...typography.bodyMd,
    color: colors.onSurface,
    paddingVertical: 0,
    margin: 0,
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

  demoBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: 10,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.outlineVariant,
    backgroundColor: colors.surfaceContainerLowest,
  },
  demoRoleBadge: {
    width: 32,
    height: 32,
    borderRadius: radii.md,
    alignItems: "center",
    justifyContent: "center",
  },
  demoBtnText: {
    ...typography.bodySm,
    color: colors.warmBrown,
    fontWeight: "600",
    fontSize: 13,
  },
  demoRoleText: {
    ...typography.labelCaps,
    fontSize: 9,
    color: colors.outline,
    marginTop: 1,
  },

  footer: {
    alignItems: "center",
    paddingTop: spacing.xs,
  },
  footerText: {
    ...typography.bodySm,
    color: colors.outline,
    fontStyle: "italic",
  },
});

export default SignInScreen;
