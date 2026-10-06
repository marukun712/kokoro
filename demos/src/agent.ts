import {
	AgentSeqSchema,
	type Animation,
	resolveSeqExpr,
	setupCanvas,
} from "@kokoro/rig";
import { getDepth, injectDepthToPose, uvToDepth } from "@kokoro/rig/depth";
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

const { data, width, height } = await getDepth(container, app.renderer);
const depthFunc = uvToDepth(data, width, height);
const depthTemplate = injectDepthToPose(POSE_TEMPLATE(0.5), depthFunc);

document.getElementById("loading")?.remove();

const es = new EventSource("http://localhost:3001/sse");

es.addEventListener("play", (e) => {
	const result = AgentSeqSchema.safeParse(JSON.parse(e.data));
	if (!result.success) return;
	currentAnim = resolveSeqExpr(depthTemplate, result.data);
	animStart = performance.now();
});
