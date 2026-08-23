import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";

export function ActiveDeliveryAssignment() {
  const utils = trpc.useUtils();
  const assignments = trpc.operations.admin.activeAssignments.useQuery();
  const riders = trpc.operations.admin.riders.useQuery();
  const [riderByOrder, setRiderByOrder] = useState<Record<number, string>>({});
  const reassign = trpc.operations.admin.assignRider.useMutation({
    onSuccess: () => {
      utils.operations.admin.activeAssignments.invalidate();
      utils.operations.admin.orders.invalidate();
      toast.success("Rider assignment updated");
    },
    onError: error => toast.error(error.message),
  });

  if (assignments.data?.length === 0) return null;

  return <section className="mt-7 rounded-3xl bg-white p-6">
    <p className="eyebrow">Active delivery assignment</p>
    <h2 className="mt-2 font-serif text-2xl font-semibold">Verify the assigned rider</h2>
    <p className="mt-2 text-sm leading-6 text-[#74695b]">Only active rider-assigned or out-for-delivery orders appear here. Updating an assignment keeps the same order and records the selected rider for the existing delivery.</p>
    <div className="mt-5 space-y-3">
      {assignments.data?.map(({ assignment, order, rider }) => {
        const currentRiderId = rider?.id ? String(rider.id) : "";
        const selected = riderByOrder[order.id] ?? currentRiderId;
        return <div key={assignment?.id ?? order.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-[#272119]/10 p-4">
          <div className="min-w-44 flex-1"><p className="font-bold">{order.orderNo}</p><p className="mt-1 text-xs text-[#74695b]">Current rider: {rider?.id ? rider.name || rider.email || `Rider ${rider.id}` : "Unassigned — action required"}</p></div>
          <label className="sr-only" htmlFor={`active-rider-${order.id}`}>Assigned rider for {order.orderNo}</label>
          <select id={`active-rider-${order.id}`} value={selected} onChange={event => setRiderByOrder(current => ({ ...current, [order.id]: event.target.value }))} className="rounded-xl border border-[#272119]/15 bg-[#fbf8f2] px-3 py-2 text-sm">
            <option value="">Choose rider</option>
            {riders.data?.map(candidate => <option key={candidate.id} value={String(candidate.id)}>{candidate.name || candidate.email || `Rider ${candidate.id}`}</option>)}
          </select>
          <Button disabled={reassign.isPending || !selected || selected === currentRiderId} onClick={() => reassign.mutate({ orderId: order.id, riderUserId: Number(selected) })} className="rounded-xl bg-[#ae3f25]">{currentRiderId ? "Update rider" : "Assign rider"}</Button>
        </div>;
      })}
    </div>
  </section>;
}
