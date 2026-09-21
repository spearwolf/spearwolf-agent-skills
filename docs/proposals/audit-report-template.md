# Entwurf: Report-Template, Datenschema und Messmodell für `audit.html`

Stand: 2026-09-21 · Status: umgesetzt (Template 2.0.0, Schema 2)

Betrifft `js-ts-project-audit` (Eigentümer), `js-ts-audit-remediation` und
`audit-github-sync` (beide schreiben in dieselbe Datei).

## 1. Ausgangslage

- Jeder Audit-Lauf schreibt die komplette `audit.html` von Hand: 30–60 KB
  HTML, CSS und JS nach 300 Zeilen Layout-Vorschrift in
  `references/report-rendering.md`. Ergebnis: jede Ausgabe sieht etwas anders
  aus, und der Agent verbrennt pro Lauf Output-Tokens für Code, der sich nie
  ändern sollte.
- Die Daten stehen doppelt in der Datei: in der JSON-Insel und als gerendertes
  Markup. Remediation und GitHub-Sync müssen beide Stellen nachführen;
  `audit-github-sync/references/reverse-sync.md` braucht sogar eine Regel für
  Markup, das ältere Läufe noch nicht kannten.
- Der Health-Score zieht pro Finding absolute Punkte ab. Prüft ein Lauf
  tiefer, findet er mehr, und der Score fällt, bei realen Projekten binnen
  weniger Läufe auf 0. `deltaCause: "coverage"` erklärt den Absturz in Worten,
  die Zahl und das Diagramm lügen trotzdem weiter.
- Ob Remediation-Läufe die Codebasis stabiler machen oder neue Probleme
  erzeugen, ist nirgends messbar.
- Architektur-Diagramme dürfen heute ASCII sein. Findings lassen sich nicht
  nach fachlichem Bereich filtern.

## 2. Zielbild in einem Satz

Der Agent erzeugt nur noch **Daten** (ein JSON nach festem Schema), ein
Build-Skript setzt sie in ein **fertiges Template** ein, und das Template
rendert die komplette Seite zur Laufzeit aus der JSON-Insel.

## 3. Artefakte

| Datei | Rolle |
| --- | --- |
| `js-ts-project-audit/assets/report-template.html` | HTML + CSS + Vanilla-JS, standalone, mit Platzhalter für die JSON-Insel. Rendert alles. |
| `js-ts-project-audit/assets/audit-data.schema.json` | JSON Schema (Draft 2020-12). Gemeinsamer Vertrag aller drei Skills. |
| `js-ts-project-audit/scripts/build-report.mjs` | Node-Skript ohne Dependencies: validieren, escapen, einsetzen, extrahieren, migrieren. |
| `js-ts-project-audit/tests/fixtures/*.json` | Referenzdatensätze: Erstlauf, Folgelauf, Monorepo, leere Domain, Modellwechsel im Verlauf. |

Node ist gesetzt: Der Skill prüft ausschließlich JS/TS-Projekte, eine
Node-Runtime ist dort immer vorhanden. Eine Datei ohne `npm install`
verletzt die Regel »kein Tooling« dieses Repos nicht.

### 3.1 `build-report.mjs`

```
node build-report.mjs build   <data.json> [--out ./audit.html]
node build-report.mjs extract [./audit.html]        # JSON-Insel → stdout
node build-report.mjs check   <data.json>           # nur validieren
```

- **build**: validiert gegen das Schema (handgeschriebener Validator für die
  benutzte Schema-Teilmenge, keine Library), rechnet abgeleitete Zahlen nach
  (siehe 3.2), escaped `<` in der Insel zu `<`, damit ein zitiertes
  `</script>` die Seite nicht beendet, schreibt das Template mit Insel nach
  `--out`. Schlägt die Validierung fehl, entsteht keine Datei und die Fehler
  stehen auf stderr, jeweils mit JSON-Pfad.
- **extract**: liest die Insel einer vorhandenen `audit.html`. Ist das eine
  v1-Insel, wird sie migriert (Abschnitt 9) und als v2 ausgegeben.
- Das Template landet nie im Kontext des Agenten, weder beim Lesen noch
  beim Schreiben.

### 3.2 Was das Skript rechnet und was der Agent liefert

Zählbares rechnet das Skript, Urteile fällt der Agent. Damit können Zahlen und
Findings nicht mehr auseinanderlaufen.

| Vom Skript abgeleitet | Vom Agenten geliefert |
| --- | --- |
| `bySeverity`, `byCategory`, `byComponent` je Domain und gesamt | Findings, Severity, Kategorie, Component |
| alle Scores nach dem Modell aus Abschnitt 5 | `scope`-Messwerte (Abschnitt 5.2) |
| aktueller Eintrag in `scoreHistory` | Texte: Portrait, Executive Summaries, Methodik |
| Coverage-Aufschlüsselung neuer Findings (Abschnitt 5.4) | `deltaCause`, `deltaExplanation` |

Die Formel liegt damit an genau einer Stelle, und das ist Code. Die Regel in
`audit-report-update.md`, die Formel aus der Methodik-Sektion abzulesen,
entfällt.

### 3.3 Wer schreibt wie

Alle drei Skills machen dasselbe: `extract`, das JSON bearbeiten, `build`.
Jeder `build` nutzt das aktuelle Template. Die Datei ist ein Build-Artefakt.
Dem Audit-Skill gehört das Template, nicht jede einzelne Ausgabe. Die Regel
»Layout nicht anfassen« aus Remediation und Sync wird dadurch überflüssig,
weil es nichts mehr gibt, woran man von Hand drehen könnte.

Den Pfad zum Skript finden die Nachbar-Skills über den Skill-Ordner von
`js-ts-project-audit` (`~/.claude/skills/js-ts-project-audit/scripts/…`).
Fehlt er: kein Rendern von Hand. Die Nachbar-Skills ersetzen dann nur die
JSON-Insel, per Node-Einzeiler mit derselben Escape-Regel, und sagen das im
Abschluss.

## 4. Template

### 4.1 Rendering

- Die gesamte Seite entsteht aus `JSON.parse(#audit-data)`. Im HTML stehen nur
  Gerüst, CSS und Renderer. `<noscript>`: ein Satz, dass der Report
  JavaScript braucht, und der Hinweis auf `build-report.mjs extract`.
- **Fremdtexte sind Daten, kein Markup.** Titel, Pfade und Beschreibungen
  stammen aus fremden Repos. Alles läuft über `textContent`. Die Freitextfelder
  unterstützen ein Markdown-Subset: Absätze, `code`, **fett**, *kursiv*,
  Aufzählungen und Links nur mit `http(s):`. Der Mini-Parser erzeugt DOM-Knoten
  und nie einen HTML-String.
- Sektionsfolge, »was zugeklappt startet«, Domain-Blöcke, Breakpoints (720 /
  900 px), Kartenliste unter 720 px, Severity-Farben und Kontrastgrenzen: alles
  wie in `report-rendering.md` heute festgelegt, einmal gebaut statt jedes Mal
  beschrieben.

### 4.2 Theme: Default plus Toggle

- `summary.theme` bestimmt das Start-Theme (Auflösung wie bisher in Schritt 6a).
- Ein Toggle im Header überschreibt es pro Leser, gespeichert in `localStorage`
  unter einem Schlüssel pro Projektname. Jeder Zugriff steckt in
  `try/catch`: Bei `file://` in manchen Browsern oder im Private Mode greift
  einfach der Default.
- `prefers-color-scheme` wird weiterhin nicht ausgewertet. Die Datei hat einen
  bewusst gewählten Default, und den ändert nur ein Klick.
- Drucken immer im Light-Theme, alle `<details>` offen, Filterleiste
  ausgeblendet.

### 4.3 Interaktion

- Filter: Domain, Severity, Kategorie, Component (Abschnitt 7) und im
  Folgelauf Status, dazu Volltextsuche über Titel, ID und Location.
  Kombinierbar per UND zwischen den Filtern und ODER innerhalb eines Filters.
- Filterzustand und aufgeklapptes Finding stehen im URL-Hash
  (`#sev=high,critical&comp=renderer&f=<finding-id>`). Deep Links auf ein
  Finding funktionieren damit auch für `audit-github-sync`.
- Pro Finding »Als Markdown kopieren«: Titel, Location, Beschreibung,
  Empfehlung, bereit für Issue oder Prompt.
- Die Klicks in Kategorie-, Component- und Diagramm-Übersicht setzen den
  jeweiligen Filter und scrollen zum Backlog.
- Sonst nichts: kein Sortier-Editor, keine Spaltenauswahl, keine Charts
  darüber hinaus. Die Haltung »schön, minimal« gilt für das Template
  strenger als für einen Einzellauf, denn jedes Feature steht künftig in
  jedem Report.

### 4.4 Sprache

`meta.lang` (`de` | `en`) wählt eine eingebaute String-Tabelle für alle
festen Beschriftungen. Die Freitexte liefert der Agent in derselben Sprache.

## 5. Health-Score, Modell 2: Dichte statt Summe

### 5.1 Das Problem, genau

Modell 1 rechnet `100 − Σ Abzüge` mit Untergrenze 0. Das misst, wie viel ein
Lauf gefunden hat, und nicht, wie gesund der Code ist. Wer doppelt so viel
liest, findet ungefähr doppelt so viel, also verdoppelt sich der Abzug. Dazu
kommt die Untergrenze: Bei 0 kann der Score keine Veränderung mehr zeigen,
auch keine Verbesserung.

### 5.2 Prüfumfang messen statt beschreiben

Neues Objekt `summary.scope`, vom Agenten per Shell gemessen, nicht geschätzt:

```
scope: {
  sourceFiles, sourceLoc,          // Quelltext des Projekts (ohne Tests, Build-Output, Vendor, Lockfiles)
  reviewedFiles: [path, …],        // tatsächlich vollständig gelesen
  reviewedLoc,                     // wc -l über reviewedFiles
  exclusions: [glob, …]            // was nicht als Quelltext zählt, damit der Folgelauf gleich zählt
}
```

Die Messbefehle stehen in der Skill-Referenz, damit jeder Lauf gleich zählt.
`reviewedFiles` ersetzt die Prosa-Angabe »was gelesen wurde« in der Methodik
als Quelle für den Folgelauf. Die Prosa bleibt für den Leser erhalten. Ab 2000
Einträgen wird auf Verzeichnisebene mit Dateizahl verdichtet.

### 5.3 Formel

Abzugsgewichte wie bisher: critical 10, high 5, medium 2, low 0,5, info 0.

- **Code & Laufzeit** wird auf den Prüfumfang normiert, denn Code-Findings
  skalieren mit gelesenem Code:
  `ρ = Abzüge_code / (reviewedLoc / 1000)`,
  `score_code = 100 / (1 + ρ / ρ₀)`.
- **Projekt-Harness** bleibt absolut, denn das Gerüst wächst nicht mit der
  Lesetiefe (es gibt ein `tsconfig`, nicht eins pro kLOC):
  `score_harness = 100 / (1 + Abzüge_harness / H₀)`.
- **Kappung**: Gibt es in einer Domain ein offenes `critical`, liegt ihr
  Score höchstens bei 49. Ohne diese Regel verdünnt eine große, saubere
  Codebasis eine offene Sicherheitslücke zu einer freundlichen Zahl.
- **Gesamtscore**: geometrisches Mittel `√(score_code · score_harness)`. Eine
  schwache Domain zieht damit stärker nach unten als bei einem arithmetischen
  Mittel, und beide Teilscores stehen weiterhin sichtbar daneben.

Die Hyperbel hat keine Untergrenze, an der sie hängen bleibt. Jede Änderung
bleibt sichtbar, auch in einem schlechten Zustand.

Kalibriert an 56 historischen Ständen der `audit.html` aus `twopoint5d`,
`shadow-objects`, `signalize` und `eventize` (Umfang je Lauf aus den
Methodik-Texten rekonstruiert). Gewählt: `ρ₀ = 8`, `H₀ = 60`. Ergebnis:

- Die Einbrüche durch tiefere Prüfung in `twopoint5d` (Modell 1: 48 → 5 → 0)
  schrumpfen auf 75 → 65 → 60.
- Echte Tiefs bleiben sichtbar: `signalize` mit einem `critical` und 19
  `high` landet bei 32 statt 0.
- Endstände nach Remediation: `shadow-objects` 89, `signalize` 93,
  `eventize` 84 — kein Projekt klebt mehr an der Untergrenze.

Ein strengeres Paar (`ρ₀ = 5`, `H₀ = 40`) hätte `eventize` bei 2,3 gelesenen
kLOC mit einer Handvoll `medium`-Befunden auf 64–69 gedrückt, während
Modell 1 dort 77–81 zeigte — kleine Projekte hätten die Dichte überbestraft. Die
Konstanten stehen in `scripts/build-report.mjs` und in `summary.scoring`,
nirgends sonst.

### 5.4 Muster zählen einmal

Tiefere Prüfung findet dasselbe Muster in mehr Dateien. Dafür bekommt ein
Finding `locations: [...]` statt nur `location`. Ein fehlendes `removeEventListener`
in zwölf Komponenten ist *ein* Finding mit zwölf Fundstellen, nicht zwölf
Findings. Die Severity richtet sich nach der Wirkung, nicht nach der Anzahl.
Diese Regel gehört in Schritt 4 der `SKILL.md`, unabhängig vom Template, und
sie ist der zweite Hebel gegen die Score-Inflation.

### 5.5 `deltaCause` wird gerechnet statt geschätzt

Mit `reviewedFiles` in beiden Läufen teilt das Skript die neuen Findings eines
Folgelaufs auf:

- Fundstelle in einer Datei, die der Vorlauf nicht gelesen hat → Anteil
  **Prüftiefe**
- Fundstelle in einer Datei, die beide Läufe gelesen haben → Anteil **Code**

Das Ergebnis steht als `summary.deltaBreakdown: {coverage, code}` im JSON.
`deltaCause` und `deltaExplanation` bleiben Aufgabe des Agenten, er muss sich
aber auf diese Zahlen beziehen. Eine Behauptung ohne Zahl ist damit nicht mehr
möglich.

### 5.6 Verlauf und Diagramm

`scoreHistory`-Einträge werden reicher:

```
{date, score, source: "audit"|"remediation", scoreModel: 1|2,
 domains: {code, harness}, coverage: reviewedLoc / sourceLoc}
```

Das Diagramm »Health-Score«:

- Linie für den Gesamtscore in der Akzentfarbe. Audit-Punkte gefüllt,
  Remediation-Punkte hohl, denn die sind nachgerechnet und nicht neu geprüft.
- **Prüfabdeckung** als graue Fläche auf derselben 0–100-Achse. Wer die Fläche
  wachsen und die Linie gleichzeitig halten sieht, liest die Aussage ohne
  Erklärtext: tiefer geprüft, stabil geblieben.
- **Modellwechsel**: Alte Einträge mit `scoreModel: 1` werden nicht
  umgerechnet, weil ihnen die Scope-Daten fehlen. Die Linie bricht an der
  Stelle, mit einer gestrichelten Senkrechten und dem Label »Score-Modell 2«.
  Zwei Skalen in einer durchgehenden Linie wären genau der Messfehler, den
  dieser Abschnitt beseitigt.
- Bis zu 20 Einträge (FIFO) wie bisher. Die Anzeige-Stufen nach Länge bleiben:
  1 Eintrag nur die Zahl, 2 Einträge mit Delta, ab 3 Einträgen das Diagramm.

## 6. Fix-Bilanz: Wie viel bricht, wenn wir reparieren?

### 6.1 Fragestellung

Pro Reparaturrunde: Wie viele Findings wurden geschlossen, und wie viele neue
Probleme sind *durch diese Reparaturen* entstanden? Wird der Quotient über die
Zeit kleiner, stabilisiert sich die Codebasis. Wird er größer, macht jede
Reparatur zwei neue Baustellen auf.

### 6.2 Drei Arten »neu«, streng getrennt

| Art | Bedeutung | zählt in die Induktionsrate? |
| --- | --- | --- |
| `induced-fixed` | durch einen Fix entstanden, noch im selben Sprint wieder behoben (Reviewer-Befund auf den Diff, in einer Nachrunde erledigt) | ja |
| `induced-open` | durch einen Fix entstanden, offen ins Backlog gewandert | ja |
| `discovered` | lag schon vorher im Code, wurde nur bei der Arbeit gefunden | nein, eigene Zahl |

`discovered` in die Rate zu mischen hieße, das Finden alter Probleme als
Instabilität zu buchen. Das wäre derselbe Fehler wie beim Score.

### 6.3 Datenmodell

Neue Liste `fixHistory`, chronologisch, max. 20 Einträge (FIFO):

```
{date, source: "remediation"|"audit", ref,     // ref: Plan/Branch bzw. Audit-Datum
 fixed,                                        // geschlossene Findings
 inducedFixed, inducedOpen, discovered,
 attribution: "reviewed"|"heuristic"}
```

Findings bekommen optional `origin: {kind: "induced"|"discovered", run: <ref>}`.
So bleibt im Backlog sichtbar, welches offene Finding aus einer Reparatur
stammt.

### 6.4 Wer die Zahlen liefert

- **Remediation-Lauf** (`attribution: "reviewed"`), in Schritt 7 zusammen mit
  dem Nachführen der `audit.html`:
  - `fixed` = die dort bereits definierten Schließungen (Reviewer-Urteil mit
    Fundstelle und Hash)
  - `inducedFixed` = Reviewer-Befunde auf den Paket-Diff, die eine Nachrunde
    ausgelöst haben und darin erledigt wurden
  - `inducedOpen` = `Folgen:`-Zeilen und Abweichungen, die offen ins Audit
    gehen
  - `discovered` = »Offene Befunde« mit Urteil `→ Audit`, die nicht aus dem
    Diff stammen

  Die Quellen liegen alle schon in Plan und Paketdateien. Neu ist die Pflicht,
  bei jedem Befund *durch den Diff entstanden* oder *vorgefunden* zu vermerken.
  Das muss der Reviewer-Prompt einfordern.
- **Folgeaudit** (`attribution: "heuristic"`): `fixed` = `resolvedCount`. Für
  jedes neue Finding `git blame` auf die Fundstelle: Liegt der verantwortliche
  Commit nach dem Vorlauf und gehört er zu einem Remediation-Lauf
  (Branch/Commit-Trailer, siehe offene Frage 3), zählt es als `inducedOpen`.
  Liegt er nach dem Vorlauf, stammt aber aus normaler Feature-Arbeit, zählt es
  nicht in die Bilanz. Liegt er davor, zählt es als `discovered`. Die
  Heuristik ist schwächer als das Reviewer-Urteil, deshalb steht das Attribut
  dabei und das Diagramm zeigt es an.

### 6.5 Diagramm »Fix-Bilanz«

- Pro Eintrag ein Balkenpaar an einer Nulllinie: nach oben `fixed`
  (Akzentfarbe), nach unten `inducedOpen` (dunkelgrau) und darüber gestapelt
  `inducedFixed` (hellgrau schraffiert). `discovered` als kleiner Zähler unter
  dem Datum, nicht als Balken.
- Darüber eine Linie für die **Induktionsrate** `(inducedFixed + inducedOpen) / fixed`
  mit eigener rechter Achse, beschriftet in Prozent.
- Heuristische Einträge mit gestricheltem Balkenrand.
- Bildunterschrift mit dem Trend in einem Satz, vom Skript aus den letzten
  drei Einträgen gerechnet (»Induktionsrate fallend: 40 % → 25 % → 12 %«).
- Ab 2 Einträgen sichtbar. Vorher steht an der Stelle ein Satz, ab wann das
  Diagramm erscheint.
- Farbachsen: keine neue. Akzent plus Grautöne, Severity bleibt unberührt.

## 7. Component-Filter (fachlicher Bereich)

- Das Portrait führt seine 3–7 fachlichen Domänen künftig als
  `portrait.components: [{id, label, summary, paths: [glob, …]}]`. `id` ist
  ein stabiler Slug.
- Jedes Finding bekommt optional `component: <id>`. Ein Wert, nicht mehrere:
  Querschnittliches bleibt ohne Component und erscheint im Filter als
  »projektweit«. Das deckt sich mit der Regel für das Label `component:<slug>`
  in `audit-github-sync`, das künftig direkt aus diesem Feld kommt statt aus
  einem eigenen Pfad-Match.
- Zuweisung: Pfad-Match der Fundstelle gegen `paths` als Vorschlag, der Agent
  entscheidet. Liegen die `locations` eines Findings in verschiedenen
  Components, bekommt es keine Component.
- **Stabilität über Läufe**: Der Folgelauf übernimmt die `id`s des Vorlaufs.
  Eine neue Component nur, wenn eine neue fachliche Einheit entstanden ist.
  Umbenennen nur mit Eintrag in `portrait.componentRenames: [{from, to}]`,
  damit Sync-Labels und Filter-Links nachziehen können.
- Das Schema-Feld heißt `component`, nicht `domain` (vergeben an
  `code`|`harness`) und nicht `area` (bei GitHub bereits die Kategorie). Die
  UI-Beschriftung ist »Feature« bzw. "Feature".
- Im Report: Filter-Chips im Backlog und in der Kategorie-Übersicht eine
  kompakte Matrix Component × Severity (Zahlen, keine Farbfläche). Ein Klick
  auf eine Zelle setzt beide Filter.

## 8. Diagramme: SVG, nie ASCII

- ASCII-Diagramme sind abgeschafft, für jede Darstellung von Struktur.
- `portrait.diagram` hat zwei Formen:
  1. **`layered`** (Standard): strukturierte Daten
     `{layers: [{label, nodes: [{id, label, component?}]}], edges: [{from, to, label?}]}`.
     Das Template layoutet das selbst als Spalten bzw. Zeilen mit SVG-Pfeilen,
     im aktuellen Theme, responsiv (mobil gestapelt). Ein Knoten mit
     `component` ist klickbar und filtert das Backlog. Der Agent zeichnet
     nichts, er beschreibt die Struktur, und jedes Diagramm sieht aus wie aus
     einem Guss.
  2. **`svg`** (Ausweg für Datenflüsse, die nicht in Schichten passen): ein
     SVG-String mit Bildunterschrift. Regeln: `viewBox` Pflicht, keine festen
     Farben, nur die Klassen `node`, `edge`, `label`, `muted`, `accent`, die das
     Template für beide Themes stylt. Das Build-Skript lehnt ab, was
     `<script>`, `on*`-Attribute, `<foreignObject>` oder externe `href`s
     enthält. Das Template setzt das SVG erst nach einer zweiten
     Allow-List-Prüfung ins DOM.
- Die Schwelle aus Schritt 1b bleibt: ein Diagramm nur, wenn es Überblick
  schafft, und ab etwa zehn Knoten wird es keiner mehr.

## 9. Schema v2 im Überblick

```
{
  schemaVersion: 2,
  meta:      {generator, templateVersion, lang, generatedAt},
  summary:   {project, stack[], date, theme, previousDate?,
              scoreModel, score, domains: {code, harness},   // Scores + Zählungen: vom Skript
              scope, deltaBreakdown?, deltaCause?, deltaExplanation?,
              resolvedCount?, packages?[]},                  // packages: Monorepo-Zeilen
  portrait:  {description, components[], componentRenames?[], diagram?},
  findings:  [{id, category, domain, component?, severity, kind: "defect"|"improvement",
               title, location, locations?[], description, recommendation, effort,
               status?, previousSeverity?, origin?, github?}],
  openQuestions: [text],
  methodology:   {text, notes[]},
  scoreHistory:  [...],   // Abschnitt 5.6
  fixHistory:    [...],   // Abschnitt 6.3
  acknowledged:  [...]    // unverändert
}
```

`kind: "improvement"` ersetzt die doppelte Führung der Sektion
»Optimierungspotenzial«: Sie zeigt einfach die Findings dieser Art, alles
bleibt in einer Liste. Improvements wiegen 0 im Score, unabhängig von ihrer
Severity.

**Migration v1 → v2** (in `extract`): Findings übernehmen, `kind` aus der
Sektionszugehörigkeit, sonst `defect`. `domain` aus der Kategorie, wie heute
schon in `followup-audit.md`. `scoreHistory`-Einträge bekommen
`scoreModel: 1`. `component`, `scope` und `fixHistory` bleiben leer, das
Template blendet die zugehörigen Filter und Diagramme aus, statt leere Hüllen
zu zeigen.

## 10. Was sich an den Skills ändert

- **`js-ts-project-audit`**
  - Schritt 4 wird zum Schema-Verweis, dazu die Regeln für Muster-Findings und
    `component`.
  - Schritt 5 verweist auf Modell 2, das Skript rechnet.
  - Schritt 6 heißt: JSON in eine temporäre Datei außerhalb des Projekts
    schreiben, `build`, fertig.
  - `report-rendering.md` schrumpft auf die inhaltlichen Regeln: Ton der
    Summaries, Inhalt der Methodik, wann ein Diagramm hilft.
  - `followup-audit.md` bekommt `extract`, `deltaBreakdown` und die
    `git blame`-Zuordnung.
- **`js-ts-audit-remediation`**: `audit-report-update.md` wird zu extract →
  bearbeiten → build. Neu kommen der `fixHistory`-Eintrag und die
  Unterscheidung »durch Diff entstanden / vorgefunden« im Reviewer-Prompt dazu.
  Die Regeln zur Score-Rechnung entfallen, das Skript rechnet.
- **`audit-github-sync`**: extract/build statt Markup-Pflege, `component:`-Label
  direkt aus dem Feld. Der Abschnitt über ältere Markup-Muster in
  `reverse-sync.md` entfällt.

## 11. Umsetzungsreihenfolge

1. **Schema + Skript + Template, Parität mit heute.** Kein neues Messmodell,
   nur Rendering aus Daten. Abnahme: Fixtures bei 390 px und 1440 px in
   beiden Themes per Playwright, Kontrast geprüft.
2. **Nachbar-Skills auf extract/build umstellen.** Ab hier gibt es nur noch
   einen Schreibweg.
3. **Component-Filter und Diagramme** (Abschnitte 7, 8).
4. **Score-Modell 2** (Abschnitt 5). Vorher Kalibrierung: `ρ₀` und `H₀` an zwei
   oder drei echten `audit.html`-Historien aus dem git-Verlauf nachrechnen
   und prüfen, ob die Kurve den Verlauf zeigt, den die jeweiligen
   Methodik-Texte beschreiben.
5. **Fix-Bilanz** (Abschnitt 6), zuerst die Remediation-Seite mit belastbarer
   Zuordnung, dann die Heuristik im Folgeaudit.

Jede Stufe macht Szenario-Tests veraltet: `audit-followup.md` ab Stufe 1,
`remediation-plan.md` ab Stufe 2. `audit-github-sync` hat noch keinen Test.

## 12. Entscheidungen

1. **Kalibrierung**: an den vier Projekten oben, `ρ₀ = 8`, `H₀ = 60`.
2. **Fixtures**: in `js-ts-project-audit/tests/fixtures/`, Tests per
   `node --test js-ts-project-audit/tests/`.
3. **Remediation-Commits**: Trailer `Remediation-Run: <Plan-Datum>`, gesetzt
   in Zug 5 von `js-ts-audit-remediation/references/runner.md`.
4. **Gesamtscore**: geometrisches Mittel beider Teilscores.

Abweichungen vom Entwurf, die sich bei der Umsetzung ergeben haben:

- `category` wird ein fester Schlüssel (`testing`, `types`, …) statt des
  deutschen Labels; die Beschriftung kommt aus dem Template. Die
  GitHub-Fingerprints bleiben stabil, weil `audit-github-sync` dieselben
  `area:`-Slugs daraus ableitet.
- Fehlt das Build-Skript, führen Remediation und GitHub-Sync die Datei nicht
  nach, statt die Insel von Hand zu ersetzen: eine Insel ohne neu gerechnete
  Zahlen zeigt einen falschen Score.
- `scoreHistory` kennt zusätzlich `source: "github-sync"`, weil der Sync
  Findings nach `acknowledged` verschieben kann.
- Die Migration rekonstruiert Features aus `component`-Angaben alter Findings,
  wenn der alte Report kein Portrait führte (`twopoint5d`).
- `inducedFixed` zählt auch committete Pakete mit `Folge von:`: eine Folge,
  die der Lauf selbst repariert hat, ist genau das.
