'use client';

import { Component, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { getMotion } from '@/lib/motion';
import Hud from './Hud';
import Steam from './Steam';
import { asset } from '@/lib/url';
import { PRODUCT } from '@/lib/site';
import styles from './Stage.module.css';

/* the live 3D cup (React Three Fiber); client-only, loaded on demand */
const LevoCanvas = dynamic(() => import('@/lib/three/LevoCanvas'), { ssr: false });

/* if the 3D scene throws (no WebGL, a shader or texture failure), release the loader and show the still render */
class SceneBoundary extends Component {
	state = { failed: false };
	static getDerivedStateFromError() {
		return { failed: true };
	}
	componentDidCatch(err) {
		console.error('Levo 3D scene failed:', err);
		this.props.onFail?.();
	}
	render() {
		if (!this.state.failed) return this.props.children;
		// eslint-disable-next-line @next/next/no-img-element
		return <img className={this.props.className} src={this.props.fallback} alt="" />;
	}
}

const chapters = [
	{
		num: '01',
		title: 'Breakthrough*',
		side: 'right',
		text: `${PRODUCT} isn’t just a cup. It’s the result of unprecedented AI* breakthroughs, most of them about lids.`,
		ad: ['Powered by AI*', 'Now with 12% more nouns'],
		fine: '*AI stands for “A cup, Intelligently”.'
	},
	{
		num: '02',
		title: 'Open-weight',
		side: 'left',
		text: 'Four weights, fully open: lid, sleeve, body and liner. No screws, no black box, no licence agreement. It comes apart like a very polite puzzle.',
		parts: ['Leather lid', 'Stitched sleeve', 'Titanium body', 'Induction liner'],
		ad: ['Fine print', 'Reassembles in 4 seconds*'],
		fine: '*we have not tested this'
	},
	{
		num: '03',
		title: 'Rise above mediocrity',
		side: 'right',
		text: 'A precision-engineered lift, exactly one coaster thick. Flip the lid and the cup is no longer held. It is elevated. Literally.',
		ad: ['Lift', '1 coaster thick, 0 coasters needed']
	},
	{
		num: '04',
		title: 'Handles extremes',
		side: 'left',
		text: 'From scalding espresso to iced anything, it stays stable on six millimetres of magnetic opinion. Your desk already tapped out three sips ago.',
		ad: ['Thermodynamic stability', 'Within 1 °C of whatever you meant']
	},
	{
		num: '05',
		title: 'Thermal Diffusion',
		side: 'right',
		text: 'The Halo shifts from cyan to amber as your drink warms. We modelled it with a Thermal Diffusion Model. Keep scrolling and turn the temperature up yourself.',
		ad: ['TDM-7B*', 'A visualization, not a warranty'],
		fine: '*7 billion what, we cannot say'
	},
	{
		num: '06',
		title: 'Stitched',
		side: 'left',
		text: 'Every stitch was placed by a patient robot named Gerald. He asked us to mention that he has no hobbies.',
		ad: ['Handmade-ish', '1,840 stitches. Gerald counted.']
	},
	{
		num: '07',
		title: 'Refuses the cloud',
		side: 'right',
		text: 'Lights out. It runs on the edge: on device, always on, 24/7 uptime, no power required. No compute and no tokens, so “please” and “thank you” stay free.',
		ad: ['Night Mode', 'Glows politely until 2 a.m.']
	},
	{
		num: '08',
		title: 'Pack',
		side: 'center',
		text: 'Lid back on, halo asleep. Scroll on to the lab: a handful of tiny experiments we are legally allowed to call science.',
		ad: ['Up next', 'Peer review: “trust me bro”']
	}
];
const railLabels = ['Intro', 'AI*', 'Weights', 'Lift', 'Extremes', 'Diffusion', 'Stitch', 'Edge', 'Pack'];

/* scene palette, one entry per chapter */
const PAL = [
	{ bg: '#05070b', accent: '#3fd0ff' },
	{ bg: '#060a14', accent: '#5b8cff' },
	{ bg: '#0c0716', accent: '#b36bff' },
	{ bg: '#0b0714', accent: '#d05cff' },
	{ bg: '#051012', accent: '#3fe0c8' },
	{ bg: '#120905', accent: '#ffab3c' },
	{ bg: '#150a07', accent: '#ff7a4a' },
	{ bg: '#020307', accent: '#6fe3ff' },
	{ bg: '#04060a', accent: '#3fd0ff' }
];
const AT = [0, 0.065, 0.16, 0.27, 0.38, 0.5, 0.62, 0.74, 0.88];
const PIN_VH = 12;

export default function Stage({ onProgress = () => {}, onReady = () => {} }) {
	const stageRef = useRef(null);
	const cupRef = useRef(null);
	const glRef = useRef(null);
	const glowRef = useRef(null);
	const floorRef = useRef(null);
	const wordmarkRef = useRef(null);
	const heroRef = useRef(null);
	const heroLeftRef = useRef(null);
	const heroRightRef = useRef(null);
	const hudRef = useRef(null);
	const dustRef = useRef(null);
	const ringRefs = [useRef(null), useRef(null), useRef(null)];
	const chapterRefs = useRef([]);

	/* shared with the 3D scene, which reads it every frame (no React re-render) */
	const rig = useRef({ frame: 0, mouse: 0, lidT: 0, topT: 1, expl: 0, macro: 0, night: 0, cupEl: null, reduce: false }).current;

	const [temp, setTemp] = useState(22);
	const [railIndex, setRailIndex] = useState(0);
	const [isStatic, setIsStatic] = useState(false);
	const [active, setActive] = useState(true);
	const readyRef = useRef(false);

	/* loader: the model has no files to fetch, so ease towards ~90% while the 3D chunk loads */
	useEffect(() => {
		let p = 0.05;
		onProgress(p);
		const id = setInterval(() => {
			if (readyRef.current) return clearInterval(id);
			p += (0.92 - p) * 0.1;
			onProgress(p);
		}, 90);
		return () => clearInterval(id);
	}, [onProgress]);

	/* hard limit: never leave the visitor on the loader, whatever the 3D scene does */
	useEffect(() => {
		const id = setTimeout(() => handleGlReady(), 7000);
		return () => clearTimeout(id);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const handleGlReady = () => {
		if (readyRef.current) return;
		readyRef.current = true;
		onProgress(1);
		onReady();
	};

	/* pause rendering while the stage is far off screen */
	useEffect(() => {
		const io = new IntersectionObserver(([e]) => setActive(e.isIntersecting), { rootMargin: '200px' });
		io.observe(stageRef.current.parentElement);
		return () => io.disconnect();
	}, []);

	useEffect(() => {
		let disposed = false;
		let ctx;
		let cleanup = () => {};
		rig.cupEl = cupRef.current;

		(async () => {
			const { gsap, ScrollTrigger, reduce } = await getMotion();
			if (disposed) return;
			rig.reduce = reduce;
			if (reduce) rig.topT = 0;
			const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
			let heroWeight = 1;

			if (reduce) {
				setIsStatic(true);
				handleGlReady();
				return;
			}

			const isMobile = () => innerWidth <= 860;
			const vw = (n) => () => innerWidth * (n / 100);
			const stage = stageRef.current;
			const cup = cupRef.current;

			ctx = gsap.context(() => {
				gsap.set(cup, { xPercent: -50, yPercent: -50 });
				const cupY = () => (isMobile() ? -innerHeight * 0.1 : -innerHeight * 0.02);
				gsap.set(cup, { y: cupY, x: () => (isMobile() ? 0 : -innerWidth * 0.055) });
				gsap.set(stage, { '--bg': PAL[0].bg, '--accent': PAL[0].accent });

				/* ambient loops: orbit rings, dust */
				const [r1, r2, r3] = ringRefs.map((r) => r.current);
				gsap.to(r1, { rotation: 360, duration: 60, ease: 'none', repeat: -1, transformOrigin: '50% 50%' });
				gsap.to(r2, { rotation: -360, duration: 90, ease: 'none', repeat: -1, transformOrigin: '50% 50%' });
				gsap.to(r3, { rotation: 360, duration: 140, ease: 'none', repeat: -1, transformOrigin: '50% 50%' });
				dustRef.current.querySelectorAll('i').forEach((d) => {
					gsap.fromTo(
						d,
						{ y: 0, opacity: 0 },
						{
							y: () => -gsap.utils.random(innerHeight * 0.3, innerHeight * 0.9),
							x: () => gsap.utils.random(-40, 40),
							opacity: gsap.utils.random(0.25, 0.8),
							duration: gsap.utils.random(6, 12),
							delay: gsap.utils.random(0, 8),
							repeat: -1,
							ease: 'sine.inOut'
						}
					);
				});

				/* the pinned, scrubbed story */
				const tl = gsap.timeline({
					defaults: { ease: 'none' },
					scrollTrigger: {
						trigger: stage.parentElement,
						start: 'top top',
						end: () => '+=' + Math.round(innerHeight * PIN_VH),
						pin: stage,
						scrub: 0.9,
						anticipatePin: 1,
						invalidateOnRefresh: true,
						onUpdate: (self) => {
							const p = self.progress;
							heroWeight = clamp(1 - p / 0.06, 0, 1);
							const k = clamp((p - 0.3) / 0.38, 0, 1);
							setTemp(Math.round(22 + 43 * (k * k * (3 - 2 * k))));
							let idx = 0;
							AT.forEach((t, i) => {
								if (p >= t - 0.001) idx = i;
							});
							setRailIndex(idx);
						}
					}
				});

				tl.to(rig, { frame: 216, duration: 1 }, 0);
				// the opening: a top-down view of the saddlery desk that tilts into the side view
				tl.to(rig, { topT: 0, duration: 0.1, ease: 'power2.inOut' }, 0.005);
				tl.to(heroRef.current, { opacity: 0, y: -30, duration: 0.06, ease: 'power1.in' }, 0.015);
				tl.to(wordmarkRef.current, { yPercent: -18, scale: 1.1, duration: 0.3 }, 0);
				tl.to(wordmarkRef.current, { opacity: 0, duration: 0.12 }, 0.12);
				tl.to(floorRef.current, { backgroundPositionY: '1600px', duration: 1 }, 0);

				const m = isMobile();
				const yy = m ? () => -innerHeight * 0.2 : () => 0;
				const path = [
					{ x: m ? 0 : vw(-23), y: yy, scale: m ? 0.92 : 1.04 }, // seal
					{ x: m ? 0 : vw(22), y: yy, scale: m ? 0.72 : 0.78 }, // take apart
					{ x: m ? 0 : vw(-23), y: yy, scale: m ? 0.98 : 1.1 }, // flip
					{ x: m ? 0 : vw(22), y: yy, scale: m ? 1.02 : 1.16 }, // float
					{ x: m ? 0 : vw(-22), y: yy, scale: m ? 1.0 : 1.14 }, // halo
					{ x: m ? 0 : vw(22), y: yy, scale: m ? 1.0 : 1.0 }, // stitched (the scene zooms in itself)
					{ x: m ? 0 : vw(-22), y: yy, scale: m ? 1.0 : 1.1 }, // night
					{ x: 0, y: m ? () => -innerHeight * 0.22 : () => -innerHeight * 0.1, scale: m ? 1.0 : 0.88 } // pack
				];
				path.forEach((p, i) => tl.to(cup, { ...p, duration: 0.09, ease: 'power2.inOut' }, AT[i + 1] - 0.055));
				// the lid: off and flipped into the coaster during "Flip", back on during "Pack"
				tl.to(rig, { lidT: 1, duration: 0.17, ease: 'none' }, AT[3] - 0.01);
				tl.to(rig, { lidT: 0, duration: 0.15, ease: 'none' }, AT[8] - 0.02);
				// exploded view during "Take apart"
				tl.to(rig, { expl: 1, duration: 0.05, ease: 'power2.out' }, AT[2] - 0.01);
				tl.to(rig, { expl: 0, duration: 0.05, ease: 'power2.in' }, AT[3] - 0.07);
				// macro on the stitching, then lights out
				tl.to(rig, { macro: 1, duration: 0.06, ease: 'power2.inOut' }, AT[6] - 0.02);
				tl.to(rig, { macro: 0, duration: 0.06, ease: 'power2.inOut' }, AT[7] - 0.07);
				tl.to(rig, { night: 1, duration: 0.07, ease: 'power2.inOut' }, AT[7] - 0.03);
				tl.to(rig, { night: 0, duration: 0.07, ease: 'power2.inOut' }, AT[8] - 0.08);
				PAL.slice(1).forEach((p, i) =>
					tl.to(stage, { '--bg': p.bg, '--accent': p.accent, duration: 0.09, ease: 'power1.inOut' }, AT[i + 1] - 0.06)
				);
				tl.to(dustRef.current, { opacity: 1, duration: 0.05 }, AT[4] - 0.02);
				tl.fromTo([r1, r3], { scale: 0.9 }, { scale: 1.25, duration: 1 }, 0);

				chapterRefs.current.forEach((el, i) => {
					const start = AT[i + 1];
					const last = i === chapters.length - 1;
					const dy = 34;
					tl.fromTo(el, { opacity: 0, y: dy }, { opacity: 1, y: 0, duration: 0.045, ease: 'power2.out' }, start);
					if (!last) tl.to(el, { opacity: 0, y: -dy, duration: 0.04, ease: 'power2.in' }, AT[i + 2] - 0.065);
				});

				/* pointer: a little extra turn of the cup near the top of the page */
				const pointer = { v: 0 };
				const tick = () => (rig.mouse = pointer.v * heroWeight);
				gsap.ticker.add(tick);
				cleanup = () => gsap.ticker.remove(tick);
				if (matchMedia('(pointer:fine)').matches) {
					const qx = gsap.quickTo(pointer, 'v', { duration: 0.9, ease: 'power3.out' });
					const onMove = (e) => qx((e.clientX / innerWidth - 0.5) * 0.9);
					addEventListener('pointermove', onMove);
					const prev = cleanup;
					cleanup = () => {
						removeEventListener('pointermove', onMove);
						prev();
					};
				}

				/* intro */
				const intro = gsap.timeline({ defaults: { ease: 'power3.out' }, delay: 0.35 });
				intro
					.from(glRef.current, { opacity: 0, duration: 1.6 }, 0.1)
					.from(wordmarkRef.current, { yPercent: 12, opacity: 0, duration: 1.6 }, 0)
					.from(glowRef.current, { opacity: 0, duration: 2 }, 0)
					.from(heroLeftRef.current.children, { y: 40, opacity: 0, duration: 1.1, stagger: 0.12 }, 0.5)
					.from(heroRightRef.current.children, { y: 40, opacity: 0, duration: 1.1, stagger: 0.12 }, 0.7)
					.from(hudRef.current, { opacity: 0, x: 20, duration: 1 }, 1);
			}, stage);

			const refresh = () => ScrollTrigger.refresh();
			addEventListener('load', refresh);
			const prev = cleanup;
			cleanup = () => {
				removeEventListener('load', refresh);
				prev();
			};
		})();

		return () => {
			disposed = true;
			cleanup();
			ctx?.revert();
		};
	}, [rig]);

	/* PLAY: scroll through the whole pinned story on its own; any wheel / touch / key takes the controls back */
	const play = async () => {
		const { lenis, reduce } = await getMotion();
		const top = stageRef.current.parentElement.offsetTop;
		if (reduce || !lenis) {
			document.getElementById('features')?.scrollIntoView({ behavior: 'auto' });
			return;
		}
		const stop = () => {
			lenis.scrollTo(lenis.scroll, { immediate: true });
			['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach((t) => removeEventListener(t, stop));
		};
		['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach((t) => addEventListener(t, stop, { passive: true }));
		lenis.scrollTo(top + innerHeight * PIN_VH, {
			duration: 48,
			easing: (t) => t,
			onComplete: () => ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach((t) => removeEventListener(t, stop))
		});
	};

	return (
		<section className={styles.story} id="story" aria-label={`How ${PRODUCT} works`}>
			<div className={`${styles.stage} ${isStatic ? styles.static : ''}`} ref={stageRef}>
				<div className={styles.glow} ref={glowRef} aria-hidden="true" />
				<Steam intensity={0.26} />
				<div className={styles.floor} ref={floorRef} aria-hidden="true" />
				<div className={styles.wordmark} ref={wordmarkRef} aria-hidden="true">
					LEVO
				</div>
				<div className={styles.dust} ref={dustRef} aria-hidden="true">
					{Array.from({ length: 26 }, (_, i) => (
						<i key={i} style={{ left: `${(i * 37) % 100}%`, '--s': `${2 + ((i * 7) % 4)}px` }} />
					))}
				</div>

				{/* the DOM box GSAP moves/scales; the 3D group follows it, and the rings live inside it */}
				<div className={styles.cup} ref={cupRef}>
					<svg className={styles.rings} viewBox="-100 -100 200 200" aria-hidden="true">
						<g ref={ringRefs[0]}>
							<circle r="46" className={`${styles.r} ${styles['r-a']}`} />
							<circle r="46" className={`${styles.r} ${styles['r-arc']}`} />
							<circle cx="46" cy="0" r="1.4" className={styles.dot} />
						</g>
						<g ref={ringRefs[1]}>
							<circle r="62" className={`${styles.r} ${styles['r-b']}`} />
							<circle cx="-62" cy="0" r="1.1" className={styles.dot} />
							<circle cx="0" cy="62" r="1.1" className={`${styles.dot} ${styles.dim}`} />
						</g>
						<g ref={ringRefs[2]}>
							<circle r="82" className={`${styles.r} ${styles['r-c']}`} />
							<circle r="82" className={`${styles.r} ${styles['r-arc2']}`} />
						</g>
					</svg>
				</div>

				{isStatic ? (
					/* reduced motion: a still render instead of the live scene (no scroll film, no WebGL) */
					// eslint-disable-next-line @next/next/no-img-element
					<img
						className={styles.staticCup}
						src={asset('/anatomy.webp')}
						alt={`${PRODUCT}: a champagne-titanium takeaway cup with a leather sleeve and a glowing Thermal Halo band, its lid flipped into a coaster`}
					/>
				) : (
					<div
						className={styles.gl}
						ref={glRef}
						role="img"
						aria-label="A champagne-titanium takeaway cup with a leather sleeve, a full-height smoked LEVO label and a glowing Thermal Halo band, its lid flipping into a coaster"
					>
						<SceneBoundary onFail={handleGlReady} fallback={asset('/anatomy.webp')} className={styles.fallback}>
							<LevoCanvas rig={rig} active={active} onReady={handleGlReady} />
						</SceneBoundary>
					</div>
				)}

				<Hud temp={temp} ref={hudRef} />

				<div className={`${styles.copy} ${styles.hero}`} ref={heroRef}>
					<div className={styles['hero-left']} ref={heroLeftRef}>
						<p className={`eyebrow ${styles.eyebrow}`}>{PRODUCT} · The AI-era cup</p>
							<h1>
								Made for lips.
								<br />
								<em>Built for Mondays.</em>
							</h1>
						</div>
						<div className={styles['hero-right']} ref={heroRightRef}>
							<p className={styles.lede}>
								Designed to lift, insulate and levitate in all the right ways. {PRODUCT} makes the simplest sip feel considered. The world’s most unnecessarily
								intelligent cup.
							</p>
							<div className={styles.actions}>
								<button className="btn btn--solid" type="button" onClick={play} aria-label="Play the story automatically">
									<span aria-hidden="true">▶</span> PLAY
								</button>
								<a className="btn btn--ghost" href="#reserve">
									Join waitlist
								</a>
							</div>
						</div>
					</div>

					{chapters.map((c, i) => (
					<article
						key={c.num}
						ref={(el) => (chapterRefs.current[i] = el)}
						className={`${styles.copy} ${styles.chapter} ${styles[c.side]}`}
					>
						<span className={styles.num}>{c.num}</span>
						<h2>{c.title}</h2>
						<p>{c.text}</p>
						{c.parts && (
							<ul className={styles.parts}>
								{c.parts.map((x, k) => (
									<li key={x}>
										<i>{String(k + 1).padStart(2, '0')}</i>
										{x}
									</li>
								))}
							</ul>
						)}
						<p className={styles.ad}>
							<b>{c.ad[0]}</b>
							<span>{c.ad[1]}</span>
						</p>
						{c.fine && <small className={styles.fine}>{c.fine}</small>}
					</article>
				))}

				<ol className={styles.rail} aria-hidden="true">
					{railLabels.map((l, i) => (
						<li key={l} className={railIndex === i ? styles.active : ''}>
							<i />
							<span>{l}</span>
						</li>
					))}
				</ol>
			</div>
		</section>
	);
}
