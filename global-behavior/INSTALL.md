# INSTALL — globale Verhaltensweisen ein-/ausbauen

Diese Datei ist eine Anleitung **für Claude**. Wenn der User darum bittet, die
globalen Verhaltensweisen aus diesem `global-behavior/`-Verzeichnis zu
**installieren**, zu **aktualisieren** oder zu **deinstallieren**, führe die
unten beschriebenen Schritte aus.

Alle Pfade dieses Verzeichnisses sind relativ zu `global-behavior/`. Die
beiden Quell-Artefakte sind:

| Quelle (in diesem Repo)        | Ziel (im Home des Users)      | Art des Einbaus                          |
| ------------------------------ | ----------------------------- | ---------------------------------------- |
| `global-behavior/CLAUDE.md`    | `$HOME/.claude/CLAUDE.md`     | markierter Block innerhalb der Zieldatei |
| `global-behavior/settings.json` (Key `spinnerVerbs`) | `$HOME/.claude/settings.json` | einzelner JSON-Key wird gemerged         |

Wichtig: Beide Zieldateien können **weitere, fremde Inhalte** des Users
enthalten (andere Anweisungen in der `CLAUDE.md`, andere Keys in der
`settings.json`). Diese dürfen beim Ein- und Ausbau **niemals** verändert oder
gelöscht werden. Verändere ausschließlich den eigenen, klar abgegrenzten
Bereich.

## Der markierte Block in `$HOME/.claude/CLAUDE.md`

Damit Installieren, Aktualisieren und Deinstallieren eindeutig und
wiederholbar sind, wird der Inhalt von `global-behavior/CLAUDE.md` in der
Zieldatei in einen mit HTML-Kommentaren markierten Block eingeschlossen:

```markdown
<!-- BEGIN spearwolf-global-behavior -->
… kompletter Inhalt von global-behavior/CLAUDE.md …
<!-- END spearwolf-global-behavior -->
```

Über genau diese beiden Marker findest du den Block beim Aktualisieren und
Entfernen wieder.

## Installieren / Aktualisieren

Installieren und Aktualisieren sind derselbe, idempotente Vorgang: Vorhandenes
ersetzen, sonst neu anlegen.

### 1. `CLAUDE.md` einbauen

**Backup zuerst:** Bevor du `$HOME/.claude/CLAUDE.md` in irgendeiner Weise
änderst, sichere ihren aktuellen Inhalt nach `$HOME/.claude/CLAUDE.bak.md`
(vorhandenes Backup darf überschrieben werden). Existiert die Zieldatei noch
gar nicht, entfällt das Backup.

1. Lies `global-behavior/CLAUDE.md` (die Quelle).
2. Existiert `$HOME/.claude/CLAUDE.md` noch nicht, lege sie an und schreibe dort
   nur den markierten Block (siehe oben) hinein. Fertig.
3. Existiert sie schon, prüfe in dieser Reihenfolge:
   - **Marker vorhanden** (`<!-- BEGIN spearwolf-global-behavior -->` …
     `<!-- END spearwolf-global-behavior -->`): Ersetze alles zwischen den
     Markern (inklusive der Marker) durch einen frisch erzeugten Block mit dem
     aktuellen Quellinhalt.
   - **Kein Marker, aber Alt-Inhalt vorhanden** (eine frühere, noch
     unmarkierte Installation — erkennbar an der Überschrift
     `# Globale Verhaltensanweisungen` bzw. `## Scheibenwelt-Stil für
     Fortschritts-Updates`): Ersetze diesen alten Abschnitt durch den neuen
     markierten Block. So bleibt kein doppelter Inhalt zurück.
   - **Nichts davon vorhanden**: Hänge den markierten Block am Ende der Datei
     an (durch eine Leerzeile von vorhandenem Inhalt getrennt).
4. Alle übrigen Zeilen der Datei bleiben unangetastet.

### 2. `spinnerVerbs` einbauen

1. Lies den Key `spinnerVerbs` aus `global-behavior/settings.json` (die Quelle).
2. Existiert `$HOME/.claude/settings.json` noch nicht, lege sie als gültiges
   JSON-Objekt mit nur diesem einen Key an.
3. Existiert sie schon, parse sie als JSON und **setze/ersetze** ausschließlich
   den Key `spinnerVerbs` mit dem Wert aus der Quelle. Alle anderen Keys
   (`permissions`, `hooks`, `model`, `env`, …) bleiben exakt erhalten.
4. Schreibe die Datei als gültiges, eingerücktes JSON zurück.

## Deinstallieren / Zurücksetzen

Wenn die globalen Verhaltensweisen nicht mehr aktiv sein sollen:

### 1. `CLAUDE.md` zurückbauen

**Backup zuerst:** Auch hier gilt — sichere `$HOME/.claude/CLAUDE.md` nach
`$HOME/.claude/CLAUDE.bak.md`, bevor du etwas entfernst.

- Marker vorhanden: Entferne alles zwischen `<!-- BEGIN spearwolf-global-behavior -->`
  und `<!-- END spearwolf-global-behavior -->` **inklusive** der beiden Marker.
  Räume dabei eine dadurch entstehende doppelte Leerzeile auf.
- Kein Marker, aber Alt-Inhalt (Überschrift `# Globale Verhaltensanweisungen` /
  `## Scheibenwelt-Stil für Fortschritts-Updates`): Entferne genau diesen
  Abschnitt.
- Bleibt die Datei danach leer, kann sie gelöscht werden. Enthält sie noch
  fremden Inhalt, bleibt dieser unverändert stehen.

### 2. `spinnerVerbs` zurückbauen

- Parse `$HOME/.claude/settings.json`, entferne **nur** den Key `spinnerVerbs`
  und schreibe das übrige JSON unverändert zurück. Alle anderen Keys bleiben
  erhalten.

## Hinweise

- Bevor du eine Zieldatei änderst, lies sie zuerst, damit du fremde Inhalte
  erkennst und bewahrst.
- `settings.json` muss nach jeder Änderung **gültiges JSON** sein — niemals mit
  einem kaputten Zustand zurückschreiben.
- Nimm die Änderung als Diff/Edit vor und zeige dem User kurz, was sich geändert
  hat, statt die Dateien blind zu überschreiben.
