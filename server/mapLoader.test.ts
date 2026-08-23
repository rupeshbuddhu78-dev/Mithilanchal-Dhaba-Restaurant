import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("production Maps proxy loader", () => {
  const source = fs.readFileSync(path.resolve(process.cwd(), "client/src/components/Map.tsx"), "utf8");

  it("does not serialize an undefined frontend proxy key", () => {
    expect(source).toContain('if (API_KEY) params.set("key", API_KEY);');
    expect(source).not.toContain('js?key=${API_KEY}');
  });

  it("shows a non-sensitive fallback when the authorized map script cannot load", () => {
    expect(source).toContain('role="status"');
    expect(source).toContain("The live map could not be loaded.");
    expect(source).toContain("use the available route directions instead.");
  });
});
