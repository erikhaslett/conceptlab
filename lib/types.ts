export interface Asset {
  id: string;
  name: string;
  file_name: string;
  file_type: "image" | "video" | "audio" | "document" | "other";
  file_size: number;
  storage_path: string;
  url: string;
  mime_type: string;
  description: string | null;
  tags: string[];
  metadata: Record<string, unknown>;
  user_id: string | null;
  is_hero_background: boolean;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  short_description: string | null;
  app_url: string;
  embed_enabled: boolean;
  embed_options: {
    width?: string;
    height?: string;
    allowFullscreen?: boolean;
    sandbox?: string[];
  };
  thumbnail_url: string | null;
  thumbnail_asset_id: string | null;
  gallery_images: string[];
  category: string | null;
  tags: string[];
  technologies: string[];
  featured: boolean;
  status: "draft" | "published" | "archived";
  sort_order: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Page {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  hero_video_asset_id: string | null;
  hero_video_url: string | null;
  hero_title: string | null;
  hero_subtitle: string | null;
  embedded_app_id: string | null;
  embedded_app_url: string | null;
  content_sections: ContentSection[];
  status: "draft" | "published";
  sort_order: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface ContentSection {
  id: string;
  type: "text" | "video" | "embed" | "gallery" | "cta";
  title?: string;
  content?: string;
  video_asset_id?: string;
  video_url?: string;
  embed_url?: string;
  images?: string[];
  cta_text?: string;
  cta_link?: string;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
