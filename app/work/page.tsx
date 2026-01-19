import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { Project } from "@/lib/types";

async function getProjects(): Promise<Project[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("projects")
    .select("*")
    .eq("is_published", true)
    .order("display_order", { ascending: true });

  return data || [];
}

export default async function WorkPage() {
  const projects = await getProjects();

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      <main className="pt-24 pb-16">
        <div className="container mx-auto px-6">
          {/* Page Header */}
          <div className="mb-16">
            <p className="text-primary font-medium mb-2 tracking-wide uppercase text-sm">
              Our Work
            </p>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Projects & Applications
            </h1>
            <p className="text-muted-foreground max-w-2xl text-lg">
              Explore our portfolio of web applications and digital experiences. 
              Click any project to launch the full application.
            </p>
          </div>

          {/* Horizontal Project Cards */}
          <div className="space-y-8">
            {projects.length === 0 ? (
              <div className="text-center py-16">
                <p className="text-muted-foreground">No projects published yet.</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Add projects from the <Link href="/admin/projects" className="text-primary hover:underline">admin panel</Link>.
                </p>
              </div>
            ) : (
              projects.map((project) => (
                <Link
                  key={project.id}
                  href={`/${project.slug}`}
                  className="group block"
                >
                  <div className="flex flex-col md:flex-row gap-6 p-6 bg-card/50 border border-border/50 rounded-xl hover:border-primary/50 hover:bg-card/80 transition-all duration-300">
                    {/* Project Image */}
                    <div className="relative w-full md:w-80 h-48 md:h-44 flex-shrink-0 rounded-lg overflow-hidden bg-muted">
                      {project.thumbnail_url ? (
                        <Image
                          src={project.thumbnail_url || "/placeholder.svg"}
                          alt={project.name}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground">
                          No Image
                        </div>
                      )}
                    </div>

                    {/* Project Info */}
                    <div className="flex-1 flex flex-col justify-center">
                      <h2 className="text-2xl font-bold mb-2 group-hover:text-primary transition-colors">
                        {project.name}
                      </h2>
                      <p className="text-muted-foreground mb-4 leading-relaxed">
                        {project.description}
                      </p>
                      <div className="flex items-center text-primary text-sm font-medium">
                        Launch App
                        <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
