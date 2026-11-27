# Doctor

Gesamtuntersuchung der Dev-Docs eines Projekts: Stimmen sie in sich (Drift-Check), und passen sie zum Modell dieses Skills (Konformitäts-Check)? Danach werden sie in einem Lauf behandelt. Geprüft wird das Modell — Rollen der Dokumente, Änderungsrechte, ADR-Schwelle und Geltungsbereich —, nicht die Form. Eigene Pfade, Überschriften und Status-Werte des Projekts bleiben, wie sie sind; eine Abweichung davon ist kein Fund.

Der Auftrag zum Doctor ist eine Freigabe für alles, was der Agent nach Schritt 6 des Skills ohnehin darf. Er ist **keine** Freigabe für ADR, Masterplan, Zuständigkeiten, Vorrangregel oder `CLAUDE.md`/`AGENTS.md` — dafür gibt es die Freigaberunde in Schritt 4.

## 1. Drift-Check

Die acht Prüfpunkte aus `references/consolidate.md`, Abschnitt »Drift-Check«, unverändert. Nur lesen.

## 2. Konformitäts-Check

Nur lesen. Je ADR zuerst Kopf, Entscheidung und `Bezug`; den Rest nur, wenn ein Punkt ihn braucht.

1. **ADR unter der Schwelle.** Jede ADR mit Status `akzeptiert` an der Schwelle messen (Skill, »Was eine ADR bindet«): Übergreift sie Domains, oder ist sie teuer umkehrbar? Liegt sie darunter, lautet der Vorschlag: ins zuständige Proposal ablösen (Schritt 5). Zweifelsfälle stehen als solche im Befund, mit der einen Tatsache, die den Ausschlag gäbe.
2. **Geltungsbereich fehlt.** Eine ADR über der Schwelle ohne `Gilt für` bekommt einen Entwurf für das Feld — abgeleitet aus `Bezug`, Entscheidung und den Codestellen, die sie tatsächlich betrifft, eher zu eng als zu weit.
3. **Leitplanke statt Entscheidung.** Eine ADR, die keine konkrete Wahl trifft, sondern ein Prinzip oder Ziel formuliert (»wir bevorzugen Einfachheit«, »Performance vor Features«), ist Masterplan-Stoff. Gibt es einen Masterplan, wird die Leitplanke dort als Entwurf vorgeschlagen und die ADR durch den Abschnitt abgelöst. Gibt es keinen, steht der Fund mit der Frage im Befund, ob einer angelegt werden soll; bis dahin bleibt die ADR, wie sie ist.
4. **Norm nur in der ADR.** Eine akzeptierte ADR, deren Ergebnis in keinem Proposal (§3) und keinem Masterplan steht. Die Regel wird in §3 des zuständigen Proposals nachgezogen, mit einem Satz warum und dem Verweis `ADR-NNN`.
5. **ADR-Bestand und Verweise.** Jede Datei unter `docs/adr/` steht im Index und umgekehrt; keine Nummer doppelt, keine Lücke durch Löschen oder Umbenennen (`git log --diff-filter=DR --name-status -- docs/adr`). Jede Ablösung ist auf beiden Seiten eingetragen. Jeder Verweis `ADR-NNN` in Docs, Code und Tests zeigt auf eine existierende ADR; zeigt er auf eine abgelöste, wird er auf die Nachfolgerin gelenkt, sofern die Aussage dort weitergilt.
6. **Masterplan ohne Feature-Details.** Feature-Details, Umsetzungsstand oder Status-Kopien im Masterplan gehören ins zuständige Proposal.
7. **Agent-Einstieg.** `CLAUDE.md`/`AGENTS.md` des Projekts: Gibt es den Block, der auf die Docs, die Spec-Regel und die Änderungsrechte zeigt? Widerspricht eine Regel dort dem Skill — etwa »vor jeder Aufgabe alle ADRs lesen« oder »jede Entscheidung bekommt eine ADR«? Dann den Widerspruch benennen und eine Fassung vorschlagen; die Regel des Projekts gilt, bis der User entscheidet.

## 3. Befund und eigene Fixes

Eine Liste in der Antwort, gegliedert in Drift-Check 1–8 und Konformität 1–7, in dieser Reihenfolge. Jeder Punkt hat eine eigene Zeile, auch ohne Fund (»ohne Fund«); ein Punkt ohne Zeile gilt als nicht geprüft. Je Fund: Fundstelle, Vorschlag und Recht — *selbst* oder *Freigabe* (Schritt 6 des Skills).

Was *selbst* ist, setzt der Agent im selben Durchgang um und führt es in der Antwort als erledigt auf: Proposals und Guide nachziehen (Konformität 4, die Proposal-Seite von 6), Roadmap-Fortschritt, Index-Zeilen für bestehende Dateien, Verweise umlenken, die fehlende Seite einer Ablösung, deren andere Seite akzeptiert ist. Konsolidieren gehört nicht dazu — siehe Schritt 6.

## 4. Freigaberunde

Alle Entwürfe, die eine Freigabe brauchen, kommen **gebündelt** in derselben Antwort, nach dem Befund. Nummeriert wird nur innerhalb dieser Runde. Die Nummern stehen nirgends sonst und gelten nur für die Antwort des Users.

- Gruppiert nach Art: Ablösungen ins Proposal, `Gilt für`-Felder, Leitplanken für den Masterplan, Masterplan-Kürzungen, Änderungen am Agent-Einstieg.
- Gleichartige Entwürfe als Tabelle, die en bloc freigegeben werden kann. Ein `Gilt für` für zwölf ADRs ist eine Tabelle mit zwölf Zeilen, nicht zwölf Abschnitte.
- Jeder Entwurf ist konkret genug, um ihn ohne Nachlesen freizugeben: bei einer Ablösung die Zeile, die in §3 entsteht, samt Ziel-Abschnitt; beim Masterplan der Wortlaut.
- Teilfreigaben gelten wie gegeben (»1–4 ja, 6 nein«). Was nicht freigegeben ist, bleibt unverändert und wird in der Abschlussantwort genannt.

Dann auf die Antwort warten.

## 5. Freigegebenes eintragen

- **Ablösen ins Proposal:** Die Regel steht als Zeile in §3 des zuständigen Proposals — geltende Regel, ein Satz warum, Verweis `ADR-NNN` auf die Gründe. Die ADR bekommt den Status `abgelöst durch <datei>.md §N.M` und bleibt sonst unverändert; Datei und Index-Zeile bleiben. Ab jetzt bindet die Zeile im Proposal, nicht die ADR.
- **Leitplanke in den Masterplan:** Leitplanke im Masterplan eintragen, die ADR mit `abgelöst durch docs/masterplan/<datei>.md §N` markieren.
- **`Gilt für`:** Feld im Kopf ergänzen, sonst nichts an der ADR ändern.
- Lehnt der User eine Ablösung ab, gilt die ADR als über der Schwelle; fehlt ihr `Gilt für`, wird es im selben Zug nachgereicht oder als nächster Entwurf vorgelegt.

Wird committet, dann getrennt: eigene Fixes in einem Commit, freigegebene Änderungen an ADR und Masterplan in einem zweiten. Jede Commit-Message nennt, was sich verschoben hat.

## 6. Konsolidieren anbieten

Zeigt Drift-Check 5 gebaute Proposals mit Historie, wird das Konsolidieren angeboten — je Proposal nach `references/consolidate.md`, nicht ungefragt im Doctor-Lauf.
