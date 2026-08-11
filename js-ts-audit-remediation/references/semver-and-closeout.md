# Abschluss — Versionierung und Übergabe

Gilt ab Schritt 7, nachdem das letzte Paket committet oder blockiert ist.
Während der Umsetzung war es gleichgültig, ob eine Änderung bricht. Jetzt
wird das für den Lauf als Ganzes bewertet, einmal.

## 1. Voller Verify-Lauf

Alle Kommandos aus der Baseline erneut ausführen, nicht nur die Verifies der
einzelnen Pakete: Lint, Typecheck, Test, Build. Ausgabe lesen, gegen die
Baseline halten.

Ist etwas rot, das vorher grün war, endet der Lauf hier. Das wird berichtet,
nicht überschrieben. Vorbestehende Fehler bleiben vorbestehende Fehler.

## 2. Gilt Semver für dieses Projekt?

Nur wenn `package.json` ein `version`-Feld hat. Fehlt es, entfällt der
gesamte Schritt.

Ist ein Feld da, aber unklar, ob es gepflegt wird — `git log -- package.json`
zeigt seit vielen Commits keine Anhebung, kein Release-Skript, kein Tag —
dann nicht selbst entscheiden, sondern fragen. Eine ungefragte
Versionsanhebung in einem Projekt ohne Release-Prozess ist Lärm.

## 3. Bewertung

Grundlage ist nicht der Gesamt-Diff, sondern die öffentliche Oberfläche
davor und danach: `package.json#exports`, `main`, `module`, `types`, `bin`
und was von dort erreichbar ist. Vergleiche den Stand vor dem ersten Commit
dieses Laufs mit `HEAD`.

| Änderung | Einstufung |
| --- | --- |
| Export entfernt oder umbenannt | major |
| Pflichtparameter ergänzt, Parametertyp verengt, Rückgabetyp erweitert | major |
| Default-Verhalten geändert, auf das Aufrufer sich verlassen | major |
| Wirft jetzt, wo vorher still zurückgegeben wurde (oder umgekehrt) | major |
| Engine-, Peer- oder Runtime-Anforderung angehoben | major |
| Config-Option, CLI-Flag oder Umgebungsvariable entfernt | major |
| Typdefinition verschärft, sodass bisher gültiger Nutzercode nicht mehr typprüft | major |
| Neuer Export, neue optionale Option, neues Flag, neue Überladung | minor |
| Parametertyp gelockert, Rückgabetyp verengt | minor |
| Bugfix ohne sichtbare API-Änderung, interne Umbauten, Tests, Doku, Build-Tooling | patch |
| Dependency-Bump | patch, außer die Änderung wird über die eigene API sichtbar |

Die Typ-Zeile wird am häufigsten übersehen: in TypeScript ist eine
verschärfte Typdefinition ein Breaking Change, auch wenn zur Laufzeit
buchstäblich nichts anders passiert. Wessen Build rot wird, dem hilft es
nicht, dass der Code liefe.

Es gilt die höchste zutreffende Stufe. Ein Lauf aus vierzehn Bugfixes und
einem entfernten Export ist major.

**Unter `1.0.0`:** breaking hebt die Minor-Stelle (`0.4.2` → `0.5.0`), alles
andere die Patch-Stelle. Ein Projekt, das eigentlich längst `1.0.0` sein
müsste, wird das nicht nebenbei in diesem Lauf.

**Monorepo:** je Package bewerten und anheben. Interne Versionsbereiche
mitziehen. Exponiert Package B einen Breaking Change aus Package A weiter,
ist B ebenfalls breaking.

## 4. CHANGELOG des Zielprojekts

Nur wenn das Projekt eines hat. Stil aus der vorhandenen Datei ableiten:
Überschriftenformat, Gruppierung, Datumsangabe, wie Breaking Changes dort
markiert werden. Ein Eintrag für den ganzen Lauf, gruppiert wie das Projekt
gruppiert, nicht einer pro Paket.

Hat das Projekt kein CHANGELOG, wird keines angelegt. Das wäre eine neue
Konvention, kein Fix — es sei denn, genau das war ein Finding.

## 5. Abschluss-Commit

Davor bekommt der Plan seinen Endstand: die Zeile `Stand:` im Kopf nennt mit
Datum, dass der Lauf abgeschlossen ist, und was gegebenenfalls blockiert
liegenblieb. Ein Plan, dessen Kopf noch »Paket 7 in Zug 3« sagt, während alle
Pakete `[x]` tragen, schickt den nächsten Agenten auf eine Suche nach Arbeit,
die es nicht gibt.

Ein Commit, der Versionsanhebung, CHANGELOG-Eintrag und den fortgeschriebenen
`./remediation-plan.md` zusammenfasst. Message im Stil, den `git log` des
Projekts zeigt.

Der Plan geht mit hinein, sofern »Entscheidungen« nichts anderes sagt — das ist
die Ansage aus der Freigabe in Schritt 5. Steht dort, dass er draußen bleibt,
wird er weder geaddet noch gelöscht noch in `.gitignore` eingetragen: er liegt
im Arbeitsbaum, gehört dem Nutzer, und was damit geschieht, entscheidet er.
Erwähne die Datei dann im Bericht namentlich, sonst steht am Ende eine
ungetrackte Datei im Projektroot, deren Herkunft niemand mehr kennt.

Danach ist Schluss. Kein Tag, kein Push, kein Pull Request, kein `npm
publish` — auch dann nicht, wenn das Projekt ein Release-Skript mitbringt und
der Weg naheliegt. Die Veröffentlichung ist eine eigene Entscheidung und
gehört dem Nutzer.

## 6. Bericht und Übergabe

Fünf bis acht Zeilen, nicht mehr:

- wie viele Pakete, wie viele Findings, wie viele Commits
- was blockiert blieb und warum, mit Paketnummer und Stash-Name
- die Semver-Entscheidung mit einem Satz Begründung, oder der Hinweis, dass
  das Projekt keine Version führt
- wie der Plan sich unterwegs bewegt hat: Findings, die als gegenstandslos
  entfielen, Nebenbefunde, die noch in ein Paket wanderten, umgestellte oder
  neu geschnittene Pakete. Je eine Zeile, gegen den freigegebenen Grobplan
  gehalten — der Nutzer hat den freigegeben und soll ohne Diff sehen, was
  daraus geworden ist.
- Anzahl der Nebenbefunde, die offen blieben, mit dem Hinweis, dass sie
  bewusst nicht mehr in diesen Lauf gezogen wurden
- das Angebot eines Folgeaudits

Das Folgeaudit läuft über `js-ts-project-audit`. Es verifiziert jedes behobene
Finding am Code, zählt sie in `resolvedCount` und schreibt Score und Historie
fort. `./audit.html` wird von diesem Skill nicht angefasst: wer sich selbst
benotet, hat immer bestanden.

## Häufige Ausreden

| Ausrede | Wirklichkeit |
| --- | --- |
| »Waren doch alles Bugfixes, also patch« | Zählt wird die Oberfläche, nicht die Absicht. Ein entfernter Export ist major, auch im Bugfix-Lauf. |
| »Die Typänderung ist doch nur Kosmetik« | Ein fremder Build, der daran rot wird, sieht das anders. Verschärfte Typen sind breaking. |
| »Die Tests liefen vorhin schon« | Der volle Lauf gehört auf den Baum, den du übergibst. Ein grüner Lauf beweist nur den Baum, auf dem er lief. |
| »Ein Tag wäre jetzt konsequent« | Der Lauf endet mit lokalen Commits. Veröffentlichen entscheidet der Nutzer. |
| »Ich trage die behobenen Findings schnell in audit.html nach« | Der Folgelauf verifiziert am Code. Nachtragen ohne Prüfung ist eine Behauptung im Report. |
