import { formatJP } from '../format';

describe('formatJP', () => {
  it('1万未満はカンマ区切りのまま', () => {
    expect(formatJP(0)).toBe('0');
    expect(formatJP(6)).toBe('6');
    expect(formatJP(9999)).toBe('9,999');
  });

  it('1万以上は万単位', () => {
    expect(formatJP(10000)).toBe('1.00万');
    expect(formatJP(52217.9)).toBe('5.22万');
    expect(formatJP(522179)).toBe('52.2万');
    expect(formatJP(9999999)).toBe('1000万');
  });

  it('1億以上は億単位', () => {
    expect(formatJP(1e8)).toBe('1.00億');
    expect(formatJP(1.5e8)).toBe('1.50億');
  });

  it('1兆以上は兆単位', () => {
    expect(formatJP(1e12)).toBe('1.00兆');
    expect(formatJP(2.6e12)).toBe('2.60兆');
  });

  it('負の値は符号を保持', () => {
    expect(formatJP(-522179)).toBe('-52.2万');
  });
});
