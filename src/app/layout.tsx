import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Mastery',
  description: 'One task per hobby. Every day.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
