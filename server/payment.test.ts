import { describe, expect, it } from "vitest";
import { buildCheckoutMetadata } from "./payment";

describe("Stripe checkout metadata", () => {
  it("serializes only the IDs and non-sensitive customer references needed for reconciliation", () => {
    expect(buildCheckoutMetadata({ orderId: 42, userId: 7, email: "customer@example.com", name: "Customer" })).toEqual({ order_id: "42", user_id: "7", customer_email: "customer@example.com", customer_name: "Customer" });
  });
  it("does not introduce payment credentials or card details when optional profile details are absent", () => {
    expect(buildCheckoutMetadata({ orderId: 42, userId: 7 })).toEqual({ order_id: "42", user_id: "7", customer_email: "", customer_name: "" });
  });
});
