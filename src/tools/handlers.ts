import { ErrorCode, McpError } from "@modelcontextprotocol/sdk/types.js";
import { TeableApiClient } from "../teable-client.js";
import { isValidQueryTeableArgs, CommentOnRecordArgs, CreateFieldArgs, UpdateFieldArgs, CreateViewArgs, UpdateViewArgs, GetFieldDependencyGraphArgs, AnalyzeFieldImpactArgs, CreateRecordArgs, UpdateRecordArgs } from "../types.js";
import { buildDependencyGraph, generateMermaidDiagram, analyzeFieldImpact, getTransitiveClosure } from "../utils/dependency.js";

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

            case 'delete_record': {
                const { tableId, recordId } = args as { tableId: string; recordId: string };
                const data = await teableClient.deleteRecord(tableId, recordId);
                return {
                    content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
                };
            }

            case 'create_record': {
                const { tableId, fields } = args as CreateRecordArgs;
                let parsedFields: any;
                try {
                    parsedFields = JSON.parse(fields);
                } catch (e: any) {
                    throw new McpError(ErrorCode.InvalidParams, `Invalid JSON format in 'fields': ${e.message}`);
                }
                const data = await teableClient.createRecord(tableId, parsedFields);
                return {
                    content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
                };
            }

            case 'update_record': {
                const { tableId, recordId, fields } = args as UpdateRecordArgs;
                let parsedFields: any;
                try {
                    parsedFields = JSON.parse(fields);
                } catch (e: any) {
                    throw new McpError(ErrorCode.InvalidParams, `Invalid JSON format in 'fields': ${e.message}`);
                }
                const data = await teableClient.updateRecord(tableId, recordId, parsedFields);
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

            case 'get_field_dependency_graph': {
                const { tableId } = args as GetFieldDependencyGraphArgs;
                const { nodes, tableName } = await buildDependencyGraph(tableId, teableClient);
                
                const graphData: Record<string, any> = {};
                for (const [id, node] of nodes.entries()) {
                    const transitiveDeps = getTransitiveClosure(id, nodes, 'upstream');
                    const transitiveDepsList = transitiveDeps.filter(c => c.fieldId !== id);
                    const transitiveDps = getTransitiveClosure(id, nodes, 'downstream');
                    const transitiveDpsList = transitiveDps.filter(c => c.fieldId !== id);

                    graphData[id] = {
                        id: node.id,
                        name: node.name,
                        type: node.type,
                        isComputed: node.isComputed,
                        isLookup: node.isLookup,
                        expression: node.expression,
                        directDependencies: node.dependencies,
                        directDependents: node.dependents,
                        transitiveDependencies: transitiveDepsList,
                        transitiveDependents: transitiveDpsList
                    };
                }

                const mermaid = generateMermaidDiagram(nodes);
                let markdown = `## Dependency Graph for Table: ${tableName} (${tableId})\n\n`;
                
                markdown += "### Visual Flowchart\n";
                markdown += "```mermaid\n" + mermaid + "```\n\n";

                markdown += "### Field Relationship Summary\n";
                for (const [id, info] of Object.entries(graphData)) {
                    markdown += `#### Field: **${info.name}** (\`${info.id}\` | Type: \`${info.type}\`)\n`;
                    if (info.directDependencies.length > 0) {
                        markdown += `- **Directly Depends On**: ${info.directDependencies.map((d: any) => `"${d.fieldName}" (${d.fieldId}${d.tableName ? ` in ${d.tableName}` : ''})`).join(', ')}\n`;
                    }
                    if (info.transitiveDependencies.length > info.directDependencies.length) {
                        markdown += `- **Transitively Depends On**: ${info.transitiveDependencies.map((d: any) => `"${d.fieldName}" (${d.fieldId}${d.tableName ? ` in ${d.tableName}` : ''})`).join(', ')}\n`;
                    }
                    if (info.directDependents.length > 0) {
                        markdown += `- **Directly Referenced By**: ${info.directDependents.map((d: any) => `"${d.fieldName}" (${d.fieldId})`).join(', ')}\n`;
                    }
                    if (info.transitiveDependents.length > info.directDependents.length) {
                        markdown += `- **Transitively Referenced By (Downstream Impact)**: ${info.transitiveDependents.map((d: any) => `"${d.fieldName}" (${d.fieldId})`).join(', ')}\n`;
                    }
                    if (info.directDependencies.length === 0 && info.directDependents.length === 0) {
                        markdown += `- _No dependencies or dependents._\n`;
                    }
                    markdown += "\n";
                }

                const result = {
                    tableId,
                    tableName,
                    fields: graphData,
                    mermaid,
                    summaryReport: markdown
                };

                return {
                    content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }]
                };
            }

            case 'analyze_field_impact': {
                const { tableId, fieldId } = args as AnalyzeFieldImpactArgs;
                const report = await analyzeFieldImpact(tableId, fieldId, teableClient);

                let markdown = `## Impact Analysis Report for Field: ${report.fieldName} (${report.fieldId})\n`;
                markdown += `* **Type**: \`${report.fieldType}\`\n`;
                markdown += `* **Impact Level**: **${report.impactLevel}**\n`;
                markdown += `* **Safe to Delete/Modify**: **${report.safeToDelete ? 'Yes' : 'No'}**\n\n`;

                markdown += `### Safety Checklist & Recommendations\n`;
                for (const rec of report.recommendations) {
                    markdown += `- ${rec}\n`;
                }
                markdown += "\n";

                markdown += `### Local Direct Dependents (${report.directDependents.length})\n`;
                if (report.directDependents.length > 0) {
                    for (const d of report.directDependents) {
                        markdown += `- **${d.fieldName}** (\`${d.fieldId}\` | Type: \`${d.type}\`)\n`;
                    }
                } else {
                    markdown += `_No direct local dependents._\n`;
                }
                markdown += "\n";

                markdown += `### Local Transitive Dependents (Indirect Impact) (${report.transitiveDependents.length})\n`;
                if (report.transitiveDependents.length > 0) {
                    for (const t of report.transitiveDependents) {
                        markdown += `- **${t.fieldName}** (\`${t.fieldId}\` | Type: \`${t.type}\`)\n`;
                    }
                } else {
                    markdown += `_No indirect local dependents._\n`;
                }
                markdown += "\n";

                markdown += `### Cross-Table Dependents (Foreign Impact) (${report.crossTableDependents.length})\n`;
                if (report.crossTableDependents.length > 0) {
                    for (const c of report.crossTableDependents) {
                        markdown += `- **${c.tableName}.${c.fieldName}** (\`${c.fieldId}\` | Type: \`${c.type}\` | linked via link field: "${c.viaFieldName}")\n`;
                    }
                } else {
                    markdown += `_No cross-table dependents._\n`;
                }
                markdown += "\n";

                const result = {
                    ...report,
                    summaryReport: markdown
                };

                return {
                    content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }]
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
