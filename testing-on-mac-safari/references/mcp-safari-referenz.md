# Referenz: Safari-MCP auf dem Mac

Nachschlagewerk zum Skill `testing-on-mac-safari`. Die Entscheidungsregeln stehen in
der `SKILL.md`; hier steht, was die Werkzeuge können und wo sie sich anders verhalten,
als man erwartet.

`$macHost` und `$devHost` sind die beiden Werte aus `~/.testing-on-mac-safari.conf`
(siehe „Schritt 0" in der `SKILL.md`). Sie stehen hier auch in Befehlen; setz sie ein.

## Werkzeuge

| Werkzeug | Zweck |
| --- | --- |
| `create_tab` | Neuen Tab öffnen, optional mit URL. Gibt ein Handle zurück |
| `close_tab`, `list_tabs`, `switch_tab` | Tab-Verwaltung innerhalb der laufenden Session |
| `navigate_to_url` | Im aktuellen Tab navigieren |
| `wait_for_navigation` | Wartet auf den Navigationsabschluss, **nicht** auf das Rendering |
| `page_info` | Titel und URL |
| `get_page_content` | Textbaum der Seite, mit UIDs für Elemente |
| `evaluate_javascript` | Funktionskörper im Seitenkontext, `$uid(N)` referenziert Elemente |
| `page_interactions` | Klicken, Tippen, Formulare |
| `browser_console_messages` | Gepufferte Konsolenmeldungen, `level_filter`, `limit` |
| `browser_dialogs` | `alert`/`confirm`/`prompt` auflisten und beantworten |
| `list_network_requests` | Aufgezeichnete Requests, filterbar über `status_min` |
| `get_network_request` | Ein Request im Detail: Header, Body, Timing |
| `screenshot` | Schreibt PNG auf dem Mac, gibt den **Pfad** zurück |
| `set_viewport_size`, `set_emulated_media` | Viewport, `prefers-color-scheme` etc. |

## Fallstricke

| Symptom | Ursache | Abhilfe |
| --- | --- | --- |
| Seite wirkt leer, `root.children.length === 0` | Zu früh gemessen; `wait_for_navigation` kehrt vor dem Mount zurück | Einige Sekunden warten, erneut prüfen |
| `list_tabs` liefert `[]`, obwohl ein Tab geöffnet wurde | safaridriver schließt alle Automatisierungs-Tabs beim Sessionende | Ganzes Szenario in einer Session fahren |
| `list_network_requests` oder `browser_console_messages` liefern nichts, obwohl die Seite Fehler erzeugt | Beide Puffer zeichnen erst auf, nachdem das Tool auf der aktuellen Seite einmal aufgerufen wurde, und ein Neuladen über den HTTPS-Rückfall (nächste Zeile) verliert die Aufzeichnung wieder | Dreischritt: `navigate_to_url`, beide Tools einmal aufrufen, dann dieselbe URL mit veränderter Query (`?v=2`) erneut ansteuern |
| Konsole meldet „A TLS error caused the secure connection to fail", die Seite steht trotzdem | Safari versucht eine `http://`-URL auf einem LAN-Hostnamen zuerst über HTTPS und fällt danach auf HTTP zurück; bei `localhost` nicht | Kein Fehler der App. Den Eintrag ignorieren und nach dem Dreischritt messen |
| Filter in `list_network_requests` wirkt nicht | Die Kriterien stehen verschachtelt unter `filter` | `{"filter": {"status_min": 400}}` |
| Konsolenmeldung beim zweiten Abruf weg | `browser_console_messages` leert den Puffer standardmäßig | `"clear": false` setzen, wenn du erneut lesen willst |
| `screenshot` liefert kein Bild | Es schreibt eine PNG in den Temp-Ordner des Macs und gibt den Pfad zurück | `scp $macHost:<pfad> ./shot.png`, dann lesen |
| `evaluate_javascript` gibt `undefined` | Der Ausdruck ist ein Funktionskörper | Explizites `return` setzen |
| Safari zeigt eine Zertifikatswarnung | Über die IP verbunden statt über den Hostnamen | `$devHost` verwenden |
| Verbindung läuft ins Leere | Service lauscht nur auf `localhost` | An die LAN-Schnittstelle binden (Vite: `server.host: true`) |
| Dev-Server antwortet mit „Blocked request" | Host-Header-Prüfung | Fremde Hostnamen freigeben (Vite: `server.allowedHosts`) |

Fehlgeschlagene Requests zählt man am schnellsten mit
`list_network_requests` und `{"filter": {"status_min": 400}}`.

## Fallback ohne MCP-Server

`scripts/mcp_safari.py` in diesem Skill-Verzeichnis spricht denselben Server direkt
über SSH an. Den Mac holt es sich selbst aus `~/.testing-on-mac-safari.conf`;
`--host` oder `MAC_HOST` überschreiben das, falls nötig. Jedes weitere Argument ist ein
JSON-RPC-Request; `{"method":"__sleep","params":{"s":5}}` pausiert dazwischen. **Ein
Prozesslauf ist eine Browser-Session** — das ganze Szenario gehört deshalb in einen Aufruf,
sonst ist der Tab beim nächsten Aufruf bereits geschlossen.

```bash
python3 <skill-verzeichnis>/scripts/mcp_safari.py \
  '{"method":"tools/call","params":{"name":"create_tab","arguments":{"url":"about:blank"}}}' \
  '{"method":"tools/call","params":{"name":"navigate_to_url","arguments":{"url":"https://$devHost:5173/"}}}' \
  '{"method":"tools/call","params":{"name":"browser_console_messages","arguments":{}}}' \
  '{"method":"tools/call","params":{"name":"list_network_requests","arguments":{}}}' \
  '{"method":"tools/call","params":{"name":"navigate_to_url","arguments":{"url":"https://$devHost:5173/?v=2"}}}' \
  '{"method":"__sleep","params":{"s":8}}' \
  '{"method":"tools/call","params":{"name":"evaluate_javascript","arguments":{"expression":"return document.getElementById(\"root\").children.length"}}}' \
  '{"method":"tools/call","params":{"name":"browser_console_messages","arguments":{"limit":50,"level_filter":["error"]}}}'
```

Der Port im Beispiel ist projektspezifisch, nicht allgemeingültig.

## Registrierung des MCP-Servers

Einmalig, im User-Scope, damit er in jedem Projekt verfügbar ist:

```bash
claude mcp add safari-$macHost --scope user -- ssh $macHost '"/Applications/Safari Technology Preview.app/Contents/MacOS/safaridriver" --mcp'
```

`claude mcp list` zeigt den Gesundheitszustand. Fehlt der Server in einer Hauptsession,
ist die Registrierung verlorengegangen und dieser Befehl setzt sie neu.
