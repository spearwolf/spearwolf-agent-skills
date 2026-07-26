---
name: js-ts-audit-remediation
description: Use when the user wants the findings of an existing project audit actually fixed rather than reported — "arbeite die Issues aus dem Audit ab", "behebe die Findings", "setz die Empfehlungen um", "Backlog abarbeiten", "Schritt für Schritt beheben", "fix the audit findings", "work through the audit". Also triggers when a `./audit.html` sits in the project root and the user asks for the problems in it to be resolved, and for resuming an interrupted run ("mach mit dem Plan weiter") when `./remediation-plan.md` still has open items. Producing the audit itself is a different job — that is `js-ts-project-audit`.
---

# Audit-Remediation

Aus den Findings eines Audits wird ein Umsetzungsplan, den Subagenten paketweise abarbeiten. Ein Paket, ein Subagent, ein Review, ein Commit.

## Ablauf-Übersicht

1. Findings laden (1), Baseline messen (2), Scope festlegen (3).
2. Offene Entscheidungen gebündelt klären (4).
3. Pakete schnüren, ordnen, Plan schreiben, Freigabe holen (5).
4. Paket für Paket umsetzen, prüfen, committen (6).
5. Semver bewerten, abschließen, Folgeaudit anbieten (7).

Referenzdateien werden erst gelesen, wenn ihr Schritt dran ist:

| Datei | Wann lesen |
| --- | --- |
| `references/execution.md` | Schritt 6 — vor dem ersten Subagenten |
| `references/semver-and-closeout.md` | Schritt 7 — nach dem letzten Paket |

## Grenzen des Laufs

Diese Regeln stehen über jeder Abwägung im Einzelfall:

- **Ohne Freigabe des Plans wird keine Zeile Projektcode geändert.** Auch nicht »schon mal das Triviale vorziehen«.
- **Nie rot committen.** Der Report eines Subagenten ist keine Evidenz. Evidenz ist der Verify-Lauf, den du selbst nach dem Paket ausführst und dessen Ausgabe du gelesen hast.
- **Kein Push, kein Merge, kein Pull Request, kein Tag, kein Publish.** Der Lauf endet mit lokalen Commits.
- **Kein Worktree, kein neuer Branch von sich aus.** Gearbeitet wird auf dem Branch, den Schritt 5 benennt und der Nutzer freigibt.
- **Der Orchestrator schreibt keinen Projektcode.** Weder als schnelle Korrektur noch nachdem ein Subagent gescheitert ist. Eigene Fixes umgehen das Review und verbrauchen den Kontext, den die Koordination über viele Pakete braucht.
- **Kein Finding außerhalb des Plans.** Was ein Subagent nebenbei entdeckt, wird notiert und geht ins nächste Audit, nicht in diesen Lauf.

## Workflow

### 1. Findings laden

Quelle ist die JSON-Insel `<script id="audit-data" type="application/json">` in `./audit.html`. Daraus: Findings, `summary`, `acknowledged`.

- Insel nicht parsebar: Findings best effort aus der Backlog-Tabelle rekonstruieren (Titel, Severity, Location, Kategorie, Empfehlung) und im Plan vermerken, dass die Grundlage unvollständig ist.
- Keine `audit.html` vorhanden: nicht raten. Fragen, ob stattdessen `js-ts-project-audit` laufen soll, oder wo die Issue-Liste liegt.
- `acknowledged` bleibt draußen. Diese Punkte hat der Nutzer bewusst zurückgestellt; sie werden weder geplant noch gefixt, bis er sie widerruft.

### 2. Baseline messen

Verify-Kommandos aus `package.json#scripts` ermitteln: Lint, Typecheck, Test, Build. Jedes einmal laufen lassen und das Ergebnis festhalten.

Das ist keine Formalie. Ohne Baseline hängt später jeder rote Lauf in der Luft: war das mein Paket oder war das schon vorher kaputt? Was jetzt schon fehlschlägt, wird im Plan namentlich notiert und blockiert später keinen Commit. Ist die Baseline auf breiter Front rot, ist ihre Reparatur das erste Paket.

Dazu `git status` und `git branch --show-current`. Ein unsauberer Arbeitsbaum ist ein Stopp mit Rückfrage: stashen, committen oder abbrechen. Fremde Änderungen dürfen nicht in Paket-Commits geraten.

### 3. Scope festlegen

Vorschlag: alle Findings außer `info`. Anzahl je Severity nennen, bestätigen lassen. Der Nutzer kann eingrenzen, auf Severity-Stufen oder auf einzelne IDs. Was draußen bleibt, steht im Plan, damit später niemand rätselt, warum `PERF-007` nie auftauchte.

### 4. Offene Entscheidungen klären

Vor dem Plan, nicht während der Umsetzung. Gefragt wird, wo eine Entscheidung fehlt:

- die Sektion »Offene Fragen« des Reports
- Empfehlungen, die zwei gleichwertige Wege offenlassen
- Findings, die eine Produkt- oder API-Entscheidung berühren: einen Export streichen, Default-Verhalten ändern, eine Dependency austauschen
- Findings, die einander widersprechen oder deren Behebung ein anderes gegenstandslos macht
- Findings ohne belastbare Empfehlung

**Alles andere wird nicht gefragt.** Hat ein Finding eine eindeutige Empfehlung, gilt sie. Rückfragen zu Dingen, die im Audit bereits beantwortet sind, sind der schnellste Weg, eine Klärungsrunde nutzlos zu machen.

Gebündelt fragen, in einer Runde, je mit Vorschlag statt offener Frage. Die Antworten kommen mit Datum in den Plan-Abschnitt »Entscheidungen«, damit ein späterer Lauf sie nicht neu aufwirft.

### 5. Pakete, Reihenfolge, Plan

**Bündeln** nach gemeinsamer Ursache, nicht nach Kategorie. Drei `any`-Findings in derselben Datei sind ein Paket; drei `any`-Findings in drei Subsystemen sind drei. Obergrenze etwa fünf Findings oder eine Handvoll Dateien. Sprengt ein einzelnes Finding das schon (`strict: true` über ein gewachsenes Projekt), wird es in Teilpakete zerlegt. Ein kritischer Fix wandert nie in ein Kosmetik-Paket, sonst versteckt sich der wichtige Commit im unwichtigen.

**Reihenfolge** in fünf Phasen:

1. **Sicherungsnetz und Sichtbarkeit** — Lint, Typecheck, Testrunner, CI. Solange die Werkzeuge nicht laufen, ist jeder spätere Schritt unverifizierbar.
2. **Tests** für genau die Bereiche, die in Phase 3 und 4 umgebaut werden. Nicht flächendeckend.
3. **Korrektheit** — Bugs, Memory Leaks, Async und Races, Sicherheit. Größter Schaden, kleinster Blast Radius.
4. **Typsicherheit und Struktur** — Strictness-Stufen, Architektur, Modulgrenzen, öffentliche API. Hier entstehen die Breaking Changes.
5. **Konsistenz, DX, Doku, Dependency-Kosmetik.**

Drei Querregeln schlagen die Phasen: echte Abhängigkeiten gehen vor (verlangt ein Bugfix erst eine Umstrukturierung, kommt die Umstrukturierung zuerst); Dependency-Bumps, die APIs verändern, gehören nach vorn und nicht ans Ende; breitflächige Umformatierungen oder Renames liegen ganz vorn oder ganz hinten, nie dazwischen, weil sonst jeder folgende Diff unlesbar wird.

**Der Plan** wird nach `./remediation-plan.md` geschrieben, überschreibt eine vorhandene Datei und ist gleichzeitig Auftragsmappe für die Subagenten und Fortschritts-Ledger. Deshalb steht in jedem Paket alles, was zur Umsetzung nötig ist, im Volltext. Format:

```markdown
# Remediation-Plan — <Projektname>

Quelle: ./audit.html vom <Datum> · Branch: <name> · erstellt: <Datum>
Baseline: lint ✓ · typecheck ✓ · test 3 Fehler (vorbestehend, siehe unten) · build ✓
Scope: 24 von 31 Findings (3 critical, 8 high, 13 medium) · ausgenommen: info, acknowledged

## Entscheidungen
- Alten `parseConfig`-Export entfernen statt deprecaten (2026-07-26)

## Vorbestehende Fehler
- `test/legacy.spec.ts` — 3 Fehler, vor Lauf-Beginn vorhanden, kein Teil des Scopes

## Pakete

### [ ] 1. WebSocket-Reconnect: Listener und Timer aufräumen
- Findings: LEAK-001, LEAK-003
- Ziel: <ein Satz>
- Dateien: `src/net/socket.ts`, `src/net/reconnect.ts`
- Modell: mittlere Stufe
- Verify: `npm run typecheck && npm test -- src/net`
- Commit: `fix(net): clean up socket listeners and reconnect timers (LEAK-001, LEAK-003)`
- Hash: —

**LEAK-001 · high · src/net/socket.ts:88** — Listener wird bei Reconnect nicht entfernt
<description im Volltext>
Empfehlung: <recommendation im Volltext>
```

Statusmarken: `[ ]` offen, `[x]` erledigt, `[!]` blockiert. Vor dem Schreiben ein Durchgang gegen Platzhalter: kein »TBD«, kein »Fehlerbehandlung ergänzen«, kein »analog zu Paket 3«. Ein Paket, dessen Ziel sich nicht in einem Satz sagen lässt, ist falsch geschnitten.

**Freigabe.** Der Plan wird vorgelegt, und zwar ausdrücklich mit Branch und Commit-Modus: »<N> Pakete, <N> Commits direkt auf `<branch>`, ohne GPG-Signatur«. Diese Freigabe ist die Zustimmung zum Arbeiten auf diesem Branch. Ohne sie beginnt die Umsetzung nicht.

### 6. Umsetzung

Jetzt `references/execution.md` lesen. Dort stehen Subagenten-Briefing, Review, Verify- und Commit-Regeln, die Fehlerkette und die Wiederaufnahme.

### 7. Abschluss

Nach dem letzten Paket `references/semver-and-closeout.md` lesen. Dort stehen die Semver-Bewertung, der Umgang mit dem CHANGELOG des Zielprojekts, der Abschluss-Commit und die Übergabe.

## Modellwahl

Jeder Subagent bekommt sein Modell **explizit** mitgegeben. Ohne Angabe erbt er das Modell der laufenden Session, meist das teuerste, und die ganze Abstufung ist wirkungslos.

| Stufe | Wofür |
| --- | --- |
| günstigste | Der Auftrag ist praktisch Transkription: eine Datei, benannte Stelle, nichts zu suchen. Lint-Autofix nachziehen, Magic Number in eine Konstante, `.editorconfig` anlegen, README-Abschnitt, ein fehlendes `clearInterval` an genannter Zeile. |
| mittlere | Standardfall und Untergrenze für alles, was aus Prosa arbeitet: lokaler Bugfix samt Regressionstest, Typen schärfen, ein Modul refactoren, Konfigwechsel mit Folgefehlern. |
| stärkste | Umbauten über Modulgrenzen, Concurrency und Race Conditions, Sicherheitsfixes mit Angriffsmodell, öffentliche API neu schneiden, alles mit unklarem Blast Radius. |

Im Zweifel eine Stufe höher: die Rundenzahl schlägt den Tokenpreis. Ein günstiges Modell, das dreimal so viele Runden braucht und dann scheitert, kostet mehr als das passende beim ersten Versuch.

Das Modell des Reviewers wählst du nach dem Diff, nicht nach dem Paket: ein kleiner mechanischer Diff braucht die mittlere Stufe, eine subtile Änderung an Nebenläufigkeit oder Sicherheit die stärkste.

## Prinzipien

- **Die Empfehlung gilt.** Das Audit hat den Weg bereits benannt. Ein anderer Weg braucht einen Grund, der im Report des Subagenten steht, keine stille Umdeutung.
- **Bugfix heißt Test zuerst.** Ein Paket, das einen Korrektheitsfehler behebt, schreibt zuerst den fehlschlagenden Test, sieht ihn rot, und behebt dann. Ohne rot gesehenen Test weiß niemand, ob der Test den Fehler überhaupt fangen würde. Ausgenommen sind Pakete ohne testbaren Kern: Konfiguration, Dokumentation, Dependency-Bumps, reine Formatierung. Fehlt dem Projekt jede Testinfrastruktur, ist das selbst ein Finding und gehört in Phase 1 — mitten im Bugfix wird kein Test-Harness nachgerüstet.
- **Sequenziell.** Nie zwei Implementierungs-Subagenten gleichzeitig. Sie teilen sich einen Arbeitsbaum, und der Konflikt kostet mehr als die gesparte Zeit.
- **Der Plan ist die Wahrheit, nicht die Erinnerung.** Nach einer Kontext-Kompaktierung gelten `./remediation-plan.md` und `git log`, nicht das, was du zu wissen glaubst.
- **Sprache.** Antworten an den Nutzer in der Sprache seiner Anfrage. Commit-Messages in der Sprache, die `git log` des Projekts zeigt.

## Zusammenspiel mit anderen Skills

Dieser Skill funktioniert allein und setzt keine Erweiterung voraus. Sind die Superpowers-Skills installiert, gilt folgende Aufteilung, damit sich nichts doppelt:

- `js-ts-project-audit` liefert den Input und übernimmt am Ende den Folgelauf. Es fixt nie selbst, dieser Skill auditiert nie selbst.
- Fährt der Nutzer die Umsetzung ausdrücklich über `superpowers:subagent-driven-development`, gewinnt dessen Prozess für Schritt 6. Findings-Quelle, Paketschnitt, Semver-Bewertung und Folgeaudit bleiben hier.
- Bleibt ein Verify-Lauf nach zwei Runden unerklärlich rot, ist das ein Debugging-Problem. Dann nicht weiterraten: `superpowers:systematic-debugging`, falls vorhanden, sonst Paket blockieren und berichten.
- Wurde ausnahmsweise auf einem Feature-Branch gearbeitet, ist die Integration Sache des Nutzers. Dieser Skill pusht und merged nicht.
