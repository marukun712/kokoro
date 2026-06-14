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
			ty: -20 * w,
		};
	},

	down: (u, v) => {
		const { fromTop } = getSpatialParams(u, v);
		const chestCurve: Curve = (t: number) => Math.sin(t * Math.PI);
		const w = chestCurve(fromTop);

		return {
			tx: 0,
			ty: 20 * w,
		};
	},
};

export const HAIR_TEMPLATE: Template = {
	leftFront: (u, v) => {
		const { fromBottom } = getSpatialParams(u, v);
		const w = curve.power1(fromBottom);

		return {
			tx: -50 * w,
			ty: 0,
		};
	},

	rightFront: (u, v) => {
		const { fromBottom } = getSpatialParams(u, v);
		const w = curve.power1(fromBottom);

		return {
			tx: 50 * w,
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
