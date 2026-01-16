import { Header } from "@/components/header"
import { Hero } from "@/components/hero"
import { Features } from "@/components/features"
import { Footer } from "@/components/footer"

export default function Home() {
  return (
    <div className="relative flex min-h-screen flex-col">
      <video autoPlay loop muted playsInline className="fixed inset-0 h-full w-full object-cover -z-10">
        <source src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/erikhas_create_a_clean_looking_background_for_a_tech_website._f8865df7-9a0a-4ddc-80ca-950ca47cc802_1-WtruHRK2JWjUMbWLPsRTICWgXYnKoz.mp4" type="video/mp4" />
      </video>

      <Header />
      <main className="flex-1">
        <Hero />
        <Features />
      </main>
      <Footer />
    </div>
  )
}
