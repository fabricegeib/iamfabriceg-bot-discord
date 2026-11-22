'use client'

import { Banner, Collapsible, CopyToClipboard, Link, Pill } from '@payloadcms/ui'
import type { ReactNode } from 'react'

import { accessLabels, type CollectionInfo } from './meta'

type Props = {
  info: CollectionInfo
  slug: string
  totalDocs?: number
}

/** Rend les `morceaux entre backticks` en balises <code> dans les métadonnées. */
function inlineCode(text: string): ReactNode[] {
  return text.split(/(`[^`]+`)/g).map((part, index) =>
    part.startsWith('`') && part.endsWith('`') ? (
      <code key={index}>{part.slice(1, -1)}</code>
    ) : (
      part
    ),
  )
}

function InfoLink({ href, label, external }: { href: string; label: string; external?: boolean }) {
  if (external) {
    return (
      <a className="collection-info__link" href={href} rel="noreferrer" target="_blank">
        {label} ↗
      </a>
    )
  }

  return (
    <Link className="collection-info__link" href={href}>
      {label}
    </Link>
  )
}

export function CollectionInfoPanel({ info, slug, totalDocs }: Props): ReactNode {
  const access = accessLabels[info.access]
  const count = totalDocs === undefined ? 'Compteur indisponible' : `${totalDocs} document${totalDocs > 1 ? 's' : ''}`
  const apiHref = `/api/${slug}?limit=10`

  return (
    <section className="collection-info" aria-label={`Informations sur la collection ${slug}`}>
      <Banner type="info">
        <strong>{info.role}</strong> — {inlineCode(info.summary)}
      </Banner>

      <div className="collection-info__pills">
        <Pill pillStyle={access.pill}>{access.label}</Pill>
        <Pill pillStyle="light">{count}</Pill>
        {info.notifiesBot ? <Pill pillStyle="success">Notifie le bot</Pill> : null}
      </div>

      <div className="collection-info__links">
        <InfoLink href={apiHref} label="Ouvrir l’API REST" />
        {info.links.map((link) => (
          <InfoLink key={link.href} {...link} />
        ))}
      </div>

      <Collapsible header="À savoir avant de modifier" initCollapsed>
        <div className="collection-info__body">
          <div>
            <h3>Notes</h3>
            <ul>
              {info.details.map((detail) => (
                <li key={detail}>{inlineCode(detail)}</li>
              ))}
            </ul>
          </div>

          <div>
            <h3>Champs clés</h3>
            <dl className="collection-info__fields">
              {info.keyFields.map((field) => (
                <div key={field.name}>
                  <dt><code>{field.name}</code></dt>
                  <dd>{inlineCode(field.detail)}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </Collapsible>

      {info.apiExample ? (
        <div className="collection-info__api">
          <span>Exemple</span>
          <code>{info.apiExample}</code>
          <CopyToClipboard defaultMessage="Copier" successMessage="Copié !" value={info.apiExample} />
        </div>
      ) : null}
    </section>
  )
}
