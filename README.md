# spearwolf-agent-skills

Eine kleine, sehr persönliche Sammlung von **Claude-Code-Skills** und
**globalen Verhaltensanweisungen** für Claude. Kein npm-Paket, kein Build, keine
Tests, keine Doku-Website — nur Markdown, das andere Agents lesen und befolgen.

Stell es dir vor wie die Bibliothek der Unsichtbaren Universität: ein bisschen
chaotisch, gelegentlich gefährlich, und der Bibliothekar sagt zu allem nur
„Ugh". Aber irgendwo zwischen den Regalen steht etwas Brauchbares.

## Was du hier findest

- **Skills** — jeweils ein Verzeichnis mit einer `SKILL.md`. Ein Agent lädt so
  einen Skill bei Bedarf und bekommt damit Workflow-Wissen für eine bestimmte
  Aufgabe. Aktuell wohnt hier:
  - [`js-ts-project-audit`](./js-ts-project-audit/) — auditiert ein
    JavaScript/TypeScript-Projekt ganzheitlich und schreibt einen
    eigenständigen HTML-Report nach `./audit.html`.
- **[`global-behavior/`](./global-behavior/)** — *kein* Skill, sondern
  Anweisungen dazu, wie sich Claude generell verhalten soll (z. B.
  Fortschritts-Meldungen im Scheibenwelt-Stil, eine Sammlung absurder
  Spinner-Sprüche). Wird, anders als Skills, projektübergreifend aktiv.

## Etwas davon lokal nutzen?

Ganz einfach: **bitte Claude Code höflich darum.** Mehr braucht es nicht.

> „Installier mir bitte den Skill `js-ts-project-audit`."
> „Bau bitte die globalen Verhaltensweisen ein."
> „Entferne den Skill wieder."

Claude weiß, wo die Anleitungen liegen ([`CLAUDE.md`](./CLAUDE.md) für Skills,
[`global-behavior/INSTALL.md`](./global-behavior/INSTALL.md) für das Verhalten),
legt für Skills Symlinks an, baut das Verhalten als markierten Block in
`~/.claude/CLAUDE.md` ein (plus die Dateien, die dieser Block bei Bedarf
nachlädt), sichert Backups, räumt wieder auf und führt sogar Protokoll. Carrot würde es nicht höflicher machen.

## Eine ehrliche Warnung

Das hier ist **extrem opinionated**, erhebt keinerlei Anspruch auf Perfektion,
ist vermutlich völlig unsinnig und an mehr als einer Stelle nicht zu Ende
gedacht. Benutzung auf eigene Gefahr, etwa so wie man Magie an der UU benutzt:
es funktioniert meistens, und wenn nicht, war es bestimmt lehrreich.

Wer trotzdem etwas verbessern oder — wider besseres Wissen — sogar mitwirken
möchte: **herzlich willkommen.** Issues, PRs, kluge Gedanken, böse Kommentare
(schwarzer Humor bevorzugt) sind allesamt gern gesehen.

## Warum ist hier alles zweisprachig?

Mit voller Absicht. Frontmatter-Beschreibungen sind **englisch** (damit Agents
sie überall finden), die eigentlichen Anweisungen **deutsch**. Der Grund ist
schlicht: Der Autor hat zwar täglich mit englischen Artikeln,
Programmiersprachen und Fachwörtern zu tun — als introvertierter Entwickler und
Denker spricht er aber eher wenig Englisch. Gedacht wird auf Deutsch, und das
wird sich auch nicht ändern.

Eigentlich ist das sogar ein Vorteil: Wenn sich ein AI-Agent erst einen Reim auf
die zusammengewürfelten Sprachfetzen aus dem wirren Verstand eines Entwicklers
machen muss, *bevor* er sich der eigentlichen Anweisung widmet — dann hat er
schon mal geübt, mit der Realität klarzukommen. DER TOD würde sagen: GUTE
ÜBUNG.

## External Links

- [Lessons from building Claude Code: How we use skills](https://claude.com/blog/lessons-from-building-claude-code-how-we-use-skills)

---

*P. S. — Ja, das sind Terry-Pratchett-Anspielungen. Ist ein Weilchen her, dass
ich die Bücher gelesen habe, aber GNU Terry Pratchett.*
