-- Fix storage bucket policies and assets RLS for uploads without auth
-- This allows uploads in development/admin context

-- Drop existing restrictive policies on assets table
DROP POLICY IF EXISTS "Users can view their own assets" ON public.assets;
DROP POLICY IF EXISTS "Users can insert their own assets" ON public.assets;
DROP POLICY IF EXISTS "Users can update their own assets" ON public.assets;
DROP POLICY IF EXISTS "Users can delete their own assets" ON public.assets;

-- Create new permissive policies for assets (admin access)
-- In production, you'd want to add proper auth checks
CREATE POLICY "Allow public read access to assets"
ON public.assets FOR SELECT
USING (true);

CREATE POLICY "Allow public insert access to assets"
ON public.assets FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow public update access to assets"
ON public.assets FOR UPDATE
USING (true);

CREATE POLICY "Allow public delete access to assets"
ON public.assets FOR DELETE
USING (true);

-- Fix storage bucket policies
-- First, remove old policies if they exist
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Allow uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow updates" ON storage.objects;
DROP POLICY IF EXISTS "Allow deletes" ON storage.objects;

-- Create permissive storage policies for the assets bucket
CREATE POLICY "Public read access for assets bucket"
ON storage.objects FOR SELECT
USING (bucket_id = 'assets');

CREATE POLICY "Public upload access for assets bucket"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'assets');

CREATE POLICY "Public update access for assets bucket"
ON storage.objects FOR UPDATE
USING (bucket_id = 'assets');

CREATE POLICY "Public delete access for assets bucket"
ON storage.objects FOR DELETE
USING (bucket_id = 'assets');
