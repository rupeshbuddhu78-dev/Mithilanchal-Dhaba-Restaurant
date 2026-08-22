import express from "express";
import { afterEach, describe, expect, it, vi } from "vitest";

const constructEvent = vi.fn((_: Buffer, signature: string) => {
  if (signature !== "valid-signature") throw new Error("invalid signature");
  return { id: "evt_test_checkout", type: "checkout.session.completed", data: { object: {} }, created: 0 };
});

vi.mock("./stripe", () => ({ getStripeClient: () => ({ webhooks: { constructEvent } }) }));
import { registerStripeWebhook } from "./stripeWebhook";

async function post(signature: string) {
  const app = express(); registerStripeWebhook(app); const server = await new Promise<ReturnType<typeof app.listen>>(resolve => { const instance = app.listen(0, () => resolve(instance)); });
  const address = server.address(); const port = typeof address === "object" && address ? address.port : 0;
  try { return await fetch(`http://127.0.0.1:${port}/api/stripe/webhook`, { method: "POST", headers: { "content-type": "application/json", "stripe-signature": signature }, body: "{}" }); } finally { await new Promise<void>(resolve => server.close(() => resolve())); }
}

describe("Stripe webhook safety", () => {
  afterEach(() => { process.env.STRIPE_WEBHOOK_SECRET = "whsec_test"; constructEvent.mockClear(); });
  it("acknowledges Stripe test events with the required verification response", async () => { const response = await post("valid-signature"); expect(response.status).toBe(200); await expect(response.json()).resolves.toEqual({ verified: true }); });
  it("rejects an invalid signature before handling the payload", async () => { const response = await post("invalid-signature"); expect(response.status).toBe(400); await expect(response.json()).resolves.toEqual({ error: "Invalid webhook signature." }); });
});

