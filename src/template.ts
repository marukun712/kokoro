import { type Curve, curve, getSpatialParams } from "@kokoro/rig";

export const POSE_TEMPLATE = {
	left: (u: number, v: number) => {
		const { fromTop } = getSpatialParams(u, v);
		const w = curve.power2(fromTop);

		return {
			tx: -50 * w,
			ty: 0,
		};
	},

	right: (u: number, v: number) => {
		const { fromTop } = getSpatialParams(u, v);
		const w = curve.power2(fromTop);

		return {
			tx: 50 * w,
			ty: 0,
		};
	},

	up: (u: number, v: number) => {
		const { fromTop } = getSpatialParams(u, v);
		const chestCurve: Curve = (t: number) => Math.sin(t * Math.PI);
		const w = chestCurve(fromTop);

		return {
			tx: 0,
			ty: -20 * w,
		};
	},

	down: (u: number, v: number) => {
		const { fromTop } = getSpatialParams(u, v);
		const chestCurve: Curve = (t: number) => Math.sin(t * Math.PI);
		const w = chestCurve(fromTop);

		return {
			tx: 0,
			ty: 20 * w,
		};
	},
};

export const HAIR_TEMPLATE = {
	leftFront: (u: number, v: number) => {
		const { fromBottom } = getSpatialParams(u, v);

		return {
			tx: -50 * fromBottom,
			ty: 0,
		};
	},

	rightFront: (u: number, v: number) => {
		const { fromBottom } = getSpatialParams(u, v);

		return {
			tx: 50 * fromBottom,
			ty: 0,
		};
	},

	leftBack: (u: number, v: number) => {
		const { fromBottom } = getSpatialParams(u, v);

		return {
			tx: 10 * fromBottom,
			ty: 0,
		};
	},

	rightBack: (u: number, v: number) => {
		const { fromBottom } = getSpatialParams(u, v);

		return {
			tx: -10 * fromBottom,
			ty: 0,
		};
	},
};

export const SWING_TEMPLATE =
	(t: number, scale: number) => (u: number, v: number) => {
		const { fromBottom } = getSpatialParams(u, v);
		const w = curve.power2(fromBottom);
		const swing = Math.sin(t);

		return {
			tx: 0,
			ty: 0,
			rot: scale * swing * w,
			pivot: { u: 0.5, v: 0.0 },
		};
	};
