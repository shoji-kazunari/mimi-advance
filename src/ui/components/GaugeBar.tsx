import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';
import { colors } from '../theme';

interface Props {
  ratio: number; // 0..1
  color?: string;
  /** 指定すると単色の代わりに左→右のグラデーションで塗る(プロトタイプのゲージ表現)。 */
  gradient?: [string, string];
  height?: number;
}

export function GaugeBar({ ratio, color = colors.primary, gradient, height = 14 }: Props) {
  const clamped = Math.max(0, Math.min(1, ratio));
  return (
    <View style={[styles.track, { height, borderRadius: height / 2 }]}>
      <View style={[styles.fillWrapper, { width: `${clamped * 100}%`, borderRadius: height / 2 }]}>
        {gradient ? (
          <LinearGradient
            colors={gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.fill}
          />
        ) : (
          <View style={[styles.fill, { backgroundColor: color }]} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: '100%',
    backgroundColor: colors.cardInset,
    overflow: 'hidden',
  },
  fillWrapper: {
    height: '100%',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    width: '100%',
  },
});
