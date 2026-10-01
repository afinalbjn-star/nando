# AGENTS.md — remotion

Remotion 4 (React 18, TypeScript) video compositions. One repo, one GitHub workflow,
one git remote that actually works.

## Hard rule: preview first, render only on command

**Never trigger a full video render, and never add/keep a `push:` trigger, until the
user explicitly asks for it.** Creating or changing a composition is a *preview* task.

1. Build/change the composition.
2. Typecheck it: `npx tsc --noEmit` and confirm no errors mention the new files.
   Pre-existing errors in `src/Root.tsx` (duplicate `LiquidChrome`, missing
   `LiquidChromeScheme`) and `src/components/index.ts` (duplicate `PolyScheme`) plus the
   tuple errors in `TriMesh.tsx` are known and out of scope.
3. Render **stills**, not video, and show them to the user:
   `npx remotion still src/index.tsx <id> <out.png> --frame=<n> --scale=0.5`
4. For loops, also render the seam frames and measure the seam:
   frames `448`, `449`, `0` (450-frame loop), then diff `448->449` against `449->0`.
   The seam delta must be no larger than a normal frame step.
5. Stop and wait for the user's go-ahead. Only then commit, push, and run the workflow.

The Remotion Studio (`npm start`, http://localhost:3000) is the interactive preview.

## Compositions

All are 3840x2160, 30 fps, `durationInFrames = DURATION + 1` (451 frames, 15.0 s).
`durationInFrames` being one frame longer than the animation period is what makes the
loop seamless: frame 450 renders identically to frame 0, so the last frame is a hold.

| id | file | theme |
|----|------|-------|
| Globe, GlobeArcs, GlobeNight, GlobeHolo, GlobeOrbit | `src/components/Globe*.tsx` | globe variants |
| AmericaSignal | `AmericaSignal.tsx` + `geo.ts` | neon signal map |
| DigitalStage | `DigitalStage.tsx` | digital music stage visualiser |

## Seamless loop rules

Every animated value must be a periodic function of `u = frame / totalFrames` with an
**integer** number of cycles, otherwise the loop point pops. Concretely:

- Drive everything from `osc(k, phase) = sin(2π(k·u + phase))` with integer `k`.
- Envelopes that must be zero at the loop point: `smoothstep(0, a, u) * (1 - smoothstep(1-b, 1, u))`.
- Scrolling backgrounds: a repeating pattern of period `P`, advanced by exactly `k·P` per
  loop, and every sub-pattern period (dashes, etc.) must divide `P`.
- Beat grids must be phase-offset by half a beat, otherwise the attack lands on `u=0`
  and the previous frame has no build-up.
- Particles: integer life cycles `(u*k + phase) % 1`; never a fractional speed.
- Grain: deterministic, never `Math.random()`; offset by `round(u*N) % N`.

## Loading external art

If a composition loads art asynchronously (fetch, `staticFile`), hold the render with
`delayRender`/`continueRender` until it resolves, otherwise early frames render without
it. Cache the parsed result module-wide so it happens once per render, not per frame.

Do not derive a bounding box by scanning coordinate pairs out of SVG path data: that
overshoots, because it treats arc radii as coordinates and misses bezier control points.
Use a bezier/arc-aware parser, or measure the art in a browser and hardcode the result.

## GitHub Actions

`.github/workflows/render.yml`, named `Render`, is the **only** workflow. Manual trigger
only. It renders all compositions as parallel matrix jobs (one run entry in the Actions
list, not one per composition) and encodes each to a 100-300 MB MP4.

Size control: ProRes HQ intermediate, then two-pass x264 with the bitrate derived from
the real duration (`TARGET_MB * 8 * 1000 / duration` in kbps), a 100-300 MB guard, and up
to 3 attempts that rescale the bitrate. ProRes HQ is 10-bit, so `-pix_fmt yuv420p` must
be set on **both** x264 passes or the second pass fails with
`different bitdepth setting than first pass`.

## Git

The `origin` remote (`afinalfirnando-source/remotion-grid`) no longer exists and pushes
fail with `Repository not found`. **Push to `nando`** (`afinalbjn-star/nando`) with
`git push nando main`. `gh run cancel` returns 403 on that repo, so a bad run cannot be
cancelled and has to be left to finish.
