import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
	base: "/kokoro/",
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
		rollupOptions: {
			input: {
				main: resolve(import.meta.dirname, "index.html"),
				template: resolve(import.meta.dirname, "template.html"),
				depth: resolve(import.meta.dirname, "depth.html"),
				depthVideo: resolve(import.meta.dirname, "depth-video.html"),
				agent: resolve(import.meta.dirname, "agent.html"),
			},
		},
	},
});
