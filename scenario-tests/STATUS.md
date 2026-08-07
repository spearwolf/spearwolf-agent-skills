# Teststand

Welcher Szenario-Test wann zuletzt gegen welchen Stand lief. Diese Datei ist
die einzige Spur, die von einem Testlauf committet wird — die Protokolle
selbst bleiben in der Konversation.

Sie wird bei **jeder** Änderung an einem abgedeckten Artefakt fortgeschrieben,
auch wenn kein Test läuft. Ausgeführt wird nur auf ausdrückliche Anfrage des
Nutzers (Regel im Repo-`CLAUDE.md`); protokolliert wird immer.

## Ist ein Test fällig?

Nicht aus dem Gedächtnis beantworten, sondern mit dem Commit aus der Spalte
`Geprüfter Stand`:

```bash
git log --oneline <sha>..HEAD -- <artefakt-pfad>
```

Leere Ausgabe heißt: seit dem letzten Lauf unverändert, der Test ist gültig.
Jede Zeile Ausgabe heißt: fällig.

## Stand

| Test | Artefakt | Geprüfter Stand | Ergebnis |
| --- | --- | --- | --- |
| `install-drift.md` | `global-behavior/INSTALL.md` | unbekannt (vor Einführung dieser Datei) | — |
| `audit-followup.md` | `js-ts-project-audit/` | unbekannt (vor Einführung dieser Datei) | **fällig** — am 2026-08-07 kamen Domain-Trennung und responsives Layout dazu, beides ungetestet |
| `es-frequency.md` | Abschnitt `## ES` in `global-behavior/CLAUDE.md` | unbekannt (vor Einführung dieser Datei) | **fällig** — Regel und Test am 2026-07-26 neu geschrieben und am 2026-07-29 erneut umgebaut, beides ungetestet |
| `remediation-plan.md` | `js-ts-audit-remediation/` | **Test existiert nicht** | nie getestet · Skill am 2026-08-06 auf zweistufige Planung umgebaut |
| — | `testing-on-mac-safari/` | **Test existiert nicht** | kein Szenario-Test. Die Ad-hoc-Prüfung vom 2026-07-30 ist durch den seitherigen Ausbau überholt |

Die drei `unbekannt`-Zeilen stammen aus der Zeit vor diesem Protokoll. Läufe
gab es (siehe `CHANGELOG.md` zum 2026-07-25), aber die getesteten Stände sind
nicht festgehalten, und die Artefakte wurden anschließend genau wegen dieser
Läufe geändert. Praktisch heißt das: fällig, sobald es jemandem wichtig ist.

## Offene Punkte

- `js-ts-audit-remediation` (angelegt 2026-07-26) hat noch keinen Test. Zu
  prüfen wären dort: die Klärungsrunde vor dem Plan statt Rückfragen mitten in
  der Umsetzung, differenzierte Modellstufen statt durchgängig der stärksten,
  kein Commit ohne eigenen Verify-Lauf, und die Semver-Bewertung am Schluss
  statt paketweise.
  Am 2026-08-06 kam die zweistufige Planung dazu (Grobplan in Schritt 5,
  Paket-Planer als Zug 0 vor jedem Paket ab Nummer 2). Damit sind vier weitere
  Punkte ungeprüft: ob Schritt 5 wirklich beim Grobplan bleibt, statt aus alter
  Gewohnheit alles auszuformulieren; ob Zug 0 überhaupt gefahren wird, statt
  dass der Orchestrator den Detailplan selbst schreibt, weil er das Paket
  „ohnehin kennt"; ob der Planer die Findings am Code nachschlägt statt sie aus
  dem Plan zu zitieren; und vor allem, ob die Eskalationsgrenze trägt — ein
  Planer, der einen eleganteren Architekturweg sieht, muss anhalten und fragen,
  nicht umbauen. Der letzte Punkt ist der einzige, an dem ein Fehlverhalten
  echten Schaden anrichtet, und er lässt sich nur mit einem Fixture testen, in
  dem ein solcher Weg tatsächlich verlockend ist.
- `js-ts-project-audit` hat am 2026-07-26 das Übergabe-Angebot in Schritt 7
  bekommen. `audit-followup.md` prüft diesen Pfad bisher nicht.
  Am 2026-08-07 kam die Domain-Trennung dazu. Zu prüfen wäre dort vor allem,
  ob ein frischer Agent die Zuordnung aus Schritt 3 übernimmt, statt sie nach
  Gefühl neu zu erfinden — die Grenzfälle sind Typsicherheit und Tests, die
  intuitiv beim Code landen, laut Tabelle aber zum Harness gehören. Dazu: ob
  beide Blöcke gleiches Gewicht bekommen (statt Harness als Anhang unter dem
  Code), ob eine leere Domain trotzdem gerendert wird, und ob der Folgelauf
  gegen ein Alt-Audit ohne `domain`-Felder sauber ableitet, statt den Merge
  aufzugeben.
  Ebenfalls am 2026-08-07 kam das responsive Layout dazu. Das ist der erste
  Punkt im Skill, der sich nicht am Text der `audit.html` prüfen lässt,
  sondern nur am gerenderten Ergebnis: Viewport-Tag vorhanden, kein
  horizontaler Überlauf bei 390 px, Backlog dort als Karten statt als
  Tabelle. Ein Test dafür braucht einen Browser — Playwright bei 390×844
  reicht, `document.documentElement.scrollWidth <= innerWidth` ist die harte
  Zusicherung.
- `testing-on-mac-safari` (angelegt 2026-07-30) hat keinen Szenario-Test. Die
  Ad-hoc-Prüfung lief so: ein frischer Subagent bekam „teste die public app auf
  dem Mac" ohne jeden Hinweis auf Host, MCP-Server oder Fallback-Skript, fand
  den Skill, wählte die richtige URL und verifizierte am gemounteten DOM statt
  am Statuscode. Das lief allerdings gegen eine frühere, einteilige englische
  Fassung ohne Konfigurationsschritt und ohne den Simulator-Weg — der
  committete Stand ist damit ungeprüft.
  Zu prüfen wären dort vor allem: ob der Agent `~/.testing-on-mac-safari.conf`
  überhaupt liest, bevor er den ersten Befehl absetzt; ob er bei fehlender
  Datei nach beiden Werten in *einer* Rückfrage fragt, statt `hostname` oder
  `~/.ssh/config` zu befragen; ob er `$macHost`/`$devHost` einsetzt, statt sie
  literal auszuführen; ob er den Port tatsächlich im Projekt ermittelt, statt
  die 5173 aus dem Beispiel zu übernehmen; und ob er die Referenzdatei öffnet,
  bevor er Netzwerk-Requests auswertet oder einen Screenshot holt.
- Die ES-Regel ist am 2026-07-26 zum zweiten Mal an diesem Tag umgebaut
  worden, jetzt auf Session-Länge und Kontextschwelle statt auf Boten,
  Protokoll und Logbuch. `es-frequency.md` ist entsprechend neu geschrieben
  (Arme A–E) und noch nie gelaufen. Zwei Prüfpunkte sind neu und unerprobt:
  ob eine in der Rahmung *behauptete* Session-Länge überhaupt als Auslöser
  wirkt (misst der Test die Regel oder die Rahmung?), und ob „genau einmal pro
  Session" innerhalb eines Subagent-Laufs mit drei Statusmeldungen messbar
  ist. Bricht Arm B mehrfach pro Rep ein, ist zuerst die Regel zu verdächtigen
  und dann der Testaufbau.
- Am 2026-07-29 kam die dritte Fassung: das 🎈 gehört zum Einbruch, der 🤡
  ist eine zweite Stufe ohne harten Auslöser — die Kontextschwelle ist weg,
  an ihrer Stelle stehen Session-Länge, gedrehte Runden und die Bedingung,
  dass der Einbruch vorausgegangen sein muss. Damit hat der Test keinen
  einzigen deterministischen Arm mehr: D misst jetzt Ermessen, wo vorher eine
  Pflicht stand. Wenn D unter die Rate fällt, ist offen, ob die Regel zu
  zurückhaltend formuliert ist oder ob „mehrere Runden gedreht" sich in einem
  einzelnen Subagent-Lauf schlicht nicht glaubhaft behaupten lässt.

## Eintrag nach einem Lauf

Eine Zeile ändern, nicht anhängen: Datum, kurzer Commit-Hash des getesteten
Stands, Ergebnis. Lief der Test nur teilweise, gehören die ausgelassenen Arme
in die Ergebnis-Spalte — ein Teillauf, der wie ein voller aussieht, ist
schlimmer als gar keiner.
