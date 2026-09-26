---
name: js-ts-project-audit
description: Use when the user asks for a code review, audit, quality assessment, health check, or technical due diligence of a JavaScript/TypeScript project (Node.js, React, Vue, Svelte, Angular, Next.js, NestJS, monorepos) — even with informal phrasing like "review my repo", "is my code clean?", "schau mal drauf", or "take a look at this project". Also applies to partial reviews (tests only, architecture only). Output contract, the only fixed promise — a single standalone `./audit.html`.
---

# JS/TS Project Audit

Strukturierte, ganzheitliche Analyse eines JavaScript- oder TypeScript-Projekts entlang von 15 Dimensionen. Einziger fester Vertrag ist der Output: eine `./audit.html` mit priorisierten Findings.

Die Seite schreibst du nicht selbst. Du lieferst einen Datensatz nach `assets/audit-data.schema.json`; `scripts/build-report.mjs` prüft ihn, rechnet alle Zahlen und setzt ihn in `assets/report-template.html` ein. Layout, Theme-Umschalter, Filter, Diagramme und Responsive-Verhalten stecken fertig im Template. `<skill-dir>` meint unten das Verzeichnis dieser Datei, `$TMP` ein Arbeitsverzeichnis außerhalb des Projekts, etwa das Scratchpad der Session.

**Du bist Orchestrator.** Den Quelltext lesen Slice-Agenten, jeder einen fachlichen Ausschnitt in eigenem Kontext; alte Punkte prüfen kleine Prüfer-Agenten. Du liest Manifeste, Configs, README, Entry Points und öffentliche API, dazu die Ergebnisdateien der Agenten — und gezielt einzelne Stellen, wenn ein Befund zwischen Slices zu klären ist. So wächst kein Kontext auf die Größe des Projekts, und nichts geht verloren, wenn einer davon kompaktiert wird: jeder Zwischenstand liegt als Datei in `$TMP`.

## Ablauf-Übersicht

1. Projekt erfassen (1), Portrait und Features (1b). Ein vorhandenes `./audit.html` nur registrieren und seinen Rahmen holen, die Findings **nicht** lesen.
2. Prüfumfang messen (2), in Slices schneiden und bündeln (2b).
3. Review: Slice-Agenten parallel, danach dein Querschnitt (3).
4. Konsolidieren zum Datensatz (4). Den Score rechnet das Skript (5).
5. Nur bei vorhandenem Vorgänger-Audit: Abgleich (5b/5c).
6. Theme bestimmen (6a), Report bauen (6), Ergebnis ausliefern (7).

Die Referenzdateien werden erst gelesen, wenn ihr Schritt dran ist — nicht vorab:

| Datei | Wer | Wann |
| --- | --- | --- |
| `references/followup-audit.md` | du | Abschnitt A in Schritt 1, Abschnitt B ab 5b — nur wenn ein vorheriges `./audit.html` existiert |
| `references/dimensions.md` | Slice-Agenten; du | du in Schritt 3, für den Querschnitt |
| `references/slice-review.md` | Slice-Agenten | du nur im Rückfallweg |
| `references/recheck.md` | Prüfer-Agenten | du nur im Rückfallweg |
| `references/report-content.md` | du | Schritt 4 — bevor du Texte, Portrait und Diagramm schreibst |
| `assets/audit-data.schema.json` | du | Schritt 4 — die Feldbeschreibungen sind der Vertrag |

**Rückfallweg.** Kann dein Host keine Subagenten starten, oder läufst du selbst als Subagent, übernimmst du die Rolle der Agenten selbst: Slice für Slice nach `slice-review.md`, mit denselben Bündeln und derselben Notizdatei, und zwischen zwei Slices trägst du nichts im Kopf mit, was nicht in der Notizdatei steht. Dasselbe für den Re-Check. Unter etwa 3 kLOC Quelltext gilt der Rückfallweg immer — ein Agent kostet dann mehr, als er spart.

## Workflow

### 1. Projekt erfassen

- Wurzelverzeichnis bestimmen, Root-Ebene auflisten (Listing, kein rekursiver Dump).
- Schlüsseldateien lesen, sofern vorhanden: `package.json`, `tsconfig*.json`, Workspace-Manifeste (`pnpm-workspace.yaml`, `lerna.json`, `nx.json`, `turbo.json`), Lint-/Format-Config, Test-Runner-Config, Bundler-Config, `.github/workflows/*`, `README*`, `CHANGELOG*`, Node-Version-Pins, `Dockerfile` / `docker-compose*`.
- Verzeichnisstruktur kartieren (max. 3 Ebenen), Monorepo erkennen.
- Stack klassifizieren: Runtime, Framework, Build-Tool, Test-Runner, Sprachversion, TS-Strictness.
- **Vorheriges `./audit.html`**: nicht als Quelltext lesen, nicht als Finding-Quelle nutzen, nicht als Code zählen. Jetzt Abschnitt A von `references/followup-audit.md` lesen — er holt Feature-IDs, Ausschlüsse und Theme des Vorlaufs, ohne dass du seine Findings siehst.

### 1b. Projektportrait & Features

Parallel zur technischen Bestandsaufnahme ein inhaltliches Verständnis aufbauen — wovon handelt das Projekt überhaupt? Quellen in dieser Reihenfolge: `README*`, `package.json` (`description`, `keywords`, `name`), `CHANGELOG*`, Top-Level-Verzeichnisse unter `src/` bzw. `packages/`, Exports aus `index.*` / `package.json#exports`. Die Entry Points und die öffentliche API (`index.*`, Re-Exporte, alles aus `main` / `module` / `exports` / `bin`) liest du selbst vollständig; sie sind dein Überblick für den Querschnitt in Schritt 3.

Daraus synthetisieren:

- **Kurzbeschreibung**: 2–4 Sätze. Was tut das Projekt, für wen, in welchem Kontext. Kein Marketing-Sprech, keine Wiederholung des README-Wortlauts. Bleibt der Zweck unklar, das so schreiben und unter Offene Fragen aufnehmen — nicht raten.
- **Features** (`portrait.components`, 3–7): die fachlichen Hauptbereiche, je mit stabiler `id` (Slug), Name, einem Satz und repräsentativen Pfaden. Fachlich, nicht jede Schicht ist ein Feature — »Auth«, »Billing«, »Renderer«, »Storage-Adapter« ja, »utils« oder »types« nein. Sie sind der Feature-Filter im Report, das Label `component:<id>` auf GitHub und der Schnitt der Slices in Schritt 2b.
- **Architektur-Diagramm** nur, wenn es Überblick schafft: klare Schichtung, Monorepo ab drei Packages, erkennbarer Datenfluss zwischen Modulen. Bei einer kleinen Lib oder einem CLI-Tool reichen die Features. Immer als Daten nach `references/report-content.md`, **nie ASCII**. Ab etwa zehn Knoten ist es kein Überblick mehr.

### 2. Prüfumfang messen

Der Code-Score bewertet Befunde je gelesener Zeile; eine geschätzte Zeilenzahl macht ihn beliebig. Quelltext ist Produktcode — ohne Tests, Specs, Typdeklarationen, Build-Output, Vendor und Generiertes:

```bash
git ls-files -- '*.ts' '*.tsx' '*.js' '*.jsx' '*.mjs' '*.cjs' '*.vue' '*.svelte' '*.astro' \
  ':!:**/*.spec.*' ':!:**/*.test.*' ':!:**/*.d.ts' ':!:**/dist/**' ':!:**/__tests__/**' > "$TMP/source.txt"
wc -l < "$TMP/source.txt"                      # sourceFiles
xargs -d '\n' cat < "$TMP/source.txt" | wc -l  # sourceLoc
```

Die Ausschlüsse passt du ans Projekt an (Test-Verzeichnisse, generierter Code, Demo-Apps) und hältst sie wörtlich in `scope.exclusions` fest.

**Mehr als etwa 60 kLOC** passen nicht in zehn Slices. Dann wählst du aus, bevor du schneidest, und schreibst die Auswahl als `source.txt` neu: Entry Points und öffentliche API vollständig; die größten Dateien und zentrale Core-Verzeichnisse, alles mit »manager«, »service«, »store«, »controller«, »engine« im Namen; Dateien mit vielen Treffern auf `useEffect`, `setInterval`, `addEventListener`, `subscribe`, `new Promise`, `any`, `@ts-ignore`, `TODO`/`FIXME` (per `rg -c`). Die Auswahl steht in `methodology.notes`, und `reviewedLoc` sagt ehrlich, wie viel davon gelesen wurde.

### 2b. Slices schneiden und bündeln

Ein Slice ist ein fachlicher Ausschnitt, den ein Agent in einem Kontext liest. Du schreibst `$TMP/slices.json`:

```json
{ "sources": "<$TMP>/source.txt",
  "slices": [
    { "id": "renderer", "paths": ["src/render/**"] },
    { "id": "harness", "source": false,
      "files": ["package.json", "tsconfig.json", ".github/workflows/ci.yml", "vitest.config.ts", "test/render.test.ts"] } ] }
```

- **Schnitt entlang der Features**: je Feature ein Slice mit dessen `paths`, höchstens zehn Slices. Größe 1–6 kLOC: ein größeres Feature teilst du nach Unterverzeichnissen, zwei kleine legst du zusammen. Was keinem Slice zufällt, sammelt das Skript in einem Slice `rest` — nichts fällt still heraus. Bei Monorepos schneidest du innerhalb der Packages.
- **Harness-Slice** mit `"source": false`: Configs, CI-Workflows, Paketmanifeste und eine Test-Stichprobe je Bereich. Er zählt nicht zum Prüfumfang.

```bash
cd <projekt> && node <skill-dir>/scripts/bundle.mjs "$TMP/slices.json" --out "$TMP/bundles"
```

Das Skript schreibt je Slice Bündeldateien von höchstens 60 000 Zeichen — der Quelltext mit Dateiköpfen und den Zeilennummern der Originale —, dazu `index.json` mit Dateien und Zeilen je Slice. Auf stdout steht eine Tabelle mit Zeilen und Markerdichte (`mk/kloc`: Timer, Listener, Promises, `await`, `dispose` je kLOC). Die Bündel liest du nicht; das tun die Agenten.

### 3. Review

**Slice-Agenten, alle in einer Nachricht gestartet**, je Slice einer. Der Auftrag ist kurz, alles Weitere steht in den Referenzen:

```
Du prüfst Slice »<id>« im Audit von <projekt>: <ein Satz zum Projekt>. Feature: <label> — <ein Satz>.
Lies zuerst <skill-dir>/references/slice-review.md und <skill-dir>/references/dimensions.md.
Bündel: <pfade aus index.json>. Notizdatei: <$TMP>/notes/<id>.jsonl. Sprache der Texte: <de|en>.
```

Das Modell wählst du je Rolle, soweit der Host es zulässt (in Claude Code: `model` im Agent-Aufruf):

| Rolle | Modell | Warum |
| --- | --- | --- |
| Slices im oberen Drittel der Markerdichte, mindestens einer | stärkstes (`opus`) | Race Conditions, Leaks und Lebenszyklusfehler brauchen Tiefe |
| übrige Code-Slices, Harness-Slice | mittleres (`sonnet`) | Lesbarkeit, API, Vollständigkeit, Configs |
| Re-Check-Prüfer (5b) | kleinstes (`haiku`) | Verifikation an bekannter Stelle |

Jeder Agent gibt ein JSON-Objekt zurück: Pfad seiner Notizdatei, Zahl der Findings, `unread`, `patterns` und `questions`. Befunde stehen in der Notizdatei, nicht in der Antwort. Fehlt eine Rückgabe oder ist ein Agent abgebrochen, zählt, was in seiner Notizdatei steht; die Dateien seines Slices ohne Rückgabe gelten als nicht gelesen.

**Dein Querschnitt**, danach: `references/dimensions.md` lesen, dann aus den `patterns` aller Slices, den Entry Points und der öffentlichen API beurteilen, was kein Slice allein sieht — Abhängigkeitsrichtung und Zyklen zwischen Features (`architecture`), Stilbrüche zwischen Modulen (`consistency`), Klarheit und Stabilität der Exporte (`api`). Einen Verdacht belegst du mit einem gezielten Blick auf die Stelle. Deine Befunde gehen im selben Format nach `$TMP/notes/_cross.jsonl`. Die `questions` der Agenten, die du nicht selbst beantworten kannst, werden Offene Fragen.

### 4. Datensatz

Jetzt `references/report-content.md` lesen. Den Datensatz schreibst du als JSON nach `$TMP/audit-data.json`, nie ins Projekt. Maßgeblich ist das Schema: jedes Feld dort hat eine Beschreibung, Pflichtfelder sind markiert, unbekannte Felder lehnt das Skript ab.

Aus den Notizdateien wird der Datensatz so:

- **Zusammenführen**: Zeilen mit wortgleichem `title` innerhalb eines Slices sind ein Finding; dasselbe Muster aus mehreren Slices ebenfalls — `location` plus `locations`, nach der Regel »ein Muster, ein Finding« aus `dimensions.md`.
- **Kalibrieren**: die Severity über alle Slices hinweg an der Skala aus `dimensions.md` angleichen. Parallele Reviewer weichen voneinander ab; die Skala ist der Maßstab, nicht der einzelne Reviewer.
- **`id`**: Kategorie-Kürzel plus laufende Nummer, z. B. `ARCH-001`, eindeutig im Datensatz. Im Folgelauf sorgt `merge` für Kontinuität mit dem Vorlauf.
- **`component`**: die `id` des Features, unter dessen Pfade die Fundstelle fällt. Liegen die Fundstellen in mehreren Features oder in keinem, bleibt das Feld weg — das Finding erscheint als »projektweit«.
- **Umfang**: `reviewedFiles` sind die Dateien der Code-Slices aus `$TMP/bundles/index.json` ohne die gemeldeten `unread`, `reviewedLoc` deren Zeilensumme aus derselben Datei. Überflogene oder nur an einer Fundstelle geöffnete Dateien zählen nicht.
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

Existierte in Schritt 1 ein `./audit.html`, jetzt Abschnitt B von `references/followup-audit.md` lesen und danach arbeiten: Paaren per Skript, Re-Check alter Findings und akzeptierter Punkte durch Prüfer-Agenten, Zusammenführen per Skript, Einordnung großer Sprünge, Fix-Bilanz.

Gab es kein Vorgänger-Audit, entfällt der Schritt ersatzlos.

### 6a. Theme bestimmen

Auflösungsreihenfolge für `summary.theme`, `"auto"`, `"light"` oder `"dark"`:

1. Explizite Nutzeranweisung in der laufenden Konversation, auch in verneinter Form („nicht so dunkel" → light, „wie mein System" → auto).
2. Sonst `summary.theme` des vorherigen Audits aus Schritt 1 — so bleibt eine einmal getroffene Wahl über Folgeläufe stabil. Ausnahme: `"light"` aus einem Report mit `meta.templateVersion` `2.0.0` war der damalige Default, keine Wahl, und wird zu `"auto"`.
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
- Im Folgelauf eine Zeile „X behoben / Y verbessert / Z neu seit `<Datum>`" — behobene Punkte nicht einzeln aufzählen. Hat der Nutzer in diesem Lauf Punkte zurückgestellt, das in einer Zeile bestätigen und auf den Anhang verweisen. Hat der Lauf überholte Anhangpunkte abgeräumt, deren Zahl in derselben Zeile.
- Enthält das Backlog Findings ab `medium`, zum Schluss eine Zeile: ob die Punkte abgearbeitet werden sollen, dann übernimmt `js-ts-audit-remediation` mit Umsetzungsplan und Subagenten. Ein Angebot, keine Ankündigung — ohne Zusage endet der Lauf hier.

## Prinzipien

- **Belegt statt vermutet** — die Regeln dafür, was ein Finding ist, stehen in `references/dimensions.md` und gelten für dich wie für jeden Agenten. Unsicherheit gehört unter „Offene Fragen", nicht ins Backlog.
- **Schlank statt historisch**: der Report zeigt den aktuellen Zustand. Was erledigt ist — verifiziert oder vom Nutzer so markiert — verschwindet vollständig und lebt nur noch als Zähler weiter. Ausnahmen: Score-Verlauf, Fix-Bilanz und der Anhang akzeptierter Punkte — und der hält nur, was heute noch zutrifft; jeder Folgelauf räumt ihn ab.
- **Daten statt Markup**: du lieferst Daten, das Template stellt sie dar. Ein Wunsch nach anderer Darstellung ist eine Änderung am Template in diesem Skill, nicht an einer einzelnen `audit.html`.
- **Kein Auto-Fix**: dieser Skill schreibt keinen Code im Projekt um, auch nicht wenn eine Behebung trivial wäre. Empfehlungen bleiben Empfehlungen; die Umsetzung ist ein eigener Lauf.
- **Teilanalysen**: auch bei „nur Tests" oder „nur Architektur" derselbe Workflow, mit weniger Slices; nicht geprüfte Bereiche bleiben leer, und der gemessene Umfang sagt ehrlich, wie wenig gelesen wurde.
- **Sprache des Reports**: dieselbe wie die Nutzeranfrage, gesetzt in `meta.lang` (`de` oder `en`); alle Freitexte in dieser Sprache, auch die der Agenten.
- **Große Projekte**: ab 2000 gelesenen Dateien `scope.reviewedDirs` statt `reviewedFiles`.
- **Monorepos**: `summary.packages` mit je `reviewedLoc`, jedes Finding mit `package`; das Skript rechnet je Package eine Score-Zeile.
