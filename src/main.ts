import {
	byName,
	curve,
	drawCharacter,
	getSpatialParams,
	groupNodes,
	KokoroFace,
	KokoroRig,
	POSE_TEMPLATE,
	PoseBlender,
	pipe,
	psdGroup,
	RigGroup,
	RigTimer,
	setupCanvas,
	type Template,
	walkPSD,
} from "@kokoro/rig";
import gsap from "gsap";
import { Container } from "pixi.js";
import { Viewport } from "pixi-viewport";

// 変形テンプレートの定義
export const HAIR_TEMPLATE: Template = {
	swing: (u, v, t) => {
		const { fromBottom } = getSpatialParams(u, v);
		const swing = Math.sin(t * 0.05);
		return {
			tx: 0,
			ty: 0,
			rot: 0.08 * swing,
			pivot: { u: 0.5, v: 0.0 },
			w: curve.body(fromBottom),
		};
	},
	leftFront: (u, v) => {
		const { fromBottom } = getSpatialParams(u, v);
		return { tx: -20, ty: 0, w: curve.body(fromBottom) };
	},
	rightFront: (u, v) => {
		const { fromBottom } = getSpatialParams(u, v);
		return { tx: 20, ty: 0, w: curve.body(fromBottom) };
	},
	leftBack: (u, v) => {
		const { fromBottom } = getSpatialParams(u, v);
		return { tx: 10, ty: 0, w: curve.body(fromBottom) };
	},
	rightBack: (u, v) => {
		const { fromBottom } = getSpatialParams(u, v);
		return { tx: -10, ty: 0, w: curve.body(fromBottom) };
	},
};

export const SWING_TEMPLATE: Template = {
	swing: (u, v, t) => {
		const { fromBottom } = getSpatialParams(u, v);
		const swing = Math.sin(t * 0.05);
		const w = curve.arm(fromBottom);
		return {
			tx: 0,
			ty: 0,
			rot: 0.1 * swing,
			pivot: { u: 0.5, v: 0.0 },
			w: w,
		};
	},
};

export const EYE_TEMPLATE: Template = {
	left: (u, v) => {
		const { fromLeft } = getSpatialParams(u, v);
		return { tx: -10, ty: 0, w: fromLeft };
	},
	right: (u, v) => {
		const { fromLeft } = getSpatialParams(u, v);
		return { tx: 10, ty: 0, w: fromLeft };
	},
	up: (u, v) => {
		const { fromTop } = getSpatialParams(u, v);
		return { tx: 0, ty: 5, w: fromTop };
	},
	down: (u, v) => {
		const { fromBottom } = getSpatialParams(u, v);
		return { tx: 0, ty: -5, w: fromBottom };
	},
};

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
	show: byName("口　閉じ"), // 初期状態での差分を指定
	hide: byName("笑顔　口"),
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
const skirtTimer = new RigTimer(0.5);
const ribbonTimer = new RigTimer(0.3);
const armTimer = new RigTimer(0.6);

const bodyBlender = new PoseBlender(POSE_TEMPLATE, timer);
const hairBlender = new PoseBlender(HAIR_TEMPLATE, hairTimer);
const eyeBlender = new PoseBlender(EYE_TEMPLATE, timer);

const rigs = {
	hairFront: new KokoroRig(
		groupNodes(nodes, pipe(psdGroup("前　髪"), psdGroup("もみあげ"))).nodes,
		{ parent: rig },
	),
	hairBack: new KokoroRig(groupNodes(nodes, psdGroup("後　髪")).nodes, {
		parent: rig,
	}),
	eyeL: new KokoroRig(
		groupNodes(nodes, pipe(psdGroup("左　瞳"), psdGroup("左　ハイライト")))
			.nodes,
		{ parent: rig },
	),
	eyeR: new KokoroRig(
		groupNodes(nodes, pipe(psdGroup("右　瞳"), psdGroup("右　ハイライト")))
			.nodes,
		{ parent: rig },
	),
	skirt: new KokoroRig(groupNodes(nodes, psdGroup("スカート")).nodes, {
		parent: rig,
	}),
	ribbon: new KokoroRig(groupNodes(nodes, psdGroup("リボン")).nodes, {
		parent: rig,
	}),
	leftArm: new KokoroRig(groupNodes(nodes, psdGroup("左腕")).nodes, {
		parent: rig,
	}),
	rightArm: new KokoroRig(groupNodes(nodes, psdGroup("右腕")).nodes, {
		parent: rig,
	}),
};

const rigList = [
	rig,
	rigs.hairFront,
	rigs.hairBack,
	rigs.eyeL,
	rigs.eyeR,
	rigs.skirt,
	rigs.ribbon,
	rigs.leftArm,
	rigs.rightArm,
];
const timerList = [
	timer,
	hairTimer,
	hairTimer,
	timer,
	timer,
	skirtTimer,
	ribbonTimer,
	armTimer,
	armTimer,
];

const group = new RigGroup();
for (let i = 0; i < rigList.length; i++) group.add(rigList[i], timerList[i]);

const eyeOpen = {
	"左　目　閉じ": false,
	"右　目　閉じ": false,
	"左　ハイライト": true,
	"右　ハイライト": true,
	"左　まつ毛": true,
	"右　まつ毛": true,
	"左　瞳": true,
	"右　瞳": true,
	"左　白目": true,
	"右　白目": true,
};
const eyeClosed = {
	"左　目　閉じ": true,
	"右　目　閉じ": true,
	"左　ハイライト": false,
	"右　ハイライト": false,
	"左　まつ毛": false,
	"右　まつ毛": false,
	"左　瞳": false,
	"右　瞳": false,
	"左　白目": false,
	"右　白目": false,
};

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

function randomMove() {
	gsap.to(params, {
		x: Math.random(),
		y: Math.random(),
		duration: 1.0 + Math.random() * 1.5,
		ease: "sine.inOut",
		onComplete: randomMove,
	});
}
randomMove();

app.ticker.add((t) => {
	const eyePose = [
		eyeBlender.lerp("left", "right", params.x),
		eyeBlender.lerp("up", "down", params.y),
	];

	rigs.eyeL.setPose(eyePose);
	rigs.eyeR.setPose(eyePose);
	rig.setPose([
		bodyBlender.lerp("left", "right", params.x),
		bodyBlender.lerp("up", "down", params.y),
	]);
	rigs.hairFront.setPose([
		hairBlender.lerp("leftFront", "rightFront", params.x),
		HAIR_TEMPLATE.swing,
	]);
	rigs.hairBack.setPose([
		hairBlender.lerp("leftBack", "rightBack", params.x),
		HAIR_TEMPLATE.swing,
	]);
	rigs.skirt.setPose([SWING_TEMPLATE.swing]);
	rigs.ribbon.setPose([SWING_TEMPLATE.swing]);
	rigs.leftArm.setPose([SWING_TEMPLATE.swing]);
	rigs.rightArm.setPose([SWING_TEMPLATE.swing]);

	group.tick(t.deltaTime);
});
