import React, { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { bossCombatantProfile, selfCombatantProfile } from './src/domain/battle';
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

type Screen =
  | { name: 'main' }
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
  const character = useActiveCharacter();
  const { showToast } = useNotifications();
  const [screen, setScreen] = useState<Screen>({ name: 'main' });

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  if (!hydrated) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  switch (screen.name) {
    case 'characters':
      return (
        <CharacterListScreen
          onBack={() => setScreen({ name: 'main' })}
          onOpenDetail={(defId) => setScreen({ name: 'characterDetail', defId })}
        />
      );
    case 'characterDetail':
      return (
        <CharacterDetailScreen defId={screen.defId} onBack={() => setScreen({ name: 'characters' })} />
      );
    case 'bossBattle': {
      const me = selfCombatantProfile(character.stats, character.evolutionStage);
      const speedEff = character.stats.speed;
      const boss = bossCombatantProfile(character.stage, speedEff);
      return (
        <BattleScreen
          title={`ステージ ${character.stage} ボス戦`}
          opponentName="ボス"
          me={me}
          opponent={boss}
          onFinished={(won) => {
            resolveBossBattle(character.defId, won);
            if (won) showToast(`ステージ${character.stage} クリア！`);
            setScreen({ name: 'main' });
          }}
        />
      );
    }
    case 'vsSelect':
      return (
        <VsOpponentSelectScreen
          onBack={() => setScreen({ name: 'main' })}
          onSelect={(opponent) => setScreen({ name: 'vsBattle', opponent })}
        />
      );
    case 'vsBattle': {
      const me = selfCombatantProfile(character.stats, character.evolutionStage);
      const opponentProfile = selfCombatantProfile(screen.opponent.stats, 2);
      return (
        <BattleScreen
          title="VSレース"
          opponentName={`対戦相手 (総合Lv. ${screen.opponent.totalLv.toFixed(1)})`}
          me={me}
          opponent={opponentProfile}
          onFinished={(won) => {
            resolveVsRace(vsRaceVicReward(screen.opponent.totalLv), won);
            showToast(won ? 'WIN' : 'LOSE');
            setScreen({ name: 'main' });
          }}
        />
      );
    }
    case 'main':
    default:
      return (
        <MainScreen
          onOpenCharacters={() => setScreen({ name: 'characters' })}
          onStartBossBattle={() => setScreen({ name: 'bossBattle' })}
          onOpenVsRace={() => setScreen({ name: 'vsSelect' })}
        />
      );
  }
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
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
});
