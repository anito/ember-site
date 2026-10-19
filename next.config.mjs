/** Static export so it can be hosted on GitHub Pages; set BASE_PATH=/ember-site for the project page. */
const basePath = process.env.BASE_PATH ?? '';

/** @type {import('next').NextConfig} */
export default {
	output: 'export',
	basePath,
	trailingSlash: true,
	images: { unoptimized: true },
	reactStrictMode: true,
	env: { NEXT_PUBLIC_BASE_PATH: basePath }
};
