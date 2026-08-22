import express from "express";
import type { Express } from "express";
import { and, eq } from "drizzle-orm";
import { notifications, orderStatusHistory, orders } from "../drizzle/schema";
import { getDb } from "./db";
import { getStripeClient } from "./stripe";

export function registerStripeWebhook(app: Express) {
  app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), async (req, res) => {
    const stripe = getStripeClient();
    const signature = req.headers["stripe-signature"];
    const secret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!stripe || !secret || !signature || typeof signature !== "string") {
      return res.status(400).json({ error: "Webhook signature configuration is missing." });
    }

    try {
      const event = stripe.webhooks.constructEvent(req.body, signature, secret);
      if (event.id.startsWith("evt_test_")) {
        console.log("[Webhook] Test event detected, returning verification response");
        return res.json({ verified: true });
      }

      if (event.type === "checkout.session.completed") {
        const session = event.data.object;
        const orderId = session.metadata?.order_id;
        const db = await getDb();
        if (db && orderId) {
          const [order] = await db.select().from(orders).where(and(eq(orders.id, Number(orderId)), eq(orders.paymentMethod, "stripe"))).limit(1);
          if (order && order.paymentStatus !== "paid") {
            await db.update(orders).set({
              paymentStatus: "paid",
              status: order.status === "pending_payment" ? "placed" : order.status,
              stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : null,
              updatedAt: new Date(),
            }).where(eq(orders.id, order.id));
            await db.insert(orderStatusHistory).values({ orderId: order.id, status: "placed", note: "Secure payment confirmed." });
            await db.insert(notifications).values({ userId: order.userId, type: "payment_confirmed", title: "Payment confirmed", body: `Payment for ${order.orderNo} was confirmed.`, orderId: order.id });
          }
        }
      }

      console.info("[Stripe webhook]", { type: event.type, id: event.id, created: event.created });
      return res.json({ received: true });
    } catch (error) {
      console.error("[Stripe webhook] Signature verification failed", error);
      return res.status(400).json({ error: "Invalid webhook signature." });
    }
  });
}
