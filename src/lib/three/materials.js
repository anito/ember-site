import {
	AdditiveBlending,
	MeshBasicMaterial,
	MeshPhysicalMaterial,
	DoubleSide
} from 'three';
import {
	BRAND,
	PRINT,
	SLEEVE,
	brandTexture,
	labelTexture,
	latheLinesTexture,
	leatherGrainTexture,
	dockGlowTexture,
	verticalGlowTexture,
	linear
} from './geometry.js';

/* shared GLSL: map a local (object-space) position onto the label, so the label stays
   a constant width on the tapered body and has no UV seam */
const LABEL_DECL = /* glsl */ `
varying vec3 vLocal;
uniform sampler2D uLabel;
float labelAlpha(vec3 p){
	float a = atan(-p.z, p.x) - ${PRINT.center.toFixed(6)};
	a -= 6.283185307 * floor((a + 3.141592654) / 6.283185307);
	float u = a * length(p.xz) / ${PRINT.arc.toFixed(5)} + 0.5;
	float v = (p.y - ${PRINT.y0.toFixed(5)}) / ${(PRINT.y1 - PRINT.y0).toFixed(5)};
	// the label only spans about +-0.6 rad; masking the rest hides the mip-selection glitch at the atan wrap
	return texture2D(uLabel, vec2(u, v)).a * step(abs(a), 1.2);
}
/*LABEL_END*/
`;

/* leather finishing: cellular full-grain pebbling, patina, and twisted-thread saddle stitching */
const LEATHER_DECL = /* glsl */ `
const float STITCH_PITCH = 0.026;
float h31(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float vnoise(vec3 x){
	vec3 i = floor(x), f = fract(x);
	f = f * f * (3.0 - 2.0 * f);
	return mix(mix(mix(h31(i), h31(i + vec3(1,0,0)), f.x), mix(h31(i + vec3(0,1,0)), h31(i + vec3(1,1,0)), f.x), f.y),
	           mix(mix(h31(i + vec3(0,0,1)), h31(i + vec3(1,0,1)), f.x), mix(h31(i + vec3(0,1,1)), h31(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float fbm3(vec3 p){ return 0.5 * vnoise(p) + 0.3 * vnoise(p * 2.07) + 0.2 * vnoise(p * 4.1); }
vec3 h33(vec3 p){
	p = vec3(dot(p, vec3(127.1, 311.7, 74.7)), dot(p, vec3(269.5, 183.3, 246.1)), dot(p, vec3(113.5, 271.9, 124.6)));
	return fract(sin(p) * 43758.5453);
}
/* 3D cellular noise: x = F1, y = F2 (distances to the nearest / second nearest feature point), z = id of the nearest cell */
vec3 worley(vec3 x){
	vec3 i = floor(x), f = fract(x);
	float d1 = 8.0, d2 = 8.0, id = 0.0;
	for (int z = -1; z <= 1; z++) for (int y = -1; y <= 1; y++) for (int w = -1; w <= 1; w++){
		vec3 g = vec3(float(w), float(y), float(z));
		vec3 o = h33(i + g);
		vec3 r = g + 0.5 + 0.42 * (o - 0.5) - f;
		float d = dot(r, r);
		if (d < d1){ d2 = d1; d1 = d; id = o.x; } else if (d < d2){ d2 = d; }
	}
	return vec3(sqrt(d1), sqrt(d2), id);
}
float sdSeg(vec2 p, vec2 a, vec2 b){
	vec2 pa = p - a, ba = b - a;
	return length(pa - ba * clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0));
}
/* one saddle stitch per pitch along s, centred on the line t = c: a slanted, round, twisted thread
   that passes through two punched holes, lying in a pressed channel */
struct Stitch { float thread; float shade; float twist; float hole; float chan; float tint; };
Stitch stitchLine(float s, float t, float c){
	Stitch r;
	float sid = floor(s / STITCH_PITCH);
	float x = (fract(s / STITCH_PITCH) - 0.5) * STITCH_PITCH;
	float y = t - c;
	float L = 0.0102, slope = 0.30, R = 0.0027;
	vec2 a = vec2(-L, -slope * L), b = vec2(L, slope * L);
	vec2 dir = normalize(b - a);
	vec2 q = vec2(x, y) - a;
	float d = sdSeg(vec2(x, y), a, b);
	float side = q.x * dir.y - q.y * dir.x;                       // signed distance across the thread
	float along = dot(q, dir);
	r.thread = 1.0 - smoothstep(R * 0.72, R, d);
	r.shade = sqrt(max(0.0, 1.0 - (d * d) / (R * R)));            // round cross-section
	r.twist = 0.5 + 0.5 * sin((along + side * 1.6) * 1500.0);     // diagonal twist of the plied thread
	r.hole = max(1.0 - smoothstep(0.0011, 0.0020, length(vec2(x, y) - a)),
	             1.0 - smoothstep(0.0011, 0.0020, length(vec2(x, y) - b)));
	r.chan = 1.0 - smoothstep(0.0012, 0.0042, abs(y));
	r.tint = 0.88 + 0.24 * fract(sin(sid * 12.9898) * 43758.5453);
	return r;
}
Stitch stitchPick(Stitch a, Stitch b){
	Stitch r = a;
	if (b.thread > a.thread) r = b;
	r.hole = max(a.hole, b.hole);
	r.chan = max(a.chan, b.chan);
	return r;
}
/* the knocked-out letters of the cup's label (inside the strip), so the sleeve can stamp them */
float letterMask(vec3 p, float bias){
	float a = atan(-p.z, p.x) - ${PRINT.center.toFixed(6)};
	a -= 6.283185307 * floor((a + 3.141592654) / 6.283185307);
	float u = a * length(p.xz) / ${PRINT.arc.toFixed(5)} + 0.5;
	float v = (p.y - ${PRINT.y0.toFixed(5)}) / ${(PRINT.y1 - PRINT.y0).toFixed(5)};
	float inStrip = step(0.033, u) * step(u, 0.967);
	return (1.0 - texture2D(uLabel, vec2(u, v), bias).a) * inStrip * step(abs(a), 1.2);
}
`;

/* shared grain: darkens the creases, tints cells, and returns the relief height */
const GRAIN_FRAG = /* glsl */ `
	// fine matte nubuck-like grain: soft colour mottling and a very faint cellular wrinkle; the relief is the filtered bump map
	vec3 wk = worley(P * 70.0);
	float crease = 1.0 - smoothstep(0.0, 0.40, wk.y - wk.x);
	float dome = 1.0 - smoothstep(0.0, 0.8, wk.x);
	float fineN = vnoise(P * 150.0);
	float pn = fbm3(P * 14.0);
	diffuseColor.rgb *= (0.88 + 0.24 * pn) * (0.985 + 0.03 * wk.z) * (1.0 - 0.03 * crease) * (0.97 + 0.06 * fineN);
`;

function withLabel(material, tex, inject) {
	material.onBeforeCompile = (shader) => {
		shader.uniforms.uLabel = { value: tex };
		shader.vertexShader = shader.vertexShader
			.replace('#include <common>', '#include <common>\nvarying vec3 vLocal;')
			.replace('#include <displacementmap_vertex>', '#include <displacementmap_vertex>\nvLocal = transformed;');
		shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\n' + LABEL_DECL);
		inject(shader);
	};
	material.customProgramCacheKey = () => 'levo-label-' + inject.name;
	return material;
}

export function createMaterials() {
	const label = labelTexture();
	const lines = latheLinesTexture();

	/* anodised champagne titanium; the smoked label is matte black and barely reflective */
	const shell = withLabel(
		new MeshPhysicalMaterial({
			color: linear(0.43, 0.39, 0.33),
			metalness: 0.58,
			roughness: 0.47,
			anisotropy: 0,
			bumpMap: lines,
			bumpScale: 0.12,
			envMapIntensity: 0.8
		}),
		label,
		function shellInject(shader) {
			shader.fragmentShader = shader.fragmentShader
				.replace(
					'#include <color_fragment>',
					`#include <color_fragment>
					float lab = labelAlpha(vLocal) * 0.93;
					diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.004, 0.005, 0.008), lab);`
				)
				.replace(
					'#include <roughnessmap_fragment>',
					'#include <roughnessmap_fragment>\nroughnessFactor = mix(roughnessFactor, 0.5, lab);'
				)
				.replace(
					'#include <metalnessmap_fragment>',
					'#include <metalnessmap_fragment>\nmetalnessFactor *= (1.0 - lab);'
				);
		}
	);

	const liner = new MeshPhysicalMaterial({
		color: linear(0.34, 0.35, 0.38),
		metalness: 0.75,
		roughness: 0.5,
		envMapIntensity: 0.5
	});

	/* the Halo: emissive, dimmed (not hidden) by the label so the ring reads through it */
	const halo = withLabel(
		new MeshBasicMaterial({ vertexColors: true, toneMapped: false }),
		label,
		function haloInject(shader) {
			shader.fragmentShader = shader.fragmentShader.replace(
				'#include <color_fragment>',
				`#include <color_fragment>
				diffuseColor.rgb *= 0.8 * (1.0 - 0.66 * labelAlpha(vLocal));`
			);
		}
	);

	/* hand-finished cognac full-grain leather. The sleeve stamps the cup's lettering into the leather where
	   it covers the label, with saddle stitching along both edges and up the seam, burnished rolled edges,
	   patina mottling and the brand debossed on the back. */
	const brand = brandTexture();
	const leatherParams = (repeat) => ({
		color: linear(0.3, 0.095, 0.026),
		roughness: 0.4,
		metalness: 0,
		clearcoat: 0.45,
		clearcoatRoughness: 0.3,
		sheen: 0.12,
		sheenRoughness: 0.5,
		sheenColor: linear(0.5, 0.24, 0.1),
		bumpMap: leatherGrainTexture(),
		bumpScale: 0,
		envMapIntensity: 1.1
	});
	const NORMAL_BUMP = `
		normal = perturbNormalArb( - vViewPosition, normal, vec2( dFdx( hgt ), dFdy( hgt ) ) * 3.4, faceDirection );`;
	const THREAD = 'vec3(0.64, 0.42, 0.24)';

	/* hand-finished full-grain leather. The sleeve stamps the cup's lettering into the leather where it
	   covers the label, saddle-stitched along both edges and up the seam, with burnished rolled edges
	   and the brand debossed on the back. */
	const sleeve = withLabel(
		new MeshPhysicalMaterial(leatherParams([21, 1.4])),
		label,
		function sleeveInject(shader) {
			shader.uniforms.uBrand = { value: brand };
			shader.fragmentShader = shader.fragmentShader
				.replace(
					'/*LABEL_END*/',
					`uniform sampler2D uBrand;
					${LEATHER_DECL}
					float brandAlpha(vec3 p){
						float a = atan(-p.z, p.x) - ${(PRINT.center + Math.PI).toFixed(6)};
						a -= 6.283185307 * floor((a + 3.141592654) / 6.283185307);
						float u = a * length(p.xz) / ${BRAND.arc.toFixed(3)} + 0.5;
						float v = (p.y - ${BRAND.y.toFixed(3)}) / ${BRAND.height.toFixed(3)} + 0.5;
						return texture2D(uBrand, vec2(u, v)).a * step(abs(a), 1.0);
					}`
				)
				.replace(
					'#include <color_fragment>',
					`#include <color_fragment>
					vec3 P = vLocal;
					float rad = length(P.xz);
					float arcLen = atan(-P.z, P.x) * rad;                 // signed arc length from the seam (angle 0)
					${GRAIN_FRAG}
					float edge = smoothstep(0.0, 0.009, min(P.y - ${SLEEVE.y0}, ${SLEEVE.y1} - P.y));
					diffuseColor.rgb *= mix(0.5, 1.0, edge);               // burnished, darker rolled edges

					float stamp = letterMask(P, 0.0);                      // the cup's lettering, stamped into the leather
					float stampSoft = letterMask(P, 1.8);                  // blurred copy: soft bevelled walls for the relief
					diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.66, 0.54, 0.46), stamp);   // warm, compressed (darker) floor

					// saddle stitching: a row along each edge and a double row up the seam
					float yTop = ${(SLEEVE.y1 - 0.026).toFixed(4)};
					float yBot = ${(SLEEVE.y0 + 0.026).toFixed(4)};
					Stitch s1 = stitchPick(stitchLine(arcLen, P.y, yTop), stitchLine(arcLen, P.y, yBot));
					Stitch s2 = stitchPick(stitchLine(P.y, arcLen, 0.0115), stitchLine(P.y, arcLen, -0.0115));
					Stitch st = stitchPick(s1, s2);
					float seamLine = 1.0 - smoothstep(0.0005, 0.0017, abs(arcLen));
					diffuseColor.rgb *= 1.0 - 0.36 * st.chan - 0.4 * seamLine;
					diffuseColor.rgb *= 1.0 - 0.7 * st.hole;
					vec3 threadCol = ${THREAD} * st.tint * (0.6 + 0.42 * st.twist) * (0.52 + 0.45 * st.shade);
					diffuseColor.rgb = mix(diffuseColor.rgb, threadCol, st.thread);
					float br = brandAlpha(P);
					diffuseColor.rgb *= 1.0 - 0.7 * br;

					// relief: pebbles and creases, stamped letters pressed in, round raised thread, sunk holes
					float hgt = 0.3 * (fbm3(P * 14.0) - 0.5) + 0.07 * (fbm3(P * 40.0) - 0.5)
						- 2.4 * stampSoft + 1.1 * st.thread * st.shade - 0.9 * st.hole - 0.65 * st.chan - 0.4 * seamLine
						- 0.8 * br - 0.5 * (1.0 - edge);`
				)
				.replace(
					'#include <roughnessmap_fragment>',
					`#include <roughnessmap_fragment>
					roughnessFactor = 0.4 + 0.07 * crease - 0.04 * dome;                  // smooth, slightly glossy grain
					roughnessFactor = mix(roughnessFactor, 0.26, max(stamp, 1.0 - edge));    // compressed / burnished
					roughnessFactor = mix(roughnessFactor, 0.78, st.thread);                  // matte waxed thread`
				)
				.replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>' + NORMAL_BUMP);
		}
	);

	const drink = new MeshPhysicalMaterial({
		color: linear(0.02, 0.012, 0.01),
		roughness: 0.04,
		clearcoat: 1,
		clearcoatRoughness: 0.03
	});

	/* the lid: the same hand-finished leather; a double stitched ring follows the flange as it deforms */
	const lid = withLabel(
		new MeshPhysicalMaterial(leatherParams([26, 1.4])),
		label,
		function lidInject(shader) {
			shader.uniforms.uRing = { value: 0.452 };
			lid.userData.shader = shader;
			shader.fragmentShader = shader.fragmentShader
				.replace('/*LABEL_END*/', `uniform float uRing;\n${LEATHER_DECL}`)
				.replace(
					'#include <color_fragment>',
					`#include <color_fragment>
					vec3 P = vLocal;
					float rad = length(P.xz);
					float arcLen = atan(-P.z, P.x) * rad;
					${GRAIN_FRAG}
					Stitch st = stitchPick(stitchLine(arcLen, rad, uRing), stitchLine(arcLen, rad, uRing - 0.03));
					diffuseColor.rgb *= 1.0 - 0.28 * st.chan;
					diffuseColor.rgb *= 1.0 - 0.7 * st.hole;
					vec3 threadCol = ${THREAD} * st.tint * (0.6 + 0.42 * st.twist) * (0.52 + 0.45 * st.shade);
					diffuseColor.rgb = mix(diffuseColor.rgb, threadCol, st.thread);
					float hgt = 0.3 * (fbm3(P * 14.0) - 0.5) + 0.07 * (fbm3(P * 40.0) - 0.5) + 1.1 * st.thread * st.shade - 0.9 * st.hole - 0.65 * st.chan;`
				)
				.replace(
					'#include <roughnessmap_fragment>',
					`#include <roughnessmap_fragment>
					roughnessFactor = 0.4 + 0.07 * crease - 0.04 * dome;
					roughnessFactor = mix(roughnessFactor, 0.8, st.thread);`
				)
				.replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>' + NORMAL_BUMP);
		}
	);
	const slot = new MeshBasicMaterial({ color: 0x020304 });
	/* champagne foil mark on the sip deck */
	const lidMark = new MeshBasicMaterial({
		map: brandTexture(),
		transparent: true,
		color: 0xe0b98a,
		toneMapped: false,
		depthWrite: false,
		opacity: 0.95
	});

	const ring = new MeshBasicMaterial({ color: 0x4fd2ff, toneMapped: false });

	const additive = (opacity, extra = {}) =>
		new MeshBasicMaterial({
			vertexColors: true,
			transparent: true,
			blending: AdditiveBlending,
			depthWrite: false,
			toneMapped: false,
			opacity,
			...extra
		});
	const haloGlow = [
		additive(0.12, { alphaMap: verticalGlowTexture(), side: DoubleSide }),
		additive(0.06, { alphaMap: verticalGlowTexture(), side: DoubleSide })
	];
	const lipGlow = additive(0.12);
	const dockGlow = new MeshBasicMaterial({
		map: dockGlowTexture(),
		transparent: true,
		blending: AdditiveBlending,
		depthWrite: false,
		toneMapped: false,
		opacity: 0.9
	});

	return { shell, liner, halo, sleeve, drink, lid, slot, lidMark, ring, haloGlow, lipGlow, dockGlow };
}
