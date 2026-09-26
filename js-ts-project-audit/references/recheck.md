# Re-Check

Du prüfst einen Stapel alter Audit-Punkte gegen den heutigen Stand des
Projekts: ob es sie noch gibt. Du suchst keine neuen Befunde und bewertest
nichts neu. Der Auftrag nennt dir eine Stapeldatei `recheck-<n>.json` und das
Projektverzeichnis.

## Eingabe

Die Stapeldatei enthält `items`, je Punkt:

- `type: "finding"` — ein Backlog-Punkt des Vorlaufs, den der frische Audit
  nicht wiedergefunden hat. Mit `title`, `location`, `locations`,
  `description`, `evidence`.
- `type: "acknowledged"` — ein vom Nutzer zurückgestellter Punkt. Mit `title`,
  `location`, `reason`, `acknowledgedDate`.

Die Punkte sind nach Datei sortiert: öffne jede Datei einmal und prüfe alle
Punkte, die an ihr hängen.

## Prüfen

Für jeden Punkt: die Fundstelle öffnen und den beschriebenen Befund suchen —
den Befund, nicht die Zeilennummer. Steht er nicht mehr an der Stelle, mit
`grep` nach dem Kern suchen (Funktionsname, Aufruf, Muster), bevor du ihn für
weg erklärst. Ein paar Zugriffe je Punkt, keine Tiefenanalyse.

| Urteil | Wann | Pflichtfelder |
| --- | --- | --- |
| `besteht` | Befund an der Stelle unverändert belegbar | `evidence`: `<pfad>:<zeile>: <zitierte Zeile>` |
| `verschoben` | Befund besteht, aber an anderer Stelle | `location`, bei mehreren Stellen `locations`, dazu `evidence` |
| `weg` | im Code nicht mehr belegbar: behoben, Datei gelöscht, Feature entfernt | `evidence`: was heute dort steht, oder dass die Datei fehlt |
| `ueberholt` | Code steht noch, aber Doku, Spec, ADR oder Proposal machen den Punkt gegenstandslos | `evidence`: die Quelle mit Pfad |
| `begruendung-veraltet` | nur bei `acknowledged`: Befund besteht, aber die `reason` trägt nicht mehr (»bis v2« und v2 ist da, genannte Frist verstrichen, der Umstand ist entfallen) | `evidence`: was sich geändert hat |
| `unklar` | du kannst es mit ein paar Zugriffen nicht entscheiden | `evidence`: woran es hängt |

`unklar` ist ein ehrliches Urteil, kein Versagen. Rate nicht zwischen `besteht`
und `weg` — der Orchestrator prüft `unklar` selbst.

## Ausgabe

Schreib die Urteile nach `verdicts-<n>.json` im Verzeichnis der Stapeldatei,
mit derselben Nummer:

```json
{ "verdicts": {
  "MEM-001": { "verdict": "verschoben", "location": "src/tiles/TileCache.ts:60", "evidence": "src/tiles/TileCache.ts:60: this.timer = setInterval(…)" },
  "DX-001":  { "verdict": "besteht", "evidence": "README.md:1-12: nur Titel und ein Satz, keine Setup-Schritte" }
} }
```

Der Schlüssel ist das Feld `key` des Punkts. Jeder Punkt des Stapels bekommt
genau ein Urteil.

Deine letzte Nachricht ist eine Zeile: Pfad der Urteilsdatei und die Zahl je
Urteil.

## Nicht

Nichts im Projekt ändern, kein `audit.html` öffnen, keine neuen Befunde
melden, keine Subagenten starten.
