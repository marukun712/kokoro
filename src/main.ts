import {
	byName,
	drawCharacter,
	KokoroFace,
	KokoroRig,
	PoseBlender,
	pipe,
	psdGroup,
	RigGroup,
	RigTimer,
	setupCanvas,
	walkPSD,
} from "@kokoro/rig";
import gsap from "gsap";
import { Container } from "pixi.js";
import { Viewport } from "pixi-viewport";
import { HAIR_TEMPLATE, POSE_TEMPLATE, SWING_TEMPLATE } from "./template";

// PIXI.jsのセットアップ
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

// PSDのロード
const index = await walkPSD("/models/character.psd", {
	show: pipe(byName("*左手を下げる"), byName("*右手を下げる")),
	hide: psdGroup("*目を閉じる"),
});

// Canvasに描画
const nodes = drawCharacter(index);

// rootコンテナの定義
const root = new Container();
for (const node of nodes) root.addChild(node.container);

// サイズ調整
root.scale.set(0.1);
viewport.addChild(root);

// レイヤーをグループ化してRigを作成
const rig = new KokoroRig(nodes);

const timer = new RigTimer();
const hairTimer = new RigTimer(0.8);
const armTimer = new RigTimer(0.6);

const bodyBlender = new PoseBlender(POSE_TEMPLATE, timer);

const rigs = {
	hair: new KokoroRig(nodes.filter(psdGroup("!髪（おさげ）")), {
		parent: rig,
	}),
	leftArmFront: new KokoroRig(
		nodes.filter(psdGroup("!髪より手前に表示する腕パーツ（左）")),
		{ parent: rig },
	),
	rightArmFront: new KokoroRig(
		nodes.filter(psdGroup("!髪より手前に表示する腕パーツ（右）")),
		{ parent: rig },
	),
	leftArm: new KokoroRig(nodes.filter(psdGroup("!左腕")), { parent: rig }),
	rightArm: new KokoroRig(nodes.filter(psdGroup("!右腕")), { parent: rig }),
};

const rigList = [
	rig,
	rigs.hair,
	rigs.leftArmFront,
	rigs.rightArmFront,
	rigs.leftArm,
	rigs.rightArm,
];
const timerList = [timer, hairTimer, armTimer, armTimer, armTimer, armTimer];

const group = new RigGroup();
for (let i = 0; i < rigList.length; i++) group.add(rigList[i], timerList[i]);

const eyeOpen = { "*目を閉じる": false, "*目を少し細める ★デフォルト": true };
const eyeClosed = { "*目を閉じる": true, "*目を少し細める ★デフォルト": false };

const expression = new KokoroFace(nodes, Object.keys(eyeOpen));
expression.apply(eyeOpen);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function blink() {
	while (true) {
		await sleep(2000 + Math.random() * 3000);
		expression.apply(eyeClosed);
		await sleep(100);
		expression.apply(eyeOpen);
	}
}
blink();

const params = { x: 0.5, y: 0.5 };

window.addEventListener("mousemove", (e) => {
	gsap.to(params, {
		x: e.clientX / window.innerWidth,
		y: e.clientY / window.innerHeight,
		duration: 0.5,
		ease: "sine.out",
	});
});

app.ticker.add((t) => {
	rig.setPose([
		bodyBlender.lerp("left", "right", params.x),
		bodyBlender.lerp("up", "down", params.y),
	]);
	rigs.hair.setPose([HAIR_TEMPLATE.swing]);
	rigs.leftArmFront.setPose([SWING_TEMPLATE.swing]);
	rigs.rightArmFront.setPose([SWING_TEMPLATE.swing]);
	rigs.leftArm.setPose([SWING_TEMPLATE.swing]);
	rigs.rightArm.setPose([SWING_TEMPLATE.swing]);

	group.tick(t.deltaTime);
});
