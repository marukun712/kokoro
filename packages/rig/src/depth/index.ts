import { curve, getSpatialParams } from "../utils/utils";

export interface DepthResult {
	sampleDepth: (u: number, v: number) => number;
	data: Uint8Array;
	width: number;
	height: number;
}

export async function getDepth(dataURL: string): Promise<DepthResult> {
	return new Promise((resolve, reject) => {
		const worker = new Worker(
			new URL("./models/depth-anything/inference.ts", import.meta.url),
			{ type: "module" },
		);

		worker.postMessage(dataURL);

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
		const w = curve.power2(fromTop);
		const d = sampleDepth(u, v);
		return { tx: -d * scaleX * w, ty: 0 };
	},
	right: (u: number, v: number) => {
		const { fromTop } = getSpatialParams(u, v);
		const w = curve.power2(fromTop);
		const d = sampleDepth(u, v);
		return { tx: d * scaleX * w, ty: 0 };
	},
	up: (u: number, v: number) => {
		const { fromTop } = getSpatialParams(u, v);
		const w = curve.power2(fromTop);
		const d = sampleDepth(u, v);
		return { tx: 0, ty: -d * scaleY * w };
	},
	down: (u: number, v: number) => {
		const { fromTop } = getSpatialParams(u, v);
		const w = curve.power2(fromTop);
		const d = sampleDepth(u, v);
		return { tx: 0, ty: d * scaleY * w };
	},
});
