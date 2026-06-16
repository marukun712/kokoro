import { curve, getSpatialParams, lerpPose, setupCanvas } from "@kokoro/rig";
import gsap from "gsap";
import { Viewport } from "pixi-viewport";
import * as Tone from "tone";
import { blink, container, root } from "./character";
import { POSE_TEMPLATE } from "./template";

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

const bands = { low: 0 };

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
		return sum / (e - s);
	};

	gsap.to(bands, {
		low: avg(60, 250),
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

viewport.addChild(container);

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

document.getElementById("btn-capture")?.addEventListener(
	"click",
	async () => {
		await audioCtx.resume();
		await connectCapture();
	},
	{ once: true },
);

function scheduleNextBlink() {
	const delay = 3000 + Math.random() * 2000;
	setTimeout(() => {
		blink();
		scheduleNextBlink();
	}, delay);
}
scheduleNextBlink();

const VOLUME_TEMPLATE = (volume: number) => (u: number, v: number) => {
	const { fromTop } = getSpatialParams(u, v);
	const w = curve.power2(fromTop);
	return { tx: 0, ty: volume * w };
};

app.ticker.add(() => {
	const { low } = audioCtx.state === "running" ? readBands() : { low: 0 };

	const rootPoses = [
		lerpPose(POSE_TEMPLATE.left, POSE_TEMPLATE.right, params.x),
		lerpPose(POSE_TEMPLATE.up, POSE_TEMPLATE.down, params.y),
		VOLUME_TEMPLATE(low),
	];

	root.apply(rootPoses);
});
