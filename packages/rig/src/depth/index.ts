import type * as PIXI from "pixi.js";
import type { Transform } from "../rig/rig";
import { getSpatialParams } from "../utils/utils";

/** `getDepth` の戻り値 */
export interface DepthResult {
	/** UV 座標から深度値 (0~1) を取得する関数 */
	getDepthFromUV: (u: number, v: number) => number;
	details: {
		/** 深度マップの生ピクセルデータ */
		data: Uint8Array;
		/** 深度マップの幅 (px) */
		width: number;
		/** 深度マップの高さ (px) */
		height: number;
	};
}

/** 深度推定モデルのサイズ */
export type DepthModelSize = "small" | "base" | "large";

/**
 * PIXI の Container をキャプチャして深度推定を実行し、深度マップを返す。
 * 推論は Web Worker 上で行われる。
 *
 * @param container - キャプチャ対象の PIXI.Container
 * @param renderer  - PIXI.Renderer (ピクセル抽出に使用)
 * @param model     - 使用するモデルサイズ (デフォルト: "base")
 * @returns {@link DepthResult}
 */
export async function getDepth(
	container: PIXI.Container,
	renderer: PIXI.Renderer,
	model: DepthModelSize = "base",
): Promise<DepthResult> {
	const {
		pixels,
		width: imgW,
		height: imgH,
	} = renderer.extract.pixels(container);
	const tempCanvas = document.createElement("canvas");
	tempCanvas.width = imgW;
	tempCanvas.height = imgH;
	const ctx = tempCanvas.getContext("2d");
	if (!ctx) throw new Error("failed to get 2d context");
	ctx.putImageData(
		new ImageData(new Uint8ClampedArray(pixels), imgW, imgH),
		0,
		0,
	);
	const dataURL = tempCanvas.toDataURL("image/png");

	return new Promise((resolve, reject) => {
		const worker = new Worker(
			new URL("../../dist/worker.js", import.meta.url),
			{
				type: "module",
			},
		);

		worker.postMessage({ dataURL, model });

		worker.onmessage = (e) => {
			const { depth, width, height } = e.data as {
				depth: Uint8Array;
				width: number;
				height: number;
			};

			const getDepthFromUV = (u: number, v: number): number => {
				const px = Math.min(Math.floor(u * width), width - 1);
				const py = Math.min(Math.floor(v * height), height - 1);
				return depth[py * width + px] / 255;
			};

			resolve({ getDepthFromUV, details: { data: depth, width, height } });
			worker.terminate();
		};

		worker.onerror = reject;
	});
}

/**
 * 深度マップを使って左右・上下の視差ポーズを生成するテンプレート。
 * 深度値が大きいほど (手前にあるほど) 変形量が大きくなる。
 *
 * @param depthFunc - UV 座標から深度値 (0~1) を返す関数 ({@link DepthResult.getDepthFromUV})
 * @param scaleX    - X 方向の最大移動量 (px)
 * @param scaleY    - Y 方向の最大移動量 (px)
 * @returns `left` / `right` / `up` / `down` の {@link Transform} を返す関数を持つオブジェクト
 */
export const DEPTH_TEMPLATE = (
	depthFunc: (u: number, v: number) => number,
	scaleX: number,
	scaleY: number,
) => ({
	left: (u: number, v: number): Transform => {
		const { fromTop } = getSpatialParams(u, v);
		const d = depthFunc(u, v);
		return { tx: -d * scaleX * fromTop, ty: 0 };
	},
	right: (u: number, v: number): Transform => {
		const { fromTop } = getSpatialParams(u, v);
		const d = depthFunc(u, v);
		return { tx: d * scaleX * fromTop, ty: 0 };
	},
	up: (u: number, v: number): Transform => {
		const { fromTop } = getSpatialParams(u, v);
		const d = depthFunc(u, v);
		return { tx: 0, ty: -d * scaleY * fromTop };
	},
	down: (u: number, v: number): Transform => {
		const { fromTop } = getSpatialParams(u, v);
		const d = depthFunc(u, v);
		return { tx: 0, ty: d * scaleY * fromTop };
	},
});
