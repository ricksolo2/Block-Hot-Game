export const ENTITY_STATES = Object.freeze({
  IDLE: "idle",
  RUN: "run",
  ATTACK: "attack",
  STUNNED: "stunned",
  DEAD: "dead",
  JUMP: "jump",
});

export function splitSpriteSheet(image, frameCount) {
  if (!image || frameCount <= 0) return [];

  const frames = [];
  for (let i = 0; i < frameCount; i += 1) {
    const sx = Math.round((i * image.width) / frameCount);
    const nextSx = Math.round(((i + 1) * image.width) / frameCount);
    frames.push({
      image,
      sx,
      sy: 0,
      sw: Math.max(1, nextSx - sx),
      sh: image.height,
    });
  }

  return frames;
}

export function createFrame(image) {
  if (!image) return null;
  return {
    image,
    sx: 0,
    sy: 0,
    sw: image.width,
    sh: image.height,
  };
}

export function mergeFrames(...groups) {
  const merged = [];
  for (let i = 0; i < groups.length; i += 1) {
    const group = groups[i];
    if (!group) continue;
    if (Array.isArray(group)) {
      for (let j = 0; j < group.length; j += 1) {
        if (group[j]) merged.push(group[j]);
      }
    } else if (group) {
      merged.push(group);
    }
  }
  return merged;
}

export function createClip(frames, options = {}) {
  const filtered = frames.filter(Boolean);
  if (filtered.length === 0) return null;

  return {
    frames: filtered,
    frameDuration:
      options.frameDuration !== undefined && options.frameDuration !== null
        ? options.frameDuration
        : 0.12,
    loop:
      options.loop !== undefined && options.loop !== null
        ? options.loop
        : true,
    facing:
      options.facing !== undefined && options.facing !== null
        ? options.facing
        : 0,
  };
}

export function getAnimationClip(entity, animationSet) {
  if (!entity || !animationSet) return null;
  return (
    resolveClipVariant(entity, animationSet[entity.state]) ||
    resolveClipVariant(entity, animationSet[ENTITY_STATES.IDLE]) ||
    null
  );
}

export function stepAnimation(entity, dt, animationSet) {
  const clip = getAnimationClip(entity, animationSet);
  if (!clip) return null;

  if (clip.frames.length <= 1) {
    entity.animationFrame = 0;
    entity.animationTimer = 0;
    return clip;
  }

  entity.animationTimer += dt;
  while (entity.animationTimer >= clip.frameDuration) {
    entity.animationTimer -= clip.frameDuration;
    if (clip.loop) {
      entity.animationFrame =
        (entity.animationFrame + 1) % clip.frames.length;
    } else {
      entity.animationFrame = Math.min(
        clip.frames.length - 1,
        entity.animationFrame + 1
      );
    }
  }

  return clip;
}

export function getAnimationFrame(entity, animationSet) {
  const clip = getAnimationClip(entity, animationSet);
  if (!clip || clip.frames.length === 0) return null;
  const index = Math.min(entity.animationFrame || 0, clip.frames.length - 1);
  return clip.frames[index];
}

function resolveClipVariant(entity, clip) {
  if (!clip) return null;
  if (Array.isArray(clip.frames)) return clip;

  const facing = entity && entity.facing < 0 ? -1 : 1;
  if (facing < 0 && clip.left) return clip.left;
  if (facing > 0 && clip.right) return clip.right;
  return clip.default || clip.right || clip.left || null;
}
