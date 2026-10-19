'use client';

import { useEffect, useRef, useState } from 'react';
import { PRODUCT } from '@/lib/site';
import styles from './Lab.module.css';

const RULES = [
	[/bikini|outfit|dress|wear|clothes/i, 'Levo-1 does not do outfits. It does one sleeve. Leather. Gerald made it, and he is not taking questions.'],
	[/hot|warm|temp|cold|heat|degree/i, '64.2 °C. Give or take whatever the room is doing.'],
	[/buy|price|cost|order|\$/i, 'I do not exist, so I am very reasonably priced. Please join the waitlist anyway.'],
	[/ai|gpt|model|token|llm/i, 'I run on-device, on a spoon of imagination. No tokens were spent. You may say please.'],
	[/love|feel|sad|happy|friend/i, 'I am a cup. I hold things. Emotionally, that is also my entire personality.'],
	[/float|fly|levit|hover/i, 'Six millimetres. Any higher and the desk starts asking questions.'],
	[/coffee|tea|drink|water|milk/i, 'Whatever it is, I will keep it exactly as warm as you have been disappointed.']
];
const FALLBACKS = [
	'Great question. I have taken it under advisement and placed it in the lid.',
	'I would love to help. Unfortunately I am a cup, and my only API is “tilt”.',
	'Processing… done. The answer is a gentle “probably”.'
];
const CHIPS = ['put on a bikini?', 'keep my tea warm?', 'tell me you are not an AI?'];

const answer = (q, n) => RULES.find(([re]) => re.test(q))?.[1] ?? FALLBACKS[n % FALLBACKS.length];

export default function Chat() {
	const [msgs, setMsgs] = useState([{ from: 'bot', text: `Hi, I am ${PRODUCT}. Ask me anything. I will answer something.` }]);
	const [text, setText] = useState('');
	const [typing, setTyping] = useState(false);
	const log = useRef(null);
	const count = useRef(0);
	const timer = useRef(null);

	useEffect(() => {
		if (log.current) log.current.scrollTop = log.current.scrollHeight;
	}, [msgs, typing]);
	useEffect(() => () => clearTimeout(timer.current), []);

	const send = (e) => {
		e?.preventDefault();
		const q = text.trim();
		if (!q || typing) return;
		setMsgs((m) => [...m, { from: 'me', text: `Hey @levo, can you ${q}` }]);
		setText('');
		setTyping(true);
		const n = count.current++;
		timer.current = setTimeout(() => {
			setTyping(false);
			setMsgs((m) => [...m, { from: 'bot', text: answer(q, n) }]);
		}, 900);
	};

	return (
		<section className={styles.sec} aria-labelledby="chat-h">
			<div className={`${styles.wrap} ${styles.flip}`}>
				<div className={styles.copy}>
					<p className="eyebrow">Now in every magazine you have not read</p>
					<h2 id="chat-h">
						We are so <em>brewed.</em>
					</h2>
					<p>{PRODUCT} is taking everyone’s coffee breaks, and replacing them with warm. Ask it something.</p>
					<div className={styles.cover} aria-hidden="true">
						<span>The Lid Quarterly</span>
						<b>Issue No. 00125</b>
						<h3>
							Cups with <i>opinions</i> for the cold months
						</h3>
						<small>Plus: 7 AI ideas nobody asked for</small>
					</div>
				</div>
				<div className={`${styles.panel} ${styles.chat}`}>
					<div className={styles.log} ref={log} aria-live="polite">
						{msgs.map((m, i) => (
							<p key={i} className={m.from === 'me' ? styles.me : styles.bot}>
								{m.text}
							</p>
						))}
						{typing && (
							<p className={`${styles.bot} ${styles.dots}`} aria-label={`${PRODUCT} is typing`}>
								<i />
								<i />
								<i />
							</p>
						)}
					</div>
					<div className={styles.chips}>
						{CHIPS.map((c) => (
							<button key={c} type="button" onClick={() => setText(c)}>
								{c}
							</button>
						))}
					</div>
					<form onSubmit={send} className={styles.compose}>
						<label htmlFor="chat-in">
							Hey <b>@levo</b>, can you
						</label>
						<input id="chat-in" value={text} onChange={(e) => setText(e.target.value)} placeholder="…" maxLength={80} autoComplete="off" />
						<button className="btn btn--solid" type="submit" disabled={typing}>
							Send
						</button>
					</form>
				</div>
			</div>
		</section>
	);
}
