# Struktur einführen

Für ein Projekt, das die Struktur nicht oder nur teilweise hat. Nur auf Ansage des Users. Die Vorlagen stehen in `references/templates.md`.

## Grundsatz: schrittweise

Ein Lauf legt das Gerüst an und höchstens **ein** Proposal — das für die Domain, an der als Nächstes gearbeitet wird. Die übrigen Proposals entstehen, wenn ihre Domain berührt wird (Schritt 2 des Skills: kein passendes Proposal → anlegen). Ein Stapel Entwürfe für die ganze Codebasis prüft niemand; er sieht aus wie Spezifikation, veraltet ungelesen und wird dann von Agents als verbindlich behandelt.

Schreibt der User ausdrücklich »alle Proposals auf einmal«, wird das gemacht — mit dem Hinweis, dass jeder Entwurf vor dem Status `spezifiziert` gelesen werden muss.

## Ablauf

### 1. Bestand zuordnen

Vorhandene Docs erfassen und jedem Dokument eine Rolle vorschlagen, als Tabelle in der Antwort:

| Vorhanden | Rolle im Harness |
| --- | --- |
| Specs, Design-Docs, vorhandene Proposals | Proposal: Index-Zeile, Status-Kopf |
| Architektur-Übersicht | Kandidat für den Architektur-Guide |
| Backlog, `TODO.md`, Roadmap-artige Listen | Kandidat für `ROADMAP.md` |
| Entscheidungen im `CLAUDE.md`/`AGENTS.md`, Begründungen in Design-Docs | ADR-Kandidat nur über der Schwelle (Skill, »Was eine ADR bindet«); Leitplanken in den Masterplan, Domain-Regeln ins Proposal §3 |
| Audit- und Remediation-Reports, `CHANGELOG.md`, Service-READMEs | Nachbardokumente — bleiben, wie sie sind |

Je Dokument steht dabei: übernehmen (bleibt, wo es ist, bekommt Kopf und Index-Zeile), umziehen (Pfad oder Form ändert sich), oder bleibt Nachbar. Umgezogen und umgeschrieben wird nur, was der User bestätigt.

### 2. Domains schneiden

Den Schnitt als Vorschlag vorlegen; er ist eine Zuständigkeitsentscheidung und braucht deshalb Freigabe (Schritt 6 des Skills).

- **Entlang von Verantwortung und öffentlichen Verträgen, nicht entlang von Verzeichnissen.** Ein Package oder Modul ist der Startpunkt der Überlegung, nicht ihr Ergebnis: ein Package mit zwei unabhängigen Verantwortungen sind zwei Domains, mehrere Packages hinter einem gemeinsamen Vertrag sind eine.
- **Eine Basis-Domain** für die Verträge, die alle teilen (gemeinsame Typen, Schnittstellen zwischen den Domains). Sie ist die Basis der Vorrangregel; die übrigen bauen darauf auf.
- **Je Domain im Vorschlag:** Name, Codepfade, Einstiegspunkt, Nachbardomains, auf Wunsch das Kürzel.
- **Prüffrage für die Granularität:** Berührt eine typische Aufgabe meist genau ein Proposal? Bräuchte sie regelmäßig drei, ist der Schnitt zu fein. Sammelt ein Proposal Aufgaben aus Ecken, die nichts miteinander zu tun haben, ist er zu grob.

### 3. Gerüst anlegen

- `docs/proposals/README.md` mit allen freigegebenen Domains und der Vorrangregel. Eine Domain ohne Proposal steht als Zeile ohne Link mit dem Vermerk »noch kein Proposal« — die Zuständigkeit gilt trotzdem, und der nächste Agent sieht, wohin ein neues Proposal gehört.
- `docs/adr/README.md` als Index ohne Einträge.
- `ROADMAP.md`: aus dem vorhandenen Backlog, falls der User das in Schritt 1 bestätigt hat, sonst als Gerüst.
- Masterplan nur, wenn der User einen will. Architektur-Guide nur, wenn eine vorhandene Übersicht übernommen wird oder der User einen will.

### 4. Das erste Proposal

Für die Domain, die der User nennt; nennt er keine, fragen. Der Ist-Zustand wird aus dem Code abgeleitet, das Soll kommt vom User — fehlt es, steht ein Platzhalter mit der offenen Frage. Status `Entwurf`.

### 5. Was nicht erfunden und nicht vollzogen wird

- Vision, Ziele, Leitplanken, Meilensteine und Termine kommen vom User; wo sie fehlen, steht `> Offen: …`.
- Liegen Entscheidungen oder Leitplanken schon anderswo (Invarianten im `CLAUDE.md`, Begründungen in Design-Docs), wird ihr Umzug nach der Zuordnung aus Schritt 1 vorgeschlagen, nicht vollzogen.
- Sprache der Docs: die der vorhandenen Projekt-Docs, sonst die des Users. Die Überschriften der Vorlagen werden mitübersetzt.

### 6. Den Block im Projekt anbieten

Anbieten, nicht ungefragt schreiben: ein kurzer Block in `CLAUDE.md` bzw. `AGENTS.md` des Projekts, der auf die Dokumente, die Spec-Regel (Schritt 3 des Skills) und die Änderungsrechte (Schritt 6) zeigt. Erst damit halten sich auch Agents daran, die den Skill nicht geladen haben.
