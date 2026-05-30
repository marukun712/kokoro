import {
	byName,
	curve,
	drawCharacter,
	getSpatialParams,
	KokoroFace,
	KokoroRig,
	PoseBlender,
	pipe,
	psdGroup,
	RigGroup,
	RigTimer,
	setupCanvas,
	walkPSD,
} from "@kokoro/rig";
import gsap from "gsap";
import { Container } from "pixi.js";
import { Viewport } from "pixi-viewport";
import * as Tone from "tone";
import { HAIR_TEMPLATE, POSE_TEMPLATE } from "./template";

const audioCtx = new AudioContext();
Tone.setContext(audioCtx);
const analyser = audioCtx.createAnalyser();
analyser.fftSize = 512;

async function connectCapture(): Promise<void> {
	const stream = await navigator.mediaDevices.getDisplayMedia({
		audio: true,
		video: true,
	});
	for (const t of stream.getVideoTracks()) t.stop();
	audioCtx.createMediaStreamSource(stream).connect(analyser);
}

const bands = { low: 0, mid: 0, high: 0 };

function readBands() {
	const buf = new Uint8Array(analyser.frequencyBinCount);
	analyser.getByteFrequencyData(buf);
	const toIdx = (hz: number) =>
		Math.round(hz / (audioCtx.sampleRate / analyser.fftSize));
	const avg = (lo: number, hi: number) => {
		const s = toIdx(lo),
			e = toIdx(hi);
		let sum = 0;
		for (let i = s; i < e; i++) sum += buf[i];
		return sum / ((e - s) * 255);
	};
	gsap.to(bands, {
		low: avg(60, 250),
		mid: avg(250, 2000),
		high: avg(2000, 8000),
		duration: 0.1,
		ease: "sine.out",
	});
	return bands;
}

async function playTone(note: string) {
	await audioCtx.resume();
	new Tone.Synth()
		.connect(analyser)
		.toDestination()
		.triggerAttackRelease(note, 0.1);
}

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

const index = await walkPSD("/models/character.psd", {
	show: pipe(byName("*左手を下げる"), byName("*右手を下げる")),
	hide: psdGroup("*目を閉じる"),
});
const nodes = drawCharacter(index);
const root = new Container();
for (const node of nodes) root.addChild(node.container);
root.scale.set(0.1);
viewport.addChild(root);

const rig = new KokoroRig(nodes);
const timer = new RigTimer();
const hairTimer = new RigTimer(0.8);
const armTimer = new RigTimer(0.6);
const bodyBlender = new PoseBlender(POSE_TEMPLATE, timer);
const rigs = {
	hair: new KokoroRig(nodes.filter(psdGroup("!髪（おさげ）")), { parent: rig }),
	leftArmFront: new KokoroRig(
		nodes.filter(psdGroup("!髪より手前に表示する腕パーツ（左）")),
		{ parent: rig },
	),
	rightArmFront: new KokoroRig(
		nodes.filter(psdGroup("!髪より手前に表示する腕パーツ（右）")),
		{ parent: rig },
	),
	leftArm: new KokoroRig(nodes.filter(psdGroup("!左腕")), { parent: rig }),
	rightArm: new KokoroRig(nodes.filter(psdGroup("!右腕")), { parent: rig }),
};
const rigList = [
	rig,
	rigs.hair,
	rigs.leftArmFront,
	rigs.rightArmFront,
	rigs.leftArm,
	rigs.rightArm,
];
const timerList = [timer, hairTimer, armTimer, armTimer, armTimer, armTimer];
const group = new RigGroup();
for (let i = 0; i < rigList.length; i++) group.add(rigList[i], timerList[i]);

const eyeOpen = { "*目を閉じる": false, "*目を少し細める ★デフォルト": true };
const eyeClosed = { "*目を閉じる": true, "*目を少し細める ★デフォルト": false };
const expression = new KokoroFace(nodes, Object.keys(eyeOpen));
expression.apply(eyeOpen);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
let blinking = false;
async function triggerBlink() {
	if (blinking) return;
	blinking = true;
	expression.apply(eyeClosed);
	await sleep(100);
	expression.apply(eyeOpen);
	blinking = false;
}

const params = { x: 0.5, y: 0.5 };
window.addEventListener("mousemove", (e) => {
	gsap.to(params, {
		x: e.clientX / window.innerWidth,
		y: e.clientY / window.innerHeight,
		duration: 0.5,
		ease: "sine.out",
	});
});

document
	.getElementById("btn-low")
	?.addEventListener("click", () => playTone("E2"));
document
	.getElementById("btn-mid")
	?.addEventListener("click", () => playTone("B5"));
document
	.getElementById("btn-high")
	?.addEventListener("click", () => playTone("B7"));
document.getElementById("btn-capture")?.addEventListener(
	"click",
	async () => {
		await audioCtx.resume();
		await connectCapture();
	},
	{ once: true },
);

app.ticker.add((t) => {
	const { low, mid, high } =
		audioCtx.state === "running" ? readBands() : { low: 0, mid: 0, high: 0 };

	rig.setPose([
		bodyBlender.lerp("left", "right", params.x),
		bodyBlender.lerp("up", "down", params.y),
		(u, v) => ({
			tx: 0,
			ty: low * 500,
			w: curve.body(getSpatialParams(u, v).fromTop),
		}),
	]);
	rigs.hair.setPose([HAIR_TEMPLATE.swing]);
	if (high > 0.5) triggerBlink();

	const armPose = (sign: number) => (u: number, v: number) => ({
		tx: 0,
		ty: 0,
		rot: sign * mid * 0.1,
		pivot: { u: 0.5, v: 0 },
		w: curve.arm(getSpatialParams(u, v).fromBottom),
	});
	rigs.leftArm.setPose([armPose(-1)]);
	rigs.rightArm.setPose([armPose(1)]);
	rigs.leftArmFront.setPose([armPose(-1)]);
	rigs.rightArmFront.setPose([armPose(1)]);
	group.tick(t.deltaTime);
});
