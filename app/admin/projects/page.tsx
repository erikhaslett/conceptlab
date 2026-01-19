"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ProjectForm } from "@/components/admin/project-form";
import { ProjectsList } from "@/components/admin/projects-list";
import { Project } from "@/lib/types";
import { Plus, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { mutate } from "swr";

export default function AdminProjectsPage() {
  const [mode, setMode] = useState<"list" | "create" | "edit">("list");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const handleEdit = (project: Project) => {
    setSelectedProject(project);
    setMode("edit");
  };

  const handleSave = async (projectData: Partial<Project>) => {
    if (mode === "edit" && selectedProject) {
      await fetch(`/api/projects/${selectedProject.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(projectData),
      });
    } else {
      await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(projectData),
      });
    }

    mutate("/api/projects");
    setMode("list");
    setSelectedProject(null);
  };

  const handleCancel = () => {
    setMode("list");
    setSelectedProject(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/admin">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">Projects</h1>
          </div>
          {mode === "list" && (
            <Button onClick={() => setMode("create")}>
              <Plus className="h-4 w-4 mr-2" />
              Add Project
            </Button>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {mode === "list" ? (
          <ProjectsList onEdit={handleEdit} />
        ) : (
          <ProjectForm
            project={selectedProject}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        )}
      </main>
    </div>
  );
}
