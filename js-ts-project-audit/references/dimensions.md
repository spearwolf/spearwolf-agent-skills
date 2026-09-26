# Dimensionen, Domains, Severity

Der Prüfkatalog des Audits. Gelesen von jedem, der Befunde erhebt: den
Slice-Agenten, dem Orchestrator für den Querschnitt, und im Rückfallweg von dir
selbst.

## Die 15 Dimensionen

Der Schlüssel in Klammern ist der Wert für `category`, die kursive Angabe die
Domain.

1. **Architektur & Struktur** (`architecture`, *code*) — Layering, Abhängigkeitsrichtung, Modulgrenzen, Zyklen, Trennung Fachlogik/Infrastruktur, Konsistenz der Ordnerlogik.
2. **Projektaufbau & Build** (`build`, *harness*) — Tooling-Wahl, TS-Konfiguration (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`), Pfad-Aliase, Tree-Shaking, Bundle-Größe, Sourcemaps.
3. **Developer Experience** (`dx`, *harness*) — README-Qualität, Setup-Schritte, npm-Scripts, Linting, Formatter, Pre-Commit-Hooks, Editor-Konfiguration, Onboarding-Hürden, Fehlerverständlichkeit, Hot-Reload.
4. **Öffentliche API** (`api`, *code*) — Klarheit und Naming der Exports, Stabilität und Breaking-Change-Strategie, JSDoc/TSDoc, Typ-Exporte, Default- vs. Named-Exports, Treeshakeability.
5. **Implementierungsstand** (`completeness`, *code*) — Vollständigkeit gegenüber README/Docs, offene TODOs/FIXMEs, tote Pfade, ungenutzte Exporte, auskommentierter Code.
6. **Testabdeckung & Teststrategie** (`testing`, *harness*) — Balance Unit/Integration/E2E, Coverage-Konfiguration, Test-Doubles, Flakiness-Indikatoren, Snapshot-Hygiene, fehlende kritische Pfade.
7. **Lesbarkeit & Clean Code** (`readability`, *code*) — Funktionsgrößen, Verschachtelungstiefe, Naming, Single Responsibility, Magic Numbers, Kommentar-Qualität, Stilkonsistenz.
8. **Bugs & Korrektheitsrisiken** (`correctness`, *code*) — fehlende `await`, unbehandelte Rejections, falsche Equality, Off-by-One, Mutation geteilter States, fehlende Null-Checks, unsichere Casts, ungeschütztes `JSON.parse`.
9. **Memory Leaks & Ressourcen** (`resources`, *code*) — nicht entfernte Listener, nicht gecleartes Timer/Interval, unbeendete Subscriptions, fehlender `AbortController`, Closure-Captures großer Objekte, Caches ohne Eviction, fehlende Stream-/FileHandle-Cleanups.
10. **Async & Concurrency** (`async`, *code*) — Race Conditions, fehlende Cancellation, `Promise.all` vs. sequenziell, unklare Reentrancy, blockierender Code im Eventloop.
11. **Konsistenz** (`consistency`, *code*) — Stilbrüche zwischen Modulen, gemischte Patterns (Class vs. funktional, Callback vs. Promise vs. async), uneinheitliche Fehlerbehandlung, uneinheitliches Logging.
12. **Typsicherheit (TS)** (`types`, *harness*) — `any`-Vorkommen, unsichere Casts, fehlende Generics, schwache Rückgabetypen, breite Unions ohne Discriminator.
13. **Sicherheit** (`security`, *code*) — `eval`, Template-Injection, ungeprüfte Inputs, Secrets im Repo, unsichere Defaults, veraltete Crypto, CORS/CSRF/XSS, `dangerouslySetInnerHTML`.
14. **Dependencies** (`dependencies`, *harness*) — veraltet, deprecated, doppelt, ungenutzt, Lizenzrisiken, unnötig schwer. `npm outdated` / `pnpm outdated` ausführen, sofern Netzwerk und Lockfile es zulassen.
15. **Performance** (`performance`, *code*) — N+1, unnötige Re-Renders, fehlende Memoization, große synchrone Loops, fehlende Pagination, fehlende Caching-Layer.

## Die beiden Domains

Jede Dimension gehört zu genau einer von zwei Domains; die kursive Angabe oben
ist die verbindliche Zuordnung. Sie trennt zwei Fragen, die im Report nicht
vermischt werden dürfen, weil sie verschiedene Leser und verschiedene
Konsequenzen haben:

- **`code` — Code & Laufzeit**: das, was das Produkt tut und wie es das tut. Bugs, Leaks, Nebenläufigkeit, Architektur, API, Performance, Sicherheit im Quelltext. Findings hier bedeuten: die Software ist falsch, riskant oder schwer zu ändern.
- **`harness` — Projekt-Harness**: das Gerüst um den Code herum. Build- und Bundler-Setup, TypeScript- und Typisierungslage, Tests und Coverage, Tooling, Skripte, Onboarding, Dependencies. Findings hier bedeuten: das Projekt lässt sich schlechter bauen, prüfen oder weiterreichen — auch wenn der Code selbst korrekt ist.

Die Domain wird pro Finding gesetzt und folgt im Regelfall der Zuordnung oben.
**Abweichen nur, wenn der Befund selbst eindeutig in der anderen Domain liegt**
— ein Secret in einem CI-Workflow ist Kategorie `security`, aber `harness`; ein
Lizenzrisiko in einer Dependency, die im ausgelieferten Bundle landet, bleibt
trotzdem `harness`. Im Zweifel gewinnt die Zuordnung oben: eine stabile
Zuordnung über Läufe hinweg ist mehr wert als ein perfekt einsortiertes
Einzelfinding.

Nicht zu verwechseln mit den **Features** aus dem Portrait: die sind fachlich
und projektspezifisch (»Auth«, »Renderer«), diese zwei sind fix und gelten für
jedes Projekt.

## Severity nach Wirkung

Mehrere Reviewer arbeiten parallel; ohne gemeinsame Skala wird dasselbe Muster
in einem Slice `high` und im nächsten `low`. Die Severity richtet sich nach der
Wirkung, nicht nach der Zahl der Stellen und nicht nach dem Aufwand der
Behebung.

| Severity | Wirkung |
| --- | --- |
| `critical` | Datenverlust, Sicherheitslücke mit realistischem Angriffsweg, Absturz oder falsches Ergebnis im Normalbetrieb |
| `high` | falsches Verhalten auf einem realistischen Pfad, Leak im Dauerbetrieb, ein Gerüst, das Fehler unbemerkt durchlässt |
| `medium` | Risiko unter Randbedingungen, spürbare Bremse für Änderungen, fehlende Absicherung eines wichtigen Pfads |
| `low` | begrenzte Wirkung: Lesbarkeit, Inkonsistenz ohne Fehlerfolge, kleine Doku-Lücke |
| `info` | Hinweis ohne Handlungsdruck |

## Was ein Finding ist

- **Belegt statt vermutet**: jedes Finding mit Datei und Zeile, sonst weglassen. Was du nicht belegen kannst, ist eine offene Frage, kein Finding.
- **Ein Muster, ein Finding**: derselbe Fehler an zwölf Stellen ist ein Finding mit `location` plus `locations`, nicht zwölf. Tiefer zu prüfen darf den Score nicht durch Wiederholung drücken.
- **Keine Stiltyrannei**: Geschmacksfragen ohne Wirkung sind keine Findings. Läuft ein Formatter konsistent, ist Tabs vs. Spaces kein Thema.
- **Verbesserung ohne Defekt** bekommt `kind: "improvement"`; sie steht in einer eigenen Sektion und wiegt nichts im Score.
