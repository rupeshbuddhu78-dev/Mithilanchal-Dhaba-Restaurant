import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { safeImageUrl } from "@/lib/media";
import { Leaf, Plus } from "lucide-react";
import { toast } from "sonner";
import { Link, useLocation } from "wouter";

export type Food = { id: number; name: string; slug: string; description: string | null; pricePaise: number; imageUrl: string | null; isVegetarian: boolean; customisation: unknown };

export function FoodCard({ item, compact = false }: { item: Food; compact?: boolean }) {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();
  const add = trpc.commerce.cart.add.useMutation({ onSuccess: () => { utils.commerce.cart.get.invalidate(); toast.success("Added to your cart"); }, onError: error => toast.error(error.message) });
  const hasOptions = Array.isArray(item.customisation) && item.customisation.length > 0;
  const addItem = () => { if (!isAuthenticated) return startLogin(); if (hasOptions) return setLocation(`/product/${item.slug}`); add.mutate({ menuItemId: item.id, quantity: 1, selectedOptions: [] }); };
  return (
    <article className={`group overflow-hidden rounded-[1.35rem] bg-white ${compact ? "border border-[#272119]/8" : "shadow-[0_18px_45px_-30px_rgba(50,37,25,0.5)]"}`}>
      <Link href={`/product/${item.slug}`} className="block overflow-hidden">
        <div className={`${compact ? "h-40" : "h-52"} overflow-hidden bg-[#eadfce]`}><img src={safeImageUrl(item.imageUrl)} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /></div>
      </Link>
      <div className="p-4"><div className="flex items-start justify-between gap-3"><div><div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold text-[#658247]">{item.isVegetarian && <><Leaf className="h-3 w-3" />Vegetarian</>}</div><Link href={`/product/${item.slug}`} className="font-serif text-xl font-semibold leading-5 hover:text-[#ae3f25]">{item.name}</Link></div><span className="whitespace-nowrap text-sm font-extrabold">₹{(item.pricePaise / 100).toFixed(0)}</span></div><p className="mt-3 line-clamp-2 min-h-10 text-sm leading-5 text-[#74695b]">{item.description}</p><Button onClick={addItem} disabled={add.isPending} variant="outline" className="mt-4 w-full rounded-xl border-[#272119]/15 bg-[#fffdf9] text-xs font-extrabold hover:bg-[#272119] hover:text-white">{hasOptions ? "Customise" : <><Plus className="mr-1 h-3.5 w-3.5" />Add to cart</>}</Button></div>
    </article>
  );
}
