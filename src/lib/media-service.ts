import { supabase } from '@/src/supabase';
import type { MediaColor, MediaItem, MediaKind, MediaTag } from '@/src/types/media';

const BUCKET = 'portfolio-assets';
const TABLE = 'media_items';

function rowToItem(row: Record<string, unknown>): MediaItem {
  return {
    id: String(row.id),
    title: String(row.title),
    tag: row.tag as MediaTag,
    color: row.color as MediaColor,
    kind: row.kind as MediaKind,
    assetUrl: String(row.asset_url),
    storagePath: String(row.storage_path),
    createdAt: row.created_at ? new Date(String(row.created_at)).getTime() : undefined,
  };
}

export async function listMediaItems(): Promise<MediaItem[]> {
  if (!supabase) throw new Error('SUPABASE_NOT_CONFIGURED');

  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
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

export async function uploadMediaItem(params: {
  file: File;
  title: string;
  tag: MediaTag;
  color: MediaColor;
}): Promise<void> {
  if (!supabase) throw new Error('SUPABASE_NOT_CONFIGURED');

  const email = await requireAdminEmail();

  const kind: MediaKind = params.file.type.startsWith('video/') ? 'video' : 'image';
  const safeFileName = params.file.name.replace(/\s+/g, '-');
  const storagePath = `${Date.now()}-${safeFileName}`;

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
    created_by: email,
  });

  if (insertError) throw insertError;
}

export async function removeMediaItem(item: MediaItem): Promise<void> {
  if (!supabase) throw new Error('SUPABASE_NOT_CONFIGURED');

  await requireAdminEmail();

  const { error: storageError } = await supabase.storage.from(BUCKET).remove([item.storagePath]);
  if (storageError) throw storageError;

  const { error: deleteError } = await supabase.from(TABLE).delete().eq('id', item.id);
  if (deleteError) throw deleteError;
}
