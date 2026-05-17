# Teable MCP Server

A Model Context Protocol (MCP) server that connects Teable to LLM clients over STDIO.

This server exposes Teable discovery, schema management, record read/write, aggregation, comments, attachment, helper, and OAuth tools so an agent can work with your Teable data directly.

## What Is Teable?

[Teable](https://teable.io) is an open-source no-code database built on Postgres, combining spreadsheet-style UX with relational data capabilities.

## Features

This server currently registers these tool groups:

- Discovery: `list_spaces`, `list_bases`, `get_base`, `list_tables`, `get_table`, `get_table_fields`, `get_field`, `list_views`, `get_view`
- Table management: `create_table`, `delete_table`, `update_table_name`, `update_table_description`, `update_table_order`, `duplicate_table`
- Field management: `create_field`, `update_field`, `delete_field`, `delete_fields`, `convert_field`, `duplicate_field`, `get_field_delete_references`
- View management: `create_view`, `delete_view`, `update_view_name`, `update_view_description`, `update_view_filter`, `update_view_sort`, `update_view_group`, `update_view_options`, `update_view_record_order`, `duplicate_view`
- Record reads: `list_records`, `list_all_records`, `get_record`, `get_record_history`, `get_record_status`, `get_table_records_history`
- Record writes: `create_records`, `update_record`, `update_multiple_records`, `delete_record`, `delete_records`, `duplicate_record`
- Aggregation: `get_aggregated_statistics`, `get_total_row_count`, `get_total_search_count`, `get_search_record_indices`, `get_record_index`, `get_group_points`, `get_calendar_daily_collection`, `get_task_status_collection`
- Comments: `list_comments`, `create_comment`, `get_comment`, `update_comment`, `delete_comment`, `add_comment_reaction`, `remove_comment_reaction`, `get_comment_subscription`, `subscribe_comments`, `unsubscribe_comments`, `get_record_comment_count`, `get_table_comment_count`
- Attachments: `upload_attachment`, `insert_attachment`
- Helpers: `link_cell_candidates`, `resolve_field_keys`
- OAuth helpers: `oauth_build_authorize_url`, `oauth_exchange_code`, `oauth_refresh_token`, `oauth_revoke_tokens`
- Advanced: `sql_query` when `TEABLE_ENABLE_SQL_QUERY=true`
- Legacy compatibility: `query_teable`

## Configuration

### 1) Create Teable Credentials

- For API key auth, create a Personal Access Token in [Teable Personal Access Token settings](https://app.teable.ai/setting/personal-access-token).
- Enable scopes based on the tools you will use.
- Read-only tools need read scopes.
- Write tools need the corresponding write scopes.

### 2) Environment Variables

| Variable | Description | Required | Default |
| :--- | :--- | :--- | :--- |
| `TEABLE_API_KEY` | Teable Personal Access Token. Use the raw PAT; the server sends `Authorization: Bearer <token>`. If you include the `Bearer ` prefix, it will be stripped. | No | - |
| `TEABLE_BASE_URL` | Teable base URL. `https://app.teable.ai` and `https://app.teable.ai/api` both work. | No | `https://app.teable.ai` |
| `TEABLE_OAUTH_ACCESS_TOKEN` | OAuth access token (preferred over `TEABLE_API_KEY` when present) | No | - |
| `TEABLE_OAUTH_REFRESH_TOKEN` | OAuth refresh token | No | - |
| `TEABLE_OAUTH_CLIENT_ID` | OAuth client ID | No | - |
| `TEABLE_OAUTH_CLIENT_SECRET` | OAuth client secret | No | - |
| `TEABLE_OAUTH_TOKEN_ENDPOINT` | Override token endpoint | No | `${normalized(TEABLE_BASE_URL)}/api/oauth/access_token` |
| `TEABLE_ENABLE_SQL_QUERY` | Register `sql_query` and allow gated read-only SQL | No | `false` |

### Runtime Rules

- Server startup does not require `TEABLE_API_KEY` or OAuth tokens.
- Data tools require valid auth at call time.
- Auth precedence is: `TEABLE_OAUTH_ACCESS_TOKEN` first, then `TEABLE_API_KEY`.
- Teable PATs are sent as `Authorization: Bearer <token>` per the Teable API guides.
- If Teable returns `401` and refresh credentials are configured, the client attempts one token refresh and retries once.
- `TEABLE_OAUTH_CLIENT_ID` and `TEABLE_OAUTH_CLIENT_SECRET` must be set together.
- `TEABLE_OAUTH_REFRESH_TOKEN` requires both OAuth client env vars above.
- `sql_query` is not registered unless `TEABLE_ENABLE_SQL_QUERY=true`.
- `sql_query` accepts a single read-only statement only. The first executable keyword must be `SELECT`, `WITH`, or `EXPLAIN`.
- This server does not auto-load `.env`; MCP host/client should provide env vars.

## Usage

Build once before using local source:

```bash
npm install
npm run build
```

### Option 1: Claude Desktop

Add to `claude_desktop_config.json`:

- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\\Claude\\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "teable": {
      "command": "node",
      "args": ["/absolute/path/to/teable-mcp-server/dist/index.js"],
      "env": {
        "TEABLE_API_KEY": "mcp_sk_xxxxxxxxxxxxxx",
        "TEABLE_BASE_URL": "https://app.teable.ai"
      }
    }
  }
}
```

To enable gated SQL:

```json
{
  "TEABLE_ENABLE_SQL_QUERY": "true"
}
```

### Option 2: Cursor

1. Open Cursor Settings.
2. Go to Features -> MCP.
3. Add a new MCP server with type `command`.
4. Command:

```bash
node /absolute/path/to/teable-mcp-server/dist/index.js
```

5. Add env vars such as `TEABLE_API_KEY`, `TEABLE_BASE_URL`, and optionally `TEABLE_ENABLE_SQL_QUERY`.

### MCPorter Note

- When registering with `mcporter`, use `--arg` (repeatable) rather than `--args`.

## Tool Reference

### Discovery And Structure

- `list_spaces`: GET `/space`
- `list_bases`: GET `/space/{spaceId}/base`
- `get_base`: GET `/base/{baseId}`
- `list_tables`: GET `/base/{baseId}/table`
- `get_table`: GET `/base/{baseId}/table/{tableId}`
- `create_table`: POST `/base/{baseId}/table/`
  Required: `baseId`, `name`
  Optional: `dbTableName`, `description`, `icon`, `fields`
- `delete_table`: DELETE `/base/{baseId}/table/{tableId}`
- `update_table_name`: PUT `/base/{baseId}/table/{tableId}/name`
- `update_table_description`: PUT `/base/{baseId}/table/{tableId}/description`
- `update_table_order`: PUT `/base/{baseId}/table/{tableId}/order`
  Required: `anchorId`, `position`
- `duplicate_table`: POST `/base/{baseId}/table/{tableId}/duplicate`
  Required: `name`, `includeRecords`

### Fields

- `get_table_fields`: GET `/table/{tableId}/field`
- `get_field`: GET `/table/{tableId}/field/{fieldId}`
- `create_field`: POST `/table/{tableId}/field`
  Required: `tableId`, `field`
  `field` mirrors Teable's field-create JSON body.
- `update_field`: PATCH `/table/{tableId}/field/{fieldId}`
  Required: `tableId`, `fieldId`, `field`
- `delete_field`: DELETE `/table/{tableId}/field/{fieldId}`
- `delete_fields`: DELETE `/table/{tableId}/field`
  Required: `fieldIds`
- `convert_field`: PUT `/table/{tableId}/field/{fieldId}/convert`
  Required: `tableId`, `fieldId`, `field`
- `duplicate_field`: POST `/table/{tableId}/field/{fieldId}/duplicate`
  Optional: `name` (auto-named by API when omitted), `viewId`
- `get_field_delete_references`: GET `/table/{tableId}/field/delete-references`
  Required: `fieldIds`

### Views

- `list_views`: GET `/table/{tableId}/view`
- `get_view`: GET `/table/{tableId}/view/{viewId}`
- `create_view`: POST `/table/{tableId}/view`
  Required: `tableId`, `view`
  `view` mirrors Teable's view-create JSON body.
- `delete_view`: DELETE `/table/{tableId}/view/{viewId}`
- `update_view_name`: PUT `/table/{tableId}/view/{viewId}/name`
- `update_view_description`: PUT `/table/{tableId}/view/{viewId}/description`
- `update_view_filter`: PUT `/table/{tableId}/view/{viewId}/filter`
  Required: `filter`
- `update_view_sort`: PUT `/table/{tableId}/view/{viewId}/sort`
  Required: `sortObjs`
  Optional: `manualSort`
- `update_view_group`: PUT `/table/{tableId}/view/{viewId}/group`
  Required: `groups`
- `update_view_options`: PATCH `/table/{tableId}/view/{viewId}/options`
  Required: `options`
- `update_view_record_order`: PUT `/table/{tableId}/view/{viewId}/record-order`
  Required: `anchorId`, `position`, `recordIds`
- `duplicate_view`: POST `/table/{tableId}/view/{viewId}/duplicate`
  Required: `view`

### Records

- `get_record`: GET `/table/{tableId}/record/{recordId}`
- `get_record_history`: GET `/table/{tableId}/record/{recordId}/history`
- `get_record_status`: GET `/table/{tableId}/record/{recordId}/status`
- `get_table_records_history`: GET `/table/{tableId}/record/history`
  Optional: `take`, `skip`, `cursor`
- `list_records`: GET `/table/{tableId}/record`
  Default `take=100`, `skip=0`
- `list_all_records`: paged GET `/table/{tableId}/record`
  Defaults: `pageSize=200`, `maxRecords=5000`
- `create_records`: POST `/table/{tableId}/record`
- `update_record`: PATCH `/table/{tableId}/record/{recordId}`
- `update_multiple_records`: PATCH `/table/{tableId}/record`
- `delete_record`: DELETE `/table/{tableId}/record/{recordId}`
- `delete_records`: DELETE `/table/{tableId}/record`
- `duplicate_record`: POST `/table/{tableId}/record/{recordId}/duplicate`
- `query_teable`: legacy wrapper over list-records style queries

Common optional query fields for `list_records` and `list_all_records`:

- `viewId`, `projection`, `fieldKeyType`, `cellFormat`
- `ignoreViewQuery`
- `filter`, `filterByTql`, `search`, `orderBy`, `groupBy`
- `collapsedGroupIds`, `queryId`
- `filterLinkCellCandidate`, `filterLinkCellSelected`
- `selectedRecordIds`
- `take`, `skip`

Optional query fields for `get_table_comment_count`:

- `viewId`, `ignoreViewQuery`
- `filter`, `filterByTql`, `search`
- `filterLinkCellCandidate`, `filterLinkCellSelected`
- `selectedRecordIds`

### Aggregation

- `get_aggregated_statistics`: GET `/table/{tableId}/aggregation`
- `get_total_row_count`: GET `/table/{tableId}/aggregation/row-count`
- `get_total_search_count`: GET `/table/{tableId}/aggregation/search-count`
- `get_search_record_indices`: GET `/table/{tableId}/aggregation/search-index`
- `get_record_index`: GET `/table/{tableId}/aggregation/record-index`
  Required: `recordId`
- `get_group_points`: GET `/table/{tableId}/aggregation/group-points`
- `get_calendar_daily_collection`: GET `/table/{tableId}/aggregation/calendar-daily-collection`
  Required: `startDate`, `endDate`, `startDateFieldId`, `endDateFieldId`
- `get_task_status_collection`: GET `/table/{tableId}/aggregation/task-status-collection`

### Comments

- `list_comments`: GET `/comment/{tableId}/{recordId}/list`
  Optional: `take`, `cursor`, `includeCursor`, `direction`
- `create_comment`: POST `/comment/{tableId}/{recordId}/create`
  Required: `content`
  Optional: `quoteId`
- `get_comment`: GET `/comment/{tableId}/{recordId}/{commentId}`
- `update_comment`: PATCH `/comment/{tableId}/{recordId}/{commentId}`
  Required: `content`
- `delete_comment`: DELETE `/comment/{tableId}/{recordId}/{commentId}`
- `add_comment_reaction`: POST `/comment/{tableId}/{recordId}/{commentId}/reaction`
  Required: `reaction`
- `remove_comment_reaction`: DELETE `/comment/{tableId}/{recordId}/{commentId}/reaction`
  Required: `reaction`
- `get_comment_subscription`: GET `/comment/{tableId}/{recordId}/subscribe`
- `subscribe_comments`: POST `/comment/{tableId}/{recordId}/subscribe`
- `unsubscribe_comments`: DELETE `/comment/{tableId}/{recordId}/subscribe`
- `get_record_comment_count`: GET `/comment/{tableId}/{recordId}/count`
- `get_table_comment_count`: GET `/comment/{tableId}/count`

### Attachments And Helpers

- `upload_attachment`: POST `/table/{tableId}/record/{recordId}/{fieldId}/uploadAttachment`
  Required: exactly one of `filePath` or `fileUrl`
- `insert_attachment`: POST `/table/{tableId}/record/{recordId}/{fieldId}/insertAttachment`
  Required: `attachments`
  Optional: `anchorId`
- `link_cell_candidates`: list-records style helper for link-cell selection
- `resolve_field_keys`: resolve a field identifier into `id`, `name`, or `dbFieldName`

### OAuth And Advanced

- `oauth_build_authorize_url`: build an OAuth authorize URL
- `oauth_exchange_code`: exchange code for tokens
- `oauth_refresh_token`: refresh an access token
- `oauth_revoke_tokens`: revoke OAuth tokens for a client
- `sql_query`: POST `/base/{baseId}/sql-query`
  Only registered when `TEABLE_ENABLE_SQL_QUERY=true`
  Required: `baseId`, `sql`
  Only a single read-only statement is allowed

## Local Development

```bash
git clone https://github.com/apooley/teable-mcp-server.git
cd teable-mcp-server
npm install
npm run build
```

Useful scripts:

- `npm start`: run compiled server (`dist/index.js`)
- `npm run inspector`: run via MCP Inspector
- `npm test`: run Vitest suite
- `npm run test:smoke`: optional live smoke test

Smoke test environment (optional):

```bash
export TEABLE_API_KEY=your_api_key
export TEABLE_BASE_URL=https://app.teable.ai
export TEABLE_SMOKE_BASE_ID=your_base_id
export TEABLE_SMOKE_TABLE_ID=your_table_id
export TEABLE_SMOKE_WRITABLE_FIELD_ID=your_field_id
npm run test:smoke
```

## Contributing

Contributions are welcome via pull requests.

## License

MIT
