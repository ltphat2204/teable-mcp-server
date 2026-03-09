import { z } from "zod";

export const JsonObject = z.record(z.string(), z.unknown());
export const JsonArray = z.array(z.unknown());

export const FieldKeyType = z.enum(["name", "id", "dbFieldName"]).optional();
export const CellFormat = z.enum(["json", "text"]).optional();
export const RecordFields = JsonObject;
export const Position = z.enum(["before", "after"]);
export const CommentDirection = z.enum(["forward", "backward"]);
export const RecordOrder = z.object({
  viewId: z.string(),
  anchorId: z.string(),
  position: Position,
});
export const LinkCellCandidateFilter = z.tuple([z.string(), z.string()]);
export const LinkCellSelectedFilter = z.union([z.tuple([z.string()]), z.tuple([z.string(), z.string()])]);
export const IdList = z.array(z.string()).min(1);
export const AttachmentItem = z
  .object({
    id: z.string(),
    name: z.string(),
    path: z.string(),
    token: z.string(),
    size: z.number(),
    mimetype: z.string(),
    presignedUrl: z.string().optional(),
    width: z.number().optional(),
    height: z.number().optional(),
    smThumbnailUrl: z.string().optional(),
    lgThumbnailUrl: z.string().optional(),
  })
  .passthrough();
export const CommentContent = z.array(JsonObject).min(1);

const commonRecordQueryShape = {
  viewId: z.string().optional(),
  projection: z.array(z.string()).optional(),
  fieldKeyType: FieldKeyType,
  cellFormat: CellFormat,
  ignoreViewQuery: z.boolean().optional(),
  filter: z.unknown().optional(),
  filterByTql: z.string().optional(),
  search: JsonArray.optional(),
  orderBy: JsonArray.optional(),
  groupBy: JsonArray.optional(),
  collapsedGroupIds: z.array(z.string()).optional(),
  queryId: z.string().optional(),
  filterLinkCellCandidate: LinkCellCandidateFilter.optional(),
  filterLinkCellSelected: LinkCellSelectedFilter.optional(),
  selectedRecordIds: z.array(z.string()).optional(),
};

export const ListRecordsQuery = z.object({
  tableId: z.string(),
  take: z.number().int().min(1).max(2000).optional(),
  skip: z.number().int().min(0).optional(),
  ...commonRecordQueryShape,
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
    filePath: z.string().optional().describe("Local filesystem path to the file. Provide exactly one of filePath or fileUrl."),
    fileUrl: z.string().url().optional().describe("Remote URL of the file to upload. Provide exactly one of filePath or fileUrl."),
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
  search: JsonArray.optional(),
  filter: z.unknown().optional(),
});

export const resolveFieldKeysInput = z.object({
  tableId: z.string(),
  field: z.string(),
  desiredKeyType: z.enum(["name", "id", "dbFieldName"]),
});

export const getBaseInput = z.object({
  baseId: z.string(),
});

export const getTableInput = z.object({
  baseId: z.string(),
  tableId: z.string(),
});

export const getFieldInput = z.object({
  tableId: z.string(),
  fieldId: z.string(),
});

export const getViewInput = z.object({
  tableId: z.string(),
  viewId: z.string(),
});

export const createTableInput = z.object({
  baseId: z.string(),
  name: z.string().min(1),
  dbTableName: z.string().optional(),
  description: z.string().nullable().optional(),
  icon: z.string().nullable().optional(),
  fields: z.array(JsonObject).optional(),
});

export const deleteTableInput = z.object({
  baseId: z.string(),
  tableId: z.string(),
});

export const updateTableNameInput = z.object({
  baseId: z.string(),
  tableId: z.string(),
  name: z.string().min(1),
});

export const updateTableDescriptionInput = z.object({
  baseId: z.string(),
  tableId: z.string(),
  description: z.string().nullable(),
});

export const updateTableOrderInput = z.object({
  baseId: z.string(),
  tableId: z.string(),
  anchorId: z.string(),
  position: Position,
});

export const duplicateTableInput = z.object({
  baseId: z.string(),
  tableId: z.string(),
  name: z.string().min(1),
  includeRecords: z.boolean(),
});

export const createFieldInput = z.object({
  tableId: z.string(),
  field: JsonObject,
});

export const updateFieldInput = z.object({
  tableId: z.string(),
  fieldId: z.string(),
  field: JsonObject,
});

export const deleteFieldInput = z.object({
  tableId: z.string(),
  fieldId: z.string(),
});

export const deleteFieldsInput = z.object({
  tableId: z.string(),
  fieldIds: z.array(z.string()).min(1),
});

export const convertFieldInput = z.object({
  tableId: z.string(),
  fieldId: z.string(),
  field: JsonObject,
});

export const duplicateFieldInput = z.object({
  tableId: z.string(),
  fieldId: z.string(),
  name: z.string().min(1).optional(),
  viewId: z.string().optional(),
});

export const getFieldDeleteReferencesInput = z.object({
  tableId: z.string(),
  fieldIds: z.array(z.string()).min(1),
});

export const createViewInput = z.object({
  tableId: z.string(),
  view: JsonObject,
});

export const deleteViewInput = z.object({
  tableId: z.string(),
  viewId: z.string(),
});

export const updateViewNameInput = z.object({
  tableId: z.string(),
  viewId: z.string(),
  name: z.string().min(1),
});

export const updateViewDescriptionInput = z.object({
  tableId: z.string(),
  viewId: z.string(),
  description: z.string(),
});

export const updateViewFilterInput = z.object({
  tableId: z.string(),
  viewId: z.string(),
  filter: JsonObject,
});

export const updateViewSortInput = z.object({
  tableId: z.string(),
  viewId: z.string(),
  sortObjs: z.array(JsonObject),
  manualSort: z.boolean().optional(),
});

export const updateViewGroupInput = z.object({
  tableId: z.string(),
  viewId: z.string(),
  groups: z.array(JsonObject).nullable(),
});

export const updateViewOptionsInput = z.object({
  tableId: z.string(),
  viewId: z.string(),
  options: JsonObject,
});

export const updateViewRecordOrderInput = z.object({
  tableId: z.string(),
  viewId: z.string(),
  anchorId: z.string(),
  position: Position,
  recordIds: z.array(z.string()).min(1).max(1000),
});

export const duplicateViewInput = z.object({
  tableId: z.string(),
  viewId: z.string(),
  view: JsonObject,
});

export const getAggregatedStatisticsInput = z.object({
  tableId: z.string(),
});

export const getTotalRowCountInput = z.object({
  tableId: z.string(),
  viewId: z.string().optional(),
  ignoreViewQuery: z.boolean().optional(),
  filterByTql: z.string().optional(),
  filter: z.unknown().optional(),
  search: JsonArray.optional(),
  filterLinkCellCandidate: LinkCellCandidateFilter.optional(),
  filterLinkCellSelected: LinkCellSelectedFilter.optional(),
  selectedRecordIds: z.array(z.string()).optional(),
});

export const getTotalSearchCountInput = z.object({
  tableId: z.string(),
  viewId: z.string().optional(),
  ignoreViewQuery: z.boolean().optional(),
  filter: z.unknown().optional(),
  search: JsonArray.optional(),
});

export const getSearchRecordIndicesInput = getTotalRowCountInput;

export const getRecordIndexInput = getTotalRowCountInput.extend({
  orderBy: JsonArray.optional(),
  groupBy: JsonArray.optional(),
  collapsedGroupIds: z.array(z.string()).optional(),
  queryId: z.string().optional(),
  recordId: z.string(),
});

export const getGroupPointsInput = z.object({
  tableId: z.string(),
  viewId: z.string().optional(),
  filter: z.unknown().optional(),
  search: JsonArray.optional(),
  groupBy: JsonArray.optional(),
  collapsedGroupIds: z.array(z.string()).optional(),
  ignoreViewQuery: z.boolean().optional(),
});

export const getCalendarDailyCollectionInput = z.object({
  tableId: z.string(),
  viewId: z.string().optional(),
  filter: z.unknown().optional(),
  search: JsonArray.optional(),
  ignoreViewQuery: z.boolean().optional(),
  startDate: z.string(),
  endDate: z.string(),
  startDateFieldId: z.string(),
  endDateFieldId: z.string(),
});

export const getTaskStatusCollectionInput = z.object({
  tableId: z.string(),
});

export const listCommentsInput = z.object({
  tableId: z.string(),
  recordId: z.string(),
  take: z.number().int().min(1).max(1000).optional(),
  cursor: z.string().optional(),
  includeCursor: z.boolean().optional(),
  direction: CommentDirection.optional(),
});

export const createCommentInput = z.object({
  tableId: z.string(),
  recordId: z.string(),
  content: CommentContent,
  quoteId: z.string().optional(),
});

export const getCommentInput = z.object({
  tableId: z.string(),
  recordId: z.string(),
  commentId: z.string(),
});

export const updateCommentInput = z.object({
  tableId: z.string(),
  recordId: z.string(),
  commentId: z.string(),
  content: CommentContent,
});

export const deleteCommentInput = getCommentInput;

export const commentReactionInput = z.object({
  tableId: z.string(),
  recordId: z.string(),
  commentId: z.string(),
  reaction: z.string().min(1),
});

export const commentSubscriptionInput = z.object({
  tableId: z.string(),
  recordId: z.string(),
});

export const getRecordCommentCountInput = z.object({
  tableId: z.string(),
  recordId: z.string(),
});

export const getTableCommentCountInput = ListRecordsQuery;

export const insertAttachmentInput = z.object({
  tableId: z.string(),
  recordId: z.string(),
  fieldId: z.string(),
  attachments: z.array(AttachmentItem).min(1),
  anchorId: z.string().optional(),
});

export const sqlQueryInput = z.object({
  baseId: z.string(),
  sql: z.string().min(1),
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
