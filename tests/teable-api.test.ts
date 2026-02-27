import { afterEach, describe, expect, it, vi } from "vitest";
import { AxiosError, AxiosResponseHeaders } from "axios";
import axios from "axios";
import qs from "qs";
import {
  TeableApiError,
  createTeableClient,
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
