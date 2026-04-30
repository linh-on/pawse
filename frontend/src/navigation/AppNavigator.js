import React from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Platform,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';

import HomeScreen          from '../screens/HomeScreen';
import ActiveSessionScreen from '../screens/ActiveSessionScreen';
import StatsScreen         from '../screens/StatsScreen';
import RewardsScreen       from '../screens/RewardsScreen';
import SettingsScreen      from '../screens/SettingsScreen';
import {
  FilterSettingsScreen,
  OverridesLogScreen,
  CalendarSyncScreen,
} from '../screens/MiscScreens';

import { colors, spacing, radii, shadows, typography } from '../theme';

// ── Custom tab bar ────────────────────────────────────────────────────────────

const TAB_ITEMS = [
  { name: 'Home',     icon: 'home',        label: 'Home'    },
  { name: 'Stats',    icon: 'leaderboard', label: 'Stats'   },
  { name: 'Rewards',  icon: 'redeem',      label: 'Rewards' },
  { name: 'Settings', icon: 'settings',    label: 'Settings'},
];

const CustomTabBar = ({ state, descriptors, navigation }) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={[tabStyles.bar, { paddingBottom: insets.bottom + 8 }]}>
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;
        const item = TAB_ITEMS.find((t) => t.name === route.name) ?? TAB_ITEMS[0];

        return (
          <TouchableOpacity
            key={route.key}
            style={[tabStyles.item, isFocused && tabStyles.itemActive]}
            onPress={() => navigation.navigate(route.name)}
            activeOpacity={0.75}
          >
            <MaterialIcons
              name={item.icon}
              size={24}
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
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.95)',
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    gap: 4,
    borderRadius: radii.xl,
  },
  itemActive: {
    backgroundColor: `${colors.orange}18`,
  },
  label: {
    ...typography.labelCaps,
    fontSize: 10,
    color: colors.outline,
    letterSpacing: 0.6,
  },
  labelActive: {
    color: colors.orange,
  },
});

// ── Tab stacks ────────────────────────────────────────────────────────────────

const Stack = createNativeStackNavigator();
const Tab   = createBottomTabNavigator();

const NO_HEADER = { headerShown: false };

// Home stack: Home → ActiveSession
const HomeStack = () => (
  <Stack.Navigator screenOptions={NO_HEADER}>
    <Stack.Screen name="Home"          component={HomeScreen} />
    <Stack.Screen name="ActiveSession" component={ActiveSessionScreen} />
  </Stack.Navigator>
);

// Stats stack: Stats → Overrides
const StatsStack = () => (
  <Stack.Navigator screenOptions={NO_HEADER}>
    <Stack.Screen name="Stats"     component={StatsScreen} />
    <Stack.Screen name="Overrides" component={OverridesLogScreen} />
  </Stack.Navigator>
);

// Settings stack: Settings → FilterSettings → CalendarSync
const SettingsStack = () => (
  <Stack.Navigator screenOptions={NO_HEADER}>
    <Stack.Screen name="Settings"       component={SettingsScreen} />
    <Stack.Screen name="FilterSettings" component={FilterSettingsScreen} />
    <Stack.Screen name="CalendarSync"   component={CalendarSyncScreen} />
  </Stack.Navigator>
);

// Rewards (no nested routes)
const RewardsStack = () => (
  <Stack.Navigator screenOptions={NO_HEADER}>
    <Stack.Screen name="Rewards" component={RewardsScreen} />
  </Stack.Navigator>
);

// ── Root navigator ────────────────────────────────────────────────────────────

export const AppNavigator = () => (
  <NavigationContainer>
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <CustomTabBar {...props} />}
    >
      <Tab.Screen name="Home"     component={HomeStack} />
      <Tab.Screen name="Stats"    component={StatsStack} />
      <Tab.Screen name="Rewards"  component={RewardsStack} />
      <Tab.Screen name="Settings" component={SettingsStack} />
    </Tab.Navigator>
  </NavigationContainer>
);
