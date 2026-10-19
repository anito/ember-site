import { Fragment } from 'react';
import styles from './Reviews.module.css';

const ROW_A = [
	['“Best cup I have ever used. I cannot go to the office without it.”', 'Dana K., almost a morning person', 5],
	['“I asked it to hold 64 °C. It held 64 °C. I now trust nothing else in my life.”', 'Ravi S., spreadsheet monk', 5],
	['“We are so brewed. Hollywood is not ready for a cup this cinematic.”', 'Jamie R., prompt whisperer, ex-NFT', 5],
	['“I tried the float mode. I achieved… stillness.”', 'Jules M., minimalist', 4.5],
	['“My desk has not been this protected since I stopped trusting my elbows.”', 'Priya K., flat-desk believer', 5]
];
const ROW_B = [
	['“Gerald does good work. Gerald has no hobbies. Gerald is fine.”', 'A leather enthusiast', 5],
	['“It glows at night. My tea feels seen.”', 'Pat, insomniac', 4.5],
	['“Eight out of ten cats approve. The ninth is a dog.”', 'The Cat Board', 4],
	['“I dropped it off a roof. The floor needed therapy.”', 'Mo T., stunt coordinator', 5],
	['“Would float again.”', 'Everyone, eventually', 5]
];

const Row = ({ items, rev }) => (
	<div className={`${styles.row} ${rev ? styles.rev : ''}`}>
		<div className={styles.track}>
			{[0, 1].map((k) => (
				<Fragment key={k}>
					{items.map(([q, who, stars]) => (
						<figure key={k + q} className={styles.card} aria-hidden={k === 1 ? 'true' : undefined}>
							<p className={styles.stars}>[ {stars}/5 ]</p>
							<blockquote>{q}</blockquote>
							<figcaption>— {who}</figcaption>
						</figure>
					))}
				</Fragment>
			))}
		</div>
	</div>
);

export default function Reviews() {
	return (
		<section className={styles.reviews} aria-label="Reviews (fictional)">
			<p className={`eyebrow ${styles.eyebrow}`}>People all around the world love Levo-1 · [ 4.8/5 ] · custom reviews [ 212 ], written by us</p>
			<Row items={ROW_A} />
			<Row items={ROW_B} rev />
		</section>
	);
}
