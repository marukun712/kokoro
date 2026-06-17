import type { SpriteNode } from "../image/psd";
import { type Group, groupNodes, psdGroup } from "../rig/matcher";
import type { Pose, Rig } from "../rig/rig";

/**
 * `t` (0~1) を受け取りイージング後の値を返す関数型。
 * `getSpatialParams` の戻り値をウェイトへ変換する際に使う。
 */
export type Curve = (t: number) => number;

/** `t` を受け取り条件を満たすか返す関数型。ポーズの適用範囲を限定するガード条件に使う。 */
export type Guard = (t: number) => boolean;

/** べき乗イージング関数の辞書。`getSpatialParams` の戻り値に適用してウェイトを調整する。 */
export const curve = {
	power2: (t: number) => t ** 2,
	power3: (t: number) => t ** 3,
	power4: (t: number) => t ** 4,
} as const;

/**
 * {@link getSpatialParams} の戻り値。
 * `Pose` 内のウェイト計算に使う。
 * `fromCenterX` は -0.5~0.5、`isUpperBody` は boolean、その他は 0~1 の範囲。
 */
export interface SpatialParams {
	fromTop: number;
	fromBottom: number;
	fromLeft: number;
	fromRight: number;
	fromCenterX: number;
	fromCenterY: number;
	isUpperBody: boolean;
}

/**
 * UV 座標から頂点の空間的な位置パラメータを計算する。
 * `Pose` 内でウェイト計算に使う。
 *
 * @param u - 水平方向の UV 座標 (0=左, 1=右)
 * @param v - 垂直方向の UV 座標 (0=上, 1=下)
 */
export function getSpatialParams(u: number, v: number): SpatialParams {
	return {
		fromTop: 1 - v,
		fromBottom: v,
		fromLeft: u,
		fromRight: 1 - u,
		fromCenterX: u - 0.5,
		fromCenterY: Math.abs(0.5 - v) * 2,
		isUpperBody: v < 0.5,
	};
}

/**
 * 2つの `Pose` を `t` (0~1) で線形補間した `Pose` を返す。
 *
 * @param a - 補間元のポーズ (t=0)
 * @param b - 補間先のポーズ (t=1)
 * @param t - 補間係数 (0~1)
 */
export function lerpPose(a: Pose, b: Pose, t: number): Pose {
	return (u: number, v: number) => {
		const ta = a(u, v);
		const tb = b(u, v);

		const tx = ta.tx + (tb.tx - ta.tx) * t;
		const ty = ta.ty + (tb.ty - ta.ty) * t;

		const rotA = ta.rot ?? 0;
		const rotB = tb.rot ?? 0;
		const rot = rotA + (rotB - rotA) * t;

		const pivotA = ta.pivot ?? tb.pivot;
		const pivotB = tb.pivot ?? ta.pivot;

		if (pivotA && pivotB) {
			return {
				tx,
				ty,
				rot,
				pivot: {
					u: pivotA.u + (pivotB.u - pivotA.u) * t,
					v: pivotA.v + (pivotB.v - pivotA.v) * t,
				},
			};
		}

		return { tx, ty };
	};
}

/**
 * レイヤーの表示 / 非表示の組み合わせで表情などを管理するクラス。
 * コンストラクタに渡したレイヤー名ごとに `psdGroup` でグループを作成し、`apply` で一括切り替えする。
 */
export class Switcher {
	private groups: Record<string, Group>;

	/**
	 * @param nodes      - 検索対象のノード一覧
	 * @param layerNames - 管理するレイヤー名の配列
	 */
	constructor(nodes: SpriteNode[], layerNames: string[]) {
		this.groups = Object.fromEntries(
			layerNames.map((name) => [name, groupNodes(nodes, psdGroup(name))]),
		);
	}

	/**
	 * レイヤーの表示状態を一括で切り替える。
	 *
	 * @param def - レイヤー名をキー、表示状態を値とするオブジェクト
	 */
	apply(def: Record<string, boolean>) {
		for (const [name, visible] of Object.entries(def)) {
			this.groups[name].visible = visible;
		}
	}
}

/**
 * 親リグの UV 空間で定義されたポーズを、子リグの UV 空間に変換して返す。
 *
 * @param child  - 変換先の子リグ
 * @param parent - 変換元の親リグ
 * @param pose   - 親の UV 空間で定義されたポーズ
 */
export function follow(child: Rig, parent: Rig, pose: Pose): Pose {
	return (u, v) =>
		pose(
			(child.minX + u * child.w - parent.minX) / parent.w,
			(child.minY + v * child.h - parent.minY) / parent.h,
		);
}

/**
 * 親リグのポーズを子リグに継承させながら、子リグ固有のポーズを追加して適用するヘルパーを返す。
 *
 * @param parent      - 親リグ
 * @param parentPoses - 親に適用中のポーズ配列
 * @returns `(child, localPoses) => void` の関数
 */
export function withParent(
	parent: Rig,
	parentPoses: Pose[],
): (child: Rig, localPoses: Pose[]) => void {
	return (child: Rig, localPoses: Pose[]) =>
		child.apply([
			...parentPoses.map((p) => follow(child, parent, p)),
			...localPoses,
		]);
}
