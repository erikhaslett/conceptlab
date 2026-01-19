"use client";

import { useState } from "react";
import useSWR from "swr";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Project } from "@/lib/types";
import {
  MoreVertical,
  Edit,
  Trash2,
  ExternalLink,
  Star,
  Eye,
  EyeOff,
  GripVertical,
} from "lucide-react";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

interface ProjectsListProps {
  onEdit: (project: Project) => void;
}

export function ProjectsList({ onEdit }: ProjectsListProps) {
  const { data: projects, error, mutate } = useSWR<Project[]>("/api/projects", fetcher);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!deleteId) return;

    await fetch(`/api/projects/${deleteId}`, { method: "DELETE" });
    mutate();
    setDeleteId(null);
  };

  const toggleStatus = async (project: Project) => {
    const newStatus = project.status === "published" ? "draft" : "published";
    await fetch(`/api/projects/${project.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    mutate();
  };

  const toggleFeatured = async (project: Project) => {
    await fetch(`/api/projects/${project.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_featured: !project.is_featured }),
    });
    mutate();
  };

  if (error) {
    return (
      <div className="text-center py-8 text-destructive">
        Failed to load projects
      </div>
    );
  }

  if (!projects) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="flex gap-4">
                <div className="w-32 h-20 bg-muted rounded" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 bg-muted rounded w-1/3" />
                  <div className="h-4 bg-muted rounded w-2/3" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-lg">No projects yet</p>
        <p className="text-sm">Create your first project to get started</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {projects.map((project) => (
          <Card key={project.id} className="group">
            <CardContent className="p-4">
              <div className="flex gap-4">
                <div className="flex items-center text-muted-foreground/50 cursor-grab">
                  <GripVertical className="h-5 w-5" />
                </div>

                {project.thumbnail_url ? (
                  <img
                    src={project.thumbnail_url || "/placeholder.svg"}
                    alt={project.name}
                    className="w-32 h-20 object-cover rounded"
                  />
                ) : (
                  <div className="w-32 h-20 bg-muted rounded flex items-center justify-center text-muted-foreground text-xs">
                    No thumbnail
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-medium flex items-center gap-2">
                        {project.name}
                        {project.is_featured && (
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        )}
                      </h3>
                      <p className="text-sm text-muted-foreground truncate">
                        {project.short_description || project.description}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          project.status === "published"
                            ? "default"
                            : project.status === "archived"
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {project.status}
                      </Badge>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onEdit(project)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          {project.app_url && (
                            <DropdownMenuItem asChild>
                              <a
                                href={project.app_url}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <ExternalLink className="h-4 w-4 mr-2" />
                                View Live
                              </a>
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => toggleStatus(project)}
                          >
                            {project.status === "published" ? (
                              <>
                                <EyeOff className="h-4 w-4 mr-2" />
                                Unpublish
                              </>
                            ) : (
                              <>
                                <Eye className="h-4 w-4 mr-2" />
                                Publish
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => toggleFeatured(project)}
                          >
                            <Star className="h-4 w-4 mr-2" />
                            {project.is_featured ? "Unfeature" : "Feature"}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setDeleteId(project.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    {project.category && <span>{project.category}</span>}
                    {project.display_mode && (
                      <span className="capitalize">{project.display_mode}</span>
                    )}
                    {project.technologies && project.technologies.length > 0 && (
                      <span>{project.technologies.slice(0, 3).join(", ")}</span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this project? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
