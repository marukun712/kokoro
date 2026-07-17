import { lerpPose } from "../utils/utils";
import type { Pose } from "./rig";

/** 絶対秒数を受け取り Pose[] を返す関数型 */
export type Animation = (t: number) => Pose[];

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
