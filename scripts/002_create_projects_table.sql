-- Create projects table for storing v0 app references
-- This table stores information about other v0 apps to display on the company site

CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Basic info
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  short_description VARCHAR(500),
  
  -- App embedding
  app_url TEXT, -- The deployed v0 app URL
  embed_enabled BOOLEAN DEFAULT false, -- Whether to show as iframe or link
  
  -- Visuals
  thumbnail_url TEXT, -- Screenshot/preview image
  video_preview_url TEXT, -- Optional video preview
  featured_image_url TEXT, -- Hero image for project detail page
  
  -- Categorization
  category VARCHAR(100), -- e.g., 'web-app', 'mobile', 'ai', 'e-commerce'
  tags TEXT[] DEFAULT '{}',
  technologies TEXT[] DEFAULT '{}', -- e.g., ['Next.js', 'Supabase', 'AI']
  
  -- Display settings
  is_featured BOOLEAN DEFAULT false,
  is_published BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  
  -- Content
  case_study TEXT, -- Detailed write-up
  client_name VARCHAR(255),
  project_date DATE,
  external_link TEXT, -- Link to live site if different from app_url
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_projects_slug ON projects(slug);
CREATE INDEX idx_projects_is_published ON projects(is_published);
CREATE INDEX idx_projects_is_featured ON projects(is_featured);
CREATE INDEX idx_projects_category ON projects(category);
CREATE INDEX idx_projects_display_order ON projects(display_order);

-- Enable Row Level Security
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- For now, allow public read access to published projects
CREATE POLICY "Public can view published projects"
  ON projects
  FOR SELECT
  USING (is_published = true);

-- Admin policy (we'll refine this when auth is added)
CREATE POLICY "Admins can manage projects"
  ON projects
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
