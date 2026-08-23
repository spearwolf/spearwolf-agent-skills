---
name: audit-github-sync
description: Use when an existing `./audit.html` should be reconciled with the issues of a GitHub repository — "synchronisiere die audit issues mit github", "leg für die findings github issues an", "gleich das audit mit den issues ab", "hol den stand der github issues ins audit", "push the audit backlog to github", "sync audit findings with github issues". Runs in both directions: publishes backlog findings as English, self-contained GitHub issues with labels for severity, domain, category and component, and writes issue state, wontfix decisions, assignees and human comments back into the report. Needs a GitHub remote plus working `gh` or GitHub MCP access. Producing the audit is `js-ts-project-audit`; fixing findings is `js-ts-audit-remediation`.
---

# Audit ↔ GitHub-Sync

Das Backlog aus `./audit.html` und die Issues eines GitHub-Repos werden in einem Lauf abgeglichen, in beide Richtungen. Der Lauf schreibt genau drei Dinge: GitHub-Issues, `./audit-sync.json` und Datenwerte in `./audit.html`.

## Ablauf-Übersicht

1. Fünf Vorbedingungen prüfen (1), Findings laden (2).
2. Bestand auf GitHub erfassen und zuordnen (3).
3. Abgleichplan vorlegen, Freigabe holen (4).
4. GitHub schreiben (5), Report und Sidecar nachführen (6), Bericht (7).

Die Referenzdateien werden erst gelesen, wenn ihr Schritt dran ist — nicht vorab:

| Datei | Wann lesen |
| --- | --- |
| `references/matching-and-state.md` | Schritt 3 — vor der ersten Zuordnung |
| `references/github-artifacts.md` | Schritt 5 — vor dem ersten Schreibvorgang |
| `references/reverse-sync.md` | Schritt 6 — vor dem Nachführen der `audit.html` |

## Grenzen des Laufs

Diese Regeln stehen über jeder Abwägung im Einzelfall:

- **Vor der Freigabe aus Schritt 4 wird nichts auf GitHub geschrieben.** Kein Issue, kein Kommentar, kein Label, auch nicht »schon mal die Labels anlegen«.
- **Kein Issue wird geschlossen, ohne dass der Nutzer die Liste bestätigt hat.** An einem offenen Issue kann jemand sitzen, den dieser Lauf nicht sieht.
- **Kein Projektcode, kein Commit, kein Branch, kein Push, kein Pull Request.** Der Lauf ändert `./audit.html` und `./audit-sync.json` im Arbeitsbaum und übergibt sie ungetrackt oder ungestaged an den Nutzer.
- **Keine Bewertung.** Severity, Kategorie, Domain und Empfehlung kommen aus dem Audit und werden übernommen, nicht nachjustiert. Wer hier nachbessert, erzeugt einen Score, den der nächste Audit-Lauf nicht reproduzieren kann.
- **Der Report wird inhaltlich nachgeführt, nicht neu gestaltet.** Layout, Farben und Sektionsaufbau der `audit.html` bleiben unangetastet; der nächste Audit-Lauf rendert die Seite ohnehin neu.
- **Ein geschlossenes Issue entfernt kein Finding.** Eine Schließung auf GitHub ist eine Behauptung, kein Beleg. Gebucht wird der Zustand, geprüft wird beim nächsten Audit-Lauf.
- **Sequenziell schreiben.** Nie zwei Issues parallel anlegen, und nach jedem Schreibvorgang sofort `./audit-sync.json` fortschreiben. Ein abgebrochener Lauf soll beim nächsten Start keine Duplikate erzeugen.

## Workflow

### 1. Vorbedingungen

Fünf Tore, in dieser Reihenfolge. Jedes ist ein Stopp mit Begründung, kein Umweg.

1. **Report vorhanden und lesbar.** `./audit.html` existiert und die JSON-Insel `<script id="audit-data" type="application/json">` ist parsebar. Ist sie es nicht, endet der Lauf hier: aus einer best-effort rekonstruierten Backlog-Tabelle entstehen keine dauerhaften Issues. Anbieten, `js-ts-project-audit` neu laufen zu lassen.
2. **GitHub-Remote.** `git remote -v` auswerten, `owner/repo` bestimmen. Kein GitHub-Remote: Stopp. Mehrere Kandidaten: fragen, nicht raten.
3. **Zugang und Rechte.** Erst `gh auth status`, sonst die GitHub-MCP-Tools, sonst Stopp mit der Angabe, was zu konfigurieren wäre. Schreibrecht am Repo prüfen (`gh repo view --json viewerPermission` oder das MCP-Äquivalent). Nur Leserecht heißt: ausschließlich der Rückweg läuft, und das wird gesagt, bevor irgendetwas anderes geplant wird.
4. **Sichtbarkeit.** Repo-Visibility ermitteln. Ist das Repo öffentlich, werden Findings der Kategorie »Sicherheit« nicht veröffentlicht — sie erscheinen im Plan als zurückgehalten, mit Verweis auf private Security Advisories, und gehen nur nach ausdrücklicher Freigabe einzeln raus. Ein Finding, das ein ungeprüftes `JSON.parse` an einer benannten Zeile beschreibt, ist auf einem Public-Repo eine Anleitung. Diese Regel gilt auch dann, wenn der Nutzer pauschal »alles veröffentlichen« gesagt hat; sie wird einzeln aufgehoben, nicht pauschal.
5. **Issues aktiviert.** Sind Issues im Repo deaktiviert, endet der Lauf mit dem Hinweis darauf.

### 2. Findings laden

Quelle ist die JSON-Insel. Daraus: `findings`, `summary`, `acknowledged`, und aus dem Projektportrait die fachlichen Domänen samt ihrer repräsentativen Pfade.

- **Scope-Vorschlag**: alle Findings außer `severity: "info"` und außer `acknowledged`. Zahlen je Severity nennen, bestätigen lassen. Der Nutzer kann auf Severity-Stufen oder einzelne Findings eingrenzen.
- `acknowledged` wird nicht veröffentlicht. Diese Punkte hat der Nutzer bewusst zurückgestellt; ein Issue dafür wäre Rauschen. Der Rückweg bleibt trotzdem offen: ein auf GitHub als »not planned« geschlossenes Issue landet in Schritt 6 in genau dieser Liste.

### 3. Bestand erfassen und zuordnen

Jetzt `references/matching-and-state.md` lesen. Dort stehen Fingerprint, Schema von `./audit-sync.json`, die Matching-Kaskade und die Wiederaufnahme.

Erfasst wird beides: der lokale Stand aus `./audit-sync.json`, sofern vorhanden, und der tatsächliche Stand auf GitHub (alle Issues mit dem Label `audit`, offen wie geschlossen). Der GitHub-Stand gewinnt bei Abweichung — die Sidecar-Datei kann veraltet sein, ein gelöschtes Issue steht dort noch.

Ergebnis dieses Schritts ist eine Liste von Paaren und Waisen, nicht mehr. Geschrieben wird noch nichts.

### 4. Abgleichplan und Freigabe

Der Plan wird im Chat vorgelegt, nicht als Datei. Er nennt:

- Ziel-Repo mit Sichtbarkeit, ausgeschrieben: »`owner/repo`, öffentlich«.
- Wie viele Issues **neu angelegt** werden. Die nackte Zahl gehört dazu: vierzig Findings sind vierzig Issues, und das darf niemanden überraschen.
- Wie viele **aktualisiert** werden (Body oder Labels haben sich geändert), wie viele nur **kommentiert** (Body von Hand bearbeitet, siehe Konfliktregeln).
- Die **Schließ-Kandidaten**: Issues, deren Finding aus dem Audit verschwunden ist, je mit Beleg. Liegt eine `./remediation-plan.md` daneben, ist der Beleg der Commit-Hash aus dem zugehörigen Paket; sonst steht dort, dass der aktuelle Audit-Lauf den Befund nicht mehr führt.
- Die **zurückgehaltenen** Findings aus Tor 4.
- Die **mehrdeutigen** Fälle als Rückfrage: hier ist unklar, ob ein vorhandenes Issue dasselbe meint. Jeder Fall einzeln, mit beiden Kandidaten und einem Vorschlag.
- Welche **Labels neu entstehen**.
- Was der Rückweg ins Audit trägt: wie viele Findings einen Status ändern, wie viele nach `acknowledged` wandern.

Freigegeben werden Umfang und Schließ-Liste. Ohne diese Freigabe beginnt Schritt 5 nicht.

### 5. GitHub schreiben

Jetzt `references/github-artifacts.md` lesen. Dort stehen Titel- und Body-Format, die Englisch-Regel samt Verbotsliste, die Permalinks und die vollständige Label-Taxonomie.

Reihenfolge: erst Labels sicherstellen, dann Issues anlegen, dann aktualisieren, dann kommentieren, dann die freigegebenen Schließungen. Nach jedem einzelnen Schreibvorgang wandert das Ergebnis sofort in `./audit-sync.json`.

Schlägt ein Schreibvorgang fehl, wird der Lauf nicht fortgesetzt, als wäre nichts: der Fehler kommt in den Bericht, der Rest der Liste bleibt offen, und der nächste Lauf nimmt ihn über den Abgleich aus Schritt 3 wieder auf.

### 6. Report und Sidecar nachführen

Jetzt `references/reverse-sync.md` lesen. Dort stehen die Zustandstabelle GitHub → Audit, die Übernahme nach `acknowledged` und die Konfliktregeln.

Geschrieben wird in `./audit.html` ausschließlich innerhalb der JSON-Insel und in den daraus gerenderten Textstellen. `./audit-sync.json` ist zu diesem Zeitpunkt bereits vollständig, weil Schritt 5 sie fortlaufend geführt hat; hier kommt nur noch der Kopf dazu (Repo, Datum des Laufs, Datum des zugrundeliegenden Audits).

### 7. Bericht

Maximal 5–8 Zeilen, in der Sprache der Nutzeranfrage:

- Ziel-Repo und was passiert ist: `N` angelegt, `M` aktualisiert, `K` kommentiert, `L` geschlossen.
- Was zurückkam: `X` Findings mit neuem GitHub-Status, `Y` nach `acknowledged` verschoben.
- Was offen blieb: zurückgehaltene Findings, fehlgeschlagene Schreibvorgänge, unbeantwortete Mehrdeutigkeiten.
- Die geänderten Dateien namentlich: `./audit.html` und `./audit-sync.json`, mit dem Satz, dass beide zusammen committet gehören. `./audit-sync.json` ist das Gedächtnis dieses Abgleichs; wer sie nicht eincheckt, lässt den nächsten Lauf raten.
- Die Issue-Liste nicht im Chat wiederholen. Ein Link auf die Filteransicht des Labels `audit` reicht.

## Prinzipien

- **Englisch auf GitHub, immer.** Titel, Body und jeder Kommentar, den dieser Lauf schreibt, sind englisch, unabhängig von der Sprache des Reports und der Nutzeranfrage. Antworten an den Nutzer bleiben in seiner Sprache.
- **Das Issue steht allein.** Kein Verweis auf das Audit, den Report, eine Finding-Nummer, einen Score oder einen Remediation-Lauf. Der Prüfsatz steht in `references/github-artifacts.md` und ist die Regel, an der dieser Skill am ehesten scheitert.
- **Der Report verweist, das Issue nicht.** Die Richtung ist bewusst asymmetrisch: `./audit.html` ist temporär und darf auf Dauerhaftes zeigen; ein Issue ist dauerhaft und darf nicht auf etwas zeigen, das beim nächsten Audit-Lauf überschrieben wird.
- **Im Zweifel kein Match.** Ein doppeltes Issue ist Handarbeit für einen Menschen, ein falsch verschmolzenes Issue ist ein verlorener Befund. Mehrdeutigkeit geht an den Nutzer, nicht in ein `create`.
- **Idempotenz.** Zweimal derselbe Lauf ohne Änderungen dazwischen erzeugt keinen einzigen Schreibvorgang. Wenn er es doch tut, ist der Fingerprint oder der `bodyHash` falsch berechnet.

## Zusammenspiel mit anderen Skills

- `js-ts-project-audit` liefert die Grundlage und rendert die Datei. Damit die Issue-Links einen Folgelauf überleben, führt der Audit-Skill das Feld `github` an gematchten Findings mit und rendert es. Dieser Skill setzt das Feld, der Audit-Skill trägt es.
- `js-ts-audit-remediation` arbeitet die Findings ab. Nach so einem Lauf ist ein Sync sinnvoll: die geschlossenen Findings tauchen als Schließ-Kandidaten auf, mit dem Commit-Hash aus `./remediation-plan.md` als Beleg. Dieser Skill startet keinen Remediation-Lauf und fixt nichts.
- Wird der Sync direkt nach einem Audit-Lauf angefragt, läuft er trotzdem als eigener Lauf mit eigener Freigabe. Ein Audit, das ungefragt Issues auf GitHub anlegt, ist eine Überraschung, die niemand zurücknehmen kann.
