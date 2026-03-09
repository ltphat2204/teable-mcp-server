import { afterEach, describe, expect, it } from "vitest";
import { isSqlQueryEnabled, validateConfig } from "../src/config.js";

const ENV_KEYS = [
  "TEABLE_BASE_URL",
  "TEABLE_OAUTH_TOKEN_ENDPOINT",
  "TEABLE_OAUTH_CLIENT_ID",
  "TEABLE_OAUTH_CLIENT_SECRET",
  "TEABLE_OAUTH_REFRESH_TOKEN",
  "TEABLE_ENABLE_SQL_QUERY",
] as const;

const initialEnv = Object.fromEntries(ENV_KEYS.map((key) => [key, process.env[key]]));

afterEach(() => {
  for (const key of ENV_KEYS) {
    const value = initialEnv[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
});

describe("validateConfig", () => {
  it("throws when TEABLE_BASE_URL is invalid", () => {
    process.env.TEABLE_BASE_URL = "not-a-url";
    expect(() => validateConfig()).toThrow("Invalid TEABLE_BASE_URL");
  });

  it("throws on partial OAuth credentials", () => {
    delete process.env.TEABLE_OAUTH_CLIENT_ID;
    process.env.TEABLE_OAUTH_CLIENT_SECRET = "secret";
    expect(() => validateConfig()).toThrow("Incomplete OAuth configuration");
  });

  it("throws when refresh token is set without OAuth client credentials", () => {
    delete process.env.TEABLE_OAUTH_CLIENT_ID;
    delete process.env.TEABLE_OAUTH_CLIENT_SECRET;
    process.env.TEABLE_OAUTH_REFRESH_TOKEN = "refresh";
    expect(() => validateConfig()).toThrow("requires TEABLE_OAUTH_CLIENT_ID");
  });

  it("allows OAuth bootstrap mode with no credentials", () => {
    delete process.env.TEABLE_OAUTH_CLIENT_ID;
    delete process.env.TEABLE_OAUTH_CLIENT_SECRET;
    delete process.env.TEABLE_OAUTH_REFRESH_TOKEN;
    delete process.env.TEABLE_BASE_URL;
    expect(() => validateConfig()).not.toThrow();
  });

  it("enables sql only when the flag is true", () => {
    process.env.TEABLE_ENABLE_SQL_QUERY = "true";
    expect(isSqlQueryEnabled()).toBe(true);

    process.env.TEABLE_ENABLE_SQL_QUERY = "false";
    expect(isSqlQueryEnabled()).toBe(false);
  });
});
