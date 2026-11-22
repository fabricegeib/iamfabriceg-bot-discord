import type { Access } from 'payload'

/** Admin uniquement. */
export const isAdmin: Access = ({ req: { user } }) => user?.role === 'admin'

/** Admin ou éditeur (les bots utilisent un compte admin dédié). */
export const isAdminOrEditor: Access = ({ req: { user } }) =>
  user?.role === 'admin' || user?.role === 'editor'

/** Lecture publique (front et API en lecture seule). */
export const publicRead: Access = () => true

/** Un user peut se lire lui-même ; un admin lit tout. */
export const isAdminOrSelf: Access = ({ req: { user }, id }) =>
  user?.role === 'admin' || (Boolean(user) && String(user?.id) === String(id))
