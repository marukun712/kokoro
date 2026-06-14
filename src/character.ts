import {
	drawCharacter,
	groupNodes,
	or,
	psdGroup,
	Rig,
	Switcher,
	walkPSD,
} from "@kokoro/rig";
import { Container } from "pixi.js";

const index = await walkPSD("./minato/character.psd");
const nodes = drawCharacter(index);
export const container = new Container();
for (const node of nodes) container.addChild(node.container);
container.scale.set(0.1);

export const root = new Rig(nodes);

export const hairFront = new Rig(
	groupNodes(nodes, or(psdGroup("!前髪"), psdGroup("前髪上"))).nodes,
);
export const hairBack = new Rig(groupNodes(nodes, psdGroup("!後髪")).nodes);
export const frontArm = new Rig(groupNodes(nodes, psdGroup("!手前腕")).nodes);
export const ribbon = new Rig(groupNodes(nodes, psdGroup("胸装飾")).nodes);

const face = new Switcher(nodes, ["*手前", "*閉じ"]);

export function blink() {
	face.apply({ "*手前": false, "*閉じ": true });
	setTimeout(() => {
		face.apply({ "*手前": true, "*閉じ": false });
	}, 150);
}
