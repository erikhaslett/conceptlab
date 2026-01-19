"use client";

import { useState } from "react";
import { AssetUploadForm } from "@/components/admin/asset-upload-form";
import { AssetGrid } from "@/components/admin/asset-grid";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Plus, Video, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useSWRConfig } from "swr";

export default function AssetsPage() {
  const [uploadSheetOpen, setUploadSheetOpen] = useState(false);
  const { mutate } = useSWRConfig();

  const handleUploadComplete = () => {
    setUploadSheetOpen(false);
    mutate("/api/assets");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/admin"
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back to Admin</span>
            </Link>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Video className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-lg font-semibold">Asset Manager</h1>
                <p className="text-xs text-muted-foreground">
                  Upload and manage video backgrounds
                </p>
              </div>
            </div>
          </div>

          <Sheet open={uploadSheetOpen} onOpenChange={setUploadSheetOpen}>
            <SheetTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Upload Asset
              </Button>
            </SheetTrigger>
            <SheetContent className="sm:max-w-md">
              <SheetHeader>
                <SheetTitle>Upload New Asset</SheetTitle>
                <SheetDescription>
                  Upload videos and images to use as backgrounds in your pages.
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6">
                <AssetUploadForm onUploadComplete={handleUploadComplete} />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8">
        <Card>
          <CardHeader>
            <CardTitle>Your Assets</CardTitle>
            <CardDescription>
              Manage your uploaded videos and images. Click on any asset to
              preview it, or copy the URL to use in your pages.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AssetGrid />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
