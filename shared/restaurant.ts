export const ORDER_STATUSES = [
  "pending_payment", "placed", "accepted", "preparing", "ready_for_pickup", "rider_assigned", "out_for_delivery", "delivered", "cancelled",
] as const;

export const ORDER_STATUS_LABELS: Record<(typeof ORDER_STATUSES)[number], string> = {
  pending_payment: "Awaiting payment", placed: "Order placed", accepted: "Accepted by restaurant", preparing: "Being prepared",
  ready_for_pickup: "Ready for pickup", rider_assigned: "Rider assigned", out_for_delivery: "Out for delivery", delivered: "Delivered", cancelled: "Cancelled",
};

export const ORDER_TRANSITIONS: Record<(typeof ORDER_STATUSES)[number], readonly (typeof ORDER_STATUSES)[number][]> = {
  pending_payment: ["placed", "cancelled"], placed: ["accepted", "cancelled"], accepted: ["preparing", "cancelled"],
  preparing: ["ready_for_pickup", "cancelled"], ready_for_pickup: ["rider_assigned", "out_for_delivery", "cancelled"],
  rider_assigned: ["out_for_delivery", "cancelled"], out_for_delivery: ["delivered", "cancelled"], delivered: [], cancelled: [],
};

export type MenuChoice = { id: string; label: string; priceDeltaPaise: number };
export type MenuOptionGroup = { id: string; label: string; required?: boolean; choices: MenuChoice[] };

export const DEFAULT_RESTAURANT_SEED = {
  name: "Mithilanchal Dhaba", formattedAddress: "Mission Rd, Kaludewan, West Bengal 732141, India", city: "Kaludewan", state: "West Bengal", country: "India", pincode: "732141",
  heroHeading: "Comforting Indian flavours, served with care.",
  heroSubtitle: "Explore a thoughtfully prepared menu, customise your order, and follow every step from kitchen to doorstep.",
  heroImageUrl: "/manus-storage/thali_2c14c9ac.jpg",
  aboutText: "Mithilanchal Dhaba is a family restaurant experience designed around satisfying Indian food and warm hospitality.",
};

export const DEFAULT_MENU_SEED = [
  { category: { name: "Thalis & Combos", slug: "thalis-combos", sortOrder: 1, imageUrl: "/manus-storage/thali_2c14c9ac.jpg" }, items: [
    { name: "Mithilanchal Veg Thali", slug: "mithilanchal-veg-thali", description: "A generous vegetarian platter with seasonal accompaniments.", pricePaise: 24900, imageUrl: "/manus-storage/thali_2c14c9ac.jpg", isVegetarian: true, isFeatured: true },
    { name: "Comfort Dal Rice Bowl", slug: "comfort-dal-rice-bowl", description: "Steaming rice with a homestyle dal preparation.", pricePaise: 16900, imageUrl: "/manus-storage/thali_2c14c9ac.jpg", isVegetarian: true, isFeatured: false },
  ] },
  { category: { name: "Tandoor & Starters", slug: "tandoor-starters", sortOrder: 2, imageUrl: "/manus-storage/paneer-tikka_db189186.jpg" }, items: [
    { name: "Paneer Tikka", slug: "paneer-tikka", description: "Char-grilled paneer with a fragrant tandoori marinade.", pricePaise: 28900, imageUrl: "/manus-storage/paneer-tikka_db189186.jpg", isVegetarian: true, isFeatured: true },
    { name: "Masala Papad", slug: "masala-papad", description: "Crisp papad topped with a bright, spiced salad.", pricePaise: 7900, imageUrl: "/manus-storage/paneer-tikka_db189186.jpg", isVegetarian: true, isFeatured: false },
  ] },
  { category: { name: "Signature Curries", slug: "signature-curries", sortOrder: 3, imageUrl: "/manus-storage/paneer-makhani_9a68ebdd.jpg" }, items: [
    { name: "Paneer Makhani", slug: "paneer-makhani", description: "Silky tomato and cashew gravy finished with paneer.", pricePaise: 31900, imageUrl: "/manus-storage/paneer-makhani_9a68ebdd.jpg", isVegetarian: true, isFeatured: true, customisation: [{ id: "spice", label: "Spice level", required: true, choices: [{ id: "mild", label: "Mild", priceDeltaPaise: 0 }, { id: "regular", label: "Regular", priceDeltaPaise: 0 }, { id: "hot", label: "Hot", priceDeltaPaise: 0 }] }] },
    { name: "Seasonal Vegetable Curry", slug: "seasonal-vegetable-curry", description: "Market vegetables cooked in a balanced house masala.", pricePaise: 24900, imageUrl: "/manus-storage/paneer-makhani_9a68ebdd.jpg", isVegetarian: true, isFeatured: false },
  ] },
] as const;
