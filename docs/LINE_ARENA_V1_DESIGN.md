# Line Arena — V1 Design Specification

**Status:** Approved product design  
**Target:** Local-only web app for recording short vertical battle videos  
**Primary format:** 9:16 — TikTok / Instagram Reels / YouTube Shorts  
**Implementation target:** React + HTML Canvas, frontend-only  
**Backend:** None  
**Accounts / cloud / multiplayer:** None

---

## 1. Product Goal

Build a lightweight local web game that lets one creator quickly stage short automated battles between **2–6 fighters**, record the screen manually, and publish the resulting videos on short-form social platforms.

The creator chooses the fighters. The **movement and match result are emergent/randomized**, not pre-selected.

The core visual mechanic is a circular arena filled with dynamic colored lines connected from the arena boundary to moving fighter balls. Fighters gain lines only by touching the arena boundary, and destroy opponent lines by physically passing through them.

The game should feel:
- fast,
- visually readable,
- suspenseful,
- replayable,
- easy to prepare repeatedly,
- suitable for screen recording.

Typical match duration should be **roughly 30–60 seconds**.

---

## 2. Core User Flow

```text
Open App
  ↓
Choose Fighter Group
  ↓
Select 2–6 Fighters
  ↓
Optional: Add / Edit Custom Fighters
  ↓
Review Auto Colors / Override Colors
  ↓
Start Battle
  ↓
Pre-Battle Intro
  ↓
3 → 2 → 1 → FIGHT!
  ↓
Automated Battle
  ↓
Final Duel Slow Motion
  ↓
Winner Reveal
  ↓
Final Ranking
  ↓
Rematch / New Battle / Back to Setup
```

The user records the battle externally using screen recording / OBS / device recording.

---

## 3. Scope

### 3.1 Included in V1

- Responsive web app
- Mobile-first 9:16 recording experience
- 2–6 fighters per battle
- Ready-made fighter collections
- Custom fighters with:
  - uploaded image,
  - circular crop / positioning,
  - fighter name,
  - automatically detected dominant color,
  - manual color override
- Local persistence of custom fighters
- Automated physics-based movement
- Circular arena
- Dynamic line generation from arena-wall contact
- Opponent-line destruction by fighter body intersection
- Immediate elimination when a fighter reaches zero lines
- Final two-fighter slow-motion finish
- Interactive sound effects
- Winner animation
- Final ranking
- Rematch with the same fighters but randomized starting state
- Recording Mode with clean UI

### 3.2 Explicitly Out of Scope

Do **not** add any of the following to V1:

- Backend
- Database server
- Authentication
- User accounts
- Cloud storage
- Online multiplayer
- Matchmaking
- Leaderboards
- Analytics
- Social sharing
- Video recording or export
- MP4/WebM generation
- AI-generated fighters
- AI gameplay
- Complex game engine frameworks unless technically necessary
- Phaser, Matter.js, or another engine by default
- Territory-stealing mechanics
- Traditional HP / damage system
- Fighter-vs-fighter damage
- Line-vs-line collision

YAGNI applies strictly.

---

# 4. Visual Direction

The approved visual direction is a **dark neon arcade / sci-fi arena** designed for vertical video.

Key visual traits:

- Dark navy / black background
- Bright neon fighter colors
- Glowing circular arena border
- Thin luminous lines
- Strong but controlled bloom/glow
- Readable fighter HUD
- Crisp particles when lines break
- Short high-impact text events
- Cinematic final slow motion
- Clean winner reveal

The app should feel polished but not overloaded.

Avoid:
- excessive menus,
- large permanent overlays,
- visual clutter over the arena,
- long text,
- decorative UI that does not improve the recording.

---

# 5. Responsive and Recording Layout

## 5.1 Recording Aspect Ratio

The primary gameplay presentation is **9:16 portrait**.

The game must remain usable on desktop, tablet, and phone, but the battle composition should always preserve a portrait-safe recording area.

Recommended recording-stage concept:

```text
┌─────────────────────────┐
│        HUD              │
│                         │
│                         │
│      CIRCULAR ARENA     │
│                         │
│                         │
│     transient event     │
│                         │
└─────────────────────────┘
```

The circular arena should occupy most of the available width while leaving enough room for a compact HUD.

## 5.2 Recording Mode

When battle begins, enter a clean recording presentation.

Hide or remove:
- navigation,
- setup controls,
- edit controls,
- scrollbars,
- debug UI,
- nonessential buttons.

During battle, show only:
- battle HUD,
- arena,
- relevant transient events,
- gameplay effects.

A keyboard shortcut such as `Escape` may leave Recording Mode on desktop.

Touch users should have an unobtrusive way to exit after the battle, not during the active recording area.

---

# 6. Fighters

## 6.1 Fighter Definition

A fighter definition contains:

```ts
type FighterDefinition = {
  id: string
  name: string
  imageSource: string
  sourceType: 'built-in' | 'custom'
  autoColor: string
  overrideColor?: string
}
```

The active display color is:

```ts
displayColor = overrideColor ?? autoColor
```

## 6.2 Battle Fighter Runtime State

Runtime state is separate from the saved definition.

```ts
type FighterRuntime = {
  id: string
  definitionId: string
  name: string
  image: CanvasImageSource
  color: string

  position: Vec2
  velocity: Vec2
  radius: number

  lineIds: Set<string>
  lastWallContact?: WallContact

  alive: boolean
  eliminationOrder?: number
}
```

Do not store simulation state back into saved fighter definitions.

---

# 7. Fighter Collections

V1 may ship with a few simple example collections such as:

- Browsers
- Countries
- Football Clubs
- Cars
- Custom / Friends

The architecture must allow collections to be extended by adding data/assets rather than changing game logic.

Built-in collections are content, not game-engine code.

---

# 8. Custom Fighters

## 8.1 Add Fighter Flow

```text
Add Fighter
  ↓
Upload Image
  ↓
Crop / Pan / Zoom inside circular preview
  ↓
Enter Name
  ↓
Detect Dominant Color
  ↓
Preview Neon Color
  ↓
Optional Manual Override
  ↓
Save
```

## 8.2 Image Handling

The user should be able to:
- upload common browser-supported image formats,
- crop the image into a circular fighter portrait,
- zoom and reposition,
- preview the final fighter ball.

The stored result should be optimized enough for local use and not preserve unnecessarily huge originals.

## 8.3 Persistence

Use browser-local persistence.

Recommended:
- **IndexedDB** for custom fighter images / blobs
- **localStorage** for lightweight preferences

No server is required.

---

# 9. Fighter Colors

## 9.1 Automatic Color

When a fighter image is added, derive an automatic representative color from the image.

The extracted color should be adjusted for gameplay visibility:
- avoid near-black,
- avoid near-white,
- avoid extremely desaturated gray,
- increase saturation / brightness when necessary,
- maintain readable neon contrast over the dark arena.

The goal is not exact image color science; the goal is a visually representative, usable gameplay color.

## 9.2 Manual Override

Before a battle, the user can manually override any fighter's color.

The setup screen should make this quick, for example:

```text
Ahmad  [ purple swatch ]
Zaid   [ cyan swatch   ]
Malek  [ red swatch    ]
```

## 9.3 Similar Color Warning

If selected fighters have colors that are too visually similar, the app may warn or suggest an alternate color.

Do **not** silently change a manual user override.

---

# 10. Arena Model

The arena is a circle:

```ts
type Arena = {
  center: Vec2
  radius: number
}
```

Fighters move inside it.

Each fighter has:
- position,
- velocity,
- radius.

Movement uses a deterministic update loop with randomized initial conditions.

The visual frame rate and simulation update must be separated enough that gameplay remains stable under variable rendering performance.

---

# 10A. Initial Match State

The reference battle does **not** begin with every fighter at zero lines.

At match start, every selected fighter receives an initial visible fan of lines so all fighters enter the battle alive and readable.

Required behavior:

- Divide the arena perimeter into one separated starting sector per fighter.
- Seed each fighter with an equivalent-size initial fan of boundary anchors/lines inside its assigned sector.
- Keep a small neutral gap between neighboring starting sectors so the opening frame is visually readable.
- Connect every seeded boundary anchor to that fighter's starting position.
- Starting sectors should be distributed around the circumference rather than stacked together.
- Fighter starting positions should be inside the arena and visually associated with their starting fans, while still allowing randomized movement direction and small positional variation.
- Starting line counts should be equal, or differ only by at most a negligible discretization rounding difference.

This initial seeding is a **match initialization rule**, not a normal way to gain lines during gameplay.

After the battle begins:

```text
ONLY arena-wall contact may create additional lines.
```

The initial seeded lines must therefore be created before active battle simulation / before `FIGHT!` transitions into normal gameplay.

Do not eliminate fighters merely because normal wall-contact generation has not happened yet; they begin with their seeded starting lines.

---

# 11. Randomness

The user chooses all fighters.

Randomness applies only to gameplay state such as:
- initial fighter position,
- initial movement direction,
- small speed variation,
- small bounce-angle variation where required to prevent repetitive loops.

The game must **not**:
- preselect a winner,
- secretly weight a fighter to win,
- fabricate eliminations independently of the line mechanics.

A Rematch uses the same fighter definitions but new randomized runtime starting conditions.

---

# 12. Fighter Movement

Each active fighter moves continuously inside the circular arena.

At each simulation update:

```text
position += velocity * deltaTime
```

Movement rules:
- remain inside the arena,
- bounce from the arena boundary,
- bounce from other fighter bodies,
- preserve visually energetic movement,
- avoid long deterministic loops when practical.

Small bounded variation after bounce is acceptable if required for replayability.

Do not use arbitrary teleportation.

---

# 13. Fighter-to-Fighter Collision

When two fighter balls collide:

```text
Fighter A ↔ Fighter B
```

The collision is **physics only**.

Allowed:
- bounce,
- velocity exchange / response,
- light visual impact effect,
- light collision sound.

Forbidden:
- damage,
- loss of lines,
- gain of lines,
- stealing,
- elimination caused directly by fighter collision.

This rule is mandatory.

---

# 14. Line Model

## 14.1 Concept

A line belongs to exactly one fighter.

One endpoint is anchored on the arena boundary.

The other endpoint is always the current fighter position.

Conceptually:

```text
Boundary Anchor ●
                \
                 \
                  \
                   ● Fighter
```

As the fighter moves, all of its surviving lines move visually because their fighter endpoint follows the fighter.

## 14.2 Line Data

A line can be represented by its boundary anchor rather than storing both world-space endpoints:

```ts
type ArenaLine = {
  id: string
  ownerFighterId: string
  anchorIndex: number
  alive: boolean
}
```

The dynamic inner endpoint is always:

```ts
fighter.position
```

This is important:
- lines are not static interior territory,
- lines are not polygons,
- lines are not HP bars,
- lines are not transferred between fighters.

---

# 15. Arena Boundary Anchors

For implementation, discretize the arena perimeter into a sufficiently dense set of boundary anchors.

Example conceptual model:

```ts
const ANCHOR_COUNT = configurableValue
```

Each anchor corresponds to an angle:

```text
0 … 2π
```

The exact anchor count is an implementation tuning parameter and must be high enough for the fan effect to look smooth in 9:16 recording.

A fighter can own zero or more anchors/lines.

Multiple fighters must not own the same line object.

Lines may visually cross each other in the arena without any line-to-line interaction.

---

# 16. Creating Lines

This is the **only** way a fighter gains lines.

## 16.1 Wall Contact

When a fighter physically reaches / rebounds from the arena boundary:

```text
Fighter touches Arena boundary
→ wall contact is registered
→ new line anchor(s) may be created for that fighter
```

No other event may create lines.

## 16.2 Consecutive Contact Fan

The visual reference uses a fan of lines when consecutive wall contacts happen near each other.

Required behavior:

1. Record the fighter's previous valid wall-contact anchor.
2. On the next valid wall contact:
   - determine the nearby boundary arc between the two contact anchors,
   - create the missing line anchors along that arc for the fighter,
   - render those lines connected to the current fighter position.
3. This produces the visible fan / wedge of lines.

Conceptually:

```text
Contact A ●──────────────● Contact B
           \ \ \ \ \ \ \
            \ \ \ \ \ \ \
                 ● Fighter
```

### Important Implementation Constraint

The fan should use the **short local arc** between nearby consecutive wall contacts.

A large jump across the arena boundary must not accidentally create a fan spanning most of the circle.

Use a configurable maximum capture/contact arc threshold.

If consecutive contacts exceed that threshold:
- create only the new contact anchor (or a very small local cluster),
- reset the fan start to that contact.

The exact threshold is a visual-tuning constant, not a new gameplay system.

## 16.3 Duplicate Anchors

A fighter should not create duplicate line objects for an anchor it already owns.

If the intended reference behavior later proves that repeated contact should refresh/rebuild a missing line at an anchor, that can be handled by recreating only missing lines.

---

# 17. No Territory Ownership / No Stealing

The game does **not** contain territory capture.

If Fighter A creates new lines:
- Fighter A gains only newly created lines from wall contact.
- Fighter A does not take ownership of Fighter B's lines.
- Fighter B's existing lines remain Fighter B's until physically broken.

There is no direct conversion:

```text
B line → A line
```

That operation must not exist.

---

# 18. Breaking Opponent Lines

## 18.1 Only Fighter Body Breaks Lines

A line breaks only when an **opponent fighter ball physically intersects it**.

Example:

```text
Opponent Fighter ● →  | | | | |
                      X X X
```

The intersected opponent lines disappear.

The moving fighter gains nothing.

## 18.2 Collision Rule

For Fighter A, test its moving circular body against lines owned by all other alive fighters.

Do not test Fighter A against its own lines for destruction.

For every intersected enemy line:
- mark/remove that line,
- decrement the owner's line count,
- trigger a small break effect,
- optionally aggregate multiple breaks during the same short interval into one visual/audio event.

## 18.3 Moving-Line Geometry

Because each line's inner endpoint is the owner's moving fighter position, collision tests must use the line segment's **current geometry** each simulation step:

```text
boundaryAnchor → currentOwnerPosition
```

Do not treat a line as frozen at the position where it was created.

## 18.4 Continuous / Swept Collision

Fast-moving fighters must not pass through lines without detection.

The implementation should account for motion between simulation positions using either:
- swept circle vs segment collision,
- sub-stepping,
- or another robust continuous-collision method.

This is especially important later in the match when speeds may rise.

---

# 19. Line-to-Line Interaction

There is **no line-to-line collision system**.

Lines may visually intersect.

No line:
- breaks another line,
- pushes another line,
- transfers ownership,
- blocks another line.

Do not spend performance on line-vs-line collision detection.

---

# 20. Line Count

The fighter's line count is simply:

```text
number of surviving lines owned by fighter
```

The HUD should derive the count from authoritative simulation state.

The total number of lines in the arena is **not constant**:

- wall contact adds lines,
- opponent fighter intersections remove lines.

---

# 21. Elimination

This rule is strict.

When the final surviving line of a fighter is broken:

```text
lineCount becomes 0
→ eliminate immediately
```

There is:
- no grace period,
- no recovery timer,
- no chance to reach the wall,
- no hidden HP.

The fighter is eliminated at that exact gameplay event.

On elimination:
- stop simulating that fighter,
- remove / fade its ball,
- ensure any remaining owned lines are zero,
- play elimination effect,
- play elimination sound,
- record placement order.

An eliminated fighter can never re-enter the match.

---

# 22. Placement / Ranking

With N fighters:

- first eliminated receives last place,
- subsequent eliminations move upward,
- final surviving fighter receives first place.

Example for four fighters:

```text
4th — first eliminated
3rd — second eliminated
2nd — final eliminated
1st — survivor / winner
```

The final result screen shows the full ranking.

---

# 23. Final Duel Slow Motion

This is a required signature feature.

## 23.1 Trigger Eligibility

Slow motion is relevant only when exactly **two fighters remain alive**.

## 23.2 Trigger Condition

When the simulation detects that one fighter's current movement is about to intersect enough opponent lines to destroy the opponent's **last remaining lines**, trigger the finishing slow-motion sequence before visually completing the elimination.

Conceptually:

```text
2 fighters remain
       ↓
incoming intersection predicts opponent lineCount → 0
       ↓
enter FINISH_SLOW_MOTION
       ↓
play collision / line breaks in slow motion
       ↓
last line breaks
       ↓
elimination
       ↓
winner
```

## 23.3 Global Time Scale

During this final moment, the **entire arena simulation** slows down.

Target initial tuning:

```text
timeScale ≈ 0.20–0.25
```

This applies to:
- fighter movement,
- collision progression,
- line movement,
- particle motion,
- visual timing tied to simulation,
- relevant effects.

Audio may use a dedicated slow-motion treatment rather than literal full time-stretch if browser audio quality would be poor.

## 23.4 Duration

The slow-motion moment should be short and cinematic, approximately:

```text
0.7–1.2 real-time seconds
```

Tune visually.

It must not feel like a long pause.

## 23.5 Final Resolution

After the last lines visibly break:
- eliminate the losing fighter,
- briefly hold the result,
- transition to winner reveal.

Do not trigger final slow motion for ordinary non-final eliminations.

---

# 24. Match Length / Escalation

Target typical match length:

```text
30–60 seconds
```

Do not end the match with an arbitrary visible countdown timer.

If tuning is required to prevent overly long matches, gradually increase activity through simulation parameters such as modest speed escalation.

Any escalation must preserve the actual game rules:
- wall contact still creates lines,
- fighter body still breaks opponent lines,
- zero lines still eliminates,
- no artificial winner selection.

Suggested tuning bands, subject to playtesting:

```text
0–20 s   normal
20–35 s  mild pace increase
35–50 s  stronger pace increase
50+ s    continued controlled escalation
```

Do not add fake damage or forced line deletion merely to finish the game.

---

# 25. Game State Machine

Recommended top-level states:

```ts
type GamePhase =
  | 'SETUP'
  | 'PRE_BATTLE'
  | 'COUNTDOWN'
  | 'BATTLE'
  | 'FINAL_DUEL'
  | 'FINISH_SLOW_MOTION'
  | 'WINNER_REVEAL'
  | 'RESULTS'
```

Only the game engine owns battle-state transitions.

React should render around engine state/events but should not implement frame-by-frame simulation.

---

# 26. Game Loop

Recommended conceptual update sequence:

```text
read time / accumulator
  ↓
run fixed simulation step(s)
  ↓
for each alive fighter:
  update movement
  resolve arena-wall collision
  register wall contacts / create lines
  ↓
resolve fighter-vs-fighter bounce
  ↓
detect fighter-body vs opponent-line intersections
  ↓
remove broken lines
  ↓
check immediate eliminations
  ↓
if exactly 2 remain:
  evaluate final-hit slow-motion condition
  ↓
emit gameplay events
  ↓
render latest state
```

Use a **fixed simulation timestep** where practical.

Rendering may interpolate if needed.

---

# 27. Physics Tuning

The game is not trying to be a scientific physics simulator.

Priorities:

1. stable,
2. readable,
3. energetic,
4. fair enough,
5. replayable.

Use simple circle physics.

Avoid:
- chaotic tunneling,
- fighters getting permanently stuck,
- fighters orbiting a tiny repeated path indefinitely,
- unstable velocity explosions.

Reasonable clamps are allowed for:
- minimum speed,
- maximum speed,
- post-collision velocity,
- bounce perturbation.

---

# 28. HUD

During battle show a compact list of alive fighters.

Example:

```text
[blue avatar] Ahmad    128
[purple]      Zaid      76
[yellow]      Malek    144
```

The number is current surviving line count.

The HUD should:
- use fighter color,
- remain readable,
- occupy limited vertical space,
- update smoothly,
- remove/fade eliminated fighters clearly.

Do not use traditional HP bars that imply another combat system.

---

# 29. Transient Gameplay Events

Short events may appear near the arena without obscuring it.

Examples:

```text
+24 LINES
```

when wall contact creates a meaningful batch.

```text
-18 LINES
```

when a fighter loses a meaningful batch.

```text
ZAID ELIMINATED
```

when eliminated.

Avoid:
- critical-hit terminology,
- attack damage terminology,
- stolen-lines terminology.

Those concepts do not exist in the rules.

---

# 30. Pre-Battle Sequence

After pressing Start Battle:

1. Enter recording presentation.
2. Show selected fighters in a short VS presentation.
3. Show:

```text
READY?
3
2
1
FIGHT!
```

The sequence should be concise.

It exists partly to give the recorded short a clear beginning.

---

# 31. Winner Reveal

When one fighter remains:

1. Finish the final elimination.
2. Briefly settle the arena.
3. Transition to winner reveal.
4. Show the winner portrait.
5. Show winner name.
6. Show clear `WINS!`.
7. Use glow / particles / crown-like celebration.
8. Play victory sound.
9. Show final ranking.
10. Reveal post-match controls.

Do not show post-match control buttons too early if they would spoil the recorded winner moment.

---

# 32. Post-Match Controls

After the result presentation:

- `Rematch`
- `New Battle`
- `Back to Setup`

## Rematch

Keeps:
- same fighter selection,
- same names,
- same images,
- same chosen colors.

Regenerates:
- positions,
- directions,
- velocity variations,
- simulation seed / runtime randomness.

---

# 33. Audio

V1 audio should be small and purposeful.

Required event categories:

- countdown tick
- `FIGHT!`
- wall bounce
- line creation
- line break
- large multi-line break
- fighter body collision
- elimination
- slow-motion transition
- final break / final elimination
- victory

Provide:
- master volume,
- mute toggle.

Persist preference locally.

Avoid creating a large audio settings system.

---

# 34. Architecture

The simulation must be independent from React.

Recommended conceptual architecture:

```text
React UI
  │
  ├── Setup / Fighter Selection
  ├── Custom Fighter Editor
  ├── Color Controls
  ├── Battle Shell / HUD
  └── Results
       │
       ▼
Game Controller / Adapter
       │
       ▼
Canvas Game Engine
  ├── Fixed-step loop
  ├── Arena physics
  ├── Fighters
  ├── Boundary contacts
  ├── Lines
  ├── Collision detection
  ├── Elimination
  ├── Final slow motion
  ├── Events
  └── Renderer
```

React must not cause a component render for every simulation frame.

---

# 35. Suggested Source Structure

Exact paths may follow the project's scaffold, but responsibilities should remain separated.

```text
src/
├── app/
│   ├── App.tsx
│   └── routes-or-view-state.ts
│
├── features/
│   ├── fighters/
│   │   ├── FighterSelector.tsx
│   │   ├── FighterCard.tsx
│   │   ├── CustomFighterEditor.tsx
│   │   ├── fighterColor.ts
│   │   └── fighterStorage.ts
│   │
│   └── battle/
│       ├── BattleScreen.tsx
│       ├── BattleHud.tsx
│       ├── PreBattle.tsx
│       └── ResultsScreen.tsx
│
├── game/
│   ├── types.ts
│   ├── constants.ts
│   ├── engine.ts
│   ├── state.ts
│   ├── loop.ts
│   ├── arena.ts
│   ├── fighterPhysics.ts
│   ├── wallContacts.ts
│   ├── lines.ts
│   ├── lineCollision.ts
│   ├── eliminations.ts
│   ├── finalSlowMotion.ts
│   ├── events.ts
│   ├── random.ts
│   └── renderer.ts
│
├── audio/
│   ├── audioManager.ts
│   └── sounds/
│
├── data/
│   └── builtInFighters.ts
│
└── styles/
```

Prefer focused modules over one giant game file.

---

# 36. Data Flow

## Setup

```text
saved fighters
   ↓
React fighter selector
   ↓
selected FighterDefinitions
   ↓
Start Battle
   ↓
engine creates FighterRuntime objects
```

## During Battle

```text
Game Engine
  ↓
simulation state
  ↓
Canvas renderer

Game Engine
  ↓
high-level events / snapshot
  ↓
React HUD / transient UI when required
```

Keep high-frequency render state inside the engine/canvas.

Only send React the data it actually needs.

---

# 37. Performance Requirements

The target should run smoothly on a modern phone and desktop browser.

Key performance constraints:

- no React state update per frame,
- no line-to-line collision,
- avoid unnecessary object creation inside hot loops,
- batch Canvas drawing where practical,
- use spatial / broad-phase optimization if line count makes brute-force collision expensive,
- cap or tune total active lines if necessary without breaking the visual design,
- use continuous collision protection for fast fighter-vs-line intersections.

Visual fidelity is more important than supporting extremely large line counts.

---

# 38. Error Handling

The app is local and simple, but should fail cleanly.

Handle:
- unsupported image upload,
- corrupted image,
- IndexedDB failure,
- missing built-in asset,
- audio blocked until user interaction,
- resize / orientation change,
- accidental battle start with fewer than 2 fighters,
- selection above 6 fighters.

Rules:
- never crash the battle because a sound failed,
- fall back to a safe fighter color if extraction fails,
- fall back to a placeholder portrait if a custom image cannot be decoded.

---

# 39. Testing Strategy

The visual experience needs manual playtesting, but game rules require automated tests.

## 39.1 Required Unit / Simulation Tests

### Line Creation

- Every fighter begins with an equivalent seeded starting fan before active simulation.
- A fighter cannot gain a line without arena-wall contact.
- A valid wall contact can create a line.
- Nearby consecutive wall contacts create the expected arc/fan anchors.
- A large contact jump does not incorrectly create most of the arena.
- Duplicate owned anchors do not create duplicate live lines.

### Fighter-vs-Line

- Fighter A crossing Fighter B's current line segment breaks B's line.
- Fighter A crossing multiple B lines breaks all intersected lines.
- Fighter A gains zero lines from breaking B lines.
- Fighter A does not break its own lines.
- Line collision uses the owner's current fighter position.
- Fast movement does not tunnel through a line under supported speed limits.

### Fighter-vs-Fighter

- Fighter collision changes physical motion.
- Fighter collision changes no line counts.
- Fighter collision cannot directly eliminate a fighter.

### Line-vs-Line

- There is no line-vs-line destruction or collision path.

### Elimination

- Breaking the last line immediately eliminates the owner.
- There is no grace period.
- Eliminated fighter stops participating in simulation.
- Eliminated fighter cannot gain new lines later.

### Final Duel

- Final slow motion cannot trigger with more than two fighters alive.
- With exactly two fighters, a predicted last-line break can enter final slow motion.
- The finishing interaction resolves to elimination after the slow-motion sequence.
- The survivor becomes winner.

### Rematch

- Same definitions are reused.
- Runtime positions / velocities are regenerated.

## 39.2 UI Tests

- Cannot start with fewer than 2 fighters.
- Cannot select more than 6.
- Custom fighter can be saved locally.
- Manual color override wins over auto color.
- Recording Mode removes setup controls.
- Ranking order matches elimination order.

## 39.3 Manual Visual QA

Test at minimum:
- narrow phone,
- typical 9:16 phone,
- desktop browser,
- 2 fighters,
- 6 fighters,
- similar fighter colors,
- custom human portrait,
- logo-based fighter,
- high-line-count late battle,
- final slow-motion sequence.

---

# 40. Acceptance Criteria

V1 is accepted only if all of the following are true:

1. User can select 2–6 fighters.
2. User can add a custom fighter with image and name.
3. Custom fighter persists locally.
4. Fighter color is automatically derived from image.
5. User can manually override fighter color.
6. Battle starts with randomized valid fighter positions and movement.
7. Battle begins with equivalent initial line fans for all selected fighters.
8. Fighter gains lines only through arena-boundary contact after initialization.
9. Consecutive nearby wall contacts visibly produce a fan of lines.
10. Lines remain dynamically connected to the moving owner fighter.
11. Fighter body can break opponent lines it physically crosses.
12. Breaking opponent lines gives the attacker no lines.
13. Fighter-vs-fighter collision causes no line changes.
14. Line-vs-line collision does not exist.
15. Fighter is eliminated immediately when its final line breaks.
16. Battle continues until one fighter remains.
17. When two remain, the final last-line break receives global slow motion.
18. Winner reveal works.
19. Final ranking is correct.
20. Rematch uses same selected fighters with a new randomized simulation.
21. Active battle presentation is clean and suitable for 9:16 screen recording.
22. Typical tuned battle duration is approximately 30–60 seconds.
23. No backend is required.

---

# 41. Implementation Priorities

Build in this order:

1. Minimal React/Vite app shell.
2. Pure game simulation types and deterministic test harness.
3. Circular fighter movement and wall bounce.
4. Arena boundary anchors and line ownership.
5. Wall-contact line creation.
6. Dynamic line rendering.
7. Fighter-vs-line breaking.
8. Immediate elimination and ranking.
9. Fighter-vs-fighter bounce.
10. Final-duel prediction and slow-motion time scale.
11. Canvas visual polish.
12. Setup / fighter selection.
13. Custom fighter upload / crop / persistence.
14. Auto dominant-color extraction and manual override.
15. Audio.
16. Pre-battle / winner / results presentation.
17. Recording-mode polish.
18. Balance and performance tuning.

Game mechanics should be correct before visual polish.

---

# 42. Non-Negotiable Gameplay Rules for Implementers

Before changing or extending the game, preserve these rules:

```text
WALL CONTACT
= the only source of new lines

FIGHTER BODY × ENEMY LINE
= enemy line breaks

BROKEN ENEMY LINE
= attacker gains nothing

FIGHTER × FIGHTER
= bounce only

LINE × LINE
= no gameplay interaction

0 LINES
= immediate elimination

2 FIGHTERS + imminent final line break
= global slow-motion finish
```

If an implementation choice conflicts with one of these rules, the implementation choice is wrong.

---

# 43. Definition of Done

The project is ready for the creator's use when:

- mechanics pass automated tests,
- a full 2–6 fighter match can be completed repeatedly without simulation failure,
- final duel reliably produces the intended slow-motion climax,
- custom portraits are quick to prepare,
- fighter colors look distinct and vibrant,
- sound is synchronized enough for screen recording,
- the battle screen looks clean in a 9:16 capture,
- Rematch can quickly generate another visually different battle,
- no backend or manual developer intervention is required for normal use.
