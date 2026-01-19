-- Create pages table for dynamic site pages
-- This allows adding new pages to conceptlabstudios.com

CREATE TABLE IF NOT EXISTS pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basic info
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  
  -- SEO
  meta_title VARCHAR(255),
  meta_description VARCHAR(500),
  
  -- Content sections (flexible JSON structure)
  content JSONB DEFAULT '[]',
  
  -- Hero/Header settings
  hero_type VARCHAR(50) DEFAULT 'default', -- 'video', 'image', 'gradient', 'default'
  hero_video_asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,
  hero_image_url TEXT,
  hero_title VARCHAR(255),
  hero_subtitle TEXT,
  
  -- Embedded app settings
  embedded_project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  embed_full_page BOOLEAN DEFAULT false, -- If true, page is just the embedded app
  
  -- Display settings
  is_published BOOLEAN DEFAULT false,
  show_in_nav BOOLEAN DEFAULT true,
  nav_order INTEGER DEFAULT 0,
  
  -- Template
  template VARCHAR(50) DEFAULT 'default', -- 'default', 'full-width', 'sidebar', 'app-embed'
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_pages_slug ON pages(slug);
CREATE INDEX idx_pages_is_published ON pages(is_published);
CREATE INDEX idx_pages_nav_order ON pages(nav_order);

-- Enable Row Level Security
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;

-- Public can view published pages
CREATE POLICY "Public can view published pages"
  ON pages
  FOR SELECT
  USING (is_published = true);

-- Admin policy
CREATE POLICY "Admins can manage pages"
  ON pages
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Updated_at trigger
CREATE TRIGGER update_pages_updated_at
  BEFORE UPDATE ON pages
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
