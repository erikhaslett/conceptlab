import { Header } from "@/components/header"
import { Hero } from "@/components/hero"
import { Features } from "@/components/features"
import { Footer } from "@/components/footer"

export default function Home() {
  return (
    <div className="relative flex min-h-screen flex-col">
      <video 
        autoPlay 
        loop 
        muted 
        playsInline 
        preload="auto"
        className="fixed inset-0 h-full w-full object-cover -z-10"
      >
        <source src="/videos/conceptlab-intro.mp4" type="video/mp4" />
        Your browser does not support the video tag.
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
