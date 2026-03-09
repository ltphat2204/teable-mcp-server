// MCP servers receive environment variables from the client configuration
// No need for dotenv which pollutes the stdio stream with informational messages

export function validateConfig() {
    const baseUrl = process.env.TEABLE_BASE_URL;
    if (baseUrl) {
        try {
            new URL(baseUrl);
        } catch {
            throw new Error("Invalid TEABLE_BASE_URL. Expected a valid URL like https://app.teable.ai");
        }
    }

    const tokenEndpoint = process.env.TEABLE_OAUTH_TOKEN_ENDPOINT;
    if (tokenEndpoint) {
        try {
            new URL(tokenEndpoint);
        } catch {
            throw new Error("Invalid TEABLE_OAUTH_TOKEN_ENDPOINT. Expected a valid URL.");
        }
    }

    const hasOauthClientId = Boolean(process.env.TEABLE_OAUTH_CLIENT_ID);
    const hasOauthClientSecret = Boolean(process.env.TEABLE_OAUTH_CLIENT_SECRET);
    if (hasOauthClientId !== hasOauthClientSecret) {
        throw new Error(
            "Incomplete OAuth configuration: set both TEABLE_OAUTH_CLIENT_ID and TEABLE_OAUTH_CLIENT_SECRET."
        );
    }

    const hasOauthRefreshToken = Boolean(process.env.TEABLE_OAUTH_REFRESH_TOKEN);
    if (hasOauthRefreshToken && (!hasOauthClientId || !hasOauthClientSecret)) {
        throw new Error(
            "TEABLE_OAUTH_REFRESH_TOKEN requires TEABLE_OAUTH_CLIENT_ID and TEABLE_OAUTH_CLIENT_SECRET."
        );
    }
}

export function isSqlQueryEnabled() {
    return process.env.TEABLE_ENABLE_SQL_QUERY === "true";
}
