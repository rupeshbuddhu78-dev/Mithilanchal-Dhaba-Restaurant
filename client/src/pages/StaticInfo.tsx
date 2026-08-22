import { StorefrontLayout } from "@/components/StorefrontLayout";
import { useLocation } from "wouter";

const content: Record<string, { title: string; eyebrow: string; copy: string }> = {
  "/about": { eyebrow: "Our table", title: "About Mithilanchal Dhaba", copy: "A family restaurant experience designed around satisfying Indian food, clear ordering, and warm hospitality. Restaurant details remain editable through the administration workspace." },
  "/contact": { eyebrow: "Get in touch", title: "Contact & location", copy: "Mithilanchal Dhaba is located on Mission Rd, Kaludewan, West Bengal 732141, India. Contact details are managed by the restaurant team and will appear here when configured." },
  "/privacy-policy": { eyebrow: "Your data", title: "Privacy policy", copy: "We use your account and delivery information only to process your food orders, communicate order progress, and provide the restaurant service you request. Payment details are handled by the selected payment provider and are not stored by the restaurant platform." },
  "/terms": { eyebrow: "Terms", title: "Terms & conditions", copy: "By placing an order, you confirm the accuracy of your contact and delivery details. Food availability and delivery coverage are confirmed by the restaurant during the order process." },
  "/refund-policy": { eyebrow: "Payments", title: "Refund policy", copy: "Refund decisions are reviewed by the restaurant according to the order’s preparation and delivery state. Online payment references are retained only to support secure payment verification and refunds through the payment provider." },
  "/shipping-delivery-policy": { eyebrow: "Delivery", title: "Delivery policy", copy: "Delivery availability, timing, and service coverage are confirmed at checkout. Customers receive order updates as the restaurant accepts, prepares, and dispatches the order." },
};
export default function StaticInfo() { const [location] = useLocation(); const page = content[location] || content["/about"]; return <StorefrontLayout><main className="container py-16 sm:py-24"><div className="max-w-3xl"><p className="eyebrow">{page.eyebrow}</p><h1 className="mt-3 font-serif text-5xl font-semibold">{page.title}</h1><p className="mt-7 text-base leading-8 text-[#625747]">{page.copy}</p></div></main></StorefrontLayout>; }

