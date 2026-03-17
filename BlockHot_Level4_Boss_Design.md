# BlockHot — Level 4: "The Enforcer" (Boss Level)
## Complete Design Document for Cursor Implementation

---

## THE SONIC BLUEPRINT

In Sonic, the boss formula is:
1. You clear the regular zone (enemies, platforming, rings)
2. The music fades, screen transitions
3. Eggman appears — short intro moment
4. Boss music kicks in, health bar appears
5. Pattern-based fight with clear vulnerability windows
6. Satisfying destruction sequence on kill

We're doing exactly this. The level has two halves:
**Part A:** Regular combat gauntlet (clear the block)
**Part B:** Cinematic intro → Boss fight with "The Enforcer"

---

## BOSS CHARACTER: "THE ENFORCER"

**Sprite:** Gemini_Generated_Image_g94574g94574g945.png (2000x1332)
**Look:** Massive dude — black ski mask, black tank top, chain necklace, jeans, boots.
He's built like a brick house. Wide power stance.
**In-game scale:** 42px tall (1.5x the MC's 28px — he needs to LOOM over the player)
**Name displayed:** "THE ENFORCER"

---

## PART A: THE GAUNTLET (Before the Boss)

The first half of Level 4 is a condensed combat challenge. Think of it as a "prove 
you're ready" section — shorter than a normal level, but denser with enemies.

### Level Layout Concept
- Width: ~40 tiles (not a long level — the boss is the main event)
- Mixed platforming: ground level + 2 platform tiers
- Enemy waves: ninjas + snakes + bulldogs + cops
- ONE safehouse at the midpoint
- Ends at a LOCKED GATE that opens when all enemies in the final wave are neutralized

### Gauntlet Flow
1. **Tiles 0-10:** 2 snakes, 1 black ninja. Warm-up.
2. **Tiles 10-20:** 3 ninjas (mix of red/blue) + 1 bulldog. Platforms above for escape routes.
3. **Tiles 20-30:** Safehouse at tile 25. SWAT team appears (2 SWAT). Coins on risky platforms.
4. **Tiles 30-40:** Final wave — 2 red ninjas + 1 SWAT + 2 bulldogs. All must be neutralized.
5. **Tile 40:** Locked gate. When last enemy falls, gate opens with a sound cue.

### After Clearing the Gate
- Player walks right through the gate
- Screen fades to black over 1 second
- **CINEMATIC BEGINS**

---

## PART B: THE CINEMATIC INTRO

This is what makes it feel like a movie scene. The game engine switches from "playing" 
state to "cutscene" state. Player input is disabled. The camera is scripted.

### Cutscene Sequence (Total: ~8 seconds)

**Beat 1: Black Screen + Text (0.0s - 2.0s)**
```
Screen is black.
Text fades in, centered, white, large font:

    "END OF THE LINE."

Hold for 1.5 seconds. Text fades out.
```

**Beat 2: Arena Reveal (2.0s - 4.0s)**
```
Background fades in — the boss arena (wide flat area with platforms).
Camera slowly pans right.
Atmospheric red/orange lighting tint on the background.
Low rumble sound effect plays.
```

**Beat 3: Boss Entrance (4.0s - 6.5s)**
```
Screen shakes (strength 2, 0.3s).
The Enforcer DROPS IN from above — falls from top of screen, 
lands with a heavy impact:
  - Landing dust explosion (big particle burst, 20 particles)
  - Screen shake on impact (strength 4, 0.2s)
  - Ground crack effect (optional: just particles fanning out horizontally)

He stands up into his power stance (the sprite).
Brief pause — he's looking at the player.
```

**Beat 4: Boss Name Card (6.0s - 7.5s)**
```
Large text slides in from right side:

    ████████████████████████████████
    ██   T H E   E N F O R C E R  ██
    ████████████████████████████████

Red background bar behind the text. 
The name card has a slight screen-shake on appearance.
Hold for 1.5 seconds, then slides off to the left.
```

**Beat 5: Fight Start (7.5s - 8.0s)**
```
Boss health bar SLAMS down from the top of the screen:
  - Full red bar, labeled "THE ENFORCER"
  - Spans ~60% of screen width, centered at top
  
Boss music starts (a harder, more intense track).
MC appears at left side of arena.
Player controls UNLOCK.

State changes from "cutscene" to "bossfight".
```

---

## PART C: THE BOSS FIGHT

### Arena Layout
```
(Screen width = 640px = 40 tiles)

Tile map (20 tiles tall, 40 tiles wide):

....................................
....................................
....................................
............----..........----.....
....................................
....----....................----....
....................................
..........----........----..........   <- Upper platforms
....................................
....................................
....................................
....................................
....................................
....................................
....................................
....................................
....................................
....................................
########################################  <- Ground floor
```

- Flat ground spanning the full width (the main fight area)
- 3 platform tiers at different heights (escape routes, tactical positioning)
- No pits — you can't fall to death in a boss fight (that's cheap)
- Walls on both sides (boss can't leave the arena, neither can you)

### Boss Stats
```
HP:             30 (takes ~30 blue pellet hits or ~15 red pellet hits)
Contact Damage: 2 (touching him hurts DOUBLE — he's huge and strong)
Speed (walk):   50 px/s
Speed (charge): 280 px/s
Speed (jump):   Launch vy = -400
```

### Boss AI: Three Phases

The Enforcer fights differently based on how much HP he has left.
Each phase transition has a brief cinematic moment.

---

#### PHASE 1: "THE BRAWLER" (HP 30-20)

The boss uses simple, readable attacks. This is the learning phase.

**Behavior Pattern (loops every ~6 seconds):**
1. **Stomp Walk** (2s) — Walks toward player at 50px/s. Screen shakes slightly with 
   each "step" (every 0.4s, strength 0.5). He's menacing but slow.
2. **Ground Pound** (1s) — When within 80px of player, JUMPS UP (vy = -300) then 
   slams DOWN. On landing:
   - Screen shake (strength 4, 0.2s)
   - Shockwave: two projectiles travel along the ground, left and right, at 150px/s
   - Player must JUMP to avoid the shockwave
   - Shockwave hitbox: 8px tall, travels along ground level
3. **Recovery** (1.5s) — After ground pound, he's STUNNED for 1.5 seconds. 
   His sprite flashes. **THIS IS THE VULNERABILITY WINDOW.**
   - Player should shoot him during this window
   - He takes normal damage at all times, but this is the safe window
4. **Swipe** (0.5s) — If player is within 40px during non-stun, he does a quick 
   melee swipe (damage 2, knockback 200px). Fast, punishes standing too close.

**Visual Cues (critical for fairness):**
- Ground pound telegraph: he crouches for 0.3s before jumping (the sprite squashes down)
- Swipe telegraph: his arm pulls back for 0.2s before swinging
- Stun window: sprite flashes white, small stars around head

**Player Strategy:** Stay at medium range, shoot during approach, jump over shockwaves, 
unload pellets during the 1.5s stun window.

---

#### PHASE TRANSITION 1→2 (At 20 HP)

```
Boss reaches 20 HP:
- Boss stops all actions
- Boss ROARS (screen shake strength 3, 0.5s duration)
- Red flash on screen
- Text appears briefly: "THE ENFORCER is getting serious..."
- Boss sprite tints slightly red (anger visual)
- 1.5 second pause, then Phase 2 begins
```

---

#### PHASE 2: "THE CHARGER" (HP 20-10)

Now he's faster and adds a devastating charge attack.

**New/Modified Attacks:**

1. **Bull Charge** (NEW) — He crouches for 0.5s (telegraph), then CHARGES 
   horizontally at 280px/s across the entire arena. 
   - Damage: 3 on contact
   - He charges until he hits a wall
   - On hitting the wall: he's STUNNED for 2.0 seconds (slams into it, dazed)
   - **THIS IS THE BIG VULNERABILITY WINDOW**
   - Dust trail behind him during charge
   - Screen shakes continuously during charge
   
2. **Ground Pound** (faster) — Jump is faster (vy = -400), recovery reduced to 1.0s

3. **Stomp Walk** (faster) — Speed increases to 70px/s

4. **Adds backup** — At the start of Phase 2, TWO snakes spawn from the sides. 
   They add pressure but die in 1 hit. Player has to manage adds while dodging boss.

**Player Strategy:** Bait the charge, dodge (jump or use platform), then unload during 
the 2-second wall-stun. The charge does massive damage but the stun window is generous.

**Visual Cues:**
- Charge telegraph: crouches low, screen darkens slightly for 0.5s, dust kicks up at feet
- The charge itself: sprite leans forward, afterimage trail (3 copies behind him)
- Wall impact: big particle explosion, screen shake, he stumbles backward

---

#### PHASE TRANSITION 2→3 (At 10 HP)

```
Boss reaches 10 HP:
- Boss SLAMS the ground with both fists
- ALL platforms in the arena BREAK (they become pass-through for 1 second, 
  then crumble and disappear) — fight is now ground-only
- Screen flash RED
- Text: "THE ENFORCER is ENRAGED!"
- Boss sprite now pulses with a red glow continuously
- Music intensifies (if you have a second track) or music tempo increases
- 2 second pause, then Phase 3 begins
```

---

#### PHASE 3: "ENRAGED" (HP 10-0)

The arena is now flat — no platforms to escape to. Pure skill check.

**Behavior (faster, more aggressive):**

1. **Rapid Charges** — Charges back and forth across the arena. After hitting a wall, 
   only 0.8s stun (down from 2.0s), then charges AGAIN in the opposite direction. 
   Does 2-3 charges in a row before stopping.

2. **Leap Slam** — Jumps toward the player's position (not just straight up). 
   Tracks the player's X position at the start of the jump. Landing creates 
   a LARGER shockwave (both directions, faster).

3. **Desperation Swipes** — If player is close, swipes twice in a row instead of once.

4. **NO adds** — This is a 1v1 duel. Pure.

**The catch:** His stun windows are shorter, but he takes DOUBLE damage in Phase 3. 
So every hit counts more. This creates the dramatic "I can finish him!" tension.

**Player Strategy:** Time your jumps over charges, shoot during brief stun windows. 
Red pellets (piercing) and Gold pellets (if you found one) are extremely valuable here.

---

## BOSS DEFEAT SEQUENCE

When The Enforcer hits 0 HP:

```
Timeline:

0.0s: Boss stops moving. Freezes in place.
0.0s: All player input disabled.
0.0s: Hit-stop freeze frame (0.3 seconds — longest in the game)
0.3s: Boss sprite starts FLASHING rapidly (white ↔ normal, 15Hz)
0.3s: Screen shake begins (strength 3, continuous)
0.5s: Small explosions spawn on the boss (random positions, every 0.2s)
      - Particle bursts: white, orange, red
      - 6-8 particles per explosion
1.5s: Boss sprite starts SINKING (moving down 1px per frame)
2.0s: ONE FINAL BIG EXPLOSION
      - Screen flash WHITE (0.3s)
      - Screen shake (strength 6, 0.3s)  
      - 30+ particles burst outward
      - Boss sprite fades to 0 opacity
2.5s: Silence. Screen settles.
3.0s: Text fades in:

      "THE ENFORCER HAS BEEN NEUTRALIZED"
      
      (gold text, centered, large)

4.5s: Coins rain from the top of the screen (20-30 coins falling like confetti)
      Each coin collected adds to score with combo

6.0s: Transition to Level Complete screen
      Show full stats: time, coins, score, damage taken, combo max
      Show Street Hero Objectives
      
      "YOU BEAT BLOCK HOT"
      "Press Enter to Play Again"
```

---

## BOSS HEALTH BAR DESIGN

The health bar is a CHARACTER in itself. It should feel weighty.

```
Position: Top center of screen
Width: 380px (60% of 640px screen)
Height: 12px bar + 14px name label = 26px total

Layout:
┌──────────────────────────────────────┐
│     T H E   E N F O R C E R         │  <- Name, white text, 10px font
├──────────────────────────────────────┤
│██████████████████████████████████████│  <- HP bar (red/orange gradient)
├──────────────────────────────────────┤
│ (dark background strip)              │
└──────────────────────────────────────┘

Colors:
- Bar background: #2a2a2a
- HP full:     gradient #e85858 (left) → #ff4444 (right)
- HP < 66%:    gradient #e8a858 → #ff8844 (shifts to orange)
- HP < 33%:    gradient #e85858 → #ff2222 (angry red, PULSES)
- Border:      #4a4a4a, 1px
- Name text:   #ffffff with #000000 shadow
- Background:  rgba(0, 0, 0, 0.7) panel behind everything

Animations:
- On damage: bar decreases smoothly (lerp over 0.3s, not instant)
- On damage: brief white flash on the bar
- On phase transition: bar SHAKES for 0.5s
- Phase 3: bar PULSES red (sin wave on alpha, 4Hz)
```

---

## WHAT TO PASTE INTO CURSOR

Give Cursor this entire prompt to implement the boss system:

```
I need you to build a BOSS FIGHT system for Level 4 of BlockHot. Here is the complete spec:

=== NEW GAME STATES ===
Add these states to the game state machine:
- "cutscene" — player input disabled, scripted camera/events
- "bossfight" — playing state but with boss active, health bar visible

=== BOSS ENTITY CLASS ===
Create a new Boss class (separate from Enemy) with:
- hp: 30, maxHp: 30
- width: 20, height: 28 (in-game pixels, larger than normal enemies)
- sprite scale: 42px tall (1.5x the MC)  
- phase: 1, 2, or 3 (changes at 20 HP and 10 HP)
- AI state machine: IDLE, WALK, GROUND_POUND, CHARGE, SWIPE, STUNNED, TRANSITION, DEFEATED
- contactDamage: 2
- flashTimer, stunTimer, chargeTimer, attackCooldown
- facing: tracks player position

=== BOSS AI (Phase 1: HP 30-20) ===
Loop pattern:
1. Walk toward player at 50px/s for 2s
2. If within 80px: Ground Pound — jump (vy=-300), slam down, spawn 2 ground shockwave 
   projectiles traveling left and right at 150px/s
3. After ground pound: stunned 1.5s (vulnerability window, flash white)
4. If player within 40px during non-stun: quick swipe (damage 2, knockback 200px)

=== BOSS AI (Phase 2: HP 20-10) ===
Add: Bull Charge — telegraph 0.5s, charge at 280px/s until hitting wall, 
stunned 2.0s on wall impact. Damage 3 on contact. Afterimage trail during charge.
Ground pound recovery reduced to 1.0s. Walk speed 70px/s.
Spawn 2 snakes when phase starts.

=== BOSS AI (Phase 3: HP 10-0) ===  
Platforms destroyed (remove from level). Rapid charges (0.8s stun between).
Leap toward player X position. Double damage taken in this phase.
No adds, pure 1v1.

=== CINEMATIC SYSTEM ===
When player reaches the boss trigger point, switch to "cutscene" state.
Run a timed sequence:
0-2s: Black screen, "END OF THE LINE." text fades in/out
2-4s: Arena background fades in, camera pans
4-6.5s: Boss drops from above, landing impact (particles + screenshake)
6-7.5s: Name card "THE ENFORCER" slides in from right, holds, slides out
7.5-8s: Boss health bar drops from top, music starts, controls unlock

=== BOSS HEALTH BAR ===
Draw at top center: 380px wide red bar with gradient.
Name label above: "THE ENFORCER"
Smooth HP decrease (lerp 0.3s). Flash white on damage.
Color shifts: red → orange at 66%, pulsing red at 33%.

=== DEFEAT SEQUENCE ===
0-0.3s: Hit-stop freeze
0.3-2s: Boss flashes, small explosions spawn on body every 0.2s
2-2.5s: Big explosion, screen flash white, boss fades out
3s: Victory text "THE ENFORCER HAS BEEN NEUTRALIZED"
4.5s: Coins rain from top
6s: Level complete screen

=== BOSS SPRITE ===
File: assets/Boss_Enforcer.png
Scale to 42px in-game height (1.5x the MC)
Use the same processSprite background removal as other characters.
Apply procedural animation:
- Idle: subtle menacing bob (1px, 2Hz)  
- Walk: heavy stomp bob (2px, per step)
- Charge: strong forward lean (15 degrees) + scaleX 1.15
- Ground pound up: scaleY 1.1, scaleX 0.9 (stretched)
- Ground pound land: scaleY 0.8, scaleX 1.2 (squashed) + particles
- Stunned: random shake (±3 degrees, 12Hz)
- Phase 3: red tint overlay (rgba(255,0,0,0.15) blended)

=== LEVEL 4 STRUCTURE ===
The level JSON has two zones:
1. Gauntlet zone (tiles 0-40): regular enemies, platforms, coins, one safehouse
2. Boss arena (tiles 42-80): flat ground, 3 platform tiers, walls on sides
A trigger at tile 41 starts the cutscene when player crosses it.
```

---

## LEVEL 4 JSON

Drop this in your levels/ folder as level4.json:

```json
{
  "tileSize": 16,
  "legend": { ".": 0, "#": 1, "-": 2, "!": 3 },
  "tiles": [
    "................................................................................",
    "................................................................................",
    "..........----......................................................----.......",
    "................................................................................",
    "....----..............----......................................................",
    "................................................................................",
    "....................----..........----...........................................",
    "................................................................................",
    "........----..............####..................................................",
    "................................................................................",
    "..----..............----........................................................",
    "................................................................................",
    "..........####..............----................................................",
    "................................................................................",
    "....----..........----......................----..........----..........----.....",
    "................................................................................",
    "..............----............................----....................----.......",
    "................................................................................",
    "........----................................................----................",
    "####!!####..########..####..####..##..########..################################"
  ],
  "spawns": {
    "player": { "tx": 2, "ty": 18 },
    "cops": [
      { "tx": 14, "ty": 18, "patrolRange": 64 },
      { "tx": 28, "ty": 18, "patrolRange": 80 }
    ],
    "ninjas": [
      { "tx": 8, "ty": 10, "type": "ninja" },
      { "tx": 16, "ty": 8, "type": "redNinja" },
      { "tx": 22, "ty": 12, "type": "blueNinja" },
      { "tx": 30, "ty": 10, "type": "redNinja" }
    ],
    "snakes": [
      { "tx": 5, "ty": 9, "ambush": true, "patrolRange": 24 },
      { "tx": 18, "ty": 13, "ambush": true, "patrolRange": 24 }
    ],
    "bulldogs": [
      { "tx": 24, "ty": 18, "patrolRange": 48 },
      { "tx": 34, "ty": 18, "patrolRange": 48 }
    ],
    "swats": [
      { "tx": 32, "ty": 18, "patrolRange": 64 }
    ]
  },
  "boss": {
    "type": "enforcer",
    "tx": 60,
    "ty": 18,
    "hp": 30,
    "triggerX": 41
  },
  "coins": [
    { "tx": 10, "ty": 2 }, { "tx": 11, "ty": 2 },
    { "tx": 4, "ty": 4 }, { "tx": 5, "ty": 4 },
    { "tx": 14, "ty": 4 }, { "tx": 15, "ty": 4 },
    { "tx": 20, "ty": 6 }, { "tx": 21, "ty": 6 },
    { "tx": 8, "ty": 8 }, { "tx": 9, "ty": 8 },
    { "tx": 26, "ty": 12 }, { "tx": 27, "ty": 12 },
    { "tx": 4, "ty": 14 }, { "tx": 5, "ty": 14 },
    { "tx": 18, "ty": 14 }, { "tx": 19, "ty": 14 },
    { "tx": 30, "ty": 14 }, { "tx": 31, "ty": 14 }
  ],
  "grass": [
    { "tx": 4, "ty": 9, "tw": 3, "th": 1 },
    { "tx": 17, "ty": 13, "tw": 3, "th": 1 }
  ],
  "safehouses": [
    { "tx": 20, "ty": 6, "tw": 1, "th": 1 }
  ],
  "powerups": [
    { "type": "medKit", "tx": 20, "ty": 5 },
    { "type": "armorHoodie", "tx": 10, "ty": 1 }
  ],
  "exit": { "tx": 78, "ty": 17, "tw": 1, "th": 2 },
  "minCoinsToExit": 0
}
```

---

## ASSETS YOU NEED TO GENERATE

1. **Boss_Enforcer.png** — You already have this! ✓
   Just rename the Gemini file to Boss_Enforcer.png and drop in assets/

2. **Level 4 Background** — Generate in NanaBanana:
   ```
   Pixel art background for a 2D platformer game. Urban Chicago back alley at night. 
   Concrete walls with graffiti, chain-link fence, dim orange street light overhead, 
   wet ground reflecting light. Menacing atmosphere. Dark tones — deep blues, 
   dark grays, touches of orange from the street light. 16-bit pixel art style.
   Wide format, 1536x1024 pixels. No characters in the scene.
   ```

3. **Boss Music** — You need a harder, more intense track than your regular music. 
   Use an AI music generator (Suno, Udio) with a prompt like:
   ```
   Intense 16-bit boss battle music. Chicago drill beat mixed with retro game 
   synths. Heavy bass, urgent tempo (140 BPM), menacing. 60 seconds, loopable.
   ```

---

## STREET HERO OBJECTIVES (Level 4)

- **No-Hit Boss** — Beat The Enforcer without taking damage from him
- **Speed Kill** — Defeat The Enforcer in under 90 seconds
- **Pellet Master** — Use at least 3 different pellet types during the boss fight
- **Clean Gauntlet** — Clear the gauntlet section without using any safehouses
- **Full Clear** — Collect all coins AND beat the boss
