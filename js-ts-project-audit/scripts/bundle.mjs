#!/usr/bin/env node
// Schneidet den Quelltext eines Projekts in Slices und schreibt je Slice
// Bündeldateien, die ein Reviewer mit wenigen Read-Aufrufen am Stück liest
// statt mit einem Aufruf je Datei. Keine Dependencies: läuft mit Node ab 18.
//
//   node bundle.mjs <slices.json> --out <dir> [--root .] [--max-chars 60000]
//
// slices.json:
//   { "sources": "<datei mit einem Pfad je Zeile, z. B. $TMP/source.txt>",
//     "slices": [ { "id": "renderer", "paths": ["src/render/", "src/gl/Context.ts"] },
//                 { "id": "harness", "files": ["package.json", "tsconfig.json"], "source": false } ] }
//
// - `paths`: Verzeichnispräfixe oder Globs (`src/render/**`, `src/*.ts`), wie sie
//   in `portrait.components[].paths` stehen, gegen die Liste aus `sources`
//   gematcht. Eine Datei gehört zum ersten Slice, dessen Pfad passt. Was keinem Slice zufällt, landet in
//   einem Slice `rest` — nichts fällt still heraus.
// - `files`: explizite Dateien, auch außerhalb von `sources` (Configs, Tests).
//   `"source": false` heißt: zählt nicht zum Prüfumfang.
//
// Ausgabe in <dir>: <slice>-<n>.txt je Bündel und index.json mit Dateien,
// Zeilen und Markerdichte je Slice. Auf stdout eine Tabelle für den Orchestrator.
//
// Exit-Codes: 0 ok, 2 Aufruffehler.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Stellen, an denen Lebenszyklus- und Nebenläufigkeitsfehler entstehen. Ihre
// Dichte je kLOC entscheidet, welcher Slice das stärkere Modell bekommt.
const MARKERS = /\b(setInterval|setTimeout|requestAnimationFrame|addEventListener|removeEventListener|subscribe|unsubscribe|new Promise|Promise\.(?:all|race|allSettled|any)|AbortController|await|dispose|destroy)\b/g;

class UsageError extends Error {}

function readList(file) {
  return fs.readFileSync(file, 'utf8').split('\n').map((s) => s.trim()).filter(Boolean);
}

// Ein Glob ohne Stern ist ein Präfix: `src/render` trifft alles darunter.
export function matcher(pattern) {
  const p = pattern.replace(/^\.\//, '');
  if (!/[*?]/.test(p)) {
    const dir = p.replace(/\/+$/, '');
    return (file) => file === dir || file.startsWith(dir + '/');
  }
  let re = '';
  for (let i = 0; i < p.length; i++) {
    const c = p[i];
    if (c === '*' && p[i + 1] === '*') {
      // `**/` trifft null oder mehr Verzeichnisse, ein `**` am Ende alles darunter
      if (p[i + 2] === '/') { re += '(?:.*/)?'; i += 2; } else { re += '.*'; i += 1; }
    } else if (c === '*') re += '[^/]*';
    else if (c === '?') re += '[^/]';
    else re += c.replace(/[.+^${}()|[\]\\/]/g, '\\$&');
  }
  if (re.endsWith('/.*')) re = re.slice(0, -4) + '(?:/.*)?';
  const rx = new RegExp('^' + re + '$');
  return (file) => rx.test(file);
}

export function assign(sources, slices) {
  const out = slices.map((s) => ({ id: s.id, source: s.source !== false, files: [...(s.files ?? [])] }));
  const rest = { id: 'rest', source: true, files: [] };
  const taken = new Set(out.flatMap((s) => s.files));
  const matchers = slices.map((s) => (s.paths ?? []).map(matcher));
  for (const file of sources) {
    if (taken.has(file)) continue;
    const i = matchers.findIndex((ms) => ms.some((m) => m(file)));
    (i >= 0 ? out[i] : rest).files.push(file);
  }
  if (rest.files.length) {
    const existing = out.find((s) => s.id === 'rest');
    if (existing) existing.files.push(...rest.files);
    else out.push(rest);
  }
  return out.filter((s) => s.files.length);
}

// Ein Bündel bleibt unter maxChars, damit ein Read-Aufruf es ganz liest
// (60 000 Zeichen sind rund 17k Tokens, das Limit eines Aufrufs liegt bei 25k).
// Eine Datei bleibt beisammen; nur eine, die allein darüber liegt, wird in
// Teile geschnitten. Die Zeilennummern sind die der Quelldatei, damit
// Fundstellen ohne Umrechnung stimmen.
export function bundle(slice, root, maxChars) {
  const chunks = [];
  let cur = [], curChars = 0;
  const flush = () => { if (cur.length) chunks.push(cur.join('\n') + '\n'); cur = []; curChars = 0; };
  const files = [];
  let markers = 0;
  for (const file of slice.files) {
    let text;
    try { text = fs.readFileSync(path.join(root, file), 'utf8'); } catch { files.push({ file, loc: 0, missing: true }); continue; }
    const lines = text.split('\n');
    if (text.endsWith('\n')) lines.pop();
    files.push({ file, loc: lines.length });
    markers += (text.match(MARKERS) ?? []).length;
    const width = String(lines.length).length;
    const numbered = lines.map((l, i) => `${String(i + 1).padStart(width)}│ ${l}`);
    const size = numbered.reduce((n, l) => n + l.length + 1, 0);
    // Teile schneiden, wenn die Datei allein nicht in ein Bündel passt
    const parts = [];
    if (size <= maxChars) parts.push([0, numbered.length]);
    else {
      // Platz für die Kopfzeile »===== <pfad> · N Zeilen · Teil x/y =====« freihalten
      const budget = maxChars - (file.length + 64);
      let from = 0, n = 0;
      numbered.forEach((l, i) => {
        if (n && n + l.length + 1 > budget) { parts.push([from, i]); from = i; n = 0; }
        n += l.length + 1;
      });
      parts.push([from, numbered.length]);
    }
    parts.forEach(([from, to], p) => {
      const head = `===== ${file} · ${lines.length} Zeilen${parts.length > 1 ? ` · Teil ${p + 1}/${parts.length}` : ''} =====`;
      const partChars = numbered.slice(from, to).reduce((n, l) => n + l.length + 1, head.length + 1);
      if (curChars && curChars + partChars > maxChars) flush();
      cur.push(head, ...numbered.slice(from, to));
      curChars += partChars;
      if (parts.length > 1) flush();
    });
  }
  flush();
  const loc = files.reduce((s, f) => s + f.loc, 0);
  return { chunks, files, loc, markersPerKloc: loc ? Math.round((markers / loc) * 1000 * 10) / 10 : 0 };
}

function main(argv) {
  const [specPath, ...rest] = argv;
  const opts = {};
  for (let i = 0; i < rest.length; i++) if (rest[i].startsWith('--')) opts[rest[i].slice(2)] = rest[++i];
  if (!specPath || !opts.out) throw new UsageError('Aufruf: bundle.mjs <slices.json> --out <dir> [--root .] [--max-chars 60000]');
  const spec = JSON.parse(fs.readFileSync(specPath, 'utf8'));
  const root = opts.root ?? '.';
  const maxChars = Number(opts['max-chars'] ?? 60000);
  if (!Array.isArray(spec.slices) || !spec.slices.length) throw new UsageError('slices.json: "slices" fehlt oder ist leer');
  const ids = spec.slices.map((s) => s.id);
  const bad = ids.find((id) => !/^[a-z0-9][a-z0-9-]*$/.test(id ?? ''));
  if (bad !== undefined) throw new UsageError(`slices.json: id »${bad}« ist kein Slug`);
  if (new Set(ids).size !== ids.length) throw new UsageError('slices.json: doppelte Slice-id');
  const sources = spec.sources ? readList(spec.sources) : [];

  fs.mkdirSync(opts.out, { recursive: true });
  for (const f of fs.readdirSync(opts.out)) if (/^[a-z0-9-]+-\d+\.txt$/.test(f) || f === 'index.json') fs.rmSync(path.join(opts.out, f));

  const index = [];
  for (const slice of assign(sources, spec.slices)) {
    const b = bundle(slice, root, maxChars);
    const bundles = b.chunks.map((text, i) => {
      const file = path.join(opts.out, `${slice.id}-${i + 1}.txt`);
      fs.writeFileSync(file, text);
      return file;
    });
    index.push({ id: slice.id, source: slice.source, files: b.files, loc: b.loc, markersPerKloc: b.markersPerKloc, bundles });
  }
  fs.writeFileSync(path.join(opts.out, 'index.json'), JSON.stringify(index, null, 2) + '\n');

  const rows = index.map((s) => `${s.id.padEnd(20)} ${String(s.files.length).padStart(5)} ${String(s.loc).padStart(7)} ${String(s.markersPerKloc).padStart(8)} ${String(s.bundles.length).padStart(7)}${s.source ? '' : '  (kein Quelltext)'}`);
  const missing = index.flatMap((s) => s.files.filter((f) => f.missing).map((f) => f.file));
  process.stdout.write([
    `${'slice'.padEnd(20)} ${'files'.padStart(5)} ${'loc'.padStart(7)} ${'mk/kloc'.padStart(8)} ${'bundles'.padStart(7)}`,
    ...rows,
    `→ ${path.join(opts.out, 'index.json')}`,
    ...(missing.length ? [`✗ nicht lesbar: ${missing.join(', ')}`] : []),
  ].join('\n') + '\n');
  return 0;
}

const invokedPath = (p) => { try { return fs.realpathSync(p); } catch { return path.resolve(p); } };
if (process.argv[1] && invokedPath(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (e) {
    process.stderr.write(`✗ ${e.message}\n`);
    process.exitCode = e instanceof UsageError ? 2 : 1;
  }
}
