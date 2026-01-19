-- Fix RLS policies for assets table and storage
-- Drop existing policies first, then recreate with proper permissions

-- Drop existing asset table policies (ignore errors if they don't exist)
DROP POLICY IF EXISTS "Allow public read access to assets" ON assets;
DROP POLICY IF EXISTS "Users can insert their own assets" ON assets;
DROP POLICY IF EXISTS "Users can update their own assets" ON assets;
DROP POLICY IF EXISTS "Users can delete their own assets" ON assets;
DROP POLICY IF EXISTS "Public read access" ON assets;
DROP POLICY IF EXISTS "Public insert access" ON assets;
DROP POLICY IF EXISTS "Public update access" ON assets;
DROP POLICY IF EXISTS "Public delete access" ON assets;

-- Create new permissive policies for assets table
CREATE POLICY "assets_select_policy" ON assets FOR SELECT USING (true);
CREATE POLICY "assets_insert_policy" ON assets FOR INSERT WITH CHECK (true);
CREATE POLICY "assets_update_policy" ON assets FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "assets_delete_policy" ON assets FOR DELETE USING (true);

-- Drop existing storage policies
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Allow public uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow public updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow public deletes" ON storage.objects;
DROP POLICY IF EXISTS "storage_public_select" ON storage.objects;
DROP POLICY IF EXISTS "storage_public_insert" ON storage.objects;
DROP POLICY IF EXISTS "storage_public_update" ON storage.objects;
DROP POLICY IF EXISTS "storage_public_delete" ON storage.objects;

-- Create new storage policies for the assets bucket
CREATE POLICY "storage_public_select" ON storage.objects FOR SELECT USING (bucket_id = 'assets');
CREATE POLICY "storage_public_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'assets');
CREATE POLICY "storage_public_update" ON storage.objects FOR UPDATE USING (bucket_id = 'assets') WITH CHECK (bucket_id = 'assets');
CREATE POLICY "storage_public_delete" ON storage.objects FOR DELETE USING (bucket_id = 'assets');
