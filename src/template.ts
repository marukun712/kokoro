import {
	type Curve,
	curve,
	getSpatialParams,
	type Template,
} from "@kokoro/rig";

export const POSE_TEMPLATE: Template = {
	left: (u, v) => {
		const { fromTop } = getSpatialParams(u, v);
		const w = curve.power2(fromTop);

		return {
			tx: -100 * w,
			ty: 0,
		};
	},

	right: (u, v) => {
		const { fromTop } = getSpatialParams(u, v);
		const w = curve.power2(fromTop);

		return {
			tx: 100 * w,
			ty: 0,
		};
	},

	up: (u, v) => {
		const { fromTop } = getSpatialParams(u, v);
		const chestCurve: Curve = (t: number) => Math.sin(t * Math.PI);
		const w = chestCurve(fromTop);

		return {
			tx: 0,
			ty: -40 * w,
		};
	},

	down: (u, v) => {
		const { fromTop } = getSpatialParams(u, v);
		const chestCurve: Curve = (t: number) => Math.sin(t * Math.PI);
		const w = chestCurve(fromTop);

		return {
			tx: 0,
			ty: 40 * w,
		};
	},
};

export const HAIR_TEMPLATE: Template = {
	swing: (u, v, t) => {
		const { fromBottom } = getSpatialParams(u, v);
		const swing = Math.sin(t * 0.05);
		const w = curve.power1(fromBottom);

		return {
			tx: 0,
			ty: 0,
			rot: 0.05 * swing * w,
			pivot: { u: 0.5, v: 0.0 },
		};
	},

	leftFront: (u, v) => {
		const { fromBottom } = getSpatialParams(u, v);
		const w = curve.power1(fromBottom);

		return {
			tx: -20 * w,
			ty: 0,
		};
	},

	rightFront: (u, v) => {
		const { fromBottom } = getSpatialParams(u, v);
		const w = curve.power1(fromBottom);

		return {
			tx: 20 * w,
			ty: 0,
		};
	},

	leftBack: (u, v) => {
		const { fromBottom } = getSpatialParams(u, v);
		const w = curve.power1(fromBottom);

		return {
			tx: 10 * w,
			ty: 0,
		};
	},

	rightBack: (u, v) => {
		const { fromBottom } = getSpatialParams(u, v);
		const w = curve.power1(fromBottom);

		return {
			tx: -10 * w,
			ty: 0,
		};
	},
};

export const SWING_TEMPLATE: Template = {
	swing: (u, v, t) => {
		const { fromBottom } = getSpatialParams(u, v);
		const swing = Math.sin(t * 0.05);
		const armCurve: Curve = (t: number) => t ** 0.5;
		const w = armCurve(fromBottom);

		return {
			tx: 0,
			ty: 0,
			rot: 0.05 * swing * w,
			pivot: { u: 0.5, v: 0.0 },
		};
	},
};

export const FACE_TEMPLATE: Template = {
	left: (u, v) => {
		const { fromLeft, fromRight } = getSpatialParams(u, v);
		const skew: Curve = (t: number) => t;

		return {
			tx: -30 * skew(fromRight) + 15 * skew(fromLeft),
			ty: 0,
		};
	},

	right: (u, v) => {
		const { fromLeft, fromRight } = getSpatialParams(u, v);
		const skew: Curve = (t: number) => t;

		return {
			tx: 30 * skew(fromLeft) - 15 * skew(fromRight),
			ty: 0,
		};
	},

	up: (u, v) => {
		const { fromTop } = getSpatialParams(u, v);

		return {
			tx: 0,
			ty: -20 * curve.power1(fromTop),
		};
	},

	down: (u, v) => {
		const { fromBottom } = getSpatialParams(u, v);

		return {
			tx: 0,
			ty: 20 * curve.power1(fromBottom),
		};
	},
};
