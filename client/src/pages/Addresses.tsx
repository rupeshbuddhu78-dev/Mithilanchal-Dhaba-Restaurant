import { useAuth } from "@/_core/hooks/useAuth";
import { StorefrontLayout } from "@/components/StorefrontLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { LocateFixed, MapPin, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type AddressForm = { id?: number; label: string; recipientName: string; phone: string; line1: string; line2: string; city: string; state: string; pincode: string; deliveryInstructions: string; isDefault: boolean; latitude?: number; longitude?: number; locationConsent: boolean };
const blank: AddressForm = { label: "Home", recipientName: "", phone: "", line1: "", line2: "", city: "", state: "West Bengal", pincode: "", deliveryInstructions: "", isDefault: false, locationConsent: false };

function coordinate(value: string | null | undefined) { const parsed = Number(value); return Number.isFinite(parsed) ? parsed : undefined; }

export default function Addresses() {
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const addresses = trpc.commerce.addresses.list.useQuery(undefined, { enabled: isAuthenticated });
  const [form, setForm] = useState<AddressForm>(blank);
  const save = trpc.commerce.addresses.save.useMutation({ onSuccess: () => { utils.commerce.addresses.list.invalidate(); setForm(blank); toast.success("Address saved"); }, onError: error => toast.error(error.message) });
  const remove = trpc.commerce.addresses.remove.useMutation({ onSuccess: () => { utils.commerce.addresses.list.invalidate(); toast.success("Address removed"); } });

  const captureLocation = () => {
    if (!navigator.geolocation) return toast.error("Location is not available in this browser. You can still save your address manually.");
    navigator.geolocation.getCurrentPosition(position => {
      setForm(current => ({ ...current, latitude: position.coords.latitude, longitude: position.coords.longitude, locationConsent: true }));
      toast.success("Location saved for this delivery address.");
    }, () => toast.error("Location permission was not granted. You can still save your address manually."), { enableHighAccuracy: true, timeout: 10000 });
  };

  const editAddress = (address: NonNullable<typeof addresses.data>[number]) => setForm({ ...address, line2: address.line2 || "", deliveryInstructions: address.deliveryInstructions || "", latitude: coordinate(address.latitude), longitude: coordinate(address.longitude), locationConsent: Boolean(address.locationConsentAt) });
  const submit = () => save.mutate({ ...form, line2: form.line2 || undefined, deliveryInstructions: form.deliveryInstructions || undefined, latitude: form.locationConsent ? form.latitude : undefined, longitude: form.locationConsent ? form.longitude : undefined });

  if (!isAuthenticated) return <StorefrontLayout><div className="container py-20 text-center"><p className="font-serif text-3xl font-semibold">Sign in to manage addresses</p></div></StorefrontLayout>;
  const fields = Object.entries(form).filter(([key]) => !["id", "isDefault", "latitude", "longitude", "locationConsent"].includes(key));
  return <StorefrontLayout><main className="container py-10 sm:py-14"><p className="eyebrow">Delivery details</p><h1 className="mt-2 font-serif text-5xl font-semibold">Your addresses</h1><div className="mt-8 grid gap-8 lg:grid-cols-[1fr_360px]"><section className="space-y-3">{addresses.isError && <div className="rounded-2xl border border-[#ae3f25]/30 bg-[#fff0e9] p-4 text-sm">We could not load your addresses. Please try again.</div>}{addresses.data?.map(address => <article key={address.id} className="rounded-2xl bg-white p-5"><div className="flex items-start justify-between gap-3"><div><p className="flex items-center gap-2 font-bold"><MapPin className="h-4 w-4 text-[#ae3f25]" />{address.label} {address.isDefault && <span className="rounded-full bg-[#fff0e9] px-2 py-0.5 text-[10px] text-[#ae3f25]">Default</span>}</p><p className="mt-3 text-sm leading-6 text-[#74695b]">{address.recipientName} · {address.phone}<br />{address.line1}{address.line2 ? `, ${address.line2}` : ""}<br />{address.city}, {address.state} {address.pincode}</p>{address.locationConsentAt && <p className="mt-3 text-xs font-semibold text-[#658247]">Location saved for delivery navigation</p>}</div><div className="flex gap-2"><button type="button" onClick={() => editAddress(address)} className="rounded-lg p-2 text-[#74695b]" aria-label={`Edit ${address.label}`}><Pencil className="h-4 w-4" /></button><button type="button" onClick={() => remove.mutate({ id: address.id })} className="rounded-lg p-2 text-[#ae3f25]" aria-label={`Remove ${address.label}`}><Trash2 className="h-4 w-4" /></button></div></div></article>)}{addresses.data?.length === 0 && <div className="rounded-3xl bg-white p-8 text-sm text-[#74695b]">No saved addresses yet. Add one when you are ready to order.</div>}</section><aside className="h-fit rounded-3xl bg-[#272119] p-6 text-[#fff8ef]"><p className="text-xs font-bold uppercase tracking-[.2em] text-[#d99b69]">{form.id ? "Update address" : "New address"}</p><div className="mt-5 space-y-3">{fields.map(([key, value]) => <Input key={key} value={String(value)} onChange={event => setForm(current => ({ ...current, [key]: event.target.value }))} placeholder={key.replace(/([A-Z])/g, " $1")} className="border-white/15 bg-white/10 text-white placeholder:text-white/40" />)}<div className="rounded-2xl border border-white/15 bg-white/5 p-3"><p className="text-sm font-semibold">Pin your delivery location</p><p className="mt-1 text-xs leading-5 text-white/65">Optional. With your permission, we save coordinates for this address so a rider can navigate directly to your delivery point. Manual address delivery remains available.</p><Button type="button" onClick={captureLocation} variant="outline" className="mt-3 w-full border-white/25 bg-transparent text-white"><LocateFixed className="mr-2 h-4 w-4" />{form.locationConsent ? "Location captured" : "Use my current location"}</Button></div><label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={form.isDefault} onChange={event => setForm(current => ({ ...current, isDefault: event.target.checked }))} />Make default address</label><Button type="button" onClick={submit} disabled={save.isPending} className="w-full rounded-xl bg-[#ae3f25] hover:bg-[#8e301b]">Save address</Button>{form.id && <Button type="button" onClick={() => setForm(blank)} variant="outline" className="w-full border-white/20 bg-transparent text-white">Cancel edit</Button>}</div></aside></div></main></StorefrontLayout>;
}
