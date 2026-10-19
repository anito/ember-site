'use client';

import { useRef, useState } from 'react';
import styles from './Lab.module.css';

const FINGERS = [
	{ x: 74, h: 84, r: -9 },
	{ x: 100, h: 102, r: -3 },
	{ x: 126, h: 98, r: 3 },
	{ x: 152, h: 78, r: 10 }
];

/* a hand that is hovered: the AI "fills in the gaps" and finds a sixth finger */
export default function HighFive() {
	const [six, setSix] = useState(false);
	const [tilt, setTilt] = useState({ x: 0, y: 0 });
	const ref = useRef(null);

	const onMove = (e) => {
		const b = ref.current.getBoundingClientRect();
		setTilt({ x: ((e.clientX - b.left) / b.width - 0.5) * 2, y: ((e.clientY - b.top) / b.height - 0.5) * 2 });
	};

	return (
		<section className={styles.sec} aria-labelledby="hf-h">
			<div className={styles.wrap}>
				<div className={styles.copy}>
					<p className="eyebrow">Powered by AI*</p>
					<h2 id="hf-h">
						AI fills in the gaps. <em>We said high five. It heard six.</em>
					</h2>
					<p>Try to hover the hand. Levo-1’s vision model is extremely confident about everything it sees.</p>
					<small className={styles.fine}>*Asterisk. Please do not ask us what it stands for.</small>
				</div>
				<div
					ref={ref}
					className={`${styles.panel} ${styles.handPanel} ${six ? styles.six : ''}`}
					onPointerEnter={() => setSix(true)}
					onPointerLeave={() => {
						setSix(false);
						setTilt({ x: 0, y: 0 });
					}}
					onPointerMove={onMove}
					onClick={() => setSix((v) => !v)}
					role="button"
					tabIndex={0}
					aria-pressed={six}
					aria-label="Hover or press the hand to let the AI count its fingers"
					onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setSix((v) => !v))}
				>
					<svg viewBox="0 0 240 260" className={styles.hand} style={{ transform: `rotateY(${tilt.x * 14}deg) rotateX(${-tilt.y * 10}deg)` }} aria-hidden="true">
						<g className={styles.limb}>
							{FINGERS.map((f, i) => (
								<rect key={i} x={f.x} y={140 - f.h} width="20" height={f.h + 30} rx="10" transform={`rotate(${f.r} ${f.x + 10} 150)`} />
							))}
							<rect x="40" y="108" width="20" height="78" rx="10" transform="rotate(-52 56 168)" />
							<g transform="rotate(58 176 190)">
								<rect className={styles.extra} x="166" y="130" width="20" height="82" rx="10" />
							</g>
							<rect x="64" y="124" width="116" height="100" rx="42" />
						</g>
					</svg>
					<p className={styles.readout}>
						Fingers detected <b>{six ? 6 : 5}</b>
						<span>confidence {six ? '99.9' : '97.2'}%</span>
					</p>
					<p className={styles.hint}>{six ? 'It heard six.' : 'Try to hover hand'}</p>
				</div>
			</div>
		</section>
	);
}
