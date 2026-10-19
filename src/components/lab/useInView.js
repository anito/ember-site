'use client';

import { useEffect, useState } from 'react';

/** True while the element is (nearly) on screen; lets a mini-scene pause its loop off screen. */
export function useInView(ref, margin = '120px') {
	const [seen, setSeen] = useState(false);
	useEffect(() => {
		const node = ref.current;
		if (!node) return;
		const io = new IntersectionObserver(([e]) => setSeen(e.isIntersecting), { rootMargin: margin });
		io.observe(node);
		return () => io.disconnect();
	}, [ref, margin]);
	return seen;
}

export const prefersReducedMotion = () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
