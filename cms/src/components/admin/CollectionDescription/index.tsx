import type { CollectionSlug, ViewDescriptionServerProps } from 'payload'

import { CollectionInfoPanel } from './Info'
import { collectionInfo } from './meta'

/**
 * Description enrichie affichée au-dessus des vues Liste et Édition de chaque collection.
 * Les métadonnées sont centralisées dans `meta.ts` ; le compteur est récupéré côté serveur.
 */
export default async function CollectionDescription({
  collectionSlug,
  payload,
}: ViewDescriptionServerProps) {
  if (!collectionSlug) {
    return null
  }

  const slug = collectionSlug as CollectionSlug
  const info = collectionInfo[slug]

  if (!info) {
    return null
  }

  let totalDocs: number | undefined

  try {
    totalDocs = (await payload.count({ collection: slug })).totalDocs
  } catch {
    // La description reste affichée même si le comptage échoue (permissions, collections système…).
  }

  return <CollectionInfoPanel info={info} slug={slug} totalDocs={totalDocs} />
}
