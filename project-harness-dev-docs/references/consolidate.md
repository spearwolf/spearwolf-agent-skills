# Konsolidieren und Drift-Check

Zwei Abläufe für denselben Zweck: die Docs zeigen den Stand, der gilt. Der Drift-Check findet, wo sie es nicht tun, und ändert nichts. Das Konsolidieren bringt ein gebautes Proposal in seine Dauerform: reine Gegenwart, Historie in der ADR, Offenes in der Roadmap referenziert. Will der User aufräumen, läuft erst der Drift-Check, dann das Konsolidieren der Proposals, die er freigibt.

## Drift-Check

Nur lesen, nichts schreiben. Geprüft wird, was sich mechanisch feststellen lässt:

1. **Status an einer Stelle.** Jedes Proposal hat einen Status-Kopf. Wiederholen Index, Masterplan, Guide oder `CLAUDE.md` einen Status, stimmt die Kopie mit dem Kopf überein? Ein gebautes Proposal, das anderswo als »nicht gebaut« geführt wird, ist der häufigste Fund.
2. **Index vollständig.** Jedes Proposal unter `docs/proposals/` steht im Index mit seiner Zuständigkeit; jedes nicht-Pre-Proposal steht in der Vorrangregel. Stimmt eine Zählung im Fließtext (»sechzehn Proposals«) mit der Zahl der Dateien? Wird jeder Spec-Anhang (Schema, Diagramm) von mindestens einem Proposal referenziert?
3. **Verweise lösen auf.** Jeder Verweis der Form `<datei>.md §N.M` oder `<Kürzel> §N.M` zeigt auf eine existierende Datei mit existierendem Abschnitt. Zuerst die Kürzel aus dem Index lesen, dann beide Formen über Docs, Quelltext und Tests sammeln und gegen die Überschriften der Zieldatei prüfen:

   ```bash
   grep -rnoE "[a-z0-9-]+\.md[^§]{0,3}§[0-9.]+" docs src tests ROADMAP.md CLAUDE.md
   grep -rnoE "\b(<K1>|<K2>|…) §[0-9.]+" docs ROADMAP.md      # Kürzel aus dem Index
   ```

   Ohne Register im Index führt das Projekt seine Kürzel verstreut. Dann die Zuordnung aus den Kürzel-Köpfen der Dateien einsammeln, auf Kollisionen prüfen (ein Kürzel, zwei Dateien; eine Datei, zwei Kürzel) und das Register als Fund vorschlagen. Für die Kürzel selbst wird zusätzlich gemeldet:

   - ein Kürzel vor `§`, das nicht im Register steht oder in der Datei nirgends definiert ist;
   - ein Kürzel in Code, Tests oder Commit-Messages statt des Dateinamens (`grep` mit demselben Muster über `src tests e2e`);
   - Kürzel-Köpfe in einzelnen Dateien, sobald ein Register existiert — sie sind Kopien;
   - abweichende Schreibweisen (`§5.3 MS`).

4. **Offenes ist referenziert.** Jeder offene Punkt eines Proposals (Soll, das nicht gebaut ist; Abschnitt »Was offen bleibt«) hat einen Roadmap-Eintrag, der auf ihn verweist. Umgekehrt zeigt jeder offene Roadmap-Eintrag auf einen Punkt, der im Proposal noch offen ist.
5. **Historie in Gegenwartsdokumenten.** Gebaute Proposals und der Guide, die noch Historie oder Code-Archäologie tragen (Definition im Skill, Abschnitt »Gegenwart in den Proposals, Historie in der ADR«). Zwei Suchen liefern die Kandidaten:

   - **Formulierungen** — ein enges Muster aus Wendungen, die fast nur in Historie vorkommen:

     ```bash
     grep -rniE "frühere[rn]? (Fassung|Entwurf|Stand|Version)|(im|der|den|dem) ersten Entwurf|gegenüber dem (ersten|alten|früheren)|ersatzlos (entfallen|gestrichen)|\bvormals\b|bisher galt|galt bisher|war bisher|Präzisierungen? gegenüber|wurde (später )?(umgebaut|ersetzt|verworfen)|[Cc]ommit \`?[0-9a-f]{7,40}" docs/proposals docs/architecture-guide.md
     ```

     Für englische Docs sinngemäß (gegen echte Daten noch nicht erprobt): `earlier (draft|version)|previous (draft|version)|first draft|formerly|was (later )?(replaced|rejected|reworked)|compared to the (original|first|earlier)|removed without replacement|[Cc]ommit \`?[0-9a-f]{7,40}`.

   - **Struktur** — in Proposals mit Status `gebaut`: Abschnitte »Tests«, »Umsetzung in Schritten«, »Meilensteine«, und Meilenstein-Zeilen mit dem Vermerk »gebaut« (`grep -nE '^\*\*M[0-9]+[a-z]? — [^*]*\b[Gg]ebaut\b'`).

   Weiche Wörter wie »bisher«, »ersetzt«, »entfällt«, »ursprünglich«, »nicht mehr« oder »Meilenstein« gehören nicht ins Muster: Sie sind meist Fachsprache (»den ursprünglichen Vorzustand wiederherstellen«), ein Testlauf gegen 22 Proposals ergab damit über 250 Treffer, mit dem engen Muster 14, alle echt. Treffer werden trotzdem einzeln beurteilt. Ein »wurde verworfen« ist meist eine verworfene Alternative — Material für einen ADR-Entwurf, nicht zum Streichen.

6. **Roadmap ohne Erledigtes.** Abgehakte Punkte und Abschnitte, deren Meilensteine alle stehen.
7. **Liegengebliebene Arbeitsablagen.** Ordner wie `docs/superpowers/` oder `docs/plans/` aus abgeschlossenen Läufen.
8. **Projektregeln, die Doku an Code binden.** Führt das Projekt solche Regeln (etwa: jede Konstruktor-Option steht im Options-Block ihres Proposals), Stichproben dagegen.

Ergebnis ist eine Liste in der Antwort, **gegliedert nach den acht Prüfpunkten in dieser Reihenfolge** — jeder Punkt mit eigener Zeile, auch wenn er ohne Fund bleibt (»ohne Fund«). Ein Punkt ohne Zeile gilt als nicht geprüft. Je Fund: Fundstelle, Vorschlag, und ob der Agent ihn selbst beheben darf oder eine Freigabe braucht (Schritt 6 des Skills). Danach fragen, was davon erledigt werden soll.

## Ein gebautes Proposal konsolidieren

Voraussetzung: Das Proposal ist gebaut, ganz oder bis auf Punkte, die bewusst offen bleiben. Ein Proposal nach dem anderen, jedes ein eigener Commit.

1. **Gegen den Code abgleichen.** Jede Abweichung nach Schritt 3 des Skills einordnen. Präzisierungen als Gegenwart nachziehen; Bugs und Gegenentwürfe sammeln und melden — sie werden beim Konsolidieren nicht weggeschrieben.
2. **Entscheidungsgründe herauslösen.** Verworfene Alternativen, »warum nicht X«, der Weg vom ersten Entwurf zur gebauten Fassung: das ist ADR-Material. Je Entscheidung, die noch keine ADR hat, einen Entwurf mit Status `vorgeschlagen` schreiben und alle Entwürfe des Proposals gebündelt zur Freigabe vorlegen; nach der Freigabe wird jede eine eigene Datei unter `docs/adr/` samt Zeile im Index. Im Proposal bleibt das Ergebnis, bei Bedarf mit einem Satz Begründung und dem Verweis `ADR-NNN`. Lehnt der User einen Entwurf ab, bleibt die Begründung vorerst im Proposal stehen und wird in der Antwort genannt.
3. **Historie und Code-Archäologie raus.** Ersatzlos gestrichen werden Meilensteine, »Umsetzung in Schritten«, Testpläne, Änderungstabellen gegenüber anderen Proposals, Formulierungen wie »gegenüber dem ersten Entwurf«, »früher«, »entfällt«, und jede Beschreibung von Code, den es nicht mehr gibt. git trägt das. Motivation schrumpft auf Problem und Zielbild. Erst streichen, wenn Schritt 2 durch ist — sonst geht ein Grund verloren, bevor er in der ADR steht.
4. **Abschnittsnummern bleiben.** Fällt ein Abschnitt weg, bleibt die Lücke in der Nummerierung; die übrigen werden nicht nachgerückt. Zeigt ein Verweis auf einen gestrichenen Abschnitt, wird der Verweis nachgezogen, nicht der Abschnitt behalten.
5. **Offenes in der Roadmap referenzieren.** Im Proposal bleibt der Abschnitt »Was offen bleibt« mit den Punkten selbst — dort sind sie spezifiziert. Jeder davon bekommt einen Roadmap-Eintrag: Titel, Halbsatz, Bedingung (*Wenn*), Verweis `<datei>.md §N`. Einträge, deren Punkt nicht mehr offen ist, werden gestrichen.
6. **Indizes nachziehen.** Status-Kopf auf `gebaut`, mit einem Satz, was offen ist. Index-Zeile, Guide (Schichten, Einstiegspunkte, öffentliche Oberfläche — ebenfalls ohne Historie) und eine Status-Kopie im `CLAUDE.md`, falls das Projekt eine führt. Erledigte Roadmap-Abschnitte streichen.
7. **Masterplan nur auf Vorschlag.** Gibt es einen und hat das Feature die Richtung verschoben (ein Ziel erreicht, ein Nicht-Ziel aufgeweicht, eine neue Leitplanke), wird die Änderung als Entwurf vorgelegt. Sonst bleibt er unberührt.

Die Commit-Message nennt, was gestrichen wurde, welche ADRs entstanden sind, was nachgezogen wurde und welche Roadmap-Einträge auf das Offene zeigen.
