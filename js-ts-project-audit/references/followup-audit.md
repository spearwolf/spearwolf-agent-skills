# Folgelauf — Abgleich mit einem vorherigen Audit

Gilt nur, wenn in Schritt 1 ein vorhandenes `./audit.html` registriert wurde.
Diese Datei erst lesen, wenn der frische Audit (Schritte 2–5) abgeschlossen
ist. Die Reihenfolge ist der Punkt: erst unvoreingenommen am Code arbeiten,
dann vergleichen. Umgekehrt kopiert der Lauf alte Findings, statt sie zu
prüfen.

## 5b. Merge

### Altdatei lesen

```bash
node <skill-dir>/scripts/build-report.mjs extract ./audit.html > "$TMP/previous.json"
```

Das Skript liest die JSON-Insel und gibt sie als Schema 2 aus. Ältere Reports
migriert es dabei: Kategorien werden zu Schlüsseln, fehlende Domains aus der
Kategorie abgeleitet, Offene Fragen und Methodik vereinheitlicht, Features aus
dem alten Portrait oder aus `component`-Angaben der Findings übernommen. Was es
dabei ergänzen musste, steht in `methodology.notes` der Ausgabe — diese
Hinweise wandern nicht in den neuen Datensatz, sie erklären nur den alten.

Daraus übernimmst du: `findings`, `summary.date` (wird `previousDate`),
`scoreHistory`, `fixHistory`, `theme`, `acknowledged`, `portrait.components`
und `summary.scope.exclusions`.

Findet das Skript keine Insel, gibt es keinen Merge: reiner Neu-Audit, ein
Satz dazu in `methodology.notes`. Findings aus dem Markup zu rekonstruieren
lohnt nicht mehr — jeder Report, den dieser Skill je geschrieben hat, trägt
eine Insel.

### Umfang und Features stabil halten

- **Gleiche Ausschlüsse beim Messen.** Den Prüfumfang misst du mit den
  `exclusions` des Vorlaufs, nicht mit neu ausgedachten. Ändern sie sich,
  weil das Projekt sich geändert hat (ein neues Demo-Verzeichnis, ein
  entfernter Codegenerator), steht das mit Grund in `methodology.notes`.
  Sonst vergleicht der Score zwei verschieden gezählte Nenner.
- **Gleiche Feature-IDs.** Der neue Lauf übernimmt die `id`s aus
  `portrait.components` des Vorlaufs. Label, Satz und Pfade darfst du
  schärfen. Eine neue `id` gibt es nur für eine neue fachliche Einheit; eine
  umbenannte wird in `portrait.componentRenames` als `{from, to}`
  festgehalten, damit Filter-Links und GitHub-Labels nachziehen können. Ein
  Feature, das es nicht mehr gibt, fällt einfach weg.

### Matching

Primär `category` + überlappende `location`, sekundär semantische
Titelähnlichkeit. Bei Mehrdeutigkeit konservativ matchen — zwei Findings
stehen zu lassen ist billiger als ein falsches „ist dasselbe".

### Regeln pro altem Finding

| Lage | Ergebnis |
| --- | --- |
| Im Code nicht mehr belegbar | entfällt vollständig, zählt in `summary.resolvedCount` |
| Neu aufgetaucht, gleiche Severity | neues Finding, `status: "unchanged"` |
| Neu aufgetaucht, niedrigere Severity | neues Finding, `status: "improved"` + `previousSeverity` |
| Neu aufgetaucht, höhere Severity | neues Finding, `status: "unchanged"` — die Severity spricht für sich |
| Nicht aufgetaucht, aber im Code noch belegbar | Kandidat für `status: "carried-over"`, erst nach dem Re-Check unten |
| Kein Match im alten Audit | `status: "new"` |

### Mitgeführte Fremdfelder

Ein Finding kann Felder tragen, die nicht aus einem Audit-Lauf stammen. Das
Unterobjekt `github` etwa wird vom Skill `audit-github-sync` gesetzt und hält
die Zuordnung zu einem GitHub-Issue. Bei jedem Match — `unchanged`,
`improved` wie `carried-over` — wandert es unverändert an das neue Finding.
Sein Inhalt wird nicht gelesen, nicht bewertet und nicht ergänzt.

Wer es fallen lässt, kappt die Verbindung zwischen Report und Issue-Tracker,
und der nächste Abgleich legt ein zweites Issue für denselben Befund an.
Entfällt ein Finding (`resolvedCount`), entfällt das Feld mit ihm.

### Re-Check vor jedem carry-over (nicht optional)

Ein Finding, das der neue Lauf weggelassen hat, ist kein „übersehenes"
Finding. Bevor es wieder ins Backlog darf, zwei Prüfungen:

1. **Code-Beleg** — Location öffnen, Befund verifizieren. Nicht auffindbar →
   entfernen und in `resolvedCount` zählen.
2. **Kontext-Beleg** — hat sich der Rahmen geändert (Architektur, README,
   Specs, ADRs, Roadmap), so dass der Punkt gegenstandslos ist? Bewusste
   Entscheidung dokumentiert, Feature gestrichen, Pattern offiziell
   sanktioniert? Dann entfernen, auch wenn die Code-Stelle technisch noch
   existiert — ebenfalls in `resolvedCount`. Die maßgebliche Quelle
   (Doc/Spec/Proposal/Commit) kurz benennen, statt nach Bauchgefühl zu
   streichen.

Nur was beide Prüfungen übersteht, wird `carried-over`. Ohne diesen Filter
läuft das Backlog mit veralteten Halluzinationen voll.

### Score-Historie

`scoreHistory` und `fixHistory` aus dem Vorlauf unverändert in den neuen
Datensatz übernehmen. Den Eintrag dieses Laufs hängt `--record audit` beim
Bauen an; Delta und Tendenz zeigt das Template. Einträge des alten
Score-Modells bleiben, wie sie sind — das Diagramm bricht die Linie am
Modellwechsel, statt zwei Skalen zu verbinden.

### Große Sprünge einordnen — Pflicht ab ±15 Punkten

Beim Bauen bekommt das Skript den Vorlauf mit:

```bash
node <skill-dir>/scripts/build-report.mjs build "$TMP/audit-data.json" --out ./audit.html \
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
Punkte, setzt du zwei Felder im `summary` — sonst bleiben beide weg:

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
`acknowledged` und erscheinen nur noch im Anhang.

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

### Aufnahme, Unterdrückung, Widerruf

- **Aufnahme nur auf ausdrückliche Nutzeranweisung** („ignoriere ARCH-003
  künftig", „das ist akzeptabel so"). Niemals von sich aus akzeptieren. Fehlt
  eine Begründung, eine erfragen — ohne `reason` wird der Punkt nicht
  verschoben, sonst ist später unklar, warum er versteckt ist.
- **Unterdrückung:** beim Merge jeden neuen *und* jeden carry-over-Befund
  gegen `acknowledged` matchen (gleiche Heuristik wie oben). Treffer → nicht
  ins Backlog, der Punkt bleibt allein im Anhang.
- **Persistenz:** die Liste wird bei jedem Folgelauf unverändert
  weitergeführt. Akzeptierte Punkte werden nicht gegen den Code geprüft und
  nicht automatisch entfernt — anders als carry-over-Findings, die jeder Lauf
  neu verifiziert.
- **Widerruf** („zeig ARCH-003 wieder"): aus `acknowledged` entfernen, der
  Punkt durchläuft wieder die normale Finding-Logik.

## Was im Report davon sichtbar wird

Behobene Findings tauchen **nirgends** einzeln auf — kein Badge, keine
durchgestrichene Zeile, keine Archiv-Tabelle. Nur als Zähler im Header und in
der Fix-Bilanz. Wer Details braucht, hat den git-Verlauf der `./audit.html`.
Status-Badges, Vergleichszeile, Diagramme und Anhang stellt das Template aus
den Daten dar.
