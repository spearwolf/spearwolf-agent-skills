# Umsetzung — ein Paket vom Brief bis zum Commit

Gilt ab Schritt 6, nach der Freigabe des Plans. Jedes Paket durchläuft
dieselben fünf Züge. Kein Zug wird übersprungen, auch nicht bei einem
Zweizeiler.

Alles, was du in einen Dispatch-Prompt kopierst und alles, was ein Subagent
im Klartext zurückgibt, bleibt für den Rest der Session in deinem Kontext und
wird bei jedem weiteren Zug erneut gelesen. Deshalb sind die Prompts unten
Pfadangaben statt Volltexte, und deshalb sind die Rückgabeverträge kurz.

Diff-Dateien gehören nicht ins Projekt. Lege sie im Scratchpad-Verzeichnis
des Hosts ab; gibt es keines, in `.git/remediation/` — das liegt außerhalb
der Versionierung.

## Zug 1 — Implementierer beauftragen

Der Prompt besteht aus diesen fünf Teilen, in dieser Reihenfolge:

1. Ein Satz: worum geht es im Projekt, wo sitzt dieses Paket.
2. Der Pfad `./remediation-plan.md` und die Paketnummer, eingeführt als:
   »Lies zuerst den Abschnitt zu Paket N. Das sind deine Anforderungen, mit
   den exakten Werten. Die anderen Pakete gehören anderen Läufen.«
3. Schnittstellen und Entscheidungen aus bereits erledigten Paketen, die im
   Plan nicht stehen können: neue Signaturen, umbenannte Exporte, eingeführte
   Konstanten.
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

Danach sofort, im selben Zug: im Plan `[x]` setzen, Hash aus
`git rev-parse --short HEAD` eintragen, kleine Befunde und Nebenbefunde
darunter notieren. Nicht sammeln und am Ende nachtragen — nach einer
Kompaktierung ist der Plan das Einzige, was den Stand kennt.

## Wiederaufnahme

Existiert beim Start ein `./remediation-plan.md` mit offenen Paketen und passt
sein Kopf zu Audit-Quelle und Branch, wird dort weitergearbeitet statt neu
geplant.

Zuerst `git log --oneline` gegen die eingetragenen Hashes halten. Ein Paket
mit Hash im Plan ist erledigt, auch wenn du dich an nichts erinnerst. Der
Plan und `git log` schlagen die Erinnerung.

Pakete auf `[!]` sind bewusst blockiert. Sie werden nicht stillschweigend neu
versucht — erst fragen, ob und wie.

## Häufige Ausreden

| Ausrede | Wirklichkeit |
| --- | --- |
| »Das ist ein Einzeiler, das mache ich schnell selbst« | Eigene Fixes umgehen das Review und verbrauchen den Kontext, den du für alle weiteren Pakete brauchst. Der Subagent macht es. |
| »Der Subagent sagt, die Tests laufen« | Der Report ist eine Behauptung. Der Beleg ist dein eigener Verify-Lauf. |
| »Kleines Paket, das Review kann entfallen« | Jedes Paket wird reviewt. Der Aufwand skaliert über die Modellstufe des Reviewers, nicht über das Weglassen. |
| »Der Fix ist offensichtlich richtig, der Test kann nach« | Ein Test nach dem Fix läuft sofort grün und beweist nichts. Rot zuerst. |
| »Noch eine Runde, dann konvergiert es« | Nach Runde 2 konvergiert es nicht mehr, es ist strukturell. Blockieren und berichten. |
| »Der Befund ist offensichtlich falsch, ich lasse ihn weg« | Dann steht die Begründung im Plan. Ein stilles Verschwinden gibt es nicht. |
| »Das andere Problem fixe ich gleich mit« | Es steht nicht im Plan, also nicht in diesem Lauf. Als Nebenbefund notieren, das nächste Audit findet es. |
| »Den Plan aktualisiere ich am Ende in einem Rutsch« | Der Kontext kann vorher enden. Dann sind Stand und Hashes weg. |
