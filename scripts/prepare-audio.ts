/**
 * prepare-audio.ts
 *
 * Stage 1, step 1.
 *
 * Copies input/master-voiceover.mp3 to public/audio/master-voiceover.mp3.
 *
 * Why two locations?
 *   - input/ is the canonical source-of-truth — checked into git, edited by
 *     the user, never modified by the pipeline.
 *   - public/audio/ is what Remotion's `staticFile()` serves at render time;
 *     it's a pipeline-managed copy so the source can stay untouched and the
 *     render directory stays clean.
 *
 * The file is byte-for-byte identical to the source; we never re-encode the
 * voiceover, never split it per scene, never stitch multiple files. There
 * is one continuous audio track in the final video, end of story.
 *
 * Run: `npm run prepare:audio` (uses tsx).
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'input', 'master-voiceover.mp3');
const DEST = path.join(ROOT, 'public', 'audio', 'master-voiceover.mp3');

async function main(): Promise<void> {
  const exists = await fileExists(SRC);
  if (!exists) {
    throw new Error(
      `[prepare:audio] Missing source ${path.relative(ROOT, SRC)}. ` +
        'Drop your voiceover MP3 there before running the pipeline.',
    );
  }

  await fs.mkdir(path.dirname(DEST), { recursive: true });
  await fs.copyFile(SRC, DEST);
  const { size } = await fs.stat(DEST);

  console.log(
    `[prepare:audio] ${path.relative(ROOT, SRC)} -> ${path.relative(ROOT, DEST)} ` +
      `(${(size / 1_000_000).toFixed(2)} MB)`,
  );
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
