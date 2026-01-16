import Link from "next/link"

export function Footer() {
  return (
    <footer className="border-t bg-transparent border-transparent">
      <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          <div className="flex items-center gap-2">
            
          </div>
          <nav className="flex gap-6">
            
            
            
          </nav>
          <p className="text-sm text-background">
            © {new Date().getFullYear()} Concept Lab Studios. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
