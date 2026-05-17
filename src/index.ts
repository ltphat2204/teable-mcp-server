#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { isSqlQueryEnabled, validateConfig } from "./config.js";
import { getTools } from "./tools/definitions.js";
import { handleToolCall } from "./tools/handlers.js";
import { createTeableClient } from "./teable/api.js";

// Start the server with STDIO transport
async function main() {
    validateConfig();
    const sqlQueryEnabled = isSqlQueryEnabled();

    const baseUrl = process.env.TEABLE_BASE_URL || "https://app.teable.ai";
    const teableClient = createTeableClient({
        baseUrl,
        apiKey: process.env.TEABLE_API_KEY,
        oauth: {
            accessToken: process.env.TEABLE_OAUTH_ACCESS_TOKEN,
            refreshToken: process.env.TEABLE_OAUTH_REFRESH_TOKEN,
            clientId: process.env.TEABLE_OAUTH_CLIENT_ID,
            clientSecret: process.env.TEABLE_OAUTH_CLIENT_SECRET,
            tokenEndpoint: process.env.TEABLE_OAUTH_TOKEN_ENDPOINT,
        },
    });

    const server = new McpServer({
        name: "teable-mcp-server",
        version: "1.0.0",
    });

    for (const tool of getTools(sqlQueryEnabled)) {
        server.tool(
            tool.name,
            tool.description || "",
            tool.inputSchema as any,
            async (args: any) => {
                return handleToolCall(tool.name, args, teableClient, {
                    baseUrl,
                    oauthClientId: process.env.TEABLE_OAUTH_CLIENT_ID,
                    oauthClientSecret: process.env.TEABLE_OAUTH_CLIENT_SECRET,
                    sqlQueryEnabled,
                });
            }
        );
    }

    const transport = new StdioServerTransport();
    await server.connect(transport);
}

main().catch(() => {
    process.exit(1);
});
