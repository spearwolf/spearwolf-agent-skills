# Zuordnung und Zustand

Gilt in Schritt 3, vor der ersten Zuordnung. Hier steht, woran ein Finding und
ein Issue als dasselbe erkannt werden und wo dieses Wissen zwischen zwei
Läufen liegt.

## Warum die Finding-ID nicht taugt

`ARCH-001` ist eine Laufnummer. Der nächste Audit-Lauf vergibt sie neu, an ein
anderes Finding, und mit dem Report verschwindet ihre Auflösung. Sie steht
deshalb weder im Issue noch in der Sidecar-Datei noch in irgendeinem
Kommentar, den dieser Lauf schreibt. Sie taugt auch als Schlüssel nicht: zwei
Läufe über dasselbe Projekt liefern für denselben Befund verschiedene Nummern.

Was stabil ist, sind Kategorie und Fundstelle. Der Titel ist es halbwegs, die
Zeilennummer gar nicht. Daraus folgt eine Kaskade statt eines Schlüssels.

## Fingerprint

```
fingerprint = sha1( <kategorie-slug> "|" <pfad ohne zeile> "|" <titel-slug> )  → erste 12 Hex
```

- `kategorie-slug`: der englische `area:`-Slug aus `references/github-artifacts.md`,
  nicht der übersetzte Kategoriename. Sonst wandert der Fingerprint mit der
  Report-Sprache.
- `pfad ohne zeile`: `src/net/socket.ts:88` → `src/net/socket.ts`. Repo-relativ,
  Trennzeichen `/`, keine führenden `./`.
- `titel-slug`: kleingeschrieben, alles außer `a–z0–9` zu `-`, Mehrfach-`-`
  zusammengezogen, Ränder getrimmt. Der Titel aus dem Report, nicht die
  englische Übersetzung — die entsteht erst später und ist nicht reproduzierbar.

Der Fingerprint enthält keine Lauf-ID und kein Datum. Er ändert sich, wenn ein
Folgelauf den Titel umformuliert oder das Finding umzieht; genau dafür gibt es
die Stufen 2 und 3 der Kaskade.

## `./audit-sync.json`

Liegt im Projekt-Root, gehört ins Repo. Sie ist das Gedächtnis dieses
Abgleichs: die `audit.html` wird bei jedem Audit-Lauf überschrieben, GitHub
kennt nur seine eigene Seite.

```json
{
  "version": 1,
  "repo": "owner/name",
  "visibility": "public",
  "lastSync": "2026-08-22",
  "auditDate": "2026-08-20",
  "issues": [
    {
      "fingerprint": "a1b2c3d4e5f6",
      "issue": 142,
      "url": "https://github.com/owner/name/issues/142",
      "category": "correctness",
      "location": "src/net/socket.ts:88",
      "titleEn": "Clear the reconnect timer when the socket closes",
      "publishedSeverity": "high",
      "bodyHash": "9f2c…",
      "state": "open",
      "stateReason": null,
      "assignee": null,
      "lastSeenInAudit": "2026-08-20"
    }
  ],
  "withheld": [
    {
      "fingerprint": "b7e1c2d3f4a5",
      "category": "security",
      "location": "src/api/parse.ts:31",
      "reason": "security finding, repository is public",
      "since": "2026-08-22"
    }
  ]
}
```

- `titleEn` ist der Titel, den **dieser Lauf** geschrieben hat. Weicht der
  Titel auf GitHub davon ab, hat ihn ein Mensch geändert und er bleibt stehen.
- `bodyHash` ist der Hash des zuletzt von diesem Lauf geschriebenen Bodys.
  Er ist die einzige Möglichkeit, eine menschliche Bearbeitung von der eigenen
  zu unterscheiden. Ohne ihn überschreibt der nächste Lauf fremde Arbeit.
- `lastSeenInAudit` ist das Datum des Audits, in dem das Finding zuletzt
  auftauchte. Daraus entstehen die Schließ-Kandidaten.
- `withheld` führt, was Tor 4 zurückgehalten hat, damit ein späterer Lauf nicht
  jedes Mal neu darüber verhandelt und der Nutzer sieht, was nie draußen war.

## Marker im Issue

Letzte Zeile des Bodys, im gerenderten Issue unsichtbar:

```
<!-- audit-sync v1 fp:a1b2c3d4e5f6 -->
```

Nur der Fingerprint, sonst nichts. Er macht die Zuordnung rekonstruierbar,
wenn `./audit-sync.json` fehlt, gelöscht wurde oder jemand von einem anderen
Rechner synct. Er ist keine Referenz auf ein Audit und enthält keine
Laufnummer.

Wird ein Issue-Body von einem Menschen bearbeitet und der Marker dabei
entfernt, gilt das Issue beim nächsten Lauf als markerlos und wird über
Stufe 2 der Kaskade zugeordnet. Der Marker wird dann nicht heimlich wieder
eingefügt; er kommt erst zurück, wenn der Nutzer das Issue ohnehin
aktualisieren lässt.

## Matching-Kaskade

Für jedes Finding im Scope, erster Treffer gewinnt:

| Stufe | Kriterium | Vertrauen |
| --- | --- | --- |
| 1 | Fingerprint aus `./audit-sync.json` oder aus dem Marker | eindeutig |
| 2 | gleiche Kategorie **und** gleiche Datei; Zeilendrift beliebig | hoch |
| 3 | gleiche Kategorie **und** semantisch gleicher Titel, andere Datei | mittel |
| 4 | mehrere Kandidaten oder keiner, aber ein plausibles Issue in Sichtweite | offen |

Stufe 1 und 2 werden ohne Rückfrage übernommen. Stufe 3 wird übernommen und im
Plan als solche ausgewiesen. **Stufe 4 wird nicht entschieden**, sondern geht
als einzelne Frage in den Plan aus Schritt 4, mit beiden Kandidaten und einem
Vorschlag.

Das ist die Umkehrung der Regel aus dem Audit-Folgelauf, und das ist Absicht.
Dort ist ein doppelt geführtes Finding billig, weil der nächste Lauf es
einsammelt. Hier erzeugt ein verpasster Match ein zweites Issue, das ein
Mensch von Hand schließen muss, und ein falscher Match hängt einen fremden
Befund an eine laufende Diskussion.

## Waisen in beide Richtungen

| Lage | Ergebnis |
| --- | --- |
| Finding ohne Issue | Kandidat für `create` |
| Issue mit Label `audit`, ohne Finding, offen | Schließ-Kandidat, geht mit Beleg in den Plan |
| Issue mit Label `audit`, ohne Finding, bereits geschlossen | nichts tun, Sidecar-Eintrag behalten |
| Sidecar-Eintrag, dessen Issue auf GitHub nicht mehr existiert | Eintrag entfernen, im Bericht nennen |
| Issue ohne Label `audit`, das inhaltlich passt | **nicht** übernehmen, nicht labeln, nicht kommentieren. Es gehört jemand anderem. Im Plan als Hinweis nennen, wenn die Ähnlichkeit auffällig ist |

Der Beleg für einen Schließ-Kandidaten ist ein Satz, keine Vermutung. Liegt
eine `./remediation-plan.md` im Projekt und führt dort ein erledigtes Paket
dieses Finding, ist der Beleg der Commit-Hash aus der `Hash:`-Zeile des
Pakets. Sonst lautet er, dass der Audit-Lauf vom `<Datum>` den Befund nicht
mehr führt — und dazu gehört der Hinweis, dass ein Audit-Lauf Findings auch
wegen geänderter Prüftiefe verliert.

## Wiederaufnahme

Es gibt keinen eigenen Mechanismus dafür, und das ist der Punkt. Weil Schritt 5
nach jedem einzelnen Schreibvorgang `./audit-sync.json` fortschreibt, findet
der Abgleich aus Schritt 3 beim nächsten Start genau den Stand vor, den der
abgebrochene Lauf hinterlassen hat: die angelegten Issues sind zugeordnet, der
Rest ist noch Waise.

Daraus folgt die Reihenfolge im Schreibschritt, und sie ist nicht verhandelbar:
Issue anlegen, Antwort abwarten, Nummer und `bodyHash` in die Datei schreiben,
erst dann das nächste. Wer erst alle Issues anlegt und danach die Datei
schreibt, produziert bei jedem Abbruch Duplikate — und Duplikate auf GitHub
räumt kein Skill wieder weg.
