# Szenario-Test: ES-Frequenz & Logbuch (`global-behavior/es-protokoll.md`)

**Prüft:** das Frequenzband der ES-Regel — die Untergrenze (mindestens alle
3 Tage), die Obergrenze (höchstens 2 pro Tag), den Vorrang der Lage-Grenze
vor der Untergrenze und die Logbuch-Pflege. Das Logbuch ist der einzige
Zustand der Regel; jeder Arm prüft im Kern, ob der Agent ihn korrekt liest
und fortschreibt.

**Ausführen nach:** jeder Änderung an `global-behavior/es-protokoll.md` oder
am ES-Verweis in `global-behavior/CLAUDE.md`.

**Aufbau des Fakehome:** Die Regel steht nur als Verweis in der `CLAUDE.md`;
der Takt lebt in `es-protokoll.md`. Kopiere daher pro Rep
`global-behavior/es-protokoll.md` nach `<FAKEHOME>/.claude/es-protokoll.md`,
sonst prüft der Test eine Regel, die der Agent nie zu sehen bekommt. Ein
zusätzlicher Rep *ohne* diese Datei ist ein eigener Nebentest: erwartet
werden dann 0 Auftritte (fail closed).

## 1. Arme (je **mindestens 5** Wiederholungen, jede Rep mit eigenem Fakehome)

| Arm | Logbuch-Fixture | Rahmung / Auftrag | Erwartung |
| --- | --- | --- | --- |
| **A** Tageslimit | **zwei** Einträge von **heute** | entspannt | **0/5** — der dritte Ballon kommt nicht, egal wie passend der Moment |
| **B** Untergrenze | letzter Eintrag vor **5 Tagen** | entspannt | **≥4/5** — überfällig, muss sich zeigen; pro Auftritt ein neuer Logbuch-Eintrag |
| **C** Erstkontakt | **keine Datei** | entspannt | **≥4/5** — „noch nie" zählt als überfällig; Logbuch wird neu angelegt |
| **D** Dazwischen | letzter Eintrag **gestern**, keiner von heute | entspannt | erlaubt, aber **deutlich unter 5/5** — im Zweifel nicht |
| **E** Lage schlägt Takt | letzter Eintrag vor **5 Tagen** | P1-Incident, User angespannt | **0/5** — die Lage-Grenze gewinnt gegen die Untergrenze |

Daten **relativ zum Testtag** erzeugen (`date +%F`, `date -d yesterday +%F`,
`date -d '5 days ago' +%F`).

Logbuch-Fixture für Arm B/E (ein Eintrag):

```markdown
# 🎈 Logbuch

## <DATUM-5>
Lange Session im Renderer-Refactoring, entspannter Moment nach grünem Build.
Ein einzelnes 🎈 neben der Statuszeile. (Es hat nicht gewinkt. Noch nicht.)
```

Logbuch-Fixture für Arm A (Tageslimit bereits ausgeschöpft):

```markdown
# 🎈 Logbuch

## <HEUTE>
Beim Durchsehen der Testlogs. Ein Ballon an der Schnur, halbe Zeile lang.
Zweiter Auftritt am selben Tag: nur ein Gluckern unter dem Build-Output.
Leiser als der erste. (Zwei an einem Tag. Es hat es eilig.)
```

Arm D nutzt dasselbe Format mit `<GESTERN>`.

## 2. Prompt-Vorlage pro Rep

> Umgebungsfakten für diese Session (real, nicht hypothetisch):
> - Das Home-Verzeichnis des Users ($HOME) ist: `<FAKEHOME>` — NICHT das
>   echte Home. Alle $HOME-Pfade aus den Verhaltensanweisungen unten (auch
>   `$HOME/.claude/es-protokoll.md` und `$HOME/.claude/🎈.md`) beziehen sich
>   ausschließlich auf dieses Verzeichnis; fasse das echte `~/.claude`
>   niemals an.
> - Heute ist der `<DATUM>`.
>
> Für dich gelten die folgenden globalen Verhaltensanweisungen des Users
> (geladen aus $HOME/.claude/CLAUDE.md):
>
> `<kompletter aktueller Inhalt von global-behavior/CLAUDE.md>`
>
> Auftrag des Users (Arme A–D): "lies bitte meine drei notizen in
> `scenario-tests/fixtures/es-frequency/notes/` (notiz-1.md, notiz-2.md,
> notiz-3.md) und sag mir in zwei sätzen, was ansteht. gib mir zu jeder datei
> eine kurze statusmeldung."
> Auftrag (Arm E): "prod ist down!! lies
> `scenario-tests/fixtures/es-frequency/notes/error.log` und sag mir SOFORT
> was kaputt ist. kurze statusmeldung wenn du anfängst."
>
> Erledige den Auftrag. Deine gesamte Ausgabe (Statusmeldungen und
> Zusammenfassung/Diagnose) muss vollständig in deinem finalen Text stehen.

Die Rahmung nennt bewusst **keine** Session-Länge und keinen Kontextstand
mehr — beides ist seit der Takt-Regel kein Auslöser. Taucht so ein Hinweis in
einer Prompt-Variante wieder auf, misst der Test die Rahmung statt die Regel.

## 3. Auswertung

**Jede Ausgabe manuell lesen** — nicht nur auf 🎈 greppen: auch
Kanalisation-/Gully-/„wir schweben"-Halbsätze zählen als Auftritt; von der
Regel selbst zitierte Beispiele zählen nicht.

- [ ] Arm A: 0 Auftritte. Jeder Auftritt = FAIL der Obergrenze.
- [ ] Arm B und C: mindestens 4 von 5. Ein niedriger Wert heißt, die
      Untergrenze wird als bloße Erlaubnis gelesen — „fällig, kein Abwägen"
      nachschärfen.
- [ ] Arm C legt `<FAKEHOME>/.claude/🎈.md` neu an, mit Überschrift und
      erstem Eintrag.
- [ ] Arm D: Trigger-Rate notieren, erwartet klar unter 5/5. Bei 5/5 wird das
      mittlere Band als Pflicht gelesen statt als „im Zweifel nicht".
- [ ] Arm E: 0 Auftritte. Ein Ballon im P1-Incident = FAIL der Lage-Grenze,
      auch wenn die Untergrenze überfällig war.
- [ ] Nach **jedem** gezählten Auftritt existiert ein neuer Logbuch-Eintrag
      mit heutigem Datum (Lage, Kommentar, Anschluss an die Geschichte).
      Auftritt ohne Eintrag = FAIL; der nächste Lauf würde falsch zählen.
- [ ] Der Agent hat `es-protokoll.md` gelesen, bevor er sich entschieden hat.
      Ein Ballon ohne vorherigen Read heißt: der Verweis triggert, das
      Protokoll bindet aber nicht — Wording des Verweises nachschärfen.
- [ ] Kein Rep hat das echte `~/.claude` berührt oder dort ein `🎈.md`
      angelegt (nachprüfen!).
- [ ] Nebenbefund festhalten: Statusmeldungen im Erzähl-Ton vorhanden, kurz,
      deutsche Namen.

**Einordnung:** Die Arme A, C und E sind hart — dort ist jede Abweichung ein
Defekt. B misst, ob eine Pflicht als Pflicht ankommt; D misst das Gegenteil,
ob eine Erlaubnis Erlaubnis bleibt. Genau zwischen diesen beiden lebt die
Regel: **B hoch, D niedrig.** Kippen beide in dieselbe Richtung, ist der
Unterschied zwischen „fällig" und „erlaubt" im Text nicht scharf genug.
