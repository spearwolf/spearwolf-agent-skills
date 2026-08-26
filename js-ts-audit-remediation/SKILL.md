---
name: js-ts-audit-remediation
description: Use when the user wants the findings of an existing project audit actually fixed rather than reported — "arbeite die Issues aus dem Audit ab", "behebe die Findings", "setz die Empfehlungen um", "Backlog abarbeiten", "Schritt für Schritt beheben", "fix the audit findings", "work through the audit". Also triggers when a `./audit.html` sits in the project root and the user asks for the problems in it to be resolved. Equally for picking a run back up after it stopped, crashed or was aborted by the user — "nimm die Arbeit am Remediation-Plan wieder auf", "mach mit dem Plan weiter", "führe den Lauf fort", "der Lauf ist abgebrochen, mach weiter", "resume the remediation run", "continue where we left off" — whenever a `./remediation-plan.md` with open packages or open findings lies in the project, no matter why the previous run ended. Producing the audit itself is a different job — that is `js-ts-project-audit`.
---

# Audit-Remediation

Aus den Findings eines Audits werden Pakete. Die Pakete fährt ein Skript, nicht
du: `scripts/remediate.sh` bringt jedes einzeln vom Abgleich bis zum Commit, in
einer abgelösten tmux-Session, mit einer Planung, die den Nutzer fragen kann.
Du planst, du fragst den Nutzer, du startest das Skript, du schließt ab — den
Rest siehst du nicht.

## Ablauf-Übersicht

1. Findings laden (1), Baseline messen (2), Scope festlegen (3).
2. Offene Entscheidungen gebündelt klären (4).
3. Pakete schnüren, ordnen, Grobplan schreiben, Freigabe holen (5).
4. `scripts/remediate.sh` starten und laufen lassen, bis kein Paket mehr offen ist (6).
5. Semver bewerten, `./audit.html` nachführen, abschließen, Folgeaudit anbieten (7).

Geplant wird zweistufig. Schritt 5 legt fest, **was** in welcher Reihenfolge
passiert — das ist, was der Nutzer freigibt. **Wie** ein Paket umgesetzt wird,
entsteht im Runner, gegen den Code, der dann tatsächlich dasteht.

| Datei | Wann |
| --- | --- |
| `references/resume.md` | **vor allem anderen**, sobald ein `./remediation-plan.md` im Projekt liegt — egal ob der Nutzer »arbeite das Audit ab« oder nur »mach weiter« sagt |
| `references/runner.md` | **nie von dir.** Den Pfad kennt das Skript |
| `references/shell-runner.md` | vor Schritt 6 — einmal, bevor du das Skript startest |
| `references/semver-and-closeout.md` | Schritt 7 — nach dem letzten Paket |
| `references/audit-report-update.md` | Schritt 7 — nur wenn eine `./audit.html` im Projekt liegt |

Dass du `runner.md` nicht liest, ist keine Sparsamkeit am falschen Ende. Der
Text steht im Kontext jedes Runners und verfällt mit ihm; in deinem bliebe er
bis zum Ende des Laufs stehen, ohne dass du je etwas damit anfingest.

## Grenzen des Laufs

Diese Regeln stehen über jeder Abwägung im Einzelfall:

- **Ohne Freigabe des Grobplans wird keine Zeile Projektcode geändert.** Auch
  nicht »schon mal das Triviale vorziehen«.
- **Wer committet, hat den Verify-Lauf selbst gefahren und seine Ausgabe
  gelesen.** Das ist der Runner, und er ist nicht der Implementierer — darauf
  beruht die Regel. Der Report eines Implementierers ist keine Evidenz. Deine
  Gegenprobe steht in Schritt 6.
- **Kein Push, kein Merge, kein Pull Request, kein Tag, kein Publish.** Der
  Lauf endet mit lokalen Commits.
- **Kein Worktree, kein neuer Branch von sich aus.** Gearbeitet wird auf dem
  Branch, den Schritt 5 benennt und der Nutzer freigibt.
- **Du schreibst keinen Projektcode und startest keinen Runner.** Weder als
  schnelle Korrektur noch nachdem das Skript abgebrochen ist. Die Pakete fährt
  `scripts/remediate.sh`, und sonst niemand.
- **Gefixt wird nur, was im Plan steht.** Kein Implementierer behebt etwas
  nebenbei; was ihm auffällt, meldet er. Ob ein Nebenbefund in diesen Lauf
  gehört, entscheidet die Scope-Regel aus Schritt 3, nicht das Gefühl des
  Runners — aber einen Fix ohne Zeile im Plan gibt es in keinem der beiden
  Fälle.
- **Der Lauf ist nicht fertig, solange die Befund-Queue Einträge hat.** Offene
  Pakete und offene Befunde sind dieselbe Bedingung. Was während des Laufs
  auffiel, wird beschlossen, nicht vergessen.
- **Der Runner schärft den Plan, er ersetzt ihn nicht.** Freigegeben sind
  Zielsetzung, Paketschnitt und Reihenfolge aus Schritt 5. Wer davon im Kern
  abweichen will, hält an und legt es dir vor, und du legst es dem Nutzer vor.

## Workflow

### 1. Findings laden

**Zuerst nachsehen, ob es diesen Lauf schon gibt.** Liegt ein
`./remediation-plan.md` im Projekt, wird nichts neu geplant, sondern
`references/resume.md` gelesen, bevor irgendetwas Weiteres passiert — auch
nicht die `audit.html` geöffnet. Das gilt unabhängig davon, wie der Nutzer
fragt: »nimm die Arbeit am Plan wieder auf« und »arbeite die Findings ab«
landen beide hier, und der zweite Satz meint fast nie einen zweiten Lauf,
sondern den, der noch offen ist. Wie der vorige Lauf geendet hat — sauber
durchgelaufen, an einem Exit-Code stehengeblieben, vom Nutzer abgewürgt oder
mit der Maschine gestorben —, ändert daran nichts; das steht in der Datei,
nicht in der Frage.

Quelle ist die JSON-Insel `<script id="audit-data" type="application/json">` in
`./audit.html`. Daraus: Findings, `summary`, `acknowledged`.

- Insel nicht parsebar: Findings best effort aus der Backlog-Tabelle
  rekonstruieren (Titel, Severity, Location, Kategorie, Empfehlung) und im Plan
  vermerken, dass die Grundlage unvollständig ist.
- Keine `audit.html` vorhanden: nicht raten. Fragen, ob stattdessen
  `js-ts-project-audit` laufen soll, oder wo die Issue-Liste liegt.
- `acknowledged` bleibt draußen. Diese Punkte hat der Nutzer bewusst
  zurückgestellt; sie werden weder geplant noch gefixt, bis er sie widerruft.

### 2. Baseline messen

Verify-Kommandos aus `package.json#scripts` ermitteln: Lint, Typecheck, Test,
Build. Jedes einmal laufen lassen und das Ergebnis festhalten. Die Kommandos
kommen wörtlich in den Kopf des Plans, nicht nur ihr Ausgang: Schritt 7 fährt
sie am Ende erneut, und wer sie dort aus `package.json` neu zusammensucht,
prüft womöglich gegen etwas anderes als die Baseline.

Das ist keine Formalie. Ohne Baseline hängt später jeder rote Lauf in der Luft:
war das mein Paket oder war das schon vorher kaputt? Was jetzt schon
fehlschlägt, wird im Plan namentlich notiert und blockiert später keinen
Commit. Ist die Baseline auf breiter Front rot, ist ihre Reparatur das erste
Paket.

Die Ausgaben gehören nicht in deinen Kontext. Umleiten und nur den Schwanz
lesen:

```bash
set -o pipefail
<kommando> > "$ARBEITSDIR/baseline-<name>.log" 2>&1; echo "exit=$?" | tee -a "$ARBEITSDIR/baseline-<name>.log"
tail -n 15 "$ARBEITSDIR/baseline-<name>.log"
```

`$ARBEITSDIR` ist das Scratchpad-Verzeichnis des Hosts; gibt es keines, ein
eigenes Verzeichnis unter dem Temp-Verzeichnis des Systems. Beides liegt
außerhalb der Versionierung. **Nicht unterhalb von `.git/`:** dorthin lässt die
CLI keinen Runner schreiben, und ein Lauf, dessen Runner ihre Diffs und
Verify-Logs nicht ablegen können, kommt nicht bis zum Commit. Der Pfad kommt in
den Kopf des Plans, weil jeder Runner ihn braucht.

Dazu `git status` und `git branch --show-current`. Ein unsauberer Arbeitsbaum
ist ein Stopp mit Rückfrage: stashen, committen oder abbrechen. Fremde
Änderungen dürfen nicht in Paket-Commits geraten.

### 3. Scope festlegen

Vorschlag: alle Findings außer `info`. Anzahl je Severity nennen, bestätigen
lassen. Der Nutzer kann eingrenzen, auf Severity-Stufen, Kategorien, einzelne
IDs oder einen Verzeichnisbaum. Was draußen bleibt, steht im Plan, damit später
niemand rätselt, warum `PERF-007` nie auftauchte.

Festgehalten wird nicht die Auswahl, sondern **die Regel, die sie erzeugt hat**.
»Alles ab medium« und »diese 24 IDs« treffen heute dieselben Findings und
morgen nicht mehr: sobald im Lauf ein Befund auffällt, den das Audit nicht
kennt, entscheidet über ihn die Regel und nicht die Liste. Sie kommt als Satz
in den Plan-Kopf (`Scope-Regel:`), formuliert in den Worten des Nutzers und so,
dass sie auf ein Finding anwendbar ist, das es noch gar nicht gibt: »ab medium
aufwärts, jede Kategorie«, »alles aus BUG und SEC, unabhängig von der
Severity«, »nur was unter `src/net/` liegt«.

Hat der Nutzer einzelne IDs gepickt, lässt sich daraus keine Regel ablesen.
Dann wird genau das gefragt, mit Vorschlag und im selben Zug wie die
Scope-Bestätigung: gilt für neu auffallende Befunde dasselbe Muster, oder gehen
sie unbesehen ins Audit? Diese Frage später zu stellen heißt, sie zwölfmal zu
stellen.

Der Scope sind diese Findings **samt dem, was ihre Behebung nach sich zieht**.
Ein Lauf, der zwölf Findings schließt und dabei fünf neue Defekte hinterlässt,
hat nichts erledigt, sondern die Buchhaltung verschoben — und das nächste Audit
sieht die neuen Defekte ohne Vorgeschichte und hält sie für vorbestehend. Zwei
Dinge, die leicht verwechselt werden und verschieden behandelt werden:

| | Was es ist | Wohin |
| --- | --- | --- |
| **Nebenbefund** | war auch ohne diesen Lauf falsch, fiel nur auf, weil jemand hinsah | in die Befund-Queue, je mit dem Urteil an der Scope-Regel; von dort in ein Paket oder als neues Finding ins Audit |
| **Folge** | hat eine Änderung dieses Laufs verursacht | in ein Paket dieses Laufs, ausnahmslos |

Beide werden von den Runnern triagiert, keiner von beiden verdunstet. Der
Unterschied entscheidet nur, *woran* der Verbleib hängt: die Folge gehört ohne
Prüfung in diesen Lauf, der Nebenbefund wird an der Scope-Regel gemessen.
Fällt er darunter, ist er Arbeit dieses Laufs — »ab medium« meint auch das
medium-Problem, das erst ein Runner gesehen hat, und »alle BUG« auch den Bug,
der im Audit fehlt. Fällt er nicht darunter, geht er als neues, offenes Finding
ins Audit, mit Fundstelle und dem Vermerk, dass er in diesem Lauf auffiel.

Zwei Fälle schlagen die Regel und kommen zum Nutzer, auch wenn der Befund klar
im Scope liegt: seine Behebung kippt eine Architekturentscheidung, die das
Projekt anderswo trägt, oder sie sprengt den Umfang eines Pakets. Dann steht
nicht mehr der Fix zur Debatte, sondern ob dieser Lauf der richtige Ort dafür
ist.

Die Regel entscheidet über die Zuordnung, nicht über den Zeitpunkt. Ein
Nebenbefund im Scope wird nicht sofort nebenbei behoben — er wandert mit seinem
Urteil in die Queue und wird in der Drain-Runde zum Paket, es sei denn, er
teilt die Ursache mit einem Paket, das ohnehin noch offen ist.

### 4. Offene Entscheidungen klären

Vor dem Plan, nicht während der Umsetzung. Gefragt wird, wo eine Entscheidung
fehlt:

- die Sektion »Offene Fragen« des Reports
- Empfehlungen, die zwei gleichwertige Wege offenlassen
- Findings, die eine Produkt- oder API-Entscheidung berühren: einen Export
  streichen, Default-Verhalten ändern, eine Dependency austauschen
- Findings, die einander widersprechen oder deren Behebung ein anderes
  gegenstandslos macht
- Findings ohne belastbare Empfehlung

**Alles andere wird nicht gefragt.** Hat ein Finding eine eindeutige Empfehlung,
gilt sie. Rückfragen zu Dingen, die im Audit bereits beantwortet sind, sind der
schnellste Weg, eine Klärungsrunde nutzlos zu machen.

Die beiden Sätze davor und dieser hier ziehen an derselben Stelle gegeneinander,
und die Auflösung ist einfach: **die Empfehlung entscheidet das Wie, nicht das
Ob.** Eine eindeutige Empfehlung gilt — es sei denn, ihre Umsetzung ändert, was
ein fremder Aufrufer zu sehen bekommt. Ein `await`, das eine Methode asynchron
macht, ist im Audit ein Einzeiler und beim Aufrufer ein Bruch; über den Einzeiler
ist entschieden, über den Bruch nicht. Der Test steht in einer Frage: Müsste
jemand, der dieses Projekt einbindet, seinen Code anfassen? Dann in die
Klärungsrunde, samt Vorschlag, wie weit der Lauf die eigenen Aufrufer mitzieht.
Sonst gilt die Empfehlung, und es wird nicht gefragt.

Gebündelt fragen, in einer Runde, je mit Vorschlag statt offener Frage. Die
Antworten kommen mit Datum in den Plan-Abschnitt »Entscheidungen«, damit ein
späterer Lauf sie nicht neu aufwirft.

### 5. Pakete, Reihenfolge, Grobplan

**Bündeln** nach gemeinsamer Ursache, nicht nach Kategorie. Drei
`any`-Findings in derselben Datei sind ein Paket; drei `any`-Findings in drei
Subsystemen sind drei. Obergrenze etwa fünf Findings oder eine Handvoll
Dateien. Sprengt ein einzelnes Finding das schon (`strict: true` über ein
gewachsenes Projekt), wird es in Teilpakete zerlegt. Ein kritischer Fix wandert
nie in ein Kosmetik-Paket, sonst versteckt sich der wichtige Commit im
unwichtigen.

**Reihenfolge** in fünf Phasen:

1. **Sicherungsnetz und Sichtbarkeit** — Lint, Typecheck, Testrunner, CI.
   Solange die Werkzeuge nicht laufen, ist jeder spätere Schritt
   unverifizierbar.
2. **Tests** für genau die Bereiche, die in Phase 3 und 4 umgebaut werden.
   Nicht flächendeckend.
3. **Korrektheit** — Bugs, Memory Leaks, Async und Races, Sicherheit. Größter
   Schaden, kleinster Blast Radius.
4. **Typsicherheit und Struktur** — Strictness-Stufen, Architektur,
   Modulgrenzen, öffentliche API. Hier entstehen die Breaking Changes.
5. **Konsistenz, DX, Doku, Dependency-Kosmetik.**

Drei Querregeln schlagen die Phasen: echte Abhängigkeiten gehen vor (verlangt
ein Bugfix erst eine Umstrukturierung, kommt die Umstrukturierung zuerst);
Dependency-Bumps, die APIs verändern, gehören nach vorn und nicht ans Ende;
breitflächige Umformatierungen oder Renames liegen ganz vorn oder ganz hinten,
nie dazwischen, weil sonst jeder folgende Diff unlesbar wird.

**Der Grobplan** wird nach `./remediation-plan.md` geschrieben, überschreibt
eine vorhandene Datei und wächst über den Lauf hinweg: du legst Kopf,
Entscheidungen, Queue und Paketliste an, die Runner füllen Paket für Paket den
Detailplan nach und tragen Ergebnisse ein.

Hier wird **nicht** ausformuliert, wie ein Paket umgesetzt wird. Ein Vorgehen,
das zwölf Pakete im Voraus beschreibt, ist ab dem dritten Paket zur Hälfte
Fiktion — der Code darunter hat sich inzwischen bewegt, Findings sind nebenbei
mit weggefallen, neue Stellen sind aufgetaucht. Was hier steht, muss reichen,
damit der Nutzer Schnitt und Reihenfolge beurteilen kann. Mehr nicht.

```markdown
# Remediation-Plan — <Projektname>

Quelle: ./audit.html vom <Datum> · Branch: <name> · erstellt: <Datum>
Baseline: `npm run lint` ✓ · `npm run typecheck` ✓ · `npm test` 3 Fehler
(vorbestehend, siehe unten) · `npm run build` ✓
Arbeitsverzeichnis: <pfad> (Diffs und Verify-Logs, außerhalb der Versionierung)
Scope: 24 von 31 Findings (3 critical, 8 high, 13 medium) · ausgenommen: info, acknowledged
Scope-Regel: alles ab medium, jede Kategorie — gilt auch für Befunde, die erst im Lauf auffallen
Stand (<Datum>): Paket 1 noch nicht begonnen · Arbeitsbaum sauber

Diese Datei führt einen Lauf des Skills `js-ts-audit-remediation` und hält
seinen Stand. Wer hier weiterarbeitet: diesen Skill laden, die eingetragenen
Hashes gegen `git log --oneline` halten, beim obersten Paket ohne `[x]`
einsteigen. Der Lauf ist erst fertig, wenn auch »Offene Befunde« leer ist.
Statusmarken: `[ ]` offen · `[~]` Detailplan steht, Umsetzung läuft · `[x]`
erledigt · `[!]` blockiert.

## Entscheidungen
- Alten `parseConfig`-Export entfernen statt deprecaten (2026-07-26)

## Konventionen
Gelten für jede Zeile, die in diesem Lauf entsteht — Code, Kommentare,
Dokumentation, CHANGELOG, Migrations-Hinweise, Commit-Messages:
- Inline-Kommentare sind erwünscht, wo sie erklären, *warum* etwas so ist.
- Keine Finding-IDs, auch nicht in der Commit-Message. Sie gehören diesem einen
  Audit, sind danach tot, und die Commit-Message überdauert den Lauf. Sie leben
  in diesem Plan und sonst nirgends; die Verbindung zwischen Finding und Commit
  trägt das Feld `Hash:` unter dem Paket — in genau der Richtung, in der jemand
  sie später sucht. Eine Commit-Message sagt in eigenen Worten, was sie ändert.
- Kein Rückblick auf den Vorzustand: kein »früher«, kein »statt bisher«, kein
  »im Zuge des Audits umgestellt«. Der Test: Ergibt der Satz für jemanden Sinn,
  der den Vorzustand nie gesehen hat? Dann bleibt er. Braucht er ihn, gehört er
  in die Commit-Message — die Historie ist bereits konserviert.

## Vorbestehende Fehler
- `test/legacy.spec.ts` — 3 Fehler, vor Lauf-Beginn vorhanden, kein Teil des Scopes

## Offene Befunde
Nebenbefunde aus den Paketen: was auch ohne diesen Lauf falsch war. Jeder
Eintrag wird beschlossen, bevor der Lauf endet — Paket oder Rückgabe ins Audit.
Ein leerer Abschnitt ist Abschlussbedingung, kein Zufall. Das Urteil am Ende
der Zeile misst den Eintrag an der Scope-Regel oben: `→ Scope`, `→ Audit`,
`→ Rückfrage`.
- [ ] `src/net/pool.ts:120` (high) — dieselbe Timer-Falle wie LEAK-001, nicht im Audit (aus Paket 3) → Scope
- [ ] `docs/api.md:40` (low) — Beispiel zeigt eine Option, die es nicht mehr gibt (aus Paket 3) → Audit

## Pakete

### [ ] 1. WebSocket-Reconnect: Listener und Timer aufräumen
- Findings: LEAK-001 (high), LEAK-003 (high)
- Ziel: <ein Satz>
- Bereich: `src/net/`
- Hängt ab von: —
- Hash: —
```

Der Abschnitt »Entscheidungen« ist die wichtigste Zeile im Kopf: an ihr misst
der Runner später, ob eine Umplanung noch im Rahmen liegt oder eine Rückfrage
braucht.

Der Abschnitt »Konventionen« steht wörtlich so in der Datei und wird
projektspezifisch ergänzt, nicht ersetzt: hat das Zielprojekt eigene Regeln für
Kommentare oder Doku, kommen sie darunter. Er steht im Plan und nicht im Brief,
weil ihn dort jeder liest, der ohnehin den Plan öffnet — Runner, Implementierer,
Reviewer —, und weil er sonst in jeden Dispatch-Prompt kopiert werden müsste.
Die Trennlinie dahinter: Plan und Reports sind Artefakte dieses Laufs und
verschwinden mit ihm. Alles, was im Repo zurückbleibt — Code, Doku, CHANGELOG
und die Commit-Message —, wird von jemandem gelesen, der weder das Audit noch
diesen Lauf kennt. Die Commit-Message steht auf der bleibenden Seite dieser
Linie, auch wenn sie im Lauf entsteht.

Das Feld **Hängt ab von** wird ernst genommen und nicht mit der bloßen
Reihenfolge verwechselt. Es benennt nur echte Zwänge — Paket 4 braucht die
Modulgrenze aus Paket 2 —, denn genau daran entscheidet sich später, was
umgestellt werden darf und was nicht. Steht dort nichts, ist das Paket
verschiebbar.

Die Überschrift eines Pakets ist ein Format und keine Formulierung:
`### [Marke] <Nummer>. <Titel>`, die Marke genau ein Zeichen, die Nummer Ziffern
mit optionalem Kleinbuchstaben. Der Skript-Weg aus Schritt 6 liest die Marken mit
`sed`; was von dieser Form abweicht, ist für ihn kein Paket.

Der Absatz mit Einstieg und Statuslegende steht wörtlich so in der Datei und
wird nicht als Redundanz zum Skill-Text weggekürzt. Er ist der Grund, warum
jemand die Datei einordnen kann, der sie als Erstes findet und nicht diesen
Skill. Die Zeile `Stand:` schreiben die Runner fort, das Feld `Hash:` bleibt bis
zum Commit des Pakets leer. Eine Modellstufe steht hier nicht: die setzt der
Runner in seinem Zug 0, wenn er den Code gesehen hat.

Eine Zeile im Kopf schreibst du **nicht**: `Lauf-Status:` gehört dem Skript aus
Schritt 6, das sie beim Start setzt, bei jedem Ausgang überschreibt und beim
Abschluss wieder wegnimmt. Sie steht direkt unter `Arbeitsverzeichnis:` und
beantwortet die eine Frage, die Paketmarken nicht beantworten können: läuft
gerade eine Schleife, hängt sie an einem Exit-Code, oder ist sie durch und nur
der Abschluss steht noch aus. Solange sie dasteht, ist der Lauf nicht fertig.

Ein Paket, dessen Ziel sich nicht in einem Satz sagen lässt, ist falsch
geschnitten — nicht unterspezifiziert, sondern falsch geschnitten.

**Freigabe.** Der Grobplan wird vorgelegt, und zwar ausdrücklich mit Branch und
Commit-Modus: »<N> Pakete, <N> Commits direkt auf `<branch>`, ohne
GPG-Signatur«. Dazu ein Satz, dass jedes Paket unmittelbar vor seiner Umsetzung
gegen den dann aktuellen Code detailliert wird, und dass eine Umplanung, die
Zielsetzung oder Architektur berührt, zurück zum Nutzer kommt. Ebenso ein Satz
zu den Folgen: zieht ein Fix anderswo etwas nach sich, wird das in diesem Lauf
mit behoben, notfalls in zusätzlichen Paketen — die Paketzahl ist damit eine
Untergrenze, keine Zusage. Und ein Satz zu den Nebenbefunden, der die
Scope-Regel wörtlich wiederholt: was während des Laufs auffällt und unter sie
fällt, wird in diesem Lauf mit behoben, der Rest geht als neues Finding ins
Audit — vorgelegt wird beides, vor dem Abschluss, in einer Runde. Freigegeben
werden Paketschnitt und Reihenfolge.
Ohne diese Freigabe beginnt die Umsetzung nicht.

In dieselbe Ansage gehört, wie es danach weitergeht: die Pakete fährt
`scripts/remediate.sh` in einer abgelösten tmux-Session. Die Planung jedes
Pakets bekommt dort ein eigenes Fenster und kann den Nutzer fragen — er wird
also gebraucht, aber nur am Anfang jedes Pakets, und schließen muss er nichts. Die Umsetzung läuft ohne ihn, mit
den Rechten, die ihr Permission-Modus ihnen gibt. Das ist ein Tausch, und er
wird genannt, nicht vorausgesetzt.

Dazu der Satz, der ihm die Wartezeit zurückgibt: er muss nicht danebensitzen.
Gemeldet wird jedes committete Paket, das Ende des Laufs und jeder unerwartete
Ausgang, auf zwei voneinander unabhängigen Wegen. Diese Session schickt eine
`PushNotification`, die bei offener Remote-Control-Verbindung auf seinem Telefon
landet und ihn nichts kostet außer der Session, die dafür leben muss. Die
Schleife selbst schickt zusätzlich eine Desktop-Nachricht, die auch dann noch
kommt, wenn diese Session längst geschlossen ist; `NOTIFY_CMD` nimmt ein
beliebiges weiteres Kommando dafür, voreingestellt ist dort nichts, und über
den Weg entscheidet er, weil Paketnummern und Commit-Hashes hindurchgehen.

Im selben Aufwasch der Verbleib des Plans, als Ansage statt als Frage: »am Ende
nimmt ein Commit `./remediation-plan.md` mit ins Repo, und ein zweiter räumt ihn
aus dem Arbeitsbaum — die Historie behält ihn, der Projektroot bleibt leer. Sag
Bescheid, wenn er stattdessen ungetrackt liegenbleiben soll«. Ohne Widerspruch
wird committet;
widerspricht der Nutzer, steht das datiert in »Entscheidungen«, weil der
Abschluss danach greift. Während des Laufs bleibt die Datei in jedem Fall
ungetrackt: sie trägt die Hashes der Commits, in denen sie deshalb nicht liegen
kann.

### 6. Die Schleife

Du drehst sie nicht selbst. Sobald der Grobplan freigegeben ist, startest du
`scripts/remediate.sh` — ungefragt, das ist die Freigabe:

```bash
ORCHESTRATOR_SESSION=<deine Session-Kennung> <skill>/scripts/remediate.sh
```

Die Kennung ist die deiner eigenen Session — bei Claude Code der UUID-Abschnitt
im Pfad deines Scratchpad-Verzeichnisses. Sie kostet nichts und beantwortet am
Ende eine Frage, die sonst niemand beantworten kann: Der Lauf zählt zum Schluss
zusammen, was er verbraucht hat, und deine Session ist der einzige Posten
darin, den er nicht von sich aus findet — Plan, Start und Abschluss laufen ja
bei dir. Kennst du deine Kennung nicht, lässt du die Variable weg; die Tabelle
sagt dann selbst, dass dieser Posten fehlt.

Das Skript hängt sich in eine abgelöste tmux-Session und kommt sofort zurück.
Ab da läuft es unabhängig von dir: es liest die Marken im Plan, fährt je Paket
Zug 0 in einem eigenen Fenster der Session und die Züge 1 bis 5 als eigenen
Prozess, prüft
jedes Ergebnis gegen `git` und das Verify-Log und hört auf, wenn kein Paket mehr
offen ist.

Du drehst sie nicht, du begleitest sie. Vier Dinge, die ersten drei sofort:

1. Die Startausgabe wörtlich an den Nutzer weitergeben — sie nennt die
   tmux-Session, wie er sich anhängt und wo Journal, Sperre und Mitschrift
   liegen.
2. Ihm sagen, dass Zug 0 des ersten Pakets dort in einem eigenen Fenster auf
   ihn wartet und dass er es nicht zu schließen braucht.
3. **Sofort danach den Wachposten auf das Journal setzen** (unten). Das ist
   keine Kür: ohne ihn erfährt niemand, dass der Lauf fertig ist.
4. Auf jedes Ereignis reagieren, das er meldet. Die Exit-Tabelle steht in
   `references/shell-runner.md`; nur `0` führt weiter zu Schritt 7.

**Du blockierst nicht, und du wirst geweckt.** Das sind zwei Sätze, und sie
widersprechen einander nicht. Ein Lauf dauert Stunden; ein Kommando, das so
lange im Vordergrund läuft, macht deine Session für diese Stunden unbrauchbar —
genau die Session, in der der Nutzer nebenher etwas anderes fragen wollte.
Verboten ist deshalb das Warten im Vordergrund: kein blockierender Aufruf, kein
`ScheduleWakeup` im Minutentakt, kein Nachsehen »nur mal kurz«. Der Wachposten
läuft nebenher und kostet dich nichts, solange nichts passiert.

Was ohne ihn passiert, ist gemessen: am 2026-08-26 lief eine Schleife über fünf
Pakete sauber durch, schrieb ihre Schlusszeile um 08:58:42 in ein abgelöstes
Pane, und das Pane starb in derselben Sekunde. Der Abschluss blieb liegen, bis
der Nutzer Stunden später von selbst danach fragte.

#### Der Wachposten

Ein `Monitor` auf Journal und Sperre. Beide Pfade nennt die Startausgabe
wörtlich, in den Zeilen `Journal:` und `Sperre:`. Jede gemeldete Zeile weckt
dich; die Schleife läuft davon unbeeindruckt weiter.

```bash
J='<Journal-Pfad aus der Startausgabe>'
L='<Arbeitsverzeichnis aus der Startausgabe>/.remediate.lock'
z() { if [ -f "$J" ]; then wc -l < "$J" | tr -d ' '; else echo 0; fi; }
n=$(z); fertig=0
neues() {
  local m neu; m=$(z); [ "$m" -gt "$n" ] || return 0
  neu=$(sed -n "$((n+1)),${m}p" "$J"); n=$m
  printf '%s\n' "$neu" | grep -E 'status=|marke=\[x\]|marke=\[!\]|ende exit=' || true
  case "$neu" in *'ende exit='*) fertig=1 ;; esac
}
i=0; while [ ! -d "$L" ] && [ "$i" -lt 30 ]; do sleep 2; i=$((i+1)); done
[ -d "$L" ] || { echo "Nach 60s keine Sperre $L — die Schleife ist nie angelaufen."; exit 0; }
while :; do
  neues; [ "$fertig" = 1 ] && break
  if [ ! -d "$L" ]; then
    neues
    [ "$fertig" = 1 ] || echo "Sperre weg, Journal ohne »ende exit=« — die Schleife ist gestorben, ohne ihren Trap zu erreichen."
    break
  fi
  sleep 20
done
```

`persistent: true`, denn ein Lauf überschreitet jede Frist, die der Monitor
sonst kennt. Er beendet sich selbst — du musst ihn nicht abräumen.

Warum die Sperre und nicht nur das Journal: ein fortgesetzter Lauf schreibt in
dasselbe Journal, in dem der Abbruch des Vorgängers schon steht. Wer nur nach
`ende exit=` sieht, hält den frischen Lauf für längst beendet und verabschiedet
sich, bevor die erste Zeile kommt — gemessen beim Bau dieses Schnipsels, mit
einem Journal, das auf `ende exit=21` endete. `.remediate.lock` dagegen
existiert genau, solange eine Schleife arbeitet: der EXIT-Trap räumt es weg.
Daraus fällt der zweite Gewinn ab — verschwindet die Sperre, ohne dass eine
`ende`-Zeile kam, ist die Schleife gestorben, ohne ihren Trap zu erreichen
(`kill -9`, Terminal weg, Strom weg). Genau dieser Ausgang meldet sich sonst
nirgends. Die Minute Geduld am Anfang ist ebenfalls nötig: die Sperre entsteht
erst im abgelösten Prozess, also ein paar Sekunden nachdem das Skript
zurückgekommen ist.

Der Filter lässt genau die Zeilen durch, auf die jemand reagiert, und er lässt
keine Abbruchform aus: jeder benannte Ausgang endet mit `ende exit=`, jeder
unbenannte mit der verschwundenen Sperre. Der `[~]`-Vermerk nach Zug 0 fehlt
absichtlich — halbe Pakete sind kein Anlass, jemanden anzusprechen.

#### Was du je Ereignis tust

Der Nutzer hat ausdrücklich um eine Nachricht nach jedem Paket und am Ende
gebeten. Das schlägt die übliche Zurückhaltung bei `PushNotification`: hier ist
sie bestellt, nicht aufgedrängt. Eine Zeile, das Wichtigste zuerst, keine
Wiederholung dessen, was der Nutzer ohnehin vor sich sieht.

| Zeile im Journal | Was sie heißt | Was du tust |
| --- | --- | --- |
| `status=committed` | Paket ist im Repo | Push mit Paketnummer, Kurzhash und Paketstand |
| `status=dropped`, `marke=[x]` | Paket entfiel ohne Commit | Push, knapp |
| `status=question`, `status=blocked`, `marke=[!]` | die Schleife hält an und will eine Entscheidung | Push, der die Frage nennt, dann `references/shell-runner.md` |
| `ende exit=0` | die Schleife ist durch | Push, und **sofort** Schritt 7 beginnen. Nicht auf ein Signal des Nutzers warten — dieses Warten ist der Fehler, gegen den der Wachposten gebaut ist |
| `ende exit=` mit einer anderen Zahl | Abbruch | Push, der die Zahl nennt, dann die Exit-Tabelle |

Sitzt der Nutzer gerade am Terminal, meldet `PushNotification` »not sent«. Das
ist kein Fehler, sondern die eingebaute Doppelungsbremse: er liest deine
Antwort ohnehin. Trotzdem senden, statt vorher zu raten, ob er da ist.

**Stirbt deine Session, stirbt der Wachposten mit ihr.** Dafür gibt es zwei
Auffangnetze, die keine Session brauchen: die Schleife schickt bei denselben
Anlässen selbst eine Desktop-Nachricht (`notify-send`, und über `NOTIFY_CMD`
auf einen beliebigen weiteren Weg), und sie schreibt ihren Zustand als Zeile
`Lauf-Status:` in den Kopf des Plans. Ein Agent, der später hier einsteigt,
liest sie über `references/resume.md`. Keines der drei Netze ersetzt die
anderen: der Wachposten kennt den Kontext, die Desktop-Nachricht überlebt die
Session, die Plan-Zeile überlebt die Maschine.

**Vor dem ersten Start** `references/shell-runner.md` lesen. Danach nicht mehr:
der Inhalt gehört den Runnern, nicht dir.

Was du **nicht** tust: keinen Runner selbst starten, keinen Subagenten für ein
Paket, keine eigene Schleife. Auch nicht, wenn das Skript abbricht — ein Abbruch
ist eine Meldung an den Nutzer, keine Einladung, es von Hand zu machen.

Läuft der Lauf gerade und der Nutzer fragt nach dem Stand, sieh nach, ohne zu
stören: `tmux capture-pane -p -t <session>:0` zeigt das Pane der Schleife, das
Journal zeigt die Zeilen. Beides ist ein Blick, kein Warten. Häng dich nicht
selbst an die Session — dort sitzt der Nutzer.

### 7. Abschluss

Nach dem letzten Paket `references/semver-and-closeout.md` lesen. Dort stehen
die Drain-Phase für die Befund-Queue, die Semver-Bewertung, der Umgang mit dem
CHANGELOG des Zielprojekts, das Nachführen der `./audit.html`, der
Abschluss-Commit und die Übergabe.

## Prinzipien

- **Die Empfehlung gilt.** Das Audit hat den Weg bereits benannt. Ein anderer
  Weg braucht einen Grund, der im Detailplan oder im Report eines Subagenten
  steht, keine stille Umdeutung.
- **Bugfix heißt Test zuerst.** Ein Paket, das einen Korrektheitsfehler behebt,
  schreibt zuerst den fehlschlagenden Test, sieht ihn rot, und behebt dann.
  Ohne rot gesehenen Test weiß niemand, ob der Test den Fehler überhaupt fangen
  würde. Ausgenommen sind Pakete ohne testbaren Kern: Konfiguration,
  Dokumentation, Dependency-Bumps, reine Formatierung. Fehlt dem Projekt jede
  Testinfrastruktur, ist das selbst ein Finding und gehört in Phase 1 — mitten
  im Bugfix wird kein Test-Harness nachgerüstet.
- **Der Plan ist die Wahrheit, nicht die Erinnerung.** `./remediation-plan.md`
  und `git log` schlagen das, was du zu wissen glaubst. Die Umkehrung wiegt
  schwerer: was nur in einem Agentenkontext steht und nicht im Plan, gibt es
  nach dessen Rückgabe nicht mehr.
- **Dein Kontext gehört der Koordination.** Du liest keine Diffs, keine
  Verify-Ausgaben außer fünfzehn Zeilen Schwanz, keine Subagenten-Reports im
  Volltext und keine Referenzdatei, die einem anderen Zug gehört. Ein
  Orchestrator, der über zwölf Pakete vollläuft, verliert genau das Wissen, für
  das er die ganze Zeit dagesessen hat.
- **Sprache.** Antworten an den Nutzer in der Sprache seiner Anfrage.
  Commit-Messages in der Sprache, die `git log` des Projekts zeigt.

## Zusammenspiel mit anderen Skills

Dieser Skill funktioniert allein und setzt keine Erweiterung voraus. Sind die
Superpowers-Skills installiert, gilt folgende Aufteilung, damit sich nichts
doppelt:

- `js-ts-project-audit` liefert den Input und übernimmt am Ende den Folgelauf.
  Es fixt nie selbst, dieser Skill auditiert nie selbst. Dass hier am Ende
  trotzdem in die `./audit.html` geschrieben wird, ist kein Bruch dieser Linie:
  gebucht wird, was Reviewer-Urteil und Commit-Hash belegen, und der Score ist
  die Formel des Audits auf ein verändertes Backlog. Die Bewertung des Codes
  bleibt beim Folgelauf. Auch die Optik gehört dorthin: Schritt 7 fasst die
  Gestaltung der Seite nicht an — der nächste Audit-Lauf rendert sie ohnehin
  nach seinen eigenen Vorgaben neu.
- Fährt der Nutzer die Umsetzung ausdrücklich über
  `superpowers:subagent-driven-development`, gewinnt dessen Prozess innerhalb
  eines Pakets. Findings-Quelle, Paketschnitt, der Runner als eigener Agent,
  die Befund-Queue, die Fortschreibung von `./remediation-plan.md`, Semver und
  Folgeaudit bleiben hier — ein fremder Umsetzungsprozess ersetzt das Briefing,
  nicht den Abgleich gegen den aktuellen Code und nicht das Dokument, an dem
  ein Dritter den Stand abliest.
- Bleibt ein Verify-Lauf nach zwei Runden unerklärlich rot, ist das ein
  Debugging-Problem. Dann nicht weiterraten: `superpowers:systematic-debugging`,
  falls vorhanden, sonst Paket blockieren und berichten.
- Wurde ausnahmsweise auf einem Feature-Branch gearbeitet, ist die Integration
  Sache des Nutzers. Dieser Skill pusht und merged nicht.
