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

### 1b. Projektportrait & Domänen erfassen

Parallel zur technischen Bestandsaufnahme ein **inhaltliches Verständnis** aufbauen — wovon handelt das Projekt überhaupt?

**Quellen (in dieser Reihenfolge auswerten):**
- `README*` (Beschreibung, Sektionen "About", "Features", "Usage").
- `package.json` Felder `description`, `keywords`, `name` (Scope kann Domäne andeuten).
- `CHANGELOG*`, falls nicht trivial — gibt Hinweis auf Entwicklungsschwerpunkte.
- Top-Level-Verzeichnisse unter `src/` bzw. `packages/` (in Monorepos): die Namen sind oft schon eine Domänen-Liste.
- Exports aus `index.*` / `package.json#exports` — was das Projekt nach außen anbietet.

**Synthetisieren:**
- **Kurzbeschreibung**: 2–4 Sätze. Was tut das Projekt, für wen, in welchem Kontext. Kein Marketing-Sprech, keine Wiederholung des README-Wortlauts. Wenn unklar, schreiben "Zweck aus den Quellen nicht eindeutig ableitbar" und unter Offene Fragen aufnehmen — nicht raten.
- **Domänen** (3–7 Stück): die fachlichen bzw. funktionalen Hauptbereiche. Pro Domäne: Name, ein Satz Beschreibung, repräsentative Pfade (z. B. `src/auth/`, `packages/renderer/`). Domänen sind *fachlich*, nicht jede Schicht ist eine Domäne — "utils" oder "types" sind keine Domäne, "Auth", "Billing", "Renderer", "Storage-Adapter" schon.
- **Architektur-Diagramm — nur wenn es Mehrwert bringt**: bei klarer Schichtung, Monorepo mit ≥3 Packages, oder erkennbarem Datenfluss zwischen Modulen. Bei einer einzelnen kleinen Lib oder einem CLI-Tool **kein Diagramm** — Domänen-Liste reicht. Form: Inline-SVG oder ASCII in `<pre>` (keine externen Diagramm-Libs, kein Mermaid — verstößt gegen Standalone-Regel). Zeigt Packages/Layer als Boxen, Hauptabhängigkeiten als Pfeile. Max ~10 Knoten, sonst ist es kein Überblick mehr.

Diese Synthese wird im Report **vor** der Executive Summary platziert (siehe Schritt 6).

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

Zusätzlich ein `summary`-Objekt mit: Projektname, Stack, Anzahl Findings pro Severity, Anzahl Findings pro Kategorie, Gesamt-Health-Score (siehe unten), Datum, `theme` (`"light"` | `"dark"` — siehe Schritt 6a), `scoreHistory` (chronologische Liste `[{date, score}, ...]`, immer mit dem aktuellen Lauf als letztem Eintrag — siehe Schritt 5). Bei Diff-Lauf zusätzlich: Datum des vorherigen Audits, Anzahl behobener Findings, Anzahl verbesserter Findings, Score-Delta.

Außerdem — parallel zum Backlog in denselben eingebetteten Daten — eine separate Liste `acknowledged` für vom Nutzer bewusst zurückgestellte Punkte (siehe Schritt 5c). Einträge dort sind **keine** Backlog-Findings und fließen **nicht** in den Health-Score ein.

### 5. Health-Score (transparent)

Einfache, sichtbar dokumentierte Heuristik:
- Start: 100 Punkte.
- Abzug pro Finding: `critical` -10, `high` -5, `medium` -2, `low` -0.5, `info` 0.
- Untergrenze: 0.
- Score und Berechnung im Report explizit ausweisen, damit nicht der Eindruck einer Black-Box-Bewertung entsteht.

**Score-Historie:** Jedes Audit führt eine chronologische Liste `scoreHistory: [{date, score}, ...]` mit. Beim ersten Lauf enthält sie genau einen Eintrag (den aktuellen). Bei Folgeläufen wird die Historie aus dem vorherigen Audit übernommen (siehe Schritt 5b) und um den aktuellen Lauf erweitert. Die Liste lebt im eingebetteten Daten-Objekt der HTML — es gibt keinen separaten History-Store, der git-Verlauf der `./audit.html` ist die Quelle der Wahrheit, die Liste im aktuellen Report die bequeme Zusammenfassung. Maximal letzte 20 Einträge halten, ältere abschneiden (FIFO) — der Chart wird sonst unleserlich.

### 5b. Abgleich mit vorherigem Audit (nur wenn `./audit.html` existierte)

Wenn in Schritt 1 ein vorheriges `./audit.html` gefunden wurde, **nach** Abschluss des frischen Audits (Schritte 2–5) einen Merge durchführen. Reihenfolge ist entscheidend: erst der unvoreingenommene neue Lauf, dann der Abgleich.

**Vorheriges Audit parsen:**
- Datei lesen, das eingebettete Daten-Objekt extrahieren (das gemäß Schritt 4 in der HTML als JS-Objekt liegt). Falls das nicht parsebar ist, Findings best-effort aus der Backlog-Tabelle rekonstruieren (Titel, Severity, Location, Kategorie). Datum des alten Audits, Score, `scoreHistory`, `theme` und die `acknowledged`-Liste (siehe Schritt 5c) ebenfalls extrahieren.
- Wenn `scoreHistory` im Altdatensatz fehlt (Audits aus älteren Skill-Versionen), aus dem Altscore und Altdatum einen einzelnen Eintrag synthetisieren: `[{date: <altDatum>, score: <altScore>}]`. Damit beginnt die Historie sinnvoll, statt auf einen sauberen Erstlauf zu warten.
- Bei nicht parsebarer Altdatei: in der Methodik-Sektion vermerken und mit reinem Neu-Audit fortfahren — keinen Merge erzwingen, `scoreHistory` startet bei einem einzigen Eintrag.

**Matching alter ↔ neuer Findings:**
- Match-Kriterium primär: gleiche `category` + überlappende `location` (Datei-/Verzeichnispfad). Sekundär: semantische Titelähnlichkeit (gleiches Problem, ggf. anders formuliert).
- Bei Mehrdeutigkeit konservativ matchen — lieber zwei Findings stehen lassen als fälschlich als "gleich" markieren.

**Regeln pro altem Finding:**

1. **Im Code nicht mehr vorhanden** (verifiziert durch Re-Read der betroffenen Stelle): → Finding **entfällt vollständig**. Nicht im neuen Backlog auftauchen lassen. In `summary.resolvedCount` zählen. Begründung: der Nutzer soll nicht durch erledigte Punkte rauschen müssen.
2. **Im neuen Audit als Finding aufgetaucht, Severity gleich**: → neues Finding übernehmen, `status: "unchanged"`. Altes Finding verwerfen.
3. **Im neuen Audit aufgetaucht, Severity niedriger** (z. B. vorher `high`, jetzt `medium`): → neues Finding übernehmen, `status: "improved"`, `previousSeverity` setzen.
4. **Im neuen Audit aufgetaucht, Severity höher**: → neues Finding übernehmen, `status: "unchanged"` (keine künstliche "regressed"-Kategorie — die höhere Severity spricht für sich).
5. **Im neuen Audit nicht aufgetaucht, aber im Code noch belegbar vorhanden**: → Kandidat für `status: "carried-over"`. Vor der Übernahme einen **Relevanz-Re-Check** durchführen — nicht nur "ist die Code-Stelle noch da", sondern "ist der Punkt überhaupt noch relevant":
   - **Code-Beleg**: Location öffnen, Befund verifizieren. Nicht mehr auffindbar → wie Fall 1 entfernen.
   - **Kontext-Beleg**: hat sich seit dem alten Audit der *Rahmen* geändert — Architektur, `README`/Docs, Specs, Proposals/ADRs, Roadmap —, so dass der Befund gegenstandslos geworden ist (bewusste Entscheidung dokumentiert, Feature gestrichen, Pattern offiziell sanktioniert)? Dann **komplett entfernen**, auch wenn die Code-Stelle technisch noch existiert. Wie Fall 1 in `summary.resolvedCount` zählen.
   - Nur als `status: "carried-over"` übernehmen, wenn der Punkt **nach beiden Prüfungen** weiterhin relevant ist.
6. **Im neuen Audit nicht aufgetaucht, im Code nicht mehr belegbar**: → entfällt (Fall 1).

**Wichtig:** Der Re-Check in Fall 5 ist nicht optional. Ohne Verifikation droht das Backlog mit veralteten LLM-Halluzinationen vollzulaufen. Findings, die der neue Lauf weggelassen hat und die nicht mehr im Code belegbar sind, sind keine "übersehenen" Findings — sie sind erledigt. Dasselbe gilt für den Kontext-Beleg: ein Punkt, den geänderte Docs/Specs/Architektur ausgehebelt haben, ist erledigt, nicht "übersehen". Beim kontextbedingten Entfernen die maßgebliche Quelle (Doc/Spec/Proposal/Commit) kurz benennen, statt nach Bauchgefühl zu streichen.

**Neue Findings (im neuen Audit, kein Match im alten):** → `status: "new"`.

**Score-Delta:** Health-Score des alten Audits (sofern parsebar) merken, im Header neben dem neuen Score zeigen (z. B. `82 → 89  (+7)`). Tendenz-Indikator dazusetzen: `▲` bei Verbesserung, `▼` bei Verschlechterung, `–` bei Gleichstand. Diese Anzeige ist die Mindeststufe der Historie — sie erscheint ab dem zweiten Audit.

**Score-Historie fortschreiben:** Die übernommene `scoreHistory` aus dem Altdatensatz um einen neuen Eintrag `{date: <heutiges Datum>, score: <neuer Score>}` ergänzen. Auf maximal 20 Einträge begrenzen (FIFO). Diese Liste wird in den eingebetteten Daten der neuen `./audit.html` persistiert.

### 5c. Akzeptierte / zurückgestellte Punkte (Anhang)

Manche Befunde sind dokumentiert, bewusst akzeptiert oder schlicht nicht mehr verfolgenswert — der Nutzer will sie nicht bei jedem Lauf erneut im Backlog sehen, obwohl sie nicht im klassischen Sinn "gelöst" sind. Solche Punkte wandern in die separate Liste `acknowledged` und erscheinen im Report nur noch als **Anhang**, nicht im aktiven Backlog.

**Erledigt ≠ akzeptiert — zwei unterschiedliche Nutzeranweisungen sauber trennen:**
- Markiert der Nutzer einen Punkt als **geklärt / umgesetzt / erledigt / behoben** ("FOO ist umgesetzt", "den Punkt habe ich gefixt"), dann ist das **kein** Anhang-Fall: kurz im Code re-verifizieren und das Finding wie Schritt 5b Fall 1 **vollständig entfernen** (in `resolvedCount` zählen, nicht in `acknowledged`). Wenn die Re-Verifikation den Punkt im Code weiterhin belegt (Nutzer sagt erledigt, Code widerspricht), das Finding **behalten** und den Widerspruch unter "Offene Fragen" notieren — nicht stillschweigend löschen.
- Markiert der Nutzer einen Punkt als **akzeptabel / zurückgestellt / bekannt** (nicht gelöst, soll aber nicht mehr stören), dann greift der Anhang-Mechanismus unten.

**Daten-Modell:** `acknowledged: [{id, title, category, location, reason, acknowledgedDate}, ...]` — lebt wie `scoreHistory` in den eingebetteten Daten der `./audit.html`. `reason` = kurze Begründung, warum der Punkt akzeptabel/zurückgestellt ist (bzw. wo er dokumentiert ist). `acknowledgedDate` = Datum der Akzeptanz.

**Aufnahme — ausschließlich auf ausdrückliche Nutzeranweisung.** Niemals von sich aus Punkte akzeptieren; das ist immer eine bewusste Nutzerentscheidung. Sagt der Nutzer in der Konversation, ein Befund solle künftig nicht mehr im Audit auftauchen ("ignoriere ARCH-003 künftig", "das ist akzeptabel so", "der Punkt ist bekannt, nimm ihn raus"), dann:
- Das betroffene Finding aus dem aktiven Backlog entfernen und als Eintrag in `acknowledged` aufnehmen.
- **Begründung erfragen, wenn der Nutzer keine genannt hat** — ein Satz genügt ("Warum ist der Punkt akzeptabel / wo ist er dokumentiert?"). Ohne Begründung den Punkt **nicht** verschieben, sonst ist später nicht nachvollziehbar, warum er versteckt ist.
- `acknowledgedDate` auf das heutige Datum setzen.

**Persistenz & Übernahme:** Die `acknowledged`-Liste wird bei jedem Folgelauf aus dem vorherigen Audit übernommen (analog `scoreHistory`, siehe Schritt 5b) und unverändert weitergeführt. Akzeptierte Punkte werden **nicht** erneut gegen den Code geprüft und **nicht** automatisch entfernt — sie bleiben im Anhang stehen, bis der Nutzer sie ausdrücklich widerruft. (Das unterscheidet sie bewusst von carry-over-Findings, die jeder Lauf neu verifiziert.)

**Unterdrückung im Backlog:** Beim Merge (Schritt 5b) jeden neu aufgetauchten *und* jeden carry-over-Befund gegen die `acknowledged`-Liste matchen (gleiche Heuristik: `category` + überlappende `location`, sekundär Titelähnlichkeit). Treffer → **nicht ins Backlog aufnehmen**, der Punkt bleibt allein im Anhang. So taucht ein akzeptierter Befund nicht wieder als `new` auf.

**Widerruf:** Sagt der Nutzer, ein akzeptierter Punkt solle wieder berücksichtigt werden ("zeig ARCH-003 wieder", "reaktiviere den Punkt"), dann aus `acknowledged` entfernen. Im aktuellen Lauf durchläuft er wieder die normale Finding-Logik und erscheint — sofern im Code noch belegbar — als reguläres Finding im Backlog.

### 6a. Theme bestimmen

Vor dem Rendering ein Theme festlegen — `"light"` oder `"dark"`. Reihenfolge der Auflösung:

1. **Explizite Nutzeranweisung** in der aktuellen Konversation hat Vorrang. "Mach das im Dark Mode", "bitte hell halten", "dark theme" o. ä. → entsprechendes Theme. Auch verneinte Formen beachten ("nicht so dunkel" → light).
2. **Theme des vorherigen Audits**, sofern parsebar und ohne Nutzeranweisung. Aus `summary.theme` der Altdatei übernehmen. Damit bleibt die Optik über Folgeläufe stabil.
3. **Default `"light"`**, wenn weder Anweisung noch parsebare Vorgängerdatei existiert.

Das gewählte Theme wird in `summary.theme` persistiert, damit der nächste Lauf es übernehmen kann. Im Report selbst **fix ausliefern**, nicht `prefers-color-scheme` verwenden — der Nutzer hat eine bewusste Wahl getroffen (oder der Skill hat sie für ihn getroffen) und die soll nicht durch die OS-Einstellung des Lesers überschrieben werden.

**Light-Theme** (Default): hell, dezent, professionell. Hintergrund nahezu weiß (z. B. `#fafaf9`), Fließtext sehr dunkles Grau (`#1c1917`), Akzentfarbe gedämpft (gedämpftes Indigo/Slate, kein knalliges Blau). Severity-Farben kräftig genug, um auf hellem Grund lesbar zu sein, aber nicht plakativ. Typografie: system-ui mit großzügigem Zeilenabstand (1.6–1.7), Überschriften in moderatem Gewicht (600, nicht 800), klare Hierarchie über Größe und Whitespace statt über Farbe.

**Dark-Theme**: ruhige dunkle Flächen (`#0f172a` o. ä., nicht reines Schwarz), Fließtext hellgrau (`#e2e8f0`), gleiche Akzentlogik. Severity-Farben leicht entsättigt, damit sie nicht glühen.

Beide Themes folgen derselben typografischen Grundhaltung — Wechsel ist nur eine Farbumkehr, nicht ein anderes Design.

### 6. `./audit.html` rendern

Eine eigenständige HTML-Datei nach `./audit.html` (relativ zum Projekt-Root bzw. aktuellen Arbeitsverzeichnis) schreiben. Anforderungen:

- **Standalone**: kein externes CSS/JS, keine CDN-Imports. Alles inline.
- **Lesbar**: ruhige Typografie (system-ui oder vergleichbar, z. B. `ui-sans-serif, -apple-system, "Segoe UI", Inter, Roboto, sans-serif`), klare Hierarchie, ausreichend Whitespace. Theme **fix** gemäß Schritt 6a einsetzen — kein `prefers-color-scheme`.
- **Struktur**:
  1. Header mit Projektname, Stack-Badges, Audit-Datum, Health-Score. Score-Anzeige folgt der Historien-Stufe (siehe unten "Score-Anzeige & Verlauf").
  2. **Projektportrait** (Ergebnis aus Schritt 1b): Kurzbeschreibung als Prosa, danach Domänen als kompakte Liste oder Grid (Name, ein Satz, Pfad-Chips). Wenn ein Architektur-Diagramm sinnvoll ist, hier einbetten — sonst weglassen, keine Platzhalter-Grafik. Diagramm bekommt eine knappe Bildunterschrift, die erklärt, was die Pfeile/Boxen bedeuten.
  3. Executive Summary (3–6 Sätze Prosa, was sticht heraus). Bezieht sich auf die *Audit-Befunde*, nicht auf das Projekt selbst — Doppelung mit dem Portrait vermeiden.
  4. Severity-Übersicht als Balken/Zahlen.
  5. Kategorie-Übersicht.
  6. Backlog-Tabelle: filterbar nach Severity und Kategorie via einfachen `<button>`-Toggles mit Vanilla-JS (keine Frameworks). Jede Zeile aufklappbar für `description` + `recommendation`.
  7. Sektion "Offene Fragen / Unklarheiten" — explizit Dinge, die nicht aus dem Code allein entschieden werden konnten. **Nur rendern, wenn es aktuell offene Fragen gibt.** Gibt es keine, entfällt die Sektion ersatzlos — kein "keine offenen Fragen"-Platzhalter und keine Rückschau auf früher entschiedene Fragen (der Report dokumentiert den Status quo, nicht die Historie; vgl. "Schlank statt historisch").
  8. Sektion "Optimierungspotenzial" — bewusst getrennt von Bugs/Findings: Verbesserungen, die kein Defekt sind.
  9. Methodik-Sektion: was wurde gelesen, was nicht, wie wurde der Score berechnet. Bei Diff-Lauf zusätzlich: Datum des vorherigen Audits, Match-Strategie, Anzahl entfernter (=behobener) Findings, davon kontextbedingt entfernte (Docs/Specs/Architektur geändert). Theme-Entscheidung kurz vermerken (z. B. "Theme: light (Default, kein Vorgängeraudit)" bzw. "Theme: dark (vom Nutzer angefordert / aus vorherigem Audit übernommen)").
  10. **Anhang "Akzeptierte / zurückgestellte Punkte"** — nur rendern, wenn `acknowledged` nicht leer ist. Kompakte Liste der vom Nutzer bewusst zurückgestellten Befunde, pro Eintrag: Titel, Kategorie, Location, Begründung (`reason`) und Akzeptanz-Datum (`acknowledgedDate`). Deutlich gedämpfte Optik, klar vom aktiven Backlog abgesetzt; **kein** Severity-Gewicht, fließt **nicht** in den Health-Score ein. Eine knappe Einleitung erklärt, dass diese Punkte auf Nutzerwunsch nicht weiterverfolgt werden und jederzeit reaktivierbar sind.
- **Score-Anzeige & Verlauf** (direkt im Header bzw. unmittelbar darunter, abhängig von `scoreHistory.length`):
  - **1 Eintrag** (Erstlauf): nur der aktuelle Score, ohne Vergleichswert oder Tendenz.
  - **2 Einträge** (zweiter Lauf): aktueller Score plus vorheriger Score mit Tendenz-Indikator und Delta, z. B. `89  ▲ +7  (vorher 82, 2026-03-10)`. Kein Chart.
  - **≥3 Einträge**: zusätzlich zur Vergleichszeile ein **Liniendiagramm** des Verlaufs als Inline-SVG. X-Achse Audit-Datum (chronologisch, gleichabständig), Y-Achse Score 0–100. Punkte beschriftet, der aktuelle Punkt visuell hervorgehoben (gefüllter Kreis, kleiner Score-Tooltip darüber). Achsen dezent, Gitterlinien nur bei 0/50/100. Diagrammbreite responsiv via `viewBox`, max ~640px hoch ~200px. Keine Diagramm-Library, kein Mermaid — handgeschriebenes SVG (Polyline + Circles + Text). Bildunterschrift: "Verlauf der Health-Scores seit `<frühestes Datum>`".
  - Das Diagramm verwendet die Akzentfarbe des Themes, Achsen/Beschriftungen im gedämpften Sekundär-Ton.
- Schweregrade farblich konsistent: critical=rot, high=orange, medium=amber, low=blau, info=grau.
- **Status-Marker im Backlog (nur bei Diff-Lauf)**: Jede Zeile bekommt ein kleines Status-Badge — `new` (Akzent), `unchanged` (neutral), `improved` (grün, mit `previousSeverity → currentSeverity` als Tooltip/Untertitel), `carried-over` (gedämpft). In den Filter-Toggles auch nach Status filterbar machen.
- **Diff-Header (nur bei Diff-Lauf)**: Im Header oder direkt darunter eine knappe Vergleichszeile: vorheriges Audit-Datum, Score-Delta mit Tendenz-Indikator, "X Findings behoben seit letztem Audit, Y verbessert, Z neu". Behobene Findings bewusst **nicht** in der Backlog-Tabelle auflisten — nur als Zähler. Wer Details will, hat das alte `audit.html` im git-Verlauf. Die Score-Anzeige-Stufe (s. o.) bestimmt, ob hier zusätzlich der Chart erscheint.
- Keine externen Fonts oder Bilder. SVG-Icons inline wenn nötig.
- Wenn bereits eine `./audit.html` existiert: überschreiben, kein Suffix anhängen. Das alte Audit ist zu diesem Zeitpunkt bereits in den Merge eingeflossen (Schritt 5b) — die alte Datei darf verloren gehen. Wenn der Nutzer Historie braucht, ist git der richtige Ort.

### 7. Ergebnis ausliefern

- Datei mit `present_files` an den Nutzer zurückgeben (Pfad: `./audit.html`).
- Kurzer Begleittext (max. 5–8 Zeilen): Health-Score, Top-3-Critical/High-Findings, Hinweis auf Methodik-Sektion. Keine Wiederholung des Reports im Chat.
- Bei Diff-Lauf zusätzlich eine Zeile: "X behoben / Y verbessert / Z neu seit `<Datum>`". Behobene Punkte **nicht einzeln** aufzählen — der Nutzer hat sie bewusst nicht mehr im Backlog.
- Wenn der Nutzer in diesem Lauf Punkte akzeptiert/zurückgestellt hat (Schritt 5c), das in einer Zeile bestätigen (Anzahl, Verweis auf den Anhang) — nicht den ganzen Anhang im Chat wiederholen.

## Wichtige Prinzipien

- **Belegt statt vermutet**: Jedes Finding mit Datei-/Zeilenreferenz, sonst weglassen. Bei Unsicherheit → "Offene Fragen", nicht als Finding.
- **Schlank statt historisch**: Das Audit bildet den *aktuellen* Zustand ab, nicht die Projekthistorie. Jeder Punkt, der als geklärt, umgesetzt, erledigt, behoben o. ä. gilt — egal ob vom neuen Lauf verifiziert (Schritt 5b, Fall 1) oder vom Nutzer so markiert —, **fällt vollständig aus dem Report**: kein "resolved"-Badge, keine durchgestrichene Zeile, keine Archiv-/History-Tabelle, kein Eintrag im Backlog. Nur als Zähler im Diff-Header zusammengefasst. Einzige Ausnahmen von dieser Schlankheit: der optionale Score-Verlaufsgraph (Schritte 5/6) und der Anhang akzeptierter Punkte (Schritt 5c). Wer den Verlauf einzelner Findings braucht, findet ihn im git-Verlauf der `./audit.html`.
- **Keine Stiltyrannei**: keine Findings für Geschmacksfragen ohne Wirkung (Tabs vs. Spaces, wenn Formatter konsistent läuft, ist kein Finding).
- **Sprache des Reports**: in derselben Sprache wie die Nutzeranfrage. Default Deutsch, wenn der Nutzer Deutsch schreibt.
- **Kein Auto-Fix**: Dieser Skill schreibt keinen Code im Projekt um. Empfehlungen sind Empfehlungen.
- **Größenlimits**: Bei Repos > ~500 Dateien Sampling-Strategie strikt anwenden und die Auswahl in der Methodik-Sektion offenlegen.
- **Monorepos**: Pro Package separate Score-Zeile in der Summary, gemeinsames Backlog mit Package-Spalte.
