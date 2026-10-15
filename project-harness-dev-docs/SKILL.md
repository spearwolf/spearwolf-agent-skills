---
name: project-harness-dev-docs
description: Use when working in a project whose development docs form a harness for coding agents — `docs/proposals/*.md`, `docs/masterplan/*.md`, `docs/adr.md`, `ROADMAP.md` — and the task touches planning, implementation decisions or those documents. Triggers on planning or implementing a feature in such a project (the matching proposal is the basis and is read first), on writing, updating or reviewing a proposal, on recording an architecture decision, on checking or updating the roadmap, and on phrasings like "schreib ein Proposal für …", "leg dafür ein ADR an", "steht das im Masterplan?", "aktualisier die Roadmap", "wie ist der Ist-/Soll-Stand von …", "write a proposal", "record this decision", "set up the dev docs". Also when the user wants this docs structure introduced into a project that does not have it yet. Defines what each layer holds, how the layers reference each other, and who may change what: agents may create and edit proposals transparently, while significant changes to masterplan, ADRs or roadmap milestones need the team's or user's approval first.
---

# Projekt-Harness: Dev-Docs

Vier Dokumentarten bilden zusammen das Gedächtnis eines Projekts für Coding Agents. Keine steht für sich: der Masterplan gibt die Richtung, die Proposals machen sie je Domain konkret, die ADRs halten fest, warum die Architektur so ist, wie sie ist, und die Roadmap ordnet das Ganze in der Zeit. Wer nur eine davon liest, plant an den anderen vorbei.

## Die vier Ebenen

| Ebene | Pfad | Inhalt | Wer ändert |
| --- | --- | --- | --- |
| Masterplan | `docs/masterplan/*.md` | Vision, Strategie, langfristige Ziele, übergeordnete Leitplanken. High level, keine Feature-Details. | Team/User. Der Agent schlägt vor. |
| ADR | `docs/adr.md` | Architekturentscheidungen mit Kontext, Entscheidung, Begründung und Konsequenzen. Eine Datei, fortlaufend nummerierte Einträge. | Team/User. Der Agent entwirft, geschrieben wird nach Freigabe. |
| Proposals | `docs/proposals/*.md` | Je Feature oder Fachdomain der Ist- und der Soll-Zustand. Geplant, in Umsetzung oder teils schon umgesetzt. Grundlage jedes Umsetzungsplans. | Der Agent darf anlegen und ändern — transparent. |
| Roadmap | `ROADMAP.md` | Meilensteine, Zeitplan, Fortschritt. Jeder Meilenstein verweist auf die Proposals, die er umfasst. | Fortschritt: der Agent. Meilensteine, Termine, Prioritäten: Team/User. |

Keine Ebene ist unveränderlich. Anforderungen ändern sich, Erkenntnisse kommen hinzu, Prioritäten verschieben sich; die Docs sollen den aktuellen Stand spiegeln, nicht den ersten Entwurf konservieren. Die Frage ist nie, *ob* sich etwas ändern darf, sondern *wer* es ändert — das regelt Schritt 5.

Hat ein Projekt eigene Konventionen für diese Dateien (andere Überschriften, Status-Werte, Dateinamen, Sprache), gelten die des Projekts. Bestehende Docs werden nicht auf die Vorlagen dieses Skills umformatiert.

## Workflow

### 1. Orientierung

Feststellen, welche der vier Ebenen existieren. Dann gezielt lesen, nicht alles:

- `ROADMAP.md` — welcher Meilenstein ist aktiv, wo steht das Projekt.
- Masterplan — das Einstiegsdokument (`README.md`, `overview.md` o. ä.) und die Dateien, deren Titel die Aufgabe berühren.
- Proposals — nur die zur Aufgabe passenden. Dateiname und erste Überschrift reichen zum Auswählen.
- `docs/adr.md` — nach den Begriffen der Aufgabe durchsuchen (Komponente, Library, Pattern, Domain) und die Treffer samt Status lesen. Ein abgelöster Eintrag gilt nicht mehr, sein Nachfolger schon.

Fehlt die Struktur ganz und will der User sie einführen: weiter mit »Struktur einführen« am Ende.

### 2. Vom Proposal zum Plan

Das Proposal ist die Grundlage jedes Implementierungs- oder Umsetzungsplans in seiner Domain. Der Plan leitet sich aus dem Soll ab und nennt die Abschnitte, auf denen er fußt (`§3.2 in docs/proposals/rendering.md`).

- **Kein passendes Proposal.** Bugfix oder Refactoring ohne Verhaltensänderung brauchen keins. Was ein Nutzer, eine API oder eine andere Domain danach anders erlebt als vorher, braucht ein Soll: erst das Domain-Proposal erweitern oder ein neues anlegen, dann planen.
- **Ist veraltet.** Weicht der Code vom beschriebenen Ist ab, beschreibt der Code das Ist. Den Abschnitt nachführen und es melden. Sieht die Abweichung nach einem Bug aus statt nach Weiterentwicklung, fragen, welche Seite stimmt.
- **Soll widerspricht Masterplan oder ADR.** Nicht selbst auflösen — Schritt 3.

### 3. Widersprüche zwischen den Ebenen

Die höhere Ebene gewinnt nicht automatisch; vielleicht ist gerade sie veraltet. Ist eine Seite des Widerspruchs Masterplan, ADR oder ein Roadmap-Meilenstein, entscheidet der Agent ihn trotzdem nicht allein:

1. Den Widerspruch benennen: beide Stellen mit Pfad und Abschnitt, je ein Satz, was sie sagen.
2. Einen Vorschlag machen: welche Seite angepasst werden sollte und warum.
3. Fragen und die Antwort abwarten, bevor Code entsteht, der vollendete Tatsachen schafft.

Widersprechen sich zwei Proposals, darf der Agent sie angleichen, wenn klar ist, welches aktueller ist (Status, Verlauf, Code), und meldet es. Sonst fragen.

### 4. Während und nach der Umsetzung

- **Proposal:** Umgesetztes wandert vom Soll ins Ist, Status und Verlauf werden nachgeführt. Eine Teilumsetzung bleibt als solche erkennbar — was noch offen ist, steht weiter im Soll.
- **Roadmap:** den Fortschritt des betroffenen Meilensteins nachführen.
- **Architekturentscheidung unterwegs:** Fiel eine Entscheidung, die teuer rückgängig zu machen ist oder andere Domains bindet — neue Abhängigkeit, neues Pattern, Abkehr von einem bestehenden, neue Schnittstelle zwischen Domains —, einen ADR-Eintrag entwerfen und anbieten. Weder stillschweigend weiterbauen noch stillschweigend eintragen.

Das Soll wird nicht an die Umsetzung angepasst, um eine Lücke zu verdecken. Weicht die Umsetzung vom Soll ab, wird entweder die Umsetzung korrigiert oder die Soll-Änderung offen vorgeschlagen und begründet.

### 5. Änderungsrechte

**Proposals — der Agent darf, transparent.** Anlegen, erweitern, Ist nachführen, Soll präzisieren, Status bis `in Umsetzung` bzw. `umgesetzt` setzen. Transparent heißt:

- Jede Proposal-Änderung steht in der Antwort an den User: Datei, Abschnitt, was sich verschoben hat, warum.
- Wird sie mit Code committet, nennt die Commit-Message sie.
- Der Abschnitt »Verlauf« im Proposal bekommt eine Zeile mit Datum.
- `akzeptiert` und `verworfen` setzt nicht der Agent. Das sind Entscheidungen des Teams.

**Masterplan und ADR — nur nach Abstimmung.** Signifikant ist jede Änderung, die Bedeutung verschiebt: ein Ziel, eine Leitplanke, eine Entscheidung, ihre Begründung, ihr Status, ihr Geltungsbereich; ebenso jeder neue ADR-Eintrag und jeder neue Masterplan-Abschnitt. Ablauf: Entwurf als Text in der Konversation (Diff oder neuer Abschnitt), Freigabe abwarten, dann schreiben. Ein »passt, trag ein« zu einem konkreten Entwurf ist eine Freigabe; ein allgemeines »kümmer dich um die Docs« deckt Masterplan und ADR nicht.

Ohne Rückfrage erlaubt, aber in der Antwort genannt: Tippfehler, kaputte Links, Formatierung, Querverweise nach dem Umbenennen einer Datei.

**ROADMAP.md — geteilt.** Fortschritt (erledigt, in Arbeit, Verweis auf Proposal, PR oder Commit) führt der Agent nach. Meilensteine anlegen, streichen, umsortieren oder Termine verschieben: nur nach Abstimmung, wie beim Masterplan.

**ADR-Historie bleibt lesbar.** Eine Entscheidung wird nicht überschrieben. Ändert sie sich, entsteht ein neuer Eintrag, der alte bekommt den Status `abgelöst durch ADR-NNN`. Nummern werden nie neu vergeben. So bleibt nachvollziehbar, warum es einmal anders war.

### 6. Verweise

Docs und Code verweisen auf stabile Stellen: Datei plus nummerierter Abschnitt (`§4.1 in docs/proposals/auth.md`) oder ADR-Nummer (`ADR-012`). Proposals und Masterplan-Dokumente nummerieren ihre Abschnitte deshalb. Wer Abschnitte umnummeriert oder eine Datei umbenennt, zieht vorher alle Verweise darauf mit (`grep -rn "proposals/<datei>"` über Docs und Code).

## Struktur einführen

Nur auf Ansage des Users. Vorher `references/templates.md` lesen; dort stehen die Vorlagen für alle vier Ebenen.

- Angelegt werden `docs/proposals/`, `docs/masterplan/` mit einem Einstiegsdokument, `docs/adr.md` mit Kopf und ohne Einträge, `ROADMAP.md` als Gerüst.
- Inhalte werden nicht erfunden. Vision, Ziele, Meilensteine und Termine kommen vom User; wo sie fehlen, steht ein Platzhalter mit der offenen Frage. Ist-Zustände für Proposals darf der Agent aus dem bestehenden Code ableiten — als `Entwurf`.
- Sprache der Docs: die der vorhandenen Projekt-Docs, sonst die des Users. Die Überschriften der Vorlagen werden mitübersetzt.
- Anbieten, nicht ungefragt schreiben: ein kurzer Block in `CLAUDE.md` bzw. `AGENTS.md` des Projekts, der auf die vier Ebenen und die Änderungsrechte aus Schritt 5 zeigt. Damit halten sich auch Agents daran, die diesen Skill nicht geladen haben.
