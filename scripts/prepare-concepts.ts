/**
 * prepare-concepts.ts
 *
 * Stage 1 step that generates AI concept clips via the Arcads API for
 * the scenes listed in src/data/concept-plan.json. Downloads the
 * resulting MP4s into public/concepts/ and writes a manifest at
 * src/data/concepts.json.
 *
 * Models used: veo31, sora2 (per-scene in the plan).
 *
 * Auth: HTTP Basic with ARCADS_API_KEY as username, empty password.
 *
 * If ARCADS_API_KEY is not set, the script logs a warning, writes an
 * empty manifest, and exits 0. Scenes that expected a concept clip
 * fall back to the existing Pexels footage (or the surface) at render
 * time.
 *
 * Run: `npm run prepare:concepts`.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

interface ConceptBrief {
  sceneId: string;
  slug: string;
  model: string;
  duration: number;
  aspectRatio: '16:9' | '9:16';
  resolution: '720p' | '480p';
  prompt: string;
  intent: string;
}

interface ConceptPlan {
  scenes: ConceptBrief[];
  model_defaults?: Partial<ConceptBrief>;
  [k: string]: unknown;
}

interface ManifestEntry {
  sceneId: string;
  slug: string;
  file: string;
  model: string;
  durationSec: number;
  aspectRatio: string;
  arcadsAssetId: string;
  generationTimeSec?: number;
  creditsCharged?: number;
}

interface Manifest {
  generatedAt: string;
  source: string;
  entries: ManifestEntry[];
  warnings: string[];
}

interface ArcadsAsset {
  id: string;
  status?: string;
  state?: string;
  url?: string;
  videoUrl?: string;
  outputUrl?: string;
  generationTimeSec?: number;
  creditsCharged?: number;
  [k: string]: unknown;
}

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PLAN_PATH = path.join(ROOT, 'src', 'data', 'concept-plan.json');
const MANIFEST_PATH = path.join(ROOT, 'src', 'data', 'concepts.json');
const CONCEPTS_DIR = path.join(ROOT, 'public', 'concepts');

const BASE_URL = process.env.ARCADS_BASE_URL ?? 'https://external-api.arcads.ai';

/** Status strings the API may use to indicate the asset is ready. */
const TERMINAL_OK = new Set(['generated', 'completed', 'ready', 'succeeded']);
const TERMINAL_FAIL = new Set(['failed', 'error', 'cancelled', 'canceled']);

/** Polling cadence: every 6s for up to ~10 minutes. */
const POLL_INTERVAL_MS = 6_000;
const POLL_TIMEOUT_MS = 10 * 60 * 1000;

async function main(): Promise<void> {
  await fs.mkdir(CONCEPTS_DIR, { recursive: true });

  const plan = await readPlan();
  if (!plan.scenes.length) {
    await writeManifest({
      generatedAt: new Date().toISOString(),
      source: path.relative(ROOT, PLAN_PATH),
      entries: [],
      warnings: ['concept-plan.json has no scenes; nothing to generate.'],
    });
    console.log('[prepare:concepts] No briefs in plan — nothing to generate.');
    return;
  }

  const apiKey = process.env.ARCADS_API_KEY;
  if (!apiKey) {
    console.warn(
      '[prepare:concepts] ARCADS_API_KEY not set. Skipping all generations — ' +
        'concept scenes will fall back to footage / surface at render time.',
    );
    await writeManifest({
      generatedAt: new Date().toISOString(),
      source: path.relative(ROOT, PLAN_PATH),
      entries: [],
      warnings: ['ARCADS_API_KEY not set; no concept clips generated.'],
    });
    return;
  }

  const entries: ManifestEntry[] = [];
  const warnings: string[] = [];

  for (const brief of plan.scenes) {
    try {
      const entry = await generateAndDownload(apiKey, brief);
      if (entry) {
        entries.push(entry);
        console.log(
          `[prepare:concepts] ${brief.sceneId} -> ${entry.file} ` +
            `(${entry.model}, ${entry.durationSec}s, ` +
            `gen ${entry.generationTimeSec ?? '?'}s, ` +
            `credits ${entry.creditsCharged ?? '?'})`,
        );
      }
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      warnings.push(`${brief.sceneId}: ${reason}`);
      console.warn(`[prepare:concepts] ${brief.sceneId}: ${reason}`);
    }
  }

  await writeManifest({
    generatedAt: new Date().toISOString(),
    source: path.relative(ROOT, PLAN_PATH),
    entries,
    warnings,
  });

  console.log(
    `[prepare:concepts] Wrote manifest with ${entries.length}/${plan.scenes.length} ` +
      `entries to ${path.relative(ROOT, MANIFEST_PATH)}.`,
  );
}

async function readPlan(): Promise<ConceptPlan> {
  const raw = await fs.readFile(PLAN_PATH, 'utf8');
  return JSON.parse(raw) as ConceptPlan;
}

async function writeManifest(m: Manifest): Promise<void> {
  await fs.writeFile(MANIFEST_PATH, JSON.stringify(m, null, 2));
}

function basicAuthHeader(apiKey: string): string {
  const token = Buffer.from(`${apiKey}:`).toString('base64');
  return `Basic ${token}`;
}

async function generateAndDownload(
  apiKey: string,
  brief: ConceptBrief,
): Promise<ManifestEntry | null> {
  const auth = basicAuthHeader(apiKey);

  const body = {
    model: brief.model,
    prompt: brief.prompt,
    duration: brief.duration,
    aspectRatio: brief.aspectRatio,
    resolution: brief.resolution,
  };

  const res = await fetch(`${BASE_URL}/v2/videos/generate`, {
    method: 'POST',
    headers: {
      Authorization: auth,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`generate HTTP ${res.status}: ${text.slice(0, 300)}`);
  }
  const created = (await res.json()) as ArcadsAsset;
  const assetId =
    typeof created.id === 'string'
      ? created.id
      : (created as Record<string, unknown>)['videoId'];
  if (typeof assetId !== 'string') {
    throw new Error(`generate response had no asset id: ${JSON.stringify(created).slice(0, 200)}`);
  }

  const finished = await pollUntilTerminal(auth, assetId);
  const url =
    finished.url ??
    finished.videoUrl ??
    finished.outputUrl ??
    extractUrlFromAsset(finished);
  if (!url) {
    throw new Error(
      `asset ${assetId} reached terminal state but no URL was found in the response`,
    );
  }

  const destPath = path.join(CONCEPTS_DIR, `${brief.slug}.mp4`);
  await downloadTo(url, destPath);

  return {
    sceneId: brief.sceneId,
    slug: brief.slug,
    file: `concepts/${brief.slug}.mp4`,
    model: brief.model,
    durationSec: brief.duration,
    aspectRatio: brief.aspectRatio,
    arcadsAssetId: assetId,
    generationTimeSec:
      typeof finished.generationTimeSec === 'number'
        ? finished.generationTimeSec
        : undefined,
    creditsCharged:
      typeof finished.creditsCharged === 'number'
        ? finished.creditsCharged
        : undefined,
  };
}

async function pollUntilTerminal(auth: string, assetId: string): Promise<ArcadsAsset> {
  const deadline = Date.now() + POLL_TIMEOUT_MS;
  let lastStatus = 'unknown';
  while (Date.now() < deadline) {
    await sleep(POLL_INTERVAL_MS);
    // Try the asset endpoint first; fall back to videos endpoint.
    let asset = await getOrNull(`${BASE_URL}/v1/assets/${assetId}`, auth);
    if (!asset) {
      asset = await getOrNull(`${BASE_URL}/v1/videos/${assetId}`, auth);
    }
    if (!asset) continue;

    const status = String(asset.status ?? asset.state ?? '').toLowerCase();
    if (status !== lastStatus) {
      console.log(`[prepare:concepts]   asset ${assetId}: ${status}`);
      lastStatus = status;
    }
    if (TERMINAL_OK.has(status)) return asset;
    if (TERMINAL_FAIL.has(status)) {
      throw new Error(`asset ${assetId} ended with status "${status}"`);
    }
  }
  throw new Error(`asset ${assetId} did not finish within ${POLL_TIMEOUT_MS / 1000}s`);
}

async function getOrNull(url: string, auth: string): Promise<ArcadsAsset | null> {
  const res = await fetch(url, { headers: { Authorization: auth } });
  if (!res.ok) return null;
  return (await res.json().catch(() => null)) as ArcadsAsset | null;
}

function extractUrlFromAsset(asset: ArcadsAsset): string | undefined {
  // Some APIs nest the video URL under output / outputs / files.
  const o = asset as Record<string, unknown>;
  const candidates = [o['output'], o['outputs'], o['files'], o['video']];
  for (const c of candidates) {
    if (typeof c === 'string' && c.startsWith('http')) return c;
    if (Array.isArray(c) && c.length) {
      const first = c[0];
      if (typeof first === 'string' && first.startsWith('http')) return first;
      if (first && typeof first === 'object') {
        const u = (first as Record<string, unknown>)['url'];
        if (typeof u === 'string' && u.startsWith('http')) return u;
      }
    }
    if (c && typeof c === 'object') {
      const u = (c as Record<string, unknown>)['url'];
      if (typeof u === 'string' && u.startsWith('http')) return u;
    }
  }
  return undefined;
}

async function downloadTo(url: string, dest: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok || !res.body) {
    throw new Error(`Download HTTP ${res.status} for ${url}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.writeFile(dest, buf);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
