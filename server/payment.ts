export function buildCheckoutMetadata(input: { orderId: number; userId: number; email?: string | null; name?: string | null }) {
  return { order_id: String(input.orderId), user_id: String(input.userId), customer_email: input.email || "", customer_name: input.name || "" };
}

