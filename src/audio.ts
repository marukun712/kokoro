import { curve, getSpatialParams, setupCanvas } from "@kokoro/rig";
import gsap from "gsap";
import { Viewport } from "pixi-viewport";
import * as Tone from "tone";
import { createCharacter } from "./character";
import { HAIR_TEMPLATE } from "./template";

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

const bands = { low: 0, mid: 0 };

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

const {
	root,
	rig,
	rigs,
	timer,
	hairTimer,
	armTimer,
	bodyBlender,
	faceBlender,
	hairFrontBlender,
	hairBackBlender,
} = await createCharacter(app);
viewport.addChild(root);

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

app.ticker.add(() => {
	const { low, mid } =
		audioCtx.state === "running" ? readBands() : { low: 0, mid: 0 };

	rig.setPose([
		bodyBlender.lerp("left", "right", params.x),
		bodyBlender.lerp("up", "down", params.y),
		(u, v) => {
			const { fromTop } = getSpatialParams(u, v);
			const w = curve.power2(fromTop);
			return { tx: 0, ty: low * 100 * w };
		},
	]);

	rigs.face.setPose([
		faceBlender.lerp("left", "right", params.x),
		faceBlender.lerp("up", "down", params.y),
	]);

	rigs.hairFront.setPose([
		HAIR_TEMPLATE.swing,
		hairFrontBlender.lerp("leftFront", "rightFront", params.x),
	]);
	rigs.hairSide.setPose([
		HAIR_TEMPLATE.swing,
		hairBackBlender.lerp("leftBack", "rightBack", params.x),
	]);
	rigs.hairBack.setPose([
		HAIR_TEMPLATE.swing,
		hairBackBlender.lerp("leftBack", "rightBack", params.x),
	]);

	const armPose = (sign: number) => (_u: number, _v: number) => ({
		tx: 0,
		ty: 0,
		rot: sign * mid * 0.1,
		pivot: { u: 0.5, v: 0 },
	});

	rigs.leftArm.setPose([armPose(-1)]);
	rigs.rightArm.setPose([armPose(1)]);

	for (const r of [rig, rigs.face]) {
		r.tick(timer.time);
	}
	for (const r of [rigs.hairFront, rigs.hairSide, rigs.hairBack]) {
		r.tick(hairTimer.time);
	}
	for (const r of [rigs.leftArm, rigs.rightArm]) {
		r.tick(armTimer.time);
	}
});
