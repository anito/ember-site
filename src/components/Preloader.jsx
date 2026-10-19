'use client';

import { useEffect } from 'react';
import styles from './Preloader.module.css';

export default function Preloader({ progress = 0, done = false }) {
	const pct = Math.round(progress * 100);

	useEffect(() => {
		document.body.style.overflow = done ? '' : 'hidden';
		return () => {
			document.body.style.overflow = '';
		};
	}, [done]);

	return (
		<div className={`${styles.preloader} ${done ? styles.done : ''}`} role="status" aria-live="polite">
			<div className={styles.ring}>
				<svg viewBox="0 0 100 100" aria-hidden="true">
					<circle cx="50" cy="50" r="46" className={styles.bg} />
					<circle cx="50" cy="50" r="46" className={styles.fg} style={{ strokeDashoffset: 289 * (1 - progress) }} />
				</svg>
				<div className={styles.count}>
					{pct}
					<i>%</i>
				</div>
			</div>
			<p>Seating the lid</p>
		</div>
	);
}
