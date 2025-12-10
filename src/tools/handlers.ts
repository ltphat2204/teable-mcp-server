import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import { TeableApiClient } from "../teable-client.js";
import { isValidQueryTeableArgs } from "../types.js";

export async function handleToolCall(name: string, args: any, teableClient: TeableApiClient) {
    try {
        switch (name) {
            case 'query_teable': {
                if (!isValidQueryTeableArgs(args)) {
                    throw new McpError(ErrorCode.InvalidParams, 'Invalid arguments for query_teable');
                }
                const data = await teableClient.queryTable(args);
                return {
                    content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
                };
            }

            case 'list_spaces': {
                const data = await teableClient.listSpaces();
                return {
                    content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
                };
            }

            case 'list_bases': {
                const { spaceId } = args as { spaceId: string };
                const data = await teableClient.listBases(spaceId);
                return {
                    content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
                };
            }

            case 'get_record': {
                const { tableId, recordId } = args as { tableId: string; recordId: string };
                const data = await teableClient.getRecord(tableId, recordId);
                return {
                    content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
                };
            }

            case 'list_views': {
                const { tableId } = args as { tableId: string };
                const data = await teableClient.listViews(tableId);
                return {
                    content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
                };
            }

            case 'get_record_history': {
                const { tableId, recordId } = args as { tableId: string; recordId: string };
                const data = await teableClient.getRecordHistory(tableId, recordId);
                return {
                    content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
                };
            }

            case 'list_tables': {
                const { baseId } = args as { baseId: string };
                const data = await teableClient.listTables(baseId);
                return {
                    content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
                };
            }

            case 'get_table_fields': {
                const { tableId } = args as { tableId: string };
                const data = await teableClient.getTableFields(tableId);
                return {
                    content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
                };
            }

            default:
                throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }
    } catch (error: any) {
        const errorMessage = teableClient.isAxiosError(error)
            ? `Teable API Error: ${JSON.stringify(error.response?.data || error.message)}`
            : error.message;

        return {
            content: [{ type: 'text' as const, text: errorMessage }],
            isError: true,
        };
    }
}
