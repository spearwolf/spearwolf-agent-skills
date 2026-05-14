---
name: js-ts-project-audit
description: Performs a thorough, holistic audit of a JavaScript or TypeScript project and renders a self-contained HTML report to `./audit.html`. Covers architecture, project layout, module boundaries, developer experience, public API quality, implementation status, test coverage and strategy, code readability, clean-code adherence, potential bugs, memory leaks, race conditions, inconsistencies, type safety, security risks, and dependency hygiene. Always use this skill when the user asks for a code review, audit, quality assessment, health check, or technical due diligence of a JS/TS, Node.js, React, Vue, Svelte, Angular, Next.js, NestJS, or monorepo project — even with informal phrasing like "review my repo", "is my code clean?", or "take a look at this project". Output is always a single standalone `./audit.html` with prioritized findings, recommendations, optimization opportunities, and open questions.
---

# JS/TS Project Audit

Ein Skill für die strukturierte, ganzheitliche Analyse eines JavaScript- oder TypeScript-Projekts. Output ist immer eine `./audit.html` mit priorisierten Findings und Empfehlungen.

## Wann triggern

Sobald der Nutzer ein JS/TS-Projekt (Verzeichnis, Repo, Archiv) bereitstellt und eine inhaltliche Bewertung möchte — egal ob als "Audit", "Review", "Analyse", "Health-Check", "Due Diligence" oder informell ("schau mal drauf"). Auch bei Teilanalysen (nur Tests, nur Architektur) denselben Workflow nutzen und die nicht angefragten Sektionen leerer halten, aber strukturell erhalten.

## Workflow

### 1. Projekt erfassen

- Wurzelverzeichnis bestimmen, `view` auf die Root-Ebene.
- Schlüsseldateien lesen, sofern vorhanden: `package.json`, `tsconfig*.json`, `pnpm-workspace.yaml` / `lerna.json` / `nx.json` / `turbo.json`, `.eslintrc*`, `.prettierrc*`, `vitest.config.*` / `jest.config.*`, `playwright.config.*`, `vite.config.*` / `webpack.config.*` / `rollup.config.*`, `.github/workflows/*`, `README*`, `CHANGELOG*`, `.nvmrc`, `.node-version`, `Dockerfile`, `docker-compose*`.
- Verzeichnisstruktur kartieren (max. 3 Ebenen tief), Monorepo erkennen.
- Stack klassifizieren: Runtime (Node/Bun/Deno/Browser), Framework, Build-Tool, Test-Runner, Sprachversion, TS-Strictness.
- **Vorheriges `./audit.html` separat behandeln**: Datei existiert? → Pfad merken, aber **vollständig aus der inhaltlichen Analyse ausschließen** (nicht als Quelltext lesen, nicht als Finding-Quelle nutzen, nicht in der Verzeichnisstruktur als "Code" zählen). Die Datei wird erst in Schritt 5b für den Abgleich geöffnet. Begründung: Der neue Audit muss unvoreingenommen am Code stattfinden, sonst werden alte Findings kopiert statt verifiziert.

### 2. Sampling-Strategie für den Code

Großprojekte nicht zeilenweise lesen. Stattdessen:

- **Entry Points** vollständig lesen: `src/index.*`, `src/main.*`, `app/page.*`, exportierte Module aus `package.json`-Feldern (`main`, `module`, `exports`, `bin`).
- **Öffentliche API**: alles unter `src/` mit `index.*` und re-exporte.
- **"Heiße" Module**: die größten Dateien (`bash_tool` mit `find ... -size` oder `wc -l`), zentrale Utility-/Core-Verzeichnisse, alles mit "manager", "service", "store", "controller", "engine" im Namen.
- **Risiko-Hotspots**: Dateien mit `useEffect`, `setInterval`, `setTimeout`, `addEventListener`, `subscribe`, `EventEmitter`, manuelle Promise-Konstruktion, `any`, `// @ts-ignore`, `eslint-disable`, `TODO`, `FIXME`, `HACK`.
- **Tests**: `__tests__/`, `*.test.*`, `*.spec.*` — mindestens Stichprobe pro Bereich.
- **CI/Build**: Workflow-Dateien und Build-Skripte.

Bei jedem gelesenen File: Notizen pro Analysedimension sammeln (siehe Abschnitt 3).

### 3. Analysedimensionen

Für jede Dimension Findings sammeln mit Schweregrad (`critical` / `high` / `medium` / `low` / `info`), Datei-/Zeilenreferenz wo möglich, und konkretem Verbesserungsvorschlag.

1. **Architektur & Struktur** — Layering, Abhängigkeitsrichtung, Modulgrenzen, zirkuläre Abhängigkeiten, Trennung Domain/Infrastruktur, Konsistenz der Ordnerlogik.
2. **Projektaufbau & Build** — Build-Tooling-Wahl, TS-Konfiguration (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`), Pfad-Aliase, Tree-Shaking-Fähigkeit, Bundle-Größe, Sourcemaps.
3. **Developer Experience** — `README`-Qualität, Setup-Schritte, Scripts in `package.json`, Linting, Formatter, Pre-Commit-Hooks (Husky/lint-staged), Editor-Konfiguration, Onboarding-Hürden, Fehlerverständlichkeit, Hot-Reload.
4. **Öffentliche API** — Klarheit der Exports, Naming, Konsistenz, Stabilität (Versionierung, Breaking-Change-Strategie), JSDoc/TSDoc, Typ-Exporte, Default- vs. Named-Exports, Treeshakeability.
5. **Implementierungsstand** — Vollständigkeit ggü. README/Docs, offene TODOs/FIXMEs, tote Code-Pfade, ungenutzte Exporte, auskommentierter Code.
6. **Testabdeckung & Teststrategie** — Unit/Integration/E2E-Balance, Coverage-Konfiguration, Test-Doubles, Flakiness-Indikatoren, Snapshot-Hygiene, fehlende kritische Pfade.
7. **Lesbarkeit & Clean Code** — Funktionsgrößen, Verschachtelungstiefe, Naming, Single Responsibility, Magic Numbers, Kommentar-Qualität, Konsistenz im Stil.
8. **Bugs & Korrektheitsrisiken** — fehlende `await`, unbehandelte Promise-Rejections, falsche Equality, Off-by-One, Mutation geteilter States, fehlende Null-Checks, unsichere Type-Casts (`as`), unsichere `JSON.parse`-Nutzung.
9. **Memory Leaks & Ressourcen** — nicht entfernte Listener, nicht gecleared Timer/Intervals, unbeendete Subscriptions, fehlende `AbortController`, Closure-Captures großer Objekte, Caches ohne Eviction, fehlende Stream/FileHandle-Cleanups.
10. **Async / Concurrency** — Race Conditions, fehlende Cancellation, `Promise.all` vs. sequenziell, unklare Reentrancy, blockierender Code im Eventloop.
11. **Konsistenz** — Stilbrüche zwischen Modulen, gemischte Patterns (Class vs. Funktional, Callback vs. Promise vs. async), uneinheitliche Fehlerbehandlung, uneinheitliches Logging.
12. **Typsicherheit (bei TS)** — `any`-Vorkommen, unsichere Casts, fehlende Generics, schwache Rückgabetypen, breite Union-Types ohne Discriminator.
13. **Sicherheit** — `eval`, Template-Injection, ungeprüfte User-Inputs, Secrets im Repo, unsichere Defaults, veraltete Crypto, CORS-/CSRF-/XSS-Vektoren, `dangerouslySetInnerHTML`.
14. **Dependencies** — veraltet, deprecated, doppelt, ungenutzt, Lizenzrisiken, unnötig schwer. `npm outdated` / `pnpm outdated` ausführen, sofern Netzwerk und Lockfile es zulassen.
15. **Performance** — N+1, unnötige Re-Renders, fehlende Memoization, große synchrone Loops, fehlende Pagination, fehlende Caching-Layer.

Befunde sammeln, bevor mit Schritt 4 begonnen wird — nicht parallel HTML zusammenbauen.

### 4. Backlog-Modell

Vor dem Rendern strukturierte Daten erzeugen (in-memory JS-Objekt im HTML), nicht direkt Markup schreiben. Jedes Finding hat:

- `id` (z. B. `ARCH-001`)
- `category` (eine der 15 Dimensionen oben)
- `severity` (`critical` | `high` | `medium` | `low` | `info`)
- `title` (kurz, imperativ formuliert: "Memory Leak in WebSocket-Reconnect beheben")
- `location` (Pfad, ggf. Zeile)
- `description` (Was ist das Problem, was sind die Konsequenzen)
- `recommendation` (Wie konkret beheben)
- `effort` (`S` | `M` | `L`)
- `status` (optional, nur bei Diff-Lauf gesetzt): `new` | `unchanged` | `improved` | `carried-over` — siehe Schritt 5b.
- `previousSeverity` (optional, nur bei `improved`): die Severity aus dem vorherigen Audit, damit die Verbesserung im Report sichtbar wird.

Zusätzlich ein `summary`-Objekt mit: Projektname, Stack, Anzahl Findings pro Severity, Anzahl Findings pro Kategorie, Gesamt-Health-Score (siehe unten), Datum. Bei Diff-Lauf zusätzlich: Datum des vorherigen Audits, Anzahl behobener Findings, Anzahl verbesserter Findings, Score-Delta.

### 5. Health-Score (transparent)

Einfache, sichtbar dokumentierte Heuristik:
- Start: 100 Punkte.
- Abzug pro Finding: `critical` -10, `high` -5, `medium` -2, `low` -0.5, `info` 0.
- Untergrenze: 0.
- Score und Berechnung im Report explizit ausweisen, damit nicht der Eindruck einer Black-Box-Bewertung entsteht.

### 5b. Abgleich mit vorherigem Audit (nur wenn `./audit.html` existierte)

Wenn in Schritt 1 ein vorheriges `./audit.html` gefunden wurde, **nach** Abschluss des frischen Audits (Schritte 2–5) einen Merge durchführen. Reihenfolge ist entscheidend: erst der unvoreingenommene neue Lauf, dann der Abgleich.

**Vorheriges Audit parsen:**
- Datei lesen, das eingebettete Daten-Objekt extrahieren (das gemäß Schritt 4 in der HTML als JS-Objekt liegt). Falls das nicht parsebar ist, Findings best-effort aus der Backlog-Tabelle rekonstruieren (Titel, Severity, Location, Kategorie). Datum des alten Audits ebenfalls extrahieren.
- Bei nicht parsebarer Altdatei: in der Methodik-Sektion vermerken und mit reinem Neu-Audit fortfahren — keinen Merge erzwingen.

**Matching alter ↔ neuer Findings:**
- Match-Kriterium primär: gleiche `category` + überlappende `location` (Datei-/Verzeichnispfad). Sekundär: semantische Titelähnlichkeit (gleiches Problem, ggf. anders formuliert).
- Bei Mehrdeutigkeit konservativ matchen — lieber zwei Findings stehen lassen als fälschlich als "gleich" markieren.

**Regeln pro altem Finding:**

1. **Im Code nicht mehr vorhanden** (verifiziert durch Re-Read der betroffenen Stelle): → Finding **entfällt vollständig**. Nicht im neuen Backlog auftauchen lassen. In `summary.resolvedCount` zählen. Begründung: der Nutzer soll nicht durch erledigte Punkte rauschen müssen.
2. **Im neuen Audit als Finding aufgetaucht, Severity gleich**: → neues Finding übernehmen, `status: "unchanged"`. Altes Finding verwerfen.
3. **Im neuen Audit aufgetaucht, Severity niedriger** (z. B. vorher `high`, jetzt `medium`): → neues Finding übernehmen, `status: "improved"`, `previousSeverity` setzen.
4. **Im neuen Audit aufgetaucht, Severity höher**: → neues Finding übernehmen, `status: "unchanged"` (keine künstliche "regressed"-Kategorie — die höhere Severity spricht für sich).
5. **Im neuen Audit nicht aufgetaucht, aber im Code noch belegbar vorhanden**: → altes Finding mit `status: "carried-over"` ins neue Backlog übernehmen. Vor der Übernahme **Re-Check im Code** durchführen (Location öffnen, Befund verifizieren). Wenn nicht mehr verifizierbar → wie Fall 1 entfernen.
6. **Im neuen Audit nicht aufgetaucht, im Code nicht mehr belegbar**: → entfällt (Fall 1).

**Wichtig:** Der Re-Check in Fall 5 ist nicht optional. Ohne Verifikation droht das Backlog mit veralteten LLM-Halluzinationen vollzulaufen. Findings, die der neue Lauf weggelassen hat und die nicht mehr im Code belegbar sind, sind keine "übersehenen" Findings — sie sind erledigt.

**Neue Findings (im neuen Audit, kein Match im alten):** → `status: "new"`.

**Score-Delta:** Health-Score des alten Audits (sofern parsebar) merken, im Header neben dem neuen Score zeigen (z. B. `82 → 89  (+7)`).

### 6. `./audit.html` rendern

Eine eigenständige HTML-Datei nach `./audit.html` (relativ zum Projekt-Root bzw. aktuellen Arbeitsverzeichnis) schreiben. Anforderungen:

- **Standalone**: kein externes CSS/JS, keine CDN-Imports. Alles inline.
- **Lesbar**: ruhige Typografie (system-ui), klare Hierarchie, ausreichend Whitespace, Light/Dark via `prefers-color-scheme`.
- **Struktur**:
  1. Header mit Projektname, Stack-Badges, Audit-Datum, Health-Score.
  2. Executive Summary (3–6 Sätze Prosa, was sticht heraus).
  3. Severity-Übersicht als Balken/Zahlen.
  4. Kategorie-Übersicht.
  5. Backlog-Tabelle: filterbar nach Severity und Kategorie via einfachen `<button>`-Toggles mit Vanilla-JS (keine Frameworks). Jede Zeile aufklappbar für `description` + `recommendation`.
  6. Sektion "Offene Fragen / Unklarheiten" — explizit Dinge, die nicht aus dem Code allein entschieden werden konnten.
  7. Sektion "Optimierungspotenzial" — bewusst getrennt von Bugs/Findings: Verbesserungen, die kein Defekt sind.
  8. Methodik-Sektion: was wurde gelesen, was nicht, wie wurde der Score berechnet. Bei Diff-Lauf zusätzlich: Datum des vorherigen Audits, Match-Strategie, Anzahl entfernter (=behobener) Findings.
- Schweregrade farblich konsistent: critical=rot, high=orange, medium=amber, low=blau, info=grau.
- **Status-Marker im Backlog (nur bei Diff-Lauf)**: Jede Zeile bekommt ein kleines Status-Badge — `new` (Akzent), `unchanged` (neutral), `improved` (grün, mit `previousSeverity → currentSeverity` als Tooltip/Untertitel), `carried-over` (gedämpft). In den Filter-Toggles auch nach Status filterbar machen.
- **Diff-Header (nur bei Diff-Lauf)**: Im Header oder direkt darunter eine knappe Vergleichszeile: vorheriges Audit-Datum, Score-Delta, "X Findings behoben seit letztem Audit, Y verbessert, Z neu". Behobene Findings bewusst **nicht** in der Backlog-Tabelle auflisten — nur als Zähler. Wer Details will, hat das alte `audit.html` im git-Verlauf.
- Keine externen Fonts oder Bilder. SVG-Icons inline wenn nötig.
- Wenn bereits eine `./audit.html` existiert: überschreiben, kein Suffix anhängen. Das alte Audit ist zu diesem Zeitpunkt bereits in den Merge eingeflossen (Schritt 5b) — die alte Datei darf verloren gehen. Wenn der Nutzer Historie braucht, ist git der richtige Ort.

### 7. Ergebnis ausliefern

- Datei mit `present_files` an den Nutzer zurückgeben (Pfad: `./audit.html`).
- Kurzer Begleittext (max. 5–8 Zeilen): Health-Score, Top-3-Critical/High-Findings, Hinweis auf Methodik-Sektion. Keine Wiederholung des Reports im Chat.
- Bei Diff-Lauf zusätzlich eine Zeile: "X behoben / Y verbessert / Z neu seit `<Datum>`". Behobene Punkte **nicht einzeln** aufzählen — der Nutzer hat sie bewusst nicht mehr im Backlog.

## Wichtige Prinzipien

- **Belegt statt vermutet**: Jedes Finding mit Datei-/Zeilenreferenz, sonst weglassen. Bei Unsicherheit → "Offene Fragen", nicht als Finding.
- **Keine Stiltyrannei**: keine Findings für Geschmacksfragen ohne Wirkung (Tabs vs. Spaces, wenn Formatter konsistent läuft, ist kein Finding).
- **Sprache des Reports**: in derselben Sprache wie die Nutzeranfrage. Default Deutsch, wenn der Nutzer Deutsch schreibt.
- **Kein Auto-Fix**: Dieser Skill schreibt keinen Code im Projekt um. Empfehlungen sind Empfehlungen.
- **Größenlimits**: Bei Repos > ~500 Dateien Sampling-Strategie strikt anwenden und die Auswahl in der Methodik-Sektion offenlegen.
- **Monorepos**: Pro Package separate Score-Zeile in der Summary, gemeinsames Backlog mit Package-Spalte.
