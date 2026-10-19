/** Lazily loads GSAP + ScrollTrigger + Lenis in the browser and wires them together once. */
let promise;

export function getMotion() {
	promise ??= (async () => {
		const [{ gsap }, { ScrollTrigger }, { default: Lenis }] = await Promise.all([
			import('gsap'),
			import('gsap/ScrollTrigger'),
			import('lenis')
		]);
		gsap.registerPlugin(ScrollTrigger);
		const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
		let lenis = null;
		if (!reduce) {
			lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.95 });
			lenis.on('scroll', ScrollTrigger.update);
			gsap.ticker.add((t) => lenis.raf(t * 1000));
			gsap.ticker.lagSmoothing(0);
		}
		return { gsap, ScrollTrigger, lenis, reduce };
	})();
	return promise;
}
