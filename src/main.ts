import { lerpPose, setupCanvas } from "@kokoro/rig";
import gsap from "gsap";
import { Viewport } from "pixi-viewport";
import { blink, container, hairBack, hairFront, root } from "./character";
import { HAIR_TEMPLATE, POSE_TEMPLATE } from "./template";

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
	root.apply([
		lerpPose(POSE_TEMPLATE.left, POSE_TEMPLATE.right, params.x),
		lerpPose(POSE_TEMPLATE.up, POSE_TEMPLATE.down, params.y),
	]);
	hairFront.apply([
		lerpPose(HAIR_TEMPLATE.leftFront, HAIR_TEMPLATE.rightFront, params.x),
	]);
	hairBack.apply([
		lerpPose(HAIR_TEMPLATE.leftBack, HAIR_TEMPLATE.rightBack, params.x),
	]);
});
