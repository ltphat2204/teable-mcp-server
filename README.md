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

*   **`query_teable`**: Query data from a specific table with advanced support for:
    *   **Filtering**: Use SQL-like or JSON filter syntax to pinpoint exact data.
    *   **Sorting**: Order functionality for organized results.
    *   **Limiting**: Control record counts for efficient context usage.
    *   **Views**: Filter records by specific database views.
*   **`get_record`**: Retrieve precise details of a single record by its ID.
*   **`get_record_history`**: Access the full change history of a specific record to track evolution over time.
*   **`list_spaces`**: Discover all spaces available to the user.
*   **`list_bases`**: detailed listing of all bases within a specific space.
*   **`list_tables`**: detailed listing of all tables within a specific base.
*   **`list_views`**: Retrieve all views within a table to understand different data perspectives.
*   **`get_table_fields`**: Fetch the full schema (field definitions) of a table to enable the AI to understand your data structure and types.

## 🛠 Configuration

To use this server, you need a **Teable API Key**.

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
| `TEABLE_API_KEY` | Your Personal Access Token | **Yes** | - |
| `TEABLE_BASE_URL` | API Endpoint (Change if self-hosting) | **Yes** | `https://app.teable.ai/api` |

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
        "TEABLE_BASE_URL": "https://app.teable.ai/api"
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
    *   `TEABLE_BASE_URL`: `https://app.teable.ai/api`


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
    export TEABLE_BASE_URL=https://app.teable.ai/api
    npm run inspector
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
