// node --test js-ts-project-audit/tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { check, derive, render, migrate, extract } from '../scripts/build-report.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCRIPT = path.join(HERE, '..', 'scripts', 'build-report.mjs');
const FIXTURES = path.join(HERE, 'fixtures');
const load = (name) => JSON.parse(fs.readFileSync(path.join(FIXTURES, name), 'utf8'));
const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'audit-report-'));

test('alle Fixtures sind gültig', () => {
  for (const f of fs.readdirSync(FIXTURES).filter((x) => x.endsWith('.json'))) {
    assert.deepEqual(check(load(f)), [], f);
  }
});

test('Modell 2: Dichte, Kappung bei critical, geometrisches Mittel', () => {
  const d = derive(load('followup-de.json'), { date: '2026-09-18' });
  const s = d.summary;
  assert.equal(s.scoreModel, 2);
  // Code: 27 Abzugspunkte auf 9,32 kLOC → 73 vor der Kappung; ein critical kappt auf 49.
  assert.equal(s.domains.code.penalty, 27);
  assert.equal(s.domains.code.score, 49);
  // Harness: 7,5 Punkte → 100 / (1 + 7,5/60) = 88,9
  assert.equal(s.domains.harness.score, 89);
  assert.equal(s.score, 66);
  // Improvements zählen nicht
  assert.equal(s.counts.findings, 12);
  assert.equal(s.counts.improvements, 1);
});

test('Modell 1 ohne scope reproduziert die alte Formel', () => {
  const d = load('first-run-de.json');
  delete d.summary.scope;
  derive(d, {});
  assert.equal(d.summary.scoreModel, 1);
  assert.equal(d.summary.score, 100 - 2 - 0.5);
});

test('leere Domain hat Score 100', () => {
  const d = derive(load('monorepo-en.json'), {});
  assert.equal(d.summary.domains.harness.score, 100);
  assert.deepEqual(d.summary.packages.map((p) => p.findings), [2, 1, 1]);
});

test('--record ersetzt den Eintrag desselben Tages und derselben Quelle, FIFO bei 20', () => {
  const d = load('followup-de.json');
  derive(d, { record: 'audit', date: '2026-09-18' });
  derive(d, { record: 'audit', date: '2026-09-18' });
  const last = d.scoreHistory.at(-1);
  assert.equal(d.scoreHistory.filter((h) => h.date === '2026-09-18').length, 1);
  assert.deepEqual({ ...last, coverage: undefined }, { date: '2026-09-18', score: 66, source: 'audit', scoreModel: 2, domains: { code: 49, harness: 89 }, coverage: undefined });
  assert.equal(last.coverage, 0.726);
  derive(d, { record: 'remediation', date: '2026-09-18' });
  assert.equal(d.scoreHistory.filter((h) => h.date === '2026-09-18').length, 2, 'andere Quelle, eigener Punkt');
  for (let i = 0; i < 30; i++) derive(d, { record: 'audit', date: `2027-01-${String(i + 1).padStart(2, '0')}` });
  assert.equal(d.scoreHistory.length, 20);
});

test('deltaBreakdown trennt Code- von Prüftiefen-Effekt', () => {
  const prev = load('followup-de.json');
  prev.summary.scope.reviewedFiles = ['src/loader/AssetLoader.ts'];
  const d = derive(load('followup-de.json'), { previous: prev });
  // neu: ASYNC-001, ASYNC-002, SEC-001 (Loader, schon gelesen) · BUG-001, DX-001, TYPE-001 (erstmals gelesen)
  assert.deepEqual(d.summary.deltaBreakdown, { code: 3, coverage: 3, unknown: 0 });
  const blind = derive(load('followup-de.json'), { previous: { summary: {} } });
  assert.deepEqual(blind.summary.deltaBreakdown, { code: 0, coverage: 0, unknown: 6 });
});

test('Querverweise und Eindeutigkeit', () => {
  const d = load('followup-de.json');
  d.findings[0].component = 'gibts-nicht';
  d.findings[2].id = d.findings[1].id;
  d.portrait.diagram.edges.push({ from: 'api', to: 'nirgends' });
  const errors = check(d).join('\n');
  assert.match(errors, /component: »gibts-nicht«/);
  assert.match(errors, /doppelt/);
  assert.match(errors, /unbekannten Knoten/);
});

test('Schema: unbekannte Felder, falsche Enums, fehlende Pflichtfelder', () => {
  const d = load('first-run-de.json');
  d.findings[0].severity = 'severe';
  d.findings[0].extra = 1;
  delete d.findings[1].title;
  const errors = check(d).join('\n');
  assert.match(errors, /severity: "severe"/);
  assert.match(errors, /unbekanntes Feld »extra«/);
  assert.match(errors, /Pflichtfeld »title«/);
});

test('SVG-Diagramm: feste Farben, Skripte und externe Links werden abgelehnt', () => {
  const bad = [
    '<svg viewBox="0 0 10 10"><script>alert(1)</script></svg>',
    '<svg viewBox="0 0 10 10"><rect fill="#ff0000"/></svg>',
    '<svg viewBox="0 0 10 10"><a href="https://x.test"><text>x</text></a></svg>',
    '<svg viewBox="0 0 10 10"><rect onclick="x()"/></svg>',
    '<svg><rect/></svg>',
  ];
  for (const svg of bad) {
    const d = load('monorepo-en.json');
    d.portrait.diagram.svg = svg;
    assert.ok(check(d).length > 0, svg);
  }
  assert.deepEqual(check(load('monorepo-en.json')), []);
});

test('ein </script> in einem Finding beendet die Insel nicht', () => {
  const d = derive(load('first-run-de.json'), {});
  d.findings[0].description = 'Beispiel: `</script><script>alert(1)</script>`';
  const html = render(d);
  const island = html.match(/<script id="audit-data" type="application\/json">([\s\S]*?)<\/script>/)[1];
  assert.equal(JSON.parse(island).findings[0].description, d.findings[0].description);
  assert.equal(html.match(/<\/script>/g).length, 3, 'nur die drei Script-Tags des Templates');
});

test('build → extract ist verlustfrei, check nimmt den eigenen Output an', () => {
  const dir = tmp();
  const out = path.join(dir, 'audit.html');
  execFileSync('node', [SCRIPT, 'build', path.join(FIXTURES, 'followup-de.json'), '--out', out, '--record', 'audit', '--date', '2026-09-18'], { stdio: 'pipe' });
  const back = extract(out);
  assert.equal(back.summary.score, 66);
  assert.ok(back.meta.templateVersion);
  const again = path.join(dir, 'again.json');
  fs.writeFileSync(again, JSON.stringify(back));
  const r = spawnSync('node', [SCRIPT, 'check', again], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
});

test('ungültige Daten: Exit 1, keine Datei', () => {
  const dir = tmp();
  const bad = path.join(dir, 'bad.json');
  fs.writeFileSync(bad, JSON.stringify({ schemaVersion: 2 }));
  const out = path.join(dir, 'audit.html');
  const r = spawnSync('node', [SCRIPT, 'build', bad, '--out', out], { encoding: 'utf8' });
  assert.equal(r.status, 1);
  assert.equal(fs.existsSync(out), false);
});

test('Migration einer v1-Insel', () => {
  const v1 = {
    summary: {
      project: 'alt', stack: 'Node, TS', date: '2026-08-01', theme: 'dark', score: 81.5,
      scoreHistory: [{ date: '2026-07-01', score: 60 }, { date: '2026-08-01', score: 81.5, source: 'remediation' }],
      domains: { code: { label: 'Code & Laufzeit', executiveSummary: 'Solide.' }, harness: { executiveSummary: 'Tests fehlen.' } },
    },
    portrait: { description: 'Ein altes Projekt.', domains: [{ name: 'Storage Adapter', text: 'Persistenz', paths: ['src/storage/'] }] },
    findings: [
      { id: 'TEST-001', category: 'Testabdeckung & Teststrategie', severity: 'medium', title: 't', location: 'src/a.ts:1', description: 'd', recommendation: 'r', effort: 'XS', status: 'new', component: 'Storage Adapter', evidence: ['a', 'b'] },
      { id: 'SEC-001', category: 'Typsicherheit (TS)', domain: 'harness', severity: 'low', title: 'u', location: 'src/b.ts', description: 'd', recommendation: 'r', effort: 'S', known: true },
    ],
    optimizations: [{ title: 'Performance: Cache', text: 'Memoisieren.' }],
    openQuestions: [{ title: 'Frage?', detail: 'Kontext' }, { q: 'Zweite', ctx: 'mehr' }],
    methodology: { read: ['src/'], notRead: ['docs/'] },
    acknowledged: [{ category: 'Konsistenz', title: 'x', location: 'y', reason: 'z', acknowledgedDate: '2026-07-02' }],
  };
  const m = migrate(v1);
  assert.deepEqual(check(m), []);
  assert.equal(m.meta.lang, 'de');
  assert.equal(m.findings[0].category, 'testing');
  assert.equal(m.findings[0].domain, 'harness');
  assert.equal(m.findings[0].effort, 'S');
  assert.equal(m.findings[0].component, 'storage-adapter');
  assert.equal(m.findings[1].category, 'types', 'Typsicherheit ist nicht Sicherheit');
  assert.equal(m.findings[2].kind, 'improvement');
  assert.equal(m.findings[2].category, 'performance');
  assert.deepEqual(m.openQuestions, ['**Frage?** — Kontext', '**Zweite** — mehr']);
  assert.deepEqual(m.scoreHistory.map((h) => h.scoreModel), [1, 1]);
  assert.equal(m.scoreHistory[1].source, 'remediation');
  assert.deepEqual(m.summary.stack, ['Node', 'TS']);
  derive(m, {});
  assert.equal(m.summary.scoreModel, 1, 'ohne gemessenen Umfang bleibt Modell 1');
});
