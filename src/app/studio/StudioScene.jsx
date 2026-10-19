'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';

const LevoCanvas = dynamic(() => import('@/lib/three/LevoCanvas'), { ssr: false });

/* query: f = turn (0..72), lid = 0 (lid on) .. 1 (coaster), el = camera elevation in degrees, size = px */
export default function StudioScene() {
	const boxRef = useRef(null);
	const [rig, setRig] = useState(null);

	useEffect(() => {
		const q = new URLSearchParams(location.search);
		const num = (k, d) => (q.has(k) ? parseFloat(q.get(k)) : d);
		document.documentElement.style.background = 'transparent';
		document.body.style.background = 'transparent';
		setRig({
			frame: num('f', 0),
			mouse: 0,
			lidT: num('lid', 1),
			topT: num('top', 0),
			elev: q.has('el') ? num('el', 20) : undefined,
			reduce: true, // no idle bobbing: captures must be deterministic
			cupEl: boxRef.current,
			size: num('size', 1000)
		});
	}, []);

	const size = rig?.size ?? 1000;
	return (
		<div ref={boxRef} style={{ position: 'fixed', left: 0, top: 0, width: size, height: size }}>
			{rig && <LevoCanvas rig={rig} active onReady={() => setTimeout(() => (document.body.dataset.ready = '1'), 2500)} />}
		</div>
	);
}
