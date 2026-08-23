# Audit-Report nachführen

Gilt in Schritt 7, nach der CHANGELOG-Arbeit und **vor** dem Abschluss-Commit.
Nur wenn `./audit.html` existiert. Kam die Findings-Liste aus einer anderen
Quelle, entfällt dieser Schritt ersatzlos — erfunden wird keine Datei.

Ein Durchgang, und er ist inhaltlich: was der Lauf nachweislich geschlossen
hat, verschwindet; was er hinterlassen hat, kommt ins Backlog; die Zahlen
werden nachgezogen. Die Gestaltung der Seite gehört nicht hierher — die
`audit.html` ist bereits nach den Vorgaben des Audit-Skills gerendert, und der
nächste Audit-Lauf rendert sie ohnehin neu.

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
wird nicht eingetragen. Einträge, die der Nutzer in der Drain-Runde ausdrücklich
verworfen hat, kommen nicht wieder herein — sie stehen begründet im Plan, und
sie hier erneut aufzumachen kehrt seine Entscheidung um:

| Quelle im Plan | Wird zu |
| --- | --- |
| »Offene Befunde«, in der Drain-Runde auf »ins Audit zurück« entschieden | Finding, `status: "new"` |
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

Steht die Formel nirgends — eine Datei ohne Methodik-Sektion, ein von Hand
gepflegter Report, eine Insel mit nacktem `summary.score` —, dann wird sie
**nicht** ersetzt. Alles Zählbare wird nachgetragen: Backlog,
`findingsBySeverity`, `resolvedCount`, die neuen Findings. `summary.score`
bleibt stehen, wie er steht, und ein Satz in der Methodik-Notiz sagt, dass er
mangels dokumentierter Formel nicht neu gerechnet wurde und aus welchem Datum
er stammt. `scoreHistory` bleibt dann ebenfalls unangetastet: ein Punkt im
Verlauf ohne neue Messung ist eine Wiederholung, keine Beobachtung. Eine
geschätzte Zahl sieht im Verlaufsdiagramm aus wie eine gemessene; der nächste
Audit-Lauf liefert die erste, die wieder etwas bedeutet.
Dasselbe gilt für `summary.domains`, wenn die Datei keine Domains führt.

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

## Häufige Ausreden

| Ausrede | Wirklichkeit |
| --- | --- |
| »Ohne Formel schätze ich den Score grob, das ist besser als nichts« | Es ist schlechter als nichts. Eine geschätzte Zahl steht im Verlauf neben gemessenen und ist von ihnen nicht zu unterscheiden. Die alte stehen lassen und den Grund vermerken. |
| »Das Paket ist committet, also ist das Finding behoben« | Der Commit belegt, dass etwas passiert ist. Der Reviewer belegt, dass es das Richtige war. Ohne sein Urteil samt Fundstelle bleibt das Finding stehen. |
| »Die behobenen Findings zeige ich durchgestrichen, das ist doch sichtbarer« | Der nächste Audit-Lauf rendert die Datei neu und wirft die Archivzeilen weg. Sichtbar ist der Zähler, dauerhaft ist der Plan. |
| »Den Score rechne ich nach Gefühl, ungefähr passt schon« | Der Verlauf wird über Läufe hinweg verglichen. Eine abweichende Rechnung erzeugt einen Sprung, den der nächste Lauf als Codeverfall liest. |
| »Der Nebenbefund hat keine Zeile, aber ich schreib ihn trotzdem rein« | Ein Finding ohne Fundstelle ist im nächsten Lauf nicht verifizierbar und wandert ungeprüft durch jedes Backlog. Ohne Zeile nicht eintragen. |
