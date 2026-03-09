import { z } from "zod";
import {
  commentReactionInput,
  commentSubscriptionInput,
  convertFieldInput,
  createCommentInput,
  createFieldInput,
  createRecordsInput,
  createTableInput,
  createViewInput,
  deleteCommentInput,
  deleteFieldInput,
  deleteFieldsInput,
  deleteRecordInput,
  deleteRecordsInput,
  deleteTableInput,
  deleteViewInput,
  duplicateFieldInput,
  duplicateRecordInput,
  duplicateTableInput,
  duplicateViewInput,
  getAggregatedStatisticsInput,
  getBaseInput,
  getCalendarDailyCollectionInput,
  getCommentInput,
  getFieldDeleteReferencesInput,
  getFieldInput,
  getGroupPointsInput,
  getRecordCommentCountInput,
  getRecordIndexInput,
  getRecordStatusInput,
  getSearchRecordIndicesInput,
  getTableCommentCountInput,
  getTableInput,
  getTableRecordsHistoryInput,
  getTaskStatusCollectionInput,
  getTotalRowCountInput,
  getTotalSearchCountInput,
  getViewInput,
  insertAttachmentInput,
  linkCellCandidatesInput,
  listAllRecordsInput,
  listCommentsInput,
  listRecordsInput,
  oauthBuildAuthorizeUrlInput,
  oauthExchangeCodeInput,
  oauthRefreshTokenInput,
  oauthRevokeTokensInput,
  resolveFieldKeysInput,
  sqlQueryInput,
  updateCommentInput,
  updateFieldInput,
  updateMultipleRecordsInput,
  updateRecordInput,
  updateTableDescriptionInput,
  updateTableNameInput,
  updateTableOrderInput,
  updateViewDescriptionInput,
  updateViewFilterInput,
  updateViewGroupInput,
  updateViewNameInput,
  updateViewOptionsInput,
  updateViewRecordOrderInput,
  updateViewSortInput,
  uploadAttachmentInput,
} from "./schemas.js";

export type ToolDefinition = {
  name: string;
  description: string;
  inputSchema: Record<string, z.ZodTypeAny>;
};

const legacyQuerySchema = {
  tableId: z.string().describe("The Teable Table ID"),
  filter: z.string().optional().describe("Optional: Filter criteria (JSON format)"),
  sort: z.string().optional().describe("Optional: Sort criteria (JSON format)"),
  limit: z.number().optional().describe("Optional: Max records to return"),
  viewId: z.string().optional().describe("Optional: View ID to filter by view"),
};

const baseTools: ToolDefinition[] = [
  {
    name: "query_teable",
    description: "Legacy query tool for Teable records.",
    inputSchema: legacyQuerySchema,
  },
  {
    name: "list_spaces",
    description: "List all available spaces.",
    inputSchema: {},
  },
  {
    name: "list_bases",
    description: "List bases in a specific space.",
    inputSchema: { spaceId: z.string() },
  },
  {
    name: "get_base",
    description: "Get details for a base.",
    inputSchema: getBaseInput.shape,
  },
  {
    name: "list_tables",
    description: "List tables in a specific base.",
    inputSchema: { baseId: z.string() },
  },
  {
    name: "get_table",
    description: "Get details for a table.",
    inputSchema: getTableInput.shape,
  },
  {
    name: "create_table",
    description: "Create a table in a base.",
    inputSchema: createTableInput.shape,
  },
  {
    name: "delete_table",
    description: "Delete a table.",
    inputSchema: deleteTableInput.shape,
  },
  {
    name: "update_table_name",
    description: "Update table name.",
    inputSchema: updateTableNameInput.shape,
  },
  {
    name: "update_table_description",
    description: "Update table description.",
    inputSchema: updateTableDescriptionInput.shape,
  },
  {
    name: "update_table_order",
    description: "Move a table around an anchor.",
    inputSchema: updateTableOrderInput.shape,
  },
  {
    name: "duplicate_table",
    description: "Duplicate a table.",
    inputSchema: duplicateTableInput.shape,
  },
  {
    name: "get_table_fields",
    description: "Get fields of a specific table.",
    inputSchema: { tableId: z.string() },
  },
  {
    name: "get_field",
    description: "Get details for a field.",
    inputSchema: getFieldInput.shape,
  },
  {
    name: "create_field",
    description: "Create a field in a table.",
    inputSchema: createFieldInput.shape,
  },
  {
    name: "update_field",
    description: "Update a field.",
    inputSchema: updateFieldInput.shape,
  },
  {
    name: "delete_field",
    description: "Delete a field.",
    inputSchema: deleteFieldInput.shape,
  },
  {
    name: "delete_fields",
    description: "Delete multiple fields.",
    inputSchema: deleteFieldsInput.shape,
  },
  {
    name: "convert_field",
    description: "Convert a field type.",
    inputSchema: convertFieldInput.shape,
  },
  {
    name: "duplicate_field",
    description: "Duplicate a field.",
    inputSchema: duplicateFieldInput.shape,
  },
  {
    name: "get_field_delete_references",
    description: "List references affected by deleting fields.",
    inputSchema: getFieldDeleteReferencesInput.shape,
  },
  {
    name: "list_views",
    description: "List views in a specific table.",
    inputSchema: { tableId: z.string() },
  },
  {
    name: "get_view",
    description: "Get details for a view.",
    inputSchema: getViewInput.shape,
  },
  {
    name: "create_view",
    description: "Create a view in a table.",
    inputSchema: createViewInput.shape,
  },
  {
    name: "delete_view",
    description: "Delete a view.",
    inputSchema: deleteViewInput.shape,
  },
  {
    name: "update_view_name",
    description: "Update view name.",
    inputSchema: updateViewNameInput.shape,
  },
  {
    name: "update_view_description",
    description: "Update view description.",
    inputSchema: updateViewDescriptionInput.shape,
  },
  {
    name: "update_view_filter",
    description: "Update view filter configuration.",
    inputSchema: updateViewFilterInput.shape,
  },
  {
    name: "update_view_sort",
    description: "Update view sort configuration.",
    inputSchema: updateViewSortInput.shape,
  },
  {
    name: "update_view_group",
    description: "Update view group configuration.",
    inputSchema: updateViewGroupInput.shape,
  },
  {
    name: "update_view_options",
    description: "Update view options.",
    inputSchema: updateViewOptionsInput.shape,
  },
  {
    name: "update_view_record_order",
    description: "Move records within a view.",
    inputSchema: updateViewRecordOrderInput.shape,
  },
  {
    name: "duplicate_view",
    description: "Duplicate a view.",
    inputSchema: duplicateViewInput.shape,
  },
  {
    name: "get_record",
    description: "Get a specific record by ID.",
    inputSchema: {
      tableId: z.string(),
      recordId: z.string(),
    },
  },
  {
    name: "get_record_history",
    description: "Get history of changes for a specific record.",
    inputSchema: {
      tableId: z.string(),
      recordId: z.string(),
    },
  },
  {
    name: "list_records",
    description: "List table records with full filtering and query options.",
    inputSchema: listRecordsInput.shape,
  },
  {
    name: "list_all_records",
    description: "List all records with safe pagination caps.",
    inputSchema: listAllRecordsInput.shape,
  },
  {
    name: "create_records",
    description: "Create one or more records.",
    inputSchema: createRecordsInput.shape,
  },
  {
    name: "update_record",
    description: "Update one record.",
    inputSchema: updateRecordInput.shape,
  },
  {
    name: "update_multiple_records",
    description: "Update multiple records in one request.",
    inputSchema: updateMultipleRecordsInput.shape,
  },
  {
    name: "delete_record",
    description: "Delete one record.",
    inputSchema: deleteRecordInput.shape,
  },
  {
    name: "delete_records",
    description: "Delete multiple records by record IDs.",
    inputSchema: deleteRecordsInput.shape,
  },
  {
    name: "duplicate_record",
    description: "Duplicate a record around an anchor in a view.",
    inputSchema: duplicateRecordInput.shape,
  },
  {
    name: "upload_attachment",
    description: "Upload attachment to a record field using filePath or fileUrl.",
    inputSchema: uploadAttachmentInput.shape,
  },
  {
    name: "insert_attachment",
    description: "Insert uploaded attachments around an attachment anchor.",
    inputSchema: insertAttachmentInput.shape,
  },
  {
    name: "get_record_status",
    description: "Get record status.",
    inputSchema: getRecordStatusInput.shape,
  },
  {
    name: "get_table_records_history",
    description: "Get table-level records history.",
    inputSchema: getTableRecordsHistoryInput.shape,
  },
  {
    name: "get_aggregated_statistics",
    description: "Get aggregated field statistics for a table.",
    inputSchema: getAggregatedStatisticsInput.shape,
  },
  {
    name: "get_total_row_count",
    description: "Get total row count for a query context.",
    inputSchema: getTotalRowCountInput.shape,
  },
  {
    name: "get_total_search_count",
    description: "Get total count for a search query.",
    inputSchema: getTotalSearchCountInput.shape,
  },
  {
    name: "get_search_record_indices",
    description: "Get record indices for a search query.",
    inputSchema: getSearchRecordIndicesInput.shape,
  },
  {
    name: "get_record_index",
    description: "Get the index of a record in the current query context.",
    inputSchema: getRecordIndexInput.shape,
  },
  {
    name: "get_group_points",
    description: "Get group point distribution for a query context.",
    inputSchema: getGroupPointsInput.shape,
  },
  {
    name: "get_calendar_daily_collection",
    description: "Get daily calendar aggregation data.",
    inputSchema: getCalendarDailyCollectionInput.shape,
  },
  {
    name: "get_task_status_collection",
    description: "Get task status aggregation data.",
    inputSchema: getTaskStatusCollectionInput.shape,
  },
  {
    name: "list_comments",
    description: "List comments for a record.",
    inputSchema: listCommentsInput.shape,
  },
  {
    name: "create_comment",
    description: "Create a comment on a record.",
    inputSchema: createCommentInput.shape,
  },
  {
    name: "get_comment",
    description: "Get a comment by ID.",
    inputSchema: getCommentInput.shape,
  },
  {
    name: "update_comment",
    description: "Update a comment.",
    inputSchema: updateCommentInput.shape,
  },
  {
    name: "delete_comment",
    description: "Delete a comment.",
    inputSchema: deleteCommentInput.shape,
  },
  {
    name: "add_comment_reaction",
    description: "Add a reaction to a comment.",
    inputSchema: commentReactionInput.shape,
  },
  {
    name: "remove_comment_reaction",
    description: "Remove a reaction from a comment.",
    inputSchema: commentReactionInput.shape,
  },
  {
    name: "get_comment_subscription",
    description: "Get comment subscription status for a record.",
    inputSchema: commentSubscriptionInput.shape,
  },
  {
    name: "subscribe_comments",
    description: "Subscribe to comments on a record.",
    inputSchema: commentSubscriptionInput.shape,
  },
  {
    name: "unsubscribe_comments",
    description: "Unsubscribe from comments on a record.",
    inputSchema: commentSubscriptionInput.shape,
  },
  {
    name: "get_record_comment_count",
    description: "Get comment count for a record.",
    inputSchema: getRecordCommentCountInput.shape,
  },
  {
    name: "get_table_comment_count",
    description: "Get comment counts for records in a query context.",
    inputSchema: getTableCommentCountInput.shape,
  },
  {
    name: "link_cell_candidates",
    description: "Helper to list candidate records for link-cell selection.",
    inputSchema: linkCellCandidatesInput.shape,
  },
  {
    name: "resolve_field_keys",
    description: "Resolve a field identifier and return requested key type.",
    inputSchema: resolveFieldKeysInput.shape,
  },
  {
    name: "oauth_build_authorize_url",
    description: "Build Teable OAuth authorize URL.",
    inputSchema: oauthBuildAuthorizeUrlInput.shape,
  },
  {
    name: "oauth_exchange_code",
    description: "Exchange OAuth code for access and refresh tokens.",
    inputSchema: oauthExchangeCodeInput.shape,
  },
  {
    name: "oauth_refresh_token",
    description: "Refresh OAuth access token.",
    inputSchema: oauthRefreshTokenInput.shape,
  },
  {
    name: "oauth_revoke_tokens",
    description: "Revoke OAuth tokens for a client.",
    inputSchema: oauthRevokeTokensInput.shape,
  },
];

const sqlTool: ToolDefinition = {
  name: "sql_query",
  description: "Execute a gated read-only SQL query against a base.",
  inputSchema: sqlQueryInput.shape,
};

export function getTools(enableSqlQuery = false): ToolDefinition[] {
  return enableSqlQuery ? [...baseTools, sqlTool] : baseTools;
}
