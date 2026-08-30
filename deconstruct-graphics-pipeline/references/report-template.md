# Report-Struktur

Nachschlagewerk für Schritt 5. Definiert Abschnitte und Inhalt der `./graphics-pipeline-analysis.md`.

Die Überschriften stehen hier deutsch, weil das die Arbeitssprache des Repos ist. Im Report laufen sie in der Sprache des Users — die Fachbegriffe darin bleiben unverändert stehen, nach der Sprachregel aus dem SKILL.

## Haltung

Der Report ist eine **Bauanleitung mit Beweisführung**, kein Aufsatz über Computergrafik. Wer ihn liest, hat das Bild vor Augen und will wissen, was er bauen muss.

- Zwei bis vier Entscheidungen tragen jeden Look. Die stehen vorn, ausgeschrieben, ohne Tabelle drumherum.
- Der Rest gehört in Tabellen. Beobachtung links, Schluss rechts, Konfidenz sichtbar.
- Keine Erklärung von Grundlagen. Was ein normal map ist, weiß der Leser; was in *diesem* Bild darauf hindeutet, weiß er nicht.
- Länge folgt dem Material. Ein flat-shaded low-poly-Render braucht keine zwölf Seiten, nur weil das Template Platz dafür hat. Leere Abschnitte werden gestrichen, nicht mit Füllsätzen bedient.

## Kopf

```markdown
# Graphics Pipeline Deconstruction — <Motiv in drei bis fünf Worten>

| | |
| --- | --- |
| **Referenz** | <Dateiname, URL oder Beschreibung; bei mehreren: alle> |
| **Klasse** | <aus Schritt 1> |
| **Ziel** | Browser · WebGPU · three.js <Version, falls im Projekt bekannt> |
| **Analysiert** | <YYYY-MM-DD> |
```

## 0. Kurzurteil

Drei bis sechs Sätze in Prosa. Was für ein Look ist das, in Worten, die jemand ohne das Bild versteht. Danach die **look-defining decisions** als kurze Liste — die zwei bis vier Entscheidungen, ohne die der Look nicht dieser Look wäre.

Direkt darunter, in einem Satz, die ehrliche Machbarkeitsansage aus Schritt 3: wie nah man im Browser kommt und was fehlt. Nicht ans Ende verstecken. Wer nur diesen Abschnitt liest, muss wissen, worauf er sich einlässt.

Bei einer Live-Seite gehört hierher, was **ausgelesen** statt geschlossen wurde — das ist die Aussage, die den Rest des Reports trägt.

## 1–5. Die Layer

Ein Abschnitt je Layer aus Schritt 2, in dieser Reihenfolge: Komposition & Render-Passes, Geometry & Instancing, Materials & Textures, Lighting & Shadows, Post-Processing Stack. Layer `temporal` bekommt einen sechsten Abschnitt, wenn bewegtes Material vorlag — sonst nicht.

Jeder Abschnitt: ein bis drei Sätze Einordnung, dann die Befundtabelle.

```markdown
| Beobachtung | Schluss | Konfidenz | Alternative & Test | Wirkung |
| --- | --- | --- | --- | --- |
| Die Innenkanten des Regals dunkeln über ~20 px ab, unabhängig von der Lichtrichtung | Ambient occlusion | belegt | Baked AO oder SSAO — trennbar nur mit bewegter Kamera | supporting |
| Reflexion im Boden zeigt die Deckenleuchte, die im Bildausschnitt fehlt | Env map oder planar reflection, **kein SSR** | belegt | — | look-defining |
```

Regeln für die Tabelle:

- **Die Spalte »Beobachtung« enthält keine Technik.** Steht dort ein Fachbegriff, ist es keine Beobachtung, sondern eine vorweggenommene Schlussfolgerung — und der Beleg fehlt.
- Jede Beobachtung ist im Bild **lokalisiert**. »Der Zylinder links oben«, »die Kante zwischen Boden und Wand«, »der obere Bildrand«. Ohne Ort kann der Leser nicht nachsehen.
- `vermutet`-Zeilen sind erlaubt und nützlich, solange sie so markiert sind. Unmarkiert sind sie das Schlimmste, was in diesem Report stehen kann.
- Steht in »Alternative & Test« ein Test, der mit dem vorliegenden Material nicht durchführbar ist, gehört die Frage zusätzlich in Abschnitt 9.

Die Post-Kette bekommt zusätzlich ihre **Reihenfolge** — nummeriert, so wie sie im Frame ausgeführt wird. Das ist der Teil, den man beim Nachbauen am häufigsten falsch macht.

## 6. Asset-Pipeline

**Nur wenn modellierte Assets im Bild sind.** Die Drei-Spalten-Matrix aus `dcc-pipeline.md`: Element im Bild, was aus dem `.glb` kommt, was Code werden muss. Konkret pro Element dieser Szene, nicht als allgemeine Fähigkeitsliste des Formats.

Darunter, falls einschlägig, die Backing-Empfehlung: was sich in dieser Szene zu backen lohnt und was dynamisch bleiben muss.

Entfällt bei Fullscreen-Shadern, generativer Grafik und reinen Post-Analysen — ersatzlos, ohne Platzhalterabsatz.

## 7. Roadmap

Der Abschnitt, wegen dem der Report geschrieben wurde. **Sortiert nach Wirkung, nicht nach Pipeline-Reihenfolge.**

```markdown
| # | Schritt | Wirkung | Aufwand | Machbarkeit | Womit |
| --- | --- | --- | --- | --- | --- |
| 1 | ACES tone mapping + HDR-Lichtwerte über 1.0 | look-defining | S | nativ | `renderer.toneMapping`, `light.intensity` |
| 2 | Bloom auf einen emissive-MRT-Kanal | look-defining | M | addon | `bloom()` auf `pass.getTextureNode('emissive')` |
```

Danach zwei Blöcke in Prosa:

**Was nicht 1:1 geht.** Pro `fake`- und `unerreichbar`-Befund: was das Original tut, was die Annäherung tut, und **woran der User den Unterschied sehen wird**. Der letzte Teil ist der wichtigste und wird am häufigsten weggelassen.

**Performance-Leitplanken für diese Szene.** Draw Calls, Texturbudget, Auflösung der Post-Targets, was auf Mobile zuerst bricht. Konkret für dieses Motiv — allgemeine Optimierungsratschläge sind hier wertlos.

## 8. Proof of Concept

Lauffähiger Kern, nicht die ganze App: in aller Regel der Material-Block in TSL und die Post-Kette. Also genau die Teile, die den Look tragen.

- Kommentiert, kopierfertig, mit den Parameterwerten, die aus der Analyse folgen.
- Import-Pfade und Node-Namen gegen die installierte three-Version geprüft. Ist keine installiert, steht ein Satz dabei, dass die Namen zu prüfen sind.
- Ein Satz am Ende: ein vollständiges Scaffold mit Renderer, Kamera, Loop und Loadern gibt es auf Zuruf.

## 9. Offene Fragen

Was das Material nicht hergibt, plus was der User beantworten könnte. Zwei Sorten, und beide gehören hierher:

- **Prinzipiell nicht entscheidbar** aus einem Standbild — forward gegen deferred ohne Transparenzen, baked gegen dynamisch ohne Bewegung, die Liste aus dem Cue-Katalog.
- **Entscheidbar mit mehr Material** — »ein zweiter Frame mit bewegter Kamera würde SSR gegen env map trennen«, »die Originalauflösung würde die texel-density-Frage beantworten«.

Ein leerer Abschnitt 9 ist ein Warnsignal, keine Bestleistung. Ein Standbild lässt immer Fragen offen; steht hier nichts, wurde geraten statt geprüft.
