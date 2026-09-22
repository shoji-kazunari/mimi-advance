import { View } from 'react-native';
import { colors } from '../theme';

interface Props {
  size?: number;
  color?: string;
  /** trueで完全に黒塗りにする(進化プレビューの「???」未確定シルエット用)。 */
  silhouette?: boolean;
}

/**
 * キャラ一覧・進化・着せ替え画面で使う簡易アイコン(耳が2本立った丸いシルエット)。
 * 「耳アド」のロゴモチーフに寄せた図形で、実素材が無い間の仮アイコンとして使う。
 */
export function EarAvatar({ size = 56, color = colors.accent, silhouette = false }: Props) {
  const fill = silhouette ? '#000' : color;
  const earWidth = size * 0.28;
  const earHeight = size * 0.6;
  const headSize = size * 0.82;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'flex-end' }}>
      <View
        style={{
          flexDirection: 'row',
          position: 'absolute',
          top: 0,
          width: size,
          justifyContent: 'space-between',
          paddingHorizontal: size * 0.1,
        }}
      >
        <View
          style={{
            width: earWidth,
            height: earHeight,
            borderRadius: earWidth / 2,
            backgroundColor: fill,
            transform: [{ rotate: '-16deg' }],
          }}
        />
        <View
          style={{
            width: earWidth,
            height: earHeight,
            borderRadius: earWidth / 2,
            backgroundColor: fill,
            transform: [{ rotate: '16deg' }],
          }}
        />
      </View>
      <View style={{ width: headSize, height: headSize, borderRadius: headSize / 2, backgroundColor: fill }} />
    </View>
  );
}
