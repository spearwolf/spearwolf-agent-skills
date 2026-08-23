# Remediation-Plan — pixel-cart

Quelle: ./audit.html vom 2026-08-20 · Branch: main · erstellt: 2026-08-23
Baseline: `npm test` ✓
Arbeitsverzeichnis: <ARBEITSDIR> (Diffs und Verify-Logs, außerhalb der Versionierung)
Scope: 2 von 2 Findings (2 high) · ausgenommen: acknowledged
Scope-Regel: alles ab medium aufwärts, jede Kategorie — gilt auch für Befunde, die erst im Lauf auffallen
Stand (2026-08-23): alle Pakete committet · Arbeitsbaum sauber

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
Dokumentation, CHANGELOG, Migrations-Hinweise, Commit-Messages:
- Inline-Kommentare sind erwünscht, wo sie erklären, *warum* etwas so ist.
- Keine Finding-IDs, auch nicht in der Commit-Message. Sie gehören diesem einen
  Audit, sind danach tot, und die Commit-Message überdauert den Lauf. Sie leben
  in diesem Plan und sonst nirgends; die Verbindung zwischen Finding und Commit
  trägt das Feld `Hash:` unter dem Paket — in genau der Richtung, in der jemand
  sie später sucht. Eine Commit-Message sagt in eigenen Worten, was sie ändert.
- Kein Rückblick auf den Vorzustand: kein »früher«, kein »statt bisher«, kein
  »im Zuge des Audits umgestellt«.

## Vorbestehende Fehler
- keine

## Offene Befunde
Nebenbefunde aus den Paketen: was auch ohne diesen Lauf falsch war. Jeder
Eintrag wird beschlossen, bevor der Lauf endet — Paket oder Rückgabe ins Audit.
Ein leerer Abschnitt ist Abschlussbedingung, kein Zufall. Das Urteil am Ende
der Zeile misst den Eintrag an der Scope-Regel oben: `→ Scope`, `→ Audit`,
`→ Rückfrage`.
- [ ] `src/cart.js:22` (high) — `applyCoupon(percent)` zieht den Prozentwert als
  absoluten Centbetrag vom Preis ab; der Kommentar darüber sagt ausdrücklich
  0–100. Nicht im Audit. (aus Paket 1) → Scope
- [ ] `src/storage.js:4` (low) — das Pfadmuster `.cart-${key}.json` steht in
  `saveCart` und in `loadCart` doppelt; eine gemeinsame Stelle gibt es nicht.
  Nicht im Audit. (aus Paket 2) → Audit
- [ ] `src/storage.js:9` (medium) — `loadCart` reicht ungeprüftes `JSON.parse`
  über den Dateiinhalt durch; eine beschädigte Datei wirft. Heilen statt Werfen
  kehrt die Fehlerstrategie des Moduls um — `saveCart` lässt Schreibfehler
  ebenfalls durchschlagen, und Paket 1 hat die Aufrufer gerade darauf
  ausgerichtet. Nicht im Audit. (aus Paket 2) → Rückfrage

## Pakete

### [x] 1. Cart-Persistenz: saveCart awaiten
- Findings: BUG-001 (high)
- Ziel: Schreibfehler beim Persistieren des Warenkorbs gehen nicht mehr verloren.
- Bereich: `src/cart.js`
- Hängt ab von: —
- Hash: <HASH1>
- Ergebnis: 1 Runde · BUG-001 behoben
- Nebenbefunde: → Queue
- Schnittstellen: `Cart.add(item)` und `Cart.remove(sku)` geben jetzt ein
  Promise zurück und wollen awaitet werden

### [x] 2. PricePoller: Timer stoppbar machen
- Findings: LEAK-001 (high)
- Ziel: Ein Poller lässt sich beenden, ohne den Prozess zu beenden.
- Bereich: `src/poller.js`
- Hängt ab von: —
- Hash: <HASH2>
- Ergebnis: 1 Runde · LEAK-001 behoben
- Nebenbefunde: → Queue
- Schnittstellen: `PricePoller.stop()` neu
