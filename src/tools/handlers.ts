import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import { TeableApiClient } from "../teable-client.js";
import { isValidQueryTeableArgs, CommentOnRecordArgs, CreateFieldArgs, UpdateFieldArgs, CreateViewArgs, UpdateViewArgs } from "../types.js";

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

            // ── Phase 1: Record Comments ──────────────────────────────────────────
            case 'get_record_comments': {
                const { tableId, recordId } = args as { tableId: string; recordId: string };
                const data = await teableClient.getRecordComments(tableId, recordId);
                return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
            }

            case 'comment_on_record': {
                const { tableId, recordId, content } = args as CommentOnRecordArgs;
                const data = await teableClient.commentOnRecord(tableId, recordId, content);
                return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
            }

            // ── Phase 2: Field CRUD ───────────────────────────────────────────────────
            case 'create_field': {
                const { tableId, name, type, description, options } = args as CreateFieldArgs;
                const parsedOptions = options ? JSON.parse(options) : undefined;
                const data = await teableClient.createField(tableId, name, type, description, parsedOptions);
                return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
            }

            case 'update_field': {
                const { tableId, fieldId, name, description, options } = args as UpdateFieldArgs;
                const updates: any = {};
                if (name) updates.name = name;
                if (description) updates.description = description;
                if (options) updates.options = JSON.parse(options);
                const data = await teableClient.updateField(tableId, fieldId, updates);
                return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
            }

            case 'delete_field': {
                const { tableId, fieldId } = args as { tableId: string; fieldId: string };
                const data = await teableClient.deleteField(tableId, fieldId);
                return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
            }

            // ── Phase 3: Table CRUD + Export ─────────────────────────────────────────
            case 'create_table': {
                const { baseId, name, description, fields } = args as { baseId: string; name: string; description?: string; fields?: string };
                const parsedFields = fields ? JSON.parse(fields) : undefined;
                const data = await teableClient.createTable(baseId, name, description, parsedFields);
                return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
            }

            case 'update_table': {
                const { baseId, tableId, name, description } = args as { baseId: string; tableId: string; name?: string; description?: string };
                const data = await teableClient.updateTable(baseId, tableId, { name, description });
                return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
            }

            case 'delete_table': {
                const { baseId, tableId } = args as { baseId: string; tableId: string };
                const data = await teableClient.deleteTable(baseId, tableId);
                return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
            }

            case 'export_table_data': {
                const { tableId } = args as { tableId: string };
                const data = await teableClient.exportTableData(tableId);
                return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
            }

            // ── Phase 4: Table Trash ─────────────────────────────────────────────────
            case 'get_table_trash': {
                const { baseId } = args as { baseId: string };
                const data = await teableClient.getTableTrash(baseId);
                return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
            }

            case 'restore_table_from_trash': {
                const { trashId } = args as { trashId: string };
                const data = await teableClient.restoreTableFromTrash(trashId);
                return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
            }

            case 'permanently_delete_table': {
                const { baseId, tableId } = args as { baseId: string; tableId: string };
                const data = await teableClient.permanentlyDeleteTable(baseId, tableId);
                return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
            }

            // ── Phase 5: View CRUD + Share ────────────────────────────────────────────
            case 'create_view': {
                const { tableId, name, type } = args as CreateViewArgs;
                const data = await teableClient.createView(tableId, name, type);
                return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
            }

            case 'update_view': {
                const { tableId, viewId, name, filter, sort } = args as UpdateViewArgs;
                const updates: any = {};
                if (name) updates.name = name;
                if (filter) updates.filter = JSON.parse(filter);
                if (sort) updates.sort = JSON.parse(sort);
                const data = await teableClient.updateView(tableId, viewId, updates);
                return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
            }

            case 'delete_view': {
                const { tableId, viewId } = args as { tableId: string; viewId: string };
                const data = await teableClient.deleteView(tableId, viewId);
                return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
            }

            case 'share_view': {
                const { tableId, viewId, enableShare } = args as { tableId: string; viewId: string; enableShare: boolean };
                const data = await teableClient.shareView(tableId, viewId, enableShare);
                return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
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
