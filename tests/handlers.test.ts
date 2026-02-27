import { Readable } from "node:stream";
import { describe, expect, it, vi } from "vitest";
import { buildAttachmentForm, makeHandlers, resolveFieldKeyMapping } from "../src/tools/handlers.js";
import { TeableClient } from "../src/teable/api.js";

const createMockClient = () => {
  const client: TeableClient = {
    get: vi.fn(async () => ({ ok: true })),
    post: vi.fn(async () => ({ ok: true })),
    patch: vi.fn(async () => ({ ok: true })),
    delete: vi.fn(async () => ({ ok: true })),
    postForm: vi.fn(async () => ({ ok: true })),
    oauthExchangeCode: vi.fn(async () => ({ ok: true })),
    oauthRefresh: vi.fn(async () => ({ ok: true })),
    oauthRevoke: vi.fn(async () => ({ ok: true })),
  };

  return client;
};

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

describe("makeHandlers contract", () => {
  it("passes tuple link-cell filters to list_records", async () => {
    const client = createMockClient();
    const handlers = makeHandlers(client, { baseUrl: "https://app.teable.ai" });

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
    const client = createMockClient();
    const handlers = makeHandlers(client, { baseUrl: "https://app.teable.ai" });

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
    const client = createMockClient();
    const handlers = makeHandlers(client, { baseUrl: "https://app.teable.ai" });

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
    const client = createMockClient();
    const handlers = makeHandlers(client, { baseUrl: "https://app.teable.ai" });

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
    const client = createMockClient();
    const handlers = makeHandlers(client, { baseUrl: "https://app.teable.ai" });

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
    const client = createMockClient();
    const handlers = makeHandlers(client, { baseUrl: "https://app.teable.ai" });

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
});
