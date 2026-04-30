-- Run in Supabase → SQL Editor → New query → Run
-- Adjust admin email if needed.

-- 1) Table
create table if not exists public.media_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  tag text not null check (tag in ('Eddsworld', 'Animation', 'IMG', 'MOVIE', 'PICTURE')),
  color text not null check (color in ('#00A859', '#00AEEF', '#8E44AD', '#ED1C24')),
  kind text not null check (kind in ('image', 'video')),
  asset_url text not null,
  storage_path text not null,
  display_order integer not null default 0,
  created_by text,
  created_at timestamptz not null default now()
);

create index if not exists media_items_display_order_idx on public.media_items (display_order asc);

alter table public.media_items enable row level security;

-- 2) Row policies (public read; admin write/delete)
drop policy if exists "media_select_public" on public.media_items;
create policy "media_select_public"
  on public.media_items for select
  using (true);

drop policy if exists "media_insert_admin" on public.media_items;
create policy "media_insert_admin"
  on public.media_items for insert
  with check ((auth.jwt() ->> 'email') in ('tkykkd@gmail.com', 'karinyou2@gmail.com'));

drop policy if exists "media_delete_admin" on public.media_items;
create policy "media_delete_admin"
  on public.media_items for delete
  using ((auth.jwt() ->> 'email') in ('tkykkd@gmail.com', 'karinyou2@gmail.com'));

drop policy if exists "media_update_admin" on public.media_items;
create policy "media_update_admin"
  on public.media_items for update
  using ((auth.jwt() ->> 'email') in ('tkykkd@gmail.com', 'karinyou2@gmail.com'))
  with check ((auth.jwt() ->> 'email') in ('tkykkd@gmail.com', 'karinyou2@gmail.com'));

-- Reorder + shift RPCs (used by the web app for drag order and new-at-top inserts)
create or replace function public.media_shift_display_orders(p_delta integer)
returns void
language sql
security invoker
set search_path = public
as $$
  update public.media_items set display_order = display_order + p_delta;
$$;

create or replace function public.media_set_display_order(p_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  i integer;
begin
  if p_ids is null then
    return;
  end if;
  for i in 1..coalesce(array_length(p_ids, 1), 0) loop
    update public.media_items
    set display_order = i - 1
    where id = p_ids[i];
  end loop;
end;
$$;

grant execute on function public.media_shift_display_orders(integer) to authenticated;
grant execute on function public.media_set_display_order(uuid[]) to authenticated;

-- 3) Storage bucket name must match app: portfolio-assets (public bucket in dashboard)
-- Storage policies (RLS on storage.objects)
drop policy if exists "storage_portfolio_public_read" on storage.objects;
create policy "storage_portfolio_public_read"
  on storage.objects for select
  using (bucket_id = 'portfolio-assets');

drop policy if exists "storage_portfolio_admin_insert" on storage.objects;
create policy "storage_portfolio_admin_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'portfolio-assets'
    and (auth.jwt() ->> 'email') in ('tkykkd@gmail.com', 'karinyou2@gmail.com')
  );

drop policy if exists "storage_portfolio_admin_delete" on storage.objects;
create policy "storage_portfolio_admin_delete"
  on storage.objects for delete
  using (
    bucket_id = 'portfolio-assets'
    and (auth.jwt() ->> 'email') in ('tkykkd@gmail.com', 'karinyou2@gmail.com')
  );
