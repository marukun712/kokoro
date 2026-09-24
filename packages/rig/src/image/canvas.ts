import { initializeCanvas } from "ag-psd";
import * as PIXI from "pixi.js";

export async function setupCanvas(
	parent: HTMLElement,
): Promise<PIXI.Application> {
	initializeCanvas((width, height) => {
		const canvas = document.createElement("canvas");
		canvas.width = width;
		canvas.height = height;
		return canvas;
	});

	const app = new PIXI.Application();
	await app.init({
		resizeTo: window,
		backgroundColor: 0xffffff,
	});
	parent.appendChild(app.canvas);
	return app;
}
