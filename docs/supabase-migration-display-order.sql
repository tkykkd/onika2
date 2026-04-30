-- 公開一覧・管理画面の並び順を制御する display_order を追加します。
-- Supabase → SQL Editor で実行してください。

-- 1) カラム追加・既存行の埋め戻し（これまで通り「新しいほど上」）
alter table public.media_items add column if not exists display_order integer;

update public.media_items set display_order = 0 where display_order is null;

with ranked as (
  select id, row_number() over (order by created_at desc) - 1 as ord
  from public.media_items
)
update public.media_items m
set display_order = ranked.ord
from ranked
where m.id = ranked.id;

alter table public.media_items alter column display_order set not null;
alter table public.media_items alter column display_order set default 0;

create index if not exists media_items_display_order_idx on public.media_items (display_order asc);

-- 2) 管理者のみ UPDATE 可
drop policy if exists "media_update_admin" on public.media_items;
create policy "media_update_admin"
  on public.media_items for update
  using ((auth.jwt() ->> 'email') in ('tkykkd@gmail.com', 'karinyou2@gmail.com'))
  with check ((auth.jwt() ->> 'email') in ('tkykkd@gmail.com', 'karinyou2@gmail.com'));

-- 3) 先頭に新規を足すとき既存行をまとめてずらす
create or replace function public.media_shift_display_orders(p_delta integer)
returns void
language sql
security invoker
set search_path = public
as $$
  update public.media_items set display_order = display_order + p_delta;
$$;

-- 4) ドラッグ後の並びを一括反映（1 クエリ）
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
