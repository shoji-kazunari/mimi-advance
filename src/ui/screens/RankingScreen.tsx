import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { RANKING_CATEGORIES, RankingCategory, VS_WIN_RATE_MIN_ATTEMPTS, weekKey } from '../../domain/ranking';
import {
  fetchTopByStage,
  fetchTopByTotalLevel,
  fetchTopByVsWinRate,
  fetchTopWeekly,
  PlayerBoardEntry,
  WeeklyBoardEntry,
} from '../../firebase/ranking';
import { colors } from '../theme';

interface Props {
  onBack: () => void;
}

type Row = { username: string; value: string };
type Result =
  | { category: RankingCategory; kind: 'ok'; rows: Row[] }
  | { category: RankingCategory; kind: 'error' };

async function loadRows(category: RankingCategory): Promise<Row[]> {
  if (category === 'stage') {
    const rows = await fetchTopByStage();
    return rows.map((r: PlayerBoardEntry) => ({ username: r.username, value: `ステージ ${r.stage}` }));
  }
  if (category === 'totalLevel') {
    const rows = await fetchTopByTotalLevel();
    return rows.map((r: PlayerBoardEntry) => ({ username: r.username, value: `Lv.${r.totalLevel.toFixed(1)}` }));
  }
  if (category === 'vsWinRate') {
    const rows = await fetchTopByVsWinRate(weekKey(new Date()));
    return rows.map((r: WeeklyBoardEntry) => ({
      username: r.username,
      value: `${Math.round((r.vsWins / r.vsAttempts) * 100)}% (${r.vsWins}/${r.vsAttempts})`,
    }));
  }
  const rows = await fetchTopWeekly(weekKey(new Date()));
  return rows.map((r: WeeklyBoardEntry) => ({ username: r.username, value: `${Math.floor(r.earnedPt)}pt` }));
}

export function RankingScreen({ onBack }: Props) {
  const [category, setCategory] = useState<RankingCategory>('stage');
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadRows(category)
      .then((rows) => {
        if (cancelled) return;
        setResult({ category, kind: 'ok', rows });
      })
      .catch(() => {
        if (cancelled) return;
        setResult({ category, kind: 'error' });
      });
    return () => {
      cancelled = true;
    };
  }, [category]);

  // resultがまだ今のcategory分に追いついていない間は「読み込み中」として扱う
  // (useEffect内でsetState('loading')を呼ぶのではなく、レンダー中に導出する)。
  const current = result?.category === category ? result : null;
  const loadState: 'loading' | 'ok' | 'error' = current ? current.kind : 'loading';
  const rows = current?.kind === 'ok' ? current.rows : [];

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Pressable onPress={onBack}>
          <Text style={styles.back}>← 戻る</Text>
        </Pressable>
        <Text style={styles.title}>🏆 ランキング</Text>
        <View style={{ width: 48 }} />
      </View>

      <View style={styles.tabs}>
        {RANKING_CATEGORIES.map((c) => (
          <Pressable
            key={c.key}
            style={[styles.tab, category === c.key && styles.tabActive]}
            onPress={() => setCategory(c.key)}
          >
            <Text style={[styles.tabText, category === c.key && styles.tabTextActive]}>{c.label}</Text>
          </Pressable>
        ))}
      </View>

      {category === 'vsWinRate' && (
        <Text style={styles.note}>※ 今週(月曜リセット)に{VS_WIN_RATE_MIN_ATTEMPTS}戦以上した人のみ対象</Text>
      )}
      {category === 'weeklyPt' && <Text style={styles.note}>※ 今週(月曜リセット)の獲得ptだけを集計</Text>}

      {loadState === 'loading' && <Text style={styles.status}>読み込み中...</Text>}
      {loadState === 'error' && <Text style={styles.status}>読み込めませんでした。通信状態を確認してください。</Text>}
      {loadState === 'ok' && rows.length === 0 && <Text style={styles.status}>まだ記録がありません。</Text>}

      {loadState === 'ok' && rows.length > 0 && (
        <FlatList
          data={rows}
          keyExtractor={(_, i) => String(i)}
          contentContainerStyle={{ padding: 16, gap: 8 }}
          renderItem={({ item, index }) => (
            <View style={styles.row}>
              <Text style={styles.rank}>{index + 1}</Text>
              <Text style={styles.name} numberOfLines={1}>
                {item.username}
              </Text>
              <Text style={styles.value}>{item.value}</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16 },
  back: { color: colors.primary, width: 48 },
  title: { fontSize: 16, fontWeight: '700', color: colors.text },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16 },
  tab: { backgroundColor: colors.cardInset, borderRadius: 999, paddingVertical: 8, paddingHorizontal: 14 },
  tabActive: { backgroundColor: colors.primary },
  tabText: { color: colors.subtext, fontSize: 12, fontWeight: '700' },
  tabTextActive: { color: '#fff' },
  note: { color: colors.subtext, fontSize: 11, paddingHorizontal: 16, paddingTop: 8 },
  status: { color: colors.subtext, textAlign: 'center', marginTop: 24 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 14,
  },
  rank: { width: 28, color: colors.gold, fontWeight: '800', textAlign: 'right' },
  name: { flex: 1, color: colors.text, fontWeight: '700' },
  value: { color: colors.subtext, fontWeight: '700' },
});
