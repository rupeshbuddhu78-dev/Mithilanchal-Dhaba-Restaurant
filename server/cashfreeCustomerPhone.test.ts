import { describe, expect, it } from "vitest";
import { cashfreeCustomerPhone } from "./cashfree";

describe("Cashfree customer phone normalization", () => {
  it("normalizes valid Indian mobile contacts before creating a provider order", () => {
    expect(cashfreeCustomerPhone("+91 98765 43210", "production")).toBe("9876543210");
    expect(cashfreeCustomerPhone("9876543210", "sandbox")).toBe("9876543210");
  });

  it("uses only a static non-personal contact for invalid TEST data in sandbox and rejects it in production", () => {
    expect(cashfreeCustomerPhone("TEST-ADDR-000-20260822", "sandbox")).toBe("9999999999");
    expect(cashfreeCustomerPhone("TEST-ADDR-000-20260822", "production")).toBeNull();
  });
});
