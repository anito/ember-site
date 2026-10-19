/** Prefix a public/ asset path with the deployment base path (e.g. /cup-site on GitHub Pages). */
export const asset = (path) => (process.env.NEXT_PUBLIC_BASE_PATH || '') + path;
