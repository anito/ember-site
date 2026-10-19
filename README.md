# Levo-1

A deadpan parody product page for **Levo-1, "the AI-era cup"**: unprecedented AI* breakthroughs, invented science with numbers, interactive mini-scenes and a fake research paper. Fictional: Levo-1 does not exist and nothing is for sale.

Inspired by [oryzo.ai](https://oryzo.ai/) by Lusion (not affiliated). Only that page's public HTML/text was read (see `docs/oryzo-notes.md`); the scroll choreography, scenes and copy here are original. The 3D cup, materials and lighting are carried over unchanged from `anito/cup-site` (v1).

Live (GitHub Pages): https://anito.github.io/ember-site/

## The page, top to bottom

1. **Pinned scroll story** (R3F cup, GSAP/Lenis, eight chapters): *Breakthrough\**, *Open-weight* (exploded view), *Rise above mediocrity* (lid flips into a coaster), *Handles extremes*, *Thermal Diffusion*, *Stitched* (macro), *Refuses the cloud* (lights out), *Pack*. The hero has a **PLAY** button that scrolls through the whole story by itself; any wheel/touch/key takes control back.
2. **Manifesto**, word-by-word scrub, and a marquee.
3. **Lab** (`src/components/lab/`):
   - *High five*: hover the hand, the AI finds a sixth finger.
   - *Chat* ("Hey @levo, can you…") plus a fake magazine cover.
   - *Thermal Diffusion Model*: a live 2D heat-diffusion sim; the "sampling temperature" (T = 10 / 1 / 0.1) controls noise and wobble.
   - *Circularity*: an "ORBIT" optimiser animates a wobbly outline to a perfect circle (0.708 to 1.000, "+41.2%").
   - *Smart flip encryption*: write on the lid, flip it (3D CSS), decode it.
   - *Grip*: a tilting table with real friction (`tan θ > μ`); μ = 0.80 on the Levo-1 coaster, 0.30 on an ordinary table.
   - *Drop test*: gravity, bounces, a tumble and dents in the floor.
   - *No cloud, no compute*: four stat tiles.
4. **Reviews** (invented people), **three models** (Levo-1 / Pro / Pro Max, stacked lids) with *Join waitlist*, a **fake paper** (abstract, peer review "trust me bro", BibTeX with a copy button, and a real **.OBJ download** generated in the browser), a waitlist form (nothing is sent) and a footer disclaimer.

The product name lives in `src/lib/site.js` (`BRAND`, `PRODUCT`).

## Stack

Next.js 16 (App Router, static export, CSS Modules), React Three Fiber / three, GSAP + ScrollTrigger, Lenis.

```bash
npm ci
npm run dev                       # http://localhost:3000
BASE_PATH=/ember-site npm run build   # static export to out/
npx serve out
```

## Hosting

`.github/workflows/pages.yml` builds with `BASE_PATH=/ember-site` and deploys `out/` to GitHub Pages on every push to `main` or `master`. In the repo settings, **Pages → Source** must be **GitHub Actions**.

## Notes

- `reduce` motion: the pin and the 3D scene are replaced by a still render and a stacked layout.
- `src/app/studio/` + `scripts/capture-stills.mjs` regenerate the stills in `public/` from the live scene (see the comments there). The stills are from v1 and show the cup, not copy.
- `blender/build_levo.py` is the original Blender source of the cup (not used by the page).
- `docs/oryzo-notes.md` is the copy deck read from oryzo.ai (text only; the motion was never seen).
