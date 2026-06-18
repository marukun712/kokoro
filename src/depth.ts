import { lerpPose, setupCanvas } from "@kokoro/rig";
import { DEPTH_TEMPLATE, getDepth } from "@kokoro/rig/depth";
import gsap from "gsap";
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

const {
	getDepthFromUV,
	details: { data, width, height },
} = await getDepth(container, app.renderer);

const depthCanvas = document.createElement("canvas");
depthCanvas.width = width;
depthCanvas.height = height;
const depthCtx = depthCanvas.getContext("2d");
if (depthCtx) {
	const rgba = new Uint8ClampedArray(width * height * 4);
	for (let i = 0; i < data.length; i++) {
		const v = data[i];
		rgba[i * 4 + 0] = v;
		rgba[i * 4 + 1] = v;
		rgba[i * 4 + 2] = v;
		rgba[i * 4 + 3] = 255;
	}
	depthCtx.putImageData(new ImageData(rgba, width, height), 0, 0);
}
depthCanvas.className = "depth-preview";
document.body.appendChild(depthCanvas);

const depthTemplate = DEPTH_TEMPLATE(getDepthFromUV, 80, 80);

document.getElementById("loading")?.remove();

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
