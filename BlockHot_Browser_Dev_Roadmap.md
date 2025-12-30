# BlockHot Browser Development Roadmap (JavaScript, No Engine)

This roadmap targets a browser-hosted build using plain JavaScript and HTML5 Canvas 2D (no third-party game engines or dev tools).

## Phase 0: Web-First Foundations
- Decide target browsers, resolution (e.g., 320x180 or 480x270), and scaling strategy.
- Choose Canvas 2D rendering approach (pixel-art friendly).
- Define project structure (`/src`, `/assets`, `/levels`, `/audio`).
- Deliverable: Minimal HTML/JS boot that renders a test sprite and scales correctly.

## Phase 1: Core Engine (Custom, Lightweight)
- Game loop with fixed timestep + `requestAnimationFrame`.
- Input manager (keyboard; optional gamepad later) and pause handling.
- Asset loader (spritesheets, audio) and simple animation system.
- Render pipeline: camera, layers, parallax.
- Deliverable: Empty room with controllable camera and input logging.

## Phase 2: Movement + Collision
- Tilemap collision (AABB vs grid), ledges, drop-through platforms.
- Player controller: run, variable jump, wall-jump, dash.
- Debug overlay for collision and velocity.
- Deliverable: Movement feels tight and readable in a test level.

## Phase 3: Combat Foundation
- Projectile system, hitboxes, stun/neutralize logic.
- Reload timing and ammo UI.
- First enemy (snake) + basic cop patrol/chase scaffold.
- Deliverable: Player can fight and neutralize in a small encounter room.

## Phase 4: Heat System + UI
- Heat points to stars mapping, UI meter, escalation hooks.
- Cop spawner tied to star level.
- Safehouse checkpoint that heals and reduces Heat.
- Deliverable: Heat loop feels like pressure, not punishment.

## Phase 5: Level Pipeline (No Third-Party Tools)
- JSON level format for tiles, spawns, hazards, checkpoints.
- Optional in-browser level editor OR hand-authored JSON.
- Deliverable: One full level from start to goal using the pipeline.

## Phase 6: Content Expansion
- Pellet progression (Blue/Green/Yellow/Red) and new enemy roles.
- Hazards, powerups, upgrade menu, combos/scoring.
- 3 to 5 levels + 1 boss.
- Deliverable: World 1 to 3 playable loop.

## Phase 7: Polish + Performance
- Animation/FX pass, audio cues, UI clarity.
- Heat fairness tuning, enemy readability, input latency checks.
- Asset compression, caching, load times.
- Deliverable: Release-candidate web build.

## Hosting Path
- Static site with `index.html`, `main.js`, `/assets`, and `/levels`.
- Add a simple build step later only if needed for minification.
- Host on any static provider (GitHub Pages, Netlify, S3).

## Key Dependencies
- Movement feel must be locked before combat tuning.
- Heat escalation depends on stable enemy AI and HUD.
- Combo/scoring depends on reliable neutralize events and level pacing.
- Content production depends on a repeatable level template/pipeline.

## Risk Focus
- Heat fairness (avoid cheap escalation).
- Enemy readability (stun windows and hit feedback).
- Level pacing (escape routes at higher stars).
