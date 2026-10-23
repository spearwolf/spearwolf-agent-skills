# Referenz: Lokal-Modus — dieser Rechner ist der Mac

Nachschlagewerk zum Skill `testing-on-mac-safari` für den Fall `macHost = local` in
`~/.testing-on-mac-safari.conf`. Der Agent läuft dann auf dem Mac selbst: Repository,
Dev-Server und Safari liegen auf derselben Maschine. Diese Datei sagt, was sich gegenüber
dem Fernbetrieb ändert; alles, was hier nicht steht, gilt unverändert aus `SKILL.md` und den
anderen Referenzen.

## Übersetzungsregeln

| Im Skill steht | Im Lokal-Modus |
| --- | --- |
| `ssh $macHost '<befehl>'` | `<befehl>` direkt ausführen |
| `scp <quelle> $macHost:<ziel>` und zurück | entfällt — die Datei liegt schon hier; nimm den Pfad direkt |
| MCP-Server `safari-$macHost` | `safari-local`, Tools als `mcp__safari-local__*` |
| `$devHost` | `localhost` (so steht es in der Konfiguration) |
| `ss -tlnp` | `lsof -nP -iTCP -sTCP:LISTEN` |
| `~/.local/share/mkcert/rootCA.pem` | `"$(mkcert -CAROOT)/rootCA.pem"` |
| Bedienungshilfen für `/usr/libexec/sshd-keygen-wrapper` | Bedienungshilfen für die Terminal-App, in der der Agent läuft (Terminal, iTerm, Ghostty …) |

`scripts/mcp_safari.py` erkennt `local` selbst und startet `safaridriver` ohne SSH. Ein
`screenshot` des MCP-Servers liefert einen lokalen Pfad, den du direkt liest.

Der Abschnitt „Der Service muss auf der LAN-Schnittstelle lauschen" entfällt: Safari und
der iOS-Simulator erreichen `localhost` des Macs direkt. Der Simulator teilt den
Netzwerk-Stack des Hosts.

## Einmalige Einrichtung

Prüfe jeden Punkt, bevor du ihn als Ursache eines Fehlers ausschließt. Was fehlt, richtet
der Nutzer ein — die Installationen verlangen ein Admin-Passwort, das der Agent nicht hat.

1. **Safari Technology Preview.** Nur ihr `safaridriver` kennt `--mcp`; das System-Binary
   unter `/usr/bin` nicht.
   ```bash
   test -x "/Applications/Safari Technology Preview.app/Contents/MacOS/safaridriver" && echo ok
   ```
   Fehlt sie: `brew install --cask safari-technology-preview` (ein `.pkg`, braucht `sudo`).
2. **Fernautomation erlauben.** Einmal mit Admin-Rechten:
   ```bash
   sudo "/Applications/Safari Technology Preview.app/Contents/MacOS/safaridriver" --enable
   ```
   Danach muss `scripts/mcp_safari.py '{"method":"tools/list","params":{}}'` eine
   Tool-Liste liefern.
3. **MCP-Server registrieren**, im User-Scope:
   ```bash
   claude mcp add safari-local --scope user -- "/Applications/Safari Technology Preview.app/Contents/MacOS/safaridriver" --mcp
   ```
   Die Tools erscheinen erst in einer neu gestarteten Session; bis dahin trägt
   `scripts/mcp_safari.py`.
4. **Nur für den iOS-Simulator: volles Xcode.** Die Command Line Tools allein bringen kein
   `simctl` (`xcrun: error: unable to find utility "simctl"`). Xcode aus dem App Store,
   danach `sudo xcode-select -s /Applications/Xcode.app` und eine iOS-Runtime laden
   (`xcodebuild -downloadPlatform iOS`).
5. **Nur für HTTPS:** `mkcert -install` legt den Root in den Keychain des Macs. Das
   Zertifikat muss `localhost` als SAN tragen.

Ob Punkt 4 erfüllt ist und welche Warnung fällig wird, wenn nicht, regelt der Abschnitt
„Zuerst: ist der Simulator überhaupt da?" in `references/ios-simulator.md`.

## Der Unterschied, der zählt

Im Lokal-Modus öffnet der Agent Fenster auf dem Bildschirm, vor dem der Nutzer gerade
sitzt. Automatisierungs-Tabs und der Simulator erscheinen mitten in seiner Arbeit, und die
Tipp- und Wischgesten aus `scripts/sim_input.js` bewegen **seinen** Mauszeiger. Kündige
Simulator-Eingaben vorher an und schließe am Ende, was du geöffnet hast.
