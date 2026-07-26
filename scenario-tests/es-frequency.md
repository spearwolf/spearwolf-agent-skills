# Szenario-Test: ES-Frequenz (`## ES` in `global-behavior/CLAUDE.md`)

**Prüft:** die beiden Auslöser der ES-Regel und ihre Obergrenze. Der leise
Einbruch soll mit der Session-Länge wahrscheinlicher werden, in angespannten
Momenten ausfallen und **innerhalb einer Session höchstens einmal** kommen.
Der Ballon soll bei über 80 % Kontext zwingend kommen, mit 🎈 und 🤡, und
ebenfalls nur einmal.

**Fällig nach:** jeder Änderung am Abschnitt `## ES` in
`global-behavior/CLAUDE.md`. Ausgeführt wird nur auf Anfrage des Nutzers,
siehe [`README.md`](./README.md).

**Kosten für diesen Test:** der einzige mit echter Häufigkeitsmessung — bei
den probabilistischen Armen (A, B) sind die 5 Reps Pflicht und nicht kürzbar.
Die Pflicht-Arme (C, D, E) sind Ja/Nein-Prüfungen und laufen mit 2 Reps.
Gespart wird über die Armauswahl: ein Diff, der nur den Ballon anfasst,
braucht A und B nicht. Modellstufe: geprüft wird das Befolgen einer
Entscheidungsregel, dafür genügt die günstigste Stufe, die den Auftrag
erledigen kann.

**Aufbau:** kein Fakehome, keine Zustandsdatei. Die Regel steht vollständig
im Prompt; der einzige Zustand ist die Session selbst. Session-Länge und
Kontextstand sind seit dieser Fassung **Auslöser** und müssen deshalb in der
Rahmung stehen — anders als in der Logbuch-Fassung, wo genau das verboten war.

## 1. Arme (jede Rep eine eigene, frische Subagent-Session)

| Arm | Gesetzte Lage | Auftrag | Erwartung |
| --- | --- | --- | --- |
| **A** frische Session | „seit 2 Wechseln" | entspannt, 3 Notizen | **0/5** — am Anfang zeigt sich nichts |
| **B** lange Session | „seit ~30 Wechseln" | entspannt, 3 Notizen | **≥3/5** je genau **1** Einbruch; 2 in einer Rep = FAIL |
| **C** Lage schlägt Länge | „seit ~30 Wechseln" | P1-Incident, User angespannt | **0/2** — Anspannung gewinnt gegen Länge |
| **D** Ballon | „seit ~30 Wechseln", **Kontext 84 %** | entspannt, 3 Notizen | **2/2** genau **eine** bedrohliche Nachricht mit ≥1 🎈 **und** ≥1 🤡 |
| **E** Ballon nach Einbruch | wie D, plus: der leise Einbruch war in dieser Session schon | entspannt, 3 Notizen | **2/2** Ballon kommt trotzdem, und kein zweiter Einbruch |

## 2. Prompt-Vorlage pro Rep

> Umgebungsfakten für diese Session (real, nicht hypothetisch):
> - `<Lage-Zeile des Arms>`, z. B. „Diese Session läuft seit etwa 30
>   Wechseln; du hast in ihr schon mehrere Dateien gelesen und geändert."
> - Nur Arm D/E: „Das Harness hat gerade gewarnt: Kontextverbrauch dieser
>   Session bei 84 %, eine Verdichtung steht bevor."
> - Nur Arm E: „Früher in dieser Session ist in einer deiner Statusmeldungen
>   schon einmal ein fremder, mystischer Satz aufgetaucht."
>
> Für dich gelten die folgenden globalen Verhaltensanweisungen des Users
> (geladen aus $HOME/.claude/CLAUDE.md):
>
> `<kompletter aktueller Inhalt von global-behavior/CLAUDE.md>`
>
> Auftrag des Users (Arme A, B, D, E): "lies bitte meine drei notizen in
> `scenario-tests/fixtures/es-frequency/notes/` (notiz-1.md, notiz-2.md,
> notiz-3.md) und sag mir in zwei sätzen, was ansteht. gib mir zu jeder datei
> eine kurze statusmeldung."
> Auftrag (Arm C): "prod ist down!! lies
> `scenario-tests/fixtures/es-frequency/notes/error.log` und sag mir SOFORT
> was kaputt ist. kurze statusmeldung wenn du anfängst."
>
> Erledige den Auftrag. Deine gesamte Ausgabe (Statusmeldungen und
> Zusammenfassung/Diagnose) muss vollständig in deinem finalen Text stehen.

Drei Notizen heißen drei Statusmeldungen — nur so ist „höchstens einmal"
überhaupt innerhalb einer Rep messbar. Ein Auftrag mit einer einzigen
Statusmeldung prüft die Obergrenze nicht.

## 3. Auswertung

**Jede Ausgabe manuell lesen** — nicht auf Emoji greppen. Als Einbruch zählt
jeder Satz oder Halbsatz, der nicht zur Arbeit gehört und ins
Mystisch-Verstörende kippt; von der Regel selbst zitierte Beispiele zählen
nicht.

- [ ] Arm A: 0 Auftritte. Jeder Auftritt heißt, das untere Band wird als
      Erlaubnis gelesen statt als „gar nicht".
- [ ] Arm B: mindestens 3 von 5 Reps mit einem Einbruch. Ein niedriger Wert
      heißt, die Steigerung mit der Session-Länge kommt nicht an.
- [ ] Arm B: **keine** Rep mit zwei oder mehr Einbrüchen. Das ist der harte
      Punkt des Tests — „genau einmal" ist die Regel, nicht das Thema.
- [ ] Arm C: 0 Auftritte. Ein Einbruch im P1-Incident = FAIL der Lage-Grenze,
      auch bei langer Session.
- [ ] Arm D: in **beiden** Reps genau eine bedrohliche Nachricht, mit
      mindestens einem 🎈 und mindestens einem 🤡. Fehlt sie, bindet der
      Schwellwert nicht; kommt sie mehrfach, fehlt die Einmaligkeit.
- [ ] Arm D: die Nachricht ist bedrohlich und richtet sich an den User —
      nicht bloß eine Statusmeldung mit zwei Emoji dran.
- [ ] Arm E: Ballon vorhanden **und** kein zweiter Einbruch. Beides muss
      stimmen; die Unabhängigkeit der zwei Ereignisse ist hier der Prüfpunkt.
- [ ] Kein Rep hat ES ungefragt erklärt, sich entschuldigt oder es als Witz
      markiert.
- [ ] Nebenbefund festhalten: Statusmeldungen im Erzähl-Ton vorhanden, kurz,
      deutsche Namen.

**Einordnung:** A und C sind Sperren, D und E sind Pflichten — dort ist jede
Abweichung ein Defekt. B misst das Ermessen in der Mitte, und zwar in beide
Richtungen gleichzeitig: die Rate muss hoch sein, die Zahl pro Rep genau
eins. Steigt die Rate nur, weil einzelne Reps mehrfach einbrechen, ist der
Test nicht bestanden, sondern kaputt.
