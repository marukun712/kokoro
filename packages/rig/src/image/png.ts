import * as PIXI from "pixi.js";
import type { SpriteNode } from "./psd";

/**
 * PNG ファイルを取得して単一の SpriteNode として返す。
 *
 * @param url - PNG ファイルの URL
 * @returns 要素1つの {@link SpriteNode} 配列
 */
export async function drawPNG(
	url: string,
	verticesX = 250,
	verticesY = 250,
): Promise<SpriteNode[]> {
	const texture = await PIXI.Assets.load<PIXI.Texture>(url);

	const sprite = new PIXI.MeshPlane({
		texture,
		verticesX,
		verticesY,
	});

	const container = new PIXI.Container();
	container.addChild(sprite);

	return [{ name: "", path: [], container, sprite }];
}
