import { Fragment } from 'react';
import styles from './Marquee.module.css';

const items = ['Unprecedented AI*', 'Open-weight cup', 'Exactly one coaster thick', 'Smart flip encryption', '41.2% more circular', 'Runs on a toaster', 'No tokens', 'Trust me bro'];

export default function Marquee() {
	return (
		<div className={styles.marquee} data-marquee aria-hidden="true">
			<div className={styles.track}>
				{[0, 1].map((k) =>
					items.map((t) => (
						<Fragment key={`${k}-${t}`}>
							<span>{t}</span>
							<b>◦</b>
						</Fragment>
					))
				)}
			</div>
		</div>
	);
}
