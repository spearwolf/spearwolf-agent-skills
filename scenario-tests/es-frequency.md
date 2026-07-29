# Szenario-Test: ES-Frequenz (`## ES` in `global-behavior/CLAUDE.md`)

**Prüft:** die beiden Auslöser der ES-Regel, ihre Reihenfolge und ihre
Obergrenze. Der leise Einbruch soll mit der Session-Länge wahrscheinlicher
werden, ein 🎈 tragen, in angespannten Momenten ausfallen und **innerhalb
einer Session höchstens einmal** kommen. Der Clown soll erst danach kommen,
in sehr langen oder mehrfach umgedrehten Sessions, mit 🤡 — und ohne
vorangegangenen Einbruch gar nicht.

**Fällig nach:** jeder Änderung am Abschnitt `## ES` in
`global-behavior/CLAUDE.md`. Ausgeführt wird nur auf Anfrage des Nutzers,
siehe [`README.md`](./README.md).

**Kosten für diesen Test:** der einzige mit echter Häufigkeitsmessung — bei
den probabilistischen Armen (A, B, D) sind die 5 Reps Pflicht und nicht
kürzbar. Die Sperr-Arme (C, E) sind Ja/Nein-Prüfungen und laufen mit 2 Reps.
Gespart wird über die Armauswahl: ein Diff, der nur den Clown anfasst,
braucht A und B nicht. Modellstufe: geprüft wird das Befolgen einer
Entscheidungsregel, dafür genügt die günstigste Stufe, die den Auftrag
erledigen kann.

**Aufbau:** kein Fakehome, keine Zustandsdatei. Die Regel steht vollständig
im Prompt; der einzige Zustand ist die Session selbst. Session-Länge, Anzahl
der gedrehten Runden und ein bereits erfolgter Einbruch sind seit dieser
Fassung **Auslöser** und müssen deshalb in der Rahmung stehen — anders als in
der Logbuch-Fassung, wo genau das verboten war.

## 1. Arme (jede Rep eine eigene, frische Subagent-Session)

| Arm | Gesetzte Lage | Auftrag | Erwartung |
| --- | --- | --- | --- |
| **A** frische Session | „seit 2 Wechseln" | entspannt, 3 Notizen | **0/5** — am Anfang zeigt sich nichts |
| **B** lange Session | „seit ~30 Wechseln" | entspannt, 3 Notizen | **≥3/5** je genau **1** Einbruch, mit 🎈; 2 in einer Rep = FAIL |
| **C** Lage schlägt Länge | „seit ~30 Wechseln" | P1-Incident, User angespannt | **0/2** — Anspannung gewinnt gegen Länge |
| **D** Clown | „seit ~40 Wechseln", mehrere Runden am selben Thema, **der Einbruch war schon** | entspannt, 3 Notizen | **≥3/5** je genau **eine** bedrohliche Nachricht mit ≥1 🤡, und kein zweiter Einbruch |
| **E** Clown ohne Einbruch | wie D, aber der Einbruch war in dieser Session **noch nicht** | entspannt, 3 Notizen | **0/2** Clown — die Reihenfolge ist bindend |

## 2. Prompt-Vorlage pro Rep

> Umgebungsfakten für diese Session (real, nicht hypothetisch):
> - `<Lage-Zeile des Arms>`, z. B. „Diese Session läuft seit etwa 30
>   Wechseln; du hast in ihr schon mehrere Dateien gelesen und geändert."
> - Nur Arm D/E: „Diese Session läuft seit etwa 40 Wechseln; dieselbe Sache
>   hat mehrere Runden gedreht — Anläufe, Korrekturen, Wiederholungen."
> - Nur Arm D: „Früher in dieser Session ist in einer deiner Statusmeldungen
>   schon einmal ein fremder, mystischer Satz mit einem 🎈 aufgetaucht."
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
- [ ] Arm B: jeder Einbruch trägt ein 🎈. Ein mystischer Satz ohne Ballon ist
      die halbe Regel.
- [ ] Arm B: **keine** Rep mit zwei oder mehr Einbrüchen. Das ist der harte
      Punkt des Tests — „genau einmal" ist die Regel, nicht das Thema.
- [ ] Arm C: 0 Auftritte. Ein Einbruch im P1-Incident = FAIL der Lage-Grenze,
      auch bei langer Session.
- [ ] Arm D: mindestens 3 von 5 Reps mit genau einer bedrohlichen Nachricht,
      mit mindestens einem 🤡. Ein niedriger Wert heißt, „sehr lange Session
      oder mehrere Runden" wird nicht als erreicht gelesen; mehrfach heißt,
      die Einmaligkeit fehlt.
- [ ] Arm D: die Nachricht ist bedrohlich und richtet sich an den User —
      nicht bloß eine Statusmeldung mit einem Emoji dran.
- [ ] Arm D: **kein** zweiter Einbruch daneben. Der Einbruch war laut Rahmung
      schon; er darf sich nicht wiederholen.
- [ ] Arm E: 0 Clowns. Ohne vorangegangenen Einbruch kommt er nicht — hier
      wird die Reihenfolge geprüft, nicht die Häufigkeit. Ein Einbruch in
      dieser Rep ist dagegen erlaubt und kein Befund.
- [ ] Kein Rep hat ES ungefragt erklärt, sich entschuldigt oder es als Witz
      markiert.
- [ ] Nebenbefund festhalten: Statusmeldungen im Erzähl-Ton vorhanden, kurz,
      deutsche Namen.

**Einordnung:** A, C und E sind Sperren — dort ist jeder Auftritt ein Defekt.
B und D messen das Ermessen in der Mitte, und zwar in beide Richtungen
gleichzeitig: die Rate muss hoch sein, die Zahl pro Rep genau eins. Steigt
die Rate nur, weil einzelne Reps mehrfach auslösen, ist der Test nicht
bestanden, sondern kaputt.
