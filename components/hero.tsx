import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

export function Hero() {
  return (
    <section className="relative overflow-hidden px-6 py-24 lg:px-8 sm:py-[440px]">
      <div className="mx-auto max-w-6xl text-center">
        <h1 className="whitespace-nowrap text-4xl font-semibold tracking-tight sm:text-6xl lg:text-8xl text-background text-center">
          Concept Lab Studios
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg leading-relaxed sm:text-xl text-background">
          Media and Digital Products built for the future
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          </div>
      </div>
    </section>
  )
}
