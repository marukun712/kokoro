import {
	drawCharacter,
	KokoroRig,
	PoseBlender,
	pipe,
	psdGroup,
	RigTimer,
	walkPSD,
} from "@kokoro/rig";
import type { Application } from "pixi.js";
import { Container } from "pixi.js";
import { FACE_TEMPLATE, HAIR_TEMPLATE, POSE_TEMPLATE } from "./template";

export async function createCharacter(app: Application) {
	const index = await walkPSD("/models/character.psd", {
		hide: pipe(psdGroup("はじめに"), psdGroup("見本_クレジット表記")),
	});
	const nodes = drawCharacter(index);
	const root = new Container();
	for (const node of nodes) root.addChild(node.container);
	root.scale.set(0.1);

	const rig = new KokoroRig(nodes);
	const timer = new RigTimer(app.ticker);
	const hairTimer = new RigTimer(app.ticker, 0.8);
	const armTimer = new RigTimer(app.ticker, 0.6);
	const bodyBlender = new PoseBlender(POSE_TEMPLATE, timer);

	const faceRig = new KokoroRig(nodes.filter(psdGroup("顔")), { parent: rig });
	const rigs = {
		hairFront: new KokoroRig(nodes.filter(psdGroup("前髪")), { parent: rig }),
		hairSide: new KokoroRig(nodes.filter(psdGroup("前髪サイド")), {
			parent: rig,
		}),
		hairBack: new KokoroRig(nodes.filter(psdGroup("後ろ髪")), { parent: rig }),
		face: faceRig,
		leftArm: new KokoroRig(nodes.filter(psdGroup("腕L")), { parent: rig }),
		rightArm: new KokoroRig(nodes.filter(psdGroup("腕R")), { parent: rig }),
	};

	const faceBlender = new PoseBlender(FACE_TEMPLATE, timer);
	const hairFrontBlender = new PoseBlender(HAIR_TEMPLATE, hairTimer);
	const hairBackBlender = new PoseBlender(HAIR_TEMPLATE, hairTimer);

	return {
		root,
		nodes,
		rig,
		rigs,
		timer,
		hairTimer,
		armTimer,
		bodyBlender,
		faceBlender,
		hairFrontBlender,
		hairBackBlender,
	};
}
