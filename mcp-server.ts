import { StreamableHTTPTransport } from "@hono/mcp";
import { AgentSeqSchema } from "@kokoro/rig";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Hono } from "hono";
import { cors } from "hono/cors";
import type { SSEStreamingApi } from "hono/streaming";
import { streamSSE } from "hono/streaming";

const POSE_MANIFEST = [
	{ name: "left", description: "Character looks to the left" },
	{ name: "right", description: "Character looks to the right" },
	{ name: "up", description: "Character looks upward" },
	{ name: "down", description: "Character looks downward" },
];

const sseClients = new Set<SSEStreamingApi>();

const mcp = new McpServer({ name: "kokoro-rig", version: "1.0.0" });

mcp.registerTool(
	"list_poses",
	{ description: "List available pose templates" },
	async () => {
		return {
			content: [{ type: "text" as const, text: JSON.stringify(POSE_MANIFEST) }],
		};
	},
);

mcp.registerTool(
	"play",
	{
		description: "Play an animation sequence on the character",
		inputSchema: { seq: AgentSeqSchema },
	},
	async ({ seq }) => {
		const data = JSON.stringify(seq);
		for (const client of sseClients) {
			client.writeSSE({ data, event: "play" }).catch(() => {
				sseClients.delete(client);
			});
		}
		return {
			content: [{ type: "text" as const, text: "playing" }],
		};
	},
);

const app = new Hono();
app.use(cors());

const transport = new StreamableHTTPTransport();

app.all("/mcp", async (c) => {
	if (!mcp.isConnected()) {
		await mcp.connect(transport);
	}
	return transport.handleRequest(c);
});

app.get("/sse", async (c) => {
	return streamSSE(c, async (stream) => {
		sseClients.add(stream);
		stream.onAbort(() => {
			sseClients.delete(stream);
		});
		while (!stream.closed && !stream.aborted) {
			await stream.sleep(30000);
		}
		sseClients.delete(stream);
	});
});

export default {
	port: 3001,
	fetch: app.fetch,
};
