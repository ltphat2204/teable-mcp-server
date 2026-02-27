# Teable MCP Server

A **Model Context Protocol (MCP)** server that connects **Teable** — the super-fast, open-source, no-code database — to LLMs like **Claude**, **ChatGPT**, and others.

This server enables AI agents to seamlessly query records, explore schema structures (spaces, bases, tables, views), and retrieve data from your Teable instance using natural language. It acts as a bridge, empowering your AI to interact with your data dynamically and intelligently.

## 🌟 What is Teable?

[Teable](https://teable.io) is a next-generation, open-source, no-code database built on Postgres. It combines the ease of use of a spreadsheet with the power of a relational database.

*   **Hyper-fast**: Handles millions of rows with ease.
*   **Open Source**: You own your data. Self-hostable.
*   **SQL-like**: Powerful querying capabilities.
*   **Real-time**: Collaboration features built-in.
*   **API-first**: Designed for developers and automation.

## ✨ Features

This MCP server exposes a comprehensive set of tools to LLMs, allowing for deep integration with your Teable database:

*   **Discovery tools**: `list_spaces`, `list_bases`, `list_tables`, `list_views`, `get_table_fields`
*   **Record reads**: `list_records`, `list_all_records`, `get_record`, `get_record_history`, `get_record_status`, `get_table_records_history`
*   **Record writes (CRUD)**: `create_records`, `update_record`, `update_multiple_records`, `delete_record`, `delete_records`, `duplicate_record`
*   **Attachments**: `upload_attachment` (supports `filePath` or `fileUrl`)
*   **Helpers**: `link_cell_candidates`, `resolve_field_keys`
*   **OAuth**: `oauth_build_authorize_url`, `oauth_exchange_code`, `oauth_refresh_token`, `oauth_revoke_tokens`
*   **Legacy compatibility**: `query_teable`

## 🛠 Configuration

You can use this server with either a **Teable API Key** or **OAuth tokens**.

1.  **Get your API Key**:
    *   Log in to your Teable account and navigate to [Personal Access Token settings](https://app.teable.ai/setting/personal-access-token).
    *   Click **Create New Token**.
    *   **Enable all read permissions** for the scopes (spaces, bases, tables, records, views, fields).
    *   **Select the appropriate bases** you want the MCP server to access.
    *   Save the token - you'll need this for configuration.

2.  **Environment Variables**:
    You can configure the server using specific environment variables.

| Variable | Description | Required | Default |
| :--- | :--- | :--- | :--- |
| `TEABLE_API_KEY` | Your Personal Access Token | No (if OAuth is used) | - |
| `TEABLE_BASE_URL` | Base Teable URL (without `/api`) | No | `https://app.teable.ai` |
| `TEABLE_OAUTH_ACCESS_TOKEN` | OAuth access token | No | - |
| `TEABLE_OAUTH_REFRESH_TOKEN` | OAuth refresh token | No | - |
| `TEABLE_OAUTH_CLIENT_ID` | OAuth client id | No | - |
| `TEABLE_OAUTH_CLIENT_SECRET` | OAuth client secret | No | - |
| `TEABLE_OAUTH_TOKEN_ENDPOINT` | Override OAuth token endpoint | No | `${TEABLE_BASE_URL}/api/oauth/access_token` |

## 🚀 Usage

> **Note:** For **Option 1** and **Option 2**, since we are using the local source code, you must build the project first.
> ```bash
> npm install && npm run build
> ```

### Option 1: Using with Claude Desktop (Recommended)

Add the following configuration to your `claude_desktop_config.json`:
*   **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
*   **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "teable": {
      "command": "node",
      "args": [
        "/absolute/path/to/teable-mcp-server/dist/index.js"
      ],
      "env": {
        "TEABLE_API_KEY": "mcp_sk_xxxxxxxxxxxxxx",
        "TEABLE_BASE_URL": "https://app.teable.ai"
      }
    }
  }
}
```
*Note: Replace `mcp_sk_xxxxxxxxxxxxxx` with your actual API key.*

### Option 2: Using with Cursor

1.  Open **Cursor Settings**.
2.  Navigate to **Features** -> **MCP**.
3.  Click **+ Add New MCP Server**.
4.  Enter a name (e.g., "Teable").
5.  Select **Type**: `command`.
6.  **Command**:
    ```bash
    node /absolute/path/to/teable-mcp-server/dist/index.js
    ```
7.  Add your Environment Variables in the env section:
    *   `TEABLE_API_KEY`: `your_api_key`
    *   `TEABLE_BASE_URL`: `https://app.teable.ai`


## 💻 Local Development

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/ltphat2204/teable-mcp-server.git
    cd teable-mcp-server
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Build the project**:
    ```bash
    npm run build
    ```

4.  **Debug using MCP Inspector**:
    ```bash
    export TEABLE_API_KEY=your_api_key
    export TEABLE_BASE_URL=https://app.teable.ai
    npm run inspector
    ```

5.  **Run tests**:
    ```bash
    npm test
    ```

6.  **Optional live smoke test**:
    ```bash
    export TEABLE_API_KEY=your_api_key
    export TEABLE_SMOKE_TABLE_ID=your_table_id
    export TEABLE_SMOKE_WRITABLE_FIELD_ID=your_field_id
    npm run test:smoke
    ```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

## 📄 License

This project is licensed under the MIT License.
