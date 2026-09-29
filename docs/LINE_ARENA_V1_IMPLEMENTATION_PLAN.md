# Line Arena V1 implementation plan

**Goal:** Deliver the approved local React/TypeScript/Canvas game in `LINE_ARENA_V1_DESIGN.md`.

**Architecture:** Keep a deterministic, fixed-step simulation in `src/game` with no React imports. A Canvas renderer reads simulation state; React owns setup, editor, battle shell, and results. IndexedDB stores optimized custom portraits; localStorage stores small preferences.

1. **Project shell and test harness.** Create Vite React/TS setup and Vitest scripts. Verify a production build and test runner.
2. **Simulation, test first.** Add types and seeded match creation; circular movement and wall bounce; boundary anchors and contact fans; swept fighter-body/line intersection; immediate elimination and ranking; fighter bounce; final-duel prediction and global slow-motion resolution. Use deterministic RNG injection. Run focused tests after each rule milestone.
3. **Canvas game presentation.** Draw portrait-safe arena, dynamic lines, fighter portraits, glow, particles, and transient events. Run a fixed-step `requestAnimationFrame` controller; publish only low-frequency HUD/phase snapshots to React.
4. **Creator flow.** Build 2–6 fighter collection selection and color controls; custom image upload with pan/zoom circular crop, neon color extraction, IndexedDB persistence, and fallbacks. Add VS/countdown, recording mode, winner/ranking, and rematch/new battle/setup controls.
5. **Sound and quality.** Add generated Web Audio event sounds with persistent mute/volume. Check narrow phone, portrait phone, desktop, 2- and 6-fighter matches, custom portrait, rematch, slow motion, and match duration. Fix observed issues.
6. **Release verification.** Run the full unit/UI suite and production build; manually exercise browser flows; report commands, results, architecture choices, and remaining tuning.

**Rule gates:** Only initialization seeds lines; only wall contact adds more. Only opponent body intersection removes them. Fighter collisions are physical only. Zero lines eliminates immediately. Final two imminent last-line intersection slows the whole simulation before resolution.

## Gameplay-feel pass — September 2026

### Diagnosis and implementation plan

Classified the low-energy periods as **movement**, **line density**, and **feedback** problems. The previous 20% opening boost decayed over eight seconds, glancing body collisions could almost stop a fighter, and initial radial paths repeatedly converged in the center. A fixed 27-line seed left very large empty sectors with fewer fighters. Most subsequent wall bounces restored only one line. Break particles appeared at the owner instead of the crossing, while small consecutive cuts rarely produced visible batch feedback.

The implementation sequence was: measure seeded 2–6-fighter distributions and event gaps; test physics/contact changes before implementation; tune movement and boundary replenishment together; improve spatial visual/audio feedback; verify full matches and portrait presentation. Trials using speed and a seven-line wall cluster alone increased interaction frequency but shortened rounds. Filling the existing starting sectors and varying the initial heading solved the early mass-cull problem more effectively.

### Implemented tuning

| Parameter | Previous | Current |
|---|---|---|
| Base movement, arena radii/s | 0.29 | 0.38 |
| Effective nominal opening movement | 0.348, declining to 0.29 | 0.38, sustained |
| Post-bounce movement bounds | None | 0.32–0.46 before escalation |
| Starting radius | 0.55 ± 0.04 | 0.72 ± 0.04 |
| Initial heading | Mostly radial, ±0.6 radians | Random clockwise/counterclockwise, 1.0–1.35 radians from radial |
| Wall angular variation | ±0.08 radians | ±0.21 radians; at least 0.28 inward component |
| Seeded fan per fighter, 2/3/4/5/6 | 27 each | 115/75/55/43/35, equal within a match, separated by small gaps |
| Distant/first wall contact | One anchor | Seven-anchor local cluster (9° between endpoints) |
| Nearby contact arc threshold | 26 anchors | 26 anchors, unchanged |
| Progressive pace | +0.012/s after 20s, cap 1.65× | +0.012/s after 12s, additional +0.016/s after 40s, cap 1.9× |
| Decisive slow motion | 0.22× for 0.85 real seconds | Unchanged |

Only physical boundary contact replenishes lines after initialization. Contact recovery during a reserved finishing sequence is preserved. Bounces only change physical motion; crossing enemy lines gives the attacker nothing. Separating overlapping bodies are still corrected but no longer generate another impact cue.

### Presentation and architecture

Retained the industrial arena and selected fighter colors. Added short color trails, rim-contact pulses, sparks, retracting line fragments, accumulated local count feedback, clearer sparse final lines, low-line HUD emphasis, and a crossing marker during the finishing sequence. Dense fans use restrained opacity. Effects have explicit limits: 180 particles, 32 shock rings, 28 fragments, and eight local labels. The Canvas backing resolution follows the displayed stage and device pixel ratio, capped at 1080×1920, and rebuilds correctly on resize. Static background and boundary geometry are cached; static intro/countdown Canvas frames are reused, and the animation loop stops at settled results. React still receives snapshots only about every 90ms.

Audio batches creation/break counts over 70ms, adds generated metallic transients, scales cut feedback with batch size, and distinguishes entering the duel and the slow-motion rise. No external assets, services, or new game systems were added.

### Verification results

The duration harness runs 24 deterministic seeds for each fighter count (120 complete matches). Durations below are real active simulation time from FIGHT through elimination, including finishing slow motion, excluding intro/countdown/winner reveal.

| Fighters | Minimum | p10 | Median | p90 | Maximum |
|---|---:|---:|---:|---:|---:|
| 2 | 20.8 | 28.1 | 46.8 | 85.8 | 118.3 |
| 3 | 9.4 | 16.5 | 34.0 | 65.0 | 107.6 |
| 4 | 15.7 | 17.2 | 34.0 | 57.3 | 98.4 |
| 5 | 12.5 | 18.4 | 43.7 | 74.5 | 110.0 |
| 6 | 14.1 | 18.7 | 34.8 | 73.2 | 101.6 |

Median longest event-free gaps fell from approximately 2.7–3.5s to 1.9–2.4s; p90 longest gaps fell from 4.5–5.5s to 2.8–3.4s. Mean live line density increased from 30–57 to 69–78. These are seeded simulation samples, not promises about every random match.

Tests cover sustained pace/escalation, equivalent dense seed fans, no line gain without wall contact, seam-safe small clusters, local arcs/duplicates, inward grazing rebounds, bounded glancing contact, coincident-body separation, separating-body feedback suppression, crossing-localized feedback, swept collision, no transfer/own-line/line-line destruction, immediate elimination, ranking, final-only slow motion, its global 0.22 time scale, wall recovery, rematch, and complete-match distributions.

Browser QA exercised complete two- and six-fighter matches, countdown, duel, slow motion, winner/ranking, 390×844 portrait, 320×568 and 360×640 narrow portrait, and 1280×800 desktop. No horizontal overflow or console errors were found. Final normal browser samples completed in approximately 59.7s and 38.0s; final slow-motion presentation lasted approximately 0.9s. Measured frame-callback CPU p95 was 5.2ms (two) and 7.1ms (six), with bounded effects. Viewport-aware resolution reduced frame-gap p95 from 67–100ms to approximately 33ms. A blank-page baseline had 16.8ms p95 gaps. These measurements show an improvement, but do not establish sustained 60fps or physical-phone performance. Device pixel ratios 1/2/3 and resizing from 320×568 to 390×844 were verified, including the 1080×1920 cap.

### Remaining manual tuning

Median rounds meet the target, but naturally short multi-fighter culls and long two-fighter tails remain. Real-phone recording should guide further tail-duration tuning, dense-line aliasing, spark intensity, and audio balance. Avoid enforcing durations or outcomes artificially.


Final commands: `npm test -- --disableConsoleIntercept` (27 tests across three files, including 120 complete seeded matches) and `npm run build` (TypeScript and Vite production build passed; JS 259.06 kB / gzip 82.08 kB, CSS 17.05 kB / gzip 4.64 kB). No lint script is configured.

Significant source changes: `src/game/engine.ts`, `src/game/geometry.ts`, `src/game/types.ts`, `src/game/renderer.ts`, `src/audio/audioManager.ts`, `src/battle/BattleScreen.tsx`, `src/styles.css`, `src/game/engine.test.ts`, and `src/game/simulation.test.ts`.
