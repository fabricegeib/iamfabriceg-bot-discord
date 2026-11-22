import { apiDocs, type ApiDoc } from '@/utilities/apiDocs'

function inlineCode(value: string) {
  return value.split(/(`[^`]+`)/g).map((part, index) =>
    part.startsWith('`') && part.endsWith('`') ? (
      <code key={index}>{part.slice(1, -1)}</code>
    ) : (
      <span key={index}>{part}</span>
    ),
  )
}

/** Arborescence de l'API Payload, visible côté front et réutilisée dans les docs. */
export function ApiDocs() {
  const groups = [...new Set(apiDocs.map((doc) => doc.group))]

  return (
    <section id="api" aria-labelledby="api-title">
      <div className="section-heading">
        <h2 id="api-title">API Payload</h2>
        <span className="count">{apiDocs.length}</span>
      </div>
      <p className="section-intro">
        Le CMS est la source de vérité : le bot Discord et ce site lisent les mêmes collections via l’API REST.
        Les endpoints publics sont accessibles sans clé ; les écritures exigent une session admin ou une API-Key.
      </p>
      <div className="api-tree">
        {groups.map((group) => (
          <div className="api-group" key={group}>
            <h3>{group}</h3>
            <ul>
              {apiDocs.filter((doc: ApiDoc) => doc.group === group).map((doc) => (
                <li key={`${doc.method}-${doc.path}`}>
                  <span className={doc.method === 'GET' ? 'api-method get' : 'api-method post'}>{doc.method}</span>
                  <code>{doc.path}</code>
                  <span className="api-label">{doc.label}</span>
                  <span className={doc.public ? 'api-scope public' : 'api-scope private'}>
                    {doc.public ? 'public' : 'protégé'}
                  </span>
                  <p>{inlineCode(doc.description)}</p>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <p className="api-note">
        Documentation complète : <code>docs/CMS.md</code> ·{' '}
        <a href="https://payloadcms.com/docs/rest-api/overview" rel="noreferrer">
          Référence Payload REST →
        </a>
      </p>
    </section>
  )
}
