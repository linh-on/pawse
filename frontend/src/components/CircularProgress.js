import React from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors } from '../theme';

/**
 * Reusable circular progress ring using react-native-svg.
 *
 * Props:
 *   size        – diameter of the ring (default 288)
 *   strokeWidth – thickness of the arc (default 10)
 *   progress    – 0.0 → 1.0 fill amount (default 0.75)
 *   trackColor  – background circle color
 *   fillColor   – progress arc color
 *   children    – content rendered in the center
 */
const CircularProgress = ({
  size = 288,
  strokeWidth = 10,
  progress = 0.75,
  trackColor = colors.surfaceContainerHighest,
  fillColor = colors.primaryContainer,
  children,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - progress);
  const center = size / 2;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg
        width={size}
        height={size}
        style={{ position: 'absolute', top: 0, left: 0 }}
        viewBox={`0 0 ${size} ${size}`}
      >
        {/* Track */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          fill="transparent"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        {/* Progress arc */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          fill="transparent"
          stroke={fillColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${center},${center}`}
        />
      </Svg>
      {/* Center content */}
      <View style={{ alignItems: 'center', justifyContent: 'center' }}>
        {children}
      </View>
    </View>
  );
};

export default CircularProgress;
