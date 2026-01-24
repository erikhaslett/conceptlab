import Link from "next/link"
import { Button } from "@/components/ui/button"
import RuleSuspensionCalendar from "@/components/rule-suspension-calendar"


export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-6 py-16">
        <div className="max-w-3xl">
          <p className="text-primary font-medium mb-3 tracking-wide uppercase text-sm">
            NYC Parking Rules
          </p>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight text-balance">
            Select a borough
          </h1>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed">
            View blockface-level alternate side parking rules. Zoom to 17+ in a borough map
            to load rules. Blue lines are visible before interaction.
          </p>
        </div>

        <section className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {/* Brooklyn (enabled) */}
          <div className="rounded-lg border border-border/60 bg-card/30 p-6">
            <h2 className="text-lg font-semibold mb-2">Brooklyn</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              Live + stable. Offline-first tiles. Hover + click enabled.
            </p>

            <div className="flex flex-wrap gap-3 items-center">
             <Button asChild>
              <Link href="/brooklyn">Open</Link>
             </Button>

             <RuleSuspensionCalendar />
            </div>


          </div>

          {/* Manhattan (disabled placeholder) */}
          <div className="rounded-lg border border-border/60 bg-card/20 p-6 opacity-70">
            <h2 className="text-lg font-semibold mb-2">Manhattan</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              Coming soon.
            </p>
            <Button disabled variant="outline" className="w-full">
              Not available yet
            </Button>
          </div>

          {/* Queens (disabled placeholder) */}
          <div className="rounded-lg border border-border/60 bg-card/20 p-6 opacity-70">
            <h2 className="text-lg font-semibold mb-2">Queens</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              Coming soon.
            </p>
            <Button disabled variant="outline" className="w-full">
              Not available yet
            </Button>
          </div>

          {/* Bronx (disabled placeholder) */}
          <div className="rounded-lg border border-border/60 bg-card/20 p-6 opacity-70">
            <h2 className="text-lg font-semibold mb-2">Bronx</h2>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              Coming soon.
            </p>
            <Button disabled variant="outline" className="w-full">
              Not available yet
            </Button>
          </div>
        </section>


        <section className="mt-10 max-w-3xl rounded-lg border border-border/60 bg-card/20 p-6">
          <h3 className="font-semibold mb-2">How it works</h3>
          <ul className="text-sm text-muted-foreground leading-relaxed space-y-1">
            <li>• Choose a borough.</li>
            <li>• Pan/zoom the map.</li>
            <li>• Zoom to 17+ to load parking rules.</li>
            <li>• Click a blue line to view the rule (or paywall, depending on entitlement).</li>
          </ul>
        </section>
      </main>
    </div>
  )
}
