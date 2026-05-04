import { Dimensions } from "react-native";

const BASE_WIDTH = 390;

export const responsive = (width = Dimensions.get("window").width) => {
  const isSmallPhone = width < 360;
  const isTablet = width >= 768;
  const scale = Math.min(Math.max(width / BASE_WIDTH, 0.88), isTablet ? 1.18 : 1.05);

  return {
    isSmallPhone,
    isTablet,
    scale,
    contentMaxWidth: isTablet ? 680 : "100%",
    wideContentMaxWidth: isTablet ? 920 : "100%",
    screenPadding: Math.round(Math.min(Math.max(width * 0.045, 16), 32)),
    compactGap: isSmallPhone ? 8 : 12,
    timerSize: Math.round(Math.min(width - 48, isSmallPhone ? 248 : isTablet ? 320 : 288)),
    lockTimerSize: Math.round(Math.min(width - 48, isSmallPhone ? 240 : isTablet ? 320 : 280)),
  };
};

export const rs = (size, width = Dimensions.get("window").width) => {
  const scale = Math.min(Math.max(width / BASE_WIDTH, 0.88), width >= 768 ? 1.18 : 1.05);
  return Math.round(size * scale);
};

export const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
