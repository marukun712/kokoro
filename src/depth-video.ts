import { drawVideo, lerpPose, Rig, setupCanvas } from "@kokoro/rig";
import { extractDepth, injectDepthToPose, uvToDepth } from "@kokoro/rig/depth";
import gsap from "gsap";
import { Container } from "pixi.js";
import { pickVideos } from "./setup";
import { POSE_TEMPLATE } from "./template";

const { contentURL, depthURL } = await pickVideos();

const app = await setupCanvas(document.body);

const contentNodes = await drawVideo(contentURL);
const container = new Container();
for (const node of contentNodes) container.addChild(node.container);
const root = new Rig(contentNodes);
app.stage.addChild(container);

const scale = Math.max(window.innerWidth / root.w, window.innerHeight / root.h);
container.scale.set(scale);
container.position.set(
	(window.innerWidth - root.w * scale) / 2,
	(window.innerHeight - root.h * scale) / 2,
);

const depthHost = document.createElement("div");
depthHost.style.display = "none";
document.body.appendChild(depthHost);
const depthApp = await setupCanvas(depthHost);
const depthNodes = await drawVideo(depthURL);
const depthContainer = new Container();
for (const node of depthNodes) depthContainer.addChild(node.container);
depthApp.stage.addChild(depthContainer);

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
	const frame = extractDepth(depthContainer, depthApp.renderer);
	const depthFunc = uvToDepth(frame.data, frame.width, frame.height);
	const depthTemplate = injectDepthToPose(POSE_TEMPLATE(2), depthFunc);

	const rootPoses = [
		lerpPose(depthTemplate.left, depthTemplate.right, params.x),
		lerpPose(depthTemplate.up, depthTemplate.down, params.y),
	];

	root.apply(rootPoses);
});
