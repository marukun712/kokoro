import { byPath, drawCharacter, groupNodes, Rig, walkPSD } from "@kokoro/rig";
import { Container } from "pixi.js";

const index = await walkPSD("./models/character.psd");
const nodes = drawCharacter(index);
export const container = new Container();
for (const node of nodes) container.addChild(node.container);
container.scale.set(0.1);

export const root = new Rig(nodes);

const eyeOpen = groupNodes(nodes, byPath(["目", "通常"]));
const eyeClose = groupNodes(nodes, byPath(["目", "閉じる"]));

export function blink() {
	eyeOpen.visible = false;
	eyeClose.visible = true;
	setTimeout(() => {
		eyeOpen.visible = true;
		eyeClose.visible = false;
	}, 150);
}
