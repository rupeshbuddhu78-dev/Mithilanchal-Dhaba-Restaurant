import crypto from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { verifyCashfreeWebhookSignature } from "./cashfree";
import { isCashfreeRetryEligible, shouldPlaceCashfreeOrder } from "./cashfreeState";
import { hasPersistedMediaReference } from "./mediaSafety";
import { toMenuSavePayload } from "../client/src/lib/menuEditor";
import { hashPassword, verifyPassword } from "./passwordAuth";

const originalSecret = process.env.CASHFREE_CLIENT_SECRET;
afterEach(() => { if (originalSecret === undefined) delete process.env.CASHFREE_CLIENT_SECRET; else process.env.CASHFREE_CLIENT_SECRET = originalSecret; });

describe("payment and account security primitives", () => {
  it("stores password hashes and rejects incorrect passwords", async () => {
    const hash = await hashPassword("a long test password");
    expect(hash).not.toContain("a long test password");
    await expect(verifyPassword("a long test password", hash)).resolves.toBe(true);
    await expect(verifyPassword("incorrect password", hash)).resolves.toBe(false);
  });
  it("accepts only a valid Cashfree raw-body signature", () => {
    process.env.CASHFREE_CLIENT_SECRET = "test-webhook-secret";
    const raw = Buffer.from('{"data":{"order":{"order_id":"MD-CF-1"}}}'); const timestamp = "1720000000";
    const signature = crypto.createHmac("sha256", "test-webhook-secret").update(timestamp).update(raw).digest("base64");
    expect(verifyCashfreeWebhookSignature(raw, signature, timestamp)).toBe(true);
    expect(verifyCashfreeWebhookSignature(raw, "invalid", timestamp)).toBe(false);
  });
  it("allows retries only after a non-paid, terminal payment attempt", () => {
    expect(isCashfreeRetryEligible({ paymentStatus: "failed", status: "pending_payment" }, "expired")).toBe(true);
    expect(isCashfreeRetryEligible({ paymentStatus: "pending", status: "pending_payment" }, "pending")).toBe(false);
    expect(isCashfreeRetryEligible({ paymentStatus: "paid", status: "placed" }, "failed")).toBe(false);
  });
  it("only moves an awaiting order to placed after verified Cashfree payment", () => {
    expect(shouldPlaceCashfreeOrder("pending_payment")).toBe(true);
    expect(shouldPlaceCashfreeOrder("out_for_delivery")).toBe(false);
  });
  it("blocks media deletion when a historical order snapshot still references the image", () => {
    expect(hasPersistedMediaReference({ targetUrl: "https://res.cloudinary.com/example/image/upload/v1/mithilanchal-dhaba/menu/dish.jpg", settingsUrls: [], categoryReferenced: false, menuReferenced: false, orderSnapshotReferenced: true })).toBe(true);
    expect(hasPersistedMediaReference({ targetUrl: "https://res.cloudinary.com/example/image/upload/v1/mithilanchal-dhaba/menu/dish.jpg", settingsUrls: [], categoryReferenced: false, menuReferenced: false, orderSnapshotReferenced: false })).toBe(false);
  });
  it("preserves saved menu customisation data when an administrator edits an image or price", () => {
    const customisation = [{ id: "spice", choices: [{ id: "mild", priceDeltaPaise: 0 }] }];
    const payload = toMenuSavePayload({ id: 8, categoryId: 2, name: "Paneer", slug: "paneer", description: "Updated image", pricePaise: 29900, imageUrl: "https://res.cloudinary.com/example/image/upload/v1/mithilanchal-dhaba/menu/paneer.jpg", isVegetarian: true, isFeatured: true, isAvailable: true, customisation });
    expect(payload.customisation).toEqual(customisation);
  });
});
