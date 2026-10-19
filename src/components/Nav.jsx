'use client';

import { useEffect, useRef, useState } from 'react';
import { getMotion } from '@/lib/motion';
import { BRAND, PRODUCT } from '@/lib/site';
import styles from './Nav.module.css';

async function go(e, id) {
	const target = id === '#top' ? 0 : document.querySelector(id);
	if (target === null) return;
	e.preventDefault();
	const { lenis } = await getMotion();
	if (lenis) lenis.scrollTo(target, { duration: 1.8 });
	else window.scrollTo({ top: target === 0 ? 0 : target.offsetTop, behavior: 'smooth' });
}

const SECTIONS = ['story', 'features', 'product', 'paper', 'reserve'];

export default function Nav() {
	const [active, setActive] = useState('story');
	const barRef = useRef(null);

	/* follow the scroll: the progress line and the section the viewport is in (also works while Lenis smooths) */
	useEffect(() => {
		const update = () => {
			const max = document.documentElement.scrollHeight - innerHeight;
			if (barRef.current) barRef.current.style.transform = `scaleX(${max > 0 ? Math.min(1, scrollY / max) : 0})`;
			let cur = 'story';
			for (const id of SECTIONS) {
				const el = document.getElementById(id);
				if (el && el.getBoundingClientRect().top <= innerHeight * 0.4) cur = id;
			}
			if (max > 0 && scrollY >= max - 8) cur = 'reserve'; // the last section can't scroll up to the trigger line
			setActive(cur);
		};
		update();
		addEventListener('scroll', update, { passive: true });
		addEventListener('resize', update);
		return () => {
			removeEventListener('scroll', update);
			removeEventListener('resize', update);
		};
	}, []);

	const cls = (id) => (active === id ? styles.current : '');
	return (
		<header className={styles.nav}>
			<a className={styles.logo} href="#top" aria-label={`${PRODUCT} — home`} onClick={(e) => go(e, '#top')}>
				<svg viewBox="0 0 24 24" aria-hidden="true">
					<circle cx="12" cy="12" r="9" fill="none" stroke="var(--cyan)" strokeWidth="1.6" />
					<path d="M12 3a9 9 0 0 1 0 18" fill="none" stroke="var(--amber)" strokeWidth="1.6" />
					<circle cx="12" cy="12" r="2.4" fill="currentColor" />
				</svg>
				<span>{BRAND}</span>
			</a>
			<nav className={styles.links} aria-label="Primary">
				<a className={cls('story')} href="#story" onClick={(e) => go(e, '#story')} aria-current={active === 'story' ? 'true' : undefined}>Intro</a>
				<a className={cls('features')} href="#features" onClick={(e) => go(e, '#features')} aria-current={active === 'features' ? 'true' : undefined}>Features</a>
				<a className={cls('product')} href="#product" onClick={(e) => go(e, '#product')} aria-current={active === 'product' ? 'true' : undefined}>Product</a>
				<a className={cls('paper')} href="#paper" onClick={(e) => go(e, '#paper')} aria-current={active === 'paper' ? 'true' : undefined}>Paper</a>
			</nav>
			<span className={styles.progress} ref={barRef} aria-hidden="true" />
			<a className={`btn btn--solid ${styles.cta} ${active === 'reserve' ? styles.on : ''}`} href="#reserve" onClick={(e) => go(e, '#reserve')}>
				Waitlist <span aria-hidden="true">→</span>
			</a>
		</header>
	);
}
