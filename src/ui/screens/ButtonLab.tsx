import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { StatCard } from '../components/StatCard';
import { colors } from '../theme';

/**
 * 手触り確認用の最小ページ。ゲーム本体とは独立して、トレーニングボタンだけを置いている。
 * 本体アプリから探さなくても、開いてすぐ長押し/連打を試せるようにするためのもの。
 * (シェルHTML側で window.__MIMI_LAB__ を立てたときだけ表示される)
 */
export function ButtonLab() {
  const [levels, setLevels] = useState([1.0, 1.0, 1.0]);

  const bump = (i: number) => {
    setLevels((prev) => prev.map((v, idx) => (idx === i ? Math.round((v + 0.1) * 10) / 10 : v)));
  };

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>ボタン手触りテスト</Text>
      <Text style={styles.note}>長押しで連打されます。拡大鏡(虫めがね)が出なければOK。</Text>

      <View style={styles.row}>
        <StatCard
          statKey="speed"
          level={levels[0]}
          cost={8}
          locked={false}
          atCap={false}
          onUpgrade={() => bump(0)}
        />
        <StatCard
          statKey="stamina"
          level={levels[1]}
          cost={3}
          locked={false}
          atCap={false}
          onUpgrade={() => bump(1)}
        />
        <StatCard
          statKey="guts"
          level={levels[2]}
          cost={3}
          locked={false}
          atCap={false}
          onUpgrade={() => bump(2)}
        />
      </View>

      <Text style={styles.note}>
        ロック中の見え方も確認用に1枚置いています(Lv.表示とボタンの両方が暗くなるか)。
      </Text>
      <View style={styles.row}>
        <StatCard
          statKey="technique"
          level={1.0}
          cost={null}
          locked
          lockedHint="進化2で解放"
          atCap={false}
          onUpgrade={() => {}}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, padding: 16, gap: 14, justifyContent: 'center' },
  title: { color: colors.text, fontSize: 18, fontWeight: '800' },
  note: { color: colors.subtext, fontSize: 12, lineHeight: 18 },
  row: { flexDirection: 'row', columnGap: 10, rowGap: 10, flexWrap: 'wrap' },
});
