// ─── Pawse Design System ─────────────────────────────────────────────────────

export const colors = {
  primary: "#875300",
  primaryContainer: "#FFB150",
  onPrimary: "#FFFFFF",
  onPrimaryContainer: "#714500",
  primaryFixed: "#FFDDBA",
  primaryFixedDim: "#FFB965",
  onPrimaryFixed: "#2b1700",
  inversePrimary: "#FFB965",

  secondary: "#884d5b",
  secondaryContainer: "#FEB2C2",
  secondaryFixed: "#FFD9DF",
  secondaryFixedDim: "#FEB2C2",
  onSecondary: "#FFFFFF",
  onSecondaryContainer: "#7A414F",
  onSecondaryFixed: "#370b19",
  onSecondaryFixedVariant: "#6c3644",

  tertiary: "#885113",
  tertiaryContainer: "#FBB26C",
  tertiaryFixed: "#FFDCBF",
  tertiaryFixedDim: "#FFB874",
  onTertiary: "#FFFFFF",
  onTertiaryContainer: "#764202",
  onTertiaryFixed: "#2d1600",
  onTertiaryFixedVariant: "#6b3b00",

  background: "#FEF8F3",
  surface: "#FEF8F3",
  surfaceBright: "#FEF8F3",
  surfaceDim: "#DFD9D4",
  surfaceTint: "#875300",
  surfaceVariant: "#E7E1DD",
  surfaceContainer: "#F3EDE8",
  surfaceContainerLow: "#F9F3EE",
  surfaceContainerHigh: "#EDE7E2",
  surfaceContainerHighest: "#E7E1DD",
  surfaceContainerLowest: "#FFFFFF",
  inverseSurface: "#32302D",
  inverseOnSurface: "#F6F0EB",

  onBackground: "#1D1B19",
  onSurface: "#1D1B19",
  onSurfaceVariant: "#524436",

  outline: "#847464",
  outlineVariant: "#D7C3B1",

  error: "#BA1A1A",
  errorContainer: "#FFDAD6",
  onError: "#FFFFFF",
  onErrorContainer: "#93000A",

  // Convenience aliases used throughout UI
  orange: "#FFB150",
  warmBrown: "#524436",
  cardBorder: "#FFF3E8",
  success: "#1F8A3F",
};

export const spacing = {
  xs: 4,
  sm: 12,
  unit: 8,
  gutter: 16,
  md: 24,
  lg: 40,
  xl: 64,
  containerPadding: 20,
};

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 28,
  "4xl": 32,
  full: 9999,
};

export const shadows = {
  soft: {
    shadowColor: "#A57A62",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 4,
  },
  card: {
    shadowColor: "#A57A62",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  timer: {
    shadowColor: "#FFB150",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 30,
    elevation: 8,
  },
};

export const fonts = {
  h1: "Nunito_800ExtraBold",
  h2: "Nunito_700Bold",
  h3: "Nunito_700Bold",
  bodyMd: "DMSans_400Regular",
  bodyLg: "DMSans_400Regular",
  bodySm: "DMSans_500Medium",
  label: "DMSans_700Bold",
  display: "PlusJakartaSans_800ExtraBold",
  fallback: "System",
};

export const typography = {
  h1: { fontSize: 32, lineHeight: 38, letterSpacing: -0.64, fontWeight: "800" },
  h2: { fontSize: 24, lineHeight: 31, fontWeight: "700" },
  h3: { fontSize: 20, lineHeight: 28, fontWeight: "700" },
  bodyLg: { fontSize: 18, lineHeight: 29, fontWeight: "400" },
  bodyMd: { fontSize: 16, lineHeight: 26, fontWeight: "400" },
  bodySm: { fontSize: 14, lineHeight: 21, fontWeight: "500" },
  labelCaps: {
    fontSize: 12,
    lineHeight: 12,
    letterSpacing: 0.6,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  timerDisplay: {
    fontSize: 56,
    lineHeight: 60,
    fontWeight: "900",
    letterSpacing: -2,
  },
};

// ─── Reusable patterns ────────────────────────────────────────────────────────
// Spread these into local styles to share common shapes across files.
//
// Usage:
//   const styles = StyleSheet.create({
//     myCard: { ...patterns.card, gap: spacing.sm },
//   });

export const patterns = {
  // Full-screen container — warm cream background
  screen: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLow,
  },
  // Alt screen background (active session uses background, not surfaceContainerLow)
  screenAlt: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // Big rounded card (used for sessionCard, demoSection, brainCard, statsCard, etc.)
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radii["3xl"],
    padding: spacing.md,
    borderWidth: 1,
    borderColor: `${colors.orange}18`,
  },
  // Larger card (Home session card, Profile cards)
  cardLg: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radii["4xl"],
    padding: spacing.md,
    borderWidth: 1,
    borderColor: `${colors.orange}18`,
  },
  // Smaller card / row item
  cardSm: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radii["2xl"],
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: `${colors.orange}18`,
  },

  // A horizontal "row" item (used in lists — settings, smart filter, calendar events)
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radii["2xl"],
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: `${colors.orange}18`,
  },

  // Circular icon container (used inside rows, headers, profile)
  circleIcon: {
    width: 36,
    height: 36,
    borderRadius: radii.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: `${colors.primaryContainer}33`,
  },
  // Small circle (avatars, badges, dots)
  circleIconSm: {
    width: 24,
    height: 24,
    borderRadius: radii.full,
    alignItems: "center",
    justifyContent: "center",
  },

  // Centered title block (Deep Focus, Calendar Sync, etc.)
  titleBlock: {
    alignItems: "center",
    gap: 6,
  },

  // A space-between row (used everywhere for headers, toggle rows)
  rowBetween: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  // Small badge (chips, status tags)
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.full,
    alignSelf: "flex-start",
  },

  // Primary button (Start Session, Sign In, Save Changes)
  buttonPrimary: {
    backgroundColor: colors.primaryContainer,
    borderRadius: radii["3xl"],
    paddingVertical: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },
  // Secondary button (Manage Connection, neutral actions)
  buttonSecondary: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: radii["2xl"],
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.sm,
  },

  // Sub-header for sections
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },

  // Page-level header bar (Smart Filter, Profile)
  pageHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.unit * 1.5,
    backgroundColor: colors.surfaceContainerLow,
    borderBottomWidth: 1,
    borderBottomColor: `${colors.orange}22`,
  },

  // Standard scroll container with horizontal padding
  scrollContent: {
    paddingHorizontal: spacing.containerPadding,
    paddingTop: spacing.md,
    gap: spacing.gutter,
  },
};

// ─── Shorthand helpers for tinting ───────────────────────────────────────────
// Returns a hex with alpha suffix — equivalent to `${color}${alphaHex}`
// Example: tint(colors.primary, 0.18) → '#87530030' (approximately)
export const tint = (hex, alpha) => {
  const a = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, "0");
  return `${hex}${a}`;
};
