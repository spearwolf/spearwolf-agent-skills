# Report — Aufbau und Optik

Verbindliche Vorgaben für `./audit.html`: welche Sektionen in welcher
Reihenfolge erscheinen und wie sie aussehen. Wird von Schritt 6a der
`SKILL.md` referenziert — vor dem Rendern lesen. Der Datei-Vertrag
(Zielpfad, Standalone-Regel, JSON-Insel) steht in Schritt 6 der `SKILL.md`,
die Folgelauf-Logik in `references/followup-audit.md`.

## Sektionsfolge

1. **Header** — Projektname, Stack-Badges, Audit-Datum, Health-Score (Anzeige
   siehe unten).
2. **Projektportrait** (Schritt 1b) — Kurzbeschreibung als Prosa, danach die
   Domänen als kompakte Liste oder Grid mit Pfad-Chips. Ein Architektur-
   Diagramm nur, wenn Schritt 1b eines vorsieht, mit knapper Bildunterschrift,
   die Boxen und Pfeile erklärt. Kein Platzhalter-Bild.
3. **Executive Summary** — zwei getrennte Blöcke, je Domain einer (siehe
   „Zwei Domains in der Zusammenfassung"), je 2–4 Sätze über die Befunde,
   nicht über das Projekt. Keine Doppelung mit dem Portrait, keine
   gemeinsame Einleitung darüber.
4. **Severity-Übersicht** als Balken und Zahlen — je Domain ein Satz Balken.
5. **Kategorie-Übersicht** — je Domain eine Liste, nur die Kategorien der
   jeweiligen Domain.
6. **Backlog-Tabelle** — filterbar, Zeilen aufklappbar. Eine Tabelle für
   beide Domains, nicht zwei.
7. **Offene Fragen** — nur rendern, wenn es aktuell welche gibt. Sonst
   entfällt die Sektion ersatzlos: kein „keine offenen Fragen"-Platzhalter,
   keine Rückschau auf früher Geklärtes.
8. **Optimierungspotenzial** — bewusst getrennt von Bugs und Findings:
   Verbesserungen, die kein Defekt sind.
9. **Methodik** — was gelesen wurde, was nicht, wie der Score entsteht, die
   Theme-Entscheidung in einem Halbsatz. Die Angabe zum Prüfumfang ist keine
   Höflichkeit: Der nächste Lauf vergleicht seinen Umfang gegen diesen, um
   einen Score-Sprung als Code- oder als Prüftiefen-Effekt einzuordnen. Wer
   sie weglässt, macht den Folgelauf blind. Im Folgelauf zusätzlich: Datum des
   Vorgängers, Match-Strategie, Zahl der entfallenen Findings, davon
   kontextbedingt entfernte, und `deltaExplanation`, sofern gesetzt.
10. **Anhang „Akzeptierte / zurückgestellte Punkte"** — nur wenn
    `acknowledged` nicht leer ist. Pro Eintrag Titel, Kategorie, Location,
    `reason`, `acknowledgedDate`. Eine knappe Einleitung erklärt, dass diese
    Punkte auf Nutzerwunsch ruhen und jederzeit reaktivierbar sind.

## Zwei Domains in der Zusammenfassung

Die Sektionen 3–5 sind nach `finding.domain` getrennt: **Code & Laufzeit**
(`code`) und **Projekt-Harness** (`harness`), Beschriftung aus
`summary.domains.<d>.label`. Zuordnung und Begründung stehen in Schritt 3 der
`SKILL.md`; hier steht nur, wie die Trennung aussieht. Nicht dasselbe wie die
fachlichen Domänen im Portrait — im sichtbaren Report tragen diese beiden
ihre Labels, das Wort „Domain" erscheint höchstens am Filter.

- **Reihenfolge**: erst `code`, dann `harness`. Fest, auch wenn `harness`
  mehr oder schwerere Findings hat — der Leser soll die Blöcke über Läufe
  hinweg an derselben Stelle finden.
- **Layout**: zwei gleichwertige Blöcke, nebeneinander oder gestapelt je
  nach Breite (siehe „Responsives Layout"). Jeder Block trägt Domain-Titel, seinen
  Teilscore aus `summary.domains.<d>.score`, seine Executive Summary, seine
  Severity-Balken und seine Kategorien. Gleiches Gewicht in Typografie und
  Rahmung — keine Domain ist die Hauptsache und die andere der Anhang.
- **Kein neuer Farbcode**: die Domains werden über Titel und Position
  unterschieden, nicht über zwei Akzentfarben. Die Severity-Farben behalten
  ihre Bedeutung; eine zweite Farbachse macht die Balken unlesbar.
- **Teilscores**: im Domain-Block als Zahl, im Header daneben (siehe unten).
  Die Skala ist dieselbe wie beim Gesamtscore, das gehört in die Methodik-
  Sektion — sonst liest sich `81 / 62` wie eine Aufteilung von 100.
- **Leere Domain**: Block trotzdem rendern, mit Score 100 und einem Satz
  („Keine Findings im Projekt-Harness."). Ein fehlender Block liest sich wie
  ein vergessener Prüfbereich.
- **Backlog**: eine gemeinsame Tabelle mit einer Domain-Spalte (kompaktes
  Badge, gedämpft) und einem Domain-Filter neben Severity und Kategorie. Der
  Kategorie-Filter zeigt nur Kategorien, die zur aktiven Domain-Auswahl
  passen. Zwei getrennte Tabellen wären doppelte Filter-UI für denselben
  Datensatz.

Alle übrigen Sektionen — Portrait, Offene Fragen, Optimierungspotenzial,
Methodik, Anhang — bleiben ungeteilt.

## Responsives Layout

Zwei Zielgeräte: Desktop-Browser und Handy im Portrait (~360–430 px
CSS-Breite). Beide müssen tragen; was dazwischen liegt, skaliert mit.

Grundregeln:

- `<meta name="viewport" content="width=device-width, initial-scale=1">` in
  den Head. Ohne sie rendert mobiles Safari in 980 px und zoomt heraus —
  dann ist jede weitere Regel hier wirkungslos.
- **Die Seite scrollt nie horizontal.** Was zu breit ist — Tabelle,
  Diagramm, ASCII-Block, langer Pfad — scrollt in seinem eigenen
  `overflow-x: auto`-Container oder bricht um. Nie der `body`.
- Inhaltsbreite auf dem Desktop begrenzen (~1100 px, zentriert), Fließtext
  bei ~72 Zeichen. Ein Report über die volle Breite eines 4K-Monitors liest
  sich nicht.
- Schriftgrößen relativ bzw. per `clamp()`, mobil nicht unter 16 px.
  Innenabstände mobil schmal (~16 px), auf dem Desktop großzügig — dieselben
  48 px sind auf 390 px Breite ein Drittel des Bildschirms.
- Lange Strings (Pfade, IDs, `location`) bekommen
  `overflow-wrap: anywhere`; Codeschnipsel bleiben `pre` und scrollen in
  ihrem Container.

Genau zwei Breakpoints, mehr braucht der Report nicht:

- **≥ 900 px** — Domain-Blöcke nebeneinander, Backlog als Tabelle.
- **< 720 px** — Domain-Blöcke gestapelt, Filter umbrechend, Backlog als
  Kartenliste.

### Backlog unter 720 px

Sechs Spalten werden auf 390 px zu Konfetti. Jede Zeile wird dort eine
Karte:

- Kopfzeile: Severity-Badge, ID, Domain-Badge nebeneinander; Titel darunter
  über die volle Breite, nicht abgeschnitten.
- Metazeile: Location, Kategorie, Effort, im Folgelauf der Status-Badge —
  klein, gedämpft, umbrechend.
- `description` und `recommendation` bleiben aufklappbar; die gesamte
  Kartenkopfzeile ist das Klickziel, Höhe mindestens 44 px.
- Dieselben Daten, dieselbe Filterlogik. Die Karte ist eine andere
  Darstellung derselben Zeile — über CSS aus dem Tabellen-Markup oder aus
  einem Rendering, das beide Formen bedient. Zwei getrennte Renderer laufen
  auseinander, und das merkt niemand, bis eine Spalte fehlt.

### Einzelheiten

- **Filterleiste**: mobil umbrechende Chips oder Selects statt einer Zeile,
  Tap-Ziele ≥ 40 px mit Abstand. Nichts davon sticky — eine festgeklebte
  Leiste frisst auf 390 px die halbe Sichthöhe.
- **Severity-Balken**: Breite in Prozent; mobil Label über den Balken statt
  daneben.
- **Score-Diagramm und Architektur-Diagramm**: `viewBox` plus
  `width: 100%; height: auto`, keine festen Pixelbreiten. Ein ASCII-Diagramm
  in `<pre>` scrollt horizontal in seinem Container, statt die Seite zu
  dehnen.
- **Header**: Score und Teilscores dürfen mobil untereinander stehen; die
  Stack-Badges brechen um.
- **Domänen-Grid im Portrait**: mobil einspaltig, Pfad-Chips umbrechend.

Vor dem Ausliefern einmal gedanklich bei 390 px durchgehen: Läuft irgendwo
etwas über den rechten Rand hinaus, ist es ein Fehler im Report, keine
Eigenart des Geräts.

## Score-Anzeige & Verlauf

Im Header steht der Gesamtscore groß, die beiden Teilscores klein daneben —
etwa `74` mit `Code & Laufzeit 81 · Projekt-Harness 62` darunter. Verlauf,
Delta, Tendenz und Diagramm beziehen sich ausschließlich auf den
Gesamtscore; `scoreHistory` führt nur ihn. Ein Teilscore hat keinen Vorwert
und bekommt keinen Pfeil.

Die Stufe ergibt sich aus `scoreHistory.length`:

- **1 Eintrag** (Erstlauf): nur der aktuelle Score, ohne Vergleich und ohne
  Tendenz.
- **2 Einträge**: aktueller Score plus Vorwert mit Tendenz und Delta, z. B.
  `89  ▲ +7  (vorher 82, 2026-03-10)`. Kein Chart.
- **≥3 Einträge**: zusätzlich das Liniendiagramm unten.

Im Folgelauf steht im Header oder direkt darunter eine Vergleichszeile:
Datum des vorherigen Audits, Score-Delta mit Tendenz, „X Findings behoben
seit letztem Audit, Y verbessert, Z neu". Behobene Findings erscheinen dort
nur als Zähler, nie als Tabellenzeilen.

Ist `summary.deltaCause` gesetzt (großer Sprung, siehe
`references/followup-audit.md`), erscheint die Einordnung an zwei Stellen in
zwei Granularitäten: als kurzer Zusatz direkt hinter dem Delta in der
Vergleichszeile — etwa `41,5 ▼ −46,5 (Prüftiefe, nicht Codeverfall)` — und
als vollständiger `deltaExplanation`-Text in der Methodik-Sektion. Bei
`deltaCause: "coverage"` darf die Zahl nicht kommentarlos im Header stehen;
sie liest sich sonst als Absturz, den es nicht gab.

## Themes

**Light** (Default): hell, dezent, professionell. Hintergrund nahezu weiß
(z. B. `#fafaf9`), Fließtext sehr dunkles Grau (`#1c1917`), Akzentfarbe
gedämpft (Indigo/Slate, kein knalliges Blau). Severity-Farben kräftig genug
zum Lesen, aber nicht plakativ.

**Dark**: ruhige dunkle Flächen (`#0f172a` o. ä., nicht reines Schwarz),
Fließtext hellgrau (`#e2e8f0`), gleiche Akzentlogik. Severity-Farben leicht
entsättigt, damit sie nicht glühen.

Beide folgen derselben typografischen Grundhaltung — der Wechsel ist eine
Farbumkehr, kein anderes Design. Das Theme wird fix ausgeliefert, kein
`prefers-color-scheme` (Begründung in Schritt 6a der `SKILL.md`).

## Typografie

- Font-Stack: system-ui oder vergleichbar, z. B.
  `ui-sans-serif, -apple-system, "Segoe UI", Inter, Roboto, sans-serif`.
- Großzügiger Zeilenabstand im Fließtext (1.6–1.7).
- Überschriften in moderatem Gewicht (600, nicht 800); Hierarchie über Größe
  und Whitespace statt über Farbe.
- Keine externen Fonts, keine externen Bilder. SVG-Icons inline, wenn nötig.

## Severity-Farben

Konsistent im ganzen Report: critical = rot, high = orange, medium = amber,
low = blau, info = grau.

## Score-Verlaufsdiagramm (ab 3 Einträgen)

Liniendiagramm als handgeschriebenes Inline-SVG (Polyline + Circles + Text) —
keine Diagramm-Library, kein Mermaid.

- X-Achse: Audit-Datum, chronologisch, gleichabständig. Y-Achse: Score 0–100.
- Punkte beschriftet; der aktuelle Punkt hervorgehoben (gefüllter Kreis,
  kleiner Score-Tooltip darüber).
- Achsen dezent, Gitterlinien nur bei 0/50/100.
- Breite responsiv via `viewBox`, maximal ~640 px breit, ~200 px hoch.
- Linie in der Akzentfarbe, Achsen und Beschriftungen im gedämpften
  Sekundär-Ton.
- Bildunterschrift: „Verlauf der Health-Scores seit `<frühestes Datum>`".

## Status-Badges im Backlog (nur im Folgelauf)

Kleine Badges pro Zeile: `new` (Akzentfarbe), `unchanged` (neutral),
`improved` (grün, mit `previousSeverity → currentSeverity` als
Tooltip/Untertitel), `carried-over` (gedämpft).

## Anhang „Akzeptierte / zurückgestellte Punkte"

Deutlich gedämpfte Optik, klar vom aktiven Backlog abgesetzt, kein
Severity-Gewicht.
