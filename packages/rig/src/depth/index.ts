import type * as PIXI from "pixi.js";
import type { Pose } from "../rig/rig";

export interface DepthResult {
	data: Uint8Array;
	width: number;
	height: number;
}

export type DepthModelSize = "small" | "base" | "large";

export function uvToDepth(
	data: Uint8Array,
	width: number,
	height: number,
): (u: number, v: number) => number {
	return (u: number, v: number): number => {
		const px = Math.min(Math.floor(u * width), width - 1);
		const py = Math.min(Math.floor(v * height), height - 1);
		return data[py * width + px] / 255;
	};
}

export function extractDepth(
	container: PIXI.Container,
	renderer: PIXI.Renderer,
): { data: Uint8Array; width: number; height: number } {
	const { pixels, width, height } = renderer.extract.pixels(container);
	const data = new Uint8Array(width * height);
	for (let i = 0; i < width * height; i++) {
		data[i] = pixels[i * 4];
	}
	return { data, width, height };
}

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

			resolve({ data: depth, width, height });
			worker.terminate();
		};

		worker.onerror = reject;
	});
}

export function injectDepthToPose(
	template: Record<string, Pose>,
	depthFunc: (u: number, v: number) => number,
): Record<string, Pose> {
	const result = {} as Record<string, Pose>;
	for (const key in template) {
		const original = template[key];
		result[key] = (u: number, v: number) => {
			const transform = original(u, v);
			const d = depthFunc(u, v);
			return { ...transform, tx: transform.tx * d, ty: transform.ty * d };
		};
	}
	return result;
}
