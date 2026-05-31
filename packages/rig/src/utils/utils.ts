/** UV -> 変形量のイージング関数 */
export type Curve = (t: number) => number;

/** ポーズを適用する範囲のガード型 */
export type Guard = (t: number) => boolean;

/**
 * キャラクター各部位の変形量を UV 座標から決定するイージング関数群
 */
export const curve = {
	power1: (t: number) => t,
	power2: (t: number) => t ** 2,
	power3: (t: number) => t ** 3,
	power4: (t: number) => t ** 4,
	arm: (t: number) => t ** 0.5,
} as const;

/** {@link getSpatialParams} の戻り値 */
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
 * UV 座標から各種空間パラメータを計算する。
 * PoseTransform 内でウェイト計算に使う。
 *
 * @param u - 水平方向の正規化座標 (0=左, 1=右)
 * @param v - 垂直方向の正規化座標 (0=上, 1=下)
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
