# Changelog

Alle nennenswerten Änderungen an den Skills und den globalen Verhaltensanweisungen in diesem Repo werden hier dokumentiert. Neueste Einträge oben. Datumsformat: `YYYY-MM-DD`.

## 2026-07-10

### Hinzugefügt
- `global-behavior/CLAUDE.md`: Neue Verhaltensregel **„Gedankenbilder — privates analogisches Denken bei komplexer Arbeit"**. Bei komplexeren Coding-, Architektur- und Brainstorming-Sessions entwickelt Claude im Denkraum parallele Gedankenbilder (Scheibenwelt, Darkover, Vikings) zu dem, was gerade wirklich passiert. Privat per Default; besonders passende Bilder dürfen als kurzer Nebensatz oder als Code-Kommentar (max. einer pro Datei) geteilt werden. Gedacht wird in der Sprache des Users; die Fortschritts-Updates bleiben davon unberührt reine Scheibenwelt.
- **`scenario-tests/`**: Neues Verzeichnis (kein Skill) mit agent-ausgeführten Szenario-Tests für die Verhaltensanweisungen dieses Repos: `install-drift.md` (Drift-Check & Fremdinhalt-Schutz der INSTALL.md), `audit-followup.md` (Folgelauf-Logik des Audit-Skills mit Köderprojekt-Fixture `pixel-cart`) und `es-frequency.md` (deterministische Anteile der ES-Regel: Sperre, Baseline, Grenzen, Logbuch-Pflege). Repo-`CLAUDE.md` verdrahtet die Tests: nach Änderungen am jeweiligen Artefakt ist der zugeordnete Test auszuführen (auch als neuer Punkt in der Abschluss-Checkliste).
- `global-behavior/CLAUDE.md`: Sektion **„Kürzel-Befehle"** (`ci` = „commit this") aus der installierten Fassung in die Quelle zurückportiert — sie existierte bisher nur in `$HOME/.claude/CLAUDE.md` und wäre beim nächsten Update verloren gegangen.
- `js-ts-project-audit`: Neue Referenzdatei `references/report-rendering.md` mit der visuellen Spezifikation des Reports (Themes, Typografie, Severity-Farben, Score-Chart, Status-Badges). Die `SKILL.md` verweist an den Rendering-Stellen darauf und bleibt selbst bei Workflow und Entscheidungsregeln.

### Geändert
- `global-behavior/CLAUDE.md`: Die **Fortschritts-Updates** sind nicht mehr auf die Scheibenwelt beschränkt — Statusmeldungen dürfen jetzt zusätzlich im Stil der **Darkover**-Romane oder der TV-Serie **Vikings** formuliert werden (mit Beispiel-Analogien pro Welt). Innerhalb eines Arbeitsgangs bleibt es möglichst bei einer Themenwelt; die Namen folgen weiterhin den deutschen Übersetzungen/Synchronfassungen. Die Abgrenzung in der neuen Gedankenbilder-Regel wurde entsprechend nachgezogen (getrennte Kanäle statt Welt-Exklusivität).
- `global-behavior/CLAUDE.md`: Die **ES-Regel** ist jetzt an beobachtbare Bedingungen geknüpft (Session ungewöhnlich lang *oder* Kontext > ~50 % gefüllt; max. 1× pro Session; nie öfter als 1× in 2 Tagen) und führt ein **Logbuch** in `$HOME/.claude/🎈.md`: pro Auftritt Datum, Lage und ein knapper Kommentar. Die Kommentare dürfen aufeinander aufbauen — das Logbuch darf eine Geschichte erzählen. Einträge älter als ein Monat werden zu einer Zusammenfassung am Logbuch-Anfang verdichtet und entfernt.
- `global-behavior/INSTALL.md`: Der Update-Pfad macht vor dem Ersetzen des markierten Blocks jetzt einen **Drift-Check** — enthält der installierte Block Abweichungen, die nicht aus der Quelle stammen, wird der User gefragt (zurückportieren oder verwerfen), statt stillschweigend zu überschreiben.
- Repo-`CLAUDE.md`: Widersprüchliche Formulierung korrigiert — die globalen Verhaltensweisen werden als markierter Block in `$HOME/.claude/CLAUDE.md` eingebaut (gemäß `INSTALL.md`), nicht per Symlink/Kopie der ganzen Datei.
- `js-ts-project-audit`: Frontmatter-`description` auf Trigger-Bedingungen plus Output-Vertrag eingedampft (keine Workflow-Zusammenfassung mehr, damit Agents den Body wirklich lesen). Redundante Body-Sektion „Wann triggern" entfernt (Teilanalysen-Regel nach „Wichtige Prinzipien" verschoben) und eine kompakte **Ablauf-Übersicht** an den Anfang gestellt.
- `js-ts-project-audit`: Harness-spezifische Tool-Namen (`view`, `bash_tool`, `present_files`) durch werkzeugneutrale Formulierungen ersetzt — der Skill greift damit in jedem Host-Agent.
- `js-ts-project-audit`: Einbettungsformat der Report-Daten festgelegt: genau eine JSON-Insel `<script id="audit-data" type="application/json">`. Folgeläufe parsen primär diese Insel; ältere Einbettungsformate werden weiterhin best-effort akzeptiert.
- `global-behavior/INSTALL.md`: Backup vor Änderungen an `$HOME/.claude/CLAUDE.md` führt jetzt **zwei Generationen** (`CLAUDE.bak.md` + `CLAUDE.bak.prev.md`), damit zwei kurz aufeinanderfolgende Aktionen den Ausgangszustand nicht mehr vernichten.
- Repo-`CLAUDE.md`: Neue Abschluss-Checkliste **„Before finishing any change"** — Changelog-Eintrag, `name:`↔Verzeichnis-Sync und Install-Log werden vor dem Abschluss jeder Änderung explizit abgehakt statt nur als Prosa-Pflicht erinnert.
- `README.md`: Install-Beschreibung präzisiert — Symlinks gelten nur für Skills; das globale Verhalten wird als markierter Block in `~/.claude/CLAUDE.md` eingebaut.
- `global-behavior/CLAUDE.md`: ES-Frequenzregel nach Szenario-Test-Befund nachgeschärft — die beobachtbaren Bedingungen (Session lang / Kontext > 50 %) sind ausdrücklich **notwendig, nicht hinreichend**: eine Erlaubnis, keine Aufforderung. Der Erstlauf des Tests zeigte 5/5 Auftritte, sobald das erlaubte Fenster offen war; mit dem neuen Wording 0/5 (bei intakter Sperre, Baseline und Grenzen-Regel).

## 2026-06-04

### Hinzugefügt
- `global-behavior/CLAUDE.md`: Neue Verhaltensregel **„ES — der ganz seltene, verstörende Einbruch"**. Ganz selten (oft sessionübergreifend gar nicht) darf sich in eine kurze Statusmeldung ein mystisch-verstörender Beisatz im Stil von Stephen Kings *ES* schieben — ein rotes Luftballon-Emoji 🎈, eine winzige ASCII-Andeutung oder ein geflüsterter Halbsatz. Kurz, beiläufig, nie bedrohlich, ersetzt niemals echte Information und meidet angespannte/fehlerkritische Momente.
- `global-behavior/`: Neues Verzeichnis für globale Verhaltensanweisungen an Claude (kein Skill). Zentrales Artefakt ist `global-behavior/CLAUDE.md`, das per Symlink/Kopie als `CLAUDE.md` in `$HOME/.claude` installiert wird und projektübergreifend gilt. Erste Anweisung: Scheibenwelt-Stil für kurze Fortschritts-Updates.
- `global-behavior/INSTALL.md`: Anleitung für Claude zum Ein-/Ausbau der globalen Verhaltensweisen. Beschreibt jetzt korrekte Zielpfade (`$HOME/.claude/CLAUDE.md` sowie den `spinnerVerbs`-Key in `$HOME/.claude/settings.json`) und einen idempotenten Install-/Update-/Deinstall-Vorgang per markiertem Block, der fremde Inhalte beider Zieldateien unangetastet lässt. `global-behavior/settings.json` (mit den Scheibenwelt-/Darkover-/Vikings-`spinnerVerbs`) als Quelle ergänzt. Vor jeder Änderung an `$HOME/.claude/CLAUDE.md` wird zuerst ein Backup nach `$HOME/.claude/CLAUDE.bak.md` geschrieben.

### Geändert
- Repo-`CLAUDE.md`: Neuer Abschnitt **„Installing skills and behaviors for the user"**. Legt fest, dass „Skills installieren" das Symlinken der Skill-Verzeichnisse nach `$HOME/.agents/skills/` bedeutet (pro Skill ein Link, einzeln möglich), inklusive Backup gleichnamiger Fremd-Einträge nach `$HOME/.agents/skills--backupz/` und Deinstallation per Link-Entfernung. Verweist für Verhaltensweisen auf `global-behavior/INSTALL.md` und schreibt ein Protokoll in die (gitignorierte) `.install-history.md` vor.
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
