"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export async function uploadAssetToStorage(formData: FormData) {
  const file = formData.get("file") as File;
  const name = formData.get("name") as string;
  const description = formData.get("description") as string;
  const tagsString = formData.get("tags") as string;

  if (!file) {
    return { error: "No file provided" };
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return { error: "Missing Supabase configuration" };
  }

  // Parse tags
  const tags = tagsString
    ? tagsString.split(",").map((t) => t.trim()).filter(Boolean)
    : [];

  // Determine file type category
  const mimeType = file.type;
  let fileType = "other";
  if (mimeType.startsWith("image/")) fileType = "image";
  else if (mimeType.startsWith("video/")) fileType = "video";
  else if (mimeType.startsWith("audio/")) fileType = "audio";
  else if (
    mimeType.includes("pdf") ||
    mimeType.includes("document") ||
    mimeType.includes("text")
  )
    fileType = "document";

  // Create unique filename
  const timestamp = Date.now();
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
  const storagePath = `${fileType}s/${timestamp}-${sanitizedName}`;

  // Convert File to ArrayBuffer for upload
  const arrayBuffer = await file.arrayBuffer();

  // Upload directly to Supabase Storage REST API (bypassing the SDK)
  const uploadUrl = `${supabaseUrl}/storage/v1/object/assets/${storagePath}`;
  
  console.log("[v0] Upload URL:", uploadUrl);
  console.log("[v0] File size:", arrayBuffer.byteLength);
  console.log("[v0] Using service role key:", !!process.env.SUPABASE_SERVICE_ROLE_KEY);
  
  const uploadResponse = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${supabaseKey}`,
      "Content-Type": mimeType,
      "x-upsert": "false",
    },
    body: arrayBuffer,
  });

  console.log("[v0] Upload response status:", uploadResponse.status);
  const responseText = await uploadResponse.text();
  console.log("[v0] Upload response body:", responseText);

  if (!uploadResponse.ok) {
    console.error("Storage upload error:", responseText);
    return { error: `Storage upload failed: ${responseText}` };
  }

  // Construct public URL
  const publicUrl = `${supabaseUrl}/storage/v1/object/public/assets/${storagePath}`;

  // Save metadata to database using the admin client (database operations work fine)
  const supabase = createAdminClient();
  
  const { data: asset, error: dbError } = await supabase
    .from("assets")
    .insert({
      name: name || file.name,
      file_name: file.name,
      file_type: fileType,
      file_size: file.size,
      storage_path: storagePath,
      url: publicUrl,
      mime_type: mimeType,
      description: description || null,
      tags: tags,
      metadata: {},
    })
    .select()
    .single();

  if (dbError) {
    console.error("Database insert error:", dbError);
    // Try to clean up the uploaded file via REST API
    await fetch(`${supabaseUrl}/storage/v1/object/assets/${storagePath}`, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${supabaseKey}`,
      },
    });
    return { error: `Database error: ${dbError.message}` };
  }

  return { success: true, asset };
}
