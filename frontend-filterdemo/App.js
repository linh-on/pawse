import React from "react";
import { View, ActivityIndicator } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppNavigator } from "./src/navigation/AppNavigator";
import { AuthProvider } from "./src/lib/AuthContext";
import { useFonts } from "expo-font";
import { Nunito_700Bold, Nunito_800ExtraBold } from "@expo-google-fonts/nunito";
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_700Bold,
} from "@expo-google-fonts/dm-sans";
import { PlusJakartaSans_800ExtraBold } from "@expo-google-fonts/plus-jakarta-sans";
import { colors } from "./src/theme";
import { PawseBoxProvider } from "./src/context/PawseBoxContext";

export default function App() {
  const [fontsLoaded] = useFonts({
    Nunito_700Bold,
    Nunito_800ExtraBold,
    DMSans_400Regular,
    DMSans_500Medium,
    DMSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  if (!fontsLoaded) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator color={colors.primaryContainer} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <PawseBoxProvider>
          <AppNavigator />
        </PawseBoxProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
