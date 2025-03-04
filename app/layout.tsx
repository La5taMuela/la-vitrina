import type React from "react"
import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Aplicación de Arquitectura 3D",
  description: "Aplicación para arquitectos que permite crear y modificar edificios en 3D sobre OpenStreetMap",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}

