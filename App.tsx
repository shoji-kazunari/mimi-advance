import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { bossCombatantProfile, selfCombatantProfile } from './src/domain/battle';
import { highestLevelCharacter } from './src/domain/stats';
import { VsOpponent, vsRaceVicReward } from './src/domain/vsRace';
import { useGameStore } from './src/state/gameStore';
import { useActiveCharacter } from './src/state/selectors';
import { NotificationProvider, useNotifications } from './src/ui/Notifications';
import { BattleScreen } from './src/ui/screens/BattleScreen';
import { CharacterDetailScreen } from './src/ui/screens/CharacterDetailScreen';
import { CharacterListScreen } from './src/ui/screens/CharacterListScreen';
import { MainScreen } from './src/ui/screens/MainScreen';
import { VsOpponentSelectScreen } from './src/ui/screens/VsOpponentSelectScreen';
import { colors } from './src/ui/theme';

// 'main'はオーバーレイなし(MainScreenの素の表示)を表すだけで、実際のMainScreenは
// 常にマウントしたままにする。他の画面はすべてその上に重ねるオーバーレイとして扱う。
// 仕様書10章「ボスパネル(常設・レイアウトシフトしない)…バトル中はこのパネルの中身が
// スタミナゲージ表示に切り替わる」「黒フェードで通常表示に復帰」という記述が、
// バトルや一覧を別画面へ完全遷移するのではなく、メイン画面の上に被せる演出であることを
// 示しているため、この形にしている。
type Overlay =
  | { name: 'characters' }
  | { name: 'characterDetail'; defId: string }
  | { name: 'bossBattle' }
  | { name: 'vsSelect' }
  | { name: 'vsBattle'; opponent: VsOpponent };

function Root() {
  const hydrate = useGameStore((s) => s.hydrate);
  const hydrated = useGameStore((s) => s.hydrated);
  const resolveBossBattle = useGameStore((s) => s.resolveBossBattle);
  const resolveVsRace = useGameStore((s) => s.resolveVsRace);
  const characters = useGameStore((s) => s.state.characters);
  const character = useActiveCharacter();
  const { showToast } = useNotifications();
  const [overlay, setOverlay] = useState<Overlay | null>(null);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  // バトル用プロファイルは「その画面に入った瞬間」の値で固定する。overlay自体の参照は
  // 画面遷移のたびにしか変わらないため、これをキーにすることで、バトル中に他の理由で
  // Rootが再レンダーされても再生中のタイムラインが巻き戻らないようにしている。
  const bossBattleProfiles = useMemo(() => {
    if (overlay?.name !== 'bossBattle') return null;
    return {
      me: selfCombatantProfile(character.stats, character.evolutionStage),
      boss: bossCombatantProfile(character.stage),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overlay]);

  const vsBattleProfiles = useMemo(() => {
    if (overlay?.name !== 'vsBattle') return null;
    // 仕様書6章: VSレースは「操作中のキャラ」ではなく、所持キャラの中でキャラLv.が
    // 最も高いキャラの生ステータスを使う。
    const vsCharacter = highestLevelCharacter(characters) ?? character;
    return {
      me: selfCombatantProfile(vsCharacter.stats, vsCharacter.evolutionStage),
      opponentProfile: selfCombatantProfile(overlay.opponent.stats, 2),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [overlay]);

  if (!hydrated) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.shell}>
      <MainScreen
        onOpenCharacters={() => setOverlay({ name: 'characters' })}
        onStartBossBattle={() => setOverlay({ name: 'bossBattle' })}
        onOpenVsRace={() => setOverlay({ name: 'vsSelect' })}
      />

      {overlay?.name === 'characters' && (
        <View style={StyleSheet.absoluteFill}>
          <CharacterListScreen
            onBack={() => setOverlay(null)}
            onOpenDetail={(defId) => setOverlay({ name: 'characterDetail', defId })}
          />
        </View>
      )}

      {overlay?.name === 'characterDetail' && (
        <View style={StyleSheet.absoluteFill}>
          <CharacterDetailScreen defId={overlay.defId} onBack={() => setOverlay({ name: 'characters' })} />
        </View>
      )}

      {overlay?.name === 'vsSelect' && (
        <View style={StyleSheet.absoluteFill}>
          <VsOpponentSelectScreen
            onBack={() => setOverlay(null)}
            onSelect={(opponent) => setOverlay({ name: 'vsBattle', opponent })}
          />
        </View>
      )}

      {overlay?.name === 'bossBattle' && bossBattleProfiles && (
        <View style={StyleSheet.absoluteFill}>
          <BattleScreen
            title={`ステージ ${character.stage} ボス戦`}
            opponentName="ボス"
            me={bossBattleProfiles.me}
            opponent={bossBattleProfiles.boss}
            onFinished={(won) => {
              resolveBossBattle(character.defId, won);
              if (won) showToast(`ステージ${character.stage} クリア！`);
              setOverlay(null);
            }}
          />
        </View>
      )}

      {overlay?.name === 'vsBattle' && vsBattleProfiles && (
        <View style={StyleSheet.absoluteFill}>
          <BattleScreen
            title="VSレース"
            opponentName={`対戦相手 (総合Lv. ${overlay.opponent.totalLv.toFixed(1)})`}
            me={vsBattleProfiles.me}
            opponent={vsBattleProfiles.opponentProfile}
            onFinished={(won) => {
              resolveVsRace(vsRaceVicReward(overlay.opponent.totalLv), won);
              showToast(won ? 'WIN' : 'LOSE');
              setOverlay(null);
            }}
          />
        </View>
      )}
    </View>
  );
}

export default function App() {
  return (
    <NotificationProvider>
      <Root />
      <StatusBar style="auto" />
    </NotificationProvider>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
});
