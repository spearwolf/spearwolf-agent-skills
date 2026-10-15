# Vorlagen

Gerüste für ein Projekt, das die Struktur neu bekommt, und für einzelne neue Dokumente in einem Projekt ohne eigene Konvention. Hat das Projekt bereits eine, gilt die. Platzhalter stehen in `<…>`; was der User beantworten muss, bleibt als `> Offen: …` stehen, bis er es tut.

## Proposal — `docs/proposals/<domain-oder-feature>.md`

Dateiname in kebab-case nach der Domain oder dem Feature, nicht nach einem Datum oder einer Nummer (`interaction-model.md`, `asset-pipeline.md`). Ein Proposal pro Domain wächst mit; ein neues Feature innerhalb einer bestehenden Domain wird dort ergänzt, statt eine zweite Datei zu eröffnen.

```markdown
# <Titel>

- **Status:** Entwurf | akzeptiert | in Umsetzung | umgesetzt | verworfen
- **Domain:** <Fachdomain>
- **Bezug:** <Masterplan-Abschnitt>, <ADR-NNN>, <Roadmap-Meilenstein>

## 1. Zweck

<Ein Absatz: welches Problem, für wen, warum jetzt.>

## 2. Ist-Zustand

<Was heute existiert, mit Verweis auf Code-Stellen. Leer bei einer neuen Domain.>

## 3. Soll-Zustand

### 3.1 <Teilaspekt>

<Verhalten, Schnittstellen, Datenmodell — so konkret, dass ein Agent daraus einen Plan ableiten kann.>

## 4. Abgrenzung

<Was ausdrücklich nicht dazugehört.>

## 5. Offene Fragen

> Offen: <Frage>

## Verlauf

- <YYYY-MM-DD> — <eine Zeile: was sich geändert hat, von wem (Agent/Name)>
```

## Masterplan — `docs/masterplan/*.md`

Ein Einstiegsdokument `docs/masterplan/README.md`; weitere Dateien nur, wenn ein Thema eigenes Gewicht hat (`vision.md`, `principles.md`, `platform-strategy.md`).

```markdown
# Masterplan

## 1. Vision

> Offen: <Wohin soll das Projekt in zwei bis drei Jahren?>

## 2. Ziele

1. <Ziel — messbar, wo es geht>

## 3. Leitplanken

<Prinzipien, an denen sich jedes Proposal messen lassen muss.>

## 4. Domains

| Domain | Proposal | Stand |
| --- | --- | --- |
| <Domain> | `docs/proposals/<datei>.md` | <ein Wort> |

## 5. Nicht-Ziele

<Was das Projekt bewusst nicht wird.>
```

## ADR — `docs/adr.md`

Eine Datei, neueste Einträge unten, Nummern fortlaufend und nie neu vergeben.

```markdown
# Architecture Decision Records

Architekturentscheidungen dieses Projekts. Eine geänderte Entscheidung bekommt einen neuen Eintrag; der alte bleibt stehen und wird als abgelöst markiert.

## ADR-001: <Entscheidung in einem Satz>

- **Status:** vorgeschlagen | akzeptiert | abgelöst durch ADR-NNN | verworfen
- **Datum:** <YYYY-MM-DD>
- **Bezug:** <Proposal-Abschnitt, Masterplan-Abschnitt>

**Kontext.** <Welche Kräfte wirken, welches Problem stand an.>

**Entscheidung.** <Was gilt ab jetzt.>

**Alternativen.** <Was erwogen und warum verworfen wurde.>

**Konsequenzen.** <Was dadurch leichter, was schwerer wird; was jetzt bindet.>
```

## Roadmap — `ROADMAP.md`

```markdown
# Roadmap

## <Meilenstein> — <Zieltermin oder Quartal>

<Ein Satz: was mit diesem Meilenstein erreicht ist.>

- [ ] <Arbeitspaket> — `docs/proposals/<datei>.md` §<n>
- [x] <erledigtes Paket> — <PR/Commit>

## Später

<Ideen ohne Termin, jeweils mit Verweis auf ein Proposal, sobald es eins gibt.>
```
