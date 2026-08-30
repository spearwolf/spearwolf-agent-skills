# Asset-Pipeline: DCC → glTF → three.js

Nachschlagewerk für Schritt 4, **nur wenn im Bild modellierte Assets zu sehen sind**. Bei Fullscreen-Shadern, generativer 2D-Grafik oder reinen Post-Effekten wird diese Datei nicht gebraucht und der zugehörige Report-Abschnitt entfällt.

Die Frage, die dieser Abschnitt beantwortet: **Was kommt fertig aus dem `.glb`, und was muss zwingend Code werden?** Die Antwort entscheidet über den Zuschnitt der Arbeit — ein Look, der zu 80 % im Export steckt, ist ein anderes Projekt als einer, der zu 80 % im Shader steckt.

Referenz ist Blender, weil es der häufigste Fall ist. Für Maya, C4D, Houdini oder 3ds Max gilt dieselbe Trennlinie; nur die Namen der Werkzeuge ändern sich.

## Woher kommt das Bild überhaupt?

Vor der Matrix die Herkunftsfrage, sie hat Konsequenzen für die Erwartung:

| Signatur | Quelle | Was das bedeutet |
| --- | --- | --- |
| Weiche GI, Farbbluten, Denoiser-Textur, sehr saubere Verläufe | Cycles, Arnold, V-Ray, Redshift, Octane | Offline. Der Export trägt Geometrie und Grundmaterial; der Look entsteht neu |
| Screen-space-Artefakte, TAA-Schmieren, Lumen-typisches Nachziehen indirekten Lichts | Unreal, Unity, Godot | Realtime. Techniken übertragbar, Engine-Features nicht |
| Flache, harte Schatten, sichtbares Viewport-Overlay, Standard-Studio-HDRI | Eevee oder ein DCC-Viewport | Näher am Zielzustand als es aussieht — Eevee ist selbst ein Rasterizer |
| Gleichmäßiges, sauberes Studiolicht ohne erkennbare Umgebung | Marmoset, KeyShot, ein Produktrenderer | Meist ein einfaches Setup: HDRI plus zwei Lichter |

## Was ein glTF/GLB nativ transportiert

| Trägt es | Detail |
| --- | --- |
| Meshes | Positionen, Normalen, Tangenten, mehrere UV-Sätze, vertex colors |
| Hierarchie | Node-Baum mit Transformationen, Parenting |
| PBR metal-rough | `baseColor`, `metallicRoughness`, `normal`, `occlusion`, `emissive` — inklusive Texturen und Faktoren |
| Alpha | `OPAQUE`, `MASK` mit `alphaCutoff`, `BLEND` |
| Animation | Keyframes auf Translation, Rotation, Skalierung; morph targets; skinning mit Armature |
| Kameras | Perspektivisch und orthographisch |
| Lichter | Über `KHR_lights_punctual`: directional, point, spot |
| Physikalische Materialien | Über KHR-Extensions: `transmission`, `volume`, `ior`, `specular`, `clearcoat`, `sheen`, `iridescence`, `anisotropy`, `emissive_strength`, `unlit`, `dispersion` |
| UV-Transformationen | `KHR_texture_transform` — offset, rotation, scale |
| Kompression | `KHR_draco_mesh_compression`, `EXT_meshopt_compression`, `KHR_texture_basisu` (KTX2) |

three.js lädt das über `GLTFLoader`, den Rest der Extensions je nach Revision — im Zweifel gegen die installierte Version prüfen, nicht gegen die Spezifikation.

## Was es nicht transportiert

Das hier wird Code, immer:

| Trägt es nicht | Konsequenz |
| --- | --- |
| **Shader-Node-Trees** aus Blender | Nur der metal-rough-Kern wird übersetzt. Jede prozedurale Textur, jede Mix-Node-Kette, jedes ColorRamp-Konstrukt geht verloren — entweder in Texturen backen oder in TSL nachbauen |
| **Prozedurale Texturen** (Noise, Voronoi, Musgrave, Wave) | Backen oder als TSL-Noise neu bauen. Backen verliert die Auflösungsfreiheit, TSL verliert die exakte Optik — das ist eine echte Entscheidung, kein Detail |
| **Geometry Nodes** | Vor dem Export realisieren (»Realize Instances«), sonst kommt nichts an. Danach ist die Prozeduralität weg. Alternative: die Verteilung im Code nachbauen und über `InstancedMesh` fahren |
| **Partikelsysteme** | Vollständig neu. In WebGPU der klassische Compute-Fall |
| **Volumetrics, Smoke, Fire** | Vollständig neu, als Raymarching oder VDB-Ersatz über 3D-Texturen |
| **World-Shader / Environment** | Als HDRI oder EXR separat exportieren, im Code über `PMREMGenerator` einhängen |
| **Compositor-Node-Tree** | Das ist die Post-Kette. Gehört ohnehin in den Code |
| **Area Lights** | `KHR_lights_punctual` kennt sie nicht. Im Code als `RectAreaLight` nachziehen — die wirft keinen Schatten |
| **Constraints, Drivers, IK** | Nur das gebackene Ergebnis kommt an. Was zur Laufzeit reagieren soll, wird Code |
| **Modifier-Stack** | Wird beim Export angewendet, danach ist er weg. Nicht-destruktiv bleibt nichts |

## Die vier Stolperfallen, die immer zuschlagen

1. **Lichtintensität.** Blender rechnet in Watt, glTF in Candela beziehungsweise Lux. Der Exporter rechnet um, aber die Wahrnehmung stimmt fast nie auf Anhieb. Erwartung: Lichter nach dem Import von Hand nachziehen, statt den Exporter zu debuggen.
2. **Color Space.** `baseColor` und `emissive` sind sRGB, `normal`, `roughness`, `metalness` und `occlusion` sind linear. Ein falsch markiertes Roughness-Map ist der häufigste Grund für »sieht im Browser plastikartig aus«.
3. **Der zweite UV-Satz.** `aoMap` und `lightMap` lesen in three.js `uv1`, nicht `uv`. Fehlt er im Export, bleibt die gebackene Beleuchtung unsichtbar — ohne Fehlermeldung.
4. **ORM-Packing.** glTF erwartet occlusion in R, roughness in G, metalness in B, alles in einer Textur. Drei getrennte Graustufenbilder sind dreimal so viel Speicher für dieselbe Information.

Dazu, leiser, aber zuverlässig: `+Y up` gegen Blenders `+Z up` (der Exporter dreht, Kamera-Setups im Code müssen das wissen) und die Szenenskalierung, wenn im DCC in Zentimetern gearbeitet wurde.

## Backen: was sich lohnt

Backen tauscht Rechenzeit gegen Speicher und Flexibilität. Im Browser ist dieser Tausch fast immer richtig — solange nichts sich bewegt.

| Backen | Wann |
| --- | --- |
| **Lightmap** (indirect + direct) | Statische Szene mit aufwendiger Beleuchtung. Der mit Abstand größte Look-Gewinn pro Millisekunde — GI ohne GI-Kosten |
| **Ambient Occlusion** | Fast immer. Ergänzt SSAO um genau das, was screen-space nicht sehen kann |
| **Normal map aus High-Poly** | Wenn die Silhouette grob bleiben darf, das Oberflächendetail aber nicht |
| **Curvature / Cavity** | Als Maske für Kantenabnutzung und Schmutz |
| **Prozedurale Materialien** | Sobald sie exportiert werden müssen. Auf texel density achten, sonst rutschen benachbarte Objekte in unterschiedliche Detailstufen |

**Nicht backen**, wenn die Kamera oder das Licht sich bewegen soll und der Effekt davon abhängt — eine gebackene Spiegelung in einer bewegten Szene fällt sofort auf.

## Die Matrix für den Report

Abschnitt 6 des Reports listet die Assets dieser konkreten Szene in genau diesen drei Spalten:

| Element im Bild | Kommt aus dem `.glb` | Muss Code werden |
| --- | --- | --- |
| z. B. »die Fassade« | Mesh, baseColor, normal, ORM, baked AO in `uv1` | Fensterreflexion über einen eigenen env-Node |
| z. B. »die Neonschrift« | Mesh, `emissive` mit `KHR_materials_emissive_strength` | Bloom-Kette, Flackern über `time` |
| z. B. »der Regen« | — | Vollständig: Compute-Partikel plus `SpriteNodeMaterial` |

Konkret bleiben. »Materialien: teilweise« hilft niemandem; »die Fassade kommt fertig, die Fensterreflexion nicht« schon.
