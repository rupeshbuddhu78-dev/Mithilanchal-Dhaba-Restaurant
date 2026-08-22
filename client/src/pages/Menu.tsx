import { FoodCard } from "@/components/FoodCard";
import { StorefrontLayout } from "@/components/StorefrontLayout";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Search } from "lucide-react";
import { useState } from "react";
import { Link, useRoute } from "wouter";

export default function Menu() {
  const [, params] = useRoute("/menu/:category");
  const [search, setSearch] = useState("");
  const categories = trpc.restaurant.categories.useQuery();
  const menu = trpc.restaurant.menu.useQuery({ category: params?.category, search: search || undefined });
  return <StorefrontLayout><main className="container py-10 sm:py-14"><p className="eyebrow">Freshly arranged</p><h1 className="mt-2 font-serif text-5xl font-semibold">The menu</h1><p className="mt-3 max-w-xl text-sm leading-6 text-[#74695b]">Browse the current selection, make your choices, and add each dish to a cart built around your order.</p><div className="mt-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div className="flex flex-wrap gap-2">{[{ slug: undefined, name: "All" }, ...(categories.data || [])].map(category => <Link key={category.slug || "all"} href={category.slug ? `/menu/${category.slug}` : "/menu"} className={`rounded-full px-4 py-2 text-xs font-bold transition ${params?.category === category.slug || (!params?.category && !category.slug) ? "bg-[#272119] text-white" : "border border-[#272119]/10 bg-white hover:border-[#272119]"}`}>{category.name}</Link>)}</div><div className="relative w-full lg:max-w-xs"><Search className="absolute left-3 top-3 h-4 w-4 text-[#8a7e70]" /><Input value={search} onChange={event => setSearch(event.target.value)} placeholder="Search the menu" className="rounded-xl border-[#272119]/10 bg-white pl-9" /></div></div>{menu.isError ? <div className="mt-9 rounded-3xl border border-[#ae3f25]/25 bg-[#fff0e9] p-6 text-sm">The menu could not be loaded. <button onClick={() => menu.refetch()} className="ml-2 font-bold text-[#ae3f25]">Try again</button></div> : <><div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{menu.data?.map(({ item }) => <FoodCard key={item.id} item={item} />)}</div>{menu.isLoading && <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{[1, 2, 3].map(n => <div key={n} className="h-80 animate-pulse rounded-3xl bg-[#eadfce]" />)}</div>}{!menu.isLoading && menu.data?.length === 0 && <div className="mt-10 rounded-3xl border border-dashed border-[#272119]/20 bg-white p-10 text-center"><p className="font-serif text-2xl font-semibold">No dishes found</p><p className="mt-2 text-sm text-[#74695b]">Try a different search or browse another category.</p></div>}</>}</main></StorefrontLayout>;
}
