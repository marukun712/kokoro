import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
	base: "/kokoro/",
	build: {
		rollupOptions: {
			input: {
				main: resolve(import.meta.dirname, "index.html"),
				audio: resolve(import.meta.dirname, "audio.html"),
				template: resolve(import.meta.dirname, "template.html"),
				depth: resolve(import.meta.dirname, "depth.html"),
			},
		},
	},
});
