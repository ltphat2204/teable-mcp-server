# Teable MCP Server

A Model Context Protocol (MCP) server that connects Teable to LLM clients (Claude Desktop, Cursor, ChatGPT-compatible MCP clients, etc.) over STDIO.

This server exposes Teable discovery, record read/write, attachment, helper, and OAuth tools so an agent can work with your Teable data directly.

## What Is Teable?

[Teable](https://teable.io) is an open-source no-code database built on Postgres, combining spreadsheet-style UX with relational data capabilities.

## Features

This server currently registers these tools:

- Discovery: `list_spaces`, `list_bases`, `list_tables`, `list_views`, `get_table_fields`
- Record reads: `list_records`, `list_all_records`, `get_record`, `get_record_history`, `get_record_status`, `get_table_records_history`
- Record writes: `create_records`, `update_record`, `update_multiple_records`, `delete_record`, `delete_records`, `duplicate_record`
- Attachments: `upload_attachment` (exactly one of `filePath` or `fileUrl`)
- Helpers: `link_cell_candidates`, `resolve_field_keys`
- OAuth helpers: `oauth_build_authorize_url`, `oauth_exchange_code`, `oauth_refresh_token`, `oauth_revoke_tokens`
- Legacy compatibility: `query_teable`

## Configuration

### 1) Create Teable Credentials

- For API key auth, create a Personal Access Token in [Teable Personal Access Token settings](https://app.teable.ai/setting/personal-access-token).
- Enable scopes based on the tools you will use.
- Read-only tools need read scopes.
- Write tools (`create_*`, `update_*`, `delete_*`, `duplicate_record`, `upload_attachment`) need corresponding write scopes.

### 2) Environment Variables

| Variable | Description | Required | Default |
| :--- | :--- | :--- | :--- |
| `TEABLE_API_KEY` | Teable Personal Access Token (Bearer token) | No | - |
| `TEABLE_BASE_URL` | Teable base URL. `https://app.teable.ai` and `https://app.teable.ai/api` both work. | No | `https://app.teable.ai` |
| `TEABLE_OAUTH_ACCESS_TOKEN` | OAuth access token (preferred over `TEABLE_API_KEY` when present) | No | - |
| `TEABLE_OAUTH_REFRESH_TOKEN` | OAuth refresh token | No | - |
| `TEABLE_OAUTH_CLIENT_ID` | OAuth client ID | No | - |
| `TEABLE_OAUTH_CLIENT_SECRET` | OAuth client secret | No | - |
| `TEABLE_OAUTH_TOKEN_ENDPOINT` | Override token endpoint | No | `${normalized(TEABLE_BASE_URL)}/api/oauth/access_token` |

### Runtime Rules (From Code)

- Server startup does not require `TEABLE_API_KEY` or OAuth tokens.
- Data tools require valid auth at call time (API key or OAuth access token).
- Auth precedence is: `TEABLE_OAUTH_ACCESS_TOKEN` first, then `TEABLE_API_KEY`.
- If Teable returns `401` and refresh credentials are configured, the client attempts one token refresh and retries once.
- `TEABLE_OAUTH_CLIENT_ID` and `TEABLE_OAUTH_CLIENT_SECRET` must be set together.
- `TEABLE_OAUTH_REFRESH_TOKEN` requires both OAuth client env vars above.
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

### Option 2: Cursor

1. Open Cursor Settings.
2. Go to Features -> MCP.
3. Add a new MCP server with type `command`.
4. Command:

```bash
node /absolute/path/to/teable-mcp-server/dist/index.js
```

5. Add env vars such as `TEABLE_API_KEY` and `TEABLE_BASE_URL`.

## Tool Reference

### Discovery

| Tool | Required args | Notes |
| :--- | :--- | :--- |
| `list_spaces` | none | GET `/space` |
| `list_bases` | `spaceId` | GET `/space/{spaceId}/base` |
| `list_tables` | `baseId` | GET `/base/{baseId}/table` |
| `list_views` | `tableId` | GET `/table/{tableId}/view` |
| `get_table_fields` | `tableId` | GET `/table/{tableId}/field` |

### Record Reads

| Tool | Required args | Important defaults / notes |
| :--- | :--- | :--- |
| `get_record` | `tableId`, `recordId` | GET `/table/{tableId}/record/{recordId}` |
| `get_record_history` | `tableId`, `recordId` | GET `/table/{tableId}/record/{recordId}/history` |
| `get_record_status` | `tableId`, `recordId` | GET `/table/{tableId}/record/{recordId}/status` |
| `get_table_records_history` | `tableId` | Optional: `take` (1-2000), `skip` (>=0), `cursor` |
| `list_records` | `tableId` | Default `take=100`, `skip=0` |
| `list_all_records` | `tableId` | Iterative paging. Defaults: `pageSize=200`, `maxRecords=5000` (cap 20000), returns `{ records, meta }` |
| `query_teable` | `tableId` | Legacy. Optional `filter`, `sort`, `limit`, `viewId`; default `limit=100` |

Common optional query fields for `list_records` and `list_all_records`:

- `viewId`
- `projection` (string array)
- `fieldKeyType` (`name` | `id` | `dbFieldName`)
- `cellFormat` (`json` | `text`)
- `ignoreViewQuery`
- `filter`, `filterByTql`, `search`, `orderBy`, `groupBy`
- `collapsedGroupIds`, `queryId`
- `filterLinkCellCandidate` (`[fieldId, recordId]`)
- `filterLinkCellSelected` (`[fieldId]` or `[fieldId, recordId]`)
- `selectedRecordIds`

### Record Writes

| Tool | Required args | Important defaults / notes |
| :--- | :--- | :--- |
| `create_records` | `tableId`, `records` | `records` length 1-200; each record is `{ fields: Record<string, any> }` |
| `update_record` | `tableId`, `recordId`, `fields` | Sends `{ record: { fields } }` |
| `update_multiple_records` | `tableId`, `records` | `records` length 1-200; each item `{ id, fields }` |
| `delete_record` | `tableId`, `recordId` | DELETE `/table/{tableId}/record/{recordId}` |
| `delete_records` | `tableId`, `recordIds` | `recordIds` length 1-2000 |
| `duplicate_record` | `tableId`, `recordId`, `viewId`, `anchorId`, `position` | `position` is `before` or `after` |

Optional write args where supported: `fieldKeyType`, `typecast`, `order` (`{ viewId, anchorId, position }`).

### Attachments and Helpers

| Tool | Required args | Notes |
| :--- | :--- | :--- |
| `upload_attachment` | `tableId`, `recordId`, `fieldId`, and exactly one of `filePath` / `fileUrl` | Upload path: `/table/{tableId}/record/{recordId}/{fieldId}/uploadAttachment` |
| `link_cell_candidates` | `tableId` | Uses list-record style filters; default `take=100`, `skip=0` |
| `resolve_field_keys` | `tableId`, `field`, `desiredKeyType` | Matches by `id`, `name`, or `dbFieldName` and returns resolved mapping |

### OAuth Tools

| Tool | Required args | Notes |
| :--- | :--- | :--- |
| `oauth_build_authorize_url` | `redirectUri` | Optional: `clientId`, `scope` (default `read write`), `state`; needs clientId from args or env |
| `oauth_exchange_code` | `code`, `redirectUri` | Requires client credentials from args or env |
| `oauth_refresh_token` | `refreshToken` | Optional client credentials from args or env |
| `oauth_revoke_tokens` | none | Requires `clientId` from args or env; optional `clientSecret` |

## Local Development

```bash
git clone https://github.com/ltphat2204/teable-mcp-server.git
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
export TEABLE_SMOKE_TABLE_ID=your_table_id
export TEABLE_SMOKE_WRITABLE_FIELD_ID=your_field_id
npm run test:smoke
```

## Contributing

Contributions are welcome via pull requests.

## License

MIT
