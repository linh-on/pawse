import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";

import HomeScreen from "../screens/HomeScreen";
import ActiveSessionScreen from "../screens/ActiveSessionScreen";
import StatsScreen from "../screens/StatsScreen";
import CalendarScreen from "../screens/CalendarScreen";
import SettingsScreen from "../screens/SettingsScreen";
import SignInScreen from "../screens/SignInScreen";
import ProfileScreen from "../screens/ProfileScreen";
import SchoolScreen from "../screens/SchoolScreen";
import {
  FilterSettingsScreen,
  CalendarSyncScreen,
} from "../screens/MiscScreens";

import { colors, spacing, radii, shadows, typography } from "../theme";

const TAB_ITEMS = [
  { name: "Home", icon: "home", label: "Home" },
  { name: "Stats", icon: "leaderboard", label: "Stats" },
  { name: "Calendar", icon: "calendar-today", label: "Calendar" },
  { name: "School", icon: "school", label: "School" },
  { name: "Settings", icon: "settings", label: "Settings" },
];

const CustomTabBar = ({ state, navigation }) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[tabStyles.bar, { paddingBottom: insets.bottom + 8 }]}>
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;
        const item =
          TAB_ITEMS.find((t) => t.name === route.name) ?? TAB_ITEMS[0];

        return (
          <TouchableOpacity
            key={route.key}
            style={[tabStyles.item, isFocused && tabStyles.itemActive]}
            onPress={() => navigation.navigate(route.name)}
            activeOpacity={0.75}
          >
            <MaterialIcons
              name={item.icon}
              size={22}
              color={isFocused ? colors.orange : colors.outline}
            />
            <Text style={[tabStyles.label, isFocused && tabStyles.labelActive]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const tabStyles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.95)",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 12,
    paddingHorizontal: spacing.gutter,
    borderTopWidth: 1,
    borderTopColor: `${colors.orange}18`,
    ...shadows.soft,
  },
  item: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 6,
    gap: 4,
    borderRadius: radii.xl,
  },
  itemActive: { backgroundColor: `${colors.orange}18` },
  label: {
    ...typography.labelCaps,
    fontSize: 9,
    color: colors.outline,
    letterSpacing: 0.6,
  },
  labelActive: { color: colors.orange },
});

const RootStack = createNativeStackNavigator();
const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const NO_HEADER = { headerShown: false };

const HomeStack = () => (
  <Stack.Navigator screenOptions={NO_HEADER}>
    <Stack.Screen name="Home" component={HomeScreen} />
    <Stack.Screen name="ActiveSession" component={ActiveSessionScreen} />
  </Stack.Navigator>
);

const StatsStack = () => (
  <Stack.Navigator screenOptions={NO_HEADER}>
    <Stack.Screen name="Stats" component={StatsScreen} />
  </Stack.Navigator>
);

const CalendarStack = () => (
  <Stack.Navigator screenOptions={NO_HEADER}>
    <Stack.Screen name="Calendar" component={CalendarScreen} />
  </Stack.Navigator>
);

const SchoolStack = () => (
  <Stack.Navigator screenOptions={NO_HEADER}>
    <Stack.Screen name="School" component={SchoolScreen} />
  </Stack.Navigator>
);

const SettingsStack = () => (
  <Stack.Navigator screenOptions={NO_HEADER}>
    <Stack.Screen name="Settings" component={SettingsScreen} />
    <Stack.Screen name="FilterSettings" component={FilterSettingsScreen} />
    <Stack.Screen name="CalendarSync" component={CalendarSyncScreen} />
  </Stack.Navigator>
);

const MainTabs = () => (
  <Tab.Navigator
    screenOptions={NO_HEADER}
    tabBar={(props) => <CustomTabBar {...props} />}
  >
    <Tab.Screen name="Home" component={HomeStack} />
    <Tab.Screen name="Stats" component={StatsStack} />
    <Tab.Screen name="Calendar" component={CalendarStack} />
    <Tab.Screen name="School" component={SchoolStack} />
    <Tab.Screen name="Settings" component={SettingsStack} />
  </Tab.Navigator>
);

export const AppNavigator = () => (
  <NavigationContainer>
    <RootStack.Navigator screenOptions={NO_HEADER}>
      <RootStack.Screen name="SignIn" component={SignInScreen} />
      <RootStack.Screen name="Main" component={MainTabs} />
      <RootStack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ presentation: "modal" }}
      />
    </RootStack.Navigator>
  </NavigationContainer>
);
