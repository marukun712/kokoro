import { z } from "zod";
import { lerpPose } from "../utils/utils";
import type { Pose } from "./rig";

export type Animation = (t: number) => Pose[];
export type PoseExpr = string | { lerp: [string, string]; t: number };
export const PoseExprSchema: z.ZodType<PoseExpr> = z.union([
	z.string(),
	z.object({ lerp: z.tuple([z.string(), z.string()]), t: z.number() }),
]);

export type AgentClip = { pose: PoseExpr; duration: number };
export type AgentSeq = AgentClip[];
export const AgentClipSchema: z.ZodType<AgentClip> = z.object({
	pose: PoseExprSchema,
	duration: z.number(),
});

export const AgentSeqSchema: z.ZodType<AgentSeq> = z.array(AgentClipSchema);

export type Clip = {
	duration: number;
	pose: Pose;
	ease?: (t: number) => number;
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

export function resolveSeqExpr(
	template: Record<string, Pose>,
	agentSeq: AgentSeq,
): Animation {
	const clips: Clip[] = agentSeq.map((agentClip) => {
		const expr = agentClip.pose;
		const pose =
			typeof expr === "string"
				? template[expr]
				: lerpPose(template[expr.lerp[0]], template[expr.lerp[1]], expr.t);

		return { pose, duration: agentClip.duration };
	});

	return seq(clips);
}
