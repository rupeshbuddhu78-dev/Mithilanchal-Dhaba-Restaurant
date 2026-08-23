import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";

export function CustomerPasswordReset() {
  const { data: customers = [] } = trpc.operations.admin.customers.useQuery();
  const [form, setForm] = useState({ customerUserId: "", password: "" });
  const [outcome, setOutcome] = useState<"idle" | "success" | "error">("idle");
  const reset = trpc.operations.admin.resetCustomerPassword.useMutation({
    onMutate: () => setOutcome("idle"),
    onSuccess: () => { setForm({ customerUserId: "", password: "" }); setOutcome("success"); toast.success("Customer password reset"); },
    onError: error => { setOutcome("error"); toast.error(error.message); },
  });
  const updateForm = (value: Partial<typeof form>) => { setOutcome("idle"); setForm(current => ({ ...current, ...value })); };
  return <section className="mt-7 rounded-3xl bg-white p-6"><p className="eyebrow">Customer accounts</p><h2 className="mt-2 font-serif text-2xl font-semibold">Reset customer password</h2><p className="mt-2 text-sm text-[#74695b]">Administrators can restore access for a customer. The new password is never displayed or returned after submission.</p><div className="mt-5 grid gap-3 md:grid-cols-2"><select aria-label="Customer account to reset" value={form.customerUserId} onChange={event => updateForm({ customerUserId: event.target.value })} className="h-10 rounded-md border border-input bg-background px-3 text-sm"><option value="">Choose customer account</option>{customers.map(customer => <option key={customer.id} value={customer.id}>{customer.name || customer.email || `Customer ${customer.id}`}</option>)}</select><Input value={form.password} onChange={event => updateForm({ password: event.target.value })} placeholder="New customer password (12+ characters)" type="password" autoComplete="new-password" /></div><Button type="button" variant="outline" className="mt-4 rounded-xl" disabled={reset.isPending || !form.customerUserId || form.password.length < 12} onClick={() => reset.mutate({ customerUserId: Number(form.customerUserId), password: form.password })}>{reset.isPending ? "Resetting customer password…" : "Reset customer password"}</Button>{reset.isPending && <p className="mt-3 text-sm text-[#74695b]" aria-live="polite">Saving the password reset securely…</p>}{outcome === "success" && <p className="mt-3 text-sm font-medium text-emerald-700" role="status">Customer password reset saved.</p>}{outcome === "error" && <p className="mt-3 text-sm font-medium text-red-700" role="alert">{reset.error?.message || "Customer password reset could not be completed."}</p>}</section>;
}
