import React from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppNavigator } from "./src/navigation/AppNavigator";

/**
 * Pawse — Smart Focus Companion
 * React Native / Expo entry point
 *
 * Dependencies (run: npx expo install <pkg> or npm install):
 *   npx expo install \
 *     react-native-safe-area-context \
 *     react-native-screens \
 *     react-native-svg \
 *     @expo/vector-icons
 *
 *   npm install \
 *     @react-navigation/native \
 *     @react-navigation/native-stack \
 *     @react-navigation/bottom-tabs
 */
export default function App() {
  return (
    <SafeAreaProvider>
      <AppNavigator />
    </SafeAreaProvider>
  );
}
