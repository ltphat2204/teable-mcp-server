// MCP servers receive environment variables from the client configuration
// No need for dotenv which pollutes the stdio stream with informational messages

export function validateConfig() {
    if (!process.env.TEABLE_API_KEY) {
        throw new Error('Missing required environment variable: TEABLE_API_KEY. Please set it in your MCP config or .env file');
    }
}
