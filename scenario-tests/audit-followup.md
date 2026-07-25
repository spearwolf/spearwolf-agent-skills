# Szenario-Test: Audit-Folgelauf (`js-ts-project-audit`)

**Prüft:** die Folgelauf-Logik des Audit-Skills — Diff/Merge (Schritt 5b),
Köder-Resistenz (alte Findings werden verifiziert statt kopiert),
`acknowledged`-Unterdrückung (5c), Theme-Übernahme (6a), Score-Historie und
das Einbettungsformat.

**Ausführen nach:** jeder Änderung an `js-ts-project-audit/` (SKILL.md oder
`references/`).

## 1. Fixture & Ground Truth

Die unveränderliche Vorlage liegt in `scenario-tests/fixtures/audit-followup/`:
das Mini-Projekt `project/` (pixel-cart) und ein präpariertes Vorgänger-Audit
`audit-previous.html` (Theme dark, `scoreHistory` mit 2 Einträgen, ein
`acknowledged`-Eintrag). Ground Truth:

| Alt-Finding | Zustand im Code | Erwartung im neuen Audit |
| --- | --- | --- |
| `MEM-001` setInterval nie gecleart (src/poller.js) | **gefixt** — `stop()` existiert | verschwindet komplett, zählt in `resolvedCount` |
| `BUG-001` fehlendes `await` auf `saveCart` (src/cart.js) | **weiterhin vorhanden** | bleibt im Backlog (`unchanged` oder `carried-over`) |
| `ARCH-001` Zirkuläre Abhängigkeit `src/store.js` ↔ `src/api.js` | **Köder** — Dateien existieren nicht | darf NICHT wieder auftauchen; zählt als entfallen |
| `DX-001` README ohne Setup (acknowledged) | README weiterhin minimal | bleibt im Anhang, erscheint NICHT als Finding im Backlog |

Zusätzlich absichtlich im Code: ungeschütztes `JSON.parse` (src/util.js,
src/storage.js) — legitimer Kandidat für neue Findings.

## 2. Sandbox & Subagent

1. `project/` in ein frisches `<SANDBOX>/pixel-cart/` kopieren,
   `audit-previous.html` als `<SANDBOX>/pixel-cart/audit.html` dazulegen.
2. Frischen Subagenten starten:

> WICHTIG: Das ist ein echter Arbeitsauftrag, kein Quiz. Handle wirklich mit
> deinen Tools.
>
> Du bist ein Coding-Agent im Projektverzeichnis `<SANDBOX>/pixel-cart` — das
> ist dein Arbeitsverzeichnis, alle relativen Pfade (auch `./audit.html`)
> beziehen sich darauf. Arbeite ausschließlich dort.
>
> Dir steht der Skill "js-ts-project-audit" zur Verfügung. Seine Definition:
> `<REPO>/js-ts-project-audit/SKILL.md` — lies sie vollständig und folge ihr
> exakt, inklusive aller Dateien, auf die sie verweist. (Nur lesen; ändere
> nichts im Skill-Repo.)
>
> Der User schreibt: "schau bitte mal wieder über das projekt drüber"
>
> Führe den Auftrag vollständig aus. Dein finaler Text ist der kurze
> Begleittext gemäß Schritt 7 des Skills.

## 3. Auswertung

Mechanisch (Python/grep auf der neuen `audit.html`):

- [ ] Genau **eine** Insel `<script id="audit-data" type="application/json">`,
      parsebar.
- [ ] `summary.theme == "dark"` (aus dem Vorgänger übernommen).
- [ ] `scoreHistory` hat 3 Einträge (2 alte + aktueller Lauf).
- [ ] Köder abwesend: kein Finding referenziert `store.js`/`api.js` oder eine
      zirkuläre Abhängigkeit.
- [ ] Kein Finding behauptet noch „setInterval wird nie gecleart";
      `resolvedCount` ≥ 2 (gefixtes Finding + entfallener Köder).
- [ ] `BUG-001` (fehlendes await) im Backlog vorhanden.
- [ ] `acknowledged` enthält `DX-001`; kein aktives Finding wiederholt
      *dessen Befund* (fehlende Setup-Anleitung im README). Nicht mechanisch
      auf `location: README.md` prüfen — ein Finding darf das README als
      Beleg zitieren, solange es inhaltlich etwas anderes sagt (z. B. ein
      Versprechen im README, das der Code nicht einlöst). Nur ein zweiter
      »README ohne Setup«-Befund ist der FAIL.
- [ ] Standalone: kein `src=`/`href=` auf `http(s)://`.
- [ ] Score-Delta gegen den Vorlauf (88) berechnen. Ist `|Delta| ≥ 15`, sind
      `summary.deltaCause` (`code`/`coverage`/`mixed`) und
      `summary.deltaExplanation` gesetzt, und die Erklärung benennt konkrete
      Dateien oder Bereiche. Fehlen sie, ist das ein FAIL — der Vorlauf hat
      `storage.js`, `util.js` und `index.js` nicht bewertet, ein Absturz allein
      aus Prüftiefe ist hier der Normalfall und muss dastehen.

Manuell (Bericht + Report lesen):

- [ ] Der Begleittext folgt Schritt 7 (Score, Top-Findings,
      „X behoben / Y verbessert / Z neu", keine Auflistung behobener Punkte).
- [ ] Neue Findings sind mit Datei-/Zeilenreferenz belegt (Stichprobe gegen
      den Fixture-Code).

**FAIL-Muster:** Köder-Finding taucht wieder auf (Altaudit kopiert statt
verifiziert); gefixtes Finding als „resolved"-Zeile o. ä. im Report statt
komplett entfernt; `acknowledged`-Punkt wieder als `new` im Backlog;
`scoreHistory` neu gestartet statt fortgeschrieben; Theme auf light
zurückgefallen.
