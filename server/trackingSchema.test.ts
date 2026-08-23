import { describe, expect, it } from "vitest";
import { TRACKING_MIGRATION_STATEMENTS } from "./trackingSchema";

describe("tracking schema migration", () => {
  it("contains only idempotent additive coordinate and tracking columns", () => {
    expect(TRACKING_MIGRATION_STATEMENTS).toHaveLength(8);
    for (const statement of TRACKING_MIGRATION_STATEMENTS) {
      expect(statement).toContain("ADD COLUMN IF NOT EXISTS");
      expect(statement).not.toMatch(/DROP|DELETE|UPDATE|TRUNCATE/i);
    }
  });
});
