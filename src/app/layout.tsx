import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Brainy Bird',
  description: 'A math-powered bird game that challenges your brain while you fly',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}