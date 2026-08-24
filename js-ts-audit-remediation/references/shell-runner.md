# Die Shell-Schleife — der zweite Weg durch Schritt 6

Schritt 6 der `SKILL.md` enthält kein Urteil: oberstes offenes Paket finden,
Brief bauen, warten, Rückgabe lesen, Hash und Exit-Code prüfen, eine Zeile
ausgeben, weiter. `scripts/remediate.sh` tut genau das, als Prozess statt als
Agent. Alles, was ein Urteil verlangt, bleibt unangetastet: Schritt 1 bis 5
davor, Schritt 7 danach, und der Inhalt jedes Zuges in `references/runner.md`.

Der Agenten-Weg bleibt der Standard. Die Schleife lohnt sich, wenn ein Lauf
viele Pakete hat oder der Nutzer sie ausdrücklich will.

Was sie ändert, ist nicht die Arbeit, sondern wer sie beaufsichtigt. Ein Prozess
ist beendet oder nicht; es gibt keinen zweiten Kanal, in dem man nachfragen
könnte, und keine Möglichkeit, das Ende eines Pakets für gekommen zu halten,
weil es lange dauert.

## Starten

Im Wurzelverzeichnis des Zielprojekts, nachdem der Grobplan freigegeben ist:

```bash
<skill>/scripts/remediate.sh            # bis kein Paket mehr offen ist
<skill>/scripts/remediate.sh --once     # nach einem Runner anhalten
<skill>/scripts/remediate.sh --dry-run  # beide Briefe zeigen, nichts starten
```

Branch und Arbeitsverzeichnis liest das Skript aus dem Kopf des Plans, nicht aus
der Umgebung: der Plan ist die Wahrheit, auch für die Schleife. Sie startet
nicht, wenn der ausgecheckte Branch ein anderer ist, wenn der Arbeitsbaum nicht
sauber ist, wenn ein Paket auf `[~]` steht oder wenn schon eine Schleife läuft.

| Exit | Heißt | Was folgt |
| --- | --- | --- |
| 0 | Kein Paket mehr offen | Schritt 7, `references/semver-and-closeout.md` |
| 10 | Ein Runner legt dem Nutzer etwas vor | Antwort datiert in »Entscheidungen«, dann erneut starten |
| 11 | Ein Paket steht auf `[~]` | `references/resume.md`, nicht dieses Skript |
| 20 | Die Rückgabe passt nicht zum Repo | Plan und `git log` ansehen. Nicht blind wiederholen |
| 21 | Ein Runner hing an einer Rechteschranke | Die Allowlist ist zu eng, nicht das Paket zu schwer |
| 30 | Der Runner-Prozess selbst ist gescheitert | `paket-N.*.stderr` im Arbeitsverzeichnis |
| 40 | Eine Vorbedingung stimmt nicht | Die Meldung sagt, welche |

Entstehen im Abschluss neue Pakete — die Drain-Runde schneidet welche —, läuft
das Skript danach noch einmal. Es fasst den Abschluss selbst nie an.

## Deine Rolle, wenn du beauftragt wurdest

Ein Paket läuft in zwei Prozessen statt in einem. Die Trennung liegt zwischen
Zug 0 und Zug 1:

- **A** führt Zug 0 aus: Abgleich der Findings am aktuellen Code, Triage der
  Folgen und der offenen Befunde, Detailplan, Restplan prüfen. Danach steht das
  Paket auf `[~]`, und A hört auf. **A schreibt keine Zeile Projektcode und
  startet keinen Implementierer.**
- **B** führt die Züge 1 bis 5 aus: Implementierer beauftragen, Report
  entgegennehmen, Review, Fehlerkette, Verify, Commit, Plan fortschreiben.
  **B wiederholt Zug 0 nicht.** Der Detailplan steht unter dem Paket; er ist
  Stunden alt, nicht Tage.

Alles Inhaltliche zu diesen Zügen steht in `references/runner.md`. Dieser Text
sagt nur, welchen Ausschnitt davon du hast.

Die Teilung hat einen Grund, der über die Kosten hinausgeht: sie macht die Mitte
eines Pakets sichtbar. Stirbt ein einzelner Runner in Zug 3, weiß niemand, ob
Zug 0 je stattgefunden hat. Mit der Teilung sagt es die Marke im Plan.

## Deine Rückgabe

Statt der neun Zeilen aus `runner.md` gibst du ein JSON-Objekt nach
`assets/runner-return.schema.json` zurück. Die Felder sind dieselben, die
Statuswerte sind englisch, weil sie in einer Shell-Verzweigung landen:

| Im JSON | Im Plan | Wer gibt das zurück |
| --- | --- | --- |
| `planned` | Paket auf `[~]`, Detailplan steht | nur A |
| `committed` | Paket auf `[x]`, Hash eingetragen | nur B |
| `dropped` | Paket auf `[x]`, »Ergebnis: entfallen« | A oder B |
| `blocked` | Paket auf `[!]`, Arbeitsbaum im Stash | A oder B |
| `question` | unverändert, der Nutzer entscheidet | A oder B |

Die Prüffrage aus `runner.md` gilt unverändert und ist hier wichtiger als dort:
**was weiß ich über dieses Paket, das nicht in `./remediation-plan.md` steht?**
Zwischen A und B liegt ein Prozesswechsel, und über ihn kommt nichts als die
Datei. Was A nicht hineinschreibt, hat B nie erfahren.

## Was die Schleife nachprüft

Nicht als Misstrauen, sondern weil eine Behauptung und ein Beleg zwei Dinge
sind. Fällt eine dieser Proben, endet der Lauf mit Exit 20:

- Die Marke deines Pakets im Plan steht auf dem, was dein Status behauptet.
- Bei `committed`: der Hash existiert, er ist `HEAD`, und `HEAD` hat sich seit
  deinem Start bewegt.
- Bei `committed`: die Datei aus `verify_log` liegt im Arbeitsverzeichnis und
  enthält die Zeile `exit=0`.
- Bei `committed`: du hast mindestens zwei Subagenten gestartet. Implementierer
  und Reviewer sind zwei, und ein Runner schreibt keinen Projektcode selbst.
  Das wird gezählt, nicht geglaubt.
- Die Paketnummer in deiner Rückgabe ist die aus deinem Auftrag.
- Kein Aufruf ist an einer Rechteschranke gescheitert.

Bleibt nach deinem Commit etwas im Arbeitsbaum liegen, gibt es eine Warnung und
der Lauf geht weiter. Der nächste Diff enthält es dann mit.

## Zwei Dinge, die du anders machst als in `runner.md`

1. **Der Exit-Code gehört ins Log, nicht nur ins Terminal.** Ein Prozess liest
   deine Terminalausgabe nicht.

   ```bash
   set -o pipefail
   <verify-kommando> > "$ARBEITSDIR/paket-N.verify.log" 2>&1; echo "exit=$?" | tee -a "$ARBEITSDIR/paket-N.verify.log"
   ```

2. **Du nennst den Pfad dieses Logs in `verify_log`**, absolut und im
   Arbeitsverzeichnis. Ohne ihn gibt es nichts nachzulesen.

## Modell und Effort

Zwei Prozesse, zwei Paare von Stellschrauben. Beide über die Umgebung
überschreibbar:

| Rolle | Modell | Effort | Warum |
| --- | --- | --- | --- |
| **A** — Zug 0 | `MODEL_A=opus` | `EFFORT_A=xhigh` | Hier fällt jedes Urteil, das den Rest des Laufs trägt: ob ein Finding noch existiert, ob eine Folge ein Symptom ist, wie der Restplan geschnitten wird. Ein Fehler hier schlägt auf jedes weitere Paket durch. |
| **B** — Züge 1–5 | `MODEL_B=opus` | `EFFORT_B=medium` | Beauftragen, Report lesen, Diff erzeugen, verifizieren, committen. Buchhaltung mit einer einzigen Urteilsstelle, der Fehlerkette. |

Warum B nicht auf `low` läuft, obwohl es für sich genommen reichte: **die
Subagenten erben den Effort.** Modelle setzt B je Subagent ausdrücklich, nach
der Dreistufen-Tabelle in `runner.md`; für den Effort gibt es diesen Schalter
nicht. `EFFORT_B=low` senkt damit still auch den Implementierer, der die
eigentliche Arbeit macht. Wer hier spart, spart am falschen Ende, und es sieht
nicht danach aus.

Sparen lässt sich woanders, gründlicher: die Gegenprobe kostet gar kein Modell
mehr. Sie war ein Zug des Orchestrators auf der stärksten Stufe und ist jetzt
ein `grep` und zwei Vergleiche. Das ist der billigste Effort, den es gibt.

Bleibt der Lauf trotzdem zu teuer, ist `MODEL_B=sonnet` die erste Schraube und
`BUDGET_USD` die harte Grenze je Prozess. `MODEL_A` bleibt, wo es ist.

## Was die Schleife nicht tut

Sie plant nicht, sie schneidet keine Pakete, sie beantwortet keine Rückfrage,
sie bewertet nicht nach Semver, sie fasst die `./audit.html` nicht an, und sie
pusht nicht. Sie zählt Marken und prüft zwei Werte. Alles andere ist genau der
Grund, warum vor ihr und nach ihr ein Agent steht.
