# Wiederaufnahme

Gilt, wenn beim Start ein `./remediation-plan.md` im Projekt liegt — gleich ob
der Nutzer die Fortsetzung ausdrücklich verlangt (»nimm die Arbeit am Plan
wieder auf«, »führe fort«) oder scheinbar von vorn anfängt (»arbeite die
Findings ab«). Die Datei entscheidet, nicht der Wortlaut der Bitte. Bevor
irgendetwas anderes passiert: Datei ganz lesen und `git log --oneline`
dagegenhalten. Beides zusammen kostet zwei Aufrufe.

Warum ein Lauf steht, spielt für diesen Text fast keine Rolle. Die Schleife ist
an einem Exit-Code angehalten, der Nutzer hat die tmux-Session abgeräumt, die
Maschine ist neu gestartet, eine Session ist ohne Abschied gestorben — der
Stand steht in jedem dieser Fälle an derselben Stelle, im Plan und in
`git log`. Gefragt wird nach dem Grund erst, wenn Plan und Repo einander
widersprechen.

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
| `[ ]` | offen | hier setzt die Schleife auf; fortgesetzt wird mit `scripts/remediate.sh` |
| `[!]` | bewusst blockiert, Arbeitsbaum im Stash | **nicht** stillschweigend neu versuchen — erst fragen, ob und wie |
| `[~]` | ein Runner ist mitten im Paket gestorben | siehe unten |

## Läuft noch eine Schleife?

Die zweite Frage nach den Marken, und sie kommt vor jeder Handlung. Ein zweiter
`scripts/remediate.sh` auf demselben Arbeitsbaum ist kein zweites Tempo, sondern
zwei Runner, die einander die Dateien unter den Händen wegschreiben. Das Skript
weigert sich zwar selbst (Vorbedingung, Exit 40), aber ein Agent, der es blind
startet, hat dem Nutzer bis dahin nichts gesagt.

| Blick | Was er zeigt |
| --- | --- |
| `tmux ls` | eine Session `remediate-<projekt>` heißt: sie lebt |
| `tail -n 5 <arbeitsdir>/remediate.log` | die Zeile `ende exit=N` heißt: sie ist durch |
| `tmux capture-pane -p -t <session>:0` | woran sie gerade hängt |

Der `<arbeitsdir>` steht im Kopf des Plans. Fehlt das Journal, ist der Lauf nie
über Schritt 5 hinausgekommen oder das Verzeichnis wurde aufgeräumt; dann
entscheiden allein Marken und `git log`.

**Session lebt, Journal ohne `ende`.** Nichts starten. Dem Nutzer sagen, was das
Pane zeigt, und ihn entscheiden lassen: anhängen und weitermachen, oder
`tmux kill-session` und danach hier weiterlesen. Häng dich nicht selbst an — dort
sitzt er. Häufigster Fall: der Lauf wartet seit Stunden in einem `p<N>-plan`-
Fenster auf eine Antwort, die niemand gegeben hat, und der Nutzer hält das für
einen Abbruch.

**Journal endet mit `ende exit=N`.** Die Zahl sagt, was fehlt, und die Tabelle
dazu steht in `references/shell-runner.md`. Sie ist ohnehin zu lesen, bevor das
Skript wieder startet. Kurz: `10` will eine Entscheidung, die datiert nach
»Entscheidungen« gehört; `11` ist der `[~]`-Fall unten; `31` will nur Zeit; `20`,
`21`, `30` und `40` wollen, dass jemand hinsieht, bevor derselbe Aufruf ein
zweites Mal dasselbe tut.

**Keine Session, kein `ende`.** Die Schleife ist mitten im Satz gestorben — mit
dem Terminal, mit der Maschine, mit `kill`. Dann gilt, was Marken und
`git status` sagen, und sonst nichts.

**Fortgesetzt wird mit demselben Kommando**, mit dem der Lauf begonnen hat:
`<skill>/scripts/remediate.sh`. Der Plan trägt den Stand, das Skript sucht sich
das oberste offene Paket, ein Neustart ist deshalb ein Fortsetzen. Was hier
ausdrücklich nicht passiert: ein Paket von Hand umsetzen, einen Runner selbst
beauftragen, einen Subagenten »nur für das eine kleine Ding« starten. Ein
abgebrochener Lauf ändert an dieser Grenze nichts — er ist der Anlass, an dem
sie am ehesten wegrationalisiert wird.

Stehen alle Pakete auf `[x]` und ist nur der Abschluss offen, wird das Skript
gar nicht mehr gestartet, sondern unten unter »Offene Befunde« weitergelesen.

## Ein Paket auf `[~]`

Der Detailplan steht, ein Commit fehlt. Sein `Verlauf:` sagt, wie weit der
Runner kam, `git status` sagt, ob das noch stimmt. Beides wird gegeneinander
gehalten, keins allein geglaubt.

**Sauberer Baum, Verlauf endet nach Zug 0.** Es ist nichts verloren. Paket auf
`[ ]` zurücksetzen — das Skript fährt es dann wieder ab Zug 0, und dessen
Abgleich fängt ab, was sich inzwischen bewegt hat. Solange irgendwo noch ein
`[~]` steht, startet es gar nicht (Exit 11).

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
