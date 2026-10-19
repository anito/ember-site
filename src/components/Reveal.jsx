'use client';

import { useEffect, useRef, useState } from 'react';

/** Fades/slides its element in the first time it scrolls into view. */
export function Reveal({ as: Tag = 'div', delay = 0, className = '', children, ...rest }) {
	const ref = useRef(null);
	useEffect(() => {
		const node = ref.current;
		if (!node || !('IntersectionObserver' in window)) {
			node?.classList.add('in');
			return;
		}
		let timer;
		const io = new IntersectionObserver(
			([e]) => {
				if (!e.isIntersecting) return;
				timer = setTimeout(() => node.classList.add('in'), delay);
				io.disconnect();
			},
			{ rootMargin: '0px 0px -10% 0px' }
		);
		io.observe(node);
		return () => {
			io.disconnect();
			clearTimeout(timer);
		};
	}, [delay]);
	return (
		<Tag ref={ref} className={`reveal ${className}`.trim()} {...rest}>
			{children}
		</Tag>
	);
}

/** Counts a number up to `to` when it first scrolls into view. */
export function CountUp({ to }) {
	const ref = useRef(null);
	const [value, setValue] = useState(to);
	useEffect(() => {
		const node = ref.current;
		if (matchMedia('(prefers-reduced-motion: reduce)').matches || !node) return;
		setValue(0);
		let raf;
		const io = new IntersectionObserver(
			([e]) => {
				if (!e.isIntersecting) return;
				io.disconnect();
				const t0 = performance.now();
				const tick = (t) => {
					const k = Math.min(1, (t - t0) / 1600);
					setValue(to * (1 - Math.pow(1 - k, 3)));
					if (k < 1) raf = requestAnimationFrame(tick);
				};
				raf = requestAnimationFrame(tick);
			},
			{ threshold: 0.6 }
		);
		io.observe(node);
		return () => {
			io.disconnect();
			cancelAnimationFrame(raf);
		};
	}, [to]);
	return <b ref={ref}>{Math.round(value).toLocaleString('en-US')}</b>;
}
