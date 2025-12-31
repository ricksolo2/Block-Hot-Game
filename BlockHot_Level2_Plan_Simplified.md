# BlockHot — Level 2 Plan (Simplified)

## Level Name / Vibe
**Level 2: “Viaduct Lockdown”**  
Night underpass + rain + police tape blockade. More intense than Level 1.

---

## What Makes Level 2 Better Than Level 1
Level 2 adds:
- **A signature powerup:** **Green = Cable Swing** (new movement ability)
- **A big set-piece moment:** **Police Tape Blockade**
- **More enemy variety:** more snakes + Black Ninja + stronger Red Ninja
- **Two routes:** safer ground route vs rewarding high route (more coins)

---

## Pellet / Powerup Upgrades
- **Blue (Regular):** fast shots, basic damage  
- **Red (Cannon Blast):** slower, stronger, breaks weak barriers (good vs Red Ninja)  
- **Yellow (Pause):** freezes an attacker for **2 seconds** (escape/control tool)  
- **Green (Cable Swing):** **swing from anchor points** to reach ledges / avoid ground danger (movement tool)

---

## Enemies to Add
### Snakes in the Grass (more of them)
- Hide in grass patches
- Lunge when player gets close
- Place in small clusters (2–3) to create danger zones

### Black Ninja (base ninja)
- Jumps between platforms
- Standard threat (mid-level enemy)

### Red Ninja (elite ninja)
- Faster + tougher than Black Ninja
- Acts like a mini-boss near the end
- Drops a reward (coins/ammo/powerup)

---

## Level Flow (4 Sections)

### 1) Intro (Teach new danger)
- Grass patches with snakes
- 1–2 Black Ninjas
- Coins above hazards (risk/reward)

### 2) Powerup Moment (Green Cable Swing)
- Place Green pickup in a visible spot “just out of reach”
- After pickup, give an easy swing section with coins in the swing path

### 3) Police Blockade Set-Piece
- Police tape blocks the main path
- Give **2 ways to pass**:
  - **Red Cannon** breaks the barrier (action route)
  - **Green Cable Swing** goes above (skill route)
  - *(Optional)* **Yellow Pause** freezes an enemy so you can slip through

### 4) Finish / Mini-boss
- Red Ninja guards the exit
- Player must neutralize it OR survive past it to reach the exit gate

---

## Simple Hazards to Add (Pick 1–2)
- **Wet ground / slippery tiles** (less traction)
- **Falling debris** (shadow warning before it drops)
- **Spotlight scan** (pressure in the blockade area)

---

## Quick “Done” Checklist
- [ ] Green Cable Swing section (anchor points + reward coins)
- [ ] More snakes + Black Ninja enemies
- [ ] Red Ninja mini-boss near the end
- [ ] Police tape blockade with 2 routes
- [ ] At least 1 new hazard (slip OR debris OR spotlight)

---

## Detailed Build Plan (Level 2)

### Goals (What players should feel)
- Faster pace and higher stakes than Level 1.
- Clear risk/reward choices (safe ground vs high route).
- One new movement tool (Cable Swing) that feels essential, not optional.

### Level Flow (Expanded)
1) **Intro / Teach Snakes**
   - 2 grass patches with 2-3 snakes each.
   - 1 Black Ninja to pressure the player while learning snake timing.
   - Low-risk coin trail to guide forward.
2) **Powerup Moment (Green Cable Swing)**
   - Place Green pickup visible but out of reach.
   - First anchor point directly above a safe landing.
   - Coins placed along a gentle arc to show swing path.
3) **Police Tape Blockade (Set Piece)**
   - Tape blocks the main path at mid-level.
   - Route A (action): Red Cannon breaks barrier.
   - Route B (skill): Swing above the tape using 2 anchor points.
   - Optional Yellow Pause can freeze a guard enemy to slip through.
4) **Finish / Mini-boss**
   - Red Ninja guarding the exit.
   - Either defeat it or dash/swing past to reach exit.

### New Mechanics / Systems
- **Cable Swing (Green):**
  - Anchor points placed in the level data.
  - When Green is equipped and the player presses Jump near an anchor, attach and swing.
  - Let go with Jump or when reaching a max angle.
- **Police Tape Barrier:**
  - Breakable only by Red Cannon shots.
  - Red Ninja nearby encourages use of Red Cannon.

### Enemy Placement
- **Snakes:** clusters in grass lanes to create “no-go” zones.
- **Black Ninja:** standard threat, mid-speed, appears in Sections 1-3.
- **Red Ninja:** elite threat near end; higher HP and faster.

### Hazards (Pick 1 to implement first)
- **Wet Ground:** low friction tile near the blockade.
  - Makes player commit to jumps; high route becomes more attractive.

### Data / Content Additions
- `levels/level2.json` with:
  - tiles, grass zones, anchors, police tape barrier location
  - spawns for snakes, Black Ninja, Red Ninja
  - coin trail supporting both routes
  - exit gate location after mini-boss
- New entity types:
  - `ninja_red` (elite), `tape_barrier`, `anchor_point`

### UI / Feedback
- Show a short on-screen hint when Green pickup is collected:
  - “Green = Cable Swing (Jump near anchors).”
- Add a small icon or outline to anchor points so players see them.

### Acceptance Checklist
- [ ] Green swing works with at least 3 anchors.
- [ ] Police tape blocks the main path until broken or bypassed.
- [ ] Red Ninja feels tougher and can guard the exit.
- [ ] At least one hazard adds pressure (wet ground recommended).
- [ ] Two clear routes with different coin rewards.
