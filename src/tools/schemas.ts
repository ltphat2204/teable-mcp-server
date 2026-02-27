import { z } from "zod";

export const FieldKeyType = z.enum(["name", "id", "dbFieldName"]).optional();
export const CellFormat = z.enum(["json", "text"]).optional();
export const RecordFields = z.record(z.string(), z.any());
export const Position = z.enum(["before", "after"]);
export const RecordOrder = z.object({
  viewId: z.string(),
  anchorId: z.string(),
  position: Position,
});
export const LinkCellCandidateFilter = z.tuple([z.string(), z.string()]);
export const LinkCellSelectedFilter = z.union([z.tuple([z.string()]), z.tuple([z.string(), z.string()])]);

export const ListRecordsQuery = z.object({
  tableId: z.string(),
  viewId: z.string().optional(),
  take: z.number().int().min(1).max(2000).optional(),
  skip: z.number().int().min(0).optional(),

  projection: z.array(z.string()).optional(),
  fieldKeyType: FieldKeyType,
  cellFormat: CellFormat,

  ignoreViewQuery: z.boolean().optional(),

  filter: z.any().optional(),
  filterByTql: z.string().optional(),
  search: z.array(z.any()).optional(),
  orderBy: z.array(z.any()).optional(),
  groupBy: z.array(z.any()).optional(),
  collapsedGroupIds: z.array(z.string()).optional(),
  queryId: z.string().optional(),

  filterLinkCellCandidate: LinkCellCandidateFilter.optional(),
  filterLinkCellSelected: LinkCellSelectedFilter.optional(),
  selectedRecordIds: z.array(z.string()).optional(),
});

export const listRecordsInput = ListRecordsQuery;

export const listAllRecordsInput = ListRecordsQuery.extend({
  pageSize: z.number().int().min(1).max(2000).default(200),
  maxRecords: z.number().int().min(1).max(20000).default(5000),
});

export const createRecordsInput = z.object({
  tableId: z.string(),
  records: z.array(z.object({ fields: RecordFields })).min(1).max(200),
  fieldKeyType: FieldKeyType,
  typecast: z.boolean().optional(),
  order: RecordOrder.optional(),
});

export const updateRecordInput = z.object({
  tableId: z.string(),
  recordId: z.string(),
  fields: RecordFields,
  fieldKeyType: FieldKeyType,
  typecast: z.boolean().optional(),
  order: RecordOrder.optional(),
});

export const updateMultipleRecordsInput = z.object({
  tableId: z.string(),
  records: z
    .array(
      z.object({
        id: z.string(),
        fields: RecordFields,
      })
    )
    .min(1)
    .max(200),
  fieldKeyType: FieldKeyType,
  typecast: z.boolean().optional(),
  order: RecordOrder.optional(),
});

export const deleteRecordInput = z.object({
  tableId: z.string(),
  recordId: z.string(),
});

export const deleteRecordsInput = z.object({
  tableId: z.string(),
  recordIds: z.array(z.string()).min(1).max(2000),
});

export const duplicateRecordInput = z.object({
  tableId: z.string(),
  recordId: z.string(),
  viewId: z.string(),
  anchorId: z.string(),
  position: Position,
});

export const uploadAttachmentInput = z
  .object({
    tableId: z.string(),
    recordId: z.string(),
    fieldId: z.string(),
    filePath: z.string().optional(),
    fileUrl: z.string().url().optional(),
  })
  .refine((value) => (value.filePath ? 1 : 0) + (value.fileUrl ? 1 : 0) === 1, {
    message: "Provide exactly one of filePath or fileUrl",
  });

export const getRecordStatusInput = z.object({
  tableId: z.string(),
  recordId: z.string(),
});

export const getTableRecordsHistoryInput = z.object({
  tableId: z.string(),
  take: z.number().int().min(1).max(2000).optional(),
  skip: z.number().int().min(0).optional(),
  cursor: z.string().optional(),
});

export const linkCellCandidatesInput = z.object({
  tableId: z.string(),
  viewId: z.string().optional(),
  filterLinkCellCandidate: LinkCellCandidateFilter.optional(),
  filterLinkCellSelected: LinkCellSelectedFilter.optional(),
  selectedRecordIds: z.array(z.string()).optional(),
  take: z.number().int().min(1).max(2000).optional(),
  skip: z.number().int().min(0).optional(),
  search: z.array(z.any()).optional(),
  filter: z.any().optional(),
});

export const resolveFieldKeysInput = z.object({
  tableId: z.string(),
  field: z.string(),
  desiredKeyType: z.enum(["name", "id", "dbFieldName"]),
});

export const oauthBuildAuthorizeUrlInput = z.object({
  clientId: z.string().optional(),
  redirectUri: z.string().url(),
  scope: z.string().default("read write"),
  state: z.string().optional(),
});

export const oauthExchangeCodeInput = z.object({
  clientId: z.string().optional(),
  clientSecret: z.string().optional(),
  code: z.string(),
  redirectUri: z.string().url(),
});

export const oauthRefreshTokenInput = z.object({
  clientId: z.string().optional(),
  clientSecret: z.string().optional(),
  refreshToken: z.string(),
});

export const oauthRevokeTokensInput = z.object({
  clientId: z.string().optional(),
  clientSecret: z.string().optional(),
});
