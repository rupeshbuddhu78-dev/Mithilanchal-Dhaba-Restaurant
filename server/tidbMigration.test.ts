import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(new URL("../drizzle/0002_tidb_external_schema.sql", import.meta.url), "utf8");

describe("temporary TiDB external schema migration", () => {
  it("adds every previously absent application table without destructive statements", () => {
    for (const table of ["addresses", "carts", "cart_items", "notifications", "coupons", "audit_events"]) {
      expect(migration).toContain(`CREATE TABLE IF NOT EXISTS \`${table}\``);
    }

    expect(migration).not.toMatch(/\b(DROP|TRUNCATE|DELETE)\b/i);
  });
});
