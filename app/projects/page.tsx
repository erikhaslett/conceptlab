import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ProjectCard } from "@/components/project-card";
import { Project } from "@/lib/types";

async function getProjects(): Promise<Project[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("projects")
    .select("*")
    .eq("status", "published")
    .order("display_order", { ascending: true })
    .order("created_at", { ascending: false });

  return data || [];
}

async function getCategories(): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("projects")
    .select("category")
    .eq("status", "published")
    .not("category", "is", null);

  const categories = [...new Set(data?.map((p) => p.category).filter(Boolean))];
  return categories as string[];
}

export default async function ProjectsPage() {
  const [projects, categories] = await Promise.all([
    getProjects(),
    getCategories(),
  ]);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* Hero */}
      <section className="pt-32 pb-16 bg-background">
        <div className="container mx-auto px-6">
          <p className="text-primary font-medium mb-2 tracking-wide uppercase text-sm">
            Our Portfolio
          </p>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Selected Work</h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Explore our collection of web applications, dashboards, and digital
            experiences built with modern technology.
          </p>
        </div>
      </section>

      {/* Projects Grid */}
      <section className="pb-24 bg-background">
        <div className="container mx-auto px-6">
          {categories.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-8">
              <span className="px-4 py-2 bg-primary text-primary-foreground rounded-full text-sm font-medium">
                All
              </span>
              {categories.map((category) => (
                <span
                  key={category}
                  className="px-4 py-2 bg-secondary text-secondary-foreground rounded-full text-sm font-medium hover:bg-secondary/80 cursor-pointer transition-colors"
                >
                  {category}
                </span>
              ))}
            </div>
          )}

          {projects.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-card/30 rounded-lg border border-border/50">
              <p className="text-muted-foreground mb-4">No projects yet</p>
              <p className="text-sm text-muted-foreground">
                Projects will appear here once published.
              </p>
            </div>
          )}
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
