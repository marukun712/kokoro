import { lerpPose, setupCanvas } from "@kokoro/rig";
import gsap from "gsap";
import { Viewport } from "pixi-viewport";
import { blink, container, root } from "./character";
import { DEPTH_TEMPLATE } from "./template";

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

// キャラクターを一度描画してピクセルを取得する
app.renderer.render(app.stage);
const {
	pixels,
	width: imgW,
	height: imgH,
} = app.renderer.extract.pixels(container);
const tempCanvas = document.createElement("canvas");
tempCanvas.width = imgW;
tempCanvas.height = imgH;
const ctx = tempCanvas.getContext("2d");
if (!ctx) throw new Error("failed to get 2d context");
ctx.putImageData(
	new ImageData(new Uint8ClampedArray(pixels), imgW, imgH),
	0,
	0,
);
const dataURL = tempCanvas.toDataURL("image/png");

// 深度推定
const worker = new Worker(new URL("./inference.ts", import.meta.url), {
	type: "module",
});
worker.postMessage(dataURL);

worker.onmessage = (e) => {
	function sampleDepth(u: number, v: number): number {
		const px = Math.min(Math.floor(u * e.data.width), e.data.width - 1);
		const py = Math.min(Math.floor(v * e.data.height), e.data.height - 1);
		return e.data.depth[py * e.data.width + px] / 255; // 0~1に正規化
	}

	const depthTemplate = DEPTH_TEMPLATE(sampleDepth, 80, 80);

	document.getElementById("loading")?.remove();

	function scheduleNextBlink() {
		const delay = 3000 + Math.random() * 2000;
		setTimeout(() => {
			blink();
			scheduleNextBlink();
		}, delay);
	}
	scheduleNextBlink();

	const params = { x: 0.5, y: 0.5 };
	window.addEventListener("mousemove", (e) => {
		gsap.to(params, {
			x: e.clientX / window.innerWidth,
			y: e.clientY / window.innerHeight,
			duration: 0.5,
			ease: "sine.out",
		});
	});

	app.ticker.add(() => {
		const rootPoses = [
			lerpPose(depthTemplate.left, depthTemplate.right, params.x),
			lerpPose(depthTemplate.up, depthTemplate.down, params.y),
		];

		root.apply(rootPoses);
	});
};
