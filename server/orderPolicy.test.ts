import { describe, expect, it } from "vitest";
import { ORDER_TRANSITIONS } from "../shared/restaurant";

describe("order status policy", () => {
  it("allows the normal kitchen-to-delivery path", () => {
    expect(ORDER_TRANSITIONS.placed).toContain("accepted");
    expect(ORDER_TRANSITIONS.accepted).toContain("preparing");
    expect(ORDER_TRANSITIONS.out_for_delivery).toContain("delivered");
  });
  it("does not allow terminal states to be reopened", () => {
    expect(ORDER_TRANSITIONS.delivered).toEqual([]);
    expect(ORDER_TRANSITIONS.cancelled).toEqual([]);
  });
});

