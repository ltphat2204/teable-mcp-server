import { createReadStream } from "node:fs";
import FormData from "form-data";
import { z } from "zod";
import {
  OAuthExchangeCodeArgs,
  TeableApiError,
  TeableClient,
  TeableError,
  normalizeBaseUrl,
  normalizeTeableError,
} from "../teable/api.js";
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

type ToolResult = {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
};

type HandlerContext = {
  baseUrl: string;
  oauthClientId?: string;
  oauthClientSecret?: string;
  sqlQueryEnabled?: boolean;
};

type ToolHandler = (args: unknown) => Promise<ToolResult>;

type FieldLike = {
  id?: string;
  name?: string;
  dbFieldName?: string;
};

type UploadAttachmentArgs = z.infer<typeof uploadAttachmentInput>;

const DEFAULT_RECORD_TAKE = 100;
const DEFAULT_RECORD_SKIP = 0;
const READ_ONLY_SQL_FIRST_KEYWORDS = new Set(["SELECT", "WITH", "EXPLAIN"]);
const FORBIDDEN_SQL_KEYWORDS = new Set([
  "INSERT",
  "UPDATE",
  "DELETE",
  "MERGE",
  "UPSERT",
  "CREATE",
  "ALTER",
  "DROP",
  "TRUNCATE",
  "GRANT",
  "REVOKE",
  "BEGIN",
  "COMMIT",
  "ROLLBACK",
  "CALL",
  "EXEC",
  "EXECUTE",
  "COPY",
  "VACUUM",
  "LOCK",
  "SET",
  "RESET",
  "DO",
  "DECLARE",
]);

const toTextResult = (payload: unknown, isError = false): ToolResult => ({
  content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
  ...(isError ? { isError: true } : {}),
});

const parseInput = <T extends z.ZodTypeAny>(schema: T, args: unknown): z.infer<T> => {
  const parsed = schema.safeParse(args);
  if (!parsed.success) {
    throw new Error(`Invalid input: ${parsed.error.issues.map((issue) => issue.message).join("; ")}`);
  }

  return parsed.data;
};

const compactObject = <T extends Record<string, unknown>>(value: T): Partial<T> => {
  const entries = Object.entries(value).filter(([, item]) => item !== undefined);
  return Object.fromEntries(entries) as Partial<T>;
};

const extractRecords = (payload: unknown): unknown[] => {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && typeof payload === "object") {
    const maybeRecords = (payload as Record<string, unknown>).records;
    if (Array.isArray(maybeRecords)) {
      return maybeRecords;
    }

    const maybeData = (payload as Record<string, unknown>).data;
    if (maybeData && typeof maybeData === "object") {
      const nestedRecords = (maybeData as Record<string, unknown>).records;
      if (Array.isArray(nestedRecords)) {
        return nestedRecords;
      }
    }
  }

  return [];
};

const extractFieldList = (payload: unknown): FieldLike[] => {
  if (Array.isArray(payload)) {
    return payload as FieldLike[];
  }

  if (payload && typeof payload === "object") {
    const maybeFields = (payload as Record<string, unknown>).fields;
    if (Array.isArray(maybeFields)) {
      return maybeFields as FieldLike[];
    }

    const maybeData = (payload as Record<string, unknown>).data;
    if (Array.isArray(maybeData)) {
      return maybeData as FieldLike[];
    }

    if (maybeData && typeof maybeData === "object") {
      const nestedFields = (maybeData as Record<string, unknown>).fields;
      if (Array.isArray(nestedFields)) {
        return nestedFields as FieldLike[];
      }
    }
  }

  return [];
};

type SqlScanResult = {
  tokens: string[];
  significant: string;
};

const scanSql = (sql: string): SqlScanResult => {
  const tokens: string[] = [];
  let significant = "";
  let currentToken = "";
  let state:
    | "normal"
    | "singleQuote"
    | "doubleQuote"
    | "backtickQuote"
    | "lineComment"
    | "blockComment"
    | "dollarQuote" = "normal";
  let dollarQuoteTag = "";

  const flushToken = () => {
    if (currentToken) {
      tokens.push(currentToken.toUpperCase());
      currentToken = "";
    }
  };

  for (let index = 0; index < sql.length; index += 1) {
    const char = sql[index];
    const nextChar = sql[index + 1];

    if (state === "lineComment") {
      if (char === "\n") {
        state = "normal";
      }
      continue;
    }

    if (state === "blockComment") {
      if (char === "*" && nextChar === "/") {
        state = "normal";
        index += 1;
      }
      continue;
    }

    if (state === "singleQuote") {
      if (char === "'" && nextChar === "'") {
        index += 1;
        continue;
      }
      if (char === "'") {
        state = "normal";
      }
      continue;
    }

    if (state === "doubleQuote") {
      if (char === '"' && nextChar === '"') {
        index += 1;
        continue;
      }
      if (char === '"') {
        state = "normal";
      }
      continue;
    }

    if (state === "backtickQuote") {
      if (char === "`") {
        state = "normal";
      }
      continue;
    }

    if (state === "dollarQuote") {
      if (sql.startsWith(dollarQuoteTag, index)) {
        state = "normal";
        index += dollarQuoteTag.length - 1;
      }
      continue;
    }

    if (char === "-" && nextChar === "-") {
      flushToken();
      state = "lineComment";
      index += 1;
      continue;
    }

    if (char === "/" && nextChar === "*") {
      flushToken();
      state = "blockComment";
      index += 1;
      continue;
    }

    if (char === "'") {
      flushToken();
      state = "singleQuote";
      continue;
    }

    if (char === '"') {
      flushToken();
      state = "doubleQuote";
      continue;
    }

    if (char === "`") {
      flushToken();
      state = "backtickQuote";
      continue;
    }

    if (char === "$") {
      const dollarQuoteMatch = sql.slice(index).match(/^\$(?:[A-Za-z_][A-Za-z0-9_]*)?\$/);
      if (dollarQuoteMatch) {
        flushToken();
        dollarQuoteTag = dollarQuoteMatch[0];
        state = "dollarQuote";
        index += dollarQuoteTag.length - 1;
        continue;
      }
    }

    if (/[A-Za-z_]/.test(char) || (currentToken && /[A-Za-z0-9_]/.test(char))) {
      currentToken += char;
      significant += char.toUpperCase();
      continue;
    }

    flushToken();

    if (!/\s/.test(char)) {
      significant += char;
    }
  }

  flushToken();

  return {
    tokens,
    significant,
  };
};

export function validateReadOnlySqlQuery(sql: string): string {
  const trimmedSql = sql.trim();
  if (!trimmedSql) {
    throw new Error("SQL query cannot be empty.");
  }

  const { tokens, significant } = scanSql(trimmedSql);
  const significantSql = significant.trim();
  const normalizedSignificant = significantSql.endsWith(";") ? significantSql.slice(0, -1) : significantSql;

  if (!tokens.length) {
    throw new Error("SQL query cannot be empty.");
  }

  if (normalizedSignificant.includes(";")) {
    throw new Error("SQL query must contain exactly one statement.");
  }

  const firstKeyword = tokens[0];
  if (!READ_ONLY_SQL_FIRST_KEYWORDS.has(firstKeyword)) {
    throw new Error("SQL query must begin with SELECT, WITH, or EXPLAIN.");
  }

  for (const token of tokens) {
    if (FORBIDDEN_SQL_KEYWORDS.has(token)) {
      throw new Error(`SQL query contains forbidden keyword: ${token}.`);
    }
  }

  return trimmedSql.replace(/;\s*$/, "");
}

export function resolveFieldKeyMapping(
  fields: FieldLike[],
  field: string,
  desiredKeyType: "name" | "id" | "dbFieldName"
) {
  const matchedField = fields.find(
    (candidate) => candidate.id === field || candidate.name === field || candidate.dbFieldName === field
  );

  if (!matchedField) {
    return undefined;
  }

  return {
    input: field,
    matchedField: {
      id: matchedField.id,
      name: matchedField.name,
      dbFieldName: matchedField.dbFieldName,
    },
    desiredKeyType,
    resolvedKey: matchedField[desiredKeyType],
  };
}

export function buildAttachmentForm(
  args: UploadAttachmentArgs,
  fileStreamFactory: (filePath: string) => NodeJS.ReadableStream = createReadStream
): FormData {
  const form = new FormData();

  if (args.filePath) {
    form.append("file", fileStreamFactory(args.filePath));
  }

  if (args.fileUrl) {
    form.append("fileUrl", args.fileUrl);
  }

  return form;
}

const parseLegacyJson = (value?: string): unknown => {
  if (!value) {
    return undefined;
  }

  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

function formatErrorResponse(error: unknown): ToolResult {
  const teableError: TeableError = error instanceof TeableApiError ? error.teableError : normalizeTeableError(error);

  return toTextResult({ error: teableError }, true);
}

export function makeHandlers(client: TeableClient, context: HandlerContext): Record<string, ToolHandler> {
  return {
    list_spaces: async () => toTextResult(await client.get("/space")),

    list_bases: async (args) => {
      const { spaceId } = parseInput(z.object({ spaceId: z.string() }), args);
      return toTextResult(await client.get(`/space/${spaceId}/base`));
    },

    get_base: async (args) => {
      const { baseId } = parseInput(getBaseInput, args);
      return toTextResult(await client.get(`/base/${baseId}`));
    },

    list_tables: async (args) => {
      const { baseId } = parseInput(z.object({ baseId: z.string() }), args);
      return toTextResult(await client.get(`/base/${baseId}/table`));
    },

    get_table: async (args) => {
      const { baseId, tableId } = parseInput(getTableInput, args);
      return toTextResult(await client.get(`/base/${baseId}/table/${tableId}`));
    },

    create_table: async (args) => {
      const { baseId, name, dbTableName, description, icon, fields } = parseInput(createTableInput, args);
      return toTextResult(
        await client.post(`/base/${baseId}/table/`, compactObject({ name, dbTableName, description, icon, fields }))
      );
    },

    delete_table: async (args) => {
      const { baseId, tableId } = parseInput(deleteTableInput, args);
      return toTextResult(await client.delete(`/base/${baseId}/table/${tableId}`));
    },

    update_table_name: async (args) => {
      const { baseId, tableId, name } = parseInput(updateTableNameInput, args);
      return toTextResult(await client.put(`/base/${baseId}/table/${tableId}/name`, { name }));
    },

    update_table_description: async (args) => {
      const { baseId, tableId, description } = parseInput(updateTableDescriptionInput, args);
      return toTextResult(await client.put(`/base/${baseId}/table/${tableId}/description`, { description }));
    },

    update_table_order: async (args) => {
      const { baseId, tableId, anchorId, position } = parseInput(updateTableOrderInput, args);
      return toTextResult(await client.put(`/base/${baseId}/table/${tableId}/order`, { anchorId, position }));
    },

    duplicate_table: async (args) => {
      const { baseId, tableId, name, includeRecords } = parseInput(duplicateTableInput, args);
      return toTextResult(
        await client.post(`/base/${baseId}/table/${tableId}/duplicate`, { name, includeRecords })
      );
    },

    get_table_fields: async (args) => {
      const { tableId } = parseInput(z.object({ tableId: z.string() }), args);
      return toTextResult(await client.get(`/table/${tableId}/field`));
    },

    get_field: async (args) => {
      const { tableId, fieldId } = parseInput(getFieldInput, args);
      return toTextResult(await client.get(`/table/${tableId}/field/${fieldId}`));
    },

    create_field: async (args) => {
      const { tableId, field } = parseInput(createFieldInput, args);
      return toTextResult(await client.post(`/table/${tableId}/field`, field));
    },

    update_field: async (args) => {
      const { tableId, fieldId, field } = parseInput(updateFieldInput, args);
      return toTextResult(await client.patch(`/table/${tableId}/field/${fieldId}`, field));
    },

    delete_field: async (args) => {
      const { tableId, fieldId } = parseInput(deleteFieldInput, args);
      return toTextResult(await client.delete(`/table/${tableId}/field/${fieldId}`));
    },

    delete_fields: async (args) => {
      const { tableId, fieldIds } = parseInput(deleteFieldsInput, args);
      return toTextResult(await client.delete(`/table/${tableId}/field`, { fieldIds }));
    },

    convert_field: async (args) => {
      const { tableId, fieldId, field } = parseInput(convertFieldInput, args);
      return toTextResult(await client.put(`/table/${tableId}/field/${fieldId}/convert`, field));
    },

    duplicate_field: async (args) => {
      const { tableId, fieldId, name, viewId } = parseInput(duplicateFieldInput, args);
      return toTextResult(await client.post(`/table/${tableId}/field/${fieldId}/duplicate`, compactObject({ name, viewId })));
    },

    get_field_delete_references: async (args) => {
      const { tableId, fieldIds } = parseInput(getFieldDeleteReferencesInput, args);
      return toTextResult(await client.get(`/table/${tableId}/field/delete-references`, { fieldIds }));
    },

    list_views: async (args) => {
      const { tableId } = parseInput(z.object({ tableId: z.string() }), args);
      return toTextResult(await client.get(`/table/${tableId}/view`));
    },

    get_view: async (args) => {
      const { tableId, viewId } = parseInput(getViewInput, args);
      return toTextResult(await client.get(`/table/${tableId}/view/${viewId}`));
    },

    create_view: async (args) => {
      const { tableId, view } = parseInput(createViewInput, args);
      return toTextResult(await client.post(`/table/${tableId}/view`, view));
    },

    delete_view: async (args) => {
      const { tableId, viewId } = parseInput(deleteViewInput, args);
      return toTextResult(await client.delete(`/table/${tableId}/view/${viewId}`));
    },

    update_view_name: async (args) => {
      const { tableId, viewId, name } = parseInput(updateViewNameInput, args);
      return toTextResult(await client.put(`/table/${tableId}/view/${viewId}/name`, { name }));
    },

    update_view_description: async (args) => {
      const { tableId, viewId, description } = parseInput(updateViewDescriptionInput, args);
      return toTextResult(await client.put(`/table/${tableId}/view/${viewId}/description`, { description }));
    },

    update_view_filter: async (args) => {
      const { tableId, viewId, filter } = parseInput(updateViewFilterInput, args);
      return toTextResult(await client.put(`/table/${tableId}/view/${viewId}/filter`, { filter }));
    },

    update_view_sort: async (args) => {
      const { tableId, viewId, sortObjs, manualSort } = parseInput(updateViewSortInput, args);
      return toTextResult(
        await client.put(
          `/table/${tableId}/view/${viewId}/sort`,
          compactObject({
            sortObjs,
            manualSort,
          })
        )
      );
    },

    update_view_group: async (args) => {
      const { tableId, viewId, groups } = parseInput(updateViewGroupInput, args);
      return toTextResult(await client.put(`/table/${tableId}/view/${viewId}/group`, groups));
    },

    update_view_options: async (args) => {
      const { tableId, viewId, options } = parseInput(updateViewOptionsInput, args);
      return toTextResult(await client.patch(`/table/${tableId}/view/${viewId}/options`, { options }));
    },

    update_view_record_order: async (args) => {
      const { tableId, viewId, anchorId, position, recordIds } = parseInput(updateViewRecordOrderInput, args);
      return toTextResult(
        await client.put(`/table/${tableId}/view/${viewId}/record-order`, { anchorId, position, recordIds })
      );
    },

    duplicate_view: async (args) => {
      const { tableId, viewId, view } = parseInput(duplicateViewInput, args);
      return toTextResult(await client.post(`/table/${tableId}/view/${viewId}/duplicate`, view));
    },

    get_record: async (args) => {
      const { tableId, recordId } = parseInput(z.object({ tableId: z.string(), recordId: z.string() }), args);
      return toTextResult(await client.get(`/table/${tableId}/record/${recordId}`));
    },

    get_record_history: async (args) => {
      const { tableId, recordId } = parseInput(z.object({ tableId: z.string(), recordId: z.string() }), args);
      return toTextResult(await client.get(`/table/${tableId}/record/${recordId}/history`));
    },

    query_teable: async (args) => {
      const { tableId, filter, sort, limit, viewId } = parseInput(
        z.object({
          tableId: z.string(),
          filter: z.string().optional(),
          sort: z.string().optional(),
          limit: z.number().optional(),
          viewId: z.string().optional(),
        }),
        args
      );

      return toTextResult(
        await client.get(`/table/${tableId}/record`, {
          take: limit ?? DEFAULT_RECORD_TAKE,
          skip: DEFAULT_RECORD_SKIP,
          ...(viewId ? { viewId } : {}),
          ...(filter ? { filter: parseLegacyJson(filter) } : {}),
          ...(sort ? { orderBy: parseLegacyJson(sort) } : {}),
        })
      );
    },

    list_records: async (args) => {
      const { tableId, take, skip, ...rest } = parseInput(listRecordsInput, args);
      return toTextResult(
        await client.get(`/table/${tableId}/record`, {
          take: take ?? DEFAULT_RECORD_TAKE,
          skip: skip ?? DEFAULT_RECORD_SKIP,
          ...rest,
        })
      );
    },

    list_all_records: async (args) => {
      const { tableId, pageSize, maxRecords, take, skip, ...rest } = parseInput(listAllRecordsInput, args);

      const records: unknown[] = [];
      let pages = 0;
      let currentSkip = skip ?? DEFAULT_RECORD_SKIP;
      const requestedTake = take ?? pageSize;
      let truncated = false;

      while (records.length < maxRecords) {
        const remaining = maxRecords - records.length;
        const currentTake = Math.min(requestedTake, remaining);
        const page = await client.get(`/table/${tableId}/record`, {
          ...rest,
          take: currentTake,
          skip: currentSkip,
        });

        const pageRecords = extractRecords(page);
        pages += 1;

        if (!pageRecords.length) {
          break;
        }

        records.push(...pageRecords.slice(0, remaining));

        if (pageRecords.length < currentTake) {
          break;
        }

        currentSkip += currentTake;

        if (records.length >= maxRecords) {
          truncated = true;
        }
      }

      return toTextResult({
        records,
        meta: {
          count: records.length,
          pages,
          truncated,
          pageSize: requestedTake,
          maxRecords,
        },
      });
    },

    create_records: async (args) => {
      const { tableId, records, fieldKeyType, typecast, order } = parseInput(createRecordsInput, args);
      return toTextResult(
        await client.post(
          `/table/${tableId}/record`,
          compactObject({
            records,
            fieldKeyType,
            typecast,
            order,
          })
        )
      );
    },

    update_record: async (args) => {
      const { tableId, recordId, fields, fieldKeyType, typecast, order } = parseInput(updateRecordInput, args);
      return toTextResult(
        await client.patch(
          `/table/${tableId}/record/${recordId}`,
          compactObject({
            record: { fields },
            fieldKeyType,
            typecast,
            order,
          })
        )
      );
    },

    update_multiple_records: async (args) => {
      const { tableId, records, fieldKeyType, typecast, order } = parseInput(updateMultipleRecordsInput, args);
      return toTextResult(
        await client.patch(
          `/table/${tableId}/record`,
          compactObject({
            records,
            fieldKeyType,
            typecast,
            order,
          })
        )
      );
    },

    delete_record: async (args) => {
      const { tableId, recordId } = parseInput(deleteRecordInput, args);
      return toTextResult(await client.delete(`/table/${tableId}/record/${recordId}`));
    },

    delete_records: async (args) => {
      const { tableId, recordIds } = parseInput(deleteRecordsInput, args);
      return toTextResult(await client.delete(`/table/${tableId}/record`, { recordIds }));
    },

    duplicate_record: async (args) => {
      const { tableId, recordId, viewId, anchorId, position } = parseInput(duplicateRecordInput, args);
      return toTextResult(await client.post(`/table/${tableId}/record/${recordId}/duplicate`, { viewId, anchorId, position }));
    },

    upload_attachment: async (args) => {
      const { tableId, recordId, fieldId, ...uploadArgs } = parseInput(uploadAttachmentInput, args);
      return toTextResult(
        await client.postForm(
          `/table/${tableId}/record/${recordId}/${fieldId}/uploadAttachment`,
          buildAttachmentForm({ tableId, recordId, fieldId, ...uploadArgs })
        )
      );
    },

    insert_attachment: async (args) => {
      const { tableId, recordId, fieldId, attachments, anchorId } = parseInput(insertAttachmentInput, args);
      return toTextResult(
        await client.post(
          `/table/${tableId}/record/${recordId}/${fieldId}/insertAttachment`,
          compactObject({ attachments, anchorId })
        )
      );
    },

    get_record_status: async (args) => {
      const { tableId, recordId } = parseInput(getRecordStatusInput, args);
      return toTextResult(await client.get(`/table/${tableId}/record/${recordId}/status`));
    },

    get_table_records_history: async (args) => {
      const { tableId, take, skip, cursor } = parseInput(getTableRecordsHistoryInput, args);
      return toTextResult(await client.get(`/table/${tableId}/record/history`, compactObject({ take, skip, cursor })));
    },

    get_aggregated_statistics: async (args) => {
      const { tableId } = parseInput(getAggregatedStatisticsInput, args);
      return toTextResult(await client.get(`/table/${tableId}/aggregation`));
    },

    get_total_row_count: async (args) => {
      const { tableId, ...params } = parseInput(getTotalRowCountInput, args);
      return toTextResult(await client.get(`/table/${tableId}/aggregation/row-count`, compactObject(params)));
    },

    get_total_search_count: async (args) => {
      const { tableId, ...params } = parseInput(getTotalSearchCountInput, args);
      return toTextResult(await client.get(`/table/${tableId}/aggregation/search-count`, compactObject(params)));
    },

    get_search_record_indices: async (args) => {
      const { tableId, ...params } = parseInput(getSearchRecordIndicesInput, args);
      return toTextResult(await client.get(`/table/${tableId}/aggregation/search-index`, compactObject(params)));
    },

    get_record_index: async (args) => {
      const { tableId, ...params } = parseInput(getRecordIndexInput, args);
      return toTextResult(await client.get(`/table/${tableId}/aggregation/record-index`, compactObject(params)));
    },

    get_group_points: async (args) => {
      const { tableId, ...params } = parseInput(getGroupPointsInput, args);
      return toTextResult(await client.get(`/table/${tableId}/aggregation/group-points`, compactObject(params)));
    },

    get_calendar_daily_collection: async (args) => {
      const { tableId, ...params } = parseInput(getCalendarDailyCollectionInput, args);
      return toTextResult(
        await client.get(`/table/${tableId}/aggregation/calendar-daily-collection`, compactObject(params))
      );
    },

    get_task_status_collection: async (args) => {
      const { tableId } = parseInput(getTaskStatusCollectionInput, args);
      return toTextResult(await client.get(`/table/${tableId}/aggregation/task-status-collection`));
    },

    list_comments: async (args) => {
      const { tableId, recordId, ...params } = parseInput(listCommentsInput, args);
      return toTextResult(await client.get(`/comment/${tableId}/${recordId}/list`, compactObject(params)));
    },

    create_comment: async (args) => {
      const { tableId, recordId, content, quoteId } = parseInput(createCommentInput, args);
      return toTextResult(await client.post(`/comment/${tableId}/${recordId}/create`, compactObject({ content, quoteId })));
    },

    get_comment: async (args) => {
      const { tableId, recordId, commentId } = parseInput(getCommentInput, args);
      return toTextResult(await client.get(`/comment/${tableId}/${recordId}/${commentId}`));
    },

    update_comment: async (args) => {
      const { tableId, recordId, commentId, content } = parseInput(updateCommentInput, args);
      return toTextResult(await client.patch(`/comment/${tableId}/${recordId}/${commentId}`, { content }));
    },

    delete_comment: async (args) => {
      const { tableId, recordId, commentId } = parseInput(deleteCommentInput, args);
      return toTextResult(await client.delete(`/comment/${tableId}/${recordId}/${commentId}`));
    },

    add_comment_reaction: async (args) => {
      const { tableId, recordId, commentId, reaction } = parseInput(commentReactionInput, args);
      return toTextResult(await client.post(`/comment/${tableId}/${recordId}/${commentId}/reaction`, { reaction }));
    },

    remove_comment_reaction: async (args) => {
      const { tableId, recordId, commentId, reaction } = parseInput(commentReactionInput, args);
      return toTextResult(
        await client.delete(`/comment/${tableId}/${recordId}/${commentId}/reaction`, undefined, { reaction })
      );
    },

    get_comment_subscription: async (args) => {
      const { tableId, recordId } = parseInput(commentSubscriptionInput, args);
      return toTextResult(await client.get(`/comment/${tableId}/${recordId}/subscribe`));
    },

    subscribe_comments: async (args) => {
      const { tableId, recordId } = parseInput(commentSubscriptionInput, args);
      return toTextResult(await client.post(`/comment/${tableId}/${recordId}/subscribe`));
    },

    unsubscribe_comments: async (args) => {
      const { tableId, recordId } = parseInput(commentSubscriptionInput, args);
      return toTextResult(await client.delete(`/comment/${tableId}/${recordId}/subscribe`));
    },

    get_record_comment_count: async (args) => {
      const { tableId, recordId } = parseInput(getRecordCommentCountInput, args);
      return toTextResult(await client.get(`/comment/${tableId}/${recordId}/count`));
    },

    get_table_comment_count: async (args) => {
      const { tableId, ...params } = parseInput(getTableCommentCountInput, args);
      return toTextResult(await client.get(`/comment/${tableId}/count`, compactObject(params)));
    },

    link_cell_candidates: async (args) => {
      const { tableId, take, skip, ...rest } = parseInput(linkCellCandidatesInput, args);
      return toTextResult(
        await client.get(`/table/${tableId}/record`, {
          take: take ?? DEFAULT_RECORD_TAKE,
          skip: skip ?? DEFAULT_RECORD_SKIP,
          ...rest,
        })
      );
    },

    resolve_field_keys: async (args) => {
      const { tableId, field, desiredKeyType } = parseInput(resolveFieldKeysInput, args);
      const fields = extractFieldList(await client.get(`/table/${tableId}/field`));
      const resolution = resolveFieldKeyMapping(fields, field, desiredKeyType);

      if (!resolution) {
        throw new Error(`Field not found: ${field}`);
      }

      return toTextResult({
        ...resolution,
        availableFieldCount: fields.length,
      });
    },

    sql_query: async (args) => {
      if (!context.sqlQueryEnabled) {
        throw new Error("SQL query tool is disabled. Set TEABLE_ENABLE_SQL_QUERY=true to enable it.");
      }

      const { baseId, sql } = parseInput(sqlQueryInput, args);
      return toTextResult(await client.post(`/base/${baseId}/sql-query`, { sql: validateReadOnlySqlQuery(sql) }));
    },

    oauth_build_authorize_url: async (args) => {
      const parsed = parseInput(oauthBuildAuthorizeUrlInput, args);
      const clientId = parsed.clientId || context.oauthClientId;

      if (!clientId) {
        throw new Error("Missing OAuth clientId. Provide it in input or TEABLE_OAUTH_CLIENT_ID.");
      }

      const authorizeUrl = new URL(`${normalizeBaseUrl(context.baseUrl)}/api/oauth/authorize`);
      authorizeUrl.searchParams.set("client_id", clientId);
      authorizeUrl.searchParams.set("redirect_uri", parsed.redirectUri);
      authorizeUrl.searchParams.set("response_type", "code");
      authorizeUrl.searchParams.set("scope", parsed.scope);
      if (parsed.state) {
        authorizeUrl.searchParams.set("state", parsed.state);
      }

      return toTextResult({ authorizeUrl: authorizeUrl.toString() });
    },

    oauth_exchange_code: async (args) => {
      const parsed = parseInput(oauthExchangeCodeInput, args);
      const payload: OAuthExchangeCodeArgs = {
        clientId: parsed.clientId || context.oauthClientId,
        clientSecret: parsed.clientSecret || context.oauthClientSecret,
        code: parsed.code,
        redirectUri: parsed.redirectUri,
      };

      if (!payload.clientId || !payload.clientSecret) {
        throw new Error(
          "Missing OAuth client credentials. Provide clientId/clientSecret or set TEABLE_OAUTH_CLIENT_ID and TEABLE_OAUTH_CLIENT_SECRET."
        );
      }

      return toTextResult(await client.oauthExchangeCode(payload));
    },

    oauth_refresh_token: async (args) => {
      const parsed = parseInput(oauthRefreshTokenInput, args);
      return toTextResult(
        await client.oauthRefresh({
          clientId: parsed.clientId || context.oauthClientId,
          clientSecret: parsed.clientSecret || context.oauthClientSecret,
          refreshToken: parsed.refreshToken,
        })
      );
    },

    oauth_revoke_tokens: async (args) => {
      const parsed = parseInput(oauthRevokeTokensInput, args);
      const clientId = parsed.clientId || context.oauthClientId;

      if (!clientId) {
        throw new Error("Missing OAuth clientId. Provide clientId or set TEABLE_OAUTH_CLIENT_ID.");
      }

      return toTextResult(
        await client.oauthRevoke({
          clientId,
          clientSecret: parsed.clientSecret || context.oauthClientSecret,
        })
      );
    },
  };
}

export async function handleToolCall(
  name: string,
  args: unknown,
  teableClient: TeableClient,
  context: HandlerContext
): Promise<ToolResult> {
  const handlers = makeHandlers(teableClient, context);
  const handler = handlers[name];

  if (!handler) {
    return toTextResult(
      {
        error: {
          message: `Unknown tool: ${name}`,
        },
      },
      true
    );
  }

  try {
    return await handler(args);
  } catch (error) {
    const normalized = formatErrorResponse(error);
    const errorPayload = JSON.parse(normalized.content[0].text) as { error: TeableError };

    if (!errorPayload.error.request) {
      errorPayload.error.request = {
        method: "MCP",
        url: name,
      };
      return toTextResult({ error: errorPayload.error }, true);
    }

    return normalized;
  }
}
