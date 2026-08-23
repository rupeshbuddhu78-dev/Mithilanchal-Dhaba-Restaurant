import { DeliveryTrackingMap } from "@/components/DeliveryTrackingMap";
import { trpc } from "@/lib/trpc";
import { MapPinned } from "lucide-react";

export function AdminDeliveryTracking({ orderId }: { orderId: number }) {
  const tracking = trpc.operations.tracking.current.useQuery({ orderId }, { refetchInterval: 15_000 });
  if (!tracking.data) return null;
  return <section className="mt-7 rounded-3xl bg-white p-6"><div className="flex items-center gap-2"><MapPinned className="h-5 w-5 text-[#ae3f25]" /><div><p className="eyebrow">Delivery operations</p><h2 className="mt-1 font-serif text-2xl font-semibold">Live rider tracking</h2></div></div><p className="mt-3 text-sm text-[#74695b]">{tracking.data.orderNo} · {tracking.data.status === "out_for_delivery" ? "Out for delivery" : "Rider assigned"}. This view is restricted to restaurant operations staff.</p><div className="mt-5"><DeliveryTrackingMap destination={tracking.data.destination} riderLocation={tracking.data.riderLocation} /></div><p className="mt-3 text-xs text-[#74695b]">{tracking.data.riderLocation ? "Rider is actively sharing location for this delivery." : "Waiting for rider live-sharing consent."}</p></section>;
}
