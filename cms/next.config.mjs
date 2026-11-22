import { withPayload } from '@payloadcms/next/withPayload'
import path from 'path'
import { fileURLToPath } from 'url'

const dirname = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Image de production minimale : Next trace les seules dépendances utilisées
  // et génère un serveur autonome au lieu de copier tout node_modules.
  output: 'standalone',
  reactStrictMode: true,
  devIndicators: false,
  turbopack: {
    // Le lockfile pnpm se trouve à la racine du workspace (un niveau au-dessus).
    root: path.resolve(dirname, '..'),
  },
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }

    return webpackConfig
  },
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
