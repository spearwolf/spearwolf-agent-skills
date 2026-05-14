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

Zusätzlich ein `summary`-Objekt mit: Projektname, Stack, Anzahl Findings pro Severity, Anzahl Findings pro Kategorie, Gesamt-Health-Score (siehe unten), Datum.

### 5. Health-Score (transparent)

Einfache, sichtbar dokumentierte Heuristik:
- Start: 100 Punkte.
- Abzug pro Finding: `critical` -10, `high` -5, `medium` -2, `low` -0.5, `info` 0.
- Untergrenze: 0.
- Score und Berechnung im Report explizit ausweisen, damit nicht der Eindruck einer Black-Box-Bewertung entsteht.

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
  8. Methodik-Sektion: was wurde gelesen, was nicht, wie wurde der Score berechnet.
- Schweregrade farblich konsistent: critical=rot, high=orange, medium=amber, low=blau, info=grau.
- Keine externen Fonts oder Bilder. SVG-Icons inline wenn nötig.
- Wenn bereits eine `./audit.html` existiert: überschreiben, kein Suffix anhängen.

### 7. Ergebnis ausliefern

- Datei mit `present_files` an den Nutzer zurückgeben (Pfad: `./audit.html`).
- Kurzer Begleittext (max. 5–8 Zeilen): Health-Score, Top-3-Critical/High-Findings, Hinweis auf Methodik-Sektion. Keine Wiederholung des Reports im Chat.

## Wichtige Prinzipien

- **Belegt statt vermutet**: Jedes Finding mit Datei-/Zeilenreferenz, sonst weglassen. Bei Unsicherheit → "Offene Fragen", nicht als Finding.
- **Keine Stiltyrannei**: keine Findings für Geschmacksfragen ohne Wirkung (Tabs vs. Spaces, wenn Formatter konsistent läuft, ist kein Finding).
- **Sprache des Reports**: in derselben Sprache wie die Nutzeranfrage. Default Deutsch, wenn der Nutzer Deutsch schreibt.
- **Kein Auto-Fix**: Dieser Skill schreibt keinen Code im Projekt um. Empfehlungen sind Empfehlungen.
- **Größenlimits**: Bei Repos > ~500 Dateien Sampling-Strategie strikt anwenden und die Auswahl in der Methodik-Sektion offenlegen.
- **Monorepos**: Pro Package separate Score-Zeile in der Summary, gemeinsames Backlog mit Package-Spalte.
