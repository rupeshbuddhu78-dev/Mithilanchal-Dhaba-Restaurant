import { describe, expect, it } from "vitest";
import { calculateOptionDelta, calculateOrderTotals } from "./checkout";

describe("restaurant checkout calculations", () => {
  it("includes selected customisation deltas in the food price", () => {
    const value = calculateOptionDelta([{ id: "size", label: "Portion", required: true, choices: [{ id: "regular", label: "Regular", priceDeltaPaise: 0 }, { id: "large", label: "Large", priceDeltaPaise: 5000 }] }], [{ groupId: "size", choiceId: "large" }]);
    expect(value).toBe(5000);
  });
  it("rejects missing required customisations", () => {
    expect(() => calculateOptionDelta([{ id: "spice", label: "Spice", required: true, choices: [{ id: "mild", label: "Mild", priceDeltaPaise: 0 }] }], [])).toThrow("Choose an option");
  });
  it("calculates totals without accepting a negative order amount", () => {
    expect(calculateOrderTotals([{ quantity: 2, unitPricePaise: 24900 }], 3000, 60000)).toEqual({ itemTotalPaise: 49800, deliveryFeePaise: 3000, discountPaise: 60000, grandTotalPaise: 0 });
  });
});

