import '@fontsource-variable/space-grotesk';
import '@fontsource-variable/inter';
import './globals.css';
import { PRODUCT } from '@/lib/site';

const site = process.env.NEXT_PUBLIC_SITE_URL || 'https://anito.github.io/ember-site';
const title = `${PRODUCT} — Made for lips. Built for Mondays.`;
const description =
	'A parody product page for a cup that floats, flips and runs on no tokens. Fictional, silly, and powered by unprecedented AI*.';

export const metadata = {
	title,
	description,
	icons: { icon: `${process.env.NEXT_PUBLIC_BASE_PATH || ''}/favicon.svg` },
	openGraph: {
		type: 'website',
		title: `${PRODUCT} — The AI-era cup`,
		description: 'An open-weight cup with smart flip encryption. A fictional parody, no products are for sale.',
		images: [`${site}/og.jpg`]
	},
	twitter: { card: 'summary_large_image' }
};

export const viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', themeColor: '#05070b' };

export default function RootLayout({ children }) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
			</head>
			<body>{children}</body>
		</html>
	);
}
