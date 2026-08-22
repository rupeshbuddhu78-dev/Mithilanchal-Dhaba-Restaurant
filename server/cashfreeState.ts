export function isCashfreeRetryEligible(order: { paymentStatus: string; status: string }, attemptStatus: string | undefined) {
  return order.paymentStatus !== "paid" && ["pending_payment", "cancelled"].includes(order.status) && !!attemptStatus && ["failed", "expired", "cancelled"].includes(attemptStatus);
}

export function shouldPlaceCashfreeOrder(currentOrderStatus: string) {
  return currentOrderStatus === "pending_payment";
}
