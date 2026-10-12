import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Animated,
  Easing,
  Platform,
  AccessibilityInfo,
} from 'react-native';
import { useTheme } from '../lib/theme';

const USE_NATIVE_DRIVER = Platform.OS !== 'web';

interface AnimatedDigitProps {
  digit: string;
  color: string;
  fontSize?: number;
  reducedMotion: boolean;
}

function AnimatedDigit({
  digit,
  color,
  fontSize = 18,
  reducedMotion,
}: AnimatedDigitProps) {
  const [currentDigit, setCurrentDigit] = useState(digit);
  const [prevDigit, setPrevDigit] = useState<string | null>(null);
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (digit !== currentDigit) {
      if (reducedMotion) {
        setCurrentDigit(digit);
        setPrevDigit(null);
        return;
      }

      setPrevDigit(currentDigit);
      setCurrentDigit(digit);
      anim.setValue(0);

      Animated.timing(anim, {
        toValue: 1,
        duration: 200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: USE_NATIVE_DRIVER,
      }).start(() => {
        setPrevDigit(null);
      });
    }
  }, [digit, currentDigit, anim, reducedMotion]);

  const digitStyle = {
    fontFamily: 'Manrope_600SemiBold',
    fontSize,
    color,
    fontVariant: ['tabular-nums' as const],
    textAlign: 'center' as const,
  };

  const slotWidth = Math.round(fontSize * 0.72);
  const slotHeight = Math.round(fontSize * 1.35);

  if (prevDigit === null || reducedMotion) {
    return (
      <View style={[styles.digitSlot, { width: slotWidth, height: slotHeight }]}>
        <Text style={digitStyle}>{currentDigit}</Text>
      </View>
    );
  }

  const prevTranslateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -3.5],
  });
  const prevOpacity = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });

  const currTranslateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [3.5, 0],
  });
  const currOpacity = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  return (
    <View style={[styles.digitSlot, { width: slotWidth, height: slotHeight }]}>
      <Animated.View
        style={[
          styles.digitInner,
          {
            transform: [{ translateY: prevTranslateY }],
            opacity: prevOpacity,
          },
        ]}
      >
        <Text style={digitStyle}>{prevDigit}</Text>
      </Animated.View>
      <Animated.View
        style={[
          styles.digitInner,
          {
            transform: [{ translateY: currTranslateY }],
            opacity: currOpacity,
          },
        ]}
      >
        <Text style={digitStyle}>{currentDigit}</Text>
      </Animated.View>
    </View>
  );
}

function parseHmToMinutes(hm?: string): number {
  if (!hm || !hm.includes(':')) return 0;
  const [h, m] = hm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

interface PrayerCountdownProps {
  targetTime?: string; // "HH:MM" e.g. "18:42"
  color?: string;
  separatorColor?: string;
  fontSize?: number;
  /** Fires once when the countdown crosses zero (next prayer arrived). */
  onExpire?: () => void;
}

export function PrayerCountdown({
  targetTime,
  color,
  separatorColor,
  fontSize = 18,
  onExpire,
}: PrayerCountdownProps) {
  const { colors } = useTheme();
  const activeColor = color ?? colors.accent;
  const activeSeparatorColor = separatorColor ?? colors.textMuted;
  const [reducedMotion, setReducedMotion] = useState(false);
  const expiredRef = useRef(false);
  const [digits, setDigits] = useState<{
    h1: string;
    h2: string;
    m1: string;
    m2: string;
    s1: string;
    s2: string;
  }>({
    h1: '0',
    h2: '0',
    m1: '0',
    m2: '0',
    s1: '0',
    s2: '0',
  });

  useEffect(() => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
        setReducedMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
      }
    } else {
      AccessibilityInfo.isReduceMotionEnabled()
        .then((val) => setReducedMotion(!!val))
        .catch(() => {});
    }
  }, []);

  useEffect(() => {
    function compute() {
      if (!targetTime) return;
      const now = new Date();
      const nowMin = now.getHours() * 60 + now.getMinutes();
      let targetMin = parseHmToMinutes(targetTime);
      if (targetMin <= nowMin) targetMin += 1440;
      const diffMs = (targetMin - nowMin) * 60000 - now.getSeconds() * 1000;

      if (diffMs <= 0) {
        setDigits({ h1: '0', h2: '0', m1: '0', m2: '0', s1: '0', s2: '0' });
        if (!expiredRef.current) {
          expiredRef.current = true;
          onExpire?.();
        }
        return;
      }
      expiredRef.current = false;

      const totalSec = Math.floor(diffMs / 1000);
      const h = Math.floor(totalSec / 3600);
      const m = Math.floor((totalSec % 3600) / 60);
      const s = totalSec % 60;

      const hStr = String(Math.min(99, h)).padStart(2, '0');
      const mStr = String(m).padStart(2, '0');
      const sStr = String(s).padStart(2, '0');

      setDigits({
        h1: hStr[0],
        h2: hStr[1],
        m1: mStr[0],
        m2: mStr[1],
        s1: sStr[0],
        s2: sStr[1],
      });
    }

    compute();
    const interval = setInterval(compute, 1000);
    return () => clearInterval(interval);
  }, [targetTime]);

  const separatorStyle = {
    fontFamily: 'Manrope_600SemiBold',
    fontSize: fontSize * 0.9,
    color: activeSeparatorColor,
    marginHorizontal: 3,
  };

  return (
    <View
      style={styles.container}
      accessibilityRole="text"
      accessibilityLiveRegion="polite"
      accessibilityLabel={`Countdown ${digits.h1}${digits.h2}:${digits.m1}${digits.m2}:${digits.s1}${digits.s2}`}
    >
      {/* Hours */}
      <View style={styles.unitPair}>
        <AnimatedDigit
          digit={digits.h1}
          color={activeColor}
          fontSize={fontSize}
          reducedMotion={reducedMotion}
        />
        <AnimatedDigit
          digit={digits.h2}
          color={activeColor}
          fontSize={fontSize}
          reducedMotion={reducedMotion}
        />
      </View>

      <Text style={separatorStyle}>:</Text>

      {/* Minutes */}
      <View style={styles.unitPair}>
        <AnimatedDigit
          digit={digits.m1}
          color={activeColor}
          fontSize={fontSize}
          reducedMotion={reducedMotion}
        />
        <AnimatedDigit
          digit={digits.m2}
          color={activeColor}
          fontSize={fontSize}
          reducedMotion={reducedMotion}
        />
      </View>

      <Text style={separatorStyle}>:</Text>

      {/* Seconds */}
      <View style={styles.unitPair}>
        <AnimatedDigit
          digit={digits.s1}
          color={activeColor}
          fontSize={fontSize}
          reducedMotion={reducedMotion}
        />
        <AnimatedDigit
          digit={digits.s2}
          color={activeColor}
          fontSize={fontSize}
          reducedMotion={reducedMotion}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    // RTL: keep H:M:S order LTR — RTL would flip the row and render S:M:H
    direction: 'ltr',
  },
  unitPair: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  digitSlot: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  digitInner: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
