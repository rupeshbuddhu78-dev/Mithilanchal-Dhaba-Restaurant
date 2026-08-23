import { useAuth } from "@/_core/hooks/useAuth";
import { AdminConfiguration } from "@/components/AdminConfiguration";
import { CustomerPasswordReset } from "@/components/CustomerPasswordReset";
import { DeliveryAssignment } from "@/components/DeliveryAssignment";
import DashboardLayout, { type DashboardNavItem } from "@/components/DashboardLayout";
import { RiderProvisioning } from "@/components/RiderProvisioning";
import { Button } from "@/components/ui/button";
import { safeImageUrl } from "@/lib/media";
import { trpc } from "@/lib/trpc";
import { ORDER_STATUS_LABELS, ORDER_STATUSES } from "@shared/restaurant";
import { BarChart3, BookOpen, LayoutDashboard, PackageCheck, Users } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

const nav: DashboardNavItem[] = [
  { icon: LayoutDashboard, label: "Overview", path: "/admin" },
  { icon: PackageCheck, label: "Incoming orders", path: "/admin/orders" },
  { icon: BookOpen, label: "Menu library", path: "/admin/menu" },
  { icon: Users, label: "Customers", path: "/admin/customers" },
];
const money = (paise: number) => `₹${(paise / 100).toFixed(0)}`;

export default function Admin() {
  const { user, loading } = useAuth();
  const allowed = user?.role === "admin" || user?.role === "staff";
  const utils = trpc.useUtils();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const localAdminLogin = trpc.auth.localAdminLogin.useMutation({
    onSuccess: async () => { setPassword(""); await utils.auth.me.invalidate(); toast.success("Administrator sign-in successful"); },
    onError: error => toast.error(error.message),
  });
  const overview = trpc.operations.admin.overview.useQuery(undefined, { enabled: allowed });
  const orders = trpc.operations.admin.orders.useQuery(undefined, { enabled: allowed });
  const customers = trpc.operations.admin.customers.useQuery(undefined, { enabled: allowed });
  const menu = trpc.restaurant.menu.useQuery({});
  const categories = trpc.restaurant.categories.useQuery();
  const updateStatus = trpc.operations.admin.updateStatus.useMutation({
    onSuccess: () => { utils.operations.admin.orders.invalidate(); utils.operations.admin.overview.invalidate(); toast.success("Order status updated"); },
    onError: error => toast.error(error.message),
  });
  const toggleMenu = trpc.operations.admin.menu.save.useMutation({
    onSuccess: () => { utils.restaurant.menu.invalidate(); toast.success("Menu availability updated"); },
    onError: error => toast.error(error.message),
  });
  const signIn = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); localAdminLogin.mutate({ email, password }); };

  if (!loading && !allowed) return <div className="flex min-h-screen items-center justify-center bg-[#fbf8f2] p-6"><div className="w-full max-w-md rounded-3xl border border-[#272119]/10 bg-white p-7 text-center shadow-sm"><p className="font-serif text-3xl font-semibold">Restaurant team access required</p><p className="mt-3 text-sm leading-6 text-[#74695b]">Use the administrator email and password configured for this restaurant.</p><form className="mt-6 space-y-3 text-left" onSubmit={signIn}><label className="block text-xs font-bold uppercase tracking-[.12em] text-[#74695b]">Administrator email<input required autoComplete="username" type="email" value={email} onChange={event => setEmail(event.target.value)} className="mt-2 w-full rounded-xl border border-[#272119]/15 bg-[#fbf8f2] px-3 py-3 text-sm outline-none ring-[#ae3f25] focus:ring-2" /></label><label className="block text-xs font-bold uppercase tracking-[.12em] text-[#74695b]">Password<input required autoComplete="current-password" type="password" value={password} onChange={event => setPassword(event.target.value)} className="mt-2 w-full rounded-xl border border-[#272119]/15 bg-[#fbf8f2] px-3 py-3 text-sm outline-none ring-[#ae3f25] focus:ring-2" /></label><Button type="submit" disabled={localAdminLogin.isPending} className="w-full rounded-xl bg-[#ae3f25] py-6 text-sm font-bold hover:bg-[#8e301b]">{localAdminLogin.isPending ? "Signing in…" : "Open Restaurant HQ"}</Button></form></div></div>;

  const cards = [["Recent sales", money(overview.data?.metrics.recentSalesPaise || 0), BarChart3], ["Menu items", overview.data?.metrics.menuCount || 0, BookOpen], ["Categories", overview.data?.metrics.categoryCount || 0, PackageCheck], ["Customers", overview.data?.metrics.customerCount || 0, Users]] as const;
  return <DashboardLayout menuItems={nav} brand="Restaurant HQ"><div className="mx-auto max-w-6xl py-5"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow">Operations centre</p><h1 className="mt-2 font-serif text-4xl font-semibold">A clear view of service.</h1></div><Button variant="outline" className="rounded-xl" onClick={() => overview.refetch()}>Refresh live data</Button></div><div className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label, value, Icon]) => <div key={label} className="rounded-2xl bg-white p-5 shadow-sm"><Icon className="h-5 w-5 text-[#ae3f25]" /><p className="mt-4 text-xs font-bold uppercase tracking-[.15em] text-[#8a7e70]">{label}</p><p className="mt-2 font-serif text-3xl font-semibold">{value}</p></div>)}</div><div className="mt-7 grid gap-6 xl:grid-cols-[1.3fr_.7fr]"><section className="rounded-3xl bg-white p-6"><div className="flex items-center justify-between"><h2 className="font-serif text-2xl font-semibold">Incoming orders</h2><span className="text-xs text-[#74695b]">Latest 100 records</span></div><div className="mt-5 space-y-3">{orders.data?.slice(0, 7).map(order => <div key={order.id} className="rounded-2xl border border-[#272119]/8 p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-bold">{order.orderNo}</p><p className="mt-1 text-xs text-[#74695b]">{new Date(order.createdAt).toLocaleString()} · {money(order.grandTotalPaise)}</p></div><select value={order.status} onChange={event => updateStatus.mutate({ orderId: order.id, status: event.target.value as typeof order.status })} className="rounded-lg border border-[#272119]/10 bg-[#fbf8f2] px-3 py-2 text-xs font-bold">{ORDER_STATUSES.map(status => <option key={status} value={status}>{ORDER_STATUS_LABELS[status]}</option>)}</select></div></div>)}{orders.data?.length === 0 && <p className="rounded-2xl bg-[#fbf8f2] p-6 text-sm text-[#74695b]">New orders will appear here when customers check out.</p>}</div></section><section className="rounded-3xl bg-[#272119] p-6 text-[#fff8ef]"><p className="text-xs font-bold uppercase tracking-[.2em] text-[#d99b69]">Customer pulse</p><h2 className="mt-3 font-serif text-2xl font-semibold">Recent customers</h2><div className="mt-5 space-y-3">{customers.data?.slice(0, 5).map(customer => <div key={customer.id} className="border-b border-white/10 pb-3 text-sm"><p className="font-bold">{customer.name || "Customer"}</p><p className="mt-1 text-xs text-white/55">{customer.email || "No email supplied"}</p></div>)}{customers.data?.length === 0 && <p className="text-sm leading-6 text-white/55">Customer profiles are shown here after customers create accounts.</p>}</div></section></div><section className="mt-7 rounded-3xl bg-white p-6"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="eyebrow">Catalogue</p><h2 className="mt-2 font-serif text-2xl font-semibold">Menu availability</h2></div><p className="text-xs text-[#74695b]">{categories.data?.length || 0} active categories</p></div><div className="mt-5 grid gap-3 md:grid-cols-2">{menu.data?.map(({ item, category }) => <div key={item.id} className="flex items-center gap-3 rounded-2xl border border-[#272119]/8 p-3"><img src={safeImageUrl(item.imageUrl)} alt="" className="h-12 w-12 rounded-xl object-cover" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{item.name}</p><p className="mt-1 text-xs text-[#74695b]">{category.name} · {money(item.pricePaise)}</p></div><Button size="sm" variant={item.isAvailable ? "outline" : "default"} className="rounded-lg text-xs" onClick={() => toggleMenu.mutate({ ...item, imageUrl: item.imageUrl, description: item.description || undefined, customisation: item.customisation })}>{item.isAvailable ? "Pause" : "Enable"}</Button></div>)}</div></section><RiderProvisioning /><CustomerPasswordReset /><DeliveryAssignment /><AdminConfiguration /></div></DashboardLayout>;
}
