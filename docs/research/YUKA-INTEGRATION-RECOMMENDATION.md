# Yuka AI for Martian Trail — Integration Recommendation

Research output. No code changed. Grounded in yuka 0.7.8 actual API + sibling
code in `a-good-old-fashioned-adventure` + Martian Trail's current architecture.

---

## TL;DR

- Martian Trail's sim is a **pure deterministic koota ECS** on a fixed-timestep
  loop (`FIXED_DT = 1/60`), all randomness through a seeded `createRng` facade,
  `Math.random` banned in `src/sim/**` + `src/engine/**` by `.claude/gates.json`.
- Sibling `a-good-old-fashioned-adventure` already runs **yuka `Vehicle` +
  steering INSIDE its deterministic sim** at a fixed `SIM_DT`, normalizing the
  output velocity into an intent vector. This is the proven, determinism-safe
  pattern — copy it verbatim.
- Yuka genuinely elevates Martian Trail in **one place above all: diegetic NPC
  agents** (traders / beggars / stranded crews / raiders that physically move
  and behave in the 3D scene with goals + steering), turning encounters from
  modal dialogue boxes into things you watch happen. Steering during EVA and a
  GOAP event-director are strong follow-ons.
- **The determinism trap is narrow and known:** yuka's `Time` reads
  `performance.now()`, and three classes touch `Math.random` —
  `WanderBehavior`, `MathUtils` (UUID/randFloat/randInt), `NavMesh.getRandomRegion`.
  Avoid those three; drive yuka with the sim's own `FIXED_DT` and seeded targets,
  never `time.update()`. Everything else in yuka is pure position/velocity math
  and is inherently deterministic.

---

## 1. Yuka feature set (verified against source, npm `yuka@0.7.8`)

Engine-agnostic JS game-AI library. Relevant subsystems:

| Subsystem | Classes | Determinism note |
|---|---|---|
| Entities | `GameEntity`, `MovingEntity`, `Vehicle`, `EntityManager` | Pure. `EntityManager.update(delta)` is the driver. `setRenderComponent(obj, cb)` syncs to a 3D object. |
| Steering | `SteeringManager`, `SeekBehavior`, `ArriveBehavior`, `FleeBehavior`, `PursuitBehavior`, `EvadeBehavior`, `OffsetPursuitBehavior`, `InterposeBehavior`, `SeparationBehavior`, `AlignmentBehavior`, `CohesionBehavior`, `FollowPathBehavior`, `OnPathBehavior`, `ObstacleAvoidanceBehavior`, `WanderBehavior` | All pure math EXCEPT **`WanderBehavior`** (`Math.random()` for `theta`). Avoid Wander. |
| FSM | `StateMachine`, `State` (`enter`/`execute`/`exit`/`changeTo`) | Pure. Logic-only. |
| Goal-driven (GOAP-ish) | `Think` (the "brain", a `CompositeGoal`), `Goal`, `CompositeGoal`, `GoalEvaluator` (`calculateDesirability`/`setGoal`), `Goal.STATUS` | Pure. Desirability scoring + arbitration; you supply scoring inputs. |
| Perception | `Vision` (`fieldOfView`, `range`, `visible(point)`), `MemorySystem` (`createRecord`, `getValidMemoryRecords`, `memorySpan`), `MemoryRecord` | Pure geometry. `getValidMemoryRecords(currentTime, …)` needs a clock value — feed the **sim clock**, not wall time. |
| Triggers | `Trigger`, `TriggerRegion` (`SphericalTriggerRegion`, `RectangularTriggerRegion`), `region.touching(entity)` | Pure spatial test. |
| Fuzzy logic | `FuzzyModule`, `FuzzyVariable`, `FuzzyRule`, fuzzy sets | Pure inference. |
| Navigation | `Graph`, `AStar`/`Dijkstra`/`BFS`/`DFS`, `NavMesh`, `Path`, `CellSpacePartitioning` | A*/graph pure. `NavMesh.getRandomRegion` uses `Math.random` (avoid that one method). |
| Time / util | `Time` (`getDelta`, `enableFixedDelta`, `setFixedDelta`), `MathUtils` | **`Time.update()` reads `performance.now()`; `MathUtils` UUID/randFloat/randInt use `Math.random`.** Don't use either in sim. |
| Serialization | `toJSON`/`fromJSON` on most classes | Useful for save/continue parity. |

**Determinism-safe subset for this game:** GameEntity / MovingEntity / Vehicle,
SteeringManager + Seek/Arrive/Flee/Pursuit/Evade/OffsetPursuit/Separation/
FollowPath, StateMachine/State, Think/Goal/GoalEvaluator, Vision, MemorySystem
(fed sim time), Trigger + SphericalTriggerRegion, FuzzyModule, Graph + AStar.
**Forbidden in sim:** `WanderBehavior`, `MathUtils.random*`/`generateUUID`,
`NavMesh.getRandomRegion`, `Time` (drive with `FIXED_DT` yourself).

---

## 2. How the siblings actually use yuka (patterns to copy)

`blobolines` does **not** use yuka (it's a Rapier physics platformer — wrong
shape). The reference is **`a-good-old-fashioned-adventure`**.

### Files
- `src/sim/systems/unitAI.ts` — allied formation units (`SeekBehavior`, `Vehicle`, `Vector3`)
- `src/sim/systems/enemyAI.ts` — enemy archetypes (`SeekBehavior`, `FleeBehavior`, `Vehicle`, `Vector3`)
- `src/sim/systems/npcAI.ts` — ambient NPC patrols (`SeekBehavior`, `Vehicle`, `Vector3`)

### The load-bearing pattern: yuka lives INSIDE the deterministic sim

**Per-entity brain cached in a `WeakMap`, instantiated lazily** (`unitAI.ts`):
```ts
const brains = new WeakMap<World, Map<Entity, UnitBrain>>();
function brainFor(world, unit, x, y): UnitBrain {
  const perWorld = getOrCreate(brains, world, () => new Map());
  return getOrCreate(perWorld, unit, () => {
    const vehicle = new Vehicle();
    vehicle.position.set(x, y, 0);
    const seek = new SeekBehavior(new Vector3());
    seek.active = false;
    vehicle.steering.add(seek);
    return { vehicle, seek, /* ... */ };
  });
}
```

**Steering ticked with the sim's fixed dt, velocity normalized to an intent**
(NOT applied directly; NOT via render component) (`unitAI.ts`):
```ts
brain.seek.target.set(adjustedTarget.x, adjustedTarget.y, 0);
brain.vehicle.velocity.set(0, 0, 0);   // reset so each tick is from current target
brain.vehicle.update(dt);              // dt === SIM_DT === 1/60   <-- yuka integration point
const v = brain.vehicle.velocity;
const len = Math.hypot(v.x, v.y);
if (len > 1e-6) { intentX = (v.x/len)*speedScale; intentY = (v.y/len)*speedScale; }
// intent then flows through the normal moveEntities system → Transform
```

**Time source** — fixed, not wall-clock: `export const SIM_DT = 1/60`
(`src/sim/tick.ts`), stepped from a `requestAnimationFrame` accumulator. Sine
weaves / oscillations use the **deterministic sim clock** (`world.get(Clock)?.t`),
not `Date.now`.

**Render sync** — there is **no `setRenderComponent`**. Yuka writes velocity →
intent → ECS `Transform` trait; the R3F layer reads `Transform` per frame and
sets `mesh.position`. The ECS component is the single intermediary.

**Determinism** — holds because (a) fixed `SIM_DT`, (b) seeded `rngFor(world)`
for all rolls, (c) they only use **Seek/Flee** (pure math, zero internal
randomness). No `WanderBehavior`, no `Time`, no `MathUtils.random`.

**Why this maps 1:1 to Martian Trail:** identical shape — fixed-timestep
(`FIXED_DT = 1/60` in `src/engine/loop.ts`), seeded `createRng` facade
(`src/core/rng.ts`), and a render bridge (`src/state/diagnostics.ts`) that the
R3F layer reads per frame. Drop yuka brains into a new `src/sim/systems/*AI.ts`,
tick them in `advanceSol`/the step loop, write results to traits + diagnostics.

---

## 3. Ranked integrations for Martian Trail

### #1 — Diegetic NPC encounter agents (traders / beggars / stranded crews / raiders)
**Adds:** the user's headline want — real encounters you *watch*, not dialogue
boxes. When the rover halts at an encounter, one or more NPC entities (a trader's
crawler, a limping stranded survivor, a raider pack) **steer toward / around the
rover and behave by goal**: approach-and-hail, beg-and-follow, warn-and-leave,
circle-and-raid, flee-if-rebuffed. Outcome (trade / gift / theft / combat-avoid)
emerges from the agent's goal resolution and what the player does, then the
dialogue/result modal reflects what already physically happened.
**Yuka feature:** `Think` + `GoalEvaluator`/`Goal` (pick intent: Trade / Beg /
Warn / Raid by desirability from game state — your supplies, their archetype,
morale), driving a `Vehicle` with `SeekBehavior`/`ArriveBehavior`/`OffsetPursuit`
(approach the rover), `FleeBehavior`/`EvadeBehavior` (leave), `SeparationBehavior`
(packs don't overlap). Optional `Vision`/`Trigger` (`SphericalTriggerRegion`) for
"NPC notices rover within range".
**Where it lives:**
- New `src/sim/systems/encounterAI.ts` — brains in a `WeakMap<World, Map<Entity, NpcBrain>>`, ticked from the step loop (copy `unitAI.ts` exactly).
- New trait in `src/sim/traits.ts`: `Encounter` (active npc ids, archetype, intent, npc positions) — sim-owned, deterministic.
- New content: `src/content/encounters.ts` + `config/encounters.json` (archetypes: trader/beggar/stranded/raider, goal weights, offers) validated by a new `src/schemas/encounter.ts` (Zod), same as existing content.
- Render: new `src/render/scenes/EncounterScene.tsx` (or NPC group inside `TravelScene`) reading npc positions from the encounter trait / diagnostics — PSX GLB rover/astronaut models already exist in `models.ts`.
- UI: `EncounterModal` reflecting the agent's resolved intent; choices feed back into the goal (`run.respondEncounter(choice)`).
**Determinism:** Brains tick at `FIXED_DT`; all goal-scoring inputs come from sim
traits + a forked seeded stream (`rng.fork('encounter:'+sol)`); targets are the
rover/world positions. Use only Seek/Arrive/Flee/Evade/OffsetPursuit/Separation.
**No `WanderBehavior`, no `Time`, no `MathUtils.random`.** Stays fully replayable.
**Risk:** medium (new scene + trait + content), but isolated and additive.

### #2 — EVA prospecting brought to life (survey drone + hunting hazards)
**Adds:** EVA stops feeling alive instead of a static grid. A roving **survey
drone** steers across the deposit field via `FollowPathBehavior` and uses
`Vision`/`MemorySystem` to "spot" nearby deposits (drives the existing
hot/warm/cold scan heat diegetically). A **hazard that hunts** — a dust devil or
scavenger that `Pursuit`s the astronaut and forces you off-O₂-budget — raises EVA
tension. The deposit field is already seeded; agents just move over it.
**Yuka feature:** `Vehicle` + `FollowPathBehavior`/`Path` (drone sweep),
`PursuitBehavior`/`SeekBehavior` (hunter), `Vision.visible(point)` +
`MemorySystem` (drone perception → scan heat), `SeparationBehavior` (multiple
hazards). `ObstacleAvoidanceBehavior` to route around deposit rocks.
**Where it lives:** extend `src/sim/eva.ts` (sim-side deposit/O₂ logic already
here) with an EVA-scoped brain set; render in `src/render/scenes/EvaScene.tsx`
(astronaut/rocks already modeled).
**Determinism:** EVA already forks a fresh seeded stream per session
(`eva:${n}`); path waypoints + hunter spawn derive from it. Fixed-dt ticking.
Pure behaviors only → deterministic.
**Risk:** medium. Self-contained to the EVA screen.

### #3 — Trail hazard/weather agents (dust devils, rogue rovers, scavengers)
**Adds:** the trail between stops gets ambient menace — a dust devil that crosses
the road and forces a swerve, a rogue automated rover or scavenger that shadows
you. Visual life + occasional emergent micro-events on the side-scroll.
**Yuka feature:** `Vehicle` + `SeekBehavior`/`PursuitBehavior` (shadowing),
`FollowPathBehavior` (crossing paths), `SeparationBehavior`,
`SphericalTriggerRegion` ("agent reaches the rover lane" → fire a seeded micro-event).
**Where it lives:** new `src/sim/systems/trailAgents.ts`; render inside
`TravelScene.tsx` alongside `DustStorm`/`WheelDust`. Trigger hits can hand off to
the existing `src/sim/event.ts` resolution.
**Determinism:** spawn cadence + targets from `rng.fork('trail:'+sol)`; fixed-dt;
pure behaviors. Replay-safe.
**Risk:** low–medium. Mostly cosmetic + light event hooks; can ship purely
render-side first (see determinism note below) then promote to sim.

### #4 — GOAP "event director" (smarter than the seeded random roll)
**Adds:** replaces the current "roll `eventChance`, `pick` a uniform unseen event"
with a **director that scores what *should* happen next** by game state — e.g.
when O₂ is low + morale high, weight a generous-trader encounter; when the player
is coasting, weight a hazard or raider; pace tension instead of pure uniform
randomness. More dramatically-shaped runs while staying seeded.
**Yuka feature:** `Think` + `GoalEvaluator` array — each candidate event/encounter
category is an evaluator with `calculateDesirability(state)`; `Think.arbitrate()`
picks the most desirable; a seeded `rng` breaks ties / samples among top-k so
runs stay varied and replayable.
**Where it lives:** new `src/sim/director.ts`, called from `advanceSol` in
`src/sim/tick.ts` where `eventRng.chance/pick` currently lives (`src/sim/event.ts`
selection site). It's logic-only — no Vehicle, no scene.
**Determinism:** desirability inputs are pure sim state; the *only* randomness is
the existing seeded `eventRng` used for tie-break/sampling. **Fully deterministic,
zero yuka time/RNG involved** — the cleanest determinism story of all five.
**Risk:** low (pure logic), but it changes core pacing/balance, so gate behind
playtests. Highest design impact, lowest technical risk.

### #5 — Fuzzy NPC "mood"/disposition (polish layer on #1)
**Adds:** trader greed, beggar desperation, raider aggression as fuzzy variables
→ smoother, less binary encounter behavior and dialogue tone.
**Yuka feature:** `FuzzyModule` + `FuzzyVariable`/`FuzzyRule` feeding the #1
goal-desirability scores.
**Where it lives:** inside `encounterAI.ts` brains. Pure inference, deterministic.
**Risk:** low, but only worth it after #1 exists.

---

## 4. Recommended FIRST integration

**Do a thin vertical slice of #1 (diegetic NPC encounter agents), single
archetype: the Trader.** Highest value (the user's explicit headline want),
de-risked by copying the sibling's proven pattern, and isolated to one new scene
+ trait + content file.

### Why first
- Directly answers "real diegetic encounters, not dialogue boxes."
- The determinism-safe pattern is already shipping in a sibling — near-zero
  research risk, only Seek/Arrive behaviors needed for v1.
- Additive: one new trait, one new system, one new scene, one new content file.
  Touches no existing sim balance (unlike #4).
- Lays the brain/scene/trait scaffolding that #2, #3, #5 all reuse.

### Sketch (no code committed — design only)

1. **Content** — `config/encounters.json` + `src/schemas/encounter.ts` (Zod):
   one `trader` archetype `{ id, goalWeights:{trade}, offers:[{give,get}], approachSpeed, hailRange }`.
   Load via a new `src/content/encounters.ts` (mirror `src/content/events.ts`).

2. **Trait** — add `Encounter` to `src/sim/traits.ts`:
   `{ active: boolean, archetype: string, intent: string, npc: {x,y,z}[] }`
   (sim-owned, serialized in the save schema for replay parity).

3. **Trigger to start** — in `advanceSol` (`src/sim/tick.ts`), after travel,
   roll a seeded encounter chance `rng.fork('encounter:'+sol).chance(p)`; on hit,
   set `Encounter.active`, choose archetype via `rng.pick`, halt the rover
   (same halting path events/hazards already use), route UI to a new `encounter`
   screen (add to `src/core/screens.ts`).

4. **Brain + steering** — new `src/sim/systems/encounterAI.ts`, copy `unitAI.ts`:
   - `WeakMap<World, Map<Entity, NpcBrain>>`; lazily build `{ vehicle:new Vehicle(), seek:new SeekBehavior(new Vector3()) }`, `vehicle.steering.add(seek)`.
   - A small `StateMachine` per NPC: `APPROACH` (seek/arrive to rover dock offset) → `HAIL` (arrived, intent=trade, signal UI) → `DEPART` (seek off-screen) → done.
   - Each step loop tick: `seek.target.set(dock.x, dock.y, 0); vehicle.velocity.set(0,0,0); vehicle.update(FIXED_DT);` then write `vehicle.position` into `Encounter.npc[i]` and the diagnostics bridge.
   - Use `ArriveBehavior` (decelerates at dock) rather than raw Seek for a clean stop.

5. **Render** — `src/render/scenes/EncounterScene.tsx` (or NPC group in
   `TravelScene.tsx`): read `Encounter.npc[]` positions from diagnostics each
   `useFrame`, place a PSX crawler/astronaut GLB (already in `models.ts`).

6. **UI** — `EncounterModal`: when the brain reaches `HAIL`, present the trader's
   offer; `run.respondEncounter('accept'|'decline')` applies effects via the
   existing `applyEffects` path and flips the NPC FSM to `DEPART`.

7. **Tests** — Vitest determinism test: same seed → identical `Encounter.npc[]`
   position sequence + same offer + same resolution (the project already tests
   determinism this way).

### Determinism guardrails for the slice (and all of yuka here)
- Tick yuka with **`FIXED_DT`** from `src/engine/loop.ts`. **Never call
  `time.update()`** or use yuka's `Time` — it reads `performance.now()`.
- All spawn/archetype/offer rolls go through the **seeded `createRng` fork**, not
  `MathUtils.random*` and not `Math.random`.
- Use only **Seek / Arrive / Flee / Evade / Pursuit / OffsetPursuit / Separation
  / FollowPath**. **Never `WanderBehavior`** (its `theta = Math.random()*2π` is
  the one steering-side determinism leak). Avoid `NavMesh.getRandomRegion` and
  `MathUtils.generateUUID`.
- Brains may live in render-only `WeakMap` caches (not serialized), but the
  **authoritative NPC positions live in the sim trait**, derived deterministically
  — so save/continue and replay stay exact. (If pure visual-only ambient agents
  like #3's dust devils are wanted with zero replay guarantee, the alternative is
  to keep their brains entirely render-side off `diagnostics`, accepting they're
  cosmetic and non-deterministic — but for anything that affects outcomes, keep
  it sim-side as above.)
- Add yuka steering classes to the `.claude/gates.json` allowlist intent, and
  consider extending `ban_patterns` to also flag `WanderBehavior` and
  `MathUtils` random imports inside `src/sim/**`.

---

## Sources
- Yuka source (`Time`, `EntityManager`, `GameEntity`, `Vehicle`, `Think`, `GoalEvaluator`, `StateMachine`, `Vision`, `MemorySystem`, `Trigger`, steering behaviors, `MathUtils`, `NavMesh`) — local reference checkout + GitHub Mugen87/yuka.
- Yuka docs/examples — mugen87.github.io/yuka, DeepWiki Mugen87/yuka (goal/fsm examples).
- Sibling: `~/src/jbcom/a-good-old-fashioned-adventure/src/sim/systems/{unitAI,enemyAI,npcAI}.ts`, `src/sim/tick.ts`.
- Martian Trail architecture: `src/sim/**`, `src/engine/loop.ts`, `src/core/rng.ts`, `src/state/diagnostics.ts`, `src/render/**`, `.claude/gates.json`, `.agent-state/directive.md`.
