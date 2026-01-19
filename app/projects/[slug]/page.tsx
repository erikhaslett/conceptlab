import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Project } from "@/lib/types";

async function getProject(slug: string): Promise<Project | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("projects")
    .select("*")
    .eq("slug", slug)
    .eq("status", "published")
    .single();

  return data;
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = await getProject(slug);

  if (!project) {
    notFound();
  }

  const showEmbed =
    project.display_mode === "embed" || project.display_mode === "both";
  const showLink =
    project.display_mode === "link" || project.display_mode === "both";

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* Hero */}
      <section className="pt-32 pb-16 bg-background">
        <div className="container mx-auto px-6">
          <Link
            href="/projects"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Projects
          </Link>

          <div className="grid gap-8 lg:grid-cols-2 lg:gap-12 items-start">
            <div>
              {project.category && (
                <Badge variant="secondary" className="mb-4">
                  {project.category}
                </Badge>
              )}
              <h1 className="text-4xl md:text-5xl font-bold mb-4">
                {project.name}
              </h1>
              {project.short_description && (
                <p className="text-xl text-muted-foreground mb-6">
                  {project.short_description}
                </p>
              )}

              {project.description && (
                <p className="text-muted-foreground leading-relaxed mb-8">
                  {project.description}
                </p>
              )}

              {project.technologies && project.technologies.length > 0 && (
                <div className="mb-8">
                  <h3 className="text-sm font-medium mb-3 text-muted-foreground uppercase tracking-wider">
                    Technologies
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {project.technologies.map((tech) => (
                      <Badge key={tech} variant="outline">
                        {tech}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {showLink && project.app_url && (
                <Button asChild>
                  <a
                    href={project.app_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    View Live Project
                  </a>
                </Button>
              )}
            </div>

            {project.thumbnail_url && (
              <div className="relative aspect-video rounded-lg overflow-hidden border border-border/50">
                <img
                  src={project.thumbnail_url || "/placeholder.svg"}
                  alt={project.name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Embedded App */}
      {showEmbed && (project.embed_url || project.app_url) && (
        <section className="pb-24 bg-background">
          <div className="container mx-auto px-6">
            <h2 className="text-2xl font-bold mb-6">Live Preview</h2>
            <div className="relative rounded-lg overflow-hidden border border-border/50 bg-card">
              <div className="bg-secondary/50 px-4 py-2 flex items-center gap-2 border-b border-border/50">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-destructive/50" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                  <div className="w-3 h-3 rounded-full bg-green-500/50" />
                </div>
                <div className="flex-1 text-center">
                  <span className="text-xs text-muted-foreground">
                    {project.embed_url || project.app_url}
                  </span>
                </div>
              </div>
              <iframe
                src={project.embed_url || project.app_url || ""}
                title={project.name}
                className="w-full h-[600px] md:h-[800px]"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              />
            </div>
          </div>
        </section>
      )}

      <SiteFooter />
    </div>
  );
}
