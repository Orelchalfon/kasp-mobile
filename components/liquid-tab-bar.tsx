import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import * as Haptics from "expo-haptics";
import { useEffect, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, View, type LayoutChangeEvent } from "react-native";
import Animated, {
  ZoomIn,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";

import { Text } from "@/components/ui/text";
import { colors } from "@/constants/theme";
import { buildNotchBarPath, buildNotchEdgePath, clampNotchCenter } from "@/lib/tab-notch";

const BAR_HEIGHT = 64;
const CIRCLE = 52;
/** Room above the bar's top edge for the raised circle; part of the bar's own height. */
const RISE = CIRCLE / 2 + 4;
const NOTCH = { radius: 30, shoulder: 18, depth: 32 } as const;
const ICON_SIZE = 24;
/** Head/tail gap (px) at which the travelling circle is fully dipped into the bar. */
const STRETCH_FULL = 60;

const AnimatedPath = Animated.createAnimatedComponent(Path);

/**
 * Bottom tab bar with a liquid notch: the active icon rides in a raised circle inside a
 * cradle cut into the bar. On a tab change the cradle's leading edge springs to the new
 * tab while the trailing edge lags, so it stretches across and snaps back, and the circle
 * dips into the bar mid-travel and pops up at the new tab.
 *
 * Titles and icons come from each screen's options in the layout.
 */
export function LiquidTabBar({ state, descriptors, navigation, insets }: BottomTabBarProps) {
  const reduceMotion = useReducedMotion();
  const routes = state.routes.filter(
    (route) => StyleSheet.flatten(descriptors[route.key].options.tabBarItemStyle)?.display !== "none",
  );
  const focusedKey = state.routes[state.index]?.key;
  const height = RISE + BAR_HEIGHT + insets.bottom;

  // Physical x of each tab's center, measured rather than computed: the row is flipped
  // by RTL, but SVG coordinates and translateX are not.
  const [centers, setCenters] = useState<Record<string, number>>({});
  const barWidth = useSharedValue(0);
  const head = useSharedValue(0);
  const tail = useSharedValue(0);
  const placed = useRef(false);

  const target = focusedKey === undefined ? undefined : centers[focusedKey];
  const ready = routes.every((route) => centers[route.key] !== undefined);

  useEffect(() => {
    if (target === undefined) return;
    if (!placed.current) {
      // First layout: start in place instead of sliding in from x = 0.
      head.value = target;
      tail.value = target;
      placed.current = true;
    } else if (reduceMotion) {
      head.value = withTiming(target, { duration: 180 });
      tail.value = withTiming(target, { duration: 180 });
    } else {
      head.value = withSpring(target, { damping: 16, stiffness: 220, mass: 0.7 });
      tail.value = withDelay(70, withSpring(target, { damping: 18, stiffness: 120, mass: 0.9 }));
    }
  }, [target, reduceMotion, head, tail]);

  const barProps = useAnimatedProps(() => ({
    d: buildNotchBarPath({ width: barWidth.value, top: RISE, height, a: head.value, b: tail.value, ...NOTCH }),
  }));
  const edgeProps = useAnimatedProps(() => ({
    d: buildNotchEdgePath({ width: barWidth.value, top: RISE, height, a: head.value, b: tail.value, ...NOTCH }),
  }));
  const circleStyle = useAnimatedStyle(() => {
    const stretch = Math.min(Math.abs(head.value - tail.value) / STRETCH_FULL, 1);
    const x = clampNotchCenter(head.value, barWidth.value, NOTCH.radius);
    return {
      transform: [
        { translateX: x - CIRCLE / 2 },
        { translateY: stretch * 14 },
        { scale: 1 - stretch * 0.15 },
      ],
    };
  });

  const onBarLayout = (e: LayoutChangeEvent) => {
    barWidth.value = e.nativeEvent.layout.width;
  };
  const onTabLayout = (key: string) => (e: LayoutChangeEvent) => {
    const { x, width } = e.nativeEvent.layout;
    const center = x + width / 2;
    setCenters((prev) => (prev[key] === center ? prev : { ...prev, [key]: center }));
  };

  const focusedOptions = focusedKey === undefined ? undefined : descriptors[focusedKey].options;

  return (
    <View onLayout={onBarLayout} style={{ height, backgroundColor: colors.background }}>
      {/* SVG and transforms use physical coordinates, so these layers opt out of RTL. */}
      <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.physical, { opacity: ready ? 1 : 0 }]}>
        <Svg style={StyleSheet.absoluteFill}>
          <AnimatedPath animatedProps={barProps} fill={colors.card} />
          <AnimatedPath animatedProps={edgeProps} fill="none" stroke={colors.border} strokeWidth={1} />
        </Svg>
      </View>

      <View accessibilityRole="tablist" style={styles.row}>
        {routes.map((route) => {
          const { options } = descriptors[route.key];
          const focused = route.key === focusedKey;
          const label =
            typeof options.tabBarLabel === "string" ? options.tabBarLabel : (options.title ?? route.name);

          const onPress = () => {
            const event = navigation.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) {
              if (Platform.OS !== "web") void Haptics.selectionAsync();
              navigation.navigate(route.name, route.params);
            }
          };
          const onLongPress = () => navigation.emit({ type: "tabLongPress", target: route.key });

          return (
            <Pressable
              key={route.key}
              onLayout={onTabLayout(route.key)}
              onPress={onPress}
              onLongPress={onLongPress}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
              testID={options.tabBarButtonTestID}
              style={styles.tab}
            >
              {/* The focused icon rides in the circle; keep its slot so labels stay aligned. */}
              <View style={{ opacity: focused && ready ? 0 : 1 }}>
                {options.tabBarIcon?.({ focused, color: colors.mutedForeground, size: ICON_SIZE })}
              </View>
              <Text
                variant="small"
                numberOfLines={1}
                className={`font-sans-medium text-center ${focused ? "text-primary" : "text-muted-foreground"}`}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.physical, { opacity: ready ? 1 : 0 }]}>
        <Animated.View style={[styles.circle, circleStyle]}>
          <Animated.View key={focusedKey} entering={ZoomIn.duration(220)}>
            {focusedOptions?.tabBarIcon?.({ focused: true, color: colors.primaryForeground, size: ICON_SIZE })}
          </Animated.View>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  physical: { direction: "ltr" },
  row: { flexDirection: "row", height: RISE + BAR_HEIGHT },
  tab: { flex: 1, alignItems: "center", gap: 4, paddingTop: RISE + 10 },
  circle: {
    position: "absolute",
    top: RISE - CIRCLE / 2,
    start: 0,
    width: CIRCLE,
    height: CIRCLE,
    borderRadius: CIRCLE / 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
});
