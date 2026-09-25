---
name: js-ts-project-audit
description: Use when the user asks for a code review, audit, quality assessment, health check, or technical due diligence of a JavaScript/TypeScript project (Node.js, React, Vue, Svelte, Angular, Next.js, NestJS, monorepos) — even with informal phrasing like "review my repo", "is my code clean?", "schau mal drauf", or "take a look at this project". Also applies to partial reviews (tests only, architecture only). Output contract, the only fixed promise — a single standalone `./audit.html`.
---

# JS/TS Project Audit

Strukturierte, ganzheitliche Analyse eines JavaScript- oder TypeScript-Projekts entlang der 15 Dimensionen aus Schritt 3. Einziger fester Vertrag ist der Output: eine `./audit.html` mit priorisierten Findings.

Die Seite schreibst du nicht selbst. Du lieferst einen Datensatz nach `assets/audit-data.schema.json`; `scripts/build-report.mjs` prüft ihn, rechnet alle Zahlen und setzt ihn in `assets/report-template.html` ein. Layout, Theme-Umschalter, Filter, Diagramme und Responsive-Verhalten stecken fertig im Template. `<skill-dir>` meint unten das Verzeichnis dieser Datei.

## Ablauf-Übersicht

1. Projekt erfassen (1) + Projektportrait (1b) — ein vorhandenes `./audit.html` nur registrieren, **nicht** lesen.
2. Code-Sampling und Prüfumfang messen (2), Analyse entlang der 15 Dimensionen (3).
3. Datensatz aufbauen (4). Den Score rechnet das Skript (5).
4. Nur bei vorhandenem Vorgänger-Audit: Merge und Abgleich akzeptierter Punkte (5b/5c).
5. Theme bestimmen (6a), Report bauen (6), Ergebnis ausliefern (7).

Die Referenzdateien werden erst gelesen, wenn ihr Schritt dran ist — nicht vorab:

| Datei | Wann lesen |
| --- | --- |
| `references/followup-audit.md` | Schritt 5b — nur wenn ein vorheriges `./audit.html` existiert |
| `references/report-content.md` | Schritt 4 — bevor du Texte, Portrait und Diagramm schreibst |
| `assets/audit-data.schema.json` | Schritt 4 — die Feldbeschreibungen sind der Vertrag |

## Workflow

### 1. Projekt erfassen

- Wurzelverzeichnis bestimmen, Root-Ebene auflisten (Listing, kein rekursiver Dump).
- Schlüsseldateien lesen, sofern vorhanden: `package.json`, `tsconfig*.json`, Workspace-Manifeste (`pnpm-workspace.yaml`, `lerna.json`, `nx.json`, `turbo.json`), Lint-/Format-Config, Test-Runner-Config, Bundler-Config, `.github/workflows/*`, `README*`, `CHANGELOG*`, Node-Version-Pins, `Dockerfile` / `docker-compose*`.
- Verzeichnisstruktur kartieren (max. 3 Ebenen), Monorepo erkennen.
- Stack klassifizieren: Runtime, Framework, Build-Tool, Test-Runner, Sprachversion, TS-Strictness.
- **Vorheriges `./audit.html`**: Pfad merken, aber vollständig aus der inhaltlichen Analyse ausschließen — nicht als Quelltext lesen, nicht als Finding-Quelle nutzen, nicht als Code zählen. Es wird erst in Schritt 5b geöffnet, damit der neue Audit unvoreingenommen am Code entsteht.

### 1b. Projektportrait & Features

Parallel zur technischen Bestandsaufnahme ein inhaltliches Verständnis aufbauen — wovon handelt das Projekt überhaupt? Quellen in dieser Reihenfolge: `README*`, `package.json` (`description`, `keywords`, `name`), `CHANGELOG*`, Top-Level-Verzeichnisse unter `src/` bzw. `packages/`, Exports aus `index.*` / `package.json#exports`.

Daraus synthetisieren:

- **Kurzbeschreibung**: 2–4 Sätze. Was tut das Projekt, für wen, in welchem Kontext. Kein Marketing-Sprech, keine Wiederholung des README-Wortlauts. Bleibt der Zweck unklar, das so schreiben und unter Offene Fragen aufnehmen — nicht raten.
- **Features** (`portrait.components`, 3–7): die fachlichen Hauptbereiche, je mit stabiler `id` (Slug), Name, einem Satz und repräsentativen Pfaden. Fachlich, nicht jede Schicht ist ein Feature — »Auth«, »Billing«, »Renderer«, »Storage-Adapter« ja, »utils« oder »types« nein. Sie sind der Feature-Filter im Report und das Label `component:<id>` auf GitHub; im Folgelauf gilt die Stabilitätsregel aus `references/followup-audit.md`.
- **Architektur-Diagramm** nur, wenn es Überblick schafft: klare Schichtung, Monorepo ab drei Packages, erkennbarer Datenfluss zwischen Modulen. Bei einer kleinen Lib oder einem CLI-Tool reichen die Features. Immer als Daten nach `references/report-content.md`, **nie ASCII**. Ab etwa zehn Knoten ist es kein Überblick mehr.

### 2. Sampling und Prüfumfang

Großprojekte nicht zeilenweise lesen. Priorisieren:

- **Entry Points** vollständig: `src/index.*`, `src/main.*`, `app/page.*`, alles aus `main` / `module` / `exports` / `bin`.
- **Öffentliche API**: `index.*`-Dateien und Re-Exporte unter `src/`.
- **Heiße Module**: die größten Dateien (per Shell ermitteln), zentrale Core-/Utility-Verzeichnisse, alles mit „manager", „service", „store", „controller", „engine" im Namen.
- **Risiko-Hotspots**: `useEffect`, `setInterval`, `setTimeout`, `addEventListener`, `subscribe`, `EventEmitter`, manuelle Promise-Konstruktion, `any`, `@ts-ignore`, `eslint-disable`, `TODO`, `FIXME`, `HACK`.
- **Tests** mindestens als Stichprobe pro Bereich, dazu CI- und Build-Skripte.

Bei jedem gelesenen File Notizen pro Dimension sammeln.

**Prüfumfang messen, nicht schätzen.** Der Code-Score bewertet Befunde je gelesener Zeile; eine geschätzte Zeilenzahl macht ihn beliebig. Quelltext ist Produktcode — ohne Tests, Specs, Typdeklarationen, Build-Output, Vendor und Generiertes:

```bash
git ls-files -- '*.ts' '*.tsx' '*.js' '*.jsx' '*.mjs' '*.cjs' '*.vue' '*.svelte' '*.astro' \
  ':!:**/*.spec.*' ':!:**/*.test.*' ':!:**/*.d.ts' ':!:**/dist/**' ':!:**/__tests__/**' > "$TMP/source.txt"
wc -l < "$TMP/source.txt"                      # sourceFiles
xargs -d '\n' cat < "$TMP/source.txt" | wc -l  # sourceLoc
```

Die Ausschlüsse passt du ans Projekt an (Test-Verzeichnisse, generierter Code, Demo-Apps) und hältst sie wörtlich in `scope.exclusions` fest. `reviewedFiles` sind die Quelldateien, die du **vollständig** gelesen hast, `reviewedLoc` deren `wc -l`-Summe. Überflogene, gegrepte oder nur an einer Fundstelle geöffnete Dateien zählen nicht mit. `$TMP` ist ein Verzeichnis außerhalb des Projekts, etwa das Scratchpad der Session.

### 3. Analysedimensionen

Für jede Dimension Findings sammeln: Schweregrad, Datei-/Zeilenreferenz wo möglich, konkreter Verbesserungsvorschlag. Der Schlüssel in Klammern ist der Wert für `finding.category`.

1. **Architektur & Struktur** (`architecture`, *code*) — Layering, Abhängigkeitsrichtung, Modulgrenzen, Zyklen, Trennung Fachlogik/Infrastruktur, Konsistenz der Ordnerlogik.
2. **Projektaufbau & Build** (`build`, *harness*) — Tooling-Wahl, TS-Konfiguration (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`), Pfad-Aliase, Tree-Shaking, Bundle-Größe, Sourcemaps.
3. **Developer Experience** (`dx`, *harness*) — README-Qualität, Setup-Schritte, npm-Scripts, Linting, Formatter, Pre-Commit-Hooks, Editor-Konfiguration, Onboarding-Hürden, Fehlerverständlichkeit, Hot-Reload.
4. **Öffentliche API** (`api`, *code*) — Klarheit und Naming der Exports, Stabilität und Breaking-Change-Strategie, JSDoc/TSDoc, Typ-Exporte, Default- vs. Named-Exports, Treeshakeability.
5. **Implementierungsstand** (`completeness`, *code*) — Vollständigkeit gegenüber README/Docs, offene TODOs/FIXMEs, tote Pfade, ungenutzte Exporte, auskommentierter Code.
6. **Testabdeckung & Teststrategie** (`testing`, *harness*) — Balance Unit/Integration/E2E, Coverage-Konfiguration, Test-Doubles, Flakiness-Indikatoren, Snapshot-Hygiene, fehlende kritische Pfade.
7. **Lesbarkeit & Clean Code** (`readability`, *code*) — Funktionsgrößen, Verschachtelungstiefe, Naming, Single Responsibility, Magic Numbers, Kommentar-Qualität, Stilkonsistenz.
8. **Bugs & Korrektheitsrisiken** (`correctness`, *code*) — fehlende `await`, unbehandelte Rejections, falsche Equality, Off-by-One, Mutation geteilter States, fehlende Null-Checks, unsichere Casts, ungeschütztes `JSON.parse`.
9. **Memory Leaks & Ressourcen** (`resources`, *code*) — nicht entfernte Listener, nicht gecleartes Timer/Interval, unbeendete Subscriptions, fehlender `AbortController`, Closure-Captures großer Objekte, Caches ohne Eviction, fehlende Stream-/FileHandle-Cleanups.
10. **Async & Concurrency** (`async`, *code*) — Race Conditions, fehlende Cancellation, `Promise.all` vs. sequenziell, unklare Reentrancy, blockierender Code im Eventloop.
11. **Konsistenz** (`consistency`, *code*) — Stilbrüche zwischen Modulen, gemischte Patterns (Class vs. funktional, Callback vs. Promise vs. async), uneinheitliche Fehlerbehandlung, uneinheitliches Logging.
12. **Typsicherheit (TS)** (`types`, *harness*) — `any`-Vorkommen, unsichere Casts, fehlende Generics, schwache Rückgabetypen, breite Unions ohne Discriminator.
13. **Sicherheit** (`security`, *code*) — `eval`, Template-Injection, ungeprüfte Inputs, Secrets im Repo, unsichere Defaults, veraltete Crypto, CORS/CSRF/XSS, `dangerouslySetInnerHTML`.
14. **Dependencies** (`dependencies`, *harness*) — veraltet, deprecated, doppelt, ungenutzt, Lizenzrisiken, unnötig schwer. `npm outdated` / `pnpm outdated` ausführen, sofern Netzwerk und Lockfile es zulassen.
15. **Performance** (`performance`, *code*) — N+1, unnötige Re-Renders, fehlende Memoization, große synchrone Loops, fehlende Pagination, fehlende Caching-Layer.

Erst alle Befunde sammeln, dann Schritt 4.

#### Die beiden Domains

Jede Dimension gehört zu genau einer von zwei Domains; die kursive Angabe oben ist die verbindliche Zuordnung. Sie trennt zwei Fragen, die im Report nicht vermischt werden dürfen, weil sie verschiedene Leser und verschiedene Konsequenzen haben:

- **`code` — Code & Laufzeit**: das, was das Produkt tut und wie es das tut. Bugs, Leaks, Nebenläufigkeit, Architektur, API, Performance, Sicherheit im Quelltext. Findings hier bedeuten: die Software ist falsch, riskant oder schwer zu ändern.
- **`harness` — Projekt-Harness**: das Gerüst um den Code herum. Build- und Bundler-Setup, TypeScript- und Typisierungslage, Tests und Coverage, Tooling, Skripte, Onboarding, Dependencies. Findings hier bedeuten: das Projekt lässt sich schlechter bauen, prüfen oder weiterreichen — auch wenn der Code selbst korrekt ist.

Die Domain wird pro Finding gesetzt, nicht pro Kategorie berechnet, und folgt im Regelfall der Zuordnung oben. **Abweichen nur, wenn der Befund selbst eindeutig in der anderen Domain liegt** — ein Secret in einem CI-Workflow ist Kategorie `security`, aber `harness`; ein Lizenzrisiko in einer Dependency, die im ausgelieferten Bundle landet, bleibt trotzdem `harness`. Im Zweifel gewinnt die Zuordnung oben: eine stabile Zuordnung über Läufe hinweg ist mehr wert als ein perfekt einsortiertes Einzelfinding.

Nicht zu verwechseln mit den **Features** aus Schritt 1b: die sind fachlich und projektspezifisch (»Auth«, »Renderer«), diese zwei sind fix und gelten für jedes Projekt.

### 4. Datensatz

Jetzt `references/report-content.md` lesen. Den Datensatz schreibst du als JSON nach `$TMP/audit-data.json`, nie ins Projekt. Maßgeblich ist das Schema: jedes Feld dort hat eine Beschreibung, Pflichtfelder sind markiert, unbekannte Felder lehnt das Skript ab.

Regeln, die das Schema nicht ausdrücken kann:

- **Ein Muster, ein Finding.** Derselbe Fehler an zwölf Stellen ist ein Finding mit `location` plus `locations`, nicht zwölf Findings. Die Severity richtet sich nach der Wirkung, nicht nach der Anzahl der Stellen. Tiefer zu prüfen darf den Score nicht durch Wiederholung drücken.
- **`id`**: Kategorie-Kürzel plus laufende Nummer, z. B. `ARCH-001`, eindeutig im Datensatz.
- **`component`**: die `id` des Features, unter dessen Pfade die Fundstelle fällt. Liegen die Fundstellen in mehreren Features oder in keinem, bleibt das Feld weg — das Finding erscheint als »projektweit«.
- **`kind: "improvement"`** für Optimierungspotenzial ohne Defekt. Es steht in einer eigenen Sektion und wiegt nichts im Score.
- **Felder, die das Skript schreibt** (im Schema mit »Vom Skript« markiert: Scores, Zählungen, `scoreModel`, `deltaBreakdown`, der aktuelle Eintrag in `scoreHistory`), lässt du weg oder übernimmst sie unverändert — das Skript überschreibt sie ohnehin.
- `acknowledged` sind vom Nutzer zurückgestellte Punkte: keine Backlog-Findings, kein Gewicht im Score (Details in `references/followup-audit.md`).

### 5. Health-Score

Der Score wird nicht von Hand gerechnet. `build-report.mjs` rechnet ihn beim Bauen und legt Formel und Konstanten in `summary.scoring` ab; die Methodik-Sektion zeigt sie von dort. Zur Einordnung, was er misst:

- **Code & Laufzeit** bewertet die **Dichte**: Abzugspunkte (critical 10, high 5, medium 2, low 0,5, info 0) je gelesener kLOC. Wer tiefer prüft, findet mehr, liest aber auch mehr — der Score fällt nicht, nur weil der Lauf gründlicher war.
- **Projekt-Harness** bleibt absolut, weil das Gerüst nicht mit der Lesetiefe wächst.
- Ein offenes `critical` kappt seine Domain bei 49. Der Gesamtscore ist das geometrische Mittel beider Teilscores; die Teilscores stehen daneben und teilen sich keine 100 Punkte.
- Ohne `summary.scope` rechnet das Skript das alte absolute Modell 1. Das ist der Rückfallweg für Altdaten, kein Weg für einen neuen Audit: ein Lauf dieses Skills misst den Umfang immer.

`scoreHistory` führt den Verlauf, maximal 20 Einträge; `--record audit` hängt den aktuellen Lauf an. Einen separaten History-Store gibt es nicht; die Quelle der Wahrheit ist der git-Verlauf der `./audit.html`.

### 5b/5c. Folgelauf

Existierte in Schritt 1 ein `./audit.html`, jetzt — nach abgeschlossenem Frisch-Audit — `references/followup-audit.md` lesen und danach arbeiten. Dort stehen Extraktion, Merge-Regeln, der Pflicht-Re-Check vor jedem carry-over, die Einordnung großer Sprünge, die Fix-Bilanz und der Umgang mit akzeptierten Punkten.

Gab es kein Vorgänger-Audit, entfällt der Schritt ersatzlos.

### 6a. Theme bestimmen

Auflösungsreihenfolge für `summary.theme`, `"auto"`, `"light"` oder `"dark"`:

1. Explizite Nutzeranweisung in der laufenden Konversation, auch in verneinter Form („nicht so dunkel" → light, „wie mein System" → auto).
2. Sonst `summary.theme` des vorherigen Audits — so bleibt eine einmal getroffene Wahl über Folgeläufe stabil. Ausnahme: `"light"` aus einem Report mit `meta.templateVersion` `2.0.0` war der damalige Default, keine Wahl, und wird zu `"auto"`.
3. Sonst `"auto"`.

`"auto"` lässt den Report `prefers-color-scheme` von System und Browser folgen, auch wenn es sich bei offener Seite ändert; `"light"`/`"dark"` legen das Start-Theme fest. Der Leser kann in jedem Fall umschalten; seine Wahl merkt sich sein Browser, nicht die Datei, und wer zurück auf die Vorgabe schaltet, folgt wieder ihr.

### 6. `./audit.html` bauen

```bash
node <skill-dir>/scripts/build-report.mjs build "$TMP/audit-data.json" --out ./audit.html --record audit
```

Im Folgelauf zusätzlich `--previous "$TMP/previous.json"` (siehe `references/followup-audit.md`).

- **Meldet das Skript Fehler, entsteht keine Datei.** Jede Meldung nennt den JSON-Pfad. Den Datensatz korrigieren und neu bauen — nicht das Schema umgehen, nicht das Template anfassen, nicht selbst HTML schreiben.
- **Zielpfad** `./audit.html` relativ zum Projekt-Root. Eine vorhandene Datei wird überschrieben, kein Suffix — der Merge ist zu diesem Zeitpunkt erledigt, Historie liefert git.
- **Das Template kommt immer aus diesem Skill**, auch wenn schon ein `./audit.html` existiert: vom Vorgänger werden nur die Daten übernommen (`extract`), nie sein Markup. Ein älterer Report bekommt so bei jedem Lauf das aktuelle Layout. Meldet das Skript `Template <alt> → <neu>`, gehört das als ein Halbsatz in den Begleittext.
- Was die Datei garantiert — standalone ohne externe Ressourcen, genau eine JSON-Insel `<script id="audit-data" type="application/json">`, responsiv bis 390 px, Filter nach Domain, Severity, Feature, Kategorie und Status, Deep Links, Theme-Umschalter —, garantiert das Template. Nichts davon wird nachträglich in der erzeugten Datei geändert.
- Die Zeile, die das Skript auf stderr ausgibt (Score, Teilscores, Zahl der Findings), ist die Grundlage für Schritt 7.

### 7. Ergebnis ausliefern

- Datei übergeben über den Mechanismus, den der Host zum Präsentieren von Dateien anbietet; gibt es keinen, den Pfad `./audit.html` klar benennen.
- Begleittext von maximal 5–8 Zeilen: Health-Score mit beiden Teilscores (»Gesamt 74 — Code & Laufzeit 81, Projekt-Harness 62«), geprüfter Umfang (»9,3 von 12,8 kLOC gelesen«), Top-3 aus critical/high, Hinweis auf die Methodik-Sektion. Den Report nicht im Chat wiederholen.
- Im Folgelauf eine Zeile „X behoben / Y verbessert / Z neu seit `<Datum>`" — behobene Punkte nicht einzeln aufzählen. Hat der Nutzer in diesem Lauf Punkte zurückgestellt, das in einer Zeile bestätigen und auf den Anhang verweisen.
- Enthält das Backlog Findings ab `medium`, zum Schluss eine Zeile: ob die Punkte abgearbeitet werden sollen, dann übernimmt `js-ts-audit-remediation` mit Umsetzungsplan und Subagenten. Ein Angebot, keine Ankündigung — ohne Zusage endet der Lauf hier.

## Prinzipien

- **Belegt statt vermutet**: jedes Finding mit Datei-/Zeilenreferenz, sonst weglassen. Unsicherheit gehört unter „Offene Fragen", nicht ins Backlog.
- **Schlank statt historisch**: der Report zeigt den aktuellen Zustand. Was erledigt ist — verifiziert oder vom Nutzer so markiert — verschwindet vollständig und lebt nur noch als Zähler weiter. Ausnahmen: Score-Verlauf, Fix-Bilanz und der Anhang akzeptierter Punkte.
- **Daten statt Markup**: du lieferst Daten, das Template stellt sie dar. Ein Wunsch nach anderer Darstellung ist eine Änderung am Template in diesem Skill, nicht an einer einzelnen `audit.html`.
- **Kein Auto-Fix**: dieser Skill schreibt keinen Code im Projekt um, auch nicht wenn eine Behebung trivial wäre. Empfehlungen bleiben Empfehlungen; die Umsetzung ist ein eigener Lauf.
- **Keine Stiltyrannei**: Geschmacksfragen ohne Wirkung sind keine Findings. Läuft ein Formatter konsistent, ist Tabs vs. Spaces kein Thema.
- **Teilanalysen**: auch bei „nur Tests" oder „nur Architektur" derselbe Workflow; nicht geprüfte Bereiche bleiben leer, und der gemessene Umfang sagt ehrlich, wie wenig gelesen wurde.
- **Sprache des Reports**: dieselbe wie die Nutzeranfrage, gesetzt in `meta.lang` (`de` oder `en`); alle Freitexte in dieser Sprache.
- **Größenlimits**: ab etwa 500 Dateien die Sampling-Strategie strikt anwenden und die Auswahl in der Methodik offenlegen; ab 2000 gelesenen Dateien `scope.reviewedDirs` statt `reviewedFiles`.
- **Monorepos**: `summary.packages` mit je `reviewedLoc`, jedes Finding mit `package`; das Skript rechnet je Package eine Score-Zeile.
