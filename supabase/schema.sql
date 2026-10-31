-- Serve schema draft for Supabase Postgres.
-- Step 1 draft. Apply it as a migration in Step 6.
-- Product decisions that affect this file are recorded in docs/ARCHITECTURE.md.
--
-- Targets Supabase. Depends on auth.users, auth.uid(), auth.role(),
-- and the service_role / anon / authenticated roles.

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- Restaurants
-- ---------------------------------------------------------------------------

create table public.restaurants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  address text,
  phone text,
  logo_url text,
  currency char(3) not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  -- 0: price_minor is the major unit (Mehr stores whole PKR rupees).
  -- 2: price_minor is the minor unit (USD cents).
  currency_exponent smallint not null default 2 check (currency_exponent between 0 and 3),
  tax_rate_bps integer not null default 0 check (tax_rate_bps between 0 and 10000),
  service_charge_bps integer not null default 0 check (service_charge_bps between 0 and 10000),
  timezone text not null default 'UTC',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.restaurant_tables (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  table_number text not null check (table_number ~ '^[A-Za-z0-9][A-Za-z0-9 -]{0,15}$'),
  label text,
  public_code text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (restaurant_id, table_number)
);

create index restaurant_tables_restaurant_id_idx
  on public.restaurant_tables (restaurant_id);

-- ---------------------------------------------------------------------------
-- Menu
-- ---------------------------------------------------------------------------

create table public.menu_categories (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 80),
  description text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (restaurant_id, name)
);

create index menu_categories_restaurant_id_idx
  on public.menu_categories (restaurant_id, sort_order);

create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  category_id uuid not null references public.menu_categories (id) on delete restrict,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  description text,
  -- Integer in the restaurant's currency_exponent scale.
  -- Mehr (PKR, exponent 0): 1450 means Rs 1,450.
  -- A USD restaurant (exponent 2): 1450 means $14.50.
  price_minor integer not null check (price_minor between 0 and 10000000),
  image_path text,
  is_available boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index menu_items_category_idx
  on public.menu_items (restaurant_id, category_id, sort_order);

create index menu_items_available_idx
  on public.menu_items (restaurant_id, is_available);

-- ---------------------------------------------------------------------------
-- Staff
-- ---------------------------------------------------------------------------

create table public.staff_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  role text not null check (role in ('staff', 'admin')),
  display_name text not null check (char_length(btrim(display_name)) between 1 and 80),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index staff_profiles_restaurant_id_idx
  on public.staff_profiles (restaurant_id);

-- ---------------------------------------------------------------------------
-- Orders
-- Prices on order_items are snapshots. Client totals are never stored.
-- ---------------------------------------------------------------------------

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete restrict,
  table_id uuid not null references public.restaurant_tables (id) on delete restrict,
  order_number integer not null check (order_number > 0),
  fulfillment_status text not null default 'pending'
    check (fulfillment_status in ('pending', 'in_progress', 'served', 'cancelled')),
  payment_status text not null default 'unpaid'
    check (payment_status in ('unpaid', 'processing', 'paid', 'failed', 'refunded')),
  currency char(3) not null check (currency ~ '^[A-Z]{3}$'),
  currency_exponent smallint not null check (currency_exponent between 0 and 3),
  subtotal_minor integer not null check (subtotal_minor >= 0),
  tax_minor integer not null check (tax_minor >= 0),
  service_charge_minor integer not null default 0 check (service_charge_minor >= 0),
  total_minor integer not null check (total_minor >= 0),
  idempotency_key uuid not null,
  customer_note text check (customer_note is null or char_length(customer_note) <= 500),
  payment_provider text,
  payment_reference text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, restaurant_id),
  unique (restaurant_id, order_number),
  unique (restaurant_id, idempotency_key),
  check (total_minor = subtotal_minor + tax_minor + service_charge_minor),
  check (total_minor <= 50000000)
);

create unique index orders_payment_reference_uidx
  on public.orders (payment_provider, payment_reference)
  where payment_reference is not null;

create index orders_restaurant_created_idx
  on public.orders (restaurant_id, created_at desc);

create index orders_restaurant_fulfillment_idx
  on public.orders (restaurant_id, fulfillment_status, created_at desc);

create index orders_table_id_idx
  on public.orders (table_id);

-- Receipt secret. Not replicated to the staff realtime stream.
create table public.order_access_tokens (
  order_id uuid primary key references public.orders (id) on delete cascade,
  guest_token text not null unique,
  created_at timestamptz not null default now()
);

create table public.order_counters (
  restaurant_id uuid primary key references public.restaurants (id) on delete cascade,
  last_number integer not null default 0 check (last_number >= 0)
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null,
  restaurant_id uuid not null,
  menu_item_id uuid references public.menu_items (id) on delete set null,
  name_snapshot text not null,
  price_minor_snapshot integer not null check (price_minor_snapshot >= 0),
  quantity integer not null check (quantity between 1 and 99),
  special_instructions text check (
    special_instructions is null or char_length(special_instructions) <= 240
  ),
  line_total_minor integer not null check (line_total_minor >= 0),
  created_at timestamptz not null default now(),
  check (line_total_minor = price_minor_snapshot * quantity),
  foreign key (order_id, restaurant_id)
    references public.orders (id, restaurant_id)
    on delete cascade
);

create index order_items_order_id_idx
  on public.order_items (order_id);

create index order_items_menu_item_id_idx
  on public.order_items (menu_item_id);

-- ---------------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger restaurants_set_updated_at
  before update on public.restaurants
  for each row execute function public.set_updated_at();

create trigger restaurant_tables_set_updated_at
  before update on public.restaurant_tables
  for each row execute function public.set_updated_at();

create trigger menu_categories_set_updated_at
  before update on public.menu_categories
  for each row execute function public.set_updated_at();

create trigger menu_items_set_updated_at
  before update on public.menu_items
  for each row execute function public.set_updated_at();

create trigger staff_profiles_set_updated_at
  before update on public.staff_profiles
  for each row execute function public.set_updated_at();

create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Staff helpers. security definer so RLS policies can read the caller profile
-- without recursing through staff_profiles policies.
-- ---------------------------------------------------------------------------

create or replace function public.staff_restaurant_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select restaurant_id
  from public.staff_profiles
  where id = auth.uid()
$$;

create or replace function public.staff_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role
  from public.staff_profiles
  where id = auth.uid()
$$;

revoke all on function public.staff_restaurant_id() from public, anon, authenticated;
revoke all on function public.staff_role() from public, anon, authenticated;
grant execute on function public.staff_restaurant_id() to authenticated;
grant execute on function public.staff_role() to authenticated;

-- ---------------------------------------------------------------------------
-- Order mutation rules
-- Payment columns change only for a service-role request (the webhook).
-- Fulfillment can advance while payment is still unpaid. Guests pay at the
-- counter until Stripe is connected, and the kitchen starts at order creation.
-- ---------------------------------------------------------------------------

create or replace function public.enforce_order_update_rules()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.restaurant_id is distinct from old.restaurant_id
    or new.table_id is distinct from old.table_id
    or new.order_number is distinct from old.order_number
    or new.currency is distinct from old.currency
    or new.currency_exponent is distinct from old.currency_exponent
    or new.subtotal_minor is distinct from old.subtotal_minor
    or new.tax_minor is distinct from old.tax_minor
    or new.service_charge_minor is distinct from old.service_charge_minor
    or new.total_minor is distinct from old.total_minor
    or new.idempotency_key is distinct from old.idempotency_key
  then
    raise exception 'ORDER_IMMUTABLE_FIELD';
  end if;

  if new.payment_status is distinct from old.payment_status
    or new.payment_provider is distinct from old.payment_provider
    or new.payment_reference is distinct from old.payment_reference
    or new.paid_at is distinct from old.paid_at
  then
    if coalesce(auth.role(), '') is distinct from 'service_role' then
      raise exception 'PAYMENT_WRITE_FORBIDDEN';
    end if;
  end if;

  if new.fulfillment_status is distinct from old.fulfillment_status then
    if coalesce(auth.role(), '') is distinct from 'service_role' then
      if public.staff_role() not in ('staff', 'admin') then
        raise exception 'FULFILLMENT_WRITE_FORBIDDEN';
      end if;
    end if;
  end if;

  return new;
end;
$$;

create trigger orders_enforce_update_rules
  before update on public.orders
  for each row execute function public.enforce_order_update_rules();

create or replace function public.prevent_order_item_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'ORDER_ITEM_IMMUTABLE';
end;
$$;

create trigger order_items_immutable
  before update on public.order_items
  for each row execute function public.prevent_order_item_mutation();

-- ---------------------------------------------------------------------------
-- create_guest_order
-- The only insert path for guest orders. Ignores any price fields.
-- Granted to service_role only. The Next.js route calls it with the
-- service-role client after Zod validation.
-- ---------------------------------------------------------------------------

create or replace function public.create_guest_order(
  p_restaurant_slug text,
  p_table_number text,
  p_idempotency_key uuid,
  p_customer_note text,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_restaurant public.restaurants%rowtype;
  v_table public.restaurant_tables%rowtype;
  v_menu public.menu_items%rowtype;
  v_item jsonb;
  v_lines jsonb := '[]'::jsonb;
  v_seen uuid[] := '{}';
  v_qty integer;
  v_instructions text;
  v_line integer;
  v_subtotal integer := 0;
  v_tax integer := 0;
  v_service integer := 0;
  v_total integer := 0;
  v_order_id uuid;
  v_order_number integer;
  v_token text;
  v_note text;
  v_existing_id uuid;
  v_existing_number integer;
  v_existing_total integer;
  v_existing_currency char(3);
  v_existing_exponent smallint;
  v_existing_payment text;
  v_existing_fulfillment text;
  v_existing_token text;
begin
  if p_idempotency_key is null then
    raise exception 'IDEMPOTENCY_KEY_REQUIRED';
  end if;

  if jsonb_typeof(p_items) <> 'array'
    or jsonb_array_length(p_items) < 1
    or jsonb_array_length(p_items) > 40
  then
    raise exception 'INVALID_ITEMS';
  end if;

  v_note := nullif(btrim(coalesce(p_customer_note, '')), '');
  if v_note is not null and char_length(v_note) > 500 then
    raise exception 'NOTE_TOO_LONG';
  end if;

  select * into v_restaurant
  from public.restaurants
  where slug = p_restaurant_slug;

  if not found then
    raise exception 'RESTAURANT_NOT_FOUND';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(v_restaurant.id::text || ':' || p_idempotency_key::text, 0)
  );

  select o.id, o.order_number, o.total_minor, o.currency, o.currency_exponent,
         o.payment_status, o.fulfillment_status, t.guest_token
    into v_existing_id, v_existing_number, v_existing_total, v_existing_currency,
         v_existing_exponent, v_existing_payment, v_existing_fulfillment, v_existing_token
  from public.orders o
  join public.order_access_tokens t on t.order_id = o.id
  where o.restaurant_id = v_restaurant.id
    and o.idempotency_key = p_idempotency_key;

  if found then
    return jsonb_build_object(
      'replayed', true,
      'order_id', v_existing_id,
      'order_number', v_existing_number,
      'guest_token', v_existing_token,
      'total_minor', v_existing_total,
      'currency', v_existing_currency,
      'currency_exponent', v_existing_exponent,
      'payment_status', v_existing_payment,
      'fulfillment_status', v_existing_fulfillment
    );
  end if;

  select * into v_table
  from public.restaurant_tables
  where restaurant_id = v_restaurant.id
    and table_number = p_table_number
    and is_active = true;

  if not found then
    raise exception 'TABLE_NOT_FOUND';
  end if;

  for v_item in select value from jsonb_array_elements(p_items)
  loop
    if v_item ? 'price'
      or v_item ? 'price_minor'
      or v_item ? 'total'
      or v_item ? 'line_total'
    then
      raise exception 'CLIENT_PRICE_REJECTED';
    end if;

    if jsonb_typeof(v_item->'menu_item_id') <> 'string'
      or jsonb_typeof(v_item->'quantity') <> 'number'
    then
      raise exception 'INVALID_ITEM';
    end if;

    begin
      v_qty := (v_item->>'quantity')::integer;
    exception
      when invalid_text_representation then
        raise exception 'INVALID_QUANTITY';
    end;

    if v_qty < 1 or v_qty > 99 then
      raise exception 'INVALID_QUANTITY';
    end if;

    v_instructions := nullif(btrim(coalesce(v_item->>'special_instructions', '')), '');
    if v_instructions is not null and char_length(v_instructions) > 240 then
      raise exception 'INSTRUCTIONS_TOO_LONG';
    end if;

    select mi.* into v_menu
    from public.menu_items mi
    join public.menu_categories mc on mc.id = mi.category_id
    where mi.id = (v_item->>'menu_item_id')::uuid
      and mi.restaurant_id = v_restaurant.id
      and mi.is_available = true
      and mc.is_active = true
      and mc.restaurant_id = v_restaurant.id;

    if not found then
      raise exception 'MENU_ITEM_UNAVAILABLE';
    end if;

    if v_menu.id = any(v_seen) then
      raise exception 'DUPLICATE_ITEM';
    end if;
    v_seen := v_seen || v_menu.id;

    v_line := v_menu.price_minor * v_qty;
    if v_line > 50000000 or v_subtotal > 50000000 - v_line then
      raise exception 'ORDER_TOTAL_TOO_LARGE';
    end if;
    v_subtotal := v_subtotal + v_line;

    v_lines := v_lines || jsonb_build_array(
      jsonb_build_object(
        'menu_item_id', v_menu.id,
        'name_snapshot', v_menu.name,
        'price_minor_snapshot', v_menu.price_minor,
        'quantity', v_qty,
        'special_instructions', v_instructions,
        'line_total_minor', v_line
      )
    );
  end loop;

  v_tax := (v_subtotal * v_restaurant.tax_rate_bps) / 10000;
  v_service := (v_subtotal * v_restaurant.service_charge_bps) / 10000;
  v_total := v_subtotal + v_tax + v_service;

  if v_total > 50000000 then
    raise exception 'ORDER_TOTAL_TOO_LARGE';
  end if;

  insert into public.order_counters (restaurant_id, last_number)
  values (v_restaurant.id, 0)
  on conflict (restaurant_id) do nothing;

  update public.order_counters
  set last_number = last_number + 1
  where restaurant_id = v_restaurant.id
  returning last_number into v_order_number;

  v_order_id := gen_random_uuid();
  v_token := encode(extensions.gen_random_bytes(32), 'hex');

  insert into public.orders (
    id, restaurant_id, table_id, order_number,
    fulfillment_status, payment_status, currency, currency_exponent,
    subtotal_minor, tax_minor, service_charge_minor, total_minor,
    idempotency_key, customer_note
  ) values (
    v_order_id, v_restaurant.id, v_table.id, v_order_number,
    'pending', 'unpaid', v_restaurant.currency, v_restaurant.currency_exponent,
    v_subtotal, v_tax, v_service, v_total,
    p_idempotency_key, v_note
  );

  insert into public.order_access_tokens (order_id, guest_token)
  values (v_order_id, v_token);

  insert into public.order_items (
    order_id, restaurant_id, menu_item_id, name_snapshot,
    price_minor_snapshot, quantity, special_instructions, line_total_minor
  )
  select
    v_order_id,
    v_restaurant.id,
    (line->>'menu_item_id')::uuid,
    line->>'name_snapshot',
    (line->>'price_minor_snapshot')::integer,
    (line->>'quantity')::integer,
    line->>'special_instructions',
    (line->>'line_total_minor')::integer
  from jsonb_array_elements(v_lines) as line;

  return jsonb_build_object(
    'replayed', false,
    'order_id', v_order_id,
    'order_number', v_order_number,
    'guest_token', v_token,
    'subtotal_minor', v_subtotal,
    'tax_minor', v_tax,
    'service_charge_minor', v_service,
    'total_minor', v_total,
    'currency', v_restaurant.currency,
    'currency_exponent', v_restaurant.currency_exponent,
    'payment_status', 'unpaid',
    'fulfillment_status', 'pending'
  );
end;
$$;

revoke all on function public.create_guest_order(text, text, uuid, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.create_guest_order(text, text, uuid, text, jsonb)
  to service_role;

-- ---------------------------------------------------------------------------
-- apply_payment_event
-- The only writer of payment_status. Amount must match the stored total.
-- A repeated event with the same reference is a no-op.
-- ---------------------------------------------------------------------------

create or replace function public.apply_payment_event(
  p_order_id uuid,
  p_provider text,
  p_reference text,
  p_status text,
  p_amount_minor integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order public.orders%rowtype;
begin
  if p_provider is null or p_reference is null or btrim(p_reference) = '' then
    raise exception 'PAYMENT_REFERENCE_REQUIRED';
  end if;

  if p_status not in ('processing', 'paid', 'failed', 'refunded') then
    raise exception 'INVALID_PAYMENT_STATUS';
  end if;

  select * into v_order
  from public.orders
  where id = p_order_id
  for update;

  if not found then
    raise exception 'ORDER_NOT_FOUND';
  end if;

  if v_order.payment_status = p_status
    and v_order.payment_reference = p_reference
    and v_order.payment_provider = p_provider
  then
    return jsonb_build_object('replayed', true, 'payment_status', v_order.payment_status);
  end if;

  if p_status = 'paid' then
    if p_amount_minor is distinct from v_order.total_minor then
      raise exception 'AMOUNT_MISMATCH';
    end if;
    if v_order.payment_status = 'paid' then
      raise exception 'ALREADY_PAID';
    end if;
    if v_order.payment_status = 'refunded' then
      raise exception 'ORDER_REFUNDED';
    end if;

    update public.orders
    set payment_status = 'paid',
        payment_provider = p_provider,
        payment_reference = p_reference,
        paid_at = now()
    where id = v_order.id;
  elsif p_status = 'processing' then
    if v_order.payment_status in ('paid', 'refunded') then
      raise exception 'PAYMENT_ALREADY_SETTLED';
    end if;

    update public.orders
    set payment_status = 'processing',
        payment_provider = p_provider,
        payment_reference = p_reference
    where id = v_order.id;
  elsif p_status = 'failed' then
    if v_order.payment_status in ('paid', 'refunded') then
      raise exception 'PAYMENT_ALREADY_SETTLED';
    end if;

    update public.orders
    set payment_status = 'failed',
        payment_provider = p_provider,
        payment_reference = p_reference
    where id = v_order.id;
  elsif p_status = 'refunded' then
    if v_order.payment_status <> 'paid' then
      raise exception 'REFUND_REQUIRES_PAYMENT';
    end if;

    update public.orders
    set payment_status = 'refunded',
        payment_provider = p_provider,
        payment_reference = p_reference
    where id = v_order.id;
  end if;

  return jsonb_build_object('replayed', false, 'payment_status', p_status);
end;
$$;

revoke all on function public.apply_payment_event(uuid, text, text, text, integer)
  from public, anon, authenticated;
grant execute on function public.apply_payment_event(uuid, text, text, text, integer)
  to service_role;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.restaurants enable row level security;
alter table public.restaurant_tables enable row level security;
alter table public.menu_categories enable row level security;
alter table public.menu_items enable row level security;
alter table public.staff_profiles enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_access_tokens enable row level security;
alter table public.order_counters enable row level security;

alter table public.restaurants force row level security;
alter table public.restaurant_tables force row level security;
alter table public.menu_categories force row level security;
alter table public.menu_items force row level security;
alter table public.staff_profiles force row level security;
alter table public.orders force row level security;
alter table public.order_items force row level security;
alter table public.order_access_tokens force row level security;
alter table public.order_counters force row level security;

grant select on public.restaurants, public.restaurant_tables,
  public.menu_categories, public.menu_items
  to anon, authenticated;

grant update on public.restaurants to authenticated;
grant insert, update, delete on public.restaurant_tables,
  public.menu_categories, public.menu_items
  to authenticated;

grant select on public.staff_profiles to authenticated;

revoke all on public.orders from anon, authenticated;
grant select (
  id, restaurant_id, table_id, order_number, fulfillment_status, payment_status,
  currency, currency_exponent, subtotal_minor, tax_minor, service_charge_minor, total_minor,
  customer_note, paid_at, created_at, updated_at
) on public.orders to authenticated;
grant update (fulfillment_status, updated_at) on public.orders to authenticated;

grant select on public.order_items to authenticated;

revoke all on public.order_access_tokens from anon, authenticated;
revoke all on public.order_counters from anon, authenticated;

create policy restaurants_public_select
  on public.restaurants
  for select
  to anon, authenticated
  using (true);

create policy restaurants_admin_update
  on public.restaurants
  for update
  to authenticated
  using (
    id = public.staff_restaurant_id()
    and public.staff_role() = 'admin'
  )
  with check (
    id = public.staff_restaurant_id()
    and public.staff_role() = 'admin'
  );

create policy tables_select
  on public.restaurant_tables
  for select
  to anon, authenticated
  using (
    is_active = true
    or (
      restaurant_id = public.staff_restaurant_id()
      and public.staff_role() in ('staff', 'admin')
    )
  );

create policy tables_admin_write
  on public.restaurant_tables
  for all
  to authenticated
  using (
    restaurant_id = public.staff_restaurant_id()
    and public.staff_role() = 'admin'
  )
  with check (
    restaurant_id = public.staff_restaurant_id()
    and public.staff_role() = 'admin'
  );

create policy categories_select
  on public.menu_categories
  for select
  to anon, authenticated
  using (
    is_active = true
    or (
      restaurant_id = public.staff_restaurant_id()
      and public.staff_role() in ('staff', 'admin')
    )
  );

create policy categories_admin_write
  on public.menu_categories
  for all
  to authenticated
  using (
    restaurant_id = public.staff_restaurant_id()
    and public.staff_role() = 'admin'
  )
  with check (
    restaurant_id = public.staff_restaurant_id()
    and public.staff_role() = 'admin'
  );

create policy items_select
  on public.menu_items
  for select
  to anon, authenticated
  using (
    (
      is_available = true
      and exists (
        select 1
        from public.menu_categories c
        where c.id = category_id
          and c.is_active = true
          and c.restaurant_id = menu_items.restaurant_id
      )
    )
    or (
      restaurant_id = public.staff_restaurant_id()
      and public.staff_role() in ('staff', 'admin')
    )
  );

create policy items_admin_write
  on public.menu_items
  for all
  to authenticated
  using (
    restaurant_id = public.staff_restaurant_id()
    and public.staff_role() = 'admin'
  )
  with check (
    restaurant_id = public.staff_restaurant_id()
    and public.staff_role() = 'admin'
  );

create policy staff_profiles_select
  on public.staff_profiles
  for select
  to authenticated
  using (
    id = auth.uid()
    or (
      restaurant_id = public.staff_restaurant_id()
      and public.staff_role() = 'admin'
    )
  );

create policy orders_staff_select
  on public.orders
  for select
  to authenticated
  using (
    restaurant_id = public.staff_restaurant_id()
    and public.staff_role() in ('staff', 'admin')
  );

create policy orders_staff_update
  on public.orders
  for update
  to authenticated
  using (
    restaurant_id = public.staff_restaurant_id()
    and public.staff_role() in ('staff', 'admin')
  )
  with check (
    restaurant_id = public.staff_restaurant_id()
    and public.staff_role() in ('staff', 'admin')
  );

create policy order_items_staff_select
  on public.order_items
  for select
  to authenticated
  using (
    restaurant_id = public.staff_restaurant_id()
    and public.staff_role() in ('staff', 'admin')
  );

-- No policies on order_access_tokens or order_counters.
-- service_role bypasses RLS. anon and authenticated cannot read them.

-- ---------------------------------------------------------------------------
-- Realtime. Supabase only.
-- ---------------------------------------------------------------------------

alter table public.orders replica identity full;
alter table public.order_items replica identity full;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'orders'
    ) then
      alter publication supabase_realtime add table public.orders;
    end if;

    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'order_items'
    ) then
      alter publication supabase_realtime add table public.order_items;
    end if;
  end if;
end $$;
