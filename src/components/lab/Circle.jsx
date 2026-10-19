'use client';

import { useEffect, useRef, useState } from 'react';
import { useInView, prefersReducedMotion } from './useInView';
import styles from './Lab.module.css';

const BASE = 0.708; /* an ordinary cup; 1 / 0.708 = +41.2% */
const wobble = (th) => (Math.sin(3 * th + 1.3) + 0.7 * Math.sin(5 * th + 0.4) + 0.5 * Math.sin(7 * th + 2.1)) / 2.2;
const path = (c) => {
	const pts = [];
	for (let i = 0; i < 180; i++) {
		const th = (i / 180) * Math.PI * 2;
		const r = 90 * (1 + (1 - c) * 0.55 * wobble(th));
		pts.push(`${i ? 'L' : 'M'}${(Math.cos(th) * r).toFixed(2)} ${(Math.sin(th) * r).toFixed(2)}`);
	}
	return pts.join('') + 'Z';
};

export default function Circle() {
	const ref = useRef(null);
	const inView = useInView(ref, '0px');
	const [c, setC] = useState(BASE);
	const raf = useRef(0);
	const ran = useRef(false);

	const run = () => {
		cancelAnimationFrame(raf.current);
		if (prefersReducedMotion()) return setC(1);
		setC(BASE);
		const t0 = performance.now();
		const tick = (t) => {
			const k = Math.min(1, (t - t0) / 2600);
			const e = 1 - Math.pow(1 - k, 3);
			setC(BASE + (1 - BASE) * e);
			if (k < 1) raf.current = requestAnimationFrame(tick);
		};
		raf.current = requestAnimationFrame(tick);
	};
	useEffect(() => {
		if (inView && !ran.current) {
			ran.current = true;
			const id = setTimeout(run, 500);
			return () => clearTimeout(id);
		}
	}, [inView]);
	useEffect(() => () => cancelAnimationFrame(raf.current), []);

	const gain = (c / BASE - 1) * 100;
	return (
		<section className={styles.sec} aria-labelledby="orbit-h" ref={ref}>
			<div className={`${styles.wrap} ${styles.flip}`}>
				<div className={styles.copy}>
					<p className="eyebrow">ORBIT · Optimised Roundness By Iterative Tuning</p>
					<h2 id="orbit-h">
						Perfectly round, <em>seriously.</em>
					</h2>
					<p>Our engineers recalibrated the circumference with a disturbing level of attention to detail, just because we could.</p>
					<p className={styles.big}>
						Now {gain.toFixed(1)}% <em>more circular</em>
					</p>
				</div>
				<div className={styles.panel}>
					<svg viewBox="-120 -120 240 240" className={styles.gauge} role="img" aria-label={`Circularity ${c.toFixed(3)} out of 1`}>
						<circle r="90" className={styles.ideal} />
						<path d={path(c)} className={styles.blob} />
					</svg>
					<p className={styles.readout}>
						Circularity (circle = 1.000) <b>{c.toFixed(3)}</b>
					</p>
					<div className={styles.row}>
						<button className="btn btn--solid" onClick={run}>
							Run ORBIT
						</button>
						<button className="btn btn--ghost" onClick={() => (cancelAnimationFrame(raf.current), setC(BASE))}>
							Back to a regular cup
						</button>
					</div>
				</div>
			</div>
		</section>
	);
}
