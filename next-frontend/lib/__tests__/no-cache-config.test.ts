import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect } from "vitest";

describe("next.config.ts — no cache components guard", () => {
  it("does not enable cacheComponents (per TD-03: dynamic rendering, no cache, this phase)", () => {
    const configSource = readFileSync(resolve(__dirname, "../../next.config.ts"), "utf-8");
    expect(configSource).not.toMatch(/cacheComponents/);
  });
});
