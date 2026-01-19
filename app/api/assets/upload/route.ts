import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// Configure route to handle large files (up to 100MB)
export const config = {
  api: {
    bodyParser: false,
  },
};

export const maxDuration = 60; // Allow up to 60 seconds for upload

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Check file size (max 50MB for v0 preview compatibility)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File too large. Maximum size is 50MB. Your file is ${(file.size / (1024 * 1024)).toFixed(2)}MB` },
        { status: 413 }
      );
    }

    // Determine file type
    const mimeType = file.type;
    let fileType: "image" | "video" | "audio" | "document" | "other" = "other";
    if (mimeType.startsWith("image/")) fileType = "image";
    else if (mimeType.startsWith("video/")) fileType = "video";
    else if (mimeType.startsWith("audio/")) fileType = "audio";
    else if (
      mimeType.includes("pdf") ||
      mimeType.includes("document") ||
      mimeType.includes("text")
    )
      fileType = "document";

    // Generate unique filename
    const timestamp = Date.now();
    const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const storagePath = `${fileType}s/${timestamp}-${sanitizedFileName}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("assets")
      .upload(storagePath, file, {
        contentType: mimeType,
        upsert: false,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return NextResponse.json(
        { error: `Upload failed: ${uploadError.message}` },
        { status: 500 }
      );
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from("assets").getPublicUrl(storagePath);

    // Save asset metadata to database
    const { data: asset, error: dbError } = await supabase
      .from("assets")
      .insert({
        name: name || file.name.split(".")[0],
        file_name: file.name,
        file_type: fileType,
        file_size: file.size,
        storage_path: storagePath,
        url: publicUrl,
        mime_type: mimeType,
        description: description || null,
      })
      .select()
      .single();

    if (dbError) {
      console.error("Database error:", dbError);
      // Try to clean up uploaded file
      await supabase.storage.from("assets").remove([storagePath]);
      return NextResponse.json(
        { error: `Database error: ${dbError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ asset });
  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
