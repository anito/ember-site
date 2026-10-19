'use client';

import { useEffect, useRef } from 'react';
import styles from './Steam.module.css';

/**
 * Subtle full-bleed smoke, rendered by a tiny WebGL fragment shader.
 * - flow speed follows scroll velocity through a damped follower, so the steam keeps
 *   drifting (and slowly settles) after the scroll stops: inertia, not a hard link
 * - scroll position adds a slow parallax offset
 * - the pointer pushes the smoke around; its influence also decays smoothly
 * - tint follows the --accent custom property of the parent (the chapter colour)
 */
const VERT = `attribute vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }`;
const FRAG = `
precision mediump float;
uniform vec2 uRes;
uniform float uFlow;
uniform float uScroll;
uniform vec2 uMouse;
uniform float uPush;
uniform vec3 uColor;
uniform float uIntensity;

float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p){
	vec2 i = floor(p), f = fract(p);
	f = f * f * (3.0 - 2.0 * f);
	return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
	           mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}
float fbm(vec2 p){
	float v = 0.0, a = 0.5;
	for (int i = 0; i < 5; i++){ v += a * noise(p); p = p * 2.02 + vec2(17.3, 9.1); a *= 0.5; }
	return v;
}
void main(){
	vec2 uv = gl_FragCoord.xy / uRes;
	float asp = uRes.x / uRes.y;
	vec2 p = vec2(uv.x * asp, uv.y) * 1.5;
	vec2 m = vec2(uMouse.x * asp, uMouse.y) * 1.5;
	float inf = exp(-dot(p - m, p - m) * 2.4) * uPush;
	p.y += uScroll * 0.3;
	vec2 flow = vec2(0.0, -uFlow);
	vec2 q = vec2(fbm(p + flow * 0.9), fbm(p + flow * 0.9 + vec2(5.2, 1.3)));
	vec2 r = vec2(fbm(p + 3.0 * q + flow * 0.6 + vec2(1.7, 9.2) + (p - m) * inf * 0.7),
	              fbm(p + 3.0 * q + flow * 0.6 + vec2(8.3, 2.8)));
	float f = fbm(p + 3.5 * r + flow * 0.4);
	float dens = smoothstep(0.40, 0.95, f) * (0.55 + 0.45 * q.x);
	dens *= 0.35 + 0.65 * smoothstep(0.95, 0.0, uv.y);
	dens += inf * 0.22 * f;
	float a = clamp(dens * uIntensity, 0.0, 1.0);
	gl_FragColor = vec4(uColor * a, a);
}`;

const parseColor = (s) => {
	s = (s || '').trim();
	if (s.startsWith('#')) {
		const h = s.length === 4 ? [...s.slice(1)].map((c) => c + c).join('') : s.slice(1);
		return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
	}
	const m = s.match(/[\d.]+/g);
	return m && m.length >= 3 ? m.slice(0, 3).map((v) => +v / 255) : [0.25, 0.82, 1];
};

export default function Steam({ intensity = 0.2, fixed = false, skip = () => false }) {
	const canvasRef = useRef(null);
	const opts = useRef({ intensity, skip });
	opts.current = { intensity, skip };

	useEffect(() => {
		const canvas = canvasRef.current;
		const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: false });
		if (!gl) return;
		const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

		const sh = (type, src) => {
			const s = gl.createShader(type);
			gl.shaderSource(s, src);
			gl.compileShader(s);
			return s;
		};
		const prog = gl.createProgram();
		gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
		gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
		gl.linkProgram(prog);
		if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
		gl.useProgram(prog);
		gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
		const loc = gl.getAttribLocation(prog, 'a');
		gl.enableVertexAttribArray(loc);
		gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
		gl.enable(gl.BLEND);
		gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
		const U = Object.fromEntries(
			['uRes', 'uFlow', 'uScroll', 'uMouse', 'uPush', 'uColor', 'uIntensity'].map((n) => [n, gl.getUniformLocation(prog, n)])
		);

		const scale = 0.5; // the smoke is soft; half resolution is plenty
		const resize = () => {
			const w = Math.max(2, Math.round(canvas.clientWidth * scale));
			const h = Math.max(2, Math.round(canvas.clientHeight * scale));
			if (canvas.width !== w || canvas.height !== h) {
				canvas.width = w;
				canvas.height = h;
				gl.viewport(0, 0, w, h);
			}
		};

		const host = fixed ? document.documentElement : canvas.parentElement;
		let flow = 0;
		let vel = 0; // damped scroll velocity (screens / second)
		let lastY = scrollY;
		let lastT = performance.now();
		const mouse = { x: 0.5, y: 0.3, tx: 0.5, ty: 0.3, push: 0 };
		let colorTick = 0;
		let color = parseColor(getComputedStyle(host).getPropertyValue('--accent'));
		let raf = 0;

		const onMove = (e) => {
			mouse.tx = e.clientX / innerWidth;
			mouse.ty = 1 - e.clientY / innerHeight;
		};
		addEventListener('pointermove', onMove, { passive: true });

		const frame = (now) => {
			raf = requestAnimationFrame(frame);
			const dt = Math.min(0.05, (now - lastT) / 1000 || 0.016);
			lastT = now;
			const y = scrollY;
			if (document.hidden || opts.current.skip()) {
				lastY = y;
				return;
			}
			resize();

			// inertia: follow the raw scroll velocity with a ~0.5s time constant
			const raw = (y - lastY) / dt / innerHeight;
			lastY = y;
			vel += (raw - vel) * (1 - Math.exp(-dt / 0.5));
			flow += (0.04 + vel * 0.3) * dt;

			// pointer follows with lag; its push decays when the pointer rests
			const px = mouse.x, py = mouse.y;
			mouse.x += (mouse.tx - mouse.x) * (1 - Math.exp(-dt / 0.18));
			mouse.y += (mouse.ty - mouse.y) * (1 - Math.exp(-dt / 0.18));
			const speed = Math.hypot(mouse.x - px, mouse.y - py) / dt;
			mouse.push += (Math.min(1, speed * 0.9) - mouse.push) * (1 - Math.exp(-dt / 0.6));

			if (colorTick++ % 8 === 0) color = parseColor(getComputedStyle(host).getPropertyValue('--accent'));

			gl.uniform2f(U.uRes, canvas.width, canvas.height);
			gl.uniform1f(U.uFlow, flow);
			gl.uniform1f(U.uScroll, y / innerHeight);
			gl.uniform2f(U.uMouse, mouse.x, mouse.y);
			gl.uniform1f(U.uPush, mouse.push);
			gl.uniform3f(U.uColor, color[0], color[1], color[2]);
			gl.uniform1f(U.uIntensity, opts.current.intensity);
			gl.clearColor(0, 0, 0, 0);
			gl.clear(gl.COLOR_BUFFER_BIT);
			gl.drawArrays(gl.TRIANGLES, 0, 3);
			if (reduce) cancelAnimationFrame(raf);
		};
		raf = requestAnimationFrame(frame);

		return () => {
			cancelAnimationFrame(raf);
			removeEventListener('pointermove', onMove);
			gl.getExtension('WEBGL_lose_context')?.loseContext();
		};
	}, [fixed]);

	return <canvas ref={canvasRef} className={`${styles.canvas} ${fixed ? styles.fixed : ''}`} aria-hidden="true" />;
}
