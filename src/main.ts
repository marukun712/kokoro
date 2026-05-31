import { setupCanvas } from "@kokoro/rig";
import gsap from "gsap";
import { Viewport } from "pixi-viewport";
import { createCharacter } from "./character";
import { HAIR_TEMPLATE, SWING_TEMPLATE } from "./template";

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

app.ticker.add(() => {
	rig.setPose([
		bodyBlender.lerp("left", "right", params.x),
		bodyBlender.lerp("up", "down", params.y),
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

	rigs.leftArm.setPose([SWING_TEMPLATE.swing]);
	rigs.rightArm.setPose([SWING_TEMPLATE.swing]);

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
