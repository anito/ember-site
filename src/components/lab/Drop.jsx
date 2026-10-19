'use client';

import { useEffect, useRef, useState } from 'react';
import { prefersReducedMotion } from './useInView';
import styles from './Lab.module.css';

const H = 300;
const FLOOR = H - 34;

/* drop test: gravity, a couple of bounces, a tumble; every landing dents the floor */
export default function Drop() {
	const [pose, setPose] = useState({ y: 120, rot: 0 });
	const [dents, setDents] = useState([]);
	const [busy, setBusy] = useState(false);
	const [drops, setDrops] = useState(0);
	const raf = useRef(0);
	const date = useRef('');
	useEffect(() => {
		date.current = new Date().toISOString().slice(0, 10);
		return () => cancelAnimationFrame(raf.current);
	}, []);

	const drop = () => {
		if (busy) return;
		setBusy(true);
		setDrops((n) => n + 1);
		const reduce = prefersReducedMotion();
		const o = { y: 120, vy: 0, rot: 0, vr: (Math.random() - 0.5) * 380, hits: 0 };
		const x = 15 + Math.random() * 70;
		if (reduce) {
			setPose({ y: FLOOR, rot: 90 });
			setDents((d) => [...d, { x, w: 6 + Math.random() * 7 }]);
			setBusy(false);
			return;
		}
		let last = performance.now();
		const tick = (t) => {
			const dt = Math.min(0.033, (t - last) / 1000);
			last = t;
			o.vy += 2300 * dt;
			o.y += o.vy * dt;
			o.rot += o.vr * dt;
			if (o.y >= FLOOR) {
				o.y = FLOOR;
				if (o.hits < 3) setDents((d) => [...d, { x: x + o.hits * 9, w: 7 + Math.random() * 9 - o.hits * 2 }]);
				o.hits++;
				o.vy = -o.vy * 0.36;
				o.vr *= 0.55;
				if (Math.abs(o.vy) < 160) {
					setPose({ y: FLOOR, rot: Math.round(o.rot / 90) * 90 });
					return setBusy(false);
				}
			}
			setPose({ y: o.y, rot: o.rot });
			raf.current = requestAnimationFrame(tick);
		};
		raf.current = requestAnimationFrame(tick);
	};
	const again = () => {
		cancelAnimationFrame(raf.current);
		setBusy(false);
		setPose({ y: 120, rot: 0 });
	};

	return (
		<section className={styles.sec} aria-labelledby="drop-h">
			<div className={styles.wrap}>
				<div className={styles.copy}>
					<p className="eyebrow">Perfect by design</p>
					<h2 id="drop-h">
						Drop-tested. <em>Damage: the floor ;)</em>
					</h2>
					<p>We dropped it onto a hard surface. Then we dropped it again to be sure. The cup is fine; the floor has questions.</p>
				</div>
				<div className={styles.panel}>
					<div className={styles.dropStage} style={{ height: H }}>
						<svg viewBox={`0 0 100 ${H}`} preserveAspectRatio="none" className={styles.floorSvg} aria-hidden="true">
							{dents.map((d, i) => (
								<ellipse key={i} cx={d.x} cy={H - 18} rx={d.w / 2} ry="2.2" />
							))}
						</svg>
						<div className={styles.dropCup} style={{ transform: `translate(-50%, ${pose.y - 78}px) rotate(${pose.rot}deg)` }} aria-hidden="true">
							<i />
						</div>
					</div>
					<dl className={styles.sheet}>
						<div>
							<dt>Test conditions</dt>
							<dd>Hard surface</dd>
						</div>
						<div>
							<dt>Date</dt>
							<dd>{date.current || '—'}</dd>
						</div>
						<div>
							<dt>Drops</dt>
							<dd>{drops}</dd>
						</div>
						<div>
							<dt>Damage</dt>
							<dd>{dents.length ? `The floor (${dents.length} dent${dents.length > 1 ? 's' : ''}) ;)` : 'Pending'}</dd>
						</div>
					</dl>
					<div className={styles.row}>
						<button className="btn btn--solid" onClick={drop} disabled={busy}>
							Drop it
						</button>
						<button className="btn btn--ghost" onClick={again}>
							Pick it up
						</button>
					</div>
				</div>
			</div>
		</section>
	);
}
