import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* Hero */}
      <section className="pt-32 pb-16 bg-background">
        <div className="container mx-auto px-6">
          <p className="text-primary font-medium mb-2 tracking-wide uppercase text-sm">
            About Us
          </p>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Concept Lab Studios
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            A creative technology studio dedicated to building innovative
            digital experiences.
          </p>
        </div>
      </section>

      {/* Story */}
      <section className="pb-24 bg-background">
        <div className="container mx-auto px-6">
          <div className="grid gap-12 lg:grid-cols-2">
            <div>
              <h2 className="text-2xl font-bold mb-6">Our Story</h2>
              <div className="space-y-4 text-muted-foreground leading-relaxed">
                <p>
                  Concept Lab Studios was founded with a simple mission: to
                  bridge the gap between innovative ideas and exceptional
                  digital experiences. We believe that great technology should
                  be accessible, intuitive, and beautiful.
                </p>
                <p>
                  We specialize in rapid prototyping and full-stack development,
                  using cutting-edge tools like v0, Next.js, and modern AI
                  capabilities to bring concepts to life faster than ever
                  before.
                </p>
                <p>
                  Our approach combines technical expertise with creative
                  thinking, ensuring that every project we undertake not only
                  works flawlessly but also delivers an outstanding user
                  experience.
                </p>
              </div>
            </div>

            <div className="bg-card/30 rounded-lg border border-border/50 p-8">
              <h3 className="text-xl font-bold mb-6">Our Values</h3>
              <div className="space-y-6">
                <div>
                  <h4 className="font-semibold mb-2">Innovation First</h4>
                  <p className="text-sm text-muted-foreground">
                    We embrace new technologies and approaches to deliver
                    forward-thinking solutions.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Quality Over Quantity</h4>
                  <p className="text-sm text-muted-foreground">
                    Every project receives our full attention and dedication to
                    excellence.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Collaboration</h4>
                  <p className="text-sm text-muted-foreground">
                    We work closely with our clients to understand their vision
                    and exceed expectations.
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Continuous Learning</h4>
                  <p className="text-sm text-muted-foreground">
                    We stay at the forefront of technology to deliver the best
                    possible solutions.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What We Do */}
      <section className="py-24 bg-card/30 border-y border-border/50">
        <div className="container mx-auto px-6">
          <h2 className="text-2xl font-bold mb-8">What We Do</h2>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="p-6 bg-background/50 rounded-lg border border-border/50">
              <h3 className="font-semibold text-lg mb-2">Rapid Prototyping</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Transform ideas into working prototypes quickly using v0 and
                AI-assisted development tools.
              </p>
            </div>
            <div className="p-6 bg-background/50 rounded-lg border border-border/50">
              <h3 className="font-semibold text-lg mb-2">
                Full-Stack Development
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Build complete web applications with modern frameworks,
                databases, and deployment solutions.
              </p>
            </div>
            <div className="p-6 bg-background/50 rounded-lg border border-border/50">
              <h3 className="font-semibold text-lg mb-2">
                Product Consultation
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Guide your product vision from concept to launch with expert
                technical advice.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Let's work together
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto mb-8">
            Have a project in mind? We'd love to hear about it and explore how
            we can help bring your vision to life.
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
