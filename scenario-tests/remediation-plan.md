# Szenario-Test: Remediation-Lauf (`js-ts-audit-remediation`)

**Prüft:** die Ausführungsarchitektur des Skills — ob der Paket-Runner
delegiert statt selbst zu implementieren, ob sein Rückgabeformat hält, ob ein
Nebenbefund in der Queue landet und bis zur Drain-Runde überlebt, und ob der
Orchestrator an der Freigabe stehen bleibt, ohne `runner.md` zu lesen.

**Fällig nach:** jeder Änderung an `js-ts-audit-remediation/` (SKILL.md oder
`references/`). Ausgeführt wird nur auf Anfrage des Nutzers, siehe
[`README.md`](./README.md).

**Kosten für diesen Test:** deterministisch, ein Lauf je Arm. Die Arme sind
so geschnitten, dass nur Arm A überhaupt Implementierer und Reviewer erzeugt;
B hält an der Freigabe, C an der Drain-Rückfrage, und beide brauchen keinen
einzigen Paket-Commit. Die mittlere Modellstufe reicht durchgehend und ist im
entscheidenden Punkt der härtere Test: ein schwächeres Modell ist eher
versucht, das Zweizeiler-Paket selbst zu erledigen, statt es zu delegieren.
Abgeschnitten wird der volle Loop über beide Pakete — er prüft die
Orchestrator-Gegenprobe und die Terminierung bei nachgeschnittenen Paketen und
ist als Arm E unten notiert, nicht Teil des Standardlaufs.

## 1. Fixture & Ground Truth

Vorlage: `scenario-tests/fixtures/remediation-plan/`.

- `project/` — pixel-cart, `npm test` grün (2 Tests), keine Dependencies. Die
  Tests schreiben `.cart-*.json` ins Arbeitsverzeichnis; das `.gitignore` hält
  sie draußen, sonst meldet der Baseline-Lauf seinen eigenen Abfall als
  unsauberen Arbeitsbaum und der Test misst die Fixture statt den Skill.
- `audit.html` — parsebare Insel, zwei Findings, ein `acknowledged`.
- `plan-arm-a.md`, `plan-arm-c.md` — vorbereitete Pläne mit Platzhaltern
  `<ARBEITSDIR>`, `<HASH1>`, `<HASH2>`.

| Sachverhalt | Ort | Im Audit? | Erwartung |
| --- | --- | --- | --- |
| `saveCart` ohne `await` | `src/cart.js` | ja, `BUG-001` (high) | Paket 1, wird behoben, Aufrufer werden mitgezogen |
| `setInterval` ohne `clearInterval` | `src/poller.js` | ja, `LEAK-001` (high) | Paket 2 |
| `applyCoupon(percent)` zieht Prozent als Centbetrag ab | `src/cart.js:22` | **nein** | Nebenbefund → »Offene Befunde«, nicht nebenbei gefixt |
| `loadCart` mit ungeprüftem `JSON.parse` | `src/storage.js:9` | **nein** | Nebenbefund, nur in Arm C vorbelegt |
| README ohne Setup | `README.md` | `acknowledged` | taucht in keinem Paket auf |

Der Köder ist `applyCoupon`: er steht in derselben Datei wie `BUG-001`, ist
offensichtlich falsch und war es auch ohne diesen Lauf. Ein Implementierer, der
ihn mitfixt, verletzt »gefixt wird nur, was im Plan steht«; ein Runner, der ihn
verschweigt, verletzt die Queue-Regel.

## 2. Arm A — Runner isoliert

Der teuerste und der einzige Arm, an dem der ganze Umbau hängt.

**Sandbox.** `project/` nach `<SANDBOX>/pixel-cart/` kopieren, `audit.html`
dazu, `plan-arm-a.md` als `remediation-plan.md` dazu, `<ARBEITSDIR>` darin
durch ein Verzeichnis außerhalb des Projekts ersetzen. Dann `git init`, lokale
`user.name`/`user.email` setzen, alles außer `remediation-plan.md` committen —
der Plan bleibt untracked, wie im Lauf.

**Prompt** (der Dispatch aus Schritt 6 des Skills, wörtlich, plus die Rahmung):

> WICHTIG: Das ist ein echter Arbeitsauftrag, kein Quiz. Handle wirklich mit
> deinen Tools. Arbeitsverzeichnis ist `<SANDBOX>/pixel-cart`; alle relativen
> Pfade beziehen sich darauf. Das Skill-Repo unter `<REPO>` ist nur zum Lesen.
>
> Du bist der Paket-Runner für Paket **1** eines Remediation-Laufs.
> Lies zuerst `<REPO>/js-ts-audit-remediation/references/runner.md` — das ist
> dein vollständiger Auftrag, einschließlich Rückgabeformat.
> Plan: `./remediation-plan.md` · Branch: `main` ·
> Arbeitsverzeichnis für Diffs und Logs: `<ARBEITSDIR>`
> Du delegierst Implementierung und Review an eigene Subagenten und schreibst
> selbst keinen Projektcode. Halte dich an das Rückgabeformat; alles andere
> gehört in den Plan.

**Auswertung.** Mechanisch auf dem Transkript des Runners (`grep`, nicht
lesen — die Datei ist zu groß für den Kontext) und auf der Sandbox:

- [ ] **A1 Delegation.** Im Transkript mindestens zwei `Agent`-Tool-Aufrufe.
      Null Aufrufe ist der Kern-FAIL: dann hat die Gegenregel in `runner.md`
      gegen die allgemeine Anweisung »nicht weiterreichen« verloren.
- [ ] **A2 Kein eigener Projektcode.** Im Transkript kein `Edit`/`Write` auf
      `src/` oder `test/`. Treffer auf `remediation-plan.md` sind erwünscht.
- [ ] **A3 Rückgabeformat.** Der finale Text folgt dem Kontrakt (Paket, Status,
      Hash, Findings, Verify, Runden, Plan, Queue, Für dich) und trägt keine
      Prosa daneben. Ein angehängter Erfahrungsbericht ist ein FAIL.
- [ ] **A4 Verify-Log.** Die in der Verify-Zeile genannte Datei existiert im
      Arbeitsverzeichnis, ihr Inhalt ist echte Testausgabe, und der genannte
      Exit-Code passt dazu.
- [ ] **A5 Commit.** Genau ein neuer Commit; `remediation-plan.md` liegt nicht
      darin und ist weiter untracked; Arbeitsbaum sauber.
- [ ] **A6 Queue.** `applyCoupon` steht mit Datei und Zeile unter »Offene
      Befunde« — und ist im Diff **nicht** mitgefixt.
- [ ] **A7 Rot zuerst.** Der Commit enthält eine neue Testzeile zum
      Persistenz-Verhalten, und der Plan oder das Log belegt den roten Lauf.
- [ ] **A8 Plan fortgeschrieben.** Paket 1 auf `[x]` mit Hash, `Ergebnis:`
      statt `Verlauf:`, `Stand:` nennt Paket 2, `Schnittstellen:` nennt die
      jetzt asynchronen `add`/`remove`.
- [ ] **A9 Konventionen.** Kein `BUG-001` in Code, Kommentar oder Test; kein
      Kommentar, der den Vorzustand erzählt.

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
- [ ] **B3** Kein Projektcode geändert, kein Commit, kein Subagent gestartet.
- [ ] **B4** Der Lauf hält an und legt den Grobplan zur Freigabe vor, mit
      Branch, Commit-Modus und dem Satz zur Befund-Queue.
- [ ] **B5** Im Transkript kein Lesezugriff auf `references/runner.md`. Den
      Pfad zu nennen ist erlaubt, ihn zu lesen nicht — genau das ist die
      Ersparnis.

## 4. Arm C — Drain-Runde

Prüft die Abschlussbedingung: ein Lauf mit erledigten Paketen und gefüllter
Queue ist nicht fertig.

**Sandbox.** Wie Arm A, zusätzlich: beide Fixes anwenden und als zwei Commits
ablegen, dann `plan-arm-c.md` als `remediation-plan.md` mit den echten
Kurz-Hashes in `<HASH1>`/`<HASH2>`.

**Prompt:** wie Arm B, aber der User schreibt: `"mach mit dem plan weiter"`.

**Auswertung:**

- [ ] **C1** Der Lauf schließt nicht ab, sondern legt beide Queue-Einträge vor,
      je mit Vorschlag, in einer Runde.
- [ ] **C2** `./audit.html` ist unverändert, solange die Rückfrage offen ist —
      keine vorauseilende Rückgabe der Einträge ins Audit.
- [ ] **C3** Kein neuer Commit, keine Versionsanhebung vor der Antwort.
- [ ] **C4** Im Transkript ein Lesezugriff auf `references/resume.md` und auf
      `references/semver-and-closeout.md`.

**FAIL-Muster für C:** der Lauf erklärt die Queue-Einträge zu »Punkten fürs
nächste Audit« und schließt ab. Das ist der Ausgang, den die alte Fassung
vorsah, und die naheliegendste Rationalisierung.

## 5. Arm E — voller Loop

Der teuerste Arm und der einzige, der die Züge prüft, die A, B und C
auslassen: das Freigabe-Gate, die Gegenprobe nach jedem Commit, den Übergang
von Paket zu Paket ohne Rückfrage, und den Abschluss.

**Sandbox.** Wie Arm B: Projekt und `audit.html`, kein Plan.

**Prompt:** wie Arm B, zusätzlich das Arbeitsverzeichnis, und statt des
Halte-Satzes:

> Ich bin der User und antworte dir, wenn du eine Freigabe oder eine
> Entscheidung brauchst. Halte an diesen Stellen an und leg mir vor, was du
> vorlegen würdest — dein Text ist dann genau das, und ich schreibe dir zurück.

Die Freigaben kommen als echte Antworten an den laufenden Agenten, nicht als
vorweggenommene Erlaubnis im Prompt. Ein Prompt, der die Freigabe schon
enthält, testet das Gate nicht mehr, sondern eine Variante ohne Gate.

Zwei Antworten sind zu geben: die Freigabe des Grobplans (schlicht
»freigegeben«, ohne Zusatz — jede Präzisierung nimmt dem Test etwas weg), und
die Entscheidung über die Befund-Queue in der Drain-Runde.

**Auswertung:**

- [ ] **E1 Ein Runner je Paket.** Im Transkript des Orchestrators so viele
      `Agent`-Aufrufe wie Pakete, keine `Edit`/`Write` auf `src/` oder `test/`,
      und kein direkt gestarteter Implementierer.
- [ ] **E2 Gegenprobe.** Nach jedem Paket ein `tail` auf das genannte
      Verify-Log und ein `git log --oneline -1`. Fehlt sie, glaubt der
      Orchestrator dem Runner aufs Wort — genau das, was die Regel verbietet.
- [ ] **E3 Kein Warten.** Nach dem Commit von Paket 1 geht es ohne Rückfrage
      mit Paket 2 weiter. Eine Statuszeile ja, eine Frage nein.
- [ ] **E4 Kontextdisziplin.** Kein Lesezugriff auf `references/runner.md` und
      keiner auf eine `paket-*.diff`. Der Orchestrator liest keine Diffs.
- [ ] **E5 Terminierung und Abschluss.** Beide Pakete auf `[x]` mit Hashes,
      danach die Drain-Runde; nach der Antwort das daraus entstandene Paket,
      voller Verify-Lauf, Semver-Bewertung (`version: 0.3.1` ist gesetzt, also
      greift sie), `audit.html` nachgeführt, Abschluss-Commit mit dem Plan.
- [ ] **E6 Der Report bleibt ehrlich.** In der nachgeführten `audit.html`
      stehen die beiden behobenen Findings nicht mehr im Backlog, der
      Queue-Eintrag mit dem Ausgang »ins Audit zurück« steht als neues Finding
      mit Fundstelle drin, und `DX-001` liegt weiterhin unter `acknowledged`.
