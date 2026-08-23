import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";

export function CustomerPasswordReset() {
  const { data: customers = [] } = trpc.operations.admin.customers.useQuery();
  const [form, setForm] = useState({ customerUserId: "", password: "" });
  const reset = trpc.operations.admin.resetCustomerPassword.useMutation({
    onSuccess: () => { setForm({ customerUserId: "", password: "" }); toast.success("Customer password reset"); },
    onError: error => toast.error(error.message),
  });
  return <section className="mt-7 rounded-3xl bg-white p-6"><p className="eyebrow">Customer accounts</p><h2 className="mt-2 font-serif text-2xl font-semibold">Reset customer password</h2><p className="mt-2 text-sm text-[#74695b]">Administrators can restore access for a customer. The new password is never displayed or returned after submission.</p><div className="mt-5 grid gap-3 md:grid-cols-2"><select aria-label="Customer account to reset" value={form.customerUserId} onChange={event => setForm(current => ({ ...current, customerUserId: event.target.value }))} className="h-10 rounded-md border border-input bg-background px-3 text-sm"><option value="">Choose customer account</option>{customers.map(customer => <option key={customer.id} value={customer.id}>{customer.name || customer.email || `Customer ${customer.id}`}</option>)}</select><Input value={form.password} onChange={event => setForm(current => ({ ...current, password: event.target.value }))} placeholder="New customer password (12+ characters)" type="password" autoComplete="new-password" /></div><Button type="button" variant="outline" className="mt-4 rounded-xl" disabled={reset.isPending || !form.customerUserId || form.password.length < 12} onClick={() => reset.mutate({ customerUserId: Number(form.customerUserId), password: form.password })}>Reset customer password</Button></section>;
}
