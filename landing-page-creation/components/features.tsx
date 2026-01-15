import { Zap, Shield, BarChart3 } from "lucide-react"

const features = [
  {
    name: "Lightning Fast",
    description: "Experience blazing fast performance with our optimized infrastructure and cutting-edge technology.",
    icon: Zap,
  },
  {
    name: "Secure by Default",
    description: "Your data is protected with enterprise-grade security measures and end-to-end encryption.",
    icon: Shield,
  },
  {
    name: "Powerful Analytics",
    description: "Gain insights with comprehensive analytics and reporting tools to drive informed decisions.",
    icon: BarChart3,
  },
]

export function Features() {
  return (
    <section id="features" className="px-6 py-24 sm:py-32 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Everything you need</h2>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            Powerful features designed to help you succeed
          </p>
        </div>
        <div className="mx-auto mt-16 grid max-w-5xl gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.name}
              className="relative rounded-2xl bg-card p-8 shadow-sm ring-1 ring-border transition-shadow hover:shadow-md"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                <feature.icon className="h-6 w-6 text-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">{feature.name}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
