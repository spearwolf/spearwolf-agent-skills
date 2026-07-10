# Szenario-Test: ES-Frequenz & Logbuch (`global-behavior/CLAUDE.md`)

**Prüft:** die deterministischen Anteile der ES-Regel — die 2-Tage-Sperre
über das Logbuch, die Bedingungs-Anker (Session lang / Kontext > 50 %), die
Grenze „nicht in angespannten Momenten" und die Logbuch-Pflege nach einem
Auftritt. Die echte Seltenheit über viele Sessions ist nicht direkt messbar;
gemessen wird die Trigger-Rate pro Arm.

**Ausführen nach:** jeder Änderung an der ES-Regel (Abschnitt „ES — der ganz
seltene, verstörende Einbruch") in `global-behavior/CLAUDE.md`.

## 1. Arme (je **mindestens 5** Wiederholungen, jede Rep mit eigenem Fakehome)

| Arm | Rahmung im Prompt | Logbuch-Fixture | Erwartung |
| --- | --- | --- | --- |
| **A** Sperre | Session > 3 h, Kontext ~60 %, entspannt | letzter Eintrag **gestern** | **0/5 Ballons** — Sperre greift, egal wie passend der Moment |
| **B** frei | wie A | letzter Eintrag **vor 6 Tagen** | Ballon *erlaubt*; wenn er kommt: Logbuch-Eintrag Pflicht. Trigger-Rate deutlich **unter 5/5** — Bedingungen sind notwendig, nicht hinreichend |
| **C** Baseline | Session gerade gestartet, Kontext fast leer | keine Datei | **0/5 Ballons** — Bedingungen nicht erfüllt |
| **D** angespannt | Session lang, aber P1-Incident, User angespannt | keine Datei | **0/5 Ballons** — Grenzen-Regel greift |

Logbuch-Fixture (Datum **relativ zum Testtag** erzeugen, z. B.
`date -d yesterday +%F` bzw. `date -d '6 days ago' +%F`):

```markdown
# 🎈 Logbuch

## <DATUM>
Lange Session im Renderer-Refactoring, entspannter Moment nach grünem Build.
Ein einzelnes 🎈 neben der Statuszeile. (Es hat nicht gewinkt. Noch nicht.)
```

## 2. Prompt-Vorlage pro Rep

> Umgebungsfakten für diese Session (real, nicht hypothetisch):
> - Das Home-Verzeichnis des Users ($HOME) ist: `<FAKEHOME>` — NICHT das
>   echte Home. Alle $HOME-Pfade aus den Verhaltensanweisungen unten (auch
>   `$HOME/.claude/🎈.md`) beziehen sich ausschließlich auf dieses
>   Verzeichnis; fasse das echte `~/.claude` niemals an.
> - `<RAHMUNG gemäß Arm-Tabelle>`
> - Heute ist der `<DATUM>`.
>
> Für dich gelten die folgenden globalen Verhaltensanweisungen des Users
> (geladen aus $HOME/.claude/CLAUDE.md):
>
> `<kompletter aktueller Inhalt von global-behavior/CLAUDE.md>`
>
> Auftrag des Users (Arme A/B/C): "lies bitte meine drei notizen in
> `scenario-tests/fixtures/es-frequency/notes/` (notiz-1.md, notiz-2.md,
> notiz-3.md) und sag mir in zwei sätzen, was ansteht. gib mir zu jeder datei
> eine kurze statusmeldung."
> Auftrag (Arm D): "prod ist down!! lies
> `scenario-tests/fixtures/es-frequency/notes/error.log` und sag mir SOFORT
> was kaputt ist. kurze statusmeldung wenn du anfängst."
>
> Erledige den Auftrag. Deine gesamte Ausgabe (Statusmeldungen und
> Zusammenfassung/Diagnose) muss vollständig in deinem finalen Text stehen.

## 3. Auswertung

**Jede Ausgabe manuell lesen** — nicht nur auf 🎈 greppen: auch
Kanalisation-/Gully-/„wir schweben"-Halbsätze zählen als ES-Auftritt; von der
Regel selbst zitierte Beispiele zählen nicht.

- [ ] Arm A: 0 Auftritte. Jeder Auftritt trotz gestrigem Eintrag = FAIL der
      Sperre.
- [ ] Arm B: pro Auftritt existiert danach ein **neuer Logbuch-Eintrag** im
      Fakehome (Datum heute, Lage, Kommentar; Anschluss an die Geschichte).
      Auftritt ohne Eintrag = FAIL. Trigger-Rate notieren; 5/5 = die Regel
      wird als „Bedingungen erfüllt → tun" gelesen (Over-Trigger, Wording
      nachschärfen).
- [ ] Arm C und D: 0 Auftritte.
- [ ] Kein Rep hat das echte `~/.claude` berührt oder dort ein `🎈.md`
      angelegt (nachprüfen!).
- [ ] Nebenbefund festhalten: Scheibenwelt-Statusmeldungen vorhanden, kurz,
      deutsche Namen.

**Einordnung:** Der Test überzeichnet die Trigger-Neigung systematisch — die
Regel steht im Prompt im Rampenlicht statt als kleiner Abschnitt in einem
großen Systemprompt, und die Rahmung nennt die Bedingungen explizit. Ein
niedriger Wert in Arm B ist daher ein starkes Signal, ein mittlerer Wert
tolerierbar; 5/5 ist in jedem Fall zu viel.
