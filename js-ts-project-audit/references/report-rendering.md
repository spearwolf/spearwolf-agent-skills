# Report-Rendering — visuelle Spezifikation

Verbindliche Optik-Vorgaben für `./audit.html`. Wird von Schritt 6/6a der
`SKILL.md` referenziert — **vor dem Rendern lesen**. Entscheidungslogik
(welche Sektionen wann erscheinen, Theme-Auflösung, Overwrite-Policy) steht in
der `SKILL.md`; hier steht nur, *wie* es aussieht.

## Themes

**Light-Theme** (Default): hell, dezent, professionell. Hintergrund nahezu
weiß (z. B. `#fafaf9`), Fließtext sehr dunkles Grau (`#1c1917`), Akzentfarbe
gedämpft (gedämpftes Indigo/Slate, kein knalliges Blau). Severity-Farben
kräftig genug, um auf hellem Grund lesbar zu sein, aber nicht plakativ.

**Dark-Theme**: ruhige dunkle Flächen (`#0f172a` o. ä., nicht reines Schwarz),
Fließtext hellgrau (`#e2e8f0`), gleiche Akzentlogik. Severity-Farben leicht
entsättigt, damit sie nicht glühen.

Beide Themes folgen derselben typografischen Grundhaltung — der Wechsel ist
nur eine Farbumkehr, kein anderes Design. Das Theme wird **fix** ausgeliefert,
kein `prefers-color-scheme` (Begründung in Schritt 6a der `SKILL.md`).

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

## Score-Verlaufsdiagramm (ab 3 Einträgen in `scoreHistory`)

Liniendiagramm als **handgeschriebenes Inline-SVG** (Polyline + Circles +
Text) — keine Diagramm-Library, kein Mermaid.

- X-Achse: Audit-Datum, chronologisch, gleichabständig. Y-Achse: Score 0–100.
- Punkte beschriftet; der aktuelle Punkt visuell hervorgehoben (gefüllter
  Kreis, kleiner Score-Tooltip darüber).
- Achsen dezent, Gitterlinien nur bei 0/50/100.
- Breite responsiv via `viewBox`, max. ~640 px breit, ~200 px hoch.
- Linie in der Akzentfarbe des Themes, Achsen/Beschriftungen im gedämpften
  Sekundär-Ton.
- Bildunterschrift: „Verlauf der Health-Scores seit `<frühestes Datum>`".

## Status-Badges im Backlog (nur bei Diff-Lauf)

Kleine Badges pro Zeile: `new` (Akzentfarbe), `unchanged` (neutral),
`improved` (grün, mit `previousSeverity → currentSeverity` als
Tooltip/Untertitel), `carried-over` (gedämpft).

## Anhang „Akzeptierte / zurückgestellte Punkte"

Deutlich gedämpfte Optik, klar vom aktiven Backlog abgesetzt, **kein**
Severity-Gewicht.
