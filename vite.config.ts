import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
	base: "/kokoro/",
	root: resolve(import.meta.dirname, "demos"),
	publicDir: resolve(import.meta.dirname, "public"),
	server: {
		headers: {
			"Cross-Origin-Opener-Policy": "same-origin",
			"Cross-Origin-Embedder-Policy": "require-corp",
		},
	},
	preview: {
		headers: {
			"Cross-Origin-Opener-Policy": "same-origin",
			"Cross-Origin-Embedder-Policy": "require-corp",
		},
	},
	build: {
		outDir: resolve(import.meta.dirname, "dist"),
		rollupOptions: {
			input: {
				main: resolve(import.meta.dirname, "demos/index.html"),
				template: resolve(import.meta.dirname, "demos/template.html"),
				depth: resolve(import.meta.dirname, "demos/depth.html"),
				agent: resolve(import.meta.dirname, "demos/agent.html"),
			},
		},
	},
});
