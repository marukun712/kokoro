import { drawPNG, Rig } from "@kokoro/rig";
import { Container } from "pixi.js";

export async function pickPNG(): Promise<{
	container: Container;
	root: Rig;
}> {
	return new Promise((resolve) => {
		const dialog = document.createElement("dialog");
		const article = document.createElement("article");
		const input = document.createElement("input");
		input.type = "file";
		input.accept = "image/png";
		article.appendChild(input);
		dialog.appendChild(article);
		document.body.appendChild(dialog);
		dialog.showModal();

		input.addEventListener("change", async () => {
			const file = input.files?.[0];
			if (!file) return;

			const url = await new Promise<string>((res, rej) => {
				const reader = new FileReader();
				reader.onload = () => res(reader.result as string);
				reader.onerror = rej;
				reader.readAsDataURL(file);
			});
			const nodes = await drawPNG(url);

			const container = new Container();
			for (const node of nodes) container.addChild(node.container);
			const root = new Rig(nodes);

			dialog.close();
			dialog.remove();
			resolve({ container, root });
		});
	});
}
