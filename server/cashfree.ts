import crypto from "node:crypto";

type CashfreeOrder = {
  order_id: string;
  order_status: "ACTIVE" | "PAID" | "EXPIRED" | "TERMINATED" | "TERMINATION_REQUESTED";
  payment_session_id?: string;
};

type CashfreePayment = { cf_payment_id?: string | number; payment_status?: string };

const API_VERSION = process.env.CASHFREE_API_VERSION || "2023-08-01";

export function getCashfreeConfig() {
  const clientId = process.env.CASHFREE_CLIENT_ID;
  const clientSecret = process.env.CASHFREE_CLIENT_SECRET;
  const environment = process.env.CASHFREE_ENVIRONMENT === "production" ? "production" : "sandbox";
  if (!clientId || !clientSecret) return null;
  return {
    clientId,
    clientSecret,
    environment,
    baseUrl: environment === "production" ? "https://api.cashfree.com/pg" : "https://sandbox.cashfree.com/pg",
  } as const;
}

async function requestCashfree<T>(path: string, init: RequestInit & { idempotencyKey?: string }) {
  const config = getCashfreeConfig();
  if (!config) throw new Error("Cashfree is not configured.");
  const response = await fetch(`${config.baseUrl}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      "x-api-version": API_VERSION,
      "x-client-id": config.clientId,
      "x-client-secret": config.clientSecret,
      "x-request-id": crypto.randomUUID(),
      ...(init.idempotencyKey ? { "x-idempotency-key": init.idempotencyKey } : {}),
      ...init.headers,
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.warn("[Cashfree] API request failed", { path, status: response.status, code: body?.code });
    throw new Error("Cashfree could not start the payment. Please try again or choose cash on delivery.");
  }
  return body as T;
}

export async function createCashfreeOrder(input: {
  providerOrderId: string; idempotencyKey: string; amountPaise: number; customerId: string; name?: string | null; email?: string | null; phone: string; returnUrl: string;
}) {
  return requestCashfree<CashfreeOrder>("/orders", {
    method: "POST", idempotencyKey: input.idempotencyKey,
    body: JSON.stringify({
      order_id: input.providerOrderId,
      order_amount: Number((input.amountPaise / 100).toFixed(2)),
      order_currency: "INR",
      customer_details: { customer_id: input.customerId, customer_name: input.name || undefined, customer_email: input.email || undefined, customer_phone: input.phone },
      order_meta: { return_url: input.returnUrl },
      order_note: "Mithilanchal Dhaba online order",
    }),
  });
}

export async function getCashfreeOrder(providerOrderId: string) {
  return requestCashfree<CashfreeOrder>(`/orders/${encodeURIComponent(providerOrderId)}`, { method: "GET" });
}

export async function getCashfreePayments(providerOrderId: string) {
  return requestCashfree<CashfreePayment[]>(`/orders/${encodeURIComponent(providerOrderId)}/payments`, { method: "GET" });
}

export function verifyCashfreeWebhookSignature(rawBody: Buffer, signature: string | undefined, timestamp: string | undefined) {
  const config = getCashfreeConfig();
  if (!config || !signature || !timestamp) return false;
  const expected = crypto.createHmac("sha256", config.clientSecret).update(timestamp).update(rawBody).digest("base64");
  const actual = Buffer.from(signature, "utf8");
  const candidate = Buffer.from(expected, "utf8");
  return actual.length === candidate.length && crypto.timingSafeEqual(actual, candidate);
}

export function cashfreeEventIdentity(payload: Record<string, unknown>, rawBody: Buffer) {
  const data = payload.data as { payment?: { cf_payment_id?: string | number }; order?: { order_id?: string } } | undefined;
  const paymentId = data?.payment?.cf_payment_id;
  if (paymentId !== undefined) return String(paymentId);
  return crypto.createHash("sha256").update(rawBody).digest("hex");
}
