import type { Metadata } from 'next'
import localFont from 'next/font/local'
import './globals.css'

const hubot = localFont({
  src: './../fonts/HubotSans-Italic.woff2',
  variable: '--font-hubot',
  weight: '200 900',
  style: 'italic',
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
    <html lang="en" className={`${hubot.variable} ${mona.variable}`}>
      <body>{children}</body>
    </html>
  )
}
