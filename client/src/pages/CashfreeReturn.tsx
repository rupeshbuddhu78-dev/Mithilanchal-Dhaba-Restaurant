import { StorefrontLayout } from "@/components/StorefrontLayout";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, Clock3, XCircle } from "lucide-react";
import { Link, useSearch } from "wouter";

export default function CashfreeReturn() {
  const search = useSearch();
  const providerOrderId = new URLSearchParams(search).get("provider_order_id") || "";
  const verification = trpc.commerce.payments.cashfree.verify.useQuery({ providerOrderId }, { enabled: Boolean(providerOrderId), refetchInterval: query => query.state.data?.paymentStatus === "pending" ? 4000 : false });
  const result = verification.data;
  const paid = result?.paymentStatus === "paid";
  const failed = result?.paymentStatus === "failed";
  return <StorefrontLayout><main className="container py-20"><div className="mx-auto max-w-xl rounded-3xl bg-white p-8 text-center shadow-sm">{verification.isLoading ? <><Clock3 className="mx-auto h-10 w-10 animate-pulse text-[#ae3f25]" /><h1 className="mt-5 font-serif text-3xl font-semibold">Confirming your payment</h1><p className="mt-3 text-sm text-[#74695b]">We are verifying Cashfree status securely with the payment provider.</p></> : paid ? <><CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" /><h1 className="mt-5 font-serif text-3xl font-semibold">Payment confirmed</h1><p className="mt-3 text-sm text-[#74695b]">Your order has been confirmed. The restaurant will begin preparing it shortly.</p><Link href={`/orders/${result!.orderId}`}><Button className="mt-6 bg-[#ae3f25]">View your order</Button></Link></> : failed ? <><XCircle className="mx-auto h-10 w-10 text-[#ae3f25]" /><h1 className="mt-5 font-serif text-3xl font-semibold">Payment was not completed</h1><p className="mt-3 text-sm text-[#74695b]">No payment was marked successful. You may return to your orders and retry if available.</p><Link href={`/orders/${result!.orderId}`}><Button className="mt-6 bg-[#ae3f25]">View order</Button></Link></> : <><Clock3 className="mx-auto h-10 w-10 text-[#ae3f25]" /><h1 className="mt-5 font-serif text-3xl font-semibold">Payment is still pending</h1><p className="mt-3 text-sm text-[#74695b]">We have not received a successful provider verification. This page checks again automatically.</p></> }</div></main></StorefrontLayout>;
}
