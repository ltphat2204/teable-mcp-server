#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { validateConfig } from "./config.js";
import { TOOLS } from "./tools/definitions.js";
import { handleToolCall } from "./tools/handlers.js";
import { TeableApiClient } from "./teable-client.js";

// Start the server with STDIO transport
async function main() {
    // Validate environment variables
    validateConfig();

    // Get configuration from environment
    const apiKey = process.env.TEABLE_API_KEY!;
    const baseUrl = process.env.TEABLE_BASE_URL || "https://app.teable.ai/api";

    // Initialize Teable client
    const teableClient = new TeableApiClient(apiKey, baseUrl);

    // Create and configure MCP server
    const server = new McpServer({
        name: "teable-mcp-server",
        version: "1.0.0",
    });

    // Register all tools
    for (const tool of TOOLS) {
        server.tool(
            tool.name,
            tool.description || "",
            tool.inputSchema as any,
            async (args: any) => {
                const result = await handleToolCall(tool.name, args, teableClient);
                if (result.isError) {
                    throw new Error(result.content[0].text);
                }
                return result;
            }
        );
    }

    // Connect to stdio transport
    const transport = new StdioServerTransport();
    await server.connect(transport);
}

main().catch((error) => {
    process.exit(1);
});
