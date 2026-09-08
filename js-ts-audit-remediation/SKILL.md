---
name: js-ts-audit-remediation
description: Use when the user wants the findings of an existing project audit actually fixed rather than reported — "arbeite die Issues aus dem Audit ab", "behebe die Findings", "setz die Empfehlungen um", "Backlog abarbeiten", "Schritt für Schritt beheben", "fix the audit findings", "work through the audit". Also triggers when a `./audit.html` sits in the project root and the user asks for the problems in it to be resolved. Equally for picking a run back up after it stopped, crashed or was aborted by the user — "nimm die Arbeit am Remediation-Plan wieder auf", "mach mit dem Plan weiter", "führe den Lauf fort", "der Lauf ist abgebrochen, mach weiter", "resume the remediation run", "continue where we left off" — whenever a `./remediation-plan.md` with open packages or open findings lies in the project, no matter why the previous run ended. Producing the audit itself is a different job — that is `js-ts-project-audit`.
---

# Audit-Remediation

Aus den Findings eines Audits werden Pakete. Die Pakete fährt
`scripts/remediate.sh` in einer abgelösten tmux-Session, je Paket vom Abgleich
bis zum Commit. Du planst, du fragst den Nutzer, du startest das Skript, du
schließt ab — den Rest siehst du nicht.

## Ablauf

1. Findings laden (1), Baseline messen (2), Scope festlegen (3).
2. Offene Entscheidungen gebündelt klären (4).
3. Pakete schnüren, ordnen, Grobplan schreiben, Freigabe holen (5).
4. `scripts/remediate.sh` starten und laufen lassen, bis kein Paket mehr offen ist (6).
5. Befund-Queue leeren, `./audit.html` nachführen, Report schreiben, tmux-Session schließen (7) — ohne Rückfrage.

Geplant wird zweistufig. Schritt 5 legt fest, **was** in welcher Reihenfolge
passiert; das gibt der Nutzer frei, und es steht in `./remediation-plan.md`.
**Wie** ein Paket umgesetzt wird, entsteht im Runner gegen den dann aktuellen
Code und steht in `docs/remediation/paket-<N>.md`.

| Datei | Wann |
| --- | --- |
| `references/resume.md` | **vor allem anderen**, sobald ein `./remediation-plan.md` im Projekt liegt — egal ob der Nutzer »arbeite das Audit ab« oder »mach weiter« sagt |
| `references/shell-runner.md` | einmal vor Schritt 6, bevor du das Skript startest |
| `references/runner.md` | **nie von dir.** Der Text gehört den Runnern; in deinem Kontext bliebe er bis zum Ende des Laufs stehen, ohne dass du ihn brauchst |
| `references/semver-and-closeout.md` | Schritt 7 |
| `references/audit-report-update.md` | Schritt 7, nur wenn eine `./audit.html` im Projekt liegt |

## Grenzen des Laufs

Diese Regeln stehen über jeder Abwägung im Einzelfall:

- **Ohne Freigabe des Grobplans wird keine Zeile Projektcode geändert.** Auch
  nicht »schon mal das Triviale vorziehen«.
- **Wer committet, hat den Verify-Lauf selbst gefahren und seine Ausgabe
  gelesen.** Das ist der Runner, nicht der Implementierer. Ein Report ist keine
  Evidenz.
- **Ein Commit ohne Review-Beleg wird nachgeprüft, nicht verworfen und nicht
  dir vorgelegt.** Die Schleife zieht den Review nach; das Paket steht solange
  auf `[r]`, die Ausnahme steht im Plan. Weder du noch der Nutzer werden dafür
  gebraucht.
- **Kein Push, kein Merge, kein Pull Request, kein Tag, kein Publish.** Der
  Lauf endet mit lokalen Commits.
- **Kein Worktree, kein neuer Branch von sich aus.** Gearbeitet wird auf dem
  Branch, den Schritt 5 benennt und der Nutzer freigibt.
- **Du schreibst keinen Projektcode und startest keinen Runner.** Weder als
  schnelle Korrektur noch nachdem das Skript abgebrochen ist. Die Pakete fährt
  `scripts/remediate.sh`, und sonst niemand.
- **Gefixt wird nur, was im Plan steht.** Kein Implementierer behebt etwas
  nebenbei; was ihm auffällt, meldet er. Ob ein Nebenbefund in diesen Lauf
  gehört, entscheidet die Scope-Regel aus Schritt 3 — einen Fix ohne Zeile im
  Plan gibt es in keinem Fall.
- **Der Lauf ist nicht fertig, solange die Befund-Queue Einträge hat.** Offene
  Pakete und offene Befunde sind dieselbe Bedingung.
- **Der Runner schärft den Plan, er ersetzt ihn nicht.** Freigegeben sind
  Zielsetzung, Paketschnitt und Reihenfolge. Wer davon im Kern abweichen will,
  hält an und legt es dir vor, und du legst es dem Nutzer vor.
- **Eine Ansage ist keine Frage.** Gewartet wird nur, wo eine Frage steht:
  unsauberer Arbeitsbaum (2), Klärungsrunde (4), Freigabe des Grobplans (5),
  eine Rückfrage aus der Schleife (6). »Widersprich, sonst mache ich X« heißt:
  X passiert jetzt, ein späterer Widerspruch wird eingearbeitet. Der Abschluss
  (7) besteht nur aus Ansagen.

## Workflow

### 1. Findings laden

**Zuerst nachsehen, ob es diesen Lauf schon gibt.** Liegt ein
`./remediation-plan.md` im Projekt, wird nichts neu geplant und auch die
`audit.html` nicht geöffnet, sondern `references/resume.md` gelesen. »Arbeite
die Findings ab« meint fast nie einen zweiten Lauf, sondern den offenen; wie
der vorige endete, steht in der Datei, nicht in der Frage.

Quelle ist die JSON-Insel `<script id="audit-data" type="application/json">` in
`./audit.html`: Findings, `summary`, `acknowledged`.

- Insel nicht parsebar: Findings best effort aus der Backlog-Tabelle
  rekonstruieren (Titel, Severity, Location, Kategorie, Empfehlung) und im Plan
  vermerken, dass die Grundlage unvollständig ist.
- Keine `audit.html`: nicht raten. Fragen, ob `js-ts-project-audit` laufen
  soll oder wo die Issue-Liste liegt.
- `acknowledged` bleibt draußen, bis der Nutzer es widerruft.

### 2. Baseline messen

Verify-Kommandos aus `package.json#scripts` ermitteln (Lint, Typecheck, Test,
Build), jedes einmal laufen lassen, Ergebnis festhalten. Die Kommandos kommen
wörtlich in den Kopf des Plans: Schritt 7 fährt dieselben, nicht neu
zusammengesuchte. Was jetzt schon fehlschlägt, wird im Plan namentlich notiert
und blockiert später keinen Commit; ist die Baseline auf breiter Front rot,
ist ihre Reparatur das erste Paket.

Ausgaben umleiten, nur den Schwanz lesen:

```bash
set -o pipefail
<kommando> > "$ARBEITSDIR/baseline-<name>.log" 2>&1; echo "exit=$?" | tee -a "$ARBEITSDIR/baseline-<name>.log"
tail -n 15 "$ARBEITSDIR/baseline-<name>.log"
```

`$ARBEITSDIR` ist das Scratchpad-Verzeichnis des Hosts, sonst ein eigenes
Verzeichnis unter dem Temp-Verzeichnis des Systems — außerhalb der
Versionierung und **nicht unterhalb von `.git/`**, dorthin lässt die CLI keinen
Runner schreiben. Der Pfad kommt in den Kopf des Plans.

Dazu `git status` und `git branch --show-current`. Ein unsauberer Arbeitsbaum
ist ein Stopp mit Rückfrage: stashen, committen oder abbrechen.

### 3. Scope festlegen

Vorschlag: alle Findings außer `info`, Anzahl je Severity nennen, bestätigen
lassen. Der Nutzer kann eingrenzen (Severity, Kategorie, IDs, Verzeichnis).
Was draußen bleibt, steht im Plan.

Festgehalten wird **die Regel, die die Auswahl erzeugt hat**, nicht die
Auswahl: sobald im Lauf ein Befund auffällt, den das Audit nicht kennt,
entscheidet über ihn die Regel. Sie steht als Satz im Plan-Kopf
(`Scope-Regel:`), in den Worten des Nutzers und anwendbar auf ein Finding, das
es noch nicht gibt: »ab medium aufwärts, jede Kategorie«, »alles aus BUG und
SEC«, »nur was unter `src/net/` liegt«. Hat der Nutzer einzelne IDs gepickt,
lässt sich keine Regel ablesen — dann im selben Zug fragen, mit Vorschlag:
gilt für neu auffallende Befunde dasselbe Muster, oder gehen sie ins Audit?

Der Scope sind diese Findings **samt dem, was ihre Behebung nach sich zieht**.
Ein Lauf, der zwölf Findings schließt und fünf neue Defekte hinterlässt, hat
die Buchhaltung verschoben; das nächste Audit hält die neuen für vorbestehend.

| | Was es ist | Wohin |
| --- | --- | --- |
| **Nebenbefund** | war auch ohne diesen Lauf falsch | in die Befund-Queue, mit Urteil an der Scope-Regel; von dort in ein Paket oder als neues Finding ins Audit |
| **Folge** | hat eine Änderung dieses Laufs verursacht | in ein Paket dieses Laufs, ausnahmslos |

Zwei Fälle schlagen die Regel und kommen zum Nutzer, auch bei klarem Scope:
die Behebung kippt eine Architekturentscheidung, die das Projekt anderswo
trägt, oder sie sprengt den Umfang eines Pakets.

Die Regel entscheidet über die Zuordnung, nicht über den Zeitpunkt: ein
Nebenbefund im Scope wird nicht nebenbei behoben, sondern wandert mit Urteil
in die Queue und wird in der Drain-Runde zum Paket — es sei denn, er teilt die
Ursache mit einem noch offenen Paket.

### 4. Offene Entscheidungen klären

Vor dem Plan, gebündelt in einer Runde, je mit Vorschlag. Gefragt wird, wo
eine Entscheidung fehlt:

- die Sektion »Offene Fragen« des Reports
- Empfehlungen, die zwei gleichwertige Wege offenlassen
- Findings, die eine Produkt- oder API-Entscheidung berühren: Export
  streichen, Default ändern, Dependency austauschen
- Findings, die einander widersprechen oder einander gegenstandslos machen
- Findings ohne belastbare Empfehlung

**Alles andere wird nicht gefragt.** Eine eindeutige Empfehlung gilt — sie
entscheidet das Wie, nicht das Ob. Ausnahme: ihre Umsetzung ändert, was ein
fremder Aufrufer sieht. Der Test: Müsste jemand, der dieses Projekt einbindet,
seinen Code anfassen? Dann in die Klärungsrunde, samt Vorschlag, wie weit der
Lauf die eigenen Aufrufer mitzieht.

Die Antworten kommen mit Datum in den Plan-Abschnitt »Entscheidungen«.

### 5. Pakete, Reihenfolge, Grobplan

**Bündeln ist die Regel, Trennen die Ausnahme.** Jedes Paket kostet einen
Runner, einen Implementierer, einen Reviewer, ein Verify-Gate, einen Commit
und ein Fenster, in dem der Nutzer gebraucht wird — unabhängig davon, wie viel
im Paket steckt. Zwölf Pakete sind nicht gründlicher als sechs.

Zusammen kommt, was mindestens eines davon teilt: **Ursache** (ein Fehler,
mehrere Symptome), **Verifikation** (dasselbe Gate), **fachliche Domäne**
(dasselbe Subsystem, ablesbar aus `location`), **Diff-Fläche** (der Reviewer
läse ohnehin dieselben Dateien), **Voraussetzung** (derselbe Umbau vorweg).
Teilt ein Finding nichts davon, steht es allein. **Im Zweifel eines** — was zu
groß ist, schneidet der Runner in Zug 0 nach; was zu klein ist, bleibt zu
klein.

**Getrennt bleibt**, was einen dieser Blocker auslöst:

- **Severity-Sprung.** Ein kritischer Fix wandert nie in ein Kosmetik-Paket.
- **Reviewbarkeit.** Hält ein Reviewer den Diff in einem Durchgang? Orientierung
  rund zehn Findings oder fünfzehn Dateien; ein einzelnes Finding, das das
  sprengt (`strict: true` über ein gewachsenes Projekt), wird zerlegt.
- **Echte Abhängigkeit.** Muss A committet sein, bevor B gebaut werden kann.

Nichts anderes trennt: nicht Kategorie, nicht Datei, nicht Phase.

**Reihenfolge** in fünf Phasen: (1) Sicherungsnetz und Sichtbarkeit — Lint,
Typecheck, Testrunner, CI; (2) Tests für genau die Bereiche, die Phase 3 und 4
umbauen; (3) Korrektheit — Bugs, Leaks, Async, Sicherheit; (4) Typsicherheit
und Struktur — Strictness, Architektur, Modulgrenzen, öffentliche API; (5)
Konsistenz, DX, Doku, Dependency-Kosmetik.

Die Phasen sortieren, sie schneiden nicht: ein Paket darf Phasen überspannen
und steht dann an der Stelle seines schwersten Findings; ein Phase-2-Test, der
genau die Fläche eines Phase-3-Pakets absichert, ist dessen erster Schritt.
Drei Querregeln schlagen die Phasen: echte Abhängigkeiten gehen vor;
Dependency-Bumps, die APIs verändern, nach vorn; breitflächige
Umformatierungen und Renames ganz vorn oder ganz hinten, nie dazwischen.

**Der Grobplan** wird nach `./remediation-plan.md` geschrieben und überschreibt
eine vorhandene Datei. Du legst Kopf, Entscheidungen, Queue und Paketliste an;
die Runner tragen Marken, Hashes und Ergebnisse nach. **Die Einzelheiten je
Paket schreibst du nicht:** sie entstehen in Zug 0 des Runners und landen in
`docs/remediation/paket-<N>.md`. Den Plan öffnet jeder Runner, Implementierer
und Reviewer in jedem Paket; die Trennlinie ist die Frage **braucht das
jemand, der an einem anderen Paket arbeitet?** Dann Plan, sonst Paketdatei.
Was hier steht, muss reichen, damit der Nutzer Schnitt und Reihenfolge
beurteilen kann. Mehr nicht.

```markdown
# Remediation-Plan — <Projektname>

Quelle: ./audit.html vom <Datum> · Branch: <name> · erstellt: <Datum>
Baseline: `npm run lint` ✓ · `npm run typecheck` ✓ · `npm test` 3 Fehler
(vorbestehend, siehe unten) · `npm run build` ✓
Arbeitsverzeichnis: <pfad> (Diffs und Verify-Logs, außerhalb der Versionierung)
Paketdetails: docs/remediation/paket-<N>.md — je Paket eine Datei, angelegt von dessen Zug 0
Scope: 24 von 31 Findings (3 critical, 8 high, 13 medium) · ausgenommen: info, acknowledged
Scope-Regel: alles ab medium, jede Kategorie — gilt auch für Befunde, die erst im Lauf auffallen
Stand (<Datum>): Paket 1 noch nicht begonnen · Arbeitsbaum sauber

Diese Datei führt einen Lauf des Skills `js-ts-audit-remediation` und hält
seinen Stand. Wer hier weiterarbeitet: diesen Skill laden, die eingetragenen
Hashes gegen `git log --oneline` halten, beim obersten Paket ohne `[x]`
einsteigen. Der Lauf ist erst fertig, wenn auch »Offene Befunde« leer ist.
Statusmarken: `[ ]` offen · `[~]` Detailplan steht, Umsetzung läuft · `[x]`
erledigt · `[r]` committet, Review wird nachgezogen · `[!]` blockiert.

## Entscheidungen
- Alten `parseConfig`-Export entfernen statt deprecaten (2026-07-26)

## Konventionen
Gelten für jede Zeile, die in diesem Lauf entsteht — Code, Kommentare,
Dokumentation, CHANGELOG, Migrations-Hinweise, Commit-Messages:
- Inline-Kommentare sind erwünscht, wo sie erklären, *warum* etwas so ist.
- Keine Finding-IDs, auch nicht in der Commit-Message. Sie gehören diesem einen
  Audit, sind danach tot, und die Commit-Message überdauert den Lauf. Sie leben
  in diesem Plan und sonst nirgends; die Verbindung zwischen Finding und Commit
  trägt das Feld `Hash:` unter dem Paket — in genau der Richtung, in der jemand
  sie später sucht. Eine Commit-Message sagt in eigenen Worten, was sie ändert.
- Kein Rückblick auf den Vorzustand: kein »früher«, kein »statt bisher«, kein
  »im Zuge des Audits umgestellt«. Der Test: Ergibt der Satz für jemanden Sinn,
  der den Vorzustand nie gesehen hat? Dann bleibt er. Braucht er ihn, gehört er
  in die Commit-Message — die Historie ist bereits konserviert.

## Vorbestehende Fehler
- `test/legacy.spec.ts` — 3 Fehler, vor Lauf-Beginn vorhanden, kein Teil des Scopes

## Offene Befunde
Nebenbefunde aus den Paketen: was auch ohne diesen Lauf falsch war. Jeder
Eintrag wird beschlossen, bevor der Lauf endet — Paket oder Rückgabe ins Audit.
Ein leerer Abschnitt ist Abschlussbedingung, kein Zufall. Das Urteil am Ende
der Zeile misst den Eintrag an der Scope-Regel oben: `→ Scope`, `→ Audit`,
`→ Rückfrage`.
- [ ] `src/net/pool.ts:120` (high) — dieselbe Timer-Falle wie LEAK-001, nicht im Audit (aus Paket 3) → Scope
- [ ] `docs/api.md:40` (low) — Beispiel zeigt eine Option, die es nicht mehr gibt (aus Paket 3) → Audit

## Pakete

### [ ] 1. WebSocket-Reconnect: Listener und Timer aufräumen
- Findings: LEAK-001 (high), LEAK-003 (high)
- Ziel: <ein Satz>
- Bereich: `src/net/`
- Hängt ab von: —
- Hash: —
```

Zum Template:

- Der Einstiegsabsatz mit Statuslegende und der Abschnitt »Konventionen« stehen
  wörtlich so in der Datei. Konventionen werden projektspezifisch ergänzt,
  nicht ersetzt. Sie stehen im Plan, weil sie für jede Zeile des Laufs gelten
  und sonst in jeden Brief kopiert werden müssten; die Commit-Message steht auf
  der bleibenden Seite, auch wenn sie im Lauf entsteht.
- »Entscheidungen« ist die wichtigste Stelle im Kopf: daran misst der Runner,
  ob eine Umplanung im Rahmen liegt oder eine Rückfrage braucht.
- `Hängt ab von` benennt nur echte Zwänge (Paket 4 braucht die Modulgrenze aus
  Paket 2), nicht die Reihenfolge. Steht dort nichts, ist das Paket
  verschiebbar.
- Die Überschrift ist ein Format: `### [Marke] <Nummer>. <Titel>`, Marke genau
  ein Zeichen, Nummer Ziffern mit optionalem Kleinbuchstaben. Das Skript liest
  sie mit `sed`; was abweicht, ist für es kein Paket.
- Die Zeile `- Detail: docs/remediation/paket-<N>.md` trägt Zug 0 nach, `Stand:`
  schreiben die Runner fort, `Hash:` bleibt bis zum Commit leer. Eine
  Modellstufe steht hier nicht — die setzt Zug 0 in der Paketdatei.
- Zwei Stellen gehören dem Skript: der Abschnitt `## Tokenverbrauch` am Ende
  und die Zeile `Lauf-Status:` direkt unter `Arbeitsverzeichnis:`. Weder du
  noch ein Runner schreibt sie.
- Ein Paket, dessen Ziel sich nicht in einem Satz sagen lässt, ist falsch
  geschnitten.

**Freigabe.** Der Grobplan wird vorgelegt, ausdrücklich mit Branch und
Commit-Modus: »<N> Pakete, <N> Commits direkt auf `<branch>`, ohne
GPG-Signatur«. Dazu je ein Satz:

- Jedes Paket wird unmittelbar vor seiner Umsetzung gegen den dann aktuellen
  Code detailliert; eine Umplanung, die Zielsetzung oder Architektur berührt,
  kommt zurück zum Nutzer.
- Folgen werden in diesem Lauf mit behoben, notfalls in zusätzlichen Paketen —
  die Paketzahl ist eine Untergrenze.
- Nebenbefunde, mit der Scope-Regel wörtlich: was darunter fällt, wird in
  diesem Lauf behoben, der Rest geht als neues Finding ins Audit — beides ohne
  Rückfrage, beides im Abschlussreport nachlesbar.
- Die Pakete fährt `scripts/remediate.sh` in einer abgelösten tmux-Session. Zug
  0 jedes Pakets bekommt dort ein eigenes Fenster und kann fragen; der Nutzer
  wird nur am Anfang jedes Pakets gebraucht und muss nichts schließen. Die
  Umsetzung läuft ohne ihn, mit den Rechten ihres Permission-Modus.
- Er muss nicht danebensitzen: jedes committete Paket, das Ende und jeder
  unerwartete Ausgang werden gemeldet — per `PushNotification` aus dieser
  Session und per Desktop-Nachricht aus der Schleife, die auch ohne diese
  Session ankommt; `NOTIFY_CMD` nimmt ein weiteres Kommando, voreingestellt
  ist dort nichts.
- Verbleib des Plans, als Ansage: »Am Ende nimmt ein Commit
  `./remediation-plan.md` samt `docs/remediation/paket-*.md` ins Repo, ein
  zweiter räumt beides aus dem Arbeitsbaum — die Historie behält sie. Im
  Projekt bleibt allein `docs/remediation/<YYYYMMDD>-remediation-report.md`.
  Sag Bescheid, wenn Plan und Paketdateien stattdessen ungetrackt liegenbleiben
  sollen.« Ein Widerspruch steht datiert in »Entscheidungen«. Während des Laufs
  bleiben beide ungetrackt: sie tragen die Hashes der Commits, in denen sie
  deshalb nicht liegen können.

Diese Freigabe ist die Vollmacht für den ganzen Abschluss; danach wird nicht
mehr gefragt. Ohne sie beginnt die Umsetzung nicht.

### 6. Die Schleife

Vor dem ersten Start `references/shell-runner.md` lesen. Sobald der Grobplan
freigegeben ist, startest du das Skript — ungefragt, das ist die Freigabe:

```bash
ORCHESTRATOR_SESSION=<deine Session-Kennung> <skill>/scripts/remediate.sh
```

Die Kennung ist bei Claude Code der UUID-Abschnitt im Pfad deines
Scratchpad-Verzeichnisses; sie lässt den Lauf deine Session in der
Tokentabelle mitzählen. Kennst du sie nicht, lass die Variable weg.

Das Skript hängt sich in eine abgelöste tmux-Session, kommt sofort zurück und
läuft unabhängig von dir. Vier Dinge, die ersten drei sofort:

1. Die Startausgabe wörtlich an den Nutzer weitergeben — sie nennt die
   tmux-Session, wie er sich anhängt und wo Journal, Sperre und Mitschrift
   liegen.
2. Ihm sagen, dass Zug 0 des ersten Pakets dort in einem eigenen Fenster auf
   ihn wartet und dass er es nicht zu schließen braucht.
3. **Den Wachposten auf das Journal setzen** (unten). Ohne ihn erfährt niemand,
   dass der Lauf fertig ist — ein Abschluss ist so schon einen halben Tag
   liegengeblieben.
4. Auf jedes Ereignis reagieren, das er meldet. Nur `ende exit=0` führt zu
   Schritt 7; die anderen Codes stehen in `references/shell-runner.md`.

**Du blockierst nicht, und du wirst geweckt.** Ein Lauf dauert Stunden; ein
Kommando, das so lange im Vordergrund läuft, macht deine Session unbrauchbar.
Kein blockierender Aufruf, kein `ScheduleWakeup` im Minutentakt, kein
Nachsehen »nur mal kurz«.

#### Der Wachposten

Ein `Monitor` mit `persistent: true` auf Journal und Sperre; beide Pfade nennt
die Startausgabe (`Journal:`, `Sperre:`). Er beendet sich selbst.

```bash
J='<Journal-Pfad aus der Startausgabe>'
L='<Arbeitsverzeichnis aus der Startausgabe>/.remediate.lock'
z() { if [ -f "$J" ]; then wc -l < "$J" | tr -d ' '; else echo 0; fi; }
n=$(z); fertig=0
neues() {
  local m neu; m=$(z); [ "$m" -gt "$n" ] || return 0
  neu=$(sed -n "$((n+1)),${m}p" "$J"); n=$m
  printf '%s\n' "$neu" | grep -E 'status=|marke=\[x\]|marke=\[!\]|ende exit=' || true
  case "$neu" in *'ende exit='*) fertig=1 ;; esac
}
i=0; while [ ! -d "$L" ] && [ "$i" -lt 30 ]; do sleep 2; i=$((i+1)); done
[ -d "$L" ] || { echo "Nach 60s keine Sperre $L — die Schleife ist nie angelaufen."; exit 0; }
while :; do
  neues; [ "$fertig" = 1 ] && break
  if [ ! -d "$L" ]; then
    neues
    [ "$fertig" = 1 ] || echo "Sperre weg, Journal ohne »ende exit=« — die Schleife ist gestorben, ohne ihren Trap zu erreichen."
    break
  fi
  sleep 20
done
```

Warum die Sperre: ein fortgesetzter Lauf schreibt in dasselbe Journal, in dem
das `ende exit=` des Vorgängers schon steht; wer nur danach sieht, hält den
frischen Lauf für beendet. `.remediate.lock` existiert genau, solange eine
Schleife arbeitet — verschwindet sie ohne `ende`-Zeile, ist die Schleife
gestorben, ohne ihren Trap zu erreichen (`kill -9`, Terminal weg). Die Minute
Geduld am Anfang: die Sperre entsteht erst im abgelösten Prozess. Der Filter
lässt den `[~]`-Vermerk absichtlich aus — halbe Pakete sind kein Anlass.

#### Was du je Ereignis tust

Der Nutzer hat um eine Nachricht nach jedem Paket und am Ende gebeten; das
schlägt die übliche Zurückhaltung bei `PushNotification`. Eine Zeile, das
Wichtigste zuerst. Meldet sie »not sent«, sitzt er am Terminal und liest deine
Antwort ohnehin — trotzdem senden, statt zu raten.

| Zeile im Journal | Was du tust |
| --- | --- |
| `status=committed` | Push mit Paketnummer, Kurzhash und Paketstand |
| `status=dropped`, `marke=[x]` | Push, knapp |
| `status=review-offen` | **nichts.** Die Schleife zieht den Review nach; die nächste Zeile zu dem Paket ist seine `status=committed` |
| `status=question`, `status=blocked`, `marke=[!]` | Push, der die Frage nennt, dann `references/shell-runner.md` |
| `ende exit=0` | Push, und **sofort** Schritt 7 — nicht auf ein Signal des Nutzers warten |
| `ende exit=` mit anderer Zahl | Push, der die Zahl nennt, dann die Exit-Tabelle |

Stirbt deine Session, stirbt der Wachposten mit ihr. Dafür gibt es zwei Netze
ohne Session: die Desktop-Nachricht der Schleife und die Zeile `Lauf-Status:`
im Plan-Kopf, die ein späterer Agent über `references/resume.md` liest.

Was du **nicht** tust: keinen Runner selbst starten, keinen Subagenten für ein
Paket, keine eigene Schleife — auch nicht nach einem Abbruch. Fragt der Nutzer
nach dem Stand, zeigt `tmux capture-pane -p -t <session>:0` das Pane und das
Journal die Zeilen. Häng dich nicht selbst an die Session — dort sitzt er.

### 7. Abschluss

Nach dem letzten Paket `references/semver-and-closeout.md` lesen: Drain der
Befund-Queue, voller Verify-Lauf, CHANGELOG, Nachführen der `./audit.html`,
Remediation-Report mit Tokenverbrauch und Semver-Empfehlung, die beiden
Abschluss-Commits, Übergabe. Ohne Rückfrage; die Freigabe aus Schritt 5 deckt
ihn.

## Prinzipien

- **Die Empfehlung gilt.** Ein anderer Weg braucht einen Grund im Detailplan
  oder im Report, keine stille Umdeutung.
- **Bugfix heißt Test zuerst.** Fehlschlagenden Test schreiben, rot sehen,
  dann beheben. Ausgenommen Pakete ohne testbaren Kern: Konfiguration, Doku,
  Dependency-Bumps, Formatierung. Fehlt jede Testinfrastruktur, ist das ein
  Finding für Phase 1 — mitten im Bugfix wird kein Harness nachgerüstet.
- **Der Plan ist die Wahrheit, nicht die Erinnerung.** `./remediation-plan.md`
  und `git log` schlagen, was du zu wissen glaubst. Was nur in einem
  Agentenkontext steht, gibt es nach dessen Rückgabe nicht mehr.
- **Dein Kontext gehört der Koordination.** Keine Diffs, keine Verify-Ausgaben
  außer fünfzehn Zeilen Schwanz, keine Reports im Volltext, keine Paketdatei
  (außer der Abschluss verlangt es), keine Referenzdatei eines anderen Zuges.
- **Sprache.** Antworten in der Sprache der Anfrage, Commit-Messages in der
  Sprache von `git log`.

## Zusammenspiel mit anderen Skills

- `js-ts-project-audit` liefert den Input und fixt nie; dieser Skill auditiert
  nie. Dass Schritt 7 in die `./audit.html` schreibt, ist kein Bruch: gebucht
  wird, was Reviewer-Urteil und Commit-Hash belegen, der Score ist die Formel
  des Audits auf ein verändertes Backlog. Die Bewertung des Codes und die Optik
  der Seite bleiben beim nächsten Audit-Lauf, den der Nutzer startet, wann er
  will — angeboten wird er nicht.
- Fährt der Nutzer die Umsetzung ausdrücklich über
  `superpowers:subagent-driven-development`, gewinnt dessen Prozess innerhalb
  eines Pakets. Findings-Quelle, Paketschnitt, Runner, Befund-Queue,
  Fortschreibung des Plans, Semver-Empfehlung und Report bleiben hier.
- Bleibt ein Verify-Lauf nach zwei Runden unerklärlich rot:
  `superpowers:systematic-debugging`, falls vorhanden, sonst Paket blockieren
  und berichten.
- Auf einem Feature-Branch ist die Integration Sache des Nutzers. Dieser Skill
  pusht und merged nicht.
