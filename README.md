# Mithilanchal Dhaba Restaurant Platform

This repository contains a full-stack restaurant ordering platform for **Mithilanchal Dhaba**. It uses React, Vite, Express, tRPC, Drizzle, and the project-managed MySQL-compatible database. The system contains a branded customer storefront, restaurant operations workspace, and rider delivery workspace. The initial menu is safe editable catalog seed data; it intentionally contains no invented reviews, ratings, customer testimonials, contact numbers, hours, or geographic coordinates.

| Area | Included capability |
| --- | --- |
| Customer experience | Home, category menu browsing, search, dish customisation, cart, saved addresses, checkout, online/COD choice, order confirmation, order history, order tracking, and in-app updates. |
| Restaurant operations | Role-aware overview, sales summary, incoming orders, order-status updates, menu availability controls, customer list, category and menu write APIs, audit events, and staff alert records. |
| Delivery operations | Rider-only assignments, pickup/delivery state updates, browser location sharing, delivery location context, and an OpenStreetMap directions link. |
| Payments | Server-created Stripe Checkout Sessions, customer/order metadata, payment reference storage, signed webhook endpoint, Stripe payment confirmation, and COD orders. |
| Platform foundations | Input validation with Zod, role guards, server-side price calculation, order-state policy, controlled data model, tests, responsive UI, robots policy, metadata, canonical URLs, and truthful Restaurant JSON-LD. |

## Local development

Run the application with `pnpm dev`. The managed workspace supplies the database, authentication, storage, and Stripe environment values. Run `pnpm check` for the TypeScript check and `pnpm test` for the focused validation tests.

The database schema is maintained in `drizzle/schema.ts`. After a schema change, generate a migration using `pnpm drizzle-kit generate`, inspect the generated SQL, and apply the reviewed migration through the project database management workflow. Do not use ad hoc destructive database commands.

## Roles

The standard user role is `customer`. The project owner becomes `admin` through the supplied account bootstrap. A trusted administrator can assign `staff` or `rider` roles in the database after creating those accounts. Role checks are enforced in the tRPC procedures; client page hiding is only an additional usability layer.

| Role | Intended workspace |
| --- | --- |
| `customer` | Storefront, saved delivery addresses, cart, checkout, orders, and order notifications. |
| `admin` | All restaurant administration, catalog controls, orders, customer overview, and rider assignment. |
| `staff` | Order and menu operations without platform-owner privileges. |
| `rider` | Assigned deliveries, own location updates, and pickup/delivery progress updates. |

## Stripe and cash on delivery

Online orders create a server-side Stripe Checkout Session only after the order and immutable item snapshots are created. The order stores Stripe identifiers used for reference, not raw card data or payment secrets. The browser opens Stripe Checkout in a separate tab; the `/api/stripe/webhook` endpoint receives the authoritative completion event and marks the order paid.

Before accepting real payments, claim the project Stripe sandbox, configure the Stripe webhook URL as `https://YOUR-DOMAIN/api/stripe/webhook`, and subscribe to `checkout.session.completed`. The webhook secret belongs only in the managed payment settings. The webhook must remain registered before JSON parsing, because Stripe signature verification requires the original raw request body. Cash-on-delivery orders bypass Stripe and begin in the `placed` state. [1] [2]

For sandbox testing, Stripe documents the card number `4242 4242 4242 4242`; use the test dashboard and never enter test cards into a live checkout. [3]

## Notifications and delivery

Customer and staff updates are stored as in-app notification records. New orders create staff-facing records, and accepted/preparing/dispatch/delivery status transitions create customer-facing records. The project owner also receives a best-effort operational alert for a new order; the order transaction remains valid if that alert provider is temporarily unavailable.

Rider location collection is browser-permission based and occurs only when the rider chooses **Share my location**. The platform stores last reported latitude, longitude, and timestamp for delivery context. It does not invent restaurant coordinates or silently access location data.

## SEO and content controls

The app sets a route-specific document title, description, canonical URL, robots directive, Open Graph metadata, and a Restaurant JSON-LD block constructed only from configured restaurant fields. Unknown phone numbers, hours, coordinates, ratings, and reviews are omitted. Public static routes are indexable; carts, checkout, orders, administrative workspaces, and rider tools are marked non-indexable by the route-level SEO logic.

This Vite application is client-rendered. The implemented SEO layer covers browser metadata, JSON-LD, and crawl policy. For crawler-visible first-paint content and social scraper parity after a public domain is chosen, convert the public routes to server rendering and set a production canonical origin. This is deliberately documented as a deployment extension rather than exposing private customer orders or dashboard data in server-rendered HTML.

## Deployment checklist

1. Add real restaurant phone, email, hours, logo, hero media, delivery terms, and verified coordinate data through administration settings before publishing.
2. Claim and configure the Stripe sandbox, then verify webhook deliveries in the Stripe dashboard.
3. Create production Stripe credentials only after any required verification and switch payment settings from test to live.
4. Test customer ordering, payment completion, staff status updates, and rider location permission with separate role accounts.
5. Set the final public domain and then complete the optional server-rendering/canonical-origin SEO enhancement.

## References

[1] [Stripe: Create Checkout Sessions](https://docs.stripe.com/api/checkout/sessions/create)

[2] [Stripe: Receive events at a webhook endpoint](https://docs.stripe.com/webhooks)

[3] [Stripe: Test card numbers](https://docs.stripe.com/testing)

