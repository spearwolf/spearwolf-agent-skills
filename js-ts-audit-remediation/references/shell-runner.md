# Die Paketschleife — `scripts/remediate.sh`

Schritt 6 der `SKILL.md` enthält kein Urteil: oberstes offenes Paket finden,
Zug 0 fahren, Züge 1–5 beauftragen, Ergebnis gegen `git` und das Verify-Log
halten, weiter. Das tut dieses Skript, als Prozess statt als Agent. Alles, was
ein Urteil verlangt, liegt davor (Schritt 1–5) und danach (Schritt 7); der
Inhalt jedes Zuges steht in `references/runner.md`.

Diesen Text liest der Agent aus Schritt 5 **einmal**, bevor er das Skript zum
ersten Mal startet, und danach jeder Runner, den das Skript beauftragt.

## Starten

Ein Lauf beginnt nicht hier. Er beginnt in einer offenen Session im Projekt —
»arbeite die Findings aus dem Audit ab« —, und dort laufen die Schritte 1 bis 5.
Sobald der Grobplan freigegeben ist, startet der Agent das Skript. Ungefragt:
die Freigabe war die Frage.

```bash
<skill>/scripts/remediate.sh
```

Das war der ganze Aufruf. Der Lauf hängt sich in eine abgelöste tmux-Session
und kommt sofort zurück:

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

Dort anhängen und Zug 0 seine Fragen beantworten. Mehr ist nicht zu tun; das
Fenster geht von selbst zu. Warum das so ist, steht unter »Zug 0«.

Diese Zeilen gibt der Agent dem Nutzer weiter, und damit ist seine Arbeit an der
Schleife getan. Sie läuft unabhängig von seiner Session — schließt sie sich,
läuft sie; stirbt ihr Kontext, läuft sie.

**tmux wird vorausgesetzt.** Fehlt es, bricht das Skript ab, und der Lauf
beginnt nicht. Der Grund ist nicht Bequemlichkeit: eine abgelöste tmux-Session
hat ein echtes Pseudo-Terminal (gemessen `stdin=ja stdout=ja tty=/dev/pts/0`),
ein gewöhnlicher Hintergrundprozess hat keines, und ohne Terminal kann Zug 0
den Nutzer nicht fragen. tmux ist das Einzige, was »abgelöst« und »fragt nach«
zugleich erlaubt.

**Jede Session bekommt einen Namen.** Zug 0 startet mit
`--remote-control "<session>-p<N>-plan"`: der Name macht sie in der Session-Liste
auffindbar, und Remote Control macht sie vom Account aus erreichbar — dieselbe
Rückfrage lässt sich dann auch vom Handy beantworten, statt sich per SSH an tmux
zu hängen. Die Züge 1–5 laufen mit `--name "<session>-p<N>-lauf"`; sie sind
nicht interaktiv, aber auffindbar. Der Sessionname kommt aus `SESSION`, sonst aus
dem Projektverzeichnis.

**Die Fehlerkette hat eine Obergrenze:** `MAX_ROUNDS`, voreingestellt fünf. Der
Wert steht im Brief an Zug 1–5, und die Schleife prüft ihn beim Commit nach.
Er ist aber nicht die eigentliche Bremse — die steht in `runner.md`: eine Runde,
die die Zahl der offenen Befunde nicht senkt, ist die letzte. Fünf Runden sind
eine Erlaubnis, kein Auftrag.

Zwei Argumente gibt es, beide für den Ausnahmefall: `--once` hält nach dem
ersten vollständigen Paket an, `--dry-run` zeigt im Vordergrund, was beauftragt
würde, und startet nichts. `SESSION` benennt die tmux-Session anders als nach
dem Projektverzeichnis, `TMUX_BIN` zeigt auf ein tmux an anderer Stelle.

Fünf Werte betreffen nur Zug 0. `ZUG0_GRACE` (20 s) ist die Frist zwischen dem
Feierabendzeichen und dem Schließen des Fensters, `ZUG0_CLOSE` (20 s) die
Geduld, die `/exit` bekommt, bevor das Fenster beendet wird, `ZUG0_POLL` (5 s)
der Abstand zwischen zwei Blicken auf das Zeichen.

`ZUG0_TIMEOUT` (1800 s) ist die Obergrenze für einen Zug 0, **den niemand
beaufsichtigt** — und der Zusatz ist der ganze Punkt. Die Uhr läuft nur, solange
kein Client an der Session hängt; sobald sich jemand anhängt, steht sie und
beginnt beim Ablösen von vorn. Wer im Fenster sitzt und nachdenkt, wird also nie
abgeschnitten, und wer nicht da ist, bekommt nach einer halben Stunde einen
Abbruch mit Exit 10 statt eines Fensters, das bis morgen früh wartet. Der Wert
stand lange auf 0, also auf »warten, solange es dauert«; das war als Höflichkeit
gegenüber dem Menschen gedacht und wurde in der Praxis zum häufigsten Hänger des
Laufs — von außen sieht ein wartendes Fenster genauso aus wie ein arbeitendes.
`ZUG0_TIMEOUT=0` stellt das alte Verhalten wieder her.

`ZUG0_TRUST_GRACE` (60 s) gilt einem Dialog, der nichts mit diesem Skill zu tun
hat und ihn trotzdem lahmlegt: In einem Verzeichnis, das die CLI noch nie
gesehen hat, fragt sie »Is this a project you trust?«, bevor das Modell
irgendetwas tut. In `-p` entfällt die Frage, Zug 0 aber ist eine TUI, und keine
Flagge nimmt sie weg. Die Schleife sieht deshalb bei jedem Blick in das Pane
nach; steht der Dialog länger als diese Frist, schließt sie das Fenster und
bricht mit Exit 40 ab — samt der einen Zeile, die hilft: einmal `claude` in dem
Verzeichnis öffnen, den Ordner bestätigen, Sitzung beenden, Lauf erneut starten.
Wer angehängt ist, drückt in dieser Minute einfach Enter und merkt nichts davon.

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

Der Nutzer wird am Anfang jedes Pakets gebraucht, meist ein paar Minuten, und
nur wenn er angehängt ist. Die lange Strecke danach — Implementierer, Review,
Fehlerkette, Verify, Commit — läuft ohne ihn.

### Nachsehen, ohne zu stören

| Wozu | Kommando |
| --- | --- |
| Was steht gerade im Pane der Schleife | `tmux capture-pane -p -t <session>:0` |
| Welche Fenster offen sind | `tmux list-windows -t <session>` |
| Was ist bisher passiert | `cat <arbeitsdir>/remediate.log` |
| Die ganze Ausgabe der Schleife | `cat <arbeitsdir>/remediate.pane.log` |
| Was im Planungsfenster stand, nachdem es zu ist | `cat <arbeitsdir>/paket-N.zug0.pane.log` |

Das Journal endet mit `ende exit=N`, sobald der Lauf durch ist. Solange die Zeile
fehlt, läuft er noch oder wartet auf eine Antwort. Der Agent hängt sich nicht an
die Session an — dort sitzt der Nutzer.

### Der Lauf meldet sich von selbst

Niemand sitzt Stunden vor einem Pane. Die Schleife schickt deshalb eine
Desktop-Nachricht bei drei Anlässen: ein Paket ist committet (mit Kurzhash,
Rundenzahl und Paketstand), der Lauf ist sauber durch, und — der wichtigste —
der Lauf endet mit einem Code ungleich null.

Der dritte Anlass hängt an einem `trap … EXIT` und nicht an der `die`-Funktion,
und der Unterschied ist der ganze Zweck. `die` deckt die *erwarteten* Abbrüche
ab, die mit Code und Meldung. Der Ausgang, bei dem sonst niemand Bescheid sagt,
ist der andere: ein `set -e`, das irgendwo zuschlägt, ein `jq` über kaputtem
JSON, ein Tippfehler nach einer Änderung. Ein EXIT-Trap fängt jeden Weg hinaus,
benannt oder nicht; nur `kill -9` und ein Stromausfall entkommen ihm.

**Es gibt genau einen EXIT-Trap in diesem Skript, und das muss so bleiben.**
Bash stapelt sie nicht — ein zweiter `trap … EXIT` ersetzt den ersten
stillschweigend. Der vorhandene schreibt die Zeile `ende exit=N` ins Journal und
räumt `.remediate.lock` ab; wer ihn überschreibt, lässt das Sperrverzeichnis
liegen, und jeder künftige Start läuft in »hier läuft schon eine Schleife«. Was
beim Ende zu tun ist, kommt in diesen einen Trap und nirgendwo sonst.

Der Weg der Schleife ist bewusst die Shell und kein Agenten-Werkzeug, und das
ist keine Absage an `PushNotification` — dieselben Anlässe gehen über die
Orchestrator-Session zusätzlich dorthin, das steht in Schritt 6 der `SKILL.md`.
Zwei Wege, weil sie an verschiedenen Stellen reißen.

Kein Runner darf diesen Alarm auslösen. Gemessen: ein `claude -p`, das nur
`PushNotification` aufruft, bekommt *Not sent — this terminal is active* zurück
und schweigt. Schwerer wiegt der zweite Grund — der Alarm hinge an genau der
API, deren Ausfall er melden soll. Exit 31 heißt, dass die API über drei
Versuche überlastet blieb; die Meldung darüber dann per API zu verschicken, ist
ein Rauchmelder mit Strom aus dem brennenden Zimmer. Die Shell hat diese
Abhängigkeit nicht, und sie meldet auch dann noch, wenn die Session, die den
Lauf gestartet hat, seit Stunden geschlossen ist.

Umgekehrt kennt die Shell den Kontext nicht: sie weiß nichts von der Frage, an
der ein Paket hängt, und sie erreicht kein Telefon, ohne dass jemand
`NOTIFY_CMD` gelegt hat. Deshalb beide.

`notify-send` erreicht den Rechner, auf dem der Lauf steht. Für alles darüber
hinaus gibt es `NOTIFY_CMD`: ein beliebiges Kommando, das `REMEDIATE_TITEL` und
`REMEDIATE_TEXT` in der Umgebung bekommt.

```bash
NOTIFY_CMD='curl -s -d "$REMEDIATE_TEXT" ntfy.sh/mein-topic' <skill>/scripts/remediate.sh
```

Voreingestellt ist dort nichts, und das ist Absicht: durch diese Leitung gehen
Projektname, Paketnummern und Commit-Hashes, und wohin die gehen, entscheidet
niemand außer dem Nutzer. Beide Wege haben eine Frist und schlucken ihren
Fehler — eine Benachrichtigung, die den Lauf bricht, wäre schlimmer als gar
keine.

### Ein Lauf gehört dem Stand, mit dem er gestartet ist

Drinnen läuft nicht diese Datei, sondern eine Kopie: `launch_tmux` legt
`$WORK/remediate.snapshot.sh` an und startet die. Der Skill-Pfad wandert als
`REMEDIATE_SKILL_DIR` mit, damit die Kopie Schema und `references/` weiterhin
am Original findet und nicht neben sich in `/tmp` sucht.

Der Grund ist gemessen und kostete einen ganzen Lauf. Der Skill hängt als
Symlink im Agenten-Ordner; wer ihn bearbeitet, bearbeitet die Datei, aus der
gerade gelesen wird. Und Bash lädt ein Skript nicht vorab, sondern liest es
beim Ausführen weiter. Am 2026-08-26 kamen Benachrichtigung und EXIT-Trap um
08:32 hinein, während die Schleife seit 07:54 lief und ihre Funktionsrümpfe
längst geparst hatte; um 08:58 endete sie, ohne die Meldung zu schicken, die
genau dieses Ende hätte melden sollen. Nachweisbar an der Mitschrift: kein
einziges Glockenzeichen darin, und `notify()` druckt bei jedem Aufruf eines.

Das war der harmlose Ausgang. Verschiebt ein Edit die Byte-Offsets, liest Bash
an einer Stelle weiter, die es nicht mehr gibt, und führt die zweite Hälfte
irgendeines Kommandos aus.

Die Kopie sagt hinterher außerdem, welcher Stand gelaufen ist — `diff` gegen
den Skill beantwortet die Frage, die sonst niemand mehr beantworten kann. Sie
bleibt liegen, bis das Arbeitsverzeichnis aufgeräumt wird.

Für den, der am Skill arbeitet, ändert das die Regel nur zur Hälfte: ein Edit
während eines Laufs ist jetzt folgenlos statt gefährlich. Er wirkt eben auch
nicht — wer eine Änderung im laufenden Lauf haben will, hält ihn an und startet
neu.

### Der Lauf-Status im Kopf des Plans

Die Schleife schreibt eine Zeile `Lauf-Status:` direkt unter
`Arbeitsverzeichnis:` und hält sie aktuell: beim Start, bei jedem Ausgang, und
bei `--once`. Kein Agent schreibt sie von Hand; der Abschluss-Commit löscht sie.

| Was dasteht | Was es heißt |
| --- | --- |
| `läuft seit … in tmux-Session »…«` | eine Schleife arbeitet, oder sie ist gestorben, ohne ihren Trap zu erreichen |
| `angehalten mit Exit N bei Paket M` | die Exit-Tabelle unten gilt |
| `Schleife durch … Abschluss offen` | kein Paket mehr offen, Schritt 7 steht aus |
| `nach --once angehalten` | ein Paket gefahren, erneut starten setzt fort |
| die Zeile fehlt | Lauf abgeschlossen, oder Plan aus einer Zeit vor dieser Regel |

Sie existiert, weil keine der anderen Spuren die Frage beantwortet, an der am
2026-08-26 ein Abschluss liegenblieb. Die Paketmarken standen alle auf `[x]`,
und `ende exit=0` im Journal sieht identisch aus, ob danach noch die halbe
Arbeit wartet oder gar nichts mehr. Ein Journal überlebt zudem kein
aufgeräumtes `/tmp`; der Plan liegt im Projekt.

### Vorbedingungen

Sie werden vor dem Ablösen geprüft: ein falscher Branch soll sofort auffallen und
nicht in einer Session, in die niemand hineinsieht. Branch und Arbeitsverzeichnis
liest das Skript aus dem Kopf des Plans, nicht aus der Umgebung. Es startet
nicht, wenn der ausgecheckte Branch ein anderer ist, wenn der Arbeitsbaum nicht
sauber ist, wenn ein Paket auf `[~]` steht oder wenn schon eine Schleife läuft.

Gestartet wird auf der Maschine, auf der der Arbeitsbaum liegt, und dort läuft
auch alles. Nichts wird anderswo gestartet — kein zweiter Klon, keine Session in
einer fremden Umgebung. Die Runner teilen sich einen Arbeitsbaum, und genau
deshalb läuft nie einer parallel zum anderen.

| Exit | Heißt | Was folgt |
| --- | --- | --- |
| 0 | Kein Paket mehr offen | Schritt 7, `references/semver-and-closeout.md` |
| 10 | Es braucht eine Entscheidung — oder Zug 0 stand in einer Frage, ohne dass jemand erreichbar war | Antwort datiert in »Entscheidungen«, dann erneut starten. Sagt die Meldung »ohne jede Erreichbarkeit«, war weder ein Client am Fenster noch ein Remote-Control-Kanal offen: einen der beiden Wege herstellen und noch einmal starten |
| 11 | Ein Paket steht auf `[~]` | `references/resume.md`, nicht dieses Skript |
| 20 | Die Rückgabe passt nicht zum Repo — oder Zug 0 hat Entscheidungen notiert, die niemand getroffen hat | Plan und `git log` ansehen. Nicht blind wiederholen. Bei »ohne Nutzer«: die neuen Zeilen unter »Entscheidungen« herausnehmen, dann erreichbar sein und erneut starten — am Fenster oder über Remote Control |
| 21 | Ein Runner hing an einer Rechteschranke | Unter der Voreinstellung `bypassPermissions` selten und nie durch eine zu enge Allowlist: es bleiben die Handlungen, die kein Modus je bewilligt — eine `ask`-Regel dieser Maschine, ein Connector-Tool, das die Organisation auf »ask« gestellt hat, ein MCP-Tool mit `requiresUserInteraction`, `rm` auf einem kritischen Pfad. Die Meldung nennt das Abgelehnte und sagt, welcher der beiden Fälle vorliegt. Das Paket steht danach auf `[~]` und will vorher nach `references/resume.md` zurückgesetzt werden — der Runner ist mitten im Zug gestorben, nicht am Ende |
| 30 | Der Runner-Prozess selbst ist gescheitert | `paket-N.*.stderr` im Arbeitsverzeichnis |
| 31 | Die API blieb überlastet | Nichts ist kaputt, nichts hat sich bewegt: später erneut starten |
| 40 | Eine Vorbedingung stimmt nicht | Die Meldung sagt, welche. Auch der Vertrauensdialog landet hier: die CLI kennt das Verzeichnis nicht |

Entstehen im Abschluss neue Pakete — die Drain-Runde schneidet welche —, läuft
das Skript danach noch einmal. Es fasst den Abschluss selbst nie an.

Jeder dieser Ausgänge außer 40 legt eine Tabelle nach: Tokens je Paket, eine
Spalte hinein und eine hinaus, daneben die Überschrift des Pakets aus dem Plan,
dazu eine Summe und die Ausgabe je Modell.
Beträge stehen nicht darin. »Eingabe« ist die Summe aus frischer Eingabe,
Cache-Lesung und Cache-Anlage — drei Preisklassen desselben Postens, und die
frische Eingabe ist die mit Abstand kleinste davon: in einem gemessenen Lauf
1,2k gegen 52,4M aus dem Cache. Wer nur `input_tokens` zeigt, zeigt fast
nichts. Gezählt wird nicht mitlaufend,
sondern am Ende aus den Reportdateien `paket-*.json` im Arbeitsverzeichnis, und
damit über jeden Neustart hinweg, denn das Verzeichnis steht im Kopf des Plans
und nicht am Prozess.

Zug 0 ist dabei, obwohl er kein Ergebnis-JSON hat: er ist eine TUI, und seine
Tokens holt die Tabelle aus der Mitschrift seiner Session, die er seit dem
2026-08-26 unter einer vom Skript vergebenen Kennung führt
(`paket-N.zug0.session` im Arbeitsverzeichnis). Läufe, die vorher begonnen
haben, haben keine Kennung vergeben; dort fehlt Zug 0 ganz, und die letzte
Zeile der Tabelle sagt es.

## Wenn die API überlastet ist

Ein langer Lauf trifft irgendwann auf ein `529`. Drei Ebenen liegen dagegen
übereinander, und nur die dritte gehört diesem Skript.

Die CLI fängt vorübergehende Fehler selbst ab; was hier ankommt, hat das bereits
überlebt. `--fallback-model` wäre die zweite Ebene, ist aber nicht voreingestellt:
ein Runner, der still auf ein schwächeres Modell wechselt, liefert weiterhin ein
Ergebnis, und bei A wäre das ein Urteil über Paketschnitt und Triage, auf dem
jedes Folgepaket aufbaut. Lieber warten als unbemerkt schwächer werden. Wer es
anders will, setzt `FALLBACK_MODEL`.

Die dritte Ebene ist die Schleife, und sie greift für die Züge 1 bis 5:
scheitert der Prozess, wartet sie und startet ihn neu — `ATTEMPTS=3` Versuche,
`BACKOFF=60,300,900` Sekunden dazwischen, also gut zwanzig Minuten Geduld.
Beides über die Umgebung einstellbar.

Zug 0 hat keine Wiederholung und braucht keine: dort sitzt der Nutzer im
Terminal, sieht den Fehler und startet neu, wenn er will. Bleibt die Marke
unverändert, hält die Schleife von selbst an.

**Wiederholt wird nur, was nichts hinterlassen hat.** Vor jedem Start nimmt die
Schleife einen Fingerabdruck aus drei Werten: `HEAD`, der Zustand des
Arbeitsbaums und der Plan. Ist ein Runner an der überlasteten API gescheitert,
ohne einen davon zu bewegen, gibt es nichts, worin ein Neuversuch aufsetzen
könnte — er ist ein Neustart und kein Fortsetzen. Hat sich einer bewegt, wird
nicht wiederholt, sondern angehalten: das ist der `[~]`-Fall mit halber Arbeit im
Baum, und darüber entscheidet nach `references/resume.md` der Nutzer.

**Was als Überlastung zählt**, entscheidet das Feld `api_error_status` im
Ergebnis-JSON (`429`, `500`, `502`, `503`, `529`). Nur wenn der Prozess gar kein
lesbares JSON hinterlassen hat, sieht die Schleife in seine Fehlerausgabe — nach
denselben fünf Codes und nach den Namen der Fehlertypen. Eine kürzere Liste dort
hieße, dass ein `500` je nach Sterbezeitpunkt des Prozesses mal wiederholt wird
und mal nicht. Die Ziffern müssen allein stehen, sonst springt das Muster auf
jede Zahl an, die zufällig so aussieht. Ein erschöpftes Budget ist keine
Überlastung und wird nie wiederholt — der nächste Versuch liefe in dieselbe
Grenze und zahlte sie noch einmal.

**Exit 31 heißt: warte länger, nicht: repariere etwas.** Weil der Plan den Stand
trägt, ist ein Neustart des Skripts identisch mit einem Fortsetzen — dasselbe
Kommando später noch einmal, und der Lauf setzt beim nächsten offenen Paket auf.

Die Grenze dieses Netzes: es umspannt den Runner-Prozess, nicht die Subagenten
darin. Stirbt ein Implementierer an derselben Überlastung, sieht das B und
behandelt es über die Fehlerkette; kommt es damit nicht durch, gibt es
`blocked` zurück und die Schleife hält an. Das ist richtig so — ein halb
umgesetztes Paket auf einer überlasteten API repariert kein Neuversuch.

## Was ein Runner in die Hand bekommt

Das hängt an der Rolle, und der Unterschied ist Absicht.

### Zug 0: alles, was die Maschine hat

Das Skript startet ihn ohne `-p`, ohne Rückgabeschema, ohne Allowlist und ohne
Verbotsliste. Es ist deine Session: deine MCP-Server, deine Skills, deine
Einstellungen, `AskUserQuestion`. Weitergereicht wird nur, was in `EXTRA_ARGS`
steht, plus Modell und Effort.

Der Grund ist nicht Großzügigkeit. Ein Planer, dem die Werkzeuge fehlen, plant
gegen einen Code-Stand, den er nur zur Hälfte gelesen hat, und der Detailplan
ist das Dokument, gegen das anschließend alles gebaut wird. Ein Fehlurteil dort
schlägt auf jedes Folgepaket durch — das ist die teuerste Stelle im Lauf, um
sparsam zu sein. Gemeint ist damit das Nachsehen, nicht das Nachfragen: die
Antwort steht fast immer im Repository, und wer sie dort holt, statt den Nutzer
zu fragen, ist schneller und liegt öfter richtig.

**Zug 0 läuft in einem eigenen Fenster und sagt selbst, wann er fertig ist.**
Das Skript öffnet `<session>:p<N>-plan`, startet den Planer dort und sieht
danach auf eine Datei: `<arbeitsdir>/paket-N.zug0.done`. Ein `touch` darauf ist
das Letzte, was A tut, nachdem Detailplan und Marke im Plan stehen. Die Schleife
lässt danach `ZUG0_GRACE` Sekunden verstreichen, schickt `/exit` ins Fenster und
beendet es, falls das nicht zieht.

Der Grund für diesen Umweg ist gemessen: eine interaktive `claude`-Session
bleibt am Prompt stehen, wenn das Modell seinen Zug beendet hat, und das Ende
des *Prozesses* ist das Einzige, worauf ein Vordergrundaufruf warten könnte.
Vorher hing an dieser Stelle ein Mensch, der `/exit` tippen musste; in einem
gemessenen Lauf stand der Planer so eine Stunde lang fertig im Pane, ohne dass
irgendwo ein Fehler zu sehen war. Jetzt hängt dort eine Datei, und die
schreibt der, der als Einziger weiß, wann er fertig ist.

Wer das Fenster trotzdem selbst verlässt, stört nichts: fehlt das Zeichen und
ist das Fenster weg, geht es weiter wie sonst auch. Die Marke entscheidet.

**Diesen einen Aufruf gibt das Skript vorab frei.** Zug 0 bekommt sonst keine
Allowlist — die Rechte sind die des Nutzers, es ist seine Session —, aber das
Feierabendzeichen ist ein `Bash`-Aufruf, und ohne Freigabe stünde davor ein
Dialog, und zwar zu dem Zeitpunkt, zu dem der Nutzer seine Fragen längst
beantwortet hat und nicht mehr hinsieht. Gemessen ohne die Freigabe: fünf
Bash-Aufrufe eines Planers, fünf Ablehnungen. Der Preis dafür steht im Skript:
in einem `-p`-Prozess schaltet *irgendein* Bash-Muster in der Allowlist Bash
insgesamt frei, für die TUI ist das nicht nachgemessen. Wer Zug 0 strikt auf
die Rechte des Nutzers festnageln will, nimmt die Zeile heraus und nimmt den
Dialog in Kauf.

Es gibt nichts zu parsen: **die Marke im Plan** sagt, wie es weitergeht.

| Marke danach | Heißt | Die Schleife |
| --- | --- | --- |
| `[~]` | Detailplan steht | fährt Zug 1–5 |
| `[x]` | alle Findings gegenstandslos | zählt das Paket ab, nächstes |
| `[!]` | bewusst blockiert | hält an, Exit 10 |
| unverändert `[ ]` | Zug 0 ist nicht durchgelaufen | hält an, Exit 10 |

Das ist keine Notlösung. Die Marke war ohnehin die Wahrheit, die Rückgabe war
immer nur ihre Behauptung.

**Beide bekommen zwei Verzeichnisse dazu.** `--add-dir` auf das Skill-Verzeichnis
(dort liegen die beiden Dateien, die der Brief zu lesen aufgibt) und auf das
Arbeitsverzeichnis (dort liegen Diffs und Verify-Logs, außerhalb der
Versionierung und damit außerhalb des Projekts). Gemessen ohne sie: der Runner
scheitert an der Rechteschranke, bevor er weiß, was seine Rolle ist, und weicht
mit seinen Diffs in den Arbeitsbaum aus.

### Zug 1–5: der Prozess bekommt viel, es fehlt nur, was ihn aufhält

B läuft ohne Terminal, und daraus folgt alles Weitere. Ein Werkzeug, das weder
erlaubt noch verboten ist, führt zu einem Freigabe-Dialog; ein Prozess ohne
Terminal kann darauf nicht antworten und stirbt. Die dritte Kategorie — »fragt
nach« — ist hier keine Zwischenstufe, sondern ein Abbruch.

**Deshalb steht der Modus auf `bypassPermissions` und die Grenze allein in der
Verbotsliste.** Zwei Sätze der CLI-Dokumentation tragen das:

> Deny rules block in every mode, including `bypassPermissions`.
> Allow rules have no effect in `bypassPermissions`.

Also alle Werkzeuge außer den ausdrücklich verbotenen. Der Gegenweg — eine
Erlaubnisliste — müsste jedes Werkzeug kennen, das ein Runner je anfassen
könnte: die eingebauten, die eines jeden MCP-Servers, die jedes Plugins, auf
einer fremden Maschine, in einer künftigen Version. Diese Liste ist nicht
schreibbar, und jeder Name, der ihr fehlt, kostet einen Lauf. Gemessen am
2026-08-26: ein Runner griff zu `Monitor`, um auf seinen Implementierer zu
warten, und der Lauf endete an Exit 21, während der Implementierer weiterlief.

Der Preis wird genannt und nicht verschwiegen. `bypassPermissions` nimmt auch
den Schutz der geschützten Pfade weg, `.git` und `.claude` eingeschlossen; die
Verbotsliste holt ihn zurück. Was der Modus darüber hinaus erweitert, ist
wenig — `Bash` stand schon vorher ohne Präfixmuster in der Erlaubnisliste,
beliebige Kommandos konnte ein Runner also immer schon absetzen.

**Die Verbotsliste** ist damit die ganze Grenze des Laufs:

| Entzogen | Weil |
| --- | --- |
| `AskUserQuestion` | wartet auf eine Antwort, die in einem Prozess ohne Terminal nie kommt. Kein Modus bewilligt es je automatisch, auch `bypassPermissions` nicht — als Verbot wird daraus wenigstens eine saubere Absage statt eines Dialogs |
| `SendMessage` | dito, sobald ein Runner auf eine Erwiderung wartet |
| `ScheduleWakeup`, `CronCreate` | legen Arbeit an, die den Prozess überlebt |
| `Edit(.git/**)`, `Edit(.claude/**)` | holt zurück, was der Modus freigibt. Was ein Runner an der Historie tut, tut er über `git` und nicht über einen Editor |
| `Bash(git push*)`, `Bash(git tag*)`, `Bash(npm publish*)` | kennt dieser Lauf laut `SKILL.md` nicht |

Bei den Pfadregeln steht `Edit(...)` und nicht `Write(...)`, und das ist kein
Geschmack: Pfadmuster werden ausschließlich über `Edit` und `Read` ausgewertet.
Ein `Write(…)`-Muster nähme die CLI entgegen, läse es nie und warnte beim Start.

`PushNotification`, `SendUserFile` und `Artifact` stehen bewusst **nicht** dort:
sie reichen etwas hinaus, ohne zu warten und ohne den Prozess zu überdauern.
`DENY_TOOLS=""` schaltet auch den Rest ab und ist dann wörtlich gemeint.

Zwei Eigenschaften, gemessen: ein Name ohne Entsprechung stört nicht, und ein
entzogenes Werkzeug ist keine abgelehnte Berechtigung — `permission_denials`
bleibt leer, eine zu strenge Liste läuft also nicht in Exit 21, sondern in einen
Runner, der `blocked` meldet.

**Die Allowlist** wirkt unter diesem Modus nicht. Sie steht weiter im Skript,
weil sie den Rückfallweg trägt:

```
ALLOW_TOOLS=Bash,Monitor
```

Sperrt eine Maschine den Bypass — `disableBypassPermissionsMode`, gern als
Organisationsvorgabe —, startet kein Runner, und das Skript sagt es beim ersten
Versuch statt nach drei. Dann `PERM=acceptEdits` setzen; ab da trägt diese Liste
wieder, und Exit 21 kann wiederkommen. Sie steht auf `Bash` und nicht auf einer
Liste von Präfixen: gemessen mit `Bash(claude *)` wird
`claude -p "$(cat brief)" > report.json` abgelehnt, weil das Muster an einem
Kommando mit Ersetzung und Umleitung nicht mehr greift. Der Runner hält die
Ablehnung für eine Grenze und fällt auf Subagenten zurück — auf genau das,
wogegen der Prozess-Umbau gebaut ist.

**Die übrigen Modi**, gemessen oder aus der Dokumentation:

| Modus | Verhalten in `-p` | Taugt |
| --- | --- | --- |
| `bypassPermissions` | fragt nichts, Verbotsregeln greifen weiter | **ja**, die Voreinstellung |
| `acceptEdits` | Änderungen laufen durch, Bash erst über die Allowlist | nur als Rückfallweg |
| `dontAsk` | lehnt jedes Werkzeug ohne Erlaubnisregel ab | nein — dasselbe Ausprobieren, nur mit Absage statt Hänger |
| `auto` | Lesendes läuft durch, ein gewöhnlicher `Edit` wurde abgelehnt | nein |

`auto` ist ein Klassifikator und als Leitplanke nah an diesem Skill — seine
Verbotsliste nennt Force-Push, entfernte Historie, das Entfernen von
Sicherheitstests. Gewähren kann er nur nicht, und Gewähren ist hier die Aufgabe.

**Zug 0 ist von alldem ausgenommen.** Er läuft in einem tmux-Fenster mit den
Rechten des Nutzers — es ist seine Session, und dort sitzt er. `PERM`,
`ALLOW_TOOLS` und `DENY_TOOLS` fassen ihn nicht an.

### Warum Implementierer und Reviewer nicht auch im Terminal laufen

Die naheliegende Frage, und die Antwort ist nicht »geht nicht«, sondern »kostet
mehr, als es bringt«.

**Für MCP bringt es nichts.** Das Problem war nie das Terminal, sondern der
Subagent: ein Prozess erbt die Konfiguration wie jede Session, ein Subagent
nicht. Sobald Implementierer und Reviewer Prozesse sind — und das sind sie —,
ist die Reichweite dieselbe, ob mit Terminal oder ohne.

**Für Rechte macht es die Lage schlechter.** Ein interaktiver Implementierer
erbt den Modus der Session, in der er startet, statt den der Schleife, und fragt
bei einer fehlenden Freigabe nach; in einem Pane, an dem niemand hängt, wartet
er dann. Aus einem Abbruch nach zwei Sekunden, der sagt, *welches* Werkzeug
fehlt, würde ein Lauf, der ohne sichtbaren Grund steht — und der Abbruch ist
unter `bypassPermissions` ohnehin fast verschwunden, das Warten wäre einer bei
jedem Paket.

**Und die Züge 1–5 verlören ihre Zusicherungen.** Der Wiederholungsversuch bei
Überlast, die Kostenobergrenze je Prozess, das Rückgabeschema, die Zählung
abgelehnter Aufrufe: alles hängt daran, dass ein Prozess ein Ergebnis-JSON
liefert und einen Exit-Code hat. Eine Terminal-Session liefert beides nicht.

Die Trennung folgt also nicht der Bequemlichkeit, sondern der Frage, ob jemand
antworten kann. Zug 0 könnte fragen, falls es der seltene Fall verlangt, der die
Richtung umwirft; alles danach arbeitet gegen einen Detailplan, in dem die
Entscheidungen schon stehen.

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
- **Beide werden abgekoppelt, und das Warten wird begrenzt.** Das sind zwei
  Dinge, und sie zusammenzulegen hat schon ein Paket gekostet. Die Frist deines
  Bash-Werkzeugs gehört dem Werkzeug, nicht der Arbeit: sie liegt bei zehn
  Minuten, sie ist nicht erhöhbar, und wenn sie abläuft, erschlägt sie die
  Prozessgruppe des Aufrufs. Ein Implementierer, der darin hängt, stirbt mit
  Exit 143 mitten im Umbau und hinterlässt einen halb geänderten Arbeitsbaum,
  den du zurücksetzen und ganz von vorn beauftragen musst. Gemessen am
  2026-08-26 an Paket 4 eines Laufs über `shadow-objects`: gestartet 13:55,
  erschlagen 14:06, elf Minuten für nichts.
  Für den Reviewer gilt dasselbe, und dass es ihn seltener trifft, macht die
  Regel nicht kleiner. Aus demselben Lauf, vier Reviewer über kleine bis
  mittlere Diffs: 39 s, 1:42, 1:47, 3:24. Der längste hat ein Drittel der
  Frist verbraucht, und die Größen, die ihn treiben, wachsen alle nach oben —
  ein Diff über 147 kB statt 40, eine Fehlerkette, die den Reviewer in Runde 2
  und 3 eine Modellstufe höher noch einmal fahren lässt. Ein Reviewer, der in
  die Frist läuft, kostet keinen Arbeitsbaum, aber einen Zug und eine Runde,
  und du erfährst es an einem Exit-Code, den du erst deuten musst.
  Also startest du beide abgekoppelt — `setsid` davor, Ausgabe in die
  Reportdatei, Exit-Code in eine Datei daneben (`paket-N.impl-<runde>.exit`
  beziehungsweise `paket-N.review-<runde>.exit` in `$ARBEITSDIR`), der Aufruf
  kehrt sofort zurück. Danach wartest du im Vordergrund in Blöcken, jeder
  Block eine Spanne unter deiner Werkzeugfrist:

      timeout 540 bash -c 'until [ -f "$ARBEITSDIR/paket-N.impl-1.exit" ]; do sleep 5; done'

  Läuft der Block ab, ohne dass die Datei da ist, rufst du ihn erneut auf. Das
  kostet einen Zug je neun Minuten statt einen je Sekunde, und der Prozess
  merkt von deinen Fristen nichts, weil er in keiner davon mehr steckt.
- **Deinen Zug lässt du nicht enden, solange einer der beiden läuft.**
  Abkoppeln heißt nicht weggehen. In `-p` gibt es keinen Prompt, an dem du
  stehenbleiben könntest: ein Zug ohne laufenden Werkzeugaufruf ist ein
  fertiger Zug, und die CLI erzwingt dann deine Rückgabe. Derselbe Lauf,
  dasselbe Paket: der zweite Anlauf kam sauber durch, der Runner war zu dem
  Zeitpunkt aber schon zur Rückgabe gezwungen, und die Züge 3 bis 5 haben nie
  stattgefunden — Review, Fehlerkette, Verify und Commit fehlten, das Paket
  stand auf `[~]`, die Arbeit lag uncommittet im Baum. Der Warteblock oben ist genau das Mittel
  dagegen: solange er läuft, läuft dein Zug. Auf eine Benachrichtigung zu
  setzen, die dich später wieder aufweckt, ist es nicht.
- Den Report liest du aus der Datei. Er steht damit auch noch da, wenn dein
  eigener Kontext längst weg ist.
- Modelle setzt du weiter ausdrücklich, nach der Dreistufen-Tabelle in
  `runner.md`. Neu ist, dass du daneben auch den Effort setzen kannst: ein
  eigener Prozess nimmt `--effort`, ein Subagent nicht.
- Gib jedem einen Namen mit: `--name "<session>-p<N>-impl-<runde>"`, für den
  Reviewer entsprechend. In der Session-Liste steht dann, wozu ein Aufruf
  gehörte, statt einer Uhrzeit.

Die Reports sind zugleich der Beleg: die Schleife prüft, ob je einer für
Implementierer und Reviewer im Arbeitsverzeichnis liegt, bevor sie einen Commit
gelten lässt. Ein Subagent hinterließe keine Datei und wäre hier kein Beleg —
und die Reichweite, um derentwillen der Umweg existiert, hätte er auch nicht.

## Deine Rolle, wenn du beauftragt wurdest

Ein Paket läuft in zwei Prozessen statt in einem. Die Trennung liegt zwischen
Zug 0 und Zug 1:

- **A** führt Zug 0 aus: Abgleich der Findings am aktuellen Code, Triage der
  Folgen und der offenen Befunde, Detailplan, Restplan prüfen. In den Detailplan
  gehört auf diesem Weg eine Zeile mehr: `- Effort:`, siehe unten. Danach steht
  das Paket auf `[~]`, und A hört auf. **A schreibt keine Zeile Projektcode und
  startet keinen Implementierer.**
  Der Nutzer ist erreichbar — als Einziger im ganzen Lauf. Das ist eine
  Rückfallebene, kein Arbeitsmittel: Verständnis holst du dir aus Code und
  Audit, und was sich begründen lässt, entscheidest du mit dem Grund daneben.
  Wann eine Frage die Unterbrechung wert ist, steht in `runner.md` unter »Wo du
  anhältst«; die Liste dort ist abschließend und gilt hier unverändert.
  **Deine letzte Handlung ist `touch <arbeitsdir>/paket-N.zug0.done`**, und
  zwar erst, wenn Detailplan und Marke im Plan stehen. Danach läuft eine Uhr:
  die Schleife schließt dein Fenster. Was zu diesem Zeitpunkt nur in deinem
  Kontext steht und nicht im Plan, hat es nie gegeben. Genau dieser eine
  Aufruf ist vorab freigegeben — buchstabengetreu, mit dem Pfad aus deinem
  Brief. Wer ihn umschreibt, umformuliert oder in ein anderes Kommando packt,
  bekommt eine Rückfrage, und die beantwortet um diese Zeit niemand mehr.
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

**Als A gibst du gar nichts zurück.** Es gibt keinen Kanal und keinen braucht
es: du schreibst den Plan, setzt die Marke, und die Marke ist die Rückgabe. Die
Tabelle oben unter »Zug 0« sagt, was die Schleife daraus liest. Das
Feierabendzeichen ist keine Rückgabe, sondern ein Schalter: es sagt *dass* du
fertig bist, nicht *was* dabei herauskam.

**Als B** gibst du ein JSON-Objekt nach `assets/runner-return.schema.json`
zurück, statt der neun Zeilen aus `runner.md`. Die Felder sind dieselben, die Statuswerte sind englisch, weil sie
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
- Bei `committed`: `rounds` liegt nicht über `MAX_ROUNDS`, und es gibt nicht
  mehr Implementierer-Reports als erlaubte Runden.
- Bei `committed`: im Arbeitsverzeichnis liegt je ein Report von Implementierer
  und Reviewer. Ein Runner schreibt keinen Projektcode selbst, und das wird
  belegt, nicht geglaubt.
- Die Paketnummer in deiner Rückgabe ist die aus deinem Auftrag, und das Feld
  `role` nennt die Rolle, in der du beauftragt wurdest. Wer sich für die andere
  hält, hat womöglich den falschen Zug gefahren.
- Kein Aufruf ist an einer Rechteschranke gescheitert.
- **Zug 0 hat »Entscheidungen« nur fortgeschrieben, wenn der Nutzer erreichbar
  war.** War er es auf keinem Weg und ist der Abschnitt trotzdem gewachsen,
  endet der Lauf mit Exit 20. Der Grund ist gemessen: ein Planer, den niemand
  beantwortet hat, notierte »Vorgabewert 30000 ms« — eine Zahl, die weder im
  Code noch im Audit steht — und der Mitschnitt behauptete dazu »User answered
  Claude's questions«. Aus seiner Sicht hat er eine Antwort bekommen; es gab nur
  niemanden, der sie hätte geben können. Eine Instruktion hilft dagegen nicht,
  ein Beleg schon: eine Entscheidung des Nutzers setzt einen Nutzer voraus.
  Erreichbar heißt auf zwei Wegen, und beide zählen gleich — ein Client am
  Fenster, den tmux sieht, oder ein offener Remote-Control-Kanal, den Mitschrift
  oder Scrollback des Fensters bezeugen. An derselben Erreichbarkeit hängt die
  Uhr aus `ZUG0_TIMEOUT`: solange einer der Wege offen ist, wartet der Lauf, so
  lange der Nutzer braucht. Die Frist richtet sich gegen den blinden Lauf, den
  niemand beaufsichtigt, nicht gegen den langsamen Menschen — wer nicht mehr
  antworten will, beendet den Lauf selbst. Der zweite ist kein Sonderfall: Zug 0 startet
  ausdrücklich mit `--remote-control`, damit dieselbe Frage vom Handy zu
  beantworten ist, und wer so antwortet, hängt an keinem tmux-Client. Ihn nur
  am Client zu messen hieße, den Weg anzubieten und jede Antwort darüber für
  erfunden zu erklären. Das wiegt schwerer als jeder Hänger — die Zeile trägt
  ein Datum, und ein späterer Lauf behandelt sie laut Regel als beschlossen.

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

**`EFFORT_B` ist wirklich nur B.** Implementierer und Reviewer laufen als eigene
Prozesse, und deren `--effort` setzt B selbst — nach dem Wert, den A in den
Detailplan geschrieben hat. Der Vorgabewert `medium` gilt für B, das beauftragt,
liest und committet; die Stufe, die zählt, steht im Paket.

Deshalb setzt **A** ihn und nicht die Umgebung: A hat den Code gesehen, in
seinem Fenster auch mit dir darüber gesprochen, und weiß, was dieses Paket
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
