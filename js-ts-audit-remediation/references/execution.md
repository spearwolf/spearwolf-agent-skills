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

Diff-Dateien gehören nicht ins Projekt. Lege sie im Scratchpad-Verzeichnis
des Hosts ab; gibt es keines, in `.git/remediation/` — das liegt außerhalb
der Versionierung.

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
   erledigte Pakete samt notierter Nebenbefunde, offene Restliste.
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

**Zweitens den Detailplan schreiben**, direkt in den Abschnitt zu Paket N in
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
- Abgleich (2026-08-06): LEAK-001 unverändert · LEAK-003 nach `reconnect.ts:41`
  gewandert (Paket 1 hat die Datei geteilt)

**LEAK-001 · high · src/net/socket.ts:88** — Listener wird bei Reconnect nicht entfernt
<description im Volltext>
Empfehlung: <recommendation im Volltext>
```

Ein Durchgang gegen Platzhalter, bevor er abgibt: kein »TBD«, kein
»Fehlerbehandlung ergänzen«, kein »analog zu Paket 2«. Der Implementierer
sieht diesen Text und sonst nichts.

**Drittens den Restplan prüfen.** Nebenbefunde aus den erledigten Paketen,
verschobene Fundstellen, weggefallene Findings — was davon ändert die
Reihenfolge oder den Schnitt der noch offenen Pakete? Jede Änderung kommt mit
einer Zeile Begründung in den Plan.

### Was er allein entscheidet

- Ein Finding als gegenstandslos streichen — mit Fundstelle und dem, was dort
  jetzt tatsächlich steht. Eine Vermutung reicht nicht.
- Einen Nebenbefund aus einem erledigten Paket in dieses oder ein späteres
  Paket aufnehmen, wenn er dieselbe Ursache hat oder ein späteres Paket sonst
  blockiert.
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

### Was zurück zum Nutzer geht

Hier ändert er nichts, sondern schreibt seinen Vorschlag in den Report und
hält an:

- Etwas, das eine Zeile aus »Entscheidungen« umkehren würde.
- Ein anderer Lösungs- oder Architekturweg als der freigegebene.
- Findings aufnehmen oder streichen, die den Scope aus Schritt 3 verschieben
  — ausgenommen der nachweislich behobene Fall oben.
- Ein Umbau, der mehr als ein weiteres Paket berührt, oder eine Umsortierung
  über mehr als eine Handvoll offener Pakete.
- Ein neuer Befund der Schwere `critical` oder `high`, der nicht aus dem
  Audit stammt.

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
| Planänderungen | was er am Restplan geändert hat, je eine Zeile |
| Rückfragen | was er vorlegt, je mit Vorschlag — leer heißt: es geht weiter |
| Modell | die Stufe, die er für den Implementierer gesetzt hat |

Dann du: Sind Rückfragen da, gehen sie gebündelt und mit seinem Vorschlag an
den Nutzer, bevor irgendetwas umgesetzt wird. Sind alle Findings des Pakets
gegenstandslos, wird das Paket ohne Commit auf `[x]` gesetzt, mit dem Vermerk
»entfallen« und der Begründung. Sonst Paket auf `[~]` und weiter mit Zug 1.

## Zug 1 — Implementierer beauftragen

Der Prompt besteht aus diesen fünf Teilen, in dieser Reihenfolge:

1. Ein Satz: worum geht es im Projekt, wo sitzt dieses Paket.
2. Der Pfad `./remediation-plan.md` und die Paketnummer, eingeführt als:
   »Lies zuerst den Abschnitt zu Paket N. Das sind deine Anforderungen, mit
   den exakten Werten, und sie sind gegen den aktuellen Stand des Codes
   geschrieben. Die anderen Pakete gehören anderen Läufen.«
3. Schnittstellen aus erledigten Paketen, soweit der Detailplan sie nicht
   ohnehin nennt: neue Signaturen, umbenannte Exporte, eingeführte Konstanten.
   Steht es im Plan, wiederholst du es hier nicht.
4. Das Verify-Kommando des Pakets.
5. Der Rückgabevertrag aus Zug 2.

Dazu der Arbeitsauftrag, der in jedem Brief gleich lautet:

- Umfang ist Paket N. Was dir daneben auffällt, meldest du, statt es zu
  beheben.
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
| Nebenbefunde | was auffiel und nicht Teil des Pakets war |

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
- Arbeitsbaum sichern statt wegwerfen:
  `git stash push -u -m "paket-N-abgebrochen"`, Stash-Name in den Plan.
- Bauen spätere Pakete darauf auf, hält der Lauf hier an und berichtet. Sonst
  weiter mit dem nächsten Paket.

Widerspricht ein Befund dem, was der Plan ausdrücklich verlangt, entscheidet
weder der Reviewer noch du. Beide Seiten dem Nutzer vorlegen und fragen, was
gilt.

Zwei Runden ohne Erklärung rot heißt: das Problem ist ein anderes als
vermutet. Dann nicht weiterraten, sondern blockieren und berichten.

## Zug 5 — Verify, Commit, Plan fortschreiben

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

Danach sofort, im selben Zug: im Plan `[~]` auf `[x]` setzen, Hash aus
`git rev-parse --short HEAD` eintragen, kleine Befunde und Nebenbefunde
darunter notieren. Nicht sammeln und am Ende nachtragen — nach einer
Kompaktierung ist der Plan das Einzige, was den Stand kennt.

Die Nebenbefunde stehen dort nicht als Ablage. Sie sind der Eingabestapel für
Zug 0 des nächsten Pakets: dort wird entschieden, ob einer davon in ein
offenes Paket wandert oder ins nächste Audit geht. Ein Nebenbefund, der beim
Notieren schon eine Datei und eine Zeile hat, ist dort zehnmal mehr wert als
einer, der »irgendwo im Router« sagt.

## Wiederaufnahme

Existiert beim Start ein `./remediation-plan.md` mit offenen Paketen und passt
sein Kopf zu Audit-Quelle und Branch, wird dort weitergearbeitet statt neu
geplant.

Zuerst `git log --oneline` gegen die eingetragenen Hashes halten. Ein Paket
mit Hash im Plan ist erledigt, auch wenn du dich an nichts erinnerst. Der
Plan und `git log` schlagen die Erinnerung.

Pakete auf `[!]` sind bewusst blockiert. Sie werden nicht stillschweigend neu
versucht — erst fragen, ob und wie.

Ein Paket auf `[~]` ist mitten im Zug abgerissen: der Detailplan steht, ein
Commit fehlt. `git status` entscheidet. Sauberer Baum: der Detailplan ist von
unbekanntem Alter, das Paket geht zurück auf `[ ]` und beginnt bei Zug 0.
Schmutziger Baum: du weißt nicht, wie weit der Implementierer kam — Stand dem
Nutzer vorlegen und fragen, ob die Änderungen weiterverwendet oder verworfen
werden, bevor irgendetwas läuft.

Bei jeder Wiederaufnahme läuft Zug 0 für das nächste offene Paket, auch wenn
es Paket 1 ist. Die Ausnahme im Zug 0 gilt für den frischen Grobplan, nicht
für einen, der seit einer unbekannten Zahl von Commits herumliegt.

## Häufige Ausreden

| Ausrede | Wirklichkeit |
| --- | --- |
| »Das ist ein Einzeiler, das mache ich schnell selbst« | Eigene Fixes umgehen das Review und verbrauchen den Kontext, den du für alle weiteren Pakete brauchst. Der Subagent macht es. |
| »Der Subagent sagt, die Tests laufen« | Der Report ist eine Behauptung. Der Beleg ist dein eigener Verify-Lauf. |
| »Kleines Paket, das Review kann entfallen« | Jedes Paket wird reviewt. Der Aufwand skaliert über die Modellstufe des Reviewers, nicht über das Weglassen. |
| »Der Fix ist offensichtlich richtig, der Test kann nach« | Ein Test nach dem Fix läuft sofort grün und beweist nichts. Rot zuerst. |
| »Noch eine Runde, dann konvergiert es« | Nach Runde 2 konvergiert es nicht mehr, es ist strukturell. Blockieren und berichten. |
| »Der Befund ist offensichtlich falsch, ich lasse ihn weg« | Dann steht die Begründung im Plan. Ein stilles Verschwinden gibt es nicht. |
| »Das andere Problem fixe ich gleich mit« | Es steht nicht im Plan, also nicht in diesem Paket. Als Nebenbefund mit Datei und Zeile notieren; Zug 0 des nächsten Pakets entscheidet, ob es noch in diesen Lauf gehört. |
| »Den Plan aktualisiere ich am Ende in einem Rutsch« | Der Kontext kann vorher enden. Dann sind Stand und Hashes weg. |
| »Der Grobplan sagt schon genug, Zug 0 spare ich mir« | Der Grobplan sagt *was*, nicht *wie*. Ohne Abgleich arbeitet der Implementierer gegen einen Code-Stand von vor N Commits. |
| »Ich kenne das Paket, ich schreibe den Detailplan selbst« | Dein Kontext kennt den Plan, nicht den aktuellen Code. Der Abgleich ist der Zweck der Übung, und er kostet Lesearbeit, die nicht in deinen Kontext gehört. Nur Paket 1 ist ausgenommen. |
| »Der Planer hat einen besseren Weg gefunden, den nehme ich« | Weicht er vom freigegebenen Weg ab, entscheidet der Nutzer. »Besser« ist genau die Begründung, für die die Rückfrage existiert. |
| »Alle Findings des Pakets sind weg, ich streiche es aus dem Plan« | Es bleibt drin, auf `[x]` mit dem Vermerk »entfallen« und der Begründung. Ein spurlos verschwundenes Paket sieht im Folgeaudit aus wie ein vergessenes. |
