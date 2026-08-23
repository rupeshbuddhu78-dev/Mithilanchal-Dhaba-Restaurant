import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("active delivery assignment visibility", () => {
  it("shows the assigned rider and permits a deliberate reassignment for an existing active order", () => {
    const source = readFileSync(new URL("../client/src/components/ActiveDeliveryAssignment.tsx", import.meta.url), "utf8");
    expect(source).toContain("operations.admin.activeAssignments.useQuery");
    expect(source).toContain("Current rider:");
    expect(source).toContain("operations.admin.assignRider.useMutation");
    expect(source).toContain("Update rider");
  });
});
