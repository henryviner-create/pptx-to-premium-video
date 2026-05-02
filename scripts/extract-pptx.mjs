#!/usr/bin/env node
/**
 * extract-pptx.mjs
 *
 * Reads input/deck.pptx as a zip archive, parses each slide's XML, and writes
 * a structured JSON description of the deck plus extracted media files.
 *
 * Output:
 *   public/extracted/slides.json   structured slide content
 *   public/extracted/media/*       embedded images copied verbatim
 *
 * The extraction is intentionally tolerant: malformed or unexpected slides do
 * not abort the pipeline. Slides that fail to parse are emitted with empty
 * content so downstream stages still produce a continuous timeline.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import JSZip from 'jszip';
import { XMLParser } from 'fast-xml-parser';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DECK_PATH = path.join(ROOT, 'input', 'deck.pptx');
const OUT_DIR = path.join(ROOT, 'public', 'extracted');
const MEDIA_DIR = path.join(OUT_DIR, 'media');

const xml = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  allowBooleanAttributes: true,
  parseTagValue: false,
  trimValues: true,
});

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  await fs.mkdir(MEDIA_DIR, { recursive: true });

  const exists = await fs.access(DECK_PATH).then(() => true).catch(() => false);
  if (!exists) {
    console.warn(`[extract] No PowerPoint found at ${path.relative(ROOT, DECK_PATH)}.`);
    console.warn('[extract] Writing placeholder slides.json so downstream tasks can still run.');
    await fs.writeFile(
      path.join(OUT_DIR, 'slides.json'),
      JSON.stringify(placeholderDeck(), null, 2),
    );
    return;
  }

  const buf = await fs.readFile(DECK_PATH);
  const zip = await JSZip.loadAsync(buf);

  const slideOrder = await readSlideOrder(zip);
  const slides = [];
  for (let i = 0; i < slideOrder.length; i++) {
    const slidePath = slideOrder[i];
    try {
      const slide = await parseSlide(zip, slidePath, i);
      slides.push(slide);
    } catch (err) {
      console.warn(`[extract] Failed to parse ${slidePath}: ${err.message}`);
      slides.push({ index: i, source: slidePath, title: '', body: [], numbers: [], images: [] });
    }
  }

  const deck = {
    sourceFile: path.relative(ROOT, DECK_PATH),
    slideCount: slides.length,
    slides,
  };

  await fs.writeFile(path.join(OUT_DIR, 'slides.json'), JSON.stringify(deck, null, 2));
  console.log(`[extract] Wrote ${slides.length} slides to public/extracted/slides.json`);
}

async function readSlideOrder(zip) {
  const presRels = zip.file('ppt/_rels/presentation.xml.rels');
  const pres = zip.file('ppt/presentation.xml');
  if (!presRels || !pres) {
    return Object.keys(zip.files)
      .filter((p) => /^ppt\/slides\/slide\d+\.xml$/.test(p))
      .sort(slideNumberSort);
  }
  const relsXml = xml.parse(await presRels.async('string'));
  const rels = arr(relsXml?.Relationships?.Relationship);
  const slideRelById = new Map();
  for (const r of rels) {
    if (typeof r['@_Type'] === 'string' && r['@_Type'].endsWith('/slide')) {
      slideRelById.set(r['@_Id'], r['@_Target']);
    }
  }
  const presXml = xml.parse(await pres.async('string'));
  const sldIds = arr(presXml?.['p:presentation']?.['p:sldIdLst']?.['p:sldId']);
  const ordered = [];
  for (const s of sldIds) {
    const rid = s?.['@_r:id'];
    const target = slideRelById.get(rid);
    if (!target) continue;
    const norm = path.posix.normalize(path.posix.join('ppt', target.replace(/^\.\.\//, '')));
    ordered.push(norm);
  }
  if (ordered.length === 0) {
    return Object.keys(zip.files)
      .filter((p) => /^ppt\/slides\/slide\d+\.xml$/.test(p))
      .sort(slideNumberSort);
  }
  return ordered;
}

function slideNumberSort(a, b) {
  const an = Number(a.match(/slide(\d+)/)?.[1] ?? 0);
  const bn = Number(b.match(/slide(\d+)/)?.[1] ?? 0);
  return an - bn;
}

async function parseSlide(zip, slidePath, index) {
  const file = zip.file(slidePath);
  if (!file) throw new Error('slide file missing');
  const slideXml = xml.parse(await file.async('string'));

  const shapes = collectShapes(slideXml);
  const paragraphs = [];
  for (const sp of shapes) {
    const txBody = sp?.['p:txBody'];
    if (!txBody) continue;
    const ps = arr(txBody['a:p']);
    for (const p of ps) {
      const text = collectText(p);
      if (text.trim().length === 0) continue;
      paragraphs.push({
        text: text.trim(),
        level: Number(p?.['a:pPr']?.['@_lvl'] ?? 0),
        bold: detectBold(p),
        sizePt: detectSize(p),
      });
    }
  }

  const title = findTitle(shapes) ?? paragraphs[0]?.text ?? '';
  const titleParaIdx = paragraphs.findIndex((p) => p.text === title);
  const body = paragraphs.filter((_, i) => i !== titleParaIdx);

  const numbers = extractNumbers(paragraphs.map((p) => p.text));
  const images = await extractMedia(zip, slidePath, index);

  const note = await extractNotes(zip, slidePath);

  return {
    index,
    source: slidePath,
    title,
    body,
    numbers,
    images,
    note,
    layoutHint: classifyLayout({ title, body, numbers, images }),
  };
}

function collectShapes(slideXml) {
  const tree = slideXml?.['p:sld']?.['p:cSld']?.['p:spTree'];
  if (!tree) return [];
  const shapes = [];
  const direct = arr(tree['p:sp']);
  shapes.push(...direct);
  const groups = arr(tree['p:grpSp']);
  for (const g of groups) {
    shapes.push(...arr(g['p:sp']));
  }
  return shapes;
}

function collectText(node) {
  if (node == null) return '';
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) return node.map(collectText).join('');
  let out = '';
  for (const [k, v] of Object.entries(node)) {
    if (k === 'a:t') {
      out += Array.isArray(v) ? v.map((x) => (typeof x === 'string' ? x : '')).join('') : String(v ?? '');
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

function detectBold(p) {
  const runs = arr(p?.['a:r']);
  for (const r of runs) {
    if (r?.['a:rPr']?.['@_b'] === '1') return true;
  }
  return false;
}

function detectSize(p) {
  const runs = arr(p?.['a:r']);
  for (const r of runs) {
    const sz = r?.['a:rPr']?.['@_sz'];
    if (sz) return Number(sz) / 100; // OOXML stores hundredths of points
  }
  return null;
}

function findTitle(shapes) {
  for (const sp of shapes) {
    const ph = sp?.['p:nvSpPr']?.['p:nvPr']?.['p:ph'];
    const type = ph?.['@_type'];
    if (type === 'title' || type === 'ctrTitle') {
      const text = collectText(sp?.['p:txBody']).trim();
      if (text) return text.split('\n')[0].trim();
    }
  }
  return null;
}

function extractNumbers(texts) {
  const out = [];
  const re = /(\$?\£?\€?\s?-?\d[\d,\.]*\s?(?:[%kKmMbB]|bn|m|k|million|billion|pts?|bps)?)/g;
  for (const t of texts) {
    let m;
    while ((m = re.exec(t)) !== null) {
      const raw = m[1].trim();
      if (raw.length < 1) continue;
      const numeric = Number(raw.replace(/[^\d.\-]/g, ''));
      if (!Number.isFinite(numeric)) continue;
      out.push({ raw, value: numeric, context: t });
    }
  }
  return out;
}

async function extractMedia(zip, slidePath, slideIndex) {
  const slideName = path.posix.basename(slidePath);
  const relsPath = `ppt/slides/_rels/${slideName}.rels`;
  const relsFile = zip.file(relsPath);
  if (!relsFile) return [];
  const relsXml = xml.parse(await relsFile.async('string'));
  const rels = arr(relsXml?.Relationships?.Relationship);
  const out = [];
  for (const r of rels) {
    const type = r['@_Type'] ?? '';
    if (!type.endsWith('/image')) continue;
    const target = r['@_Target'];
    if (!target) continue;
    const mediaPath = path.posix.normalize(path.posix.join('ppt/slides', target));
    const mediaFile = zip.file(mediaPath);
    if (!mediaFile) continue;
    const ext = path.posix.extname(mediaPath) || '.png';
    const safeName = `slide${slideIndex + 1}-${path.posix.basename(mediaPath)}`;
    const outPath = path.join(MEDIA_DIR, safeName);
    const data = await mediaFile.async('nodebuffer');
    await fs.writeFile(outPath, data);
    out.push({
      file: `extracted/media/${safeName}`,
      ext: ext.slice(1),
      bytes: data.length,
    });
  }
  return out;
}

async function extractNotes(zip, slidePath) {
  const slideName = path.posix.basename(slidePath);
  const relsPath = `ppt/slides/_rels/${slideName}.rels`;
  const relsFile = zip.file(relsPath);
  if (!relsFile) return '';
  const relsXml = xml.parse(await relsFile.async('string'));
  const rels = arr(relsXml?.Relationships?.Relationship);
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

function classifyLayout({ title, body, numbers, images }) {
  const text = [title, ...body.map((b) => b.text)].join(' ').trim();
  if (!text && images.length) return 'image';
  if (body.length === 0 && title) return 'section';
  if (numbers.length >= 1 && body.length <= 3) return 'metric';
  if (/^["“”']/.test(body[0]?.text ?? '') || /[—–-]\s*[A-Z]/.test(body.map((b) => b.text).join(' '))) return 'quote';
  if (body.length >= 2) return 'bullets';
  return 'title';
}

function arr(maybe) {
  if (maybe == null) return [];
  return Array.isArray(maybe) ? maybe : [maybe];
}

function placeholderDeck() {
  return {
    sourceFile: 'input/deck.pptx (missing)',
    slideCount: 3,
    slides: [
      {
        index: 0,
        source: 'placeholder',
        title: 'Welcome',
        body: [{ text: 'Cinematic narrative starts here.', level: 0, bold: false, sizePt: null }],
        numbers: [],
        images: [],
        note: '',
        layoutHint: 'title',
      },
      {
        index: 1,
        source: 'placeholder',
        title: 'Headline metric',
        body: [{ text: 'Year-over-year growth', level: 0, bold: false, sizePt: null }],
        numbers: [{ raw: '127%', value: 127, context: '127% YoY' }],
        images: [],
        note: '',
        layoutHint: 'metric',
      },
      {
        index: 2,
        source: 'placeholder',
        title: 'The road ahead',
        body: [
          { text: 'Premium animated storytelling.', level: 0, bold: false, sizePt: null },
          { text: 'Driven by your existing deck.', level: 0, bold: false, sizePt: null },
        ],
        numbers: [],
        images: [],
        note: '',
        layoutHint: 'bullets',
      },
    ],
  };
}

main().catch((err) => {
  console.error('[extract] Fatal:', err);
  process.exit(1);
});
