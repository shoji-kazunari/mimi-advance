# AI画像生成用 指示書(本番仕様フルセット)

ChatGPT(画像生成)の新しい会話に、下のメッセージを**上から順番に**そのまま貼って送ってください。
全部同じ1つの会話の中で続けて送るのがポイントです(前の絵を見ながら作るので、キャラの
絵柄が最後まで揃いやすくなります)。

## 内容

1. **キャラ(ミミ・ボス)**: 1体につき9枚(走り3枚+ジャンプ3枚+アタック3枚)。
   2体で合計18枚 + 最初に貼る「共通スタイル」1通で、全19メッセージ
2. **背景(遠景・地面)**: 2枚(遠景1枚+地面1枚)。別の会話で、下の方にある
   専用の指示を使ってください(キャラとは絵柄の系統が違うので、会話を分けた方が作りやすいです)

キャラの9枚が揃うと、実際に「足が動いて走る」「ジャンプする」「アタックする」アニメーションを
作れます(今は同じ絵が上下にボフンと浮くだけなので、これが揃って初めて本当に動いて見えます)。
私の方は、揃ったら受け取った画像を3枚ずつ切り替えて再生するコードを作ります。

多少キャラの絵柄が回によってブレても大丈夫です(試作なので、後で気になった1枚だけ
作り直すこともできます)。

---

## 1通目: 共通スタイル(最初に送る)

```
Style guide for a set of mobile game character illustrations (keep this consistent across every image I ask for next):

- Flat vector illustration, clean bold outlines, simple cel-shading (2-3 tone shading max)
- Cute, rounded, mascot-like proportions (chibi-ish, big head-to-body ratio), friendly and approachable
- Each character has two prominent rabbit/animal-like ears on top of the head as a signature feature
- Square canvas, 1024x1024px, transparent background (PNG), no ground shadow, no background scenery
- Character centered in frame with even padding on all sides, facing/leaning toward the right side of the frame (as if running rightward)
- Readable silhouette even at very small sizes (as small as 40px)
- No text, no logos, no watermarks
```

---

## ミミ(2〜10通目)

### 2通目: 走り1枚目

```
Using the style guide above, illustrate "Mimi": a small pink rabbit-like mascot creature, main color #ff5d9e (bright pink), lighter pink or cream belly/muzzle accent, big round dark eyes, cheerful expression, two long pink ears standing up. Pose: running, contact pose — front leg reaching forward, back leg extended back, arms swinging opposite the legs. Square canvas 1024x1024, transparent background, facing right.
```

### 3通目: 走り2枚目

```
Same Mimi as above, same style and colors. Pose: running, passing pose — legs crossing under the body (mid-stride, most compact silhouette), arms close to the body. Square canvas 1024x1024, transparent background, facing right.
```

### 4通目: 走り3枚目

```
Same Mimi as above, same style and colors. Pose: running, contact pose mirrored — the opposite leg now reaching forward compared to the first running image, back leg extended back. Square canvas 1024x1024, transparent background, facing right.
```

### 5通目: ジャンプ1枚目(踏み切り)

```
Same Mimi as above, same style and colors. Pose: about to jump — crouching low, legs bent, arms pulled back, anticipation before leaping upward. Square canvas 1024x1024, transparent background, facing right.
```

### 6通目: ジャンプ2枚目(空中)

```
Same Mimi as above, same style and colors. Pose: mid-air at the peak of a jump — legs tucked up under the body, arms out to the sides for balance. Square canvas 1024x1024, transparent background, facing right.
```

### 7通目: ジャンプ3枚目(着地)

```
Same Mimi as above, same style and colors. Pose: landing — legs extended downward absorbing the impact, slight forward lean, arms coming back down. Square canvas 1024x1024, transparent background, facing right.
```

### 8通目: アタック1枚目(構え)

```
Same Mimi as above, same style and colors. Pose: attack wind-up — leaning back slightly, coiling the body, determined expression, gathering energy before lunging forward. Square canvas 1024x1024, transparent background, facing right.
```

### 9通目: アタック2枚目(発動)

```
Same Mimi as above, same style and colors. Pose: attack release — lunging forward with a quick tackle/headbutt-like motion, ears swept back, dynamic action pose. Square canvas 1024x1024, transparent background, facing right.
```

### 10通目: アタック3枚目(後隙)

```
Same Mimi as above, same style and colors. Pose: attack follow-through/recovery — settling back from the lunge toward a neutral running stance. Square canvas 1024x1024, transparent background, facing right.
```

---

## ボス(11〜19通目)

### 11通目: 走り1枚目

```
Using the style guide above, illustrate a "Boss" rival creature for the same game: a slightly bigger and bulkier rival mascot than Mimi, main color #ff9d3d (orange), same cute-but-slightly-more-intimidating mascot style, still rounded and friendly-looking (not scary), two ears in a different shape than Mimi's (shorter and rounder) so it reads as a different character at a glance. Pose: running, contact pose — front leg reaching forward, back leg extended back. Square canvas 1024x1024, transparent background, facing right.
```

### 12通目: 走り2枚目

```
Same Boss as above, same style and colors. Pose: running, passing pose — legs crossing under the body (mid-stride, most compact silhouette). Square canvas 1024x1024, transparent background, facing right.
```

### 13通目: 走り3枚目

```
Same Boss as above, same style and colors. Pose: running, contact pose mirrored — the opposite leg now reaching forward. Square canvas 1024x1024, transparent background, facing right.
```

### 14通目: ジャンプ1枚目(踏み切り)

```
Same Boss as above, same style and colors. Pose: about to jump — crouching low, legs bent, anticipation before leaping upward. Square canvas 1024x1024, transparent background, facing right.
```

### 15通目: ジャンプ2枚目(空中)

```
Same Boss as above, same style and colors. Pose: mid-air at the peak of a jump — legs tucked up under the body. Square canvas 1024x1024, transparent background, facing right.
```

### 16通目: ジャンプ3枚目(着地)

```
Same Boss as above, same style and colors. Pose: landing — legs extended downward absorbing the impact, slight forward lean. Square canvas 1024x1024, transparent background, facing right.
```

### 17通目: アタック1枚目(構え)

```
Same Boss as above, same style and colors. Pose: attack wind-up — leaning back slightly, coiling the body, gathering energy before lunging forward. Square canvas 1024x1024, transparent background, facing right.
```

### 18通目: アタック2枚目(発動)

```
Same Boss as above, same style and colors. Pose: attack release — lunging forward with a quick tackle-like motion, dynamic action pose. Square canvas 1024x1024, transparent background, facing right.
```

### 19通目: アタック3枚目(後隙)

```
Same Boss as above, same style and colors. Pose: attack follow-through/recovery — settling back toward a neutral running stance. Square canvas 1024x1024, transparent background, facing right.
```

---

## 背景(遠景・地面) — キャラとは別の会話で

トラックの背景は、同じ絵を横に2つ並べてループさせる仕組みが既に実装済みです。
なので必要なのは「横につなげても継ぎ目が分からない、横長のタイル画像」を2枚
(遠景1枚・地面1枚)用意することだけです。

今の実装だと遠景の高さは24px、地面の高さは4pxしかなく、絵を入れるには狭すぎるので、
画像が届いたらその2つの高さをもう少し広げます(足元の位置がズレないよう、
地面のラインはそのまま基準に保ちます)。なので下のプロンプトは、実際の表示より
余裕を持たせたサイズで作ってもらう指示にしています。

### 20通目: 遠景タイル

```
A seamless horizontally-tileable background strip for a mobile runner game, depicting a soft, distant skyline silhouette (rolling hills or a faint distant cityscape), very simple flat silhouette shapes with no fine detail (it will be shown small and semi-transparent in the final game). Muted dark purple tones (around #3a2c66 on a transparent or dark background). Wide horizontal canvas, 1536x256px. The left edge and right edge of the image must match up perfectly so the image can be tiled side by side with itself with no visible seam. No text, no characters, no ground line.
```

### 21通目: 地面タイル

```
A seamless horizontally-tileable ground/track texture strip for a mobile runner game, viewed from the side: a simple flat road or path surface with subtle texture, plus evenly spaced short dashed lane-marking lines along it. Dark purple tones (around #3a2c66) on a transparent or dark background, flat vector style. Wide horizontal canvas, 1536x128px. The left edge and right edge of the image must match up perfectly so the image can be tiled side by side with itself with no visible seam. No text, no characters.
```

seamless(継ぎ目なしタイル)の指示はAIが完璧に守れないことも多いです。左右の端が
微妙に合っていなくても、届けてもらえれば確認します(必要なら作り直しをお願いします)。

---

## 出来上がったら

- キャラ: 18枚のPNG(背景透過)をファイル名がわかるように渡してください
  (例: `mimi_run1.png` `mimi_run2.png` `mimi_run3.png` `mimi_jump1.png` ... `boss_attack3.png`
  のように、キャラ名・アクション名・番号が分かれば命名は何でも構いません)
- 背景: `bg_far.png`(遠景)、`bg_ground.png`(地面)の2枚

こちらで以下を行い、実際に動いているところをお見せします。

1. キャラ: 正方形の絵に合わせて表示ボックスを調整し、`RunnerAvatar` / `OpponentEntity` に
   「3枚を切り替えて再生する」仕組みを追加(今は同じ形が上下に浮くだけなので、ここが
   今回のコード側の主な作業になります)。走行中は走り3枚をループ、障害物を跳ぶ瞬間は
   ジャンプ3枚、アタック発動の瞬間はアタック3枚を、今の演出タイミングに合わせて再生
2. 背景: `TrackBackground`の遠景・地面レイヤーの高さを画像に合わせて広げ、
   今の色付き図形からタイル画像に差し替え
3. 実機(ブラウザ)で動かして見た目を確認、Artifactに反映
