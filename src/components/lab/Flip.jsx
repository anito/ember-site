'use client';

import { useState } from 'react';
import styles from './Lab.module.css';

const GLYPHS = '◬◭◮⟁⌬⏃⏁⎔⌖⍜⏣⟐◇◈▤▥▦▧';
const scramble = (s) => Array.from(s, (ch) => (ch === ' ' ? ' ' : GLYPHS[(ch.codePointAt(0) * 7) % GLYPHS.length])).join('');

/* write on the lid, flip it: "encrypted" until somebody flips it back */
export default function Flip() {
	const [msg, setMsg] = useState('meet me at the lid');
	const [locked, setLocked] = useState(false);
	const [shown, setShown] = useState('meet me at the lid');
	const [note, setNote] = useState('');

	const encode = () => {
		if (!msg.trim()) return setNote('Write something first. Even a cup needs a plot.');
		setShown(msg);
		setLocked(true);
		setNote('Secure. Nobody can read it. Not even you.');
	};
	const decode = () => {
		if (!locked) return setNote('Nothing to decode. Flip it first.');
		setLocked(false);
		setNote('Decoded. That was the entire security model.');
	};

	return (
		<section className={styles.sec} aria-labelledby="flip-h">
			<div className={styles.wrap}>
				<div className={styles.copy}>
					<p className="eyebrow">Secure communications, simplified</p>
					<h2 id="flip-h">
						Smart flip <em>encryption.</em>
					</h2>
					<p>Write a message on the lid. Flip. Instantly secure — until someone flips it back. Genius.</p>
				</div>
				<div className={styles.panel}>
					<div className={styles.stageLid} aria-live="polite">
						<div className={`${styles.lid} ${locked ? styles.flipped : ''}`}>
							<div className={styles.face}>
								<small>Front · plain text</small>
								<p>{locked ? shown : msg || '…'}</p>
							</div>
							<div className={`${styles.face} ${styles.back}`}>
								<small>Back · military-grade*</small>
								<p aria-label="Encrypted message">{scramble(shown)}</p>
							</div>
						</div>
					</div>
					<label className="sr-only" htmlFor="flip-in">
						Message to encode
					</label>
					<input id="flip-in" className={styles.field} value={msg} onChange={(e) => (setMsg(e.target.value), setLocked(false))} maxLength={36} placeholder="Write a message" />
					<div className={styles.row}>
						<button className="btn btn--solid" onClick={encode}>
							Encode message
						</button>
						<button className="btn btn--ghost" onClick={decode}>
							Decode message
						</button>
					</div>
					<p className={styles.note} role="status">
						{note || '*military not consulted'}
					</p>
				</div>
			</div>
		</section>
	);
}
