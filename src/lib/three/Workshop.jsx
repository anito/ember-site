'use client';

import { useMemo } from 'react';
import { MeshReflectorMaterial } from '@react-three/drei';
import { BoxGeometry, CanvasTexture, PlaneGeometry, RepeatWrapping, SRGBColorSpace } from 'three';

/* The opening pad: a dark gray cutting mat the cup rests on, seen from above. The mat top is y = 0
   and one unit is about 10 cm. Procedural (a canvas texture), so there is nothing to download. */

const rnd = (a, b) => a + Math.random() * (b - a);

/* placement from the layout sketch (units; screen right = +x, screen down = +z) */
const PAD = { rot: 0.42, x: 2.0, z: -2.05 };
const MAT_W = 5;
const MAT_D = 4;

function matTexture() {
	const PX = 480; // pixels per unit (1 unit ~ 10 cm, so 1 cm = 48 px)
	const cv = document.createElement('canvas');
	cv.width = MAT_W * PX;
	cv.height = MAT_D * PX;
	const c = cv.getContext('2d');
	c.fillStyle = '#2b2e33';
	c.fillRect(0, 0, cv.width, cv.height);
	for (let i = 0; i < 60000; i++) {
		c.fillStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : '0,0,0'},${rnd(0.01, 0.04)})`;
		c.fillRect(rnd(0, cv.width), rnd(0, cv.height), rnd(1, 3), rnd(1, 3));
	}
	const H = cv.height;
	const line = (x0, y0, x1, y1, a, wd) => {
		c.strokeStyle = `rgba(245,247,250,${a})`;
		c.lineWidth = wd;
		c.beginPath();
		c.moveTo(x0, y0);
		c.lineTo(x1, y1);
		c.stroke();
	};
	// grid in cm: fine every 1, strong every 5, strongest every 10 (vertical lines up from the bottom edge)
	const cmW = Math.round(MAT_W * 10);
	const cmD = Math.round(MAT_D * 10);
	for (let i = 0; i <= cmW; i++) {
		const x = (i / 10) * PX;
		const t = i % 10 === 0 ? [0.95, 3.6] : i % 5 === 0 ? [0.75, 2.6] : [0.34, 1.4];
		line(x, 0, x, H, t[0], t[1]);
	}
	for (let j = 0; j <= cmD; j++) {
		const y = H - (j / 10) * PX;
		const t = j % 10 === 0 ? [0.95, 3.6] : j % 5 === 0 ? [0.75, 2.6] : [0.34, 1.4];
		line(0, y, cv.width, y, t[0], t[1]);
	}
	// angle fan from the bottom-left corner (15, 30, 45, 60, 75 degrees), like the reference mat
	const ox = 0.3 * PX;
	const oy = H - 0.3 * PX;
	c.font = `${Math.round(PX * 0.07)}px sans-serif`;
	c.fillStyle = 'rgba(245,247,250,0.8)';
	for (const deg of [15, 30, 45, 60, 75]) {
		const r = (deg * Math.PI) / 180;
		const len = 5.6 * PX;
		line(ox, oy, ox + Math.cos(r) * len, oy - Math.sin(r) * len, 0.65, 1.8);
		const lx = ox + Math.cos(r) * (3.7 * PX);
		const ly = oy - Math.sin(r) * (3.7 * PX);
		c.fillText(`${deg}°`, lx, ly);
	}
	// numbers along the bottom and left edges, every 1 cm line that is a multiple of 5
	c.font = `${Math.round(PX * 0.075)}px sans-serif`;
	c.fillStyle = 'rgba(245,247,250,0.9)';
	for (let i = 5; i < cmW; i += 5) c.fillText(String(i), (i / 10) * PX - 14, H - 0.07 * PX);
	for (let j = 5; j < cmD; j += 5) c.fillText(String(j), 0.06 * PX, H - (j / 10) * PX + 8);
	// printed border
	c.strokeStyle = 'rgba(245,247,250,0.9)';
	c.lineWidth = 4;
	c.strokeRect(0.17 * PX, 0.17 * PX, cv.width - 0.34 * PX, H - 0.34 * PX);
	// brand box in the lower-right corner
	c.fillStyle = 'rgba(245,247,250,0.9)';
	c.font = `bold ${Math.round(PX * 0.16)}px sans-serif`;
	c.fillText('LEVO', cv.width - 1.9 * PX, H - 0.55 * PX);
	c.font = `${Math.round(PX * 0.07)}px sans-serif`;
	c.fillText('Cutting Mat  500 x 400 mm', cv.width - 1.9 * PX, H - 0.36 * PX);
	// soft window-light sheen and vignette
	const sheen = c.createLinearGradient(cv.width * 0.05, H * 0.85, cv.width * 0.75, H * 0.05);
	sheen.addColorStop(0.3, 'rgba(255,255,255,0)');
	sheen.addColorStop(0.5, 'rgba(255,255,255,0.1)');
	sheen.addColorStop(0.7, 'rgba(255,255,255,0)');
	c.fillStyle = sheen;
	c.fillRect(0, 0, cv.width, H);
	const t = new CanvasTexture(cv);
	t.colorSpace = SRGBColorSpace;
	t.anisotropy = 16;
	t.generateMipmaps = true;
	return t;
}

/* roughness map: a smooth glossy base with fine scratches, cut marks and soft smudges (white = rougher) */
function matRoughness() {
	const cv = document.createElement('canvas');
	cv.width = 1024;
	cv.height = Math.round((1024 * MAT_D) / MAT_W);
	const c = cv.getContext('2d');
	c.fillStyle = '#6a6a6a';
	c.fillRect(0, 0, cv.width, cv.height);
	for (let i = 0; i < 90; i++) {
		const x = rnd(0, cv.width);
		const y = rnd(0, cv.height);
		const r = rnd(30, 140);
		const g = c.createRadialGradient(x, y, 0, x, y, r);
		g.addColorStop(0, `rgba(255,255,255,${rnd(0.05, 0.16)})`);
		g.addColorStop(1, 'rgba(255,255,255,0)');
		c.fillStyle = g;
		c.fillRect(x - r, y - r, r * 2, r * 2);
	}
	c.lineCap = 'round';
	for (let i = 0; i < 260; i++) {
		const x = rnd(0, cv.width);
		const y = rnd(0, cv.height);
		const a = rnd(0, Math.PI);
		const len = rnd(10, 90);
		c.strokeStyle = `rgba(255,255,255,${rnd(0.03, 0.14)})`;
		c.lineWidth = rnd(0.4, 1.0);
		c.beginPath();
		c.moveTo(x, y);
		c.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
		c.stroke();
	}
	const t = new CanvasTexture(cv);
	t.wrapS = t.wrapT = RepeatWrapping;
	t.anisotropy = 8;
	return t;
}

let blobTex;
export function blobTexture() {
	if (!blobTex) {
		const cv = document.createElement('canvas');
		cv.width = cv.height = 128;
		const c = cv.getContext('2d');
		const g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
		g.addColorStop(0, 'rgba(0,0,0,0.7)');
		g.addColorStop(0.55, 'rgba(0,0,0,0.3)');
		g.addColorStop(1, 'rgba(0,0,0,0)');
		c.fillStyle = g;
		c.fillRect(0, 0, 128, 128);
		blobTex = new CanvasTexture(cv);
	}
	return blobTex;
}

export default function Workshop({ ref }) {
	const map = useMemo(() => matTexture(), []);
	const rough = useMemo(() => matRoughness(), []);
	const box = useMemo(() => new BoxGeometry(MAT_W, 0.07, MAT_D), []);
	const plane = useMemo(() => new PlaneGeometry(MAT_W, MAT_D), []);
	return (
		<group ref={ref}>
			{/* rotated pad: its bottom-left corner sits just down-right of the cup, the rest runs off the top and right edges */}
			<group position={[PAD.x, 0, PAD.z]} rotation={[0, PAD.rot, 0]}>
				{/* the thick body of the mat (also shows as its edge) */}
				<mesh geometry={box} position={[0, -0.03, 0]} receiveShadow>
					<meshStandardMaterial color="#17181b" roughness={0.85} />
				</mesh>
				{/* the printed, glossy top: a planar mirror (blurred by the scratch map) plus the grid texture */}
				<mesh geometry={plane} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.0065, 0]} receiveShadow>
					<MeshReflectorMaterial
						map={map}
						roughnessMap={rough}
						roughness={1}
						metalness={0}
						color="#d0d3d8"
						blur={[360, 90]}
						resolution={512}
						mixBlur={1.4}
						mixStrength={2.4}
						mixContrast={1.1}
						mirror={0.8}
						depthScale={0.7}
						minDepthThreshold={0.3}
						maxDepthThreshold={1.5}
						envMapIntensity={0.8}
					/>
				</mesh>
			</group>
		</group>
	);
}
