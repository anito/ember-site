'use client';

import { useState } from 'react';
import { Reveal } from './Reveal';
import { PRODUCT } from '@/lib/site';
import styles from './Models.module.css';

const MODELS = [
	{ name: PRODUCT, stack: 1, tag: 'One lid. One job. Done beautifully.', body: 'The original. Refined until it feels inevitable. Lifts just enough, grips just right, and quietly disappears into your day.', best: 'Daily mugs and quiet desks' },
	{ name: `${PRODUCT} Pro`, stack: 2, tag: 'Twice the lid. Twice the commitment.', body: 'A little more presence. Double the leather, double the confidence, without losing the plot.', best: 'Taller cups and extra stability' },
	{ name: `${PRODUCT} Pro Max`, stack: 3, tag: 'Three layers of confidence.', body: 'Maximum stack for maximum unnecessary satisfaction. A bold little pedestal and a quiet flex for the whole desk.', best: 'Maximum lift and maximum presence' }
];

export default function Models() {
	const [queue, setQueue] = useState({});
	const join = (name) => setQueue((q) => ({ ...q, [name]: q[name] ?? 4000 + Math.floor(Math.random() * 90000) }));

	return (
		<section className={styles.models} id="product" aria-labelledby="models-h">
			<Reveal className={styles.head}>
				<p className="eyebrow">Choose your own</p>
				<h2 id="models-h">
					{PRODUCT}. <em>Pro. Pro Max.</em>
				</h2>
			</Reveal>
			<div className={styles.grid}>
				{MODELS.map((m, i) => (
					<Reveal as="article" key={m.name} delay={i * 100} className={styles.card}>
						<div className={styles.stack} aria-hidden="true" style={{ '--n': m.stack }}>
							{Array.from({ length: m.stack }, (_, k) => (
								<i key={k} style={{ '--k': k }} />
							))}
						</div>
						<span className={styles.new}>New</span>
						<h3>{m.name}</h3>
						<p className={styles.tag}>{m.tag}</p>
						<p>{m.body}</p>
						<dl>
							<div>
								<dt>Stack</dt>
								<dd>{m.stack}</dd>
							</div>
							<div>
								<dt>Lift</dt>
								<dd>
									{m.stack} coaster{m.stack > 1 ? 's' : ''} thick
								</dd>
							</div>
							<div>
								<dt>Material</dt>
								<dd>Leather, titanium</dd>
							</div>
							<div>
								<dt>Connectivity</dt>
								<dd>None</dd>
							</div>
							<div>
								<dt>Pairing</dt>
								<dd>Not required</dd>
							</div>
							<div>
								<dt>Updates</dt>
								<dd>Never</dd>
							</div>
							<div>
								<dt>Best for</dt>
								<dd>{m.best}</dd>
							</div>
						</dl>
						<button className="btn btn--solid" onClick={() => join(m.name)} disabled={!!queue[m.name]}>
							{queue[m.name] ? `You are #${queue[m.name].toLocaleString('en-US')}` : 'Join waitlist'}
						</button>
						{queue[m.name] && <small className={styles.fine}>A queue for a product that does not exist. Nothing was sent.</small>}
					</Reveal>
				))}
			</div>
		</section>
	);
}
