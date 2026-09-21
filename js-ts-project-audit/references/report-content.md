# Report — was du hineinschreibst

Gilt in Schritt 4 der `SKILL.md`. Die Gestaltung liegt fertig in
`assets/report-template.html`: Sektionsfolge, Faltung, Farben, Breakpoints,
Filter, Charts. Diese Datei regelt nur, was in den Textfeldern und im Diagramm
steht. Wer beim Lesen denkt, die Seite sollte anders aussehen, ändert das
Template in diesem Skill, nicht eine einzelne `audit.html`.

## Wo was erscheint

| Sektion | gespeist aus | Start |
| --- | --- | --- |
| Header | `summary.project`, `stack`, `date`, Scores, `scope`, Vergleich mit dem Vorlauf | offen |
| Projektportrait | `portrait.description`, `portrait.components`, `portrait.diagram` | offen |
| Zusammenfassung | je Domain `executiveSummary`, Severity-Balken, Kategorien; Packages; Matrix Feature × Severity | offen |
| Verlauf | `scoreHistory` (ab 3 Einträgen), `fixHistory` (ab 2) | offen |
| Backlog | `findings` mit `kind` ≠ `improvement` | offen |
| Offene Fragen | `openQuestions`, entfällt wenn leer | offen |
| Optimierungspotenzial | `findings` mit `kind: "improvement"`, entfällt wenn leer | offen |
| Methodik | `methodology`, `scope`, `summary.scoring`, `deltaBreakdown`, `deltaExplanation` | zugeklappt |
| Anhang | `acknowledged`, entfällt wenn leer | zugeklappt |

Leere Sektionen lässt das Template weg. Platzhaltertexte wie »keine offenen
Fragen« schreibst du nicht.

## Textfelder

Alle Freitexte kennen ein Markdown-Subset: Absätze, Aufzählungen mit `- `,
`` `code` ``, `**fett**`, `*kursiv*`, Links `[text](https://…)`. Kein HTML;
es erschiene als Text.

- **`portrait.description`**: 2–4 Sätze, worum es fachlich geht. Kein
  Befund, keine Bewertung — die stehen in der Zusammenfassung.
- **`summary.domains.<d>.executiveSummary`**: 2–4 Sätze über die Befunde
  dieser Domain, nicht über das Projekt. Das Wichtigste zuerst, mit Wirkung
  (»wächst der Speicher linear«), nicht mit Kategorie (»es gibt
  Memory-Leaks«). Keine Wiederholung des Portraits, keine gemeinsame
  Einleitung für beide Domains. Hat eine Domain keine Findings, reicht ein
  Satz, der sagt, was geprüft wurde.
- **`finding.title`**: kurz und imperativ, als Aufgabe formuliert: »Memory
  Leak in WebSocket-Reconnect beheben«.
- **`finding.description`**: Problem und Konsequenz. Eine Messung oder ein
  Szenario schlägt jedes Adjektiv.
- **`finding.evidence`**: optional, der Beleg — ein kurzer Code-Auszug in
  Backticks, ein Grep-Ergebnis, eine Zahl. Kein Codeblock über drei Zeilen.
- **`finding.recommendation`**: wie konkret beheben, so dass jemand ohne
  Kontext anfangen kann.
- **`openQuestions`**: je Eintrag eine Frage, die nur ein Mensch beantworten
  kann, mit dem Anlass. Nur rendern, was aktuell offen ist; keine Rückschau
  auf früher Geklärtes.
- **`methodology.text`**: was vollständig gelesen wurde, was nur
  stichprobenweise, was gar nicht, und welche Kommandos gelaufen sind, mit
  Ergebnis. Die Zahlen des Umfangs stehen in `scope` und erscheinen
  daneben; der Text erklärt die Auswahl. Der nächste Lauf vergleicht seinen
  Umfang gegen diesen — wer ihn weglässt, macht den Folgelauf blind.
- **`methodology.notes`**: Besonderheiten dieses Laufs, je ein Satz: die
  Match-Strategie im Folgelauf, kontextbedingt entfernte Findings samt Quelle,
  Nachführungen durch andere Skills. Formel und Theme-Hinweis ergänzt das
  Template selbst.

## Features

`portrait.components` sind die fachlichen Bereiche aus Schritt 1b. Jedes
bekommt `id` (Slug, stabil über Läufe), `label`, einen Satz `summary` und
`paths` als Globs relativ zum Projekt-Root. Die Pfade sind die Grundlage für
`finding.component`: Fällt die Fundstelle unter die Pfade genau eines
Features, trägt das Finding dessen `id`.

Das Template zeigt je Feature eine Karte mit der Zahl seiner Findings, eine
Matrix Feature × Severity und einen Filter. Ein Feature ohne Findings ist
kein Fehler; es zeigt, dass der Bereich geprüft wurde.

## Diagramm

Nie ASCII. Zwei Formen, beide in `portrait.diagram`:

**`layered`** ist der Normalfall. Du beschreibst Schichten, Knoten und Kanten;
das Template legt sie aus, im aktuellen Theme, auf dem Handy umbrechend.

```json
{
  "kind": "layered",
  "caption": "Schichten von oben nach unten; Pfeile zeigen die Aufrufrichtung.",
  "layers": [
    { "label": "API", "nodes": [{ "id": "api", "label": "createClient", "detail": "src/index.ts" }] },
    { "label": "Fachlogik", "nodes": [{ "id": "sync", "label": "SyncEngine", "component": "sync" }] }
  ],
  "edges": [{ "from": "api", "to": "sync", "label": "startet" }]
}
```

- Schichten von oben nach unten in Abhängigkeitsrichtung: wer aufruft, steht
  oben.
- `component` am Knoten macht ihn klickbar; der Klick filtert das Backlog auf
  dieses Feature.
- Kanten sparsam beschriften. Eine Beschriftung sagt, *was* fließt, nicht
  *dass* etwas fließt.
- Die Bildunterschrift erklärt, was Boxen und Pfeile bedeuten.

**`svg`** nur, wenn die Struktur nicht in Schichten passt — ein Datenfluss im
Kreis, eine Pipeline mit Rückkanal. Regeln, die das Skript prüft:

- `viewBox` Pflicht, keine `width`/`height`-Festwerte nötig.
- Keine Farbangaben. Das Aussehen kommt aus Klassen, die das Template für
  beide Themes definiert: `node` (Box), `edge` (Linie), `label` und `muted`
  (Text), `accent` (hervorgehobene Linie oder Text).
- Kein `<script>`, `<style>`, `<foreignObject>`, keine `on*`-Attribute, keine
  externen `href`. Marker per `url(#id)` sind erlaubt.

Ein Diagramm nur, wenn es Überblick schafft: klare Schichtung, ein Monorepo
ab drei Packages, ein erkennbarer Datenfluss. Ab etwa zehn Knoten ist es
keiner mehr.
