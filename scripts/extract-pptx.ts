/**
 * extract-pptx.ts
 *
 * Reads input/deck.pptx as an Open XML package (a zip), pulls structured
 * content out of every slide, and writes src/data/pptx-extracted.json.
 *
 * The extracted data is treated as SOURCE MATERIAL ONLY for the cinematic
 * Remotion render. The slide screenshots referenced by `screenshot` are
 * never used as the main video — they are reference frames for humans.
 *
 * Run: `npm run extract` (which uses tsx).
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import JSZip from 'jszip';
import { XMLParser } from 'fast-xml-parser';

interface MediaRef {
  /** Path under public/, suitable for Remotion staticFile(). */
  file: string;
  /** Original filename inside the .pptx (e.g. "image1.png"). */
  originalName: string;
  /** File size in bytes. */
  bytes: number;
  /** Lowercase extension without the leading dot. */
  ext: string;
}

interface TextRun {
  text: string;
  level: number;
  bold: boolean;
  sizePt: number | null;
}

interface NumberToken {
  raw: string;
  value: number;
  context: string;
}

interface ExtractedSlide {
  slideNumber: number;
  sourceXml: string;
  rawText: string;
  inferredTitle: string;
  textRuns: TextRun[];
  numbers: NumberToken[];
  media: MediaRef[];
  /** Reference-only path. Drop a slide screenshot here if you want one. */
  screenshot: string;
  notes: string;
}

interface ExtractionOutput {
  sourceFile: string;
  generatedAt: string;
  slideCount: number;
  slides: ExtractedSlide[];
  /** Reminder for any downstream consumer. */
  usage: string;
}

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DECK_PATH = path.join(ROOT, 'input', 'deck.pptx');
const MEDIA_DIR = path.join(ROOT, 'public', 'media');
const SLIDES_REF_DIR = path.join(ROOT, 'public', 'slides');
const OUT_PATH = path.join(ROOT, 'src', 'data', 'pptx-extracted.json');

const USAGE_NOTE =
  'Source material only. Do NOT use slide screenshots as the main video — ' +
  'every slide is reinterpreted as an animated Remotion scene.';

const xml = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  allowBooleanAttributes: true,
  parseTagValue: false,
  trimValues: true,
});

async function main(): Promise<void> {
  await fs.mkdir(MEDIA_DIR, { recursive: true });
  await fs.mkdir(SLIDES_REF_DIR, { recursive: true });
  await fs.mkdir(path.dirname(OUT_PATH), { recursive: true });

  const exists = await fileExists(DECK_PATH);
  if (!exists) {
    console.warn(
      `[extract] No PowerPoint at ${path.relative(ROOT, DECK_PATH)} — writing empty extraction.`,
    );
    await writeOutput({
      sourceFile: path.relative(ROOT, DECK_PATH),
      generatedAt: new Date().toISOString(),
      slideCount: 0,
      slides: [],
      usage: USAGE_NOTE,
    });
    return;
  }

  const buf = await fs.readFile(DECK_PATH);
  const zip = await JSZip.loadAsync(buf);

  const slideOrder = await readSlideOrder(zip);
  const slides: ExtractedSlide[] = [];

  for (let i = 0; i < slideOrder.length; i++) {
    const slidePath = slideOrder[i];
    const slideNumber = i + 1;
    try {
      const slide = await parseSlide(zip, slidePath, slideNumber);
      slides.push(slide);
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      console.warn(`[extract] Failed to parse ${slidePath}: ${reason}`);
      slides.push({
        slideNumber,
        sourceXml: slidePath,
        rawText: '',
        inferredTitle: '',
        textRuns: [],
        numbers: [],
        media: [],
        screenshot: `slides/slide-${slideNumber}.png`,
        notes: '',
      });
    }
  }

  await writeOutput({
    sourceFile: path.relative(ROOT, DECK_PATH),
    generatedAt: new Date().toISOString(),
    slideCount: slides.length,
    slides,
    usage: USAGE_NOTE,
  });

  console.log(
    `[extract] Wrote ${slides.length} slides to ${path.relative(ROOT, OUT_PATH)}`,
  );
}

async function readSlideOrder(zip: JSZip): Promise<string[]> {
  const presRels = zip.file('ppt/_rels/presentation.xml.rels');
  const pres = zip.file('ppt/presentation.xml');
  const fallback = (): string[] =>
    Object.keys(zip.files)
      .filter((p) => /^ppt\/slides\/slide\d+\.xml$/.test(p))
      .sort(slideNumberSort);

  if (!presRels || !pres) return fallback();

  const relsXml = xml.parse(await presRels.async('string'));
  const rels = arr<Record<string, string>>(relsXml?.Relationships?.Relationship);
  const slideRelById = new Map<string, string>();
  for (const r of rels) {
    const type = r['@_Type'];
    if (typeof type === 'string' && type.endsWith('/slide')) {
      slideRelById.set(String(r['@_Id']), String(r['@_Target']));
    }
  }

  const presXml = xml.parse(await pres.async('string'));
  const sldIds = arr<Record<string, string>>(
    presXml?.['p:presentation']?.['p:sldIdLst']?.['p:sldId'],
  );
  const ordered: string[] = [];
  for (const s of sldIds) {
    const rid = s['@_r:id'];
    if (!rid) continue;
    const target = slideRelById.get(rid);
    if (!target) continue;
    const norm = path.posix.normalize(
      path.posix.join('ppt', target.replace(/^\.\.\//, '')),
    );
    ordered.push(norm);
  }
  return ordered.length ? ordered : fallback();
}

function slideNumberSort(a: string, b: string): number {
  const an = Number(a.match(/slide(\d+)/)?.[1] ?? 0);
  const bn = Number(b.match(/slide(\d+)/)?.[1] ?? 0);
  return an - bn;
}

async function parseSlide(
  zip: JSZip,
  slidePath: string,
  slideNumber: number,
): Promise<ExtractedSlide> {
  const file = zip.file(slidePath);
  if (!file) throw new Error('slide file missing');

  const slideXml = xml.parse(await file.async('string'));
  const shapes = collectShapes(slideXml);

  const textRuns: TextRun[] = [];
  for (const sp of shapes) {
    const txBody = sp?.['p:txBody'];
    if (!txBody) continue;
    const ps = arr<Record<string, unknown>>(txBody['a:p']);
    for (const p of ps) {
      const text = collectText(p).trim();
      if (!text) continue;
      const pPr = (p?.['a:pPr'] as Record<string, string> | undefined) ?? {};
      textRuns.push({
        text,
        level: Number(pPr['@_lvl'] ?? 0),
        bold: detectBold(p),
        sizePt: detectSize(p),
      });
    }
  }

  const inferredTitle = findTitle(shapes) ?? textRuns[0]?.text ?? '';
  const titleIndex = textRuns.findIndex((r) => r.text === inferredTitle);
  const body = titleIndex === -1 ? textRuns : textRuns.filter((_, i) => i !== titleIndex);

  const rawText = textRuns.map((r) => r.text).join('\n');
  const numbers = extractNumbers(textRuns.map((r) => r.text));
  const media = await extractMedia(zip, slidePath, slideNumber);
  const notes = await extractNotes(zip, slidePath);

  return {
    slideNumber,
    sourceXml: slidePath,
    rawText,
    inferredTitle,
    textRuns: body,
    numbers,
    media,
    screenshot: `slides/slide-${slideNumber}.png`,
    notes,
  };
}

function collectShapes(slideXml: any): Record<string, any>[] {
  const tree = slideXml?.['p:sld']?.['p:cSld']?.['p:spTree'];
  if (!tree) return [];
  const out: Record<string, any>[] = [];
  out.push(...arr<Record<string, any>>(tree['p:sp']));
  for (const g of arr<Record<string, any>>(tree['p:grpSp'])) {
    out.push(...arr<Record<string, any>>(g['p:sp']));
  }
  return out;
}

function collectText(node: unknown): string {
  if (node == null) return '';
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) return node.map(collectText).join('');
  if (typeof node !== 'object') return '';
  let out = '';
  for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
    if (k === 'a:t') {
      if (Array.isArray(v)) {
        out += v.map((x) => (typeof x === 'string' ? x : '')).join('');
      } else {
        out += String(v ?? '');
      }
    } else if (k === 'a:br') {
      out += '\n';
    } else if (k.startsWith('@_')) {
      // skip attributes
    } else if (typeof v === 'object' && v !== null) {
      out += collectText(v);
    }
  }
  return out;
}

function detectBold(p: any): boolean {
  for (const r of arr<Record<string, any>>(p?.['a:r'])) {
    if (r?.['a:rPr']?.['@_b'] === '1') return true;
  }
  return false;
}

function detectSize(p: any): number | null {
  for (const r of arr<Record<string, any>>(p?.['a:r'])) {
    const sz = r?.['a:rPr']?.['@_sz'];
    if (sz != null) {
      const n = Number(sz);
      if (Number.isFinite(n)) return n / 100; // OOXML stores hundredths of points
    }
  }
  return null;
}

function findTitle(shapes: Record<string, any>[]): string | null {
  for (const sp of shapes) {
    const ph = sp?.['p:nvSpPr']?.['p:nvPr']?.['p:ph'];
    const type = ph?.['@_type'];
    if (type === 'title' || type === 'ctrTitle') {
      const text = collectText(sp?.['p:txBody']).trim();
      if (text) return text.split('\n')[0]!.trim();
    }
  }
  return null;
}

function extractNumbers(texts: string[]): NumberToken[] {
  const out: NumberToken[] = [];
  const re = /(\$?£?€?\s?-?\d[\d,.]*\s?(?:[%kKmMbB]|bn|m|k|million|billion|pts?|bps)?)/g;
  for (const t of texts) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(t)) !== null) {
      const raw = m[1].trim();
      if (!raw) continue;
      const numeric = Number(raw.replace(/[^\d.\-]/g, ''));
      if (!Number.isFinite(numeric)) continue;
      out.push({ raw, value: numeric, context: t });
    }
  }
  return out;
}

async function extractMedia(
  zip: JSZip,
  slidePath: string,
  slideNumber: number,
): Promise<MediaRef[]> {
  const slideName = path.posix.basename(slidePath);
  const relsFile = zip.file(`ppt/slides/_rels/${slideName}.rels`);
  if (!relsFile) return [];
  const relsXml = xml.parse(await relsFile.async('string'));
  const rels = arr<Record<string, string>>(relsXml?.Relationships?.Relationship);
  const out: MediaRef[] = [];
  for (const r of rels) {
    const type = r['@_Type'] ?? '';
    if (!type.endsWith('/image')) continue;
    const target = r['@_Target'];
    if (!target) continue;
    const mediaPath = path.posix.normalize(path.posix.join('ppt/slides', target));
    const mediaFile = zip.file(mediaPath);
    if (!mediaFile) continue;
    const originalName = path.posix.basename(mediaPath);
    const ext = (path.posix.extname(originalName) || '.png').slice(1).toLowerCase();
    const safeName = `slide${slideNumber}-${originalName}`;
    const data = await mediaFile.async('nodebuffer');
    await fs.writeFile(path.join(MEDIA_DIR, safeName), data);
    out.push({
      file: `media/${safeName}`,
      originalName,
      bytes: data.length,
      ext,
    });
  }
  return out;
}

async function extractNotes(zip: JSZip, slidePath: string): Promise<string> {
  const slideName = path.posix.basename(slidePath);
  const relsFile = zip.file(`ppt/slides/_rels/${slideName}.rels`);
  if (!relsFile) return '';
  const relsXml = xml.parse(await relsFile.async('string'));
  const rels = arr<Record<string, string>>(relsXml?.Relationships?.Relationship);
  for (const r of rels) {
    const type = r['@_Type'] ?? '';
    if (!type.endsWith('/notesSlide')) continue;
    const target = r['@_Target'];
    if (!target) continue;
    const notesPath = path.posix.normalize(path.posix.join('ppt/slides', target));
    const notesFile = zip.file(notesPath);
    if (!notesFile) continue;
    const notesXml = xml.parse(await notesFile.async('string'));
    return collectText(notesXml).trim();
  }
  return '';
}

function arr<T>(maybe: unknown): T[] {
  if (maybe == null) return [];
  return Array.isArray(maybe) ? (maybe as T[]) : [maybe as T];
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function writeOutput(out: ExtractionOutput): Promise<void> {
  await fs.writeFile(OUT_PATH, JSON.stringify(out, null, 2));
}

main().catch((err: unknown) => {
  console.error('[extract] Fatal:', err);
  process.exit(1);
});
