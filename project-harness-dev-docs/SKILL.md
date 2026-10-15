---
name: project-harness-dev-docs
description: Use when working in a project whose development docs form a harness for coding agents — at its core `docs/proposals/*.md`, alongside `docs/adr/NNN-*.md` (one file per decision) and `ROADMAP.md`, optionally `docs/masterplan/*.md` and `docs/architecture-guide.md` — and the task touches planning, implementation decisions or those documents. Triggers on planning or implementing a feature in such a project (the matching proposal is the binding spec and is read first), on writing, updating or reviewing a proposal, on recording an architecture decision, on checking or updating the roadmap, on code that disagrees with its proposal, and on phrasings like "schreib ein Proposal für …", "leg dafür ein ADR an", "aktualisier die Roadmap", "räum die Proposals auf", "konsolidier die gebauten Proposals", "sind die Docs noch konsistent?", "write a proposal", "record this decision", "clean up the docs", "check the docs for drift". Also when the user wants this docs structure introduced into a project that does not have it yet. Defines what each document holds, which proposal wins a conflict, how a built proposal is consolidated (history out, into the ADR; open points referenced from the roadmap), and who may change what: agents may create and edit proposals transparently, while significant changes to ADRs, masterplan, precedence rules or roadmap milestones need the team's or user's approval first.
---

# Projekt-Harness: Dev-Docs

Den Kern bilden die Proposals: sie sind die verbindliche Spezifikation, aus der Coding Agents Umsetzungspläne ableiten und an der sie Entscheidungen messen. Um sie herum liegen die ADR als einziger Ort für Historie und Entscheidungsgründe, die Roadmap als Navigation durch das Offene, und optional ein Masterplan für die Richtung und ein Architektur-Guide als Landkarte des Gebauten. Keins davon steht für sich; wer nur eins liest, plant an den anderen vorbei.

## Die Dokumente

| Dokument | Pfad | Inhalt | Wer ändert |
| --- | --- | --- | --- |
| **Proposals** — Kern | `docs/proposals/*.md`, Index in `docs/proposals/README.md` | **Verbindliche Spezifikation** je Feature oder Domain: was gilt (Ist) und was gelten soll (Soll). Der Index nennt die Zuständigkeit jedes Proposals und die Vorrangregel. | Der Agent darf anlegen und ändern — transparent. Zuständigkeiten und Vorrangregel: Team/User. |
| ADR | `docs/adr/NNN-<titel>.md`, Index in `docs/adr/README.md` | Architekturentscheidungen samt ihrer **Historie**: was vorher galt, welche Alternativen verworfen wurden, warum es sich änderte. Eine Datei je Entscheidung, fortlaufend nummeriert. | Team/User. Der Agent entwirft, geschrieben wird nach Freigabe. |
| Roadmap | `ROADMAP.md` | Navigationsinstrument für das Offene: jeder offene Punkt eines Proposals als Eintrag mit Verweis darauf, nach Terminen oder Abhängigkeiten geordnet; dazu die offenen Entscheidungen. Kein Spec. | Fortschritt: der Agent. Neue Stränge, Reihenfolge, Termine, Prioritäten: Team/User. |
| Masterplan — optional | `docs/masterplan/*.md` | Vision, Ziele, Nicht-Ziele, Leitplanken. High level, ohne Feature-Details und ohne Umsetzungsstand. Fehlt er, fehlt nichts Verbindliches. | Team/User. Der Agent schlägt vor. |
| Architektur-Guide — optional | `docs/architecture-guide.md` | Landkarte des Gebauten: Schichten, Datenfluss, Einstiegspunkte, öffentliche Oberfläche, eingeschwungene Verträge — jeweils mit Verweis auf das zuständige Proposal. Kein Spec; bei Widerspruch gilt das Proposal. | Der Agent führt ihn dem gebauten Stand nach — transparent. |

Keine Ebene ist unveränderlich. Anforderungen ändern sich, Erkenntnisse kommen hinzu, Prioritäten verschieben sich; die Docs sollen den aktuellen Stand spiegeln, nicht den ersten Entwurf konservieren. Die Frage ist nie, *ob* sich etwas ändern darf, sondern *wer* es ändert — das regelt Schritt 6.

Hat ein Projekt eigene Konventionen für diese Dateien (andere Pfade, Überschriften, Status-Werte, ein Index an anderer Stelle, eine Routing-Tabelle im `CLAUDE.md`), gelten die des Projekts. Bestehende Docs werden nicht auf die Vorlagen dieses Skills umformatiert.

### Gegenwart in den Proposals, Historie in der ADR

Ein Proposal sagt, was gilt — und, wo es zum Verständnis nötig ist, in einem Satz warum. Wie es dazu kam, steht nicht darin. Historie und Code-Archäologie gehören in die ADR oder nirgendwohin (git trägt den Rest):

- **Historie:** erster Entwurf, »Präzisierungen gegenüber …«, verworfene Alternativen, Änderungstabellen, Meilensteine, Testpläne, »früher«, »bisher«, »entfällt«, »ersetzt«.
- **Code-Archäologie:** Beschreibungen von Code, den es nicht mehr gibt — alte Funktionsnamen, entfernte Caches, frühere Datenformate, Commit-Hashes, »bis Commit X galt …«.

Solange ein Proposal nicht gebaut ist, darf es Alternativen und Planungsteile tragen; sie sind dann Teil der Spezifikationsarbeit. Beim Konsolidieren gehen sie raus. Dieselbe Regel gilt für den Architektur-Guide.

### Lebenszyklus eines Proposals

| Status | Bedeutung | Wer setzt ihn |
| --- | --- | --- |
| `Pre-Proposal` | Absichtserklärung, kein Spec. Nennt die Entscheidungen, die vor einem Spec fallen müssen. Steht im Index, aber nicht in der Vorrangregel. | Agent oder Team |
| `Entwurf` | Spec in Arbeit, noch nicht verbindlich. | Agent oder Team |
| `spezifiziert` | Verbindlicher Spec, nicht gebaut. | Team/User |
| `in Umsetzung` | Teile gebaut; welche, sagt der Status-Satz. | Agent |
| `gebaut` | Beschreibt den gebauten Stand, frei von Historie. Jeder offene Punkt ist in der Roadmap referenziert. | Agent, nach dem Konsolidieren |
| `verworfen` | Bleibt als Begründung liegen, gilt nicht. Der Grund steht in der ADR. | Team/User |

Der Status steht an **genau einer** Stelle: im Kopf des Proposals. Index, Masterplan, Guide und `CLAUDE.md` verweisen auf das Proposal, statt den Status zu wiederholen — jede Kopie driftet.

### Nachbardokumente

Neben diesen Dokumenten liegen Dateien, die das Harness berühren, ohne dazuzugehören:

- **`CLAUDE.md` / `AGENTS.md`** — Einstieg für Agents, immer im Kontext und deshalb teuer. Eine Invariante steht dort als eine Zeile mit Verweis (Proposal-Abschnitt oder ADR-Nummer); die Begründung lebt am Ziel.
- **Arbeitsablagen** (`docs/superpowers/`, `docs/plans/`, Notizen eines Laufs) — Zwischenstände, kein Spec. Nach dem Lauf wandert Tragendes ins zuständige Proposal, Entscheidungsgründe als Entwurf in die ADR, die Ablage wird gelöscht. Nichts verlinkt dorthin.
- **Audit- und Remediation-Artefakte** — spiegeln den Implementierungsstand, sind keine Quelle für Architekturentscheidungen.

## Workflow

### 1. Orientierung

Feststellen, welche Dokumente existieren und ob das Projekt eine eigene Routing-Tabelle führt (meist im `CLAUDE.md`). Dann gezielt lesen, nicht alles:

- Proposal-Index (`docs/proposals/README.md` oder die Projektentsprechung) — welches Proposal für die Aufgabe zuständig ist. Ohne Index: Dateiname und Kopf der Proposals.
- Die zuständigen Proposals. **Große Dateien gliederungsweise:** erst die Überschriften (`grep -n '^#' <datei>`), dann die betroffenen Abschnitte. Ein Proposal mit 2000 Zeilen wird nicht am Stück gelesen.
- `ROADMAP.md` — was ist offen, was ist als Nächstes dran, welche Entscheidungen stehen aus.
- `docs/adr/` — Index und Dateinamen überfliegen, dann nach den Begriffen der Aufgabe durchsuchen (`grep -ril '<begriff>' docs/adr`) und die Treffer samt Status lesen. Eine abgelöste ADR gilt nicht mehr, ihre Nachfolgerin schon.
- Falls vorhanden: Architektur-Guide, wenn die Aufgabe mehrere Schichten berührt oder Einstiegspunkte gesucht sind; Masterplan, wenn die Aufgabe die Richtung des Projekts berührt.

Fehlt die Struktur ganz und will der User sie einführen: weiter mit »Struktur einführen« am Ende.

### 2. Vom Proposal zum Plan

Das zuständige Proposal ist die Grundlage jedes Implementierungs- oder Umsetzungsplans. Der Plan leitet sich aus dem Soll ab und nennt die Abschnitte, auf denen er fußt (`docs/proposals/rendering.md` §3.2).

- **Kein passendes Proposal.** Bugfix oder Refactoring ohne Verhaltensänderung brauchen keins. Was ein Nutzer, eine API oder eine andere Domain danach anders erlebt als vorher, braucht ein Soll: erst das Domain-Proposal erweitern oder ein neues als `Entwurf` anlegen, dann planen.
- **Nur ein Pre-Proposal.** Es ist kein Spec. Erst die dort genannten Entscheidungen klären, dann einen Spec schreiben, dann planen.
- **Entwurf statt spezifiziert.** Planen ist erlaubt; der Plan nennt, dass er auf einem nicht freigegebenen Spec steht.

### 3. Spec und Code

Das Proposal ist die Norm, nicht das aktuelle Code-Verhalten. Beim Erweitern gilt das Proposal. Weichen Code und Proposal voneinander ab, wird die Abweichung eingeordnet, bevor irgendetwas angepasst wird:

- **Bug im Code** — der Code verfehlt, was das Soll klar verlangt. Den Code korrigieren oder die Abweichung melden, wenn sie außerhalb der Aufgabe liegt.
- **Präzisierung** — der Code ist genauer als der Spec, folgt aber erkennbar dessen Absicht (eine Kante, die der Spec offen ließ, ein Grenzwert, eine Reihenfolge). Das Proposal nachziehen — als Aussage über das, was gilt, nicht als »präzisiert gegenüber …« — und es melden.
- **Gegenentwurf** — der Code tut etwas anderes, als das Soll will. Nicht auflösen: beide Stellen benennen, fragen.

Im Zweifel ist es ein Gegenentwurf. Das Soll wird nie an die Umsetzung angepasst, um eine Lücke zu verdecken.

### 4. Widersprüche zwischen Dokumenten

**Zwischen Proposals entscheidet die Zuständigkeit, nicht das Alter.** Für eine strittige Aussage gilt das Proposal, in dessen Domain sie fällt; so steht es im Index. Berühren sich zwei Domains echt, gilt die Vorrangregel des Index. Ein Proposal, das eine Aussage eines anderen ersetzt, benennt das, und das ersetzte trägt an der Stelle einen Rückverweis — stillschweigendes Überholen ist ein Spec-Bug. Fehlt ein Proposal im Index oder in der Vorrangregel, ist der Konflikt undefiniert: fragen, und den Index-Nachtrag vorschlagen.

**Ist eine Seite ADR, Masterplan oder ein Roadmap-Meilenstein,** gewinnt keine Seite automatisch — vielleicht ist gerade die ältere Entscheidung überholt. Der Agent entscheidet den Konflikt trotzdem nicht allein:

1. Den Widerspruch benennen: beide Stellen mit Pfad und Abschnitt, je ein Satz, was sie sagen.
2. Einen Vorschlag machen: welche Seite angepasst werden sollte und warum.
3. Fragen und die Antwort abwarten, bevor Code entsteht, der vollendete Tatsachen schafft.

**Guide gegen Proposal:** Das Proposal gilt, der Guide wird nachgezogen.

### 5. Während und nach der Umsetzung

- **Proposal:** Umgesetztes wandert vom Soll ins Ist, der Status-Satz nennt, was steht. Was noch offen ist, bleibt im Soll oder im Abschnitt »Was offen bleibt«.
- **Roadmap:** Erledigtes abhaken. Jeder offene Punkt eines Proposals hat einen Roadmap-Eintrag, der auf ihn verweist (Dokument und Abschnitt); entsteht unterwegs ein neuer offener Punkt, bekommt er seinen Eintrag gleich mit.
- **Guide (falls vorhanden):** neue Schicht, neuer Einstiegspunkt, geänderte öffentliche Oberfläche nachziehen.
- **Entscheidungen unterwegs:** Fällt eine Entscheidung mit echten Alternativen — neue Abhängigkeit, neues Pattern, Abkehr von einem bestehenden, neue Schnittstelle zwischen Domains, oder eine Domain-Entscheidung, deren Begründung später jemand suchen wird —, kommt das Ergebnis ins Proposal und der Grund samt Alternativen als ADR-Entwurf zum User. Weder stillschweigend weiterbauen noch stillschweigend eintragen.
- **Alles gebaut:** Konsolidieren anbieten (siehe unten), nicht ungefragt starten.

### 6. Änderungsrechte

**Proposals und Guide — der Agent darf, transparent.** Proposals anlegen, erweitern, Ist nachführen, Präzisierungen nachziehen, Status nach der Tabelle oben setzen; den Guide dem gebauten Stand nachführen; neue Proposals in den Index eintragen. Transparent heißt: jede Änderung steht in der Antwort an den User (Datei, Abschnitt, was sich verschoben hat, warum), und wird sie mit Code committet, nennt die Commit-Message sie.

**ADR, Masterplan, Zuständigkeiten und Vorrangregel — nur nach Abstimmung.** Signifikant ist jede Änderung, die Bedeutung verschiebt: eine Entscheidung, ihre Begründung, ihr Status, ihr Geltungsbereich, ein Ziel, eine Leitplanke, die Domain eines bestehenden Proposals, seine Stellung in der Vorrangregel; ebenso jede neue ADR und jeder neue Masterplan-Abschnitt. Ablauf: Entwurf als Text in der Konversation (Diff oder neuer Abschnitt), Freigabe abwarten, dann schreiben. Mehrere Entwürfe dürfen gebündelt zur Freigabe vorgelegt werden. Ein »passt, trag ein« zu einem konkreten Entwurf ist eine Freigabe; ein allgemeines »kümmer dich um die Docs« oder »räum auf« deckt diese Dokumente nicht.

Ohne Rückfrage erlaubt, aber in der Antwort genannt: Tippfehler, kaputte Links, Formatierung, Querverweise nach dem Umbenennen einer Datei.

**ROADMAP.md — geteilt.** Abhaken, Erledigtes beim nächsten Durchgang streichen, Hinfälliges mit Grund entfernen, offene Punkte aus einem Proposal als Einträge referenzieren: der Agent. Neue Stränge, Umsortieren, Termine, Prioritäten: nur nach Abstimmung.

**ADR-Historie bleibt lesbar.** Eine Entscheidung wird nicht überschrieben. Ändert sie sich, entsteht eine neue ADR mit `löst ab: ADR-NNN`, die alte bekommt den Status `abgelöst durch ADR-NNN` und bleibt sonst unverändert. Die nächste Nummer ist die höchste vorhandene plus eins; Nummern werden nie neu vergeben, Dateien nie umbenannt oder gelöscht — auch eine verworfene ADR bleibt liegen.

### 7. Verweise

Docs und Code verweisen auf stabile Stellen: Dokument **und** nummerierter Abschnitt (`docs/proposals/auth.md` §4.1), ab der zweiten Nennung in derselben Datei kurz (`auth.md` §4.1), oder ADR-Nummer (`ADR-012`). Eine nackte Abschnittsnummer ohne Dokument ist mehrdeutig, sobald es mehr als ein Proposal gibt. Proposals nummerieren ihre Abschnitte deshalb, und diese Nummern bleiben stabil — auch beim Konsolidieren. Wer doch umnummeriert oder eine Datei umbenennt, zieht vorher alle Verweise darauf mit (`grep -rn "<datei>.md" docs src tests` o. ä.).

## Konsolidieren und Drift-Check

Auslöser: der User will gebaute Proposals aufräumen (»räum die Proposals auf«, »konsolidier …«), Docs auf Konsistenz prüfen lassen (»sind die Docs noch konsistent?«), oder nimmt das Angebot aus Schritt 5 an. Dann `references/consolidate.md` lesen und dem Ablauf dort folgen.

Konsolidieren heißt: das Proposal bleibt, wo es ist, und wird zur reinen Gegenwart. Historie und Code-Archäologie raus — Entscheidungsgründe als ADR-Entwurf, der Rest ersatzlos. Jeder offene Punkt bekommt seinen Roadmap-Eintrag. Ein gebautes Proposal wandert nicht in einen Masterplan; Code und andere Proposals verweisen auf seine Abschnitte.

## Struktur einführen

Nur auf Ansage des Users. Vorher `references/templates.md` lesen; dort stehen die Vorlagen.

- Angelegt werden `docs/proposals/` mit `README.md` als Index, `docs/adr/` mit `README.md` als Index und ohne Einträge, `ROADMAP.md` als Gerüst. Einen Masterplan nur, wenn der User einen will; den Architektur-Guide erst, wenn es Gebautes zu kartieren gibt.
- Inhalte werden nicht erfunden. Vision, Ziele, Leitplanken, Meilensteine und Termine kommen vom User; wo sie fehlen, steht ein Platzhalter mit der offenen Frage. Ist-Zustände für Proposals und den Guide darf der Agent aus dem bestehenden Code ableiten — Proposals als `Entwurf`.
- Liegen Entscheidungen oder Leitplanken schon anderswo (Invarianten im `CLAUDE.md`, Entscheidungsabschnitte in Proposals), wird ihr Umzug vorgeschlagen, nicht vollzogen.
- Sprache der Docs: die der vorhandenen Projekt-Docs, sonst die des Users. Die Überschriften der Vorlagen werden mitübersetzt.
- Anbieten, nicht ungefragt schreiben: ein kurzer Block in `CLAUDE.md` bzw. `AGENTS.md` des Projekts, der auf die Dokumente, die Spec-Regel aus Schritt 3 und die Änderungsrechte aus Schritt 6 zeigt. Damit halten sich auch Agents daran, die diesen Skill nicht geladen haben.
