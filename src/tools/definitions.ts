import { z } from "zod";
import {
  createRecordsInput,
  deleteRecordInput,
  deleteRecordsInput,
  duplicateRecordInput,
  getRecordStatusInput,
  getTableRecordsHistoryInput,
  linkCellCandidatesInput,
  listAllRecordsInput,
  listRecordsInput,
  oauthBuildAuthorizeUrlInput,
  oauthExchangeCodeInput,
  oauthRefreshTokenInput,
  oauthRevokeTokensInput,
  resolveFieldKeysInput,
  updateMultipleRecordsInput,
  updateRecordInput,
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

export const TOOLS: ToolDefinition[] = [
  {
    name: "query_teable",
    description: "Legacy query tool for Teable records.",
    inputSchema: legacyQuerySchema,
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
    name: "list_views",
    description: "List views in a specific table.",
    inputSchema: {
      tableId: z.string(),
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
    name: "list_spaces",
    description: "List all available spaces.",
    inputSchema: {},
  },
  {
    name: "list_bases",
    description: "List bases in a specific space.",
    inputSchema: {
      spaceId: z.string(),
    },
  },
  {
    name: "list_tables",
    description: "List tables in a specific base.",
    inputSchema: {
      baseId: z.string(),
    },
  },
  {
    name: "get_table_fields",
    description: "Get fields of a specific table.",
    inputSchema: {
      tableId: z.string(),
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
    inputSchema: {
      tableId: z.string(),
      recordId: z.string(),
      fieldId: z.string(),
      filePath: z.string().optional(),
      fileUrl: z.string().url().optional(),
    },
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
