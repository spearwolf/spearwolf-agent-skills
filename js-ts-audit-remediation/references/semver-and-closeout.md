# Abschluss — Versionierung und Übergabe

Gilt ab Schritt 7, nachdem das letzte Paket committet oder blockiert ist.
Während der Umsetzung war es gleichgültig, ob eine Änderung bricht. Jetzt
wird das für den Lauf als Ganzes bewertet, einmal.

## 0. Drain — der Lauf schließt seine eigenen Baustellen

Bevor irgendetwas bewertet oder committet wird, müssen zwei Listen leer sein.
Ein Lauf, der seine eigenen Trümmer dem nächsten Audit übergibt, schließt
nichts ab; er reicht weiter, und das nächste Audit hält sie für vorbestehend.

**Erstens: offene `Folgen:`.** Steht unter irgendeinem erledigten Paket noch
eine Zeile `Folgen:` mit unverteilten Einträgen, ist der Lauf nicht am Ende.
Diese Einträge hat er selbst verursacht, und für sie gibt es keinen Zug 0 mehr,
der sie verteilen würde. Also startet ein letzter Runner mit dem Zusatz »nur
Triage, kein Paket umsetzen«: er ordnet nach der Tabelle in
`references/runner.md` ein, schneidet die nötigen Pakete und gibt zurück. Die
laufen dann durch die normale Schleife aus Schritt 6, und erst danach geht es
hier weiter.

**Zweitens: die Befund-Queue.** Der Abschnitt »Offene Befunde« im Kopf des
Plans muss auf null gehen. Die Entscheidung ist zum größten Teil schon
gefallen: jeder Eintrag trägt sein Urteil an der `Scope-Regel:` aus dem
Plan-Kopf, das ein Runner beim Notieren gesetzt hat. Was hier stattfindet, ist
die Ausführung dieses Urteils plus eine Runde für das, was die Regel nicht
entscheiden konnte.

Drei Ausgänge, mehr nicht:

| Ausgang | Woher | Was passiert |
| --- | --- | --- |
| **jetzt beheben** | `→ Scope` | Neues Paket am Ende der Liste, `Nebenbefund` statt `Findings`. Es läuft durch die Schleife aus Schritt 6 wie jedes andere. Danach zurück hierher. |
| **ins Audit** | `→ Audit` | Der Eintrag wird beim Nachführen der `./audit.html` als neues Finding aufgenommen, mit Severity, Fundstelle und dem Vermerk, dass er in diesem Lauf auffiel. Details in `references/audit-report-update.md`. |
| **verworfen** | nur auf Ansage des Nutzers | Mit einem Satz Begründung. Der Eintrag bleibt im Plan stehen, auf `[x]`, mit Datum und Grund. |

Vorgelegt wird trotzdem alles, in einem Zug und in drei Blöcken: was nach der
Regel jetzt behoben wird, was ins Audit geht, und die `→ Rückfrage`-Einträge.
Die ersten beiden Blöcke sind Ansage, kein Fragebogen — sie stehen dort, damit
der Nutzer widersprechen kann, nicht damit er bestätigt. Gefragt wird nur der
dritte Block, je mit deinem Vorschlag und dem Satz, wogegen der Fix läuft. Bei
einer langen Queue reicht ein Block-Eintrag pro Gruppe gleicher Ursache.

**Vorlegen heißt anhalten.** Nach der Vorlage startet kein Runner, bevor die
Antwort da ist — auch nicht für einen `→ Scope`-Eintrag, dessen Ausgang
feststeht. Ein Widerspruchsrecht, das erst nach dem Commit greift, ist keins,
und die Pakete dieser Runde stehen in keinem Grobplan, den der Nutzer je
freigegeben hat: für sie gilt dieselbe Grenze wie in Schritt 5, nur eine Runde
später. Der Unterschied zwischen den Blöcken liegt darin, *was* der Nutzer
beantwortet — bei den ersten beiden reicht ein Ja oder ein Widerspruch, der
dritte braucht eine Entscheidung —, nicht darin, *ob* auf ihn gewartet wird.

Fehlt einem Eintrag das Urteil — ein älterer Plan, ein Runner, der es
vergessen hat —, fällst du es hier nach derselben Regel und schreibst es dazu.
Fehlt die `Scope-Regel:`-Zeile selbst, wandert die ganze Liste in den
Fragen-Block; geraten wird sie nicht.

Ein Paket, das aus dieser Runde entsteht, läuft durch Schritt 6 wie jedes
andere — und kann dabei selbst einen Nebenbefund erzeugen. Dann ist die Queue
nicht mehr leer, und die Drain-Runde beginnt von vorn. Das ist der vorgesehene
Fall, nicht die Ausnahme: die Abschlussbedingung ist die leere Liste, nicht die
Zahl der Runden.

Ab der dritten Runde legst du dem Nutzer aber nicht mehr den einzelnen Eintrag
vor, sondern die Kette. Dieselbe Datei liefert nach, und dann ist nicht der
dritte Befund die Frage, sondern ob der Abschluss der richtige Ort für diesen
Bereich ist. Das ist dieselbe Überlegung wie die Generationsgrenze bei den
Folgen, nur eine Ebene höher: ein Lauf, der sich im Abschluss immer neue
Pakete schneidet, ist kein Abschluss mehr, sondern ein zweiter Lauf ohne
eigene Planung. Der Vorschlag lautet dann: Rest ins Audit, und der Bereich
bekommt einen eigenen Lauf.

Was hier nicht entschieden wird, verschwindet — und zwar spurlos, weil der Plan
danach committet wird und die Queue niemand mehr liest. Genau dagegen existiert
dieser Schritt. Der Ausgang »ins Audit zurück« ist billig und immer verfügbar;
es gibt keinen Grund, einen Eintrag stattdessen liegen zu lassen.


## 1. Voller Verify-Lauf

Alle Kommandos aus der Baseline erneut ausführen, nicht nur die Verifies der
einzelnen Pakete: Lint, Typecheck, Test, Build. Sie stehen wörtlich im Kopf des
Plans — von dort nehmen, nicht aus `package.json` neu zusammensuchen und nicht
aus dem Gedächtnis. Wie in Schritt 2 in eine Logdatei umleiten und den Schwanz
lesen; bei einem roten Lauf so viel vom Log, wie zur Einordnung nötig ist.
Gegen die Baseline halten.

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

### Bricht es wirklich?

Die Versionsnummer aus Schritt 3 gilt für den Lauf als Ganzes. Im CHANGELOG
wird jeder Eintrag noch einmal einzeln bewertet, und die Fehlmarkierung geht
fast immer in dieselbe Richtung: Aufwand wird für Bruch gehalten. Ein neuer
Export, eine zusätzliche optionale Option, ein zweiter Weg neben dem alten
bricht nichts — bestehender Code läuft unverändert weiter, so groß der Umbau
darunter auch war. Breaking ist nur, woran vorhandener fremder Code scheitert:
roter Build, anderes Laufzeitverhalten, weggefallene Schnittstelle. Wer den
Bruch nicht an einer konkreten Zeile fremden Codes zeigen kann, hat kein
Breaking Change, sondern eine neue Funktion.

### Für wen bricht es?

Zwei Publika, mit verschiedenen Fragen:

| Wer liest | Fragt sich | Braucht |
| --- | --- | --- |
| wer die Funktion **benutzt** | Muss ich meinen Aufrufcode ändern? | Signatur, Default, Verhalten, der Migrationsschritt |
| wer sie **erweitert oder ändert** | Muss ich meine Implementierung nachziehen? | interne Struktur, Erweiterungspunkte, geänderter Vertrag |

Beides gehört hinein, getrennt und als solches erkennbar. Kennt das Projekt
keine eigene Markierung dafür, trennt die Formulierung: der erste Satz eines
Eintrags sagt, wen er angeht. Wer die Funktion nur benutzt, soll nicht durch
Interna lesen müssen, um festzustellen, dass ihn der Eintrag nichts angeht —
und ein Umbau, der keines der beiden Publika erreicht, gehört gar nicht ins
CHANGELOG. Der steht in der Commit-Historie.

Führt das Projekt Migrations-Hinweise, folgen sie derselben Trennung: ein Weg
für Aufrufer, ein Weg für Implementierer, keine Vermischung.

Der Rückblick-Test aus den Konventionen greift hier anders als im Code: ein
CHANGELOG beschreibt naturgemäß den Unterschied zu vorher, das ist sein Zweck.
Draußen bleibt die Vorgeschichte der Sache — wie es dazu kam, welche Anläufe es
gab, dass ein Audit sie gefunden hat. Der Eintrag sagt, was jetzt gilt und was
der Leser zu tun hat. Finding-IDs bleiben auch hier draußen.

## 5. Audit-Report nachführen

Liegt eine `./audit.html` im Projekt, wird sie jetzt auf den Stand nach dem
Lauf gebracht: behobene Findings raus, was der Lauf hinterlassen hat rein,
Zahlen nachziehen. Regeln und Belegpflicht stehen in
`references/audit-report-update.md`; jetzt lesen. Die Gestaltung der Seite
bleibt unangetastet — sie gehört dem Audit-Skill.

Ohne `audit.html` entfällt der Schritt. Er läuft vor dem Commit, damit die
Datei mit hineingeht, und vor dem Bericht, damit das Angebot eines Folgeaudits
gegen den nachgeführten Stand steht und nicht gegen den vom Lauf-Beginn.

## 6. Abschluss-Commit

Davor bekommt der Plan seinen Endstand: die Zeile `Stand:` im Kopf nennt mit
Datum, dass der Lauf abgeschlossen ist, und was gegebenenfalls blockiert
liegenblieb. Ein Plan, dessen Kopf noch »Paket 7 in Zug 3« sagt, während alle
Pakete `[x]` tragen, schickt den nächsten Agenten auf eine Suche nach Arbeit,
die es nicht gibt.

**Und die Zeile `Lauf-Status:` verschwindet.** Sie steht im Kopf, direkt unter
`Arbeitsverzeichnis:`, und gehört der Schleife aus Schritt 6: sie sagt, dass ein
Lauf läuft, an einem Exit-Code hängt oder durch ist und auf genau diesen
Abschluss wartet. Mit dem Abschluss ist keine dieser Aussagen mehr wahr. Die
Zeile ersatzlos löschen, im selben Commit — nicht auf »abgeschlossen«
umschreiben, dafür ist `Stand:` da. Solange sie irgendwo steht, hält ein später
einsteigender Agent den Lauf zu Recht für offen und beginnt Schritt 7 ein
zweites Mal.

Der Löschbefund ist prüfbar, und er wird geprüft:

```bash
grep -n '^Lauf-Status:' remediation-plan.md   # muss leer ausgehen
```

Ein Commit, der Versionsanhebung, CHANGELOG-Eintrag und den fortgeschriebenen
`./remediation-plan.md` zusammenfasst. Message im Stil, den `git log` des
Projekts zeigt.

Die nachgeführte `./audit.html` geht mit hinein, sofern sie im Repo verfolgt
wird — dann ist ihr Verlauf die Historie der Reports, und ein uncommitteter
Zwischenstand macht den nächsten Vergleich unbrauchbar. Ist sie ungetrackt,
bleibt sie es: nicht adden, nicht in `.gitignore` schreiben, im Bericht
namentlich nennen.

Der Plan geht mit hinein, sofern »Entscheidungen« nichts anderes sagt — das ist
die Ansage aus der Freigabe in Schritt 5 der `SKILL.md`. Steht dort, dass er
draußen bleibt, wird er weder geaddet noch gelöscht noch in `.gitignore`
eingetragen: er liegt im Arbeitsbaum, gehört dem Nutzer, und was damit geschieht,
entscheidet er. Erwähne die Datei dann im Bericht namentlich, sonst steht am Ende
eine ungetrackte Datei im Projektroot, deren Herkunft niemand mehr kennt.

### Und danach aus dem Arbeitsbaum

Ist der Plan committet und der Lauf **sauber geschlossen**, entfernt ein zweiter,
winziger Commit ihn aus dem Arbeitsbaum:

```bash
git rm remediation-plan.md
git commit --no-gpg-sign -m "<im Stil des Projekts: Remediation-Plan archiviert>"
```

Der Projektroot ist damit wieder so leer wie vorher, und die Historie behält
alles: `git log --oneline -- remediation-plan.md` zeigt beide Commits, `git show
<hash>:remediation-plan.md` den vollen Stand.

**Sauber geschlossen heißt: kein Paket auf `[!]`, »Offene Befunde« leer, keine
unverteilte `Folgen:`-Zeile.** Trifft eines davon nicht zu, bleibt der Plan im
Arbeitsbaum stehen, und der Bericht sagt warum. Der Grund ist nicht Ordnungssinn:
ein blockiertes Paket hat seinen Arbeitsbaum im Stash, und der Stash-Name steht
nur im Plan. Wer den Plan wegräumt, während dort noch etwas liegt, hat einen
Stash ohne Vorgeschichte hinterlassen.

Bleibt der Plan draußen — weil »Entscheidungen« es so sagt —, wird er auch nicht
gelöscht. Er gehört dann dem Nutzer, und das schließt das Aufräumen ein.

Danach ist Schluss. Kein Tag, kein Push, kein Pull Request, kein `npm
publish` — auch dann nicht, wenn das Projekt ein Release-Skript mitbringt und
der Weg naheliegt. Die Veröffentlichung ist eine eigene Entscheidung und
gehört dem Nutzer.

## 7. Bericht und Übergabe

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
- die Pakete, die als Folge dieses Laufs dazukamen, mit ihrer Herkunft
  (`Folge von: Paket N`). Das ist die eine Zahl, an der der Nutzer abliest, was
  ihn die Behebung über den Grobplan hinaus gekostet hat — und die einzige, die
  er im Grobplan nicht freigegeben hat
- Anzahl der Nebenbefunde, die offen blieben, mit dem Hinweis, dass sie
  bewusst nicht mehr in diesen Lauf gezogen wurden. Offene **Folgen** stehen
  hier nur, wenn ein Paket blockiert liegenblieb — dann mit Paketnummer und
  Grund, benannt als das, was sie sind: Schaden, den dieser Lauf angerichtet
  und nicht wieder eingeholt hat
- wo der Plan geblieben ist: archiviert und aus dem Arbeitsbaum entfernt, oder
  stehengeblieben und warum. Eine halbe Zeile — aber ohne sie sucht jemand eine
  Datei, die es nicht mehr gibt, oder übersieht eine, die noch etwas offen hat
- der neue Stand der `./audit.html`, sofern es eine gibt: alter und neuer
  Score, wie viele Findings geschlossen und wie viele neu eingetragen wurden —
  eine Zeile
- das Angebot eines Folgeaudits

Das Folgeaudit läuft über `js-ts-project-audit`. Es prüft den Code frisch,
verifiziert jeden übernommenen Punkt an der Fundstelle und schreibt Score und
Historie fort. Die Arbeitsteilung, die dabei gilt: dieser Lauf hat oben in
Schritt 5 gebucht, wofür er Belege hatte — Reviewer-Urteil und Commit-Hash —, und der
Score dort ist die Formel des Audits auf ein verändertes Backlog, kein neues
Urteil über den Code. Wer sich selbst benotet, hat immer bestanden; wer nur
zählt, was ein anderer geprüft hat, nicht.

Der nächste Audit-Lauf rendert `./audit.html` neu, nach den Vorgaben des
Audit-Skills. Was dieser Lauf an ihr geändert hat, ist deshalb Datenstand und
nichts Gestalterisches — die Optik gehört dorthin, wo die Datei entsteht.

## Häufige Ausreden

| Ausrede | Wirklichkeit |
| --- | --- |
| »Waren doch alles Bugfixes, also patch« | Zählt wird die Oberfläche, nicht die Absicht. Ein entfernter Export ist major, auch im Bugfix-Lauf. |
| »Die Typänderung ist doch nur Kosmetik« | Ein fremder Build, der daran rot wird, sieht das anders. Verschärfte Typen sind breaking. |
| »Das war eine große Umstellung, also breaking« | Groß ist nicht breaking. Ohne eine Zeile fremden Codes, die daran scheitert, ist es eine neue Funktion. |
| »Der interne Umbau war die eigentliche Arbeit, der gehört ins CHANGELOG« | Nur wenn ihn jemand merkt — als Aufrufer oder als Implementierer. Sonst reicht die Commit-Historie. |
| »Die Finding-IDs im CHANGELOG zeigen, worauf der Eintrag zurückgeht« | Sie zeigen es genau einer Person, die eine `audit.html` von heute hat. Für alle anderen ist es Rauschen. |
| »Die Tests liefen vorhin schon« | Der volle Lauf gehört auf den Baum, den du übergibst. Ein grüner Lauf beweist nur den Baum, auf dem er lief. |
| »Ein Tag wäre jetzt konsequent« | Der Lauf endet mit lokalen Commits. Veröffentlichen entscheidet der Nutzer. |
| »Ich trage die behobenen Findings schnell in audit.html nach« | Nicht schnell und nicht nach Erinnerung: geschlossen wird, was Reviewer-Urteil mit Fundstelle *und* Commit-Hash hat. Der Rest bleibt stehen. |
| »Wenn ich schon in der Datei bin, bügle ich die Optik gleich mit auf« | Die Gestaltung entsteht beim Audit und wird beim nächsten Lauf neu gerendert. Hier wird gebucht, sonst nichts. |
