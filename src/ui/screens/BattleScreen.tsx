import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BattleTimeline, CombatantProfile, simulateBattle, staminaAtTime } from '../../domain/battle';
import { GaugeBar } from '../components/GaugeBar';
import { colors } from '../theme';

interface Props {
  title: string;
  opponentName: string;
  me: CombatantProfile;
  opponent: CombatantProfile;
  onFinished: (won: boolean) => void;
}

const PLAYBACK_TICK_MS = 50;

export function BattleScreen({ title, opponentName, me, opponent, onFinished }: Props) {
  const timeline: BattleTimeline = useMemo(() => simulateBattle(me, opponent), [me, opponent]);
  const [elapsed, setElapsed] = useState(0);
  const [done, setDone] = useState(false);
  const finishedRef = useRef(false);

  useEffect(() => {
    const id = setInterval(() => {
      setElapsed((prev) => {
        const next = prev + PLAYBACK_TICK_MS;
        if (next >= timeline.outcome.endedAtMs) {
          clearInterval(id);
          setDone(true);
          return timeline.outcome.endedAtMs;
        }
        return next;
      });
    }, PLAYBACK_TICK_MS);
    return () => clearInterval(id);
  }, [timeline]);

  useEffect(() => {
    if (done && !finishedRef.current) {
      finishedRef.current = true;
      const timer = setTimeout(() => onFinished(timeline.outcome.winner === 'me'), 1600);
      return () => clearTimeout(timer);
    }
  }, [done, timeline, onFinished]);

  const frame = staminaAtTime(timeline, elapsed);
  const sprinting = elapsed < me.sprintDurationMs;

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>{title}</Text>

      <View style={styles.combatantBlock}>
        <Text style={styles.name}>自分{sprinting ? ' ⚡全力疾走' : ''}</Text>
        <GaugeBar ratio={frame.meStamina / timeline.meMaxStamina} color={colors.primary} height={20} />
        <Text style={styles.staminaText}>
          {Math.max(0, Math.round(frame.meStamina))} / {Math.round(timeline.meMaxStamina)}
        </Text>
      </View>

      <View style={styles.combatantBlock}>
        <Text style={styles.name}>{opponentName}</Text>
        <GaugeBar ratio={frame.opponentStamina / timeline.opponentMaxStamina} color={colors.danger} height={20} />
        <Text style={styles.staminaText}>
          {Math.max(0, Math.round(frame.opponentStamina))} / {Math.round(timeline.opponentMaxStamina)}
        </Text>
      </View>

      {!done ? (
        <Pressable
          style={styles.skipButton}
          onPress={() => {
            setElapsed(timeline.outcome.endedAtMs);
            setDone(true);
          }}
        >
          <Text style={styles.skipButtonText}>スキップ</Text>
        </Pressable>
      ) : (
        <Text style={styles.resultBanner}>
          {timeline.outcome.winner === 'me' ? '勝利！' : timeline.outcome.reason === 'timeout' ? '判定負け…' : '逃げられた…'}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background, padding: 20, gap: 24, justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '800', color: colors.text, textAlign: 'center' },
  combatantBlock: { gap: 8 },
  name: { fontSize: 15, fontWeight: '700', color: colors.text },
  staminaText: { color: colors.subtext, textAlign: 'right' },
  skipButton: { alignSelf: 'center', backgroundColor: colors.card, borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10 },
  skipButtonText: { color: colors.subtext },
  resultBanner: { fontSize: 26, fontWeight: '800', textAlign: 'center', color: colors.text },
});
