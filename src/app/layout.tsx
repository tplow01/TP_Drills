import type { Metadata } from 'next'
import localFont from 'next/font/local'
import { Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'
import { AppNav } from '@/components/nav/AppNav'

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['700'],
  variable: '--font-jakarta',
  display: 'swap',
})

const mona = localFont({
  src: './../fonts/MonaSans.woff2',
  variable: '--font-mona',
  weight: '200 900',
  style: 'normal',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'TP Drills',
  description: 'Coaching hub',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${jakarta.variable} ${mona.variable}`}>
      <body>
        <div className="app-shell">{children}</div>
        <AppNav />
      </body>
    </html>
  )
}
