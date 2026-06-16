import { readFileSync } from "node:fs";
import { type Layer, readPsd } from "ag-psd";

const path = Bun.argv[2];
if (!path) {
	console.error("Usage: bun psd.ts <file.psd>");
	process.exit(1);
}

const buffer = readFileSync(path);
const psd = readPsd(buffer, {
	skipLayerImageData: true,
	skipCompositeImageData: true,
	skipThumbnail: true,
});

function printTree(nodes: Layer[] = [], indent = "") {
	for (let i = 0; i < nodes.length; i++) {
		const node = nodes[i];
		const isLast = i === nodes.length - 1;
		const branch = isLast ? "└─" : "├─";
		const isGroup = node.children !== undefined;
		const icon = isGroup ? "📁" : node.hidden ? "👻" : "🖼";
		console.log(`${indent}${branch} ${icon} ${node.name ?? "(no name)"}`);
		if (isGroup) {
			printTree(node.children, indent + (isLast ? "   " : "│  "));
		}
	}
}

console.log(`📄 ${path}`);
printTree(psd.children);
