import { createClient } from "@/lib/supabase/server";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { VideoHero } from "@/components/video-hero";
import { ProjectCard } from "@/components/project-card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Project, Asset } from "@/lib/types";

async function getFeaturedProjects(): Promise<Project[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("projects")
    .select("*")
    .eq("is_published", true)
    .eq("is_featured", true)
    .order("display_order", { ascending: true })
    .limit(6);

  return data || [];
}

async function getHeroVideo(): Promise<Asset | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("assets")
    .select("*")
    .eq("file_type", "video")
    .eq("is_hero_background", true)
    .limit(1);

  return data?.[0] || null;
}

export default async function HomePage() {
  const [featuredProjects, heroVideo] = await Promise.all([
    getFeaturedProjects(),
    getHeroVideo(),
  ]);

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* Hero Section */}
      <VideoHero
        videoUrl={heroVideo?.url}
        overlayOpacity={0.5}
      >
        <div className="container mx-auto px-6 text-center">
          <p className="text-primary font-medium mb-4 tracking-wide uppercase text-sm">
            Creative Technology Studio
          </p>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight text-balance">
            We Build Digital
            <br />
            Experiences
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed text-pretty">
            From concept to deployment, we create innovative web applications
            and digital products that push the boundaries of what's possible.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild>
              <Link href="/work">
                View Our Work
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/contact">Get in Touch</Link>
            </Button>
          </div>
        </div>
      </VideoHero>

      {/* Featured Projects Section */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-6">
          <div className="flex items-end justify-between mb-12">
            <div>
              <p className="text-primary font-medium mb-2 tracking-wide uppercase text-sm">
                Selected Work
              </p>
              <h2 className="text-3xl md:text-4xl font-bold">
                Featured Projects
              </h2>
            </div>
            <Link
              href="/projects"
              className="hidden md:flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              View all projects
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {featuredProjects.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {featuredProjects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-card/30 rounded-lg border border-border/50">
              <p className="text-muted-foreground mb-4">
                No projects featured yet
              </p>
              <Button variant="outline" asChild>
                <Link href="/admin/projects">Add Your First Project</Link>
              </Button>
            </div>
          )}

          <div className="mt-8 text-center md:hidden">
            <Button variant="outline" asChild>
              <Link href="/projects">
                View all projects
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Services Preview */}
      <section className="py-24 bg-card/30 border-y border-border/50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-primary font-medium mb-2 tracking-wide uppercase text-sm">
              What We Do
            </p>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Our Services</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              We specialize in building modern web applications and digital
              experiences using cutting-edge technology.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <div className="p-6 bg-background/50 rounded-lg border border-border/50">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <div className="w-6 h-6 bg-primary rounded" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Web Applications</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Full-stack web applications built with modern frameworks like
                Next.js, React, and TypeScript.
              </p>
            </div>

            <div className="p-6 bg-background/50 rounded-lg border border-border/50">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <div className="w-6 h-6 bg-primary rounded-full" />
              </div>
              <h3 className="font-semibold text-lg mb-2">UI/UX Design</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Beautiful, intuitive interfaces designed with user experience at
                the forefront.
              </p>
            </div>

            <div className="p-6 bg-background/50 rounded-lg border border-border/50">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <div className="w-6 h-1.5 bg-primary rounded-full" />
              </div>
              <h3 className="font-semibold text-lg mb-2">Rapid Prototyping</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Quick iterations from concept to working prototype using v0 and
                AI-assisted development.
              </p>
            </div>
          </div>

          <div className="text-center mt-12">
            <Button variant="outline" asChild>
              <Link href="/services">
                Learn More About Our Services
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to start your project?
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto mb-8">
            Let's discuss how we can help bring your ideas to life with modern
            technology and innovative design.
          </p>
          <Button size="lg" asChild>
            <Link href="/contact">
              Get in Touch
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
