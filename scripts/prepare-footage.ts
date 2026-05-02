/**
 * prepare-footage.ts
 *
 * Stage 1 step that pulls curated B-roll from Pexels for the scenes
 * defined in src/data/footage-plan.json. Downloads the chosen MP4s into
 * public/footage/ and writes a manifest at src/data/footage.json.
 *
 * Why a curated brief and not a free-text query at render time?
 * Because film direction matters. Each Pexels query is hand-picked to
 * land the cinematographic intent of the scene; the script just
 * mechanically resolves and downloads the best file per brief.
 *
 * Requires PEXELS_API_KEY (free, https://www.pexels.com/api/). Without
 * it the script logs a warning, writes an empty manifest, and exits 0
 * so the rest of the pipeline can continue. Footage scenes degrade
 * gracefully to a forest surface in that case.
 *
 * Run: `npm run prepare:footage`.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

interface FootageBrief {
  sceneId: string;
  slug: string;
  queries: string[];
  minDurationSec?: number;
  preferredOrientation?: 'landscape' | 'portrait';
  minWidth?: number;
  intent: string;
}

interface FootagePlan {
  scenes: FootageBrief[];
  [k: string]: unknown;
}

interface PexelsVideoFile {
  id: number;
  quality: string;
  file_type: string;
  width: number;
  height: number;
  fps: number;
  link: string;
}

interface PexelsVideo {
  id: number;
  width: number;
  height: number;
  duration: number;
  url: string;
  user: { name: string; url: string };
  video_files: PexelsVideoFile[];
}

interface PexelsSearchResponse {
  videos?: PexelsVideo[];
  total_results?: number;
}

interface ManifestEntry {
  sceneId: string;
  slug: string;
  file: string;
  durationSec: number;
  width: number;
  height: number;
  pexelsId: number;
  pexelsUrl: string;
  photographer: string;
  photographerUrl: string;
  query: string;
}

interface Manifest {
  generatedAt: string;
  source: string;
  entries: ManifestEntry[];
  warnings: string[];
}

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PLAN_PATH = path.join(ROOT, 'src', 'data', 'footage-plan.json');
const MANIFEST_PATH = path.join(ROOT, 'src', 'data', 'footage.json');
const FOOTAGE_DIR = path.join(ROOT, 'public', 'footage');

const PEXELS_SEARCH = 'https://api.pexels.com/videos/search';

async function main(): Promise<void> {
  await fs.mkdir(FOOTAGE_DIR, { recursive: true });

  const plan = await readPlan();
  if (!plan.scenes.length) {
    await writeManifest({
      generatedAt: new Date().toISOString(),
      source: path.relative(ROOT, PLAN_PATH),
      entries: [],
      warnings: ['footage-plan.json has no scenes; nothing to fetch.'],
    });
    console.log('[prepare:footage] No briefs in plan — nothing to fetch.');
    return;
  }

  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) {
    console.warn(
      '[prepare:footage] PEXELS_API_KEY not set. Skipping all downloads — ' +
        'footage scenes will fall back to the forest surface at render time.',
    );
    await writeManifest({
      generatedAt: new Date().toISOString(),
      source: path.relative(ROOT, PLAN_PATH),
      entries: [],
      warnings: ['PEXELS_API_KEY not set; no footage downloaded.'],
    });
    return;
  }

  const entries: ManifestEntry[] = [];
  const warnings: string[] = [];

  for (const brief of plan.scenes) {
    try {
      const entry = await resolveAndDownload(apiKey, brief);
      if (entry) {
        entries.push(entry);
        console.log(
          `[prepare:footage] ${brief.sceneId} -> ${entry.file} ` +
            `(${entry.width}x${entry.height}, ${entry.durationSec}s, ` +
            `pexels#${entry.pexelsId}, ${entry.photographer})`,
        );
      } else {
        warnings.push(`${brief.sceneId}: no Pexels match found for any query.`);
        console.warn(`[prepare:footage] ${brief.sceneId}: no match found.`);
      }
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      warnings.push(`${brief.sceneId}: ${reason}`);
      console.warn(`[prepare:footage] ${brief.sceneId}: ${reason}`);
    }
  }

  await writeManifest({
    generatedAt: new Date().toISOString(),
    source: path.relative(ROOT, PLAN_PATH),
    entries,
    warnings,
  });

  console.log(
    `[prepare:footage] Wrote manifest with ${entries.length}/${plan.scenes.length} ` +
      `entries to ${path.relative(ROOT, MANIFEST_PATH)}.`,
  );
}

async function readPlan(): Promise<FootagePlan> {
  const raw = await fs.readFile(PLAN_PATH, 'utf8');
  return JSON.parse(raw) as FootagePlan;
}

async function writeManifest(m: Manifest): Promise<void> {
  await fs.writeFile(MANIFEST_PATH, JSON.stringify(m, null, 2));
}

async function resolveAndDownload(
  apiKey: string,
  brief: FootageBrief,
): Promise<ManifestEntry | null> {
  const orientation = brief.preferredOrientation ?? 'landscape';
  const minDuration = brief.minDurationSec ?? 10;
  const minWidth = brief.minWidth ?? 1280;

  for (const query of brief.queries) {
    const url = new URL(PEXELS_SEARCH);
    url.searchParams.set('query', query);
    url.searchParams.set('orientation', orientation);
    url.searchParams.set('size', 'medium');
    url.searchParams.set('per_page', '15');

    const res = await fetch(url, { headers: { Authorization: apiKey } });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Pexels HTTP ${res.status}: ${body.slice(0, 200)}`);
    }
    const payload = (await res.json()) as PexelsSearchResponse;
    const candidates = (payload.videos ?? []).filter(
      (v) => v.duration >= minDuration && v.width >= minWidth,
    );
    if (!candidates.length) continue;

    // Prefer videos closest to 1920x1080 in HD/FHD, with the longest
    // available duration (so playback can run at near-native speed).
    candidates.sort((a, b) => b.duration - a.duration);
    const winner = candidates[0]!;
    const fileChoice = pickBestFile(winner);
    if (!fileChoice) continue;

    const destPath = path.join(FOOTAGE_DIR, `${brief.slug}.mp4`);
    await downloadTo(fileChoice.link, destPath);

    return {
      sceneId: brief.sceneId,
      slug: brief.slug,
      file: `footage/${brief.slug}.mp4`,
      durationSec: winner.duration,
      width: fileChoice.width,
      height: fileChoice.height,
      pexelsId: winner.id,
      pexelsUrl: winner.url,
      photographer: winner.user?.name ?? 'unknown',
      photographerUrl: winner.user?.url ?? '',
      query,
    };
  }
  return null;
}

/**
 * Picks the best MP4 file from a Pexels video's variants.
 * Target ~1920x1080 — never larger (we're rendering at FHD) and never
 * smaller than 1280x720.
 */
function pickBestFile(video: PexelsVideo): PexelsVideoFile | null {
  const mp4 = video.video_files.filter((f) => f.file_type === 'video/mp4');
  if (!mp4.length) return null;

  // Score: closer to 1920x1080 wins, then prefer 30fps, then HD over UHD.
  const scored = mp4.map((f) => {
    const sizeScore = Math.abs(f.width - 1920) + Math.abs(f.height - 1080);
    const fpsScore = Math.abs((f.fps ?? 30) - 30) * 80;
    const tooSmall = f.width < 1280 ? 10000 : 0;
    const tooLarge = f.width > 2560 ? 5000 : 0;
    return {
      f,
      score: sizeScore + fpsScore + tooSmall + tooLarge,
    };
  });
  scored.sort((a, b) => a.score - b.score);
  return scored[0]?.f ?? null;
}

async function downloadTo(url: string, dest: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok || !res.body) {
    throw new Error(`Download HTTP ${res.status} for ${url}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  await fs.writeFile(dest, buf);
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
