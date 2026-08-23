# Wiederaufnahme

Gilt, wenn beim Start ein `./remediation-plan.md` im Projekt liegt. Bevor
irgendetwas anderes passiert: Datei ganz lesen und `git log --oneline`
dagegenhalten. Beides zusammen kostet zwei Aufrufe.

Passt der Kopf nicht zu Audit-Quelle und Branch, gehört der Plan zu einem
anderen Lauf. Dann fragen, nicht überschreiben.

## Was gilt

Der Plan und `git log` schlagen die Erinnerung. Ein Paket mit Hash im Plan ist
erledigt, auch wenn niemand sich daran erinnert. Existiert der Hash in
`git log` nicht, ist der Plan falsch und der Nutzer entscheidet, bevor
irgendetwas läuft.

| Marke | Bedeutung | Was folgt |
| --- | --- | --- |
| `[x]` | erledigt, Hash steht | überspringen |
| `[ ]` | offen | hier einsteigen, Runner starten |
| `[!]` | bewusst blockiert, Arbeitsbaum im Stash | **nicht** stillschweigend neu versuchen — erst fragen, ob und wie |
| `[~]` | ein Runner ist mitten im Paket gestorben | siehe unten |

## Ein Paket auf `[~]`

Der Detailplan steht, ein Commit fehlt. Sein `Verlauf:` sagt, wie weit der
Runner kam, `git status` sagt, ob das noch stimmt. Beides wird gegeneinander
gehalten, keins allein geglaubt.

**Sauberer Baum, Verlauf endet nach Zug 0.** Es ist nichts verloren. Paket auf
`[ ]` zurücksetzen, neuer Runner, der bei Zug 0 beginnt. Sein Abgleich fängt
ab, was sich inzwischen bewegt hat.

**Schmutziger Baum.** Der Verlauf sagt, wessen Änderungen dort liegen und
welche Runden sie hinter sich haben. Das ist der Stand, den du dem Nutzer
vorlegst, zusammen mit der Frage, ob die Änderungen weiterverwendet oder
verworfen werden. Ohne diese Antwort läuft nichts.

**Widerspruch** — der Verlauf endet nach Zug 0, aber der Baum ist schmutzig,
oder umgekehrt, oder ein `[~]`-Paket hat gar keinen `Verlauf:`. Dann hat jemand
außerhalb des Laufs gearbeitet oder ein Zug hat seine Zeile nicht geschrieben.
Der Nutzer entscheidet über den Arbeitsbaum, bevor irgendetwas läuft.

## Offene Befunde

Der Abschnitt »Offene Befunde« im Kopf wird mitgelesen, auch wenn alle Pakete
auf `[x]` stehen. Steht dort ein `[ ]`, ist der Lauf nicht abgeschlossen,
sondern in Schritt 7 vor der Drain-Phase abgerissen. Dann wird nicht neu
geplant, sondern `references/semver-and-closeout.md` gelesen und dort begonnen.

Fehlt der Abschnitt ganz, stammt der Plan aus einem Lauf vor dieser Regel. Dann
sind die Nebenbefunde noch einzeln unter den Paketen verstreut: einmal
einsammeln, in den Abschnitt schreiben, und ab da gilt die Queue.

Dasselbe gilt für die Zeile `Scope-Regel:` im Kopf — der Satz, an dem jeder
Nebenbefund gemessen wird. Fehlt sie, wird sie nicht aus der `Scope:`-Zeile
erraten: dem Nutzer wird der Scope vorgelegt, und er sagt in einem Satz, was
mit Befunden geschieht, die im Audit nicht stehen. Eine Auswahl von Findings
lässt sich nicht rückwärts in eine Regel übersetzen, und was dabei danebengeht,
merkt niemand, bis der Lauf zu viel oder zu wenig behoben hat.

## Baseline

Der Kopf nennt die Verify-Kommandos wörtlich. Sie werden nicht neu aus
`package.json` zusammengesucht — sonst prüft der Lauf ab hier gegen etwas
anderes als vorher. Steht dort keine Baseline, wird sie nachgemessen und
eingetragen, bevor der erste Runner startet.

Ebenso das Arbeitsverzeichnis für Diffs und Logs. Fehlt die Zeile, wird sie
gesetzt; die alten Logs sind ohnehin weg, aber jeder Runner braucht den Pfad.
