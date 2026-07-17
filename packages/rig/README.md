# @kokoro/rig

エンジニアのための2Dキャラクターメッシュ変形ライブラリ

## コアコンセプト

`@kokoro/rig`は、エンジニアのための2Dキャラクターメッシュ変形ライブラリです。既存のツール・ライブラリはGUI操作を前提としており、表現としては豊かなものの、GUI・概念の学習コストが高く、すぐにキャラクターを動かすことができません。本ライブラリでは、キャラクターの変形に複雑な概念を用いません。キャラクターの変形は、すべて`(u,v) => 変形量`の関数として記述されます。ポーズの合成・補完も、関数を合成するような感覚で実装できます。
さらに、深度推定モジュールと組み合わせることで、深度情報に基づいて各頂点の変形量が自動でスケールされます。

---

## インストール

```bash
npx jsr add @kokoro/rig
```

---

## Canvas の初期化

### `setupCanvas(parent)`

PIXI Application を初期化して DOM に追加します。

```ts
const app = await setupCanvas(document.body);
```

---

## PSD の読み込みと描画

### `walkPSD(url, visible?)`

PSD ファイルを取得してレイヤーを再帰的に走査し、末端レイヤーをフラットな `PSDIndex[]` として返します。

```ts
const layers = await walkPSD("/models/character.psd");
```

`visible` オプションでロード時にレイヤーの表示状態を上書きできます。

```ts
const layers = await walkPSD("/models/character.psd", {
  show: psdGroup("衣装A"),
  hide: psdGroup("衣装B"),
});
```

#### `PSDIndex`

| プロパティ | 型 | 説明 |
|---|---|---|
| `name` | `string` | レイヤー名 |
| `path` | `string[]` | ルートからのパス |
| `canvas` | `HTMLCanvasElement` | ag-psd が生成したキャンバス |
| `x`, `y` | `number` | レイヤーの左上座標 |
| `clipping` | `boolean` | クリッピングマスク対象か |
| `hidden` | `boolean` | 非表示レイヤーか |

### `drawPSD(layers, verticesX?, verticesY?)`

`PSDIndex[]` から PIXI スプライト (`SpriteNode[]`) を生成して返します。各スプライトは `PIXI.MeshPlane` で作られており、頂点変形が可能です。

| 引数 | 型 | 説明 |
|---|---|---|
| `layers` | `PSDIndex[]` | `walkPSD` の戻り値 |
| `verticesX` | `number` | メッシュの水平分割数 (デフォルト: `250`) |
| `verticesY` | `number` | メッシュの垂直分割数 (デフォルト: `250`) |

```ts
const nodes = drawPSD(layers);
for (const node of nodes) {
  app.stage.addChild(node.container);
}
```

#### `SpriteNode`

| プロパティ | 型 | 説明 |
|---|---|---|
| `name` | `string` | レイヤー名 |
| `path` | `string[]` | ルートからのパス |
| `container` | `PIXI.Container` | スプライトを包む Container |
| `sprite` | `PIXI.MeshPlane` | メッシュ変形可能なスプライト本体 |

### `drawPNG(url, verticesX?, verticesY?)`

PNG ファイルを取得して単一の `SpriteNode[]` として返します。PSD を使わない場合に使用します。

| 引数 | 型 | 説明 |
|---|---|---|
| `url` | `string` | PNG ファイルの URL |
| `verticesX` | `number` | メッシュの水平分割数 (デフォルト: `250`) |
| `verticesY` | `number` | メッシュの垂直分割数 (デフォルト: `250`) |

```ts
const nodes = await drawPNG("/models/character.png");
app.stage.addChild(nodes[0].container);
```

---

## レイヤーの絞り込み (GroupMatcher)

`GroupMatcher` はノードを受け取って `boolean` を返す関数型です。`groupNodes` や `walkPSD` の絞り込み条件として使います。

### `byName(name)`

レイヤー名が完全一致するノードにマッチします。

```ts
byName("目_デフォルト")
```

### `byPath(path)`

パスの末尾が指定した配列と一致するノードにマッチします。

```ts
byPath(["顔", "眉"])  // path が [..., "顔", "眉"] で終わるノード
```

### `psdGroup(groupName, negative?)`

指定したグループ名をパスに含むノードにマッチします。`negative` に指定したグループ名を含むノードは除外されます。

```ts
psdGroup("前髪")                    // "前髪" を含む全レイヤー
psdGroup("髪", ["前髪", "横髪"])    // "髪" を含むが "前髪" "横髪" を含まないレイヤー
```

### `or(...matchers)`

複数の `GroupMatcher` を結合します。いずれか1つでも `true` を返せばマッチとみなします。

```ts
or(byName("目_閉じ"), psdGroup("まつ毛"))
```

---

## Group - まとめて操作

### `groupNodes(nodes, matcher)`

`GroupMatcher` でフィルタしたノードを `Group` にまとめます。プロパティを変更すると全ノードの Container に一括反映されます。

```ts
const hair = groupNodes(nodes, psdGroup("前髪"));
hair.visible = false;
hair.alpha = 0.5;
hair.x = 10;
```

#### `Group` プロパティ

| プロパティ | 型 | 説明 |
|---|---|---|
| `nodes` | `SpriteNode[]` | グループに含まれるノード一覧 |
| `x` | `number` | 全ノードの X 座標 |
| `y` | `number` | 全ノードの Y 座標 |
| `alpha` | `number` | 全ノードのアルファ値 |
| `visible` | `boolean` | 全ノードの表示状態 |
| `scaleX` | `number` | 全ノードの X スケール |
| `scaleY` | `number` | 全ノードの Y スケール |

---

## Rig - メッシュ変形

`Rig` はキャラクターの頂点を毎フレーム書き換えることでソフトボディ的な変形を実現するクラスです。各頂点を UV 座標 (u, v) に正規化してから `Pose` を呼び出し、平行移動と回転を計算して頂点バッファに書き戻します。

```ts
const rig = new Rig(nodes);
```

### `apply(poses)`

ポーズを適用して頂点変形を行います。複数渡した場合はウェイト加算で合成されます。毎フレーム呼び出してください。

```ts
app.ticker.add(() => {
  rig.apply([
    lerpPose(TEMPLATE.left, TEMPLATE.right, mouseX),
    lerpPose(TEMPLATE.up, TEMPLATE.down, mouseY),
  ]);
});
```

#### `Rig` のバウンディングボックス

コンストラクタ内でノード群の AABB が計算されます。

| プロパティ | 説明 |
|---|---|
| `minX`, `minY` | バウンディングボックスの左上座標 |
| `w`, `h` | バウンディングボックスの幅と高さ |

---

## Pose と Transform

`Pose` は `(u, v) => Transform` のシグネチャを持つ純粋関数で、頂点ごとの変形量を返します。

#### `Transform` フィールド

| フィールド | 型 | 説明 |
|---|---|---|
| `tx`, `ty` | `number` | 平行移動量 (ピクセル) |
| `rot` | `number` (省略可) | 回転量 (ラジアン) |
| `pivot` | `{ u, v }` (省略可) | 回転の起点 (UV 座標)。`rot` と合わせて指定する |

```ts
const left: Pose = (u, v) => {
  const { fromBottom } = getSpatialParams(u, v);
  return { tx: -100 * fromBottom, ty: 0 };
};

const tilt: Pose = (u, v) => {
  return { tx: 0, ty: 0, rot: 0.2, pivot: { u: 0.5, v: 1.0 } };
};
```

---

## getSpatialParams と curve

### `getSpatialParams(u, v)`

UV 座標から頂点の空間的な位置パラメータを返します。`Pose` 内でウェイト計算に使います。

戻り値の型は `SpatialParams` です。

#### `SpatialParams`

| フィールド | 型 | 説明 |
|---|---|---|
| `fromTop` | `number` | 上端に近いほど大きい値 (0=下, 1=上)。`1 - v` |
| `fromBottom` | `number` | 下端に近いほど大きい値 (0=上, 1=下)。`v` |
| `fromLeft` | `number` | 左端からの距離 (0=左, 1=右) |
| `fromRight` | `number` | 右端からの距離 (0=右, 1=左) |
| `fromCenterX` | `number` | 中心 X からのオフセット (-0.5~0.5) |
| `fromCenterY` | `number` | 中心 Y からの距離 (0=中心, 1=端) |
| `isUpperBody` | `boolean` | 上半身か否か (v < 0.5) |

### `curve`

イージング関数の辞書です。`getSpatialParams` で得た値をウェイトへ変換する際に使います。型は `Curve = (t: number) => number` です。

| キー | イージング |
|---|---|
| `power2` | 二乗 (t^2) |
| `power3` | 三乗 (t^3) |
| `power4` | 四乗 (t^4) |

```ts
const { fromBottom } = getSpatialParams(u, v);
return { tx: -50 * curve.power2(fromBottom), ty: 0 };
```

### 型エイリアス

| 型 | シグネチャ | 説明 |
|---|---|---|
| `Curve` | `(t: number) => number` | イージング関数。`getSpatialParams` の戻り値をウェイトへ変換する際に使う |
| `Guard` | `(t: number) => boolean` | 条件を満たすか返す述語関数。ポーズの適用範囲を限定するガード条件に使う |

---

## lerpPose - ポーズの補間

2つの `Pose` を `t` (0~1) で線形補間した `Pose` を返します。

```ts
rig.apply([
  lerpPose(TEMPLATE.left, TEMPLATE.right, mouseX),
  lerpPose(TEMPLATE.up, TEMPLATE.down, mouseY),
]);
```

---

## Animation - キーフレームアニメーション

```ts
import { loop, seq } from "@kokoro/rig";
```

### 型

#### `Animation`

```ts
type Animation = (t: number) => Pose[];
```

絶対秒数 `t` を受け取り、そのフレームで適用する `Pose[]` を返す関数型です。`Rig.apply` に渡せる形式を返します。

#### `Clip`

| フィールド | 型 | 説明 |
|---|---|---|
| `duration` | `number` | このクリップの再生時間 (秒) |
| `pose` | `Pose` | 遷移先のポーズ |
| `ease` | `(t: number) => number` (省略可) | 補間係数 (0~1) を変換するイージング関数。省略時は線形 |

### `loop(anim, duration)`

`anim` を `duration` 秒周期でループする `Animation` を返します。

| 引数 | 型 | 説明 |
|---|---|---|
| `anim` | `Animation` | ループさせる元のアニメーション |
| `duration` | `number` | ループ周期 (秒) |

```ts
const looped = loop(seq([
  { duration: 0.5, pose: POSE_A },
  { duration: 0.5, pose: POSE_B },
]), 1.0);

app.ticker.add(() => {
  rig.apply(looped(app.ticker.lastTime / 1000));
});
```

### `seq(clips)`

`Clip[]` のキーフレーム列を順番に補間する `Animation` を返します。各クリップは「前のポーズからこのポーズへ `duration` 秒かけて遷移する」を意味します。先頭クリップの遷移元は末尾クリップのポーズになるため、`loop` と組み合わせると自然につながります。

| 引数 | 型 | 説明 |
|---|---|---|
| `clips` | `Clip[]` | キーフレームの配列 |

```ts
const breathe = loop(seq([
  { duration: 1.0, pose: POSE_EXHALE, ease: curve.power2 },
  { duration: 1.0, pose: POSE_INHALE, ease: curve.power2 },
]), 2.0);
```

---

## 親子リグ - withParent / follow

`withParent` を使うと、親リグのポーズを子リグに継承させながら、子リグ固有のポーズを追加できます。

```ts
const bodyRig = new Rig(bodyNodes);
const hairRig = new Rig(hairNodes);

const apply = withParent(bodyRig, rootPoses);
apply(hairRig, [SWING_POSE]);
```

`follow(child, parent, pose)` は、親の UV 空間で定義されたポーズを子リグの UV 空間に変換して返します。`withParent` は内部でこれを使っています。

---

## Switcher - レイヤー表示切替

`Switcher` はレイヤーの表示 / 非表示の組み合わせで表情などを管理するクラスです。

```ts
const switcher = new Switcher(nodes, ["目_閉じ", "口_あ"]);

switcher.apply({ "目_閉じ": true, "口_あ": false });
```

コンストラクタに渡したレイヤー名ごとに `psdGroup` でグループが作成され、`apply` で一括切り替えします。

---

## 深度推定変形

`@kokoro/rig/depth`は、深度推定に基づいて各頂点の変形量をスケールさせるモジュールです。

```ts
import { getDepth, DEPTH_TEMPLATE } from "@kokoro/rig/depth";
```

### `getDepth(container, renderer, model?)`

PIXI の Container をキャプチャして深度推定を行い、`DepthResult` を返します。推論は Web Worker 上で動作します。

| 引数 | 型 | 説明 |
|---|---|---|
| `container` | `PIXI.Container` | キャプチャ対象 |
| `renderer` | `PIXI.Renderer` | ピクセル抽出に使用 |
| `model` | `DepthModelSize` | モデルサイズ (デフォルト: `"base"`) |

#### `DepthModelSize`

```ts
type DepthModelSize = "small" | "base" | "large";
```

```ts
const depthResult = await getDepth(container, app.renderer);
```

#### `DepthResult`

| プロパティ | 型 | 説明 |
|---|---|---|
| `getDepthFromUV` | `(u, v) => number` | UV 座標から深度値 (0~1) を取得する関数 |
| `details.data` | `Uint8Array` | 深度マップの生ピクセルデータ |
| `details.width`, `details.height` | `number` | 深度マップのサイズ |

### `DEPTH_TEMPLATE(depthFunc, scaleX, scaleY)`

深度マップを使って左右・上下の視差ポーズを生成します。`TEMPLATE` と同じ形で `lerpPose` に渡せます。

```ts
const DEPTH = DEPTH_TEMPLATE(depthResult.getDepthFromUV, 80, 80);

rig.apply([
  lerpPose(DEPTH.left, DEPTH.right, mouseX),
  lerpPose(DEPTH.up, DEPTH.down, mouseY),
]);
```
