/**
 * @react-native-async-storage/async-storage はESM形式でしか配布されておらず、
 * このプロジェクトのjest(ts-jest, node環境)ではrequireできない。
 * テストではRNネイティブ実装が不要なので、最小限のインメモリ実装で代替する。
 */
const store = new Map<string, string>();

export default {
  getItem: async (key: string) => store.get(key) ?? null,
  setItem: async (key: string, value: string) => {
    store.set(key, value);
  },
  removeItem: async (key: string) => {
    store.delete(key);
  },
  clear: async () => {
    store.clear();
  },
};
