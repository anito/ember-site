/* Capture the website's stills from the live 3D scene (the /studio route), with a transparent background,
   so they use exactly the same materials and lighting as the hero.

   Usage:  npx next build && npx serve out -l 4175 &   # or any static server on out/
           node scripts/capture-stills.mjs http://localhost:4175 ./out-stills
   Needs playwright-core and a Chromium (set CHROMIUM=/path/to/chromium). */
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';

const [base = 'http://localhost:4175', outDir = './out-stills'] = process.argv.slice(2);
mkdirSync(outDir, { recursive: true });

const shots = [
	{ name: 'anatomy', query: 'f=2&lid=1&el=24' },
	{ name: 'reserve', query: 'f=8&lid=0&el=18' }
];

const browser = await chromium.launch({
	executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium',
	args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist']
});
for (const s of shots) {
	const page = await browser.newPage({ viewport: { width: 1000, height: 1000 }, deviceScaleFactor: 2 });
	await page.goto(`${base}/studio/?${s.query}`, { waitUntil: 'load' });
	await page.waitForSelector('body[data-ready="1"]', { state: 'attached', timeout: 180000 });
	await page.waitForTimeout(3000);
	await page.screenshot({ path: `${outDir}/${s.name}.png`, omitBackground: true, timeout: 180000 });
	console.log('captured', s.name);
	await page.close();
}
await browser.close();
