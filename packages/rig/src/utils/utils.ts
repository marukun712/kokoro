import type { SpriteNode } from "../image/psd";
import { type Group, groupNodes, psdGroup } from "../rig/matcher";
import type { Pose, Rig } from "../rig/rig";

export type Curve = (t: number) => number;

export type Guard = (t: number) => boolean;

export const curve = {
	power2: (t: number) => t ** 2,
	power3: (t: number) => t ** 3,
	power4: (t: number) => t ** 4,
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

export class Switcher {
	private groups: Record<string, Group>;

	constructor(nodes: SpriteNode[], layerNames: string[]) {
		this.groups = Object.fromEntries(
			layerNames.map((name) => [name, groupNodes(nodes, psdGroup(name))]),
		);
	}

	apply(def: Record<string, boolean>) {
		for (const [name, visible] of Object.entries(def)) {
			this.groups[name].visible = visible;
		}
	}
}

export function follow(child: Rig, parent: Rig, pose: Pose): Pose {
	return (u, v) =>
		pose(
			(child.minX + u * child.w - parent.minX) / parent.w,
			(child.minY + v * child.h - parent.minY) / parent.h,
		);
}

export function withParent(parent: Rig, parentPoses: Pose[]) {
	return (child: Rig, localPoses: Pose[]) =>
		child.apply([
			...parentPoses.map((p) => follow(child, parent, p)),
			...localPoses,
		]);
}
