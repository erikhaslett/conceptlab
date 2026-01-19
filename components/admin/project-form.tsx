"use client";

import React from "react"

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Project, Asset } from "@/lib/types";
import { X, Plus, Loader2 } from "lucide-react";

interface ProjectFormProps {
  project?: Project | null;
  onSave: (project: Partial<Project>) => Promise<void>;
  onCancel: () => void;
}

const categories = [
  "Web Application",
  "Mobile App",
  "Dashboard",
  "E-commerce",
  "Landing Page",
  "Portfolio",
  "SaaS",
  "Other",
];

export function ProjectForm({ project, onSave, onCancel }: ProjectFormProps) {
  const [formData, setFormData] = useState<Partial<Project>>({
    name: "",
    slug: "",
    description: "",
    short_description: "",
    app_url: "",
    embed_url: "",
    display_mode: "embed",
    thumbnail_url: "",
    category: "",
    tags: [],
    technologies: [],
    status: "draft",
    is_featured: false,
    display_order: 0,
  });
  const [newTag, setNewTag] = useState("");
  const [newTech, setNewTech] = useState("");
  const [saving, setSaving] = useState(false);
  const [assets, setAssets] = useState<Asset[]>([]);

  useEffect(() => {
    if (project) {
      setFormData(project);
    }
  }, [project]);

  useEffect(() => {
    // Fetch available assets for thumbnail selection
    fetch("/api/assets?file_type=image")
      .then((res) => res.json())
      .then((data) => setAssets(data.assets || data || []))
      .catch(console.error);
  }, []);

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  };

  const handleNameChange = (name: string) => {
    setFormData((prev) => ({
      ...prev,
      name,
      slug: prev.slug || generateSlug(name),
    }));
  };

  const addTag = () => {
    if (newTag && !formData.tags?.includes(newTag)) {
      setFormData((prev) => ({
        ...prev,
        tags: [...(prev.tags || []), newTag],
      }));
      setNewTag("");
    }
  };

  const removeTag = (tag: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags?.filter((t) => t !== tag) || [],
    }));
  };

  const addTech = () => {
    if (newTech && !formData.technologies?.includes(newTech)) {
      setFormData((prev) => ({
        ...prev,
        technologies: [...(prev.technologies || []), newTech],
      }));
      setNewTech("");
    }
  };

  const removeTech = (tech: string) => {
    setFormData((prev) => ({
      ...prev,
      technologies: prev.technologies?.filter((t) => t !== tech) || [],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave(formData);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Project Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="My Awesome App"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">URL Slug</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, slug: e.target.value }))
                }
                placeholder="my-awesome-app"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="short_description">Short Description</Label>
            <Input
              id="short_description"
              value={formData.short_description || ""}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  short_description: e.target.value,
                }))
              }
              placeholder="A brief tagline for the project"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Full Description</Label>
            <Textarea
              id="description"
              value={formData.description || ""}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, description: e.target.value }))
              }
              placeholder="Detailed description of the project..."
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select
              value={formData.category || ""}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, category: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>App URLs</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="app_url">Live App URL</Label>
            <Input
              id="app_url"
              type="text"
              value={formData.app_url || ""}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, app_url: e.target.value }))
              }
              placeholder="https://myapp.vercel.app"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="display_mode">Display Mode</Label>
            <Select
              value={formData.display_mode || "direct"}
              onValueChange={(value: "direct" | "embed" | "link" | "both") =>
                setFormData((prev) => ({ ...prev, display_mode: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="direct">Direct (Internal Route)</SelectItem>
                <SelectItem value="embed">Embed (iframe)</SelectItem>
                <SelectItem value="link">External Link</SelectItem>
                <SelectItem value="both">Both</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Direct: App is hosted on this site (e.g. /brooklynparking). Embed: Show external app in iframe.
            </p>
          </div>

          {(formData.display_mode === "embed" || formData.display_mode === "both") && (
            <div className="space-y-2">
              <Label htmlFor="embed_url">Embed URL (for iframe)</Label>
              <Input
                id="embed_url"
                type="text"
                value={formData.embed_url || ""}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, embed_url: e.target.value }))
                }
                placeholder="https://myapp.vercel.app (or specific embed URL)"
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Thumbnail</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="thumbnail_url">Thumbnail URL</Label>
            <Input
              id="thumbnail_url"
              type="text"
              value={formData.thumbnail_url || ""}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  thumbnail_url: e.target.value,
                }))
              }
              placeholder="https://..."
            />
          </div>
          {assets.length > 0 && (
            <div className="space-y-2">
              <Label>Or select from uploaded images</Label>
              <div className="grid grid-cols-4 gap-2">
                {assets.slice(0, 8).map((asset) => (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        thumbnail_url: asset.url,
                      }))
                    }
                    className={`relative aspect-video rounded border-2 overflow-hidden transition-colors ${
                      formData.thumbnail_url === asset.url
                        ? "border-primary"
                        : "border-transparent hover:border-muted-foreground/50"
                    }`}
                  >
                    <img
                      src={asset.url || "/placeholder.svg"}
                      alt={asset.name}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}
          {formData.thumbnail_url && (
            <div className="mt-2">
              <Label>Preview</Label>
              <img
                src={formData.thumbnail_url || "/placeholder.svg"}
                alt="Thumbnail preview"
                className="mt-1 max-w-xs rounded border"
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tags & Technologies</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Tags</Label>
            <div className="flex gap-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="Add a tag"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag();
                  }
                }}
              />
              <Button type="button" variant="outline" onClick={addTag}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.tags?.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-secondary text-secondary-foreground rounded text-sm"
                >
                  {tag}
                  <button type="button" onClick={() => removeTag(tag)}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Technologies</Label>
            <div className="flex gap-2">
              <Input
                value={newTech}
                onChange={(e) => setNewTech(e.target.value)}
                placeholder="Add a technology"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTech();
                  }
                }}
              />
              <Button type="button" variant="outline" onClick={addTech}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {formData.technologies?.map((tech) => (
                <span
                  key={tech}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded text-sm"
                >
                  {tech}
                  <button type="button" onClick={() => removeTech(tech)}>
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Display Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={formData.status || "draft"}
              onValueChange={(value: "draft" | "published" | "archived") =>
                setFormData((prev) => ({ ...prev, status: value }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="display_order">Display Order</Label>
            <Input
              id="display_order"
              type="number"
              value={formData.display_order || 0}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  display_order: parseInt(e.target.value) || 0,
                }))
              }
            />
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="is_featured"
              checked={formData.is_featured || false}
              onCheckedChange={(checked) =>
                setFormData((prev) => ({ ...prev, is_featured: checked }))
              }
            />
            <Label htmlFor="is_featured">Featured Project</Label>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {project ? "Update Project" : "Create Project"}
        </Button>
      </div>
    </form>
  );
}
