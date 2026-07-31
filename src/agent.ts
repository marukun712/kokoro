import type { Animation } from "@kokoro/rig";
import { AgentSeqSchema, resolveAgentSeq, setupCanvas } from "@kokoro/rig";
import { getDepth, injectDepth } from "@kokoro/rig/depth";
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

let currentAnim: Animation | null = null;
let animStart = 0;

app.ticker.add(() => {
	if (!currentAnim) return;
	const elapsed = (performance.now() - animStart) / 1000;
	root.apply(currentAnim(elapsed));
});

const { getDepthFromUV } = await getDepth(container, app.renderer);
const depthTemplate = injectDepth(POSE_TEMPLATE(0.5), getDepthFromUV);

document.getElementById("loading")?.remove();

const es = new EventSource("http://localhost:3001/sse");

es.addEventListener("play", (e) => {
	const result = AgentSeqSchema.safeParse(JSON.parse(e.data));
	if (!result.success) return;
	currentAnim = resolveAgentSeq(depthTemplate, result.data);
	animStart = performance.now();
});
