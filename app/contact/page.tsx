"use client";

import React from "react"

import { useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Mail, Loader2, CheckCircle } from "lucide-react";

export default function ContactPage() {
  const [formState, setFormState] = useState<"idle" | "loading" | "success">(
    "idle"
  );
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormState("loading");

    // Simulate form submission
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setFormState("success");
    setFormData({ name: "", email: "", company: "", message: "" });
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />

      {/* Hero */}
      <section className="pt-32 pb-16 bg-background">
        <div className="container mx-auto px-6">
          <p className="text-primary font-medium mb-2 tracking-wide uppercase text-sm">
            Get in Touch
          </p>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Contact Us</h1>
          <p className="text-lg text-muted-foreground max-w-2xl">
            Have a project in mind? We'd love to hear about it. Fill out the
            form below and we'll get back to you as soon as possible.
          </p>
        </div>
      </section>

      {/* Contact Form */}
      <section className="pb-24 bg-background">
        <div className="container mx-auto px-6">
          <div className="grid gap-12 lg:grid-cols-2">
            {/* Form */}
            <Card className="bg-card/50 border-border/50">
              <CardContent className="p-6">
                {formState === "success" ? (
                  <div className="text-center py-12">
                    <CheckCircle className="h-12 w-12 text-primary mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2">
                      Message Sent!
                    </h3>
                    <p className="text-muted-foreground mb-6">
                      Thank you for reaching out. We'll get back to you soon.
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => setFormState("idle")}
                    >
                      Send Another Message
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="name">Name</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) =>
                            setFormData({ ...formData, name: e.target.value })
                          }
                          placeholder="Your name"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) =>
                            setFormData({ ...formData, email: e.target.value })
                          }
                          placeholder="you@example.com"
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="company">Company (optional)</Label>
                      <Input
                        id="company"
                        value={formData.company}
                        onChange={(e) =>
                          setFormData({ ...formData, company: e.target.value })
                        }
                        placeholder="Your company name"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="message">Message</Label>
                      <Textarea
                        id="message"
                        value={formData.message}
                        onChange={(e) =>
                          setFormData({ ...formData, message: e.target.value })
                        }
                        placeholder="Tell us about your project..."
                        rows={6}
                        required
                      />
                    </div>

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={formState === "loading"}
                    >
                      {formState === "loading" ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        "Send Message"
                      )}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>

            {/* Contact Info */}
            <div className="space-y-8">
              <div>
                <h2 className="text-2xl font-bold mb-4">Let's talk</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Whether you have a specific project in mind or just want to
                  explore possibilities, we're here to help. Reach out and let's
                  start a conversation.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Mail className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">Email</h3>
                    <a
                      href="mailto:hello@conceptlabstudios.com"
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      hello@conceptlabstudios.com
                    </a>
                  </div>
                </div>
              </div>

              <div className="bg-card/30 rounded-lg border border-border/50 p-6">
                <h3 className="font-semibold mb-3">What happens next?</h3>
                <ol className="space-y-3 text-sm text-muted-foreground">
                  <li className="flex gap-3">
                    <span className="text-primary font-medium">1.</span>
                    We review your message and get back within 24-48 hours.
                  </li>
                  <li className="flex gap-3">
                    <span className="text-primary font-medium">2.</span>
                    We schedule a call to discuss your project in detail.
                  </li>
                  <li className="flex gap-3">
                    <span className="text-primary font-medium">3.</span>
                    We provide a proposal tailored to your specific needs.
                  </li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
