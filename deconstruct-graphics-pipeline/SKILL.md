---
name: deconstruct-graphics-pipeline
description: Use when the user supplies reference images, screenshots, renders, video stills or URLs of graphics and wants to know how that look was produced or how to rebuild it — "wie ist das gemacht", "wie kriege ich den Look hin", "bau mir das nach", "welche Shader sind das", "analysier mal die Grafik", "was ist das für ein Rendering", "deconstruct this render", "reverse engineer this visual", "how would I do this in three.js". Covers render passes, geometry and instancing, materials, textures, lighting, shadows, post-processing and NPR looks; the target platform is always the browser with WebGPU and three.js. Output contract, the only fixed promise — a single `./graphics-pipeline-analysis.md`.
---

# Deconstruct Graphics Pipeline

Ein Bild kommt herein, eine Bauanleitung geht hinaus. Der Skill zerlegt einen gegebenen Look in die Pipeline, die ihn erzeugt hat, und übersetzt das Ergebnis auf eine feste Zielplattform: Browser, WebGPU, three.js. Einziger fester Vertrag ist der Output — eine `./graphics-pipeline-analysis.md`.

## Kernprinzip: Beleg vor Behauptung

Ein guter Render verführt dazu, Technik zu raten, die kompetent klingt. Dagegen steht eine Regel, und sie gilt für jede Zeile des Reports:

> **Jeder Befund nennt das Indiz, an dem er hängt.**

Kein Indiz, kein Befund. Erklären zwei Techniken dasselbe Indiz, stehen beide da — zusammen mit dem Satz, der die Frage entscheiden würde: »Zeigt die Reflexion ein Objekt außerhalb des Bildausschnitts, kann es kein SSR sein.« Der Wert dieser Analyse liegt nicht in der Länge der Technik-Liste, sondern darin, dass der Leser jede Behauptung nachprüfen kann.

Drei Konfidenzstufen, sichtbar im Report:

| Stufe | Bedeutung |
| --- | --- |
| **belegt** | Im Bild eindeutig sichtbar, oder aus Quelltext bzw. Netzwerk-Traffic einer Live-Seite gelesen |
| **wahrscheinlich** | Das Indiz trägt den Schluss, eine Alternative ist nicht ausgeschlossen |
| **vermutet** | Plausibel und branchenüblich, ohne direktes Indiz im Material |

Der Anteil `vermutet` ist ein Qualitätsmaß, kein Makel: eine Analyse mit drei belegten und zwei vermuteten Befunden ist mehr wert als eine mit zwanzig unmarkierten.

## Sprache der Ausgabe

Report und Chat laufen in der Sprache des Users. Die Fachsprache läuft nicht mit.

**Fachbegriffe bleiben in ihrer gebräuchlichen Form, fast immer englisch.** Nicht übersetzt, nicht eingedeutscht, nicht in Anführungszeichen entschuldigt: `screen-space ambient occlusion`, `tone mapping`, `roughness`, `normal map`, `deferred shading`, `instancing`, `mipmap`, `subsurface scattering`, `bloom`, `clearcoat`, `depth of field`. Wer »Bildschirmraum-Umgebungsverdeckung« oder »Glanzstärke« schreibt, macht den Report unbrauchbar für genau die Person, die ihn umsetzen soll — sie findet den Begriff in keiner Dokumentation wieder.

Der Satz drumherum ist deutsch (oder was der User spricht), der Begriff darin bleibt Terminus. »Die Kontaktschatten kommen aus einem SSAO-Pass, nicht aus baked AO.« So.

## Ablauf-Übersicht

1. Material beschaffen und sichten (0).
2. Klassifikation — was für ein Bild ist das überhaupt (1). Steuert alles Folgende.
3. Analyse in sechs Layern, Befunde sammeln (2).
4. Machbarkeit gegen das Browser-Budget (3).
5. Rekonstruktion: Mapping auf three.js + WebGPU (4).
6. Report schreiben, PoC anhängen, übergeben (5).

Die Referenzdateien werden gelesen, wenn ihr Schritt dran ist — nicht vorab:

| Datei | Wann lesen |
| --- | --- |
| `references/live-page-recon.md` | Schritt 0 — nur wenn die Referenz eine aufrufbare Seite ist |
| `references/observation-cues.md` | Schritt 2 — immer, vor der Analyse |
| `references/threejs-webgpu-map.md` | Schritt 4 — immer, vor der Roadmap |
| `references/dcc-pipeline.md` | Schritt 4 — nur wenn modellierte Assets im Bild sind |
| `references/report-template.md` | Schritt 5 — vor dem Schreiben |

## Workflow

### 0. Material beschaffen und sichten

Das Bild muss **wirklich angesehen** werden. Ein Dateiname, eine URL oder eine Beschreibung des Users sind kein Material.

| Was der User liefert | Was zu tun ist |
| --- | --- |
| Bild im Chat angehängt | Liegt vor. Direkt weiter. |
| Lokaler Pfad | Mit dem Read-Tool öffnen (es zeigt Bilder visuell). |
| Direkte Bild-URL | Ins Scratchpad laden (`curl -L -o`), dann mit Read öffnen. WebFetch liefert Text, kein Bild. |
| Video oder GIF | Keyframes ziehen (`ffmpeg -i in.mp4 -vf "fps=1/2,scale=1280:-1" out_%03d.png`), 3–6 Frames ansehen. Bewegung schaltet den Layer `temporal` frei. |
| URL einer aufrufbaren Seite | **`references/live-page-recon.md` lesen.** Dort steht, wie aus Screenshot, DOM, Netzwerk-Traffic und Bundle harte Belege statt Vermutungen werden. |
| Nur eine Beschreibung, kein Bild | Nachfragen. Ohne Material gibt es keine Dekonstruktion, und eine erfundene ist schlimmer als keine. |

Bei mehreren Referenzen: **erst alle ansehen, dann klassifizieren.** Zeigen sie unterschiedliche Looks, ist das eine Design-Frage an den User (»welcher davon ist der Zielzustand, oder soll ich den gemeinsamen Nenner beschreiben?«), keine, die man stillschweigend entscheidet.

Heruntergeladene Bilder bleiben im Scratchpad. Ins Projektverzeichnis wandern sie nur auf Ansage; der Report notiert stattdessen die Herkunft.

**Auflösung zählt.** Ein 400px-Thumbnail trägt keine Aussage über texel density, mip transitions oder das Rauschmuster eines Denoisers. Ist das Material zu klein für eine Ebene, wird das im Report unter »Offene Fragen« festgehalten, statt die Ebene zu erfinden.

### 1. Klassifikation

Die erste Frage entscheidet, welche Layer überhaupt Sinn ergeben. Sie wird beantwortet, bevor irgendein Detail analysiert wird.

| Klasse | Woran erkennbar | Konsequenz |
| --- | --- | --- |
| **Realtime-3D** (Game, Demo, Engine-Viewport) | Shadow-Map-Artefakte, SSR bricht am Bildrand ab, TAA-Ghosting, LOD-Pops, sichtbare Cards für Vegetation | Der Standardfall. Alle sechs Layer, Roadmap ist eine Portierung. |
| **Offline-Render** (Cycles, Octane, Redshift, Arnold, V-Ray) | Farbbluten in Nischen, Kaustiken durch Glas, Reflexionen zeigen Objekte außerhalb des Bildes, Denoiser-Textur in dunklen Flächen, absolut saubere Schattenverläufe | Alle Layer, aber Schritt 3 wird der wichtigste: das meiste muss gefaked werden, und der Report muss sagen, wie nah man kommt. |
| **Fullscreen-Shader** (Raymarching, SDF, generativ, Shadertoy-Look) | Keine erkennbaren Assets, prozedurale Selbstähnlichkeit, unendliche Wiederholung, perfekt analytische Formen, oft eine einzige Lichtquelle | Layer `geometry` und die Asset-Pipeline entfallen. Stattdessen: distance functions, domain repetition, noise-Art, marching-Parameter. |
| **2D / Motion / Vector / UI** | Keine perspektivische Tiefe, flache Farbfelder, Vektor-Kanten, Layer-Compositing | Die Pipeline ist Canvas, SVG oder Compositing. three.js kommt hier über orthographische Quads und Fragment-Shader ins Spiel, nicht über Szenen-Rendering. |
| **Foto oder Film** | Sensorrauschen, echte Linsenfehler, organische Unregelmäßigkeit, EXIF | **Kein Render.** Das gehört zuerst gesagt. Danach als Look-Referenz behandeln: Optik, Grading, Tiefenschärfe sind reproduzierbar, der Inhalt nicht. |
| **Composite / Mixed Media** | Auflösungs- oder Grain-Bruch zwischen Bildbereichen, inkonsistente Lichtrichtung | Pro Ebene klassifizieren und das im Report trennen. |

Die Klasse steht in Abschnitt 0 des Reports. Bei Unsicherheit zwischen zwei Klassen: beide nennen, das entscheidende Indiz benennen, weiterarbeiten mit der wahrscheinlicheren.

### 2. Analyse in sechs Layern

**Zuerst `references/observation-cues.md` lesen.** Das ist der Katalog: welches sichtbare Indiz auf welche Technik zeigt, und womit es sich verwechseln lässt. Ohne ihn wird die Analyse zu einer Liste von Begriffen, die man auch ohne Bild hätte aufschreiben können.

Die Layer, in dieser Reihenfolge:

1. **`composition`** — Render-Topologie: forward, deferred oder forward+, Anzahl und Zweck der Passes, Auflösung und Bit-Tiefe der Targets, HDR-Kette, transparente Objekte und ihre Sortierung.
2. **`geometry`** — Poly-Dichte und Silhouettenqualität, flat vs. smooth shading, Instancing-Kandidaten, Billboards und Cards, Displacement gegen Normal-Mapping, Partikel, Splines, Text.
3. **`material`** — PBR-Workflow und seine Kanäle, roughness- und metalness-Verteilung, transmission, clearcoat, sheen, anisotropy, SSS, emissive; Texturherkunft: bitmap, prozedural, triplanar, baked.
4. **`lighting`** — Zahl und Charakter der Lichtquellen, Schattenweichheit und ihre Ursache, ambient und indirect, IBL gegen konstantes Ambient, AO, was baked ist und was dynamisch.
5. **`post`** — die Kette nach dem Beauty-Pass, in Ausführungsreihenfolge: AO-Composite, SSR, DOF, motion blur, bloom, tone mapping, color grading, chromatic aberration, vignette, grain, Anti-Aliasing.
6. **`temporal`** — nur bei bewegtem Material: TAA-Ghosting, Akkumulations-Rauschen, Vertex-Animation, Partikel-Lebensdauer, framerate-abhängiges Stepping.

Jeder Befund ist ein Datensatz. Erst alle sammeln, dann Schritt 3 — nicht parallel schon den Report schreiben.

| Feld | Wert |
| --- | --- |
| `layer` | `composition` \| `geometry` \| `material` \| `lighting` \| `post` \| `temporal` |
| `observation` | Was im Bild zu sehen ist, mit Ortsangabe (»der Zylinder links oben«, »die Kante zwischen Boden und Wand«). Die Technik steht hier **nicht** drin. |
| `conclusion` | Welche Technik das erklärt |
| `confidence` | `belegt` \| `wahrscheinlich` \| `vermutet` |
| `alternatives` | Was dasselbe Indiz sonst erzeugt, plus der Test, der die Fälle trennt |
| `impact` | `look-defining` \| `supporting` \| `detail` — wie viel vom Gesamteindruck daran hängt |
| `webFeasibility` | wird in Schritt 3 gesetzt |
| `effort` | `S` \| `M` \| `L` — wird in Schritt 4 gesetzt |

**`observation` und `conclusion` dürfen nicht denselben Satz enthalten.** »SSAO in den Ecken« ist keine Beobachtung, sondern eine Schlussfolgerung ohne Beleg. »Die Innenkanten des Regals dunkeln über etwa 20 Pixel ab, unabhängig von der Lichtrichtung« ist eine.

`impact` ist die wichtigste Spalte für den User. Ein Look besteht meist aus zwei bis vier Entscheidungen, die ihn tragen, und einem Dutzend Details. Ohne diese Trennung liest sich der Report wie eine Einkaufsliste.

### 3. Machbarkeit gegen das Browser-Budget

Jetzt bekommt jeder Befund seine `webFeasibility`. Zielplattform ist immer der Browser mit WebGPU und three.js — nicht »eine Engine«, nicht »Unreal-artig«.

| Wert | Bedeutung |
| --- | --- |
| `nativ` | three.js kann das out of the box, meist über Material-Parameter oder eine Renderer-Einstellung |
| `addon` | Es gibt ein Addon oder einen TSL-Node dafür (`three/addons/tsl/display/*` und Verwandte) |
| `custom` | Eigener Shader-Code, eigener Pass oder ein Compute-Shader |
| `fake` | Das Original ist im Browser nicht erreichbar, es gibt aber eine Annäherung, die im Standbild überzeugt |
| `unerreichbar` | Weder direkt noch als Fake in vertretbarem Budget |

Was regelmäßig auf `fake` oder `unerreichbar` fällt: path-traced global illumination mit mehreren Bounces, echte Kaustiken, spektrale Dispersion, Volumenstreuung in dichten Medien, Millionen-Poly-Assets ohne Nanite-Äquivalent, physikalisch korrekte area lights mit weichen Schatten in Echtzeit.

**Die ehrliche Ansage gehört in den Report, nicht ins Kleingedruckte.** Wenn der Referenz-Look aus einem 40-Minuten-Cycles-Render stammt, ist »das bauen wir nach« falsch und »so kommst du auf 85 % bei 60 fps, und diese 15 % fehlen dir« richtig. Der Satz, der dabei nie fehlen darf: was genau der User sieht, wenn er den Unterschied sucht.

### 4. Rekonstruktion: Mapping auf three.js + WebGPU

**Zuerst `references/threejs-webgpu-map.md` lesen.** Dort steht, welche Technik auf welche API abgebildet wird — Node-Materials und TSL, Post-Processing-Nodes, Compute, Instancing, Texturformate — samt der Stellen, an denen die WebGPU-Kette sich anders verhält als der alte WebGL-Weg.

**Zeigt das Bild modellierte Assets** (Klasse Realtime-3D oder Offline-Render, und es sind erkennbar gebaute Objekte zu sehen, keine reine Prozedural-Grafik), **zusätzlich `references/dcc-pipeline.md` lesen.** Dort steht die Trennlinie: was ein glTF/GLB nativ transportiert und was zwingend Code werden muss. Bei Fullscreen-Shadern, generativer 2D-Grafik oder reinen Post-Effekten wird diese Datei nicht gelesen und der entsprechende Report-Abschnitt entfällt.

Anschließend jedem Befund ein `effort` geben (`S` = Parameter setzen oder ein Node einhängen, `M` = ein eigener Pass oder ein Material-Umbau, `L` = eigenes Subsystem) und die Roadmap **nach Wirkung sortieren, nicht nach Pipeline-Reihenfolge**:

1. `look-defining` mit `S` oder `M` — das ist der Sprung, der aus »irgendeine 3D-Szene« den Ziel-Look macht
2. `look-defining` mit `L`
3. `supporting`, aufsteigend nach Aufwand
4. `detail` — der Feinschliff, ausdrücklich als optional markiert

Diese Reihenfolge ist der eigentliche Ertrag der Analyse. Sie sagt dem User, womit er anfängt.

Dazu die Performance-Ebene, konkret für diese Szene: Draw-Call-Reduktion, Texturbudget und Kompressionsformat, Auflösung der Post-Targets, was auf Mobile zuerst bricht.

### 5. Report schreiben, PoC anhängen, übergeben

**Zuerst `references/report-template.md` lesen.** Dort steht die Abschnittsstruktur und was in jeden Abschnitt gehört.

**Pfad:** `./graphics-pipeline-analysis.md` im aktuellen Arbeitsverzeichnis.

**Überschreiben:** Existiert die Datei bereits, deren Abschnitt 0 lesen. Beschreibt sie dieselbe Referenz, wird sie überschrieben — der neue Lauf ist die bessere Analyse. Beschreibt sie eine andere Referenz, entsteht daneben eine `./graphics-pipeline-analysis-<slug>.md` mit einem kurzen Slug aus dem neuen Motiv. Eine fremde Analyse wird nie stillschweigend zerstört.

**Proof of Concept:** Der Report endet mit lauffähigem Kernstück-Code — in aller Regel der Material-Block in TSL und die Post-Processing-Kette, also genau die Teile, die den Look tragen. Kompakt, kommentiert, kopierfertig. Ein vollständiges Scaffold (Renderer, Kamera, Loop, Loader) wird **nur auf Nachfrage** gebaut, dann als eigene Datei; im Report steht ein Satz, dass es auf Wunsch dazukommt.

**Im Chat** stehen danach: die Klasse, die zwei bis vier `look-defining`-Befunde im Klartext, die ehrliche Machbarkeitsansage und der Pfad zur Datei. Nicht der ganze Report — der steht ja in der Datei.

## Häufige Fehlschlüsse

| Verlockung | Realität |
| --- | --- |
| »Sieht nach SSR aus« | Reflexionen, die Objekte außerhalb des Bildausschnitts zeigen, sind kein SSR. Erst den Test aus dem Cue-Katalog machen, dann behaupten. |
| Technik-Namedropping ohne Beleg | Jeder Befund braucht seine `observation`. Findet sich keine, fällt der Befund raus oder wandert nach `vermutet`. |
| Alles ist ein Custom-Shader | Sehr viel davon ist ein `MeshPhysicalNodeMaterial` mit richtig gesetzten Parametern plus zwei Post-Nodes. Erst prüfen, was das Standard-Material schon kann, dann eigenen Code schreiben. |
| Den Offline-Render 1:1 versprechen | GI mit mehreren Bounces, Kaustiken und echte Dispersion sind im Budget nicht drin. Die Roadmap nennt den Fake und die Lücke, nicht das Original. |
| Fachbegriffe eindeutschen | »Bildschirmraum-Umgebungsverdeckung« ist in keiner Dokumentation auffindbar. Siehe »Sprache der Ausgabe«. |
| Aus dem Thumbnail auf texel density schließen | Was die Auflösung nicht hergibt, steht unter »Offene Fragen«. |
| Die Pipeline-Reihenfolge als Roadmap ausgeben | Der User will wissen, womit er anfängt, nicht in welcher Reihenfolge die GPU arbeitet. Sortiert wird nach `impact` × `effort`. |
| Bei einem Foto trotzdem Render-Passes beschreiben | Erst klassifizieren. Ein Foto hat keinen G-Buffer. |
