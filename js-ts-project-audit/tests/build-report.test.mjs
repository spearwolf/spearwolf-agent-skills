// node --test js-ts-project-audit/tests/build-report.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { check, derive, render, migrate, extract, match, merge } from '../scripts/build-report.mjs';
import { matcher, assign, bundle } from '../scripts/bundle.mjs';

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

test('läuft auch über einen Symlink auf das Skill-Verzeichnis', () => {
  // installiert wird per Symlink (~/.claude/skills/<name> → Repo): argv[1] ist dann der
  // Link-Pfad, import.meta.url der aufgelöste — der Aufruf darf nicht still verpuffen
  const dir = tmp();
  const link = path.join(dir, 'skill-link');
  fs.symlinkSync(path.join(HERE, '..'), link, 'dir');
  const viaLink = path.join(link, 'scripts', 'build-report.mjs');
  const out = path.join(dir, 'audit.html');
  const b = spawnSync('node', [viaLink, 'build', path.join(FIXTURES, 'followup-de.json'), '--out', out, '--date', '2026-09-18'], { encoding: 'utf8' });
  assert.equal(b.status, 0, b.stderr);
  assert.ok(fs.existsSync(out), 'build über den Symlink schreibt die Datei');
  const e = spawnSync('node', [viaLink, 'extract', out], { encoding: 'utf8' });
  assert.equal(e.status, 0, e.stderr);
  assert.equal(JSON.parse(e.stdout).summary.score, 66);
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

// --- Folgelauf: match und merge

function followupPair() {
  const prev = load('followup-de.json');
  const data = structuredClone(prev);
  delete data.summary.previousDate; delete data.summary.resolvedCount;
  const base = { domain: 'code', description: 'd', recommendation: 'r' };
  data.findings = [
    { ...base, id: 'ASYNC-001', category: 'async', severity: 'medium', title: 'Race im Loader', location: 'src/loader/AssetLoader.ts:210' },
    { ...base, id: 'BUG-001', category: 'correctness', severity: 'high', title: 'Division durch null', location: 'src/render/Renderer.ts:80' },
    { ...base, id: 'SEC-001', category: 'security', severity: 'high', title: 'Ungeprüfte Eingabe', location: 'src/api/Server.ts:12' },
    { ...base, id: 'CONS-001', category: 'consistency', severity: 'low', title: 'Logging uneinheitlich', location: 'src/core/EventBus.ts:41' },
    { ...base, id: 'ARCH-001', category: 'architecture', severity: 'medium', title: 'Globaler Event-Bus', location: 'src/core/EventBus.ts:5' },
  ];
  data.acknowledged = [];
  return { prev, data };
}

const allVerdicts = (m) => Object.fromEntries([...m.recheck.findings, ...m.recheck.acknowledged].map((k) => [k, { verdict: 'besteht' }]));

test('match: sichere Paare, mehrdeutige Gruppen, Anhang-Treffer, Stapel nach Datei', () => {
  const { prev, data } = followupPair();
  const m = match(data, prev);
  assert.deepEqual(m.pairs.map((p) => [p.new, p.old]).sort(), [['BUG-001', 'BUG-001'], ['CONS-001', 'CONS-001']]);
  assert.equal(m.ambiguous.length, 1);
  assert.deepEqual(m.ambiguous[0].old.map((f) => f.id).sort(), ['ASYNC-001', 'ASYNC-002']);
  assert.ok(m.ackHits.some((h) => h.ack === 'ARCH-004' && h.finding === 'ARCH-001' && h.side === 'new'));
  // Gepaarte alte Findings brauchen keinen Re-Check, mehrdeutige schon
  assert.ok(!m.recheck.findings.includes('BUG-001'));
  assert.ok(m.recheck.findings.includes('ASYNC-002'));
  assert.deepEqual(m.recheck.acknowledged, ['ARCH-004']);
  const items = m.batches.flat();
  assert.equal(items.length, m.recheck.findings.length + 1);
  assert.ok(m.batches.every((b) => b.length <= 15));
  // Einträge zur selben Datei liegen im selben Stapel
  const loader = m.batches.filter((b) => b.some((x) => x.location.startsWith('src/loader/AssetLoader.ts')));
  assert.equal(loader.length, 1);
});

test('match: Titelähnlichkeit löst eine Gruppe nur bei klarem gegenseitigem Favoriten', () => {
  const { prev, data } = followupPair();
  data.findings[0].title = 'Doppelte Loads derselben URL zusammenführen, statt zweimal zu laden';
  const m = match(data, prev);
  assert.ok(m.pairs.some((p) => p.new === 'ASYNC-001' && p.old === 'ASYNC-002' && p.how === 'title'));
  assert.equal(m.ambiguous.length, 0);
  assert.ok(m.recheck.findings.includes('ASYNC-001'), 'das ungepaarte alte Finding geht in den Re-Check');
  // Zwei gleich ähnliche Kandidaten: kein Paar, die Gruppe bleibt beim Orchestrator
  data.findings.push({ ...data.findings[0], id: 'ASYNC-009', location: 'src/loader/AssetLoader.ts:95' });
  const m2 = match(data, prev);
  assert.ok(!m2.pairs.some((p) => p.how === 'title'));
  assert.equal(m2.ambiguous.length, 1);
});

test('merge: Status, ID-Kontinuität, Übernahmen, Anhang abräumen', () => {
  const { prev, data } = followupPair();
  const m = match(data, prev);
  const verdicts = allVerdicts(m);
  verdicts['MEM-001'] = { verdict: 'verschoben', location: 'src/tiles/TileCache.ts:60' };
  verdicts['PERF-001'] = { verdict: 'weg', evidence: 'BloomPass.ts:23 cached jetzt die Textur' };
  verdicts['ARCH-004'] = { verdict: 'ueberholt', evidence: 'docs/adr/007-event-bus.md gestrichen, Bus entfernt' };
  const decisions = { pairs: [['ASYNC-001', 'ASYNC-002']], suppress: ['ARCH-001'] };
  const r = merge(data, prev, { m, decisions, verdicts });
  assert.deepEqual(r.errors, []);
  const by = Object.fromEntries(data.findings.map((f) => [f.id, f]));
  assert.equal(new Set(data.findings.map((f) => f.id)).size, data.findings.length, 'IDs eindeutig');
  assert.equal(by['BUG-001'].status, 'improved');
  assert.equal(by['BUG-001'].previousSeverity, 'critical');
  assert.equal(by['ASYNC-002'].status, 'unchanged', 'aufgelöstes Paar trägt die alte ID');
  assert.equal(by['ASYNC-001'].status, 'carried-over', 'das andere alte Finding bleibt nach Urteil');
  assert.equal(by['SEC-002'].status, 'new', 'kollidierende neue ID wird neu nummeriert');
  assert.equal(by['SEC-001'].status, 'carried-over');
  assert.equal(by['MEM-001'].location, 'src/tiles/TileCache.ts:60');
  assert.ok(by['MEM-001'].github, 'github wandert mit');
  assert.ok(!by['PERF-001'] && !by['ARCH-001']);
  assert.equal(data.summary.resolvedCount, 1);
  assert.equal(data.summary.previousDate, prev.summary.date);
  assert.deepEqual(data.acknowledged, []);
  assert.deepEqual(r.report.renames, ['SEC-001→SEC-002']);
  assert.deepEqual(check(data), []);
});

test('merge verweigert fehlende, unklare und unbelegte Urteile', () => {
  const { prev, data } = followupPair();
  const m = match(data, prev);
  const verdicts = allVerdicts(m);
  delete verdicts['DX-001'];
  verdicts['TEST-001'] = { verdict: 'unklar' };
  verdicts['DEP-001'] = { verdict: 'weg' };
  verdicts['ARCH-004'] = { verdict: 'begruendung-veraltet', evidence: 'ADR 007 ist superseded' };
  const r = merge(structuredClone(data), prev, { m, verdicts });
  assert.ok(r.errors.some((e) => e.includes('DX-001') && e.includes('kein Urteil')));
  assert.ok(r.errors.some((e) => e.includes('TEST-001') && e.includes('unklar')));
  assert.ok(r.errors.some((e) => e.includes('DEP-001') && e.includes('evidence')));
  // Ohne diese drei geht es durch, der Anhangpunkt bleibt und wird gemeldet
  verdicts['DX-001'] = verdicts['TEST-001'] = { verdict: 'besteht' };
  verdicts['DEP-001'] = { verdict: 'weg', evidence: 'Dependency entfernt' };
  const ok = merge(data, prev, { m, verdicts });
  assert.deepEqual(ok.errors, []);
  assert.equal(data.acknowledged.length, 1);
  assert.equal(ok.report.ackStale[0].key, 'ARCH-004');
});

test('match und merge über die Kommandozeile', () => {
  const { prev, data } = followupPair();
  const dir = tmp();
  fs.writeFileSync(path.join(dir, 'data.json'), JSON.stringify(data));
  fs.writeFileSync(path.join(dir, 'prev.json'), JSON.stringify(prev));
  const work = path.join(dir, 'followup');
  const out = execFileSync('node', [SCRIPT, 'match', path.join(dir, 'data.json'), path.join(dir, 'prev.json'), '--out', work], { encoding: 'utf8' });
  assert.match(out, /2 Paare sicher \(davon 0 über den Titel\) · 1 mehrdeutige Gruppen/);
  const m = JSON.parse(fs.readFileSync(path.join(work, 'match.json'), 'utf8'));
  const batches = fs.readdirSync(work).filter((f) => f.startsWith('recheck-'));
  assert.ok(batches.length >= 1);
  const fail = spawnSync('node', [SCRIPT, 'merge', path.join(dir, 'data.json'), path.join(dir, 'prev.json'), '--dir', work], { encoding: 'utf8' });
  assert.equal(fail.status, 1, 'ohne Urteile kein Merge');
  fs.writeFileSync(path.join(work, 'verdicts-1.json'), JSON.stringify({ verdicts: allVerdicts(m) }));
  const r = spawnSync('node', [SCRIPT, 'merge', path.join(dir, 'data.json'), path.join(dir, 'prev.json'), '--dir', work], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  assert.ok(fs.existsSync(path.join(work, 'merge-report.json')));
});

test('extract --fields gibt nur die genannten Pfade aus', () => {
  const dir = tmp();
  const html = path.join(dir, 'audit.html');
  execFileSync('node', [SCRIPT, 'build', path.join(FIXTURES, 'followup-de.json'), '--out', html], { stdio: 'ignore' });
  const out = JSON.parse(execFileSync('node', [SCRIPT, 'extract', html, '--fields', 'portrait.components,summary.theme,meta.templateVersion'], { encoding: 'utf8' }));
  assert.deepEqual(Object.keys(out), ['portrait.components', 'summary.theme', 'meta.templateVersion']);
  assert.ok(Array.isArray(out['portrait.components']));
});

// --- Bündel

test('bundle: Globs, Rest-Slice, Zeilennummern der Quelldatei, Zeichenlimit', () => {
  assert.equal(matcher('src/texture/**')('src/texture/a/b.ts'), true);
  assert.equal(matcher('src/texture/**')('src/textures/a.ts'), false);
  assert.equal(matcher('src/*.ts')('src/x/a.ts'), false);
  assert.equal(matcher('src/render')('src/render/a.ts'), true);
  const s = assign(['src/a/x.ts', 'src/b/y.ts', 'lib/z.ts'], [{ id: 'a', paths: ['src/a/**'] }, { id: 'cfg', files: ['package.json'], source: false }]);
  assert.deepEqual(s.map((x) => [x.id, x.files]), [['a', ['src/a/x.ts']], ['cfg', ['package.json']], ['rest', ['src/b/y.ts', 'lib/z.ts']]]);
  const dir = tmp();
  fs.writeFileSync(path.join(dir, 'big.ts'), Array.from({ length: 400 }, (_, i) => `const v${i} = setTimeout(() => {}, ${i});`).join('\n') + '\n');
  fs.writeFileSync(path.join(dir, 'small.ts'), 'export const x = 1;\n');
  const b = bundle({ id: 't', files: ['small.ts', 'big.ts'] }, dir, 4000);
  assert.equal(b.loc, 401);
  assert.ok(b.chunks.length > 2);
  assert.ok(b.chunks.every((c) => c.length <= 4000));
  assert.match(b.chunks[0], /===== small\.ts · 1 Zeilen =====\n1│ export const x = 1;/);
  assert.ok(b.chunks.some((c) => /Teil 2\//.test(c) && /\n *\d+│ const v\d+/.test(c)));
  assert.ok(b.markersPerKloc > 900);
});
