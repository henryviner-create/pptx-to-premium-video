/**
 * prepare-logos.ts
 *
 * Stage 1, mechanical. Copies the canonical TenTrinity Carbon logo PNGs
 * from input/ to public/logos/ so Remotion can serve them via
 * staticFile('logos/<name>.png') at render time.
 *
 * The source files in input/ are the source of truth and are never
 * modified. public/logos/ is a pipeline-managed copy.
 *
 * Fails clearly if any required logo is missing.
 *
 * Run: `npm run prepare:logos`.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC_DIR = path.join(ROOT, 'input');
const DEST_DIR = path.join(ROOT, 'public', 'logos');

const LOGOS = [
  'tentrinity-carbon-icon-gold.png',
  'tentrinity-carbon-icon-gold-lightgrey.png',
  'tentrinity-carbon-icon-gold-white.png',
  'tentrinity-carbon-horizontal-gold.png',
  'tentrinity-carbon-horizontal-white.png',
] as const;

async function main(): Promise<void> {
  await fs.mkdir(DEST_DIR, { recursive: true });

  const missing: string[] = [];
  for (const name of LOGOS) {
    const src = path.join(SRC_DIR, name);
    try {
      await fs.access(src);
    } catch {
      missing.push(name);
    }
  }

  if (missing.length) {
    console.error(
      '[prepare:logos] Missing required logo files in input/:\n  - ' +
        missing.join('\n  - '),
    );
    process.exit(1);
  }

  let totalBytes = 0;
  for (const name of LOGOS) {
    const src = path.join(SRC_DIR, name);
    const dest = path.join(DEST_DIR, name);
    await fs.copyFile(src, dest);
    const { size } = await fs.stat(dest);
    totalBytes += size;
    console.log(
      `[prepare:logos] ${path.relative(ROOT, src)} -> ${path.relative(ROOT, dest)} (${(size / 1024).toFixed(1)} KB)`,
    );
  }

  console.log(
    `[prepare:logos] Copied ${LOGOS.length} logos (${(totalBytes / 1024).toFixed(1)} KB total).`,
  );
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
