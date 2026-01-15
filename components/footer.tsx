import Link from "next/link"

export function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          <div className="flex items-center gap-2">
            <span className="text-lg font-semibold text-foreground">Concept Lab Studios</span>
          </div>
          <nav className="flex gap-6">
            <Link href="#" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              Privacy
            </Link>
            <Link href="#" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              Terms
            </Link>
            <Link href="#" className="text-sm text-muted-foreground transition-colors hover:text-foreground">
              Contact
            </Link>
          </nav>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Concept Lab Studios. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
