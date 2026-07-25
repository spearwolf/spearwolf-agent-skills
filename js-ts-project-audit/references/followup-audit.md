# Folgelauf — Abgleich mit einem vorherigen Audit

Gilt nur, wenn in Schritt 1 ein vorhandenes `./audit.html` registriert wurde.
Diese Datei erst lesen, wenn der frische Audit (Schritte 2–5) abgeschlossen
ist. Die Reihenfolge ist der Punkt: erst unvoreingenommen am Code arbeiten,
dann vergleichen. Umgekehrt kopiert der Lauf alte Findings, statt sie zu
prüfen.

## 5b. Merge

### Altdatei parsen

Die JSON-Insel `<script id="audit-data" type="application/json">` extrahieren
(Audits älterer Skill-Versionen können ein anders eingebettetes JS-Objekt
haben — auch das akzeptieren). Daraus übernehmen: Findings, Altdatum,
Altscore, `scoreHistory`, `theme`, `acknowledged`.

- Fehlt `scoreHistory`, aus Altscore und Altdatum einen einzelnen Eintrag
  synthetisieren: `[{date: <altDatum>, score: <altScore>}]`.
- Ist gar nichts parsebar, Findings best-effort aus der Backlog-Tabelle
  rekonstruieren (Titel, Severity, Location, Kategorie). Auch das schlägt
  fehl? Dann reiner Neu-Audit, Vermerk in der Methodik-Sektion, keinen Merge
  erzwingen.

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

### Score-Historie & Delta

`scoreHistory` aus dem Altdatensatz übernehmen, um `{date: <heute>, score:
<neuer Score>}` ergänzen, auf 20 Einträge begrenzen (FIFO). Score-Delta mit
Tendenz-Indikator (`▲` / `▼` / `–`) für den Header bereitstellen.

### Große Sprünge einordnen — Pflicht ab ±15 Punkten

Ein Score bewertet immer nur, was der jeweilige Lauf geprüft hat. Liest dieser
Lauf Dateien, die der vorherige übersprungen hat, stürzt der Score ab, ohne
dass sich eine Zeile Code verschlechtert hätte. Ein Leser, der nur die Zahl
sieht, liest daraus einen Zusammenbruch. Deshalb: Beträgt `|Delta| ≥ 15`,
werden zwei Felder im `summary` gesetzt — sonst bleiben beide weg.

| Feld | Wert |
| --- | --- |
| `deltaCause` | `code` \| `coverage` \| `mixed` |
| `deltaExplanation` | 1–3 Sätze, die konkrete Dateien oder Bereiche benennen |

- `code` — der Sprung stammt aus tatsächlichen Änderungen am Projekt.
- `coverage` — dieser Lauf hat anders oder tiefer geprüft: andere
  Sampling-Auswahl, Dateien erstmals bewertet, Altfindings beim Re-Check
  entfallen. Ein solcher Absturz ist **keine Verschlechterung**, und genau das
  muss dastehen.
- `mixed` — beides; dann beide Anteile benennen, nicht nur den bequemeren.

Die Einordnung entsteht aus dem Vergleich der Methodik-Angaben: Welche Dateien
hat der Vorlauf ausgewiesen, welche dieser Lauf? Fehlt die Angabe im
Altdatensatz, ist das selbst die Antwort — dann ist die Prüftiefe des
Vorlaufs unbekannt und `deltaCause` lautet `mixed`, mit dem Hinweis darauf.

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
acknowledged: [{id, title, category, location, reason, acknowledgedDate}, …]
```

`reason` = warum akzeptabel bzw. wo dokumentiert. `acknowledgedDate` = Datum
der Akzeptanz.

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
durchgestrichene Zeile, keine Archiv-Tabelle. Nur als Zähler im Diff-Header
und in der Methodik-Sektion. Wer Details braucht, hat den git-Verlauf der
`./audit.html`. Aufbau von Diff-Header, Status-Badges und Anhang: siehe
`references/report-rendering.md`.
