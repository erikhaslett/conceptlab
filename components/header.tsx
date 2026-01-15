"use client"

import Link from "next/link"
import { useState } from "react"
import { Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 w-full bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
        <div className="flex lg:flex-1">
          <Link href="/" className="-m-1.5 p-1.5">
            <span className="text-xl font-semibold tracking-tight text-foreground">Concept Lab Studios</span>
          </Link>
        </div>

        <div className="flex lg:hidden">
          <button
            type="button"
            className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-foreground"
            onClick={() => setMobileMenuOpen(true)}
          >
            <span className="sr-only">Open main menu</span>
            <Menu className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>

        <div className="hidden lg:flex lg:gap-x-10">
          <Link
            href="#features"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Features
          </Link>
          <Link
            href="#about"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            About
          </Link>
          <Link
            href="#contact"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Contact
          </Link>
        </div>

        <div className="hidden lg:flex lg:flex-1 lg:justify-end">
          <Button className="rounded-full px-6">Get Started</Button>
        </div>
      </nav>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden">
          <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm" />
          <div className="fixed inset-y-0 right-0 z-50 w-full overflow-y-auto bg-background px-6 py-6 sm:max-w-sm sm:ring-1 sm:ring-border">
            <div className="flex items-center justify-between">
              <Link href="/" className="-m-1.5 p-1.5">
                <span className="text-xl font-semibold tracking-tight text-foreground">Concept Lab Studios</span>
              </Link>
              <button
                type="button"
                className="-m-2.5 rounded-md p-2.5 text-foreground"
                onClick={() => setMobileMenuOpen(false)}
              >
                <span className="sr-only">Close menu</span>
                <X className="h-6 w-6" aria-hidden="true" />
              </button>
            </div>
            <div className="mt-6 flow-root">
              <div className="-my-6 divide-y divide-border">
                <div className="space-y-2 py-6">
                  <Link
                    href="#features"
                    className="-mx-3 block rounded-lg px-3 py-2 text-base font-medium text-foreground hover:bg-accent"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Features
                  </Link>
                  <Link
                    href="#about"
                    className="-mx-3 block rounded-lg px-3 py-2 text-base font-medium text-foreground hover:bg-accent"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    About
                  </Link>
                  <Link
                    href="#contact"
                    className="-mx-3 block rounded-lg px-3 py-2 text-base font-medium text-foreground hover:bg-accent"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Contact
                  </Link>
                </div>
                <div className="py-6">
                  <Button className="w-full rounded-full">Get Started</Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
