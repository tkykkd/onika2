-- Run once in Supabase → SQL Editor if the table already exists with old tag values.
-- Renames: Style Test → IMG, Original → MOVIE; adds PICTURE to allowed list.

update public.media_items set tag = 'IMG' where tag in ('Style Test', 'IMAGE');
update public.media_items set tag = 'MOVIE' where tag = 'Original';

alter table public.media_items drop constraint if exists media_items_tag_check;

alter table public.media_items add constraint media_items_tag_check
  check (tag in ('Eddsworld', 'Animation', 'IMG', 'MOVIE', 'PICTURE'));
