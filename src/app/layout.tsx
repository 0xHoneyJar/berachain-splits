import localFont from 'next/font/local'
import React from 'react'

import App from '~/app/app'

import type { Metadata } from 'next'
import '~/app/globals.css'

// Configure local ClashDisplay font
const clashDisplay = localFont({
  src: '../../public/fonts/ClashDisplay.ttf',
  display: 'swap',
  variable: '--font-clash-display',
})

const TITLE = 'Berachain Splits Lite'
const DESCRIPTION = 'A minimal app for creating and distributing Splits on Berachain'

const OG_IMAGE_SIZE = {
  width: 1200,
  height: 630,
}

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    siteName: 'splits.0xhoneyjar.xyz',
    type: 'website',
    images: [
      {
        url: '/cover_social.png',
        ...OG_IMAGE_SIZE,
        alt: TITLE,
      },
    ],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={clashDisplay.variable}>
      <body>
        <App>{children}</App>
      </body>
    </html>
  )
}
