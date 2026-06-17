# @kokoro/rig
[![JSR](https://jsr.io/badges/@kokoro/rig)](https://jsr.io/@kokoro/rig)

エンジニアファーストな人形キャラクター向けメッシュ変形ライブラリ

## DEMO

https://github.com/marukun712/kokoro

---

## コンセプト

3D・2D 問わず、キャラクターのアニメーションには一般的にボーン構造が使われます。ボーンはアニメータにとってなじみ深い概念ですが、エンジニアにとっては必ずしもそうではありません。

`@kokoro/rig` は別のアプローチをとります。キャラクターを構成する全スプライトのメッシュ頂点を、一本の数値配列として扱います。「キャラクターを動かす」とは、この配列を毎フレーム書き換えることです。

### 変形の基本単位 - Pose

変形の基本単位は `Pose` という純粋関数です。

```ts
type Pose = (u: number, v: number) => Transform;
```

各頂点の UV 座標を受け取り変形量を返すだけの関数なので、テスト・合成・補間が容易です。「上半身ほど大きく動く」「毛先ほどよく揺れる」といった位置に連動した変形も、UV 座標をウェイトとして使うことで1つの関数に収められます。

複数の `Pose` はウェイト加算で合成され、`lerpPose` で線形補間もできます。これにより、マウス座標やオーディオの振幅といった数値から変形を駆動するアニメーションを、関数の組み合わせだけで構成できます。

```ts
rig.apply([
  lerpPose(TEMPLATE.left, TEMPLATE.right, mouseX),
  lerpPose(TEMPLATE.up,   TEMPLATE.down,  mouseY),
]);
```

部位ごとに `Rig` を分けて `withParent` で親子関係を持たせることで、体幹の動きを髪や腕に継承させながら、それぞれ独立した揺れを加えることもできます。

### 深度推定変形 - Pose の拡張

この `Pose` 体系の上に、深度推定を使った視差変形モジュールがあります。

Depth Anything V2 がキャラクター画像から奥行き情報を推定し、手前にある部位ほど大きく動く視差ポーズを自動生成します。生成されたポーズは通常の `Pose` と同じ形なので、`lerpPose` や `withParent` とそのまま組み合わせられます。

```ts
const depthResult = await getDepth(container, app.renderer);
const DEPTH = DEPTH_TEMPLATE(depthResult.sampleDepth, 80, 80);

rig.apply([
  lerpPose(DEPTH.left, DEPTH.right, mouseX),
  lerpPose(DEPTH.up,   DEPTH.down,  mouseY),
]);
```

---

## インストール

```bash
npx jsr add @kokoro/rig
```

API リファレンスは [`packages/rig`](./packages/rig) を参照してください。
