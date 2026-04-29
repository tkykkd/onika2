export const TAG_OPTIONS = ['Eddsworld', 'Animation', 'Style Test', 'Original'] as const;
export const COLOR_OPTIONS = ['#00A859', '#00AEEF', '#8E44AD', '#ED1C24'] as const;

export type MediaTag = (typeof TAG_OPTIONS)[number];
export type MediaColor = (typeof COLOR_OPTIONS)[number];
export type MediaKind = 'image' | 'video';

export type MediaItem = {
  id: string;
  title: string;
  tag: MediaTag;
  color: MediaColor;
  kind: MediaKind;
  assetUrl: string;
  storagePath: string;
  createdAt?: number;
};
