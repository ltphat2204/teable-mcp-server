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
};

type ToolHandler = (args: unknown) => Promise<ToolResult>;

type FieldLike = {
  id?: string;
  name?: string;
  dbFieldName?: string;
};

type UploadAttachmentArgs = z.infer<typeof uploadAttachmentInput>;

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

const asMaybeString = (value: unknown): string | undefined => {
  if (typeof value === "string" && value.trim()) {
    return value;
  }

  return undefined;
};

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
  const teableError: TeableError =
    error instanceof TeableApiError
      ? error.teableError
      : normalizeTeableError(error);

  return toTextResult({ error: teableError }, true);
}

export function makeHandlers(client: TeableClient, context: HandlerContext): Record<string, ToolHandler> {
  return {
    list_spaces: async () => {
      const data = await client.get("/space");
      return toTextResult(data);
    },

    list_bases: async (args) => {
      const { spaceId } = parseInput(z.object({ spaceId: z.string() }), args);
      const data = await client.get(`/space/${spaceId}/base`);
      return toTextResult(data);
    },

    list_tables: async (args) => {
      const { baseId } = parseInput(z.object({ baseId: z.string() }), args);
      const data = await client.get(`/base/${baseId}/table`);
      return toTextResult(data);
    },

    get_table_fields: async (args) => {
      const { tableId } = parseInput(z.object({ tableId: z.string() }), args);
      const data = await client.get(`/table/${tableId}/field`);
      return toTextResult(data);
    },

    get_record: async (args) => {
      const { tableId, recordId } = parseInput(z.object({ tableId: z.string(), recordId: z.string() }), args);
      const data = await client.get(`/table/${tableId}/record/${recordId}`);
      return toTextResult(data);
    },

    list_views: async (args) => {
      const { tableId } = parseInput(z.object({ tableId: z.string() }), args);
      const data = await client.get(`/table/${tableId}/view`);
      return toTextResult(data);
    },

    get_record_history: async (args) => {
      const { tableId, recordId } = parseInput(z.object({ tableId: z.string(), recordId: z.string() }), args);
      const data = await client.get(`/table/${tableId}/record/${recordId}/history`);
      return toTextResult(data);
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

      const params: Record<string, unknown> = {
        take: limit ?? 100,
        skip: 0,
        ...(viewId ? { viewId } : {}),
        ...(filter ? { filter: parseLegacyJson(filter) } : {}),
        ...(sort ? { orderBy: parseLegacyJson(sort) } : {}),
      };

      const data = await client.get(`/table/${tableId}/record`, params);
      return toTextResult(data);
    },

    list_records: async (args) => {
      const parsed = parseInput(listRecordsInput, args);
      const { tableId, take, skip, ...rest } = parsed;
      const params = {
        take: take ?? 100,
        skip: skip ?? 0,
        ...rest,
      };
      const data = await client.get(`/table/${tableId}/record`, params);
      return toTextResult(data);
    },

    list_all_records: async (args) => {
      const parsed = parseInput(listAllRecordsInput, args);
      const {
        tableId,
        pageSize,
        maxRecords,
        take,
        skip,
        ...rest
      } = parsed;

      const records: unknown[] = [];
      let pages = 0;
      let currentSkip = skip ?? 0;
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
      const data = await client.post(`/table/${tableId}/record`, {
        records,
        ...(fieldKeyType ? { fieldKeyType } : {}),
        ...(typecast === undefined ? {} : { typecast }),
        ...(order ? { order } : {}),
      });
      return toTextResult(data);
    },

    update_record: async (args) => {
      const { tableId, recordId, fields, fieldKeyType, typecast, order } = parseInput(updateRecordInput, args);
      const data = await client.patch(`/table/${tableId}/record/${recordId}`, {
        record: { fields },
        ...(fieldKeyType ? { fieldKeyType } : {}),
        ...(typecast === undefined ? {} : { typecast }),
        ...(order ? { order } : {}),
      });
      return toTextResult(data);
    },

    update_multiple_records: async (args) => {
      const { tableId, records, fieldKeyType, typecast, order } = parseInput(updateMultipleRecordsInput, args);
      const data = await client.patch(`/table/${tableId}/record`, {
        records,
        ...(fieldKeyType ? { fieldKeyType } : {}),
        ...(typecast === undefined ? {} : { typecast }),
        ...(order ? { order } : {}),
      });
      return toTextResult(data);
    },

    delete_record: async (args) => {
      const { tableId, recordId } = parseInput(deleteRecordInput, args);
      const data = await client.delete(`/table/${tableId}/record/${recordId}`);
      return toTextResult(data);
    },

    delete_records: async (args) => {
      const { tableId, recordIds } = parseInput(deleteRecordsInput, args);
      const data = await client.delete(`/table/${tableId}/record`, { recordIds });
      return toTextResult(data);
    },

    duplicate_record: async (args) => {
      const { tableId, recordId, viewId, anchorId, position } = parseInput(duplicateRecordInput, args);
      const data = await client.post(`/table/${tableId}/record/${recordId}/duplicate`, {
        viewId,
        anchorId,
        position,
      });
      return toTextResult(data);
    },

    upload_attachment: async (args) => {
      const parsed = parseInput(uploadAttachmentInput, args);
      const { tableId, recordId, fieldId } = parsed;
      const form = buildAttachmentForm(parsed);
      const data = await client.postForm(`/table/${tableId}/record/${recordId}/${fieldId}/uploadAttachment`, form);
      return toTextResult(data);
    },

    get_record_status: async (args) => {
      const { tableId, recordId } = parseInput(getRecordStatusInput, args);
      const data = await client.get(`/table/${tableId}/record/${recordId}/status`);
      return toTextResult(data);
    },

    get_table_records_history: async (args) => {
      const { tableId, take, skip, cursor } = parseInput(getTableRecordsHistoryInput, args);
      const data = await client.get(`/table/${tableId}/record/history`, {
        ...(take === undefined ? {} : { take }),
        ...(skip === undefined ? {} : { skip }),
        ...(cursor === undefined ? {} : { cursor }),
      });
      return toTextResult(data);
    },

    link_cell_candidates: async (args) => {
      const parsed = parseInput(linkCellCandidatesInput, args);
      const { tableId, take, skip, ...rest } = parsed;
      const data = await client.get(`/table/${tableId}/record`, {
        take: take ?? 100,
        skip: skip ?? 0,
        ...rest,
      });
      return toTextResult(data);
    },

    resolve_field_keys: async (args) => {
      const { tableId, field, desiredKeyType } = parseInput(resolveFieldKeysInput, args);
      const data = await client.get(`/table/${tableId}/field`);
      const fields = extractFieldList(data);
      const resolution = resolveFieldKeyMapping(fields, field, desiredKeyType);

      if (!resolution) {
        throw new Error(`Field not found: ${field}`);
      }

      return toTextResult({
        ...resolution,
        availableFieldCount: fields.length,
      });
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

      const data = await client.oauthExchangeCode(payload);
      return toTextResult(data);
    },

    oauth_refresh_token: async (args) => {
      const parsed = parseInput(oauthRefreshTokenInput, args);
      const data = await client.oauthRefresh({
        clientId: parsed.clientId || context.oauthClientId,
        clientSecret: parsed.clientSecret || context.oauthClientSecret,
        refreshToken: parsed.refreshToken,
      });
      return toTextResult(data);
    },

    oauth_revoke_tokens: async (args) => {
      const parsed = parseInput(oauthRevokeTokensInput, args);
      const clientId = parsed.clientId || context.oauthClientId;
      if (!clientId) {
        throw new Error("Missing OAuth clientId. Provide clientId or set TEABLE_OAUTH_CLIENT_ID.");
      }
      const data = await client.oauthRevoke({
        clientId,
        clientSecret: parsed.clientSecret || context.oauthClientSecret,
      });
      return toTextResult(data);
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
    return toTextResult({
      error: {
        message: `Unknown tool: ${name}`,
      },
    }, true);
  }

  try {
    return await handler(args);
  } catch (error) {
    const normalized = formatErrorResponse(error);

    const errorPayload = JSON.parse(normalized.content[0].text) as {
      error: TeableError;
    };

    const message = asMaybeString(errorPayload.error.message);
    if (!message) {
      return toTextResult(
        {
          error: {
            ...errorPayload.error,
            message: "Unhandled tool error",
          },
        },
        true
      );
    }

    return normalized;
  }
}
