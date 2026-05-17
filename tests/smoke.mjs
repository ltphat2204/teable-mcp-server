import { createTeableClient } from "../dist/teable/api.js";

const apiKey = process.env.TEABLE_API_KEY;

if (!apiKey) {
  console.log("Skipping smoke test: TEABLE_API_KEY is not set.");
  process.exit(0);
}

const baseUrl = process.env.TEABLE_BASE_URL || "https://app.teable.ai";
const baseId = process.env.TEABLE_SMOKE_BASE_ID;
const tableId = process.env.TEABLE_SMOKE_TABLE_ID;
const writableFieldId = process.env.TEABLE_SMOKE_WRITABLE_FIELD_ID;

const client = createTeableClient({
  baseUrl,
  apiKey,
});

async function run() {
  const spaces = await client.get("/space");
  console.log("list_spaces OK", Array.isArray(spaces) ? spaces.length : "object");

  if (baseId) {
    await client.get(`/base/${baseId}`);
    console.log("get_base OK", baseId);
  } else {
    console.log("Skipping base smoke tests: TEABLE_SMOKE_BASE_ID is not set.");
  }

  if (!tableId) {
    console.log("Skipping record smoke tests: TEABLE_SMOKE_TABLE_ID is not set.");
    return;
  }

  const recordsPage = await client.get(`/table/${tableId}/record`, { take: 1, skip: 0 });
  const count = Array.isArray(recordsPage?.records) ? recordsPage.records.length : 0;
  console.log("list_records OK", count);

  await client.get(`/table/${tableId}/aggregation/row-count`);
  console.log("get_total_row_count OK", tableId);

  if (!writableFieldId) {
    console.log("Skipping create/update/delete: TEABLE_SMOKE_WRITABLE_FIELD_ID is not set.");
    return;
  }

  const createPayload = {
    fieldKeyType: "id",
    records: [
      {
        fields: {
          [writableFieldId]: `mcp-smoke-${Date.now()}`,
        },
      },
    ],
  };

  const created = await client.post(`/table/${tableId}/record`, createPayload);
  const createdRecord = Array.isArray(created?.records) ? created.records[0] : undefined;
  const recordId = createdRecord?.id;

  if (!recordId) {
    console.log("Create response did not include record id. Skipping update/delete.");
    return;
  }

  await client.patch(`/table/${tableId}/record/${recordId}`, {
    fieldKeyType: "id",
    record: {
      fields: {
        [writableFieldId]: `mcp-smoke-updated-${Date.now()}`,
      },
    },
  });
  console.log("update_record OK", recordId);

  await client.delete(`/table/${tableId}/record/${recordId}`);
  console.log("delete_record OK", recordId);
}

run().catch((error) => {
  console.error("Smoke test failed", error);
  process.exit(1);
});
