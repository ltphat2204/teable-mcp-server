import { z } from "zod";

export const TOOLS = [
    {
        name: "query_teable",
        description: "Query data from a Teable table (records)",
        inputSchema: {
            tableId: z.string().describe("The Teable Table ID"),
            filter: z.string().optional().describe("Optional: Filter criteria (JSON format)"),
            sort: z.string().optional().describe("Optional: Sort criteria (JSON format)"),
            limit: z.number().optional().describe("Optional: Max records to return"),
            viewId: z.string().optional().describe("Optional: View ID to filter by view"),
        },
    },
    {
        name: "get_record",
        description: "Get a specific record by ID",
        inputSchema: {
            tableId: z.string(),
            recordId: z.string(),
        },
    },
    {
        name: "list_views",
        description: "List views in a specific table",
        inputSchema: {
            tableId: z.string(),
        },
    },
    {
        name: "get_record_history",
        description: "Get history of changes for a specific record",
        inputSchema: {
            tableId: z.string(),
            recordId: z.string(),
        },
    },
    {
        name: "list_spaces",
        description: "List all available spaces",
        inputSchema: {},
    },
    {
        name: "list_bases",
        description: "List bases in a specific space",
        inputSchema: {
            spaceId: z.string(),
        },
    },
    {
        name: "list_tables",
        description: "List tables in a specific base",
        inputSchema: {
            baseId: z.string(),
        },
    },
    {
        name: "get_table_fields",
        description: "Get fields of a specific table",
        inputSchema: {
            tableId: z.string(),
        },
    },
];
