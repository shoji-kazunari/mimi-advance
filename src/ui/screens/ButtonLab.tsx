import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { statUpgradeCost } from '../../domain/stats';
import { StatKey } from '../../domain/types';
import { StatCard } from '../components/StatCard';
import { colors } from '../theme';

const STATS: StatKey[] = ['speed', 'stamina', 'guts'];

interface LabState {
  levels: Record<string, number>;
  runnerPt: number;
}

/**
 * 手触り確認用の最小ページ。ゲーム本体とは独立して、トレーニングボタンだけを置いている。
 * 本体から探さなくても、開いてすぐ長押し/連打を試せるようにするためのもの。
 * (シェルHTML側で window.__MIMI_LAB__ を立てたときだけ表示される)
 */
export function ButtonLab() {
  const [lab, setLab] = useState<LabState>({
    levels: { speed: 1.0, stamina: 1.0, guts: 1.0 },
    runnerPt: 120,
  });

  const upgrade = (stat: StatKey) => {
    setLab((prev) => {
      const cost = statUpgradeCost(stat, prev.levels[stat]);
      if (prev.runnerPt < cost) return prev;
      return {
        levels: { ...prev.levels, [stat]: Math.round((prev.levels[stat] + 0.1) * 10) / 10 },
        runnerPt: prev.runnerPt - cost,
      };
    });
  };

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>ボタン手触りテスト</Text>

      <View style={styles.walletRow}>
        <View style={styles.walletChip}>
          <Text style={styles.walletLabel}>ランナーpt</Text>
          <Text style={styles.walletValue}>{Math.floor(lab.runnerPt).toLocaleString()}</Text>
        </View>
        <Pressable
          style={styles.refill}
          onPress={() => setLab((prev) => ({ ...prev, runnerPt: prev.runnerPt + 1000 }))}
        >
          <Text style={styles.refillText}>+1,000pt</Text>
        </Pressable>
      </View>

      <View style={styles.grid}>
        {STATS.map((stat) => (
          <StatCard
            key={stat}
            statKey={stat}
            level={lab.levels[stat]}
            cost={statUpgradeCost(stat, lab.levels[stat])}
            locked={false}
            atCap={false}
            runnerPt={lab.runnerPt}
            onUpgrade={() => upgrade(stat)}
          />
        ))}
        <StatCard
          statKey="technique"
          level={1.0}
          cost={null}
          locked
          lockedHint="進化2で解放"
          atCap={false}
          runnerPt={lab.runnerPt}
          onUpgrade={() => {}}
        />
        <StatCard
          statKey="damage"
          level={1.0}
          cost={null}
          locked
          lockedHint="進化3で解放"
          atCap={false}
          runnerPt={lab.runnerPt}
          onUpgrade={() => {}}
        />
        {/* ptが足りないときの見え方の確認用(試作版のスピードLv.11.0=789ptと同じ状態) */}
        <StatCard
          statKey="speed"
          level={11.0}
          cost={789}
          locked={false}
          atCap={false}
          runnerPt={lab.runnerPt}
          onUpgrade={() => {}}
        />
      </View>

      <Text style={styles.note}>
        ・長押しで連打します{'\n'}
        ・ptが足りないボタンは暗くなって押せません(右下がその例){'\n'}
        ・拡大鏡(虫めがね)が出なければOK
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, padding: 16, gap: 14, justifyContent: 'center' },
  title: { color: colors.text, fontSize: 18, fontWeight: '800' },
  walletRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  walletChip: { flex: 1, backgroundColor: colors.cardInset, borderRadius: 12, padding: 10, alignItems: 'center' },
  walletLabel: { fontSize: 12, color: colors.subtext },
  walletValue: { fontSize: 20, fontWeight: '800', color: colors.gold },
  refill: { backgroundColor: colors.card, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
  refillText: { color: colors.text, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 10, rowGap: 10 },
  note: { color: colors.subtext, fontSize: 12, lineHeight: 20 },
});
