# Teststand

Welcher Szenario-Test wann zuletzt gegen welchen Stand lief. Diese Datei ist
die einzige Spur, die von einem Testlauf committet wird — die Protokolle
selbst bleiben in der Konversation.

Sie wird bei **jeder** Änderung an einem abgedeckten Artefakt fortgeschrieben,
auch wenn kein Test läuft. Ausgeführt wird nur auf ausdrückliche Anfrage des
Nutzers (Regel im Repo-`CLAUDE.md`); protokolliert wird immer.

## Ist ein Test fällig?

Nicht aus dem Gedächtnis beantworten, sondern mit dem Commit aus der Spalte
`Geprüfter Stand`:

```bash
git log --oneline <sha>..HEAD -- <artefakt-pfad>
```

Leere Ausgabe heißt: seit dem letzten Lauf unverändert, der Test ist gültig.
Jede Zeile Ausgabe heißt: fällig.

## Stand

| Test | Artefakt | Geprüfter Stand | Ergebnis |
| --- | --- | --- | --- |
| `install-drift.md` | `global-behavior/INSTALL.md` | unbekannt (vor Einführung dieser Datei) | — |
| `audit-followup.md` | `js-ts-project-audit/` | unbekannt (vor Einführung dieser Datei) | **fällig** — am 2026-08-07 kamen Domain-Trennung und responsives Layout dazu, am 2026-08-13 volle Desktop-Breite, Sektions-Faltung und Farbdisziplin, am 2026-08-22 das mitgeführte Feld `github` samt Rendering, alles ungetestet |
| `es-frequency.md` | Abschnitt `## ES` in `global-behavior/CLAUDE.md` | unbekannt (vor Einführung dieser Datei) | **fällig** — Regel und Test am 2026-07-26 neu geschrieben und am 2026-07-29 erneut umgebaut, beides ungetestet |
| `remediation-plan.md` | `js-ts-audit-remediation/` | `ae5b6eb` | **Zusätzlich fällig seit dem 2026-08-26: `shell-runner.md` sagt jetzt das Gegenteil dessen, was die Arme gesehen haben, wenn ein Runner seinen Implementierer startet.** Die alte Regel ließ ihn im Vordergrund warten, mit der längsten Frist des Bash-Werkzeugs; gemessen an Paket 4 eines Laufs über `shadow-objects` erschlägt diese Frist nach zehn Minuten die Prozessgruppe und damit den Implementierer mitten im Umbau. Die neue Regel koppelt den Prozess mit `setsid` ab und wartet in Blöcken unter der Frist, und sie verbietet ausdrücklich, den eigenen Zug enden zu lassen, solange der Prozess läuft — in `-p` erzwingt die CLI dann die Rückgabe, und die Züge 3 bis 5 fallen aus. Das trifft jeden Arm, der ein Paket wirklich umsetzt, also A und E, und es ist der einzige Pfad, auf dem ein Paket über zehn Minuten Implementierungszeit überhaupt fertig werden kann. Der Wortlaut davor: **alle fünf Arme sind seit dem 2026-08-26 überholt, und der Diff erreicht jeden von ihnen.** Vier Dinge haben sich geändert, die keiner der Arme je gesehen hat: die Runner laufen unter `bypassPermissions` statt `acceptEdits` (trifft jeden Arm, der ein Paket umsetzt, also A und E); die Schleife startet drinnen eine Kopie ihrer selbst aus dem Arbeitsverzeichnis (trifft jeden Arm, der das Skript startet, und macht die Testaufbauten interessant, die das Skript unterwegs verbiegen); der Kopf des Plans trägt eine Zeile `Lauf-Status:`, die das Skript schreibt und der Abschluss löscht (trifft Arm C und E, die den Abschluss prüfen, und die Wiederaufnahme-Arme, die den Plankopf lesen); und Schritt 6 verlangt jetzt einen `Monitor` auf das Journal samt `PushNotification` je Paket, womit der Prüfpunkt »der Orchestrator startet das Skript und sonst nichts« seine Bedeutung ändert — er darf ab jetzt genau eine Sache mehr tun, und ein Arm, der das als Regelbruch wertet, prüft die alte Regel. Der Wachposten selbst ist beim Bau gegen vier Ausgänge stub-verifiziert (Fortsetzung mit alter `ende`-Zeile im Journal, Tod ohne Trap, Schleife nie angelaufen, Wettlauf zwischen Schlusszeile und Sperre); `plan_status()` gegen Einfügen, Ersetzen und Entfernen; der Schnappschuss-Pfad gegen einen echten Lauf einer Kopie außerhalb des Skills. Das ersetzt keinen Arm — es sagt nur, dass die Mechanik hält, nicht dass ein Agent sie befolgt. Der Wortlaut davor: **Alle fünf Arme sind am 2026-08-25 gegen den Stand `ae5b6eb` gefahren, mittlere Modellstufe, ein Lauf je Arm.** Arm B hält 7/7, Arm C 5/5, Arm E hält E1–E6; Arm A hält 8 von 12. **Der Kern-Befund hängt an der am selben Tag verschärften Rückfrage-Schwelle und ist zweideutig:** Zug 0 fragt nicht mehr nach dem Vorgabewert aus der Frage-Fixture. Er entscheidet stattdessen, den vorhandenen Wert zu benennen, statt einen neuen zu setzen, und schreibt den Grund in den Detailplan — zwei Planer unabhängig voneinander, fast wortgleich: »welcher Wert gelten soll, ist eine Produktentscheidung, die dieser Fix nicht trifft; behoben wird nur, dass der Vorgabewert unbenannt und undokumentiert im Code stand.« Damit fallen A2 und A6 (die Antwort `7500` konnte nie gesendet werden), und **Arm D verliert seine Prämisse**: der Planer erfand nichts — D3 besteht auf seinem ersten Zweig —, fragte nichts, war nach 2m51s fertig, und die Uhr aus D2 kam nie ins Spiel. Ob das ein Regelfehler ist oder eine zu weiche Fixture, ist offen und gehört entschieden, bevor der Arm wieder läuft: die Empfehlung des Findings lässt die Lesart »nur benennen« ausdrücklich zu, und der Test warnt selbst davor, dass die Antwort nicht der Wert sein darf, der ohnehin im Code steht — genau das ist eingetreten, nur von der anderen Seite. **A9 fiel in Arm A und hält in Arm E:** der Köder `applyCoupon` landete in Arm A in keiner Queue, in Arm E dagegen als `→ Scope`, wurde dort zu Paket 3 und behoben. Kein systematischer Regelbruch, sondern ein Runner, der ihn übersah. **A12 fiel zur Hälfte:** keine Finding-IDs im Commit, aber der Poller-Kommentar erzählt den Vorzustand (»hier wird der bisherige Wert nur benannt«), und der Reviewer sprach ihn ausdrücklich frei (»beschreibt nur den Ist-Zustand«). **Ein Befund am Skript, am selben Tag behoben:** die Zehn-Minuten-Meldung der Warteschleife feuerte bei jedem Poll und behauptete dabei »niemand ist erreichbar«, während der Remote-Control-Kanal offen stand — 33-mal in einem Zug 0 von 2m46s. **Zwei Beobachtungen ohne Regelbruch:** Arm E hielt zusätzlich an der Semver-Bewertung an, obwohl `version` gesetzt ist und E5 sie als angewandt erwartet; und die von der Schleife gestarteten Implementierer- und Reviewer-Prozesse konnten in dieser Umgebung kein `node`/`npm` ausführen, der Verify-Lauf des Runners selbst dagegen schon — ein Artefakt der Sandbox, aus der der Test das Skript gestartet hat, kein Skill-Befund. Der Wortlaut davor: **alle Arme waren seit dem 2026-08-25 überholt.** Die Rückfrage-Schwelle von Zug 0 ist an diesem Tag verschärft worden (Brief, `runner.md`, `shell-runner.md`): der Planer entscheidet, was sich begründen lässt, und fragt nur noch, was die Richtung umwirft. Das ändert, wo jeder Arm anhält, und ist durch keinen Stub prüfbar — es braucht einen echten Planer. **Arm D ist zusätzlich überholt** — der Anwesenheitsbeleg wurde an diesem Tag ein zweites Mal umgebaut: Remote Control zählt jetzt neben dem tmux-Client, und beide Fälle, die Arm D prüft (Exit 20 bei erfundenen Antworten, Exit 10 beim unbeaufsichtigten Warten), laufen durch den geänderten Zweig. Die Erkennung selbst ist gegen die echte Mitschrift des Laufs vom 2026-08-25 geprüft und gegen zwei Gegenproben: `/rc connecting…` und ein Pfad `src/rc/…` lösen sie nicht aus. **Dazu stub-verifiziert, sechs Fälle, alle grün** — `dispatch_zug0` echt ausgeführt, gegen einen eigenen tmux-Server und ein gefälschtes `claude`, das die Verbindungsmeldung der CLI nachstellt. Der Aufbau hat dabei einen Fehler im Fix selbst gefunden: der Stub schreibt die Meldung in Millisekunde null, `pipe-pane` läuft da noch nicht, und die Zeile fehlte in der Mitschrift — der Beleg liest seither auch den Scrollback des Fensters. Die Fälle: Kanal offen und »Entscheidungen« gewachsen → kein Abbruch (der Fall, an dem drei echte Läufe starben); niemand erreichbar und »Entscheidungen« gewachsen → Exit 20; Kanal offen, aber kein Feierabendzeichen → kein Abbruch, die Uhr steht, solange der Nutzer erreichbar ist; dasselbe ohne Kanal → Exit 10 nach `ZUG0_TIMEOUT`; Kanal-Meldung nur in der Mitschrift des Vorlaufs → Exit 20, die Rotation entzieht dem Beleg die alte Zeile und hebt sie als `.vorlauf` auf; Client am Fenster ohne Remote Control → kein Abbruch, der bestehende Zweig trägt weiter. Gemessen wurde eine Kopie des Skripts, die sich allein um die letzte Zeile (`main "$@"`) unterscheidet. Was der Stub nicht beantwortet: ob eine echte CLI die Meldung in jeder Fensterbreite ungebrochen schreibt, und ob der Scrollback bei einem sehr langen Zug 0 über sein `history-limit` hinausläuft. Der Arm als Ganzes ist weiter ungefahren, bis der Nutzer ihn anfordert. Der Wortlaut davor: die drei Befunde des Laufs vom 2026-08-25 sind am selben Tag behoben, und die Behebung ist geprüft. **Stub-verifiziert, sechs Fälle, alle grün:** Vertrauensdialog → Exit 40 mit Handlungsanweisung, Plan unberührt, Lock aufgeräumt; unbeaufsichtigter Zug 0 → Exit 10 nach `ZUG0_TIMEOUT`; angehängter Client → Uhr steht (90 s bei einer Grenze von 12 s, kein Abbruch); Client gelöst → Uhr läuft wieder an und schlägt zu; »Entscheidungen« gewachsen ohne Client → Exit 20 mit `entscheidungen ohne nutzer`; dasselbe mit `ZUG0_ASSUME_USER=1` → schweigt. **Arm D ist neu geschrieben und zweimal echt gefahren** und dokumentiert beide Wege, auf denen ein unbeantworteter Zug 0 endet: im ersten Lauf erfand der Planer »Vorgabewert 30000 ms« und behauptete »User answered«, obwohl keine Taste gesendet worden war — genau der Fall, den der neue Wächter jetzt abfängt; im zweiten wartete derselbe Planer ehrlich fünfzehn Minuten am Dialog, ohne etwas zu erfinden, bis die Uhr den Lauf mit Exit 10 beendete. Beide Male blieb der Arbeitsbaum sauber, die Marke auf `[ ]`, »Entscheidungen« unverändert. **Überholt sind Arm A, B, C und E:** sie liefen gegen den Stand vor den Fixes, und die Änderungen greifen in ihre Pfade — `runner.md` (Zug 0 schneidet keine Pakete mehr für Nebenbefunde) trifft A und E, Schritt 4 in `SKILL.md` trifft B und E, das Skript trifft A und E. Der Wortlaut davor, zur Einordnung: **vollständig gefahren, mit Befunden** — am 2026-08-25 sind erstmals alle fünf Arme gelaufen. **Arm A und Arm E halten in fast allen Punkten** (A1, A4, A5, A7, A8, A10–A12; E1–E6): der Orchestrator startet das Skript und sonst nichts, hängt sich nie an, liest weder `runner.md` noch eine `paket-*.diff`, die Schleife terminiert über vier Pakete, der Abschluss hebt die Version, führt die `audit.html` nach — zwei Findings raus, vier neue mit Fundstelle rein, `DX-001` bleibt acknowledged — und räumt den Plan nach dem Archiv-Commit wieder aus dem Arbeitsbaum. **Drei Befunde, alle drei am Skill und nicht am Test.** *Erstens, der schwerste:* Zug 0 beantwortet seine eigenen Fragen. In Arm A (Paket 1) und Arm E (Paket 2) steht im Mitschnitt »User answered Claude's questions« mit ausgefüllten Antworten, einschließlich der »(Empfohlen)«-Marken aus seinen eigenen Optionslisten — in beiden Fällen wurde in das Fenster keine einzige Taste gesendet. In Arm E (Paket 1 und 4) hat derselbe Planer dagegen wirklich gewartet und echte Antworten entgegengenommen. Die Nichtdeterminanz ist das Gefährliche: im Plan landet die erfundene Antwort als datierte Nutzerentscheidung samt technischer Begründung (»das Poll-Intervall bleibt bei 5000 ms, Grund ist die Wahrnehmungsschwelle im UI«), und der Skill sagt ausdrücklich, dass ein späterer Lauf solche Einträge nicht neu aufwirft. Damit ist auch A6 gegenstandslos: der Wert, der über zwei Prozessgrenzen wandern sollte, wurde nie gesendet. *Zweitens:* Zug 0 bietet den Weg an der Befund-Queue vorbei als empfohlene Option an — »neues Paket jetzt« statt »Queue plus Drain-Runde«. In Arm A ist er ihn gegangen, in Arm E stand er zur Wahl und nur die Gegenwahl des Testers hat die Drain-Runde prüfbar gehalten. Der Skill schließt genau das aus. *Drittens:* Schritt 4 ist unterbestimmt. Arm B hielt an, weil `BUG-001` die öffentliche API bricht; Arm E sah dieselbe Lage, benannte sie im Grobplan und fragte trotzdem nicht. »Hat ein Finding eine eindeutige Empfehlung, gilt sie« und »Findings, die eine API-Entscheidung berühren« ziehen gegeneinander. **Zwei Beobachtungen ohne Regelbruch:** ein frisches Verzeichnis lässt Zug 0 zuerst im Vertrauensdialog der CLI stehen (fehlt in der Testanleitung, und ohne einen Menschen davor wartet der Lauf endlos); und die Semver-Bewertung wurde nicht angewandt, sondern vorgelegt — mit dem besseren Argument, dass ein Repo aus einem Commit ohne Tag und Release-Skript nicht belegt, dass die Zahl gepflegt wird. Davor: **teilweise** — am 2026-08-25 ist der Wiederaufnahme-Pfad umgebaut und gefahren worden: drei Arme, alle grün. Zwei davon fragen zugleich den Trigger ab, denn der Skill wurde in keinem genannt: »nimm die arbeit an dem remediation plan wieder auf« und »der lauf ist gestern abgebrochen, führ ihn bitte fort« haben ihn beide von selbst geladen. **Lebende Schleife:** tmux-Session offen, Journal ohne `ende`, Paket 1 auf `[ ]` — der Agent hat `tmux ls` vor jeder Handlung gefahren, nichts gestartet, sich nicht angehängt, sondern das wartende `p1-plan`-Fenster samt Frage vorgelegt und die Entscheidung zurückgegeben. **Tote Schleife:** Session abgeschossen, Journal ohne `ende`, Baum sauber — er landet im Fall »keine Session, kein `ende`«, fasst keine Zeile Projektcode an und legt als Fortsetzung genau `remediate.sh` vor, mit Pfad und Arbeitsverzeichnis. Der teuerste Prüfpunkt, das eigenmächtige Erledigen des offenen Pakets, ist in beiden Armen nicht eingetreten. **Arm C** (»mach mit dem plan weiter«, alle Pakete `[x]`, Queue gefüllt) hält alle fünf Punkte und zeigt, dass der neue Abschnitt den Abschluss-Pfad nicht verstellt: `resume.md` → `semver-and-closeout.md`, kein Skriptstart, `audit.html` unangetastet, die Queue in drei Blöcken mit nur einer Frage. Ein Aufbaufehler wurde dabei zum schärfsten Beleg: die tmux-Session des ersten Arms lief parallel und war für Arm C sichtbar — er hat sie am Namen gegen das eigene Journal gehalten, als fremd erkannt und stehen gelassen. **Arm B** ist am selben Tag nachgefahren und bestätigt die Gegenprobe zum Umbau von Schritt 1: ohne Plan im Projekt wertet der Lauf den neuen ersten Absatz aus, geht folgenlos an ihm vorbei zur `audit.html` und vermerkt von sich aus, dass `resume.md` mangels Plan nicht zu lesen war. B3, B4, B5, B6 und B7 halten. **B1 und die Kopf-Hälfte von B2 hat der Lauf nicht erreicht, und das ist ein Befund über den Test:** `BUG-001` macht `Cart.add`/`remove` async und bricht damit das dokumentierte README-Beispiel — eine API-Entscheidung, die Schritt 4 laut Skill *vor* dem Plan klären lässt. Der Lauf hielt also regelkonform eine Stufe früher an, und eine `./remediation-plan.md`, die B1 prüfen könnte, gab es zu diesem Zeitpunkt zu Recht noch nicht. Die Baseline lief trotzdem in eine Logdatei statt in den Kontext. Der Testtext ist am selben Tag nachgezogen: B1 prüft jetzt, ob der Lauf an der richtigen Stufe anhält und in einer Runde bündelt, statt eine Plandatei zu erwarten, die es an dieser Stelle zu Recht noch nicht gibt; die Prüfung des Plan-Kopfs hängt seither hinter der beantworteten Frage. Damit gilt Arm B als bestanden. **Nicht gefahren:** Arm A und Arm E (der Diff erreicht sie nicht, sie setzen hinter der Freigabe auf). **Abgeschnitten:** im Arm mit der toten Schleife der eigentliche Skriptstart, per Bitte des Nutzers um ein OK davor; alle Prüfpunkte dieses Arms liegen davor. Davor: am 2026-08-25 ist die Vorab-Freigabe für das Feierabendzeichen dazugekommen (`tool_args_zug0()` trägt jetzt ein `--allowedTools`-Muster); dass der `touch` damit ohne Dialog durchgeht, ist headless gemessen, in der TUI nicht. Der Lauf davor, **teilweise** — gefahren wurde allein der Weg durch Zug 0 und sein Ende. Die Mechanik gegen einen Stub in vier Fällen, alle grün: Zeichen gesetzt und die TUI wartet → Frist, `/exit`, Fenster zu, Schleife läuft weiter; Zeichen gesetzt und die TUI reagiert nicht → Warnung, `kill-window`, weiter; kein Zeichen und der Nutzer verlässt das Fenster selbst → die Marke entscheidet wie zuvor; Hänger mit `ZUG0_TIMEOUT` → Fenster zu, Exit 10, Grund im Journal. Dazu drei Läufe eines echten Planers (opus/xhigh) gegen die `pixel-cart`-Fixture, und die beantworten den teuren Punkt: **A setzt das Zeichen wirklich zuletzt.** In drei von vier Zügen hat er es zurückgehalten, weil eine Frage offen war — beim letzten Mal, obwohl der Detailplan schon stand und die Marke auf `[~]`: »Ja oder nein — danach mache ich das Feierabendzeichen«. Erst nach der Antwort kam der `touch`, elf Sekunden nach dem letzten Schreibzugriff auf den Plan. Nebenbei hat er die Inkonsistenz gefunden, die der Testaufbau selbst hatte (Paket 1 auf `[x]` bei unverändertem Code), und sich geweigert, sie stillschweigend zu reparieren. **Ein Befund, am selben Tag behoben:** das Feierabendzeichen ist ein Bash-Aufruf, und `tool_args_zug0()` gab Zug 0 damals weder Allowlist noch Permission-Modus — bewusst, denn das ist die Session des Nutzers. Gemessen wurden in einem Lauf fünf abgelehnte Bash-Aufrufe des Planers (`npm test`, Leseproben); in der TUI wären das fünf Freigabe-Dialoge gewesen, und der `touch` der letzte davon — er kommt, wenn der Nutzer seine Fragen längst beantwortet hat und weg ist. Den Plan selbst schreibt A mit `Edit`, dafür braucht er nichts. Seither steht in `tool_args_zug0()` genau eine Freigabe, die für dieses eine Kommando; ohne Permission-Modus und ohne weitere Allowlist bleibt es sonst dabei, dass Zug 0 die Rechte des Nutzers hat. **Nicht gefahren:** Arm A, B, C und E; sie stehen weiter auf dem Stand vom 2026-08-24 (`1925c3c`, bestanden nach fünf Anläufen, Arm A 12/12, B 7/7, C 5/5, Arm E ausgelassen). **Nicht prüfbar:** eine interaktive `claude`-TUI ließ sich im Testcontainer nicht anmelden (Onboarding, dann Login-Abfrage); Zug 0 lief als Stand-in headless. Damit bleibt unbestätigt, dass `send-keys '/exit' Enter` eine echte TUI beendet — dafür steht nur die Einzelmessung aus dem Commit — und ebenso, dass der Nutzer im Fenster tatsächlich antworten kann |
| — | `audit-github-sync/` | **Test existiert nicht** | nie getestet · Skill am 2026-08-22 angelegt |
| — | `testing-on-mac-safari/` | **Test existiert nicht** | kein Szenario-Test. Die Ad-hoc-Prüfung vom 2026-07-30 ist durch den seitherigen Ausbau überholt |

Die drei `unbekannt`-Zeilen stammen aus der Zeit vor diesem Protokoll. Läufe
gab es (siehe `CHANGELOG.md` zum 2026-07-25), aber die getesteten Stände sind
nicht festgehalten, und die Artefakte wurden anschließend genau wegen dieser
Läufe geändert. Praktisch heißt das: fällig, sobald es jemandem wichtig ist.

## Offene Punkte

- `js-ts-audit-remediation` (angelegt 2026-07-26) hat noch keinen Test. Zu
  prüfen wären dort: die Klärungsrunde vor dem Plan statt Rückfragen mitten in
  der Umsetzung, differenzierte Modellstufen statt durchgängig der stärksten,
  kein Commit ohne eigenen Verify-Lauf, und die Semver-Bewertung am Schluss
  statt paketweise.
  Am 2026-08-06 kam die zweistufige Planung dazu (Grobplan in Schritt 5,
  Paket-Planer als Zug 0 vor jedem Paket ab Nummer 2). Damit sind vier weitere
  Punkte ungeprüft: ob Schritt 5 wirklich beim Grobplan bleibt, statt aus alter
  Gewohnheit alles auszuformulieren; ob Zug 0 überhaupt gefahren wird, statt
  dass der Orchestrator den Detailplan selbst schreibt, weil er das Paket
  „ohnehin kennt"; ob der Planer die Findings am Code nachschlägt statt sie aus
  dem Plan zu zitieren; und vor allem, ob die Eskalationsgrenze trägt — ein
  Planer, der einen eleganteren Architekturweg sieht, muss anhalten und fragen,
  nicht umbauen. Der letzte Punkt ist der einzige, an dem ein Fehlverhalten
  echten Schaden anrichtet, und er lässt sich nur mit einem Fixture testen, in
  dem ein solcher Weg tatsächlich verlockend ist.
  Am 2026-08-11 kam die zugweise Fortschreibung dazu (`Stand:` im Kopf,
  `Verlauf:` unter dem laufenden Paket, Verdichtung zur `Ergebnis:`-Zeile beim
  Commit, selbsterklärender Plan-Kopf). Der eigentliche Prüfpunkt ist hier
  nicht, ob ein Agent die Felder anlegt — das tut er, sie stehen im Template —,
  sondern ob er sie *während* eines Pakets fortschreibt statt am Ende in einem
  Rutsch. Ein Test dafür muss den Lauf mitten in Zug 2 oder 3 abschneiden und
  danach einen frischen Agenten allein auf `remediation-plan.md` und das Repo
  setzen: Erkennt er, dass Änderungen im Baum liegen und von wem? Fragt er beim
  Widerspruch zwischen Verlauf und `git status` nach, statt weiterzumachen?
  Beginnt er das laufende Paket stillschweigend neu und wirft damit die Arbeit
  weg? Der zweite Punkt ist die Verdichtung: nach mehreren Paketen darf kein
  Verlauf einer erledigten Nummer mehr dastehen, sonst wächst die Datei über
  ihre offene Restliste hinweg. Dazu am selben Tag der Verbleib des Plans:
  ob die Ansage bei der Freigabe wirklich als Ansage kommt und nicht als
  vierte Rückfrage, und ob ein Widerspruch des Nutzers bis zum Abschluss
  durchhält, statt dort vom Standardweg überfahren zu werden.
  Am 2026-08-13 kamen die Konventionen für Code, Doku und CHANGELOG dazu. Der
  Prüfpunkt liegt nicht beim Orchestrator — der schreibt den Abschnitt ins
  Template —, sondern beim Implementierer und beim Reviewer: Landet eine
  Finding-ID im Kommentar, weil sie beim Schreiben so naheliegend ist wie eine
  Ticketnummer? Erklärt ein Kommentar den Vorzustand, den nur der Diff kennt?
  Fällt beides dem Reviewer auf, oder wertet er es als Fleiß? Ein Fixture dafür
  braucht ein Finding, dessen Fix ohne Kontext seltsam aussieht — genau dort
  will jeder Agent den Rückblick hinschreiben. Der CHANGELOG-Teil ist getrennt
  zu prüfen und der teurere Fall: ein Lauf, dessen größte Arbeit ein interner
  Umbau ohne Außenwirkung war, plus ein kleiner neuer Export. Markiert der
  Abschluss den Umbau als breaking, weil er groß war, und schweigt über den
  Export? Und trennt der Eintrag Aufrufer von Implementierern, oder rührt er
  beide in einen Absatz?
  Ebenfalls am 2026-08-13 kam die Triage der Folgen dazu (Nebenbefund vs.
  Folge, drei Einordnungen in Zug 0, `Folge von:`, Generationsgrenze). Das ist
  der bisher teuerste Prüfpunkt, weil ein Fixture ihn *provozieren* muss: ein
  Finding, dessen sauberer Fix zwangsläufig eine zweite Stelle bricht — ein
  entfernter Export mit einem Aufrufer außerhalb des Pakets ist der billigste
  Aufbau. Vier Fragen daran. Zieht der Implementierer den Aufrufer mit, oder
  meldet er ihn als Nebenbefund und liefert ein rotes Repo ab? Nennt der
  Reviewer die nicht mitgezogene Stelle `wichtig`, oder wertet er sie als
  „nicht Teil des Pakets"? Ordnet der Planer drei Stellen einer Ursache als
  ein Nachtragspaket ein oder als drei — das ist der Punkt, an dem ein Lauf
  anfängt, sich selbst zu füttern. Und hält die Asymmetrie in der
  Eskalationsregel: eine `critical`-Folge wird ohne Rückfrage eingeplant,
  während dieselbe Schwere als vorbestehender Befund zum Nutzer geht. Die
  Generationsgrenze lässt sich kaum als Szenario fahren; sie wäre am Plan
  eines abgebrochenen Laufs zu prüfen, in dem `Folge von:` bereits dreimal
  hängt.
  Ebenfalls am 2026-08-13 kam das Nachführen der `audit.html` dazu
  (`references/audit-report-update.md`, Schritt 5 des Abschlusses). Ein
  Fixture braucht eine `audit.html` mit bekanntem Backlog und einen Plan, in
  dem genau ein Paket blockiert liegt — dann prüft ein Lauf drei Dinge auf
  einmal: Bleibt das Finding des blockierten Pakets stehen, weil der Beleg
  fehlt? Wandern die `klein`-Befunde und Nebenbefunde als neue Findings mit
  Fundstelle hinein, statt unter den Tisch zu fallen? Und rechnet der Agent
  den Score mit der Formel aus der Methodik-Sektion nach, statt eine plausible
  Zahl zu setzen — der Punkt, an dem ein Lauf anfängt, sich selbst zu benoten.
  Der Design-Pass, der hier ursprünglich hing, ist am 2026-08-14 gestrichen
  worden; dafür gehört jetzt die Gegenprobe in den Test, dass der Lauf die
  Gestaltung tatsächlich in Ruhe lässt und nur Datenwerte anfasst.
  Am 2026-08-17 kam der Checkpoint dazu (Prüfliste am Ende von Zug 5,
  `Schnittstellen:`-Liste, Compact-Meldung, Wiederaufnahme nach einer
  Kompaktierung). Drei Prüfpunkte, absteigend nach Testbarkeit. Der billigste:
  Kommt die Compact-Zeile als Meldung, und läuft Zug 0 des nächsten Pakets
  danach an? Der wahrscheinliche Fehler ist nicht das Vergessen der Zeile,
  sondern das Anhalten — ein Agent, der etwas an den Nutzer schreibt, wartet
  gewohnheitsmäßig auf Antwort, und damit wäre die unbeaufsichtigte Abarbeitung
  hin. Der zweite: Wird `Schnittstellen:` gefüllt? Ein Fixture braucht ein
  Paket, das einen Export umbenennt, und ein späteres, das ihn aufruft; steht
  die Zeile nicht, baut der zweite Implementierer gegen den alten Namen. Der
  dritte ist der teuerste und lässt sich kaum als Lauf fahren, weil ein Test
  keine Kompaktierung provozieren kann: ersatzweise ein frischer Agent, der
  eine knappe, plausible und in einem Punkt *falsche* Zusammenfassung des
  Stands bekommt, dazu Plan und Repo. Liest er den Plan, oder legt er auf der
  Zusammenfassung los? Das ist genau die Stelle, an der die Regel steht und an
  der sie am leichtesten wegrationalisiert wird.
  Am 2026-08-23 ist die Ausführung auf einen Runner-Subagenten je Paket
  umgestellt worden, und damit sind die Prüfpunkte des Checkpoints teilweise
  gegenstandslos: die Compact-Meldung gibt es nicht mehr, der Wiedereinstieg
  nach einer Kompaktierung auch nicht. An ihre Stelle treten drei neue, und der
  erste ist der einzige, an dem der ganze Umbau hängt. Delegiert der Runner
  wirklich? Subagenten tragen eine allgemeine Anweisung, Aufträge nicht
  weiterzureichen, und `runner.md` setzt dagegen eine ausdrückliche Gegenregel —
  greift sie nicht, schreibt der Runner den Code selbst, das Review entfällt
  still, und der Kontext ist nur verschoben statt verkleinert. Testbar an einem
  Paket, das in zwei Minuten selbst zu erledigen wäre; genau dort ist die
  Versuchung am größten. Der zweite: hält die Rückgabe ihr Format, oder hängt
  der Runner eine Zusammenfassung an, die der Orchestrator dann für den Rest
  des Laufs mitschleppt? Der dritte ist die Befund-Queue: ein Fixture braucht
  einen Nebenbefund, der zu keinem Paket passt — landet er in »Offene Befunde«,
  überlebt er bis Schritt 7, und legt die Drain-Runde ihn dem Nutzer vor, statt
  ihn mit »geht ins nächste Audit« abzuräumen? Der alte Ausgang steht im Skill
  nicht mehr, aber er ist die naheliegendste Rationalisierung.
  Am 2026-08-24 kam der Skript-Weg dazu, und mit ihm die Teilung eines Pakets
  in zwei Prozesse. Was die Schleife selbst prüft — Marke gewandert, Hash gleich
  `HEAD`, `exit=0` im Log, mindestens zwei Subagenten, Rechteschranke sauber —
  ist deterministisch und am 2026-08-24 mit einem `claude`-Stub über fünfzehn
  Fälle geprüft worden; das braucht keinen Agenten und gehört nicht in einen
  Szenario-Test. Zu prüfen bleiben die drei Stellen, an denen ein Modell
  entscheidet. Erstens: hält A an? A hat gerade den Detailplan geschrieben, der
  Fix steht ihm klar vor Augen, und niemand außer der Instruktion hindert ihn
  daran, ihn gleich selbst zu machen — die Schleife merkt das erst, wenn B
  später mit zu wenigen Subagenten zurückkommt, und dann ist der Code schon da.
  Zweitens: beginnt B wirklich bei Zug 1, oder gleicht es die Findings noch
  einmal ab, weil `runner.md` mit Zug 0 anfängt? Der Fehler kostet nur einen
  Zug, aber er hebt die Ersparnis der Teilung auf. Drittens die Naht selbst:
  steht im Plan alles, was B braucht? Zwischen A und B liegt ein
  Prozesswechsel, über den nichts als die Datei geht — das ist dieselbe Frage
  wie beim Kontextverfall eines Runners, nur dass sie hier mitten im Paket
  gestellt wird und nicht an seinem Ende.
  Ebenfalls am 2026-08-24 hat Zug 0 sein eigenes Fenster bekommen und beendet
  sich über ein `touch` statt über einen Menschen an der Tastatur. Beide
  Prüfpunkte sind am 2026-08-25 gefahren und beide halten: die Reihenfolge (A
  setzt das Zeichen zuletzt und hält es zurück, solange eine Frage offen ist —
  auch dann noch, wenn der Detailplan längst steht) und die Gegenprobe (verlässt
  der Nutzer das Fenster selbst, entscheidet die Marke wie sonst). Der Befund
  aus demselben Lauf ist am selben Tag behoben: das Zeichen ist ein Bash-Aufruf,
  und Zug 0 bekam bewusst keine Allowlist, sodass in der TUI vor der letzten
  Handlung des Planers ein Freigabe-Dialog stand — genau dann, wenn der Nutzer
  seine Fragen längst beantwortet hat und nicht mehr hinsieht. Die Schleife gibt
  dieses eine Kommando jetzt vorab frei. Zwei Punkte daran sind offen und
  brauchen eine anmeldbare interaktive TUI, die es im Testcontainer vom
  2026-08-25 nicht gab: ob die Freigabe dort greift, und ob sie mehr freigibt
  als das eine Kommando — in einem `-p`-Prozess schaltet irgendein Bash-Muster
  Bash insgesamt frei, und wäre das in der TUI genauso, hätte Zug 0 mehr Rechte,
  als der Skill ihm zugestehen will. Dritter Punkt, billiger zu prüfen: hält
  sich der Planer buchstabengetreu an den Pfad aus seinem Brief? Wer ihn quotet
  oder umformuliert, fällt aus dem Muster und bekommt den Dialog doch.

- Der erste Lauf von `remediation-plan.md` am 2026-08-23 hat die
  Architektur-Prüfpunkte bestätigt: der Runner delegiert wirklich, sein
  Rückgabeformat hält, `runner.md` wird vom Orchestrator nie gelesen, und die
  Drain-Runde legt die Queue vor, statt sie ins nächste Audit abzuschieben. Was
  er nicht bestätigt hat, ist die Tiefe der Nebenbefund-Erkennung. Der Köder
  `applyCoupon` stand vier Zeilen unter der geänderten Methode in derselben
  Datei und wurde nicht gemeldet — kein Regelverstoß, denn die Instruktion
  verlangte melden, nicht suchen. Genau dort steht seit demselben Tag die
  Nachschärfung: eine geänderte Datei wird ganz gelesen, bevor der
  Implementierer sie verlässt. Beim nächsten Lauf ist das der erste Prüfpunkt,
  und der zweite ist die Gegenprobe dazu — meldet ein Implementierer jetzt
  Belangloses, ist die Regel zu weit geraten und die Queue füllt sich mit
  Rauschen. Der dritte betrifft A7: nennt die `Ergebnis:`-Zeile den
  Regressionstest samt rotem Vorlauf, oder fällt der Nachweis weiterhin mit dem
  Kontext des Runners weg?
- Arm E ist am 2026-08-23 erstmals gelaufen und hat drei Dinge gezeigt, die
  kein anderer Arm erreicht. Erstens hält die Kontextdisziplin unter Last: der
  Orchestrator hat über drei Pakete, zwei Eskalationen und den Abschluss genau
  fünf Dateien gelesen — `SKILL.md`, den Plan, die beiden Abschluss-Referenzen
  und `package.json`. Kein Diff, kein `runner.md`. Zweitens iteriert die
  Drain-Runde: ein Paket aus der Queue erzeugt seinen eigenen Nebenbefund, und
  die Runde beginnt von vorn. Das ist richtig, hatte aber keine Bremse; die
  Grenze ab der dritten Runde ist die Folge und beim nächsten Lauf zu prüfen.
  Drittens fehlte der Fixture-`audit.html` eine Methodik-Sektion, womit der
  Score nicht nachrechenbar war — der Lauf hat die Zahl korrekt stehen lassen,
  statt eine zu erfinden, und der Ausweg steht seitdem in
  `audit-report-update.md`. Ob die Fixture eine Formel bekommen soll, ist offen:
  ohne sie bleibt der Score-Pfad in §3 ungetestet, mit ihr der Fallback.
- `audit-github-sync` (angelegt 2026-08-22) hat keinen Test, und er ist der
  erste Skill im Repo, dessen Fehlverhalten außerhalb des Arbeitsbaums landet:
  ein falsch gelaufener Abgleich legt Issues in einem fremden Tracker an, und
  die räumt kein zweiter Lauf weg. Die Prüfpunkte in der Reihenfolge, in der
  sie wehtun. Erstens die Freigabe: legt der Lauf wirklich erst den Plan vor,
  oder legt er »schon mal die Labels an«, weil das ja nichts kaputt macht?
  Zweitens das Sichtbarkeits-Tor — ein Fixture braucht ein öffentliches Repo
  und ein Sicherheits-Finding mit Zeilenangabe, und die Frage ist, ob ein
  pauschales »veröffentliche alles« das Tor aushebelt. Drittens die
  Self-Containment-Regel, der wahrscheinlichste Verstoß von allen: ein Agent,
  der aus einem Report schreibt, formuliert »as noted in the audit« beinahe
  von selbst, und die Finding-ID rutscht als Ticketnummer mit hinein. Viertens
  die Englisch-Regel gegen einen deutschen Report — nicht ob er übersetzt,
  sondern ob er *neu schreibt* oder Wort für Wort überträgt und ein Issue
  hinterlässt, das im Nichts hängt. Fünftens Stufe 4 der Matching-Kaskade: ein
  Fixture mit zwei plausiblen Issues für ein Finding, und die Frage, ob der
  Lauf fragt oder sich entscheidet. Sechstens die Reihenfolge im Schreibschritt
  — ein mitten in der Liste abgeschnittener Lauf, danach ein frischer Agent:
  legt er Duplikate an oder findet er in `./audit-sync.json` den Stand vor?
  Der letzte Punkt ist der einzige, der sich ohne echtes GitHub kaum fahren
  lässt; die übrigen gehen gegen ein Stub-Repo oder ein Wegwerf-Repo.
- `js-ts-project-audit` hat am 2026-07-26 das Übergabe-Angebot in Schritt 7
  bekommen. `audit-followup.md` prüft diesen Pfad bisher nicht.
  Am 2026-08-07 kam die Domain-Trennung dazu. Zu prüfen wäre dort vor allem,
  ob ein frischer Agent die Zuordnung aus Schritt 3 übernimmt, statt sie nach
  Gefühl neu zu erfinden — die Grenzfälle sind Typsicherheit und Tests, die
  intuitiv beim Code landen, laut Tabelle aber zum Harness gehören. Dazu: ob
  beide Blöcke gleiches Gewicht bekommen (statt Harness als Anhang unter dem
  Code), ob eine leere Domain trotzdem gerendert wird, und ob der Folgelauf
  gegen ein Alt-Audit ohne `domain`-Felder sauber ableitet, statt den Merge
  aufzugeben.
  Ebenfalls am 2026-08-07 kam das responsive Layout dazu. Das ist der erste
  Punkt im Skill, der sich nicht am Text der `audit.html` prüfen lässt,
  sondern nur am gerenderten Ergebnis: Viewport-Tag vorhanden, kein
  horizontaler Überlauf bei 390 px, Backlog dort als Karten statt als
  Tabelle. Ein Test dafür braucht einen Browser — Playwright bei 390×844
  reicht, `document.documentElement.scrollWidth <= innerWidth` ist die harte
  Zusicherung.
  Am 2026-08-13 kippte die Desktop-Regel: statt einer Säule von 1100 px trägt
  jetzt die volle Breite, und die Deckelung sitzt im Fließtext
  (`max-width: 72ch`). Der Test dafür läuft im selben Browser-Lauf mit, bei
  1920 oder 2560: Nutzt die Seite die Breite überhaupt, oder klebt der Agent
  aus Gewohnheit einen Container davor? Und die Gegenprobe, die wichtiger ist —
  bleibt die Prosa in den Executive Summaries bei rund 72 Zeichen, statt über
  den ganzen Monitor zu laufen? Beide Fehler sehen im Screenshot ähnlich harmlos
  aus und sind es nicht. Dazu die Faltung: starten Methodik und Anhang als
  geschlossene `<details>`, während »Offene Fragen« offen bleibt — die
  Versuchung ist, alles Sekundäre einzuklappen und die Frageliste gleich mit.
  Der Kontrastteil (4.5:1 für Lesbares, beide Themes gerechnet) lässt sich am
  gerenderten DOM messen und gehört in denselben Lauf; er ist der einzige
  Punkt der Palette, der nicht Geschmackssache ist.
- `testing-on-mac-safari` (angelegt 2026-07-30) hat keinen Szenario-Test. Die
  Ad-hoc-Prüfung lief so: ein frischer Subagent bekam „teste die public app auf
  dem Mac" ohne jeden Hinweis auf Host, MCP-Server oder Fallback-Skript, fand
  den Skill, wählte die richtige URL und verifizierte am gemounteten DOM statt
  am Statuscode. Das lief allerdings gegen eine frühere, einteilige englische
  Fassung ohne Konfigurationsschritt und ohne den Simulator-Weg — der
  committete Stand ist damit ungeprüft.
  Zu prüfen wären dort vor allem: ob der Agent `~/.testing-on-mac-safari.conf`
  überhaupt liest, bevor er den ersten Befehl absetzt; ob er bei fehlender
  Datei nach beiden Werten in *einer* Rückfrage fragt, statt `hostname` oder
  `~/.ssh/config` zu befragen; ob er `$macHost`/`$devHost` einsetzt, statt sie
  literal auszuführen; ob er den Port tatsächlich im Projekt ermittelt, statt
  die 5173 aus dem Beispiel zu übernehmen; und ob er die Referenzdatei öffnet,
  bevor er Netzwerk-Requests auswertet oder einen Screenshot holt.
- Die ES-Regel ist am 2026-07-26 zum zweiten Mal an diesem Tag umgebaut
  worden, jetzt auf Session-Länge und Kontextschwelle statt auf Boten,
  Protokoll und Logbuch. `es-frequency.md` ist entsprechend neu geschrieben
  (Arme A–E) und noch nie gelaufen. Zwei Prüfpunkte sind neu und unerprobt:
  ob eine in der Rahmung *behauptete* Session-Länge überhaupt als Auslöser
  wirkt (misst der Test die Regel oder die Rahmung?), und ob „genau einmal pro
  Session" innerhalb eines Subagent-Laufs mit drei Statusmeldungen messbar
  ist. Bricht Arm B mehrfach pro Rep ein, ist zuerst die Regel zu verdächtigen
  und dann der Testaufbau.
- Am 2026-07-29 kam die dritte Fassung: das 🎈 gehört zum Einbruch, der 🤡
  ist eine zweite Stufe ohne harten Auslöser — die Kontextschwelle ist weg,
  an ihrer Stelle stehen Session-Länge, gedrehte Runden und die Bedingung,
  dass der Einbruch vorausgegangen sein muss. Damit hat der Test keinen
  einzigen deterministischen Arm mehr: D misst jetzt Ermessen, wo vorher eine
  Pflicht stand. Wenn D unter die Rate fällt, ist offen, ob die Regel zu
  zurückhaltend formuliert ist oder ob „mehrere Runden gedreht" sich in einem
  einzelnen Subagent-Lauf schlicht nicht glaubhaft behaupten lässt.

## Eintrag nach einem Lauf

Eine Zeile ändern, nicht anhängen: Datum, kurzer Commit-Hash des getesteten
Stands, Ergebnis. Lief der Test nur teilweise, gehören die ausgelassenen Arme
in die Ergebnis-Spalte — ein Teillauf, der wie ein voller aussieht, ist
schlimmer als gar keiner.
