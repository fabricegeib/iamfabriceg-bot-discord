import type { Metadata, Viewport } from 'next'
import { Rubik } from 'next/font/google'
import type { ReactNode } from 'react'

import '../globals.css'

const rubik = Rubik({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-rubik',
})

export const metadata: Metadata = {
  title: 'iamfabriceg Bot',
  description: 'Catalogue public des jeux, commandes et actualités du bot Discord.',
}

// Edge-to-edge recommandé par Apple : le fond couvre aussi les zones sûres,
// seul le contenu reste à l'écart de la barre d'état et de l'indicateur home.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#282a36',
}

/** Root layout du front public. Le groupe `(payload)` fournit le sien pour /admin et /api. */
export default function FrontendLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr" className={rubik.variable}>
      <body>{children}</body>
    </html>
  )
}
