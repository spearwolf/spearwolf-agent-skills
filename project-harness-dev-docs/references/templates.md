# Vorlagen

Gerüste für ein Projekt, das die Struktur neu bekommt, und für einzelne neue Dokumente in einem Projekt ohne eigene Konvention. Hat das Projekt bereits eine, gilt die. Platzhalter stehen in `<…>`; was der User beantworten muss, bleibt als `> Offen: …` stehen, bis er es tut.

## Proposal — `docs/proposals/<domain-oder-feature>.md`

Dateiname in kebab-case nach der Domain oder dem Feature, nicht nach einem Datum oder einer Nummer (`interaction-model.md`, `asset-pipeline.md`). Ein Proposal pro Domain wächst mit; ein neues Feature innerhalb einer bestehenden Domain wird dort ergänzt, statt eine zweite Datei zu eröffnen. Ein Satellit, der einen Baustein einer bestehenden Domain vertieft, bekommt eine eigene Datei und eine eigene Zeile im Index.

Die mit *(Plan)* markierten Abschnitte leben nur bis zum Konsolidieren. Danach enthält das Proposal nur noch Gegenwart; Entscheidungsgründe und Alternativen stehen in `docs/adr/`.

```markdown
# <Titel>

> **Status: <Pre-Proposal | Entwurf | spezifiziert | in Umsetzung | gebaut | verworfen>.**
> <Ein Satz: was davon steht, was offen ist.>
> Bezug: <Masterplan-Abschnitt>, <ADR-NNN>, <andere Proposals mit §>

## 0. Problem & Abgrenzung

<Welches Problem, für wen; was ausdrücklich nicht dazugehört. Übernimmt das
Proposal eine Aussage eines anderen, steht das hier mit Verweis.>

## 1. Ist-Zustand

<Was heute existiert, mit Verweis auf Code-Stellen. Leer bei einer neuen Domain.>

## 2. Soll-Zustand

### 2.1 <Teilaspekt>

<Verhalten, Schnittstellen, Datenmodell, Optionen samt Default — so konkret,
dass ein Agent daraus einen Plan ableiten kann.>

## 3. Designentscheidungen

- **<Entscheidung als geltende Regel>** — <ein Satz warum>. ADR-NNN

<Vor dem Bau dürfen hier Alternativen und Abwägungen stehen; beim
Konsolidieren wandern sie in die ADR, hier bleibt je Entscheidung eine Zeile.>

## 4. Was offen bleibt

- **<Punkt>** — <was fehlt, unter welcher Bedingung es dran ist>.
  Roadmap: <Strang oder Abschnitt>

## 5. Tests *(Plan)*

## 6. Umsetzung in Schritten *(Plan)*
```

## Proposal-Index — `docs/proposals/README.md`

```markdown
# Proposals

Verbindliche Spezifikation, eine Datei je Domain. Der Status jedes Proposals
steht in seinem Kopf, nicht hier.

| Proposal | Kürzel | Zuständig für — hier gewinnt es |
| --- | --- | --- |
| [`<datei>.md`](./<datei>.md) | <XY> | <Domain, in einer Zeile> |

Ein Kürzel ist die einzige Definition und wird nie geändert oder neu vergeben.
Verweise in `docs/` und `ROADMAP.md` dürfen es nutzen (`XY §3.2`); Code, Tests
und Commit-Messages schreiben den Dateinamen.

## Vorrang

Für eine strittige Aussage gilt das Proposal, in dessen Domain sie fällt.
Berühren sich zwei Domains echt, gilt diese Kette, absteigend:

<oberstes>  >  <…>  >  <Basis>

Wer weiter oben steht, baut auf allem darunter auf. Ein Proposal, das eine
Aussage eines anderen ersetzt, benennt das; das ersetzte trägt an der Stelle
einen Rückverweis. Pre-Proposals stehen im Index, nicht in der Kette.
```

## Masterplan — `docs/masterplan/*.md`

Optional — nur anlegen, wenn der User einen will. Ein Einstiegsdokument `docs/masterplan/README.md`; weitere Dateien nur, wenn ein Thema eigenes Gewicht hat (`vision.md`, `principles.md`). Kein Umsetzungsstand, keine Feature-Details.

```markdown
# Masterplan

## 1. Vision

> Offen: <Wohin soll das Projekt in zwei bis drei Jahren?>

## 2. Ziele

1. <Ziel — messbar, wo es geht>

## 3. Nicht-Ziele

<Was das Projekt bewusst nicht wird.>

## 4. Leitplanken

<Prinzipien, an denen sich jedes Proposal messen lassen muss — je ein Satz
Regel, ein Satz Begründung, Verweis auf die ADR, falls es eine gibt.>

## 5. Domains

<Die Fachdomains in zwei, drei Sätzen je Domain und wie sie zusammenhängen.
Welches Proposal wofür zuständig ist, sagt docs/proposals/README.md.>
```

## ADR — `docs/adr/NNN-<titel>.md`

Eine Datei je Entscheidung. Dateiname: dreistellige Nummer plus kebab-case-Titel (`007-zwei-runtime-deps.md`), verwiesen wird mit `ADR-007`. Die nächste Nummer ist die höchste vorhandene plus eins. Nummern werden nie neu vergeben, Dateien nie umbenannt oder gelöscht. Der einzige Ort für Historie: was vorher galt, was verworfen wurde, warum es sich änderte. Der Status steht nur im Kopf der ADR, nicht im Index.

### Index — `docs/adr/README.md`

```markdown
# Architecture Decision Records

Entscheidungen und ihre Geschichte, eine Datei je Entscheidung. Die Proposals
sagen, was gilt; hier steht, warum, welche Alternativen verworfen wurden und
was vorher galt. Eine geänderte Entscheidung bekommt eine neue ADR; die alte
bleibt stehen und wird als abgelöst markiert. Der Status steht im Kopf jeder
ADR.

| ADR | Entscheidung | Bezug |
| --- | --- | --- |
| [ADR-001](./001-<titel>.md) | <Entscheidung in einem Satz> | `<datei>.md` |
```

### Eine ADR — `docs/adr/NNN-<titel>.md`

```markdown
# ADR-NNN: <Entscheidung in einem Satz>

- **Status:** vorgeschlagen | akzeptiert | abgelöst durch ADR-NNN | verworfen
- **Datum:** <YYYY-MM-DD>
- **Bezug:** <Proposal-Abschnitte, Masterplan-Abschnitt>
- **Löst ab:** <ADR-NNN, falls zutreffend>

## Kontext

<Welche Kräfte wirken, welches Problem stand an, was bis dahin galt.>

## Entscheidung

<Was gilt ab jetzt.>

## Alternativen

<Was erwogen und warum verworfen wurde.>

## Konsequenzen

<Was dadurch leichter, was schwerer wird; was jetzt bindet.>
```

## Roadmap — `ROADMAP.md`

Nach Terminen oder nach Abhängigkeiten geordnet — das Projekt wählt eins. Nur Titel, Halbsatz und Verweis; alles Weitere steht im Proposal.

```markdown
# Roadmap

Navigationsinstrument, kein Spec. `[ ]` offen, `[x]` erledigt (beim nächsten
Durchgang streichen). *Wenn* nennt, was vorher stehen muss; *Öffnet*, was
danach möglich wird.

## <Strang oder Meilenstein> — <Zieltermin, falls das Projekt Termine führt>

- [ ] **<Punkt>** — <Halbsatz>. `<datei>.md` §<n>
  *Wenn:* <Voraussetzung>. *Öffnet:* <was danach geht>.

Jeder offene Punkt eines Proposals steht hier einzeln, mit Verweis auf den
Abschnitt, der ihn spezifiziert. Mehr als Titel und Halbsatz steht hier nicht.

## Offene Entscheidungen

Was ein Mensch entscheiden muss, bevor ein Agent baut.

| # | Frage | Blockiert | Wo begründet |
| --- | --- | --- | --- |
| 1 | <Frage> | <Punkt oben> | `<datei>.md` §<n> |
```

## Architektur-Guide — `docs/architecture-guide.md`

Optional, eine Datei. Erst anlegen, wenn es Gebautes zu kartieren gibt. Als Richtwert: ein Projekt mit rund 20 Proposals kommt mit gut 500 Zeilen aus. Was darüber hinauswächst, gehört ins Proposal oder in den Modul-Header. Nichts Ungebautes, keine Historie.

```markdown
# Architektur-Guide

> Landkarte des Gebauten, nicht die Spezifikation und nicht das
> Inhaltsverzeichnis von `src/`.
>
> - Verbindlich: [`docs/proposals/`](./proposals/). Wo dieser Guide und ein
>   Proposal sich widersprechen, gilt das Proposal.
> - Was offen ist: [`ROADMAP.md`](../ROADMAP.md).
> - Details einzelner Dateien: im Header der jeweiligen Quelldatei.

## Was das Projekt ist

<Ein Absatz: was es tut, um welchen Schnitt herum es gebaut ist, welche
Abhängigkeiten es hat.>

## Die Schichten

<Von unten nach oben, je ein Punkt: Name, Verantwortung, was sie nicht weiß,
Verweis auf das zuständige Proposal mit §.>

## Datenfluss

<Der eine Ablauf, den man kennen muss — pro Request, pro Frame, pro Job —
als nummerierte Liste oder Mermaid-Sequenz.>

## Einstiegspunkte

Nicht die Dateiliste, sondern die Türen.

| Anliegen | Einstieg | Verbindlich |
| --- | --- | --- |
| <Was ist öffentlich?> | `<src/index.ts>` | — |
| <Anliegen> | `<datei>` → `<nächste Datei>` | `<datei>.md` §<n> |

## Öffentliche Oberfläche

<API-Familien, je mit ihrer einen Regel; Events und beobachtbarer Zustand,
falls das Projekt sie hat. Signaturen stehen in den Proposals.>

## Eingeschwungene Verträge

Verhalten, auf das sich Nutzer verlassen und das ein Test festhält.

| Vertrag | Verhalten | Test |
| --- | --- | --- |
| <Name> | <Verhalten in einem Satz, Verweis aufs Proposal> | `<test-datei>` |
```
