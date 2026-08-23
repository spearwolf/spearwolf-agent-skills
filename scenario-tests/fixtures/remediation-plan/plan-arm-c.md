# Remediation-Plan — pixel-cart

Quelle: ./audit.html vom 2026-08-20 · Branch: main · erstellt: 2026-08-23
Baseline: `npm test` ✓
Arbeitsverzeichnis: <ARBEITSDIR> (Diffs und Verify-Logs, außerhalb der Versionierung)
Scope: 2 von 2 Findings (2 high) · ausgenommen: acknowledged
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
Dokumentation, CHANGELOG, Migrations-Hinweise:
- Inline-Kommentare sind erwünscht, wo sie erklären, *warum* etwas so ist.
- Keine Finding-IDs. Sie gehören diesem einen Audit und sind danach tot. Sie
  leben in diesem Plan und in Commit-Messages, sonst nirgends.
- Kein Rückblick auf den Vorzustand: kein »früher«, kein »statt bisher«, kein
  »im Zuge des Audits umgestellt«.

## Vorbestehende Fehler
- keine

## Offene Befunde
Nebenbefunde aus den Paketen: was auch ohne diesen Lauf falsch war. Jeder
Eintrag wird beschlossen, bevor der Lauf endet — Paket oder begründete
Rückgabe ins Audit. Ein leerer Abschnitt ist Abschlussbedingung, kein Zufall.
- [ ] `src/cart.js:22` — `applyCoupon(percent)` zieht den Prozentwert als
  absoluten Centbetrag vom Preis ab; der Kommentar darüber sagt ausdrücklich
  0–100. Nicht im Audit. (aus Paket 1)
- [ ] `src/storage.js:9` — `loadCart` reicht ungeprüftes `JSON.parse` über den
  Dateiinhalt durch; eine beschädigte Datei wirft statt zu heilen. Nicht im
  Audit. (aus Paket 2)

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
