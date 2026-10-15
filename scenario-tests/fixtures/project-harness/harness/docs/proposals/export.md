# Export

> **Status: gebaut.** Offen sind die Punkte in §4.
> Bezug: CO §2, ADR-001

## 0. Problem & Abgrenzung

Messwerte müssen als Datei an Auswertungswerkzeuge gehen. Der Import ist nicht
Teil dieses Proposals.

## 1. Ist-Zustand

`exportCsv(measurements)` in `src/export.ts` erzeugt CSV mit der Kopfzeile
`id,createdAt,value`. Die frühere Fassung dieses Abschnitts sah JSON-Lines als
Format vor; das ist mit ADR-001 hinfällig.

## 2. Soll-Zustand

### 2.1 Format

CSV nach RFC 4180, Kopfzeile `id,createdAt,value`, Trennzeichen per Default
Komma (Option in §7).

### 2.2 Reihenfolge

Die Zeilen sind nach `id` aufsteigend sortiert.

### 2.3 Fehler

Ein Wert, der keine endliche Zahl ist, bricht den Export mit `ExportError` ab;
der Aufrufer stellt dann den ursprünglichen Zustand seiner Auswahl wieder her.

## 3. Designentscheidungen

- **Der Export erzeugt die Datei in einem Stück.** Ein Streaming-Export wurde
  verworfen, weil die Zielwerkzeuge die Datei ohnehin ganz laden und Streaming
  die Fehlerbehandlung aus §2.3 verdoppelt hätte.

## 4. Was offen bleibt

- **XLSX-Export** — für Tabellenkalkulation; dran, wenn ein Nutzer ihn verlangt.
- **Export großer Datenmengen in Teilen** — ab 10⁶ Messwerten wird die Datei
  unhandlich; dran, wenn ein Export dieser Größe gemessen wurde.

## 5. Tests

- Kopfzeile und Fehlerfall in `tests/export.test.ts`.

## 6. Umsetzung in Schritten

**M1 — CSV-Grundgerüst. Gebaut.** `exportCsv`, Kopfzeile.

**M2 — Fehlerfall. Gebaut.** `ExportError`.

## 7. Optionen

`exportCsv(measurements, { delimiter })` — `delimiter` Default `,`.
