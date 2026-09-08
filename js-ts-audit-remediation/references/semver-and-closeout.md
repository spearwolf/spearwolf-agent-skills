# Abschluss — Report, Versionierung, Übergabe

Gilt ab Schritt 7, nachdem das letzte Paket committet oder blockiert ist. Der
ganze Abschluss ist eine Folge von Ansagen: die Freigabe des Grobplans hat ihn
gedeckt, und ab hier wartet nichts mehr auf den Nutzer. Was er wissen soll,
steht am Ende im Report; was er anders will, sagt er danach.

## 0. Drain — der Lauf schließt seine eigenen Baustellen

Zwei Listen müssen leer sein, bevor bewertet oder committet wird. Ein Lauf, der
seine Trümmer dem nächsten Audit übergibt, schließt nichts ab; das Audit hält
sie für vorbestehend.

**Erstens: offene `Folgen:`.** Steht unter einem erledigten Paket eine
`Folgen:`-Zeile mit unverteilten Einträgen, gibt es für sie keinen Zug 0 mehr.
Ein letzter Runner mit dem Zusatz »nur Triage, kein Paket umsetzen« ordnet sie
nach der Tabelle in `references/runner.md` ein und schneidet Pakete. Die laufen
durch die Schleife aus Schritt 6; danach geht es hier weiter.

**Zweitens: die Befund-Queue.** Der Abschnitt »Offene Befunde« im Plan-Kopf muss
auf null. Jeder Eintrag trägt sein Urteil an der `Scope-Regel:`; hier wird es
ausgeführt, nicht neu verhandelt:

| Urteil | Was passiert — sofort |
| --- | --- |
| `→ Scope` | Neues Paket am Ende der Liste, `Nebenbefund` statt `Findings`. Erst die tmux-Session des vorigen Durchlaufs beenden (`tmux kill-session -t <session>`; sie steht noch mit totem Pane, und das Skript verweigert sonst den Start mit Exit 40), dann Skript starten wie in Schritt 6, Wachposten setzen, bei `ende exit=0` zurück hierher. |
| `→ Audit` | Beim Nachführen der `./audit.html` als neues Finding aufnehmen: Severity, Fundstelle, Vermerk »aufgefallen in Remediation-Lauf vom <Datum>«. |
| `→ Rückfrage` | Wie `→ Audit`, zusätzlich mit dem Satz, wogegen der Fix läuft. Ein Fix, der eine Architekturentscheidung kippt, gehört nicht ungefragt in diesen Lauf, und gefragt wird nicht mehr — also ins Audit, wo er auf den nächsten Lauf wartet. Der Report nennt diese Einträge gesondert. |
| fehlt | Nach der `Scope-Regel:` nachtragen, dann wie oben. Fehlt die Regel selbst: alles `→ Audit`, im Report benannt. |

Du meldest dem Nutzer in einer Zeile, was passiert (»Drain: 2 Pakete aus der
Queue, 3 Befunde gehen ins Audit, Skript läuft«), und wartest nicht auf
Antwort. **Das ist die Stelle, an der bisherige Läufe stehenblieben: eine
Ansage mit Widerspruchsrecht, hinter der nichts geschah.** Die Pakete dieser
Runde sind von der Scope-Regel gedeckt, die der Nutzer in Schritt 5 wörtlich
freigegeben hat. Widerspricht er, während das Skript läuft, gilt der
Widerspruch ab dem nächsten Paket.

Ein Paket aus dieser Runde kann selbst einen Nebenbefund erzeugen; dann beginnt
der Drain von vorn. Abschlussbedingung ist die leere Liste, nicht die Zahl der
Runden. **Ab der dritten Runde** liefert dieselbe Fläche nach, und dann ist ein
zweiter Lauf ohne eigene Planung im Gang: Rest `→ Audit`, im Report mit dem
Vorschlag, dass dieser Bereich einen eigenen Lauf bekommt.

Was hier nicht ausgeführt wird, verschwindet spurlos — der Plan wird danach
committet und die Queue liest niemand mehr. `→ Audit` ist billig und immer
verfügbar; einen Eintrag liegen zu lassen hat keinen Grund.

## 1. Voller Verify-Lauf

Alle Baseline-Kommandos aus dem Plan-Kopf erneut fahren — wörtlich von dort,
nicht aus `package.json` neu zusammengesucht. Wie in Schritt 2 in Logdateien
umleiten, Schwanz lesen, gegen die Baseline halten.

Rot, was vorher grün war: der Lauf endet hier, das wird berichtet, nicht
überschrieben. Vorbestehende Fehler bleiben vorbestehende Fehler.

## 2. Semver-Empfehlung

**Der Lauf hebt keine Version an.** Er empfiehlt eine Stufe im Report; die
Anhebung gehört zum Release, und das Release gehört dem Nutzer. Kein
`version`-Feld in `package.json`: der Report sagt »Projekt führt keine Version«,
Rest dieses Abschnitts entfällt.

Grundlage ist die öffentliche Oberfläche vor dem ersten Commit dieses Laufs
gegen `HEAD`: `package.json#exports`, `main`, `module`, `types`, `bin` und was
von dort erreichbar ist — nicht der Gesamt-Diff.

| Änderung | Stufe |
| --- | --- |
| Export entfernt oder umbenannt | major |
| Pflichtparameter ergänzt, Parametertyp verengt, Rückgabetyp erweitert | major |
| Default-Verhalten geändert, auf das Aufrufer sich verlassen | major |
| Wirft jetzt, wo vorher still zurückgegeben wurde (oder umgekehrt) | major |
| Engine-, Peer- oder Runtime-Anforderung angehoben | major |
| Config-Option, CLI-Flag oder Umgebungsvariable entfernt | major |
| Typdefinition verschärft, sodass gültiger Nutzercode nicht mehr typprüft | major |
| Neuer Export, neue optionale Option, neues Flag, neue Überladung | minor |
| Parametertyp gelockert, Rückgabetyp verengt | minor |
| Bugfix ohne sichtbare API-Änderung, Interna, Tests, Doku, Build-Tooling | patch |
| Dependency-Bump | patch, außer die Änderung wird über die eigene API sichtbar |

Die Typ-Zeile wird am häufigsten übersehen: verschärfte Typen sind breaking,
auch wenn zur Laufzeit nichts anders passiert. Es gilt die höchste zutreffende
Stufe; vierzehn Bugfixes plus ein entfernter Export sind major.

**Unter `1.0.0`:** breaking hebt Minor, alles andere Patch. Ein Projekt, das
längst `1.0.0` sein müsste, wird das nicht in diesem Lauf. **Monorepo:** je
Package eine Empfehlung; exponiert B einen Breaking Change aus A weiter, ist B
ebenfalls breaking.

Die Empfehlung steht als eine Zeile im Report: Stufe, aktuelle und
vorgeschlagene Nummer, die eine Änderung, die die Stufe bestimmt. Sie erscheint
nicht im Chat-Bericht und verlangt keine Antwort.

## 3. CHANGELOG des Zielprojekts

Nur wenn das Projekt eines hat; keines anlegen, es sei denn, genau das war ein
Finding. Ein Eintrag für den ganzen Lauf, gruppiert wie das Projekt gruppiert,
im Stil der vorhandenen Datei.

Der Eintrag steht dort, wo das Projekt Unveröffentlichtes sammelt
(`## Unreleased` o. ä.). Fehlt so ein Abschnitt, wird er in der Überschriftenform
des Projekts oben angelegt — ohne Versionsnummer, ohne Datum. Beides setzt das
Release, nicht dieser Lauf.

**Bricht es wirklich?** Breaking ist nur, woran vorhandener fremder Code
scheitert: roter Build, anderes Laufzeitverhalten, weggefallene Schnittstelle.
Ein neuer Export, eine optionale Option, ein zweiter Weg neben dem alten bricht
nichts, so groß der Umbau darunter war. Wer den Bruch nicht an einer Zeile
fremden Codes zeigen kann, hat eine neue Funktion.

**Für wen?** Zwei Publika, getrennt erkennbar — der erste Satz eines Eintrags
sagt, wen er angeht:

| Wer liest | Braucht |
| --- | --- |
| wer die Funktion **benutzt** | Signatur, Default, Verhalten, Migrationsschritt |
| wer sie **erweitert oder ändert** | interne Struktur, Erweiterungspunkte, geänderter Vertrag |

Ein Umbau, der keines der beiden erreicht, gehört nicht ins CHANGELOG; er steht
in der Commit-Historie. Der Eintrag sagt, was jetzt gilt und was der Leser tut —
keine Vorgeschichte, keine Anläufe, kein Audit, keine Finding-IDs.

## 4. Audit-Report nachführen

Liegt eine `./audit.html` im Projekt: behobene Findings raus, Nebenbefunde mit
Urteil `→ Audit` und `→ Rückfrage` rein, Zahlen nachziehen. Regeln und
Belegpflicht in `references/audit-report-update.md`, jetzt lesen. Gestaltung
unangetastet — sie gehört dem Audit-Skill. Ohne `audit.html` entfällt der
Schritt.

## 5. Remediation-Report schreiben

Pfad: `docs/remediation/<YYYYMMDD>-remediation-report.md`, Datum ist der
Abschlusstag. Er ist die einzige Datei des Laufs, die im Arbeitsbaum bleibt,
und er wird für jemanden geschrieben, der in einem Jahr wissen will, was dieser
Lauf war und was er gekostet hat. Keine Finding-IDs, kein Rückblick auf den
Vorzustand außer im Semver-Satz. Eine Bildschirmseite.

```markdown
# Remediation-Report — <Projektname>, <YYYY-MM-DD>

Quelle: ./audit.html vom <Datum> · Branch: <name> · Commits: <erster>..<letzter>
Scope-Regel: <wörtlich aus dem Plan>

## Lauf
- Ziel: <ein Satz>
- <N> Pakete geplant, <N> gefahren — davon <N> Folgepakete, <N> aus der Befund-Queue
- <N> Findings geschlossen, <N> entfielen als gegenstandslos, <N> Commits
- Blockiert: <Paket, Grund, Stash-Name> — oder »keines«
- Ins Audit zurück: <N> Nebenbefunde, davon <N> mit offener Architekturfrage
- Verify am Ende: <Kommandos mit Ausgang, gegen die Baseline>
- audit.html: Score <alt> → <neu>, <N> geschlossen, <N> neu

## Tokenverbrauch
<Abschnitt `## Tokenverbrauch` aus dem Plan, Tabelle und Vorspann unverändert>

## Semver-Empfehlung
<Stufe>: <aktuell> → <vorgeschlagen>. <Die eine Änderung, die die Stufe bestimmt.>
Keine Anhebung vorgenommen.
```

Die Tokentabelle kommt aus dem Plan und wird dort im selben Zug **entfernt**:
sie zieht um, sie wird nicht kopiert. Was der Abschluss selbst kostet, steht
nicht darin; die Tabelle nennt ihren eigenen Stand.

## 6. Abschluss-Commits

Vorher der Endstand im Plan: `Stand:` nennt datiert, dass der Lauf
abgeschlossen ist und was blockiert liegenblieb. **`Lauf-Status:` verschwindet
ersatzlos**, im selben Commit — solange sie steht, hält ein späterer Agent den
Lauf für offen und beginnt Schritt 7 ein zweites Mal. Geprüft wird das:

```bash
grep -n '^Lauf-Status:\|^## Tokenverbrauch' remediation-plan.md   # muss leer ausgehen
```

**Erster Commit:** CHANGELOG-Eintrag, `./remediation-plan.md`, `docs/remediation/`
mit Paketdateien und Report, dazu die `./audit.html`, sofern sie getrackt ist.
Ungetrackt bleibt sie ungetrackt: nicht adden, nicht in `.gitignore`, im
Bericht nennen. Message im Stil von `git log`. Keine Versionsanhebung.

Sagt »Entscheidungen«, dass der Plan draußen bleibt, wird nur der Report
geaddet; Plan und Paketdateien gehören dann dem Nutzer, samt Aufräumen.

**Zweiter Commit**, nur bei sauber geschlossenem Lauf — kein Paket auf `[!]`
oder `[r]`, »Offene Befunde« leer, keine unverteilte `Folgen:`-Zeile:

```bash
git rm remediation-plan.md
git rm docs/remediation/paket-*.md
git commit --no-gpg-sign -m "<im Stil des Projekts: Remediation-Plan archiviert>"
```

Der Report bleibt stehen; die Historie behält den Rest: `git show
<hash>:remediation-plan.md`, `git show <hash>:docs/remediation/paket-3.md`.
Nicht sauber geschlossen: Plan bleibt im Arbeitsbaum, der Bericht sagt warum —
ein blockiertes Paket hat seinen Stash-Namen nur dort.

Kein Tag, kein Push, kein Pull Request, kein `npm publish`, auch wenn ein
Release-Skript daliegt.

**Allerletzter Handgriff: die tmux-Session schließen.** Sie überlebt das Ende
der Schleife absichtlich (`remain-on-exit`), damit die Schlussausgabe lesbar
bleibt; nach den Abschluss-Commits liest sie niemand mehr. Der Name steht in
der Startausgabe (`Läuft in tmux-Session »…«`), sonst `tmux ls | grep
'^remediate-'`:

```bash
tmux kill-session -t <session>
```

Das gilt in beiden Ausgängen — sauber geschlossen oder mit stehengebliebenem
Plan — und kommt nach dem letzten Commit, nie davor: das Pane ist die einzige
Stelle, an der bei einem roten Verify-Lauf noch nachzulesen ist, was die
Schleife zuletzt gesagt hat. Mitschrift und Journal im Arbeitsverzeichnis
bleiben davon unberührt.

## 7. Bericht im Chat

Vier bis sechs Zeilen, der Rest steht im Report:

- Pakete, Findings, Commits — eine Zeile
- was blockiert blieb, mit Paketnummer und Stash-Name
- was sich gegen den freigegebenen Grobplan bewegt hat: entfallene Findings,
  Folgepakete mit Herkunft, Nebenbefunde ins Audit — je eine Zeile, nur wo es
  etwas gab
- neuer Stand der `./audit.html`, sofern es eine gibt
- Pfad des Reports, und wo der Plan geblieben ist

Kein Angebot eines Folgeaudits, keine Semver-Frage, kein »sag Bescheid, wenn«.
Der Nutzer weiß, dass er ein Audit starten kann, und die Semver-Empfehlung
steht im Report.

## Häufige Ausreden

| Ausrede | Wirklichkeit |
| --- | --- |
| »Ich lege die Drain-Pakete vor und warte auf das Okay« | Die Scope-Regel ist das Okay, wörtlich freigegeben in Schritt 5. Eine Ansage, hinter der nichts passiert, ist der Fehler, den dieser Abschluss verbietet. |
| »Die Rückfrage-Einträge brauchen eine Antwort, also frage ich« | Sie gehen ins Audit, mit der Frage im Text. Dort beantwortet sie der Nutzer, wenn er den nächsten Lauf plant. |
| »Waren doch alles Bugfixes, also patch« | Gezählt wird die Oberfläche, nicht die Absicht. Ein entfernter Export ist major, auch im Bugfix-Lauf. |
| »Die Typänderung ist nur Kosmetik« | Ein fremder Build, der daran rot wird, sieht das anders. |
| »Das war eine große Umstellung, also breaking« | Groß ist nicht breaking. Ohne eine Zeile fremden Codes, die scheitert, ist es eine neue Funktion. |
| »Die Empfehlung ist eindeutig, ich hebe die Version gleich an« | Der Lauf empfiehlt, das Release hebt an. Beides trennt genau die Zeile, die im Report steht. |
| »Die Tests liefen vorhin schon« | Ein grüner Lauf beweist nur den Baum, auf dem er lief. Der volle Lauf gehört auf den Baum, den du übergibst. |
| »Ich trage die behobenen Findings schnell in audit.html nach« | Geschlossen wird, was Reviewer-Urteil mit Fundstelle *und* Commit-Hash hat. Der Rest bleibt stehen. |
| »Die Tokentabelle kopiere ich in den Report und lasse sie im Plan« | Sie zieht um. Zwei Tabellen in zwei Dateien driften, sobald jemand eine anfasst. |
