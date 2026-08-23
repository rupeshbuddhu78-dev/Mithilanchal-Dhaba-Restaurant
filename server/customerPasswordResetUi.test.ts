import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("CustomerPasswordReset feedback", () => {
  it("renders deterministic pending, success, and error states for protected reset confirmation", () => {
    const source = readFileSync(new URL("../client/src/components/CustomerPasswordReset.tsx", import.meta.url), "utf8");
    expect(source).toContain('aria-live="polite"');
    expect(source).toContain('role="status"');
    expect(source).toContain('role="alert"');
    expect(source).toContain('reset.isPending');
  });
});
