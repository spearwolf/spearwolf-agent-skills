# Entscheidungsvorlage — wenn der Nutzer entscheiden muss

Gilt für jede Frage dieses Laufs an den Nutzer: Klärungsrunde (Schritt 4),
Freigabe (Schritt 5), Zug 0 im Fenster, `for_you` bei `question` und
`blocked`, die Rückfrage des Orchestrators zu einem `[!]`. *Ob* gefragt wird,
regelt die Stelle, die dich hierher schickt. Diese Datei regelt nur, *wie*.

## Warum eine feste Form

Ein Mensch, der die zehnte flüssige Vorlage des Tages liest, nickt ab. Er
urteilt dann über den Text, nicht über die Sache — und der Text stammt von
dem, den er prüfen soll. Eine Zusammenfassung macht es schlimmer: sie macht
das Abnicken bequemer. Gründlich wird er nicht durch Appelle, sondern durch
vier Dinge: eine Überraschung, die sein Bild der Lage stört; eine konkrete
Frage, die »ok« nicht beantwortet; eine Tatsache, die er aus eigenem Wissen
prüfen kann; und eine Vorlage, deren Länge ihn nicht schon ermüdet. Die Form
baut alle vier ein.

Deine Prosa ist flüssig genug, um durchzurutschen. Der Schutz ist die Form,
nicht die Formulierung — an keiner Stelle hilft ein besserer Absatz mehr als
eine Zeile, die dasteht, wo sie hingehört.

## Die Form

```markdown
**<Paket 3 | ARCH-004>: `parseConfig` entfernen oder bis zum nächsten Major deprecaten?**
Auslöser: `parseConfig` ist in `package.json#exports` öffentlich; im Repo rufen es nur `test/config.spec.ts:12` und `src/cli.ts:40` auf.
1. Entfernen — Breaking Change, Major-Version; beide Aufrufer werden mitgezogen.
2. Deprecaten (Vorschlag) — bleibt bis zum nächsten Major, Warnung beim Aufruf, Minor-Version.
3. Ins Audit zurück — Paket 3 verliert ARCH-004, sonst unverändert.
Kippt, wenn: ein Paket außerhalb dieses Repos `parseConfig` importiert — dann ist 1 ausgeschlossen.
Geprüft: `rg parseConfig` über alle Packages · Angenommen: keine Nutzer außerhalb des Repos
```

- **Kopfzeile**: worum es geht und die Frage selbst, mit den Alternativen
  darin. Nie »passt das?«, »einverstanden?«, »soll ich weitermachen?« — eine
  Frage, die »ja« als vollständige Antwort zulässt, ist eine verkleidete
  Ansage.
- **Auslöser**: welche Prüfung angeschlagen hat, als Tatsache mit Fundstelle
  oder Zahl. Die Abweichung, nicht die Vorgeschichte. Gibt es keinen
  Auslöser, gibt es keine Frage.
- **Optionen**: zwei oder drei, eine als Vorschlag markiert, jede mit ihrer
  Folge für Plan, Version und fremde Aufrufer. Wo es vertretbar ist, ist eine
  davon der Weg zum richtigen Eigentümer: ins Audit, in einen späteren Lauf,
  bewusst so lassen. Keine Option, die der Skill ausschließt.
- **Kippt, wenn**: die eine Tatsache, die den Vorschlag umwirft, so gestellt,
  dass der Nutzer sie aus eigenem Wissen beantwortet. Das ist die Zeile, die
  ihn denken lässt — er prüft ein Faktum, statt eine Begründung zu bewerten.
- **Geprüft · Angenommen**: getrennt. Geprüft ist, was ein Kommando, eine
  Zahl oder eine Fundstelle belegt; ein Report eines Implementierers oder
  deine eigene Zusammenfassung ist kein Beleg.

Höchstens acht Zeilen. Diff, Verlauf und Reviewer-Urteil stehen in der
Paketdatei; der Pfad genügt.

**Bevor du sie abschickst**, drei Proben:

1. Lässt sich der Kipp-Punkt mit einem Tool-Call klären (`rg`, `git log`,
   `package.json`, ein Test)? Dann ist die Vorlage nicht fertig — klären.
2. Bleibt danach kein Kipp-Punkt übrig, weil die Tatsachen den Weg schon
   festlegen? Dann ist es keine Frage. Entscheiden, als Ansage melden.
3. Sähe der Plan bei jeder Option gleich aus? Dann ist es auch keine.

## Mehrere Fragen auf einmal

- Nummeriert, damit eine Antwort wie »1: 2, 3: 1, sonst Vorschlag« reicht.
- Nach Tragweite sortiert: was fremde Aufrufer bricht oder sich nicht per
  `git revert` zurücknehmen lässt, zuerst.
- **Mehr als fünf in einer Runde heißt: es fehlt eine Regel.** Such die
  Klasse — »Exporte, die nur Tests aufrufen«, »Defaults, die sich für
  Aufrufer ändern« — und stell zuerst die eine Frage, die sie entscheidet.
  Die Einzelfälle folgen daraus und werden Ansagen.

## Wenn die Antwort kommt

- **Als Regel in »Entscheidungen«**, wo die Antwort eine Klasse trifft, mit
  Datum und Anlass: `- Exporte ohne Aufrufer außerhalb von test/ entfallen
  ohne Deprecation (2026-11-18, Nutzer, Anlass Paket 3)`. Ein späterer Runner
  misst daran, statt dieselbe Frage noch einmal zu stellen — jede Antwort soll
  eine künftige Frage einsparen.
- **Ein pauschales »ok«, »passt«, »mach so«** gilt als Zustimmung zu allen
  Vorschlägen — außer zu einem Vorschlag, der selbst fremde Aufrufer bricht,
  Daten migriert oder sich nicht per `git revert` zurücknehmen lässt. Der
  kommt noch einmal, allein, mit dem Kipp-Punkt vorn: »Bevor ich
  `parseConfig` entferne: importiert es ein Paket außerhalb dieses Repos?«.
  Auf diese eine Frage gilt dann auch ein »ok«. Wer den sicheren Weg
  vorschlägt, braucht keine zweite Runde.
- Antwortet der Nutzer mit etwas, das nicht unter den Optionen steht, gilt
  seins. Die Folge für den Plan meldest du in einem Satz zurück.

## Wohin die Vorlage geht

| Stelle | Kanal |
| --- | --- |
| Klärungsrunde, Freigabe, Rückfrage des Orchestrators | Antworttext in der Session; je Frage eine Vorlage |
| Zug 0 (A) | direkt im Fenster; die Antwort datiert nach »Entscheidungen« |
| B oder N mit `question` oder `blocked` | die Vorlage in `for_you`, dieselbe Kopfzeile als Zeile unter dem Paket im Plan |
| Push-Nachricht | nur die Kopfzeile; die Vorlage steht in der Session |

## Häufige Ausreden

| Ausrede | Wirklichkeit |
| --- | --- |
| »Ich fasse den Plan zusammen, dann geht die Freigabe schneller« | Schneller geht vor allem das Abnicken. Prüfzeilen und Vorlagen statt Zusammenfassung. |
| »Ich stelle die Frage offen, damit er frei antworten kann« | Auf eine offene Frage kommt »passt«. Die Alternativen gehören in die Frage. |
| »Den Kipp-Punkt kenne ich nicht, die Zeile lasse ich weg« | Dann weißt du nicht, warum du fragst. Finde ihn, oder es ist keine Frage. |
| »Mehr Kontext hilft ihm beim Entscheiden« | Mehr Kontext hilft beim Abnicken. Der Pfad zur Paketdatei reicht für den, der tiefer will. |
| »Er hat ok gesagt, das deckt auch den Breaking Change« | Nicht, wenn der Breaking Change dein Vorschlag war. Diese eine Frage kommt allein noch einmal. |
| »Ich frage lieber nach jeder Kleinigkeit, sicher ist sicher« | Zehn Fragen erziehen zum Abnicken der elften. Was der Skill dir überlässt, entscheidest du und meldest es. |
