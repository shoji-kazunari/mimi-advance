@AGENTS.md

# 耳アド(MIMI ADVANCE)

複数キャラ(ランナー)を育成しながら自動走行でザコを追い抜き、ボス戦・VSレースで
Vicマネーを稼いで強化していく放置系育成レースゲーム。

- **仕様の一次資料は `docs/spec.md`。** 数値・計算式・UI仕様はすべてここに従う。
  実装中に仕様と食い違う挙動を見つけたら、コードではなく先にこのファイルを疑う
- claude.ai上のプロトタイプ(HTML/JS単一ファイル)が仕様確定の実験台だった。
  `docs/spec.md` に書かれていない細部の挙動判断に迷ったら、プロトタイプのソースも参照する
- バトル(ボス戦・VSレース)は**開始時に全結果を計算してから再生するタイムラインベースの
  決定論的シミュレーション**。演出のスキップで結果が変わってはいけない
- サーバーは前提にしない。ランキング等の非同期対戦要素は現状ダミーデータ(仕様書 11章)

## ディレクトリ構成

- `src/domain/` … ロジックと数式(ステート管理・UIを一切知らない純粋関数)。Jestテストあり
- `src/state/` … Zustandストア(AsyncStorageへ永続化)。ドメイン層の関数を呼び出すだけの薄い層
- `src/ui/` … 画面・コンポーネント・カスタムフック
- `App.tsx`(ルート)は「キャラ一覧・詳細・VSレース選択・VS戦」をオーバーレイとして重ねる
  常設シェル。**MainScreenは常にマウントされたまま**で、他画面はその上に被さる
  (仕様書10章のボスパネルが「常設・レイアウトシフトしない」ことに合わせている)
- **ボス戦だけ例外**: MainScreen自身がボスパネルの中身をその場でスタミナゲージ表示に
  切り替える(`BossPanelBattle`)。VSレースは独立イベントとして全画面の黒フェード演出
  (`BattleScreen`)をRoot側で管理する。両者ともバトル再生ロジックは
  `src/ui/hooks/useBattlePlayback.ts` を共用する

## Web版の配信(GitHub Pages)

- `main`へのpushで`.github/workflows/deploy-pages.yml`が自動的に
  `npx expo export -p web`→`tools/fix-web-export-paths.js`→GitHub Pagesへデプロイする
- `expo export -p web`は`index.html`/JSバンドルにルート直下前提の絶対パス
  (`/favicon.ico`、`/_expo/static/js/web/....js`、`"/assets/assets/....png"`)を埋め込む。
  GitHub Pagesのプロジェクトサイトは`https://<user>.github.io/<repo>/`のようにサブパス配信に
  なるため、そのままだとアセットが404になる。`tools/fix-web-export-paths.js`が相対パスに
  書き換えることで、サブパス配信・独自ドメインどちらでも動くようにしている
- **リポジトリ設定でGitHub Pagesを有効化する初回作業が必要**(Settings → Pages → Source を
  「GitHub Actions」にする)。これはAPIから叩けないため手動
- 独自ドメインを持たせるときは、パチンコシミュレーターの`gijipachi.jp`と同じ要領で
  リポジトリ直下に`CNAME`ファイルを置く(Pages側のカスタムドメイン設定と両方揃えること)
- ローカルでビルド結果を確認したいときは`npm run build:web`→`dist/`をブラウザで開く

## 実装上の注意(踏んだ地雷)

- 画面遷移用のコールバック(`onFinished`など)を`useEffect`の依存配列にそのまま入れると、
  親の無関係な再レンダー(ザコの自動追い抜きなど)のたびに再実行され、
  `useRef`の「開始済みガード」と組み合わさった一回限りのタイマーが再登録されずに
  演出が止まったままになる。コールバックは`useRef`で最新値を保持し、依存配列には入れない
- `GaugeBar`はルートに`width:'100%'`を持つ。flexDirection:'row'の中で他要素と横並びに
  置くときは、ラップ側に`flex:1`を与えないと「残り幅」ではなく「親の幅」基準で広がって
  隣の要素と重なる
