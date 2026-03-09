import { describe, expect, it } from "vitest";
import { getTools } from "../src/tools/definitions.js";

describe("getTools", () => {
  it("omits sql_query when disabled", () => {
    const names = getTools(false).map((tool) => tool.name);
    expect(names).not.toContain("sql_query");
  });

  it("includes sql_query when enabled", () => {
    const names = getTools(true).map((tool) => tool.name);
    expect(names).toContain("sql_query");
  });
});
