import StudioScene from './StudioScene';

export const metadata = { title: 'Levo-1 studio', robots: { index: false, follow: false } };

/* A bare render of the live 3D scene, used by scripts/capture-stills.mjs to produce the website's
   images from the very same materials and lights. Not linked from the site. */
export default function Page() {
	return <StudioScene />;
}
