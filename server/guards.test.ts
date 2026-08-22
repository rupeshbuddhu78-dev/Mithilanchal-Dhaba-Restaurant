import { describe, expect, it } from "vitest";
import { requireRole } from "./guards";

describe("restaurant role protection", () => {
  const context = (role: "customer" | "admin" | "staff" | "rider") => ({ user: { id: 1, role } } as never);
  it("allows the intended role", () => expect(requireRole(context("rider"), ["rider"])).toMatchObject({ role: "rider" }));
  it("rejects a customer from rider work", () => expect(() => requireRole(context("customer"), ["rider"])).toThrow("do not have access"));
});

