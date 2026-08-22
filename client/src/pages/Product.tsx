import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { StorefrontLayout } from "@/components/StorefrontLayout";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import type { MenuOptionGroup } from "@shared/restaurant";
import { Leaf, Minus, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Link, useLocation, useRoute } from "wouter";

export default function Product() {
  const [, params] = useRoute("/product/:slug"); const [, setLocation] = useLocation(); const { isAuthenticated } = useAuth();
  const product = trpc.restaurant.itemBySlug.useQuery({ slug: params?.slug || "" }, { enabled: Boolean(params?.slug) }); const utils = trpc.useUtils();
  const [quantity, setQuantity] = useState(1); const [choices, setChoices] = useState<Record<string, string>>({});
  const groups = (product.data?.item.customisation || []) as MenuOptionGroup[];
  const delta = useMemo(() => groups.reduce((sum, group) => sum + (group.choices.find(choice => choice.id === choices[group.id])?.priceDeltaPaise || 0), 0), [groups, choices]);
  const add = trpc.commerce.cart.add.useMutation({ onSuccess: () => { utils.commerce.cart.get.invalidate(); toast.success("Added to your cart"); setLocation("/cart"); }, onError: error => toast.error(error.message) });
  if (product.isLoading) return <StorefrontLayout><div className="container py-20"><div className="h-96 animate-pulse rounded-3xl bg-[#eadfce]" /></div></StorefrontLayout>;
  if (product.isError) return <StorefrontLayout><div className="container py-20 text-center"><p className="font-serif text-3xl">This dish could not be loaded</p><button onClick={() => product.refetch()} className="mt-5 text-sm font-bold text-[#ae3f25]">Try again</button></div></StorefrontLayout>;
  if (!product.data) return <StorefrontLayout><div className="container py-20 text-center"><p className="font-serif text-3xl">This dish is unavailable</p><Link href="/menu" className="mt-5 inline-block text-sm font-bold text-[#ae3f25]">Back to menu</Link></div></StorefrontLayout>;
  const item = product.data.item; const price = item.pricePaise + delta;
  const addToCart = () => { if (!isAuthenticated) return startLogin(); add.mutate({ menuItemId: item.id, quantity, selectedOptions: Object.entries(choices).map(([groupId, choiceId]) => ({ groupId, choiceId })) }); };
  return <StorefrontLayout><main className="container py-10 sm:py-14"><Link href="/menu" className="text-xs font-bold text-[#ae3f25]">← Back to menu</Link><div className="mt-5 grid gap-9 lg:grid-cols-[1fr_.85fr]"><div className="overflow-hidden rounded-[2rem] bg-[#eadfce]"><img src={item.imageUrl || "/manus-storage/thali_2c14c9ac.jpg"} alt="" className="h-[420px] w-full object-cover" /></div><section><div className="flex items-center gap-2 text-xs font-bold text-[#658247]"><Leaf className="h-4 w-4" />{item.isVegetarian ? "Vegetarian" : "Non-vegetarian"}</div><h1 className="mt-3 font-serif text-5xl font-semibold leading-none">{item.name}</h1><p className="mt-5 text-base leading-7 text-[#74695b]">{item.description}</p><p className="mt-6 text-2xl font-bold">₹{(price / 100).toFixed(0)}</p>{groups.map(group => <fieldset key={group.id} className="mt-7 border-t border-[#272119]/10 pt-6"><legend className="text-sm font-bold">{group.label} {group.required && <span className="text-[#ae3f25]">· Required</span>}</legend><div className="mt-3 grid gap-2">{group.choices.map(choice => <label key={choice.id} className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 text-sm transition ${choices[group.id] === choice.id ? "border-[#ae3f25] bg-[#fff0e9]" : "border-[#272119]/10 bg-white"}`}><span><input type="radio" className="mr-2 accent-[#ae3f25]" name={group.id} checked={choices[group.id] === choice.id} onChange={() => setChoices(current => ({ ...current, [group.id]: choice.id }))} />{choice.label}</span>{choice.priceDeltaPaise > 0 && <span>+₹{(choice.priceDeltaPaise / 100).toFixed(0)}</span>}</label>)}</div></fieldset>)}<div className="mt-8 flex items-center gap-4"><div className="flex items-center rounded-xl border border-[#272119]/10 bg-white"><button onClick={() => setQuantity(value => Math.max(1, value - 1))} className="p-3" aria-label="Decrease quantity"><Minus className="h-4 w-4" /></button><span className="w-8 text-center text-sm font-bold">{quantity}</span><button onClick={() => setQuantity(value => Math.min(20, value + 1))} className="p-3" aria-label="Increase quantity"><Plus className="h-4 w-4" /></button></div><Button onClick={addToCart} disabled={add.isPending} className="h-12 flex-1 rounded-xl bg-[#ae3f25] text-sm font-bold hover:bg-[#8e301b]">Add ₹{((price * quantity) / 100).toFixed(0)} to cart</Button></div></section></div></main></StorefrontLayout>;
}
