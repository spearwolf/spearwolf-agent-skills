# Die Paketschleife — `scripts/remediate.sh`

Schritt 6 der `SKILL.md` enthält kein Urteil: oberstes offenes Paket finden,
Zug 0 fahren, Züge 1–5 beauftragen, Ergebnis gegen `git` und das Verify-Log
halten, weiter. Das tut dieses Skript als Prozess. Was ein Urteil verlangt,
liegt davor (Schritt 1–5) und danach (Schritt 7); was die Runner tun, steht in
`references/runner.md`. Diesen Text liest der Orchestrator **einmal**, bevor er
das Skript startet.

## Starten

Nach der Freigabe des Grobplans, im Wurzelverzeichnis des Projekts:

```bash
ORCHESTRATOR_SESSION=<kennung> <skill>/scripts/remediate.sh [--once] [--dry-run]
```

`--once` hält nach dem ersten vollständigen Paket an, `--dry-run` zeigt im
Vordergrund, was beauftragt würde. Der Lauf hängt sich in eine abgelöste
tmux-Session und kommt sofort zurück:

```
Läuft in tmux-Session »remediate-mein-projekt«.

  tmux attach -t remediate-mein-projekt   ansehen und antworten
  Ctrl-b d                                wieder ablösen, der Lauf läuft weiter
  tmux capture-pane -p -t remediate-…     hineinsehen, ohne anzuhängen
  tmux kill-session -t remediate-…        abbrechen

Mitschrift: /tmp/remediation-mein-projekt/remediate.pane.log
Journal:    /tmp/remediation-mein-projekt/remediate.log

Zug 0 macht dafür ein eigenes Fenster »p<N>-plan« auf, sobald das erste
Paket drankommt, und wartet dort auf dich. Schließen musst du es nicht:
wenn der Planer fertig ist, macht die Schleife es zu und läuft weiter.
```

Diese Zeilen gibt der Orchestrator dem Nutzer weiter. Die Schleife läuft
unabhängig von seiner Session.

**tmux wird vorausgesetzt.** Nur eine abgelöste tmux-Session hat ein echtes
Pseudo-Terminal, und ohne Terminal kann Zug 0 den Nutzer nicht fragen. Zug 0
startet mit `--remote-control "<session>-p<N>-plan"`, so ist dieselbe Frage
auch vom Handy zu beantworten; die Züge 1–5 laufen mit
`--name "<session>-p<N>-lauf"`, ein nachgezogener Review mit `-nachzug`.

**Vorbedingungen** werden vor dem Ablösen geprüft, Branch und
Arbeitsverzeichnis aus dem Kopf des Plans: das Skript startet nicht bei
anderem Branch, unsauberem Arbeitsbaum, einem Paket auf `[~]` oder einer
bereits laufenden Schleife. Alles läuft auf der Maschine mit dem Arbeitsbaum;
die Runner teilen ihn sich, deshalb läuft nie einer parallel zum anderen.

**Innen läuft eine Kopie** (`$WORK/remediate.snapshot.sh`, Skill-Pfad in
`REMEDIATE_SKILL_DIR`): Bash liest ein Skript beim Ausführen weiter, und der
Skill hängt als Symlink im Agenten-Ordner — ein Edit während eines Laufs hat
schon einmal die Schlussmeldung gekostet. Ein Edit ist jetzt folgenlos; wer
ihn im Lauf haben will, hält an und startet neu. Die Kopie sagt hinterher,
welcher Stand gelaufen ist.

### Stellschrauben

Alle über die Umgebung; die Vorgabe steht in Klammern.

| Variable | Wirkung |
| --- | --- |
| `SESSION`, `TMUX_BIN` | Name der tmux-Session (Projektverzeichnis), Pfad zu tmux |
| `MAX_ROUNDS` (5) | Obergrenze der Fehlerkette; steht im Brief, wird beim Commit nachgeprüft. Die eigentliche Bremse steht in `runner.md`: eine Runde ohne Fortschritt ist die letzte |
| `MODEL_A` (opus), `EFFORT_A` (xhigh) | Zug 0. Wird nicht heruntergedreht: ein Fehlurteil dort multipliziert sich über jedes Folgepaket |
| `MODEL_B` (opus), `EFFORT_B` (medium) | Züge 1–5. `EFFORT_B` ist nur B selbst; Implementierer und Reviewer bekommen den Effort aus der Paketdatei. Zu teuer: erst `MODEL_B=sonnet`, dann `BUDGET_USD` als harte Grenze je Prozess |
| `BUDGET_USD` (50) | Kostenobergrenze je Runner-Prozess |
| `ATTEMPTS` (3), `BACKOFF` (60,300,900) | Neuversuche bei überlasteter API, Sekunden dazwischen |
| `FALLBACK_MODEL` | nicht gesetzt: lieber warten als unbemerkt schwächer werden |
| `PERM` (bypassPermissions), `ALLOW_TOOLS`, `DENY_TOOLS` | Rechte der Züge 1–5, siehe unten. Zug 0 fassen sie nicht an |
| `EXTRA_ARGS` | zusätzliche CLI-Argumente für Zug 0 |
| `NOTIFY_CMD` | weiterer Meldeweg, siehe unten |
| `ZUG0_GRACE` (20), `ZUG0_CLOSE` (20), `ZUG0_POLL` (5) | Sekunden zwischen Feierabendzeichen und Schließen des Fensters, Geduld für `/exit`, Abstand zwischen zwei Blicken |
| `ZUG0_TIMEOUT` (1800) | Obergrenze für einen Zug 0, **den niemand beaufsichtigt**: die Uhr läuft nur, solange kein Client und kein Remote-Control-Kanal an der Session hängt, und beginnt beim Ablösen von vorn. Ablauf ist Exit 10. `0` wartet unbegrenzt — das war lange die Vorgabe und der häufigste Hänger, weil ein wartendes Fenster von außen wie ein arbeitendes aussieht |
| `ZUG0_TRUST_GRACE` (60) | In einem Verzeichnis, das die CLI nicht kennt, fragt sie »Is this a project you trust?«; keine Flagge nimmt das der TUI weg. Steht der Dialog länger als diese Frist, Exit 40 mit der Abhilfe: einmal `claude` dort öffnen, bestätigen, beenden, neu starten |

### So sieht ein Paket aus

```
→ Runner A · Paket 2 · opus/xhigh · tmux-Fenster »p2-plan«
  … dort eine gewöhnliche Claude-Session: deine MCP-Server, deine
    Skills, dein Werkzeugkasten, und sie kann dich fragen …
  Zug 0 ist fertig — das Fenster geht in 20s zu.
  Detailplan steht
→ Runner B · Paket 2 · opus/medium
  a3f91c2 · Speicherleck im Cache behoben · 1 Runde(n)
→ Runner A · Paket 3 · opus/xhigh · tmux-Fenster »p3-plan«
```

Zug 0 läuft im eigenen Fenster und sagt selbst, wann er fertig ist: `touch
<arbeitsdir>/paket-N.zug0.done`, vorab freigegeben, damit um diese Zeit kein
Dialog mehr wartet. Die Schleife wartet `ZUG0_GRACE`, schickt `/exit` und
beendet das Fenster notfalls. Danach entscheidet allein die Marke im Plan
(Tabelle in `runner.md`); eine Rückgabe gibt es nicht. Wer das Fenster selbst
verlässt, stört nichts. Der Nutzer wird am Anfang jedes Pakets gebraucht, meist
ein paar Minuten, und nur wenn er angehängt ist.

### Nachsehen, ohne zu stören

| Wozu | Kommando |
| --- | --- |
| Was steht gerade im Pane der Schleife | `tmux capture-pane -p -t <session>:0` |
| Welche Fenster offen sind | `tmux list-windows -t <session>` |
| Was ist bisher passiert | `cat <arbeitsdir>/remediate.log` |
| Die ganze Ausgabe der Schleife | `cat <arbeitsdir>/remediate.pane.log` |
| Was im Planungsfenster stand | `cat <arbeitsdir>/paket-N.zug0.pane.log` |

Das Journal endet mit `ende exit=N`, sobald der Lauf durch ist. Der Orchestrator
hängt sich nicht an die Session — dort sitzt der Nutzer.

### Der Lauf meldet sich von selbst

Die Schleife schickt eine Desktop-Nachricht (`notify-send`) bei drei Anlässen:
Paket committet (Kurzhash, Rundenzahl, Paketstand), Lauf sauber durch, Lauf
mit Code ungleich null beendet. Der dritte hängt an einem `trap … EXIT`, der
jeden Weg hinaus fängt, benannt oder nicht — nur `kill -9` und Stromausfall
entkommen ihm. **Es gibt genau einen EXIT-Trap in diesem Skript.** Bash
stapelt sie nicht; ein zweiter ersetzt den ersten, das Sperrverzeichnis bliebe
liegen, und jeder künftige Start liefe in »hier läuft schon eine Schleife«.

Der Weg ist die Shell, kein Agenten-Werkzeug: `PushNotification` aus einem
`-p`-Prozess wird nicht gesendet, und der Alarm hinge sonst an der API, deren
Ausfall er melden soll. Die Shell kennt dafür den Kontext nicht und erreicht
kein Telefon — deshalb schickt die Orchestrator-Session dieselben Anlässe
zusätzlich per `PushNotification` (Schritt 6 der `SKILL.md`). Für alles über
den Rechner hinaus gibt es `NOTIFY_CMD`, ein Kommando mit `REMEDIATE_TITEL`
und `REMEDIATE_TEXT` in der Umgebung:

```bash
NOTIFY_CMD='curl -s -d "$REMEDIATE_TEXT" ntfy.sh/mein-topic' <skill>/scripts/remediate.sh
```

Voreingestellt ist dort nichts: durch diese Leitung gehen Projektname,
Paketnummern und Commit-Hashes. Beide Wege haben eine Frist und schlucken
ihren Fehler.

### Der Lauf-Status im Kopf des Plans

Die Schleife schreibt `Lauf-Status:` direkt unter `Arbeitsverzeichnis:` — beim
Start, bei jedem Ausgang, bei `--once`. Kein Agent schreibt sie; der
Abschluss-Commit löscht sie. Sie beantwortet, was Marken und Journal nicht
können: `ende exit=0` sieht gleich aus, ob der Abschluss noch aussteht oder
längst gefahren ist, und ein Journal überlebt kein aufgeräumtes `/tmp`.

| Was dasteht | Was es heißt |
| --- | --- |
| `läuft seit … in tmux-Session »…«` | eine Schleife arbeitet, oder sie ist gestorben, ohne ihren Trap zu erreichen |
| `angehalten mit Exit N bei Paket M` | die Exit-Tabelle gilt |
| `Schleife durch … Abschluss offen` | kein Paket mehr offen, Schritt 7 steht aus |
| `nach --once angehalten` | erneut starten setzt fort |
| fehlt | Lauf abgeschlossen, oder Plan aus einer Zeit vor dieser Regel |

## Exit-Codes

| Exit | Heißt | Was folgt |
| --- | --- | --- |
| 0 | Kein Paket mehr offen | Schritt 7, `references/semver-and-closeout.md` |
| 10 | Es braucht eine Entscheidung — oder Zug 0 stand in einer Frage, ohne dass jemand erreichbar war | Antwort datiert in »Entscheidungen«, erneut starten. Bei »ohne jede Erreichbarkeit«: Client am Fenster oder Remote-Control-Kanal herstellen, dann starten |
| 11 | Ein Paket steht auf `[~]` | `references/resume.md`, nicht dieses Skript |
| 20 | Eine Probe aus »Was die Schleife nachprüft« (`runner.md`) fiel — oder Zug 0 hat Entscheidungen notiert, obwohl niemand erreichbar war | Plan und `git log` ansehen, nicht blind wiederholen. Bei »ohne Nutzer«: die neuen Zeilen unter »Entscheidungen« herausnehmen, erreichbar sein, starten. Ein fehlender Review-Beleg landet nicht hier: den zieht die Schleife nach (unten) |
| 21 | Ein Runner hing an einer Rechteschranke | Unter `bypassPermissions` selten: es bleiben Handlungen, die kein Modus bewilligt — eine `ask`-Regel der Maschine, ein Connector-Tool auf »ask«, ein MCP-Tool mit `requiresUserInteraction`, `rm` auf einem kritischen Pfad. Die Meldung nennt das Abgelehnte. Das Paket steht auf `[~]` und gehört nach `references/resume.md` zurückgesetzt — der Runner starb mitten im Zug |
| 30 | Der Runner-Prozess selbst ist gescheitert | `paket-N.*.stderr` im Arbeitsverzeichnis |
| 31 | Die API blieb überlastet | Nichts ist kaputt: später dasselbe Kommando erneut |
| 40 | Eine Vorbedingung stimmt nicht | Die Meldung sagt, welche. Auch der Vertrauensdialog landet hier |

Entstehen im Abschluss neue Pakete (Drain-Runde), läuft das Skript noch
einmal; vorher muss die alte Session weg (`tmux kill-session`), sonst Exit 40.
Das Skript fasst den Abschluss nie an, und die Session am Ende schließt der
Abschluss.

**Ein Zug 0 ohne Nutzer darf keine Entscheidungen notieren.** Ein Planer, den
niemand beantwortet hat, notierte einmal einen Wert, der weder im Code noch im
Audit stand, und die Mitschrift behauptete »User answered Claude's questions«.
Dagegen hilft keine Instruktion, nur der Beleg: erreichbar heißt ein Client am
Fenster, den tmux sieht, oder ein offener Remote-Control-Kanal in Mitschrift
oder Scrollback. Beide zählen gleich; an derselben Erreichbarkeit hängt die
Uhr aus `ZUG0_TIMEOUT`.

### Wenn der Review fehlt

Die Gegenprobe merkt an den Reportdateien im Arbeitsverzeichnis, ob ein
Runner B seinen Auftrag halb erfüllt hat. Der Lauf hält deswegen nicht an, und
der Nutzer wird nicht gefragt: die Arbeit ist getan, das Verify war grün, es
fehlt der zweite Blick, und den holt Rolle N nach. `[r]` geht dabei allem
anderen vor — mit einem ungeprüften Commit im Rücken weiterzubauen wäre der
einzige schlechtere Ausgang.

| Was fehlt | Was passiert |
| --- | --- |
| Review-Report | Paket auf `[r]`, N zieht den Review nach (Auftrag in `runner.md`) |
| nur der Implementierer-Report | Ausnahme in den Plan, der Lauf geht weiter — geschriebener Code lässt sich nicht rückwirkend von jemand anderem schreiben |
| Review-Report auch nach N | Exit 20. Das Paket bleibt auf `[r]`, der Commit im Repo; der Nutzer entscheidet |

### Tokenverbrauch

Jeder Ausgang legt eine Tabelle nach: Tokens je Paket, hinein und hinaus,
Paketüberschrift, Summe und Ausgabe je Modell — ins Pane und als Abschnitt
`## Tokenverbrauch` ans Ende des Plans, der sich bei jedem Ausgang ersetzt
statt stapelt. Kein Agent schreibt ihn; der Abschluss zieht ihn in den
Remediation-Report um.

Keine Beträge. »Eingabe« ist die Summe aus frischer Eingabe, Cache-Lesung und
Cache-Anlage; wer nur `input_tokens` zeigt, zeigt fast nichts. Gezählt wird am
Ende aus `paket-*.json` im Arbeitsverzeichnis, über jeden Neustart hinweg;
gescheiterte Versuche liegen als `paket-N.<rolle>-versuch-<n>.json` daneben
und zählen mit. Zwei Posten kommen aus Session-Mitschriften statt aus JSON: Zug
0 (Kennung in `paket-N.zug0.session`) und die steuernde Session, die sich über
`ORCHESTRATOR_SESSION` nennt (Zeile »Steuer«; mehrere Kennungen in
`orchestrator.session` sind normal). Fehlt ein Posten, sagt die Tabelle es in
ihrer letzten Zeile.

## Wenn die API überlastet ist

Die CLI fängt vorübergehende Fehler selbst ab. Was hier ankommt, hat das
überlebt: die Schleife wartet und startet den Prozess neu — `ATTEMPTS` Versuche
mit `BACKOFF` dazwischen, für die Züge 1–5. Zug 0 hat keine Wiederholung: dort
sitzt der Nutzer und startet neu, wenn er will.

**Wiederholt wird nur, was nichts hinterlassen hat.** Vor jedem Start nimmt
die Schleife einen Fingerabdruck aus `HEAD`, Arbeitsbaum und Plan. Hat sich
keiner bewegt, ist ein Neuversuch ein Neustart; hat sich einer bewegt, hält
sie an — das ist der `[~]`-Fall nach `references/resume.md`.

Als Überlastung zählt `api_error_status` im Ergebnis-JSON (`429`, `500`,
`502`, `503`, `529`); nur ohne lesbares JSON die Fehlerausgabe nach denselben
Codes und den Namen der Fehlertypen. Ein erschöpftes Budget ist keine
Überlastung und wird nie wiederholt. **Exit 31 heißt: warte länger, nicht:
repariere etwas** — dasselbe Kommando später noch einmal. Das Netz umspannt
den Runner-Prozess, nicht dessen Implementierer; deren Scheitern behandelt B
über die Fehlerkette.

## Rechte

**Zug 0** läuft ohne `-p`, ohne Schema, ohne Allow- und Verbotsliste: die
Session des Nutzers mit dessen Rechten, MCP-Servern und Skills. Ein Planer,
dem Werkzeuge fehlen, plant gegen einen halb gelesenen Code, und der
Detailplan ist das teuerste Dokument des Laufs. Weitergereicht wird nur
`EXTRA_ARGS`, Modell und Effort — und die eine Freigabe für das
Feierabendzeichen. In einem `-p`-Prozess schaltet irgendein Bash-Muster in der
Allowlist Bash insgesamt frei; für die TUI ist das nicht nachgemessen. Wer Zug
0 strikt festnageln will, nimmt die Zeile heraus und nimmt den Dialog in Kauf.

**Züge 1–5** laufen ohne Terminal: ein Werkzeug, das weder erlaubt noch
verboten ist, öffnet einen Dialog, den niemand beantwortet, und der Prozess
stirbt. Deshalb `bypassPermissions` und die Grenze allein in der Verbotsliste
(»Deny rules block in every mode, including bypassPermissions. Allow rules
have no effect in bypassPermissions.«). Eine Erlaubnisliste müsste jedes
Werkzeug kennen, das ein Runner je anfasst — eingebaute, MCP, Plugins, auf
fremden Maschinen — und jeder fehlende Name kostet einen Lauf. Der Preis: der
Modus nimmt den Schutz von `.git` und `.claude`; die Verbotsliste holt ihn
zurück.

| Entzogen | Weil |
| --- | --- |
| `AskUserQuestion`, `SendMessage` | warten auf eine Antwort, die ohne Terminal nie kommt; als Verbot wird daraus eine saubere Absage statt eines Dialogs |
| `ScheduleWakeup`, `CronCreate` | legen Arbeit an, die den Prozess überlebt |
| `Edit(.git/**)`, `Edit(.claude/**)` | Pfadmuster werden nur über `Edit` und `Read` ausgewertet; ein `Write(…)`-Muster läse die CLI nie |
| `Bash(git push*)`, `Bash(git tag*)`, `Bash(npm publish*)` u. ä. | kennt dieser Lauf nicht |

`PushNotification`, `SendUserFile` und `Artifact` stehen bewusst nicht dort.
Ein Name ohne Entsprechung stört nicht; ein entzogenes Werkzeug ist keine
abgelehnte Berechtigung, eine zu strenge Liste endet also in `blocked`, nicht
in Exit 21. `DENY_TOOLS=""` ist wörtlich gemeint.

**Rückfallweg.** Sperrt eine Maschine den Bypass
(`disableBypassPermissionsMode`), sagt es das Skript beim ersten Versuch. Dann
`PERM=acceptEdits`; ab da trägt `ALLOW_TOOLS=Bash,Monitor`, und Exit 21 kann
wiederkommen. Die Liste steht auf `Bash` ohne Präfixmuster: `Bash(claude *)`
greift an `claude -p "$(cat brief)" > report.json` nicht mehr, und der Runner
fällt dann auf Subagenten zurück. `dontAsk` lehnt jedes Werkzeug ohne Regel
ab, `auto` lehnte einen gewöhnlichen `Edit` ab — beide taugen nicht.

**Warum Implementierer und Reviewer keine Terminal-Sessions sind:** ein
interaktiver Prozess erbt den Modus seiner Session statt den der Schleife und
wartet bei fehlender Freigabe in einem Pane, an dem niemand hängt. Und
Neuversuch, Budget, Rückgabeschema und Zählung hängen daran, dass ein Prozess
ein Ergebnis-JSON und einen Exit-Code liefert. Für MCP bringt das Terminal
nichts — der Prozess erbt die Konfiguration ohnehin.

## Was die Schleife nicht tut

Sie plant nicht, schneidet keine Pakete, beantwortet keine Rückfrage, bewertet
nicht nach Semver, fasst die `./audit.html` nicht an und pusht nicht. Sie zählt
Marken und prüft Belege. Alles andere ist der Grund, warum vor ihr und nach
ihr ein Agent steht.
