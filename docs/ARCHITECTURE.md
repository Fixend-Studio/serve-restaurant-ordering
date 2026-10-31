# Serve architecture

Serve is a QR ordering product for one restaurant, structured so a later release can host many restaurants. FIXEND is the studio. This document is the Step 1 design. The database draft in `supabase/schema.sql` is not applied yet.

## Decisions already made

These are scaffolding choices. They do not decide the menu, tax, or payment behavior.

- The app lives in this directory and deploys as one Next.js app on Vercel.
- Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, npm. No `src/` directory. Import alias `@/*`.
- Node.js 22. `@supabase/supabase-js` 2.118 requires it, and Node 20 is no longer the current LTS. Run `nvm use` before install or dev. The machine default Node version was left unchanged.
- The generated `cacheComponents` and `partialPrefetching` settings stay on. Public menu data may be cached. Sessions, baskets, and orders are request-time.
- Next.js 16 uses `proxy.ts` for optimistic redirects. It is not the authorization boundary. Staff and admin layouts authorize in a server-side data layer.
- Guest UI in Steps 3–5 uses local demo data. Supabase is connected in Step 6, behind the same component interfaces.
- shadcn/ui is initialized in Step 3, when the visual system is built. QR rendering is added in Step 7. Stripe is added in Step 8.
- Zod 4 validates every mutating request. Lucide React is the icon set.

## Confirmed product decisions

1. **Demo restaurant.** Mehr, a fictional contemporary Pakistani dining room in Karachi. Currency is PKR. Prices are whole rupees. The menu will use realistic dishes (grills, karahi, nihari, breads, chai, and desserts) written for this product, not copied from a real restaurant. The name can be changed later in restaurant settings.
2. **Orders before Stripe.** Checkout creates an `unpaid` order and the kitchen starts immediately. Guests pay at the counter. Staff see a payment badge and can move Pending → In Progress → Served without waiting for payment. Nothing in the guest UI marks an order paid.
3. **Tax.** Mehr's tax rate and service charge are 0. Both remain basis-point settings on the restaurant, calculated in Postgres from the server-side subtotal, so a later restaurant can turn them on. No tips in the MVP.

Money for Mehr uses `currency_exponent = 0`, so `1450` is Rs 1,450. A future USD restaurant uses exponent 2, so `1450` is $14.50. The exponent is copied onto the order. Stripe charges PKR in paisa, so Step 8 multiplies rupees by 100 when creating the Checkout Session and divides the webhook amount back to rupees before `apply_payment_event`.

## Still the plan

These were not reopened. Step 3 will follow them.

- **QR route.** The guest URL stays `/table/[tableNumber]`. Table numbers are enumerable. `restaurant_tables.public_code` is reserved for a later opaque URL. The MVP QR encodes the table route for Mehr.
- **Accounts.** Guests do not register. Staff and admins share Supabase email/password auth. Role is `staff` or `admin` on `staff_profiles`. The MVP does not include invite UI. The first users are created in the Supabase dashboard and linked with SQL.
- **One customization per dish per order.** The same menu item cannot appear twice on one order. Quantity plus a single note covers "two bowls, no chili".

## Product surfaces

| Surface | Route | Who |
| --- | --- | --- |
| Entry | `/` | Anyone. A short Serve landing that opens the demo table. Not a marketing site. |
| Guest order | `/table/[tableNumber]` | Guest at the table. Menu, basket, item notes. |
| Checkout | `/table/[tableNumber]/checkout` | Guest reviews the basket. Submit creates the order. |
| Confirmation | `/table/[tableNumber]/order/[orderId]` | Guest. Requires the receipt token. |
| Staff board | `/staff` | Kitchen and floor. Live orders. |
| Staff sign-in | `/staff/login` | Staff and admins. |
| Admin home | `/admin` | Admin. Today's counts. |
| Menu | `/admin/menu` | Categories and items. |
| Tables | `/admin/tables` | Tables and QR codes. Step 7. |
| Restaurant | `/admin/settings` | Name, address, currency, tax. |

Admins use the same board as staff. Staff cannot open `/admin`.

## Trust boundaries

The browser is not allowed to decide money, payment, or restaurant identity.

- The basket stores item ids, quantities, and notes. Displayed prices come from the menu response and are refreshed at checkout. They are not submitted as the charge.
- `POST /api/orders` accepts `tableNumber`, an idempotency key, an optional note, and `{ menuItemId, quantity, specialInstructions }[]`. Zod rejects price fields.
- The route reads `SERVE_RESTAURANT_SLUG` from the server environment. A client cannot pick the restaurant.
- The route calls `create_guest_order` with the service-role client. That function reloads each item, rejects unavailable items, snapshots name and price, and computes tax, service charge, and total. A unique `(restaurant_id, idempotency_key)` plus a transaction advisory lock returns the original order when the request is retried.
- The guest receipt token is random, stored in `order_access_tokens`, and returned only by that function. The confirmation route loads one order when the token matches. Anonymous clients cannot list orders.
- `payment_status` changes only through `apply_payment_event`, which is granted solely to `service_role`. Marking an order paid requires the stored total. A repeated webhook with the same provider reference does nothing. A browser return URL never calls this function.
- Staff status changes use the signed-in user's Supabase client, so RLS applies. The service role is not used for ordinary dashboard edits.
- `SUPABASE_SERVICE_ROLE_KEY` is read only in server modules guarded by `server-only`. The browser receives the anon key.

Until Step 8, no code sets `payment_status` to `paid`.

## Application structure

```
app/
  layout.tsx
  page.tsx
  table/[tableNumber]/
    layout.tsx
    page.tsx
    checkout/page.tsx
    order/[orderId]/page.tsx
  staff/
    login/page.tsx
    page.tsx
  admin/
    login/page.tsx
    page.tsx
    menu/page.tsx
    tables/page.tsx
    settings/page.tsx
  api/orders/route.ts
  api/orders/[orderId]/route.ts
  api/webhooks/stripe/route.ts      # Step 8
components/
  ui/                                 # shadcn, Step 3
  brand/
  guest/
  staff/
  admin/
lib/
  supabase/client.ts                  # anon browser client
  supabase/server.ts                  # cookie session
  supabase/admin.ts                   # service role, server-only
  demo/menu.ts                        # Steps 3–5
  validators/
  orders/
  money.ts
proxy.ts                              # optimistic staff/admin redirects
supabase/schema.sql
docs/ARCHITECTURE.md
```

Guest basket state lives in a client provider under the table layout and is mirrored to `sessionStorage`, keyed by table number. It is cleared when the confirmation page loads. Checkout disables the submit button while the request is in flight. The idempotency key is created once per checkout attempt and reused if that attempt is retried.

## Data model

All primary keys are UUIDs. Money is a non-negative integer. `restaurants.currency_exponent` says how to read it: 0 for whole rupees at Mehr, 2 for US cents at a future restaurant. Names, prices, currency, and exponent on an order are copies from the moment of ordering. Later menu edits do not change placed orders. `menu_item_id` is nullable on delete so a removed dish does not erase history.

`restaurants` owns the profile, currency, exponent, tax, and service charge. Every other domain table carries `restaurant_id`. The MVP seeds Mehr and does not build a restaurant switcher. Timezone for the demo is `Asia/Karachi`.

`restaurant_tables` is unique per restaurant and table number. Inactive tables do not accept orders.

`menu_categories` and `menu_items` have sort order, active/available flags, and restrict category deletion while items still point at the category.

`staff_profiles.id` is the Supabase auth user id. One profile belongs to one restaurant.

`orders` stores fulfillment and payment separately:

- Fulfillment: `pending`, `in_progress`, `served`, `cancelled`
- Payment: `unpaid`, `processing`, `paid`, `failed`, `refunded`

An order also stores the currency, currency exponent, subtotal, tax, service charge, total, table, human order number, customer note, and idempotency key. A check constraint requires `total = subtotal + tax + service`. A single order cannot exceed 50,000,000 in that scale. For Mehr that cap is Rs 50,000,000.

Order numbers come from `order_counters`, incremented in the same transaction as the insert.

## Access control

RLS is enabled and forced on every table. `anon` can read the public restaurant profile, active tables, active categories, and available items in active categories. `anon` cannot read or write orders.

`authenticated` staff and admins can read orders and order items for their restaurant. They can update `fulfillment_status` only. Column grants do not include the idempotency key or payment reference. Receipt tokens are in a separate table with no anon or authenticated policies, and that table is not in the realtime publication.

Admins of the restaurant can update the restaurant and write categories, items, and tables. There is no policy that lets a user change their own role. Profile inserts happen from SQL or the service role.

The staff board subscribes to Supabase Realtime on `orders` and `order_items`. RLS filters those events to the caller's restaurant. Every new order plays a sound and shows a banner, including unpaid orders, because the kitchen starts immediately. The card still shows payment status. Browsers block audio until a gesture, so the board has an Enable sound control.

Menu images go to a private Supabase Storage bucket `menu-images`. The admin upload route checks the admin session and writes `{restaurantId}/{itemId}`. Public menu pages read a transformed or public URL produced by the server. That storage policy is added in Step 6 with the rest of the Supabase project.

## Guest and staff flows

Guest: open `/table/4` → see Mehr, table 4, and the menu → add dishes and notes → review checkout → `POST /api/orders` → the route returns the receipt token once, the client stores it in `sessionStorage`, and the confirmation page sends it in a header. The confirmation says the kitchen has the order and payment is at the counter. `payment_status` stays `unpaid`. The token is not placed in the URL, so it does not land in access logs. Refresh on the same browser still opens the receipt. Opening the confirmation URL on another device does not.

Staff: sign in → every new order enters the active board as Pending, with an Unpaid badge → move it from Pending to In Progress to Served. Served orders leave the active board and remain on a completed list for the day. Payment status is visible and is not a gate.

Admin: sign in → counts for orders today by status and payment → edit menu and restaurant details → manage tables. QR images are Step 7.

## Environment

See `.env.example`.

- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are public.
- `SUPABASE_SERVICE_ROLE_KEY` and `SERVE_RESTAURANT_SLUG` are server-only.
- Stripe keys are added in Step 8 and stay empty until then.

## Roadmap

**Step 3. Design system and guest ordering.** Initialize shadcn/ui. Set type, color, and spacing for a quiet restaurant product, mobile first. Build the landing page, Mehr's menu, basket, checkout, and confirmation against demo data in whole rupees, including loading, empty, and error states. No network orders yet. Checkout tells the guest the kitchen will prepare the order and payment is at the counter. It does not invent a paid state.

**Step 4. Staff dashboard.** Password screen can be a local gate only if Supabase auth is still absent. Prefer a clear stub sign-in that Step 6 replaces, rather than a second password system. The board renders demo orders and status changes in local state. A new order alerts the kitchen whether or not it is paid.

**Step 5. Admin dashboard.** Overview, category and item management, availability, prices, descriptions, and restaurant details on demo data. Image upload UI can select a file and preview it. Storage upload waits for Step 6.

**Step 6. Supabase.** Create the project, apply `supabase/schema.sql` as migrations, seed one restaurant, menu, tables, and two users. Replace demo reads and writes. Guest create and confirmation go through the route handlers. Staff and admin use cookie sessions. Realtime drives the board. Authorization is checked in the data layer, with `proxy.ts` only redirecting anonymous visitors away from `/staff` and `/admin`.

**Step 7. QR codes.** Admin table screen generates a QR for `/table/{tableNumber}` using the configured app URL. Printing is a clean print stylesheet, not a new product surface.

**Step 8. Payments.** Add Stripe Checkout as a separate step after the order exists. The browser success URL only shows "confirming payment". `payment_status` becomes `paid` inside the verified webhook, which calls `apply_payment_event` and rejects an amount that does not match the order. Mehr's stored rupees are converted to Stripe paisa on the way out and back to rupees on the way in. The kitchen has already been working from order creation.

## Out of scope

Multi-restaurant signup, guest accounts, tips, modifiers with their own prices, loyalty, SMS, printer hardware, NFC tag encoding beyond the same URL a QR would open, and any client-side payment confirmation.
