'use client';

import { useEffect, useRef, useState } from 'react';
import { useInView, prefersReducedMotion } from './useInView';
import styles from './Lab.module.css';

const SURFACES = [
	{ id: 'levo', label: 'Levo-1 coaster', mu: 0.8 },
	{ id: 'bare', label: 'Ordinary table', mu: 0.3 }
];
const LIMIT = 290;

/* a cup on a tilting table: it slides only when tan(angle) exceeds the friction coefficient */
export default function Grip() {
	const [angle, setAngle] = useState(20);
	const [surface, setSurface] = useState(0);
	const [s, setS] = useState(0);
	const wrap = useRef(null);
	const inView = useInView(wrap);
	const st = useRef({ s: 0, v: 0, angle: 20, mu: 0.8 });
	const mu = SURFACES[surface].mu;
	st.current.angle = angle;
	st.current.mu = mu;

	useEffect(() => {
		if (!inView || prefersReducedMotion()) return;
		let raf;
		let last = performance.now();
		const tick = (t) => {
			const dt = Math.min(0.05, (t - last) / 1000);
			last = t;
			const o = st.current;
			const th = (o.angle * Math.PI) / 180;
			const a = 900 * (Math.sin(th) - o.mu * Math.cos(th));
			if (a > 0 && o.s < LIMIT) {
				o.v += a * dt;
				o.s = Math.min(LIMIT, o.s + o.v * dt);
				setS(o.s);
			} else if (o.v !== 0) {
				o.v = 0;
			}
			raf = requestAnimationFrame(tick);
		};
		raf = requestAnimationFrame(tick);
		return () => cancelAnimationFrame(raf);
	}, [inView]);

	const reset = () => {
		st.current.s = 0;
		st.current.v = 0;
		setS(0);
	};
	const critical = (Math.atan(mu) * 180) / Math.PI;
	const gone = s >= LIMIT;
	const sliding = !gone && angle > critical && s > 0;
	const status = gone ? 'Spill. The table filed no complaint.' : angle > critical ? 'Sliding. Gravity wins this round.' : 'Gripped. Gravity has been politely discouraged.';

	return (
		<section className={styles.sec} aria-labelledby="grip-h" ref={wrap}>
			<div className={`${styles.wrap} ${styles.flip}`}>
				<div className={styles.copy}>
					<p className="eyebrow">Precision grip, zero drama</p>
					<h2 id="grip-h">
						Grip-locked <em>antislip technology.</em>
					</h2>
					<p>Micro-textured leather so grippy your drink files a restraining order against gravity. Spills are politely discouraged. Tilt the table and see.</p>
					<p className={styles.big}>
						μ = {mu.toFixed(2)} <em>(est.)</em>
					</p>
				</div>
				<div className={styles.panel}>
					<svg viewBox="0 0 600 400" className={styles.table} role="img" aria-label={`A cup on a table tilted ${angle} degrees`}>
						<g transform={`rotate(${angle} 300 220)`}>
							<rect x="100" y="220" width="400" height="26" rx="6" className={styles.slab} />
							<g transform={`translate(${160 + s} 0)`}>
								<g className={styles.cupSvg} transform={`translate(0 ${gone ? 40 : 0})`}>
									<path d="M-34 220 L-44 138 L44 138 L34 220 Z" />
									<rect x="-45" y="148" width="90" height="38" className={styles.sleeve} />
									<rect x="-48" y="128" width="96" height="12" rx="5" />
								</g>
							</g>
						</g>
					</svg>
					<label className={styles.slider}>
						<span>
							Table angle <b>{angle}°</b>
						</span>
						<input type="range" min="0" max="60" value={angle} onChange={(e) => setAngle(+e.target.value)} />
					</label>
					<div className={styles.seg} role="radiogroup" aria-label="Surface">
						{SURFACES.map((x, i) => (
							<button key={x.id} role="radio" aria-checked={surface === i} className={surface === i ? styles.on : ''} onClick={() => (reset(), setSurface(i))}>
								{x.label}
								<small>μ {x.mu.toFixed(2)}</small>
							</button>
						))}
					</div>
					<p className={styles.note} role="status">
						{status} <small>Slips above {critical.toFixed(1)}°.</small> {(gone || sliding) && <button onClick={reset}>Reset</button>}
					</p>
				</div>
			</div>
		</section>
	);
}
