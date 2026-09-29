# Auto-Factory: Konzeptbasis

> **Status:** Konzeptskizze, Brainstorming-Stand vom 2026-09-29. Noch keine Implementierung, keine verbindlichen Formate.
> **Scope:** Autonome Software-Factory aus Agents, die Sprints plant, abarbeitet, auditiert und daraus neue Sprints erzeugt, gesteuert von menschlichen »Architekten der Matrix«.

## Kernthese

Die Agents fahren, die Architekten legen die Gleise.

Code, Pläne und Backlog dürfen Agents frei verändern. Masterplan, Direktiven und Entscheidungsrechte gehören dem Menschen. Wenn diese Trennlinie hält, kann die Pipeline fast immer weiterlaufen, ohne Unsinn zu entscheiden. Das eigentliche Guardrail-Thema ist damit keine Frage von Permissions oder Sandbox, sondern der Form, in der Architektur, Proposals und Festlegungen das Projekt beschreiben.

## 1. Ebenenmodell

```
┌──────────────────────────────────────────────┐
│  ARCHITEKT DER MATRIX (Mensch)                │
│  Direktiven · Prioritäten · Masterplan ·      │
│  Proposal-Accept · Veto · Autonomy Dial       │
└───────┬──────────────────────────▲───────────┘
 steering/ (git) │                 │ Briefing + Decision Inbox
        ▼                          │
┌──────────────────────────────────────────────┐
│  KOORDINATOR                                  │
│  Sprint-Queue · Priorisierung · Area Locks ·  │
│  Post-Sprint-Audits · Budget · Dämpfer        │
└───────┬──────────────────────────▲───────────┘
 Sprint-Charter  │                 │ Sprint-Report + Decision Records
        ▼                          │
┌──────────────────────────────────────────────┐
│  SPRINT                                       │
│  Supervisor (Scope Gate, Eskalationsleiter)   │
│   Planner → Implementer ⇄ Reviewer            │
└──────────────────────────────────────────────┘
```

Jede Ebene kommuniziert mit der nächsten ausschließlich über **Artefakte im Repo**, nicht über Chat. Damit ist alles in git versioniert und reviewbar, und jeder Agent kann einen Lauf abbrechen und später wiederaufnehmen.

## 2. Dokumente als Gleise

Der Masterplan darf nicht gleichzeitig beschreiben, *was besteht* und *was kommen darf*:

- **Deskriptiv** (Ist-Zustand): driftet ständig, Agents pflegen ihn.
- **Normativ** (Rails): ändert nur der Architekt.

Mischt man beides in einem Dokument, verändert ein Agent beim Aktualisieren der Ist-Beschreibung versehentlich die Rails. Deshalb getrennte Artefakte:

| Artefakt | Inhalt | Schreibt | Accepted |
|---|---|---|---|
| `masterplan/` | Invarianten, erlaubte Evolutionspfade, verbotene Zonen, **explizit offene Fragen** | Architekt; Agents nur als PR-Vorschlag | nur Architekt |
| `architecture/` | Ist-Zustand: Module, Datenflüsse, Abhängigkeiten | Agents | Reviewer-Agent; Audit prüft Drift |
| `proposals/` | Feature-Beschreibung, Lifecycle `draft → accepted → planned → active → done/superseded` | Architekt oder Agents (z. B. aus Audits) | Architekt, oder Koordinator innerhalb eines vorab freigegebenen Rahmens |
| `steering/directives.md` | Ziele, Prioritäten, Horizonte, Budgets | nur Architekt | — |
| `sprints/<id>/charter.md` | Sprint-Ziel, Definition of Done, Scope-Regeln, Budget | Koordinator | automatisch, gegen Direktiven geprüft |
| `decisions/` | Decision Records (ADR-artig), Status `final` / `provisional` / `overridden` | Agents | Architekt bei `provisional` |

### Regeln, die daraus mehr als Doku machen

1. **Regel-IDs und Zitierpflicht.** Jede Masterplan-Regel trägt eine ID (`MP-DATA-03: Keine direkten DB-Zugriffe außerhalb von /repo`). Jede Agent-Entscheidung nennt die Regel, die sie deckt. Findet der Agent keine, ist das automatisch ein Eskalationsfall. Ein Beleg ist Pflicht, eine Begründung allein reicht nicht.
2. **Pflicht zur »Offen«-Zone.** Der Masterplan listet ausdrücklich, was noch *nicht* entschieden ist (»Auth-Modell für Multi-Tenant: offen«). Ohne diese Liste hält ein Agent jede Lücke für einen Freifahrtschein.
3. **Harte Durchsetzung.** `CODEOWNERS` auf `masterplan/` und `steering/`, Branch Protection, nur der Architekt merged dort. Der Schutz der Rails hängt dann an Repo-Mechanik, nicht daran, dass ein Agent seinen Prompt befolgt.

## 3. Entscheidungsrechte

### Wer entscheidet, ob der Agent entscheidet

Nicht der Agent, der entscheiden will: Der Implementer hat einen Interessenkonflikt, denn er will fertig werden. Der **Supervisor** klassifiziert jede nicht-triviale Entscheidung nach einer festen Policy. Die Klassifikation wird geloggt, und der Architekt kann sie im Nachhinein auditieren.

### Klassifikation über zwei Achsen

| | **Two-way door** (billig revertierbar, lokal) | **One-way door** (Public API, Datenschema, Dependencies, Security-Modell) |
|---|---|---|
| **Von einer Regel gedeckt** | autonom, Regel-ID zitieren | autonom, Regel-ID zitieren, Reviewer bestätigt |
| **Innerhalb der Rails, nicht explizit** | **decide-and-flag**: `provisional` Decision Record, weiterarbeiten | reversible Alternative wählen (Feature Flag, Adapter, Interface statt Implementierung); gibt es keine: **parken** |
| **Außerhalb der Rails / »Offen«-Zone** | parken + Proposal-Draft | parken + Eskalation |

Die projektspezifische Ausprägung dieser Matrix, also Entscheidungsklassen, Signale, Area-Modifikatoren und harte Invarianten, beschreibt [`drm-format.md`](drm-format.md).

Ist die Klassifikation unsicher, stuft der Supervisor eine Stufe strenger ein (fail closed). Das bleibt billig, weil Parken lokal ist (siehe unten).

### Mechanismen gegen Stillstand

- **Decide-and-flag:** Der Agent entscheidet vorläufig, dokumentiert und arbeitet weiter. Der Architekt reviewt asynchron. Kippt er die Entscheidung, erzeugt der Koordinator automatisch einen Korrektur-Sprint. Das Risiko liegt in einem Revert, nicht in einem Stillstand.
- **Park, don't stop:** Geparkt wird nur der abhängige Teilgraph, also das Issue und was davon abhängt. Der Rest des Sprints läuft weiter. Steht ein Sprint komplett, hing sein ganzes Ziel an einer offenen Frage. Das ist ein Planungsfehler und ein Befund für das Audit.

### Entscheidungsschulden

`provisional`-Entscheidungen sammeln sich an. Jede bekommt deshalb eine **Verfallsfrist**. Nach deren Ablauf legt der Koordinator sie dem Architekten gebündelt vor, und neue Arbeit darf nicht mehr darauf aufbauen.

## 4. Sprint

### Sprint-Typen

- **Issue-Sprint:** arbeitet eine Sammlung bestehender Issues unter einem gemeinsamen Ziel ab.
- **Proposal-Sprint:** Detailplanung und Umsetzung aus einem oder mehreren `accepted` Proposals.
- **Korrektur-Sprint:** entsteht aus einem Override oder Audit-Befund, eng begrenzt.

Jeder Sprint hat eine **Charter** mit Ziel **und Definition of Done**. Ohne DoD kann der Scope Gate »blockiert das Ziel« nicht prüfen.

### Rollen

- **Planner:** zerlegt Issues bzw. Proposals in Arbeitspakete, prüft gegen die Rails.
- **Implementer:** setzt um.
- **Reviewer:** prüft Code, Rail-Konformität und Zitierpflicht.
- **Supervisor:** steuert Review/Fix-Loops, klassifiziert Entscheidungen, betreibt den Scope Gate, passt Modell und Effort an.

### Scope Gate für neu entdeckte Issues

1. **Regression, die dieser Sprint verursacht hat:** immer im Sprint.
2. **Blockiert das Sprint-Ziel:** im Sprint, sofern der Fix innerhalb der Rails liegt; sonst parken.
3. **Boy-Scout-Klausel:** trivial, in bereits berührten Files, unter dem Budget-Deckel (z. B. max. 15 % des Sprint-Budgets für alle Beifänge zusammen). Dann im Sprint.
4. **Alles andere:** ins Backlog, mit `discovered-in: <sprint-id>`, Evidenz und Einschätzung.

### Eskalationsleiter für Review/Fix-Loops

```
Fix-Runde 1–2 (gleiche Config)
  → Effort hoch (medium → high → xhigh)
    → Modell hoch (Sonnet → Opus → Fable)
      → Re-Plan: vielleicht ist die Spec falsch, nicht der Code
        → Issue parken mit Diagnose
```

Circuit Breaker:

- **Gleicher Finding zweimal:** kein weiterer Retry, sondern Ursachenanalyse.
- **Budget pro Issue und pro Sprint:** harte Obergrenze.

## 5. Koordinator

### Aufgaben

1. **Sprint-Queue befüllen** aus drei Quellen: Backlog, `accepted` Proposals, Audit-Befunde.
2. **Priorisieren** gegen `steering/directives.md`. Jeder Kandidat-Sprint referenziert eine Direktive oder eine Masterplan-Regel, sonst wird er nicht eingeplant.
3. **Area Locks:** Parallele Sprints auf überlappenden Modulen werden serialisiert.
4. **Post-Sprint-Audit** nach jedem Sprint:
   - Ziel erreicht, DoD erfüllt?
   - Rail-Verletzungen (Masterplan-Konformität)?
   - Doc-Drift (`architecture/` gegen Code)?
   - Neue oder abgelaufene `provisional` Decisions?
   - Backlog-Triage: Duplikate, Veraltetes, Cluster, die einen Sprint ergeben

### Dämpfer gegen die Audit-Schleife

Audits erzeugen Sprints, Sprints erzeugen Audits. Ohne Dämpfer baut sich die Factory ein Perpetuum mobile aus Refactorings.

- **Kapazitätsdeckel:** Audit-generierte Sprints bekommen z. B. max. 30 % der Kapazität, den Rest bestimmen Direktiven.
- **Abklingende Audits:** Das Audit eines audit-generierten Sprints prüft nur auf Regressionen und erzeugt keine neue Arbeit.
- **Neuheitspflicht:** Ein Befund, der schon im Backlog steht, erzeugt keinen neuen Sprint.

## 6. Schnittstelle Architekt ↔ Koordinator

Die Aufmerksamkeit des Architekten ist die knappste Ressource im System. Der Koordinator behandelt sie wie Budget: Die Zahl der Fragen pro Zeitraum ist begrenzt, und jede Frage muss sich lohnen.

### Input (Architekt → Koordinator), als Dateien in `steering/`

- **Direktiven:** Ziel, Priorität, Horizont, Erfolgskriterium, Budget.
- **Priorisierung:** Ranking von Proposals und Epics, jederzeit änderbar. Der Koordinator plant beim nächsten Sprint-Wechsel um, nicht mitten im Sprint.
- **Autonomy Dial pro Entscheidungsklasse und Bereich**, z. B. `ui/: autonom`, `data-schema/: immer parken`, `dependencies/: decide-and-flag`.
- **Masterplan-Änderungen, Accept/Reject von Proposals, Veto auf Decision Records.**

### Output (Koordinator → Architekt)

- **Briefing** pro Sprint oder täglich: was geliefert wurde, was geparkt ist, welche `provisional` Entscheidungen offen sind, wo Drift entsteht, wie viel Budget verbraucht wurde.
- **Decision Inbox**, gebündelt. Jede Frage ist in 30 Sekunden entscheidbar:
  - Frage, Optionen, **Empfehlung des Agents**
  - was gerade geparkt ist und was das Warten kostet
  - **Default + Deadline**: »Ohne Antwort bis Freitag gilt Option B.« Nur für two-way doors. One-way doors bekommen nie stillschweigende Zustimmung.

### Trust Calibration

Der Koordinator misst die Override-Rate pro Entscheidungsklasse:

- Kippt der Architekt die Klasse X nie → Vorschlag, X auf »autonom« hochzustufen.
- Kippt er sie oft → Vorschlag, X herabzustufen.

Den Dial dreht nur der Architekt. Sonst erweitert die Factory ihre eigenen Befugnisse, und die Trennlinie aus der Kernthese ist weg.

## 7. Bekannte Lücken im Ursprungskonzept

Beim Durchdenken aufgefallen und oben bereits adressiert:

1. **Masterplan mischt Ist und Soll** → getrennt in `masterplan/` und `architecture/`.
2. **Sprint-Ziel ohne DoD** → Scope Gate wäre nicht entscheidbar.
3. **Keine Parallelitätsregel** → Area Locks.
4. **Keine Dämpfung der Audit-Schleife** → größtes Risiko der Architektur.
5. **Unklar, ob der Koordinator Proposals selbst accepten darf** → nur innerhalb eines vorab freigegebenen Rahmens aus einer Direktive; sonst bleibt es Draft.
6. **Provisional Decisions ohne Verfallsdatum** → Verfallsfrist.

## 8. Nächste Schritte

1. **Decision Rights Matrix ausdetaillieren:** Format steht in [`drm-format.md`](drm-format.md). Offen sind noch die Diff-Signal-Syntax, das JSON Schema und das Format des Decision Records.
2. **Masterplan-Schema:** Regel-IDs, »Offen«-Zone, Evolutionspfade.
3. **Formate** für Charter, Briefing und Decision Inbox.
4. **Auslieferung und Laufzeit:** Skizze in [`delivery.md`](delivery.md) (Orchestrator-CLI, Plugin, MCP-Gate, Container-Layer).
5. **Modell- und Effort-Zuordnung pro Rolle** (Orchestrator/Planner vs. Worker vs. Bulk) nach Messung festlegen.
