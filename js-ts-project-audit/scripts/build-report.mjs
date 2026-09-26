#!/usr/bin/env node
// Baut ./audit.html aus einem Datensatz nach assets/audit-data.schema.json.
// Keine Dependencies: läuft mit jeder Node-Version ab 18.
//
//   node build-report.mjs build   <data.json> [--out ./audit.html] [--record audit|remediation|github-sync]
//                                              [--previous <prev.json>] [--date YYYY-MM-DD]
//   node build-report.mjs extract [./audit.html] [--fields a.b,c]  JSON-Insel nach stdout, v1 wird migriert;
//                                                   --fields gibt nur diese Pfade aus
//   node build-report.mjs check   <data.json> [--previous <prev.json>]
//                                                   nur validieren, Scores auf stderr; mit --previous
//                                                   auch Delta und Herkunft der neuen Findings
//   node build-report.mjs match   <data.json> <previous.json> --out <dir>
//                                                   Folgelauf: Paare, Re-Check-Stapel, Treffer im Anhang
//   node build-report.mjs merge   <data.json> <previous.json> --dir <dir> [--out <data.json>]
//                                                   Folgelauf: Status, IDs, Übernahmen und Anhang anwenden
//
// Exit-Codes: 0 ok, 1 Validierungsfehler, 2 Aufruffehler.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE = path.join(HERE, '..', 'assets', 'report-template.html');
const SCHEMA = path.join(HERE, '..', 'assets', 'audit-data.schema.json');
const PLACEHOLDER = '/*__AUDIT_DATA__*/';
const ISLAND_RE = /<script id="audit-data" type="application\/json">([\s\S]*?)<\/script>/;

// ---------------------------------------------------------------------------
// Score-Modelle. Die Konstanten stehen nur hier; das Template liest sie aus
// summary.scoring, damit die Methodik-Sektion nie eine andere Formel zeigt.

const WEIGHTS = { critical: 10, high: 5, medium: 2, low: 0.5, info: 0 };
const RHO0 = 8; // Abzugspunkte je gelesener kLOC, bei denen der Code-Score 50 ist
const H0 = 60; // Abzugspunkte, bei denen der Harness-Score 50 ist
const CRITICAL_CAP = 49; // Höchstwert einer Domain mit offenem critical
const HISTORY_MAX = 20;

const SEVERITIES = ['critical', 'high', 'medium', 'low', 'info'];
const CATEGORY_DOMAIN = {
  architecture: 'code', build: 'harness', dx: 'harness', api: 'code', completeness: 'code',
  testing: 'harness', readability: 'code', correctness: 'code', resources: 'code', async: 'code',
  consistency: 'code', types: 'harness', security: 'code', dependencies: 'harness', performance: 'code',
};

const isDefect = (f) => (f.kind ?? 'defect') === 'defect';
const penaltyOf = (fs_) => fs_.filter(isDefect).reduce((s, f) => s + WEIGHTS[f.severity], 0);
const hasCritical = (fs_) => fs_.some((f) => isDefect(f) && f.severity === 'critical');
const hyperbolic = (x, x0) => 100 / (1 + x / x0);

function domainScores(findings, reviewedLoc, model) {
  const code = findings.filter((f) => f.domain === 'code');
  const harness = findings.filter((f) => f.domain === 'harness');
  const pc = penaltyOf(code);
  const ph = penaltyOf(harness);
  if (model === 1) {
    const clamp = (p) => Math.max(0, 100 - p);
    return { code: clamp(pc), harness: clamp(ph), total: clamp(pc + ph), pc, ph };
  }
  let sc = pc === 0 ? 100 : reviewedLoc > 0 ? hyperbolic(pc / (reviewedLoc / 1000), RHO0) : 0;
  let sh = hyperbolic(ph, H0);
  if (hasCritical(code)) sc = Math.min(sc, CRITICAL_CAP);
  if (hasCritical(harness)) sh = Math.min(sh, CRITICAL_CAP);
  return { code: Math.round(sc), harness: Math.round(sh), total: Math.round(Math.sqrt(sc * sh)), pc, ph };
}

function countBy(list, key) {
  const out = {};
  for (const x of list) {
    const k = typeof key === 'function' ? key(x) : x[key];
    if (k == null) continue;
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}

function severityCounts(list) {
  const c = countBy(list, 'severity');
  return Object.fromEntries(SEVERITIES.map((s) => [s, c[s] ?? 0]));
}

// Alles Zählbare wird hier gerechnet, nie vom Agenten übernommen.
function derive(data, opts) {
  const s = data.summary;
  const defects = data.findings.filter(isDefect);
  const model = s.scope ? 2 : 1;
  const reviewedLoc = s.scope?.reviewedLoc ?? 0;
  const sc = domainScores(data.findings, reviewedLoc, model);

  s.scoreModel = model;
  s.score = sc.total;
  s.scoring = model === 2
    ? { model: 2, weights: WEIGHTS, rho0: RHO0, h0: H0, criticalCap: CRITICAL_CAP }
    : { model: 1, weights: WEIGHTS };
  s.bySeverity = severityCounts(defects);
  s.byCategory = countBy(defects, 'category');
  s.byComponent = countBy(defects, 'component');
  s.counts = {
    findings: defects.length,
    improvements: data.findings.length - defects.length,
    byStatus: countBy(defects, 'status'),
  };
  for (const d of ['code', 'harness']) {
    const list = defects.filter((f) => f.domain === d);
    Object.assign(s.domains[d], {
      score: sc[d],
      penalty: d === 'code' ? sc.pc : sc.ph,
      bySeverity: severityCounts(list),
      byCategory: countBy(list, 'category'),
    });
  }
  for (const p of s.packages ?? []) {
    const list = data.findings.filter((f) => f.package === p.name);
    p.findings = list.filter(isDefect).length;
    p.score = domainScores(list, p.reviewedLoc ?? 0, model === 2 && p.reviewedLoc ? 2 : 1).total;
  }

  if (opts.previous) s.deltaBreakdown = deltaBreakdown(data, opts.previous);

  if (opts.record) {
    const entry = {
      date: opts.date,
      score: s.score,
      source: opts.record,
      scoreModel: model,
      domains: { code: sc.code, harness: sc.harness },
    };
    if (model === 2 && s.scope.sourceLoc > 0) {
      entry.coverage = Math.min(1, Math.round((reviewedLoc / s.scope.sourceLoc) * 1000) / 1000);
    }
    const h = (data.scoreHistory ??= []);
    const last = h.at(-1);
    if (last && last.date === entry.date && (last.source ?? 'audit') === entry.source) h.pop();
    h.push(entry);
    while (h.length > HISTORY_MAX) h.shift();
  }
  data.fixHistory ??= [];
  while (data.fixHistory.length > HISTORY_MAX) data.fixHistory.shift();
  data.scoreHistory ??= [];
  data.acknowledged ??= [];
  data.openQuestions ??= [];
  return data;
}

const fileOf = (loc) => String(loc).replace(/:\d+(?:[-–]\d+)?(?:,.*)?$/, '').trim();

// Neue Findings in Dateien, die der Vorlauf nicht gelesen hat, gehen auf die
// Prüftiefe; in Dateien, die beide gelesen haben, auf den Code.
function deltaBreakdown(data, prev) {
  const ps = prev.summary?.scope;
  const files = new Set(ps?.reviewedFiles ?? []);
  const dirs = (ps?.reviewedDirs ?? []).map((d) => d.path.replace(/\/?$/, '/'));
  const out = { code: 0, coverage: 0, unknown: 0 };
  for (const f of data.findings) {
    if (!isDefect(f) || f.status !== 'new') continue;
    if (!ps || (!files.size && !dirs.length)) { out.unknown++; continue; }
    const file = fileOf(f.location);
    const seen = files.has(file) || dirs.some((d) => file.startsWith(d));
    out[seen ? 'code' : 'coverage']++;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Validierung: die Teilmenge von JSON Schema, die audit-data.schema.json nutzt.

function typeOf(v) {
  if (v === null) return 'null';
  if (Array.isArray(v)) return 'array';
  if (typeof v === 'number') return Number.isInteger(v) ? 'integer' : 'number';
  return typeof v;
}

function validate(schema, value, root, at, errors) {
  if (schema.$ref) {
    const target = schema.$ref.replace(/^#\//, '').split('/').reduce((o, k) => o[k], root);
    return validate({ ...target, ...schema, $ref: undefined }, value, root, at, errors);
  }
  const before = errors.length;
  if (schema.oneOf) {
    const hits = schema.oneOf.filter((s) => {
      const e = [];
      validate(s, value, root, at, e);
      return e.length === 0;
    });
    if (hits.length !== 1) {
      // Die Variante mit den wenigsten Fehlern erklärt am meisten.
      const tries = schema.oneOf.map((s) => { const e = []; validate(s, value, root, at, e); return e; });
      tries.sort((a, b) => a.length - b.length);
      errors.push(...(hits.length === 0 ? tries[0] : [`${at}: passt auf mehrere Varianten`]));
    }
  }
  if ('const' in schema && value !== schema.const) errors.push(`${at}: muss ${JSON.stringify(schema.const)} sein`);
  if (schema.enum && !schema.enum.includes(value)) {
    errors.push(`${at}: ${JSON.stringify(value)} ist keiner von ${schema.enum.map((e) => JSON.stringify(e)).join(', ')}`);
  }
  if (schema.type) {
    const t = typeOf(value);
    const ok = schema.type === t || (schema.type === 'number' && t === 'integer');
    if (!ok) { errors.push(`${at}: erwartet ${schema.type}, gefunden ${t}`); return; }
  }
  const t = typeOf(value);
  if (t === 'string' && schema.pattern && !new RegExp(schema.pattern).test(value)) {
    errors.push(`${at}: ${JSON.stringify(value)} passt nicht auf ${schema.pattern}`);
  }
  if ((t === 'number' || t === 'integer')) {
    if (schema.minimum != null && value < schema.minimum) errors.push(`${at}: kleiner als ${schema.minimum}`);
    if (schema.maximum != null && value > schema.maximum) errors.push(`${at}: größer als ${schema.maximum}`);
  }
  if (t === 'array') {
    if (schema.minItems != null && value.length < schema.minItems) errors.push(`${at}: mindestens ${schema.minItems} Einträge`);
    if (schema.maxItems != null && value.length > schema.maxItems) errors.push(`${at}: höchstens ${schema.maxItems} Einträge`);
    if (schema.items) value.forEach((v, i) => validate(schema.items, v, root, `${at}[${i}]`, errors));
  }
  if (t === 'object') {
    for (const k of schema.required ?? []) if (!(k in value)) errors.push(`${at}: Pflichtfeld »${k}« fehlt`);
    for (const [k, v] of Object.entries(value)) {
      if (schema.properties?.[k]) validate(schema.properties[k], v, root, `${at}.${k}`, errors);
      else if (schema.additionalProperties === false) errors.push(`${at}: unbekanntes Feld »${k}«`);
    }
  }
  return errors.length === before;
}

const SVG_FORBIDDEN = [
  [/<script/i, 'enthält <script>'],
  [/<foreignObject/i, 'enthält <foreignObject>'],
  [/<style/i, 'enthält <style>'],
  [/\son[a-z]+\s*=/i, 'enthält on*-Attribute'],
  [/\sstyle\s*=/i, 'enthält style-Attribute'],
  [/(?:xlink:)?href\s*=\s*["'](?!#)/i, 'enthält externe href'],
  [/javascript:/i, 'enthält javascript:'],
  [/\s(?:fill|stroke|stop-color|color)\s*=\s*["'](?!none|currentColor)[^"']+["']/i, 'enthält feste Farben (erlaubt: Klassen node, edge, label, muted, accent)'],
];

// Was das Schema nicht ausdrücken kann: Querverweise und Eindeutigkeit.
function semanticChecks(data) {
  const errors = [];
  const ids = new Set();
  for (const [i, f] of data.findings.entries()) {
    if (ids.has(f.id)) errors.push(`findings[${i}]: id ${f.id} doppelt`);
    ids.add(f.id);
  }
  const comps = new Set((data.portrait.components ?? []).map((c) => c.id));
  const pkgs = new Set((data.summary.packages ?? []).map((p) => p.name));
  for (const [i, f] of data.findings.entries()) {
    if (f.component && !comps.has(f.component)) errors.push(`findings[${i}].component: »${f.component}« steht nicht in portrait.components`);
    if (f.package && !pkgs.has(f.package)) errors.push(`findings[${i}].package: »${f.package}« steht nicht in summary.packages`);
  }
  for (const [i, a] of (data.acknowledged ?? []).entries()) {
    if (a.component && !comps.has(a.component)) errors.push(`acknowledged[${i}].component: »${a.component}« unbekannt`);
  }
  const s = data.summary.scope;
  if (s) {
    if (!s.reviewedFiles?.length && !s.reviewedDirs?.length) errors.push('summary.scope: reviewedFiles oder reviewedDirs fehlt');
    if (s.reviewedLoc > s.sourceLoc) errors.push('summary.scope: reviewedLoc größer als sourceLoc — Messung prüfen');
    const hasCode = data.findings.some((f) => isDefect(f) && f.domain === 'code');
    if (hasCode && !s.reviewedLoc) errors.push('summary.scope.reviewedLoc ist 0, es gibt aber Code-Findings');
  }
  const d = data.portrait.diagram;
  if (d?.kind === 'layered') {
    const nodes = new Set(d.layers.flatMap((l) => l.nodes.map((n) => n.id)));
    for (const l of d.layers) for (const n of l.nodes) {
      if (n.component && !comps.has(n.component)) errors.push(`portrait.diagram: Knoten ${n.id} verweist auf unbekannte Component »${n.component}«`);
    }
    for (const e of d.edges ?? []) {
      if (!nodes.has(e.from) || !nodes.has(e.to)) errors.push(`portrait.diagram: Kante ${e.from} → ${e.to} verweist auf unbekannten Knoten`);
    }
  }
  if (d?.kind === 'svg') {
    if (!/^\s*<svg[\s>]/i.test(d.svg)) errors.push('portrait.diagram.svg: muss mit <svg beginnen');
    if (!/viewBox\s*=/.test(d.svg)) errors.push('portrait.diagram.svg: viewBox fehlt');
    for (const [re, msg] of SVG_FORBIDDEN) if (re.test(d.svg)) errors.push(`portrait.diagram.svg: ${msg}`);
  }
  return errors;
}

function check(data) {
  const schema = JSON.parse(fs.readFileSync(SCHEMA, 'utf8'));
  const errors = [];
  validate(schema, data, schema, '$', errors);
  if (errors.length) return errors;
  return semanticChecks(data);
}

// ---------------------------------------------------------------------------
// Migration v1 → v2. v1 ist alles, was vor dem Template entstand: dieselben
// Grundfelder, aber in über die Läufe gewanderten Formen.

const CATEGORY_KEYWORDS = [
  ['types', /typsicher|type.?safe|\btypes?\b|typisierung/],
  ['testing', /test/],
  ['architecture', /archit/],
  ['build', /build|projektaufbau|setup/],
  ['dx', /developer|\bdx\b/],
  ['api', /\bapi\b/],
  ['completeness', /implementierungsstand|completeness|implementation/],
  ['readability', /lesbar|readab|clean code/],
  ['correctness', /bug|korrekt|correct/],
  ['resources', /memory|leak|ressourc|resourc/],
  ['async', /async|concurr|nebenläuf/],
  ['consistency', /konsist|consist/],
  ['security', /sicherheit|secur/],
  ['dependencies', /depend|abhängig/],
  ['performance', /perf/],
];

export function categoryKey(label, fallback = null) {
  if (CATEGORY_DOMAIN[label]) return label;
  const l = String(label ?? '').toLowerCase();
  for (const [key, re] of CATEGORY_KEYWORDS) if (re.test(l)) return key;
  return fallback;
}

const slugify = (s) => String(s).toLowerCase()
  .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
  .normalize('NFKD').replace(/[^\w\s-]/g, ' ').replace(/[_\s-]+/g, '-').replace(/^-|-$/g, '') || 'x';

const asText = (v) => {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  if (Array.isArray(v)) return v.map((x) => `- ${asText(x).replace(/\n/g, ' ')}`).join('\n');
  if (typeof v === 'object') return Object.entries(v).map(([k, x]) => `**${k}:** ${asText(x)}`).join('\n\n');
  return String(v);
};
const isDate = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);

export function migrate(old) {
  if (old.schemaVersion === 2) return old;
  const s = old.summary ?? {};
  const notes = [];
  const unknownCats = new Set();

  const allText = JSON.stringify(old.findings?.slice(0, 20) ?? '') + JSON.stringify(s.domains ?? '');
  const lang = /Teststrategie|Korrektheit|Lesbarkeit|Sicherheit|Konsistenz|\b(?:der|die|und|nicht)\b/.test(allText) ? 'de' : 'en';

  const components = (old.portrait?.domains ?? old.portrait?.components ?? []).map((d) => ({
    id: slugify(d.id ?? d.name ?? d.label),
    label: d.name ?? d.label ?? d.id,
    summary: d.text ?? d.summary ?? d.description ?? '',
    paths: (Array.isArray(d.paths) ? d.paths : [d.paths]).filter(Boolean).map(String),
  })).filter((c) => c.paths.length);
  // Ältere Läufe haben Findings teils mit component getaggt, ohne die Liste im
  // Portrait zu führen. Die Tags bleiben erhalten; die Pfade kommen aus den
  // häufigsten Verzeichnissen ihrer Fundstellen.
  const known = new Set(components.flatMap((c) => [c.id, slugify(c.label)]));
  const orphanDirs = new Map();
  for (const f of old.findings ?? []) {
    if (!f.component || known.has(slugify(f.component))) continue;
    const dirs = orphanDirs.get(f.component) ?? new Map();
    const loc = String(Array.isArray(f.location) ? f.location[0] : f.location ?? '').split(/[;,]\s*|\s+\(/)[0].trim();
    const dir = loc.includes('/') ? loc.replace(/:\d.*$/, '').replace(/\/[^/]*$/, '/') : loc.replace(/:\d.*$/, '');
    if (dir) dirs.set(dir, (dirs.get(dir) ?? 0) + 1);
    orphanDirs.set(f.component, dirs);
  }
  for (const [label, dirs] of orphanDirs) {
    const paths = [...dirs].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([d]) => d);
    components.push({ id: slugify(label), label: String(label), summary: '', paths: paths.length ? paths : ['.'] });
  }
  if (orphanDirs.size) notes.push(`Features aus den component-Angaben der Findings rekonstruiert (${orphanDirs.size}); Pfade aus den Fundstellen abgeleitet. Der nächste Audit-Lauf beschreibt sie im Portrait.`);
  const compIds = new Set(components.map((c) => c.id));
  const compByLabel = new Map(components.map((c) => [slugify(c.label), c.id]));

  const cat = (label) => {
    const k = categoryKey(label);
    if (!k) { unknownCats.add(label); return 'readability'; }
    return k;
  };
  const comp = (v) => {
    if (!v) return undefined;
    const id = slugify(v);
    return compIds.has(id) ? id : compByLabel.get(id);
  };

  const usedIds = new Set();
  const findings = [];
  for (const f of old.findings ?? []) {
    const category = cat(f.category);
    let id = /^[A-Z][A-Z0-9]*-\d+$/.test(f.id ?? '') ? f.id : null;
    if (!id || usedIds.has(id)) id = `MIG-${String(findings.length + 1).padStart(3, '0')}`;
    usedIds.add(id);
    const n = {
      id,
      category,
      domain: f.domain === 'code' || f.domain === 'harness' ? f.domain : CATEGORY_DOMAIN[category],
      severity: SEVERITIES.includes(f.severity) ? f.severity : 'info',
      title: String(f.title ?? ''),
      location: Array.isArray(f.location) ? String(f.location[0] ?? '') : String(f.location ?? ''),
      description: asText(f.description),
      recommendation: asText(f.recommendation),
    };
    if (Array.isArray(f.location) && f.location.length > 1) n.locations = f.location.slice(1).map(String);
    const c = comp(f.component);
    if (c) n.component = c;
    if (f.evidence) n.evidence = asText(f.evidence);
    if (f.effort) n.effort = f.effort === 'XS' ? 'S' : ['S', 'M', 'L'].includes(f.effort) ? f.effort : undefined;
    if (!n.effort) delete n.effort;
    if (['new', 'unchanged', 'improved', 'carried-over'].includes(f.status)) n.status = f.status;
    if (SEVERITIES.includes(f.previousSeverity)) n.previousSeverity = f.previousSeverity;
    if (f.github && typeof f.github === 'object') n.github = f.github;
    if (f.kind === 'improvement') n.kind = 'improvement';
    findings.push(n);
  }
  for (const [i, o] of (old.optimizations ?? []).entries()) {
    if (!o || (!o.title && !o.text)) continue;
    const category = categoryKey(`${o.category ?? ''} ${o.title ?? ''}`, 'readability');
    findings.push({
      id: `OPT-${String(i + 1).padStart(3, '0')}`,
      category,
      domain: CATEGORY_DOMAIN[category],
      severity: 'info',
      kind: 'improvement',
      title: String(o.title ?? o.text.slice(0, 80)),
      location: String(o.location ?? ''),
      description: asText(o.text ?? o.description ?? ''),
      recommendation: asText(o.recommendation ?? ''),
    });
  }
  if (old.optimizations?.length) notes.push('Optimierungspotenzial aus einem Report vor Schema 2 übernommen; die Kategorien sind aus den Titeln abgeleitet.');

  const openQuestions = (old.openQuestions ?? []).map((q) => {
    if (typeof q === 'string') return q;
    const head = q.title ?? q.q ?? q.question ?? '';
    const body = q.detail ?? q.ctx ?? q.context ?? '';
    return body ? `**${head}** — ${body}` : String(head);
  }).filter(Boolean);

  const m = old.methodology ?? s.methodology;
  const methodology = { text: typeof m === 'string' ? m : m ? asText(m) : '' };
  if (typeof s.scope === 'string') notes.push(`Prüfumfang laut Vorlauf: ${s.scope}`);
  if (s.focus) notes.push(`Fokus laut Vorlauf: ${asText(s.focus)}`);
  if (!methodology.text) methodology.text = lang === 'de'
    ? 'Der Vorlauf hat seinen Prüfumfang nicht strukturiert ausgewiesen.'
    : 'The previous run did not record its review scope in structured form.';

  const acknowledged = (old.acknowledged ?? []).map((a) => {
    const out = {
      title: String(a.title ?? ''),
      category: cat(a.category),
      location: String(Array.isArray(a.location) ? a.location[0] : a.location ?? ''),
      reason: String(a.reason ?? a.acknowledgedNote ?? ''),
      acknowledgedDate: isDate(a.acknowledgedDate) ? a.acknowledgedDate : (isDate(s.date) ? s.date : '1970-01-01'),
    };
    if (a.id) out.id = String(a.id);
    if (a.domain === 'code' || a.domain === 'harness') out.domain = a.domain;
    if (a.github && typeof a.github === 'object') out.github = a.github;
    return out;
  });

  const history = (old.scoreHistory ?? s.scoreHistory ?? [])
    .filter((h) => isDate(h.date) && typeof h.score === 'number')
    .map((h) => ({ date: h.date, score: h.score, source: ['remediation', 'github-sync'].includes(h.source) ? h.source : 'audit', scoreModel: 1 }))
    .slice(-HISTORY_MAX);

  const stack = Array.isArray(s.stack) ? s.stack.map(String)
    : typeof s.stack === 'string' ? s.stack.split(/\s*[,·|]\s*/).filter(Boolean)
      : s.stack && typeof s.stack === 'object' ? Object.entries(s.stack).map(([k, v]) => `${k}: ${asText(v)}`) : [];

  const dom = (d) => {
    const o = { executiveSummary: asText(s.domains?.[d]?.executiveSummary ?? '') };
    if (s.domains?.[d]?.label) o.label = String(s.domains[d].label);
    return o;
  };

  const summary = {
    project: String(s.project ?? s.name ?? 'Projekt'),
    stack,
    date: isDate(s.date) ? s.date : (history.at(-1)?.date ?? '1970-01-01'),
    // »light« war vor Schema 2 nur der Default, keine Entscheidung; »dark« setzte immer jemand.
    theme: s.theme === 'dark' ? 'dark' : 'auto',
    domains: { code: dom('code'), harness: dom('harness') },
  };
  if (isDate(s.previousDate)) summary.previousDate = s.previousDate;
  if (Number.isInteger(s.resolvedCount)) summary.resolvedCount = s.resolvedCount;
  if (['code', 'coverage', 'mixed'].includes(s.deltaCause)) summary.deltaCause = s.deltaCause;
  if (s.deltaExplanation) summary.deltaExplanation = asText(s.deltaExplanation);

  if (unknownCats.size) notes.push(`Unbekannte Kategorien beim Übernehmen auf »readability« gesetzt: ${[...unknownCats].join(', ')}`);
  if (notes.length) methodology.notes = notes;

  const portrait = {
    description: asText(old.portrait?.description ?? ''),
    components,
  };

  return {
    schemaVersion: 2,
    meta: { generator: 'migration', lang },
    summary,
    portrait,
    findings,
    openQuestions,
    methodology,
    scoreHistory: history,
    fixHistory: [],
    acknowledged,
  };
}

// ---------------------------------------------------------------------------

function extract(htmlPath) {
  const html = fs.readFileSync(htmlPath, 'utf8');
  const m = html.match(ISLAND_RE);
  if (!m) throw new UsageError(`${htmlPath}: keine JSON-Insel <script id="audit-data"> gefunden`);
  return migrate(JSON.parse(m[1]));
}

function render(data) {
  const tpl = fs.readFileSync(TEMPLATE, 'utf8');
  const version = tpl.match(/<meta name="audit-template-version" content="([^"]+)">/)?.[1] ?? 'unbekannt';
  data.meta.templateVersion = version;
  data.meta.generatedAt = new Date().toISOString();
  // < als <: ein zitiertes </script> in einem Finding beendet sonst die Insel.
  const json = JSON.stringify(data, null, 2).replace(/</g, '\\u003c');
  const parts = tpl.split(PLACEHOLDER);
  if (parts.length !== 2) throw new Error('Template: Platzhalter fehlt oder ist doppelt');
  return parts[0] + json + parts[1];
}


// ---------------------------------------------------------------------------
// Folgelauf: match paart den frischen Datensatz mit dem Vorlauf, ohne dass der
// Orchestrator den Vorlauf lesen muss; merge wendet die Paare und die Urteile
// der Re-Check-Prüfer an. Was mehrdeutig ist, entscheidet der Orchestrator.

const filesOf = (f) => new Set([f.location, ...(f.locations ?? [])].filter(Boolean).map(fileOf));
const overlaps = (a, b) => { for (const x of a) if (b.has(x)) return true; return false; };
const kindOf = (f) => f.kind ?? 'defect';
const ackKey = (a, i) => a.id ?? `ack-${i + 1}`;
const BATCH_MAX = 15;
const words = (t) => new Set(String(t).toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}]+/gu, ' ').split(' ').filter((w) => w.length > 2));
const jaccard = (a, b) => { let n = 0; for (const x of a) if (b.has(x)) n++; return n ? n / (a.size + b.size - n) : 0; };
// Innerhalb einer mehrdeutigen Gruppe gilt ein Paar nur, wenn beide Titel sich
// gegenseitig am ähnlichsten sind, deutlich vor dem Zweitbesten.
const TITLE_MIN = 0.6, TITLE_MARGIN = 0.15;

export function match(data, prev) {
  const cur = data.findings ?? [], old = prev.findings ?? [];
  const cf = new Map(cur.map((f) => [f.id, filesOf(f)]));
  const of = new Map(old.map((f) => [f.id, filesOf(f)]));
  const same = (a, af, b, bf) => a.category === b.category && kindOf(a) === kindOf(b) && overlaps(af, bf);
  const newCands = new Map(cur.map((n) => [n.id, old.filter((o) => same(n, cf.get(n.id), o, of.get(o.id))).map((o) => o.id)]));
  const oldCands = new Map(old.map((o) => [o.id, cur.filter((n) => same(n, cf.get(n.id), o, of.get(o.id))).map((n) => n.id)]));

  // Sicher ist ein Paar nur, wenn beide Seiten genau einen Kandidaten haben.
  const pairs = [];
  const paired = new Set();
  for (const n of cur) {
    const c = newCands.get(n.id);
    if (c.length === 1 && oldCands.get(c[0]).length === 1) {
      const o = old.find((x) => x.id === c[0]);
      pairs.push({ new: n.id, old: o.id, severity: `${o.severity}→${n.severity}` });
      paired.add(n.id).add('old:' + o.id);
    }
  }
  // Der Rest der Kandidaten zerfällt in Gruppen, die der Orchestrator auflöst.
  const ambiguous = [];
  const seen = new Set();
  for (const n of cur) {
    if (paired.has(n.id) || seen.has(n.id) || !newCands.get(n.id).length) continue;
    const g = { new: new Set(), old: new Set() };
    const stack = [['new', n.id]];
    while (stack.length) {
      const [side, id] = stack.pop();
      if (g[side].has(id)) continue;
      g[side].add(id);
      if (side === 'new') { seen.add(id); newCands.get(id).forEach((o) => stack.push(['old', o])); }
      else oldCands.get(id).forEach((x) => stack.push(['new', x]));
    }
    const score = new Map();
    for (const a of g.new) for (const b of g.old) {
      if (newCands.get(a).includes(b)) score.set(a + '|' + b, jaccard(words(cur.find((x) => x.id === a).title), words(old.find((x) => x.id === b).title)));
    }
    const best = (id, side) => {
      const list = [...score].filter(([k]) => k.split('|')[side] === id).sort((x, y) => y[1] - x[1]);
      if (!list.length || list[0][1] < TITLE_MIN || (list[1] && list[0][1] - list[1][1] < TITLE_MARGIN)) return null;
      return list[0][0].split('|')[1 - side];
    };
    for (const a of [...g.new]) {
      const b = best(a, 0);
      if (b && best(b, 1) === a) {
        const o = old.find((x) => x.id === b), n = cur.find((x) => x.id === a);
        pairs.push({ new: a, old: b, severity: `${o.severity}→${n.severity}`, how: 'title' });
        paired.add(a).add('old:' + b);
        g.new.delete(a); g.old.delete(b);
      }
    }
    if (!g.new.size || !g.old.size) continue;
    const brief = (list, ids) => [...ids].map((id) => { const f = list.find((x) => x.id === id); return { id, severity: f.severity, title: f.title, location: f.location }; });
    ambiguous.push({ new: brief(cur, g.new), old: brief(old, g.old) });
  }

  const oldOnly = old.filter((o) => !paired.has('old:' + o.id));
  const acks = (prev.acknowledged ?? []).map((a, i) => ({ key: ackKey(a, i), a }));
  const ackHits = [];
  for (const { key, a } of acks) {
    const af = filesOf(a);
    const hit = (f, files, side) => {
      if (f.category === a.category && overlaps(af, files)) ackHits.push({ ack: key, ackTitle: a.title, finding: f.id, title: f.title, side });
    };
    cur.forEach((f) => hit(f, cf.get(f.id), 'new'));
    oldOnly.forEach((f) => hit(f, of.get(f.id), 'old'));
  }

  // Re-Check-Stapel: nach Hauptdatei gruppiert, damit ein Prüfer jede Datei nur
  // einmal öffnet. Eine Gruppe wird nicht geteilt, solange sie in einen Stapel passt.
  const items = [
    ...oldOnly.map((o) => ({ key: o.id, type: 'finding', category: o.category, severity: o.severity, title: o.title,
      location: o.location, locations: o.locations, description: o.description, evidence: o.evidence })),
    ...acks.map(({ key, a }) => ({ key, type: 'acknowledged', category: a.category, title: a.title, location: a.location,
      reason: a.reason, acknowledgedDate: a.acknowledgedDate })),
  ];
  const groups = new Map();
  for (const it of items) {
    const k = fileOf(it.location);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(it);
  }
  const batches = [];
  let batch = [];
  for (const g of [...groups.values()].sort((a, b) => b.length - a.length)) {
    if (batch.length && batch.length + g.length > BATCH_MAX) { batches.push(batch); batch = []; }
    batch.push(...g);
    while (batch.length > BATCH_MAX) { batches.push(batch.slice(0, BATCH_MAX)); batch = batch.slice(BATCH_MAX); }
  }
  if (batch.length) batches.push(batch);

  return { pairs, ambiguous, ackHits, recheck: { findings: oldOnly.map((o) => o.id), acknowledged: acks.map((x) => x.key) }, batches };
}

const FINDING_VERDICTS = ['besteht', 'verschoben', 'weg', 'ueberholt', 'unklar'];
const ACK_VERDICTS = [...FINDING_VERDICTS, 'begruendung-veraltet'];

function readDir(dir) {
  const m = readJson(path.join(dir, 'match.json'));
  const decFile = path.join(dir, 'decisions.json');
  const decisions = fs.existsSync(decFile) ? readJson(decFile) : {};
  const verdicts = {};
  for (const f of fs.readdirSync(dir).filter((x) => /^verdicts-.*\.json$/.test(x)).sort()) {
    Object.assign(verdicts, readJson(path.join(dir, f)).verdicts ?? {});
  }
  Object.assign(verdicts, decisions.verdicts ?? {});
  return { m, decisions, verdicts };
}

export function merge(data, prev, { m, decisions = {}, verdicts = {} }) {
  const errors = [];
  const cur = data.findings ?? [], old = prev.findings ?? [];
  const byNew = new Map(cur.map((f) => [f.id, f])), byOld = new Map(old.map((f) => [f.id, f]));
  const key = (p) => `${p[0]}|${p[1]}`;
  const unpair = new Set((decisions.unpair ?? []).map(key));
  const pairList = [...m.pairs.map((p) => [p.new, p.old]).filter((p) => !unpair.has(key(p))), ...(decisions.pairs ?? [])];
  const suppress = new Set(decisions.suppress ?? []);
  const newToOld = new Map(), oldToNew = new Map();
  for (const [n, o] of pairList) {
    if (!byNew.has(n)) errors.push(`Paar ${n}/${o}: ${n} fehlt im Datensatz`);
    if (!byOld.has(o)) errors.push(`Paar ${n}/${o}: ${o} fehlt im Vorlauf`);
    if (newToOld.has(n) || oldToNew.has(o)) errors.push(`Paar ${n}/${o}: eine Seite ist schon gepaart`);
    newToOld.set(n, o); oldToNew.set(o, n);
  }
  for (const id of suppress) if (!byNew.has(id) && !byOld.has(id)) errors.push(`suppress: ${id} gibt es weder im Datensatz noch im Vorlauf`);

  const verdictOf = (k, allowed, what) => {
    const v = verdicts[k];
    if (!v) { errors.push(`${what} ${k}: kein Urteil`); return null; }
    if (!allowed.includes(v.verdict)) { errors.push(`${what} ${k}: Urteil »${v.verdict}« unbekannt`); return null; }
    if (v.verdict === 'unklar') { errors.push(`${what} ${k}: unklar — selbst prüfen und in decisions.json entscheiden`); return null; }
    if (v.verdict === 'verschoben' && !v.location) errors.push(`${what} ${k}: verschoben ohne neue location`);
    if ((v.verdict === 'weg' || v.verdict === 'ueberholt') && !v.evidence) errors.push(`${what} ${k}: ${v.verdict} ohne evidence`);
    return v;
  };

  // IDs: ein gepaartes Finding behält die ID des Vorlaufs. Ein neues bekommt eine
  // frische Nummer, wenn seine ID im Vorlauf oder im Anhang schon vergeben war —
  // auch an ein inzwischen behobenes Finding, auf das Pläne und Issues noch zeigen.
  const reserved = new Set([...old.map((f) => f.id), ...(prev.acknowledged ?? []).map((a) => a.id).filter(Boolean)]);
  const used = new Set();
  const maxOf = new Map();
  for (const id of [...reserved, ...cur.map((f) => f.id)]) {
    const [pre, num] = id.split(/-(?=\d+$)/);
    maxOf.set(pre, Math.max(maxOf.get(pre) ?? 0, Number(num) || 0));
  }
  const renames = [];
  const fresh = (id) => {
    const [pre, num] = id.split(/-(?=\d+$)/);
    const next = (maxOf.get(pre) ?? 0) + 1;
    maxOf.set(pre, next);
    return `${pre}-${String(next).padStart(Math.max(3, (num ?? '').length), '0')}`;
  };

  const findings = [];
  const counts = { unchanged: 0, improved: 0, new: 0, 'carried-over': 0 };
  for (const n of cur) {
    if (suppress.has(n.id)) continue;
    const o = byOld.get(newToOld.get(n.id));
    const f = { ...n };
    delete f.previousSeverity;
    if (o) {
      f.id = o.id;
      if (SEVERITIES.indexOf(n.severity) > SEVERITIES.indexOf(o.severity)) { f.status = 'improved'; f.previousSeverity = o.severity; }
      else f.status = 'unchanged';
      if (o.github && !f.github) f.github = o.github;
      if (o.origin && !f.origin) f.origin = o.origin;
    } else {
      f.status = 'new';
    }
    findings.push(f);
  }
  for (const f of findings) {
    if (f.status === 'new' && (reserved.has(f.id) || used.has(f.id))) {
      const to = fresh(f.id);
      renames.push(`${f.id}→${to}`);
      f.id = to;
    }
    used.add(f.id);
  }
  const resolved = [];
  for (const o of old) {
    if (oldToNew.has(o.id) || suppress.has(o.id)) continue;
    const v = verdictOf(o.id, FINDING_VERDICTS, 'Finding');
    if (!v) continue;
    if (v.verdict === 'weg' || v.verdict === 'ueberholt') { resolved.push({ id: o.id, title: o.title, verdict: v.verdict, evidence: v.evidence }); continue; }
    const f = { ...o, status: 'carried-over' };
    delete f.previousSeverity;
    if (v.verdict === 'verschoben') { f.location = v.location; if (Array.isArray(v.locations)) f.locations = v.locations; }
    findings.push(f);
  }
  for (const f of findings) counts[f.status]++;

  const acknowledged = [];
  const ackRemoved = [], ackStale = [];
  (prev.acknowledged ?? []).forEach((a, i) => {
    const k = ackKey(a, i);
    const v = verdictOf(k, ACK_VERDICTS, 'Anhang');
    if (!v) return;
    if (v.verdict === 'weg' || v.verdict === 'ueberholt') { ackRemoved.push({ key: k, title: a.title, verdict: v.verdict, evidence: v.evidence, github: a.github?.number }); return; }
    const e = { ...a };
    if (v.verdict === 'verschoben') e.location = v.location;
    if (v.verdict === 'begruendung-veraltet') ackStale.push({ key: k, title: a.title, reason: a.reason, evidence: v.evidence });
    acknowledged.push(e);
  });
  acknowledged.push(...(data.acknowledged ?? []));

  if (errors.length) return { errors };
  data.findings = findings;
  data.acknowledged = acknowledged;
  data.summary.previousDate = prev.summary?.date;
  data.summary.resolvedCount = resolved.length;
  if (!data.scoreHistory?.length) data.scoreHistory = prev.scoreHistory ?? [];
  if (!data.fixHistory?.length) data.fixHistory = prev.fixHistory ?? [];
  return { errors, report: { counts, resolved, renames, suppressed: [...suppress], ackRemoved, ackStale, ackBefore: (prev.acknowledged ?? []).length, ackAfter: acknowledged.length } };
}

function pick(obj, dotted) {
  return dotted.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

class UsageError extends Error {}

export { check, derive, render, extract, readDir };

function parseArgs(argv) {
  const [cmd, ...rest] = argv;
  const opts = { _: [] };
  for (let i = 0; i < rest.length; i++) {
    const a = rest[i];
    if (a.startsWith('--')) opts[a.slice(2)] = rest[++i];
    else opts._.push(a);
  }
  return { cmd, opts };
}

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

function readJson(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { throw new UsageError(`${p}: ${e.message}`); }
}

function main() {
  const { cmd, opts } = parseArgs(process.argv.slice(2));
  if (cmd === 'extract') {
    const data = extract(opts._[0] ?? './audit.html');
    const out = opts.fields ? Object.fromEntries(opts.fields.split(',').map((f) => [f, pick(data, f) ?? null])) : data;
    process.stdout.write(JSON.stringify(out, null, 2) + '\n');
    return 0;
  }
  if (cmd === 'match') {
    if (!opts._[1] || !opts.out) throw new UsageError('match: <data.json> <previous.json> --out <dir>');
    const r = match(readJson(opts._[0]), migrate(readJson(opts._[1])));
    fs.mkdirSync(opts.out, { recursive: true });
    for (const f of fs.readdirSync(opts.out)) if (/^(recheck-\d+|match)\.json$/.test(f)) fs.rmSync(path.join(opts.out, f));
    const { batches, ...rest } = r;
    fs.writeFileSync(path.join(opts.out, 'match.json'), JSON.stringify(rest, null, 2) + '\n');
    const files = batches.map((b, i) => {
      const f = path.join(opts.out, `recheck-${i + 1}.json`);
      fs.writeFileSync(f, JSON.stringify({ batch: i + 1, items: b }, null, 2) + '\n');
      return `${f} (${b.length})`;
    });
    const lines = [
      `✓ ${r.pairs.length} Paare sicher (davon ${r.pairs.filter((p) => p.how === 'title').length} über den Titel) · ${r.ambiguous.length} mehrdeutige Gruppen · Re-Check: ${r.recheck.findings.length} Findings, ${r.recheck.acknowledged.length} Anhangpunkte in ${batches.length} Stapeln`,
      ...r.ambiguous.flatMap((g, i) => [`? Gruppe ${i + 1}`,
        ...g.new.map((f) => `    neu ${f.id} [${f.severity}] ${f.title} · ${f.location}`),
        ...g.old.map((f) => `    alt ${f.id} [${f.severity}] ${f.title} · ${f.location}`)]),
      ...r.ackHits.map((h) => `~ Anhang ${h.ack} »${h.ackTitle}« ↔ ${h.side === 'new' ? 'neu' : 'alt'} ${h.finding} »${h.title}«`),
      ...files.map((f) => `→ ${f}`),
    ];
    process.stdout.write(lines.join('\n') + '\n');
    return 0;
  }
  if (cmd === 'merge') {
    if (!opts._[1] || !opts.dir) throw new UsageError('merge: <data.json> <previous.json> --dir <dir> [--out <data.json>]');
    const data = readJson(opts._[0]);
    const r = merge(data, migrate(readJson(opts._[1])), readDir(opts.dir));
    if (r.errors.length) {
      for (const e of r.errors) process.stderr.write(`✗ ${e}\n`);
      process.stderr.write(`${r.errors.length} Fehler — nichts geschrieben.\n`);
      return 1;
    }
    const out = opts.out ?? opts._[0];
    fs.writeFileSync(out, JSON.stringify(data, null, 2) + '\n');
    fs.writeFileSync(path.join(opts.dir, 'merge-report.json'), JSON.stringify(r.report, null, 2) + '\n');
    const c = r.report.counts, rp = r.report;
    const lines = [
      `✓ ${out} · ${c.new} neu, ${c.unchanged} unverändert, ${c.improved} verbessert, ${c['carried-over']} übernommen, ${rp.resolved.length} behoben · Anhang ${rp.ackBefore} → ${rp.ackAfter}`,
      ...rp.renames.map((x) => `  umbenannt ${x}`),
      ...rp.ackRemoved.map((a) => `  Anhang abgeräumt ${a.key} (${a.verdict}${a.github ? `, Issue #${a.github}` : ''}): ${a.evidence}`),
      ...rp.ackStale.map((a) => `  Anhang, Begründung trägt nicht mehr ${a.key}: ${a.evidence}`),
      `→ ${path.join(opts.dir, 'merge-report.json')}`,
    ];
    process.stdout.write(lines.join('\n') + '\n');
    return 0;
  }
  if (cmd !== 'build' && cmd !== 'check') {
    throw new UsageError('Aufruf: build <data.json> [--out ./audit.html] [--record audit|remediation|github-sync] [--previous prev.json] [--date YYYY-MM-DD] | extract [audit.html] [--fields a.b,c] | check <data.json> | match <data.json> <previous.json> --out <dir> | merge <data.json> <previous.json> --dir <dir> [--out <data.json>]');
  }
  if (!opts._[0]) throw new UsageError(`${cmd}: Datendatei fehlt`);
  if (opts.record && !['audit', 'remediation', 'github-sync'].includes(opts.record)) throw new UsageError('--record: audit, remediation oder github-sync');
  if (opts.date && !isDate(opts.date)) throw new UsageError('--date: YYYY-MM-DD');

  const data = readJson(opts._[0]);
  const errors = check(data);
  if (errors.length) {
    for (const e of errors) process.stderr.write(`✗ ${e}\n`);
    process.stderr.write(`${errors.length} Fehler — keine Datei geschrieben.\n`);
    return 1;
  }
  const previous = opts.previous ? readJson(opts.previous) : null;
  derive(data, { record: opts.record, date: opts.date ?? today(), previous: previous && migrate(previous) });
  const s = data.summary;
  const line = `Score ${s.score} (Modell ${s.scoreModel}) — Code ${s.domains.code.score}, Harness ${s.domains.harness.score} · ${s.counts.findings} Findings, ${s.counts.improvements} Verbesserungen`;
  if (cmd === 'check') {
    // Mit --previous: Delta zum letzten Score und Herkunft der neuen Findings,
    // damit deltaCause und deltaExplanation vor dem Bauen gesetzt werden können.
    const last = previous ? [...(previous.scoreHistory ?? [])].reverse().find((h) => (h.scoreModel ?? 1) === s.scoreModel) : null;
    const b = s.deltaBreakdown;
    const extra = [
      last ? ` · Delta ${Math.round((s.score - last.score) * 10) / 10} zu ${last.date}` : '',
      b ? ` · neue Findings: code ${b.code}, coverage ${b.coverage}, unknown ${b.unknown}` : '',
    ].join('');
    process.stderr.write(`✓ gültig · ${line}${extra}\n`);
    return 0;
  }

  // Die Seite entsteht immer aus dem Template dieses Skills, nie aus dem Markup des
  // Vorgängers. Ein Versionssprung wird gemeldet, damit er im Begleittext landet.
  const before = data.meta.templateVersion ?? previous?.meta?.templateVersion;
  const out = opts.out ?? './audit.html';
  const html = render(data);
  fs.writeFileSync(out, html);
  const upgrade = before && before !== data.meta.templateVersion ? ` · Template ${before} → ${data.meta.templateVersion}` : '';
  process.stderr.write(`✓ ${out} (${Math.round(html.length / 1024)} KB) · ${line}${upgrade}\n`);
  return 0;
}

// Installiert wird per Symlink (~/.claude/skills/<name> → Repo): argv[1] trägt dann den
// Link-Pfad, import.meta.url den aufgelösten. Ohne realpath ist der Vergleich falsch, und
// der Aufruf endet still mit Exit 0, ohne etwas zu tun.
const invokedPath = (p) => { try { return fs.realpathSync(p); } catch { return path.resolve(p); } };
if (process.argv[1] && invokedPath(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    process.exitCode = main();
  } catch (e) {
    process.stderr.write(`✗ ${e.message}\n`);
    process.exitCode = e instanceof UsageError ? 2 : 1;
  }
}
