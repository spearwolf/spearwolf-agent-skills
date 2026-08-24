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

Gestartet wird auf der Maschine, auf der der Arbeitsbaum liegt, und dort läuft
auch alles: die Schleife, beide Runner je Paket, deren Subagenten und jeder
Verify-Lauf. Nichts davon wird anderswo gestartet — kein zweiter Klon, keine
Session in einer fremden Umgebung. Die Runner teilen sich einen Arbeitsbaum, und
genau deshalb läuft nie einer parallel zum anderen.

Wer den Lauf von unterwegs verfolgen und die Rückfragen hinter Exit 10
beantworten will, startet die umgebende Session mit Remote Control
(`claude --remote-control`). Das verlagert die Unterhaltung, nicht die
Ausführung. Dem Skript ist es gleichgültig: es druckt nach stdout und gibt
Exit-Codes zurück, und wer das liest, ist nicht seine Sache.

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
| 31 | Die API blieb überlastet | Nichts ist kaputt, nichts hat sich bewegt: später erneut starten |
| 40 | Eine Vorbedingung stimmt nicht | Die Meldung sagt, welche |

Entstehen im Abschluss neue Pakete — die Drain-Runde schneidet welche —, läuft
das Skript danach noch einmal. Es fasst den Abschluss selbst nie an.

## Wenn die API überlastet ist

Ein langer Lauf trifft irgendwann auf ein `529`. Drei Ebenen liegen dagegen
übereinander, und nur die dritte gehört diesem Skript.

Die CLI fängt vorübergehende Fehler selbst ab; was hier ankommt, hat das bereits
überlebt. `--fallback-model` wäre die zweite Ebene, ist aber nicht voreingestellt:
ein Runner, der still auf ein schwächeres Modell wechselt, liefert weiterhin ein
Ergebnis, und bei A wäre das ein Urteil über Paketschnitt und Triage, auf dem
jedes Folgepaket aufbaut. Lieber warten als unbemerkt schwächer werden. Wer es
anders will, setzt `FALLBACK_MODEL`.

Die dritte Ebene ist die Schleife. Scheitert ein Runner, wartet sie und startet
ihn neu — `ATTEMPTS=3` Versuche, `BACKOFF=60,300,900` Sekunden dazwischen, also
gut zwanzig Minuten Geduld. Beides über die Umgebung einstellbar.

**Wiederholt wird nur, was nichts hinterlassen hat.** Vor jedem Start nimmt die
Schleife einen Fingerabdruck aus drei Werten: `HEAD`, der Zustand des
Arbeitsbaums und der Plan. Ist ein Runner an der überlasteten API gescheitert,
ohne einen davon zu bewegen, gibt es nichts, worin ein Neuversuch aufsetzen
könnte — er ist ein Neustart und kein Fortsetzen. Hat sich einer bewegt, wird
nicht wiederholt, sondern angehalten: das ist der `[~]`-Fall mit halber Arbeit im
Baum, und darüber entscheidet nach `references/resume.md` der Nutzer.

**Was als Überlastung zählt**, entscheidet das Feld `api_error_status` im
Ergebnis-JSON (`429`, `500`, `502`, `503`, `529`). Nur wenn der Prozess gar kein
lesbares JSON hinterlassen hat, sieht die Schleife in seine Fehlerausgabe, und
das Muster dort ist bewusst eng: eines, das auf das bloße Wort anspringt,
wiederholt auch Fehler, die keine sind. Ein erschöpftes Budget ist keine
Überlastung und wird nie wiederholt — der nächste Versuch liefe in dieselbe
Grenze und zahlte sie noch einmal.

**Exit 31 heißt: warte länger, nicht: repariere etwas.** Weil der Plan den Stand
trägt, ist ein Neustart des Skripts identisch mit einem Fortsetzen. Für einen
unbeaufsichtigten Lauf reicht deshalb:

```bash
until <skill>/scripts/remediate.sh; do
  [ $? -eq 31 ] || break     # alles andere braucht einen Menschen
  sleep 600
done
```

Die Grenze dieses Netzes: es umspannt den Runner-Prozess, nicht die Subagenten
darin. Stirbt ein Implementierer an derselben Überlastung, sieht das B und
behandelt es über die Fehlerkette; kommt es damit nicht durch, gibt es
`blocked` zurück und die Schleife hält an. Das ist richtig so — ein halb
umgesetztes Paket auf einer überlasteten API repariert kein Neuversuch.

## Was ein Runner in die Hand bekommt

Zwei verschiedene Dinge, die leicht in einen Topf geraten: **welche Werkzeuge es
gibt** und **welche Aufrufe eine Freigabe brauchen**.

**Die Werkzeugfläche** schränkt die Schleife ein. Sie entzieht jedem Runner per
`--disallowedTools` die Werkzeuge, die einen zweiten Kanal aufmachen oder den
Prozess überdauern würden:

```
AskUserQuestion · SendMessage · SendUserFile · PushNotification
ScheduleWakeup · CronCreate · Artifact
```

Der Grund steht schon im Brief, aber im Text hat er sich als nicht haltbar
erwiesen: die Rückgabe ist der einzige Kanal, und ein Runner, der sich selbst
einen Weckruf legt, überlebt seinen Prozess — womit die Terminierung wieder eine
Ermessensfrage wäre. `AskUserQuestion` ist der wichtigste Eintrag: in einem
`-p`-Prozess sitzt niemand, der antworten könnte, und der vorgesehene Weg für
»hier muss jemand entscheiden« ist der Status `question`, aus dem die Schleife
Exit 10 macht. Über `DENY_TOOLS` lässt sich die Liste ändern.

### Wer darf den Nutzer noch fragen

Die Liste betrifft ausschließlich die Runner, die dieses Skript startet. Der
Agent, der Schritt 1 bis 5 fährt — Findings laden, Scope klären, Entscheidungen
einholen, Grobplan vorlegen —, wird von der Schleife gar nicht gestartet. Er ist
eine gewöhnliche Session und behält jedes Werkzeug, das er sonst hat. Genau dort
liegt die Klärungsrunde, und sie ist unangetastet.

Runner A plant ebenfalls, aber nur ein Paket, und für ihn galt die Regel schon
immer: `runner.md` schickt ihn bei einer Rückfrage nicht zum Nutzer, sondern in
die Rückgabe — »hier änderst du nichts, sondern schreibst deinen Vorschlag in die
Rückgabe und brichst ab«. Die Verbotsliste nimmt ihm also nichts, was der
Entwurf ihm je gegeben hätte; sie macht die Regel bloß unumgehbar.

Sein Weg ist der Status `question`. Daraus macht die Schleife Exit 10, druckt
`for_you`, schreibt es ins Journal und hält an. Der Nutzer trägt die Antwort
datiert in »Entscheidungen« ein, startet das Skript neu, und ein frischer A
beginnt das Paket mit der Antwort im Rücken.

Das ist nicht nur ein Ersatz, sondern der bessere Weg: eine Antwort im Dialog
lebte im Kontext eines Prozesses, der ohnehin endet. Eine Zeile in
»Entscheidungen« überlebt den Lauf und verhindert, dass ein späteres Paket
dieselbe Frage noch einmal aufwirft. Der Preis ist ein neuer Zug 0 für dieses
eine Paket — derselbe Preis wie auf dem Agenten-Weg, und Zug 0 ändert keine
Zeile Code.

Weil die Frage den Prozess überleben muss, gehört sie außerdem in den Plan.
Terminal und Journal reichen für einen beaufsichtigten Lauf; wer über Nacht
laufen lässt, findet am Morgen den Plan vor und nicht die Bildschirmausgabe.

### Drei Eigenschaften der Verbotsliste

Gemessen und nicht vermutet:

- Ein Name, den es in dieser Umgebung gar nicht gibt, stört nicht. Die Liste darf
  deshalb Werkzeuge nennen, die nur mancher Host anbietet.
- Ein entzogenes Werkzeug ist **keine** abgelehnte Berechtigung: `permission_denials`
  bleibt leer. Eine zu strenge Liste läuft also nicht in Exit 21, sondern in einen
  Runner, der `blocked` oder `KONTEXT_FEHLT` meldet.
- Es ist ein Boden, kein Zaun. Eine Verbotsliste kennt nur, was es beim Schreiben
  gab; für alles Weitere gilt weiterhin der Satz im Brief.

**Die Berechtigungen** sind davon unabhängig, und hier liegt die Falle:
`--permission-mode acceptEdits` deckt Dateiänderungen ab, **Bash aber nicht**.
Gemessen: unter `acceptEdits` allein wurden `git add` und `git commit`
abgefragt, und ein Prozess ohne Terminal kann nicht antworten — der Runner käme
nie bis zum Commit. Deshalb reicht die Schleife eine Allowlist mit:

```
Bash(git *) · Bash(npm *) · Bash(pnpm *) · Bash(yarn *) · Bash(node *)
```

Fährt das Zielprojekt seine Verify-Kommandos anders — `make`, `cargo`, ein
eigenes Skript —, gehört das über `ALLOW_TOOLS` ergänzt. Merkt man sonst beim
ersten Paket, an Exit 21.

`Bash(git *)` schließt Kommandos ein, die dieser Lauf nicht kennt. Sie stehen
deshalb in der Verbotsliste, die Vorrang hat: `git push`, `git tag`,
`npm publish` und die Geschwister. »Kein Push, kein Tag, kein Publish« aus den
Grenzen des Laufs ist damit keine Bitte mehr.

### Welcher Permission-Modus

| Modus | Gemessen | Taugt für die Schleife |
| --- | --- | --- |
| `acceptEdits` | Änderungen laufen durch, Bash nicht — mit der Allowlist oben vollständig | **ja**, die Voreinstellung |
| `auto` | Lesende Aufrufe laufen durch, ein gewöhnlicher `Edit` wurde abgelehnt | nein |
| `bypassPermissions` | fragt nichts | nur wenn man auf jede Schranke verzichten will |

`auto` ist ein Klassifikator: er urteilt über jeden Aufruf anhand von Regeln,
die `claude auto-mode defaults` ausgibt. Der Modus ist als Wert gültig und
`PERM=auto` läuft, nur trägt er keinen unbeaufsichtigten Lauf — was er nicht von
sich aus erlaubt, will er freigegeben haben, und dafür ist niemand da. Im
Versuch endete das damit, dass ein Runner höflich um Erlaubnis bat und nichts
committete.

Als Leitplanke ist er trotzdem bemerkenswert nah an diesem Skill: seine
Verbotsliste nennt Force-Push, das Umschreiben entfernter Historie und das
Entfernen von Sicherheitstests — alles Dinge, die `runner.md` ohnehin untersagt.
Er kann nur nicht gewähren, und Gewähren ist hier die Aufgabe.

`bypassPermissions` würde laufen, aber dann feuert Exit 21 nie, und ein Kommando,
das aus dem Ruder läuft, hat nichts mehr vor sich. Wer den Lauf unbeaufsichtigt
über Nacht stellt, will die Schranke behalten, die ihn am nächsten Morgen
erklärt.

**Was in der eigenen Umgebung tatsächlich anliegt**, findet man nicht dadurch
heraus, dass man ein Modell nach seinen Werkzeugen fragt: zwei Läufe derselben
Frage haben hier zwei verschiedene Listen genannt. Verlässlich ist nur das
Verhalten — `--once` auf dem ersten Paket sagt es in einem Zug.

## Deine Rolle, wenn du beauftragt wurdest

Ein Paket läuft in zwei Prozessen statt in einem. Die Trennung liegt zwischen
Zug 0 und Zug 1:

- **A** führt Zug 0 aus: Abgleich der Findings am aktuellen Code, Triage der
  Folgen und der offenen Befunde, Detailplan, Restplan prüfen. In den Detailplan
  gehört auf diesem Weg eine Zeile mehr: `- Effort:`, siehe unten. Danach steht
  das Paket auf `[~]`, und A hört auf. **A schreibt keine Zeile Projektcode und
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

Zwei Regler mit zwei verschiedenen Fragen. Das Modell entscheidet, wie viel
Wissen und Urteilskraft im Raum ist; der Effort, wie lange darüber nachgedacht
werden darf. Beide gelten je Prozess, und Prozesse gibt es hier genau zwei.

| Rolle | Modell | Effort | Warum |
| --- | --- | --- | --- |
| **A** — Zug 0 | `MODEL_A=opus` | `EFFORT_A=xhigh` | Existiert das Finding noch, ist die Folge ein Symptom oder ein eigenes Paket, muss der Restplan anders geschnitten werden. Die härtesten Entscheidungen des Laufs, einmal je Paket und ohne eine Zeile Code. |
| **B** — Züge 1–5 | `MODEL_B=opus` | aus dem Detailplan, sonst `EFFORT_B=medium` | B beauftragt, liest zwei Reports, fährt Verify, committet. Die einzige echte Entscheidung ist die Fehlerkette, und die hat den Befund im Wortlaut vor sich. |

**Der Effort von B ist der Effort seiner Subagenten.** Modelle setzt B je
Subagent ausdrücklich, nach der Dreistufen-Tabelle in `runner.md`; für den Effort
gibt es diesen Schalter nicht, die Subagenten erben ihn vom Prozess. Der Wert
entscheidet damit nicht über B, sondern über Implementierer und Reviewer, also
über die beiden Rollen mit den meisten Zügen und den meisten gelesenen Dateien.

Deshalb setzt **A** ihn und nicht die Umgebung: A hat den Code gesehen und weiß,
was dieses Paket verlangt. Eine Zeile im Detailplan, neben `- Modell:`:

```markdown
- Effort: low
```

| Wert | Wenn das Paket … |
| --- | --- |
| `low` | … ein exakter Auftrag ist. Signaturen, Werte und Schritte stehen im Detailplan; das ist näher an Transkription als an Entwurf. |
| `medium` | … ein gewöhnlicher Bugfix mit Regressionstest ist, ein Modul umbaut, Typen schärft. Der Vorgabewert, wenn die Zeile fehlt. |
| `high` | … Nebenläufigkeit, Sicherheit oder die öffentliche API berührt, oder der Blast Radius unklar ist. Auch dann, wenn der Reviewer der eigentliche Grund ist: Review ist Deliberation, und er erbt denselben Wert. |

Für das Modell gilt weiterhin »im Zweifel eine Stufe höher«. Für den Effort gilt
das ausdrücklich **nicht**. Bei einem exakten Auftrag ist mehr Nachdenken nicht
besser, sondern teurer und planferner: hoher Effort auf einer Transkription
erhöht die Neigung, Dinge zu verbessern, die nicht im Detailplan stehen, und
genau das verbietet dieser Skill an mehreren Stellen. Ein Implementierer auf
`low` ist nicht nur billiger, er ist folgsamer.

Heruntergedreht wird A nicht. Ein Fehlurteil in Zug 0 multipliziert sich über
jedes Folgepaket, und Zug 0 ist gemessen an seiner Wirkung der billigste Zug im
ganzen Lauf.

Der gründlichste Schnitt liegt ohnehin woanders: die Gegenprobe kostet gar kein
Modell mehr. Sie war ein Zug des Orchestrators auf der stärksten Stufe und ist
jetzt ein `grep` und zwei Vergleiche. Wer bei den einfachen Dingen sparen will,
nimmt ihnen das Modell weg, statt ihnen ein schwächeres zu geben.

Bleibt der Lauf trotzdem zu teuer, ist `MODEL_B=sonnet` die erste Schraube und
`BUDGET_USD` die harte Grenze je Prozess. `MODEL_A` bleibt, wo es ist.

## Was die Schleife nicht tut

Sie plant nicht, sie schneidet keine Pakete, sie beantwortet keine Rückfrage,
sie bewertet nicht nach Semver, sie fasst die `./audit.html` nicht an, und sie
pusht nicht. Sie zählt Marken und prüft zwei Werte. Alles andere ist genau der
Grund, warum vor ihr und nach ihr ein Agent steht.
