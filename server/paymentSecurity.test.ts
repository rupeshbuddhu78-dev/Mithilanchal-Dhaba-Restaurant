import crypto from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { verifyCashfreeWebhookSignature } from "./cashfree";
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
});
