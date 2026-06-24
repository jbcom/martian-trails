# Martian Trail — Game Design Map

**The bar:** real mechanical equivalency to *The Oregon Trail* (1985/1990 MECC editions) — the
game endures from the Apple II era because its loop is complete and its risk-decisions are
legible. *Martian Trail* must hit that same bar: a complete, fun loop start to finish, modern and
polished, with Martian equivalents that are mechanically faithful (not just reskinned flavor).

**Premise:** a pressurized rover crosses ~2500 km of Mars from **Underhill Depot** to **Korolev
Crater**, managing a 4-person colonist crew and life-support. Sols (Martian days) are the calendar
unit. The journey is a battle of attrition against vitals, power, hull, and morale.

**Sources grounding the Mars side:**
- `Gemini-Red_Mars_Oregon_Trail_Game_Concept.md` — the design transcript (12 build iterations).
- `red_mars_the_ares_trail.html` — the playable POC (V7, single-file PixiJS v7).

This document is the authoritative design map and drives the gameplay build milestones. Where the
POC already establishes a mapping, this doc reconciles with it and names what to keep, fix, or add.

---

## 1. Oregon Trail mechanic inventory (the enduring core)

Every mechanic that makes Oregon Trail work as a complete loop. These are the load-bearing parts;
the Mars mapping in §2 must preserve the *function*, not just the noun.

| # | Mechanic | What it does for the loop |
|---|----------|---------------------------|
| **M1** | **Profession / difficulty choice** (banker / carpenter / farmer) | One up-front pick sets starting money (banker $1600, carpenter $800, farmer $400) AND a final-score multiplier (farmer ×3, carpenter ×2, banker ×1). Inverse risk/reward: rich start = low score ceiling. Also flavors random events (carpenter repairs wagon cheaper). |
| **M2** | **Provisioning at the general store** | Spend a fixed budget at Matt's Store on oxen, food (lbs), clothing (sets), ammunition (boxes/bullets), and spare parts (wheels/axles/tongues). Budget vs. carry-need is the first real decision. Under-buy and you die; over-buy one thing and you starve elsewhere. |
| **M3** | **Pace × Rations tradeoff** | Pace (steady / strenuous / grueling) trades distance-per-day against ox health, wagon wear, and illness risk. Rations (filling / meager / bare-bones) trade food burn against health drain. The two controls are the everyday dial the player tunes against the calendar and supply state. |
| **M4** | **Time / calendar pressure** | You must reach Oregon before winter closes the mountain passes. Distance is finite (~2000 mi); each landmark sits at a known mileage. Dawdling = death by snow. Time is the master constraint everything else trades against. |
| **M5** | **Rivers & crossing decisions** (THE signature tension) | At each major river: **ford** (cheap, fast, drowns oxen/loses supplies if too deep/fast), **caulk and float** (free, can tip and lose everything), **take the ferry** (costs money + wait days), **wait** (river may drop), or **hire an Indian guide** (pay in clothing). A real multi-option risk decision with visible river depth/width as the read. This is the iconic beat. |
| **M6** | **Hunting** (active resource minigame) | Spend ammo to shoot game (bison/deer/rabbits). Real-time aim-and-fire sub-screen. Carry cap: you can only haul ~100 lbs of meat back regardless of how much you shoot — over-hunting is wasted ammo. The one twitch-interactive break in an otherwise menu-driven game. |
| **M7** | **Random events** | Illness (dysentery, typhoid, cholera, measles, fever), injuries (broken leg/arm, snakebite), broken wagon parts (wheel/axle/tongue), oxen wandering off/dying, theft of supplies, bad weather (hail, fog, heavy rain), getting lost (lose days), fire in the wagon, contaminated water. Each is a typed event with specific consequences and sometimes a choice. |
| **M8** | **Forts** (rest / buy / sell / news) | Forts (Kearney, Laramie, Bridger, Boise, Walla Walla) are safe stops: buy supplies (more expensive than Matt's), rest to recover health, get trail news/hints, and trade. Optional detours that cost time. |
| **M9** | **Trading with others** | Encounter other travelers; barter surplus for shortage (food for ammo, oxen for parts, clothing for food). Rebalances a lopsided inventory mid-trail without money. |
| **M10** | **Party of named members** | 5 named travelers (you + 4 you name). Each can independently get sick, injured, or die. Health is tracked per member. Losing members hurts but the wagon goes on until the leader-driven fail states. |
| **M11** | **Morale / health (group + per-member)** | Overall party health is a hidden gauge driven by rations, pace, weather, illness. Low health → faster illness, slower travel, deaths. Morale is implicit in Oregon Trail; modern remakes surface it. |
| **M12** | **Landmarks** (orientation + flavor) | Named geographic markers (Chimney Rock, Fort Laramie, Independence Rock, South Pass, The Dalles) at fixed mileages. They orient the player on the long blank stretches and deliver lore/flavor text. Reaching one is a small beat of progress. |
| **M13** | **Terminus scoring** | At Willamette Valley (or rafting The Dalles) the run is graded: points for each surviving party member (by health), remaining cash, possessions (oxen, supplies), and arrival date — all ×profession multiplier. A "high scores" board with name + occupation. |
| **M14** | **Save / continue** | You can save the game at any landmark/fort and resume later. The journey is long; persistence is part of the design. |
| **M15** | **Death screens / tombstones** | The famous "You have died of dysentery." Per-member death notices. On party leader death / total wipe, a tombstone screen you can even leave an epitaph on — and which later players encounter on the trail. Failure is theatrical and memorable, never a silent reset. |

---

## 2. Martian equivalent for EACH mechanic

For every mechanic above, the Mars mapping — reconciled with the concept doc and POC. The rule:
**preserve the function.** Oxen→power, ammo→parts, food→rations is the POC's spine and it is
sound. The two mechanics the POC fumbles (river crossing, hunting) get the most design weight here.

| # | Oregon Trail | **Martian Trail equivalent** | Notes / reconciliation with POC |
|---|--------------|------------------------------|---------------------------------|
| **M1** | Profession / difficulty + score multiplier | **Mission sponsor / colonist background.** Three options:<br>• **Corporate (Transnat) charter** — 35,000 CR, score ×1. The "banker": rich, low ceiling.<br>• **UNOMA scientific survey** — 22,000 CR, score ×2. The "carpenter": balanced; crew skill bonuses apply harder.<br>• **First Hundred independent** — 12,000 CR, score ×3. The "farmer": broke, brutal, max prestige. Crew morale floor is higher (ideological grit). | **MISSING in POC** (flat 25,000 CR, fixed scoring). This is the cheapest high-value add: one screen, three buttons, two numbers each. Also lets sponsor flavor-tint events (Corporate gets resupply offers; Independent gets sabotage/solidarity events). |
| **M2** | General store provisioning | **UNOMA Provisioning Depot at Underhill.** Buy within budget + a hard **1000 kg payload cap** on bulk:<br>• **Liquid O₂** (10 CR/kg) — life support<br>• **Potable H₂O** (5 CR/L)<br>• **Rations** (8 CR/kg) — dehydrated food<br>• **Machined Parts** (250 CR) — repairs + upgrades (= ammo/spare parts)<br>• **Medical Kits** (400 CR) — treat conditions<br>• **RTG Cells** (3000 CR, +100 max power each) — = oxen | **IMPLEMENTED & good** in POC. Dual constraint (budget AND mass) already beats Oregon Trail's single budget constraint. Keep. Tune prices per sponsor in M1. |
| **M3** | Pace × Rations | **Pace** (Steady / Strenuous / Grueling: speed× vs power², morale, breakdown risk) × **Rationing** (Filling / Meager / Bare Bones: ration burn vs morale). | **IMPLEMENTED** in POC and mechanically faithful (grueling squares power draw — a nice non-linear punish). Keep. Surface the tradeoff numerically in the UI so the dial is legible (see §5). |
| **M4** | Calendar / winter deadline | **Sol calendar + the Korolev launch window.** 2500 km finite distance; each landmark/outpost at a known km. The pressure analog to winter: a **resupply lander at Korolev departs on a fixed Sol** (or the colony's reactor fuel runs out) — arrive after Sol N and you "win" but at a gutted score / partial failure. Cold also worsens with the seasonal clock (dust-storm season). | **PARTIAL** — POC tracks Sols and penalizes Sols in score, but there is **no hard deadline / season**. Add a soft and hard deadline so dawdling has teeth like winter does. |
| **M5** | **RIVERS — the signature decision** | **THE HAZARD TRAVERSE.** Mars has no rivers, so the river is replaced by a **family of named impassable terrain hazards**, each a full multi-option risk decision with a *visible read* (the analog to river depth/width). The crossing screen halts travel and shows the obstacle rendered; the player picks an approach with real, visible consequence:<br><br>**(a) Crevasse / chasma field** (e.g. a branch of Valles Marineris, Noctis Labyrinthus):<br>  • **Ford it** = find a regolith ramp and gun it (fast, free; risk: hull damage / rover tips / crew injury if the slope reads steep)<br>  • **Bridge it** (= caulk-and-float) — deploy spanning plates, costs Parts; risk of plate failure dumping cargo into the chasm<br>  • **Detour around the rim** (= ferry/wait) — safe, costs Sols + power<br>  • **Winch descent** (= hire guide) — pay an outpost prospector in rations/parts to talk you down a known route; near-safe but costs trade goods<br><br>**(b) Dust-storm wall** — a regional storm front across the route:<br>  • **Punch through** (fast; power crashes, hull abrades, navigation-lost risk)<br>  • **Hunker down** (wait it out: safe, costs Sols + buried-rover dig-out risk)<br>  • **Reroute** (long detour, costs distance budget)<br><br>**(c) Regolith bog / dust pit** (fine fluffy regolith, the rover sinks — "quicksand"):<br>  • **Power through** (risk bogging completely = stuck event)<br>  • **Lay traction mats** (Parts cost, reliable)<br>  • **Skirt the edge** (Sols cost)<br><br>**(d) Ice-sheet / glacier crossing** (buried glacier, e.g. near the dichotomy):<br>  • **Drive across** (fast; risk: thin spot = break-through, the closest analog to a river ford drowning)<br>  • **Probe-and-pick a route** (costs Sols, much safer)<br>  • **Go around** (long detour)<br><br>**(e) Canyon descent / scarp** (a cliff down into a basin):<br>  • **Steep direct descent** (fast, high hull/injury risk)<br>  • **Switchback** (slow, safe, Sols)<br>  • **Lower with winch** (Parts) | **MISSING as a real decision.** The POC has a "Crevasse Blockage" *event* (Bridge 1 Part / Detour 3 Sols) — a 2-option modal, no visible read, no rendered obstacle, no tip/drown failure spectrum. **This is the single biggest gap.** The hazard traverse must become the signature beat: rendered obstacle, a "read" gauge (slope angle / storm density / ice thickness shown as a meter the player squints at), 3–4 options with distinct cost axes (mass/Sols/distance/trade-goods), and a *visible animated consequence* (rover tips, cargo tumbles, breaks through ice). One hazard of each family seeded at fixed/semi-random points = the river crossings of the route. |
| **M6** | **HUNTING — the active minigame** | **EVA PROSPECTING — an interactive sub-loop, not a dice roll.** Halt rover, suit up, and run a real mini-interaction with the hunting structure preserved (spend a consumable, twitch/skill phase, hard carry-cap on yield):<br>• **Spend O₂** (= ammo) to stay out; the O₂ clock is the time limit and the "ammo" you burn.<br>• **Active phase:** a top-down/side EVA where the astronaut walks the site. Player aims a **ground-penetrating-radar / neutron spectrometer cone** and gets hot/cold feedback to **locate subsurface ice**, then **drills** (a timing/meter mini-game) to extract Water. Alternatively scavenge a **crashed probe / cache** (clickable salvage points yield Parts) or **chip mineral samples** (morale + score).<br>• **Carry cap** (= the 100-lb meat cap): the suit/rover can only haul back so much Water/mass per EVA, so a lucky strike caps out — over-staying just burns O₂ for nothing and raises the injury roll.<br>• **Risk:** the longer you stay, the higher the chance of a suit tear / dust-devil / radiation tick that injures a crew member (= the snakebite-while-hunting risk). | **STUBBED.** POC's `performEVA()` is a single `Math.random()`: 15% Part, 35% Water (100 L, doubled if Frank alive), else nothing + 30% injury. No interactivity, no aiming, no carry-cap tension, no drill skill. **Second biggest gap.** Build the real prospecting mini-interaction; keep Frank-the-Geologist as a yield/area buff inside it. |
| **M7** | Random events (typed) | **Typed Martian afflictions + mechanical failures + environmental events:**<br>• **Illnesses (typed, like dysentery/cholera/measles):** *Regolith Lung* (perchlorate/silica dust inhalation), *Radiation Sickness* (solar flare), *Hypothermia* (cold snap), *Fracture* (grueling travel / fall), *Hypoxia* (life-support dip), *Cabin Fever / depression* (low morale), *Scurvy/malnutrition* (bare-bones rations). Each has distinct onset cause, progression rate, and treatment.<br>• **Mechanical:** seal failure, RTG degradation, wheel/suspension break, scrubber fouling, navigation computer fault (= getting lost), power-cell short.<br>• **Environmental:** solar flare, dust devil, meteor strike, extreme cold snap, abandoned supply cache (good event), rogue prospector (theft OR trade). | **PARTIAL.** POC has 3 events (Crevasse, Dust Storm, Cold Snap) and *conditions* exist as flat strings ('Injury','Hypothermia','Radiation Sickness','Regolith Lung') assigned ad-hoc — but they are **not typed** (no per-condition onset/progression/treatment/death-rate; one generic 15%/Sol death roll for any condition). Add a typed condition table (cause → progression → treatment → mortality) and expand the event pool to ~15. |
| **M8** | Forts | **Outposts / habitats** (Tharsis Outpost, Pavonis Mons Base, Noctis Labyrinthus Station + more). Halt expedition, dock in pressurized garage: **Rest in Habitat** (spend Sols, heal crew + morale, recharge), **Local Exchange** (trade), **Talk to Colonists** (lore/hints/news about the route ahead). | **IMPLEMENTED** (rest + 1 random trade) but **thin.** Missing: a stocked store (buy/sell at marked-up prices = fort restock), persistent multi-offer exchange, and the "talk to colonists for news/hints" beat (which should preview the next hazard — telegraphing the river crossing the way Oregon Trail's fort gossip warns of high water). |
| **M9** | Trading with others | **Nomadic prospectors / outpost exchange.** Barter surplus for shortage (Rations↔Parts, Water↔O₂, Medkit↔Parts). Random roadside encounter + the outpost exchange. | **PARTIAL.** POC has 3 hard-coded outpost trades (one random per outpost) and the *concept* doc mentions roadside nomads, but roadside trading isn't a live event in V7. Add roadside prospector encounters (trade OR theft, sponsor-flavored). |
| **M10** | Named party members | **4 named colonists with roles** (John–Commander, Maya–Engineer, Frank–Geologist, Nadia–Botanist), each alive/dead + a condition. | **IMPLEMENTED.** The crew is real and roles grant passive buffs + active abilities (Rally, Jury-Rig, Deep Prospect, Emergency Harvest). Keep. Let the player **name/pick** the crew at start (Oregon Trail names its party) — currently hard-coded. |
| **M11** | Morale / per-member health | **Crew Morale gauge** (group) + **per-member condition** (healthy/typed-affliction/dead). Morale drops from starvation, thirst, bare-bones rations, grueling pace, deaths; low morale triggers infighting/mistakes and eventually a morale-death roll. | **IMPLEMENTED** and good (morale is a first-class bar, drives events). Keep. Tie morale visibly to crew **portraits** that react (see §5). |
| **M12** | Landmarks | **Martian waypoints/landmarks** (Tharsis Bulge, Noctis Labyrinthus, Marineris Ridge, the dichotomy boundary, Korolev rim) at fixed km on the progress bar, each with lore + a morale beat on arrival. Some landmarks ARE outposts (M8); some are pure flavor/hazard markers. | **PARTIAL.** Progress bar + tick marks + outpost arrivals exist, but landmarks are thin on **lore layer** (no flavor text screens, no "you have reached X" beat for non-outpost markers). Flesh out: every landmark gets a short rendered vista + log entry; hazards (M5) are themselves landmarks. |
| **M13** | Terminus scoring | **Korolev Crater arrival → UNOMA Rating.** Score = base + surviving crew×weight + hoarded resources − Sols penalty, **× sponsor multiplier (M1)**. Full-screen settlement arrival interface + high-score board (name, sponsor, score). | **PARTIAL.** POC computes a score (`1000 + survivors×500 + resources/5 − sol×15`) on a victory screen, but **no sponsor multiplier, no high-score board, no persistence.** Add multiplier + a local high-score table. |
| **M14** | Save / continue | **Expedition log save** at each outpost (and a quick-save). Resume from localStorage. The run is long; persistence matters. | **MISSING.** POC restarts via `location.reload()` — no save at all. Add localStorage save/continue, autosave at outposts. |
| **M15** | Death screens / tombstones | **Per-member death notices** ("Nadia succumbed to Radiation Sickness, Sol 142") + a full **Expedition Lost** screen on total failure, themed as a **memorial plaque / abandoned-rover marker** that (optionally) future runs encounter on the trail. Failure is theatrical: cause named, rover shown depressurized/buried, epitaph entry. | **PARTIAL.** POC logs deaths and has an "EXPEDITION LOST" modal with a reason string, but it's a generic modal, not the memorable tombstone beat. Elevate to a rendered memorial screen + optional epitaph + (stretch) persistent trail markers from past failed runs. |

---

## 3. Gap analysis vs the POC (V7)

Status of each mechanic in `red_mars_the_ares_trail.html`. Three buckets: **Implemented** (real and
good), **Stubbed/Thin** (present but mechanically hollow), **Missing** (absent).

### Implemented (keep, polish only)
- **M2 Provisioning** — depot UI, budget + 1000 kg payload dual constraint, 6 items, launch warning on missing vitals. Strong.
- **M3 Pace × Rations** — full toggle UI, non-linear power penalty on grueling, ration→morale link. Faithful.
- **M10 Crew** — 4 named roles, passive buffs, active abilities, alive/dead. Real.
- **M11 Morale** — first-class bar, multi-source drain, low-morale death roll. Good.
- **M8 Outposts** (partial-implemented) — diegetic airlock dock animation, Rest, one random trade.
- **M13 Scoring** (partial) — victory screen + formula.
- Plus strong non-Oregon-Trail polish already done: day/night lerp, dust particles, headlights (additive blend), camera shake, procedural Web Audio synth, terrain zones, hull integrity, temperature/thermal, rover upgrades, Phobos/sun tracking, meteors.

### Stubbed / Thin (present but mechanically hollow — must deepen)
- **M5 River-crossing equivalent** — exists ONLY as a 2-option "Crevasse Blockage" modal. No visible read, no rendered obstacle, no failure spectrum, no hazard family. **Top priority.**
- **M6 EVA hunting equivalent** — single `Math.random()` roll in `performEVA()`. No interactivity, aiming, drill skill, or carry-cap. **Second priority.**
- **M7 Events / illness typing** — only 3 events; conditions are flat strings with one generic death roll, not typed afflictions with onset/progression/treatment. Expand pool + add condition table.
- **M8/M9 Outpost depth & trading** — one random trade per outpost; no store, no roadside nomads, no "news/hints" that telegraph hazards.
- **M12 Landmarks** — tick marks + outpost arrivals only; no lore/vista beats for non-outpost markers.
- **M13 Scoring** — no sponsor multiplier, no high-score board.
- **M15 Death/tombstone** — generic modal, not a memorable memorial beat.

### Missing entirely (must add)
- **M1 Profession/difficulty (sponsor)** — no choice; flat 25,000 CR, fixed multiplier.
- **M4 Hard deadline / season** — Sols tracked but no winter-equivalent launch-window/season pressure.
- **M10 crew naming/selection** — crew hard-coded.
- **M14 Save/continue** — none; `location.reload()` only.

---

## 4. The complete loop, start to finish

Full intended player journey as a sequence of phases/screens with the decision at each.
**[FUN]** marks a fun beat; **[TENSION]** marks a tension spike. The bracketed travel block loops
N times until terminus.

```
BOOT
 └─ Title / "Continue" (M14) ─────────────────────── load save if present
        │
SPONSOR & CREW SELECT  (M1, M10)
 ├─ Pick sponsor: Corporate 35k×1 / UNOMA 22k×2 / Independent 12k×3
 │     [DECISION: risk/reward — rich-easy vs broke-prestige]
 └─ Name/confirm 4 crew + see role buffs
        │
PROVISIONING — Underhill Depot  (M2)
 ├─ Diegetic garage; glass manifest panel
 ├─ Buy O₂/H₂O/Rations/Parts/Medkits/RTG within budget AND 1000 kg cap
 │     [DECISION: the first real budget squeeze — every kg trades against another]
 └─ "Clear Airlock & Depart" (warns red if vitals = 0)
        │   ── animated airlock launch (garage doors up, Mars revealed) [FUN]
        ▼
┌────────────────── TRAVEL LOOP  (repeat until 2500 km) ──────────────────┐
│                                                                          │
│  DRIVING  (M3, M4, M11)                                                   │
│   ├─ Set pace × rations; watch power/vitals/hull/morale/temp drain        │
│   ├─ Day/night, terrain zones, weather render live                        │
│   └─ Calendar ticks toward the Korolev launch window  [TENSION builds]    │
│                                                                          │
│  ── any of these interrupt the drive ──                                   │
│                                                                          │
│  LANDMARK  (M12)        → rendered vista + lore + morale beat  [FUN]      │
│                                                                          │
│  HAZARD TRAVERSE  (M5)  → THE SIGNATURE BEAT  [TENSION SPIKE]             │
│   ├─ Rover halts; obstacle rendered (crevasse/storm/bog/ice/scarp)        │
│   ├─ "Read" gauge shown (slope/density/thickness)                         │
│   ├─ Pick approach: Ford / Bridge / Detour / Winch (3–4, distinct costs)  │
│   └─ ANIMATED CONSEQUENCE (tips / breaks through / clean cross)  [FUN]    │
│                                                                          │
│  EVA PROSPECTING  (M6)  → THE ACTIVE MINIGAME  [FUN, optional gamble]     │
│   ├─ Halt + suit up; O₂ clock = ammo + timer                              │
│   ├─ Aim GPR cone (hot/cold) → locate ice → DRILL timing minigame         │
│   ├─ OR salvage crashed probe (Parts) / chip samples (morale)             │
│   ├─ Carry-cap on yield; over-stay = wasted O₂ + injury roll  [TENSION]   │
│   └─ Haul back Water/Parts/samples                                        │
│                                                                          │
│  RANDOM EVENT  (M7)     → typed affliction / failure / encounter          │
│   ├─ Illness onset (Regolith Lung, Rad Sickness…) [TENSION]               │
│   ├─ Mechanical failure (seal, RTG, wheel) → spend Parts or detour         │
│   └─ Good event (cache) / rogue prospector (trade OR theft)               │
│                                                                          │
│  OUTPOST / HABITAT  (M8, M9)  → safe stop  [RELIEF beat]                  │
│   ├─ Rest (Sols → heal + morale + recharge)                               │
│   ├─ Exchange / store (rebalance inventory)                               │
│   ├─ Talk to colonists → NEWS that telegraphs the next hazard             │
│   └─ Autosave (M14)                                                       │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
        │  (2500 km reached)
        ▼
TERMINUS — Korolev Crater  (M13)
 ├─ Full-screen settlement arrival [FUN — payoff]
 ├─ UNOMA Rating = (base + crew + resources − Sols) × sponsor multiplier
 │     └─ before/after launch window = full vs partial victory  (M4)
 └─ High-score board (name, sponsor, score)  (M13)

  ── OR at any point ──
FAILURE  (M15)
 └─ Memorial / abandoned-rover screen, cause named, epitaph entry  [TENSION resolved as theatre]
```

**Where the fun lives:** the *interrupt variety* is the engine of fun — driving is the calm
baseline, and the loop stays alive because you never know if the next interrupt is a relief
(outpost), a gamble (EVA), a spike (hazard), or a gut-punch (illness). Oregon Trail's genius is
that the player is always one event from a decision; *Martian Trail* must keep that cadence dense.

**Where the tension spikes:** (1) the provisioning squeeze, (2) every hazard traverse, (3) over-
staying an EVA on a low-O₂ run, (4) an illness mid-stretch with no outpost in reach, (5) the
calendar closing on the launch window. The hazard traverse is the designed *peak*.

---

## 5. Modern-polish elevation (what makes it 2026, not 1990)

For each classic-but-dated mechanic, how to keep the mechanical soul while making it modern and
polished. The POC already proves the visual layer (PixiJS, glassmorphism, audio synth); these are
the *interaction* upgrades.

| Mechanic | 1990 form | **2026 elevation (keep the soul, modernize the skin + feel)** |
|----------|-----------|----------------------------------------------------------------|
| **M1 Sponsor** | Pick a word from a list | Three rendered mission-charter cards with sponsor insignia, a one-line risk/reward readout (budget + multiplier + a flavor consequence), and a hover-preview of how starting cargo will look. Choice has visible identity. |
| **M2 Provisioning** | Type quantities at a text store | **Already modern in POC** — diegetic garage, live payload meter, glass manifest. Add: a "recommended loadout" ghost line, projected "this lasts ~X Sols at current crew" forecasts per resource so the budget decision is *informed*, and the rover visibly fills with cargo as you buy. |
| **M3 Pace × Rations** | Menu pick, hidden effects | Keep the toggles but **surface the math**: live tooltips showing "+Δkm/Sol, ×power, −morale/Sol" so the dial is legible. Rover visibly bounces harder / wheels spin faster on grueling (POC does this — keep). Crew portraits look strained at bare-bones. |
| **M4 Deadline** | Invisible until you're snowed in | A **launch-window clock** on the HUD (Sols remaining to the Korolev departure / season turn), color-shifting amber→red as it closes. Dust-storm season visibly worsens weather frequency late-game. The pressure is *seen*, not sprung. |
| **M5 River crossing → Hazard Traverse** | Text menu (ford/float/ferry/wait) over a static river sprite | **The flagship modernization.** A tactile, animated hazard-traverse: the obstacle is rendered in the Three/R3F world; a **"read" gauge** (slope angle / storm density / ice thickness / bog depth) is shown as an instrument the player must interpret — the modern legible version of "the river looks deep"; 3–4 approach buttons each with a *distinct cost axis* (mass/Sols/distance/trade-goods) and a probability hint that scales with the read; then a **visible animated consequence** — the rover noses down the ramp and clears it, OR a bridge plate buckles and a cargo crate tumbles into the chasm, OR the ice cracks and a wheel drops through. Camera shake, audio sting, crew reaction. This is the screenshot people remember. |
| **M6 Hunting → EVA Prospecting** | Real-time shoot-the-bison screen | A **real EVA mini-interaction**: side/top-down astronaut, O₂-as-ammo clock, an aimed GPR/spectrometer cone with hot/cold feedback to *find* the ice, then a **drill timing meter** to extract it (skill, not luck); salvage-clicks on a crashed probe for Parts; mineral-chip clicks for morale/score. Hard carry-cap caps a lucky strike. Over-stay raises a suit-tear/dust-devil injury roll. Frank-the-Geologist widens the GPR cone / boosts yield. Keeps hunting's spend-resource→skill-phase→capped-yield→risk structure exactly. |
| **M7 Illness** | "You have died of dysentery." flat | **Typed conditions with treatment choices and reactive crew portraits.** Each affliction (Regolith Lung, Radiation Sickness, Hypothermia, Fracture, Hypoxia, Cabin Fever) has a named cause, a visible **progression bar** per afflicted member, distinct treatment (Medkit / rest at outpost / specific crew ability / wait), and a distinct mortality curve. Crew **portraits** react: pallor, coughing animation, shivering — so sickness is *seen* before it's fatal. The dysentery-line lands harder when you watched the bar fill. |
| **M8 Forts → Outposts** | Menu (buy/rest/news) | Keep the diegetic airlock dock (POC has it). Add a rendered habitat interior, a **stocked store** (marked-up restock), a persistent **exchange** with several offers, and a **colonist-news beat** that previews the next hazard (telegraphing = the modern, fair version of fort gossip). Resting shows the crew portraits recovering. |
| **M9 Trading** | Text barter | Drag-to-trade or slider barter UI with a live "fair value" read; roadside prospector encounters rendered in-world (a parked rover you pull alongside), sponsor-flavored (Independent gets solidarity discounts; Corporate gets gouged). |
| **M10 Crew** | Type 5 names | Crew select with portraits, role descriptions, and the buff each grants; let the player name them. Portraits then carry morale/health state for the whole run. |
| **M11 Morale** | Hidden gauge | First-class bar (POC has it) + **reactive portraits** + ambient cues (audio: arguing voices at low morale; the synth engine already supports cues). Low-morale events feel earned because you watched it slide. |
| **M12 Landmarks** | Text "You have reached Chimney Rock." | Each landmark = a rendered Martian **vista** (Tharsis volcanoes on the horizon, the Marineris rim, the dichotomy scarp) with a short lore card and a morale beat. The long blank stretches get punctuated by *views*, not just text. |
| **M13 Scoring** | Number + occupation high-score list | Animated settlement-arrival cinematic, a breakdown of the score components (crew/resources/Sols × sponsor), prestige tier ("Areologist First Class"), and a persistent local high-score board with sponsor badges. |
| **M14 Save** | Save at landmark | localStorage autosave at every outpost + manual quick-save; a "Continue" on the title screen; multiple expedition slots. |
| **M15 Death/tombstone** | ASCII tombstone + epitaph | A rendered **memorial**: the rover shown depressurized/half-buried in dust, the cause named in stark type, a per-crew memorial list, an epitaph entry — and (stretch) a persistent marker that future runs drive past on the trail, the way Oregon Trail's tombstones reappeared. Failure stays theatrical and memorable. |

---

## Build-milestone implications (derived ordering)

The gap analysis dictates the build order. Priority = (loop-completeness impact) × (faithfulness debt):

1. **Hazard Traverse (M5)** — the signature beat is currently a 2-option modal. Highest-value single feature. Build the hazard-family system, the "read" gauge, the multi-cost options, and the animated consequence.
2. **EVA Prospecting minigame (M6)** — turn the dice roll into the real active sub-loop (GPR aim + drill timing + carry-cap + risk).
3. **Sponsor/difficulty + crew select (M1, M10-naming)** — cheap, high loop-completeness; unlocks the score multiplier and risk/reward spine.
4. **Typed illness + expanded events (M7)** — condition table (cause→progression→treatment→mortality), reactive portraits, ~15 events.
5. **Deadline/season (M4)** + **save/continue (M14)** — make the calendar bite and the run persist.
6. **Outpost depth, trading, landmark lore (M8, M9, M12)** — flesh the relief/orientation layer.
7. **Terminus polish + high scores + memorial (M13, M15)** — payoff and failure theatre.

Everything else the POC already does (provisioning, pace/rations, crew/morale, terrain, hull,
thermal, upgrades, audio, day/night) is kept and only lightly polished per §5.
