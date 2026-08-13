---
name: js-ts-audit-remediation
description: Use when the user wants the findings of an existing project audit actually fixed rather than reported — "arbeite die Issues aus dem Audit ab", "behebe die Findings", "setz die Empfehlungen um", "Backlog abarbeiten", "Schritt für Schritt beheben", "fix the audit findings", "work through the audit". Also triggers when a `./audit.html` sits in the project root and the user asks for the problems in it to be resolved, and for resuming an interrupted run ("mach mit dem Plan weiter") when `./remediation-plan.md` still has open items. Producing the audit itself is a different job — that is `js-ts-project-audit`.
---

# Audit-Remediation

Aus den Findings eines Audits werden Pakete, die Subagenten der Reihe nach abarbeiten. Ein Paket, ein Detailplan gegen den aktuellen Code, ein Implementierer, ein Review, ein Commit.

## Ablauf-Übersicht

1. Findings laden (1), Baseline messen (2), Scope festlegen (3).
2. Offene Entscheidungen gebündelt klären (4).
3. Pakete schnüren, ordnen, Grobplan schreiben, Freigabe holen (5).
4. Paket für Paket: unmittelbar davor detailliert planen, umsetzen, prüfen, committen (6).
5. Semver bewerten, `./audit.html` nachführen und gestalten lassen, abschließen, Folgeaudit anbieten (7).

Geplant wird zweistufig. Schritt 5 legt fest, **was** in welcher Reihenfolge passiert — das ist, was der Nutzer freigibt. **Wie** ein Paket umgesetzt wird, entsteht erst unmittelbar vor seiner Umsetzung, gegen den Code, der dann tatsächlich dasteht.

Referenzdateien werden erst gelesen, wenn ihr Schritt dran ist:

| Datei | Wann lesen |
| --- | --- |
| `references/execution.md` | Schritt 6 — vor dem ersten Paket |
| `references/semver-and-closeout.md` | Schritt 7 — nach dem letzten Paket |
| `references/audit-report-update.md` | Schritt 7 — nur wenn eine `./audit.html` im Projekt liegt |

## Grenzen des Laufs

Diese Regeln stehen über jeder Abwägung im Einzelfall:

- **Ohne Freigabe des Grobplans wird keine Zeile Projektcode geändert.** Auch nicht »schon mal das Triviale vorziehen«.
- **Nie rot committen.** Der Report eines Subagenten ist keine Evidenz. Evidenz ist der Verify-Lauf, den du selbst nach dem Paket ausführst und dessen Ausgabe du gelesen hast.
- **Kein Push, kein Merge, kein Pull Request, kein Tag, kein Publish.** Der Lauf endet mit lokalen Commits.
- **Kein Worktree, kein neuer Branch von sich aus.** Gearbeitet wird auf dem Branch, den Schritt 5 benennt und der Nutzer freigibt.
- **Der Orchestrator schreibt keinen Projektcode.** Weder als schnelle Korrektur noch nachdem ein Subagent gescheitert ist. Eigene Fixes umgehen das Review und verbrauchen den Kontext, den die Koordination über viele Pakete braucht.
- **Gefixt wird nur, was im Plan steht.** Kein Implementierer behebt etwas nebenbei; was ihm auffällt, meldet er. Ob so ein Nebenbefund in ein späteres Paket wandert oder ins nächste Audit geht, entscheidet der Paket-Planer aus Schritt 6 — indem er es in den Plan schreibt. Bei einer Folge dieses Laufs entscheidet er nur noch, in welches Paket sie gehört, nicht ob. Einen Fix ohne Zeile im Plan gibt es trotzdem nicht.
- **Der Plan wird fortgeschrieben, bevor der nächste Schritt beginnt.** `./remediation-plan.md` ist das Übergabedokument des Laufs: ein Agent ohne jede Vorgeschichte muss ihm entnehmen können, was erledigt ist, was gerade im Arbeitsbaum liegt und was als Nächstes dran ist. Was nur du weißt, ist nach der nächsten Kompaktierung verloren. Wie das im Einzelnen aussieht, steht in `references/execution.md`.
- **Der Planer schärft den Plan, er ersetzt ihn nicht.** Freigegeben sind Zielsetzung, Paketschnitt und Reihenfolge aus Schritt 5. Wer davon im Kern abweichen will — andere Architektur, eine Entscheidung des Nutzers verworfen, der halbe Restplan neu — hält an und fragt.

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

Der Scope sind diese Findings **samt dem, was ihre Behebung nach sich zieht**. Ein Lauf, der zwölf Findings schließt und dabei fünf neue Defekte hinterlässt, hat nichts erledigt, sondern die Buchhaltung verschoben — und das nächste Audit sieht die neuen Defekte ohne Vorgeschichte und hält sie für vorbestehend. Zwei Dinge, die leicht verwechselt werden und verschieden behandelt werden:

| | Was es ist | Wohin |
| --- | --- | --- |
| **Nebenbefund** | war auch ohne diesen Lauf falsch, fiel nur auf, weil jemand hinsah | in ein Paket, wenn dieselbe Ursache — sonst ins nächste Audit |
| **Folge** | hat eine Änderung dieses Laufs verursacht | in ein Paket dieses Laufs, ausnahmslos |

Wie Folgen eingeordnet und geschnitten werden, entscheidet der Paket-Planer in Schritt 6. Er gleicht sie nicht bloß ab, er wiegt sie: bloßes Symptom einer nicht zu Ende behobenen Ursache, oder ein eigenständiges neues Issue. Der Unterschied entscheidet darüber, ob ein Paket nachgeschärft oder ein neues geschnitten wird — und er ist der Grund, warum ein Lauf zum Ende kommt, statt sich selbst Arbeit nachzulegen.

### 4. Offene Entscheidungen klären

Vor dem Plan, nicht während der Umsetzung. Gefragt wird, wo eine Entscheidung fehlt:

- die Sektion »Offene Fragen« des Reports
- Empfehlungen, die zwei gleichwertige Wege offenlassen
- Findings, die eine Produkt- oder API-Entscheidung berühren: einen Export streichen, Default-Verhalten ändern, eine Dependency austauschen
- Findings, die einander widersprechen oder deren Behebung ein anderes gegenstandslos macht
- Findings ohne belastbare Empfehlung

**Alles andere wird nicht gefragt.** Hat ein Finding eine eindeutige Empfehlung, gilt sie. Rückfragen zu Dingen, die im Audit bereits beantwortet sind, sind der schnellste Weg, eine Klärungsrunde nutzlos zu machen.

Gebündelt fragen, in einer Runde, je mit Vorschlag statt offener Frage. Die Antworten kommen mit Datum in den Plan-Abschnitt »Entscheidungen«, damit ein späterer Lauf sie nicht neu aufwirft.

### 5. Pakete, Reihenfolge, Grobplan

**Bündeln** nach gemeinsamer Ursache, nicht nach Kategorie. Drei `any`-Findings in derselben Datei sind ein Paket; drei `any`-Findings in drei Subsystemen sind drei. Obergrenze etwa fünf Findings oder eine Handvoll Dateien. Sprengt ein einzelnes Finding das schon (`strict: true` über ein gewachsenes Projekt), wird es in Teilpakete zerlegt. Ein kritischer Fix wandert nie in ein Kosmetik-Paket, sonst versteckt sich der wichtige Commit im unwichtigen.

**Reihenfolge** in fünf Phasen:

1. **Sicherungsnetz und Sichtbarkeit** — Lint, Typecheck, Testrunner, CI. Solange die Werkzeuge nicht laufen, ist jeder spätere Schritt unverifizierbar.
2. **Tests** für genau die Bereiche, die in Phase 3 und 4 umgebaut werden. Nicht flächendeckend.
3. **Korrektheit** — Bugs, Memory Leaks, Async und Races, Sicherheit. Größter Schaden, kleinster Blast Radius.
4. **Typsicherheit und Struktur** — Strictness-Stufen, Architektur, Modulgrenzen, öffentliche API. Hier entstehen die Breaking Changes.
5. **Konsistenz, DX, Doku, Dependency-Kosmetik.**

Drei Querregeln schlagen die Phasen: echte Abhängigkeiten gehen vor (verlangt ein Bugfix erst eine Umstrukturierung, kommt die Umstrukturierung zuerst); Dependency-Bumps, die APIs verändern, gehören nach vorn und nicht ans Ende; breitflächige Umformatierungen oder Renames liegen ganz vorn oder ganz hinten, nie dazwischen, weil sonst jeder folgende Diff unlesbar wird.

**Der Grobplan** wird nach `./remediation-plan.md` geschrieben, überschreibt eine vorhandene Datei und wächst über den Lauf hinweg: Schritt 5 legt Kopf, Entscheidungen und die Paketliste an, Schritt 6 füllt Paket für Paket den Detailplan nach und trägt Ergebnisse ein.

Hier wird **nicht** ausformuliert, wie ein Paket umgesetzt wird. Ein Vorgehen, das zwölf Pakete im Voraus beschreibt, ist ab dem dritten Paket zur Hälfte Fiktion — der Code darunter hat sich inzwischen bewegt, Findings sind nebenbei mit weggefallen, neue Stellen sind aufgetaucht. Was hier steht, muss reichen, damit der Nutzer Schnitt und Reihenfolge beurteilen kann. Mehr nicht.

```markdown
# Remediation-Plan — <Projektname>

Quelle: ./audit.html vom <Datum> · Branch: <name> · erstellt: <Datum>
Baseline: lint ✓ · typecheck ✓ · test 3 Fehler (vorbestehend, siehe unten) · build ✓
Scope: 24 von 31 Findings (3 critical, 8 high, 13 medium) · ausgenommen: info, acknowledged
Stand (<Datum>): Paket 1 noch nicht begonnen · Arbeitsbaum sauber

Diese Datei führt einen Lauf des Skills `js-ts-audit-remediation` und hält
seinen Stand. Wer hier weiterarbeitet: diesen Skill laden, die eingetragenen
Hashes gegen `git log --oneline` halten, beim obersten Paket ohne `[x]`
einsteigen. Statusmarken: `[ ]` offen · `[~]` Detailplan steht, Umsetzung
läuft · `[x]` erledigt · `[!]` blockiert.

## Entscheidungen
- Alten `parseConfig`-Export entfernen statt deprecaten (2026-07-26)

## Konventionen
Gelten für jede Zeile, die in diesem Lauf entsteht — Code, Kommentare,
Dokumentation, CHANGELOG, Migrations-Hinweise:
- Inline-Kommentare sind erwünscht, wo sie erklären, *warum* etwas so ist.
- Keine Finding-IDs. Sie gehören diesem einen Audit und sind danach tot. Sie
  leben in diesem Plan und in Commit-Messages, sonst nirgends.
- Kein Rückblick auf den Vorzustand: kein »früher«, kein »statt bisher«, kein
  »im Zuge des Audits umgestellt«. Der Test: Ergibt der Satz für jemanden Sinn,
  der den Vorzustand nie gesehen hat? Dann bleibt er. Braucht er ihn, gehört er
  in die Commit-Message — die Historie ist bereits konserviert.

## Vorbestehende Fehler
- `test/legacy.spec.ts` — 3 Fehler, vor Lauf-Beginn vorhanden, kein Teil des Scopes

## Pakete

### [ ] 1. WebSocket-Reconnect: Listener und Timer aufräumen
- Findings: LEAK-001 (high), LEAK-003 (high)
- Ziel: <ein Satz>
- Bereich: `src/net/`
- Hängt ab von: —
- Modell: mittlere Stufe (vorläufig)
- Hash: —
```

Der Abschnitt »Entscheidungen« ist die wichtigste Zeile im Kopf: an ihr misst der Paket-Planer später, ob eine Umplanung noch im Rahmen liegt oder eine Rückfrage braucht.

Der Abschnitt »Konventionen« steht wörtlich so in der Datei und wird projektspezifisch ergänzt, nicht ersetzt: hat das Zielprojekt eigene Regeln für Kommentare oder Doku, kommen sie darunter. Er steht im Plan und nicht im Brief, weil ihn dort jeder liest, der ohnehin den Plan öffnet — Planer, Implementierer, Reviewer —, und weil er sonst in jeden Dispatch-Prompt kopiert werden müsste. Die Trennlinie dahinter: Plan, Reports und Commit-Messages sind Artefakte dieses Laufs und dürfen seine Sprache sprechen; alles, was im Repo zurückbleibt, wird von jemandem gelesen, der weder das Audit noch diesen Lauf kennt.

Das Feld **Hängt ab von** wird ernst genommen und nicht mit der bloßen Reihenfolge verwechselt. Es benennt nur echte Zwänge — Paket 4 braucht die Modulgrenze aus Paket 2 —, denn genau daran entscheidet sich später, was umgestellt werden darf und was nicht. Steht dort nichts, ist das Paket verschiebbar.

Der Absatz mit Einstieg und Statuslegende steht wörtlich so in der Datei und wird nicht als Redundanz zum Skill-Text weggekürzt. Er ist der Grund, warum jemand die Datei einordnen kann, der sie als Erstes findet und nicht diesen Skill. Die Zeile `Stand:` wird über den ganzen Lauf hinweg fortgeschrieben, das Feld `Hash:` bleibt bis zum Commit des Pakets leer.

Ein Paket, dessen Ziel sich nicht in einem Satz sagen lässt, ist falsch geschnitten — nicht unterspezifiziert, sondern falsch geschnitten.

**Freigabe.** Der Grobplan wird vorgelegt, und zwar ausdrücklich mit Branch und Commit-Modus: »<N> Pakete, <N> Commits direkt auf `<branch>`, ohne GPG-Signatur«. Dazu ein Satz, dass jedes Paket unmittelbar vor seiner Umsetzung gegen den dann aktuellen Code detailliert wird, und dass eine Umplanung, die Zielsetzung oder Architektur berührt, zurück zum Nutzer kommt. Ebenso ein Satz zu den Folgen: zieht ein Fix anderswo etwas nach sich, wird das in diesem Lauf mit behoben, notfalls in zusätzlichen Paketen — die Paketzahl ist damit eine Untergrenze, keine Zusage. Freigegeben werden Paketschnitt und Reihenfolge. Ohne diese Freigabe beginnt die Umsetzung nicht.

Im selben Aufwasch der Verbleib des Plans, als Ansage statt als Frage: »am Ende nimmt ein Commit `./remediation-plan.md` mit ins Repo — sag Bescheid, wenn er stattdessen ungetrackt bleiben soll«. Ohne Widerspruch wird committet; widerspricht der Nutzer, steht das datiert in »Entscheidungen«, weil der Abschluss danach greift. Während des Laufs bleibt die Datei in jedem Fall ungetrackt: sie trägt die Hashes der Commits, in denen sie deshalb nicht liegen kann.

### 6. Umsetzung

Jetzt `references/execution.md` lesen. Dort stehen der Paket-Planer, das Subagenten-Briefing, Review, Verify- und Commit-Regeln, die Fehlerkette und die Wiederaufnahme.

### 7. Abschluss

Nach dem letzten Paket `references/semver-and-closeout.md` lesen. Dort stehen die Semver-Bewertung, der Umgang mit dem CHANGELOG des Zielprojekts, das Nachführen der `./audit.html`, der Abschluss-Commit und die Übergabe.

## Modellwahl

Jeder Subagent bekommt sein Modell **explizit** mitgegeben. Ohne Angabe erbt er das Modell der laufenden Session, meist das teuerste, und die ganze Abstufung ist wirkungslos.

| Stufe | Wofür |
| --- | --- |
| günstigste | Der Auftrag ist praktisch Transkription: eine Datei, benannte Stelle, nichts zu suchen. Lint-Autofix nachziehen, Magic Number in eine Konstante, `.editorconfig` anlegen, README-Abschnitt, ein fehlendes `clearInterval` an genannter Zeile. |
| mittlere | Standardfall und Untergrenze für alles, was aus Prosa arbeitet: lokaler Bugfix samt Regressionstest, Typen schärfen, ein Modul refactoren, Konfigwechsel mit Folgefehlern. |
| stärkste | Umbauten über Modulgrenzen, Concurrency und Race Conditions, Sicherheitsfixes mit Angriffsmodell, öffentliche API neu schneiden, alles mit unklarem Blast Radius. |

Im Zweifel eine Stufe höher: die Rundenzahl schlägt den Tokenpreis. Ein günstiges Modell, das dreimal so viele Runden braucht und dann scheitert, kostet mehr als das passende beim ersten Versuch.

Das Modell des Reviewers wählst du nach dem Diff, nicht nach dem Paket: ein kleiner mechanischer Diff braucht die mittlere Stufe, eine subtile Änderung an Nebenläufigkeit oder Sicherheit die stärkste.

Der **Paket-Planer** aus Schritt 6 läuft immer auf der stärksten Stufe, auch vor einem Dreizeiler-Paket. Die Stufen oben bewerten, wie schwer eine Umsetzung ist; der Planer entscheidet über Schnitt und Reihenfolge des Restplans und darüber, ob eine Folge Symptom oder eigenes Issue ist. Ein Fehlurteil dort schlägt auf jedes folgende Paket durch — und die Symptom-Frage falsch beantwortet heißt, dass der Lauf sich selbst Arbeit nachlegt.

## Prinzipien

- **Die Empfehlung gilt.** Das Audit hat den Weg bereits benannt. Ein anderer Weg braucht einen Grund, der im Detailplan oder im Report des Subagenten steht, keine stille Umdeutung.
- **Bugfix heißt Test zuerst.** Ein Paket, das einen Korrektheitsfehler behebt, schreibt zuerst den fehlschlagenden Test, sieht ihn rot, und behebt dann. Ohne rot gesehenen Test weiß niemand, ob der Test den Fehler überhaupt fangen würde. Ausgenommen sind Pakete ohne testbaren Kern: Konfiguration, Dokumentation, Dependency-Bumps, reine Formatierung. Fehlt dem Projekt jede Testinfrastruktur, ist das selbst ein Finding und gehört in Phase 1 — mitten im Bugfix wird kein Test-Harness nachgerüstet.
- **Sequenziell.** Nie zwei Implementierungs-Subagenten gleichzeitig. Sie teilen sich einen Arbeitsbaum, und der Konflikt kostet mehr als die gesparte Zeit.
- **Der Plan ist die Wahrheit, nicht die Erinnerung.** Nach einer Kontext-Kompaktierung gelten `./remediation-plan.md` und `git log`, nicht das, was du zu wissen glaubst. Die Umkehrung wiegt schwerer: was nur in deinem Kontext steht und nicht im Plan, gibt es beim nächsten Aufsetzen nicht mehr.
- **Sprache.** Antworten an den Nutzer in der Sprache seiner Anfrage. Commit-Messages in der Sprache, die `git log` des Projekts zeigt.

## Zusammenspiel mit anderen Skills

Dieser Skill funktioniert allein und setzt keine Erweiterung voraus. Sind die Superpowers-Skills installiert, gilt folgende Aufteilung, damit sich nichts doppelt:

- `js-ts-project-audit` liefert den Input und übernimmt am Ende den Folgelauf. Es fixt nie selbst, dieser Skill auditiert nie selbst. Dass hier am Ende trotzdem in die `./audit.html` geschrieben wird, ist kein Bruch dieser Linie: gebucht wird, was Reviewer-Urteil und Commit-Hash belegen, und der Score ist die Formel des Audits auf ein verändertes Backlog. Die Bewertung des Codes bleibt beim Folgelauf. Auch die Optik gehört dorthin: der Design-Pass in Schritt 7 folgt `references/report-rendering.md` des Audit-Skills, statt eigene Vorgaben zu erfinden — sonst zieht der nächste Audit-Lauf beim Neurendern alles wieder zurück.
- Fährt der Nutzer die Umsetzung ausdrücklich über `superpowers:subagent-driven-development`, gewinnt dessen Prozess für Zug 1 bis 5 von Schritt 6. Findings-Quelle, Paketschnitt, der Paket-Planer aus Zug 0, die Fortschreibung von `./remediation-plan.md`, Semver-Bewertung und Folgeaudit bleiben hier — ein fremder Umsetzungsprozess ersetzt das Briefing, nicht den Abgleich gegen den aktuellen Code und nicht das Dokument, an dem ein Dritter den Stand abliest.
- Bleibt ein Verify-Lauf nach zwei Runden unerklärlich rot, ist das ein Debugging-Problem. Dann nicht weiterraten: `superpowers:systematic-debugging`, falls vorhanden, sonst Paket blockieren und berichten.
- Wurde ausnahmsweise auf einem Feature-Branch gearbeitet, ist die Integration Sache des Nutzers. Dieser Skill pusht und merged nicht.
