import type { Ticker } from "pixi.js";
import type { PoseTransform, Template } from "./rig";

/** Rigごとに独自のスケールでtimeを蓄積するタイマー */
export class RigTimer {
	public time = 0;

	constructor(ticker: Ticker, speed = 1.0) {
		ticker.add((t) => {
			this.time += t.deltaTime * speed;
		});
	}
}

/** 始点ポーズと終点ポーズを線形補間するクラス */
export class PoseBlender {
	private readonly template: Template;
	private readonly timer: RigTimer;

	constructor(template: Template, timer: RigTimer) {
		this.template = template;
		this.timer = timer;
	}

	public lerp(from: string, to: string, t: number): PoseTransform {
		const a = this.template[from];
		const b = this.template[to];
		return (u, v) => {
			const ta = a(u, v, this.timer.time);
			const tb = b(u, v, this.timer.time);
			return {
				tx: ta.tx + (tb.tx - ta.tx) * t,
				ty: ta.ty + (tb.ty - ta.ty) * t,
			};
		};
	}
}
