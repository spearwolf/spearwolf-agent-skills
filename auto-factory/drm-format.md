# Decision Rights Matrix (DRM): Format

> **Status:** Formatvorschlag, Brainstorming-Stand vom 2026-09-29. Baut auf [`concept-base.md`](concept-base.md), Abschnitt 3 (Entscheidungsrechte) auf.
> **Zweck:** Pro Projekt festlegen, welche Entscheidungen Agents selbst treffen, welche sie vorläufig treffen und flaggen und welche sie parken und eskalieren.

## Grundsätze

- **YAML, nicht Markdown.** Der Supervisor wertet die DRM deterministisch aus. Markdown lädt zur Interpretation ein, und die ist bei der Frage »darf ich das entscheiden?« unerwünscht. Die *Absicht* einer Regel steht pro Klasse im Freitextfeld `why:`, damit Agents Grenzfälle einordnen können.
- **Eigenes Artefakt neben dem Masterplan.** Der Masterplan regelt, *was* erlaubt ist (Inhalt). Die DRM regelt, *wer* entscheidet (Verfahren). Beide gehören dem Architekten und sind per `CODEOWNERS` geschützt.
- **Vererbung.** Die Factory liefert eine generische Basis, jedes Projekt erbt davon und überschreibt nur, was bei ihm anders ist.
- **Deterministische Signale binden, semantische dürfen nur verschärfen.** Pfad- und Diff-Treffer ordnen eine Änderung verbindlich einer Klasse zu. `hints` für den LLM-Klassifikator dürfen eine Änderung zusätzlich in eine strengere Klasse ziehen, aber nie aus einer herausreden.

## Aufbau

```
factory/drm.base.yaml   (Factory-Standard: Grundmatrix + Standardklassen)
      ↓ extends
steering/drm.yaml       (Projekt: eigene Klassen, Overrides, Areas)
      ↓ geprüft gegen
Harte Invarianten       (im Schema, nicht customizable)
```

### Modi

Die Ausgänge einer Entscheidung bilden eine geordnete Leiter, sortiert nach Strenge:

```
autonomous < autonomous+review < decide-and-flag < prefer-reversible < park+proposal < park+escalate
```

| Modus | Bedeutung |
|---|---|
| `autonomous` | Agent entscheidet, zitiert die deckende Regel-ID |
| `autonomous+review` | wie `autonomous`, zusätzlich bestätigt der Reviewer |
| `decide-and-flag` | Agent entscheidet vorläufig, Decision Record mit Status `provisional` und Verfallsfrist, Arbeit läuft weiter |
| `prefer-reversible` | Agent wählt eine reversible Alternative (Feature Flag, Adapter, Interface); gibt es keine, wird geparkt |
| `park+proposal` | abhängiger Teilgraph wird geparkt, Agent schreibt einen Proposal-Draft |
| `park+escalate` | abhängiger Teilgraph wird geparkt, Frage geht in die Decision Inbox |

`relax: n` und `tighten: n` bewegen einen Modus um `n` Stufen auf dieser Leiter.

### Grundmatrix

Zwei Achsen, `defaults.matrix`:

- **Coverage**, aus der Zitierpflicht gegen den Masterplan: `covered` (von einer Regel gedeckt), `in_rails` (innerhalb der Rails, nicht explizit), `outside` (außerhalb der Rails oder in der »Offen«-Zone).
- **Door**, aus der Klasse: `two_way` (billig revertierbar, lokal) oder `one_way` (Public API, Datenschema, Dependencies, Security-Modell).

### Entscheidungsklassen

Pro Klasse:

| Feld | Pflicht | Inhalt |
|---|---|---|
| `id` | ja | Punkt-Notation, z. B. `dep.add` |
| `why` | ja | Absicht der Regel in einem Satz |
| `door` | ja | Default-Door: `two_way` oder `one_way` |
| `signals.paths` | mind. ein Signal | Glob-Patterns |
| `signals.diff` | mind. ein Signal | Regex bzw. strukturelle Muster auf dem Diff |
| `hints` | nein | natürlichsprachliche Hinweise für den LLM-Klassifikator, nur verschärfend |
| `matrix` | nein | überschreibt einzelne Zellen der Grundmatrix |
| `locked` | nein | `true`: immun gegen Area-Modifikatoren |
| `provisional_expiry` | nein | überschreibt die Default-Verfallsfrist |

### Areas

Modifikatoren per Pfad: `relax: n` oder `tighten: n`. Klassen mit `locked: true` bleiben davon unberührt.

## Beispiel `steering/drm.yaml`

```yaml
# Owned by the architect (CODEOWNERS). Agents propose changes via PR only.
drm_version: 3
extends: factory/drm.base.yaml

defaults:
  matrix:
    covered:  { two_way: autonomous,      one_way: autonomous+review }
    in_rails: { two_way: decide-and-flag, one_way: prefer-reversible }
    outside:  { two_way: park+proposal,   one_way: park+escalate }
  provisional_expiry: 5d
  unclassified: strictest          # fail closed

classes:
  - id: dep.add
    why: Jede Runtime-Dependency ist Supply-Chain-Risiko und Wartungslast.
    door: one_way
    signals:
      paths: ["package.json"]
      diff: ['^\+\s+"[^"]+":\s*"', "section: dependencies"]
    hints: ["führt eine neue Library oder ein neues Framework ein"]
    matrix:
      in_rails: { one_way: park+escalate }

  - id: data.schema
    why: Migrationen sind in Produktion nicht billig revertierbar.
    door: one_way
    locked: true
    signals:
      paths: ["migrations/**", "src/db/schema.ts"]
    matrix:
      covered: { one_way: park+escalate }

  - id: ui.copy
    why: Texte und Labels sind jederzeit änderbar, Fehler sind sichtbar und harmlos.
    door: two_way
    signals:
      paths: ["locales/**"]
    matrix:
      in_rails: { two_way: autonomous }

areas:
  - path: "src/experimental/**"
    relax: 1
  - path: "src/billing/**"
    tighten: 1

inbox:
  max_questions_per_week: 10
  silent_consent:
    default_deadline: 3d           # gilt per Invariante nur für two_way
```

## Auswertung durch den Supervisor

1. **Klassen bestimmen:** Signale gegen die Änderung prüfen. Trifft eine Änderung mehrere Klassen, gewinnt die strengste. Trifft sie keine, gilt `defaults.unclassified`.
2. **Door festlegen:** Default aus der Klasse. Der Reviewer darf `two_way` zu `one_way` hochstufen, nie umgekehrt.
3. **Coverage bestimmen:** aus der Zitierpflicht gegen den Masterplan, nicht aus der DRM.
4. **Zelle nachschlagen:** zuerst in `matrix` der Klasse, sonst in `defaults.matrix`.
5. **Area-Modifikatoren anwenden:** außer bei `locked`, und nie über eine Invariante hinweg.
6. **Protokollieren:** Der Decision Record enthält `drm_version`, Klasse(n), Zelle und Modus. Ein Audit kann so später prüfen, welche Policy zum Zeitpunkt der Entscheidung galt.

## Harte Invarianten

Ein Linter prüft sie bei jeder DRM-Änderung. Kein Projekt kann sie überschreiben:

- `outside` ist nie `autonomous` oder `autonomous+review`, in keiner Zelle und durch keine Area.
- `one_way` bekommt nie Silent Consent.
- `unclassified` ist nie lockerer als der strengste Modus der Grundmatrix für die jeweilige Coverage.
- `locked`-Klassen sind immun gegen Area-Modifikatoren.
- Jede Klasse hat mindestens ein deterministisches Signal (`paths` oder `diff`). Eine Klasse nur mit `hints` legt sich der Agent nach Belieben zurecht.
- Die DRM ändert nur der Architekt. Die Trust Calibration des Koordinators schreibt ihre Vorschläge als PR, nie direkt in die Datei.

## Basis-Klassen der Factory (`factory/drm.base.yaml`)

| Klasse | Door | Default-Tendenz |
|---|---|---|
| `dep.add`, `dep.upgrade.major` | one_way | streng |
| `dep.upgrade.minor` | two_way | locker |
| `api.public` (Exports, Endpoints, CLI-Flags) | one_way | streng |
| `data.schema` | one_way | streng, `locked` |
| `security.authz`, `security.crypto` | one_way | streng, `locked` |
| `config.infra` (CI, Deploy, Env) | one_way | streng |
| `test.delete`, `test.weaken` | one_way | streng |
| `refactor.internal` | two_way | locker |
| `ui.*`, `docs.*` | two_way | locker |
| `perf.tradeoff` | two_way | `decide-and-flag` |

`test.delete` und `test.weaken` sind die wichtigsten Klassen der Basis. Ohne sie ist »Test löschen« der kürzeste Weg zu grüner CI, und genau diesen Weg nimmt ein Agent unter Budgetdruck.

## Offene Punkte

- Konkrete Syntax für `signals.diff`: reine Regex oder strukturelle Muster (AST, JSON-Pfad)?
- JSON Schema für den Linter.
- Format des Decision Records mit DRM-Bezug.
- Wie die Trust Calibration Override-Raten pro Klasse misst und daraus PR-Vorschläge formuliert.
