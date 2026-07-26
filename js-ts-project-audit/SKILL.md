---
name: js-ts-project-audit
description: Use when the user asks for a code review, audit, quality assessment, health check, or technical due diligence of a JavaScript/TypeScript project (Node.js, React, Vue, Svelte, Angular, Next.js, NestJS, monorepos) — even with informal phrasing like "review my repo", "is my code clean?", "schau mal drauf", or "take a look at this project". Also applies to partial reviews (tests only, architecture only). Output contract, the only fixed promise — a single standalone `./audit.html`.
---

# JS/TS Project Audit

Strukturierte, ganzheitliche Analyse eines JavaScript- oder TypeScript-Projekts entlang der 15 Dimensionen aus Schritt 3. Einziger fester Vertrag ist der Output: eine `./audit.html` mit priorisierten Findings.

## Ablauf-Übersicht

1. Projekt erfassen (1) + Projektportrait (1b) — ein vorhandenes `./audit.html` nur registrieren, **nicht** lesen.
2. Code-Sampling (2), Analyse entlang der 15 Dimensionen (3).
3. Backlog-Modell aufbauen (4), Health-Score berechnen (5).
4. Nur bei vorhandenem Vorgänger-Audit: Merge und Abgleich akzeptierter Punkte (5b/5c).
5. Theme bestimmen (6a), Report rendern (6), Ergebnis ausliefern (7).

Die Referenzdateien werden erst gelesen, wenn ihr Schritt dran ist — nicht vorab:

| Datei | Wann lesen |
| --- | --- |
| `references/followup-audit.md` | Schritt 5b — nur wenn ein vorheriges `./audit.html` existiert |
| `references/report-rendering.md` | Schritt 6a — vor jedem Rendern |

## Workflow

### 1. Projekt erfassen

- Wurzelverzeichnis bestimmen, Root-Ebene auflisten (Listing, kein rekursiver Dump).
- Schlüsseldateien lesen, sofern vorhanden: `package.json`, `tsconfig*.json`, Workspace-Manifeste (`pnpm-workspace.yaml`, `lerna.json`, `nx.json`, `turbo.json`), Lint-/Format-Config, Test-Runner-Config, Bundler-Config, `.github/workflows/*`, `README*`, `CHANGELOG*`, Node-Version-Pins, `Dockerfile` / `docker-compose*`.
- Verzeichnisstruktur kartieren (max. 3 Ebenen), Monorepo erkennen.
- Stack klassifizieren: Runtime, Framework, Build-Tool, Test-Runner, Sprachversion, TS-Strictness.
- **Vorheriges `./audit.html`**: Pfad merken, aber vollständig aus der inhaltlichen Analyse ausschließen — nicht als Quelltext lesen, nicht als Finding-Quelle nutzen, nicht als Code zählen. Es wird erst in Schritt 5b geöffnet, damit der neue Audit unvoreingenommen am Code entsteht.

### 1b. Projektportrait & Domänen

Parallel zur technischen Bestandsaufnahme ein inhaltliches Verständnis aufbauen — wovon handelt das Projekt überhaupt? Quellen in dieser Reihenfolge: `README*`, `package.json` (`description`, `keywords`, `name`), `CHANGELOG*`, Top-Level-Verzeichnisse unter `src/` bzw. `packages/`, Exports aus `index.*` / `package.json#exports`.

Daraus synthetisieren:

- **Kurzbeschreibung**: 2–4 Sätze. Was tut das Projekt, für wen, in welchem Kontext. Kein Marketing-Sprech, keine Wiederholung des README-Wortlauts. Bleibt der Zweck unklar, das so schreiben und unter Offene Fragen aufnehmen — nicht raten.
- **Domänen** (3–7): die fachlichen Hauptbereiche, je mit Name, einem Satz und repräsentativen Pfaden. Fachlich, nicht jede Schicht ist eine Domäne — »Auth«, »Billing«, »Renderer«, »Storage-Adapter« ja, »utils« oder »types« nein.
- **Architektur-Diagramm** nur, wenn es Überblick schafft: klare Schichtung, Monorepo ab drei Packages, erkennbarer Datenfluss zwischen Modulen. Bei einer kleinen Lib oder einem CLI-Tool reicht die Domänen-Liste. Form: Inline-SVG oder ASCII in `<pre>` (Standalone-Regel, siehe Schritt 6). Ab etwa zehn Knoten ist es kein Überblick mehr.

Die Synthese steht im Report vor der Executive Summary.

### 2. Sampling-Strategie

Großprojekte nicht zeilenweise lesen. Priorisieren:

- **Entry Points** vollständig: `src/index.*`, `src/main.*`, `app/page.*`, alles aus `main` / `module` / `exports` / `bin`.
- **Öffentliche API**: `index.*`-Dateien und Re-Exporte unter `src/`.
- **Heiße Module**: die größten Dateien (per Shell ermitteln), zentrale Core-/Utility-Verzeichnisse, alles mit „manager", „service", „store", „controller", „engine" im Namen.
- **Risiko-Hotspots**: `useEffect`, `setInterval`, `setTimeout`, `addEventListener`, `subscribe`, `EventEmitter`, manuelle Promise-Konstruktion, `any`, `@ts-ignore`, `eslint-disable`, `TODO`, `FIXME`, `HACK`.
- **Tests** mindestens als Stichprobe pro Bereich, dazu CI- und Build-Skripte.

Bei jedem gelesenen File Notizen pro Dimension sammeln.

### 3. Analysedimensionen

Für jede Dimension Findings sammeln: Schweregrad, Datei-/Zeilenreferenz wo möglich, konkreter Verbesserungsvorschlag.

1. **Architektur & Struktur** — Layering, Abhängigkeitsrichtung, Modulgrenzen, Zyklen, Trennung Domain/Infrastruktur, Konsistenz der Ordnerlogik.
2. **Projektaufbau & Build** — Tooling-Wahl, TS-Konfiguration (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`), Pfad-Aliase, Tree-Shaking, Bundle-Größe, Sourcemaps.
3. **Developer Experience** — README-Qualität, Setup-Schritte, npm-Scripts, Linting, Formatter, Pre-Commit-Hooks, Editor-Konfiguration, Onboarding-Hürden, Fehlerverständlichkeit, Hot-Reload.
4. **Öffentliche API** — Klarheit und Naming der Exports, Stabilität und Breaking-Change-Strategie, JSDoc/TSDoc, Typ-Exporte, Default- vs. Named-Exports, Treeshakeability.
5. **Implementierungsstand** — Vollständigkeit gegenüber README/Docs, offene TODOs/FIXMEs, tote Pfade, ungenutzte Exporte, auskommentierter Code.
6. **Testabdeckung & Teststrategie** — Balance Unit/Integration/E2E, Coverage-Konfiguration, Test-Doubles, Flakiness-Indikatoren, Snapshot-Hygiene, fehlende kritische Pfade.
7. **Lesbarkeit & Clean Code** — Funktionsgrößen, Verschachtelungstiefe, Naming, Single Responsibility, Magic Numbers, Kommentar-Qualität, Stilkonsistenz.
8. **Bugs & Korrektheitsrisiken** — fehlende `await`, unbehandelte Rejections, falsche Equality, Off-by-One, Mutation geteilter States, fehlende Null-Checks, unsichere Casts, ungeschütztes `JSON.parse`.
9. **Memory Leaks & Ressourcen** — nicht entfernte Listener, nicht gecleartes Timer/Interval, unbeendete Subscriptions, fehlender `AbortController`, Closure-Captures großer Objekte, Caches ohne Eviction, fehlende Stream-/FileHandle-Cleanups.
10. **Async & Concurrency** — Race Conditions, fehlende Cancellation, `Promise.all` vs. sequenziell, unklare Reentrancy, blockierender Code im Eventloop.
11. **Konsistenz** — Stilbrüche zwischen Modulen, gemischte Patterns (Class vs. funktional, Callback vs. Promise vs. async), uneinheitliche Fehlerbehandlung, uneinheitliches Logging.
12. **Typsicherheit (TS)** — `any`-Vorkommen, unsichere Casts, fehlende Generics, schwache Rückgabetypen, breite Unions ohne Discriminator.
13. **Sicherheit** — `eval`, Template-Injection, ungeprüfte Inputs, Secrets im Repo, unsichere Defaults, veraltete Crypto, CORS/CSRF/XSS, `dangerouslySetInnerHTML`.
14. **Dependencies** — veraltet, deprecated, doppelt, ungenutzt, Lizenzrisiken, unnötig schwer. `npm outdated` / `pnpm outdated` ausführen, sofern Netzwerk und Lockfile es zulassen.
15. **Performance** — N+1, unnötige Re-Renders, fehlende Memoization, große synchrone Loops, fehlende Pagination, fehlende Caching-Layer.

Erst alle Befunde sammeln, dann Schritt 4 — nicht parallel HTML zusammenbauen.

### 4. Datenmodell

Vor dem Rendern strukturierte Daten erzeugen, nicht direkt Markup schreiben. Diese Daten sind die maschinenlesbare Quelle der Wahrheit: die Filter-UI liest sie zur Laufzeit, der nächste Lauf parst sie in Schritt 5b.

Ein Finding:

| Feld | Wert |
| --- | --- |
| `id` | Kategorie-Kürzel + laufende Nummer, z. B. `ARCH-001` |
| `category` | eine der 15 Dimensionen aus Schritt 3 |
| `severity` | `critical` \| `high` \| `medium` \| `low` \| `info` |
| `title` | kurz und imperativ: „Memory Leak in WebSocket-Reconnect beheben" |
| `location` | Pfad, wenn möglich mit Zeile |
| `description` | Problem und Konsequenz |
| `recommendation` | wie konkret beheben |
| `effort` | `S` \| `M` \| `L` |
| `status` | nur im Folgelauf: `new` \| `unchanged` \| `improved` \| `carried-over` |
| `previousSeverity` | nur bei `improved`: Severity aus dem Vorlauf |

Dazu ein `summary`-Objekt: Projektname, Stack, Findings pro Severity, Findings pro Kategorie, Health-Score, Datum, `theme` (Schritt 6a), `scoreHistory` (chronologisch `[{date, score}, …]`, aktueller Lauf immer als letzter Eintrag). Im Folgelauf zusätzlich Datum des Vorgängers, `resolvedCount`, Anzahl verbesserter Findings, Score-Delta — und bei einem großen Sprung dessen Einordnung (`deltaCause`, `deltaExplanation`; Regeln in `references/followup-audit.md`).

Separat daneben die Liste `acknowledged` — vom Nutzer bewusst zurückgestellte Punkte. Keine Backlog-Findings, kein Gewicht im Health-Score (Details in `references/followup-audit.md`).

### 5. Health-Score

Sichtbar dokumentierte Heuristik, keine Black Box: Start bei 100, Abzug `critical` -10, `high` -5, `medium` -2, `low` -0.5, `info` 0, Untergrenze 0. Score und Rechenweg im Report ausweisen.

`scoreHistory` führt den Verlauf mit — beim Erstlauf ein Eintrag, danach fortgeschrieben (Schritt 5b), maximal 20 Einträge (FIFO). Einen separaten History-Store gibt es nicht; die Quelle der Wahrheit ist der git-Verlauf der `./audit.html`.

### 5b/5c. Folgelauf

Existierte in Schritt 1 ein `./audit.html`, jetzt — nach abgeschlossenem Frisch-Audit — `references/followup-audit.md` lesen und danach arbeiten. Dort stehen Merge-Regeln, der Pflicht-Re-Check vor jedem carry-over, die Score-Historie und der Umgang mit akzeptierten Punkten.

Gab es kein Vorgänger-Audit, entfällt der Schritt ersatzlos.

### 6a. Theme bestimmen

Auflösungsreihenfolge für `"light"` / `"dark"`:

1. Explizite Nutzeranweisung in der laufenden Konversation, auch in verneinter Form („nicht so dunkel" → light).
2. Sonst `summary.theme` des vorherigen Audits, sofern parsebar — so bleibt die Optik über Folgeläufe stabil.
3. Sonst `"light"`.

Das Ergebnis wird in `summary.theme` persistiert und im Report **fix** ausgeliefert, nicht per `prefers-color-scheme`: die Wahl wurde bewusst getroffen und soll nicht von der OS-Einstellung des Lesers überschrieben werden.

Jetzt `references/report-rendering.md` lesen — dort stehen Aufbau und Optik des Reports.

### 6. `./audit.html` rendern

Vertrag der Datei:

- **Zielpfad** `./audit.html` relativ zum Projekt-Root. Eine vorhandene Datei wird überschrieben, kein Suffix — der Merge ist zu diesem Zeitpunkt erledigt, Historie liefert git.
- **Standalone**: kein externes CSS/JS, keine CDN-Imports, keine externen Fonts oder Bilder, kein Mermaid. Alles inline, SVG-Icons inline.
- **Genau eine JSON-Insel** `<script id="audit-data" type="application/json">…</script>` mit dem vollständigen Datenmodell aus Schritt 4 inklusive `summary`, `scoreHistory` und `acknowledged`. Die Filter-UI liest sie per `JSON.parse(document.getElementById('audit-data').textContent)`.
- **Interaktion** in Vanilla-JS: Backlog filterbar nach Severity, Kategorie und (im Folgelauf) Status, Zeilen aufklappbar für `description` und `recommendation`. Keine Frameworks.

Sektionsfolge, Score-Anzeige-Stufen, Diff-Header, Status-Badges, Farben und Typografie stehen in `references/report-rendering.md`.

### 7. Ergebnis ausliefern

- Datei übergeben über den Mechanismus, den der Host zum Präsentieren von Dateien anbietet; gibt es keinen, den Pfad `./audit.html` klar benennen.
- Begleittext von maximal 5–8 Zeilen: Health-Score, Top-3 aus critical/high, Hinweis auf die Methodik-Sektion. Den Report nicht im Chat wiederholen.
- Im Folgelauf eine Zeile „X behoben / Y verbessert / Z neu seit `<Datum>`" — behobene Punkte nicht einzeln aufzählen. Hat der Nutzer in diesem Lauf Punkte zurückgestellt, das in einer Zeile bestätigen und auf den Anhang verweisen.
- Enthält das Backlog Findings ab `medium`, zum Schluss eine Zeile: ob die Punkte abgearbeitet werden sollen, dann übernimmt `js-ts-audit-remediation` mit Umsetzungsplan und Subagenten. Ein Angebot, keine Ankündigung — ohne Zusage endet der Lauf hier.

## Prinzipien

- **Belegt statt vermutet**: jedes Finding mit Datei-/Zeilenreferenz, sonst weglassen. Unsicherheit gehört unter „Offene Fragen", nicht ins Backlog.
- **Schlank statt historisch**: der Report zeigt den aktuellen Zustand. Was erledigt ist — verifiziert oder vom Nutzer so markiert — verschwindet vollständig und lebt nur noch als Zähler weiter. Ausnahmen: Score-Verlauf und der Anhang akzeptierter Punkte.
- **Kein Auto-Fix**: dieser Skill schreibt keinen Code im Projekt um, auch nicht wenn eine Behebung trivial wäre. Empfehlungen bleiben Empfehlungen; die Umsetzung ist ein eigener Lauf.
- **Keine Stiltyrannei**: Geschmacksfragen ohne Wirkung sind keine Findings. Läuft ein Formatter konsistent, ist Tabs vs. Spaces kein Thema.
- **Teilanalysen**: auch bei „nur Tests" oder „nur Architektur" derselbe Workflow, nicht angefragte Sektionen bleiben leerer, aber strukturell erhalten.
- **Sprache des Reports**: dieselbe wie die Nutzeranfrage.
- **Größenlimits**: ab etwa 500 Dateien die Sampling-Strategie strikt anwenden und die Auswahl in der Methodik-Sektion offenlegen.
- **Monorepos**: pro Package eine Score-Zeile in der Summary, gemeinsames Backlog mit Package-Spalte.
