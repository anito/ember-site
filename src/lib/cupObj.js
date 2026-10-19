/** A small lathe-built takeaway cup as Wavefront OBJ text (the "open-weight model" download). Units: cm. */
const PROFILE = [
	[0, 0],
	[2.8, 0],
	[3.05, 0.25],
	[4.0, 12.2],
	[4.35, 12.6],
	[4.35, 13.0],
	[3.95, 13.0],
	[3.95, 12.4],
	[3.7, 12.4],
	[2.7, 0.5],
	[0, 0.5]
];

export function buildCupObj(segments = 64) {
	const lines = ['# Levo-1: open-weight cup model (fictional, parody)', '# 64-segment lathe, units in cm', 'o levo_1'];
	for (const [r, y] of PROFILE) {
		for (let s = 0; s < segments; s++) {
			const a = (s / segments) * Math.PI * 2;
			lines.push(`v ${(Math.cos(a) * r).toFixed(4)} ${y.toFixed(4)} ${(Math.sin(a) * r).toFixed(4)}`);
		}
	}
	for (let p = 0; p < PROFILE.length - 1; p++) {
		for (let s = 0; s < segments; s++) {
			const a = p * segments + s + 1;
			const b = p * segments + ((s + 1) % segments) + 1;
			const c = (p + 1) * segments + ((s + 1) % segments) + 1;
			const d = (p + 1) * segments + s + 1;
			lines.push(`f ${a} ${b} ${c} ${d}`);
		}
	}
	return lines.join('\n') + '\n';
}
