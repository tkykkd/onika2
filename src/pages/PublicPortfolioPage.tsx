import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Heart, MessageCircle, Instagram, Sparkles, Palette, Camera, Music, ZoomIn, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { isSupabaseConfigured } from '@/src/supabase';
import { listMediaItems } from '@/src/lib/media-service';
import type { MediaItem } from '@/src/types/media';

const TAGS = ['All', 'Eddsworld', 'Animation', 'IMG', 'MOVIE', 'PICTURE'] as const;
const FALLBACK_TAGS = ['Eddsworld', 'Animation', 'IMG', 'MOVIE', 'PICTURE'] as const;
const FALLBACK_COLORS = ['#00A859', '#00AEEF', '#8E44AD', '#ED1C24'] as const;
const FALLBACK_ITEMS: MediaItem[] = Array.from({ length: 17 }).map((_, i) => ({
  id: `fallback-${i}`,
  title: `My Creation #${17 - i}`,
  tag: FALLBACK_TAGS[i % 5],
  color: FALLBACK_COLORS[i % 4],
  kind: 'video',
  assetUrl: '',
  storagePath: '',
}));

/** iOS / Safari でグレーになりやすいので、メタデータ読込後に先頭付近へシークして静止画っぽく見せる */
function VideoPosterPreview({ src, className }: { src: string; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let cancelled = false;

    const paintFirstFrame = () => {
      if (cancelled || !el) return;
      try {
        const seekTo =
          Number.isFinite(el.duration) && el.duration > 0
            ? Math.min(0.12, el.duration * 0.02)
            : 0.05;
        el.currentTime = seekTo;
      } catch {
        /* ignore */
      }
    };

    const onSeeked = () => {
      el.pause();
    };

    el.addEventListener('loadedmetadata', paintFirstFrame);
    el.addEventListener('loadeddata', paintFirstFrame);
    el.addEventListener('seeked', onSeeked);

    return () => {
      cancelled = true;
      el.removeEventListener('loadedmetadata', paintFirstFrame);
      el.removeEventListener('loadeddata', paintFirstFrame);
      el.removeEventListener('seeked', onSeeked);
    };
  }, [src]);

  const hintedSrc = src.includes('#') ? src : `${src}#t=0.001`;

  return (
    <video
      ref={ref}
      src={hintedSrc}
      className={className}
      muted
      playsInline
      preload="auto"
      tabIndex={-1}
      aria-hidden
    />
  );
}

export default function PublicPortfolioPage() {
  const [selectedTag, setSelectedTag] = useState<(typeof TAGS)[number]>('All');
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [videos, setVideos] = useState<MediaItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lightboxItem, setLightboxItem] = useState<MediaItem | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const closeLightbox = useCallback(() => {
    setLightboxItem(null);
  }, []);

  useEffect(() => {
    if (!lightboxItem) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => closeButtonRef.current?.focus());
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeLightbox();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', onKey);
    };
  }, [lightboxItem, closeLightbox]);

  useEffect(() => {
    async function load() {
      if (!isSupabaseConfigured) {
        setVideos(FALLBACK_ITEMS);
        setError('Supabase未設定のため、いまはプレビュー用データを表示しています。');
        setLoading(false);
        return;
      }
      try {
        const items = await listMediaItems();
        setVideos(items);
      } catch {
        setError('データの読み込みに失敗しました。');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filteredVideos = useMemo(() => {
    if (selectedTag === 'All') return videos;
    return videos.filter((v) => v.tag === selectedTag);
  }, [selectedTag, videos]);

  const lightbox =
    lightboxItem && lightboxItem.assetUrl
      ? createPortal(
          <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4"
            role="dialog"
            aria-modal="true"
            aria-labelledby="media-lightbox-title"
            onClick={closeLightbox}
          >
            <button
              ref={closeButtonRef}
              type="button"
              onClick={closeLightbox}
              className="absolute right-4 top-4 z-[110] flex h-12 w-12 items-center justify-center border-2 border-white bg-white text-foreground brutal-shadow hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
              aria-label="閉じる"
            >
              <X className="h-6 w-6" strokeWidth={3} />
            </button>
            <div
              className="relative max-h-[90vh] max-w-[min(100vw-2rem,1200px)] w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <p id="media-lightbox-title" className="sr-only">
                {lightboxItem.title}
              </p>
              {lightboxItem.kind === 'video' ? (
                <video
                  key={lightboxItem.id}
                  src={lightboxItem.assetUrl}
                  controls
                  playsInline
                  className="mx-auto max-h-[85vh] w-full rounded-none border-2 border-white bg-black object-contain"
                  autoPlay
                />
              ) : (
                <img
                  src={lightboxItem.assetUrl}
                  alt={lightboxItem.title}
                  className="mx-auto max-h-[85vh] w-full border-2 border-white object-contain"
                />
              )}
              <p className="mt-3 text-center font-black uppercase tracking-tight text-white">{lightboxItem.title}</p>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-neon-blue selection:text-white font-sans overflow-x-hidden p-4 md:p-8">
      <div className="fixed inset-0 pointer-events-none opacity-5 overflow-hidden">
        <div className="absolute top-20 left-10 rotate-12 scale-150"><Palette size={120} /></div>
        <div className="absolute bottom-40 right-20 -rotate-12 scale-150"><Camera size={150} /></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[20vw] font-black uppercase tracking-tighter opacity-10">
          Artist
        </div>
      </div>

      <header className="max-w-7xl mx-auto mb-12 relative z-10">
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-8 mb-8">
          <div className="flex flex-col gap-4">
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-24 h-24 border-4 border-foreground bg-white brutal-shadow overflow-hidden">
              <Avatar className="w-full h-full rounded-none">
                <AvatarImage
                  src={`${import.meta.env.BASE_URL}profile-avatar.png`}
                  alt="Portfolio avatar"
                />
                <AvatarFallback className="rounded-none">EA</AvatarFallback>
              </Avatar>
            </motion.div>
            <div>
              <motion.h1 className="text-6xl md:text-8xl font-black uppercase tracking-tighter bg-foreground text-background inline-block px-2 transform -rotate-1" initial={{ x: -100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ type: 'spring', damping: 12 }}>
                Creative
              </motion.h1>
              <br />
              <motion.h1 className="text-6xl md:text-8xl font-black uppercase tracking-tighter text-foreground inline-block px-2 transform rotate-2 italic ml-4" initial={{ x: 100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ type: 'spring', damping: 12, delay: 0.1 }} style={{ WebkitTextStroke: '2px #1A1A1A', color: 'transparent' }}>
                Archive
              </motion.h1>
            </div>
          </div>

          <div className="flex flex-col gap-4 text-right">
            <div className="flex gap-4 justify-end">
              <a href="https://www.tiktok.com/@onika1219" target="_blank" rel="noopener noreferrer">
                <Button size="icon" variant="outline" className="rounded-none border-2 border-foreground brutal-shadow hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all">
                  <Music className="w-5 h-5" />
                </Button>
              </a>
              <a href="https://www.instagram.com/onika_0627" target="_blank" rel="noopener noreferrer">
                <Button size="icon" variant="outline" className="rounded-none border-2 border-foreground brutal-shadow hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all">
                  <Instagram className="w-5 h-5" />
                </Button>
              </a>
            </div>
            <p className="max-w-md text-lg font-medium leading-tight">
              16yo artist & animator. <br />
              Inspired by <span className="text-green underline decoration-4">Eddsworld</span>, chaos, and primary colors.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mb-8">
          {TAGS.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag)}
              className={cn(
                'px-6 py-2 text-sm font-bold uppercase tracking-widest transition-all border-2 border-foreground',
                selectedTag === tag
                  ? 'bg-foreground text-background translate-x-1 translate-y-1 shadow-none'
                  : 'bg-background text-foreground brutal-shadow hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none',
              )}
            >
              {tag}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-7xl mx-auto pb-20">
        {loading ? <p className="font-bold">読み込み中...</p> : null}
        {error ? <p className="font-bold text-red">{error}</p> : null}
        {!loading && !error && filteredVideos.length === 0 ? <p className="font-bold">まだ投稿がありません。</p> : null}
        <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredVideos.map((video, idx) => (
              <motion.div
                key={video.id}
                layout
                initial={{ opacity: 0, y: 50, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ delay: idx * 0.05 }}
                className="h-full"
                onMouseEnter={() => setHoveredId(video.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <button
                  type="button"
                  disabled={!video.assetUrl}
                  onClick={() => video.assetUrl && setLightboxItem(video)}
                  className={cn(
                    'group relative h-full w-full cursor-pointer border-0 bg-transparent p-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                    !video.assetUrl && 'cursor-not-allowed opacity-70',
                  )}
                >
                  <Card
                    className={cn(
                      'relative gap-0 overflow-hidden rounded-none border-2 border-foreground p-0 transition-all duration-300 aspect-[9/16]',
                      hoveredId === video.id ? 'brutal-shadow-lg scale-[1.02]' : 'brutal-shadow',
                    )}
                    style={{
                      boxShadow: hoveredId === video.id ? `8px 8px 0px 0px ${video.color}` : '4px 4px 0px 0px #1A1A1A',
                    }}
                  >
                    {video.assetUrl ? (
                      video.kind === 'video' ? (
                        <VideoPosterPreview
                          src={video.assetUrl}
                          className="absolute inset-0 h-full w-full bg-neutral-800 object-cover"
                        />
                      ) : (
                        <img src={video.assetUrl} alt={video.title} className="absolute inset-0 h-full w-full object-cover" />
                      )
                    ) : (
                      <div className="absolute inset-0 bg-secondary/60" />
                    )}

                    <div className="pointer-events-none absolute inset-0 flex flex-col justify-between bg-black/25 p-4">
                      <div className="flex justify-between items-start">
                        <Badge className="rounded-none border-2 border-foreground bg-white text-foreground hover:bg-white px-2 py-1 font-bold">
                          {video.tag}
                        </Badge>
                        <motion.div animate={{ rotate: hoveredId === video.id ? 360 : 0 }} className="bg-white p-2 border-2 border-foreground">
                          <Sparkles size={16} style={{ color: video.color }} />
                        </motion.div>
                      </div>
                      <div className="relative z-10 translate-y-4 transition-transform duration-300 group-hover:translate-y-0 max-md:translate-y-0">
                        <h3 className="text-xl font-black uppercase tracking-tight bg-white border-2 border-foreground px-2 inline-block mb-2">
                          {video.title}
                        </h3>
                        <div className="flex items-center gap-4 bg-white border-2 border-foreground p-2 opacity-0 transition-opacity duration-300 group-hover:opacity-100 max-md:hidden">
                          <div className="flex items-center gap-1 font-bold text-xs"><Heart size={14} /> Live</div>
                          <div className="flex items-center gap-1 font-bold text-xs"><MessageCircle size={14} /> New</div>
                        </div>
                      </div>
                    </div>

                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-70 transition-opacity duration-300 md:opacity-0 md:group-hover:opacity-100">
                      <div className="flex h-16 w-16 items-center justify-center border-4 border-foreground bg-white brutal-shadow-lg">
                        {video.kind === 'video' ? (
                          <Play className="ml-1 fill-foreground" size={32} aria-hidden />
                        ) : (
                          <ZoomIn className="text-foreground" size={28} strokeWidth={3} aria-hidden />
                        )}
                      </div>
                    </div>
                  </Card>
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      </main>
      {lightbox}
    </div>
  );
}
