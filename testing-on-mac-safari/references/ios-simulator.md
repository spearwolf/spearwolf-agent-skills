# Referenz: Mobile Safari im iOS-Simulator auf dem Mac

Nachschlagewerk zum Skill `testing-on-mac-safari`, zweiter Weg. Wann welcher Weg richtig
ist, steht in der `SKILL.md`; hier steht, wie der Simulator läuft und wo er aufhört.

Alles läuft über `ssh $macHost`, `xcrun simctl` und synthetische Maus-Events. Ein
MCP-Server ist nicht beteiligt.

`$macHost` und `$devHost` sind die beiden Werte aus `~/.testing-on-mac-safari.conf`
(siehe „Schritt 0" in der `SKILL.md`). Sie stehen in jedem Befehl hier; setz sie ein.

## Zuerst: ist der Simulator überhaupt da?

Bevor du irgendetwas bootest:

```bash
ssh $macHost 'xcrun simctl list runtimes 2>&1 | grep -c "^iOS"'
```

Eine Zahl größer 0 heißt: los. Alles andere — `unable to find utility "simctl"` (nur die
Command Line Tools, kein Xcode) oder `0` (Xcode ohne iOS-Runtime) — heißt: der Simulator ist
nicht installiert. Dann gibst du **sofort** eine Warnung aus, deutlich abgesetzt und vor
jedem weiteren Schritt:

> ⚠️ **iOS-Simulator nicht installiert** auf `$macHost` — mobiles Safari ist dort nicht
> testbar. Nötig: Xcode aus dem App Store, `sudo xcode-select -s /Applications/Xcode.app`,
> `xcodebuild -downloadPlatform iOS`.

Hat der Nutzer ausdrücklich nach mobilem Safari, iPhone oder Simulator gefragt, endet der
Lauf mit dieser Warnung. Hast du den Simulator selbst gewählt, weil der Fehler nach mobiler
Browser-UI aussieht, darfst du danach den Desktop-Weg fahren — aber nur mit dem Satz, dass
Safari-Leiste, Touch und `env(safe-area-inset-*)` dort nicht prüfbar sind.

## Gerät wählen und starten

```bash
ssh $macHost 'xcrun simctl list devices available'   # Xcode 27.1: iPhone 17 unter iOS 27.0, iPads …
ssh $macHost 'xcrun simctl boot <UDID>; open /Applications/Xcode.app/Contents/Applications/DeviceHub.app'
ssh $macHost 'xcrun simctl list devices | grep Booted'
```

Seit Xcode 27 heißt die App, die das Gerät zeigt, **DeviceHub**; eine `Simulator.app` gibt es
nicht mehr, `open -a Simulator` findet nichts. Unter älterem Xcode steht an derselben Stelle
`open -a Simulator`. Der Prozessname im AX-Baum folgt dem App-Namen.

Die UDIDs sind pro Mac stabil, aber nicht allgemeingültig — hol sie dir, statt sie zu
raten. Der **erste** `boot` nach längerer Pause kann mit „Install Failed: Es ist eine
Autorisierung erforderlich" und abgerissener `CoreSimulatorService`-Verbindung scheitern.
Das ist kein echter Fehler: derselbe Befehl noch einmal, und das Gerät bootet.

## HTTPS: der mkcert-Root muss extra rein

Der Simulator hat einen **eigenen** Trust-Store. Ob der mkcert-Root im Keychain des Macs
liegt, ist ihm egal — ohne diesen Schritt zeigt Safari eine Zertifikatswarnung statt der
App. Dafür braucht er weder `sudo` noch den Nutzer:

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

Jedes `openurl` öffnet einen neuen Tab. Das ist im Querformat nicht egal: ab zwei Tabs zeigt
Safari dort eine Tab-Leiste unter der Adressleiste, und beide zusammen kosten auf dem iPhone 17
110 der 402 Punkte Höhe. Wer im Querformat misst, sagt dazu, wie viele Tabs offen waren.

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
ssh $macHost 'osascript -e "tell application \"System Events\" to tell process \"DeviceHub\" to get {position, size} of window 1"'
```

Zahlen statt „Fehler -1719" heißt: es geht. Unter älterem Xcode heißt der Prozess `Simulator`.

Dann `scripts/sim_input.js` aus diesem Skill-Verzeichnis auf den Mac kopieren und
benutzen. Koordinaten sind **CSS-Punkte des simulierten Geräts** — Screenshot-Pixel
geteilt durch `devicePixelRatio`. Die Lage des Gerätebildschirms auf dem Desktop liest das
Skript selbst aus dem AX-Baum (`window 1` von DeviceHub oder Simulator → das erste Element mit
Subrolle `iOSContentGroup`, bei DeviceHub einige Ebenen tief), das Fenster darf also stehen
und skaliert sein, wie es will.

```bash
scp <skill-verzeichnis>/scripts/sim_input.js $macHost:/tmp/
ssh $macHost 'osascript -l JavaScript /tmp/sim_input.js tap 201 265'
ssh $macHost 'osascript -l JavaScript /tmp/sim_input.js swipe 200 650 200 300 12 0.005'
```

Bei einem anderen Gerät als dem iPhone 17 die CSS-Breite als letztes Argument mitgeben, im
Querformat ebenso: dort ist die Breite die lange Seite, beim iPhone 17 also 874.

## Drehen

`simctl` kann das Gerät nicht drehen. DeviceHub kann es über das Menü *Controls → Rotate
Left / Rotate Right*, und das Menü lässt sich mit derselben Bedienungshilfen-Freigabe
fernsteuern:

```bash
ssh $macHost 'osascript -e "tell application \"System Events\" to tell process \"DeviceHub\"
  set frontmost to true
  click menu item \"Rotate Left\" of menu 1 of menu bar item \"Controls\" of menu bar 1
end tell"'
```

Die Seite bekommt dabei eine echte Drehung: `screen.orientation` wechselt auf
`landscape-primary` und feuert `change`. Der
Screenshot kommt danach quer, beim iPhone 17 mit 2622×1206 Pixeln, also 874×402 CSS-Punkten.

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
   hidden }` zusammen mit einer 100%-Höhe genügt schon. Ebenso sperrt ein `position:
   fixed`-Element, das den ganzen Viewport bedeckt: eine Wischgeste darauf scrollt das
   Dokument nicht, auch wenn der Root scrollen dürfte (`scrollY` bleibt 0). Was beim Start
   eines solchen Overlays an Leiste steht, bleibt stehen.
3. **Genug Scroll-Reserve.** Am Dokumentende klappt Safari die Leiste sofort wieder aus.
   Sorge für Inhalt unterhalb der Stelle, die du sehen willst, und höre vor dem Ende auf.

Ist die Leiste eingeklappt, springt `innerHeight` von `svh` auf `lvh` — iPhone 17 unter
iOS 26.5: von 714 auf 754. Ein `position: fixed`-Element mit `inset: 0` wächst dann mit und
verschwindet unter der schwebenden Pille. `dvh` folgt diesem Sprung ebenfalls; nur `svh`
bleibt konstant und hält den unteren Rand frei.

Im Querformat (iPhone 17, iOS 27.0) klappt dieselbe Geste Adress- und Tab-Leiste ganz weg:
`innerHeight` springt von 292 auf 402, die Seite hat den vollen Bildschirm.

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

**WebGPU kann er nicht.** Auch im sicheren Kontext ist `navigator.gpu` zwar vorhanden, aber
`requestAdapter()` liefert `null` (iOS 26.5, mit und ohne `powerPreference`). three.js'
`WebGPURenderer` fällt dann still auf WebGL 2 zurück. Ein WebGL-Bild im Simulator sagt
also nichts über WebGPU auf dem iPhone. WebGPU in WebKit prüfst du im Desktop-Safari; welches
Backend läuft, verrät dort `canvas.getContext('webgpu')` — ein Canvas trägt nur einen
Kontexttyp, `null` heißt, WebGL hat ihn belegt.
