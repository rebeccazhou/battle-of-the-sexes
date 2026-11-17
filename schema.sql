-- Battle of the Sexes: database schema (Supabase / Postgres)
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.floor_categories (
  id uuid primary key default gen_random_uuid(),
  team text not null check (team in ('girls','boys','wild','demo')), -- wild = round 2 system category, demo = practice round
  name text not null check (char_length(name) between 1 and 60),
  emoji text,
  created_at timestamptz not null default now()
);
create table if not exists public.floor_items (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.floor_categories(id) on delete cascade,
  answer text not null check (char_length(answer) between 1 and 80),
  image_url text not null check (char_length(image_url) < 600000),
  added_by text,
  team text check (team in ('girls','boys')),
  created_at timestamptz not null default now()
);
create index if not exists floor_items_category_idx on public.floor_items(category_id);

create table if not exists public.floor_players (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  team text not null check (team in ('girls','boys')),
  pass_hash text,
  created_at timestamptz not null default now()
);

-- one row holding the answer currently on the projector, for the judge view
create table if not exists public.floor_live (
  id int primary key check (id = 1),
  answer text not null default '',
  label text not null default '',
  updated_at timestamptz not null default now()
);
insert into public.floor_live(id) values (1) on conflict do nothing;

alter table public.floor_categories enable row level security;
alter table public.floor_items enable row level security;
alter table public.floor_players enable row level security;
alter table public.floor_live enable row level security;

create policy "floor game open access" on public.floor_categories for all to anon, authenticated using (true) with check (true);
create policy "floor game open access" on public.floor_items for all to anon, authenticated using (true) with check (true);
create policy "floor live open access" on public.floor_live for all to anon, authenticated using (true) with check (true);
grant select, insert, update, delete on public.floor_categories, public.floor_items to anon, authenticated;
grant select, update on public.floor_live to anon, authenticated;
revoke all on public.floor_players from anon, authenticated; -- reached only through the functions below

create or replace function public.floor_roster()
returns table(name text, team text, has_password boolean)
language sql security definer set search_path = public as
$$ select p.name, p.team, p.pass_hash is not null from public.floor_players p order by p.name $$;

create or replace function public.floor_sign_in(p_name text, p_password text)
returns text language plpgsql security definer set search_path = public, extensions as
$$
declare r public.floor_players;
begin
  select * into r from public.floor_players where name = p_name;
  if not found then raise exception 'That name is not on the guest list.'; end if;
  if r.pass_hash is null then
    if char_length(coalesce(p_password,'')) < 4 then raise exception 'Pick a password with at least 4 characters.'; end if;
    update public.floor_players set pass_hash = crypt(p_password, gen_salt('bf')) where id = r.id;
    return r.team;
  end if;
  if r.pass_hash = crypt(coalesce(p_password,''), r.pass_hash) then return r.team; end if;
  raise exception 'Wrong password.';
end $$;
revoke all on function public.floor_roster() from public;
revoke all on function public.floor_sign_in(text, text) from public;
grant execute on function public.floor_roster() to anon, authenticated;
grant execute on function public.floor_sign_in(text, text) to anon, authenticated;
