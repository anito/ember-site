import { Reveal } from '../Reveal';
import styles from './Lab.module.css';

const TILES = [
	['Runs on the edge', 'Refuses the cloud.', 'On-device. Always on. 24/7 uptime, no power required.'],
	['Runs on a toaster', 'No more OOM on any consumer appliance.', 'Deployable on kitchen hardware you already own. Out of memory? Out of coffee.'],
	['0 W', 'Power draw while in use.', 'No compute. No tokens. So you can say “please” and “thank you” as much as you like, guilt free.'],
	['Legacy support', 'Backward compatible since the Bronze Age.', 'Works with every table, hand and clay pot we could find.']
];

export default function Edge() {
	return (
		<section className={styles.sec} aria-labelledby="edge-h">
			<div className={styles.wide}>
				<Reveal className={styles.copy}>
					<p className="eyebrow">On-device. Off the grid.</p>
					<h2 id="edge-h">
						No cloud. <em>No compute.</em> No problem.
					</h2>
				</Reveal>
				<ul className={styles.tiles}>
					{TILES.map(([a, b, c], i) => (
						<Reveal as="li" key={a} delay={i * 80} className={styles.tile}>
							<h3>{a}</h3>
							<b>{b}</b>
							<p>{c}</p>
						</Reveal>
					))}
				</ul>
			</div>
		</section>
	);
}
