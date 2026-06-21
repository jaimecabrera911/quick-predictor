import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, Keyframe } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

const DURATION = 1400;

const overlayKeyframe = new Keyframe({
  0: {
    opacity: 1,
  },
  65: {
    opacity: 1,
  },
  100: {
    opacity: 0,
    easing: Easing.out(Easing.cubic),
  },
});

const logoKeyframe = new Keyframe({
  0: {
    opacity: 0,
    transform: [{ scale: 0.92 }],
  },
  35: {
    opacity: 1,
    transform: [{ scale: 1 }],
    easing: Easing.out(Easing.cubic),
  },
  100: {
    opacity: 1,
    transform: [{ scale: 1 }],
  },
});

export function AnimatedSplashOverlay() {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  return (
    <Animated.View
      entering={overlayKeyframe.duration(DURATION).withCallback((finished) => {
        'worklet';
        if (finished) {
          scheduleOnRN(setVisible, false);
        }
      })}
      style={styles.overlay}
    >
      <Animated.View entering={logoKeyframe.duration(DURATION * 0.5)}>
        <Image
          source={require('@/assets/images/logo.png')}
          style={styles.logo}
          contentFit="contain"
        />
      </Animated.View>
    </Animated.View>
  );
}

export function AnimatedIcon() {
  return (
    <View style={styles.iconWrap}>
      <Image
        source={require('@/assets/images/logo.png')}
        style={styles.logo}
        contentFit="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  iconWrap: {
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 24,
  },
  logo: {
    width: 300,
    height: 130,
  },
});
