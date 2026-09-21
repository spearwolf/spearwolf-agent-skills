# Rückweg: GitHub → `audit.html`

Gilt in Schritt 6. Hier wird gebucht, was auf GitHub passiert ist, und der
Report bekommt seine Links. Bewertet wird nichts.

## Das Feld `github`

Jedes Finding, das ein Issue hat, bekommt in der JSON-Insel ein Unterobjekt:

```json
"github": {
  "number": 142,
  "url": "https://github.com/owner/name/issues/142",
  "state": "open",
  "stateReason": null,
  "assignee": "octocat",
  "note": "Team hält den Fix für nachrangig, bis der Reconnect-Umbau steht.",
  "lastSynced": "2026-08-22"
}
```

- `stateReason`: `"completed"` \| `"not_planned"` \| `null`.
- `assignee`: GitHub-Login oder `null`. Der Grund, warum das Feld existiert:
  ein Remediation-Lauf soll nicht anfangen, woran gerade jemand sitzt.
- `note`: höchstens ein Satz, in der **Sprache des Reports**, verdichtet aus
  den menschlichen Kommentaren am Issue. Nur setzen, wenn dort etwas steht,
  das die Sachlage ändert — eine Zustimmung, eine Einschränkung, eine
  Gegenposition. Kein Protokoll, keine Zitatsammlung; das Detail hängt am Link.
- `lastSynced`: Datum dieses Laufs.

Dasselbe Objekt, reduziert auf `number` und `url`, hängt an Einträgen in
`acknowledged`.

Das Feld liegt bewusst als geschlossenes Unterobjekt vor, nicht als
verstreute Einzelfelder: der Folgelauf des Audit-Skills trägt es als Ganzes
über gematchte Findings mit, ohne seinen Inhalt zu kennen.

## Zustandstabelle

| Lage auf GitHub | Folge im Report |
| --- | --- |
| offen, unverändert | `github.state: "open"`, sonst nichts |
| offen, mit Zuweisung | zusätzlich `github.assignee` |
| offen, mit inhaltlichen Kommentaren | zusätzlich `github.note` |
| geschlossen als `completed` | `state: "closed"`, `stateReason: "completed"`. **Das Finding bleibt im Backlog.** |
| geschlossen als `not planned`, oder Label `wontfix` von Hand gesetzt | wandert nach `acknowledged` |
| Issue gelöscht oder nicht mehr erreichbar | `github` entfernen, Sidecar-Eintrag entfernen, im Bericht nennen |

### Warum `completed` nichts entfernt

Eine Schließung auf GitHub sagt, dass jemand die Sache für erledigt hält. Der
Report lebt von »belegt statt vermutet«, und dieser Lauf liest keinen Code.
Also wird der Zustand gebucht und mehr nicht: das Finding steht weiter im
Backlog, mit seinem vollen Gewicht im Score, und trägt sichtbar, dass sein
Issue geschlossen ist.

Der nächste `js-ts-project-audit`-Lauf prüft die Stelle am Code und entfernt
das Finding, wenn es dort nicht mehr belegbar ist — das ist der Re-Check, der
in `references/followup-audit.md` ohnehin Pflicht ist. Er findet den Vermerk
vor und weiß, wo er hinsehen muss.

Ein Lauf, der den Score verbessert, weil ein Issue geschlossen wurde, benotet
eine Behauptung.

### Übernahme nach `acknowledged`

Ein als `not planned` geschlossenes Issue ist die GitHub-Entsprechung einer
bewussten Zurückstellung. Der Eintrag entsteht aus dem Finding:

```json
{
  "id": "<die aktuelle ID des Findings>",
  "title": "<Titel aus dem Report, nicht die englische Fassung>",
  "category": "…", "location": "…",
  "reason": "Auf GitHub als »not planned« geschlossen: <Schließkommentar in einem Satz>.",
  "acknowledgedDate": "<Schließdatum des Issues, nicht das Datum dieses Laufs>",
  "github": {"number": 142, "url": "…"}
}
```

- Der `reason` steht in der Sprache des Reports. Fehlt jeder Schließkommentar,
  lautet er, dass das Issue ohne Begründung als »not planned« geschlossen
  wurde. Nicht selbst eine Begründung erfinden, und den Punkt trotzdem
  verschieben: die Entscheidung ist gefallen, nur ihre Begründung fehlt.
- Das Finding verschwindet aus dem Backlog.
- **Der Widerruf gilt in beide Richtungen**: wird ein solches Issue auf GitHub
  wieder geöffnet, wandert der Punkt beim nächsten Lauf aus `acknowledged`
  zurück ins Backlog und durchläuft wieder die normale Finding-Logik.

Der Audit-Skill nimmt `acknowledged` nur auf ausdrückliche Nutzeranweisung
auf. Das »Wiederöffnen eines Issues als not planned« ist genau so eine
Anweisung, nur an einer anderen Oberfläche gegeben.

## Zahlen nachziehen

Nur wenn sich die Menge der Findings geändert hat, also wenn mindestens ein
Punkt nach `acknowledged` gewandert ist. Reine Zustandsvermerke ändern keine
Zahl und erzeugen keinen Verlaufseintrag.

Gerechnet wird nichts von Hand. Gebaut wird in jedem Fall:

```bash
node ~/.claude/skills/js-ts-project-audit/scripts/build-report.mjs build "$TMP/audit-data.json" --out ./audit.html
```

Hat sich die Menge der Findings geändert, zusätzlich `--record github-sync`:
dann bekommt der Verlauf einen Punkt, der als Neuberechnung ohne frische
Prüfung am Code markiert ist. Dazu `summary.lastRun: {source: "github-sync",
date: "<heute>"}`. Reine Zustandsvermerke bauen die Seite neu, ohne
Verlaufspunkt und ohne `lastRun`.

Meldet `build` Fehler, entsteht keine Datei: Datensatz korrigieren, neu
bauen.

## Konfliktregeln

Wer gewinnt, wenn beide Seiten etwas zu sagen haben:

| Gegenstand | Gewinner | Anmerkung |
| --- | --- | --- |
| Fundstelle, Beschreibung, Empfehlung, Severity, Effort | Report | Body und Labels werden nachgezogen |
| Body, der von Hand bearbeitet wurde | Mensch | erkannt am abweichenden `bodyHash`; statt zu überschreiben wird kommentiert |
| Titel des Issues | Mensch, sobald er ihn geändert hat | erkannt am Vergleich mit `titleEn` aus der Sidecar-Datei; sonst zieht der Report nach, aber nur bei geänderter Substanz |
| Zustand: offen, geschlossen, Resolution, Zuweisung | GitHub | wandert ins Feld `github` |
| Kommentare am Issue | Mensch, ausschließlich lesend | dieser Lauf löscht und bearbeitet keine Kommentare |
| Labels der eigenen Namensräume | Report | Severity-Wechsel ersetzt das Label, es sammelt sich nichts an |
| Alle übrigen Labels | Mensch | unangetastet; ein handgesetztes `wontfix` wird als Signal gelesen |

## Was in die gerenderte Seite kommt

Ausschließlich Datenwerte. Die Seite stellt das Template des Audit-Skills
aus dem Feld `github` dar: den Link `#142` in der Metazeile jeder
Backlog-Zeile und Karte, gedämpft mit Vermerk, wenn das Issue geschlossen ist;
`note` und `assignee` im aufgeklappten Bereich; den Link hinter dem `reason`
im Anhang. Auch ein Report aus einem älteren Audit-Lauf bekommt diese Stellen,
weil der Build ihn mit dem aktuellen Template neu erzeugt. Am Markup wird
nichts ergänzt.

## Was hier nicht passiert

| Versuchung | Warum nicht |
| --- | --- |
| »Das Issue ist geschlossen, also raus aus dem Backlog« | Der Report benotet keine Behauptung. Der nächste Audit-Lauf prüft am Code. |
| »Ich schreib den Verlauf der Diskussion ins Finding« | Der Link trägt das Detail. Ein Report, der Issue-Threads spiegelt, ist beim nächsten Rendern veraltet. |
| »Die Severity passt nicht zu dem, was im Issue diskutiert wird« | Severity gehört dem Audit. Wer sie hier ändert, erzeugt einen Score, den der nächste Lauf nicht reproduziert. |
| »Ich lege das Finding gleich neu an, das Issue beschreibt es besser« | Findings entstehen aus Code, nicht aus Issue-Text. Neue Befunde gehören in den nächsten Audit-Lauf. |
| »Ich räum die alten `audit`-Labels auf fremden Issues auf« | Was dieser Lauf nicht angelegt hat, gehört jemand anderem. |
