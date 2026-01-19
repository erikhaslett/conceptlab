import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Video, FolderOpen, FileText, Settings } from "lucide-react";

const adminSections = [
  {
    title: "Assets",
    description: "Upload and manage video backgrounds and images",
    href: "/admin/assets",
    icon: Video,
    color: "bg-blue-500",
  },
  {
    title: "Projects",
    description: "Manage your v0 apps and portfolio projects",
    href: "/admin/projects",
    icon: FolderOpen,
    color: "bg-green-500",
  },
  {
    title: "Pages",
    description: "Create and edit site pages with video heroes",
    href: "/admin/pages",
    icon: FileText,
    color: "bg-orange-500",
  },
  {
    title: "Settings",
    description: "Site configuration and preferences",
    href: "/admin/settings",
    icon: Settings,
    color: "bg-gray-500",
  },
];

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container flex h-16 items-center">
          <div>
            <h1 className="text-lg font-semibold">Concept Lab Studios</h1>
            <p className="text-xs text-muted-foreground">Admin Dashboard</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold">Welcome back</h2>
          <p className="text-muted-foreground">
            Manage your site content, projects, and assets.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {adminSections.map((section) => (
            <Link key={section.href} href={section.href}>
              <Card className="h-full transition-all hover:border-primary hover:shadow-md">
                <CardHeader>
                  <div
                    className={`mb-3 flex h-12 w-12 items-center justify-center rounded-lg ${section.color} text-white`}
                  >
                    <section.icon className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-lg">{section.title}</CardTitle>
                  <CardDescription>{section.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="mt-12">
          <h3 className="mb-4 text-lg font-semibold">Quick Actions</h3>
          <div className="grid gap-4 sm:grid-cols-3">
            <Link href="/admin/assets">
              <Card className="cursor-pointer transition-all hover:border-primary hover:shadow-md">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                    <Video className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium">Upload Video</p>
                    <p className="text-sm text-muted-foreground">
                      Add a new background video
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Link href="/admin/projects">
              <Card className="cursor-pointer transition-all hover:border-primary hover:shadow-md">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-600">
                    <FolderOpen className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium">Add Project</p>
                    <p className="text-sm text-muted-foreground">
                      Register a new v0 app
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
            <Link href="/admin/pages">
              <Card className="cursor-pointer transition-all hover:border-primary hover:shadow-md">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 text-orange-600">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium">Create Page</p>
                    <p className="text-sm text-muted-foreground">
                      Build a new site page
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
