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
  - [`js-ts-audit-remediation`](./js-ts-audit-remediation/) — arbeitet die
    Findings aus so einem Audit ab: Umsetzungsplan nach
    `./remediation-plan.md`, ein Commit pro Paket, am Ende die
    Semver-Bewertung. Die Pakete fährt `scripts/remediate.sh` in einer
    abgelösten tmux-Session: die Planung jedes
    Pakets läuft im Terminal und kann nachfragen, die Umsetzung läuft ohne
    Aufsicht. Wie das aussieht, zeigt
    [`runner-topologie.html`](./js-ts-audit-remediation/runner-topologie.html)
    — im Browser öffnen, es ist eigenständig.
  - [`audit-github-sync`](./audit-github-sync/) — gleicht das Backlog aus
    so einem Audit mit den Issues eines GitHub-Repos ab, in beide Richtungen:
    Findings werden zu englischen, für sich stehenden Issues mit Labels, und
    was auf GitHub passiert — geschlossen, abgelehnt, kommentiert — kommt in
    den Report zurück.
  - [`testing-on-mac-safari`](./testing-on-mac-safari/) — Ein extrem nützlicher
    Skill, der beim Testen von Webanwendungen auf macOS/Safari und auch dem iOS-Simulator hilft.
    Er bedient sich dabei einem im lokalen Netzwerk befindlichen Mac mit `ssh` Zugang.
  - [`deconstruct-graphics-pipeline`](./deconstruct-graphics-pipeline/) —
    bekommt ein Referenzbild, einen Screenshot oder die URL einer Demo und
    zerlegt den Look in die Pipeline dahinter: Render-Passes, Geometry,
    Materials, Lighting, Post-Processing. Jeder Befund nennt das Indiz im
    Bild, an dem er hängt, und trägt seine Konfidenz offen. Heraus kommt eine
    `./graphics-pipeline-analysis.md` mit einer nach Wirkung sortierten
    Roadmap für Browser, WebGPU und three.js.
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

### Claude Desktop

Claude Desktop kennt keine Symlinks, es lädt Skills als ZIP hoch. Das Archiv
baut man sich in einer Zeile — im Repo-Wurzelverzeichnis, `<skill>` durch den
Verzeichnisnamen ersetzt:

```bash
zip -r -X <skill>.zip <skill> -x '*/.*'
```

Im Archiv liegt dann der Skill-Ordner mit seiner `SKILL.md` obenauf, genau so
will es der Upload. Danach in Claude Desktop: **Settings → Capabilities →
Skills → Upload skill**, ZIP auswählen, fertig. Die `.zip`-Dateien sind
gitignored — sie sind Build-Ergebnis, keine Quelle.

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
