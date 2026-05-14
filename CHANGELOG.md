# Changelog

Alle nennenswerten Änderungen an den Skills in diesem Repo werden hier dokumentiert. Neueste Einträge oben. Datumsformat: `YYYY-MM-DD`.

## 2026-05-14

### Geändert
- `js-ts-project-audit`: Diff/Merge-Modus gegen vorhandenes `./audit.html` ergänzt. Alte Datei wird beim Audit ignoriert, danach abgeglichen. Behobene Findings entfallen, verbesserte werden als `improved` mit `previousSeverity` markiert, nicht erwähnte Punkte nur nach Re-Check im Code übernommen. Backlog bekommt Status-Badges und Score-Delta im Header.
- `js-ts-project-audit`: Report enthält jetzt ein **Projektportrait** vor der Executive Summary — Kurzbeschreibung (2–4 Sätze), 3–7 fachliche Domänen mit Pfaden, optional ein Inline-SVG/ASCII-Architekturdiagramm wenn es Mehrwert bringt (kein Mermaid, keine externen Libs).

### Hinzugefügt
- `CLAUDE.md` im Repo-Root: Onboarding für Claude-Code-Sessions, beschreibt Skill-Struktur, Sprach-Split (EN-Frontmatter / DE-Body) und lokale Konventionen.
- `CHANGELOG.md` eingeführt; `CLAUDE.md` verpflichtet jede Skill-Änderung zur synchronen Pflege des Changelogs.
