import { OfflineProgress } from '../../domain/offline';
import { formatDurationJP, offlineReportMessage } from '../format';

describe('formatDurationJP', () => {
  it('時間と分で表す(秒以下は切り捨て)', () => {
    expect(formatDurationJP(45 * 60 * 1000)).toBe('45分');
    expect(formatDurationJP(2 * 60 * 60 * 1000)).toBe('2時間');
    expect(formatDurationJP((3 * 60 + 20) * 60 * 1000 + 59 * 1000)).toBe('3時間20分');
  });
});

describe('offlineReportMessage', () => {
  const base: OfflineProgress = {
    countedMs: 90 * 60 * 1000,
    capped: false,
    passes: 12,
    runnerPt: 240,
    reachedBoss: false,
  };

  it('経過時間・追い抜いた数・稼いだptを含む', () => {
    const message = offlineReportMessage(base);
    expect(message).toContain('1時間30分');
    expect(message).toContain('12体');
    expect(message).toContain('240pt');
    expect(message).not.toContain('ボス');
    expect(message).not.toContain('最大8時間');
  });

  it('ボスに到達していれば知らせる', () => {
    expect(offlineReportMessage({ ...base, reachedBoss: true })).toContain('ボスが出現しています');
  });

  it('8時間の上限で切り捨てたときは、その旨を添える', () => {
    expect(offlineReportMessage({ ...base, capped: true })).toContain('最大8時間');
  });
});
