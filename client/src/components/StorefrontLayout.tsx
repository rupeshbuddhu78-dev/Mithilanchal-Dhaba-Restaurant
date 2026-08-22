import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { Bell, MapPin, Menu, ShoppingBag, X } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { SiteSeo } from "./SiteSeo";

export function StorefrontLayout({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [location] = useLocation();
  const { isAuthenticated, user } = useAuth();
  const cart = trpc.commerce.cart.get.useQuery(undefined, { enabled: isAuthenticated });
  const count = cart.data?.lines.reduce((sum, line) => sum + line.quantity, 0) ?? 0;
  const links = [{ href: "/menu", label: "Menu" }, { href: "/about", label: "Our story" }, { href: "/orders", label: "Orders" }];

  return <div className="min-h-screen bg-[#fbf8f2] text-[#272119]"><SiteSeo path={location} />
    <div className="border-b border-[#272119]/10 bg-[#272119] py-2 text-center text-xs font-medium tracking-wide text-[#f7efe2]">A considered family dining experience, now ready for your table.</div>
    <header className="sticky top-0 z-50 border-b border-[#272119]/10 bg-[#fbf8f2]/95 backdrop-blur">
      <div className="container flex h-[72px] items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-3 no-underline"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#ae3f25] font-serif text-xl font-semibold text-[#fffaf2]">M</span><span><span className="block font-serif text-xl font-semibold leading-none">Mithilanchal</span><span className="mt-1 block text-[10px] font-bold uppercase tracking-[0.24em] text-[#ae3f25]">Dhaba</span></span></Link>
        <nav className="hidden items-center gap-7 text-sm font-semibold md:flex">{links.map(link => <Link key={link.href} href={link.href} className={location.startsWith(link.href) ? "text-[#ae3f25]" : "text-[#5a5044] hover:text-[#ae3f25]"}>{link.label}</Link>)}</nav>
        <div className="flex items-center gap-2"><Link href="/cart" aria-label="Open cart" className="relative flex h-10 w-10 items-center justify-center rounded-full border border-[#272119]/10 text-[#272119] transition hover:border-[#ae3f25] hover:text-[#ae3f25]"><ShoppingBag className="h-4 w-4" />{count > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#ae3f25] px-1 text-[10px] font-bold text-white">{count}</span>}</Link>{isAuthenticated ? <Link href="/profile" className="hidden rounded-full bg-[#272119] px-4 py-2 text-xs font-bold text-white sm:block">{user?.name?.split(" ")[0] || "Account"}</Link> : <button onClick={startLogin} className="hidden rounded-full bg-[#272119] px-4 py-2 text-xs font-bold text-white sm:block">Sign in</button>}<button className="flex h-10 w-10 items-center justify-center rounded-full border border-[#272119]/10 md:hidden" onClick={() => setOpen(value => !value)} aria-label="Toggle menu">{open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}</button></div>
      </div>
      {open && <div className="border-t border-[#272119]/10 bg-[#fbf8f2] px-5 py-4 md:hidden"><div className="flex flex-col gap-3">{links.map(link => <Link key={link.href} href={link.href} onClick={() => setOpen(false)} className="rounded-xl px-3 py-2 text-sm font-bold hover:bg-[#f2e8d7]">{link.label}</Link>)}{!isAuthenticated && <button onClick={startLogin} className="rounded-xl bg-[#ae3f25] px-3 py-2 text-left text-sm font-bold text-white">Sign in to order</button>}</div></div>}
    </header>
    {children}
    <footer className="mt-16 bg-[#272119] text-[#f7efe2]"><div className="container grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-4"><div><p className="font-serif text-2xl font-semibold">Mithilanchal Dhaba</p><p className="mt-3 max-w-xs text-sm leading-6 text-[#f7efe2]/65">Thoughtful Indian food, ordered simply and followed clearly from kitchen to doorstep.</p></div><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#d99b69]">Find us</p><p className="mt-3 flex gap-2 text-sm leading-6 text-[#f7efe2]/75"><MapPin className="mt-1 h-4 w-4 shrink-0" />Mission Rd, Kaludewan,<br />West Bengal 732141</p></div><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#d99b69]">Explore</p><div className="mt-3 flex flex-col gap-2 text-sm text-[#f7efe2]/75"><Link href="/menu">Menu</Link><Link href="/about">About us</Link><Link href="/contact">Contact</Link></div></div><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-[#d99b69]">Order with clarity</p><div className="mt-3 flex flex-col gap-2 text-sm text-[#f7efe2]/75"><Link href="/shipping-delivery-policy">Delivery policy</Link><Link href="/refund-policy">Refund policy</Link><Link href="/privacy-policy">Privacy</Link></div></div></div><div className="border-t border-white/10 py-5 text-center text-xs text-white/45">© {new Date().getFullYear()} Mithilanchal Dhaba. Built for modern food service.</div></footer>
    <nav className="fixed bottom-0 left-0 right-0 z-40 flex justify-around border-t border-[#272119]/10 bg-[#fbf8f2] py-2 text-[10px] font-bold text-[#5a5044] md:hidden"><Link href="/" className="flex flex-col items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-[#ae3f25]" />Home</Link><Link href="/menu" className="flex flex-col items-center gap-1"><Menu className="h-4 w-4" />Menu</Link><Link href="/cart" className="flex flex-col items-center gap-1"><ShoppingBag className="h-4 w-4" />Cart</Link><Link href="/profile" className="flex flex-col items-center gap-1"><Bell className="h-4 w-4" />Account</Link></nav>
  </div>;
}
