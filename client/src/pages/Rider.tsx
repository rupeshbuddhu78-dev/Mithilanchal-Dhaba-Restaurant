import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout, { type DashboardNavItem } from "@/components/DashboardLayout";
import { DeliveryTrackingMap } from "@/components/DeliveryTrackingMap";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { buildAddressDirectionsUrl, buildLiveDirectionsUrl, type DeliveryDestination } from "@/lib/riderNavigation";
import { trpc } from "@/lib/trpc";
import { CheckCircle2, Compass, LayoutDashboard, MapPinned, Navigation, PackageCheck, RadioTower } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

const nav: DashboardNavItem[] = [{ icon: LayoutDashboard, label: "My deliveries", path: "/rider" }, { icon: MapPinned, label: "Location context", path: "/rider/location" }];
type Coordinates = { latitude: number; longitude: number };
type DeliveryAddress = { recipientName?: string; phone?: string; line1?: string; city?: string; pincode?: string; deliveryInstructions?: string; latitude?: string | number; longitude?: string | number };

function destinationCoordinates(address: DeliveryAddress): Coordinates | null {
  const latitude = Number(address.latitude); const longitude = Number(address.longitude);
  return Number.isFinite(latitude) && latitude >= -90 && latitude <= 90 && Number.isFinite(longitude) && longitude >= -180 && longitude <= 180 ? { latitude, longitude } : null;
}

export default function Rider() {
  const { user, loading } = useAuth();
  const allowed = user?.role === "rider";
  const utils = trpc.useUtils();
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [recoveryOpen, setRecoveryOpen] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<Coordinates | null>(null); const [trackingOrderId, setTrackingOrderId] = useState<number | null>(null);
  const lastLocationSentAt = useRef(0);
  const riderLogin = trpc.auth.passwordLogin.useMutation({ onSuccess: () => utils.auth.me.invalidate(), onError: error => toast.error(error.message) });
  const recovery = trpc.auth.passwordResetRequest.useMutation({ onSuccess: () => { setRecoveryOpen(false); toast.success("If an eligible account exists, restaurant staff will follow up."); }, onError: () => toast.success("If an eligible account exists, restaurant staff will follow up.") });
  const tasks = trpc.operations.rider.tasks.useQuery(undefined, { enabled: allowed });
  const update = trpc.operations.rider.updateStatus.useMutation({ onSuccess: () => { utils.operations.rider.tasks.invalidate(); toast.success("Delivery progress updated"); }, onError: error => toast.error(error.message) });
  const tracking = trpc.operations.rider.updateTrackingLocation.useMutation({ onError: error => toast.error(error.message) });
  const stopTracking = trpc.operations.rider.stopTracking.useMutation({ onSuccess: () => toast.success("Live location sharing stopped"), onError: error => toast.error(error.message) });

  useEffect(() => {
    if (!trackingOrderId || !navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(position => {
      const now = Date.now(); if (now - lastLocationSentAt.current < 12_000) return;
      lastLocationSentAt.current = now;
      const location = { latitude: position.coords.latitude, longitude: position.coords.longitude };
      setCurrentLocation(location); tracking.mutate({ orderId: trackingOrderId, ...location, locationConsent: true });
    }, () => { setTrackingOrderId(null); toast.error("Live location permission was not granted. Address directions remain available."); }, { enableHighAccuracy: true, maximumAge: 10_000, timeout: 15_000 });
    return () => navigator.geolocation.clearWatch(watchId);
  }, [trackingOrderId]);

  const beginTracking = (orderId: number) => {
    if (!navigator.geolocation) return toast.error("Location is not available in this browser. Address directions remain available.");
    navigator.geolocation.getCurrentPosition(position => {
      const location = { latitude: position.coords.latitude, longitude: position.coords.longitude };
      lastLocationSentAt.current = Date.now(); setCurrentLocation(location); setTrackingOrderId(orderId); tracking.mutate({ orderId, ...location, locationConsent: true });
      toast.success("Live location sharing started for this delivery.");
    }, () => toast.error("Location permission was not granted. Address directions remain available."), { enableHighAccuracy: true, timeout: 15_000 });
  };
  const endTracking = (orderId: number) => { setTrackingOrderId(null); stopTracking.mutate({ orderId }); };
  const requestLocation = (onReady?: (coordinates: Coordinates) => void, onUnavailable?: () => void) => {
    if (!navigator.geolocation) { onUnavailable?.(); return toast.error("Location is not available in this browser."); }
    navigator.geolocation.getCurrentPosition(position => { const next = { latitude: position.coords.latitude, longitude: position.coords.longitude }; setCurrentLocation(next); onReady?.(next); }, () => { onUnavailable?.(); toast.error("Location permission was not granted. You can still use address directions."); }, { enableHighAccuracy: true, timeout: 10_000 });
  };
  const openLiveDirections = (destination: DeliveryDestination) => {
    const navigate = (coordinates: Coordinates, routeWindow?: Window | null) => { const route = buildLiveDirectionsUrl(coordinates, destination); if (!route) return toast.error("A delivery address is required for directions."); if (routeWindow) { routeWindow.opener = null; routeWindow.location.replace(route); } else window.open(route, "_blank", "noopener,noreferrer"); };
    if (currentLocation) return navigate(currentLocation);
    const routeWindow = window.open("about:blank", "_blank"); requestLocation(coordinates => navigate(coordinates, routeWindow), () => routeWindow?.close());
  };

  if (!loading && !allowed) return <div className="flex min-h-screen items-center justify-center bg-[#fbf8f2] p-6 text-center"><div className="w-full max-w-sm rounded-3xl bg-white p-7"><p className="font-serif text-3xl font-semibold">Rider access required</p><p className="mt-3 text-sm text-[#74695b]">Sign in with your rider account to see assigned deliveries.</p><div className="mt-6 space-y-3"><Input value={email} onChange={event => setEmail(event.target.value)} type="email" placeholder="Rider email" /><Input value={password} onChange={event => setPassword(event.target.value)} type="password" placeholder="Password" /><Button onClick={() => riderLogin.mutate({ email, password, role: "rider" })} disabled={riderLogin.isPending} className="w-full bg-[#ae3f25]">Sign in to delivery desk</Button><button type="button" className="w-full text-sm font-semibold text-[#ae3f25]" onClick={() => setRecoveryOpen(current => !current)}>Forgot password?</button>{recoveryOpen && <div className="rounded-2xl bg-[#fbf8f2] p-4 text-left"><p className="text-sm text-[#74695b]">For privacy, we use the same response whether or not an account exists.</p><Button type="button" variant="outline" className="mt-3 w-full" disabled={recovery.isPending || !email} onClick={() => recovery.mutate({ email, role: "rider" })}>Request password help</Button></div>}</div></div></div>;

  return <DashboardLayout menuItems={nav} brand="Delivery desk"><div className="mx-auto max-w-5xl py-5"><div><p className="eyebrow">Delivery workspace</p><h1 className="mt-2 font-serif text-4xl font-semibold">Your deliveries, in context.</h1><p className="mt-2 text-sm text-[#74695b]">Live sharing starts only when you choose it for an active delivery and stops when delivery is completed.</p></div><div className="mt-7 grid gap-5 md:grid-cols-2">{tasks.data?.map(({ assignment, order }) => { const address = order.deliveryAddressSnapshot as DeliveryAddress; const destination = destinationCoordinates(address); const target = [address.line1, address.city, address.pincode].filter(Boolean).join(", "); const routeDestination: DeliveryDestination = destination || target; const fallbackRoute = buildAddressDirectionsUrl(target); const sharing = trackingOrderId === order.id; return <article key={assignment.id} className="rounded-3xl bg-white p-6 shadow-sm"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-[.15em] text-[#ae3f25]">{order.orderNo}</p><h2 className="mt-2 font-serif text-2xl font-semibold">{order.status === "rider_assigned" ? "Ready for pickup" : "Out for delivery"}</h2><p className="mt-2 text-sm text-[#74695b]">{address.recipientName || "Customer"} · {address.phone || "Phone unavailable"}</p><p className="mt-1 text-sm font-bold">₹{(order.grandTotalPaise / 100).toFixed(0)} · {order.paymentMethod === "cod" ? "COD to collect" : "Online payment"}</p></div><PackageCheck className="h-6 w-6 text-[#ae3f25]" /></div><div className="mt-6 rounded-2xl bg-[#fbf8f2] p-4"><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.14em] text-[#74695b]"><MapPinned className="h-4 w-4" />Delivery location</p><p className="mt-2 text-sm leading-6">{target || "Delivery address available inside the order record."}</p>{destination ? <p className="mt-2 text-xs font-semibold text-[#658247]">Customer pinned this delivery destination.</p> : <p className="mt-2 text-xs text-[#74695b]">Using manual address directions because no location pin is saved.</p>}{address.deliveryInstructions && <p className="mt-2 text-xs text-[#74695b]">Note: {address.deliveryInstructions}</p>}<div className="mt-3 flex flex-wrap gap-3"><Button type="button" variant="outline" size="sm" onClick={() => openLiveDirections(routeDestination)}><Navigation className="mr-2 h-3.5 w-3.5" />{currentLocation ? "Open live route" : "Use live location"}</Button>{fallbackRoute && <a href={fallbackRoute} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-xs font-bold text-[#ae3f25]"><Compass className="h-3.5 w-3.5" />Address directions</a>}</div></div>{destination && <div className="mt-5"><DeliveryTrackingMap destination={destination} riderLocation={sharing ? currentLocation : null} className="h-56 overflow-hidden rounded-2xl" /></div>}<div className="mt-5 flex flex-wrap gap-3">{order.status === "rider_assigned" && <Button type="button" onClick={() => update.mutate({ orderId: order.id, status: "out_for_delivery" }, { onSuccess: () => beginTracking(order.id) })} disabled={update.isPending} className="flex-1 rounded-xl bg-[#272119]">Start delivery & live sharing</Button>}{order.status === "out_for_delivery" && <>{sharing ? <Button type="button" onClick={() => endTracking(order.id)} disabled={stopTracking.isPending} variant="outline" className="flex-1 rounded-xl"><RadioTower className="mr-2 h-4 w-4" />Stop live sharing</Button> : <Button type="button" onClick={() => beginTracking(order.id)} disabled={tracking.isPending} variant="outline" className="flex-1 rounded-xl"><RadioTower className="mr-2 h-4 w-4" />Start live sharing</Button>}<Button type="button" onClick={() => update.mutate({ orderId: order.id, status: "delivered" }, { onSuccess: () => setTrackingOrderId(null) })} disabled={update.isPending} className="flex-1 rounded-xl bg-[#658247] hover:bg-[#516938]"><CheckCircle2 className="mr-2 h-4 w-4" />Mark delivered</Button></>}</div></article>; })}{tasks.data?.length === 0 && <div className="rounded-3xl bg-white p-10 text-center md:col-span-2"><PackageCheck className="mx-auto h-8 w-8 text-[#ae3f25]" /><p className="mt-4 font-serif text-2xl font-semibold">No deliveries assigned right now</p><p className="mt-2 text-sm text-[#74695b]">Your next delivery will appear here once restaurant staff assigns it.</p></div>}</div></div></DashboardLayout>;
}
