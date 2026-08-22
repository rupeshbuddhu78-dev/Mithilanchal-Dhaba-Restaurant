import { StorefrontLayout } from "@/components/StorefrontLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function AccountAuth() {
  const [, setLocation] = useLocation(); const [mode, setMode] = useState<"login" | "register">("login"); const [name, setName] = useState(""); const [email, setEmail] = useState(""); const [phone, setPhone] = useState(""); const [password, setPassword] = useState(""); const utils = trpc.useUtils();
  const login = trpc.auth.passwordLogin.useMutation({ onSuccess: async () => { await utils.auth.me.invalidate(); setLocation("/profile"); }, onError: error => toast.error(error.message) });
  const register = trpc.auth.register.useMutation({ onSuccess: async () => { await utils.auth.me.invalidate(); setLocation("/profile"); }, onError: error => toast.error(error.message) });
  const submit = () => { if (mode === "register") register.mutate({ name, email, phone, password }); else login.mutate({ email, password, role: "customer" }); };
  const pending = login.isPending || register.isPending;
  return <StorefrontLayout><main className="container py-16"><section className="mx-auto max-w-md rounded-3xl bg-white p-7 shadow-sm"><p className="eyebrow">Customer account</p><h1 className="mt-2 font-serif text-4xl font-semibold">{mode === "login" ? "Welcome back" : "Create your account"}</h1><p className="mt-3 text-sm text-[#74695b]">Securely save addresses, checkout, and view your orders.</p><div className="mt-6 flex rounded-xl bg-[#fbf8f2] p-1 text-sm"><button onClick={() => setMode("login")} className={`flex-1 rounded-lg py-2 ${mode === "login" ? "bg-white font-bold shadow-sm" : "text-[#74695b]"}`}>Sign in</button><button onClick={() => setMode("register")} className={`flex-1 rounded-lg py-2 ${mode === "register" ? "bg-white font-bold shadow-sm" : "text-[#74695b]"}`}>Register</button></div><div className="mt-6 space-y-3">{mode === "register" && <><Input value={name} onChange={event => setName(event.target.value)} placeholder="Full name" /><Input value={phone} onChange={event => setPhone(event.target.value)} placeholder="Phone number" /></>}<Input value={email} onChange={event => setEmail(event.target.value)} type="email" placeholder="Email address" /><Input value={password} onChange={event => setPassword(event.target.value)} type="password" placeholder="Password (12+ characters)" /><Button onClick={submit} disabled={pending} className="w-full bg-[#ae3f25]">{pending ? "Please wait…" : mode === "login" ? "Sign in" : "Create secure account"}</Button></div></section></main></StorefrontLayout>;
}
