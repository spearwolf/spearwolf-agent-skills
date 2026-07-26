# Szenario-Tests

Anleitungen **für Claude**, um die Verhaltensanweisungen dieses Repos gegen
frische Subagenten zu testen (TDD für Instruktionen: Fixture mit bekannter
Ground Truth → Subagent ohne Vorwissen → Checkliste).

**Ausgeführt wird nur auf ausdrückliche Anfrage des Nutzers.** Eine Änderung
an einem abgedeckten Artefakt löst keinen Lauf aus, sondern einen Eintrag in
[`STATUS.md`](./STATUS.md) und einen Satz beim Übergeben. Die Zuordnung
Artefakt → Test steht im Repo-`CLAUDE.md` unter „Scenario tests", der aktuelle
Stand je Test in `STATUS.md`.

| Test | Prüft | Fällig nach Änderungen an |
| --- | --- | --- |
| [`install-drift.md`](./install-drift.md) | Drift-Check & Fremdinhalt-Schutz des Install-/Update-Pfads | `global-behavior/INSTALL.md` |
| [`audit-followup.md`](./audit-followup.md) | Folgelauf-Logik des Audit-Skills (Merge, Köder, acknowledged, Theme, Historie) | `js-ts-project-audit/` |
| [`es-frequency.md`](./es-frequency.md) | deterministische Anteile der ES-Regel (Sperre, Baseline, Grenzen, Logbuch) | ES-Regel in `global-behavior/` |

## Grundregeln für alle Tests

- **Fixtures niemals in-place mutieren.** Die Verzeichnisse unter
  `scenario-tests/fixtures/` sind die unveränderliche Vorlage — vor jedem Lauf
  in ein frisches Sandbox-Verzeichnis (Scratchpad) kopieren und dort testen.
- **Frische Subagenten, echter Auftrag.** Jeder Testlauf ist ein neuer
  Subagent ohne Konversations-Vorwissen. Der Prompt rahmt die Aufgabe als
  echten Arbeitsauftrag („kein Quiz"), nennt das Sandbox-Verzeichnis als
  `$HOME` bzw. Arbeitsverzeichnis und verbietet ausdrücklich Zugriffe auf das
  echte `/home/…/.claude`.
- **Ausgaben manuell lesen.** Grep hilft beim Vorfiltern, aber jeder Treffer
  wird gelesen — Beispiele, die eine Regel selbst zitiert, sind keine
  Verstöße. Bei statistischen Tests gilt: mindestens 5 Wiederholungen pro
  Variante, Einzelläufe lügen.
- **Abweichungen wörtlich dokumentieren.** Die Rationalisierung des Agenten
  („die Sektion ist ja im Backup gesichert") ist der Rohstoff für die
  Regel-Korrektur: Gegenregel in die Instruktion, dann denselben Test erneut
  laufen lassen, bis keine neuen Ausreden mehr auftauchen.
- **Ergebnis gehört in die Konversation**, nicht ins Repo. Committed werden
  nur Korrekturen an den Instruktionen (samt `CHANGELOG.md`-Eintrag) und die
  Statuszeile in [`STATUS.md`](./STATUS.md), nicht die Testprotokolle.

## Kosten

Ein Lauf startet frische Subagenten, die einen vollständigen Audit- oder
Install-Durchgang machen. Das ist der teuerste Vorgang in diesem Repo und
regelmäßig teurer als die Änderung, die ihn ausgelöst hat.

**Vor dem ersten Subagenten stehen vier Zeilen in der Konversation**, je eine
Entscheidung mit Begründung. Ohne sie startet kein Lauf:

```
Prüfpunkte: <welche, abgeleitet aus dem Diff> · ausgelassen: <welche>
Wiederholungen: <n> · <deterministisch | Häufigkeitsmessung>
Modell: <Stufe> · <warum sie reicht>
Abgeschnitten: <was der Lauf nicht erzeugen muss | nichts, weil …>
```

Die vier Hebel dahinter, nach Wirkung:

1. **Den teuren Teil abschneiden.** Was kein Prüfpunkt liest, muss der Lauf
   nicht erzeugen — das gehört in den Testprompt, nicht in die Hoffnung.
   **Grenze:** gekürzt wird nur, was das getestete Verhalten nicht verändert.
   Ein Prompt, der dem Subagenten aufträgt, einen Schritt seines Skills
   auszulassen, testet den Skill nicht mehr, sondern eine Variante davon. Wo
   der Prüfpunkt am fertigen Artefakt hängt, gibt es hier nichts zu holen, und
   dann steht in der vierten Zeile „nichts".
2. **Das schwächste Modell, das die Aufgabe schafft.** Geprüft wird, ob eine
   Instruktion bindet, nicht wie klug der Agent ist. Wer der Regel mit
   weniger Kapazität folgt, folgt ihr auch mit mehr — der billigere Lauf ist
   hier zugleich der härtere Test. Die stärkste Stufe nur, wenn die
   Fixture-Aufgabe selbst sie verlangt.
3. **Deterministisch ist nicht statistisch.** Ein Prüfpunkt mit eindeutigem
   Ausgang („wurde die Fremdsektion gesichert?") braucht genau einen Lauf. Die
   Fünf-Wiederholungen-Regel gilt nur dort, wo eine Häufigkeit gemessen wird —
   praktisch nur beim ES-Frequenzband.
4. **Wortlaut vorher billig prüfen.** Eine neue Gegenregel erst als
   Einzelprompt gegen einen Kontrolllauf ohne die Regel stellen. Zeigt der
   Kontrolllauf den Fehler gar nicht, gibt es nichts zu reparieren und der
   volle Szenariolauf entfällt. Greift die Formulierung dort, ist der
   Szenariolauf die Endabnahme, einmal, nicht als Iterationsschleife.

Dazu zwei Dauerregeln, die keine Entscheidung pro Lauf brauchen: nur die
Prüfpunkte fahren, die der Diff überhaupt erreichen kann (eine Änderung an
der Merge-Tabelle rechtfertigt keinen Lauf über Theme und Score-Historie),
und Fixtures nur so groß halten, wie es zum Auslösen des Befunds nötig ist.
