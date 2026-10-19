import { PRODUCT } from '@/lib/site';
import styles from './Footer.module.css';

export default function Footer() {
	return (
		<footer className={styles.footer}>
			<p className={styles.pitch}>You scrolled all this way for a product that does not exist. That is the real innovation.</p>
			<div className={styles.big} aria-hidden="true">
				LEVO
			</div>
			<div className={styles.row}>
				<p>
					This entire site is a fictional parody project. {PRODUCT} does not exist; no products are for sale; every claim is satirical. Inspired by{' '}
					<a href="https://oryzo.ai/">oryzo.ai</a> by Lusion — not affiliated.
				</p>
				<p>
					<a href="#top">Back to top ↑</a>
				</p>
			</div>
		</footer>
	);
}
