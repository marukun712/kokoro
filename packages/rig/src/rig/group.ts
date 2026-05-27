import type { KokoroRig, PoseTransform, Template } from "./rig";

/**
 * 経過時間を管理するタイマー。
 * speed を変えることでパーツごとに独立した時間軸を持てる。
 */
export class RigTimer {
	public time = 0;
	public speed: number;

	constructor(speed = 1.0) {
		this.speed = speed;
	}

	public tick(deltaTime: number): void {
		this.time += deltaTime * this.speed;
	}
}

/**
 * Template と RigTimer を受け取り、2つのポーズを線形補間した PoseTransform を返す。
 */
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
				w: ta.w + (tb.w - ta.w) * t,
			};
		};
	}
}

/**
 * 複数の KokoroRig と RigTimer を束ねて一括で tick するクラス。
 */
export class RigGroup {
	private readonly entries: Array<{ rig: KokoroRig; timer: RigTimer }> = [];
	private readonly timers: Set<RigTimer> = new Set();

	public add(rig: KokoroRig, timer: RigTimer): void {
		this.entries.push({ rig, timer });
		this.timers.add(timer);
	}

	public tick(deltaTime: number): void {
		for (const timer of this.timers) {
			timer.tick(deltaTime);
		}
		for (const { rig, timer } of this.entries) {
			rig.tick(timer.time);
		}
	}
}
