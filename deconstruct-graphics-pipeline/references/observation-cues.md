# Cue-Katalog: vom Indiz zur Technik

Nachschlagewerk für Schritt 2. Jede Zeile ist ein **sichtbares Indiz**, seine wahrscheinlichste Erklärung und der Verwechslungsfall. Die dritte Spalte ist die wichtigste — sie verhindert die Behauptung, die gut klingt und falsch ist.

Nicht linear lesen. Anschauen, was im Bild auffällt, dann die passende Tabelle aufschlagen.

---

## A. Die Vorentscheidung: realtime oder offline?

Diese Frage zuerst, sie färbt jede folgende Antwort.

| Indiz | Schluss | Verwechslungsgefahr |
| --- | --- | --- |
| Reflexion zeigt ein Objekt, das im Bildausschnitt nicht vorkommt | Kein SSR. Also cubemap/env map, planar reflection oder ray tracing | Ein sehr großzügiges env-map-Fallback hinter SSR sieht ähnlich aus — dann aber unscharf und ortsunabhängig |
| Reflexion bricht am Bildrand ab oder zieht Schlieren nach unten | SSR, damit realtime | Motion blur in einer nassen Fläche kann ähnlich streifen |
| Farbe blutet aus einer roten Wand auf den weißen Boden daneben | Indirect lighting mit mindestens einem bounce: path tracing, lightmap oder eine GI-Probe-Lösung | Ein Künstler setzt sowas gern per Hand mit einem farbigen fill light |
| Feines, körniges Rauschen in dunklen Flächen, teils bunte Einzelpixel | Path-tracing-Sampling, Fireflies, Denoiser am Limit | Film grain aus dem Grading — der sitzt aber gleichmäßig über dem ganzen Bild, auch in hellen Flächen |
| Lichtmuster auf dem Boden unter einem Glasobjekt | Kaustiken, praktisch immer offline | Eine projizierte Textur (»cookie«/gobo) macht dasselbe für ein Zehntel der Kosten |
| Schattenkante wird mit wachsendem Abstand zum Objekt weicher | Area light mit korrekter Penumbra: offline, oder PCSS/ray-traced shadows | Ein zweiter, weicher fill-Schatten kann das vortäuschen |
| Schattenkante überall gleich weich, unabhängig vom Abstand | Shadow map mit fixem PCF-Radius. Realtime-Signatur | — |
| Treppen an Schattenkanten, Schatten löst sich vom Objektfuß, gestreifte Selbstverschattung | Shadow map: zu niedrige Auflösung, Peter-Panning, shadow acne. Eindeutig realtime | — |
| Schatten enden abrupt in einer Entfernung, dahinter ist alles gleich hell | Shadow-Cascade-Ende oder shadow camera far. Realtime | Fog kann eine ähnliche Kante erzeugen |
| Absolut sauberer, breiter Farbverlauf ohne Banding | Hohe Bit-Tiefe, meist offline | Ein guter dither/noise-Pass erreicht das auch in 8 Bit |
| Sichtbare Cards für Blätter oder Gras, Alpha-Kanten an gleicher Stelle wiederholt | Realtime-Vegetation | — |

---

## B. Composition & Render-Passes

| Indiz | Schluss | Verwechslungsgefahr |
| --- | --- | --- |
| Sehr viele Lichter mit sichtbaren Einzelschatten, ohne Performance-Kompromisse im Look | Deferred oder clustered/forward+ | Gebackenes Licht sieht identisch aus und kostet nichts |
| Transparente Objekte werden von SSAO oder DOF falsch behandelt (kein AO auf Glas, Glas rechnet in falscher Tiefe) | Deferred oder ein depth-basierter Pass ohne Transparenz-Handling. Klassische G-Buffer-Signatur | — |
| Harte Kante zwischen scharfem und unscharfem Bereich quer durch ein Objekt | Depth-basiertes DOF ohne saubere Randbehandlung | — |
| Ein Effekt bleibt an der Bildkante stehen oder wird dort dunkler | Screen-space-Verfahren mit fehlenden Nachbardaten: SSAO, SSR, SSGI | Vignette im Grading |
| Helligkeitsstufen im hellsten Bereich sichtbar, alles darüber flach weiß | LDR-Kette ohne HDR-Zwischenschritt, oder hartes Clamping vor dem tone mapping | Absichtliches »blown out« im Grading |
| Auflösung eines Effekts sichtbar niedriger als das Bild (blockiges AO, treppige Reflexion) | Half- oder quarter-res-Pass mit upsample. Sehr verbreiteter Realtime-Kompromiss | JPEG-Artefakte im Referenzbild — erst prüfen, ob das Indiz nicht aus der Kompression stammt |
| Objekte poppen in der Detailstufe (nur bei Video) | LOD-System ohne dithered transition | — |

---

## C. Geometry

| Indiz | Schluss | Verwechslungsgefahr |
| --- | --- | --- |
| **Silhouette ist glatt, die Oberfläche darin voller Details** | Normal map oder bump map. Der beste Textur-Test überhaupt | Sehr feines echtes Displacement mit hoher Poly-Dichte |
| Silhouette folgt dem Oberflächendetail (Nieten stehen am Rand heraus) | Echtes displacement oder modellierte Geometrie | — |
| Oberflächendetail verschiebt sich bei schrägem Blick gegen die Silhouette, wirft aber keinen Schatten über die Kante | Parallax occlusion mapping | Ein normal map allein verschiebt nichts — das trennt die beiden sauber |
| Facettierte Flächen mit sichtbaren Dreieckskanten, harte Farbsprünge | Flat shading oder split normals, bewusster low-poly-Look | Zu niedrige subdivision bei smooth shading |
| Rundung mit sichtbarem Polygonzug in der Silhouette, aber weichem Shading darin | Smooth shading auf grober Geometrie. Sehr typisch für Realtime-Assets | — |
| Dasselbe Objekt vielfach, nur Position, Rotation, Skalierung und Farbe unterscheiden sich | Instancing-Kandidat, oft schon `InstancedMesh` | Ein Partikelsystem mit mesh-Partikeln |
| Blätter, Gras oder Rauch stehen immer frontal zur Kamera | Billboards/Cards | — |
| Konturlinien gleichmäßig dick, unabhängig von Entfernung und Objektgröße | Post-process edge detection auf depth und normals | — |
| Konturlinien werden mit Entfernung dünner, fehlen an Innenkanten | Inverted-hull-Outline über Backface-Geometrie | Ein modellierter Rand |
| Konturlinien nur an Innenkanten, keine Silhouette | Barycentric- oder curvature-basierter Shader | — |
| Extrem dichte Details ohne Silhouettenverlust bis in die Nahaufnahme | Hochpoly-Asset aus einem Sculpt, offline oder mit virtualisierter Geometrie | Ein sehr gutes displacement mit tessellation |

---

## D. Materials & Textures

### Der Grundlesevorgang

Drei Fragen, an jedem wichtigen Objekt einzeln:

1. **Wie groß und wie scharf ist das Glanzlicht?** Klein und hell = niedrige roughness. Breit und matt = hohe. Über eine Fläche wandernd = roughness map.
2. **Welche Farbe hat die Schattenseite?** Bleibt sie farbig, ist es ein dielectric. Wird sie schwarz oder nimmt die Umgebungsfarbe an, ist es metal — Metall hat keinen diffuse-Anteil.
3. **Was sieht man in der Spiegelung?** Ein HDRI mit erkennbarem Horizont, die Szene selbst, oder nur ein diffuser Farbverlauf? Das entscheidet zwischen IBL, echter Reflexion und konstantem Ambient.

### Tabelle

| Indiz | Schluss | Verwechslungsgefahr |
| --- | --- | --- |
| Zwei Glanzlichter an derselben Stelle: eines breit und farbig, eines eng und weiß | Clearcoat. Autolack-Signatur | Zwei Lichtquellen unterschiedlicher Größe |
| Glanzlicht in eine Richtung gestreckt, folgt einer Faserrichtung | Anisotropy: gebürstetes Metall, Haar, Vinyl | Ein gestrecktes area light |
| Kanten leuchten bei streifendem Blick auf, gleichmäßig auf allen Materialien | Fresnel. Steckt in jedem PBR-Shader, ist noch keine Aussage | Ein künstlerischer rim light term, erkennbar daran, dass er von der Lichtrichtung unabhängig ist |
| Licht scheint durch dünne Partien und färbt sich rötlich (Ohren, Blätter, Wachs) | Subsurface scattering, oft als billige thickness-basierte Näherung | Ein backlight durch teiltransparentes Material |
| Hintergrund hinter Glas ist versetzt, Versatz wächst mit der Glasdicke | Refraction mit IOR, three.js: `transmission` + `thickness` | Ein einfaches distortion-post auf einer Maske |
| Farbe im Glas wird zur Mitte hin dichter | Beer-Lambert-Absorption über `attenuationDistance` | Ein Farbverlauf in der baseColor |
| Farbsaum am Rand transparenter Objekte, rot und blau getrennt | Dispersion. Offline oder als bewusster Fake über drei versetzte Samples | Chromatic aberration aus dem Post — die sitzt aber radial über dem ganzen Bild, nicht nur am Glas |
| Fläche ist heller, als jede Lichtquelle sie machen könnte, ohne Shading-Verlauf | Emissive über 1.0, mit HDR-Kette | Eine schlicht weiße baseColor in einem überbelichteten Bild |
| Sanfter Schimmer über einer Stoffoberfläche bei streifendem Blick | Sheen. Samt- und Textil-Signatur | Fresnel auf hoher roughness |
| Regenbogenfarbener Schiller, der mit dem Blickwinkel die Farbe wechselt | Iridescence über thin-film-Interferenz | Ein env map mit bunten Reflexen |
| Muster wiederholt sich in einem sichtbaren Raster | Gekachelte bitmap texture. Kachelgröße abschätzen und notieren | Prozedurales Rauschen mit zu kleiner Periode |
| Detail bleibt bis in jede Vergrößerung scharf, wiederholt sich nie | Prozedural erzeugt | Sehr hoch aufgelöstes bitmap |
| Textur läuft an steilen Flächen nicht aus, hat keine sichtbaren UV-Nähte, zeigt aber Mischbänder an 45°-Flächen | Triplanar mapping | — |
| Benachbarte Objekte haben sichtbar unterschiedlich feine Texturen | Uneinheitliche texel density. Ein Asset-Pipeline-Befund, kein Shader-Befund | Absichtlicher Detailfokus |
| Weiche Bänder oder ein Detailsprung bei einem bestimmten Abstand | Mip transition, fehlendes anisotropic filtering | DOF-Übergang |
| Weiche Blobs unterschiedlicher Größe, ineinander verlaufend | Perlin/Simplex noise, meist als FBM geschichtet | — |
| Zellenmuster mit sichtbaren Zellgrenzen | Worley/Voronoi noise | Ein bitmap eines Craquelé-Musters |
| Selbstähnliche Struktur über mehrere Größenordnungen | FBM mit mehreren Oktaven, oder ein echtes Fraktal | — |
| Schmutz und Abnutzung sitzen genau in Ecken und auf Kanten | Curvature- oder AO-gesteuerte Masken. Substance-Painter-Signatur, meist gebacken | Handgemalte Texturen |

---

## E. Lighting & Shadows

### Der Grundlesevorgang

Aus **Schattenrichtungen** die Lichtrichtungen rekonstruieren, aus **Glanzlichtpositionen** die Lichtpositionen, aus **Schattenweichheit** die Lichtgröße. Dann: was ist in den Schatten noch zu sehen, und woher kommt dieses Licht?

| Indiz | Schluss | Verwechslungsgefahr |
| --- | --- | --- |
| Alle Schatten laufen parallel | Directional light, Sonne | Ein sehr weit entfernter spot |
| Schatten laufen radial von einem Punkt weg, werden mit Abstand länger | Point oder spot light | — |
| Schattenseite ist gleichmäßig grau aufgehellt | Konstantes ambient. Der billigste und flachste Weg | Ein sehr diffuses fill light |
| Schattenseite ist von oben bläulich, von unten erdfarben | Hemisphere light oder ein gebackenes environment | Zwei farbige fill lights |
| In der Reflexion spiegelnder Flächen ist eine Umgebung mit Horizont erkennbar | IBL über HDRI, in three.js `scene.environment` mit PMREM | Eine handgemalte matcap |
| Nischen und Innenkanten dunkeln über wenige Pixel ab, unabhängig von der Lichtrichtung | Ambient occlusion. Screen-space oder gebacken | Handgemalte Verschattung in der baseColor |
| Diese Abdunklung reicht auch über Objektgrenzen hinweg und flimmert bei Bewegung | SSAO/GTAO, also screen-space und realtime | Baked AO tut das nicht — es kennt keine Objektgrenzen zur Laufzeit |
| Statische Objekte haben weiche, detailreiche Schatten, bewegliche eine sichtbar andere Schattenqualität | Lightmap für die Statik plus dynamische shadow map für den Rest. Klassische Spiel-Architektur | — |
| Sichtbare Lichtstrahlen im Raum, die von Geometrie unterbrochen werden | Volumetrisches Raymarching gegen die shadow map | Ein radial blur aus der Lichtquelle bricht **nicht** korrekt an Geometrie — das trennt die Fälle |
| Strahlen gehen radial von einer hellen Bildstelle aus und ignorieren Verdeckungen | Radial blur / screen-space god rays im Post | — |
| Nebel wird mit Entfernung dichter | Distance fog | — |
| Nebel liegt in einer Höhenschicht mit sichtbarer Oberkante | Height fog | — |
| Der Sonnenkern läuft ins Weiß und verschiebt sich dabei ins Gelbliche | ACES oder ein filmic tone mapping | AgX rollt ähnlich ab, entsättigt aber stärker |
| Helle Bereiche kippen in eine gesättigte Primärfarbe statt ins Weiß | Kein tone mapping, nur clamping | — |
| Schwarzwerte sind angehoben und leicht eingefärbt | Lifted blacks im color grading, meist per LUT | — |
| Lichter warm, Schatten kühl, ohne dass eine Lichtquelle das erklärt | Split toning im Grading. Der Default-»Kino-Look« | Zwei farbige Lichtquellen — die färben aber auch die Halbschatten mit |

---

## F. Post-Processing

| Indiz | Schluss | Verwechslungsgefahr |
| --- | --- | --- |
| Heller Bereich hat einen weichen Halo, der über die Objektkante hinausblutet | Bloom. Blutet er auch über ein davor stehendes dunkles Objekt, ist es ein reiner Post-Effekt ohne depth-Berücksichtigung | Ein Glow, der ins Material gemalt ist |
| Halo hat sichtbare Stufen unterschiedlicher Weichheit | Mip-Pyramide im Bloom, zu wenige Stufen oder zu grobe Gewichtung | — |
| Horizontaler Streifen aus einem hellen Punkt, oft bläulich | Anamorphic flare | Eine gestreckte Reflexion |
| Unschärfekreise haben eine erkennbare Vieleckform | DOF mit Blenden-Kernel, Zahl der Ecken = Zahl der Blendenlamellen | — |
| Unschärfekreise sind kreisrund und im Rand nicht heller | Gaussian-Näherung statt echtes Bokeh | — |
| Scharfer Vordergrund blutet in den unscharfen Hintergrund hinein | Gather-basiertes DOF ohne saubere Vordergrundmaske. Realtime-Signatur | — |
| Farbsäume, die zum Bildrand hin zunehmen und radial ausgerichtet sind | Chromatic aberration | Dispersion an Glas sitzt nur am Glas |
| Bildecken abgedunkelt | Vignette | Eine Lichtsetzung mit Fokus auf die Mitte |
| Gleichmäßiges Korn über das ganze Bild, auch in hellen Flächen | Film grain aus dem Post | Sampling-Rauschen sitzt bevorzugt in dunklen Flächen |
| Treppenkanten an schrägen Konturen, aber weiche Textur-Details | Kein oder schwaches Anti-Aliasing, FXAA am Limit | JPEG-Artefakte |
| Kanten weich, feine Details leicht verschmiert, in Bewegung Nachzieher | TAA. Das Verschmieren ist ihr Preis | Leichte Unschärfe durch Upscaling |
| Farbstich, der auch reine Weißflächen erfasst | LUT oder globales Grading | Farbiges Licht |

---

## G. Stylized / NPR

| Indiz | Schluss | Verwechslungsgefahr |
| --- | --- | --- |
| Diffuse Beleuchtung in zwei bis vier harte Stufen quantisiert | Toon/cel shading über eine ramp texture oder `step` | Posterize im Post erfasst auch Texturen und Hintergrund, cel shading nur die Beleuchtung |
| Die Beleuchtung ändert sich nicht, wenn das Objekt sich im Raum bewegt (nur bei Video), hängt aber an der Normalenrichtung | Matcap / sphere-environment-mapping | Ein sehr dominantes env map |
| Schraffur- oder Rastermuster in gleichbleibender Dichte über das ganze Bild | Screen-space-Halftone. Klebt es an der Oberfläche und verkürzt sich perspektivisch, ist es objektbasiert | — |
| Sehr begrenzte Farbpalette mit sichtbarem Dithermuster in den Übergängen | Palettenquantisierung mit ordered dithering, oft Bayer-Matrix | Starke JPEG-Kompression |
| Harte Pixelkanten, keinerlei Zwischenwerte | Niedrig aufgelöstes render target mit nearest filtering, hochskaliert | Ein bitmap in Pixel-Art |
| Konturen zittern oder wackeln (nur bei Video) | Bewusster »boiling line«-Effekt über zeitlich variierendes Noise | — |
| Flächen wirken wie Papier oder Aquarell, mit Struktur in der Fläche | Overlay einer Papiertextur im screen space, oft mit einer curvature-Maske | Eine gemalte Textur |

---

## H. Temporal (nur bei Video oder mehreren Frames)

| Indiz | Schluss |
| --- | --- |
| Bewegte Objekte ziehen einen halbtransparenten Schweif, der über wenige Frames verschwindet | TAA-Ghosting durch fehlende oder falsche velocity vectors |
| Rauschen wird bei stehender Kamera von Frame zu Frame sauberer, springt bei Bewegung zurück | Temporale Akkumulation: SSGI, ray-traced Reflexionen, progressives Rendering |
| Vegetation wiegt sich in einer weichen, periodischen Bewegung | Vertex-Animation im shader, meist Sinus über Weltposition mit einer Maske aus der vertex color |
| Deformation folgt einem Skelett, Silhouette bleibt an den Gelenken erhalten | Skinning |
| Form wechselt zwischen festen Zuständen | Morph targets / blend shapes |
| Bewegung ruckelt in festen Stufen, unabhängig von der Framerate | Bewusstes Stepping, »stop motion«-Look über gerundete Zeit |
| Partikel erscheinen und verblassen in einem festen Rhythmus | GPU-Partikelsystem mit Lebensdauer, in WebGPU ein Compute-Kandidat |

---

## Was das Standbild nicht verrät

Diese Punkte gehören unter »Offene Fragen« im Report, statt geraten zu werden:

- **Forward oder deferred**, wenn keine transparenten Objekte und keine Lichtermassen im Bild sind. Beides sieht identisch aus.
- **Baked oder dynamisch**, wenn nichts sich bewegt. Ein Standbild kann eine lightmap nicht von Echtzeitlicht unterscheiden, solange keine dynamischen Objekte mit abweichender Schattenqualität dabei sind.
- **Framerate und Budget.** Ein Realtime-Look sagt nichts darüber, ob er auf 30 oder 144 fps lief, und auf welcher Hardware.
- **Auflösung der internen Targets**, sofern kein Effekt sichtbar unterabgetastet ist.
- **Texturauflösung und Kompression**, wenn die Referenz selbst herunterskaliert oder JPEG-komprimiert ist. Kompressionsartefakte imitieren Banding, Rauschen und Aliasing — bei kleinem Material erst prüfen, ob das Indiz nicht aus der Datei statt aus der Pipeline stammt.
- **Ob eine Engine im Spiel war.** Unreal, Unity, Godot und ein handgeschriebener Renderer können denselben Frame produzieren. Erkennbare Engine-Defaults (Lumen-Signatur, das typische Unity-URP-Bloom) sind Indizien, keine Beweise.
