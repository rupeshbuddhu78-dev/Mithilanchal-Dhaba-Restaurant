import { useAuth } from "@/_core/hooks/useAuth";
import { StorefrontLayout } from "@/components/StorefrontLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Banknote, CreditCard, LocateFixed, MapPin } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

declare global { interface Window { Cashfree?: (options: { mode: "sandbox" | "production" }) => { checkout: (options: { paymentSessionId: string; redirectTarget: "_self" }) => Promise<unknown> } } }

async function openCashfree(sessionId: string, environment: "sandbox" | "production") {
  if (!window.Cashfree) await new Promise<void>((resolve, reject) => { const script = document.createElement("script"); script.src = "https://sdk.cashfree.com/js/v3/cashfree.js"; script.onload = () => resolve(); script.onerror = () => reject(new Error("Cashfree checkout could not be loaded.")); document.head.append(script); });
  if (!window.Cashfree) throw new Error("Cashfree checkout could not be loaded.");
  return window.Cashfree({ mode: environment }).checkout({ paymentSessionId: sessionId, redirectTarget: "_self" });
}

type AddressDraft = { label: string; recipientName: string; phone: string; line1: string; city: string; state: string; pincode: string; latitude?: number; longitude?: number; locationConsent: boolean };
const initialAddress: AddressDraft = { label: "Home", recipientName: "", phone: "", line1: "", city: "", state: "West Bengal", pincode: "", locationConsent: false };

export default function Checkout() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const addresses = trpc.commerce.addresses.list.useQuery(undefined, { enabled: isAuthenticated });
  const [selected, setSelected] = useState<number>();
  const [method, setMethod] = useState<"cod" | "cashfree">("cod");
  const [note, setNote] = useState("");
  const [form, setForm] = useState<AddressDraft>(initialAddress);
  useEffect(() => { if (!isAuthenticated) setLocation("/cart"); }, [isAuthenticated, setLocation]);
  const save = trpc.commerce.addresses.save.useMutation({ onSuccess: id => { utils.commerce.addresses.list.invalidate(); if (id) setSelected(id); setForm(initialAddress); toast.success("Delivery address saved"); }, onError: error => toast.error(error.message) });
  const checkout = trpc.commerce.checkout.useMutation({ onSuccess: async result => { if (result.paymentSessionId && result.cashfreeEnvironment) { try { await openCashfree(result.paymentSessionId, result.cashfreeEnvironment); } catch (error) { toast.error(error instanceof Error ? error.message : "Unable to open Cashfree checkout."); } return; } setLocation(`/order-success/${result.orderId}`); }, onError: error => toast.error(error.message) });
  const captureLocation = () => {
    if (!navigator.geolocation) return toast.error("Location is not available in this browser. You can still save your address manually.");
    navigator.geolocation.getCurrentPosition(position => { setForm(current => ({ ...current, latitude: position.coords.latitude, longitude: position.coords.longitude, locationConsent: true })); toast.success("Delivery location captured with your consent."); }, () => toast.error("Location permission was not granted. You can still save your address manually."), { enableHighAccuracy: true, timeout: 10000 });
  };
  const submit = () => { if (!selected) return toast.error("Select or save a delivery address."); checkout.mutate({ addressId: selected, paymentMethod: method, customerNote: note || undefined }); };
  const saveAddress = () => save.mutate({ ...form, isDefault: !addresses.data?.length, latitude: form.locationConsent ? form.latitude : undefined, longitude: form.locationConsent ? form.longitude : undefined });
  if (!isAuthenticated) return <StorefrontLayout><div className="container py-20 text-center text-sm text-[#74695b]">Returning to your cart…</div></StorefrontLayout>;
  const fields = Object.entries(form).filter(([key]) => !["latitude", "longitude", "locationConsent"].includes(key));
  return <StorefrontLayout><main className="container py-10 sm:py-14"><p className="eyebrow">One more step</p><h1 className="mt-2 font-serif text-5xl font-semibold">Checkout</h1><div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]"><section className="space-y-6"><div className="rounded-3xl bg-white p-6"><div className="flex items-center gap-2"><MapPin className="h-5 w-5 text-[#ae3f25]" /><h2 className="font-serif text-2xl font-semibold">Delivery address</h2></div>{addresses.isError && <p className="mt-4 rounded-xl bg-[#fff0e9] p-3 text-sm text-[#ae3f25]">Addresses could not be loaded. Please refresh and try again.</p>}<div className="mt-5 space-y-3">{addresses.data?.map(address => <label key={address.id} className={`block cursor-pointer rounded-xl border p-4 ${selected === address.id ? "border-[#ae3f25] bg-[#fff0e9]" : "border-[#272119]/10"}`}><input type="radio" name="address" checked={selected === address.id} onChange={() => setSelected(address.id)} className="mr-2 accent-[#ae3f25]" /><span className="font-bold">{address.label}</span><p className="ml-6 mt-1 text-sm text-[#74695b]">{address.recipientName} · {address.line1}, {address.city}, {address.pincode}</p>{address.locationConsentAt && <p className="ml-6 mt-1 text-xs font-semibold text-[#658247]">Pinned for direct rider navigation</p>}</label>)}</div><details className="mt-5 rounded-xl bg-[#fbf8f2] p-4"><summary className="cursor-pointer text-sm font-bold">Add a new address</summary><div className="mt-4 grid gap-3 sm:grid-cols-2">{fields.map(([key, value]) => <Input key={key} placeholder={key === "line1" ? "Street / landmark" : key.replace(/([A-Z])/g, " $1")} value={String(value)} onChange={event => setForm(current => ({ ...current, [key]: event.target.value }))} className={key === "line1" ? "sm:col-span-2" : ""} />)}</div><div className="mt-4 rounded-xl border border-[#272119]/10 p-3"><p className="text-sm font-semibold">Add delivery pin (optional)</p><p className="mt-1 text-xs leading-5 text-[#74695b]">With your permission, the rider receives a direct route to this delivery point. Manual address delivery remains available.</p><Button type="button" onClick={captureLocation} variant="outline" className="mt-3"><LocateFixed className="mr-2 h-4 w-4" />{form.locationConsent ? "Location captured" : "Use my current location"}</Button></div><Button type="button" onClick={saveAddress} disabled={save.isPending} variant="outline" className="mt-4">Save address</Button></details></div><div className="rounded-3xl bg-white p-6"><h2 className="font-serif text-2xl font-semibold">Payment</h2><div className="mt-5 grid gap-3 sm:grid-cols-2"><button type="button" onClick={() => setMethod("cod")} className={`rounded-xl border p-4 text-left ${method === "cod" ? "border-[#ae3f25] bg-[#fff0e9]" : "border-[#272119]/10"}`}><Banknote className="h-5 w-5 text-[#ae3f25]" /><p className="mt-2 text-sm font-bold">Cash on delivery</p><p className="mt-1 text-xs text-[#74695b]">Pay when your order arrives.</p></button><button type="button" onClick={() => setMethod("cashfree")} className={`rounded-xl border p-4 text-left ${method === "cashfree" ? "border-[#ae3f25] bg-[#fff0e9]" : "border-[#272119]/10"}`}><CreditCard className="h-5 w-5 text-[#ae3f25]" /><p className="mt-2 text-sm font-bold">Pay online</p><p className="mt-1 text-xs text-[#74695b]">Secure Cashfree Checkout.</p></button></div><Textarea value={note} onChange={event => setNote(event.target.value)} placeholder="Delivery note (optional)" className="mt-5 bg-[#fbf8f2]" /></div></section><aside className="h-fit rounded-3xl bg-[#272119] p-6 text-[#fff8ef]"><p className="text-xs font-bold uppercase tracking-[.2em] text-[#d99b69]">Ready when you are</p><p className="mt-4 text-sm leading-6 text-white/65">Place your order and receive updates as the restaurant accepts, prepares, and sends it out for delivery.</p><Button type="button" onClick={submit} disabled={checkout.isPending} className="mt-6 w-full rounded-xl bg-[#ae3f25] hover:bg-[#8e301b]">{checkout.isPending ? "Creating order…" : method === "cashfree" ? "Continue to secure payment" : "Place cash order"}</Button></aside></div></main></StorefrontLayout>;
}
