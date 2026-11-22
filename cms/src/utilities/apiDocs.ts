export type ApiDoc = {
  method: 'GET' | 'POST'
  path: string
  label: string
  description: string
  /** Addressed from the browser without credentials. */
  public: boolean
  group: 'Lecture publique' | 'Bot ↔ CMS' | 'Administration'
}

/** Documentation de l'API exposée par le CMS, partagée entre le front et la recherche. */
export const apiDocs: ApiDoc[] = [
  {
    method: 'GET',
    path: '/api/games',
    label: 'Catalogue des jeux',
    description: 'Jeux publiés, avec filtres `where`, `sort`, `limit` et `depth`.',
    public: true,
    group: 'Lecture publique',
  },
  {
    method: 'GET',
    path: '/api/commands',
    label: 'Commandes slash',
    description: 'Commandes activées, options, exemples et compteurs d’utilisation.',
    public: true,
    group: 'Lecture publique',
  },
  {
    method: 'GET',
    path: '/api/news',
    label: 'Actualités',
    description: 'Articles publiés, triés par date de publication.',
    public: true,
    group: 'Lecture publique',
  },
  {
    method: 'GET',
    path: '/api/botSettings',
    label: 'Réglages publics du bot',
    description: 'Nom, version, description, lien d’invitation et réseaux sociaux.',
    public: true,
    group: 'Lecture publique',
  },
  {
    method: 'GET',
    path: '/api/bot/summary',
    label: 'Résumé complet',
    description: 'Jeux, commandes et réglages en une seule requête, au format bot.',
    public: true,
    group: 'Lecture publique',
  },
  {
    method: 'GET',
    path: '/api/bot/healthz',
    label: 'Santé du CMS',
    description: 'Vérifie la disponibilité de MongoDB et du service Payload.',
    public: true,
    group: 'Lecture publique',
  },
  {
    method: 'POST',
    path: '/api/bot/usage',
    label: 'Enregistrer une interaction',
    description: 'Clé API (`Authorization: users API-Key …`) requise : met à jour usages, profils et compteurs.',
    public: false,
    group: 'Bot ↔ CMS',
  },
  {
    method: 'GET',
    path: '/api/bot/stats',
    label: 'Statistiques agrégées',
    description: 'Interactions, fidélité, classements et activité (API-Key requise).',
    public: false,
    group: 'Bot ↔ CMS',
  },
  {
    method: 'POST',
    path: '/api/bot/profile',
    label: 'Créer / mettre à jour un profil',
    description: 'Upsert d’un profil Discord (API-Key requise).',
    public: false,
    group: 'Bot ↔ CMS',
  },
  {
    method: 'POST',
    path: '/api/bot/admin/action',
    label: 'Actions d’administration',
    description: 'Déploie les commandes ou synchronise le catalogue (session admin).',
    public: false,
    group: 'Administration',
  },
]
