import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";

export function RiderProvisioning() {
  const utils = trpc.useUtils();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const provision = trpc.operations.admin.provisionRider.useMutation({ onSuccess: () => { setForm({ name: "", email: "", phone: "", password: "" }); utils.operations.admin.riders.invalidate(); toast.success("Rider account created"); }, onError: error => toast.error(error.message) });
  return <section className="mt-7 rounded-3xl bg-white p-6"><p className="eyebrow">Delivery team</p><h2 className="mt-2 font-serif text-2xl font-semibold">Provision rider access</h2><p className="mt-2 text-sm text-[#74695b]">Create a rider account with a unique email and a 12+ character password. Share the password privately, then the rider can sign in at the rider workspace.</p><div className="mt-5 grid gap-3 md:grid-cols-2"><Input value={form.name} onChange={event => setForm(current => ({ ...current, name: event.target.value }))} placeholder="Rider name" /><Input value={form.email} onChange={event => setForm(current => ({ ...current, email: event.target.value }))} placeholder="Rider email" type="email" /><Input value={form.phone} onChange={event => setForm(current => ({ ...current, phone: event.target.value }))} placeholder="Phone" /><Input value={form.password} onChange={event => setForm(current => ({ ...current, password: event.target.value }))} placeholder="Temporary password (12+ characters)" type="password" /></div>{provision.error && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{provision.error.message}</p>}<Button type="button" className="mt-4 rounded-xl bg-[#ae3f25]" disabled={provision.isPending || form.password.length < 12} onClick={() => provision.mutate(form)}>Create rider account</Button></section>;
}
