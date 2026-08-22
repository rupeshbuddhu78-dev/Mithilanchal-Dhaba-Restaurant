import { trpc } from "@/lib/trpc";
import { useEffect } from "react";

const pageCopy: Record<string, { title: string; description: string; indexable: boolean }> = {
  "/": { title: "Mithilanchal Dhaba | Order Indian food online", description: "Browse Mithilanchal Dhaba's menu, customise your order, pay securely, and track your delivery.", indexable: true },
  "/menu": { title: "Menu | Mithilanchal Dhaba", description: "Explore the current Mithilanchal Dhaba menu and make your order your own.", indexable: true },
  "/about": { title: "About | Mithilanchal Dhaba", description: "Learn about Mithilanchal Dhaba and its family restaurant experience.", indexable: true },
  "/contact": { title: "Contact & location | Mithilanchal Dhaba", description: "Find Mithilanchal Dhaba on Mission Rd, Kaludewan, West Bengal.", indexable: true },
};

export function SiteSeo({ path }: { path: string }) {
  const settings = trpc.restaurant.settings.useQuery();
  useEffect(() => {
    const basePath = path.startsWith("/menu") ? "/menu" : path.startsWith("/product") ? "/menu" : path;
    const fallback = pageCopy[basePath] || { title: "Mithilanchal Dhaba", description: "Mithilanchal Dhaba restaurant ordering platform.", indexable: false };
    const title = settings.data?.name ? fallback.title.replace("Mithilanchal Dhaba", settings.data.name) : fallback.title;
    document.title = title;
    const canonical = `${window.location.origin}${path}`;
    const upsert = (selector: string, attributes: Record<string, string>) => { let node = document.head.querySelector(selector) as HTMLMetaElement | HTMLLinkElement | null; if (!node) { node = document.createElement(attributes.rel ? "link" : "meta") as HTMLMetaElement | HTMLLinkElement; document.head.append(node); } Object.entries(attributes).forEach(([key, value]) => node!.setAttribute(key, value)); };
    upsert('meta[name="description"]', { name: "description", content: fallback.description });
    upsert('meta[name="robots"]', { name: "robots", content: fallback.indexable ? "index,follow" : "noindex,nofollow" });
    upsert('meta[property="og:title"]', { property: "og:title", content: title });
    upsert('meta[property="og:description"]', { property: "og:description", content: fallback.description });
    upsert('meta[property="og:type"]', { property: "og:type", content: "website" });
    upsert('link[rel="canonical"]', { rel: "canonical", href: canonical });
    const existing = document.getElementById("restaurant-jsonld"); existing?.remove();
    if (settings.data && ["/", "/about", "/contact"].includes(path)) { const schema = { "@context": "https://schema.org", "@type": "Restaurant", name: settings.data.name, address: { "@type": "PostalAddress", streetAddress: settings.data.formattedAddress, addressLocality: settings.data.city || undefined, addressRegion: settings.data.state || undefined, postalCode: settings.data.pincode || undefined, addressCountry: settings.data.country || undefined } }; const script = document.createElement("script"); script.type = "application/ld+json"; script.id = "restaurant-jsonld"; script.text = JSON.stringify(schema); document.head.append(script); }
  }, [path, settings.data]);
  return null;
}

