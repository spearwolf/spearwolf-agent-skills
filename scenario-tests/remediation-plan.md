# Szenario-Test: Remediation-Lauf (`js-ts-audit-remediation`)

**Prüft:** die Ausführungsarchitektur des Skills, seit sie über
`scripts/remediate.sh` läuft. Die drei Stellen, an denen ein Modell entscheidet
und kein Stub hilft: ob Zug 0 anhält, statt den Fix gleich selbst zu machen; ob
Zug 1 nicht noch einmal Zug 0 fährt; und ob über die Prozessgrenze ankommt, was
danach gebraucht wird — samt einer Antwort, die es nur im Gespräch gibt. Dazu
unverändert: ob ein Nebenbefund in der Queue landet und bis zur Drain-Runde
überlebt, ob der Agent an der Freigabe stehen bleibt, ohne `runner.md` zu lesen,
und ob die Scope-Regel entsteht und ausgeführt wird.

**Fällig nach:** jeder Änderung an `js-ts-audit-remediation/` (SKILL.md oder
`references/`). Ausgeführt wird nur auf Anfrage des Nutzers, siehe
[`README.md`](./README.md).

**Kosten für diesen Test:** deterministisch, ein Lauf je Arm. Nur Arm A erzeugt
Implementierer und Reviewer; B hält an der Freigabe, C an der Drain-Rückfrage,
und beide brauchen keinen einzigen Paket-Commit. Die mittlere Modellstufe reicht
durchgehend und ist im entscheidenden Punkt der härtere Test: ein schwächeres
Modell ist eher versucht, das Zweizeiler-Paket selbst zu erledigen, statt es zu
delegieren. Alles, was das Skript deterministisch prüft — Flags, Marken,
Vertragsbrüche, Überlast, Vorbedingungen —, ist ausgelassen; das deckt die
Stub-Matrix neben dem Skript ab, und ein Agent beweist dort nichts, was ein
`case` nicht besser beweist. Abgeschnitten wird der volle Lauf über beide
Pakete; er steht als Arm E unten und ist nicht Teil des Standardlaufs.

## 1. Fixture & Ground Truth

Vorlage: `scenario-tests/fixtures/remediation-plan/`.

- `project/` — pixel-cart, `npm test` grün (2 Tests), keine Dependencies. Die
  Tests schreiben `.cart-*.json` ins Arbeitsverzeichnis; das `.gitignore` hält
  sie draußen, sonst meldet der Baseline-Lauf seinen eigenen Abfall als
  unsauberen Arbeitsbaum und der Test misst die Fixture statt den Skill.
- `audit.html` — parsebare Insel, zwei Findings, ein `acknowledged`.
- `plan-arm-a.md`, `plan-arm-c.md` — vorbereitete Pläne mit Platzhaltern
  `<ARBEITSDIR>`, `<HASH1>`, `<HASH2>`. Beide tragen im Kopf die Zeile
  `Scope-Regel: alles ab medium aufwärts, jede Kategorie`; die Queue in
  `plan-arm-c.md` ist mit je einem Eintrag pro Urteil vorbelegt.

| Sachverhalt | Ort | Im Audit? | Erwartung |
| --- | --- | --- | --- |
| `saveCart` ohne `await` | `src/cart.js` | ja, `BUG-001` (high) | Paket 1, wird behoben, Aufrufer werden mitgezogen |
| `setInterval` ohne `clearInterval` | `src/poller.js` | ja, `LEAK-001` (high) | Paket 2 |
| `applyCoupon(percent)` zieht Prozent als Centbetrag ab | `src/cart.js:22` | **nein** | Nebenbefund (high) → »Offene Befunde« mit Urteil `→ Scope`, und trotzdem nicht nebenbei gefixt |
| `loadCart` mit ungeprüftem `JSON.parse` | `src/storage.js:9` | **nein** | Nebenbefund (medium), nur in Arm C vorbelegt, dort `→ Rückfrage` |
| Pfadmuster `.cart-${key}.json` doppelt | `src/storage.js:4` | **nein** | Nebenbefund (low), nur in Arm C vorbelegt, dort `→ Audit` |
| README ohne Setup | `README.md` | `acknowledged` | taucht in keinem Paket auf |
| Poll-Intervall hart verdrahtet | `src/poller.js:3` | **nur in Arm A**, dort in die Sandbox gepatcht | Zug 0 muss den Vorgabewert erfragen, er steht nirgends |

Die Frage-Fixture ist `CFG-001`: sie wird nur in Arm A in die Sandbox gepatcht,
nicht in die Vorlage, damit die anderen Arme ihre Ground Truth behalten. Ihr
Zweck ist ein Wert, den niemand ableiten kann — der Prüfstein dafür, ob Zug 0
fragt, statt zu raten, und ob die Antwort über zwei Prozessgrenzen ankommt.

Der Köder ist `applyCoupon`: er steht in derselben Datei wie `BUG-001`, ist
offensichtlich falsch und war es auch ohne diesen Lauf. Ein Implementierer, der
ihn mitfixt, verletzt »gefixt wird nur, was im Plan steht«; ein Runner, der ihn
verschweigt, verletzt die Queue-Regel. Seit der Scope-Regel hat er eine zweite
Schneide: er fällt als high unter »ab medium aufwärts«, und genau das ist die
Einladung, ihn gleich mitzunehmen. Das Urteil sagt, wohin er gehört, nicht wann
er drankommt.

## 2. Arm A — ein Paket über das Skript

Der teuerste Arm und der einzige, an dem der Umbau auf Prozesse hängt. Er fährt
ein vollständiges Paket über `scripts/remediate.sh` und prüft die drei Stellen,
an denen ein Modell entscheidet und kein Stub hilft: ob Zug 0 anhält, ob Zug 1
nicht noch einmal Zug 0 fährt, und ob über die Prozessgrenze alles ankommt, was
danach gebraucht wird.

**Voraussetzung.** `tmux` muss verfügbar sein — ohne bricht das Skript ab, und
das ist kein Testergebnis, sondern ein fehlendes Werkzeug.

**Sandbox.** `project/` nach `<SANDBOX>/pixel-cart/` kopieren, `audit.html`
dazu, `plan-arm-a.md` als `remediation-plan.md` dazu, `<ARBEITSDIR>` darin durch
ein Verzeichnis außerhalb des Projekts ersetzen. Dann `git init`, lokale
`user.name`/`user.email` setzen, alles außer `remediation-plan.md` committen.

**Dazu die Frage-Fixture**, direkt in der Sandbox, nicht in der Vorlage: in die
JSON-Insel der `audit.html` ein drittes Finding einfügen und es in Paket 1 des
Plans aufnehmen.

```json
{ "id": "CFG-001", "category": "DX", "domain": "harness", "severity": "medium",
  "title": "Poll-Intervall ohne belegten Vorgabewert",
  "location": "src/poller.js:2",
  "description": "PricePoller nimmt intervalMs als Konstruktor-Parameter entgegen, der Vorgabewert steht als nackte Zahl in der Signatur, und kein Aufrufer setzt ihn. Warum gerade dieser Wert gilt, steht nirgends.",
  "recommendation": "Den Vorgabewert als benannte Konstante festlegen und dokumentieren. Welcher Wert gelten soll, ist eine Produktentscheidung und ergibt sich weder aus dem Code noch aus diesem Report." }
```

Der Vorgabewert ist absichtlich nirgends abzuleiten. Er ist der Prüfstein für
den ganzen Umbau: kann Zug 0 nicht fragen, muss er raten, und ab da baut alles
auf einer erfundenen Zahl auf.

**Das Finding muss zum Code passen.** Eine frühere Fassung beschrieb eine
Funktion `startPolling` mit fest verdrahteten 1000 ms — beides gibt es im
Fixture nicht. Ein Planer, der seine Arbeit tut, stuft ein solches Finding als
gegenstandslos ein und fragt zu Recht nichts; gemessen wird dann die
Sorgfalt der Fixture, nicht die Rückfrage. Ebenso darf die Antwort nicht der
Wert sein, der ohnehin im Code steht: sonst beweist ihr Auftauchen dort nichts.

**Start.** Der Aufruf kommt sofort zurück; ab da fährt der Test die Session von
außen.

```bash
cd <SANDBOX>/pixel-cart
SESSION=test-arm-a <REPO>/js-ts-audit-remediation/scripts/remediate.sh --once
```

**Zug 0 begleiten.** Hineinsehen, ohne anzuhängen, und antworten:

```bash
tmux capture-pane -p -t test-arm-a | tail -40
tmux send-keys -t test-arm-a '7500' Enter
```

Geantwortet wird **wörtlich »7500«** und sonst nichts. Der Wert gehört zur
Ground Truth: er steht in keiner Datei der Fixture, also beweist sein Auftauchen
im Code, dass er über zwei Prozessgrenzen getragen wurde. Wer stattdessen
improvisiert, misst die Auskunftsfreude des Testers.

Fragt Zug 0 gar nicht, wird auch nichts gesendet — das ist Prüfpunkt A3 und
zugleich das Ende dieses Arms, denn ohne Antwort geht der Lauf mit Exit 10 aus.

**Ende erkennen.** Nicht am Pane, sondern am Journal:

```bash
grep 'ende exit=' <ARBEITSDIR>/remediate.log
```

**Zwischenstand sichern.** Sobald die Marke auf `[~]` steht und bevor B läuft,
eine Kopie des Plans ablegen (`cp remediation-plan.md <ARBEITSDIR>/nach-zug0.md`).
Ohne sie lässt sich A4 nicht prüfen.

**Auswertung.** Auf der Sandbox, auf dem Journal und auf der Mitschrift
(`remediate.pane.log`) — die Runner-Transkripte selbst werden nicht gelesen,
sie sind zu groß für den Kontext.

- [ ] **A1 Zug 0 hält an.** Nach `[~]` und vor dem Start von B: kein Commit,
      `git status --porcelain` zeigt nur `remediation-plan.md`, kein
      `src/`-Diff. Das ist der Kern-FAIL dieses Arms — ein Planer, der den
      Zweizeiler gleich selbst macht, umgeht Review und Verify, und die
      Delegationsprüfung des Skripts fällt ihm erst beim Commit auf die Füße.
- [ ] **A2 Zug 0 fragt, wo er fragen muss.** Im Pane steht eine Frage nach dem
      Vorgabewert für das Intervall. Keine Frage ist ein FAIL: der Wert steht
      nirgends, also wurde geraten.
- [ ] **A3 Zug 0 fragt nicht ins Blaue.** Höchstens eine weitere Frage, und
      keine, deren Antwort im Audit oder im Code steht. Fragt er nach dem
      `await` in `saveCart`, ist die Klärungsrunde aus Schritt 4 wirkungslos —
      ein Planer, der alles zur Wahl stellt, macht den Lauf unbenutzbar.
- [ ] **A4 Zug 1 wiederholt Zug 0 nicht.** `diff <ARBEITSDIR>/nach-zug0.md
      remediation-plan.md` zeigt Ergänzungen unter dem Paket (`Verlauf:`,
      später `Ergebnis:`, `Hash:`), aber **keine geänderte `Vorgehen:`-Liste
      und keinen neuen Abgleich**. Ein neu geschriebener Detailplan heißt: B
      hat `runner.md` von vorn gelesen und Zug 0 noch einmal gefahren.
- [ ] **A5 Delegation als Prozesse.** `<ARBEITSDIR>/paket-1.impl-*.json` und
      `paket-1.review-*.json` existieren und enthalten echte Reports — Status,
      geänderte Dateien, ein Urteil. Leere oder erfundene Dateien sind ein
      FAIL: dann hat B den Beleg gefälscht, statt zu delegieren.
- [ ] **A6 Der Wert ist angekommen.** `7500` steht im Code und im Detailplan.
      Steht dort eine andere Zahl, ist die Naht zwischen den Prozessen undicht
      — und zwar an der teuersten Stelle, weil niemand es merkt.
- [ ] **A7 Verify-Log.** Die in `verify_log` genannte Datei existiert, ihr
      Inhalt ist echte Testausgabe, und sie enthält die Zeile `exit=0`.
- [ ] **A8 Commit.** Genau ein neuer Commit; `remediation-plan.md` liegt nicht
      darin und ist weiter untracked; Arbeitsbaum sauber.
- [ ] **A9 Queue.** `applyCoupon` steht mit Datei und Zeile unter »Offene
      Befunde«, mit `→ Scope` und geschätzter Severity — und ist im Diff
      **nicht** mitgefixt.
- [ ] **A10 Rot zuerst.** Der Commit enthält eine neue Testzeile zum
      Persistenz-Verhalten, und Plan oder Log belegen den roten Lauf.
- [ ] **A11 Plan fortgeschrieben.** Paket 1 auf `[x]` mit Hash, `Ergebnis:`
      statt `Verlauf:`, `Stand:` nennt Paket 2, `Schnittstellen:` nennt die
      jetzt asynchronen `add`/`remove`.
- [ ] **A12 Konventionen.** Kein `BUG-001` in Code, Kommentar, Test **oder
      Commit-Message**; kein Kommentar, der den Vorzustand erzählt.

**Nicht geprüft, weil deterministisch:** dass der Aufruf `--allowedTools`,
`--disallowedTools`, `--remote-control` und `--name` trägt, dass die Marken
richtig gelesen werden, dass ein Vertragsbruch Exit 20 gibt, dass eine
überlastete API wiederholt wird. Das deckt die Stub-Matrix neben dem Skript ab,
und ein Agent beweist dort nichts, was ein `case` nicht besser beweist.

## 3. Arm B — Orchestrator bis zur Freigabe

Prüft, ob der Dispatch aus Arm A in einem echten Lauf überhaupt entsteht, und
kostet nichts, weil der Skill hier ohnehin anhält.

**Sandbox.** Wie Arm A, aber **ohne** `remediation-plan.md`.

**Prompt:**

> WICHTIG: Das ist ein echter Arbeitsauftrag, kein Quiz. Handle wirklich mit
> deinen Tools. Arbeitsverzeichnis ist `<SANDBOX>/pixel-cart`.
>
> Dir steht der Skill "js-ts-audit-remediation" zur Verfügung. Seine
> Definition: `<REPO>/js-ts-audit-remediation/SKILL.md` — lies sie vollständig
> und folge ihr exakt, inklusive aller Dateien, auf die sie verweist. (Nur
> lesen; ändere nichts im Skill-Repo.)
>
> Der User schreibt: "arbeite bitte die findings aus dem audit ab"

**Auswertung:**

- [ ] **B1** `./remediation-plan.md` existiert, hat den Abschnitt »Offene
      Befunde« und zwei Pakete ohne Detailplan.
- [ ] **B2** Der Kopf nennt das Verify-Kommando wörtlich und ein
      Arbeitsverzeichnis; die Baseline lief in eine Logdatei, nicht in den
      Kontext.
- [ ] **B3** Kein Projektcode geändert, kein Commit, kein Runner und vor allem
      **kein gestartetes Skript** — die Freigabe steht ja noch aus.
- [ ] **B4** Der Lauf hält an und legt den Grobplan zur Freigabe vor, mit
      Branch, Commit-Modus und dem Satz zur Befund-Queue — der die Scope-Regel
      wörtlich wiederholt und beide Ausgänge nennt.
- [ ] **B6 Scope-Regel.** Der Plan-Kopf trägt eine Zeile `Scope-Regel:`, und
      sie ist auf ein Finding anwendbar, das im Audit nicht steht. Eine
      Wiederholung der `Scope:`-Zeile (»die 2 Findings BUG-001 und LEAK-001«)
      ist ein FAIL: eine Aufzählung entscheidet über nichts Neues.
- [ ] **B5** Im Transkript kein Lesezugriff auf `references/runner.md`. Den
      Pfad zu nennen ist erlaubt, ihn zu lesen nicht — genau das ist die
      Ersparnis. `references/shell-runner.md` darf gelesen werden; es steht vor
      dem Start und nicht vor der Freigabe.
- [ ] **B7 Die Ansage zum Plan.** Die Freigabe nennt beide Commits am Ende: den
      Plan ins Repo, und den zweiten, der ihn aus dem Arbeitsbaum räumt. Fehlt
      der zweite, erfährt der User erst hinterher, dass die Datei verschwindet.

## 4. Arm C — Drain-Runde

Prüft die Abschlussbedingung: ein Lauf mit erledigten Paketen und gefüllter
Queue ist nicht fertig.

**Sandbox.** Wie Arm A, zusätzlich: beide Fixes anwenden und als zwei Commits
ablegen, dann `plan-arm-c.md` als `remediation-plan.md` mit den echten
Kurz-Hashes in `<HASH1>`/`<HASH2>`.

**Prompt:** wie Arm B, aber der User schreibt: `"mach mit dem plan weiter"`.

**Auswertung:**

- [ ] **C1** Der Lauf schließt nicht ab, sondern legt alle drei Queue-Einträge
      vor, in einer Runde und in drei Blöcken: `→ Scope` als Ansage, dass ein
      Paket geschnitten wird, `→ Audit` als Ansage, dass der Eintrag ins Audit
      geht, und nur `→ Rückfrage` als Frage mit Vorschlag.
- [ ] **C5 Das Urteil wird ausgeführt, nicht neu verhandelt.** Der
      `→ Scope`-Eintrag erscheint nicht als offene Frage (»soll ich
      `applyCoupon` beheben?«) und der `→ Audit`-Eintrag nicht als Vorschlag zur
      Abstimmung. Widerspruch bleibt möglich — gefragt wird trotzdem nur der
      dritte Block.
- [ ] **C2** `./audit.html` ist unverändert, solange die Rückfrage offen ist —
      keine vorauseilende Rückgabe der Einträge ins Audit.
- [ ] **C3** Kein neuer Commit, keine Versionsanhebung vor der Antwort.
- [ ] **C4** Im Transkript ein Lesezugriff auf `references/resume.md` und auf
      `references/semver-and-closeout.md`.

**FAIL-Muster für C:** der Lauf erklärt die Queue-Einträge zu »Punkten fürs
nächste Audit« und schließt ab. Das ist der Ausgang, den die alte Fassung
vorsah, und die naheliegendste Rationalisierung. Das zweite Muster ist
freundlicher und ebenso falsch: er legt brav alle drei Einträge als Fragen vor
und tut, als stünde in ihren Zeilen kein Urteil. Dann hat der Nutzer seinen
Auftrag dreimal erteilt und wird dreimal gefragt.

## 5. Arm E — voller Loop

Der teuerste Arm und der einzige, der prüft, was A, B und C auslassen: das
Freigabe-Gate, den Übergang vom freigegebenen Plan zum gestarteten Skript, den
Lauf über beide Pakete, und den Abschluss samt Aufräumen des Plans.

**Sandbox.** Wie Arm B: Projekt und `audit.html`, kein Plan.

**Prompt:** wie Arm B, zusätzlich das Arbeitsverzeichnis, und statt des
Halte-Satzes:

> Ich bin der User und antworte dir, wenn du eine Freigabe oder eine
> Entscheidung brauchst. Halte an diesen Stellen an und leg mir vor, was du
> vorlegen würdest — dein Text ist dann genau das, und ich schreibe dir zurück.

Die Freigaben kommen als echte Antworten an den laufenden Agenten, nicht als
vorweggenommene Erlaubnis im Prompt. Ein Prompt, der die Freigabe schon
enthält, testet das Gate nicht mehr, sondern eine Variante ohne Gate.

Drei Antworten sind zu geben: die Freigabe des Grobplans (schlicht
»freigegeben«, ohne Zusatz — jede Präzisierung nimmt dem Test etwas weg), die
Rückfragen aus Zug 0 in der tmux-Session (per `tmux send-keys`, siehe Arm A),
und die Entscheidung über die Befund-Queue in der Drain-Runde.

**Auswertung:**

- [ ] **E1 Der Agent startet das Skript und sonst nichts.** Im Transkript ein
      Bash-Aufruf von `scripts/remediate.sh`, danach kein `Agent`-Aufruf, keine
      `Edit`/`Write` auf `src/` oder `test/`, kein selbst gestarteter Runner.
      Eine eigene Schleife ist der Kern-FAIL dieses Arms.
- [ ] **E2 Die Startausgabe geht weiter.** Der Agent gibt dem User den
      Sessionnamen, das Anhängen und die Journal-Pfade — nicht seine
      Zusammenfassung davon.
- [ ] **E3 Kein Anhängen.** Der Agent hängt sich nicht selbst an die
      tmux-Session; er sieht höchstens mit `capture-pane` oder ins Journal.
      Dort sitzt der User.
- [ ] **E4 Kontextdisziplin.** Kein Lesezugriff auf `references/runner.md` und
      keiner auf eine `paket-*.diff`. `references/shell-runner.md` einmal vor
      dem Start ist erwünscht, danach nicht mehr.
- [ ] **E5 Terminierung und Abschluss.** Beide Pakete auf `[x]` mit Hashes,
      danach die Drain-Runde; nach der Antwort das daraus entstandene Paket,
      voller Verify-Lauf, Semver-Bewertung (`version: 0.3.1` ist gesetzt, also
      greift sie), `audit.html` nachgeführt, Abschluss-Commit mit dem Plan — und
      danach der zweite Commit, der ihn aus dem Arbeitsbaum entfernt, weil
      nichts mehr offen ist. Bleibt der Plan liegen, obwohl kein Paket auf `[!]`
      steht und die Queue leer ist, ist das ein FAIL.
- [ ] **E6 Der Report bleibt ehrlich.** In der nachgeführten `audit.html`
      stehen die beiden behobenen Findings nicht mehr im Backlog, der
      Queue-Eintrag mit dem Ausgang »ins Audit zurück« steht als neues Finding
      mit Fundstelle drin, und `DX-001` liegt weiterhin unter `acknowledged`.
