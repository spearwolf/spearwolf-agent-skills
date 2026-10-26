---
name: testing-on-mac-safari
description: Use when the user asks to test, check, look at or screenshot something on "dem Mac", on macOS, on a real device, or in Safari/WebKit — e.g. "teste das auf dem Mac", "warum geht das auf dem Mac nicht", "schau dir das im Safari an", "mach mal einen Screenshot auf dem Mac". Also use for mobile Safari, iPhone or iOS Simulator requests — "teste das im iOS-Simulator unter Safari", "wie sieht das auf dem iPhone aus", "im mobilen Safari anschauen". Also use when a bug is reported as Safari-only, WebKit-only, iOS-only or mobile-only and needs reproducing in real Safari instead of Playwright or Chrome.
---

# Auf dem Mac im echten Safari testen

## Worum es geht

Ein physischer Mac (macOS 26) läuft im selben LAN, per SSH erreichbar. Damit wird echtes
WebKit auf echter Hardware prüfbar — nicht als Ersatz für lokales Testen, sondern für die
Fälle, in denen genau diese Engine der Punkt ist.

Im Fernbetrieb laufen die Server und Services **auf diesem Linux-Rechner**; der Mac greift
übers Netz darauf zu. Er ist Anzeigegerät, keine Entwicklungsmaschine — das Repository
liegt dort nicht.

Im **Lokal-Modus** ist dieser Rechner selbst der Mac: kein SSH, kein `scp`, Dev-Server und
Safari auf derselben Maschine. Welcher Fall gilt, sagt die Konfiguration (Schritt 0).

## Wann

- Der Nutzer sagt „teste das auf dem Mac", „warum geht das auf dem Mac nicht", „schau
  dir das im Safari an"
- Ein Fehler tritt nur in Safari/WebKit auf (Rendering, PWA, Service Worker, IndexedDB,
  `-webkit-`-Eigenheiten)
- Ein Screenshot aus echtem Safari ist gefragt
- Es geht um mobiles Safari: „teste das im iOS-Simulator unter Safari", „wie sieht das
  auf dem iPhone aus", ein Fehler zeigt sich nur auf dem Handy

**Nicht dafür:** normales lokales Testen. Playwright und chrome-devtools MCP laufen hier
und sind schneller.

## Schritt 0: die beiden Hostnamen

Dieser Skill kennt keine Hostnamen. Er hält zwei Platzhalter offen, und beide Wege — Desktop
wie Simulator — brauchen sie:

| Platzhalter | Was |
| --- | --- |
| `$macHost` | Der Mac im LAN. SSH-Ziel und Namensbestandteil des MCP-Servers |
| `$devHost` | **Dieser** Rechner, unter dem Namen, unter dem der Mac ihn im LAN erreicht |

Die Werte stehen in `~/.testing-on-mac-safari.conf`. Lies sie, **bevor** du irgendetwas
anderes tust:

```bash
cat ~/.testing-on-mac-safari.conf
```

Format: eine Zuweisung pro Zeile, `key = value`, Leerraum um das `=` egal, `#` leitet einen
Kommentar ein.

```
macHost = <ssh-name des macs>
devHost = <lan-name dieses rechners>
```

**`macHost = local` heißt: dieser Rechner ist der Mac.** Dann gilt `devHost = localhost`,
und bevor du weitermachst, lies
[`references/lokal-auf-dem-mac.md`](./references/lokal-auf-dem-mac.md). Sie übersetzt jeden
`ssh`- und `scp`-Befehl dieses Skills in seine lokale Form und listet die einmalige
Einrichtung.

**Fehlt die Datei oder einer der beiden Schlüssel**, frag den Nutzer danach — beide Werte in
*einer* Rückfrage, nicht in zweien — und schreib sie anschließend in genau diesem Format
dorthin. Meldet `uname` hier `Darwin`, biete `local` als Antwort an. Eine vorhandene Datei
wird ergänzt, nicht überschrieben. Danach läuft der Ablauf normal weiter.

Rate die Werte nicht und leite sie nicht aus `hostname`, `~/.ssh/config` oder einer früheren
Session ab. Ein falscher `$devHost` produziert am Mac keinen sprechenden Fehler, sondern
einen Timeout, der genauso aussieht wie ein nicht gestarteter Server.

Im Rest dieses Skills und in den Referenzdateien stehen `$macHost` und `$devHost` überall
dort, wo die echten Namen hingehören — auch in Befehlen zum Abtippen. Setz sie ein, statt
sie literal auszuführen.

## Zwei Wege, und sie können verschiedenes

| | Desktop-Safari | Mobile Safari im iOS-Simulator |
| --- | --- | --- |
| Steuerung | MCP-Server `safari-$macHost` | `ssh $macHost` + `xcrun simctl` |
| Tippen, Wischen | ja | ja, über synthetische CGEvents |
| Konsole, Netzwerk, DOM auslesen | ja | nein — Werte in die Seite rendern |
| Mobile Browser-UI, Touch, Safe Areas | nein | ja |

Der Desktop-Weg ist der Standard: er kann bedienen **und** auslesen. Zum Simulator greifst
du, wenn die **mobile** Browser-UI selbst zur Sache gehört — Viewport-Einheiten gegen die
Safari-Leiste, `position: fixed` am unteren Rand, `env(safe-area-inset-*)`, Touch-Gesten —
oder wenn der Nutzer ausdrücklich danach fragt („teste das im iOS-Simulator unter Safari",
„wie sieht das auf dem iPhone aus"). Ein schmal gezogenes Desktop-Fenster ersetzt das
nicht; dort gibt es keine Browserleiste am unteren Bildschirmrand.

Bedienen lässt sich der Simulator über `scripts/sim_input.js` (Tap und Swipe in CSS-Punkten
des Geräts). Das setzt **einmalig** eine Bedienungshilfen-Freigabe für
`/usr/libexec/sshd-keygen-wrapper` am Mac voraus; fehlt sie, endet jeder Aufruf mit
Fehler `-1719`. Auslesen geht nicht: kein Web-Inspector, kein `evaluate_javascript` — was
du wissen willst, rendert die Seite in ein `fixed`-Kästchen, das du mit abfotografierst.
Ablauf, Freigabe und die Bedingungen fürs Einklappen der Safari-Leiste stehen in
[`references/ios-simulator.md`](./references/ios-simulator.md).

## Der Mac muss entsperrt sein

Ein gesperrter Bildschirm sieht nicht nach Sperre aus, sondern nach kaputter Seite. Im
Desktop-Safari meldet das Dokument `visibilityState: "hidden"` und `hasFocus() === false`,
`requestAnimationFrame` läuft nicht, der Screenshot ist schwarz, und ein Fullscreen wird
abgelehnt, obwohl der Klick als `isTrusted` ankommt. Im Simulator gehen Booten, `openurl`
und `simctl io screenshot` weiter, Tippen, Wischen und Drehen nicht.

Vor dem ersten Test, und sobald eines dieser Zeichen auftaucht, prüfen:

```bash
ssh $macHost 'ioreg -n Root -d1 | grep -o "CGSSessionScreenIsLocked\"=[A-Za-z]*" || echo unlocked'
```

Bei `=Yes` entsperrt **der Nutzer** den Mac; bis dahin geht nur, was ohne Fenster auskommt.

## Zugang zum Desktop-Safari

| Was | Wert |
| --- | --- |
| SSH | `ssh $macHost` — Alias, User und Key stehen in `~/.ssh/config` des Nutzers |
| MCP-Server | `safari-$macHost`, Tools erscheinen als `mcp__safari-$macHost__*` |
| Binary dahinter | `/Applications/Safari Technology Preview.app/Contents/MacOS/safaridriver --mcp` |

Der Servername folgt der Konvention `safari-` plus `$macHost`. Findest du ihn darunter
nicht, sieh in der Tool-Liste nach einem `mcp__safari-*__`-Präfix nach, statt zu raten —
registriert hat ihn irgendwann jemand von Hand.

Das System-`safaridriver` unter `/usr/bin` hat **kein** `--mcp` — nur der Build der
Technology Preview.

**In einem Subagent ist der MCP-Server in der Regel nicht exponiert**, auch wenn
`claude mcp list` ihn als verbunden meldet. Dort nicht danach suchen, sondern direkt
`scripts/mcp_safari.py` aus diesem Skill-Verzeichnis benutzen.

## Die URL zusammensetzen

Zwei Teile, und nur einer davon ist allgemeingültig.

**Der Host steht fest:** `$devHost` aus der Konfiguration, unverändert übernommen. Trägt der
Wert eine Domain, funktioniert meist auch die kurze Form ohne — verlass dich darauf nicht,
sondern nimm, was in der Datei steht.

**Niemals die IP verwenden.** Bei HTTPS bricht sonst die Zertifikatsprüfung: die
mkcert-Zertifikate tragen die Hostnamen als SAN, keine Adressen. Über die IP zeigt Safari
eine Warnseite statt der App. Der Simulator hat einen eigenen Trust-Store und braucht den
Root extra.

**Der mkcert-Root muss im System-Keychain des Macs vertraut sein**, sonst endet auch der
Hostname auf der Warnseite. Das ist nicht selbstverständlich — vor dem ersten HTTPS-Test
prüfen, ob der Fingerprint des lokalen Roots dort auftaucht:

```bash
openssl x509 -in ~/.local/share/mkcert/rootCA.pem -noout -fingerprint -sha1 | tr -d :
ssh $macHost 'security find-certificate -a -c mkcert -Z /Library/Keychains/System.keychain ~/Library/Keychains/login.keychain-db | grep SHA-1'
```

Fehlt er, trägt **der Nutzer** ihn ein — das braucht `sudo` und sein Passwort am Mac. Nicht
selbst anstoßen; den Root vorher bereitlegen und den Befehl zum Abtippen nennen:

```bash
scp ~/.local/share/mkcert/rootCA.pem $macHost:/tmp/ca.pem
# am Mac:
sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain /tmp/ca.pem
```

Erkennungszeichen, falls es übersehen wurde: `location.href` meldet
`safari-resource:/CertificateWarningFall2023.html` statt der App-URL. Ein `curl` vom Mac
aus ist kein Gegenbeweis — es benutzt den Keychain nicht und scheitert auch dann, wenn
Safari dem Root längst vertraut.

**Protokoll und Port sind projektspezifisch**, und zwar bis hinunter zur einzelnen App.
Zwei Apps im selben Repo können auseinanderlaufen: die eine unter HTTPS auf 5173, die andere
unter reinem HTTP auf 5175, weil nur die eine Vite-Config ein mkcert-Zertifikat lädt. Rate
nicht, sondern ermittle beides für die App, um die es geht:

1. Projekt-Doku und Memory lesen (`AGENTS.md`, `CLAUDE.md`, Projekt-Memory) — dort steht
   meist eine Tabelle der Apps mit Ports
2. `package.json`-Scripts und die Server-/Vite-Configs prüfen
3. `ss -tlnp` zeigt, was gerade tatsächlich lauscht

Das falsche Protokoll führt zu einem irreführenden Fehlerbild: `https://` gegen einen
HTTP-Server ergibt einen Handshake-Fehler, `http://` gegen einen HTTPS-Server hängt
kommentarlos. Ist der Service gar nicht gestartet, starte ihn oder frage nach — vom Mac
aus sieht auch das nur nach Netzwerkfehler aus.

**Der Service muss auf der LAN-Schnittstelle lauschen.** Bindet er nur an `localhost`,
nützt der Hostname nichts (bei Vite: `server.host: true`). Dev-Server mit
Host-Header-Prüfung brauchen zusätzlich eine Freigabe für fremde Hostnamen (bei Vite:
`server.allowedHosts`).

## Ablauf im Desktop-Safari

1. Tab öffnen, navigieren, **mehrere Sekunden warten** — `wait_for_navigation` kehrt lange
   zurück, bevor eine SPA gemountet hat
2. Am DOM verifizieren, nicht am Statuscode. HTTP 200 und ein korrekter Titel beweisen
   nichts: ein Dev-Server liefert die Shell auch dann, wenn die Module scheitern.
   Prüfe die gemountete Wurzel und lies die Konsole
3. Bei Auffälligkeiten Konsole und Netzwerk auswerten, dann erst interpretieren

```js
// evaluate_javascript — erwartet einen Funktionskörper mit explizitem return
return JSON.stringify({
  root: document.getElementById('root')?.children.length ?? -1,
  textLen: document.body.innerText.trim().length,
});
```

`root: 0` bei sauberem HTTP-Status heißt: die App ist nie gestartet, das Problem liegt
beim Laden der Module, nicht beim Rendern.

**Alles in einer Session.** safaridriver schließt jeden Automatisierungs-Tab, sobald die
MCP-Verbindung endet. Verlasse dich nie auf einen Tab aus einem früheren Arbeitsgang;
`list_tabs` ist dann leer.

## Referenz

[`references/mcp-safari-referenz.md`](./references/mcp-safari-referenz.md) — vollständige
Tool-Liste des MCP-Servers, die restlichen Fallstricke und die Benutzung des
Fallback-Skripts. Lies sie, bevor du Netzwerk-Requests auswertest oder einen Screenshot
holst; beides verhält sich anders, als man erwartet.

[`references/ios-simulator.md`](./references/ios-simulator.md) — Gerät booten, mkcert-Root
in den Trust-Store des Simulators, Seite öffnen, Screenshot holen, tippen, wischen und drehen. Dazu
die drei Bedingungen, unter denen die Safari-Leiste einklappt, und wie man Messwerte ohne
Inspector aus der Seite bekommt.

[`references/lokal-auf-dem-mac.md`](./references/lokal-auf-dem-mac.md) — nur bei
`macHost = local`: lokale Form der Befehle, einmalige Einrichtung auf dem Mac selbst.
