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
- 自前サーバーは持たない。VSレースの対戦相手はダミー生成のままだが、ランキング(到達ステージ・
  総合Lv.・今週の獲得pt・VSレース勝率)はFirebase(Firestore)をブラウザから直接読み書きする形で
  実データ化している(仕様書6章、下記「Firebase」節)

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

- `main`へのpushで`.github/workflows/deploy-pages.yml`が自動的に`npm run build:web`
  (`expo export -p web`→`tools/fix-web-export-paths.js`→`tools/inject-analytics.js`→
  `tools/add-privacy-page.js`)を実行し、GitHub Pagesへデプロイする
- **アクセス解析(GA4)** … 測定IDは`site.config.json`の1か所にだけ書く。`inject-analytics.js`が
  ビルド後の`index.html`にタグを差し込む。外部へ送る項目(解析・広告など)を増やしたら、
  必ず`tools/privacy.html`(公開URLは`<サイト>/privacy/`)も直すこと
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

## Firebase(ランキング用。解析は別で導入済み、下記参照)

- プロジェクト「MimiAdvance」(パチンコシミュレーターとは別プロジェクト、同じGoogleアカウント)
- 設定は`src/firebase/config.ts`に直書き。ウェブ向けapiKeyは公開情報でアクセス制御は
  Firestoreのセキュリティルール側の役目なので、リポジトリにコミットして問題ない
- `src/firebase/init.ts`がFirebase App/Firestore(`db`)/Auth(`auth`)を初期化する
- **アクセス解析にはFirebase Analyticsを使わない。** GA4は`tools/inject-analytics.js`の
  軽量な`gtag.js`直埋め込み方式ですでに導入済みで、Firebase Analytics SDKを別途
  読み込むと測定IDが二重(別のGA4プロパティ)になりバンドルサイズも増えるだけなので、
  Firebaseプロジェクト作成時に自動発行されたAnalyticsストリームは使わずに残してある
- **プレイヤー識別は匿名認証(`src/firebase/auth.ts`のensureSignedIn)。** ドキュメントIDに
  ランダムな自己申告IDを使うと、認証なしでは「他人のドキュメントを誰でも上書きできる」
  状態になってしまう。匿名認証のuidをドキュメントIDにし、セキュリティルールで
  `request.auth.uid == playerId`を要求することで、自分の記録しか書けないようにしている。
  **Firebaseコンソールで Authentication → Sign-in method → 匿名 を有効にする初回作業が必要**
  (Firestore有効化・GitHub Pages有効化と同様、APIから叩けないため手動)
- **`firestore.rules`(リポジトリ直下)をFirebaseコンソールのFirestore → ルール タブに
  手動で貼って公開する必要がある。** クライアントSDKからは反映できない
- `src/domain/ranking.ts`(純粋関数・週キー計算・妥当性チェック)→`src/firebase/ranking.ts`
  (Firestore読み書き)→`src/ui/hooks/useRankingSync.ts`(30秒おきに自動送信、失敗は握りつぶす)
  →`src/ui/screens/RankingScreen.tsx`(4タブのランキング表示)という構成
- ランキングの値の正しさ(不正な値でないか)は`MAX_PLAUSIBLE_*`定数と`firestore.rules`の
  両方で上限チェックしているが、サーバーを持たないため「本当にゲームが計算したか」自体は
  検証できない。デバッグパネル(`🐞`、`window.__MIMI_LAB__`未設定時は非表示)経由の
  pt/Vic加算がランキング値に乗らないよう、加算経路を`addRunnerPt`1箇所に絞ってあるので、
  ランナーpt周りに新しい加算処理を足すときはそこを通すこと

## 実装上の注意(踏んだ地雷)

- 画面遷移用のコールバック(`onFinished`など)を`useEffect`の依存配列にそのまま入れると、
  親の無関係な再レンダー(ザコの自動追い抜きなど)のたびに再実行され、
  `useRef`の「開始済みガード」と組み合わさった一回限りのタイマーが再登録されずに
  演出が止まったままになる。コールバックは`useRef`で最新値を保持し、依存配列には入れない
- `GaugeBar`はルートに`width:'100%'`を持つ。flexDirection:'row'の中で他要素と横並びに
  置くときは、ラップ側に`flex:1`を与えないと「残り幅」ではなく「親の幅」基準で広がって
  隣の要素と重なる
- MainScreenの🐞デバッグパネル(pt/Vic加算・ステージ進行)は`window.__MIMI_LAB__`が
  立っていない通常の公開ビルドでは常に非表示にする(`src/ui/devMode.ts`の`isDevBuild`)。
  ランキング機能を入れる前はガードが無く、誰でも押せる状態で公開されていた
  (見た目に出ないだけで、直したのはランキング機能を意味あるものにするため)
