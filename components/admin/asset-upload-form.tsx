"use client";

import React from "react";
import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload, X, FileVideo, FileImage, File, Loader2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface AssetUploadFormProps {
  onUploadComplete?: () => void;
  acceptedTypes?: string;
}

export function AssetUploadForm({
  onUploadComplete,
  acceptedTypes = "video/*,image/*",
}: AssetUploadFormProps) {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      setError(null);

      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) {
        setFile(droppedFile);
        if (!name) {
          setName(droppedFile.name.split(".")[0]);
        }
      }
    },
    [name]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      if (!name) {
        setName(selectedFile.name.split(".")[0]);
      }
      setError(null);
    }
  };

  const getFileType = (mimeType: string): string => {
    if (mimeType.startsWith("video/")) return "video";
    if (mimeType.startsWith("image/")) return "image";
    if (mimeType.startsWith("audio/")) return "audio";
    return "other";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setUploadProgress(0);
    setError(null);

    try {
      const supabase = createClient();

      // Generate unique file path
      const fileExt = file.name.split(".").pop();
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 15);
      const fileType = getFileType(file.type);
      const storagePath = `${fileType}s/${timestamp}-${randomId}.${fileExt}`;

      setUploadProgress(20);

      // Upload directly to Supabase Storage from browser (bypasses serverless function limits)
      const { error: uploadError } = await supabase.storage
        .from("assets")
        .upload(storagePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`Storage upload failed: ${uploadError.message}`);
      }

      setUploadProgress(70);

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("assets")
        .getPublicUrl(storagePath);

      setUploadProgress(85);

      // Save metadata to database
      const { error: dbError } = await supabase.from("assets").insert({
        name: name || file.name.split(".")[0],
        file_name: file.name,
        file_type: fileType,
        file_size: file.size,
        storage_path: storagePath,
        url: publicUrl,
        mime_type: file.type,
        description: description || null,
        tags: [],
        metadata: {},
      });

      if (dbError) {
        // Clean up uploaded file if database insert fails
        await supabase.storage.from("assets").remove([storagePath]);
        throw new Error(`Database error: ${dbError.message}`);
      }

      setUploadProgress(100);

      // Reset form
      setFile(null);
      setName("");
      setDescription("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      onUploadComplete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const clearFile = () => {
    setFile(null);
    setName("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const getFileIcon = () => {
    if (!file) return <Upload className="h-10 w-10 text-muted-foreground" />;
    if (file.type.startsWith("video/"))
      return <FileVideo className="h-10 w-10 text-blue-500" />;
    if (file.type.startsWith("image/"))
      return <FileImage className="h-10 w-10 text-green-500" />;
    return <File className="h-10 w-10 text-muted-foreground" />;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Drop Zone */}
      <div
        className={`relative rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
          dragActive
            ? "border-primary bg-primary/5"
            : file
              ? "border-green-500 bg-green-500/5"
              : "border-muted-foreground/25 hover:border-muted-foreground/50"
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedTypes}
          onChange={handleFileChange}
          className="absolute inset-0 cursor-pointer opacity-0"
        />

        <div className="flex flex-col items-center gap-3">
          {getFileIcon()}

          {file ? (
            <div className="space-y-1">
              <p className="font-medium text-foreground">{file.name}</p>
              <p className="text-sm text-muted-foreground">
                {(file.size / (1024 * 1024)).toFixed(2)} MB
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  clearFile();
                }}
                className="mt-2"
              >
                <X className="mr-1 h-4 w-4" />
                Remove
              </Button>
            </div>
          ) : (
            <div className="space-y-1">
              <p className="font-medium text-foreground">
                Drop your file here, or click to browse
              </p>
              <p className="text-sm text-muted-foreground">
                Supports videos up to 100MB and images
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {uploading && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Uploading...</span>
            <span>{uploadProgress}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Form Fields */}
      <div className="grid gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Asset Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter a name for this asset"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description (optional)</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Add a description..."
            rows={3}
          />
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Button type="submit" disabled={!file || uploading} className="w-full">
        {uploading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Uploading...
          </>
        ) : (
          <>
            <Upload className="mr-2 h-4 w-4" />
            Upload Asset
          </>
        )}
      </Button>
    </form>
  );
}
