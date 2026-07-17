import type { Animation, Pose } from "@kokoro/rig";
import { curve, getSpatialParams, loop, seq, setupCanvas } from "@kokoro/rig";
import { DEPTH_TEMPLATE, getDepth } from "@kokoro/rig/depth";
import { Viewport } from "pixi-viewport";
import { pickPNG } from "./setup";

const { container, root } = await pickPNG();
const app = await setupCanvas(document.body);

const viewport = new Viewport({
	screenWidth: window.innerWidth,
	screenHeight: window.innerHeight,
	worldWidth: 1000,
	worldHeight: 1000,
	events: app.renderer.events,
});
app.stage.addChild(viewport);
viewport.drag().pinch().wheel();
viewport.addChild(container);

const { getDepthFromUV } = await getDepth(container, app.renderer);
const template = DEPTH_TEMPLATE(getDepthFromUV, 80, 80);
document.getElementById("loading")?.remove();

// --- イージング ---

const easeInOut = (t: number) => t * t * (3 - 2 * t);
const easeOut = (t: number) => 1 - (1 - t) * (1 - t);

// --- ポーズ関数 ---

const rest: Pose = () => ({ tx: 0, ty: 0 });

function sink(amount: number): Pose {
	return (u, v) => {
		const { fromTop } = getSpatialParams(u, v);
		return { tx: 0, ty: amount * fromTop };
	};
}

function hop(height: number): Pose {
	return () => ({ tx: 0, ty: -height });
}

function tilt(angle: number): Pose {
	return (u, v) => {
		const { fromTop } = getSpatialParams(u, v);
		return {
			tx: 0,
			ty: 0,
			rot: angle * curve.power2(fromTop),
			pivot: { u: 0.5, v: 0.7 },
		};
	};
}

function add(a: Pose, b: Pose): Pose {
	return (u, v) => {
		const ta = a(u, v);
		const tb = b(u, v);
		return { tx: ta.tx + tb.tx, ty: ta.ty + tb.ty };
	};
}

function scale(pose: Pose, factor: number): Pose {
	return (u, v) => {
		const tr = pose(u, v);
		return { tx: tr.tx * factor, ty: tr.ty * factor };
	};
}

function then(first: Animation, duration: number, next: Animation): Animation {
	return (t) => (t < duration ? first(t) : next(t - duration));
}

// --- アニメーション定義 ---

const idle = loop(
	seq([
		{ duration: 2, pose: sink(6), ease: easeInOut },
		{ duration: 2, pose: rest, ease: easeInOut },
	]),
	4,
);

const nod = loop(
	seq([
		{ duration: 0.35, pose: scale(template.down, 0.7), ease: easeOut },
		{ duration: 0.45, pose: rest, ease: easeInOut },
	]),
	0.8,
);

const shake = loop(
	seq([
		{ duration: 0.3, pose: scale(template.left, 0.6), ease: easeInOut },
		{ duration: 0.3, pose: scale(template.right, 0.6), ease: easeInOut },
	]),
	0.6,
);

const tiltHead = loop(
	seq([
		{ duration: 0.5, pose: tilt(0.15), ease: easeOut },
		{ duration: 1.5, pose: tilt(0.15) },
		{ duration: 0.5, pose: rest, ease: easeInOut },
		{ duration: 0.5, pose: rest },
	]),
	3,
);

const happy = loop(
	seq([
		{ duration: 0.22, pose: hop(18), ease: easeOut },
		{ duration: 0.22, pose: sink(6), ease: easeInOut },
		{ duration: 0.16, pose: rest, ease: easeInOut },
	]),
	0.6,
);

const droop = add(sink(10), scale(template.down, 0.8));
const droopDeep = add(sink(14), scale(template.down, 0.8));

const sad = loop(
	seq([
		{ duration: 1, pose: droop, ease: easeInOut },
		{ duration: 1.5, pose: droopDeep, ease: easeInOut },
		{ duration: 1.5, pose: droop, ease: easeInOut },
	]),
	4,
);

const jump = add(hop(24), scale(template.up, 0.5));

const surprised = then(
	seq([
		{ duration: 0.12, pose: jump, ease: easeOut },
		{ duration: 0.3, pose: jump },
		{ duration: 0.25, pose: sink(4), ease: easeInOut },
		{ duration: 0.25, pose: rest, ease: easeInOut },
	]),
	0.92,
	idle,
);

const sway = loop(
	seq([
		{ duration: 1.2, pose: tilt(0.08), ease: easeInOut },
		{ duration: 1.2, pose: tilt(-0.08), ease: easeInOut },
	]),
	2.4,
);

const wiggle = loop(
	seq([
		{ duration: 0.15, pose: tilt(0.05), ease: easeInOut },
		{ duration: 0.15, pose: tilt(-0.05), ease: easeInOut },
	]),
	0.3,
);

const excited = loop(
	seq([
		{ duration: 0.15, pose: sink(5), ease: easeInOut },
		{ duration: 0.15, pose: rest, ease: easeInOut },
	]),
	0.3,
);

const sleepy = loop(
	seq([
		{ duration: 2, pose: scale(template.down, 0.7), ease: easeInOut },
		{ duration: 0.8, pose: scale(template.down, 0.9), ease: easeInOut },
		{ duration: 0.25, pose: rest, ease: easeOut },
		{ duration: 1, pose: rest },
	]),
	4.05,
);

const stretchUp = add(sink(-12), scale(template.up, 0.3));

const stretch = then(
	seq([
		{ duration: 0.6, pose: stretchUp, ease: easeInOut },
		{ duration: 0.8, pose: stretchUp },
		{ duration: 0.5, pose: rest, ease: easeInOut },
	]),
	1.9,
	idle,
);

const deepBow = add(scale(template.down, 1.6), sink(6));

const bow = then(
	seq([
		{ duration: 0.4, pose: deepBow, ease: easeInOut },
		{ duration: 0.6, pose: deepBow },
		{ duration: 0.5, pose: rest, ease: easeInOut },
	]),
	1.5,
	idle,
);

// --- ボタン生成 ---

const clips: { label: string; anim: Animation }[] = [
	{ label: "idle", anim: idle },
	{ label: "nod", anim: nod },
	{ label: "shake", anim: shake },
	{ label: "tilt", anim: tiltHead },
	{ label: "happy", anim: happy },
	{ label: "sad", anim: sad },
	{ label: "surprised", anim: surprised },
	{ label: "bow", anim: bow },
	{ label: "sway", anim: sway },
	{ label: "wiggle", anim: wiggle },
	{ label: "excited", anim: excited },
	{ label: "sleepy", anim: sleepy },
	{ label: "stretch", anim: stretch },
];

let currentAnim: Animation = idle;
let elapsed = 0;

const controls = document.getElementById("controls");
for (const clip of clips) {
	const btn = document.createElement("button");
	btn.textContent = clip.label;
	btn.addEventListener("click", () => {
		currentAnim = clip.anim;
		elapsed = 0;
	});
	controls?.appendChild(btn);
}

// --- 毎フレーム更新 ---

app.ticker.add(() => {
	elapsed += app.ticker.deltaMS / 1000;
	root.apply(currentAnim(elapsed));
});
