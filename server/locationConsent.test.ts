import { describe, expect, it } from "vitest";
import { addressInput } from "./routers/commerce";

const baseAddress = { label: "Home", recipientName: "TEST Customer", phone: "0000000000", line1: "TEST Delivery Point", city: "TEST CITY", state: "Bihar", pincode: "000000" };

describe("address location consent", () => {
  it("accepts manual addresses without coordinates", () => {
    expect(addressInput.safeParse(baseAddress).success).toBe(true);
  });

  it("requires an explicit consent flag and a complete coordinate pair", () => {
    expect(addressInput.safeParse({ ...baseAddress, latitude: 25.6, longitude: 85.1 }).success).toBe(false);
    expect(addressInput.safeParse({ ...baseAddress, latitude: 25.6, locationConsent: true }).success).toBe(false);
    expect(addressInput.safeParse({ ...baseAddress, latitude: 25.6, longitude: 85.1, locationConsent: true }).success).toBe(true);
  });
});
