import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";

export function DeliveryAssignment() {
  const utils = trpc.useUtils();
  const orders = trpc.operations.admin.orders.useQuery();
  const riders = trpc.operations.admin.riders.useQuery();
  const [riderByOrder, setRiderByOrder] = useState<Record<number, string>>({});
  const assign = trpc.operations.admin.assignRider.useMutation({ onSuccess: () => { utils.operations.admin.orders.invalidate(); toast.success("Rider assigned"); }, onError: error => toast.error(error.message) });
  const readyOrders = orders.data?.filter(order => order.status === "ready_for_pickup") ?? [];
  return <section className="mt-7 rounded-3xl bg-white p-6"><p className="eyebrow">Dispatch</p><h2 className="mt-2 font-serif text-2xl font-semibold">Assign delivery riders</h2><p className="mt-2 text-sm text-[#74695b]">Only ready orders are shown. The selected rider receives a protected task visible only in their own rider workspace.</p><div className="mt-5 space-y-3">{readyOrders.map(order => <div key={order.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#272119]/10 p-3"><div className="min-w-32 flex-1"><p className="font-bold">{order.orderNo}</p><p className="text-xs text-[#74695b]">₹{(order.grandTotalPaise / 100).toFixed(0)} · {order.paymentMethod === "cod" ? "Collect COD on delivery" : "Paid online / verification pending"}</p></div><select value={riderByOrder[order.id] || ""} onChange={event => setRiderByOrder(current => ({ ...current, [order.id]: event.target.value }))} className="rounded-xl border border-[#272119]/15 bg-[#fbf8f2] px-3 py-2 text-sm"><option value="">Choose rider</option>{riders.data?.map(rider => <option key={rider.id} value={String(rider.id)}>{rider.name || rider.email || `Rider ${rider.id}`}</option>)}</select><Button disabled={!riderByOrder[order.id] || assign.isPending} onClick={() => assign.mutate({ orderId: order.id, riderUserId: Number(riderByOrder[order.id]) })} className="rounded-xl bg-[#ae3f25]">Assign</Button></div>)}{readyOrders.length === 0 && <p className="rounded-2xl bg-[#fbf8f2] p-4 text-sm text-[#74695b]">There are no ready-for-pickup orders to dispatch.</p>}</div></section>;
}
