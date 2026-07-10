# Szenario-Tests

Anleitungen **für Claude**, um die Verhaltensanweisungen dieses Repos gegen
frische Subagenten zu testen (TDD für Instruktionen: Fixture mit bekannter
Ground Truth → Subagent ohne Vorwissen → Checkliste). Diese Tests werden bei
Änderungen an den jeweiligen Artefakten ausgeführt — die Zuordnung steht im
Repo-`CLAUDE.md` unter „Scenario tests".

| Test | Prüft | Wann ausführen |
| --- | --- | --- |
| [`install-drift.md`](./install-drift.md) | Drift-Check & Fremdinhalt-Schutz des Install-/Update-Pfads | nach Änderungen an `global-behavior/INSTALL.md` |
| [`audit-followup.md`](./audit-followup.md) | Folgelauf-Logik des Audit-Skills (Merge, Köder, acknowledged, Theme, Historie) | nach Änderungen an `js-ts-project-audit/` |
| [`es-frequency.md`](./es-frequency.md) | deterministische Anteile der ES-Regel (Sperre, Baseline, Grenzen, Logbuch) | nach Änderungen an der ES-Regel in `global-behavior/CLAUDE.md` |

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
  nur Korrekturen an den Instruktionen (samt `CHANGELOG.md`-Eintrag), nicht
  die Testprotokolle.
