import type * as PIXI from "pixi.js";
import { getSpatialParams } from "../utils/utils";

export interface DepthResult {
	sampleDepth: (u: number, v: number) => number;
	data: Uint8Array;
	width: number;
	height: number;
}

export type DepthModelSize = "small" | "base" | "large";

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
		const worker = new Worker(new URL("./worker.ts", import.meta.url), {
			type: "module",
		});

		worker.postMessage({ dataURL, model });

		worker.onmessage = (e) => {
			const { depth, width, height } = e.data as {
				depth: Uint8Array;
				width: number;
				height: number;
			};

			const sampleDepth = (u: number, v: number): number => {
				const px = Math.min(Math.floor(u * width), width - 1);
				const py = Math.min(Math.floor(v * height), height - 1);
				return depth[py * width + px] / 255;
			};

			resolve({ sampleDepth, data: depth, width, height });
			worker.terminate();
		};

		worker.onerror = reject;
	});
}

export const DEPTH_TEMPLATE = (
	sampleDepth: (u: number, v: number) => number,
	scaleX: number,
	scaleY: number,
) => ({
	left: (u: number, v: number) => {
		const { fromTop } = getSpatialParams(u, v);
		const d = sampleDepth(u, v);
		return { tx: -d * scaleX * fromTop, ty: 0 };
	},
	right: (u: number, v: number) => {
		const { fromTop } = getSpatialParams(u, v);
		const d = sampleDepth(u, v);
		return { tx: d * scaleX * fromTop, ty: 0 };
	},
	up: (u: number, v: number) => {
		const { fromTop } = getSpatialParams(u, v);
		const d = sampleDepth(u, v);
		return { tx: 0, ty: -d * scaleY * fromTop };
	},
	down: (u: number, v: number) => {
		const { fromTop } = getSpatialParams(u, v);
		const d = sampleDepth(u, v);
		return { tx: 0, ty: d * scaleY * fromTop };
	},
});
