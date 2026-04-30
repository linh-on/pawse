# Pawse — React Native

Smart Focus Companion mobile app, converted from the Tailwind/React web prototype.

## Project Structure

```
pawse-rn/
├── App.js                          # Entry point
├── package.json
└── src/
    ├── theme.js                    # Colors, spacing, typography, shadows
    ├── components/
    │   ├── Header.js               # Shared sticky header
    │   └── CircularProgress.js     # SVG-based ring timer
    ├── navigation/
    │   └── AppNavigator.js         # Tab + stack navigator with custom tab bar
    └── screens/
        ├── HomeScreen.js           # Dashboard, focus dial, start session
        ├── ActiveSessionScreen.js  # Live countdown timer with animated ring
        ├── StatsScreen.js          # Bar chart, peak focus, streak
        ├── RewardsScreen.js        # Mascot XP card + accessory grid
        ├── SettingsScreen.js       # Subscription, smart filter, theme
        └── MiscScreens.js          # FilterSettings, OverridesLog, CalendarSync
```

## Quick Start

### 1. Install Expo CLI
```bash
npm install -g expo-cli
# or
npx expo --version   # confirms it's available without global install
```

### 2. Install dependencies
```bash
cd pawse-rn
npm install
```

### 3. Run
```bash
npx expo start
# Then press i (iOS simulator), a (Android emulator), or scan QR with Expo Go app
```

## Dependencies

| Package | Purpose |
|---|---|
| `expo` | Build toolchain |
| `react-native` | Core framework |
| `react-native-safe-area-context` | Safe area insets (notch/home bar) |
| `react-native-screens` | Native screen containers for React Navigation |
| `react-native-svg` | Circular progress ring in the timer screen |
| `@expo/vector-icons` | Material Icons (replaces Material Symbols from web) |
| `@react-navigation/native` | Navigation container |
| `@react-navigation/native-stack` | Stack navigator for screen transitions |
| `@react-navigation/bottom-tabs` | Tab navigator with custom tab bar |

## Web → React Native Mapping

| Web (HTML/Tailwind) | React Native |
|---|---|
| `<div>` | `<View>` |
| `<p>`, `<span>`, `<h1>–<h3>` | `<Text>` |
| `<button>` | `<TouchableOpacity>` or `<Pressable>` |
| `<img>` | `<Image>` with `source={{ uri }}` |
| `<nav>` | Custom `<CustomTabBar>` via `@react-navigation/bottom-tabs` |
| Tailwind classes | `StyleSheet.create({})` with design tokens from `theme.js` |
| `<svg>` progress ring | `react-native-svg` `<Circle>` with strokeDashoffset |
| React Router `<Link>` / `navigate()` | `useNavigation().navigate('ScreenName')` |
| `position: fixed` header | Sticky header per-screen (passed `top-0` equivalent via `react-native-safe-area-context`) |
| `backdrop-blur` on tab bar | Semi-transparent background (`rgba`) — full blur requires `@react-native-community/blur` (optional) |
| CSS `gap` in flex | `gap` prop (RN 0.71+) or `marginBottom` between children |
| `overflow-y: auto` scroll | `<ScrollView>` with `showsVerticalScrollIndicator={false}` |
| CSS animations (pulse) | `Animated.loop` + `Animated.sequence` |
| `localStorage` / state | React `useState` (no persistence yet — add `expo-secure-store` later) |

## Notes

- **Fonts**: The web version uses Plus Jakarta Sans, Nunito, and DM Sans via Google Fonts. In Expo, install `@expo-google-fonts/nunito`, `@expo-google-fonts/dm-sans`, and `@expo-google-fonts/plus-jakarta-sans`, then load them with `useFonts()` in `App.js`. The current build falls back to system fonts.
- **Dark Mode**: The web version has a `dark:` Tailwind variant. This project is set up for light mode only; dark mode can be added using React Native's `useColorScheme()` hook.
- **Blur Tab Bar**: Use `@react-native-community/blur` (iOS) or `react-native-blur` to match the `backdrop-blur-md` effect on the bottom nav.
- **Timer Persistence**: The countdown resets on navigation. To persist across screen changes, lift timer state to a React Context or use `expo-task-manager` for background timers.
