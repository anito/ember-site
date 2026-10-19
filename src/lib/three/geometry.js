/* Parametric Levo geometry: a JS port of blender/build_levo.py (same profile numbers),
   so the live scene and the Blender source stay in step. y is up; the front (towards the camera) is +z
   and the front of the cup (towards the camera) is +z. */
import {
	BufferGeometry,
	CanvasTexture,
	CapsuleGeometry,
	Color,
	Float32BufferAttribute,
	LinearSRGBColorSpace,
	SRGBColorSpace,
	TorusGeometry
} from 'three';

export const PRINT = {
	// taller than the cup (y 0.04 .. 1.01): the strip's top and bottom edges are never visible
	y0: -0.03,
	y1: 1.07,
	arc: 0.34,
	center: (-70 * Math.PI) / 180
};

/* (r, y) of the cup wall (a straight takeaway-cup cone): foot centre -> up the outside -> over the lip -> down the inside */
const PROFILE = [
	[0.0, 0.04],
	[0.28, 0.04],
	[0.318, 0.078], // rounded base corner
	[0.338, 0.24],
	[0.334, 0.262], // halo groove (follows the cone)
	[0.355, 0.43],
	[0.364, 0.452],
	[0.428, 0.965],
	[0.432, 0.985],
	[0.416, 1.012], // lip
	[0.399, 0.985],
	[0.386, 0.94],
	[0.296, 0.2],
	[0.0, 0.15]
];
/* material slot per edge: 0 titanium shell, 1 steel liner, 2 halo glow */
const EDGE_SLOT = [0, 0, 0, 0, 2, 0, 0, 0, 2, 2, 1, 1, 1];

export function chaikin(points, labels, passes) {
	for (let k = 0; k < passes; k++) {
		const n = points.length;
		const seq = [[points[0], null]];
		for (let i = 0; i < n - 1; i++) {
			const p = points[i];
			const q = points[i + 1];
			const lab = labels[i];
			const qq = [0.75 * p[0] + 0.25 * q[0], 0.75 * p[1] + 0.25 * q[1]];
			const rr = [0.25 * p[0] + 0.75 * q[0], 0.25 * p[1] + 0.75 * q[1]];
			const last = i === n - 2;
			if (i > 0) seq.push([qq, lab]);
			seq.push(last ? [q, lab] : [rr, lab]);
		}
		points = seq.map((s) => s[0]);
		labels = seq.slice(1).map((s) => s[1]);
	}
	return { points, labels };
}

/* CanvasRenderingContext2D.roundRect is missing in older Safari; a plain-arcs fallback */
if (typeof CanvasRenderingContext2D !== 'undefined' && !CanvasRenderingContext2D.prototype.roundRect) {
	CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, r) {
		const rr = Math.min(typeof r === 'number' ? r : (r && r[0]) || 0, w / 2, h / 2);
		this.moveTo(x + rr, y);
		this.arcTo(x + w, y, x + w, y + h, rr);
		this.arcTo(x + w, y + h, x, y + h, rr);
		this.arcTo(x, y + h, x, y, rr);
		this.arcTo(x, y, x + w, y, rr);
		this.closePath();
	};
}

/* angle -> colour along the Halo band: cyan at angle 0 (+x) to amber on the far side */
const RAMP = [
	[0.0, [0.0, 0.62, 1.0]],
	[0.35, [0.25, 0.3, 1.0]],
	[0.65, [1.0, 0.3, 0.45]],
	[1.0, [1.0, 0.62, 0.1]]
];
export function haloColor(t, out = [0, 0, 0]) {
	for (let i = 1; i < RAMP.length; i++) {
		if (t <= RAMP[i][0]) {
			const [t0, c0] = RAMP[i - 1];
			const [t1, c1] = RAMP[i];
			const k = (t - t0) / (t1 - t0);
			for (let j = 0; j < 3; j++) out[j] = c0[j] + (c1[j] - c0[j]) * k;
			return out;
		}
	}
	out[0] = 1; out[1] = 0.62; out[2] = 0.1;
	return out;
}
const azimuth = (x, z) => Math.atan2(-z, x); // matches Blender's atan2(y, x) with y = -z

/** Lathe a (r, y) profile into an indexed mesh with smooth profile normals, one group per slot. */
export function latheProfile(profile, edgeSlots, { segments = 256, passes = 3, colors = false, normV = false } = {}) {
	const { points, labels } = chaikin(profile, edgeSlots, passes);
	const n = points.length;

	// per-point normals from the neighbouring profile edges (outward = (dy, -dr))
	const edgeN = [];
	for (let i = 0; i < n - 1; i++) {
		const dr = points[i + 1][0] - points[i][0];
		const dy = points[i + 1][1] - points[i][1];
		const l = Math.hypot(dr, dy) || 1;
		edgeN.push([dy / l, -dr / l]);
	}
	const ptN = points.map((_, i) => {
		const a = edgeN[Math.max(0, i - 1)];
		const b = edgeN[Math.min(n - 2, i)];
		const x = a[0] + b[0];
		const y = a[1] + b[1];
		const l = Math.hypot(x, y) || 1;
		return [x / l, y / l];
	});

	const pos = [];
	const nor = [];
	const uv = [];
	const col = [];
	const ring = []; // vertex index of ring i, segment j
	let arc = 0;
	const v = [0];
	for (let i = 1; i < n; i++) {
		arc += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
		v.push(arc);
	}
	const c = [0, 0, 0];
	for (let i = 0; i < n; i++) {
		const [r, y] = points[i];
		const [nr, ny] = ptN[i];
		ring.push([]);
		for (let j = 0; j <= segments; j++) {
			const a = (j / segments) * Math.PI * 2;
			const ca = Math.cos(a);
			const sa = Math.sin(a);
			pos.push(r * ca, y, -r * sa);
			nor.push(nr * ca, ny, -nr * sa);
			uv.push(j / segments, normV ? v[i] / arc : v[i] * 6);
			if (colors) {
				haloColor(Math.abs(azimuth(r * ca, -r * sa)) / Math.PI, c);
				col.push(c[0], c[1], c[2]);
			}
			ring[i].push(i * (segments + 1) + j);
		}
	}

	const buckets = new Map();
	for (let i = 0; i < n - 1; i++) {
		const s = labels[i];
		if (!buckets.has(s)) buckets.set(s, []);
		const idx = buckets.get(s);
		for (let j = 0; j < segments; j++) {
			const a = ring[i][j];
			const b = ring[i][j + 1];
			const c2 = ring[i + 1][j + 1];
			const d = ring[i + 1][j];
			idx.push(a, b, d, b, c2, d); // outward-facing for the profile direction used above
		}
	}
	const g = new BufferGeometry();
	g.setAttribute('position', new Float32BufferAttribute(pos, 3));
	g.setAttribute('normal', new Float32BufferAttribute(nor, 3));
	g.setAttribute('uv', new Float32BufferAttribute(uv, 2));
	if (colors) g.setAttribute('color', new Float32BufferAttribute(col, 3));
	const index = [];
	[...buckets.keys()].sort().forEach((slot) => {
		const start = index.length;
		for (const v of buckets.get(slot)) index.push(v); // (spreading a large array overflows the call stack)
		g.addGroup(start, index.length - start, slot);
	});
	g.setIndex(index);
	return { geometry: g, points };
}

export const cupBody = () => latheProfile(PROFILE, EDGE_SLOT, { segments: 256, colors: true });

/** Outward-offset shells around the Halo groove, for the additive glow. */
export function haloShell(points, offset) {
	const sel = [];
	for (let i = 0; i < points.length; i++) {
		const [r, y] = points[i];
		if (y > 0.19 && y < 0.5 && r > 0.3 && i < points.length * 0.6) sel.push([r + offset, y]);
	}
	const { geometry } = latheProfile(sel, new Array(sel.length - 1).fill(0), { segments: 192, passes: 0, colors: true, normV: true });
	return geometry;
}

export function lipGlow(radius, tube) {
	const g = new TorusGeometry(radius, tube, 10, 192);
	g.rotateX(Math.PI / 2);
	g.translate(0, 1.004, 0);
	const pos = g.attributes.position;
	const col = [];
	const c = [0, 0, 0];
	for (let i = 0; i < pos.count; i++) {
		haloColor(Math.abs(azimuth(pos.getX(i), pos.getZ(i))) / Math.PI, c);
		col.push(c[0], c[1], c[2]);
	}
	g.setAttribute('color', new Float32BufferAttribute(col, 3));
	return g;
}

/* One-piece leather sleeve with rolled edges, hugging the upper body above the Halo groove. */
export const SLEEVE = {
	thickness: 0.024,
	y0: 0.49,
	y1: 0.87,
	wallSlope: 0.1236, // the cup wall is a straight cone: r = r0 + slope * (y - 0.078)
	wallR0: 0.318
};

export function sleeve() {
	const rAt = (y) => SLEEVE.wallR0 + SLEEVE.wallSlope * (y - 0.078);
	const n = 12;
	const ys = Array.from({ length: n + 1 }, (_, i) => SLEEVE.y0 + ((SLEEVE.y1 - SLEEVE.y0) * i) / n);
	const inner = ys.map((y) => [rAt(y) + 0.0015, y]);
	const outer = ys.map((y) => [rAt(y) + SLEEVE.thickness, y]);
	const profile = [inner[0], outer[0], ...outer.slice(1), inner[n], ...inner.slice(0, -1).reverse()];
	return latheProfile(profile, new Array(profile.length - 1).fill(0), { segments: 256, passes: 2 }).geometry;
}

/* The lid is also the coaster, and it deforms between the two. Both shapes share one topology so
   they can be blended with a morph target (influence 0 = capping lid, 1 = flat coaster slab).
   y = 0 is the contact plane: the lid's roof rests on the cup's lip, its skirt wraps the outside
   of the rim and its plug sits just inside the mouth; as a coaster that face becomes the flat top. */
const LID_CAP = [
	[0.0, 0.0],
	[0.2, 0.0],
	[0.35, 0.0],
	[0.366, -0.02], // plug ring (inside the cup mouth)
	[0.366, -0.05],
	[0.382, -0.05],
	[0.382, -0.004],
	[0.434, 0.0], // roof over the lip
	[0.437, -0.02], // skirt inner wall, hugging the outside of the rim
	[0.437, -0.046],
	[0.452, -0.052],
	[0.471, -0.03],
	[0.475, 0.012], // skirt outer wall rising into the flange
	[0.468, 0.04],
	[0.44, 0.052],
	[0.405, 0.07], // raised plateau
	[0.395, 0.13],
	[0.378, 0.148],
	[0.33, 0.148],
	[0.318, 0.134], // recessed sip deck
	[0.0, 0.134]
];
const LID_FLAT = [
	[0.0, 0.0],
	[0.2, 0.0],
	[0.35, 0.0],
	[0.39, 0.0],
	[0.43, 0.0],
	[0.47, 0.0],
	[0.5, 0.0],
	[0.53, 0.002],
	[0.555, 0.01],
	[0.57, 0.025],
	[0.575, 0.045], // rounded slab edge
	[0.568, 0.06],
	[0.545, 0.07],
	[0.5, 0.07],
	[0.44, 0.07],
	[0.4, 0.07],
	[0.39, 0.07],
	[0.37, 0.07],
	[0.33, 0.07],
	[0.32, 0.062], // shallow recess on the back
	[0.0, 0.062]
];
const LID_SLOTS = new Array(LID_CAP.length - 1).fill(0);

export const LID = { seat: 1.012, deckCap: 0.134, deckFlat: 0.062 };

export function lidBody() {
	const cap = latheProfile(LID_CAP, LID_SLOTS, { segments: 256, passes: 2 }).geometry;
	const flat = latheProfile(LID_FLAT, LID_SLOTS, { segments: 256, passes: 2 }).geometry;
	cap.morphAttributes.position = [flat.attributes.position];
	cap.morphAttributes.normal = [flat.attributes.normal];
	cap.morphTargetsRelative = false;
	return cap;
}

/** Glow rings on the underside (they face up once the lid is flipped into a coaster). */
export function lidRing(radius, tube) {
	const g = new TorusGeometry(radius, tube, 12, 192);
	g.rotateX(Math.PI / 2);
	g.translate(0, -0.003, 0);
	return g;
}

/** Sip slot cut into the plateau edge (a dark capsule lying on the sip deck). */
export function sipSlot() {
	const g = new CapsuleGeometry(0.02, 0.09, 4, 14);
	g.rotateX(Math.PI / 2); // along z (tangent at +x)
	g.scale(1, 0.12, 1);
	g.translate(0.29, 0.001, 0);
	return g;
}

export function drinkDisc() {
	return latheProfile(
		[[0.362, 0.765], [0, 0.765]], [0], { segments: 128, passes: 0 }
	).geometry;
}

/* ───────── textures ───────── */

/** The label: alpha 1 on the smoked strip, 0 where the letters are knocked out (reads bottom to top). */
export function labelTexture(w = 618, h = 2000) {
	const cap = 455, stroke = 80, gap = 86;
	const widths = { L: 330, E: 330, V: 400, O: 370 };
	const word = 'LEVO';
	const total = [...word].reduce((s, c) => s + widths[c], 0) + gap * (word.length - 1);

	const cv = document.createElement('canvas');
	cv.width = w;
	cv.height = h;
	const ctx = cv.getContext('2d');
	ctx.fillStyle = '#fff';
	ctx.fillRect(20, 0, w - 40, h); // runs off both ends of the texture (and past both ends of the cup)

	ctx.save();
	ctx.globalCompositeOperation = 'destination-out';
	ctx.translate(w / 2, h / 2);
	ctx.rotate(-Math.PI / 2);
	ctx.translate(-total / 2, -cap / 2);
	drawWord(ctx, word, widths, cap, stroke, gap);
	ctx.restore();

	const t = new CanvasTexture(cv);
	t.colorSpace = LinearSRGBColorSpace;
	t.anisotropy = 8;
	return t;
}

/** Geometric letterforms shared by the label and the sleeve wordmark. */
function drawWord(ctx, word, widths, cap, stroke, gap) {
	let x = 0;
	for (const c of word) {
		const cw = widths[c];
		ctx.beginPath();
		if (c === 'L') {
			ctx.rect(x, 0, stroke, cap);
			ctx.rect(x, cap - stroke, cw, stroke);
		} else if (c === 'E') {
			ctx.rect(x, 0, stroke, cap);
			for (const y0 of [0, (cap - stroke) / 2, cap - stroke]) ctx.rect(x, y0, cw, stroke);
		} else if (c === 'V') {
			const k = stroke * 1.25;
			ctx.moveTo(x, 0);
			ctx.lineTo(x + k, 0);
			ctx.lineTo(x + cw / 2, cap * 0.78);
			ctx.lineTo(x + cw - k, 0);
			ctx.lineTo(x + cw, 0);
			ctx.lineTo(x + cw / 2 + k / 2, cap);
			ctx.lineTo(x + cw / 2 - k / 2, cap);
			ctx.closePath();
		} else if (c === 'O') {
			ctx.roundRect(x, 0, cw, cap, cw / 2);
			ctx.roundRect(x + stroke, stroke, cw - 2 * stroke, cap - 2 * stroke, Math.max(1, cw / 2 - stroke));
		}
		ctx.fill(c === 'O' ? 'evenodd' : 'nonzero');
		x += cw + gap;
	}
}

/* debossed wordmark + ring logo on the back of the sleeve (opposite the label) */
export const BRAND = { arc: 0.5, y: 0.58, height: 0.075 };

export function brandTexture() {
	const w = 1200, h = 180;
	const cv = document.createElement('canvas');
	cv.width = w;
	cv.height = h;
	const ctx = cv.getContext('2d');
	ctx.fillStyle = '#fff';
	const cap = 84, stroke = 17, gap = 26;
	const widths = { L: 66, E: 66, V: 82, O: 74 };
	const word = 'LEVO';
	const total = [...word].reduce((s, c) => s + widths[c], 0) + gap * (word.length - 1);
	const logo = 84;
	const full = logo + 44 + total;
	ctx.translate((w - full) / 2, (h - cap) / 2);
	// ring logo: a circle, an offset arc and a dot (echoes the Thermal Halo)
	ctx.save();
	ctx.strokeStyle = '#fff';
	ctx.lineWidth = 9;
	ctx.beginPath();
	ctx.arc(logo / 2, cap / 2, logo / 2 - 5, 0, Math.PI * 2);
	ctx.stroke();
	ctx.beginPath();
	ctx.arc(logo / 2, cap / 2, logo / 2 - 5, -Math.PI / 2, Math.PI / 2);
	ctx.lineWidth = 17;
	ctx.stroke();
	ctx.beginPath();
	ctx.arc(logo / 2, cap / 2, 9, 0, Math.PI * 2);
	ctx.fill();
	ctx.restore();
	ctx.translate(logo + 44, 0);
	drawWord(ctx, word, widths, cap, stroke, gap);
	const t = new CanvasTexture(cv);
	t.colorSpace = LinearSRGBColorSpace;
	t.anisotropy = 8;
	return t;
}

/** Fine lathe lines for the bump map (variation along v only). */
export function latheLinesTexture() {
	const cv = document.createElement('canvas');
	cv.width = 4;
	cv.height = 512;
	const ctx = cv.getContext('2d');
	for (let y = 0; y < 512; y++) {
		const g = 128 + Math.random() * 127;
		ctx.fillStyle = `rgb(${g},${g},${g})`;
		ctx.fillRect(0, y, 4, 1);
	}
	const t = new CanvasTexture(cv);
	t.wrapS = t.wrapT = 1000; // RepeatWrapping
	return t;
}

/** A flat 4x4 bump map: it only enables the bump pipeline (perturbNormalArb); the leather relief itself comes
    from smooth multi-octave noise in the shader, at scales a screen can actually resolve. */
export function leatherGrainTexture() {
	const cv = document.createElement('canvas');
	cv.width = cv.height = 4;
	const ctx = cv.getContext('2d');
	ctx.fillStyle = '#808080';
	ctx.fillRect(0, 0, 4, 4);
	return new CanvasTexture(cv);
}

/** Soft concentric rings for the dock glow plane (additive). */
export function dockGlowTexture() {
	const s = 1024;
	const cv = document.createElement('canvas');
	cv.width = cv.height = s;
	const ctx = cv.getContext('2d');
	const unit = s / 1.8; // plane is 1.8 world units wide
	ctx.strokeStyle = '#33b8ff';
	for (const [r, wid, blur, alpha] of [
		[0.3, 0.02, 0.07, 0.9],
		[0.41, 0.012, 0.06, 0.8],
		[0.36, 0.2, 0.2, 0.14]
	]) {
		ctx.save();
		ctx.shadowColor = '#33b8ff';
		ctx.shadowBlur = blur * unit;
		ctx.globalAlpha = alpha;
		ctx.lineWidth = wid * unit;
		ctx.beginPath();
		ctx.arc(s / 2, s / 2, r * unit, 0, Math.PI * 2);
		ctx.stroke();
		ctx.restore();
	}
	const t = new CanvasTexture(cv);
	t.colorSpace = SRGBColorSpace;
	return t;
}

export function verticalGlowTexture() {
	const cv = document.createElement('canvas');
	cv.width = 4;
	cv.height = 128;
	const ctx = cv.getContext('2d');
	const g = ctx.createLinearGradient(0, 0, 0, 128);
	g.addColorStop(0, '#000');
	g.addColorStop(0.5, '#fff');
	g.addColorStop(1, '#000');
	ctx.fillStyle = g;
	ctx.fillRect(0, 0, 4, 128);
	return new CanvasTexture(cv);
}

export const linear = (r, g, b) => new Color().setRGB(r, g, b, LinearSRGBColorSpace);
