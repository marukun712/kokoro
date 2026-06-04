# @kokoro/rig

エンジニアファーストな人形キャラクター向けメッシュ変形ライブラリ

## コアコンセプト

キャラクターの PSD ファイルを読み込み、レイヤーを PIXI スプライトとして描画し、毎フレームの頂点変形でアニメーションさせます。

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

### `drawCharacter(layers)`

`PSDIndex[]` から PIXI スプライト (`SpriteNode[]`) を生成して返します。各スプライトは `PIXI.MeshPlane` で作られており、頂点変形が可能です。

```ts
const nodes = drawCharacter(layers);
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

### `pipe(...matchers)`

複数の `GroupMatcher` を結合します。いずれか1つでも `true` を返せばマッチとみなします。

```ts
pipe(byName("目_閉じ"), psdGroup("まつ毛"))
```

---

## KokoroGroup - まとめて操作

### `groupNodes(nodes, matcher)`

`GroupMatcher` でフィルタしたノードを `KokoroGroup` にまとめます。プロパティを変更すると全ノードの Container に一括反映されます。

```ts
const hair = groupNodes(nodes, psdGroup("前髪"));
hair.visible = false;
hair.alpha = 0.5;
hair.x = 10;
```

#### `KokoroGroup` プロパティ

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

## KokoroRig - メッシュ変形

`KokoroRig` はキャラクターの頂点を毎フレーム書き換えることでソフトボディ的な変形を実現するクラスです。各頂点を UV 座標 (u, v) に正規化してから `PoseTransform` を呼び出し、平行移動と回転を計算して頂点バッファに書き戻します。

```ts
const rig = new KokoroRig(nodes);
```

`parent` オプションで親リグを指定すると、親の `activeTransform` が子の変形に加算されます。体幹リグを親にして髪や腕に子リグを作ると、体幹の動きを受け継ぎながら部位ごとの独立した揺れを加えられます。

```ts
const bodyRig = new KokoroRig(bodyNodes);
const hairRig = new KokoroRig(hairNodes, { parent: bodyRig });
```

### `setPose(transforms)`

次フレームから適用するポーズをセットします。複数渡した場合はウェイト加算で合成されます。

```ts
rig.setPose([
  blender.lerp("left", "right", mouseX),
  blender.lerp("up", "down", mouseY),
]);
```

### `tick(time)`

毎フレーム呼び出して頂点変形を適用します。

```ts
app.ticker.add((ticker) => {
  rig.tick(timer.time);
});
```

#### `KokoroRig` のバウンディングボックス

コンストラクタ内でノード群の AABB が計算されます。

| プロパティ | 説明 |
|---|---|
| `minX`, `minY` | バウンディングボックスの左上座標 |
| `w`, `h` | バウンディングボックスの幅と高さ |

---

## Template と PoseTransform

`Template` はポーズ名をキーとする `PoseTransform` の辞書です。`PoseTransform` は `(u, v, t) => Transform` のシグネチャを持ち、頂点ごとの変形量を返す関数です。

#### `Transform` フィールド

| フィールド | 型 | 説明 |
|---|---|---|
| `tx`, `ty` | `number` | 平行移動量 (ピクセル) |
| `rot` | `number` (省略可) | 回転量 (ラジアン) |
| `pivot` | `{ u, v }` (省略可) | 回転の起点 (UV 座標)。`rot` と合わせて指定する |

```ts
const MY_TEMPLATE: Template = {
  left: (u, v) => {
    const { fromBottom } = getSpatialParams(u, v);
    return { tx: -100, ty: 0 };
  },
  tilt: (u, v) => {
    return { tx: 0, ty: 0, rot: 0.2, pivot: { u: 0.5, v: 1.0 } };
  },
};
```

---

## getSpatialParams と curve

### `getSpatialParams(u, v)`

UV 座標から頂点の空間的な位置パラメータを返します。`PoseTransform` 内でウェイト計算に使います。

| 戻り値フィールド | 説明 |
|---|---|
| `fromTop` | 上端に近いほど大きい値 (0=下, 1=上)。`1 - v` |
| `fromBottom` | 下端に近いほど大きい値 (0=上, 1=下)。`v` |
| `fromLeft` | 左端からの距離 (0=左, 1=右) |
| `fromRight` | 右端からの距離 (0=右, 1=左) |
| `fromCenterX` | 中心 X からのオフセット (-0.5~0.5) |
| `fromCenterY` | 中心 Y からの距離 (0=中心, 1=端) |
| `isUpperBody` | 上半身か否か (v < 0.5) |

### `curve`

イージング関数の辞書です。`getSpatialParams` で得た値をウェイトへ変換する際に使います。

| キー | イージング |
|---|---|
| `power1` | 線形 (t) |
| `power2` | 二乗 (t^2) |
| `power3` | 三乗 (t^3) |
| `power4` | 四乗 (t^4) |
| `arm` | 平方根 (t^0.5、腕向け) |

```ts
const { fromBottom } = getSpatialParams(u, v);
return { tx: -50, ty: 0 };
```

---

## RigTimer - 時間管理

`RigTimer` は経過時間を管理するタイマーです。コンストラクタに PIXI の `Ticker` を渡すと自動で時間を蓄積します。`speed` を変えることでパーツごとに独立した時間軸を持てます。

```ts
const timer = new RigTimer(app.ticker);        // speed=1.0 がデフォルト
const slowTimer = new RigTimer(app.ticker, 0.5);  // 半速

app.ticker.add(() => {
  rig.tick(timer.time);
});
```

| プロパティ | 説明 |
|---|---|
| `time` | 現在の経過時間 |

---

## PoseBlender - ポーズの補間

`Template` と `RigTimer` を受け取り、2つのポーズを線形補間した `PoseTransform` を返します。

```ts
const blender = new PoseBlender(MY_TEMPLATE, timer);

rig.setPose([
  blender.lerp("left", "right", mouseX),  // mouseX: 0~1
]);
```

### `lerp(from, to, t)`

`from` ポーズと `to` ポーズを `t` (0~1) で線形補間した `PoseTransform` を返します。

---

## KokoroFace - 表情制御

`KokoroFace` はレイヤーの表示 / 非表示の組み合わせで表情を管理するクラスです。

```ts
const face = new KokoroFace(nodes, ["目_閉じ", "口_あ"]);

face.apply({ "目_閉じ": true, "口_あ": false });  // 目を閉じる
```

コンストラクタに渡したレイヤー名ごとに `psdGroup` でグループが作成され、`apply` で一括切り替えします。
