import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import '../globals.css'

export const metadata: Metadata = {
  title: 'iamfabriceg Bot',
  description: 'Catalogue public des jeux, commandes et actualités du bot Discord.',
}

/** Root layout du front public. Le groupe `(payload)` fournit le sien pour /admin et /api. */
export default function FrontendLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  )
}
