import { curve, getSpatialParams, type Template } from "@kokoro/rig";

export const POSE_TEMPLATE: Template = {
	left: (u, v) => {
		const { fromLeft, fromTop } = getSpatialParams(u, v);
		const w = curve.body(fromTop);
		// ベースの移動量
		const baseTx = -150;
		// 横向きっぽい視差のため、中心のメッシュを追加で引き伸ばす
		const center = Math.sin(fromLeft * Math.PI) * 30;
		const fakeParallax = -10 * center;

		return {
			tx: baseTx + fakeParallax,
			ty: 0,
			w: w,
		};
	},
	right: (u, v) => {
		const { fromLeft, fromTop } = getSpatialParams(u, v);
		const w = curve.body(fromTop);
		const baseTx = 150;
		const center = Math.sin(fromLeft * Math.PI) * 30;
		const fakeParallax = 10 * center;

		return {
			tx: baseTx + fakeParallax,
			ty: 0,
			w: w,
		};
	},
	up: (u, v) => {
		const { fromTop } = getSpatialParams(u, v);
		const w = curve.body(fromTop);
		return {
			tx: 0,
			ty: -150,
			w: w,
		};
	},
	down: (u, v) => {
		const { fromTop } = getSpatialParams(u, v);
		const w = curve.body(fromTop);
		return {
			tx: 0,
			ty: 0,
			w: w,
		};
	},
};

export const HAIR_TEMPLATE: Template = {
	swing: (u, v, t) => {
		const { fromBottom } = getSpatialParams(u, v);
		// sin揺れ
		const swing = Math.sin(t * 0.05);
		return {
			tx: 0,
			ty: 0,
			rot: 0.05 * swing,
			pivot: { u: 0.5, v: 0.0 },
			w: curve.body(fromBottom),
		};
	},
	// 移動量に差をつけることで視差をつくる
	leftFront: (u, v) => {
		const { fromBottom } = getSpatialParams(u, v);
		return { tx: -20, ty: 0, w: curve.body(fromBottom) };
	},
	rightFront: (u, v) => {
		const { fromBottom } = getSpatialParams(u, v);
		return { tx: 20, ty: 0, w: curve.body(fromBottom) };
	},
	leftBack: (u, v) => {
		const { fromBottom } = getSpatialParams(u, v);
		return { tx: 10, ty: 0, w: curve.body(fromBottom) };
	},
	rightBack: (u, v) => {
		const { fromBottom } = getSpatialParams(u, v);
		return { tx: -10, ty: 0, w: curve.body(fromBottom) };
	},
};

export const SWING_TEMPLATE: Template = {
	swing: (u, v, t) => {
		const { fromBottom } = getSpatialParams(u, v);
		// sin揺れ
		const swing = Math.sin(t * 0.05);
		const w = curve.arm(fromBottom);
		return {
			tx: 0,
			ty: 0,
			rot: 0.02 * swing,
			pivot: { u: 0.5, v: 0.0 },
			w: w,
		};
	},
};

export const EYE_TEMPLATE: Template = {
	left: (u, v) => {
		const { fromLeft } = getSpatialParams(u, v);
		return { tx: -10, ty: 0, w: fromLeft };
	},
	right: (u, v) => {
		const { fromLeft } = getSpatialParams(u, v);
		return { tx: 10, ty: 0, w: fromLeft };
	},
	up: (u, v) => {
		const { fromTop } = getSpatialParams(u, v);
		return { tx: 0, ty: 5, w: fromTop };
	},
	down: (u, v) => {
		const { fromBottom } = getSpatialParams(u, v);
		return { tx: 0, ty: -5, w: fromBottom };
	},
};
