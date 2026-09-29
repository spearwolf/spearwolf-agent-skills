# Auto-Factory: Auslieferung und Laufzeit

> **Status:** Konzeptskizze, Brainstorming-Stand vom 2026-09-29. Baut auf [`concept-base.md`](concept-base.md) und [`drm-format.md`](drm-format.md) auf.
> **Frage:** Wie kommt die Factory in ein Projekt, ohne dass das Projekt ihre Regeln, Schemas und Scripts mit einchecken muss? Und wie wird sie gestartet?

## Kernthese

MCP oder Docker ist keine Entweder-oder-Frage. **MCP ist eine Schnittstelle, Docker ist eine Laufzeitumgebung**, und beides wird gebraucht. Den Kern bildet ein dritter Baustein: ein **Orchestrator als Programm**, der die Agent-Sessions startet. Ein MCP-Server kann nichts starten, er beantwortet nur Tool-Calls, die ihm jemand schickt.

## Drei getrennte Schichten

```
┌─────────────────────────────────────────────────────────┐
│ FACTORY-REPO (versioniert, z. B. v1.4.0)                  │
│ Konzeptdocs · Schemas · drm.base.yaml · Rollen-Prompts ·  │
│ Orchestrator-CLI · MCP-Server · Hooks · Image-Build       │
└───────────────┬─────────────────────────────────────────┘
                │ ausgeliefert als Package + Plugin + Image
                ▼
┌─────────────────────────────────────────────────────────┐
│ PROJEKT-REPO                                              │
│ .factory/  → nur projekteigene Daten + Versions-Pin       │
└───────────────┬─────────────────────────────────────────┘
                │ gemountet in
                ▼
┌─────────────────────────────────────────────────────────┐
│ RUNTIME                                                   │
│ Container: Orchestrator + Claude Code + Plugin + Toolchain│
└─────────────────────────────────────────────────────────┘
```

## Was im Projekt liegt: nur das Eigene

```
.factory/
  factory.lock            # pinnt die Factory-Version, wie ein Lockfile
  steering/
    directives.md
    drm.yaml              # extends: factory:base  ← aus der gepinnten Version aufgelöst, nicht kopiert
  masterplan/
  architecture/
  proposals/
  decisions/
  sprints/
.github/CODEOWNERS        # steering/ + masterplan/ → Architekt
```

Rollen-Prompts, Schemas, Basis-DRM und Scripts liegen **nicht** im Projekt, sie stecken in der gepinnten Factory-Version.

**Upgrades:** Ein Factory-Upgrade ist ein PR, der `factory.lock` ändert, bei Bedarf plus `factory migrate` für Schema-Änderungen. Das ist dasselbe Muster wie Renovate für Dependencies.

## Was die Factory ausliefert

| Artefakt | Aufgabe | Warum in dieser Form |
|---|---|---|
| **Orchestrator-CLI** (`factory`) | Koordinator-Loop, Sprint-State-Machine, Area Locks, Budgets, startet Agent-Sessions | Deterministisches gehört in Code, nicht in ein LLM |
| **Claude Code Plugin** | Rollen als Subagents (Planner, Implementer, Reviewer, Supervisor), Skills (Proposal schreiben, Masterplan lesen), Hooks | ein Paket, das Claude Code direkt versteht, per Version installierbar |
| **MCP-Server** (läuft im Orchestrator-Prozess außerhalb der Agent-Sandbox; das Plugin bindet ihn nur an) | einzige Schreibschnittstelle der Agents zum Factory-State außerhalb von `architecture/` | das eigentliche Guardrail, siehe unten |
| **Schemas + `drm.base.yaml`** | Validierung, `factory lint` | versioniert mit der Factory |
| **Base-Image / Devcontainer Feature** | reproduzierbare Laufzeit mit Isolation | siehe unten |

## Der Koordinator ist Code, kein LLM-Chat

Der Koordinator verwaltet Queue, Locks, Budgets, Verfallsfristen und Zustandsübergänge. Das sind Buchhaltung und State Machine, keine Urteilsfragen. Eine LLM-Session würde beim 40. Sprint vergessen, dass `auth/` gelockt ist.

**Regel: Deterministisches in Code, Urteil ins Modell.** Der Orchestrator ruft das Modell nur dort auf, wo wirklich geurteilt werden muss: Audit-Befunde bewerten, Kandidat-Sprints formulieren, Grenzfälle klassifizieren.

Die Agent-Sessions startet der Orchestrator headless, über das Claude Agent SDK oder `claude -p`. Jede Rolle bekommt eigenes Modell, eigenen Effort und eigene Tools.

## MCP als Schranke, nicht als Starter

Agents ändern Factory-State **nicht** durch freies Editieren von YAML- oder Markdown-Dateien. Sie rufen schmale Tools auf, die die Invarianten erzwingen:

| Tool | Erzwingt |
|---|---|
| `drm.classify(diff)` | Klasse, Zelle, Modus, deterministisch ausgewertet |
| `decision.record(...)` | Schema, DRM-Version, Verfallsfrist bei `provisional` |
| `backlog.add(...)` | `discovered-in` und Evidenz |
| `inbox.ask(...)` | Fragenbudget; Silent Consent nur für two-way doors |
| `sprint.park(issue, reason)` | Parken des abhängigen Teilgraphen mit Diagnose |
| `proposal.draft(...)` | Lifecycle-Status `draft`; Accept bleibt beim Architekten bzw. im freigegebenen Rahmen des Koordinators |
| `policy.propose(patch, rationale)` | stagt eine Änderung an `masterplan/`, `steering/` oder der DRM auf einem Review-Branch und öffnet einen PR; aktiv wird sie erst durch den Merge des Architekten |

**Direkt schreiben dürfen Agents** nur Projektcode und `.factory/architecture/` (Ist-Beschreibung, siehe [`concept-base.md`](concept-base.md)). Alles andere unter `.factory/` ist MCP-verwalteter State, auch `decisions/`, `sprints/`, Backlog und Inbox. Sonst könnte ein Agent mit Bash-Zugriff Schemas, Budgets und Verfallsfristen einfach umgehen.

Ein Tool, das Masterplan oder Steering *aktiv* schreibt, gibt es nicht. Agents können Policy-Änderungen nur über `policy.propose` als PR vorschlagen. Der Schutz ist dreifach geschichtet:

1. **Laufzeit:** Der Agent-Container bekommt `.factory/` read-only gemountet, einzig `architecture/` ist beschreibbar. Schreibrechte auf den State hat nur der MCP-Server, der außerhalb der Agent-Sandbox im Orchestrator-Prozess läuft. Damit greift der Schutz auch bei Bash, nicht nur bei Edit-Tools.
2. **Hook im Plugin:** blockiert direkte Edits auf `.factory/**` außer `architecture/` schon vorher mit einer verständlichen Meldung. Er ist die Komfortschicht, die Durchsetzung liegt beim Mount.
3. **Repo:** `CODEOWNERS` und Branch Protection auf `masterplan/` und `steering/`, nur der Architekt merged dort.

## Docker als Laufzeit, nicht als Wahrheitsquelle

Isolation ist ab dem ersten autonomen Lauf Pflicht: Agents, die ohne Rückfrage Bash ausführen, gehören in einen Container.

**Fertige Dev-Images pro Projekt** scheitern an der Toolchain. Projekt A braucht Node 22, Projekt B Rust plus Postgres, und die Factory kann nicht alle Stacks mitliefern. Deshalb kommt die Factory **als Schicht**:

- **Devcontainer Feature** `factory`: installiert CLI, Claude Code und Plugin in jeden bestehenden Devcontainer. Das Projekt behält seine Toolchain.
- **Oder ein Base-Image**, von dem das Projekt ableitet: `FROM factory-base:1.4` plus eigene Toolchain.

Das Image transportiert die Factory nur. Die Regeln kommen aus der gepinnten Version.

## Start und Bedienung

```bash
factory init                 # legt .factory/ an, Masterplan-Gerüst, DRM mit extends, CODEOWNERS-Vorschlag
factory lint                 # validiert alles gegen die Schemas der gepinnten Version
factory sprint plan --from proposals/P-012.md
factory sprint run S-042     # ein Sprint, bis DoD oder Budget
factory coordinate           # Dauerloop: Audits, Queue, Sprints
factory inbox                # Architekt: offene Entscheidungen, gebündelt
```

`factory coordinate` läuft im Container. Wo dieser Container läuft, lokal, als geplanter CI-Job oder in der Cloud, entscheidet ein **Runtime-Adapter** im Orchestrator. Für den Anfang reicht lokal.

## MVP-Reihenfolge

1. **Schemas + `factory lint`:** billig, und alles Weitere validiert dagegen.
2. **Plugin mit Rollen-Agents + Schutz-Hooks:** interaktiv testbar, noch ohne Autonomie.
3. **`factory sprint run` für einen einzelnen Sprint** im Container, mit Supervisor und Eskalationsleiter.
4. **MCP-Gate + read-only Mount von `.factory/`:** sobald Agents Decision Records und Backlog-Einträge schreiben.
5. **`factory coordinate`:** erst wenn einzelne Sprints zuverlässig durchlaufen. Eine Schleife über wackelige Sprints verstärkt nur das Wackeln.

## Offene Punkte

- **Eigenes Repo:** `auto-factory/` liegt derzeit im Skills-Repo, das ausdrücklich keine Build-Pipeline hat. Sobald Code dazukommt, zieht die Factory in ein eigenes Repo.
- **Laufzeit-State:** Dauerhafte Artefakte (Decisions, Sprints) liegen in git. Wo flüchtiger State wie Locks und laufende Sessions liegt (lokale DB, eigener Branch), ist offen.
- **Kanal der Decision Inbox:** CLI, GitHub Issues/PR-Kommentare oder ein Dashboard.
- **Sprache und Paketformat** des Orchestrators (npm, pip, Single Binary).
