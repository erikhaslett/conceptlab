import React from "react"
import { Bebas_Neue, Inter } from "next/font/google"

const bebas = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-bebas",
})

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
})

export default function BrooklynParkingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="light">
      <body className={`${inter.variable} ${bebas.variable} font-sans`}>
        {children}
      </body>
    </html>
  )
}
