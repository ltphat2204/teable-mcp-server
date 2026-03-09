import { Readable } from "node:stream";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildAttachmentForm,
  makeHandlers,
  resolveFieldKeyMapping,
  validateReadOnlySqlQuery,
} from "../src/tools/handlers.js";
import { TeableClient } from "../src/teable/api.js";

const createMockClient = () => {
  const client: TeableClient = {
    get: vi.fn(async () => ({ ok: true })),
    post: vi.fn(async () => ({ ok: true })),
    put: vi.fn(async () => ({ ok: true })),
    patch: vi.fn(async () => ({ ok: true })),
    delete: vi.fn(async () => ({ ok: true })),
    postForm: vi.fn(async () => ({ ok: true })),
    oauthExchangeCode: vi.fn(async () => ({ ok: true })),
    oauthRefresh: vi.fn(async () => ({ ok: true })),
    oauthRevoke: vi.fn(async () => ({ ok: true })),
  };

  return client;
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("buildAttachmentForm", () => {
  it("adds fileUrl field when fileUrl is provided", () => {
    const form = buildAttachmentForm({
      tableId: "tbl",
      recordId: "rec",
      fieldId: "fld",
      fileUrl: "https://example.com/file.png",
    });

    const streams = (form as unknown as { _streams?: unknown[] })._streams || [];
    expect(streams.some((stream) => typeof stream === "string" && stream.includes('name="fileUrl"'))).toBe(true);
  });

  it("adds file field when filePath is provided", () => {
    const form = buildAttachmentForm(
      {
        tableId: "tbl",
        recordId: "rec",
        fieldId: "fld",
        filePath: "/tmp/fake.txt",
      },
      () => Readable.from("abc")
    );

    const streams = (form as unknown as { _streams?: unknown[] })._streams || [];
    expect(streams.some((stream) => typeof stream === "string" && stream.includes('name="file"'))).toBe(true);
  });
});

describe("resolveFieldKeyMapping", () => {
  const fields = [
    { id: "fld_name", name: "Name", dbFieldName: "name_db" },
    { id: "fld_status", name: "Status", dbFieldName: "status_db" },
  ];

  it("matches by name", () => {
    const result = resolveFieldKeyMapping(fields, "Name", "id");
    expect(result?.resolvedKey).toBe("fld_name");
  });

  it("matches by id", () => {
    const result = resolveFieldKeyMapping(fields, "fld_status", "dbFieldName");
    expect(result?.resolvedKey).toBe("status_db");
  });

  it("matches by dbFieldName", () => {
    const result = resolveFieldKeyMapping(fields, "name_db", "name");
    expect(result?.resolvedKey).toBe("Name");
  });
});

describe("validateReadOnlySqlQuery", () => {
  it("accepts select statements and removes trailing semicolon", () => {
    expect(validateReadOnlySqlQuery("SELECT * FROM tasks;")).toBe("SELECT * FROM tasks");
  });

  it("accepts explain analyze select", () => {
    expect(validateReadOnlySqlQuery("EXPLAIN ANALYZE SELECT * FROM tasks")).toBe(
      "EXPLAIN ANALYZE SELECT * FROM tasks"
    );
  });

  it("rejects multiple statements", () => {
    expect(() => validateReadOnlySqlQuery("SELECT 1; SELECT 2")).toThrow("exactly one statement");
  });

  it("rejects write keywords", () => {
    expect(() => validateReadOnlySqlQuery("WITH changed AS (UPDATE tasks SET done = true) SELECT * FROM changed")).toThrow(
      "forbidden keyword"
    );
  });

  it("rejects non-read-only first keywords", () => {
    expect(() => validateReadOnlySqlQuery("DELETE FROM tasks")).toThrow("must begin with SELECT, WITH, or EXPLAIN");
  });
});

describe("makeHandlers contract", () => {
  const createHandlers = (context: { sqlQueryEnabled?: boolean } = {}) => {
    const client = createMockClient();
    const handlers = makeHandlers(client, {
      baseUrl: "https://app.teable.ai",
      sqlQueryEnabled: context.sqlQueryEnabled,
    });

    return { client, handlers };
  };

  it("passes tuple link-cell filters to list_records", async () => {
    const { client, handlers } = createHandlers();

    await handlers.list_records({
      tableId: "tbl1",
      filterLinkCellCandidate: ["fldLink", "rec1"],
      filterLinkCellSelected: ["fldLink", "rec2"],
      take: 10,
      skip: 2,
    });

    expect(client.get).toHaveBeenCalledWith("/table/tbl1/record", {
      take: 10,
      skip: 2,
      filterLinkCellCandidate: ["fldLink", "rec1"],
      filterLinkCellSelected: ["fldLink", "rec2"],
    });
  });

  it("sends create_records with fieldKeyType, order and typecast", async () => {
    const { client, handlers } = createHandlers();

    await handlers.create_records({
      tableId: "tbl1",
      fieldKeyType: "id",
      typecast: true,
      order: { viewId: "viw", anchorId: "rec0", position: "after" },
      records: [{ fields: { fld1: "A" } }],
    });

    expect(client.post).toHaveBeenCalledWith("/table/tbl1/record", {
      fieldKeyType: "id",
      typecast: true,
      order: { viewId: "viw", anchorId: "rec0", position: "after" },
      records: [{ fields: { fld1: "A" } }],
    });
  });

  it("sends update_record in the expected body shape", async () => {
    const { client, handlers } = createHandlers();

    await handlers.update_record({
      tableId: "tbl1",
      recordId: "rec1",
      fieldKeyType: "id",
      order: { viewId: "viw", anchorId: "rec0", position: "before" },
      fields: { fld1: "B" },
    });

    expect(client.patch).toHaveBeenCalledWith("/table/tbl1/record/rec1", {
      record: { fields: { fld1: "B" } },
      fieldKeyType: "id",
      order: { viewId: "viw", anchorId: "rec0", position: "before" },
    });
  });

  it("sends update_multiple_records in the expected body shape", async () => {
    const { client, handlers } = createHandlers();

    await handlers.update_multiple_records({
      tableId: "tbl1",
      fieldKeyType: "name",
      typecast: true,
      records: [{ id: "rec1", fields: { Name: "C" } }],
    });

    expect(client.patch).toHaveBeenCalledWith("/table/tbl1/record", {
      records: [{ id: "rec1", fields: { Name: "C" } }],
      fieldKeyType: "name",
      typecast: true,
    });
  });

  it("passes cursor to get_table_records_history", async () => {
    const { client, handlers } = createHandlers();

    await handlers.get_table_records_history({
      tableId: "tbl1",
      cursor: "next-cursor",
      take: 100,
    });

    expect(client.get).toHaveBeenCalledWith("/table/tbl1/record/history", {
      take: 100,
      cursor: "next-cursor",
    });
  });

  it("requires clientId for oauth_revoke_tokens", async () => {
    const { handlers } = createHandlers();

    await expect(handlers.oauth_revoke_tokens({})).rejects.toThrow("Missing OAuth clientId");
  });

  it("uses context clientId when oauth_revoke_tokens input omits it", async () => {
    const client = createMockClient();
    const handlers = makeHandlers(client, {
      baseUrl: "https://app.teable.ai",
      oauthClientId: "ctx-client",
    });

    await handlers.oauth_revoke_tokens({ clientSecret: "sec" });

    expect(client.oauthRevoke).toHaveBeenCalledWith({
      clientId: "ctx-client",
      clientSecret: "sec",
    });
  });

  it.each([
    ["get_base", "get", { baseId: "base1" }, ["/base/base1"]],
    ["get_table", "get", { baseId: "base1", tableId: "tbl1" }, ["/base/base1/table/tbl1"]],
    ["get_field", "get", { tableId: "tbl1", fieldId: "fld1" }, ["/table/tbl1/field/fld1"]],
    ["get_view", "get", { tableId: "tbl1", viewId: "viw1" }, ["/table/tbl1/view/viw1"]],
    [
      "create_table",
      "post",
      { baseId: "base1", name: "Tasks", description: "todo" },
      ["/base/base1/table/", { name: "Tasks", description: "todo" }],
    ],
    ["delete_table", "delete", { baseId: "base1", tableId: "tbl1" }, ["/base/base1/table/tbl1"]],
    [
      "update_table_name",
      "put",
      { baseId: "base1", tableId: "tbl1", name: "Renamed" },
      ["/base/base1/table/tbl1/name", { name: "Renamed" }],
    ],
    [
      "update_table_description",
      "put",
      { baseId: "base1", tableId: "tbl1", description: null },
      ["/base/base1/table/tbl1/description", { description: null }],
    ],
    [
      "update_table_order",
      "put",
      { baseId: "base1", tableId: "tbl1", anchorId: "tbl0", position: "after" },
      ["/base/base1/table/tbl1/order", { anchorId: "tbl0", position: "after" }],
    ],
    [
      "duplicate_table",
      "post",
      { baseId: "base1", tableId: "tbl1", name: "Copy", includeRecords: false },
      ["/base/base1/table/tbl1/duplicate", { name: "Copy", includeRecords: false }],
    ],
    [
      "create_field",
      "post",
      { tableId: "tbl1", field: { name: "Status", type: "singleSelect" } },
      ["/table/tbl1/field", { name: "Status", type: "singleSelect" }],
    ],
    [
      "update_field",
      "patch",
      { tableId: "tbl1", fieldId: "fld1", field: { name: "Status 2" } },
      ["/table/tbl1/field/fld1", { name: "Status 2" }],
    ],
    ["delete_field", "delete", { tableId: "tbl1", fieldId: "fld1" }, ["/table/tbl1/field/fld1"]],
    [
      "convert_field",
      "put",
      { tableId: "tbl1", fieldId: "fld1", field: { type: "singleLineText" } },
      ["/table/tbl1/field/fld1/convert", { type: "singleLineText" }],
    ],
    [
      "duplicate_field",
      "post",
      { tableId: "tbl1", fieldId: "fld1", name: "Status Copy", viewId: "viw1" },
      ["/table/tbl1/field/fld1/duplicate", { name: "Status Copy", viewId: "viw1" }],
    ],
    [
      "get_field_delete_references",
      "get",
      { tableId: "tbl1", fieldIds: ["fld1", "fld2"] },
      ["/table/tbl1/field/delete-references", { fieldIds: ["fld1", "fld2"] }],
    ],
    [
      "create_view",
      "post",
      { tableId: "tbl1", view: { name: "Calendar", type: "calendar" } },
      ["/table/tbl1/view", { name: "Calendar", type: "calendar" }],
    ],
    ["delete_view", "delete", { tableId: "tbl1", viewId: "viw1" }, ["/table/tbl1/view/viw1"]],
    [
      "update_view_name",
      "put",
      { tableId: "tbl1", viewId: "viw1", name: "Board" },
      ["/table/tbl1/view/viw1/name", { name: "Board" }],
    ],
    [
      "update_view_description",
      "put",
      { tableId: "tbl1", viewId: "viw1", description: "desc" },
      ["/table/tbl1/view/viw1/description", { description: "desc" }],
    ],
    [
      "update_view_filter",
      "put",
      { tableId: "tbl1", viewId: "viw1", filter: { conjunction: "and", filterSet: [] } },
      ["/table/tbl1/view/viw1/filter", { filter: { conjunction: "and", filterSet: [] } }],
    ],
    [
      "update_view_sort",
      "put",
      { tableId: "tbl1", viewId: "viw1", sortObjs: [{ fieldId: "fld1", order: "asc" }], manualSort: false },
      ["/table/tbl1/view/viw1/sort", { sortObjs: [{ fieldId: "fld1", order: "asc" }], manualSort: false }],
    ],
    [
      "update_view_group",
      "put",
      { tableId: "tbl1", viewId: "viw1", groups: [{ fieldId: "fld1", order: "desc" }] },
      ["/table/tbl1/view/viw1/group", [{ fieldId: "fld1", order: "desc" }]],
    ],
    [
      "update_view_options",
      "patch",
      { tableId: "tbl1", viewId: "viw1", options: { rowHeight: "medium" } },
      ["/table/tbl1/view/viw1/options", { options: { rowHeight: "medium" } }],
    ],
    [
      "update_view_record_order",
      "put",
      { tableId: "tbl1", viewId: "viw1", anchorId: "rec0", position: "before", recordIds: ["rec1"] },
      ["/table/tbl1/view/viw1/record-order", { anchorId: "rec0", position: "before", recordIds: ["rec1"] }],
    ],
    [
      "duplicate_view",
      "post",
      { tableId: "tbl1", viewId: "viw1", view: { name: "Board Copy" } },
      ["/table/tbl1/view/viw1/duplicate", { name: "Board Copy" }],
    ],
    ["get_aggregated_statistics", "get", { tableId: "tbl1" }, ["/table/tbl1/aggregation"]],
    ["get_task_status_collection", "get", { tableId: "tbl1" }, ["/table/tbl1/aggregation/task-status-collection"]],
    [
      "create_comment",
      "post",
      { tableId: "tbl1", recordId: "rec1", content: [{ type: "p", children: [{ type: "span", value: "hi" }] }] },
      ["/comment/tbl1/rec1/create", { content: [{ type: "p", children: [{ type: "span", value: "hi" }] }] }],
    ],
    ["get_comment", "get", { tableId: "tbl1", recordId: "rec1", commentId: "c1" }, ["/comment/tbl1/rec1/c1"]],
    [
      "update_comment",
      "patch",
      { tableId: "tbl1", recordId: "rec1", commentId: "c1", content: [{ type: "p", children: [] }] },
      ["/comment/tbl1/rec1/c1", { content: [{ type: "p", children: [] }] }],
    ],
    ["delete_comment", "delete", { tableId: "tbl1", recordId: "rec1", commentId: "c1" }, ["/comment/tbl1/rec1/c1"]],
    [
      "add_comment_reaction",
      "post",
      { tableId: "tbl1", recordId: "rec1", commentId: "c1", reaction: ":+1:" },
      ["/comment/tbl1/rec1/c1/reaction", { reaction: ":+1:" }],
    ],
    ["get_comment_subscription", "get", { tableId: "tbl1", recordId: "rec1" }, ["/comment/tbl1/rec1/subscribe"]],
    ["subscribe_comments", "post", { tableId: "tbl1", recordId: "rec1" }, ["/comment/tbl1/rec1/subscribe"]],
    ["unsubscribe_comments", "delete", { tableId: "tbl1", recordId: "rec1" }, ["/comment/tbl1/rec1/subscribe"]],
    ["get_record_comment_count", "get", { tableId: "tbl1", recordId: "rec1" }, ["/comment/tbl1/rec1/count"]],
    [
      "insert_attachment",
      "post",
      {
        tableId: "tbl1",
        recordId: "rec1",
        fieldId: "fldAtt",
        attachments: [{ id: "att1", name: "file.png", path: "/f", token: "tok", size: 42, mimetype: "image/png" }],
      },
      [
        "/table/tbl1/record/rec1/fldAtt/insertAttachment",
        { attachments: [{ id: "att1", name: "file.png", path: "/f", token: "tok", size: 42, mimetype: "image/png" }] },
      ],
    ],
  ])("routes %s through the expected client method", async (toolName, method, args, expectedCall) => {
    const { client, handlers } = createHandlers({ sqlQueryEnabled: true });

    await handlers[toolName as keyof typeof handlers](args);

    expect(client[method as keyof TeableClient]).toHaveBeenCalledWith(...expectedCall);
  });

  it("passes delete_fields as repeat query params", async () => {
    const { client, handlers } = createHandlers();

    await handlers.delete_fields({
      tableId: "tbl1",
      fieldIds: ["fld1", "fld2"],
    });

    expect(client.delete).toHaveBeenCalledWith("/table/tbl1/field", {
      fieldIds: ["fld1", "fld2"],
    });
  });

  it("forwards row count query parameters", async () => {
    const { client, handlers } = createHandlers();

    await handlers.get_total_row_count({
      tableId: "tbl1",
      viewId: "viw1",
      filter: { conjunction: "and", filterSet: [] },
      search: ["Open", "Status", false],
      selectedRecordIds: ["rec1"],
    });

    expect(client.get).toHaveBeenCalledWith("/table/tbl1/aggregation/row-count", {
      viewId: "viw1",
      filter: { conjunction: "and", filterSet: [] },
      search: ["Open", "Status", false],
      selectedRecordIds: ["rec1"],
    });
  });

  it("forwards record index parameters including order and grouping", async () => {
    const { client, handlers } = createHandlers();

    await handlers.get_record_index({
      tableId: "tbl1",
      recordId: "rec1",
      viewId: "viw1",
      orderBy: [{ fieldId: "fld1", order: "asc" }],
      groupBy: [{ fieldId: "fld2", order: "desc" }],
    });

    expect(client.get).toHaveBeenCalledWith("/table/tbl1/aggregation/record-index", {
      recordId: "rec1",
      viewId: "viw1",
      orderBy: [{ fieldId: "fld1", order: "asc" }],
      groupBy: [{ fieldId: "fld2", order: "desc" }],
    });
  });

  it("passes calendar collection date and field requirements", async () => {
    const { client, handlers } = createHandlers();

    await handlers.get_calendar_daily_collection({
      tableId: "tbl1",
      startDate: "2026-01-01",
      endDate: "2026-01-31",
      startDateFieldId: "fldStart",
      endDateFieldId: "fldEnd",
    });

    expect(client.get).toHaveBeenCalledWith("/table/tbl1/aggregation/calendar-daily-collection", {
      startDate: "2026-01-01",
      endDate: "2026-01-31",
      startDateFieldId: "fldStart",
      endDateFieldId: "fldEnd",
    });
  });

  it("passes comment cursor and direction", async () => {
    const { client, handlers } = createHandlers();

    await handlers.list_comments({
      tableId: "tbl1",
      recordId: "rec1",
      take: 50,
      cursor: "next",
      includeCursor: true,
      direction: "backward",
    });

    expect(client.get).toHaveBeenCalledWith("/comment/tbl1/rec1/list", {
      take: 50,
      cursor: "next",
      includeCursor: true,
      direction: "backward",
    });
  });

  it("passes comment reaction deletes in the request body", async () => {
    const { client, handlers } = createHandlers();

    await handlers.remove_comment_reaction({
      tableId: "tbl1",
      recordId: "rec1",
      commentId: "c1",
      reaction: ":+1:",
    });

    expect(client.delete).toHaveBeenCalledWith("/comment/tbl1/rec1/c1/reaction", undefined, {
      reaction: ":+1:",
    });
  });

  it("reuses record-style query params for table comment counts", async () => {
    const { client, handlers } = createHandlers();

    await handlers.get_table_comment_count({
      tableId: "tbl1",
      viewId: "viw1",
      filter: { conjunction: "and", filterSet: [] },
      take: 100,
      skip: 20,
    });

    expect(client.get).toHaveBeenCalledWith("/comment/tbl1/count", {
      viewId: "viw1",
      filter: { conjunction: "and", filterSet: [] },
      take: 100,
      skip: 20,
    });
  });

  it("blocks sql_query when disabled", async () => {
    const { client, handlers } = createHandlers({ sqlQueryEnabled: false });

    await expect(
      handlers.sql_query({
        baseId: "base1",
        sql: "SELECT 1",
      })
    ).rejects.toThrow("disabled");

    expect(client.post).not.toHaveBeenCalled();
  });

  it("rejects unsafe sql before calling the client", async () => {
    const { client, handlers } = createHandlers({ sqlQueryEnabled: true });

    await expect(
      handlers.sql_query({
        baseId: "base1",
        sql: "DELETE FROM tasks",
      })
    ).rejects.toThrow("must begin with SELECT, WITH, or EXPLAIN");

    expect(client.post).not.toHaveBeenCalled();
  });

  it("sends normalized safe sql when enabled", async () => {
    const { client, handlers } = createHandlers({ sqlQueryEnabled: true });

    await handlers.sql_query({
      baseId: "base1",
      sql: "SELECT * FROM tasks;",
    });

    expect(client.post).toHaveBeenCalledWith("/base/base1/sql-query", {
      sql: "SELECT * FROM tasks",
    });
  });
});
