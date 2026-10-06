import { drawPNG, Rig } from "@kokoro/rig";
import { Container } from "pixi.js";

export async function pickVideos(): Promise<{
	contentURL: string;
	depthURL: string;
}> {
	return new Promise((resolve) => {
		const dialog = document.createElement("dialog");
		const article = document.createElement("article");

		const contentLabel = document.createElement("label");
		contentLabel.textContent = "コンテンツ動画";
		const contentInput = document.createElement("input");
		contentInput.type = "file";
		contentInput.accept = "video/mp4";
		contentLabel.appendChild(contentInput);

		const depthLabel = document.createElement("label");
		depthLabel.textContent = "深度動画";
		const depthInput = document.createElement("input");
		depthInput.type = "file";
		depthInput.accept = "video/mp4";
		depthLabel.appendChild(depthInput);

		const submit = document.createElement("button");
		submit.type = "button";
		submit.textContent = "決定";

		article.appendChild(contentLabel);
		article.appendChild(depthLabel);
		article.appendChild(submit);
		dialog.appendChild(article);
		document.body.appendChild(dialog);
		dialog.showModal();

		submit.addEventListener("click", async () => {
			const contentFile = contentInput.files?.[0];
			const depthFile = depthInput.files?.[0];
			if (!contentFile || !depthFile) return;

			const readAsDataURL = (file: File) =>
				new Promise<string>((res, rej) => {
					const reader = new FileReader();
					reader.onload = () => res(reader.result as string);
					reader.onerror = rej;
					reader.readAsDataURL(file);
				});

			const [contentURL, depthURL] = await Promise.all([
				readAsDataURL(contentFile),
				readAsDataURL(depthFile),
			]);

			dialog.close();
			dialog.remove();
			resolve({ contentURL, depthURL });
		});
	});
}

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
