import { all, create } from "mathjs/number";
import { z } from "zod";
import { type Curve, lerpPose } from "../utils/utils";
import type { Pose } from "./rig";

const math = create(all);

export type PoseExpr = string | { lerp: [string, string]; t: number };
export const PoseExprSchema: z.ZodType<PoseExpr> = z.union([
	z.string(),
	z.object({ lerp: z.tuple([z.string(), z.string()]), t: z.number() }),
]);

export type EaseExpr = string;
export const EaseExprSchema: z.ZodType<EaseExpr> = z
	.string()
	.refine(canEvalEase, { message: "t の数式として評価できません" });

export type ClipExpr = {
	pose: PoseExpr;
	duration: number;
	ease?: EaseExpr;
};
export type SeqExpr = ClipExpr[];
export const ClipExprSchema: z.ZodType<ClipExpr> = z.object({
	pose: PoseExprSchema,
	duration: z.number(),
	ease: EaseExprSchema.optional(),
});

export const SeqExprSchema: z.ZodType<SeqExpr> = z.array(ClipExprSchema);

export type Animation = (t: number) => Pose[];
export type Clip = {
	duration: number;
	pose: Pose;
	ease?: Curve;
};

export function loop(anim: Animation, duration: number): Animation {
	return (t) => anim(((t % duration) + duration) % duration);
}

export function seq(clips: Clip[]): Animation {
	return (t) => {
		let elapsed = 0;

		for (let i = 0; i < clips.length; i++) {
			const end = elapsed + clips[i].duration;
			if (t < end) {
				const raw = (t - elapsed) / clips[i].duration;
				const ease = clips[i].ease;
				const w = ease ? ease(raw) : raw;
				const from = i > 0 ? clips[i - 1].pose : clips[clips.length - 1].pose;
				return [lerpPose(from, clips[i].pose, w)];
			}
			elapsed = end;
		}

		return [clips[clips.length - 1].pose];
	};
}

function compileEase(expr: string): (t: number) => unknown {
	const code = math.compile(expr);

	return (t) => code.evaluate({ t });
}

function canEvalEase(expr: string): boolean {
	try {
		return typeof compileEase(expr)(0.5) === "number";
	} catch {
		return false;
	}
}

export function resolveEaseExpr(expr: EaseExpr): Curve {
	const evalAt = compileEase(expr);

	return (t) => {
		const value = evalAt(t);
		return typeof value === "number" ? value : t;
	};
}

export function resolveSeqExpr(
	template: Record<string, Pose>,
	seqExpr: SeqExpr,
): Animation {
	const clips: Clip[] = seqExpr.map((clipExpr) => {
		const expr = clipExpr.pose;
		const pose =
			typeof expr === "string"
				? template[expr]
				: lerpPose(template[expr.lerp[0]], template[expr.lerp[1]], expr.t);

		const ease = clipExpr.ease ? resolveEaseExpr(clipExpr.ease) : undefined;

		return { pose, duration: clipExpr.duration, ease };
	});

	return seq(clips);
}
