import { type Layer, readPsd } from "ag-psd";
import * as PIXI from "pixi.js";
import type { GroupMatcher } from "../rig/matcher";

export interface PSDIndex {
	name: string;
	path: string[];
	canvas: HTMLCanvasElement;
	x: number;
	y: number;
	clipping: boolean;
	hidden: boolean;
}

export interface SpriteNode {
	name: string;
	path: string[];
	container: PIXI.Container;
	sprite: PIXI.MeshPlane;
}

export async function walkPSD(
	url: string,
	visible?: {
		show?: GroupMatcher;
		hide?: GroupMatcher;
	},
): Promise<PSDIndex[]> {
	const res = await fetch(url);
	const psd = readPsd(await res.arrayBuffer());
	const result: PSDIndex[] = [];

	function walk(layer: Layer, path: string[], parentHidden: boolean) {
		if (!layer.name) return;
		const nextPath = [...path, layer.name];
		const node = { name: layer.name, path: nextPath };

		function resolveVisible(hidden: boolean): boolean {
			if (visible?.show?.(node)) return false;
			if (visible?.hide?.(node)) return true;
			return hidden;
		}

		const hidden = resolveVisible((layer.hidden ?? false) || parentHidden);

		if (layer.children) {
			for (const child of layer.children) walk(child, nextPath, hidden);
		} else if (layer.canvas) {
			result.push({
				name: layer.name,
				path: nextPath,
				canvas: layer.canvas,
				x: layer.left ?? 0,
				y: layer.top ?? 0,
				clipping: layer.clipping ?? false,
				hidden,
			});
		}
	}

	psd.children?.forEach((l) => {
		walk(l, [], false);
	});
	return result;
}

export function drawPSD(
	layers: PSDIndex[],
	verticesX = 250,
	verticesY = 250,
): SpriteNode[] {
	const nodes: SpriteNode[] = [];

	for (const layer of layers) {
		if (layer.clipping) continue;

		const sprite = new PIXI.MeshPlane({
			texture: PIXI.Texture.from(layer.canvas),
			verticesX,
			verticesY,
		});
		sprite.x = layer.x;
		sprite.y = layer.y;

		const container = new PIXI.Container();
		container.visible = !layer.hidden;
		container.addChild(sprite);
		nodes.push({ name: layer.name, path: layer.path, container, sprite });
	}

	return nodes;
}
