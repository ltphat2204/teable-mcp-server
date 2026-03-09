import { afterEach, describe, expect, it, vi } from "vitest";
import { AxiosError, AxiosResponseHeaders } from "axios";
import axios from "axios";
import qs from "qs";
import {
  TeableApiError,
  createTeableClient,
  normalizeAuthToken,
  normalizeTeableError,
  serializeTeableParams,
} from "../src/teable/api.js";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("serializeTeableParams", () => {
  it("serializes array params in repeat format", () => {
    const serialized = serializeTeableParams({ recordIds: ["rec1", "rec2"] });
    expect(serialized).toContain("recordIds=rec1");
    expect(serialized).toContain("recordIds=rec2");
  });

  it("serializes nested filter objects using dot notation", () => {
    const payload = {
      filter: {
        conjunction: "and",
        children: [{ field: "Status", operator: "is", value: ["Open"] }],
      },
    };

    const serialized = serializeTeableParams(payload);
    const parsed = qs.parse(serialized, { allowDots: true });

    expect((parsed.filter as Record<string, unknown>).conjunction).toBe("and");
  });

  it("keeps delete_records query params parseable", () => {
    const serialized = serializeTeableParams({ recordIds: ["a", "b", "c"] });
    const parsed = qs.parse(serialized, { allowDots: true });
    expect(parsed.recordIds).toEqual(["a", "b", "c"]);
  });
});

describe("normalizeTeableError", () => {
  it("extracts status, message, body and request", () => {
    const response = {
      status: 401,
      statusText: "Unauthorized",
      headers: {} as AxiosResponseHeaders,
      config: {
        headers: {} as AxiosResponseHeaders,
      },
      data: {
        message: "invalid token",
        code: "UNAUTHORIZED",
      },
    };

    const axiosError = new AxiosError(
      "Request failed with status code 401",
      "ERR_BAD_REQUEST",
      {
        method: "get",
        url: "/table/tbl1/record",
      },
      undefined,
      response
    );

    const normalized = normalizeTeableError(axiosError);

    expect(normalized.status).toBe(401);
    expect(normalized.message).toBe("invalid token");
    expect(normalized.teableBody).toEqual({ message: "invalid token", code: "UNAUTHORIZED" });
    expect(normalized.request).toEqual({ method: "GET", url: "/table/tbl1/record" });
  });
});

describe("normalizeAuthToken", () => {
  it("returns undefined for empty values", () => {
    expect(normalizeAuthToken()).toBeUndefined();
    expect(normalizeAuthToken("   ")).toBeUndefined();
  });

  it("keeps raw tokens unchanged", () => {
    expect(normalizeAuthToken("mcp_sk_123")).toBe("mcp_sk_123");
  });

  it("strips a bearer prefix", () => {
    expect(normalizeAuthToken("Bearer mcp_sk_123")).toBe("mcp_sk_123");
    expect(normalizeAuthToken(" bearer mcp_sk_123 ")).toBe("mcp_sk_123");
  });
});

describe("oauthRevoke", () => {
  it("posts to /oauth/client/{clientId}/revoke-token", async () => {
    const request = vi.fn(async () => ({ data: { ok: true } }));
    vi.spyOn(axios, "create").mockReturnValue({
      request,
    } as never);

    const client = createTeableClient({
      baseUrl: "https://app.teable.ai",
      apiKey: "token",
    });

    await client.oauthRevoke({
      clientId: "oauth-client",
      clientSecret: "secret",
    });

    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "POST",
        url: "/oauth/client/oauth-client/revoke-token",
      })
    );
  });

  it("throws when revoke clientId is missing", async () => {
    const request = vi.fn(async () => ({ data: { ok: true } }));
    vi.spyOn(axios, "create").mockReturnValue({
      request,
    } as never);

    const client = createTeableClient({
      baseUrl: "https://app.teable.ai",
      apiKey: "token",
    });

    await expect(client.oauthRevoke()).rejects.toBeInstanceOf(TeableApiError);
  });
});

describe("http verbs", () => {
  it("sends api keys in the documented bearer header format", async () => {
    const request = vi.fn(async () => ({ data: { ok: true } }));
    vi.spyOn(axios, "create").mockReturnValue({
      request,
    } as never);

    const client = createTeableClient({
      baseUrl: "https://app.teable.ai",
      apiKey: "mcp_sk_123",
    });

    await client.get("/space");

    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "GET",
        url: "/space",
        headers: expect.objectContaining({
          Authorization: "Bearer mcp_sk_123",
        }),
      })
    );
  });

  it("normalizes bearer-prefixed api keys before sending them", async () => {
    const request = vi.fn(async () => ({ data: { ok: true } }));
    vi.spyOn(axios, "create").mockReturnValue({
      request,
    } as never);

    const client = createTeableClient({
      baseUrl: "https://app.teable.ai",
      apiKey: "Bearer mcp_sk_123",
    });

    await client.get("/space");

    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer mcp_sk_123",
        }),
      })
    );
  });

  it("sends put requests through the shared request pipeline", async () => {
    const request = vi.fn(async () => ({ data: { ok: true } }));
    vi.spyOn(axios, "create").mockReturnValue({
      request,
    } as never);

    const client = createTeableClient({
      baseUrl: "https://app.teable.ai",
      apiKey: "token",
    });

    await client.put("/base/base1/table/tbl1/name", { name: "Renamed" });

    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "PUT",
        url: "/base/base1/table/tbl1/name",
        data: { name: "Renamed" },
      })
    );
  });

  it("sends delete bodies when provided", async () => {
    const request = vi.fn(async () => ({ data: { ok: true } }));
    vi.spyOn(axios, "create").mockReturnValue({
      request,
    } as never);

    const client = createTeableClient({
      baseUrl: "https://app.teable.ai",
      apiKey: "token",
    });

    await client.delete("/comment/tbl1/rec1/c1/reaction", undefined, { reaction: ":+1:" });

    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        method: "DELETE",
        url: "/comment/tbl1/rec1/c1/reaction",
        data: { reaction: ":+1:" },
      })
    );
  });
});
