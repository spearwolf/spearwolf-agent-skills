# Referenz: Mobile Safari im iOS-Simulator auf dem Mac

Nachschlagewerk zum Skill `testing-on-mac-safari`, zweiter Weg. Wann welcher Weg richtig
ist, steht in der `SKILL.md`; hier steht, wie der Simulator läuft und wo er aufhört.

Alles läuft über `ssh $macHost`, `xcrun simctl` und synthetische Maus-Events. Ein
MCP-Server ist nicht beteiligt.

`$macHost` und `$devHost` sind die beiden Werte aus `~/.testing-on-mac-safari.conf`
(siehe „Schritt 0" in der `SKILL.md`). Sie stehen in jedem Befehl hier; setz sie ein.

## Gerät wählen und starten

```bash
ssh $macHost 'xcrun simctl list devices available'   # iOS 26.5: iPhone 17, iPhone Air, iPads …
ssh $macHost 'xcrun simctl boot <UDID>; open -a Simulator'
ssh $macHost 'xcrun simctl list devices | grep Booted'
```

Die UDIDs sind pro Mac stabil, aber nicht allgemeingültig — hol sie dir, statt sie zu
raten. Der **erste** `boot` nach längerer Pause kann mit „Install Failed: Es ist eine
Autorisierung erforderlich" und abgerissener `CoreSimulatorService`-Verbindung scheitern.
Das ist kein echter Fehler: derselbe Befehl noch einmal, und das Gerät bootet.

## HTTPS: der mkcert-Root muss extra rein

Der Simulator hat einen **eigenen** Trust-Store. Dass der mkcert-Root im Keychain des Macs
liegt, hilft ihm nicht — ohne diesen Schritt zeigt Safari eine Zertifikatswarnung statt
der App:

```bash
scp ~/.local/share/mkcert/rootCA.pem $macHost:/tmp/ca.pem
ssh $macHost 'xcrun simctl keychain <UDID> add-root-cert /tmp/ca.pem'
```

Der Hostname gilt wie beim Desktop-Safari: `$devHost`, **nie** die IP.

## Seite öffnen

```bash
ssh $macHost 'xcrun simctl launch <UDID> com.apple.mobilesafari'
ssh $macHost 'xcrun simctl openurl <UDID> "https://$devHost:5173/…"'
```

`openurl` läuft in einen Timeout (`NSPOSIXErrorDomain code=60`), wenn Safari noch gar
nicht läuft — erst `launch`, dann `openurl`. Danach mehrere Sekunden warten, bis die SPA
gemountet hat.

Ein `openurl` auf eine bereits offene URL lädt nicht zuverlässig neu. Hängt der Browser an
altem Code, hilft eine veränderte Query (`?v=2`) und im Zweifel
`terminate com.apple.mobilesafari` gefolgt von `launch`.

## Screenshot

```bash
ssh $macHost 'xcrun simctl io <UDID> screenshot /tmp/s.png'
scp $macHost:/tmp/s.png ./s.png
```

Beim iPhone 17 sind das 1206×2622 Gerätepixel bei `devicePixelRatio: 3`, also 402×874 CSS-
Punkte. Für schmale Ausschnitte (etwa eine eingeblendete Messzeile) lohnt ein
`PIL`-Crop, sonst geht der Text im Gesamtbild unter.

`screencapture` scheitert dagegen an fehlender Bildschirmaufnahme-Berechtigung — nimm
immer `simctl io`.

## Tippen und wischen

`simctl` kennt keine Eingabe, `idb` und `cliclick` sind nicht installiert. Der Weg führt
über synthetische CGEvents. Voraussetzung ist **einmalig** eine Freigabe am Mac:
Systemeinstellungen → Datenschutz & Sicherheit → **Bedienungshilfen** → `+` → ⇧⌘G →
`/usr/libexec/sshd-keygen-wrapper` (das ist das `Program` des launchd-Jobs
`com.openssh.sshd`). Danach SSH-Verbindung neu aufbauen.

Probe, ob die Freigabe sitzt:

```bash
ssh $macHost 'osascript -e "tell application \"System Events\" to tell process \"Simulator\" to get {position, size} of window 1"'
```

Zahlen statt „Fehler -1719" heißt: es geht.

Dann `scripts/sim_input.js` aus diesem Skill-Verzeichnis auf den Mac kopieren und
benutzen. Koordinaten sind **CSS-Punkte des simulierten Geräts** — Screenshot-Pixel
geteilt durch `devicePixelRatio`. Die Lage des Gerätebildschirms auf dem Desktop liest das
Skript selbst aus dem AX-Baum (`window 1` → Element mit Subrolle `iOSContentGroup`), das
Fenster darf also stehen und skaliert sein, wie es will.

```bash
scp <skill-verzeichnis>/scripts/sim_input.js $macHost:/tmp/
ssh $macHost 'osascript -l JavaScript /tmp/sim_input.js tap 201 265'
ssh $macHost 'osascript -l JavaScript /tmp/sim_input.js swipe 200 650 200 300 12 0.005'
```

Bei einem anderen Gerät als dem iPhone 17 die CSS-Breite als letztes Argument mitgeben.

## Die Safari-Leiste einklappen

Genau dafür lohnt der Simulator, und genau daran scheitert man zuerst. Drei Bedingungen
müssen zusammenkommen:

1. **Eine echte Wischgeste.** `window.scrollTo` rollt die Seite, lässt die Leiste aber
   ausgeklappt — iOS reagiert nur auf Gesten. Der Flick braucht Tempo; ein langsames
   Ziehen scrollt nur.
2. **Der Root-Scroller muss scrollen.** Scrollt stattdessen ein inneres Element, bleibt die
   Leiste stehen. Prüfe das im Zweifel: `window.scrollY` gegen `document.body.scrollTop`.
   Bleibt `scrollY` bei 0, während `body.scrollTop` wächst, ist body der Scroller und die
   Leiste klappt nie ein. Das passiert schneller, als man denkt — `html, body { overflow-x:
   hidden }` zusammen mit einer 100%-Höhe genügt schon.
3. **Genug Scroll-Reserve.** Am Dokumentende klappt Safari die Leiste sofort wieder aus.
   Sorge für Inhalt unterhalb der Stelle, die du sehen willst, und höre vor dem Ende auf.

Ist die Leiste eingeklappt, springt `innerHeight` von `svh` auf `lvh` — iPhone 17 unter
iOS 26.5: von 714 auf 754. Ein `position: fixed`-Element mit `inset: 0` wächst dann mit und
verschwindet unter der schwebenden Pille. `dvh` folgt diesem Sprung ebenfalls; nur `svh`
bleibt konstant und hält den unteren Rand frei.

## Werte aus der Seite holen

Ein Web-Inspector steht nicht zur Verfügung, `evaluate_javascript` gibt es hier nicht.
Rendere die Messwerte in ein `position: fixed`-Kästchen am oberen Rand und lies sie aus dem
Screenshot. Ein Marker (`v1`, `v2`, …) im selben Kästchen zeigt nebenbei, ob überhaupt der
neue Code läuft — Safari hängt gern an alten Modulen.

Steckt der zu prüfende Zustand hinter Spielfortschritt, Freischaltcode oder Login, leg eine
temporäre, per URL erreichbare Route an, die genau diese Komponente rendert, und räum sie
hinterher wieder ab. Ein `position: sticky`-Wrapper um den auslösenden Button hält ihn
sichtbar, während du zum Einklappen der Leiste scrollst.

## Was der Simulator dafür kann

Er ist der einzige Weg an **mobiles** WebKit: Viewport-Einheiten gegen echte Browser-UI
(`lvh` ≠ `svh`), Touch- und Pointer-Events, `env(safe-area-inset-*)`, das Verhalten von
`position: fixed` gegenüber der ein- und ausgeklappten Leiste. Am Desktop-Safari ist davon
nichts zu sehen, egal wie schmal man das Fenster zieht.
