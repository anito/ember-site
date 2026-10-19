'use client';

import { useState } from 'react';
import { Reveal } from './Reveal';
import { buildCupObj } from '@/lib/cupObj';
import { PRODUCT } from '@/lib/site';
import styles from './Paper.module.css';

const BIBTEX = `@misc{levo2026,
  title        = {${PRODUCT}: Open-Weight Cup Model},
  author       = {Gerald and others},
  year         = {2026},
  howpublished = {OBJ release},
  note         = {A parametric 3D model of a takeaway cup. Code: coming soon.}
}`;

export default function Paper() {
	const [copied, setCopied] = useState(false);

	const copy = async () => {
		try {
			await navigator.clipboard.writeText(BIBTEX);
			setCopied(true);
			setTimeout(() => setCopied(false), 1800);
		} catch {
			setCopied(false);
		}
	};
	const download = () => {
		const url = URL.createObjectURL(new Blob([buildCupObj()], { type: 'text/plain' }));
		const a = Object.assign(document.createElement('a'), { href: url, download: 'levo-1.obj' });
		document.body.append(a);
		a.click();
		a.remove();
		setTimeout(() => URL.revokeObjectURL(url), 1000);
	};

	return (
		<section className={styles.paperSec} id="paper" aria-labelledby="paper-h">
			<Reveal className={styles.paper}>
				<p className={styles.venue}>Our SOTA open-weight model · preprint, not peer-reviewed</p>
				<h2 id="paper-h">{PRODUCT}: an open-weight cup for rendering, simulation, and gloriously unnecessary research</h2>
				<p className={styles.authors}>Gerald, the Lid Committee, and a very patient desk</p>
				<div className={styles.actions}>
					<button onClick={download}>Model (.OBJ)</button>
					<button disabled>Code coming soon</button>
				</div>
				<h3>Abstract</h3>
				<p>
					We present <b>{PRODUCT}</b>, an open-weight 3D model of a takeaway cup. {PRODUCT} faithfully reproduces key cup behaviours: containing liquid, resisting
					the floor, and passive thermal moderation under everyday beverage conditions. It is released as a clean OBJ and evaluated on <i>LidBench</i>, a
					standardised suite run on a single desk and very possibly rigged by us. Limitations include a heavy dependency on gravity, drinks and human
					deployment.
				</p>
				<h3>Acknowledgements</h3>
				<p>This site was assembled with Claude Code and an unreasonable number of imaginary lattes. Inspired by the parody genius of oryzo.ai by Lusion, with respect; not affiliated.</p>
				<h3>Peer review</h3>
				<blockquote>“{PRODUCT}-A0B is the best cup out there. <u>Trust me bro</u>.” — Anonymous r/LocalCups user</blockquote>
				<h3>BibTeX</h3>
				<pre>{BIBTEX}</pre>
				<button className={styles.copy} onClick={copy}>
					{copied ? 'Copied' : 'Copy BibTeX'}
				</button>
			</Reveal>
		</section>
	);
}
