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

    // ── Phase 1: Record Comments ──────────────────────────────────────────────
    {
        name: "get_record_comments",
        description: "Get all comments for a specific record",
        inputSchema: {
            tableId: z.string().describe("The Teable Table ID"),
            recordId: z.string().describe("The record ID"),
        },
    },
    {
        name: "comment_on_record",
        description: "Post a comment on a specific record",
        inputSchema: {
            tableId: z.string().describe("The Teable Table ID"),
            recordId: z.string().describe("The record ID"),
            content: z.string().describe("The comment text content"),
        },
    },

    // ── Phase 2: Field CRUD ───────────────────────────────────────────────────
    {
        name: "create_field",
        description: "Create a new field in a table",
        inputSchema: {
            tableId: z.string().describe("The Teable Table ID"),
            name: z.string().describe("Field name"),
            type: z.string().describe("Field type (e.g. singleLineText, number, checkbox, date, singleSelect, multipleSelect, longText, formula, rating, currency, percent, email, url, phoneNumber, attachment)"),
            description: z.string().optional().describe("Optional field description"),
            options: z.string().optional().describe("Optional field options as JSON string"),
        },
    },
    {
        name: "update_field",
        description: "Update an existing field's name, description, or options",
        inputSchema: {
            tableId: z.string().describe("The Teable Table ID"),
            fieldId: z.string().describe("The field ID to update"),
            name: z.string().optional().describe("New field name"),
            description: z.string().optional().describe("New field description"),
            options: z.string().optional().describe("New field options as JSON string"),
        },
    },
    {
        name: "delete_field",
        description: "Permanently delete a field from a table (all data in this field will be lost)",
        inputSchema: {
            tableId: z.string().describe("The Teable Table ID"),
            fieldId: z.string().describe("The field ID to delete"),
        },
    },

    // ── Phase 3: Table CRUD + Export ─────────────────────────────────────────
    {
        name: "create_table",
        description: "Create a new table in a base",
        inputSchema: {
            baseId: z.string().describe("The Teable Base ID"),
            name: z.string().describe("Table name"),
            description: z.string().optional().describe("Optional table description"),
            fields: z.string().optional().describe("Optional initial fields as JSON array: [{name, type, options?}]"),
        },
    },
    {
        name: "update_table",
        description: "Update a table's name or description",
        inputSchema: {
            baseId: z.string().describe("The Teable Base ID that owns the table"),
            tableId: z.string().describe("The Teable Table ID"),
            name: z.string().optional().describe("New table name"),
            description: z.string().optional().describe("New table description"),
        },
    },
    {
        name: "delete_table",
        description: "Delete a table (moves to trash, recoverable via restore_table_from_trash)",
        inputSchema: {
            baseId: z.string().describe("The Teable Base ID that owns the table"),
            tableId: z.string().describe("The Teable Table ID to delete"),
        },
    },
    {
        name: "export_table_data",
        description: "Export all data from a table",
        inputSchema: {
            tableId: z.string().describe("The Teable Table ID to export"),
        },
    },

    // ── Phase 4: Table Trash ─────────────────────────────────────────────────
    {
        name: "get_table_trash",
        description: "List all tables currently in the trash for a base",
        inputSchema: {
            baseId: z.string().describe("The Teable Base ID"),
        },
    },
    {
        name: "restore_table_from_trash",
        description: "Restore a deleted table from the trash back to the active base. First call get_table_trash to get the trashId of the item to restore.",
        inputSchema: {
            trashId: z.string().describe("The trash item ID (id field from get_table_trash results)"),
        },
    },
    {
        name: "permanently_delete_table",
        description: "Permanently and irreversibly delete a table. This cannot be undone. The table must already be in the trash (deleted with delete_table first).",
        inputSchema: {
            baseId: z.string().describe("The Teable Base ID"),
            tableId: z.string().describe("The Teable Table ID to permanently delete"),
        },
    },

    // ── Phase 5: View CRUD + Share ────────────────────────────────────────────
    {
        name: "create_view",
        description: "Create a new view in a table",
        inputSchema: {
            tableId: z.string().describe("The Teable Table ID"),
            name: z.string().describe("View name"),
            type: z.string().describe("View type: grid | gallery | kanban | calendar | gantt | form"),
        },
    },
    {
        name: "update_view",
        description: "Update a view's name, filter, or sort configuration",
        inputSchema: {
            tableId: z.string().describe("The Teable Table ID"),
            viewId: z.string().describe("The view ID to update"),
            name: z.string().optional().describe("New view name"),
            filter: z.string().optional().describe("New filter configuration as JSON string"),
            sort: z.string().optional().describe("New sort configuration as JSON string"),
        },
    },
    {
        name: "delete_view",
        description: "Delete a view from a table",
        inputSchema: {
            tableId: z.string().describe("The Teable Table ID"),
            viewId: z.string().describe("The view ID to delete"),
        },
    },
    {
        name: "share_view",
        description: "Enable or disable public share link for a view. Returns the share URL when enabled.",
        inputSchema: {
            tableId: z.string().describe("The Teable Table ID"),
            viewId: z.string().describe("The view ID to share/unshare"),
            enableShare: z.boolean().describe("true to enable sharing, false to disable"),
        },
    },
];
