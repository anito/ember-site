'use client';

import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import { ACESFilmicToneMapping, PlaneGeometry, CircleGeometry } from 'three';
import { cupBody, haloShell, lipGlow, sleeve as sleeveGeometry, lidBody, lidRing, sipSlot, drinkDisc, LID } from './geometry.js';
import { createMaterials } from './materials.js';
import Workshop, { blobTexture } from './Workshop.jsx';

const TARGET_Y = 0.5; // the point the camera looks at (centre of the cup + coaster)
const CAM_DIST = 5.2;
const HOVER = 0.34;
const UNITS_ACROSS = 2.2; // world units spanned by the square the frames used to fill

/* the lid's journey (rig.lidT 0 -> 1): lift off, slide clear of the cup, flip while it descends,
   then slide in underneath as the coaster. The same curve runs backwards to put it back on. */
const SIDE = 1.25;
const LIFT = 0.55;
/* the key light is created in the canvas root; the scene animates it through this shared ref */
const sunRef = { current: null };
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const sm = (a, b, x) => {
	const t = clamp01((x - a) / (b - a));
	return t * t * (3 - 2 * t);
};

function Levo({ rig, onReady }) {
	const group = useRef();
	const cup = useRef();
	const lid = useRef();
	const sleeveRef = useRef();
	const desk = useRef();
	const cupShadow = useRef();
	const lidMesh = useRef();
	const decals = useRef();
	const { camera, size } = useThree();

	const mats = useMemo(() => createMaterials(), []);
	const body = useMemo(() => cupBody(), []);
	const geo = useMemo(
		() => ({
			shells: [haloShell(body.points, 0.012), haloShell(body.points, 0.03)],
			lip: lipGlow(0.416, 0.03),
			sleeve: sleeveGeometry(),
			lid: lidBody(),
			ringA: lidRing(0.3, 0.011),
			ringB: lidRing(0.41, 0.006),
			slot: sipSlot(),
			vent: new CircleGeometry(0.011, 16).rotateX(-Math.PI / 2).translate(-0.24, 0.002, 0.09),
			mark: new PlaneGeometry(0.4, 0.06).rotateX(-Math.PI / 2).translate(0, 0.003, 0),
			glowPlane: new PlaneGeometry(1.8, 1.8).rotateX(-Math.PI / 2).translate(0, -0.006, 0),
			drink: drinkDisc()
		}),
		[body]
	);

	const readyRef = useRef(false);
	useEffect(
		() => () => {
			Object.values(geo).flat().forEach((g) => g.dispose?.());
			body.geometry.dispose();
		},
		[geo, body]
	);

	useFrame((state) => {
		const t = state.clock.elapsedTime;
		const cupEl = rig.cupEl;
		if (!cupEl) return;

		// the DOM wrapper is the layout driver (GSAP moves/scales it); follow its box
		const S = cupEl.offsetWidth || 1;
		const unitPx = S / UNITS_ACROSS;
		const stage = state.gl.domElement.getBoundingClientRect();
		const r = cupEl.getBoundingClientRect();
		const dx = (r.left + r.width / 2 - (stage.left + stage.width / 2)) / unitPx;
		const dy = -(r.top + r.height / 2 - (stage.top + stage.height / 2)) / unitPx;
		const k = r.width / S;

		// keep world scale fixed: the visible world height follows the canvas height
		const fov = (2 * Math.atan(size.height / unitPx / 2 / CAM_DIST) * 180) / Math.PI;
		if (Math.abs(camera.fov - fov) > 0.01) {
			camera.fov = fov;
			camera.updateProjectionMatrix();
		}

		const phase = (((rig.frame / 72) % 1) + 1) % 1;
		// topT: 1 = looking straight down at the workshop desk, 0 = the side view of the levitating cup
		const topT = clamp01(rig.topT ?? 0);
		const ease = topT * topT * (3 - 2 * topT);
		const elSide = ((19 + 11 * Math.sin(2 * Math.PI * phase)) * Math.PI) / 180;
		const elBase = rig.elev !== undefined ? (rig.elev * Math.PI) / 180 : elSide;
		const el = elBase + ((86 * Math.PI) / 180 - elBase) * ease;
		camera.position.set(0, TARGET_Y + CAM_DIST * Math.sin(el), CAM_DIST * Math.cos(el));
		camera.lookAt(0, TARGET_Y, 0);

		/* sealed (cup + lid stacked, centred ~0.43 higher) -> coaster mode */
		const T = clamp01(rig.lidT ?? 0);
		const shift = -0.43 * (1 - sm(0.3, 1, T));
		const macro = sm(0, 1, clamp01(rig.macro ?? 0));
		const s = k * (1 - 0.1 * ease) * (1 + 1.7 * macro); // zoomed out over the desk, or in on the stitching
		const pivot = TARGET_Y + (0.68 - TARGET_Y) * macro;
		group.current.scale.setScalar(s);
		group.current.position.set(dx, dy + pivot * (1 - s) + shift * s, 0);

		// the desk drops away as the camera tilts
		const away = sm(0.15, 1, 1 - topT);
		desk.current.position.y = -9 * away;
		desk.current.visible = away < 0.99;

		const idle = rig.reduce ? 0 : 0.012 * Math.sin(t * 1.4);
		const lift = sm(0.1, 0.9, 1 - topT);
		const cupY = 0.07 + (HOVER + 0.035 * Math.sin(2 * Math.PI * phase) + idle - 0.07) * lift;
		const cupRot = (-20 * Math.PI) / 180 - (rig.frame / 72) * 2 * Math.PI + (rig.mouse || 0);
		cup.current.position.y = cupY;
		cup.current.rotation.y = cupRot;

		// lid pose along its path
		const lidLift = sm(0, 0.22, T);
		const side = sm(0.22, 0.5, T);
		const down = sm(0.5, 0.85, T);
		const back = sm(0.85, 1, T);
		const seatY = cupY + LID.seat;
		const flip = sm(0.3, 0.8, T);
		const expl = sm(0, 1, clamp01(rig.expl ?? 0));
		lid.current.position.set(SIDE * side * (1 - back), (seatY + LIFT * lidLift) * (1 - down) + 0.82 * expl, 0);
		// exploded view: the sleeve floats up and turns slowly, the lid hovers above it
		sleeveRef.current.position.y = 0.4 * expl;
		sleeveRef.current.rotation.y = 0.9 * expl;
		// yaw follows the cup while seated; the coaster is rotationally symmetric, so it just lets go
		lid.current.rotation.set(Math.PI * flip, cupRot * (1 - sm(0.18, 0.4, T)), 0.35 * Math.sin(Math.PI * sm(0.2, 0.85, T)), 'YXZ');

		// contact shadow under the cup: only while it rests on the desk
		cupShadow.current.material.opacity = 0.18 * (1 - lift);
		cupShadow.current.visible = lift < 0.99;

		// the lid deforms: capping lid (skirt + plug over the rim) -> flat coaster slab as it flips and lands
		const morph = sm(0.45, 0.85, T);
		const lm = lidMesh.current;
		if (!lm.morphTargetInfluences) lm.updateMorphTargets(); // R3F assigns the geometry after construction
		lm.morphTargetInfluences[0] = morph;
		decals.current.position.y = LID.deckCap + (LID.deckFlat - LID.deckCap) * morph;
		// the stitched ring runs along the flange: r = 0.452 on the capping lid, 0.53 on the flat coaster
		const ls = mats.lid.userData.shader;
		if (ls) ls.uniforms.uRing.value = 0.452 + 0.078 * morph;

		// light: the halo sleeps while the lid is on; the coaster's rings wake as it lands
		const halo = 0.3 + 0.7 * sm(0.3, 1, T);
		const dockOn = sm(0.82, 1, T);
		mats.halo.color.setScalar(halo);
		mats.haloGlow[0].opacity = 0.12 * halo;
		mats.haloGlow[1].opacity = 0.06 * halo;
		mats.lipGlow.opacity = 0.12 * halo;
		mats.ring.color.set(0x4fd2ff).multiplyScalar(0.12 + 0.88 * dockOn);
		mats.dockGlow.opacity = 0.9 * dockOn;

		// night mode: the room goes dark, the halo and rings take over
		const night = sm(0, 1, clamp01(rig.night ?? 0));
		state.gl.toneMappingExposure = 0.88 * (1 - 0.8 * night);
		if (sunRef.current) sunRef.current.intensity = 2.8 * (1 - 0.95 * night);
		mats.halo.color.setScalar(halo * (1 + 1.4 * night));
		mats.haloGlow[0].opacity = (0.12 + 0.3 * night) * halo;
		mats.haloGlow[1].opacity = (0.06 + 0.22 * night) * halo;
		mats.lipGlow.opacity = (0.12 + 0.28 * night) * halo;

		if (!readyRef.current) {
			readyRef.current = true;
			requestAnimationFrame(() => onReady?.());
		}
	});

	return (
		<group ref={group}>
			<Workshop ref={desk} />
			<mesh ref={cupShadow} position={[0.04, 0.008, 0.06]} rotation={[-Math.PI / 2, 0, 0]} renderOrder={2}>
				<planeGeometry args={[1.5, 1.5]} />
				<meshBasicMaterial map={blobTexture()} transparent depthWrite={false} toneMapped={false} />
			</mesh>
			{/* the lid; flipped, it is the coaster */}
			<group ref={lid}>
				<mesh
					ref={(m) => {
						lidMesh.current = m;
						// R3F assigns the geometry after construction; build the morph influences before the first render
						if (m && !m.morphTargetInfluences) m.updateMorphTargets();
					}}
					geometry={geo.lid} material={mats.lid} castShadow receiveShadow />
				<group ref={decals}>
					<mesh geometry={geo.slot} material={mats.slot} />
					<mesh geometry={geo.vent} material={mats.slot} />
					<mesh geometry={geo.mark} material={mats.lidMark} renderOrder={4} />
				</group>
				<mesh geometry={geo.ringA} material={mats.ring} />
				<mesh geometry={geo.ringB} material={mats.ring} />
				<mesh geometry={geo.glowPlane} material={mats.dockGlow} renderOrder={2} />
			</group>

			{/* the cup */}
			<group ref={cup}>
				<mesh geometry={body.geometry} material={[mats.shell, mats.liner, mats.halo]} castShadow receiveShadow />
				<group ref={sleeveRef}>
					<mesh geometry={geo.sleeve} material={mats.sleeve} castShadow receiveShadow />
				</group>
				<mesh geometry={geo.drink} material={mats.drink} />
				<mesh geometry={geo.shells[0]} material={mats.haloGlow[0]} renderOrder={3} />
				<mesh geometry={geo.shells[1]} material={mats.haloGlow[1]} renderOrder={3} />
				<mesh geometry={geo.lip} material={mats.lipGlow} renderOrder={3} />
			</group>
		</group>
	);
}

function Studio() {
	/* a photo-studio "room" of lightformers: a huge soft ceiling box, tall strip boxes left and right for
	   long metal highlights, a front fill, cyan/violet kickers behind, and a warm bounce from the floor */
	return (
		<Environment resolution={512} frames={1} environmentIntensity={1.0}>
			<color attach="background" args={['#030405']} />
			<Lightformer form="rect" intensity={2.6} position={[0, 7, 0]} scale={[9, 9, 1]} target={[0, 0, 0]} />
			<Lightformer form="rect" intensity={3.2} color="#fff4e6" position={[-6, 2, 3]} scale={[2.2, 10, 1]} target={[0, 0.5, 0]} />
			<Lightformer form="rect" intensity={2.4} color="#eaf3ff" position={[6, 2, 3.5]} scale={[2.2, 10, 1]} target={[0, 0.5, 0]} />
			<Lightformer form="rect" intensity={1.8} color="#fff7ee" position={[0, 1.5, 8]} scale={[8, 5, 1]} target={[0, 0.5, 0]} />
			<Lightformer form="rect" intensity={1.6} color="#4fc8ff" position={[6, 2, -6]} scale={[1.6, 9, 1]} target={[0, 0.5, 0]} />
			<Lightformer form="rect" intensity={1.4} color="#a07bff" position={[-6, 2, -6]} scale={[1.6, 9, 1]} target={[0, 0.5, 0]} />
			<Lightformer form="rect" intensity={1.4} color="#ffd9b0" position={[0, -3, 2]} rotation-x={Math.PI / 2} scale={[14, 10, 1]} target={[0, 0, 0]} />
		</Environment>
	);
}

export default function LevoCanvas({ rig, active = true, onReady }) {
	return (
		<Canvas
			onCreated={({ gl }) => {
				gl.toneMapping = ACESFilmicToneMapping;
				gl.toneMappingExposure = 0.88;
				requestAnimationFrame(() => onReady?.());
			}}
			shadows="soft"
			dpr={[1, 2]}
			frameloop={active ? 'always' : 'demand'}
			gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
			camera={{ fov: 24, near: 0.1, far: 60, position: [0, 1.5, 5.2] }}
			style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
		>
			<Studio />
			<hemisphereLight args={['#dfe9ff', '#3a322c', 0.3]} />
			<directionalLight
				ref={(l) => (sunRef.current = l)}
				position={[-3.4, 4.2, 1.6]}
				intensity={2.8}
				color="#fff1de"
				castShadow
				shadow-mapSize={[1024, 1024]}
				shadow-radius={5}
				shadow-bias={-0.0004}
				shadow-camera-left={-3.2}
				shadow-camera-right={3.2}
				shadow-camera-top={3.2}
				shadow-camera-bottom={-3.2}
				shadow-camera-near={1}
				shadow-camera-far={12}
			/>
			<Levo rig={rig} onReady={onReady} />
		</Canvas>
	);
}
