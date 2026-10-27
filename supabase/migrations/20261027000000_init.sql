-- RIVHÉ Atelier — initial schema
--
-- Every table is read and written only by the Next.js server using the secret
-- (service_role) key. RLS is enabled with no policies and anon/authenticated
-- privileges are revoked, so the public Data API exposes nothing.
--
-- Money is stored as whole Rupiah (IDR) integers.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (length(name) between 1 and 160),
  price integer not null check (price >= 0),
  description text not null default '',
  details text not null default '',            -- one bullet per line
  category text not null default '',
  weight_grams integer not null default 500 check (weight_grams > 0),
  images text[] not null default '{}',         -- public URLs; the first is the cover
  -- draft: hidden · available: can be bought · reserved: held by an unpaid order · sold
  status text not null default 'draft' check (status in ('draft', 'available', 'reserved', 'sold')),
  held_by_order_id uuid,                       -- the order reserving or that bought this piece
  sort_order integer not null default 0,
  sold_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index products_status_idx on public.products (status, created_at desc);

create sequence public.order_number_seq start with 1001;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,                   -- RIVHE1001, RIVHE1002, …
  access_token text not null default replace(gen_random_uuid()::text, '-', ''),
  status text not null default 'pending_payment'
    check (status in ('pending_payment', 'paid', 'shipped', 'completed', 'expired', 'cancelled')),
  email text not null,
  name text not null,
  phone text not null,
  country text not null,                       -- ISO 3166-1 alpha-2
  address text not null,
  city text not null,
  province text not null default '',
  postal_code text not null,
  notes text not null default '',
  shipping_service text not null,
  shipping_eta text not null default '',
  shipping_cost integer not null check (shipping_cost >= 0),
  subtotal integer not null check (subtotal >= 0),
  total integer not null check (total >= 0),
  transfer_amount integer not null check (transfer_amount >= 0),  -- total with the last two digits replaced
  currency text not null default 'IDR',        -- display currency the buyer chose
  currency_rate numeric not null default 1,    -- IDR per 1 unit of that currency at checkout
  tracking_number text not null default '',
  admin_note text not null default '',
  expires_at timestamptz not null,
  paid_at timestamptz,
  shipped_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index orders_status_idx on public.orders (status, created_at desc);
create index orders_pending_amount_idx on public.orders (transfer_amount) where status = 'pending_payment';

alter table public.products
  add constraint products_held_by_order_fk
  foreign key (held_by_order_id) references public.orders (id) on delete set null;

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  -- snapshot of the product at checkout
  name text not null,
  slug text not null default '',
  price integer not null,
  image text not null default ''
);

create index order_items_order_idx on public.order_items (order_id);
create index order_items_product_idx on public.order_items (product_id);

create table public.email_log (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders (id) on delete set null,
  kind text not null,
  to_email text not null,
  subject text not null,
  html text not null,
  status text not null check (status in ('sent', 'failed', 'logged')),
  provider text not null default '',
  error text not null default '',
  created_at timestamptz not null default now()
);

create index email_log_order_idx on public.email_log (order_id, created_at desc);

-- Incoming bank transfers reported by a mutation service (e.g. Moota).
create table public.payment_events (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  amount integer not null,
  description text not null default '',
  status text not null check (status in ('matched', 'unmatched', 'ambiguous')),
  matched_order_id uuid references public.orders (id) on delete set null,
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table public.pages (
  slug text primary key,
  title text not null,
  body text not null default '',
  updated_at timestamptz not null default now()
);

create table public.settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger products_touch before update on public.products
  for each row execute function public.touch_updated_at();
create trigger orders_touch before update on public.orders
  for each row execute function public.touch_updated_at();
create trigger pages_touch before update on public.pages
  for each row execute function public.touch_updated_at();
create trigger settings_touch before update on public.settings
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Order lifecycle. Each function runs in one transaction, so a one-of-a-kind
-- piece can never be reserved or sold twice.
-- ---------------------------------------------------------------------------

-- Unpaid orders past their deadline become 'expired' and their pieces go back on sale.
create or replace function public.release_expired_orders()
returns integer
language plpgsql
set search_path = ''
as $$
declare
  v_count integer;
begin
  with expired as (
    update public.orders
       set status = 'expired'
     where status = 'pending_payment'
       and expires_at < now()
    returning id
  ), released as (
    update public.products p
       set status = 'available', held_by_order_id = null
      from expired e
     where p.held_by_order_id = e.id
       and p.status = 'reserved'
    returning p.id
  )
  select count(*) into v_count from expired;
  return v_count;
end;
$$;

create or replace function public.place_order(
  p_product_ids uuid[],
  p_customer jsonb,
  p_shipping jsonb,
  p_payment_suffix integer,
  p_reservation_hours integer,
  p_currency text,
  p_currency_rate numeric
)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_ids uuid[];
  v_available integer;
  v_subtotal integer;
  v_shipping integer := (p_shipping ->> 'cost')::integer;
  v_total integer;
  v_number bigint;
  v_order public.orders;
begin
  perform public.release_expired_orders();

  select array_agg(distinct x) into v_ids from unnest(p_product_ids) as x;
  if v_ids is null then
    raise exception 'CART_EMPTY';
  end if;
  if p_payment_suffix is null or p_payment_suffix < 0 or p_payment_suffix > 99 then
    raise exception 'INVALID_SUFFIX';
  end if;
  if v_shipping is null or v_shipping < 0 then
    raise exception 'INVALID_SHIPPING';
  end if;

  -- Lock the pieces so two buyers can't check out the same one at once.
  perform 1 from public.products where id = any (v_ids) for update;

  select count(*), coalesce(sum(price), 0)
    into v_available, v_subtotal
    from public.products
   where id = any (v_ids) and status = 'available';

  if v_available <> cardinality(v_ids) then
    raise exception 'ITEM_UNAVAILABLE';
  end if;

  v_total := v_subtotal + v_shipping;
  v_number := nextval('public.order_number_seq');

  insert into public.orders (
    code, email, name, phone, country, address, city, province, postal_code, notes,
    shipping_service, shipping_eta, shipping_cost, subtotal, total, transfer_amount,
    currency, currency_rate, expires_at
  ) values (
    'RIVHE' || v_number::text,
    p_customer ->> 'email',
    p_customer ->> 'name',
    p_customer ->> 'phone',
    p_customer ->> 'country',
    p_customer ->> 'address',
    p_customer ->> 'city',
    coalesce(p_customer ->> 'province', ''),
    p_customer ->> 'postal_code',
    coalesce(p_customer ->> 'notes', ''),
    p_shipping ->> 'service',
    coalesce(p_shipping ->> 'eta', ''),
    v_shipping,
    v_subtotal,
    v_total,
    -- The last two digits of the total are replaced with the payment suffix (e.g. 17).
    (v_total / 100) * 100 + p_payment_suffix,
    coalesce(p_currency, 'IDR'),
    coalesce(p_currency_rate, 1),
    now() + make_interval(hours => greatest(coalesce(p_reservation_hours, 24), 1))
  )
  returning * into v_order;

  insert into public.order_items (order_id, product_id, name, slug, price, image)
  select v_order.id, p.id, p.name, p.slug, p.price, coalesce(p.images[1], '')
    from public.products p
   where p.id = any (v_ids)
   order by p.name;

  update public.products
     set status = 'reserved', held_by_order_id = v_order.id
   where id = any (v_ids);

  return jsonb_build_object(
    'id', v_order.id,
    'code', v_order.code,
    'access_token', v_order.access_token,
    'total', v_order.total,
    'transfer_amount', v_order.transfer_amount,
    'expires_at', v_order.expires_at
  );
end;
$$;

-- Marks an order paid and its pieces sold. Also accepts a late payment for an
-- expired order, as long as none of its pieces has been bought by someone else.
create or replace function public.confirm_order_payment(p_order_id uuid)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_order public.orders;
  v_conflicts integer;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'ORDER_NOT_FOUND';
  end if;
  if v_order.status not in ('pending_payment', 'expired') then
    raise exception 'INVALID_STATUS';
  end if;

  perform 1
     from public.products p
     join public.order_items oi on oi.product_id = p.id
    where oi.order_id = p_order_id
      for update of p;

  select count(*) into v_conflicts
    from public.order_items oi
    join public.products p on p.id = oi.product_id
   where oi.order_id = p_order_id
     and not (p.held_by_order_id is not distinct from p_order_id or p.status = 'available');

  if v_conflicts > 0 then
    raise exception 'ITEM_UNAVAILABLE';
  end if;

  update public.products p
     set status = 'sold', held_by_order_id = p_order_id, sold_at = now()
    from public.order_items oi
   where oi.order_id = p_order_id
     and oi.product_id = p.id;

  update public.orders
     set status = 'paid', paid_at = now()
   where id = p_order_id
  returning * into v_order;

  return to_jsonb(v_order);
end;
$$;

-- Cancels an unpaid or paid order. Reserved pieces always return to the shop;
-- sold pieces return only when p_restock is true.
create or replace function public.cancel_order(p_order_id uuid, p_restock boolean default true)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_order public.orders;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'ORDER_NOT_FOUND';
  end if;
  if v_order.status not in ('pending_payment', 'paid') then
    raise exception 'INVALID_STATUS';
  end if;

  update public.products
     set status = 'available', held_by_order_id = null, sold_at = null
   where held_by_order_id = p_order_id
     and (status = 'reserved' or (status = 'sold' and p_restock));

  update public.orders
     set status = 'cancelled', cancelled_at = now()
   where id = p_order_id
  returning * into v_order;

  return to_jsonb(v_order);
end;
$$;

-- ---------------------------------------------------------------------------
-- Access: server only
-- ---------------------------------------------------------------------------

alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.email_log enable row level security;
alter table public.payment_events enable row level security;
alter table public.pages enable row level security;
alter table public.settings enable row level security;

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;

grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
grant execute on function public.release_expired_orders() to service_role;
grant execute on function public.place_order(uuid[], jsonb, jsonb, integer, integer, text, numeric) to service_role;
grant execute on function public.confirm_order_payment(uuid) to service_role;
grant execute on function public.cancel_order(uuid, boolean) to service_role;

-- ---------------------------------------------------------------------------
-- Storage: public bucket for product and homepage photos (uploads go through the server)
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('media', 'media', true, 10485760, array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do nothing;
