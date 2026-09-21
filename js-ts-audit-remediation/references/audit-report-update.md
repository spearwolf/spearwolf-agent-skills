# Audit-Report nachführen

Gilt in Schritt 7, nach der CHANGELOG-Arbeit und **vor** dem Abschluss-Commit.
Nur wenn `./audit.html` existiert. Kam die Findings-Liste aus einer anderen
Quelle, entfällt dieser Schritt ersatzlos — erfunden wird keine Datei.

Ein Durchgang, und er ist inhaltlich: was der Lauf nachweislich geschlossen
hat, verschwindet; was er hinterlassen hat, kommt ins Backlog; die Fix-Bilanz
bekommt ihren Eintrag. Die Seite selbst baut das Skript des Audit-Skills aus
den Daten. Du fasst kein Markup an.

## Werkzeug

```bash
B=~/.claude/skills/js-ts-project-audit/scripts/build-report.mjs
node "$B" extract ./audit.html > "$TMP/audit-data.json"
#   … Datensatz bearbeiten …
node "$B" build "$TMP/audit-data.json" --out ./audit.html --record remediation
```

`$TMP` ist das Arbeitsverzeichnis des Laufs aus dem Plan-Kopf. `extract` liest
auch Reports älterer Audit-Läufe und gibt sie im aktuellen Schema aus.
Meldet `build` Fehler, entsteht keine Datei: Datensatz korrigieren, neu bauen.
Die Feldbeschreibungen stehen in
`~/.claude/skills/js-ts-project-audit/assets/audit-data.schema.json`.

**Fehlt das Skript**, weil der Audit-Skill nicht installiert ist, wird die
`audit.html` in diesem Lauf nicht nachgeführt. Der Bericht sagt das in einem
Satz; der Plan hält ohnehin alles fest, und der nächste Audit-Lauf holt es
nach. Eine von Hand geänderte Seite ist schlechter als eine veraltete.

## Warum dieser Schritt nicht »sich selbst benoten« ist

Der Lauf fällt hier kein Urteil über den Code. Er trägt Buchhaltung nach, für
die er Belege hat: das Urteil des Reviewers je Finding-ID aus Zug 3, mit
Fundstelle, und den Commit-Hash des Pakets. Der Hash steht im Plan, das Urteil
in der Paketdatei `docs/remediation/paket-<N>.md` — für diesen einen Schritt
werden die Paketdateien der Pakete mit Hash also aufgemacht, und nur die. Beides
ist von einem unabhängigen Prozess gegen den Diff geprüft worden. Was diesen
Beleg nicht hat, wird nicht geschlossen — kein »das haben wir doch mit
erledigt«.

Die inhaltliche Neubewertung bleibt beim Folgeaudit. Das ist die Arbeitsteilung,
die dieser Schritt nicht antastet: hier wird gebucht, dort wird geprüft.

## 1. Was geschlossen wird

| Lage in Plan und Paketdatei | Ergebnis |
| --- | --- |
| Reviewer sagt »behoben« mit Fundstelle **und** das Paket hat einen Hash | geschlossen |
| Zug 0 hat es als gegenstandslos gestrichen, mit Fundstelle | geschlossen |
| Paket auf `[!]`, Reviewer offen, Fundstelle fehlt, Hash fehlt | bleibt unverändert im Backlog |
| Nie im Scope gewesen (Schritt 3 der `SKILL.md`), `acknowledged` | unverändert, wird hier nicht angefasst |

Geschlossen heißt: **aus `findings` entfernt und in `summary.resolvedCount`
gezählt.** Kein Status, keine Archivliste. Der Report zeigt den Zustand, nicht
die Geschichte. Wer die Einzelheiten je Finding braucht, hat
`./remediation-plan.md`, die Paketdateien darunter und `git log`.

## 2. Was neu hineinkommt

Vier Quellen, alle im Plan oder in den Paketdateien, alle mit Datei und Zeile.
Was keine Fundstelle hat, wird nicht eingetragen. Einträge, die der Nutzer in der Drain-Runde ausdrücklich
verworfen hat, kommen nicht wieder herein — sie stehen begründet im Plan, und
sie hier erneut aufzumachen kehrt seine Entscheidung um:

| Quelle | Wird zu | `origin.kind` |
| --- | --- | --- |
| »Offene Befunde« im Plan mit Urteil `→ Audit` (oder in der Drain-Runde dorthin entschieden) | Finding, `status: "new"` | `discovered` |
| `Folgen:`-Zeilen im Plan, die in einem blockierten Paket hängengeblieben sind | Finding, `status: "new"`, Severity nach Wirkung | `induced` |
| `klein`-Befunde des Reviewers aus den Paketdateien, die keine Runde ausgelöst haben | Finding, `severity: "low"` oder `"info"` | `induced` |
| Abweichungen von der Empfehlung, die etwas offen gelassen haben (Paketdatei) | Finding, Severity nach Wirkung | `induced` |

`origin.run` ist das Erstellungsdatum des Plans aus seinem Kopf, derselbe Wert
wie im Commit-Trailer `Remediation-Run`.

Dazu die Findings der Pakete auf `[!]`: die bleiben ohnehin stehen, bekommen
aber den Stand aus dem Plan in die `description` — was versucht wurde und woran
es lag. Ein Folgeaudit, das denselben Punkt frisch findet, soll nicht bei null
anfangen.

**Kategorie, Domain und Feature werden übernommen, nicht erfunden.** Die
Kategorie ist einer der 15 Schlüssel aus dem Schema, die Domain folgt der
Kategorie, `component` ist die `id` des Features, unter dessen Pfade die
Fundstelle fällt — sonst bleibt es weg. Die ID ist Kategorie-Kürzel plus
nächste freie Nummer, und eine Nummer, die dieser Lauf gerade geschlossen hat,
wird nie neu vergeben — sie steht im Plan des Laufs und meint dort etwas
anderes.

Reine Verbesserungsvorschläge ohne Defekt bekommen `kind: "improvement"`. Sie
erscheinen in der Sektion »Optimierungspotenzial« und wiegen nichts im Score.

## 3. Fix-Bilanz

Ein Eintrag in `fixHistory`, belegt aus Plan und Paketdateien:

```json
{ "date": "<heute>", "source": "remediation", "ref": "<Plan-Datum>",
  "fixed": <n>, "inducedFixed": <n>, "inducedOpen": <n>, "discovered": <n>,
  "attribution": "reviewed" }
```

| Feld | Gezählt wird |
| --- | --- |
| `fixed` | die Findings, die Abschnitt 1 geschlossen hat |
| `inducedFixed` | was die Änderungen dieses Laufs selbst kaputt gemacht und der Lauf wieder repariert hat: `kritisch`- und `wichtig`-Befunde des Reviewers auf den Paket-Diff, die eine Runde der Fehlerkette ausgelöst haben und im committeten Paket erledigt sind, dazu die Pakete mit `Folge von:`, die committet sind |
| `inducedOpen` | die Einträge aus Abschnitt 2 mit `origin.kind: "induced"` |
| `discovered` | alle Nebenbefunde des Laufs, ob in der Drain-Runde behoben oder ans Audit gegeben: was auch ohne den Lauf falsch war |

Zählen, nicht schätzen. Jeder Befund zählt einmal, in der Zeile, in der er
zuletzt steht; ein Reviewer-Befund, der drei Runden brauchte, ist ein Befund.
Die Unterscheidung »Folge oder vorbestehend« hat der Lauf beim Einsortieren
bereits getroffen (`git show <basis>:<pfad>`, siehe `references/runner.md`);
hier wird sie nur gezählt.

## 4. Zahlen und Kopf

Scores, Zählungen und den Verlaufspunkt rechnet `build` mit `--record
remediation`. Du rechnest nichts nach und trägst keinen Score von Hand ein.
Der Punkt erscheint im Verlauf hohl markiert, als Neuberechnung ohne frische
Prüfung am Code.

Dazu:

- `summary.lastRun`: `{source: "remediation", date: "<heute>", ref: "<Plan-Datum>"}`.
  Der Header nennt damit, dass der Stand nachgeführt und nicht neu erhoben ist.
- `summary.resolvedCount` um die Zahl aus Abschnitt 1 erhöhen.
- In `methodology.notes` ein Eintrag: welcher Lauf, welches Datum, wie viele
  Commits, welche Findings mangels Beleg offen blieben, und dass der Code seit
  dem Audit nicht neu geprüft wurde.
- `summary.date`, `summary.scope` und `methodology.text` bleiben, wie sie sind.
  Sie beschreiben die letzte Prüfung, und die war das Audit.

## Häufige Ausreden

| Ausrede | Wirklichkeit |
| --- | --- |
| »Das Skript fehlt, ich passe die paar Zeilen im HTML schnell von Hand an« | Die Seite rendert aus der Insel; ein Eingriff ins Markup ist beim nächsten Build weg, und eine Insel ohne neu gerechnete Zahlen zeigt einen falschen Score. Nicht nachführen und es sagen. |
| »Das Paket ist committet, also ist das Finding behoben« | Der Commit belegt, dass etwas passiert ist. Der Reviewer belegt, dass es das Richtige war. Ohne sein Urteil samt Fundstelle bleibt das Finding stehen. |
| »Die behobenen Findings zeige ich durchgestrichen, das ist doch sichtbarer« | Sichtbar ist der Zähler und die Fix-Bilanz; dauerhaft ist der Plan. Das Schema kennt keinen Status »behoben«, und das ist Absicht. |
| »Den Reviewer-Befund in Runde 2 zähle ich nicht als induziert, er war ja schnell behoben« | Genau das misst `inducedFixed`: was die eigenen Änderungen gekostet haben, auch wenn es im selben Lauf wieder gut wurde. Weglassen schönt die Kurve. |
| »Der Nebenbefund hat keine Zeile, aber ich schreib ihn trotzdem rein« | Ein Finding ohne Fundstelle ist im nächsten Lauf nicht verifizierbar und wandert ungeprüft durch jedes Backlog. Ohne Zeile nicht eintragen. |
