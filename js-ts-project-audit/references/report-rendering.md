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
3. **Executive Summary** — 3–6 Sätze über die Befunde, nicht über das Projekt.
   Keine Doppelung mit dem Portrait.
4. **Severity-Übersicht** als Balken und Zahlen.
5. **Kategorie-Übersicht**.
6. **Backlog-Tabelle** — filterbar, Zeilen aufklappbar.
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

## Score-Anzeige & Verlauf

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
