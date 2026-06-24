# ENCOUNTERS — Diegetic NPC encounters for Martian Trail (M8 design spec)

> Synthesis of three research passes (yuka integration, the `a-good-old-fashioned-adventure`
> dialogue/NPC system, and the MECC trail lineage + diegetic-NPC presentation in modern games).
> This is the **design doc the M8 build implements** — written first per Docs→Tests→Code.
> Full source reports: `docs/research/YUKA-INTEGRATION-RECOMMENDATION.md` and the two
> M8 research-agent results recorded in the directive history.

## The one-line thesis

Replace the giant modal dialogue boxes with **encounters you watch happen**: a fellow
Martian's crawler steers up to the rover, an FSM/goal brain decides whether they trade /
beg / warn / raid, a **GenAI portrait card** (Disco-Elysium / Citizen-Sleeper style) carries
the conversation, and every choice is a **survival-economy decision** (Oregon) or an
**adjudicate-conflicting-sources puzzle** (Amazon) — never a wall of text. The depot becomes
a populated social hub where you meet and recruit fellow Martians *before* heading out.

This closes a 40-year gap: NPCs were R. Philip Bouchard's *intended* core of the Trail series
(his stated second design goal in the 1985 redesign), cut only by floppy-disk limits. Our
GenAI + Meshy + yuka pipelines finally deliver what the hardware of 1985 couldn't.

---

## 1. What each research pass contributes

| Pass | Contributes | Key correction / insight |
|---|---|---|
| **yuka** | The *behavior* layer — NPCs that physically steer + decide by goal, inside the deterministic sim. | The determinism-safe pattern **already ships in `a-good-old-fashioned-adventure`** (`unitAI.ts`): yuka `Vehicle`+`Seek` ticked at fixed `dt`, brains in a `WeakMap`, velocity→intent-vector→ECS trait. Ports 1:1. The trap is narrow: avoid `WanderBehavior`, `MathUtils.random*`, `NavMesh.getRandomRegion`, and yuka's `Time` (it reads `performance.now()`). |
| **agofa** | The *encounter architecture* — content-driven dialogue **banks** with slot-precedence resolution, non-blocking overlay over a live sim, trigger→present→interact→consequence→resume. | agofa has **no live GenAI** — its "portraits" are offline sprite recolors. **Martian Trail is AHEAD here**: we already own the live Imagen pipeline (`src/genai/portraits.ts`). We take agofa's *architecture*; we keep our *generated faces*. |
| **MECC** | The *design inspiration* — the reusable Trail spine + the diegetic-presentation bar. | Spine = **pre-departure depot social hub → recruit a fallible partner → encounters-as-decisions**. Amazon's **conflicting-advice pair** is the cheapest "encounter = reasoning puzzle" idea to steal. Presentation bar = RDR2 in-scene approach-aware staging + Disco-Elysium/Citizen-Sleeper portrait card + Frostpunk choice-card. |

---

## 2. The encounter model (data)

An encounter is **content**, not a state machine — mirror agofa's bank/slot/node shape, but
specialize the `when` conditions for Mars run-state (sol, low-resource, flags) and reuse our
existing `OutpostEffect`/`TradeOffer` for consequences **inline on choices** (simpler than
agofa's event-bus indirection — we have no quest engine).

```ts
// src/schemas/encounter.ts (Zod — same idiom as existing content schemas)
export const martianNpc = z.object({
  id: z.string(),                              // "npc:stranded-hauler-rourke"
  name: z.string(),                            // "Rourke"
  archetype: z.enum(["trader","stranded","pilgrim","scavenger","roadwarden","liaison","veteran"]),
  look: z.string(),                            // visual cue → feeds buildPortraitPrompt
  portrait: z.string().optional(),            // cache key → generated Imagen face
  bank: z.string(),                            // "encbank:rourke"
  // steering/behavior tuning (consumed by encounterAI.ts brains)
  goalWeights: z.record(z.string(), z.number()), // {trade, beg, warn, raid}
  approachSpeed: z.number(), hailRange: z.number(),
});

export const encounterSlot = z.object({
  id: z.string().optional(),                   // addressable-only (per-location variants)
  when: z.object({
    flagSet: z.string().optional(), notFlag: z.string().optional(),
    minSol: z.number().optional(), resourceLow: z.string().optional(),
  }).optional(),
  default: z.boolean().optional(),
  node: z.string(),
});

export const encounterNode = z.object({
  lines: z.array(z.string()),
  choices: z.array(z.object({
    id: z.string(), text: z.string(),
    effects: z.array(outpostEffect).optional(),  // inline consequence (reuse existing path)
    goto: z.string().optional(),
  })).optional(),
  opensTrade: z.string().optional(),             // reuse run.tradeAtOutpost
  emits: z.string(),                             // flag/telemetry hook
});
```

Resolution = agofa's `slotMatches` ported almost verbatim into a **pure** `src/sim/encounters.ts`:
`resolveEncounter(runState, bankId)` walks slots top-down, skips addressable-only slots, returns
the first whose `when` matches, throws if no `default`. `resolveEncounterSlot(bankId, slotId)`
for direct invocation (depot intro, mid-trail roadside). Pure → replay-safe + unit-testable.

---

## 3. The encounter behavior (yuka brain)

Copy `a-good-old-fashioned-adventure/src/sim/systems/unitAI.ts` into a new
`src/sim/systems/encounterAI.ts`. Per-NPC brain cached in `WeakMap<World, Map<Entity, NpcBrain>>`,
ticked at `FIXED_DT`:

- **Goal arbitration** — yuka `Think` + `GoalEvaluator[]`; each archetype intent
  (Trade / Beg / Warn / Raid) is an evaluator scoring `calculateDesirability(runState, npc)` from
  sim traits + a forked seeded stream (`rng.fork('encounter:'+sol)`). Optional fuzzy mood (#5)
  smooths the scores later.
- **Steering** — yuka `Vehicle` + `ArriveBehavior` (clean decel at the dock offset),
  `SeekBehavior`/`OffsetPursuit` (approach), `FleeBehavior`/`EvadeBehavior` (depart/flee-if-rebuffed),
  `SeparationBehavior` (packs don't overlap). **Only these pure behaviors — never `WanderBehavior`.**
- **FSM** — a small yuka `StateMachine` per NPC: `APPROACH` → `HAIL` (arrived → intent set → signal UI)
  → `DEPART` (seek off-screen) → done.
- **Output** — each tick: `seek.target.set(dock.x,dock.y,0); vehicle.velocity.set(0,0,0);
  vehicle.update(FIXED_DT)`, then write `vehicle.position` into the sim-owned `Encounter` trait and
  the diagnostics bridge. **No `setRenderComponent`** — the ECS trait is the single intermediary,
  exactly as the sibling does it.

New trait `src/sim/traits.ts`: `Encounter { active, archetype, intent, npc:{x,y,z}[] }` — sim-owned,
serialized in the save schema so save/continue + replay stay exact.

### Determinism guardrails (non-negotiable — `.claude/gates.json` enforces sim purity)
- Tick yuka with `FIXED_DT` from `src/engine/loop.ts`. **Never** call yuka `Time`/`time.update()`.
- All spawn/archetype/offer rolls through the seeded `createRng` fork — never `MathUtils.random*`, never `Math.random`.
- Allowed behaviors only: Seek / Arrive / Flee / Evade / Pursuit / OffsetPursuit / Separation / FollowPath.
- Authoritative NPC positions live in the **sim trait** (deterministic); render-only brain caches are fine but never authoritative.
- Extend `ban_patterns` to flag `WanderBehavior` + `MathUtils` random imports inside `src/sim/**`.

---

## 4. The encounter presentation (diegetic, not a box)

Two-layer staging, reused for every encounter — the modern-games bar from the MECC pass:

1. **In-scene body (Meshy/PSX GLB).** The Martian is a physical entity in the side-view 3D scene —
   standing at the depot airlock, limping from a stranded crawler, manning a checkpoint. The player
   drives/EVAs up; **proximity triggers** the encounter (yuka `Vision`/`SphericalTriggerRegion`).
   Borrow RDR2's rule: **the approach changes the staging** — roll up hot on a raider and they're
   defensive; arrive on foot in EVA and they hail you. **Name revealed on interaction**, not floating overhead.
2. **GenAI portrait card (`EncounterPanel`).** On `HAIL`, slide in a framed card (framer-motion +
   our `GlassPanel`): left = the **Imagen-generated PSX face** (reuse `buildPortraitPrompt` +
   the locked `SIGNATURE_STYLE` so traveler faces cohere with the four crew portraits; cache by
   `portrait` key; opt-in + declined-skip flow already exists), right = name/role + lines + choice
   buttons (Frostpunk event-card model). The card is **anchored to the scene** (the NPC body stays
   visible behind/beside it) so it reads as "I'm talking to *that* Martian," never an abstract menu.
   Keep it small + bottom-anchored — the existing outpost-panel idiom, never a full-screen text wall.
3. **Companion advice (the Yukon mechanic)** surfaces as a small persistent co-driver portrait that
   pipes in *occasionally and sometimes wrongly* — a fallible partner, never a tutorial oracle.

This is the user's "interim portrait slides" + "NPC portraits" + "real diegetic encounters" — and
it maps exactly onto our three owned pipelines (Meshy body + Imagen face + R3F scene).

---

## 5. The cast — Mars NPCs (each maps a Trail role to a Mars verb)

| Mars NPC | Trail ancestor | Verb / function |
|---|---|---|
| **Depot quartermaster** (named, e.g. "Vasquez at Depot 7") | Matt's General Store | Vendor; pre-departure provisioning; prices rise deeper out |
| **Recruit a co-driver / partner** at the launch depot | Yukon partners (Sadie/Jake/Midas) | Named, *advantaged*, *fallible* companion present the whole run |
| **Stranded crew / distress beacon** | Oregon roadside wagon party | Rescue-vs-ration dilemma; trade O₂/water for their data/parts |
| **Wildcat prospectors / ice miners** | Klondike prospectors | Info + trade; rumor of a faster regolith cutoff route |
| **Rival expedition** (another rover) | RDR2 strangers / "other parties" | Race/cooperate; approach-dependent tone (friendly vs. claim-jumper) |
| **UNOMA checkpoint** | Yukon NWMP border | Gatekeeper: minimum life-support reserve or pay a transit levy; impound if short |
| **Veteran + corporate liaison pair** at each outpost | Amazon native+Westerner | **Conflicting route/weather advice** — the player adjudicates |
| **Survey/photo subject** | Amazon photograph mechanic | Non-combat capture: scan a Martian phenomenon/person for reward |

### Classic beats translated
- River crossing → **terrain/hazard crossing** (dust-storm corridor, crevasse field): ford / detour / pay a guide-rover, gated by weather + vehicle state.
- Border Mountie → **UNOMA checkpoint** with a life-support minimum + levy; impound if short.
- Partner recruitment → **co-driver selection** that locks provisioning until chosen, each a supply-spread tradeoff.
- Conflicting-advice pair → **veteran-vs-liaison** at each outpost (the strongest cheap idea to steal).
- Photograph mechanic → **orbital/EVA scan-and-identify** of Martian phenomena/people; collection rewards.
- Gravestone+epitaph → **wreck marker** for failed expeditions you pass (and leave when *you* fail).

---

## 6. M8 build order (vertical slices, additive, each isolated)

Per the yuka pass: **start with a thin vertical slice — single Trader archetype** — highest value
(the headline want), de-risked by copying the proven sibling pattern, isolated to one trait + one
system + one scene + one content file. It lays the brain/scene/trait/panel scaffolding every later
slice reuses. Order:

1. **m8-1 Encounter engine + Trader slice** — `src/schemas/encounter.ts`, pure `src/sim/encounters.ts`
   resolver (+ determinism test), `Encounter` trait, `encounterAI.ts` (copy `unitAI.ts`; Seek/Arrive only),
   `EncounterScene` NPC group, `EncounterPanel` with Imagen portrait, `run.respondEncounter`. Trigger a
   seeded encounter chance in `advanceSol`. Same-seed determinism test on `Encounter.npc[]` + offer + resolution.
2. **m8-2 Depot social hub** — populate the launch outpost with 2–4 in-scene Martians (quartermaster +
   prospector + recruitable partner); replace the static "Colonist News" block with a resolved encounter;
   choices open the existing resupply trade or set flags. *(MECC spine item #1.)*
3. **m8-3 Fallible co-driver** — recruit-a-partner at the depot (locks provisioning until chosen; supply-spread
   tradeoff); persistent small portrait that advises occasionally and sometimes wrongly. *(Yukon signature mechanic.)*
4. **m8-4 Conflicting-advice pair** — veteran + corporate liaison at each outpost give conflicting route/weather
   advice the player adjudicates. *(Amazon — encounter as reasoning puzzle.)*
5. **m8-5 Mid-trail roadside encounters** — stranded crew / scavenger / rival spawn during travel, halt the rover,
   `EncounterPanel` over `TravelScene`, choices apply effects, then `run.setDriving(true)` resumes.
6. **m8-6 GOAP event director** *(optional, gated behind playtests)* — replace the uniform random event roll with
   `Think`+`GoalEvaluator` desirability scoring for dramatically-shaped pacing; pure logic, seeded tie-break.
7. **m8-7 Fuzzy NPC mood** *(polish)* — trader greed / beggar desperation / raider aggression as fuzzy variables
   feeding the goal scores. Only after m8-1 lands.

Each slice: Docs→Tests→Code, determinism test, Safari playtest with screenshot read, forward commit,
pipelined review. Ships on `feat/m8-encounters` **after M7 hardening ships**.

---

## 7. Anti-patterns (the things to NOT do)
- No floating faceless dialogue box with no spatial grounding (the Minecraft-NPC-command failure mode).
- No `WanderBehavior` / `MathUtils.random` / `NavMesh.getRandomRegion` / yuka `Time` in `src/sim/**`.
- No `setRenderComponent` — sim trait is the single render intermediary.
- No info-dump NPCs — every encounter is a decision or an adjudication, traded against the survival economy.
- No procedural/placeholder NPC art — Meshy body + Imagen face, same no-placeholder mandate as the rest of the game.
