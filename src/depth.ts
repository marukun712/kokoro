import { lerpPose, setupCanvas } from "@kokoro/rig";
import { getDepth, injectDepth } from "@kokoro/rig/depth";
import gsap from "gsap";
import { Viewport } from "pixi-viewport";
import { pickPNG } from "./setup";
import { POSE_TEMPLATE } from "./template";

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

const depthTemplate = injectDepth(POSE_TEMPLATE(2), getDepthFromUV);

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
