import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const fileType = searchParams.get("type") || searchParams.get("file_type");

    let query = supabase
      .from("assets")
      .select("*")
      .order("created_at", { ascending: false });

    if (fileType) {
      query = query.eq("file_type", fileType);
    }

    const { data: assets, error } = await query;

    if (error) {
      console.error("Fetch error:", error);
      return NextResponse.json(
        { error: `Failed to fetch assets: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ assets });
  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Asset ID required" },
        { status: 400 }
      );
    }

    // Get the asset to find storage path
    const { data: asset, error: fetchError } = await supabase
      .from("assets")
      .select("storage_path")
      .eq("id", id)
      .single();

    if (fetchError) {
      return NextResponse.json(
        { error: `Asset not found: ${fetchError.message}` },
        { status: 404 }
      );
    }

    // Delete from storage
    if (asset.storage_path) {
      await supabase.storage.from("assets").remove([asset.storage_path]);
    }

    // Delete from database
    const { error: deleteError } = await supabase
      .from("assets")
      .delete()
      .eq("id", id);

    if (deleteError) {
      return NextResponse.json(
        { error: `Delete failed: ${deleteError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Server error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
