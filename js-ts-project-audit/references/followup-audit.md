# Folgelauf — Abgleich mit einem vorherigen Audit

Gilt nur, wenn in Schritt 1 ein vorhandenes `./audit.html` registriert wurde.
Zwei Einstiege: **Abschnitt A** in Schritt 1, **Abschnitt B** erst nach dem
frischen Audit, wenn der Datensatz steht. Die Findings des Vorlaufs siehst du
vorher nicht: erst unvoreingenommen am Code arbeiten, dann vergleichen.
Umgekehrt kopiert der Lauf alte Findings, statt sie zu prüfen.

`<skill-dir>` und `$TMP` wie in der `SKILL.md`. Alle Dateien dieses Abschnitts
liegen unter `$TMP/followup/`.

## A. Vor dem frischen Audit (Schritt 1)

```bash
B=<skill-dir>/scripts/build-report.mjs
node "$B" extract ./audit.html > "$TMP/previous.json"
node "$B" extract ./audit.html --fields portrait.components,summary.scope.exclusions,summary.theme,meta.templateVersion
```

`previous.json` liest du **nicht**; mit ihr arbeiten nur die Skripte. Das
Skript migriert dabei auch Reports älterer Bauart ins aktuelle Schema. Findet es
keine JSON-Insel, gibt es keinen Merge: reiner Neu-Audit, ein Satz dazu in
`methodology.notes`, Abschnitt B entfällt.

Aus der zweiten Ausgabe übernimmst du:

- **Gleiche Feature-IDs.** Der Lauf übernimmt die `id`s aus
  `portrait.components`. Label, Satz und Pfade darfst du schärfen. Eine neue
  `id` gibt es nur für eine neue fachliche Einheit; eine umbenannte wird in
  `portrait.componentRenames` als `{from, to}` festgehalten, damit
  Filter-Links und GitHub-Labels nachziehen können. Ein Feature, das es nicht
  mehr gibt, fällt einfach weg.
- **Gleiche Ausschlüsse beim Messen.** Den Prüfumfang misst du mit den
  `exclusions` des Vorlaufs. Ändern sie sich, weil das Projekt sich geändert
  hat (ein neues Demo-Verzeichnis, ein entfernter Codegenerator), steht das mit
  Grund in `methodology.notes`. Sonst vergleicht der Score zwei verschieden
  gezählte Nenner.
- `summary.theme` und `meta.templateVersion` für Schritt 6a.

## B. Abgleich (Schritt 5b)

Der frische Datensatz liegt in `$TMP/audit-data.json`, mit IDs, ohne `status`.

### 1. Paaren

```bash
node "$B" match "$TMP/audit-data.json" "$TMP/previous.json" --out "$TMP/followup"
```

Das Skript paart neue und alte Findings über Kategorie und gemeinsame Datei.
Sicher ist ein Paar, wenn beide Seiten genau einen Kandidaten haben, oder wenn
unter mehreren die Titel sich gegenseitig klar am ähnlichsten sind. Auf stdout
steht nur, was du entscheiden musst:

- **`? Gruppe`** — mehrdeutige Kandidaten mit Titel und Stelle. Paare, die du
  anhand der Beschreibung für denselben Befund hältst, trägst du in
  `decisions.pairs` ein. Bei Zweifel nicht paaren: zwei Findings stehen zu
  lassen ist billiger als ein falsches »ist dasselbe«. Ein nicht gepaartes altes
  Finding geht ohnehin in den Re-Check.
- **`~ Anhang`** — ein Finding trifft einen akzeptierten Punkt. Meint es
  denselben Befund, kommt seine ID in `decisions.suppress`: es erscheint nicht
  im Backlog, der Punkt bleibt allein im Anhang. Das gilt für neue (`neu`)
  wie für alte (`alt`) Findings.
- **`→ recheck-<n>.json`** — die Stapel für Schritt 2.

Hält das Skript ein Paar für sicher, das keins ist, nimmst du es mit
`decisions.unpair` heraus. `decisions.json` liegt in `$TMP/followup/`:

```json
{ "pairs": [["ASYNC-004", "ASYNC-002"]], "unpair": [], "suppress": ["ARCH-009"], "verdicts": {} }
```

### 2. Re-Check (nicht optional)

Ein altes Finding, das der frische Audit nicht wiedergefunden hat, ist kein
»übersehenes« Finding, und ein akzeptierter Punkt ist kein Archivstück. Jeder
Punkt in den Stapeln — nicht gepaarte alte Findings und **alle**
`acknowledged`-Einträge — bekommt ein Urteil nach `recheck.md`.

- Je Stapel ein Prüfer-Subagent, alle in einer Nachricht gestartet, mit dem
  kleinsten Modell (in Claude Code `haiku`). Es ist Verifikation an einer
  bekannten Stelle, keine Suche. Auftrag in drei Zeilen: Projektverzeichnis,
  Pfad der Stapeldatei, »Lies zuerst `<skill-dir>/references/recheck.md`«.
- Ohne Subagenten arbeitest du die Stapel selbst nach `recheck.md` ab.
- Urteile `unklar` prüfst du selbst an der Stelle und trägst dein Urteil in
  `decisions.verdicts` ein; es überschreibt das des Prüfers. Dasselbe, wenn dir
  ein `weg` samt Beleg unplausibel vorkommt.

### 3. Zusammenführen

```bash
node "$B" merge "$TMP/audit-data.json" "$TMP/previous.json" --dir "$TMP/followup"
```

Das Skript weigert sich, solange ein alter Punkt ohne Urteil ist, ein Urteil
`unklar` lautet oder ein `weg`/`ueberholt` keinen Beleg hat — dann die
gemeldeten Punkte nachtragen und neu aufrufen. Was es anwendet:

| Lage | Ergebnis |
| --- | --- |
| Paar, gleiche oder höhere Severity | `status: "unchanged"`, ID des Vorlaufs |
| Paar, niedrigere Severity | `status: "improved"`, `previousSeverity`, ID des Vorlaufs |
| neues Finding ohne Paar | `status: "new"`; war seine ID im Vorlauf vergeben, bekommt es die nächste freie Nummer |
| altes Finding `besteht` | `status: "carried-over"`, unverändert |
| altes Finding `verschoben` | `carried-over` mit neuer Stelle |
| altes Finding `weg` / `ueberholt` | entfällt, zählt in `summary.resolvedCount` |
| Anhang `besteht` / `begruendung-veraltet` | bleibt |
| Anhang `verschoben` | bleibt, Stelle nachgezogen |
| Anhang `weg` / `ueberholt` | entfällt, zählt **nicht** in `resolvedCount` |

Dazu übernimmt es `previousDate`, `scoreHistory` und `fixHistory` des Vorlaufs.
Mitgeführte Fremdfelder wie das Unterobjekt `github` (gesetzt von
`audit-github-sync`) wandern bei jedem Paar und jeder Übernahme unverändert
mit; wer sie fallen lässt, kappt die Verbindung zum Issue-Tracker, und der
nächste Abgleich legt ein zweites Issue an.

Die Zusammenfassung auf stdout und `merge-report.json` sind die Grundlage für
drei Einträge, die du selbst schreibst:

- **Anhang abgeräumt** → ein Satz in `methodology.notes`: wie viele, welche
  IDs, je ein paar Worte zum Grund; bei einem `github`-Eintrag die
  Issue-Nummer dazu. Das Issue bleibt, wie es ist.
- **Begründung trägt nicht mehr** → unter „Offene Fragen" vorlegen: zurück ins
  Backlog oder neue Begründung? Nicht selbst reaktivieren — Aufnahme und
  Widerruf sind Entscheidungen des Nutzers.
- **Umbenannte IDs** brauchen nichts; sie stehen nur zur Kontrolle da.

### Große Sprünge einordnen — Pflicht ab ±15 Punkten

Beim Bauen bekommt das Skript den Vorlauf mit:

```bash
node "$B" build "$TMP/audit-data.json" --out ./audit.html \
  --record audit --previous "$TMP/previous.json"
```

Es teilt die neuen Findings (`status: "new"`) nach ihrer Fundstelle auf und
schreibt das Ergebnis nach `summary.deltaBreakdown`:

- `code` — die Datei hatte schon der Vorlauf vollständig gelesen. Der Befund
  ist neu im Code.
- `coverage` — die Datei liest dieser Lauf zum ersten Mal. Der Befund war
  vermutlich schon da.
- `unknown` — der Vorlauf hat seinen Umfang nicht gemessen.

Beträgt der Unterschied zum letzten Score **desselben Modells** mindestens 15
Punkte, setzt du zwei Felder im `summary` — sonst bleiben beide weg. Delta und
Aufteilung zeigt `check` vor dem Bauen:
`node "$B" check "$TMP/audit-data.json" --previous "$TMP/previous.json"`.

| Feld | Wert |
| --- | --- |
| `deltaCause` | `code` \| `coverage` \| `mixed` |
| `deltaExplanation` | 1–3 Sätze, die konkrete Dateien oder Bereiche benennen und sich auf die Zahlen aus `deltaBreakdown` beziehen |

Der Score bewertet Dichte, deshalb verschiebt tieferes Lesen ihn weniger als
früher, aber nicht gar nicht: die zuerst gelesenen Hotspots sind die
schlechtesten Stellen, und was danach kommt, ist meist sauberer. Die Zahlen
entscheiden, nicht das Gefühl. Überwiegt `coverage`, ist ein Absturz **keine
Verschlechterung**, und genau das muss dastehen. Bei `mixed` nennst du beide
Anteile, nicht nur den bequemeren. Überwiegt `unknown`, lautet die Ursache
`mixed`, mit dem Hinweis, dass der Vorlauf seinen Umfang nicht gemessen hat.

Wechselt mit diesem Lauf das Score-Modell (der Vorlauf hatte Modell 1), gibt
es keinen vergleichbaren Vorwert und keine Einordnung; ein Satz in
`methodology.notes` sagt, dass die Skala gewechselt hat.

### Fix-Bilanz

Nur wenn seit dem Vorlauf Remediation-Commits entstanden sind:

```bash
git log --since="<previousDate>" --format=%h --grep="^Remediation-Run:" | head
```

Kommt nichts, entfällt der Abschnitt. Sonst ordnest du jedes neue Finding mit
Zeilenangabe zu:

```bash
git blame -L <zeile>,<zeile> --porcelain -- <datei> | head -1 | cut -d' ' -f1   # verantwortlicher Commit
git log -1 --format='%cs %(trailers:key=Remediation-Run,valueonly)' <hash>
```

| Commit | Zählt als |
| --- | --- |
| nach `previousDate`, mit Trailer `Remediation-Run` | `inducedOpen` — ein Fix hat es verursacht, und der Review des Laufs hat es nicht gefangen |
| vor `previousDate` | `discovered` — lag schon da, dieser Lauf hat es erst gefunden |
| nach `previousDate`, ohne Trailer | nicht in der Bilanz — normale Weiterentwicklung |

Findings ohne Zeilenangabe bleiben außen vor; geraten wird nicht. Dazu ein
Eintrag in `fixHistory`:

```json
{ "date": "<heute>", "source": "audit", "ref": "<previousDate>", "fixed": <resolvedCount>,
  "inducedFixed": 0, "inducedOpen": <n>, "discovered": <n>, "attribution": "heuristic" }
```

`inducedFixed` ist im Audit immer 0: was ein Lauf selbst repariert hat, sieht
nur dieser Lauf, und er hat es in seinem eigenen Eintrag gebucht. Findings,
die als `inducedOpen` zählen, bekommen `origin: {kind: "induced", run:
"<Wert des Trailers>"}`.

## 5c. Akzeptierte / zurückgestellte Punkte

Manche Befunde sind bewusst akzeptiert — nicht gelöst, sollen aber nicht bei
jedem Lauf erneut im Backlog stehen. Diese Punkte leben in der Liste
`acknowledged` und erscheinen nur noch im Anhang. Der Anhang zeigt, was
*heute* bewusst hingenommen wird; er ist kein Archiv. Deshalb gehen alle
Einträge durch den Re-Check aus B.2, und `merge` räumt ab, was nicht mehr
zutrifft.

### Erledigt ≠ akzeptiert

Zwei verschiedene Nutzeranweisungen, sauber trennen:

- **erledigt / umgesetzt / gefixt** → kein Anhang-Fall. Im Code
  re-verifizieren und vollständig entfernen (`resolvedCount`).
  Widerspricht der Code der Aussage des Nutzers, das Finding **behalten** und
  den Widerspruch unter „Offene Fragen" notieren — nicht stillschweigend
  löschen.
- **akzeptabel / zurückgestellt / bekannt** → Anhang-Mechanismus.

### Datenmodell

```
acknowledged: [{id, title, category, domain, component, location, reason, acknowledgedDate}, …]
```

`category` ist der Schlüssel wie am Finding, `domain` und `component` sind
optional. `reason` = warum akzeptabel bzw. wo dokumentiert. `acknowledgedDate` = Datum
der Akzeptanz. Ein Eintrag kann zusätzlich ein `github`-Unterobjekt tragen —
dann gilt für ihn dieselbe Regel wie für Findings: unverändert mitführen,
Inhalt nicht anfassen.

### Aufnahme und Widerruf

- **Aufnahme nur auf ausdrückliche Nutzeranweisung** („ignoriere ARCH-003
  künftig", „das ist akzeptabel so"). Niemals von sich aus akzeptieren. Fehlt
  eine Begründung, eine erfragen — ohne `reason` wird der Punkt nicht
  verschoben, sonst ist später unklar, warum er versteckt ist. Einen Punkt, den
  der Nutzer in diesem Lauf zurückstellt, trägst du in
  `$TMP/audit-data.json` unter `acknowledged` ein; `merge` hängt ihn an die
  übernommenen an.
- **Widerruf** („zeig ARCH-003 wieder"): in `decisions.verdicts` den Punkt
  als `weg` mit dem Beleg »Widerruf durch den Nutzer« markieren; der Befund
  selbst durchläuft wieder die normale Finding-Logik.

## Was im Report davon sichtbar wird

Behobene Findings tauchen **nirgends** einzeln auf — kein Badge, keine
durchgestrichene Zeile, keine Archiv-Tabelle. Nur als Zähler im Header und in
der Fix-Bilanz. Wer Details braucht, hat den git-Verlauf der `./audit.html`.
Status-Badges, Vergleichszeile, Diagramme und Anhang stellt das Template aus
den Daten dar.
