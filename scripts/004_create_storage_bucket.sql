-- Create storage bucket for assets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'assets',
  'assets',
  true,
  104857600, -- 100MB limit
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'video/x-msvideo'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 104857600,
  allowed_mime_types = ARRAY[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'video/x-msvideo'
  ];

-- Policy: Allow public read access to all files
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'assets');

-- Policy: Allow authenticated users to upload files
CREATE POLICY "Allow uploads"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'assets');

-- Policy: Allow authenticated users to update their files
CREATE POLICY "Allow updates"
ON storage.objects FOR UPDATE
USING (bucket_id = 'assets');

-- Policy: Allow authenticated users to delete files
CREATE POLICY "Allow deletes"
ON storage.objects FOR DELETE
USING (bucket_id = 'assets');
