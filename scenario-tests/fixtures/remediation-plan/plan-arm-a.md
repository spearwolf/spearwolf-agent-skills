# Remediation-Plan — pixel-cart

Quelle: ./audit.html vom 2026-08-20 · Branch: main · erstellt: 2026-08-23
Baseline: `npm test` ✓
Arbeitsverzeichnis: <ARBEITSDIR> (Diffs und Verify-Logs, außerhalb der Versionierung)
Scope: 2 von 2 Findings (2 high) · ausgenommen: acknowledged
Stand (2026-08-23): Paket 1 noch nicht begonnen · Arbeitsbaum sauber

Diese Datei führt einen Lauf des Skills `js-ts-audit-remediation` und hält
seinen Stand. Wer hier weiterarbeitet: diesen Skill laden, die eingetragenen
Hashes gegen `git log --oneline` halten, beim obersten Paket ohne `[x]`
einsteigen. Der Lauf ist erst fertig, wenn auch »Offene Befunde« leer ist.
Statusmarken: `[ ]` offen · `[~]` Detailplan steht, Umsetzung läuft · `[x]`
erledigt · `[!]` blockiert.

## Entscheidungen
- Keine offenen Punkte aus der Klärungsrunde (2026-08-23)

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
- keine

## Offene Befunde
Nebenbefunde aus den Paketen: was auch ohne diesen Lauf falsch war. Jeder
Eintrag wird beschlossen, bevor der Lauf endet — Paket oder begründete
Rückgabe ins Audit. Ein leerer Abschnitt ist Abschlussbedingung, kein Zufall.
- keine

## Pakete

### [ ] 1. Cart-Persistenz: saveCart awaiten
- Findings: BUG-001 (high)
- Ziel: Schreibfehler beim Persistieren des Warenkorbs gehen nicht mehr verloren.
- Bereich: `src/cart.js`
- Hängt ab von: —
- Hash: —

### [ ] 2. PricePoller: Timer stoppbar machen
- Findings: LEAK-001 (high)
- Ziel: Ein Poller lässt sich beenden, ohne den Prozess zu beenden.
- Bereich: `src/poller.js`
- Hängt ab von: —
- Hash: —
