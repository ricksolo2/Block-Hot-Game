# BlockHot — Gameplay Design Doc (Markdown)

**Genre:** 2D 16-bit action platformer (Mega Man / Super Mario-style) with **GTA-inspired “Heat / Stars” escalation**  
**Core fantasy:** You are a street hero moving through Chicago neighborhoods, traversing rooftops, viaducts, and alley routes while managing chaos, collecting coins, and using non-lethal airsoft tech to disable threats.

---

## 1) Vision & Design Goals

### High-level goals
- **Tight, satisfying platforming** with momentum and readable hazards.
- **Skill-based combat** with simple inputs but layered decisions (pellet types, positioning, reload timing).
- **Heat (Stars) as dynamic pressure**, not just “more enemies.” Higher heat changes the level’s behavior and forces smart movement.
- **Replayable scoring + routes**: coins, combos, secrets, and optional “Street Hero Objectives” create multiple playstyles.

### Pillars (the game must always support these)
1. **Momentum Platforming:** Rooftops, gaps, ladders, wall-jumps, viaduct runs.
2. **Non-lethal Combat:** Airsoft stuns/disables enemies (gamey “defeat” = neutralize).
3. **Heat Management:** GTA-style stars (0–6) escalate threats.
4. **Risk/Reward Mastery:** Better score & loot from dangerous routes or high-heat play.

---

## 2) Core Gameplay Loop (Moment-to-Moment)

1. **Spawn → Move**
   - Navigate rooftops/streets/viaducts with jumps, wall-jumps, drops, and climbs.
2. **Encounter → Decide**
   - Fight (disable enemies), dodge, or bypass.
3. **Collect & Chain**
   - Grab coins and perform stylish movement/combat chains to build a **Combo Meter**.
4. **Heat Escalates**
   - Disabling cops increases **Heat**; higher stars add pressure via new units and scanning hazards.
5. **Checkpoint / Safehouse**
   - Mid-level checkpoints partially heal, allow loadout swap, and reduce Heat (rules below).
6. **Finish Objective**
   - Reach exit / beat boss / complete mission.
7. **Upgrade**
   - Spend coins/rep on improvements (weapons, stamina, reload speed, etc.).

---

## 3) Player Controls & Feel

### Core controls (recommended)
- **Move:** Left/Right  
- **Jump:** A  
- **Shoot:** X  
- **Reload:** R (or automatic reload with visible timing)  
- **Dash:** B (cooldown-based)  
- **Weapon Swap:** L/R shoulder (active ↔ storage)  
- **Interact:** Up + A (doors, ladders, checkpoints)

### Movement features (baseline kit)
- **Run + Short Hop / Full Hop** (variable jump height)
- **Wall Jump** (vertical mobility and route mastery)
- **Dash** (horizontal burst; optional air-dash unlock later)
- **Drop-through platforms** (down + jump)

**Design note:** Keep the physics snappy—fast acceleration, quick air control, predictable jump arcs.

---

## 4) HUD / UI Requirements

Top-left:
- **Health Bar** (segments or continuous bar)

Top-center:
- **Combo Meter** (multiplier + timer)

Top-right:
- **Heat Stars (0–6)** + small heat meter showing progress to next star

Bottom-right:
- **Weapon Icon** (current weapon + pellet type)
- **Ammo / Magazine** indicator
- **Storage Slots** (2 stored weapons)

Bottom-left:
- **Coins** + **Score**

---

## 5) Win / Lose Conditions

### Win a level when you complete the level’s **Primary Objective**
Rotate objective types by stage to maintain variety:
- **Reach the Exit**
- **Clear the Block** (disable required enemy types / defeat mini-boss)
- **Rescue / Escort** (get an NPC to a safehouse)
- **Collect Key Items** (e.g., 3 “Community Tokens” hidden across routes)

### Lose scenarios
- **Health reaches 0** → fail/respawn at checkpoint (or lose a life if using lives)
- **Out of bounds fall** → heavy damage or life loss (configurable)
- Optional “GTA twist”: At **6★**, special “BUST” attacks can trigger:
  - If grabbed by an elite unit, player must **mash/quick input** to escape; fail = instant level fail.

**Recommended for fairness:** Keep early levels simple (health only). Introduce BUST mechanic later as a high-heat risk.

---

## 6) Combat System

### Weapon concept
Primary is an **airsoft gun** with **pellets that change by level** (colors = properties).  
Combat emphasizes:
- **Positioning**
- **Stun windows**
- **Reload timing**
- **Pellet choice**

### Stun & “Defeat” model
Enemies have:
- **Stun** (temporary disable)
- **Break Threshold** (after N hits, enemy is fully neutralized / removed)

**Example baseline:**
- Blue pellets: **3 hits** to neutralize basic enemies; each hit stuns briefly.

### Reload & ammo
- Small magazine (e.g., 8–12 shots) to keep fights tactical.
- Reload is a readable animation (e.g., 0.8–1.2s), cancellable by dash/jump if you want advanced play.

---

## 7) Pellet Progression (Mega Man-style)

Pellet colors evolve across worlds and add meaningful mechanics.

### Suggested tiers
1. **Blue (World 1)**  
   - Fast stun, low break power  
   - 3 hits to neutralize basic enemies
2. **Green**  
   - Adds **pushback** (knock enemies off ledges)  
   - 2–3 hits for basics
3. **Yellow**  
   - **Chain stun** to one nearby target (small arc)  
   - Good vs groups
4. **Red**  
   - **Piercing** (hits 2 enemies in line)  
   - Better vs armored threats
5. **Purple**  
   - **Sticky slow** (controls space, great for chases)
6. **Gold (late game / rare)**  
   - Limited ammo **Overcharge** shots  
   - Strong vs elites / bosses

### Weapon storage rules
- Player holds **1 active** + **2 stored** weapons.
- Swap at checkpoints or with mid-level pick-ups.

---

## 8) Heat / Stars System (GTA-inspired)

Heat is the game’s signature system. It must feel like:
- **A thrilling chase**, not unfair punishment.
- Something the player can **manage** through decisions.

### Heat gain
- Disabling **cops** adds Heat points.
- Certain actions also add Heat (optional): breaking alarms, destroying property boxes, etc.

### Heat reduction
- Reaching a **safehouse checkpoint** reduces Heat by **1★** (minimum floor can be set per level).
- Specific items can reduce Heat (Bribe Token, Mask On, etc.).

### What stars change (example mapping)
- **0★:** light patrols, slow reaction
- **1★:** more patrol spawns, faster pursuit
- **2★:** ranged cops appear, barricades in common routes
- **3★:** drones/spotlights scan rooftops (forces movement)
- **4★:** armored units + “no-go” zones (need correct pellet type)
- **5★:** helicopter sweep (2D: spotlight sweep + drop-ins)
- **6★:** elite pursuer unit spawns and hunts until you break line-of-sight or hit safehouse

### Heat fairness rules (strongly recommended)
- Higher Heat also unlocks **escape options**:
  - rooftop shortcuts, vent tunnels, alley doors, moving platforms
- Heat escalation should be **predictable** (clear thresholds + UI feedback).

---

## 9) Enemies (Roles & Variants)

Keep enemies readable and purpose-driven.

### 1) Snakes (hazard enemies)
- Hide in grass; quick lunge on timing
- Low HP, punish sloppy movement
- Variants:
  - **Spitter Snake** (short-range projectile)
  - **Coil Snake** (longer stun resistance)

### 2) Ninjas (skill enemies)
- Mirror player movement (jumps, wall hops)
- Occasional dodge
- Variants:
  - **Smoke Ninja** (teleports/repositions briefly)
  - **Shuriken Ninja** (light ranged pressure)

### 3) Cops (pressure enemies)
- Patrol → chase behavior
- Heat-linked scaling
- Variants by star level:
  - **Patrol Cop** (0–1★)
  - **Ranged Cop** (2★)
  - **Drone Operator** (3★)
  - **Armored Cop** (4★)
  - **Heli Support** (5★)
  - **Elite Unit** (6★; BUST grab)

### Optional later additions (for variety)
- **Exploder Crate-Bot**: turns platforms into hazards
- **Scanner Drone**: spotlight scan that forces motion and route changes

---

## 10) Hazards & Level Objects

### Environmental hazards
- **Grass patches** with hidden snakes
- **Exploding boxes/crates** (timed or triggered)
- **Falling roof tiles** / collapsing edges
- **Moving platforms** (train cars / viaduct lifts)
- **Vents / wind gusts** (jump timing)
- **Electrical puddles** (timing windows)

### Interactive objects
- **Ladders / fire escapes**
- **Door shortcuts** (unlockable routes)
- **Vents** (crawl tunnels)
- **Zip lines** (viaduct sections)
- **Checkpoints / Safehouses** (heal + heat reduction)

---

## 11) Powerups

Organize powerups into clear categories so players understand them instantly.

### A) Movement powerups
- **Double Jump Shoes** (temporary)
- **Wall-Cling Gloves** (longer cling time)
- **Grapple Line** (attach to ledges/lamps)
- **Dash Burst** (cooldown reduction or extra dash charge)

### B) Combat powerups
- **Rapid Fire** (higher fire rate)
- **Overcharge Shot** (one powerful blast, limited uses)
- **Piercing Rounds** (temporary property)
- **Decoy** (pulls enemies / cops away briefly)

### C) Survival powerups
- **Armor Hoodie** (absorbs 1 hit)
- **Med Kit** (+HP)
- **Shield Bubble** (short invulnerability)
- **Slow Time** (better dodging + precision platforming)

### D) Heat / Score powerups (signature)
- **Bribe Token** (drop 1★ instantly)
- **Mask On** (cops ignore briefly unless you shoot)
- **Coin Magnet** (pull coins for speed routes)
- **Hype Mode** (combo timer freezes for 10s)

---

## 12) Upgrades (Between Levels)

Make upgrades meaningful and limited to avoid bloat.

### Currency
- **Coins:** general upgrade currency
- Optional: **Rep:** earned from hero objectives and clean runs

### Upgrade categories
- **Max Health** (+1 segment)
- **Stamina / Sprint duration**
- **Reload speed**
- **Ammo capacity**
- **Pellet efficiency** (reduce hits needed)
- **Heat control** (slower heat gain; stronger checkpoint heat drop)

**Upgrade pacing recommendation:** 1 strong upgrade per level or 2 smaller upgrades per world.

---

## 13) Scoring, Combos, and Replayability

### Scoring sources
- Coins collected
- Enemies neutralized (bonus for variety)
- Combo multiplier (movement + combat chain)
- Secrets discovered
- Street Hero Objectives completed
- Time bonus (optional; better as rank bonus, not strict fail)

### Combo system
Combo increases by:
- consecutive enemy neutralizations
- stylish movement streaks (wall-jump chain, rooftop triple jump, mid-air crate stomp)

Combo breaks when:
- player takes damage
- combo timer expires (stopping too long)
- player falls

### Street Hero Objectives (examples)
- Save 2 NPCs
- Collect 3 Community Tokens (hidden)
- Finish with **≤2★** (clean run)
- Finish with **≥4★** (high-heat challenge)
- Disable all ninjas in the level
- Put out 3 “hazard fires” (hit valves, stop explosions)

---

## 14) Difficulty Scaling Over Time

Avoid cheap scaling (HP inflation). Increase difficulty through:
1. **Geometry complexity:** wider gaps, moving platforms, vertical climbs
2. **Hazard timing:** tighter windows, combo hazards (exploders + snakes)
3. **Enemy mix:** more combinations and flanking
4. **AI behaviors:** dodges, shields, pursuit patterns
5. **Resource pressure:** fewer ammo drops, more reload decisions
6. **Heat sensitivity:** later worlds gain heat faster BUT provide more escape routes

### Dynamic pacing (optional “Director”)
Track player performance:
- speed through sections
- damage taken
- average Heat level

Adjust slightly:
- spawn pacing
- item drops
- checkpoint spacing (within limits)

---

## 15) Level Structure & World Themes

### World blueprint (example)
- **World 1: The Block** (teach basics, Blue pellets)
- **World 2: The Viaducts** (verticality, grapple intros)
- **World 3: The Yard** (industrial hazards, train platforms)
- **World 4: Downtown Edge** (spotlights + pursuit emphasis)
- **World 5: The Towers** (high vertical, elite threats)
Each world ends with:
- **Boss** that tests new mechanic
- Unlocks new pellet type or movement upgrade

### Checkpoints
- Use “safehouses” as diegetic checkpoints:
  - corner store
  - community center
  - alley gate
  - rooftop access door

---

## 16) Boss Design (Mega Man DNA)

Bosses should be:
- Pattern-based
- Mechanic-focused
- Weakness-linked to a newly earned pellet type

### Example boss concept: “Elite Pursuer”
- **Phase 1:** Charge + ranged stun shots
- **Phase 2:** Calls drones/spotlights (forces platforming)
- **Weakness:** world’s pellet type (e.g., Purple sticky slows charges)

---

## 17) Game Modes (Optional but powerful)

1. **Story Mode**
   - Worlds with progression, upgrades, bosses
2. **Wanted Run (Endless)**
   - Survive as long as possible as Heat climbs
3. **Time Trial**
   - Leaderboard-friendly: fastest route with minimal damage
4. **Challenge Contracts**
   - “Beat Level 3 with only Blue pellets”
   - “Finish with 5★+”

---

## 18) Economy & Drops

### Drop types
- **Coins** (common)
- **Ammo** (common)
- **Powerups** (uncommon)
- **Weapon pickups** (rare, often in secrets)
- **Heat reducers** (rare, strategic)

### Risk/reward placement
- Put high-value coins and rare powerups on:
  - dangerous rooftops
  - alternate routes
  - heat-heavy zones

---

## 19) Audio & Visual Style Notes (16-bit)

### Visual targets
- 16-bit inspired: bold silhouettes, crisp pixel readability
- Strong color coding:
  - pellet color = weapon behavior
  - Heat star level = environment/lighting intensity

### Sound targets
- Distinct sounds for:
  - each pellet type
  - Heat star increase (audible warning)
  - checkpoint safehouse “cool down”
  - combo tick/chain confirmations

---

## 20) Vibe-Coding Friendly Implementation Plan (Scope Safety)

To keep this buildable, implement in modular phases:

### Phase 1 — Prototype (Core feel)
- movement + jump + wall-jump + dash
- 1 enemy type (snake)
- coins + basic HUD
- 1 short level

### Phase 2 — Combat + Pellets
- shoot + hit stun + break threshold
- pellet color system (Blue + Green)
- reload + ammo HUD

### Phase 3 — Heat System
- stars + thresholds + UI
- cop spawner tied to stars
- safehouse checkpoint reduces Heat

### Phase 4 — Content & Progression
- 3–5 levels, 1 boss
- upgrades menu
- powerups

### Phase 5 — Polish
- combos, secrets, alternate routes
- balancing and difficulty curves

---

## 21) Quick Balancing Defaults (Starting Values)

These are safe “starting points” to tune later:
- Player max HP: **5 segments**
- Blue pellet: **3 hits** to neutralize basic enemies  
- Reload time: **1.0s**
- Heat star thresholds: **10 / 20 / 35 / 55 / 80 / 110 Heat**
- Safehouse Heat reduction: **-1★**
- Coins per level (target): **150–300** total across routes

---

## 22) Summary: What Makes BlockHot Special

- **Classic 16-bit platforming** with modern pressure via **Heat Stars**
- **Non-lethal projectile combat** with **pellet evolution** (Mega Man-style)
- **Replayability** through combos, hero objectives, secrets, and alternate routes
- A “chase feel” that grows naturally as your Heat rises—**always with escape options** so it stays thrilling.

---

## Appendix: Glossary
- **Neutralize:** Game term for disabling/removing an enemy (non-lethal framing).
- **Heat:** Hidden points that convert into star levels.
- **Safehouse:** Checkpoint that also reduces Heat.
- **Combo Meter:** Multiplier system for stylish play.
