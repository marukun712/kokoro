import {
	drawCharacter,
	KokoroFace,
	KokoroRig,
	PoseBlender,
	pipe,
	psdGroup,
	RigTimer,
	walkPSD,
} from "@kokoro/rig";
import type { Application } from "pixi.js";
import { Container } from "pixi.js";
import { HAIR_TEMPLATE, POSE_TEMPLATE, SWING_TEMPLATE } from "./template";

export async function createCharacter(app: Application) {
	const index = await walkPSD("/minato/character.psd");
	const nodes = drawCharacter(index);
	const root = new Container();
	for (const node of nodes) root.addChild(node.container);
	root.scale.set(0.1);

	const rig = new KokoroRig(nodes);
	const timer = new RigTimer(app.ticker);
	const hairTimer = new RigTimer(app.ticker, 0.8);
	const armTimer = new RigTimer(app.ticker, 0.6);
	const bodyBlender = new PoseBlender(POSE_TEMPLATE, timer);

	const rigs = {
		hairFront: new KokoroRig(
			nodes.filter(pipe(psdGroup("!前髪"), psdGroup("前髪上"))),
			{ parent: rig },
		),
		hairBack: new KokoroRig(nodes.filter(psdGroup("!後髪")), { parent: rig }),
		frontArm: new KokoroRig(nodes.filter(psdGroup("!手前腕")), { parent: rig }),
		chest: new KokoroRig(nodes.filter(psdGroup("胸装飾")), { parent: rig }),
	};

	const hairFrontBlender = new PoseBlender(HAIR_TEMPLATE, hairTimer);
	const hairBackBlender = new PoseBlender(HAIR_TEMPLATE, hairTimer);
	const chestBlender = new PoseBlender(SWING_TEMPLATE, hairTimer);

	const face = new KokoroFace(nodes, ["*手前", "*閉じ"]);

	function blink() {
		face.apply({ "*手前": false, "*閉じ": true });
		setTimeout(() => {
			face.apply({ "*手前": true, "*閉じ": false });
		}, 150);
	}

	return {
		root,
		nodes,
		rig,
		rigs,
		timer,
		hairTimer,
		armTimer,
		bodyBlender,
		hairFrontBlender,
		hairBackBlender,
		chestBlender,
		face,
		blink,
	};
}
