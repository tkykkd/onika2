import { supabase } from '@/src/supabase';
import type { MediaColor, MediaItem, MediaKind, MediaTag } from '@/src/types/media';

const BUCKET = 'portfolio-assets';
const TABLE = 'media_items';

function rowToItem(row: Record<string, unknown>): MediaItem {
  const rawOrder = row.display_order;
  return {
    id: String(row.id),
    title: String(row.title),
    tag: row.tag as MediaTag,
    color: row.color as MediaColor,
    kind: row.kind as MediaKind,
    assetUrl: String(row.asset_url),
    storagePath: String(row.storage_path),
    displayOrder: typeof rawOrder === 'number' ? rawOrder : Number(rawOrder ?? 0),
    createdAt: row.created_at ? new Date(String(row.created_at)).getTime() : undefined,
  };
}

export async function listMediaItems(): Promise<MediaItem[]> {
  if (!supabase) throw new Error('SUPABASE_NOT_CONFIGURED');

  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .order('display_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map((row) => rowToItem(row as Record<string, unknown>));
}

async function requireAdminEmail(): Promise<string> {
  if (!supabase) throw new Error('SUPABASE_NOT_CONFIGURED');

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user?.email) throw new Error('AUTH_REQUIRED');
  return user.email;
}

/** 先頭に複数件まとめて入れる直前に一度だけ呼ぶ（既存行を N だけ下げる） */
export async function shiftMediaDisplayOrders(delta: number): Promise<void> {
  if (!supabase) throw new Error('SUPABASE_NOT_CONFIGURED');
  await requireAdminEmail();
  if (delta <= 0) return;
  const { error } = await supabase.rpc('media_shift_display_orders', { p_delta: delta });
  if (error) throw error;
}

export async function uploadMediaItem(params: {
  file: File;
  title: string;
  tag: MediaTag;
  color: MediaColor;
  displayOrder?: number;
  /** false のときは shift しない（直前に shiftMediaDisplayOrders を済ませたバッチ用） */
  applyShift?: boolean;
}): Promise<void> {
  if (!supabase) throw new Error('SUPABASE_NOT_CONFIGURED');

  const email = await requireAdminEmail();

  const displayOrder = params.displayOrder ?? 0;
  const applyShift = params.applyShift ?? true;

  if (applyShift) {
    await shiftMediaDisplayOrders(1);
  }

  const kind: MediaKind = params.file.type.startsWith('video/') ? 'video' : 'image';
  const safeFileName = params.file.name.replace(/\s+/g, '-');
  const storagePath = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}-${safeFileName}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(storagePath, params.file, { upsert: false });

  if (uploadError) throw uploadError;

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);

  const { error: insertError } = await supabase.from(TABLE).insert({
    title: params.title,
    tag: params.tag,
    color: params.color,
    kind,
    asset_url: publicUrl,
    storage_path: storagePath,
    display_order: displayOrder,
    created_by: email,
  });

  if (insertError) throw insertError;
}

export async function reorderMediaItems(orderedIds: string[]): Promise<void> {
  if (!supabase) throw new Error('SUPABASE_NOT_CONFIGURED');
  await requireAdminEmail();
  const { error } = await supabase.rpc('media_set_display_order', {
    p_ids: orderedIds,
  });
  if (error) throw error;
}

export async function updateMediaItemMeta(params: {
  id: string;
  title: string;
  tag: MediaTag;
  color: MediaColor;
}): Promise<void> {
  if (!supabase) throw new Error('SUPABASE_NOT_CONFIGURED');
  await requireAdminEmail();
  const { error } = await supabase
    .from(TABLE)
    .update({
      title: params.title,
      tag: params.tag,
      color: params.color,
    })
    .eq('id', params.id);
  if (error) throw error;
}

export async function removeMediaItem(item: MediaItem): Promise<void> {
  if (!supabase) throw new Error('SUPABASE_NOT_CONFIGURED');

  await requireAdminEmail();

  const { error: storageError } = await supabase.storage.from(BUCKET).remove([item.storagePath]);
  if (storageError) throw storageError;

  const { error: deleteError } = await supabase.from(TABLE).delete().eq('id', item.id);
  if (deleteError) throw deleteError;
}
