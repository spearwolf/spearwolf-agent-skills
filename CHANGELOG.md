# Changelog

Alle nennenswerten Änderungen an den Skills und den globalen Verhaltensanweisungen in diesem Repo werden hier dokumentiert. Neueste Einträge oben. Datumsformat: `YYYY-MM-DD`.

## 2026-06-04

### Hinzugefügt
- `global-behavior/`: Neues Verzeichnis für globale Verhaltensanweisungen an Claude (kein Skill). Zentrales Artefakt ist `global-behavior/CLAUDE.md`, das per Symlink/Kopie als `CLAUDE.md` in `$HOME/.claude` installiert wird und projektübergreifend gilt. Erste Anweisung: Scheibenwelt-Stil für kurze Fortschritts-Updates.

### Geändert
- Repo-`CLAUDE.md`: Dokumentiert jetzt den zweiten Artefakttyp (globale Verhaltensanweisungen) neben Skills, inkl. eigenem Abschnitt zum `global-behavior`-Verzeichnis und der Regel, dass Aussagen über Claudes „Verhalten/Verhaltensweisen" auf `global-behavior/CLAUDE.md` zielen. Die Changelog-Pflicht gilt nun ausdrücklich auch für Änderungen an den globalen Verhaltensanweisungen.

## 2026-06-01

### Hinzugefügt
- `js-ts-project-audit`: **Anhang "Akzeptierte / zurückgestellte Punkte"**. Der Nutzer kann per Konversations-Anweisung einzelne Findings künftig aus dem Backlog ausblenden, ohne dass sie als "gelöst" gelten. Solche Punkte wandern mit Begründung und Datum in eine persistente `acknowledged`-Liste, erscheinen nur noch im Anhang (gedämpft, ohne Score-Gewicht) und werden bei Folgeläufen nicht erneut als Finding aufgeführt — bis der Nutzer sie ausdrücklich widerruft.

### Geändert
- `js-ts-project-audit`: Der carry-over-Re-Check (Diff-Lauf) prüft jetzt nicht nur die Code-Stelle, sondern auch den **Kontext** — geänderte Architektur/Docs/Specs/Proposals/Roadmap. Wird ein übernommener Punkt dadurch gegenstandslos, fällt er komplett raus (mit Quellenangabe), statt unreflektiert weitergeschleppt zu werden.
- `js-ts-project-audit`: Neues Leitprinzip **„Schlank statt historisch"**. Als geklärt/umgesetzt/erledigt markierte Punkte — ob vom Lauf verifiziert oder vom Nutzer benannt — fallen komplett aus dem Report (kein Status-Badge, keine Archiv-Tabelle), nur als Diff-Zähler zusammengefasst. Das Audit zeigt den aktuellen Zustand, keine Projekthistorie; einzige Ausnahmen sind der Score-Verlaufsgraph und der Anhang akzeptierter Punkte. Die Anweisungen „erledigt" (→ verifizieren & entfernen) und „akzeptabel" (→ Anhang) werden explizit getrennt.

## 2026-05-14

### Geändert
- `js-ts-project-audit`: Diff/Merge-Modus gegen vorhandenes `./audit.html` ergänzt. Alte Datei wird beim Audit ignoriert, danach abgeglichen. Behobene Findings entfallen, verbesserte werden als `improved` mit `previousSeverity` markiert, nicht erwähnte Punkte nur nach Re-Check im Code übernommen. Backlog bekommt Status-Badges und Score-Delta im Header.
- `js-ts-project-audit`: Report enthält jetzt ein **Projektportrait** vor der Executive Summary — Kurzbeschreibung (2–4 Sätze), 3–7 fachliche Domänen mit Pfaden, optional ein Inline-SVG/ASCII-Architekturdiagramm wenn es Mehrwert bringt (kein Mermaid, keine externen Libs).
- `js-ts-project-audit`: **Health-Score-Verlauf** wird über Folgeläufe persistiert. Ab dem 2. Audit erscheint Score-Delta mit Tendenz-Indikator (▲/▼/–) im Header; ab dem 3. Audit zusätzlich ein Inline-SVG-Liniendiagramm des Verlaufs (max. 20 Punkte, FIFO). Die Historie lebt im eingebetteten Daten-Objekt der `./audit.html`; ältere Audits ohne `scoreHistory` werden aus Altscore+Altdatum als einzelner Punkt rekonstruiert.
- `js-ts-project-audit`: **Theme-Steuerung** explizit. Default ist ein helles, dezent-professionelles Light-Theme mit eleganter Typografie. Nutzeranweisung (z. B. "dark theme") überschreibt; ohne Anweisung wird das Theme des vorherigen Audits übernommen, sonst Light. `prefers-color-scheme` entfällt — das Theme wird fix ausgeliefert und in `summary.theme` persistiert.

### Hinzugefügt
- `CLAUDE.md` im Repo-Root: Onboarding für Claude-Code-Sessions, beschreibt Skill-Struktur, Sprach-Split (EN-Frontmatter / DE-Body) und lokale Konventionen.
- `CHANGELOG.md` eingeführt; `CLAUDE.md` verpflichtet jede Skill-Änderung zur synchronen Pflege des Changelogs.
