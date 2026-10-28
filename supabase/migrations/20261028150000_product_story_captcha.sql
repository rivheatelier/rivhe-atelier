-- Product stories, and single-use captcha solutions for "Track your order".

-- A longer note about the piece (what inspired it, the yarn, how it was made), shown under the description.
alter table public.products add column story text not null default '';

-- Each solved captcha is accepted once: its challenge id is kept until the challenge
-- expires, so one solution can't be replayed to try more order numbers.
create table public.captcha_uses (
  id text primary key,
  expires_at timestamptz not null
);

alter table public.captcha_uses enable row level security;
revoke all on public.captcha_uses from anon, authenticated;
grant all on public.captcha_uses to service_role;

-- Records the id and returns true, or false if it was used before. Expired ids are cleared
-- on the way, since their challenges are refused anyway.
create or replace function public.use_captcha(p_id text, p_expires_at timestamptz)
returns boolean
language plpgsql
set search_path = ''
as $$
begin
  delete from public.captcha_uses where expires_at < now();
  insert into public.captcha_uses (id, expires_at) values (p_id, p_expires_at) on conflict (id) do nothing;
  return found;
end;
$$;

revoke all on function public.use_captcha(text, timestamptz) from public, anon, authenticated;
grant execute on function public.use_captcha(text, timestamptz) to service_role;
