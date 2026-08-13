# Audit-Report nachführen

Gilt in Schritt 7, nach der CHANGELOG-Arbeit und **vor** dem Abschluss-Commit.
Nur wenn `./audit.html` existiert. Kam die Findings-Liste aus einer anderen
Quelle, entfällt dieser Schritt ersatzlos — erfunden wird keine Datei.

Zwei Durchgänge, in dieser Reihenfolge, und sie werden nicht vermischt:

1. **Inhalt** — du selbst. Was der Lauf nachweislich geschlossen hat,
   verschwindet; was er hinterlassen hat, kommt ins Backlog.
2. **Form** — ein frischer Subagent, der die Seite gestaltet und dabei keinen
   einzigen Datenwert anfasst.

Der Grund für die Trennung ist banal: ein Agent, der Tabelle und Inhalt
gleichzeitig umbaut, verliert beim Umbauen die drei Findings, die er vorher
eingetragen hat — und es merkt niemand, weil die Seite danach schöner aussieht.

## Warum dieser Schritt nicht »sich selbst benoten« ist

Der Lauf fällt hier kein Urteil über den Code. Er trägt Buchhaltung nach, für
die er Belege hat: das Urteil des Reviewers je Finding-ID aus Zug 3, mit
Fundstelle, und den Commit-Hash des Pakets. Beides steht im Plan, beides ist
von einem unabhängigen Subagenten gegen den Diff geprüft worden. Was diesen
Beleg nicht hat, wird nicht geschlossen — kein »das haben wir doch mit
erledigt«.

Die inhaltliche Neubewertung bleibt beim Folgeaudit. Das ist die Arbeitsteilung,
die dieser Schritt nicht antastet: hier wird gebucht, dort wird geprüft.

## 1. Was geschlossen wird

| Lage im Plan | Ergebnis |
| --- | --- |
| Reviewer sagt »behoben« mit Fundstelle **und** das Paket hat einen Hash | geschlossen |
| Zug 0 hat es als gegenstandslos gestrichen, mit Fundstelle | geschlossen |
| Paket auf `[!]`, Reviewer offen, Fundstelle fehlt, Hash fehlt | bleibt unverändert im Backlog |
| Nie im Scope gewesen (Schritt 3 der `SKILL.md`), `acknowledged` | unverändert, wird hier nicht angefasst |

Geschlossen heißt: **aus dem Backlog entfernt und in `summary.resolvedCount`
gezählt.** Kein Badge, keine durchgestrichene Zeile, keine Archiv-Tabelle. Der
Report zeigt den Zustand, nicht die Geschichte — das ist die Regel der
`audit.html` selbst, und ein Lauf, der sie bricht, hinterlässt eine Datei, die
der nächste Audit-Lauf sofort wieder glattzieht. Wer die Einzelheiten je
Finding braucht, hat `./remediation-plan.md` und `git log`.

Sichtbar wird der Abschluss dort, wo die Datei ihn ohnehin zeigt: in der
Vergleichszeile am Kopf. Sie nennt das Datum des Audits, das Score-Delta und
»X behoben, Y neu« — und dazu, dass ein Remediation-Lauf und nicht ein neuer
Audit die Ursache ist.

## 2. Was neu hineinkommt

Vier Quellen, alle im Plan, alle mit Datei und Zeile. Was keine Fundstelle hat,
wird nicht eingetragen:

| Quelle im Plan | Wird zu |
| --- | --- |
| Offene Nebenbefunde unter erledigten Paketen | Finding, `status: "new"` |
| Folgen, die in einem blockierten Paket hängengeblieben sind | Finding, `status: "new"`, Severity nach Wirkung |
| `klein`-Befunde des Reviewers, die keine Runde ausgelöst haben | Finding, `severity: "low"` oder `"info"` |
| Abweichungen von der Empfehlung, die etwas offen gelassen haben | Finding, Severity nach Wirkung |

Dazu die Findings der Pakete auf `[!]`: die bleiben ohnehin stehen, bekommen
aber den Stand aus dem Plan in die `description` — was versucht wurde und woran
es lag. Ein Folgeaudit, das denselben Punkt frisch findet, soll nicht bei null
anfangen.

**Kategorie und Domain werden übernommen, nicht erfunden.** Die Datei führt
beide Vokabulare bereits in ihren vorhandenen Findings; ein selbst ausgedachter
Kategoriename zerreißt den Kategorie-Filter und taucht im nächsten Lauf als
Fremdkörper auf. Dasselbe gilt für die ID: Kategorie-Kürzel plus nächste freie
Nummer, und eine Nummer, die dieser Lauf gerade geschlossen hat, wird nie neu
vergeben — sie steht im Plan und in Commit-Messages und meint dort etwas
anderes.

Reine Verbesserungsvorschläge ohne Defekt — das, was die Datei in ihrer Sektion
»Optimierungspotenzial« führt — werden trotzdem als Finding mit `severity:
"info"` in die JSON-Insel geschrieben und von dort zusätzlich in der Sektion
gezeigt. Das verwischt die Trennung ein wenig, hält aber den Eintrag am Leben:
Was nicht in der Insel liegt, existiert für den nächsten Audit-Lauf nicht, und
`info` wiegt im Score ohnehin null.

## 3. Zahlen nachziehen

Neu berechnet werden `summary.score` und beide Teilscores in
`summary.domains.<d>.score`. **Die Formel wird aus der Methodik-Sektion der
Datei gelesen, nicht aus dem Gedächtnis rekonstruiert** — sie steht dort
ausgewiesen, und eine still abweichende Rechnung macht den Score-Verlauf
unbrauchbar.

`scoreHistory` bekommt einen Eintrag `{date: <heute>, score: <neu>, source:
"remediation"}` und bleibt bei 20 Einträgen (FIFO). Das Feld `source` ist der
einzige Zusatz zum Datenmodell des Audits: es hält fest, dass diese Zahl aus
einer Neuberechnung nach einem Lauf stammt und nicht aus einer frischen Prüfung
am Code. Ein Punkt im Verlaufsdiagramm, der ohne Audit entstanden ist, soll als
solcher nachweisbar sein.

Dazu `summary.resolvedCount` und die Methodik-Sektion: welcher Lauf, welches
Datum, wie viele Commits, welche Findings mangels Beleg offen blieben, und der
Satz, dass der Code seit dem Audit nicht neu geprüft wurde. Wer sie weglässt,
macht den Folgeaudit blind — der vergleicht seinen Prüfumfang gegen genau
diese Angabe, um einen Score-Sprung als Code- oder als Prüftiefen-Effekt
einzuordnen.

## 4. Der Design-Pass

Erst jetzt, wenn der Inhalt steht. Sicherungskopie anlegen, bevor irgendetwas
losläuft — sie ist zugleich der Rückweg. `$ARBEITSDIR` ist dasselbe
Ablageverzeichnis wie für die Diffs aus Zug 3, außerhalb des Projekts:

```bash
cp audit.html "$ARBEITSDIR/audit-vor-design.html"
```

Ein **frischer** Subagent auf der **stärksten Stufe**. Frisch, weil ein Agent,
der den Lauf mitgemacht hat, die Seite verteidigt, statt sie zu sehen; stärkste
Stufe, weil er weiten Ermessensspielraum hat und keine Fehlerkette hinter ihm
steht.

### Der Auftrag

Er bekommt den Pfad zur Datei, sonst nichts an Volltext. Sein Auftrag ist
Gestaltung, nicht Kosmetik: Layout, Typografie, Palette, Dichte, Reihenfolge
und Faltung der Sektionen stehen ihm offen.

**Wonach er sich richtet, gehört nicht diesem Skill.** Die Vorgaben stehen in
`references/report-rendering.md` von `js-ts-project-audit` — volle Breite auf
dem Desktop, Prosa bei 72 Zeichen, die zwei Breakpoints, was zugeklappt
startet, Farbdisziplin und Kontrastuntergrenzen. Der Skill liegt üblicherweise
unter `~/.agents/skills/js-ts-project-audit/`; finde den Pfad und gib ihn dem
Agenten, statt die Regeln hier abzuschreiben. Nach genau dieser Datei rendert
der nächste Audit-Lauf die `audit.html` neu — nur wenn der Design-Pass ihr
folgt, überlebt die Gestaltung ihn.

Ist sie nicht auffindbar, sagst du ihm das und gibst ihm den Kern in drei
Sätzen: Haltung ist schön, minimal, lesbar, klar. Auf dem Desktop trägt die
volle Breite, Prosa bleibt trotzdem bei rund 72 Zeichen — die gewonnene Fläche
gehört Zahlen, Balken und Backlog. Methodik und Anhang starten zugeklappt, bei
390 px scrollt nichts horizontal, und die Severity-Skala bleibt die einzige
Farbachse neben einem Akzent.

### Unantastbar

Fünf Grenzen, und sie sind der Grund, warum dieser Agent nicht einfach »die
Seite neu macht«:

1. **Die JSON-Insel `<script id="audit-data">` bleibt inhaltlich unverändert** —
   kein Wert, kein Feld, keine Reihenfolge. Aus ihr mergt der nächste
   Audit-Lauf; was er dort nicht findet, gilt ihm als behoben.
2. **Jedes Finding bleibt im DOM erreichbar und filterbar.** Einklappen ja,
   weglassen nein. Auch nicht »die 40 `info`-Zeilen sind Rauschen«.
3. **Standalone bleibt standalone**: kein CDN, keine externen Fonts, keine
   externen Bilder, kein Framework. Alles inline, SVG-Icons inline.
4. **Ein fest ausgeliefertes Theme**, kein `prefers-color-scheme`. Die Wahl ist
   im Audit bewusst getroffen worden und steht in `summary.theme` — ändert er
   sie, ändert er auch dort nichts, sondern lässt es.
5. **Nur `./audit.html`.** Kein Projektcode, kein Commit, kein `git`-Befehl.

### Rückgabe

| Feld | Inhalt |
| --- | --- |
| Änderungen | was er gestalterisch getan hat, drei bis fünf Zeilen |
| Insel | unverändert, und womit er das geprüft hat |
| Findings | Anzahl im DOM gegen Anzahl in der Insel |
| Viewports | welche Breiten er tatsächlich geprüft hat, womit |

Hat der Host ein Browser-Werkzeug, prüft er damit — bei 390×844 und einmal
breit —, und die harte Zusicherung lautet
`document.documentElement.scrollWidth <= window.innerWidth`. Hat er keins,
sagt er das, statt eine Prüfung zu behaupten.

### Danach prüfst du nach

Sein Report ist keine Evidenz, hier so wenig wie in Zug 2:

```bash
node -e '
const fs=require("fs");
const insel = f => JSON.parse(fs.readFileSync(f,"utf8")
  .match(/<script id="audit-data"[^>]*>([\s\S]*?)<\/script>/)[1]);
const [a,b] = [process.argv[1], process.argv[2]].map(insel);
console.log(JSON.stringify(a) === JSON.stringify(b) ? "Insel unveraendert" : "INSEL VERAENDERT");
' "$ARBEITSDIR/audit-vor-design.html" audit.html
```

Meldet das Kommando eine Veränderung oder wirft es, ist die Datei kaputt:
zurück aus der Sicherungskopie, und der Agent bekommt genau diesen Befund
einmal zurück. Kommt er ein zweites Mal damit, bleibt die Fassung von vor dem
Design-Pass stehen und der Bericht sagt, dass die Gestaltung nicht kam. Eine
schöne Datei, aus der der nächste Audit-Lauf nichts mehr lesen kann, ist der
teuerste Ausgang dieses Schrittes.

## Häufige Ausreden

| Ausrede | Wirklichkeit |
| --- | --- |
| »Das Paket ist committet, also ist das Finding behoben« | Der Commit belegt, dass etwas passiert ist. Der Reviewer belegt, dass es das Richtige war. Ohne sein Urteil samt Fundstelle bleibt das Finding stehen. |
| »Die behobenen Findings zeige ich durchgestrichen, das ist doch sichtbarer« | Der nächste Audit-Lauf rendert die Datei neu und wirft die Archivzeilen weg. Sichtbar ist der Zähler, dauerhaft ist der Plan. |
| »Den Score rechne ich nach Gefühl, ungefähr passt schon« | Der Verlauf wird über Läufe hinweg verglichen. Eine abweichende Rechnung erzeugt einen Sprung, den der nächste Lauf als Codeverfall liest. |
| »Der Nebenbefund hat keine Zeile, aber ich schreib ihn trotzdem rein« | Ein Finding ohne Fundstelle ist im nächsten Lauf nicht verifizierbar und wandert ungeprüft durch jedes Backlog. Ohne Zeile nicht eintragen. |
| »Der Design-Agent kann die Insel gleich mit aufräumen« | Sie ist keine Darstellung, sondern der Datenstand. Wer sie anfasst, löscht Findings aus dem nächsten Audit. |
| »Die 40 `info`-Zeilen kann er ruhig weglassen, das ist Rauschen« | Einklappen ist Gestaltung, Weglassen ist Datenverlust mit besserer Optik. |
| »Ich mache Inhalt und Design in einem Durchgang, spart einen Agenten« | Und kostet die drei Findings, die beim Umbauen der Tabelle verschwinden. Erst buchen, dann gestalten. |
