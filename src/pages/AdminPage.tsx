import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { supabase, isSupabaseConfigured } from '@/src/supabase';
import { COLOR_OPTIONS, TAG_OPTIONS, type MediaItem } from '@/src/types/media';
import {
  listMediaItems,
  removeMediaItem,
  reorderMediaItems,
  shiftMediaDisplayOrders,
  updateMediaItemMeta,
  uploadMediaItem,
} from '@/src/lib/media-service';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCorners,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { SortableContext, arrayMove, rectSortingStrategy, sortableKeyboardCoordinates, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';

const MAX_UPLOAD_MB = 50;
const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024;
const ALLOWED_ADMIN_EMAILS = ['tkykkd@gmail.com', 'karinyou2@gmail.com'];

function titleFromFileName(name: string): string {
  const withoutExt = name.replace(/\.[^.]+$/u, '');
  return withoutExt.trim() || name;
}

function SortableMediaCard({
  item,
  disabled,
  onDelete,
  onUpdate,
  isSaving,
}: {
  item: MediaItem;
  disabled: boolean;
  onDelete: (item: MediaItem) => void | Promise<void>;
  onUpdate: (params: { id: string; title: string; tag: (typeof TAG_OPTIONS)[number]; color: (typeof COLOR_OPTIONS)[number] }) => void | Promise<void>;
  isSaving: boolean;
}) {
  const [editTitle, setEditTitle] = useState(item.title);
  const [editTag, setEditTag] = useState<(typeof TAG_OPTIONS)[number]>(item.tag);
  const [editColor, setEditColor] = useState<(typeof COLOR_OPTIONS)[number]>(item.color);

  useEffect(() => {
    setEditTitle(item.title);
    setEditTag(item.tag);
    setEditColor(item.color);
  }, [item.id, item.title, item.tag, item.color]);

  const hasChanges = editTitle.trim() !== item.title || editTag !== item.tag || editColor !== item.color;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    disabled,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'border-2 border-foreground bg-white p-3 space-y-2',
        isDragging && 'z-20 opacity-70 shadow-lg ring-2 ring-foreground',
      )}
      {...attributes}
    >
      <div
        {...listeners}
        className="touch-none cursor-grab active:cursor-grabbing select-none rounded-sm border-2 border-dashed border-foreground/25 bg-foreground/5 px-2 py-2 -mx-1 -mt-1"
      >
        <div className="flex items-start gap-2">
          <GripVertical className="mt-0.5 h-5 w-5 shrink-0 text-foreground/70" aria-hidden />
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="rounded-none border-2 border-foreground bg-white text-foreground">{item.tag}</Badge>
              <span className="font-bold break-words">{item.title}</span>
            </div>
            <p className="text-xs font-medium text-foreground/80">
              この枠をドラッグ（スマホは約 0.2 秒長押し → 移動）。下の再生・削除はそのまま操作できます。
            </p>
          </div>
        </div>
      </div>
      {item.kind === 'video' ? (
        <video
          src={item.assetUrl}
          muted
          playsInline
          preload="metadata"
          className="w-full aspect-[9/16] object-cover border-2 border-foreground pointer-events-none"
        />
      ) : (
        <img
          src={item.assetUrl}
          alt={item.title}
          className="w-full aspect-[9/16] object-cover border-2 border-foreground pointer-events-none"
        />
      )}
      <div className="space-y-2">
        <label className="text-xs font-bold">表示名（ファイル名として表示されるタイトル）</label>
        <input
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          className="w-full border-2 border-foreground bg-white px-2 py-2 text-sm"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="text-xs font-bold">タグ</label>
          <select
            value={editTag}
            onChange={(e) => setEditTag(e.target.value as (typeof TAG_OPTIONS)[number])}
            className="w-full border-2 border-foreground bg-white px-2 py-2 text-sm"
          >
            {TAG_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs font-bold">カラー</label>
          <select
            value={editColor}
            onChange={(e) => setEditColor(e.target.value as (typeof COLOR_OPTIONS)[number])}
            className="w-full border-2 border-foreground bg-white px-2 py-2 text-sm"
          >
            {COLOR_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>
      <Button
        type="button"
        variant="outline"
        onClick={() =>
          onUpdate({
            id: item.id,
            title: editTitle.trim(),
            tag: editTag,
            color: editColor,
          })
        }
        className="rounded-none border-2 border-foreground w-full"
        disabled={disabled || isSaving || !hasChanges || !editTitle.trim()}
      >
        {isSaving ? '保存中...' : '変更を保存'}
      </Button>
      <Button
        type="button"
        variant="outline"
        onClick={() => onDelete(item)}
        className="rounded-none border-2 border-foreground w-full"
        disabled={disabled}
      >
        削除（即時）
      </Button>
    </div>
  );
}

export default function AdminPage() {
  const homeHref = '#/';
  const [adminEmail, setAdminEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [tag, setTag] = useState<(typeof TAG_OPTIONS)[number]>('Eddsworld');
  const [color, setColor] = useState<(typeof COLOR_OPTIONS)[number]>('#00A859');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);
  const [savingItemId, setSavingItemId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 220, tolerance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const isBulk = selectedFiles.length > 1;
  const canSubmit = useMemo(() => {
    if (isLoading || selectedFiles.length === 0) return false;
    if (isBulk) return true;
    return title.trim().length > 0;
  }, [isLoading, selectedFiles.length, isBulk, title]);

  function applySession(email: string | undefined | null) {
    if (email && ALLOWED_ADMIN_EMAILS.includes(email)) {
      setAdminEmail(email);
      return;
    }
    if (email && supabase) {
      void supabase.auth.signOut();
    }
    setAdminEmail(null);
    setItems([]);
  }

  async function refreshItems() {
    const data = await listMediaItems();
    setItems(data);
  }

  useEffect(() => {
    if (!supabase || !isSupabaseConfigured) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      applySession(session?.user?.email ?? null);
      if (session?.user?.email && ALLOWED_ADMIN_EMAILS.includes(session.user.email)) {
        void refreshItems().catch(() => setError('一覧の読み込みに失敗しました。'));
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      applySession(session?.user?.email ?? null);
      if (session?.user?.email && ALLOWED_ADMIN_EMAILS.includes(session.user.email)) {
        void refreshItems().catch(() => setError('一覧の読み込みに失敗しました。'));
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleLogin() {
    if (!supabase || !isSupabaseConfigured) {
      setError('Supabase設定が未完了です。onika2/.env.local を確認してください。');
      return;
    }
    setError(null);
    try {
      const redirectTo = `${window.location.origin}${window.location.pathname}`;
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo },
      });
      if (oauthError) throw oauthError;
    } catch {
      setError('ログインに失敗しました。再度お試しください。');
    }
  }

  async function handleLogout() {
    if (!supabase) return;
    await supabase.auth.signOut();
    setAdminEmail(null);
    setItems([]);
  }

  async function handleUpload(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const files = selectedFiles;
    if (files.length === 0) return;

    for (const f of files) {
      if (f.size > MAX_UPLOAD_BYTES) {
        setError(`「${f.name}」は${MAX_UPLOAD_MB}MB以下にしてください。`);
        return;
      }
      if (!f.type.startsWith('image/') && !f.type.startsWith('video/')) {
        setError(`「${f.name}」は画像または動画のみアップロードできます。`);
        return;
      }
    }

    if (!isBulk && !title.trim()) {
      setError('タイトルを入力してください。');
      return;
    }

    setError(null);
    setIsLoading(true);
    setUploadProgress({ current: 0, total: files.length });
    try {
      if (files.length > 1) {
        await shiftMediaDisplayOrders(files.length);
      }
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress({ current: i + 1, total: files.length });
        const itemTitle = isBulk ? titleFromFileName(file.name) : title.trim();
        await uploadMediaItem({
          file,
          title: itemTitle,
          tag,
          color,
          displayOrder: i,
          applyShift: files.length === 1,
        });
      }
      setTitle('');
      setSelectedFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      await refreshItems();
    } catch {
      setError('アップロードに失敗しました。RLS・Storage権限を確認してください。');
    } finally {
      setUploadProgress(null);
      setIsLoading(false);
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;

    const next: MediaItem[] = arrayMove(items, oldIndex, newIndex);
    setItems(next);
    setError(null);
    setIsLoading(true);
    try {
      await reorderMediaItems(next.map((i) => i.id));
    } catch {
      setError('並び替えの保存に失敗しました。最新の状態を再読み込みします。');
      try {
        await refreshItems();
      } catch {
        /* ignore */
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDelete(item: MediaItem) {
    setError(null);
    setIsLoading(true);
    try {
      await removeMediaItem(item);
      await refreshItems();
    } catch {
      setError('削除に失敗しました。');
    } finally {
      setIsLoading(false);
    }
  }

  async function handleUpdateItem(params: {
    id: string;
    title: string;
    tag: (typeof TAG_OPTIONS)[number];
    color: (typeof COLOR_OPTIONS)[number];
  }) {
    if (!params.title.trim()) {
      setError('タイトルを入力してください。');
      return;
    }
    setError(null);
    setSavingItemId(params.id);
    try {
      await updateMediaItemMeta({
        id: params.id,
        title: params.title.trim(),
        tag: params.tag,
        color: params.color,
      });
      await refreshItems();
    } catch {
      setError('編集の保存に失敗しました。');
    } finally {
      setSavingItemId(null);
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-4 md:p-8">
      <main className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl md:text-5xl font-black uppercase tracking-tight">Admin</h1>
          <a href={homeHref}>
            <Button variant="outline" className="rounded-none border-2 border-foreground">公開ページへ戻る</Button>
          </a>
        </div>

        {!adminEmail ? (
          <Card className="rounded-none border-2 border-foreground brutal-shadow p-6 space-y-4">
            {!isSupabaseConfigured ? (
              <p className="font-bold text-red">Supabase未設定です。onika2/.env.local に VITE_SUPABASE_URL と VITE_SUPABASE_ANON_KEY を設定してください。</p>
            ) : null}
            <p className="font-medium">管理ページはGoogleログインが必要です。</p>
            <Button onClick={handleLogin} className="rounded-none border-2 border-foreground brutal-shadow">
              Googleでログイン
            </Button>
            {error ? <p className="text-red font-bold">{error}</p> : null}
          </Card>
        ) : (
          <>
            <Card className="rounded-none border-2 border-foreground brutal-shadow p-6 space-y-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <p className="font-medium">ログイン中: {adminEmail}</p>
                <Button onClick={handleLogout} variant="outline" className="rounded-none border-2 border-foreground">
                  ログアウト
                </Button>
              </div>
              <form onSubmit={handleUpload} className="space-y-4">
                <div className="space-y-2">
                  <label className="font-bold">タイトル</label>
                  {isBulk ? (
                    <p className="text-sm font-medium">
                      複数ファイル選択中は、各ファイルの名前（拡張子なし）がタイトルになります。
                    </p>
                  ) : (
                    <input
                      className="w-full border-2 border-foreground bg-white px-3 py-2"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="例: New Animation #1"
                    />
                  )}
                </div>

                <div className="space-y-2">
                  <label className="font-bold">タグ</label>
                  <select
                    className="w-full border-2 border-foreground bg-white px-3 py-2"
                    value={tag}
                    onChange={(e) => setTag(e.target.value as (typeof TAG_OPTIONS)[number])}
                  >
                    {TAG_OPTIONS.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="font-bold">カラー</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {COLOR_OPTIONS.map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => setColor(option)}
                        className="border-2 border-foreground px-2 py-2 font-bold"
                        style={{
                          backgroundColor: option,
                          color: '#fff',
                          boxShadow: color === option ? '4px 4px 0px 0px #1A1A1A' : 'none',
                        }}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="font-bold">画像または動画（最大50MB・複数選択可）</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    onChange={(e) => {
                      const list = e.target.files;
                      setSelectedFiles(list ? Array.from(list) : []);
                    }}
                    className="w-full border-2 border-foreground bg-white px-3 py-2"
                  />
                  {selectedFiles.length > 0 ? (
                    <p className="text-sm font-medium">
                      {selectedFiles.length} 件選択中
                    </p>
                  ) : null}
                </div>

                <Button
                  type="submit"
                  disabled={!canSubmit}
                  className="rounded-none border-2 border-foreground brutal-shadow"
                >
                  {isLoading && uploadProgress
                    ? `アップロード中 ${uploadProgress.current} / ${uploadProgress.total} …`
                    : isLoading
                      ? '処理中...'
                      : 'アップロード'}
                </Button>
              </form>
              {error ? <p className="text-red font-bold">{error}</p> : null}
            </Card>

            <Card className="rounded-none border-2 border-foreground brutal-shadow p-6 space-y-4">
              <div className="space-y-1">
                <h2 className="text-xl font-black uppercase">登録済み一覧（ドラッグで順番変更）</h2>
                <p className="text-sm font-medium leading-snug">
                  上に近いほど公開ページでも先に表示されます。各カード上部の点線枠をドラッグして並べ替えます。スマホは長押ししてから動かすとスクロールと区別しやすいです。
                </p>
              </div>
              <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
                <SortableContext items={items.map((i) => i.id)} strategy={rectSortingStrategy}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {items.map((item) => (
                      <SortableMediaCard
                        key={item.id}
                        item={item}
                        disabled={isLoading}
                        isSaving={savingItemId === item.id}
                        onUpdate={handleUpdateItem}
                        onDelete={handleDelete}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </Card>
          </>
        )}
      </main>
    </div>
  );
}
