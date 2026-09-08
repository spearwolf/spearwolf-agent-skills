# Host: Claude-App (Web und Desktop)

Nachschlagewerk für Schritt 0, **nur wenn der Skill in der Claude-App läuft** — erkennbar daran, dass der Skill per Upload installiert wurde und in der Sandbox unter einem `/mnt/…`-Pfad liegt, Bilder als Anhang der Nachricht ankommen und es kein Projektverzeichnis gibt, in das eine Datei geschrieben werden könnte. In Claude Code und anderen Terminal-Hosts wird diese Datei nicht gelesen.

Der Workflow bleibt derselbe. Was sich ändert, ist die Mechanik in vier Schritten: wie Material hereinkommt (0), wie der Report hinausgeht (4), wie die Frage gestellt wird (4) und wie Teil II angehängt wird (5).

## Grundregel: Was das Modell sieht und was nicht

**Ein Bild im Chat ist sichtbar. Ein Bild als Datei in der Sandbox ist es nicht.** Zieht der User ein Bild in den Prompt, liegt es vor und wird direkt analysiert. Lädt die Sandbox ein Bild herunter oder erzeugt eines (`curl`, `ffmpeg`), entsteht nur eine Datei — und es gibt in der Sandbox kein Werkzeug, das dem Modell eine Datei als Bild zeigt. Der Weg zurück führt über den User: die Datei in das Ausgabeverzeichnis legen, das der Host in seinen Anweisungen nennt, und ihn bitten, sie in den Chat zu ziehen.

Daraus folgt die Materialtabelle für diesen Host, sie ersetzt die aus Schritt 0:

| Was der User liefert | Was zu tun ist |
| --- | --- |
| Bild per Drag-and-drop im Prompt | Liegt vor. Direkt weiter. Mehrere Bilder in einer Nachricht sind der Normalfall — erst alle ansehen, dann klassifizieren. |
| Bild als Datei-Upload, das nicht im Chat angezeigt wird (etwa in einem Zip oder als exotisches Format) | Mit der Sandbox nach PNG oder JPEG wandeln, ins Ausgabeverzeichnis legen, den User bitten, es in den Chat zu ziehen. |
| Direkte Bild-URL | Hat die Sandbox Netzzugriff (`curl -sI <url>` antwortet), die Datei laden, ins Ausgabeverzeichnis legen und um den Anhang bitten. Sonst direkt um den Anhang bitten. Ein Fetch-Werkzeug liefert Text, kein Bild. |
| Video oder GIF als Upload | Ist `ffmpeg` da (`command -v ffmpeg`), 3–6 Keyframes ziehen, ins Ausgabeverzeichnis legen, den User bitten, sie in den Chat zu ziehen. Ohne `ffmpeg`: um 3–6 Einzelbilder aus verschiedenen Momenten bitten. Bewegung schaltet den Layer `temporal` frei. |
| URL einer aufrufbaren Seite | Kein Browser-Werkzeug in diesem Host: keine Screenshots, kein DOM, kein Netzwerk-Traffic. Den User um zwei bis drei Screenshots bitten. Hat die Sandbox Netzzugriff, zusätzlich `references/live-page-recon.md` lesen und den Abschnitt »Shader-Quelltext« auf das per `curl` geladene HTML und die Bundles anwenden — das ist der eine Weg zu `belegt`, der hier offensteht. Die Konsolen-Snippets aus derselben Datei kann der User selbst ausführen und die Ausgabe einfügen. |
| Nur eine Beschreibung, kein Bild | Nachfragen. Wie überall. |

Wo Uploads liegen und wohin Ausgaben gehören, sagt der Host in seinen eigenen Anweisungen. Diese Pfade gelten; bei Zweifel `ls` statt raten. Heruntergeladenes und Zwischenprodukte bleiben im Arbeitsverzeichnis der Sandbox und wandern nur dann ins Ausgabeverzeichnis, wenn der User sie sehen soll.

## Der Report geht als Datei hinaus

Es gibt kein `./`. Der Report wird als `graphics-pipeline-analysis.md` ins Ausgabeverzeichnis des Hosts geschrieben und dem User dadurch als Download angeboten. Der Chat nennt den Dateinamen, nicht einen Pfad — der Pfad der Sandbox sagt dem User nichts.

**Überschreiben entfällt.** Jede Konversation beginnt mit leerer Sandbox; es gibt keine fremde Analyse, die zerstört werden könnte. Liefert der User einen früheren Report als Upload mit, gilt die Regel aus Schritt 4: Abschnitt 0 lesen, dieselbe Referenz heißt ersetzen, eine andere heißt `graphics-pipeline-analysis-<slug>.md` daneben.

Kann die Sandbox keine Datei ausliefern (Code-Ausführung deaktiviert), steht der Report vollständig in der Nachricht, in derselben Struktur, und der Chat sagt, warum.

## Die Frage ist das Ende der Nachricht

Es gibt kein Rückfrage-Werkzeug. Die Frage aus Schritt 4 — Rekonstruktion ja oder nein, mit der Empfehlung daneben — ist der letzte Absatz der Nachricht, und die Nachricht endet damit. Kein »ich fange schon mal an«, kein Teil II im selben Zug. Die Antwort kommt in der nächsten Nachricht des Users, oder sie kommt nicht.

## Teil II wird als neue Datei ausgeliefert

Auf ein Ja: Teil II an die Datei in der Sandbox anhängen und die vollständige Datei erneut ins Ausgabeverzeichnis legen — der User bekommt eine Datei, die Teil I und Teil II enthält, nicht zwei Hälften. Ist die Sandbox inzwischen zurückgesetzt und die Datei weg, wird Teil I aus dem Chatverlauf neu geschrieben, unverändert, und Teil II dahinter.

Kommt das Ja in einer **neuen Konversation**, muss der User den Report als Upload mitbringen; ohne ihn beginnt der Lauf bei Schritt 0.

## Der PoC kennt keine installierte three-Version

In der Sandbox liegt kein Projekt. Die Import-Pfade und Node-Namen im Proof of Concept lassen sich nicht gegen `node_modules` prüfen. Hat der User seine three-Version genannt, gilt sie; sonst steht im Report der Satz, dass die Namen gegen die installierte Version zu prüfen sind, und der Chat fragt nach der Version — im selben Atemzug wie nach der Rekonstruktion, nicht als eigene Runde.
