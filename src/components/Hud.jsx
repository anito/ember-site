import styles from './Hud.module.css';

const clamp01 = (v) => Math.min(1, Math.max(0, v));

export default function Hud({ temp = 22, ref }) {
	const t = clamp01((temp - 22) / 43);
	const status = temp < 32 ? 'Cool' : temp < 50 ? 'Warming' : temp < 65 ? 'Almost there' : 'Holding';
	return (
		<aside ref={ref} className={styles.hud} style={{ '--t': t }} aria-label="Thermal Halo readout">
			<p className={styles.label}>Thermal Halo</p>
			<p className={styles.temp} aria-live="off">
				{temp}
				<small>°C</small>
			</p>
			<div className={styles.gauge} aria-hidden="true">
				<i style={{ left: `${t * 100}%` }} />
			</div>
			<p className={styles.status}>{status}</p>
		</aside>
	);
}
