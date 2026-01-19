import { Suspense } from "react"
import { Metadata } from "next"
import { Loader2 } from "lucide-react"
import ASPMapClient from "@/components/brooklyn-parking/asp-map-client"

export const metadata: Metadata = {
  title: "Brooklyn Parking Map | Concept Lab Studios",
  description: "Interactive map for finding parking in Brooklyn with real-time availability and street cleaning schedules.",
};

function LoadingFallback() {
  return (
    <div className="h-screen w-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading Brooklyn ASP Map...</p>
      </div>
    </div>
  )
}

export default function BrooklynParkingPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <ASPMapClient />
    </Suspense>
  )
}
