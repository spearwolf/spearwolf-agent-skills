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

Ein Lauf beginnt nicht mit diesem Skript. Er beginnt wie immer in einer offenen
Session im Projekt — »arbeite die Findings aus dem Audit ab« —, und dort laufen
die Schritte 1 bis 5: Findings laden, Baseline messen, Scope klären, offene
Entscheidungen abfragen, Grobplan schreiben, Freigabe. Erst danach übernimmt das
Skript die Paketschleife, und am Ende geht es für Schritt 7 zurück in eine
Session.

```bash
<skill>/scripts/remediate.sh --tmux     # abgelöst starten und zurückkommen
<skill>/scripts/remediate.sh            # im aktuellen Terminal
<skill>/scripts/remediate.sh --once     # nach einem Runner anhalten
<skill>/scripts/remediate.sh --dry-run  # zeigen, was beauftragt würde
<skill>/scripts/remediate.sh --headless # Zug 0 ohne Terminal fahren
```

### Wer das Skript startet

**Du, der Agent aus Schritt 5, startest es mit `--tmux`**, sobald der Grobplan
freigegeben ist. Der Nutzer muss dafür kein Terminal öffnen; du rufst es über
Bash auf und bekommst sofort die Kontrolle zurück:

```
Läuft in tmux-Session »remediate-mein-projekt«.

  tmux attach -t remediate-mein-projekt   ansehen und antworten
  Ctrl-b d                                wieder ablösen, der Lauf läuft weiter
  tmux capture-pane -p -t remediate-…     hineinsehen, ohne anzuhängen
  tmux kill-session -t remediate-…        abbrechen

Mitschrift: .git/remediation/remediate.pane.log
Journal:    .git/remediation/remediate.log
```

Diese Zeilen gibst du dem Nutzer weiter, und damit ist deine Arbeit an der
Schleife getan. Sie läuft unabhängig von deiner Session weiter — schließt du
dich, läuft sie; stirbt dein Kontext, läuft sie.

Der Grund für tmux ist nicht Bequemlichkeit: eine abgelöste tmux-Session hat ein
echtes Pseudo-Terminal (gemessen: `stdin=ja stdout=ja tty=/dev/pts/0`). Ein
gewöhnlicher Hintergrundprozess hat keines, und ohne Terminal kann Zug 0 nicht
fragen. tmux ist damit das Einzige, was »abgelöst« und »fragt nach« gleichzeitig
erlaubt.

Fehlt tmux, sagt das Skript es und nennt die zwei Alternativen: in einer Shell
starten, oder `nohup … --headless &` ohne Rückfragen. `TMUX_BIN` zeigt auf ein
tmux an anderer Stelle, `SESSION` benennt die Session anders als nach dem
Projektverzeichnis.

**Vorbedingungen werden vor dem Ablösen geprüft.** Ein falscher Branch, ein
schmutziger Arbeitsbaum, ein fehlender Plan — das fällt sofort auf und nicht
erst in einer Session, in die niemand hineinsieht.

### Nachsehen, ohne anzuhängen

Drei Wege, alle ohne den Lauf zu stören:

| Wozu | Kommando |
| --- | --- |
| Was steht gerade im Pane | `tmux capture-pane -p -t <session>` |
| Was ist bisher passiert | `cat .git/remediation/remediate.log` |
| Die ganze Ausgabe | `cat .git/remediation/remediate.pane.log` |

Das Journal endet mit `ende exit=N`, sobald der Lauf durch ist. Solange die Zeile
fehlt, läuft er noch oder wartet auf eine Antwort.

### Zwei Modi für Zug 0

Die Planung eines Pakets ist die eine Stelle, an der ein Agent Dinge wissen muss,
die im Code nicht stehen. Deshalb läuft sie voreingestellt **in deinem Terminal**:

```
→ Runner A · Paket 2 · opus/xhigh · interaktiv
─────────────────────────────────────────────────────────────
  … eine gewöhnliche Claude-Session: deine MCP-Server, deine Skills,
    dein Werkzeugkasten, und sie kann dich fragen …
─────────────────────────────────────────────────────────────
  Detailplan steht
→ Runner B · Paket 2 · opus/medium
  a3f91c2 · LEAK-001 behoben · 1 Runde(n)
→ Runner A · Paket 3 · opus/xhigh · interaktiv
```

Du wirst am Anfang jedes Pakets gebraucht, meist ein paar Minuten. Die lange
Strecke danach — Implementierer, Review, Fehlerkette, Verify, Commit — läuft ohne
dich.

`PLAN_MODE=headless` (oder `--headless`) fährt Zug 0 ohne Terminal. Dann gibt es
kein Nachfragen: was der Planer nicht entscheiden kann, kommt als Status
`question` zurück und wird zu Exit 10. Das ist der Modus für einen Lauf, den
niemand begleiten soll, und er kostet genau das, was er spart.

Ohne Terminal startet der interaktive Modus gar nicht erst — die Meldung nennt
den Schalter. Mit `--tmux` stellt sich die Frage nicht: die Session bringt ihr
Terminal mit. Wer das Skript in eine `until`-Schleife steckt, will `--headless`.

### Vorbedingungen

Branch und Arbeitsverzeichnis liest das Skript aus dem Kopf des Plans, nicht aus
der Umgebung: der Plan ist die Wahrheit, auch für die Schleife. Sie startet
nicht, wenn der ausgecheckte Branch ein anderer ist, wenn der Arbeitsbaum nicht
sauber ist, wenn ein Paket auf `[~]` steht oder wenn schon eine Schleife läuft.

Gestartet wird auf der Maschine, auf der der Arbeitsbaum liegt, und dort läuft
auch alles. Nichts wird anderswo gestartet — kein zweiter Klon, keine Session in
einer fremden Umgebung. Die Runner teilen sich einen Arbeitsbaum, und genau
deshalb läuft nie einer parallel zum anderen.

Wer einen headless-Lauf von unterwegs verfolgen will, startet die umgebende
Session mit Remote Control (`claude --remote-control`). Das verlagert die
Unterhaltung, nicht die Ausführung.

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

Das hängt an der Rolle, und der Unterschied ist Absicht.

### Zug 0 im interaktiven Modus: alles

Das Skript startet ihn ohne `-p`, ohne Rückgabeschema, ohne Allowlist und ohne
Verbotsliste. Es ist deine Session: deine MCP-Server, deine Skills, deine
Einstellungen, `AskUserQuestion`. Weitergereicht wird nur, was in `EXTRA_ARGS`
steht, plus Modell und Effort.

Der Grund ist nicht Großzügigkeit. Ein Planer, der nicht nachfragen kann, plant
gegen einen Code-Stand, den er nur zur Hälfte versteht, und der Detailplan ist
das Dokument, gegen das anschließend alles gebaut wird. Ein Fehlurteil dort
schlägt auf jedes Folgepaket durch — das ist die teuerste Stelle im Lauf, um
sparsam zu sein.

Weil es keine Rückgabe zu parsen gibt, entscheidet die **Marke im Plan**, wie es
weitergeht:

| Marke danach | Heißt | Die Schleife |
| --- | --- | --- |
| `[~]` | Detailplan steht | fährt Zug 1–5 |
| `[x]` | alle Findings gegenstandslos | zählt das Paket ab, nächstes |
| `[!]` | bewusst blockiert | hält an, Exit 10 |
| unverändert `[ ]` | Zug 0 ist nicht durchgelaufen | hält an, Exit 10 |

Das ist keine Notlösung. Die Marke war ohnehin die Wahrheit, die Rückgabe war
immer nur ihre Behauptung.

### Zug 1–5: der Prozess bekommt viel, es fehlt nur, was ihn aufhält

B läuft headless. Zwei Listen wirken dort, und beide zusammen sind kürzer, als
sie klingen.

**Die Allowlist erweitert**, sie zäunt nicht ein. Gemessen: mit `Bash(git *)` als
einzigem Eintrag liefen `echo` und `python3 --version` trotzdem. Sie hebt gezielt
an, was `--permission-mode acceptEdits` nicht abdeckt — Bash nämlich —, und nimmt
nichts weg:

```
Bash(git *) · Bash(npm *) · Bash(pnpm *) · Bash(yarn *) · Bash(node *) · Bash(claude *)
```

Fährt das Zielprojekt seine Verify-Kommandos anders — `make`, `cargo`, ein
eigenes Skript —, gehört das über `ALLOW_TOOLS` ergänzt. Merkt man sonst beim
ersten Paket, an Exit 21.

**Die Verbotsliste** nimmt nur, was die eine Zusage bräche, auf der die Schleife
ruht: dass ein beendeter Prozess ein fertiges Paket bedeutet.

| Entzogen | Weil |
| --- | --- |
| `AskUserQuestion` | wartet auf eine Antwort, die in einem Prozess ohne Terminal nie kommt. In `-p` gibt es das Werkzeug ohnehin nicht — der Eintrag ist der Gürtel zum Hosenträger |
| `SendMessage` | dito, sobald ein Runner auf eine Erwiderung wartet |
| `ScheduleWakeup`, `CronCreate` | legen Arbeit an, die den Prozess überlebt |
| `Bash(git push*)`, `Bash(git tag*)`, `Bash(npm publish*)` | kennt dieser Lauf laut `SKILL.md` nicht |

`PushNotification`, `SendUserFile` und `Artifact` stehen bewusst **nicht** dort:
sie reichen etwas hinaus, ohne zu warten und ohne den Prozess zu überdauern.
`DENY_TOOLS=""` schaltet auch den Rest ab.

Zwei Eigenschaften, gemessen: ein Name ohne Entsprechung stört nicht, und ein
entzogenes Werkzeug ist keine abgelehnte Berechtigung — `permission_denials`
bleibt leer, eine zu strenge Liste läuft also nicht in Exit 21, sondern in einen
Runner, der `blocked` meldet.

**Welcher Permission-Modus**, gemessen:

| Modus | Verhalten in `-p` | Taugt |
| --- | --- | --- |
| `acceptEdits` | Änderungen laufen durch, Bash erst mit der Allowlist oben | **ja**, die Voreinstellung |
| `auto` | Lesendes läuft durch, ein gewöhnlicher `Edit` wurde abgelehnt | nein |
| `bypassPermissions` | fragt nichts | nur ohne jede Schranke |

`auto` ist ein Klassifikator und als Leitplanke nah an diesem Skill — seine
Verbotsliste nennt Force-Push, entfernte Historie, das Entfernen von
Sicherheitstests. Gewähren kann er nur nicht, und Gewähren ist hier die Aufgabe.

### Implementierer und Reviewer: eigene Prozesse

**Du startest sie als eigene `claude -p`-Prozesse, nicht als Subagenten.** Das
weicht von `runner.md` ab und gilt nur auf diesem Weg.

Der Grund ist Reichweite. In einem Subagenten ist ein MCP-Server in der Regel
nicht exponiert — `testing-on-mac-safari` hält das seit Juli fest, und ein
Implementierer, der den Browser des Projekts nicht erreicht, ist für die Hälfte
aller Pakete nutzlos. Ein eigener Prozess erbt die Konfiguration wie jede andere
Session.

Was dabei zu tun ist:

- Den Brief wie gehabt bauen, dann `claude -p "<brief>" --model <stufe>
  --output-format json` über Bash starten und die Ausgabe **als Datei ablegen**:
  `$ARBEITSDIR/paket-N.impl-<runde>.json` für den Implementierer,
  `$ARBEITSDIR/paket-N.review-<runde>.json` für den Reviewer.
- Die Dateinamen sind kein Ordnungssinn, sondern der Beleg: die Schleife zählt
  sie, weil ein eigener Prozess in `subagent_stats` nicht mehr auftaucht.
- Den Report liest du aus der Datei. Er steht damit auch noch da, wenn dein
  eigener Kontext längst weg ist.
- Modelle setzt du weiter ausdrücklich, nach der Dreistufen-Tabelle in
  `runner.md`. Neu ist, dass du daneben auch den Effort setzen kannst: ein
  eigener Prozess nimmt `--effort`, ein Subagent nicht.

Geht das auf einem Host nicht — kein verschachteltes `claude`, keine Rechte
dafür —, fällst du auf Subagenten zurück. Die Schleife akzeptiert beides: sie
prüft, ob Reports auf der Platte liegen **oder** ob `subagent_stats` zwei
Starts zählt. Belegt sein muss es, gleich wodurch.

## Deine Rolle, wenn du beauftragt wurdest

Ein Paket läuft in zwei Prozessen statt in einem. Die Trennung liegt zwischen
Zug 0 und Zug 1:

- **A** führt Zug 0 aus: Abgleich der Findings am aktuellen Code, Triage der
  Folgen und der offenen Befunde, Detailplan, Restplan prüfen. In den Detailplan
  gehört auf diesem Weg eine Zeile mehr: `- Effort:`, siehe unten. Danach steht
  das Paket auf `[~]`, und A hört auf. **A schreibt keine Zeile Projektcode und
  startet keinen Implementierer.**
  Im interaktiven Modus sitzt der Nutzer dabei: was der Code nicht hergibt,
  fragst du. Nicht als Ausnahme, sondern als der Zweck dieses Zuges — ein
  Detailplan auf halbem Verständnis kostet später mehr als jede Rückfrage.
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

**Als A im interaktiven Modus gibst du gar nichts zurück.** Es gibt keinen
Kanal und keinen braucht es: du schreibst den Plan, setzt die Marke, und die
Marke ist die Rückgabe. Die Tabelle oben unter »Zug 0 im interaktiven Modus«
sagt, was die Schleife daraus liest.

**Sonst** — als B, und als A im headless-Modus — gibst du ein JSON-Objekt nach
`assets/runner-return.schema.json` zurück, statt der neun Zeilen aus
`runner.md`. Die Felder sind dieselben, die Statuswerte sind englisch, weil sie
in einer Shell-Verzweigung landen:

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
- Bei `committed`: es gibt einen Beleg für Implementierer **und** Reviewer —
  entweder ihre Reports als Dateien im Arbeitsverzeichnis (Prozess-Weg) oder
  zwei Starts in `subagent_stats` (Subagenten-Weg). Ein Runner schreibt keinen
  Projektcode selbst, und das wird belegt, nicht geglaubt.
- Die Paketnummer in deiner Rückgabe ist die aus deinem Auftrag.
- Kein Aufruf ist an einer Rechteschranke gescheitert.

Bleibt nach deinem Commit etwas im Arbeitsbaum liegen, gibt es eine Warnung und
der Lauf geht weiter. Der nächste Diff enthält es dann mit.

## Drei Dinge, die du anders machst als in `runner.md`

1. **Der Exit-Code gehört ins Log, nicht nur ins Terminal.** Ein Prozess liest
   deine Terminalausgabe nicht.

   ```bash
   set -o pipefail
   <verify-kommando> > "$ARBEITSDIR/paket-N.verify.log" 2>&1; echo "exit=$?" | tee -a "$ARBEITSDIR/paket-N.verify.log"
   ```

2. **Du nennst den Pfad dieses Logs in `verify_log`**, absolut und im
   Arbeitsverzeichnis. Ohne ihn gibt es nichts nachzulesen.

3. **Implementierer und Reviewer startest du als eigene Prozesse**, mit ihren
   Reports als Dateien. Siehe oben — es geht um die Reichweite, nicht um die
   Form.

## Modell und Effort

Zwei Regler mit zwei verschiedenen Fragen. Das Modell entscheidet, wie viel
Wissen und Urteilskraft im Raum ist; der Effort, wie lange darüber nachgedacht
werden darf. Beide gelten je Prozess, und Prozesse gibt es hier genau zwei.

| Rolle | Modell | Effort | Warum |
| --- | --- | --- | --- |
| **A** — Zug 0 | `MODEL_A=opus` | `EFFORT_A=xhigh` | Existiert das Finding noch, ist die Folge ein Symptom oder ein eigenes Paket, muss der Restplan anders geschnitten werden. Die härtesten Entscheidungen des Laufs, einmal je Paket und ohne eine Zeile Code. |
| **B** — Züge 1–5 | `MODEL_B=opus` | aus dem Detailplan, sonst `EFFORT_B=medium` | B beauftragt, liest zwei Reports, fährt Verify, committet. Die einzige echte Entscheidung ist die Fehlerkette, und die hat den Befund im Wortlaut vor sich. |

**Der Effort von B wirkt nach unten.** Startet B seine Implementierer und
Reviewer als eigene Prozesse — der Weg oben —, setzt es deren `--effort` selbst,
und dann ist `EFFORT_B` wirklich nur B. Fällt es auf Subagenten zurück, erben
die den Effort des Prozesses, und der Wert entscheidet über die beiden Rollen mit
den meisten Zügen. Weil das die teurere Möglichkeit ist, ist der Vorgabewert an
ihr ausgerichtet.

Deshalb setzt **A** ihn und nicht die Umgebung: A hat den Code gesehen, im
interaktiven Modus auch mit dir darüber gesprochen, und weiß, was dieses Paket
verlangt. Eine Zeile im Detailplan, neben `- Modell:`:

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
