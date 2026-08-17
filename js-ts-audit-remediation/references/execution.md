# Umsetzung — ein Paket vom Brief bis zum Commit

Gilt ab Schritt 6, nach der Freigabe des Grobplans. Jedes Paket durchläuft
dieselben sechs Züge. Übersprungen wird keiner davon, auch nicht bei einem
Zweizeiler; die einzige Ausnahme im ganzen Ablauf steht in Zug 0 und betrifft
das erste Paket.

Alles, was du in einen Dispatch-Prompt kopierst und alles, was ein Subagent
im Klartext zurückgibt, bleibt für den Rest der Session in deinem Kontext und
wird bei jedem weiteren Zug erneut gelesen. Deshalb sind die Prompts unten
Pfadangaben statt Volltexte, deshalb schreiben die Subagenten ihre Ergebnisse
in den Plan statt in ihre Antwort, und deshalb sind die Rückgabeverträge kurz.

Sparsamkeit allein trägt einen Lauf über zwölf Pakete trotzdem nicht. Am Ende
jedes Pakets steht deshalb der Checkpoint aus Zug 5: der Stand geht vollständig
in den Plan, und der Kontext darf danach fallen.

Diff-Dateien gehören nicht ins Projekt. Lege sie im Scratchpad-Verzeichnis
des Hosts ab; gibt es keines, in `.git/remediation/` — das liegt außerhalb
der Versionierung.

## Der Plan trägt den Stand

`./remediation-plan.md` ist das Übergabedokument des Laufs. Maßstab ist nicht,
ob du dich erinnerst, sondern ob ein Agent ohne jede Vorgeschichte die Datei
öffnet und daraus weiß: was ist erledigt, was liegt gerade im Arbeitsbaum, was
ist als Nächstes dran. Deshalb wird fortgeschrieben, **bevor** der nächste Zug
startet, nicht danach.

Dieser Agent ohne Vorgeschichte bist regelmäßig du selbst. Nach einer
Kompaktierung hast du eine Zusammenfassung deines Kontexts, nicht deinen
Kontext — und ob sie den Stand trägt, entscheidest nicht du, sondern das
Verfahren, das sie geschrieben hat. Der Plan ist die Fassung, die du selbst in
der Hand hast.

Zwei Orte tragen den Stand. Im Kopf die Zeile `Stand:` mit Datum — welches
Paket, welcher Zug, wie der Arbeitsbaum aussieht. Unter dem laufenden Paket der
`Verlauf:` mit einer Zeile je Zug:

| Nach Zug | Zeile im Verlauf |
| --- | --- |
| 0 | schreibt der Planer selbst: Detailplan steht, Abgleich je Finding in Kurzform, wohin die offenen Folgen gingen |
| 1 | Implementierer beauftragt, mit Modellstufe |
| 2 | Status des Reports, geänderte Dateien, und dass der Arbeitsbaum jetzt schmutzig ist |
| 3 | Urteil des Reviewers in Kurzform, Pfad der Diff-Datei |
| 4 | je Runde eine Zeile: was offen war, wer sie bekam, was zurückkam |
| 5 | der Verlauf wird durch die Ergebniszeile ersetzt, siehe dort |

Eine Verlaufszeile ist eine Zeile. Sie nennt Dateien, Pfade, Namen und Zahlen,
keine Begründungen — die stehen im Detailplan. Was ein Subagent im Klartext
zurückgegeben hat, wird nicht hineinkopiert.

Verdichtet wird nur durch den Commit. Ein Paket auf `[!]` behält seinen
Verlauf: er ist die einzige Spur dessen, was versucht wurde und woran es lag.

Was der Nutzer mitten im Lauf entscheidet — eine Rückfrage aus Zug 0, ein
Konflikt aus Zug 4 —, gehört mit Datum in den Abschnitt »Entscheidungen« im
Kopf, nicht in den Verlauf des Pakets. Der Verlauf wird eingedampft, die
Entscheidung muss den ganzen Lauf überleben und darf in keinem späteren Paket
neu aufgeworfen werden.

## Zug 0 — Paket-Planer

Der Grobplan sagt, *was* Paket N erreichen soll. Wie das geht, entsteht
jetzt, gegen den Code, der jetzt dasteht — nicht gegen den, der beim
Schreiben des Plans dastand.

**Beim ersten Paket entfällt dieser Zug.** Der Grobplan ist Minuten alt, du
hast Findings, Baseline und Entscheidungen noch im Kontext; du schreibst den
Detailplan für Paket 1 selbst, nach demselben Format. Ab Paket 2 läuft immer
ein eigener Planer-Subagent, auch vor dem kleinsten Paket: gerade dort wird
ein zwischenzeitlich mit erledigtes Finding sonst blind weitergeschleppt.

Der Planer läuft auf der **stärksten Stufe**, unabhängig von der Modellstufe
des Pakets.

### Was er bekommt

Pfade, keine Volltexte:

1. `./remediation-plan.md` mit der Paketnummer N. Kopf, »Entscheidungen«,
   erledigte Pakete samt notierter Nebenbefunde und Folgen, offene Restliste.
2. `./audit.html`. Die Findings seines Pakets liest er dort im Original nach,
   aus der JSON-Insel `<script id="audit-data">`, nicht aus dem Plan.
3. Den Branch und den Hinweis, dass `git log --oneline` seit dem ersten
   Paket-Commit zeigt, was dieser Lauf bereits verändert hat.
4. Die Grenzen unten und den Rückgabevertrag.

### Was er tut, in dieser Reihenfolge

**Erstens abgleichen.** Für jede Finding-ID des Pakets: existiert der
Sachverhalt noch? Er sieht an der Fundstelle nach — Datei, Symbol, Zeile —
und ordnet ein: unverändert, verschoben oder umgeformt, oder gegenstandslos,
weil ein Vorgänger-Paket oder eine fremde Änderung es mit erledigt hat. Ein
Urteil ohne Fundstelle ist keins.

**Zweitens die Folgen triagieren.** Unter den erledigten Paketen stehen zwei
Listen. Was unter `Nebenbefunde:` steht, war schon vorher falsch. Was unter
`Folgen:` steht, hat dieser Lauf verursacht — keine Ablage, sondern offene
Arbeit, und sie wird hier verteilt. Jeder Eintrag bekommt eine von drei
Einordnungen, jede mit Fundstelle:

| Einordnung | Woran erkennbar | Was folgt |
| --- | --- | --- |
| **Symptom** | Dieselbe Ursache, andere Stelle. Prüffrage: Wäre der Eintrag nie entstanden, wenn das verursachende Paket seine Ursache zu Ende behoben hätte? | Kein eigenes Paket. Steht das Paket noch offen, wandert die Stelle in seinen Detailplan. Ist es committet, wird **ein** Nachtragspaket geschnitten, das die Ursache zu Ende bringt und alle bekannten Fundstellen aufzählt. |
| **Echte Folge** | Eigene Ursache, durch die Änderung neu entstanden — der Umbau auf `async` hat eine Race geöffnet, die es vorher nicht gab. | Eigenes Paket, im Scope, mit `Folge von:`. Einsortiert nach den Phasen aus Schritt 5, nicht automatisch ans Ende. |
| **Vorbestehend** | Der Sachverhalt gab es schon vor dem ersten Commit dieses Laufs. | Nebenbefund. Alte Regel: in ein offenes Paket bei gleicher Ursache, sonst ins nächste Audit. |

Die dritte Zeile wird nachgesehen, nicht vermutet — `git show <basis>:<pfad>`
mit dem Stand vor dem ersten Paket-Commit. »Sah schon immer so aus« ist kein
Urteil, und die Einordnung als vorbestehend ist die einzige der drei, die
Arbeit aus dem Lauf hinausbefördert.

Den Ausgang »Folge ins nächste Audit« gibt es nicht. Das Audit hat diesen Code
nie gesehen; was dort ankommt, liest sich für den nächsten Lauf wie ein
vorbestehender Defekt, und niemand weiß mehr, dass er hier entstanden ist.

Die Unterscheidung Symptom/echte Folge trägt die Terminierung des ganzen Laufs.
Drei Stellen, die aus derselben halb behobenen Ursache brechen, sind ein Paket
— macht der Planer drei daraus, behebt er dieselbe Ursache dreimal halb und
erzeugt beim nächsten Durchgang die nächsten drei Stellen.

**Drittens den Detailplan schreiben**, direkt in den Abschnitt zu Paket N in
`./remediation-plan.md`. Er ergänzt den Grobplan-Block, er ersetzt ihn nicht:

```markdown
### [ ] 3. WebSocket-Reconnect: Listener und Timer aufräumen
- Findings: LEAK-001 (high), LEAK-003 (high)
- Ziel: <ein Satz>
- Bereich: `src/net/`
- Hängt ab von: —
- Modell: mittlere Stufe
- Hash: —
- Dateien: `src/net/socket.ts`, `src/net/reconnect.ts`
- Vorgehen:
  1. <Schritt mit exakten Namen, Signaturen, Werten>
  2. <…>
- Verify: `npm run typecheck && npm test -- src/net`
- Commit: `fix(net): clean up socket listeners and reconnect timers (LEAK-001, LEAK-003)`
- Verlauf:
  - 2026-08-06 Zug 0: Detailplan steht · LEAK-001 unverändert · LEAK-003 nach
    `reconnect.ts:41` gewandert (Paket 1 hat die Datei geteilt)

**LEAK-001 · high · src/net/socket.ts:88** — Listener wird bei Reconnect nicht entfernt
<description im Volltext>
Empfehlung: <recommendation im Volltext>
```

Ein Durchgang gegen Platzhalter, bevor er abgibt: kein »TBD«, kein
»Fehlerbehandlung ergänzen«, kein »analog zu Paket 2«. Der Implementierer
sieht diesen Text und sonst nichts.

**Viertens den Restplan prüfen.** Nebenbefunde aus den erledigten Paketen,
verschobene Fundstellen, weggefallene Findings, die eben verteilten Folgen —
was davon ändert die Reihenfolge oder den Schnitt der noch offenen Pakete? Jede
Änderung kommt mit einer Zeile Begründung in den Plan.

### Was er allein entscheidet

- Ein Finding als gegenstandslos streichen — mit Fundstelle und dem, was dort
  jetzt tatsächlich steht. Eine Vermutung reicht nicht.
- Einen Nebenbefund aus einem erledigten Paket in dieses oder ein späteres
  Paket aufnehmen, wenn er dieselbe Ursache hat oder ein späteres Paket sonst
  blockiert.
- Eine Folge einordnen und verteilen: als Symptom dem Paket zuschlagen, das
  ihre Ursache behandelt, oder für eine echte Folge ein neues Paket schneiden
  und einsortieren. Das ist keine Scope-Verschiebung, sondern deren Kehrseite —
  der Scope aus Schritt 3 schließt ein, was die Fixes nach sich ziehen.
- Ein Paket teilen, wenn es gewachsen ist. Zwei Pakete zusammenlegen, wenn
  ein Vorgänger beide fast erledigt hat.
- Die Reihenfolge der offenen Pakete ändern, solange jedes »Hängt ab von«
  gewahrt bleibt.
- Von der Empfehlung des Audits abweichen, wenn sie am geänderten Code
  vorbeigeht. Grund in den Detailplan.
- Die Modellstufe eines Pakets anheben.

Beim Umsortieren und Umschneiden gilt eine Regel ohne Ausnahme: **Paketnummern
werden nie neu vergeben.** Die Nummer ist eine ID, keine Position — sie steht
in Commit-Messages, in bereits eingetragenen Hashes und in jedem Brief, der
»Paket N« sagt. Die Reihenfolge ergibt sich aus der Stellung im Dokument.
Ein geteiltes Paket 3 wird zu `3a` und `3b`, ein neu entstandenes hängt hinten
an der höchsten vergebenen Nummer. Wer stattdessen durchnummeriert, macht
jeden früheren Verweis im Plan zu einem Verweis auf etwas anderes.

Ein Paket, das aus einer Folge entsteht, trägt zusätzlich die Zeile
`- Folge von: Paket 3`. Sie ist die einzige Spur der Kette und die Grundlage
der Generationsregel unten — ohne sie sieht die dritte Runde am selben Problem
aus wie drei unabhängige Pakete.

### Was zurück zum Nutzer geht

Hier ändert er nichts, sondern schreibt seinen Vorschlag in den Report und
hält an:

- Etwas, das eine Zeile aus »Entscheidungen« umkehren würde.
- Ein anderer Lösungs- oder Architekturweg als der freigegebene.
- Findings aufnehmen oder streichen, die den Scope aus Schritt 3 verschieben
  — ausgenommen der nachweislich behobene Fall oben und die triagierten Folgen,
  die ohnehin dazugehören.
- Ein Umbau, der mehr als ein weiteres Paket berührt, oder eine Umsortierung
  über mehr als eine Handvoll offener Pakete.
- Ein **vorbestehender** Befund der Schwere `critical` oder `high`, der nicht
  aus dem Audit stammt. Eine Folge derselben Schwere geht nicht zurück, sondern
  in ein Paket — sie ist selbstverschuldet, und die Frage »sollen wir das
  beheben?« ist bei eigenem Schaden keine Frage.
- Eine Folge, die sich nur beheben lässt, indem der freigegebene Weg selbst
  fällt: die Architekturentscheidung aus Paket N trägt nicht, das Datenmodell
  passt nicht, die gewählte Bibliothek kann es nicht. Kein Nachtragspaket
  repariert das, und der Planer entscheidet es nicht allein.
- Die **dritte Generation** einer Kette — eine Folge einer Folge einer Folge,
  ablesbar an `Folge von:`. Dann ist nicht die dritte Fundstelle das Problem,
  sondern der Weg, den das erste Paket eingeschlagen hat. Der Planer legt die
  Kette vor und schlägt vor: an der Wurzel anders lösen, oder abbrechen und
  zurückrollen.

Die Faustregel darüber: Passt eine Änderung samt Grund nicht in zwei Sätze in
den Plan, ist sie zu groß, um sie allein zu treffen. Ein Planer, der den
halben Restplan neu erfindet, weil er einen eleganteren Weg sieht, hat den
freigegebenen Plan ersetzt — genau das ist ihm verwehrt.

Er schreibt ausschließlich in `./remediation-plan.md`. Kein Projektcode, kein
Commit, kein `git`-Schreibbefehl.

### Rückgabe

| Feld | Inhalt |
| --- | --- |
| Abgleich | je Finding-ID: unverändert \| verändert \| gegenstandslos, mit Fundstelle |
| Folgen | je offenem Eintrag: Symptom \| echte Folge \| vorbestehend, mit Fundstelle und in welches Paket er ging |
| Planänderungen | was er am Restplan geändert hat, je eine Zeile |
| Rückfragen | was er vorlegt, je mit Vorschlag — leer heißt: es geht weiter |
| Modell | die Stufe, die er für den Implementierer gesetzt hat |

Dann du: Sind Rückfragen da, gehen sie gebündelt und mit seinem Vorschlag an
den Nutzer, bevor irgendetwas umgesetzt wird; seine Antwort kommt datiert in
»Entscheidungen«. Sind alle Findings des Pakets gegenstandslos, wird das Paket
ohne Commit auf `[x]` gesetzt, mit `Ergebnis: entfallen` und der Begründung.
Sonst Paket auf `[~]` und weiter mit Zug 1. In beiden Fällen wird die Zeile
`Stand:` im Kopf mitgezogen, bevor der nächste Zug beginnt.

## Zug 1 — Implementierer beauftragen

Der Prompt besteht aus diesen fünf Teilen, in dieser Reihenfolge:

1. Ein Satz: worum geht es im Projekt, wo sitzt dieses Paket.
2. Der Pfad `./remediation-plan.md` und die Paketnummer, eingeführt als:
   »Lies zuerst den Abschnitt zu Paket N. Das sind deine Anforderungen, mit
   den exakten Werten, und sie sind gegen den aktuellen Stand des Codes
   geschrieben. Die anderen Pakete gehören anderen Läufen. Dazu den Abschnitt
   »Konventionen« im Kopf des Plans: er gilt für jede Zeile, die du schreibst,
   Kommentare und Doku eingeschlossen.«
3. Schnittstellen aus erledigten Paketen, soweit der Detailplan sie nicht
   ohnehin nennt: neue Signaturen, umbenannte Exporte, eingeführte Konstanten.
   Quelle sind die `Schnittstellen:`-Zeilen unter den erledigten Paketen, nicht
   deine Erinnerung an sie — nach einer Kompaktierung ist der Unterschied der
   zwischen einer Signatur und einer plausiblen Signatur. Steht es im
   Detailplan, wiederholst du es hier nicht.
4. Das Verify-Kommando des Pakets.
5. Der Rückgabevertrag aus Zug 2.

Dazu der Arbeitsauftrag, der in jedem Brief gleich lautet:

- Umfang ist Paket N. Was dir daneben auffällt, meldest du, statt es zu
  beheben.
- Was deine eigene Änderung umwirft, gehört zu ihr: Aufrufer mit alter
  Signatur, Tests gegen das alte Verhalten, Typen und Doku, die danach nicht
  mehr stimmen — die ziehst du mit, auch wenn die Datei nicht im Paket steht.
  Ein Paket ist nicht fertig, solange sein eigener Umbau das Repo
  widersprüchlich zurücklässt. Das ist kein Nebenbefund: Nebenbefund ist, was
  auch ohne dich falsch gewesen wäre. Reicht eine solche Stelle zu weit, um
  sie mitzunehmen, meldest du sie als Folge, mit Datei und Zeile.
- Behebt das Paket einen Korrektheitsfehler: zuerst den Regressionstest
  schreiben, ihn rot sehen, dann beheben. Der rote Lauf gehört in den Report.
- Du committest nicht. Die Änderungen bleiben im Arbeitsbaum.
- Weichst du von der Empfehlung des Audits ab, schreibst du den Grund in den
  Report.

Das Modell wird explizit gesetzt, nach der Tabelle in `SKILL.md`. Immer nur
ein Implementierer gleichzeitig.

## Zug 2 — Report entgegennehmen

Der Report enthält, knapp:

| Feld | Inhalt |
| --- | --- |
| Status | `FERTIG` \| `FERTIG_MIT_VORBEHALT` \| `BLOCKIERT` \| `KONTEXT_FEHLT` |
| Dateien | geänderte und neue Pfade |
| Regressionstest | bei Bugfix-Paketen: Testname, Kommando, Ausgabe des roten Laufs vor dem Fix |
| Verify | Kommando und Ergebnis |
| Abweichungen | wo die Empfehlung nicht befolgt wurde, mit Grund |
| Nebenbefunde | was auffiel, auch ohne dieses Paket falsch gewesen wäre und nicht dazugehörte |
| Folgen | was diese Änderung außerhalb des Pakets nach sich zieht und nicht mitgezogen werden konnte, mit Datei und Zeile |

`KONTEXT_FEHLT` heißt: fehlende Information nachliefern und denselben Agenten
weiterlaufen lassen. `BLOCKIERT` heißt: der Auftrag ändert sich, bevor ein
neuer Versuch startet — mehr Kontext, stärkeres Modell oder kleineres Paket.
Ein unverändert wiederholter Auftrag an dasselbe Modell scheitert erneut.

Fehlt bei einem Bugfix-Paket der Nachweis des roten Laufs, ist das Paket
nicht fertig. Der Test wurde dann nach dem Fix geschrieben und beweist
nichts.

## Zug 3 — Review

Jedes Paket bekommt einen eigenen Reviewer-Subagenten, auch das kleine.

Diff als Datei erzeugen, der Reviewer soll ihn lesen und nicht selbst
zusammensuchen:

```bash
git add -N -- . ':(exclude)remediation-plan.md'
git diff -U10 -- . ':(exclude)remediation-plan.md' > "$ARBEITSDIR/paket-N.diff"
```

Der Reviewer-Prompt besteht aus: Pfad zur Diff-Datei, Pfad zum Plan mit
Paketnummer, das Verify-Ergebnis des Implementierers, der Rückgabevertrag.
Mehr nicht.

Er liefert zwei Urteile:

- **Erfüllung**, je Finding-ID des Pakets: behoben oder nicht, mit Fundstelle.
- **Qualität** der Änderung selbst, Befunde eingestuft als `kritisch`,
  `wichtig` oder `klein`.

Zur Qualität gehört der Abschnitt »Konventionen« aus dem Plan-Kopf. Eine
Finding-ID in einem Kommentar oder ein Satz, der den Vorzustand erzählt, ist
ein Befund wie jeder andere: `klein` im Code, `wichtig` in Doku, die
veröffentlicht wird — dort liest ihn jemand, der weder Audit noch Vorzustand
kennt.

Ebenfalls Qualität: eine Stelle, die der Umbau hätte mitnehmen müssen und
nicht mitgenommen hat — ein Aufrufer mit alter Signatur, ein Test gegen das
alte Verhalten, ein Doku-Absatz, der jetzt lügt. Das ist ein Befund **dieses**
Pakets, kein Nebenbefund und keine Sache für ein späteres: `kritisch`, wenn es
bricht, sonst `wichtig`. Hier ist es am billigsten, weil der Kontext des
Umbaus noch offen ist; drei Pakete später kostet dieselbe Stelle einen eigenen
Planer, einen eigenen Implementierer und einen eigenen Commit.

Modellstufe nach dem Diff, nicht nach dem Paket: klein und mechanisch nimmt
die mittlere Stufe, subtile Nebenläufigkeit oder Sicherheit die stärkste.

Findest du dich dabei, dem Reviewer zu schreiben, was er nicht melden soll
(»das ist so gewollt«, »höchstens klein«), dann sparst du dir gerade eine
Review-Runde durch Vorverurteilen. Der Befund kommt zurück, und du
entscheidest danach.

## Zug 4 — Fehlerkette

Kleine Befunde gehen in den Plan unter das Paket und lösen keine Runde aus.
Nicht erfüllte Findings sowie kritische und wichtige Befunde lösen eine aus:

1. **Runde 1** — derselbe Implementierer bekommt die Befunde im Wortlaut. Er
   kennt Auftrag, Code und seine eigenen Entscheidungen.
2. **Runde 2** — ein frischer Implementierer eine Modellstufe höher, mit dem
   Rahmen: »Ein Vorgänger hat dieses Paket versucht, hier sind die offenen
   Befunde und was bereits probiert wurde.«

Nach jeder Runde neuen Diff erzeugen und den Reviewer gezielt auf die offenen
Befunde ansetzen, nicht auf das ganze Paket.

Bleibt nach Runde 2 etwas offen:

- Paket im Plan auf `[!]` setzen, mit den offenen Befunden in einer Zeile.
- Arbeitsbaum sichern statt wegwerfen, und dabei den Plan draußen halten:

  ```bash
  git stash push -u -m "paket-N-abgebrochen" -- . ':(exclude)remediation-plan.md'
  ```

  Der Ausschluss ist nicht optional. `remediation-plan.md` ist während des
  ganzen Laufs untracked — `-u` nimmt ihn sonst mit in den Stash, und der Plan
  verschwindet aus dem Arbeitsbaum, genau in dem Moment, in dem ein Paket
  blockiert und ihn jemand braucht.
- Der Stash-Name kommt als letzte Verlaufszeile in den Plan, der übrige Verlauf
  bleibt stehen. Wer das Paket später aufnimmt, hat sonst einen Stash ohne
  Vorgeschichte.
- `Stand:` im Kopf auf das nächste Paket setzen und den Arbeitsbaum dort als
  sauber vermerken — der Stash ist gerade der Grund dafür.
- Bauen spätere Pakete darauf auf, hält der Lauf hier an und berichtet. Sonst
  weiter mit dem nächsten Paket.

Widerspricht ein Befund dem, was der Plan ausdrücklich verlangt, entscheidet
weder der Reviewer noch du. Beide Seiten dem Nutzer vorlegen und fragen, was
gilt.

Zwei Runden ohne Erklärung rot heißt: das Problem ist ein anderes als
vermutet. Dann nicht weiterraten, sondern blockieren und berichten.

## Zug 5 — Verify, Commit, Plan fortschreiben, Checkpoint

Das Verify-Kommando des Pakets läufst **du** selbst und liest die Ausgabe.
Der Report des Subagenten ist kein Beleg, auch wenn er dieselbe Zahl nennt.

Gegen die Baseline aus Schritt 2 halten: was dort schon rot war, blockiert
nicht. Alles Neue schon.

```bash
git add <die Pfade aus dem Diff>
git commit --no-gpg-sign -m "<Message aus dem Plan>"
```

Gezielt hinzufügen, nie `git add -A` — sonst wandern der Plan und fremde
Dateien in den Commit. Pre-Commit-Hooks laufen mit; `--no-verify` wird nicht
gesetzt. Bricht ein Hook ab, ist das ein echter Befund und geht zurück in die
Fehlerkette.

Danach sofort, im selben Zug: `[~]` auf `[x]`, Hash aus
`git rev-parse --short HEAD` eintragen, `Stand:` im Kopf auf das nächste Paket
setzen. Nicht sammeln und am Ende nachtragen — nach einer Kompaktierung ist der
Plan das Einzige, was den Stand kennt.

Jetzt wird verdichtet: der `Verlauf:` des Pakets weicht einer `Ergebnis:`-Zeile,
darunter stehen drei getrennte Listen — Nebenbefunde, Folgen, Schnittstellen.

```markdown
### [x] 3. WebSocket-Reconnect: Listener und Timer aufräumen
- Findings: LEAK-001 (high), LEAK-003 (high)
- Ziel: <ein Satz>
- Hash: a3f91c2
- Ergebnis: 2 Runden · LEAK-001 und LEAK-003 behoben · klein: JSDoc an
  `reconnect()` fehlt
- Nebenbefunde: `src/net/pool.ts:120` — dieselbe Timer-Falle, nicht im Audit
- Folgen: `src/api/client.ts:33` — hält noch eine Referenz auf den entfernten
  `socket.retryDelay`
- Schnittstellen: `createSocket(url, opts)` — zweiter Parameter neu und
  pflichtig · `socket.retryDelay` entfernt, ersetzt durch `opts.backoff`
```

`Schnittstellen:` steht nur unter Paketen, die an der Oberfläche etwas verändert
haben, und nennt genau das, wogegen ein späterer Implementierer compiliert: neue
oder geänderte Signaturen, umbenannte und entfernte Exporte, eingeführte
Konstanten und Konfigschlüssel. Sie ist die Quelle für Punkt 3 des Briefings in
Zug 1. Ohne sie lebt dieses Wissen ausschließlich in deinem Kontext, und Paket 7
wird gegen eine Signatur gebaut, die du dir nach der Kompaktierung
zusammenreimst.

Der Verlauf hat seinen Zweck erfüllt, sobald der Commit steht; ab da erzählt der
Hash den Rest. Was ihn überlebt, ist genau das, was ein späteres Paket braucht:
Ergebnis, Nebenbefunde, Folgen. Zwölf Pakete mit vollem Verlauf schieben die offene
Restliste so weit nach unten, dass sie niemand mehr zuerst liest — und die
offene Restliste ist der Grund, warum diese Datei existiert.

Nebenbefunde und Folgen sind der Eingabestapel für Zug 0 des nächsten Pakets,
aber mit verschiedenem Ausgang. Beim Nebenbefund entscheidet der Planer, *ob* er noch in
diesen Lauf gehört. Bei einer Folge entscheidet er nur, in *welches* Paket —
sie ist Arbeit dieses Laufs, und sie verlässt ihn nicht. Ein Eintrag, der beim
Notieren schon eine Datei und eine Zeile hat, ist dort zehnmal mehr wert als
einer, der »irgendwo im Router« sagt.

Die Trennung wird beim Schreiben entschieden, nicht später: Nebenbefund ist,
was auch ohne dieses Paket falsch gewesen wäre. Alles andere ist eine Folge.
Im Zweifel Folge — die Fehleinordnung nach oben kostet einen Blick in
`git show`, die nach unten schiebt eigenen Schaden ins nächste Audit.

### Checkpoint

Der Commit steht, der Plan ist fortgeschrieben: das ist die einzige Stelle im
Lauf, an der kein Detailplan halb geschrieben und kein Arbeitsbaum halb gefüllt
ist. Hier wird der Kontext entbehrlich gemacht, bevor er es von selbst wird.

Die Prüffrage lautet nicht »habe ich die Felder ausgefüllt«, sondern: **was
weiß ich über diesen Lauf, das nicht in `./remediation-plan.md` steht?** Alles,
was ein späteres Paket braucht, wandert jetzt hinein. Der Rest darf vergessen
werden.

| Prüfen | Steht wo |
| --- | --- |
| Hash des Pakets eingetragen, Marke auf `[x]` | beim Paket |
| `Stand:` nennt das nächste Paket und den Zustand des Arbeitsbaums | Kopf |
| Verlauf durch die `Ergebnis:`-Zeile ersetzt | beim Paket |
| Nebenbefunde und Folgen je mit Datei und Zeile | beim Paket |
| Schnittstellen notiert, falls die Oberfläche sich bewegt hat | beim Paket |
| Was der Nutzer während des Pakets entschieden hat, datiert | »Entscheidungen« |

Bei einem blockierten Paket tritt der Stash-Name an die Stelle des Hashes, der
Verlauf bleibt stehen; sonst gilt dieselbe Liste.

Danach eine Zeile an den Nutzer, im Ton einer Statusmeldung und nicht als
Frage: Paket N committet, `<hash>`, der Stand liegt vollständig im Plan,
`/compact` ist ab hier gefahrlos. **Dann läuft Zug 0 des nächsten Pakets an,
ohne auf eine Antwort zu warten.** Kompaktieren kann nur der Nutzer, und der
Lauf hält dafür nicht an — er stellt den Moment nur her, an dem es nichts
kostet.

Der Checkpoint ist keine Ablage. Was nicht in eine der Zeilen oben passt,
gehört auch nicht in den Plan: kein Protokoll deiner Überlegungen, keine
Zusammenfassung dessen, was die Subagenten geschrieben haben, keine Notiz
»für den Fall, dass«. Eine Datei, in die vorsichtshalber alles wandert, wird
so schnell unlesbar wie ein Kontext, in dem alles bleibt.

## Wiederaufnahme

Zwei Fälle, dieselbe Regel: eine neue Session, die einen Plan vorfindet, und
dieselbe Session nach einer Kompaktierung.

### Nach einer Kompaktierung

Der Nutzer hat `/compact` getippt. Du bist derselbe Agent, aber was du über den
Lauf zu wissen glaubst, ist jetzt eine Zusammenfassung: sie sagt, was beim
Zusammenfassen wichtig schien, nicht was im Repository steht. Sie ist keine
Quelle, sondern eine Erinnerung an eine.

Also, bevor irgendein Zug startet: `./remediation-plan.md` ganz lesen und
`git log --oneline` dagegen halten. Beides zusammen kostet zwei Aufrufe und ist
danach wieder vollständig da.

Die Versuchung liegt genau darin, dass die Zusammenfassung plausibel klingt.
»Paket 4 committet, weiter mit Paket 5« reicht scheinbar zum Loslegen — und
verschweigt, dass unter Paket 4 zwei Folgen stehen, die Zug 0 verteilen muss,
und dass Paket 5 seit der Umsortierung gar nicht mehr das nächste ist.

Steht dabei ein Paket auf `[~]`, hat die Kompaktierung nicht am Checkpoint
zugeschlagen, sondern mitten im Paket — das automatische Kompaktieren fragt
nicht, wo du gerade bist. Dann gilt zusätzlich alles, was unten für ein
abgerissenes `[~]`-Paket steht, Rückfrage beim schmutzigen Baum eingeschlossen.

### In einer neuen Session

Existiert beim Start ein `./remediation-plan.md` mit offenen Paketen und passt
sein Kopf zu Audit-Quelle und Branch, wird dort weitergearbeitet statt neu
geplant.

Zuerst `git log --oneline` gegen die eingetragenen Hashes halten. Ein Paket
mit Hash im Plan ist erledigt, auch wenn du dich an nichts erinnerst. Der
Plan und `git log` schlagen die Erinnerung.

Pakete auf `[!]` sind bewusst blockiert. Sie werden nicht stillschweigend neu
versucht — erst fragen, ob und wie.

Ein Paket auf `[~]` ist mitten im Zug abgerissen: der Detailplan steht, ein
Commit fehlt. Sein `Verlauf:` sagt, wie weit es kam, `git status` sagt, ob das
noch stimmt. Beides wird gegeneinander gehalten, keins allein geglaubt.

Sauberer Baum und ein Verlauf, der nach Zug 0 endet: es ist nichts verloren, das
Paket geht auf `[ ]` zurück und beginnt bei Zug 0.

Schmutziger Baum: der Verlauf sagt, wessen Änderungen dort liegen und welche
Runden sie hinter sich haben. Das ist der Stand, den du dem Nutzer vorlegst,
zusammen mit der Frage, ob die Änderungen weiterverwendet oder verworfen werden.
Ohne diese Antwort läuft nichts.

Widersprechen sich beide — der Verlauf endet nach Zug 0, aber der Baum ist
schmutzig, oder umgekehrt —, dann hat jemand außerhalb des Laufs gearbeitet oder
ein Zug hat seine Zeile nicht geschrieben. Dasselbe gilt für ein `[~]`-Paket
ganz ohne `Verlauf:`, etwa aus einem Lauf vor dieser Regel. In beiden Fällen
entscheidet der Nutzer über den Arbeitsbaum, bevor irgendetwas läuft.

### In beiden Fällen

Zug 0 läuft für das nächste offene Paket, auch wenn es Paket 1 ist. Seine
Ausnahme gilt einem Grobplan, der Minuten alt in deinem Kontext liegt — nicht
einem, der seit einer unbekannten Zahl von Commits herumliegt, und nicht einem,
den eine Kompaktierung soeben auf drei Zeilen eingedampft hat.

## Häufige Ausreden

| Ausrede | Wirklichkeit |
| --- | --- |
| »Das ist ein Einzeiler, das mache ich schnell selbst« | Eigene Fixes umgehen das Review und verbrauchen den Kontext, den du für alle weiteren Pakete brauchst. Der Subagent macht es. |
| »Der Subagent sagt, die Tests laufen« | Der Report ist eine Behauptung. Der Beleg ist dein eigener Verify-Lauf. |
| »Kleines Paket, das Review kann entfallen« | Jedes Paket wird reviewt. Der Aufwand skaliert über die Modellstufe des Reviewers, nicht über das Weglassen. |
| »Der Fix ist offensichtlich richtig, der Test kann nach« | Ein Test nach dem Fix läuft sofort grün und beweist nichts. Rot zuerst. |
| »Noch eine Runde, dann konvergiert es« | Nach Runde 2 konvergiert es nicht mehr, es ist strukturell. Blockieren und berichten. |
| »Der Befund ist offensichtlich falsch, ich lasse ihn weg« | Dann steht die Begründung im Plan. Ein stilles Verschwinden gibt es nicht. |
| »Das andere Problem fixe ich gleich mit« | War es auch ohne dich falsch, steht es nicht im Plan und nicht in diesem Paket: Nebenbefund mit Datei und Zeile, Zug 0 entscheidet. Hat deine eigene Änderung es erzeugt, ist es kein anderes Problem, sondern deins. |
| »Das hat mein Fix ausgelöst, aber es ist ein eigenes Problem — ab ins nächste Audit« | Das nächste Audit sieht einen Defekt ohne Vorgeschichte und hält ihn für vorbestehend. Was dieser Lauf verursacht, schließt dieser Lauf. |
| »Drei Stellen brechen, also drei Pakete« | Erst die Ursachen zählen, dann die Pakete. Drei Symptome einer Ursache sind ein Paket — drei daraus zu machen heißt, dieselbe Ursache dreimal halb zu beheben und beim nächsten Durchgang die nächsten drei Stellen zu erzeugen. |
| »Der Aufrufer steht nicht in meinem Paket, den melde ich« | Er steht in deinem Schatten. Was deine Änderung falsch macht, ziehst du mit; gemeldet wird, was auch ohne dich falsch war. |
| »Der Reviewer soll das nicht aufmachen, das ist eine Folgesache« | Solange der Umbau offen ist, kostet die Stelle eine Review-Runde. Drei Pakete später kostet sie Planer, Implementierer und Commit. |
| »Die Kette läuft in der dritten Generation, aber diesmal ist es der letzte Fall« | War es beim zweiten Mal auch. Ab der dritten Generation ist der eingeschlagene Weg das Problem, nicht die Stelle. Vorlegen. |
| »Den Plan aktualisiere ich am Ende in einem Rutsch« | Der Kontext kann vorher enden. Dann sind Stand und Hashes weg. |
| »Den Verlauf schreibe ich, wenn das Paket durch ist« | Ist es durch, ersetzt die Ergebniszeile ihn ohnehin. Der Verlauf wird ausschließlich für den Fall geschrieben, dass es nicht durchkommt. |
| »`[~]` sagt doch schon, dass das Paket läuft« | Es sagt nicht, wie weit. Zwischen »Detailplan steht« und »ein Implementierer hat den Arbeitsbaum voll« liegt der Unterschied zwischen weitermachen und den Nutzer fragen. |
| »Lieber nicht kompaktieren, dann geht nichts verloren« | Der Kontext endet so oder so, nur zu einem Zeitpunkt, den dann nicht du wählst. Am Checkpoint kostet das Vergessen nichts, mitten in Zug 3 kostet es das Paket. |
| »Die Zusammenfassung nennt den Stand, den Plan lese ich nicht extra« | Sie nennt, was beim Zusammenfassen wichtig schien. Verteilte Folgen, umsortierte Pakete und der halbe Arbeitsbaum stehen selten darunter. Zwei Aufrufe, dann weißt du es wieder. |
| »Die Signatur habe ich selbst beauftragt, die weiß ich noch« | Vor der Kompaktierung ja. Danach hast du eine plausible Signatur, und der Implementierer merkt den Unterschied erst im Typecheck. Sie gehört in die `Schnittstellen:`-Zeile, bevor sie gebraucht wird. |
| »Der Nutzer hat auf die Compact-Zeile nicht geantwortet, ich warte« | Die Zeile ist eine Meldung, keine Frage. Kompaktieren kann nur er, entscheiden muss er nichts — Zug 0 des nächsten Pakets läuft an. |
| »Die Finding-ID im Kommentar hilft beim Nachvollziehen« | Nach dem Lauf verweist sie auf eine Datei, die niemand mehr hat. Wer nachvollziehen will, hat `git log` und die Commit-Message. |
| »Ein Satz zum Vorzustand macht die Änderung verständlich« | Verständlich für den, der den Vorzustand kennt. Alle anderen lesen die Erklärung von etwas, das sie nie gesehen haben. |
| »Der Nutzer hat das eben entschieden, das weiß ich noch« | Der nächste Agent weiß es nicht und fragt es neu. Datiert in »Entscheidungen«, sofort. |
| »Der Plan kann ruhig mit in den Paket-Commit« | Er trägt den Hash genau dieses Commits — der steht erst danach fest. Dazu läge der Auftrag des Reviewers in dem Diff, den er beurteilen soll. Der Plan geht einmal mit, im Abschluss-Commit. |
| »Der Grobplan sagt schon genug, Zug 0 spare ich mir« | Der Grobplan sagt *was*, nicht *wie*. Ohne Abgleich arbeitet der Implementierer gegen einen Code-Stand von vor N Commits. |
| »Ich kenne das Paket, ich schreibe den Detailplan selbst« | Dein Kontext kennt den Plan, nicht den aktuellen Code. Der Abgleich ist der Zweck der Übung, und er kostet Lesearbeit, die nicht in deinen Kontext gehört. Nur Paket 1 ist ausgenommen. |
| »Der Planer hat einen besseren Weg gefunden, den nehme ich« | Weicht er vom freigegebenen Weg ab, entscheidet der Nutzer. »Besser« ist genau die Begründung, für die die Rückfrage existiert. |
| »Alle Findings des Pakets sind weg, ich streiche es aus dem Plan« | Es bleibt drin, auf `[x]` mit dem Vermerk »entfallen« und der Begründung. Ein spurlos verschwundenes Paket sieht im Folgeaudit aus wie ein vergessenes. |
