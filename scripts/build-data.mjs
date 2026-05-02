#!/usr/bin/env node
/**
 * build-data.mjs
 *
 * Combines the motion plan with the audio alignment into the single source
 * of truth consumed by Remotion at render time.
 *
 * Output:
 *   src/data/scenes.json
 *     {
 *       fps, width, height,
 *       audio: { src, duration },
 *       scenes: [{ id, type, start, end, props }]
 *     }
 *
 * Timing strategy:
 *   1. If word-level timestamps exist, search for each scene's cueText in the
 *      transcript via fuzzy matching and snap the scene start to the matched
 *      word's timestamp.
 *   2. Any scene without a cue match gets its start interpolated between the
 *      anchored neighbours.
 *   3. If no transcript words are available we distribute time across scenes
 *      proportionally to their `weight`.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PLAN_PATH = path.join(ROOT, 'public', 'extracted', 'plan.json');
const ALIGN_PATH = path.join(ROOT, 'public', 'extracted', 'alignment.json');
const OUT_PATH = path.join(ROOT, 'src', 'data', 'scenes.json');

const FPS = 30;
const WIDTH = 1920;
const HEIGHT = 1080;
const MIN_SCENE_SECONDS = 2.4;

async function main() {
  await fs.mkdir(path.dirname(OUT_PATH), { recursive: true });

  const plan = JSON.parse(await fs.readFile(PLAN_PATH, 'utf8'));
  const align = JSON.parse(await fs.readFile(ALIGN_PATH, 'utf8'));
  const duration = Math.max(2, Number(align.duration) || 60);

  const scenes = plan.scenes.map((s) => ({ ...s }));
  const anchors = computeAnchors(scenes, align.words ?? []);
  const starts = distribute(anchors, scenes.length, duration);

  const out = scenes.map((s, i) => {
    const start = starts[i];
    const end = i + 1 < starts.length ? starts[i + 1] : duration;
    return {
      id: s.id,
      type: s.type,
      start,
      end: Math.max(end, start + MIN_SCENE_SECONDS / 2),
      props: s.props ?? {},
    };
  });

  const result = {
    fps: FPS,
    width: WIDTH,
    height: HEIGHT,
    audio: {
      src: 'audio/master-voiceover.mp3',
      duration,
    },
    scenes: out,
  };

  await fs.writeFile(OUT_PATH, JSON.stringify(result, null, 2));
  console.log(`[build:data] Wrote ${out.length} scenes spanning ${duration.toFixed(2)}s to src/data/scenes.json`);
}

function computeAnchors(scenes, words) {
  if (!words.length) return scenes.map(() => null);
  const transcript = words.map((w) => normalise(w.text));
  const anchors = [];
  let cursor = 0;
  for (const scene of scenes) {
    const cue = normalise(scene.cueText ?? '');
    if (!cue) {
      anchors.push(null);
      continue;
    }
    const cueTokens = cue.split(/\s+/).filter(Boolean);
    if (!cueTokens.length) {
      anchors.push(null);
      continue;
    }
    const idx = findCue(transcript, cueTokens, cursor);
    if (idx === -1) {
      anchors.push(null);
      continue;
    }
    anchors.push(words[idx].start);
    cursor = idx + cueTokens.length;
  }
  return anchors;
}

function normalise(s) {
  return String(s ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function findCue(transcript, cueTokens, fromIndex) {
  // Greedy contiguous match first, then fall back to a token-overlap window.
  for (let i = fromIndex; i <= transcript.length - cueTokens.length; i++) {
    let ok = true;
    for (let j = 0; j < cueTokens.length; j++) {
      if (transcript[i + j] !== cueTokens[j]) { ok = false; break; }
    }
    if (ok) return i;
  }
  // Fuzzy: find the window with maximum token overlap.
  const need = new Set(cueTokens);
  let best = -1;
  let bestScore = 0;
  const win = Math.max(cueTokens.length * 2, 6);
  for (let i = fromIndex; i <= transcript.length - 1; i++) {
    let score = 0;
    for (let j = 0; j < win && i + j < transcript.length; j++) {
      if (need.has(transcript[i + j])) score++;
    }
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  }
  return bestScore >= Math.max(1, Math.floor(cueTokens.length / 2)) ? best : -1;
}

function distribute(anchors, count, duration) {
  // Bracket the timeline: scene 0 starts at 0, virtual end anchor at duration.
  const a = anchors.slice();
  a[0] = 0;
  const ends = duration;

  // Forward fill respecting monotonicity.
  for (let i = 1; i < count; i++) {
    if (a[i] != null && a[i] <= a[i - 1]) a[i] = null;
  }

  // Interpolate gaps using weights would be ideal, but at this stage we just
  // linearly interpolate between known anchors and clamp later.
  let i = 0;
  while (i < count) {
    if (a[i] != null) { i++; continue; }
    let j = i;
    while (j < count && a[j] == null) j++;
    const left = a[i - 1] ?? 0;
    const right = a[j] ?? ends;
    const span = right - left;
    const steps = j - i + 1;
    for (let k = 0; k < j - i; k++) {
      a[i + k] = left + (span * (k + 1)) / steps;
    }
    i = j;
  }

  // Enforce a minimum scene length.
  for (let k = 1; k < count; k++) {
    if (a[k] - a[k - 1] < MIN_SCENE_SECONDS) {
      a[k] = a[k - 1] + MIN_SCENE_SECONDS;
    }
  }
  // If we ran past duration, compress proportionally.
  const total = a[count - 1] + MIN_SCENE_SECONDS;
  if (total > ends) {
    const scale = ends / total;
    for (let k = 0; k < count; k++) a[k] *= scale;
  }
  return a;
}

main().catch((err) => {
  console.error('[build:data] Fatal:', err);
  process.exit(1);
});
