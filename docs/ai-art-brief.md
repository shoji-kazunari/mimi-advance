# AI画像生成用 指示書(下絵・試作版)

ChatGPT(画像生成)の新しい会話に、下のメッセージを順番にそのまま貼って送ってください。
3つとも同じ会話の中で続けて送るのがポイントです(絵柄が揃いやすくなります)。

今回はあくまで「仮の一式」の試作(1体につき1枚だけ)。本番用の走り/ジャンプ/アタックの
ポーズ差分は、この試作の雰囲気を見てから改めて進めます。

---

## 1通目(最初に送る)

```
Style guide for a set of mobile game character illustrations (keep this consistent across every image I ask for next):

- Flat vector illustration, clean bold outlines, simple cel-shading (2-3 tone shading max)
- Cute, rounded, mascot-like proportions (chibi-ish, big head-to-body ratio), friendly and approachable
- Each character has two prominent rabbit/animal-like ears on top of the head as a signature feature
- Square canvas, 1024x1024px, transparent background (PNG), no ground shadow, no background scenery
- Character centered in frame with even padding on all sides, facing/leaning toward the right side of the frame (as if running rightward)
- Pose: standing mid-stride running pose, dynamic but simple silhouette, readable at very small sizes (as small as 40px)
- No text, no logos, no watermarks
```

## 2通目(同じ会話で続けて送る。ミミの絵)

```
Using the style guide above, illustrate "Mimi": a small pink rabbit-like mascot creature, main color #ff5d9e (bright pink), lighter pink or cream belly/muzzle accent, big round dark eyes, cheerful expression, two long pink ears standing up. Square canvas 1024x1024, transparent background, running pose facing right.
```

## 3通目(同じ会話で続けて送る。ボスの絵)

```
Using the style guide above, illustrate a "Boss" rival creature for the same game: a slightly bigger and bulkier rival mascot than Mimi, main color #ff9d3d (orange), same cute-but-slightly-more-intimidating mascot style, still rounded and friendly-looking (not scary), two ears in a different shape than Mimi's (e.g. shorter and rounder) to read as a different character at a glance. Square canvas 1024x1024, transparent background, running pose facing right.
```

---

## (任意)4通目: スズの絵がほしくなったら

```
Using the style guide above, illustrate "Suzu": a small mascot creature companion to Mimi, cool-toned main color (e.g. pale blue or silver #9fd8ff), same cute mascot style and proportions as Mimi but a distinct ear shape/pattern so the two are easy to tell apart at a glance. Square canvas 1024x1024, transparent background, running pose facing right.
```

---

## 出来上がったら

PNGファイル(背景透過)をそのまま渡してください。こちらで以下を行い、動いているところをお見せします。

1. 正方形の絵に合わせて表示ボックスを調整
2. `RunnerAvatar` / `OpponentEntity`(一覧・進化画面のアイコンも兼用)を、
   今の色付き図形から実際の画像に差し替え
3. 実機(ブラウザ)で動かして見た目を確認、Artifactに反映
