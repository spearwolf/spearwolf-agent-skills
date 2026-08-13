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
| `audit-followup.md` | `js-ts-project-audit/` | unbekannt (vor Einführung dieser Datei) | **fällig** — am 2026-08-07 kamen Domain-Trennung und responsives Layout dazu, am 2026-08-13 volle Desktop-Breite, Sektions-Faltung und Farbdisziplin, alles ungetestet |
| `es-frequency.md` | Abschnitt `## ES` in `global-behavior/CLAUDE.md` | unbekannt (vor Einführung dieser Datei) | **fällig** — Regel und Test am 2026-07-26 neu geschrieben und am 2026-07-29 erneut umgebaut, beides ungetestet |
| `remediation-plan.md` | `js-ts-audit-remediation/` | **Test existiert nicht** | nie getestet · Skill am 2026-08-06 auf zweistufige Planung umgebaut, am 2026-08-11 um die zugweise Fortschreibung des Plans erweitert, am 2026-08-13 um die Konventionen für Code, Doku und CHANGELOG, um die Triage der Folgen und um das Nachführen der `audit.html` samt Design-Pass |
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
  Am 2026-08-11 kam die zugweise Fortschreibung dazu (`Stand:` im Kopf,
  `Verlauf:` unter dem laufenden Paket, Verdichtung zur `Ergebnis:`-Zeile beim
  Commit, selbsterklärender Plan-Kopf). Der eigentliche Prüfpunkt ist hier
  nicht, ob ein Agent die Felder anlegt — das tut er, sie stehen im Template —,
  sondern ob er sie *während* eines Pakets fortschreibt statt am Ende in einem
  Rutsch. Ein Test dafür muss den Lauf mitten in Zug 2 oder 3 abschneiden und
  danach einen frischen Agenten allein auf `remediation-plan.md` und das Repo
  setzen: Erkennt er, dass Änderungen im Baum liegen und von wem? Fragt er beim
  Widerspruch zwischen Verlauf und `git status` nach, statt weiterzumachen?
  Beginnt er das laufende Paket stillschweigend neu und wirft damit die Arbeit
  weg? Der zweite Punkt ist die Verdichtung: nach mehreren Paketen darf kein
  Verlauf einer erledigten Nummer mehr dastehen, sonst wächst die Datei über
  ihre offene Restliste hinweg. Dazu am selben Tag der Verbleib des Plans:
  ob die Ansage bei der Freigabe wirklich als Ansage kommt und nicht als
  vierte Rückfrage, und ob ein Widerspruch des Nutzers bis zum Abschluss
  durchhält, statt dort vom Standardweg überfahren zu werden.
  Am 2026-08-13 kamen die Konventionen für Code, Doku und CHANGELOG dazu. Der
  Prüfpunkt liegt nicht beim Orchestrator — der schreibt den Abschnitt ins
  Template —, sondern beim Implementierer und beim Reviewer: Landet eine
  Finding-ID im Kommentar, weil sie beim Schreiben so naheliegend ist wie eine
  Ticketnummer? Erklärt ein Kommentar den Vorzustand, den nur der Diff kennt?
  Fällt beides dem Reviewer auf, oder wertet er es als Fleiß? Ein Fixture dafür
  braucht ein Finding, dessen Fix ohne Kontext seltsam aussieht — genau dort
  will jeder Agent den Rückblick hinschreiben. Der CHANGELOG-Teil ist getrennt
  zu prüfen und der teurere Fall: ein Lauf, dessen größte Arbeit ein interner
  Umbau ohne Außenwirkung war, plus ein kleiner neuer Export. Markiert der
  Abschluss den Umbau als breaking, weil er groß war, und schweigt über den
  Export? Und trennt der Eintrag Aufrufer von Implementierern, oder rührt er
  beide in einen Absatz?
  Ebenfalls am 2026-08-13 kam die Triage der Folgen dazu (Nebenbefund vs.
  Folge, drei Einordnungen in Zug 0, `Folge von:`, Generationsgrenze). Das ist
  der bisher teuerste Prüfpunkt, weil ein Fixture ihn *provozieren* muss: ein
  Finding, dessen sauberer Fix zwangsläufig eine zweite Stelle bricht — ein
  entfernter Export mit einem Aufrufer außerhalb des Pakets ist der billigste
  Aufbau. Vier Fragen daran. Zieht der Implementierer den Aufrufer mit, oder
  meldet er ihn als Nebenbefund und liefert ein rotes Repo ab? Nennt der
  Reviewer die nicht mitgezogene Stelle `wichtig`, oder wertet er sie als
  „nicht Teil des Pakets"? Ordnet der Planer drei Stellen einer Ursache als
  ein Nachtragspaket ein oder als drei — das ist der Punkt, an dem ein Lauf
  anfängt, sich selbst zu füttern. Und hält die Asymmetrie in der
  Eskalationsregel: eine `critical`-Folge wird ohne Rückfrage eingeplant,
  während dieselbe Schwere als vorbestehender Befund zum Nutzer geht. Die
  Generationsgrenze lässt sich kaum als Szenario fahren; sie wäre am Plan
  eines abgebrochenen Laufs zu prüfen, in dem `Folge von:` bereits dreimal
  hängt.
  Ebenfalls am 2026-08-13 kam das Nachführen der `audit.html` dazu
  (`references/audit-report-update.md`, Schritt 5 des Abschlusses) plus der
  Design-Pass. Das ist der erste Punkt im Skill mit einer maschinell prüfbaren
  Zusicherung, und die gehört in den Test: JSON-Insel vor und nach dem
  Design-Pass parsen und vergleichen, Findings im DOM gegen Findings in der
  Insel zählen, `scrollWidth <= innerWidth` bei 390 px. Ein Fixture braucht
  eine `audit.html` mit bekanntem Backlog und einen Plan, in dem genau ein
  Paket blockiert liegt — dann prüft ein Lauf drei Dinge auf einmal: Bleibt
  das Finding des blockierten Pakets stehen, weil der Beleg fehlt? Wandern
  die `klein`-Befunde und Nebenbefunde als neue Findings mit Fundstelle
  hinein, statt unter den Tisch zu fallen? Und rechnet der Agent den Score mit
  der Formel aus der Methodik-Sektion nach, statt eine plausible Zahl zu
  setzen — der Punkt, an dem ein Lauf anfängt, sich selbst zu benoten. Der
  Design-Pass selbst ist der teuerste Arm: er braucht einen Browser und einen
  Agenten mit echtem Ermessensspielraum, und die interessante Frage ist nicht,
  ob die Seite schöner wird, sondern ob er die Insel in Ruhe lässt, wenn er
  die Tabelle zur Kartenliste umbaut.
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
  Am 2026-08-13 kippte die Desktop-Regel: statt einer Säule von 1100 px trägt
  jetzt die volle Breite, und die Deckelung sitzt im Fließtext
  (`max-width: 72ch`). Der Test dafür läuft im selben Browser-Lauf mit, bei
  1920 oder 2560: Nutzt die Seite die Breite überhaupt, oder klebt der Agent
  aus Gewohnheit einen Container davor? Und die Gegenprobe, die wichtiger ist —
  bleibt die Prosa in den Executive Summaries bei rund 72 Zeichen, statt über
  den ganzen Monitor zu laufen? Beide Fehler sehen im Screenshot ähnlich harmlos
  aus und sind es nicht. Dazu die Faltung: starten Methodik und Anhang als
  geschlossene `<details>`, während »Offene Fragen« offen bleibt — die
  Versuchung ist, alles Sekundäre einzuklappen und die Frageliste gleich mit.
  Der Kontrastteil (4.5:1 für Lesbares, beide Themes gerechnet) lässt sich am
  gerenderten DOM messen und gehört in denselben Lauf; er ist der einzige
  Punkt der Palette, der nicht Geschmackssache ist.
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
