"use client";

import { Project } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";
import Link from "next/link";

interface ProjectCardProps {
  project: Project;
}

export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <Link href={`/projects/${project.slug}`}>
      <Card className="group overflow-hidden bg-card/50 border-border/50 hover:border-primary/50 transition-all duration-300 h-full">
        <div className="relative aspect-video overflow-hidden">
          {project.thumbnail_url ? (
            <img
              src={project.thumbnail_url || "/placeholder.svg"}
              alt={project.name}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <span className="text-muted-foreground text-sm">No preview</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="bg-primary text-primary-foreground p-2 rounded-full">
              <ExternalLink className="h-4 w-4" />
            </div>
          </div>
        </div>
        <CardContent className="p-5">
          <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors">
            {project.name}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
            {project.short_description || project.description}
          </p>
          <div className="flex flex-wrap gap-2">
            {project.technologies?.slice(0, 3).map((tech) => (
              <Badge
                key={tech}
                variant="secondary"
                className="text-xs font-normal"
              >
                {tech}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
