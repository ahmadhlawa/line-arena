# Codex Implementation Prompt — Line Arena V1

You are implementing a new local-only web game called **Line Arena**.

The authoritative product/game design is in:

`docs/LINE_ARENA_V1_DESIGN.md`

Read that file **completely before writing code**. Treat it as the source of truth. Do not invent alternate combat mechanics.

## Objective

Build the complete V1 as a responsive **React + TypeScript + HTML Canvas** web app optimized for **9:16 TikTok / Reels / Shorts screen recording**.

This is a local creator tool, not a public production service.

## Hard Constraints

- Frontend only.
- No backend.
- No auth.
- No cloud database.
- No multiplayer.
- No video export/recording.
- No Phaser/Matter.js unless you can prove the native Canvas implementation is insufficient.
- Keep the game simulation independent from React rendering.
- Use a fixed-step simulation loop.
- Prefer small focused modules.
- Use TDD for simulation/game-rule code.
- Do not stop after scaffolding; implement a usable end-to-end V1.
- Do not replace the approved mechanics with HP, damage, territory stealing, or fighter attacks.

## Non-Negotiable Mechanics

These are the most important rules in the project:

1. Every fighter begins the match with an equivalent **initial seeded fan of lines** created during match initialization, before active gameplay.
2. **After initialization, a fighter gains new lines ONLY by touching the arena boundary.**
3. Lines are anchored to arena-boundary points and dynamically connect to the owning fighter's current position.
4. Nearby consecutive wall contacts create the fan of lines between those contacts as described in the spec.
5. **A fighter breaks opponent lines only when the fighter's own circular body physically crosses those line segments.**
6. Breaking opponent lines gives the attacker **nothing**.
7. Fighter-vs-fighter collision is bounce/physics only.
8. Fighter-vs-fighter collision changes no line count.
9. There is no line-vs-line collision.
10. When a fighter's final line breaks, that fighter is eliminated **immediately**.
11. When exactly two fighters remain and one is about to break the other's final remaining lines, the whole arena enters cinematic slow motion before resolving the final elimination.
12. The final survivor wins.
13. Rematch uses the same fighters but new randomized starting conditions.

The initial seeded fan is a one-time initialization exception. It must not become a general alternate line-generation mechanic after `FIGHT!`.

If code violates any rule above, fix the code rather than reinterpret the rule.

## Product Requirements

Implement:

- 2–6 fighter selection
- Built-in fighter groups
- Custom fighter upload
- Circular crop / positioning for uploaded fighter image
- Fighter name
- Automatic dominant-color extraction
- Automatic color enhancement for dark neon gameplay
- Manual color override
- Local persistence for custom fighters (prefer IndexedDB)
- Pre-battle intro
- 3 / 2 / 1 / FIGHT countdown
- Canvas battle
- HUD with current line counts
- Wall-contact line creation
- Fighter-body vs opponent-line destruction
- Immediate elimination
- Correct ranking
- Final two-fighter slow motion
- Winner presentation
- Rematch
- New Battle / Back to Setup
- Audio manager with mute/master volume
- Clean Recording Mode
- Responsive design centered on portrait 9:16 capture

## Visual Direction

Use a polished dark neon arcade style:
- black/navy background,
- luminous circular arena,
- thin bright fighter lines,
- fighter-color glow,
- restrained particles,
- compact readable HUD,
- strong winner presentation.

Do not clutter the battle screen.

## Engineering Workflow

Before implementation:

1. Inspect the repository and existing files.
2. If the repo is empty/new, establish the minimal Vite + React + TypeScript structure.
3. Write a concrete task plan from the design spec.
4. Implement in small testable increments.
5. Run tests after each mechanics milestone.
6. Keep the app runnable throughout development.

Prioritize this order:

1. Project shell and test setup.
2. Pure simulation data model.
3. Arena/fighter motion.
4. Boundary anchors.
5. Wall-contact line creation.
6. Line rendering.
7. Fighter-vs-line collision and break logic.
8. Immediate elimination/ranking.
9. Fighter-vs-fighter bounce.
10. Final-duel slow motion.
11. Setup UI and selection.
12. Custom fighters and local persistence.
13. Auto/manual colors.
14. Audio.
15. Pre-battle/results/recording presentation.
16. Performance and gameplay tuning.

## Required Tests

At minimum, prove with automated tests that:

- every fighter begins with an equivalent seeded starting fan,
- no wall contact => no new line,
- valid wall contact => new lines,
- nearby consecutive wall contacts => fan anchors,
- large boundary jump does not create a huge accidental fan,
- fighter crosses opponent line => line breaks,
- attacker gains zero lines,
- fighter cannot break own lines,
- line uses current owner position,
- fast supported movement does not tunnel through lines,
- fighter-vs-fighter collision changes zero line counts,
- no line-vs-line collision path exists,
- last line break => immediate elimination,
- eliminated fighter cannot recover,
- slow motion only triggers for final two fighters,
- final predicted line break resolves correctly,
- winner/ranking are correct,
- rematch preserves fighter definitions but regenerates runtime state.

## Performance

Do not update React state on every animation frame.

Keep high-frequency state in the game engine / canvas layer.

If brute-force fighter-vs-line tests become expensive:
- introduce a simple broad phase / spatial indexing strategy,
- but do not prematurely build a complex physics engine.

Use robust collision handling so fast fighters do not tunnel through thin lines.

## Tuning

Typical battle duration should land around **30–60 seconds** after tuning.

Do not use an arbitrary visible match timer to force a result.

You may gradually raise movement pace over time, while preserving the approved mechanics.

## Completion Standard

Do not call the task complete merely because the project builds.

Before completion:

- run the full test suite,
- run a production build,
- manually verify at least one 2-fighter and one 6-fighter match,
- verify the final-duel slow-motion finish,
- verify custom image + color flow,
- verify Rematch,
- verify a portrait 9:16 recording layout,
- fix confirmed issues,
- report exact commands run and their results.

When uncertain, return to `docs/LINE_ARENA_V1_DESIGN.md`. It is authoritative.
