import type { Metadata } from 'next'
import { Inter, Geist, Geist_Mono } from 'next/font/google'
import './globals.css'

const geist = Geist({ subsets: ['latin'], variable: '--font-geist' })
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' })
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'ECHO — Your Memory Layer',
  description: 'Identity. Memory. Future Self.',
  openGraph: {
    title: 'ECHO — Your Memory Layer',
    description: 'Identity. Memory. Future Self.',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable} ${inter.variable}`}>
      <body className="bg-[#0A0B0F] text-[#F0F0F5] antialiased">{children}</body>
    </html>
  )
}
