import { useEffect, useState } from 'react';
import { Animated, StyleSheet } from 'react-native';

interface Props {
  text: string;
  onDone: () => void;
}

const DURATION_MS = 900;

/** ザコ追い抜き時に track 上へ「+10pt」のように浮き上がって消える演出(プロトタイプ準拠)。 */
export function FloatingPoint({ text, onDone }: Props) {
  const [anim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const animation = Animated.timing(anim, {
      toValue: 1,
      duration: DURATION_MS,
      useNativeDriver: true,
    });
    animation.start(({ finished }) => {
      if (finished) onDone();
    });
    return () => animation.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [0, -40] });
  const opacity = anim.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] });

  return (
    <Animated.Text style={[styles.text, { transform: [{ translateY }], opacity }]}>{text}</Animated.Text>
  );
}

const styles = StyleSheet.create({
  text: {
    position: 'absolute',
    top: '35%',
    alignSelf: 'center',
    color: '#3ee08a',
    fontSize: 20,
    fontWeight: '800',
  },
});
