# Was auf GitHub entsteht

Gilt in Schritt 5, vor dem ersten Schreibvorgang. Hier stehen Titel, Body,
Labels und die Regeln, nach denen ein Finding zu einem Issue wird, das ohne
das Audit funktioniert.

## Englisch, ausnahmslos

Titel, Body und jeder Kommentar, den dieser Lauf schreibt, sind englisch. Das
gilt unabhängig von der Sprache des Reports, der Nutzeranfrage und der
Commit-Historie des Projekts. Ein Issue-Tracker ist die eine Oberfläche des
Projekts, die Fremde lesen.

Übersetzt wird nicht wörtlich, sondern neu geschrieben. Ein deutscher
`description`-Absatz, der aus dem Kontext des Reports lebt, ergibt Wort für
Wort übertragen ein Issue, das im Nichts hängt. Codebezeichner, Pfade, Flags
und Fehlermeldungen bleiben, wie sie im Projekt heißen.

Antworten an den Nutzer bleiben in dessen Sprache. Nur was nach GitHub geht,
ist englisch.

## Das Issue steht allein

Die härteste Regel dieses Skills, und die, an der ein Agent am ehesten
schummelt. Ein Issue darf keinen Bezug auf Folgendes enthalten, in keiner
Form, auch nicht beiläufig im Nebensatz:

- das Audit, den Report, die Datei `audit.html`, ein Audit-Datum, einen
  Health-Score, eine Score-Historie
- eine Finding-Nummer, nackt, in Klammern, als Label oder als Kompositum
- die Kategorie- oder Domain-Bezeichnung als Verweis auf »das Audit« statt als
  Sacheigenschaft
- `remediation-plan.md`, einen Remediation-Lauf, ein »Paket«
- Formulierungen wie »as noted in the audit«, »the report recommends«,
  »this finding«, »flagged during the review«
- die Tatsache, dass ein Agent das Issue geschrieben hat

Der Prüfsatz: Ergibt das Issue für jemanden Sinn, der nie ein Audit gesehen
hat und keinen Zugriff darauf hätte? Wenn nein, fehlt Substanz im Body — und
die wird ergänzt, nicht durch einen Verweis ersetzt.

Verweise auf **andere GitHub-Issues** sind erlaubt und erwünscht, etwa
`Blocked by #12` oder `Related to #47`. Sie zeigen auf etwas, das genauso
dauerhaft ist wie das Issue selbst. Ebenso erlaubt: Commit-Hashes,
Permalinks in dieses Repo, Links auf externe Dokumentation.

Die Richtung ist bewusst asymmetrisch. Der Report darf auf das Issue zeigen,
weil das Issue bleibt. Das Issue darf nicht auf den Report zeigen, weil der
Report beim nächsten Audit-Lauf überschrieben wird.

## Titel

- Imperativ, englisch, höchstens etwa 70 Zeichen.
- Benennt das Problem oder die Handlung, nicht die Datei: `Clear the reconnect
  timer when the socket closes`, nicht `socket.ts:88`.
- Keine Severity, kein Präfix, keine Nummer, kein Emoji.
- Kein Kategoriename als Aufhänger (`Security: …`) — dafür gibt es Labels.

## Body

````markdown
**Where:** [`src/net/socket.ts:88`](https://github.com/owner/repo/blob/<sha>/src/net/socket.ts#L88)

## What's wrong

<Ein bis drei Absätze: was an dieser Stelle passiert und unter welchen
Umständen es schiefgeht. Konkret genug, dass jemand es nachvollziehen kann,
ohne den Befund zu wiederholen, der ihn gefunden hat.>

```ts
<Kurzer Ausschnitt der betroffenen Stelle, wenn er den Fehler zeigt.
Höchstens etwa 15 Zeilen. Weglassen, wenn er nichts erklärt.>
```

## Why it matters

<Die Konsequenz. Was bricht, für wen, wie oft.>

## Suggested fix

<Der konkrete Weg. Die Empfehlung aus dem Report, ins Englische neu
geschrieben und um das ergänzt, was ohne den Report fehlen würde.>

---

Severity: high · Effort: M · Area: Resource management · Domain: Code & runtime

<!-- audit-sync v1 fp:a1b2c3d4e5f6 -->
````

- Die Fußzeile wiederholt, was auch als Label dransteht. Das ist keine
  Redundanz, sondern das, was in einer Mail-Benachrichtigung und in einem
  exportierten Issue übrig bleibt.
- Der Marker steht als letzte Zeile und wird in keiner Fassung weggelassen.
- Hat ein Finding keine `recommendation`, entfällt der Abschnitt
  `Suggested fix` ersatzlos. Kein »no recommendation available«.

## Permalink der Fundstelle

Der Link zeigt auf einen Commit-SHA, nicht auf einen Branch. Ein
`blob/main/...`-Link zeigt in einem Jahr auf eine andere Zeile.

Der SHA muss auf dem Remote existieren, sonst läuft der Link ins Leere.
Ermitteln über den Tracking-Branch, nicht über `HEAD`:

```bash
git rev-parse @{upstream} 2>/dev/null || git rev-parse origin/HEAD
```

Schlägt beides fehl, gibt es keinen Permalink: dann steht die Fundstelle als
Codespan da (`` `src/net/socket.ts:88` ``) und nicht als Link. Ein 404 ist
schlimmer als kein Link.

Bei einem Zeilenbereich `#L88-L95`, bei einem reinen Dateiverweis kein
Zeilenanker. Findings ohne Fundstelle gibt es laut Audit-Skill nicht; taucht
doch eines auf, wandert der Ort in den Fließtext und der Fundstellen-Block
entfällt.

## Labels

Eigener Namensraum. Der Lauf legt nur Labels an, deren Präfix ihm gehört, und
fasst fremde Labels nie an — weder um sie zu entfernen noch um sie
umzufärben. Ein bereits vorhandenes Label mit passendem Namen wird benutzt,
nicht überschrieben.

| Label | Quelle | Farbe |
| --- | --- | --- |
| `audit` | auf jedem Issue dieses Laufs | `#333333` |
| `severity:critical` \| `high` \| `medium` \| `low` | `finding.severity` | `#b60205` `#d93f0b` `#fbca04` `#c2e0c6` |
| `domain:code` \| `domain:harness` | `finding.domain` | `#1d76db` `#5319e7` |
| `area:<slug>` | `finding.category` (Tabelle unten) | `#ededed` |
| `effort:s` \| `m` \| `l` | `finding.effort` | `#c5def5` |
| `component:<slug>` | fachliche Domäne aus dem Projektportrait | `#bfd4f2` |

`severity:info` gibt es nicht: `info`-Findings werden standardmäßig nicht
veröffentlicht. Wird der Scope ausdrücklich darauf erweitert, bekommen sie
`severity:low`, damit die Skala nicht durch eine Stufe wächst, die im Score
null wiegt.

Jedes angelegte Label bekommt eine englische `description`. Bei `domain:` ist
sie nicht optional, weil das Label allein kryptisch ist:

- `domain:code` — *Defects in what the software does at runtime.*
- `domain:harness` — *Defects in how the project is built, tested and shipped.*

### Kategorie-Slugs

Fest verdrahtet, nicht pro Lauf neu erfunden. Die Kategorie steht im Report in
der Report-Sprache; der Slug ist immer dieser hier.

| Kategorie im Report | `area:` | Anzeigename in der Fußzeile |
| --- | --- | --- |
| Architektur & Struktur | `architecture` | Architecture |
| Projektaufbau & Build | `build` | Build setup |
| Developer Experience | `dx` | Developer experience |
| Öffentliche API | `public-api` | Public API |
| Implementierungsstand | `completeness` | Completeness |
| Testabdeckung & Teststrategie | `testing` | Testing |
| Lesbarkeit & Clean Code | `readability` | Readability |
| Bugs & Korrektheitsrisiken | `correctness` | Correctness |
| Memory Leaks & Ressourcen | `resources` | Resource management |
| Async & Concurrency | `async` | Concurrency |
| Konsistenz | `consistency` | Consistency |
| Typsicherheit (TS) | `typing` | Type safety |
| Sicherheit | `security` | Security |
| Dependencies | `dependencies` | Dependencies |
| Performance | `performance` | Performance |

Führt ein Report eine Kategorie, die hier nicht steht, wird kein Slug
erfunden: das Issue bekommt kein `area:`-Label, und der Fall steht im Bericht.
Ein selbst ausgedachter Slug zerreißt den Filter beim nächsten Lauf.

### `component:` aus dem Projektportrait

Das Portrait aus Schritt 1b des Audits führt 3–7 fachliche Domänen, je mit
repräsentativen Pfaden. Fällt die Fundstelle eines Findings unter die Pfade
**genau einer** dieser Domänen, bekommt das Issue `component:<slug>` mit dem
kleingeschriebenen Domänennamen als Slug.

Fällt sie unter mehrere oder unter keine, gibt es kein Label. Kein Raten nach
Dateinamen, keine Vererbung über Verzeichnisgrenzen. Ein falsches
`component:`-Label ist schlimmer als keins, weil es eine Filterung
vortäuscht, die nicht stimmt.

### Label-Abgleich beim Aktualisieren

Ändert ein Folgelauf die Severity eines Findings, wird das alte
`severity:`-Label entfernt und das neue gesetzt. Dasselbe gilt für `domain:`,
`area:`, `effort:` und `component:`. Innerhalb eines Namensraums trägt ein
Issue genau ein Label; zwei Severity-Labels sind ein Fehler, kein Verlauf.

Labels außerhalb dieser Namensräume bleiben in jedem Fall unangetastet. Ein
von Hand gesetztes `wontfix`, `good first issue` oder `blocked` ist eine
menschliche Aussage und wird gelesen, nicht korrigiert.

## Kommentare, die dieser Lauf schreibt

Drei Anlässe, alle englisch, alle knapp:

| Anlass | Inhalt |
| --- | --- |
| Body von Hand bearbeitet, Fakten haben sich geändert | Was sich an Fundstelle, Umständen oder Severity geändert hat, als kurzer Absatz. Der Body wird dabei nicht angefasst. |
| Schließ-Kandidat, vom Nutzer freigegeben | Ein Satz mit dem Beleg: Commit-Hash, oder dass die Stelle im aktuellen Stand nicht mehr auffindbar ist. |
| Severity deutlich gestiegen | Ein Satz, warum. Nur bei Sprüngen über mindestens zwei Stufen; sonst reicht das Label. |

Keine Kommentare für Routine. Ein Lauf, der jedes Issue mit »synced« versieht,
macht die Benachrichtigungen des Teams wertlos.
