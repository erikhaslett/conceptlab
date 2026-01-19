"use client";

import { useState } from "react";
import useSWR from "swr";
import type { Asset } from "@/lib/types";
import { formatFileSize } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileVideo,
  FileImage,
  File,
  Trash2,
  Copy,
  Play,
  ExternalLink,
  Loader2,
  Star,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface AssetGridProps {
  onSelect?: (asset: Asset) => void;
  selectable?: boolean;
}

export function AssetGrid({ onSelect, selectable = false }: AssetGridProps) {
  const [filter, setFilter] = useState<string>("all");
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const {
    data,
    error,
    isLoading,
    mutate,
  } = useSWR<{ assets: Asset[] }>(
    filter === "all" ? "/api/assets" : `/api/assets?type=${filter}`,
    fetcher
  );

  const setAsHero = async (asset: Asset) => {
    try {
      const supabase = createClient();
      // First, unset all other hero backgrounds
      await supabase
        .from("assets")
        .update({ is_hero_background: false })
        .eq("is_hero_background", true);
      // Then set this one as hero
      await supabase
        .from("assets")
        .update({ is_hero_background: true })
        .eq("id", asset.id);
      mutate();
    } catch (err) {
      console.error("Set hero error:", err);
    }
  };

  const handleDelete = async (asset: Asset) => {
    if (!confirm(`Are you sure you want to delete "${asset.name}"?`)) return;

    setDeleting(asset.id);
    try {
      const response = await fetch(`/api/assets?id=${asset.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        mutate();
        if (selectedAsset?.id === asset.id) {
          setSelectedAsset(null);
        }
      }
    } catch (err) {
      console.error("Delete error:", err);
    } finally {
      setDeleting(null);
    }
  };

  const copyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
  };

  const getAssetIcon = (type: Asset["file_type"]) => {
    switch (type) {
      case "video":
        return <FileVideo className="h-8 w-8 text-blue-500" />;
      case "image":
        return <FileImage className="h-8 w-8 text-green-500" />;
      default:
        return <File className="h-8 w-8 text-muted-foreground" />;
    }
  };

  const renderThumbnail = (asset: Asset) => {
    if (asset.file_type === "image") {
      return (
        <img
          src={asset.url || "/placeholder.svg"}
          alt={asset.name}
          className="h-full w-full object-cover"
        />
      );
    }
    if (asset.file_type === "video") {
      return (
        <div className="relative flex h-full w-full items-center justify-center bg-muted">
          <video
            src={asset.url}
            className="h-full w-full object-cover"
            muted
            preload="metadata"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <Play className="h-8 w-8 text-white" />
          </div>
        </div>
      );
    }
    return (
      <div className="flex h-full w-full items-center justify-center bg-muted">
        {getAssetIcon(asset.file_type)}
      </div>
    );
  };

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center text-destructive">
        Failed to load assets. Please try again.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter Tabs */}
      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="video">Videos</TabsTrigger>
          <TabsTrigger value="image">Images</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Asset Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : data?.assets?.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center">
          <p className="text-muted-foreground">No assets found</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload your first asset to get started
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {data?.assets?.map((asset) => (
            <Card
              key={asset.id}
              className={`group overflow-hidden transition-all ${
                selectable
                  ? "cursor-pointer hover:ring-2 hover:ring-primary"
                  : ""
              }`}
              onClick={() => {
                if (selectable) {
                  onSelect?.(asset);
                } else {
                  setSelectedAsset(asset);
                }
              }}
            >
              {/* Thumbnail */}
              <div className="relative aspect-video overflow-hidden bg-muted">
                {renderThumbnail(asset)}
              </div>

              {/* Info */}
              <CardContent className="p-3">
                <h3 className="truncate font-medium text-foreground">
                  {asset.name}
                </h3>
                <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                  <span className="capitalize">{asset.file_type}</span>
                  <span>{formatFileSize(asset.file_size)}</span>
                </div>

                {/* Actions */}
                {!selectable && (
                  <div className="mt-3 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 bg-transparent"
                      onClick={(e) => {
                        e.stopPropagation();
                        copyUrl(asset.url);
                      }}
                    >
                      <Copy className="mr-1 h-3 w-3" />
                      Copy URL
                    </Button>
                    {asset.file_type === "video" && (
                      <Button
                        variant={asset.is_hero_background ? "default" : "outline"}
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setAsHero(asset);
                        }}
                        title="Set as homepage background"
                      >
                        <Star className={`h-3 w-3 ${asset.is_hero_background ? "fill-current" : ""}`} />
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(asset);
                      }}
                      disabled={deleting === asset.id}
                    >
                      {deleting === asset.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Trash2 className="h-3 w-3 text-destructive" />
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Preview Dialog */}
      <Dialog
        open={!!selectedAsset}
        onOpenChange={() => setSelectedAsset(null)}
      >
        <DialogContent className="max-w-3xl">
          {selectedAsset && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedAsset.name}</DialogTitle>
                <DialogDescription>
                  {selectedAsset.description || "No description"}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Preview */}
                <div className="overflow-hidden rounded-lg bg-muted">
                  {selectedAsset.file_type === "video" ? (
                    <video
                      src={selectedAsset.url}
                      controls
                      className="w-full"
                      autoPlay
                      muted
                    />
                  ) : selectedAsset.file_type === "image" ? (
                    <img
                      src={selectedAsset.url || "/placeholder.svg"}
                      alt={selectedAsset.name}
                      className="w-full"
                    />
                  ) : (
                    <div className="flex items-center justify-center py-12">
                      {getAssetIcon(selectedAsset.file_type)}
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="grid gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">File name</span>
                    <span>{selectedAsset.file_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Size</span>
                    <span>{formatFileSize(selectedAsset.file_size)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Type</span>
                    <span>{selectedAsset.mime_type}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 bg-transparent"
                    onClick={() => copyUrl(selectedAsset.url)}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copy URL
                  </Button>
                  <Button variant="outline" asChild>
                    <a
                      href={selectedAsset.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Open
                    </a>
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
