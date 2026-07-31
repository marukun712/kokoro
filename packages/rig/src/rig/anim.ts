import { z } from "zod";
import { lerpPose } from "../utils/utils";
import type { Pose } from "./rig";

/** 絶対秒数を受け取り Pose[] を返す関数型 */
export type Animation = (t: number) => Pose[];

/**
 * Agent が指定するポーズ表現。
 * テンプレート名の文字列、または2つのテンプレートを `t` (0~1) で補間した中間ポーズ。
 */
export const PoseExprSchema = z.union([
	z.string(),
	z.object({ lerp: z.tuple([z.string(), z.string()]), t: z.number() }),
]);

/**
 * Agent が組み立てるアニメーションの1クリップ。
 * `pose` へ `duration` 秒かけて遷移する。
 */
export const AgentClipSchema = z.object({
	pose: PoseExprSchema,
	duration: z.number(),
	ease: z.string().optional(),
});

/** Agent が MCP 経由で送るアニメーションシーケンス。`safeParse` で検証して使う。 */
export const AgentSeqSchema = z.array(AgentClipSchema);

export type PoseExpr = z.infer<typeof PoseExprSchema>;
export type AgentClip = z.infer<typeof AgentClipSchema>;
export type AgentSeq = z.infer<typeof AgentSeqSchema>;

export type Clip = {
	duration: number;
	pose: Pose;
	/** 補間係数 (0~1) を変換するイージング関数。省略時は線形 */
	ease?: (t: number) => number;
};

/** duration 秒周期でループする Animation を返す */
export function loop(anim: Animation, duration: number): Animation {
	return (t) => anim(((t % duration) + duration) % duration);
}

/**
 * ポーズのキーフレーム列を順番に補間する Animation を返す。
 * 各クリップは「前のポーズからこのポーズへ duration 秒かけて遷移する」を意味する。
 * 先頭クリップの遷移元は末尾クリップのポーズ（loop との組み合わせで自然につながる）。
 */
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

/**
 * {@link AgentSeq} を実際の {@link Animation} に変換する。
 * `PoseExpr` がテンプレート名の場合は `template` を参照し、`lerp` の場合は {@link lerpPose} で合成する。
 *
 * @param template - テンプレート名と `Pose` のマップ
 * @param agentSeq - Agent から受け取ったシーケンス（{@link AgentSeqSchema} で検証済みのもの）
 */
export function resolveAgentSeq(
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
