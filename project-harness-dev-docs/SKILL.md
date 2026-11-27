---
name: project-harness-dev-docs
description: Use when working in a project whose dev docs form a harness for coding agents — `docs/proposals/*.md` at the core, plus `docs/adr/NNN-*.md`, `ROADMAP.md`, optionally `docs/masterplan/*.md` and `docs/architecture-guide.md` — and the task touches planning, implementation decisions or those docs. Triggers on planning or implementing a feature there (the matching proposal is the binding spec, read first), on writing or reviewing a proposal, recording a decision, updating the roadmap, code that disagrees with its proposal, introducing this structure, and on phrasings like "schreib ein Proposal für …", "leg dafür ein ADR an", "aktualisier die Roadmap", "konsolidier die Proposals", "sind die Docs noch konsistent?", "reviewe die Project-Dev-Docs", "write a proposal", "record this decision", "check the docs for drift", "review the dev docs". Covers which proposal wins a conflict, when a decision earns an ADR (only cross-domain or hard-to-reverse ones, scoped — never a template a new feature must fit), consolidating built proposals, a doctor run that checks the whole docs set against this model and fixes it, and who may change what — proposals the agent, ADRs and masterplan only after approval.
---

# Projekt-Harness: Dev-Docs

Den Kern bilden die Proposals: sie sind die verbindliche Spezifikation, aus der Coding Agents Umsetzungspläne ableiten und an der sie Entscheidungen messen. Um sie herum liegen die ADR als Archiv der Architekturentscheidungen — sie sagt, warum etwas so ist, nicht was gilt —, die Roadmap als Navigation durch das Offene, und optional ein Masterplan für die Richtung und ein Architektur-Guide als Landkarte des Gebauten. Keins davon steht für sich; wer nur eins liest, plant an den anderen vorbei.

## Die Dokumente

| Dokument | Pfad | Inhalt | Wer ändert |
| --- | --- | --- | --- |
| **Proposals** — Kern | `docs/proposals/*.md`, Index in `docs/proposals/README.md` | **Verbindliche Spezifikation** je Feature oder Domain: was gilt (Ist) und was gelten soll (Soll). Der Index nennt die Zuständigkeit jedes Proposals, sein Kürzel und die Vorrangregel. | Der Agent darf anlegen und ändern — transparent. Zuständigkeiten und Vorrangregel: Team/User. |
| ADR | `docs/adr/NNN-<titel>.md`, Index in `docs/adr/README.md` | **Archiv** der Architekturentscheidungen — nur der domainübergreifenden oder teuer umkehrbaren: warum es so ist, welche Alternativen verworfen wurden, was vorher galt. Jede nennt ihren Geltungsbereich. Kein Spec. Eine Datei je Entscheidung, fortlaufend nummeriert. | Team/User. Der Agent entwirft, geschrieben wird nach Freigabe. |
| Roadmap | `ROADMAP.md` | Navigationsinstrument für das Offene: jeder offene Punkt eines Proposals als Eintrag mit Verweis darauf, nach Terminen oder Abhängigkeiten geordnet; dazu die offenen Entscheidungen. Kein Spec. | Fortschritt: der Agent. Neue Stränge, Reihenfolge, Termine, Prioritäten: Team/User. |
| Masterplan — optional | `docs/masterplan/*.md` | Vision, Ziele, Nicht-Ziele, Leitplanken. High level, ohne Feature-Details und ohne Umsetzungsstand. Fehlt er, fehlt nichts Verbindliches. | Team/User. Der Agent schlägt vor. |
| Architektur-Guide — optional | `docs/architecture-guide.md` | Landkarte des Gebauten: Schichten, Datenfluss, Einstiegspunkte, öffentliche Oberfläche, eingeschwungene Verträge — jeweils mit Verweis auf das zuständige Proposal. Kein Spec; bei Widerspruch gilt das Proposal. | Der Agent führt ihn dem gebauten Stand nach — transparent. |

Keine Ebene ist unveränderlich. Anforderungen ändern sich, Erkenntnisse kommen hinzu, Prioritäten verschieben sich; die Docs sollen den aktuellen Stand spiegeln, nicht den ersten Entwurf konservieren. Die Frage ist nie, *ob* sich etwas ändern darf, sondern *wer* es ändert — das regelt Schritt 6.

Hat ein Projekt eigene Konventionen für diese Dateien (andere Pfade, Überschriften, Status-Werte, ein Index an anderer Stelle, eine Routing-Tabelle im `CLAUDE.md`), gelten die des Projekts. Bestehende Docs werden nicht auf die Vorlagen dieses Skills umformatiert.

### Gegenwart in den Proposals

Ein Proposal sagt, was gilt — und, wo es zum Verständnis nötig ist, in einem Satz warum. Wie es dazu kam, steht nicht darin. Historie und Code-Archäologie gehören nirgendwohin, git trägt sie — außer sie begründet eine Architekturentscheidung, dann steht sie in deren ADR:

- **Historie:** erster Entwurf, »Präzisierungen gegenüber …«, verworfene Alternativen, Änderungstabellen, Meilensteine, Testpläne, »früher«, »bisher«, »entfällt«, »ersetzt«.
- **Code-Archäologie:** Beschreibungen von Code, den es nicht mehr gibt — alte Funktionsnamen, entfernte Caches, frühere Datenformate, Commit-Hashes, »bis Commit X galt …«.

Solange ein Proposal nicht gebaut ist, darf es Alternativen und Planungsteile tragen; sie sind dann Teil der Spezifikationsarbeit. Beim Konsolidieren gehen sie raus. Dieselbe Regel gilt für den Architektur-Guide.

### Was eine ADR bindet — und was nicht

Was gilt, steht im Proposal (konkret) oder als Leitplanke im Masterplan (allgemein). Die ADR erklärt, warum. Sie ist Archiv, keine Schablone: Ein neues Feature muss nicht in ein Muster passen, nur weil eine ADR es einmal begründet hat.

- **Schwelle.** Eine ADR entsteht nur für eine Entscheidung, die Domains übergreift (Vertrag oder Schnittstelle zwischen Domains, ein Muster, das mehrere teilen) oder teuer umkehrbar ist (Runtime-Abhängigkeit, Persistenz und Datenformate, Prozess- und Thread-Grenzen, Build- und Deploy-Modell). Alles andere ist eine Domain-Entscheidung: Ergebnis plus ein Satz warum in §3 des Proposals, die Alternativen trägt nach dem Konsolidieren git. Im Zweifel ist es eine Domain-Entscheidung. Allgemeine Ziele und Leitplanken sind Masterplan-Stoff; eine ADR darf eine Leitplanke begründen, aber keine ersetzen.
- **Geltungsbereich, eng gelesen.** Jede ADR nennt im Kopf, wofür sie gilt (`Gilt für`). Sie bindet die Entscheidung, die sie trifft, in diesem Bereich — nicht die Muster, die sich daraus ableiten ließen, und nichts außerhalb. Fehlt die Angabe (ältere ADRs), gilt ihr `Bezug` als Geltungsbereich.
- **Kein Schablonenzwang.** Passt ein Feature in kein bestehendes Muster, ist das kein Widerspruch zur ADR dieses Musters, sondern eine neue Entscheidung. Der Agent benennt, wo es nicht passt, und schlägt die Alternative vor: unter der Schwelle transparent im Proposal, darüber als ADR-Entwurf. Den Konflikt zu meiden, indem man das Feature ins Muster biegt, ist der Fehler, den diese Regel verhindern soll. Der Gedanke »passt nicht ganz, aber ADR-NNN legt das Muster fest« ist das Signal, anzuhalten.

### Lebenszyklus eines Proposals

| Status | Bedeutung | Wer setzt ihn |
| --- | --- | --- |
| `Pre-Proposal` | Absichtserklärung, kein Spec. Nennt die Entscheidungen, die vor einem Spec fallen müssen. Steht im Index, aber nicht in der Vorrangregel. | Agent oder Team |
| `Entwurf` | Spec in Arbeit, noch nicht verbindlich. | Agent oder Team |
| `spezifiziert` | Verbindlicher Spec, nicht gebaut. | Team/User |
| `in Umsetzung` | Teile gebaut; welche, sagt der Status-Satz. | Agent |
| `gebaut` | Beschreibt den gebauten Stand, frei von Historie. Jeder offene Punkt ist in der Roadmap referenziert. | Agent, nach dem Konsolidieren |
| `verworfen` | Bleibt als Begründung liegen, gilt nicht. Der Grund steht im Status-Satz. | Team/User |

Der Status steht an **genau einer** Stelle: im Kopf des Proposals. Index, Masterplan, Guide und `CLAUDE.md` verweisen auf das Proposal, statt den Status zu wiederholen — jede Kopie driftet.

**Analysen und bedingte Vorhaben** (Performance, Migration, Skalierung) sind keine eigene Dokumentart, sondern Proposals, deren Soll an Bedingungen hängt. Jede Bedingung ist prüfbar formuliert (»ein Board mit 10⁴ Nodes ist profiliert«, nicht »wenn es nötig wird«), jedes Vorhaben hat einen Roadmap-Eintrag mit dieser Bedingung als *Wenn*. »Nicht nötig« ist ein gültiges Ergebnis und wird als Gegenwart festgehalten, die Messung dahinter als ein Satz im Proposal (Datum, Messgröße, Ergebnis).

### Spec-Anhänge

Maschinenlesbare Specs und Diagramme (JSON Schema, OpenAPI, SVG, Beispiel-Payloads) gehören zu dem Proposal, das sie referenziert. Sie liegen unter `docs/proposals/` oder `docs/` neben ihm, folgen denselben Änderungsrechten und ändern sich im selben Commit wie der Abschnitt, der sie beschreibt. Ein Anhang, den kein Proposal referenziert, ist verwaist; ein Anhang, der dem Proposal widerspricht, ist ein Spec-Bug — das Proposal gilt, der Anhang wird nachgezogen.

### Nachbardokumente

Neben diesen Dokumenten liegen Dateien, die das Harness berühren, ohne dazuzugehören:

- **`CLAUDE.md` / `AGENTS.md`** — Einstieg für Agents, immer im Kontext und deshalb teuer. Eine Invariante steht dort als eine Zeile mit Verweis (Proposal-Abschnitt oder ADR-Nummer); die Begründung lebt am Ziel.
- **Arbeitsablagen** (`docs/superpowers/`, `docs/plans/`, Notizen eines Laufs) — Zwischenstände, kein Spec. Nach dem Lauf wandert Tragendes ins zuständige Proposal, Gründe von Architekturentscheidungen als Entwurf in die ADR, die Ablage wird gelöscht. Nichts verlinkt dorthin. Löschen darf der Agent, sobald Tragendes übertragen ist und nichts mehr auf die Ablage verweist — git hält sie. Der Drift-Check meldet sie nur.
- **Audit- und Remediation-Artefakte** — spiegeln den Implementierungsstand, sind keine Quelle für Architekturentscheidungen.

## Workflow

### 1. Orientierung

Feststellen, welche Dokumente existieren und ob das Projekt eine eigene Routing-Tabelle führt (meist im `CLAUDE.md`). Dann gezielt lesen, nicht alles:

- Proposal-Index (`docs/proposals/README.md` oder die Projektentsprechung) — welches Proposal für die Aufgabe zuständig ist. Ohne Index: Dateiname und Kopf der Proposals.
- Die zuständigen Proposals. **Große Dateien gliederungsweise:** erst die Überschriften (`grep -n '^#' <datei>`), dann die betroffenen Abschnitte. Ein Proposal mit 2000 Zeilen wird nicht am Stück gelesen.
- `ROADMAP.md` — was ist offen, was ist als Nächstes dran, welche Entscheidungen stehen aus.
- `docs/adr/` — nur bei Bedarf: wenn der Plan eine Stelle ändert, an der das Proposal auf eine ADR verweist, oder wenn er eine Abhängigkeit, einen Vertrag zwischen Domains oder ein domainübergreifendes Muster berührt. Dann nach den Begriffen der Aufgabe durchsuchen (`grep -ril '<begriff>' docs/adr`) und die Treffer samt Status und Geltungsbereich lesen. Eine abgelöste ADR gilt nicht mehr, ihre Nachfolgerin schon.
- Falls vorhanden: Architektur-Guide, wenn die Aufgabe mehrere Schichten berührt oder Einstiegspunkte gesucht sind; Masterplan, wenn die Aufgabe die Richtung des Projekts berührt.

Fehlt die Struktur ganz und will der User sie einführen: weiter mit »Struktur einführen« am Ende.

### 2. Vom Proposal zum Plan

Das zuständige Proposal ist die Grundlage jedes Implementierungs- oder Umsetzungsplans. Der Plan leitet sich aus dem Soll ab und nennt die Abschnitte, auf denen er fußt (`docs/proposals/rendering.md` §3.2).

- **Kein passendes Proposal.** Bugfix oder Refactoring ohne Verhaltensänderung brauchen keins. Was ein Nutzer, eine API oder eine andere Domain danach anders erlebt als vorher, braucht ein Soll: erst das Domain-Proposal erweitern oder ein neues als `Entwurf` anlegen, dann planen. Hat das Projekt keine eigene Form für Proposals oder ADRs, stehen Vorlagen in `references/templates.md`.
- **Nur ein Pre-Proposal.** Es ist kein Spec. Erst die dort genannten Entscheidungen klären, dann einen Spec schreiben, dann planen.
- **Entwurf statt spezifiziert.** Planen ist erlaubt; der Plan nennt, dass er auf einem nicht freigegebenen Spec steht.

### 3. Spec und Code

Das Proposal ist die Norm, nicht das aktuelle Code-Verhalten. Beim Erweitern gilt das Proposal. Weichen Code und Proposal voneinander ab, wird die Abweichung eingeordnet, bevor irgendetwas angepasst wird:

- **Bug im Code** — der Code verfehlt, was das Soll klar verlangt. Den Code korrigieren oder die Abweichung melden, wenn sie außerhalb der Aufgabe liegt.
- **Präzisierung** — der Code ist genauer als der Spec, folgt aber erkennbar dessen Absicht (eine Kante, die der Spec offen ließ, ein Grenzwert, eine Reihenfolge). Das Proposal nachziehen — als Aussage über das, was gilt, nicht als »präzisiert gegenüber …« — und es melden.
- **Gegenentwurf** — der Code tut etwas anderes, als das Soll will. Nicht auflösen: beide Stellen benennen, fragen.

Im Zweifel ist es ein Gegenentwurf. Das Soll wird nie an die Umsetzung angepasst, um eine Lücke zu verdecken.

Wer das Ist eines Proposals nachzieht, sucht Präzisierungen aktiv, statt nur Widersprüche zu melden: Wie verhält sich der Code in Fällen, die der Spec nicht regelt — leere Eingabe, Grenzwerte, Defaults, Fehlerpfade? Was davon der Absicht des Specs folgt, wird nachgezogen.

### 4. Widersprüche zwischen Dokumenten

**Zwischen Proposals entscheidet die Zuständigkeit, nicht das Alter.** Für eine strittige Aussage gilt das Proposal, in dessen Domain sie fällt; so steht es im Index. Berühren sich zwei Domains echt, gilt die Vorrangregel des Index. Ein Proposal, das eine Aussage eines anderen ersetzt, benennt das, und das ersetzte trägt an der Stelle einen Rückverweis — stillschweigendes Überholen ist ein Spec-Bug. Fehlt ein Proposal im Index oder in der Vorrangregel, ist der Konflikt undefiniert: fragen, und den Index-Nachtrag vorschlagen.

**Ist eine Seite ADR, Masterplan oder ein Roadmap-Meilenstein,** gewinnt keine Seite automatisch — vielleicht ist gerade die ältere Entscheidung überholt. Ein Widerspruch zu einer ADR liegt nur vor, wenn der Plan in ihrem Geltungsbereich ihre Entscheidung umkehrt; ein Feature, das ihr Muster nicht nutzt, ist keiner (»Was eine ADR bindet«). Liegt einer vor, entscheidet der Agent ihn nicht allein:

1. Den Widerspruch benennen: beide Stellen mit Pfad und Abschnitt, je ein Satz, was sie sagen.
2. Einen Vorschlag machen: welche Seite angepasst werden sollte und warum.
3. Fragen und die Antwort abwarten, bevor Code entsteht, der vollendete Tatsachen schafft.

**Guide gegen Proposal:** Das Proposal gilt, der Guide wird nachgezogen.

### 5. Während und nach der Umsetzung

- **Proposal:** Umgesetztes wandert vom Soll ins Ist, der Status-Satz nennt, was steht. Was noch offen ist, bleibt im Soll oder im Abschnitt »Was offen bleibt«.
- **Roadmap:** Erledigtes abhaken. Jeder offene Punkt eines Proposals hat einen Roadmap-Eintrag, der auf ihn verweist (Dokument und Abschnitt); entsteht unterwegs ein neuer offener Punkt, bekommt er seinen Eintrag gleich mit.
- **Guide (falls vorhanden):** neue Schicht, neuer Einstiegspunkt, geänderte öffentliche Oberfläche nachziehen.
- **Entscheidungen unterwegs:** Fällt eine Entscheidung mit echten Alternativen, kommt das Ergebnis samt einem Satz warum ins Proposal (§3) — transparent wie jede Proposal-Änderung. Liegt sie über der ADR-Schwelle (»Was eine ADR bindet«), geht der Grund samt Alternativen zusätzlich als ADR-Entwurf zum User; dann weder stillschweigend weiterbauen noch stillschweigend eintragen.
- **Alles gebaut:** Konsolidieren anbieten (siehe unten), nicht ungefragt starten.

### 6. Änderungsrechte

**Proposals und Guide — der Agent darf, transparent.** Proposals anlegen, erweitern, Ist nachführen, Präzisierungen nachziehen, Status nach der Tabelle oben setzen; den Guide dem gebauten Stand nachführen; neue Proposals samt neuem Kürzel in den Index eintragen. Transparent heißt: jede Änderung steht in der Antwort an den User (Datei, Abschnitt, was sich verschoben hat, warum), und wird sie mit Code committet, nennt die Commit-Message sie.

**ADR, Masterplan, Zuständigkeiten und Vorrangregel — nur nach Abstimmung.** Signifikant ist jede Änderung, die Bedeutung verschiebt: eine Entscheidung, ihre Begründung, ihr Status, ihr Geltungsbereich, ein Ziel, eine Leitplanke, die Domain eines bestehenden Proposals, seine Stellung in der Vorrangregel; ebenso jede neue ADR und jeder neue Masterplan-Abschnitt. Ablauf: Entwurf als Text in der Konversation (Diff oder neuer Abschnitt), Freigabe abwarten, dann schreiben. Mehrere Entwürfe dürfen gebündelt zur Freigabe vorgelegt werden. Ein »passt, trag ein« zu einem konkreten Entwurf ist eine Freigabe; ein allgemeines »kümmer dich um die Docs« oder »räum auf« deckt diese Dokumente nicht.

Ohne Rückfrage erlaubt, aber in der Antwort genannt: Tippfehler, kaputte Links, Formatierung, Querverweise nach dem Umbenennen einer Datei.

**ROADMAP.md — geteilt.** Abhaken, Erledigtes beim nächsten Durchgang streichen, Hinfälliges mit Grund entfernen, offene Punkte aus einem Proposal als Einträge referenzieren: der Agent. Neue Stränge, Umsortieren, Termine, Prioritäten: nur nach Abstimmung.

**ADR-Historie bleibt lesbar.** Eine Entscheidung wird nicht überschrieben. Ändert sie sich, entsteht eine neue ADR mit `löst ab: ADR-NNN`, die alte bekommt den Status `abgelöst durch ADR-NNN` und bleibt sonst unverändert. Liegt sie unter der Schwelle oder ist sie eine Leitplanke, wird sie ins zuständige Proposal bzw. den Masterplan abgelöst: Status `abgelöst durch <datei>.md §N.M`, sonst unverändert. Die nächste Nummer ist die höchste vorhandene plus eins; Nummern werden nie neu vergeben, Dateien nie umbenannt oder gelöscht — auch eine verworfene ADR bleibt liegen.

### 7. Verweise

Docs und Code verweisen auf stabile Stellen: Dokument **und** nummerierter Abschnitt (`docs/proposals/auth.md` §4.1), ab der zweiten Nennung in derselben Datei kurz (`auth.md` §4.1), oder ADR-Nummer (`ADR-012`). Eine nackte Abschnittsnummer ohne Dokument ist mehrdeutig, sobald es mehr als ein Proposal gibt. **Keine stabilen Stellen** sind Roadmap-Nummern und die Nummern der Tabelle offener Entscheidungen: sie gelten nur innerhalb der Roadmap, ändern sich beim nächsten Durchgang und stehen deshalb nie in Code, Tests, Proposals oder ADRs. Proposals nummerieren ihre Abschnitte deshalb, und diese Nummern bleiben stabil — auch beim Konsolidieren. Wer doch umnummeriert oder eine Datei umbenennt, zieht vorher alle Verweise darauf mit (`grep -rn "<datei>.md" docs src tests` o. ä.; gibt es ein Kürzel, ein zweites Mal danach).

**Kürzel.** Ein Projekt darf seinen Proposals Kürzel geben (`MS` für `mood-sketcher.md`), damit dichte Querverweise lesbar bleiben. Dann gilt:

- **Eine Definition.** Ein Kürzel steht an genau einer Stelle: in der Spalte »Kürzel« des Proposal-Index. Kürzel-Köpfe in einzelnen Dateien (»Verweise auf … tragen den Zusatz (MS)«) sind Kopien; sie entfallen beim nächsten Anfassen der Datei, nicht im Sammellauf.
- **Eins zu eins und unveränderlich.** Jedes Proposal hat höchstens ein Kürzel, jedes Kürzel steht für genau ein Proposal. Vergeben wird es mit der Index-Zeile beim Anlegen; danach wird es nie geändert und nie neu vergeben, auch nicht nach `verworfen` — sonst zeigen alte Verweise still auf etwas anderes.
- **Eine Schreibweise.** `MS §5.3` für einen Abschnitt, `MS` allein für das ganze Dokument. Nachgestellte Formen (`§5.3 MS`) und Klammerformen mitten im Satz werden beim Anfassen vereinheitlicht.
- **Nur in den Docs.** Kürzel stehen in `docs/` und `ROADMAP.md`. Code, Tests und Commit-Messages schreiben den Dateinamen — wer Code liest, sucht nach Dateinamen, nicht in einem Register.

## Konsolidieren und Drift-Check

Auslöser: der User will gebaute Proposals aufräumen (»räum die Proposals auf«, »konsolidier …«), Docs auf Konsistenz prüfen lassen (»sind die Docs noch konsistent?«), oder nimmt das Angebot aus Schritt 5 an. Dann `references/consolidate.md` lesen und dem Ablauf dort folgen.

Konsolidieren heißt: das Proposal bleibt, wo es ist, und wird zur reinen Gegenwart. Historie und Code-Archäologie raus — Gründe über der ADR-Schwelle als ADR-Entwurf, Domain-Entscheidungen als ein Satz in §3, der Rest ersatzlos. Jeder offene Punkt bekommt seinen Roadmap-Eintrag. Ein gebautes Proposal wandert nicht in einen Masterplan; Code und andere Proposals verweisen auf seine Abschnitte.

## Doctor

Auslöser: Der User will die Dev-Docs als Ganzes prüfen und in Ordnung bringen lassen (»reviewe die Project-Dev-Docs«, »prüf die Docs gegen den Skill«, »mach einen Doctor-Lauf«), auch nach einer Änderung an diesem Skill. Dann `references/doctor.md` lesen und dem Ablauf dort folgen. Eine reine Konsistenzfrage (»sind die Docs noch konsistent?«) bleibt beim Drift-Check und ändert nichts.

Kern: Drift-Check plus Abgleich mit dem Modell dieses Skills, eine Befundliste, die eigenen Fixes direkt, alle Entwürfe für ADR, Masterplan und Agent-Einstieg gebündelt in einer Freigaberunde. ADRs unter der Schwelle werden ins Proposal abgelöst, nicht gelöscht.

## Struktur einführen

Auslöser: der User will die Struktur in einem Projekt einführen, das sie nicht oder nur teilweise hat (»führe die Struktur ein«, »set up the dev docs«). Dann `references/introduce.md` lesen und dem Ablauf dort folgen.

Kern: vorhandene Docs werden zugeordnet, nicht ungefragt umgezogen; der Domain-Schnitt ist ein Vorschlag zur Freigabe; ein Lauf legt das Gerüst und höchstens ein Proposal an, die übrigen entstehen, wenn ihre Domain berührt wird.
