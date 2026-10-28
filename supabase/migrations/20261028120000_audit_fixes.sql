-- Fixes from the October 2026 audit: race conditions between parallel requests.

-- Moota can deliver the same mutation more than once. Each one is recorded under its
-- mutation id before it is matched, so a redelivery can't confirm a second order
-- that happens to have the same transfer amount.
alter table public.payment_events add column external_id text;
create unique index payment_events_external_idx on public.payment_events (source, external_id) where external_id is not null;

-- Settings are merged in a single statement. The background exchange-rate refresh and
-- an admin saving the settings page could otherwise overwrite each other's changes.
create or replace function public.merge_settings(p_key text, p_patch jsonb)
returns jsonb
language sql
set search_path = ''
as $$
  insert into public.settings as s (key, value)
  values (p_key, p_patch)
  on conflict (key) do update set value = s.value || excluded.value
  returning s.value;
$$;

revoke all on function public.merge_settings(text, jsonb) from public, anon, authenticated;
grant execute on function public.merge_settings(text, jsonb) to service_role;

-- Also returns the status the order had just before it was cancelled, so the buyer's email
-- says the right thing even if a payment was confirmed a moment earlier.
create or replace function public.cancel_order(p_order_id uuid, p_restock boolean default true)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  v_order public.orders;
  v_previous text;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then
    raise exception 'ORDER_NOT_FOUND';
  end if;
  if v_order.status not in ('pending_payment', 'paid') then
    raise exception 'INVALID_STATUS';
  end if;
  v_previous := v_order.status;

  update public.products
     set status = 'available', held_by_order_id = null, sold_at = null
   where held_by_order_id = p_order_id
     and (status = 'reserved' or (status = 'sold' and p_restock));

  update public.orders
     set status = 'cancelled', cancelled_at = now()
   where id = p_order_id
  returning * into v_order;

  return to_jsonb(v_order) || jsonb_build_object('previous_status', v_previous);
end;
$$;

-- Same as before, but the pieces are locked in id order: two carts that share several
-- pieces always lock them in the same sequence and can't deadlock each other.
create or replace function public.place_order(
  p_items jsonb,
  p_customer jsonb,
  p_shipping jsonb,
  p_payment_suffix integer,
  p_reservation_hours integer,
  p_currency text,
  p_usd_rate numeric
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

  select array_agg(distinct (item ->> 'id')::uuid) into v_ids from jsonb_array_elements(p_items) as item;
  if v_ids is null then
    raise exception 'CART_EMPTY';
  end if;
  if p_usd_rate is null or p_usd_rate <= 0 then
    raise exception 'INVALID_RATE';
  end if;
  if exists (select 1 from jsonb_array_elements(p_items) as item where coalesce((item ->> 'price_idr')::integer, 0) <= 0) then
    raise exception 'INVALID_PRICE';
  end if;
  if p_payment_suffix is null or p_payment_suffix < 0 or p_payment_suffix > 99 then
    raise exception 'INVALID_SUFFIX';
  end if;
  if v_shipping is null or v_shipping < 0 then
    raise exception 'INVALID_SHIPPING';
  end if;

  -- Lock the pieces so two buyers can't check out the same one at once.
  perform 1 from public.products where id = any (v_ids) order by id for update;

  select count(*) into v_available from public.products where id = any (v_ids) and status = 'available';
  if v_available <> cardinality(v_ids) then
    raise exception 'ITEM_UNAVAILABLE';
  end if;

  select coalesce(sum(price_idr), 0) into v_subtotal
    from (
      select distinct on (item ->> 'id') (item ->> 'price_idr')::integer as price_idr
        from jsonb_array_elements(p_items) as item
    ) as priced;

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
    coalesce(p_currency, 'USD'),
    p_usd_rate,
    now() + make_interval(hours => greatest(coalesce(p_reservation_hours, 24), 1))
  )
  returning * into v_order;

  insert into public.order_items (order_id, product_id, name, slug, price, price_usd, image)
  select v_order.id, p.id, p.name, p.slug, priced.price_idr, priced.price_usd, coalesce(p.images[1], '')
    from public.products p
    join (
      select distinct on (item ->> 'id')
             (item ->> 'id')::uuid as id,
             (item ->> 'price_idr')::integer as price_idr,
             (item ->> 'price_usd')::numeric as price_usd
        from jsonb_array_elements(p_items) as item
    ) as priced on priced.id = p.id
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
