import crypto from "node:crypto";
import type { Express, Request, Response } from "express";
import { eq } from "drizzle-orm";
import { orders, paymentAttempts, paymentWebhookEvents } from "../drizzle/schema";
import { cashfreeEventIdentity, getCashfreeOrder, getCashfreePayments, verifyCashfreeWebhookSignature } from "./cashfree";
import { getDb } from "./db";

async function synchroniseCashfreeAttempt(providerOrderId: string, eventId: string, rawBody: Buffer) {
  const db = await getDb();
  if (!db) throw new Error("Database unavailable");
  const [attempt] = await db.select().from(paymentAttempts).where(eq(paymentAttempts.providerOrderId, providerOrderId)).limit(1);
  if (!attempt) return;
  try {
    await db.insert(paymentWebhookEvents).values({ provider: "cashfree", providerEventId: eventId, orderId: attempt.orderId, payloadHash: crypto.createHash("sha256").update(rawBody).digest("hex") });
  } catch {
    return; // Durable duplicate-event protection.
  }
  const remoteOrder = await getCashfreeOrder(providerOrderId);
  if (remoteOrder.order_status === "PAID") {
    await db.update(paymentAttempts).set({ status: "paid" }).where(eq(paymentAttempts.id, attempt.id));
    await db.update(orders).set({ paymentStatus: "paid", status: "placed" }).where(eq(orders.id, attempt.orderId));
    return;
  }
  if (remoteOrder.order_status === "EXPIRED") {
    await db.update(paymentAttempts).set({ status: "expired" }).where(eq(paymentAttempts.id, attempt.id));
    await db.update(orders).set({ paymentStatus: "failed", status: "cancelled" }).where(eq(orders.id, attempt.orderId));
    return;
  }
  const payments = await getCashfreePayments(providerOrderId);
  const latest = payments.at(-1)?.payment_status?.toUpperCase();
  if (latest === "FAILED") await db.update(paymentAttempts).set({ status: "failed" }).where(eq(paymentAttempts.id, attempt.id));
}

export function registerCashfreeWebhook(app: Express) {
  app.post("/api/cashfree/webhook", (req: Request, res: Response, next) => {
    let raw = Buffer.alloc(0);
    req.on("data", chunk => { raw = Buffer.concat([raw, Buffer.from(chunk)]); });
    req.on("end", () => { (req as Request & { rawCashfreeBody?: Buffer }).rawCashfreeBody = raw; next(); });
  }, async (req: Request, res: Response) => {
    const rawBody = (req as Request & { rawCashfreeBody?: Buffer }).rawCashfreeBody || Buffer.alloc(0);
    const signature = req.header("x-webhook-signature");
    const timestamp = req.header("x-webhook-timestamp");
    if (!verifyCashfreeWebhookSignature(rawBody, signature, timestamp)) return res.status(401).json({ error: "Invalid webhook signature" });
    try {
      const payload = JSON.parse(rawBody.toString("utf8")) as Record<string, unknown>;
      const data = payload.data as { order?: { order_id?: string } } | undefined;
      const providerOrderId = data?.order?.order_id;
      if (providerOrderId) await synchroniseCashfreeAttempt(providerOrderId, cashfreeEventIdentity(payload, rawBody), rawBody);
      return res.status(200).json({ received: true });
    } catch (error) {
      console.error("[Cashfree] webhook processing failed", error);
      return res.status(500).json({ error: "Webhook processing failed" });
    }
  });
}
