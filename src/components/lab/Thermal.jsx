'use client';

import { useEffect, useRef, useState } from 'react';
import { useInView, prefersReducedMotion } from './useInView';
import styles from './Lab.module.css';

const N = 72;
const MODES = [
	{ id: 'hallucinate', label: 'Hallucinate', t: 10 },
	{ id: 'balanced', label: 'Balanced', t: 1 },
	{ id: 'boring', label: 'Boring', t: 0.1 }
];
const STOPS = [
	[0, [5, 7, 11]],
	[0.3, [20, 90, 130]],
	[0.55, [63, 208, 255]],
	[0.8, [255, 171, 60]],
	[1, [255, 244, 224]]
];
const colour = (v) => {
	v = Math.max(0, Math.min(1, v));
	for (let i = 1; i < STOPS.length; i++) {
		if (v <= STOPS[i][0]) {
			const [a, ca] = STOPS[i - 1];
			const [b, cb] = STOPS[i];
			const k = (v - a) / (b - a);
			return [ca[0] + (cb[0] - ca[0]) * k, ca[1] + (cb[1] - ca[1]) * k, ca[2] + (cb[2] - ca[2]) * k];
		}
	}
	return STOPS.at(-1)[1];
};

/* explicit 2D heat diffusion from a ring-shaped source; the "temperature" T injects noise and wanders the source */
export default function Thermal() {
	const [mode, setMode] = useState(1);
	const wrap = useRef(null);
	const cv = useRef(null);
	const tRef = useRef(MODES[1].t);
	const inView = useInView(wrap);
	tRef.current = MODES[mode].t;

	useEffect(() => {
		const canvas = cv.current;
		const ctx = canvas.getContext('2d');
		const img = ctx.createImageData(N, N);
		let a = new Float32Array(N * N);
		let b = new Float32Array(N * N);
		let cx = N / 2;
		let cy = N / 2;
		let jx = 0;
		let jy = 0;
		let tau = 0;
		let raf;
		const R = N * 0.2;

		const step = () => {
			const T = tRef.current;
			jx += (Math.random() - 0.5) * 0.35 * T - jx * 0.06;
			jy += (Math.random() - 0.5) * 0.35 * T - jy * 0.06;
			cx = N / 2 + Math.max(-9, Math.min(9, jx));
			cy = N / 2 + Math.max(-9, Math.min(9, jy));
			tau += 0.05;
			const wob = 0.05 * Math.pow(T, 0.6);
			const amp = 0.006 * T;
			for (let y = 1; y < N - 1; y++) {
				for (let x = 1; x < N - 1; x++) {
					const i = y * N + x;
					const lap = a[i - 1] + a[i + 1] + a[i - N] + a[i + N] - 4 * a[i];
					let v = a[i] + 0.22 * lap - 0.0035 * a[i];
					const d = Math.hypot(x - cx, y - cy);
					const th = Math.atan2(y - cy, x - cx);
					const Rt = R * (1 + wob * (Math.sin(3 * th + tau) + 0.6 * Math.sin(5 * th - 1.7 * tau)) / 1.6);
					if (Math.abs(d - Rt) < 1.6) v = Math.max(v, 1);
					v += (Math.random() - 0.5) * amp;
					b[i] = Math.max(0, Math.min(1.2, v));
				}
			}
			[a, b] = [b, a];
		};
		const paint = () => {
			for (let i = 0; i < N * N; i++) {
				const [r, g, bl] = colour(a[i]);
				img.data[i * 4] = r;
				img.data[i * 4 + 1] = g;
				img.data[i * 4 + 2] = bl;
				img.data[i * 4 + 3] = 255;
			}
			ctx.putImageData(img, 0, 0);
		};

		if (prefersReducedMotion()) {
			for (let k = 0; k < 140; k++) step();
			paint();
			return;
		}
		if (!inView) return;
		const loop = () => {
			step();
			step();
			paint();
			raf = requestAnimationFrame(loop);
		};
		raf = requestAnimationFrame(loop);
		return () => cancelAnimationFrame(raf);
	}, [inView, mode]);

	return (
		<section className={styles.sec} aria-labelledby="tdm-h" ref={wrap}>
			<div className={styles.wrap}>
				<div className={styles.copy}>
					<p className="eyebrow">Thermal Diffusion Model · TDM-7B*</p>
					<h2 id="tdm-h">
						Handles extremes <em>with ease.</em>
					</h2>
					<p>
						From scalding espresso to iced anything, Levo-1 stays stable on six millimetres of magnetic opinion. Pick a sampling temperature and watch the model
						decide how warm a cup is.
					</p>
					<small className={styles.fine}>*A visualization, not a warranty. We cannot say what the 7B counts.</small>
				</div>
				<div className={styles.panel}>
					<canvas ref={cv} width={N} height={N} className={styles.heat} role="img" aria-label="Live heat diffusion from a ring-shaped source" />
					<div className={styles.seg} role="radiogroup" aria-label="Sampling temperature">
						{MODES.map((m, i) => (
							<button key={m.id} role="radio" aria-checked={mode === i} className={mode === i ? styles.on : ''} onClick={() => setMode(i)}>
								{m.label}
								<small>T = {m.t}</small>
							</button>
						))}
					</div>
				</div>
			</div>
		</section>
	);
}
