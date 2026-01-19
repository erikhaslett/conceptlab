import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";

const services = [
  {
    title: "Web Application Development",
    description:
      "Full-stack web applications built with modern frameworks and best practices.",
    features: [
      "Next.js & React development",
      "TypeScript integration",
      "Database design & integration",
      "API development",
      "Authentication & authorization",
      "Deployment & hosting",
    ],
  },
  {
    title: "Rapid Prototyping",
    description:
      "Quick iterations from concept to working prototype using AI-assisted development.",
    features: [
      "v0 AI-powered development",
      "Fast turnaround times",
      "Interactive prototypes",
      "User testing ready",
      "Design iteration support",
      "Technical feasibility validation",
    ],
  },
  {
    title: "UI/UX Design",
    description:
      "Beautiful, intuitive interfaces designed with user experience at the forefront.",
    features: [
      "User interface design",
      "User experience optimization",
      "Design system creation",
      "Responsive design",
      "Accessibility compliance",
      "Component libraries",
    ],
  },
  {
    title: "Technical Consultation",
    description:
      "Expert guidance on technology choices, architecture, and product strategy.",
    features: [
      "Technology stack recommendations",
      "Architecture planning",
      "Code review & optimization",
      "Performance analysis",
      "Security best practices",
      "Scalability planning",
    ],
  },
];

export default function ServicesPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* Hero */}
      <section className="pt-32 pb-16 bg-background">
        <div className="container mx-auto px-6">
          <p className="text-primary font-medium mb-2 tracking-wide uppercase text-sm">
            Our Services
          </p>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            What We Offer
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            From rapid prototyping to full-scale production applications, we
            provide comprehensive development services tailored to your needs.
          </p>
        </div>
      </section>

      {/* Services Grid */}
      <section className="pb-24 bg-background">
        <div className="container mx-auto px-6">
          <div className="grid gap-6 md:grid-cols-2">
            {services.map((service) => (
              <Card
                key={service.title}
                className="bg-card/50 border-border/50 hover:border-primary/30 transition-colors"
              >
                <CardHeader>
                  <CardTitle className="text-xl">{service.title}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {service.description}
                  </p>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {service.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-center gap-2 text-sm text-muted-foreground"
                      >
                        <Check className="h-4 w-4 text-primary flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Process */}
      <section className="py-24 bg-card/30 border-y border-border/50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-primary font-medium mb-2 tracking-wide uppercase text-sm">
              How We Work
            </p>
            <h2 className="text-3xl md:text-4xl font-bold">Our Process</h2>
          </div>

          <div className="grid gap-8 md:grid-cols-4">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-primary font-bold">1</span>
              </div>
              <h3 className="font-semibold mb-2">Discovery</h3>
              <p className="text-sm text-muted-foreground">
                Understanding your goals, requirements, and vision.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-primary font-bold">2</span>
              </div>
              <h3 className="font-semibold mb-2">Design</h3>
              <p className="text-sm text-muted-foreground">
                Creating wireframes, prototypes, and visual designs.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-primary font-bold">3</span>
              </div>
              <h3 className="font-semibold mb-2">Development</h3>
              <p className="text-sm text-muted-foreground">
                Building your application with clean, maintainable code.
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-primary font-bold">4</span>
              </div>
              <h3 className="font-semibold mb-2">Launch</h3>
              <p className="text-sm text-muted-foreground">
                Deploying and supporting your project post-launch.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-background">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to get started?
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto mb-8">
            Let's discuss your project and find the perfect solution for your
            needs.
          </p>
          <Button size="lg" asChild>
            <Link href="/contact">
              Contact Us
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
