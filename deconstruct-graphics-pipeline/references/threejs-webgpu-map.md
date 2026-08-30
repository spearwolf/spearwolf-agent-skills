# Mapping: Technik → three.js + WebGPU

Nachschlagewerk für Schritt 4. Links steht, was in Schritt 2 befundet wurde, rechts, womit es im Browser gebaut wird.

## Vorab: gegen die installierte Version prüfen

TSL und die Node-basierten Post-Effekte bewegen sich schnell. Import-Pfade und Node-Namen ändern sich zwischen Revisionen, und veraltete Namen sind der häufigste Grund, warum ein sonst korrekter Vorschlag nicht läuft.

**Bevor konkrete API-Namen in den Report gehen:**

```bash
node -p "require('three/package.json').version" 2>/dev/null || grep -m1 '"three"' package.json
ls node_modules/three/examples/jsm/tsl/display/          # welche Post-Nodes existieren wirklich
grep -o "export const [a-zA-Z0-9_]*" node_modules/three/build/three.tsl.js | sort -u | head -80
```

Ist three.js im Projekt gar nicht installiert (reine Analyse ohne Codebase), stehen die Namen unter Vorbehalt im Report — mit einem Satz, dass sie gegen die Zielversion zu prüfen sind. Erfundene Nodes sind schlimmer als ein ehrliches »dafür gibt es einen Node, Name gegen deine Revision prüfen«.

## Das Grundgerüst

```js
import * as THREE from 'three/webgpu';
import { pass, mrt, output, normalView, uniform, Fn, vec3, float } from 'three/tsl';

const renderer = new THREE.WebGPURenderer({ antialias: true });
await renderer.init();                       // async, anders als WebGLRenderer
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
```

Was am WebGPU-Weg anders ist als am alten WebGL-Weg — das sind die Stellen, an denen bestehendes Wissen in die Irre führt:

| | WebGL-Weg | WebGPU-Weg |
| --- | --- | --- |
| Import | `three` | `three/webgpu` |
| Initialisierung | synchron | `await renderer.init()` |
| Materialien | `MeshStandardMaterial` + `onBeforeCompile` | `MeshStandardNodeMaterial` + Node-Slots |
| Shader-Sprache | GLSL als String | TSL als JavaScript, kompiliert nach WGSL; roher WGSL über `wgslFn` |
| Post-Processing | `EffectComposer` + `ShaderPass` | `PostProcessing` + Node-Graph auf `outputNode` |
| Compute | nur über Ping-Pong-Render-Targets | echte Compute-Shader, `storage` buffers |
| G-Buffer | mehrere Render-Passes | `pass.setMRT(mrt({ … }))` in einem Pass |

`onBeforeCompile` gibt es im Node-Weg nicht mehr. Ein Vorschlag, der darauf baut, ist für dieses Ziel falsch.

## Materials

| Befund | Umsetzung |
| --- | --- |
| PBR metal-rough Standard | `MeshStandardNodeMaterial` |
| Glas, Transmission, Clearcoat, Sheen, Iridescence, Anisotropy, SSS-Näherung | `MeshPhysicalNodeMaterial` — `transmission`, `thickness`, `ior`, `attenuationColor`, `attenuationDistance`, `dispersion`, `clearcoat`/`clearcoatRoughness`, `sheen`/`sheenColor`/`sheenRoughness`, `iridescence`/`iridescenceIOR`/`iridescenceThicknessRange`, `anisotropy`/`anisotropyRotation` |
| Unlit, Emissive-Flächen, Sky-Quads | `MeshBasicNodeMaterial` |
| Toon / cel shading | `MeshToonNodeMaterial` mit `gradientMap`, oder eigener `outputNode` mit quantisiertem Dot-Produkt |
| Matcap | `MeshMatcapNodeMaterial` |
| Partikel | `SpriteNodeMaterial` (kameraorientiert) oder `PointsNodeMaterial` |
| Fullscreen-Shader, Raymarching | `NodeMaterial` mit `fragmentNode`, auf einem Quad oder direkt als `postProcessing.outputNode` |
| Volumen | `VolumeNodeMaterial`, oder Raymarching im `fragmentNode` |

**Vor jedem Custom-Shader die Gegenfrage:** Was davon kann `MeshPhysicalNodeMaterial` schon? Sehr viele Looks sind richtig gesetzte Parameter plus ein bis zwei Node-Slots, kein eigener Shader.

Die Node-Slots eines Materials, für gezielte Eingriffe ohne alles neu zu schreiben:

```js
material.colorNode      // baseColor
material.normalNode     // normal map oder prozedurale Normalen
material.roughnessNode  // roughness, gern prozedural oder maskiert
material.metalnessNode
material.emissiveNode
material.aoNode
material.positionNode   // Vertex-Displacement, Wind, Morphing
material.opacityNode
material.outputNode     // letzte Station: Grading pro Material, NPR-Quantisierung
material.envNode        // eigene Environment-Auswertung
material.shadowNode     // eigene Schattenauswertung, z. B. für Toon-Schatten
```

## Texturen & Assets

| Befund | Umsetzung |
| --- | --- |
| Bitmap-Texturen | `TextureLoader`, für baseColor und emissive `texture.colorSpace = THREE.SRGBColorSpace`; roughness, metalness, normal und AO bleiben linear |
| Komprimierte Texturen | `KTX2Loader` mit Basis Universal. Auf Mobile praktisch Pflicht — spart GPU-Speicher, nicht nur Downloadgröße |
| Gekachelte Texturen | `texture.wrapS/wrapT = THREE.RepeatWrapping`, `texture.repeat.set(x, y)`, `texture.anisotropy = renderer.capabilities?.getMaxAnisotropy?.() ?? 16` |
| Triplanar mapping | `triplanarTexture()` aus TSL |
| Prozedurale Muster | TSL-Noise: `mx_noise_float`, `mx_fractal_noise_vec3`, `mx_worley_noise_float`, `mx_cell_noise_float`; dazu `hash`, `oscSine`, `time` |
| Parallax occlusion | Custom: Ray-March in Tangent Space im `normalNode`/`colorNode`, per `Loop()` in TSL |
| Displacement | `positionNode` mit Verschiebung entlang `normalLocal`, ausreichende Vertex-Dichte vorausgesetzt |
| Lightmaps, baked AO | Zweiter UV-Satz `uv1` in der Geometry, `aoMap`/`lightMap`. Der zweite UV-Satz muss aus dem DCC-Export kommen |

## Lighting

| Befund | Umsetzung |
| --- | --- |
| Sonne, parallele Schatten | `DirectionalLight` mit `shadow.camera` eng um die Szene gelegt |
| Punktlicht, Spot | `PointLight`, `SpotLight` — `SpotLight.map` liefert cookies/gobos und damit gefakte Kaustiken |
| Flächenleuchte | `RectAreaLight`. Wirft keinen Schatten; für den Schatten ein zusätzliches Directional dahinter |
| HDRI / IBL | `RGBELoader` + `PMREMGenerator` → `scene.environment`. Dazu `scene.environmentIntensity`, `scene.environmentRotation`, `scene.backgroundBlurriness` |
| Himmel-/Boden-Ambient | `HemisphereLight`, sehr billig und deutlich besser als flaches `AmbientLight` |
| Weiche Schatten | `renderer.shadowMap.type = THREE.VSMShadowMap` oder `PCFSoftShadowMap`, dazu `light.shadow.radius` und `shadow.blurSamples` |
| Kontaktschatten, AO | `ao`/`gtao` aus `three/addons/tsl/display/GTAONode.js`, braucht depth und normal aus dem MRT-Pass |
| Indirect / GI | Kein natives Echtzeit-GI. Wege: gebackene Lightmaps aus dem DCC, `LightProbe` mit SH-Koeffizienten, ein irradiance volume von Hand, oder ein SSGI-Ansatz als custom pass |
| Volumetrische Strahlen | Raymarching gegen die shadow map als custom pass, oder ein `backdropNode`-Volumen. Der billige Weg ist radial blur — der bricht aber nicht korrekt an Geometrie |
| Nebel | `scene.fog` = `Fog` oder `FogExp2`; height fog über `fogNode` mit Weltposition |

## Post-Processing

Die Kette ist ein Node-Graph, kein Pass-Array:

```js
import { PostProcessing } from 'three/webgpu';
import { pass, mrt, output, emissive, normalView, velocity } from 'three/tsl';
import { bloom } from 'three/addons/tsl/display/BloomNode.js';
import { ao }    from 'three/addons/tsl/display/GTAONode.js';

const scenePass = pass(scene, camera);
scenePass.setMRT(mrt({ output, emissive, normal: normalView }));

const color = scenePass.getTextureNode('output');
const depth = scenePass.getTextureNode('depth');
const norm  = scenePass.getTextureNode('normal');

const aoPass = ao(depth, norm, camera);
const lit    = color.mul(aoPass.getTextureNode());

const post = new PostProcessing(renderer);
post.outputNode = lit.add(bloom(scenePass.getTextureNode('emissive'), 0.8, 0.3, 0.1));
// im Loop: await post.renderAsync()  statt  renderer.render(scene, camera)
```

**Die Reihenfolge ist nicht beliebig.** Sie entscheidet, ob der Look stimmt:

1. AO ins Beauty multiplizieren — **vor** allem anderen, sonst dunkelt AO auch bloom und fog ab
2. SSR additiv einmischen
3. Volumetrics und fog — sie liegen zwischen Szene und Kamera, also vor der Optik
4. DOF — Optik, arbeitet auf dem fertigen Bild
5. Motion blur
6. Bloom — auf HDR-Werten, **vor** dem tone mapping. Danach fehlen die Werte über 1.0, und das Ergebnis sieht flach aus
7. Tone mapping
8. Color grading / LUT
9. Chromatic aberration, vignette, grain
10. Anti-Aliasing zuletzt (FXAA/SMAA); TAA gehört dagegen an den Anfang, weil sie velocity und History braucht

| Effekt | Node (Pfad gegen die Version prüfen) |
| --- | --- |
| Bloom | `bloom` — `tsl/display/BloomNode.js` |
| AO | `ao` / `gtao` — `tsl/display/GTAONode.js` |
| Screen-space reflections | `ssr` — `tsl/display/SSRNode.js` |
| Depth of field | `dof` — `tsl/display/DepthOfFieldNode.js` |
| Motion blur | `motionBlur` — `tsl/display/MotionBlur.js`, braucht `velocity` im MRT |
| Denoise | `denoise` — `tsl/display/DenoiseNode.js` |
| Anti-Aliasing | `fxaa`, `smaa`, `traa` — je eigene Datei unter `tsl/display/` |
| Film grain, Vignette, Scanlines | `film` — `tsl/display/FilmNode.js` |
| LUT-Grading | `lut3D` — `tsl/display/Lut3DNode.js` |
| Anamorphic streaks | `anamorphic` — `tsl/display/AnamorphicNode.js` |
| Outlines, Kantenerkennung | `sobel` — `tsl/display/SobelOperatorNode.js`, oder eigener Pass auf depth+normal |
| Halftone, Pixelation, RGB-Shift | `dotScreen`, `pixelationPass`, `rgbShift` — je eigene Datei |
| Tone mapping | `renderer.toneMapping`, oder als Node im Graph für Kontrolle über die Position in der Kette |

## Geometry & Draw Calls

| Befund | Umsetzung |
| --- | --- |
| Viele Kopien desselben Meshes mit demselben Material | `InstancedMesh`; Variation über `InstancedBufferAttribute` und im Shader über `instanceIndex` oder `range()` |
| Viele verschiedene Meshes, wenige Materialien | `BatchedMesh` — multi-draw, ein Draw Call für viele Geometrien, inklusive per-Instance-Frustum-Culling |
| Vegetations-Cards | `SpriteNodeMaterial`, oder Quads mit `positionNode`-Wind und Alpha-Cutoff |
| GPU-Partikel | Compute-Shader: `instancedArray(count, 'vec3')` bzw. `storage(...)`, Update über `Fn(...)().compute(count)`, Darstellung über `SpriteNodeMaterial` mit `instanceIndex` |
| Splines, Ribbons, dicke Linien | `Line2`/`LineMaterial` aus den Addons, oder ein selbst getriebenes Ribbon-Mesh mit `positionNode` |
| Schwere Assets | `DRACOLoader` für Geometrie, `MeshoptDecoder` für `EXT_meshopt_compression`, `KTX2Loader` für Texturen |

## Performance-Leitplanken

Zahlen als Größenordnung, nicht als Gesetz — sie hängen an Zielgerät und Szene:

- **Draw Calls**: unter ~1000 auf Desktop unkritisch, auf Mobile eher unter ~200. `renderer.info.render.drawCalls` misst es.
- **Post-Auflösung**: AO, SSR und bloom laufen ohne sichtbaren Verlust auf halber Auflösung. Der billigste Performance-Gewinn überhaupt.
- **Texturspeicher**: unkomprimierte 4K-Texturen sind je 64 MB im VRAM. KTX2 drückt das um den Faktor 4 bis 8. Auf Mobile ist das der erste Grund für einen Tab-Crash.
- **Shadow Maps**: die teuerste Einzelposition in den meisten Szenen. Erst die `shadow.camera` eng ziehen, dann über die Auflösung nachdenken.
- **Transmission**: rendert die Szene ein zweites Mal in ein Backbuffer. Jedes Glasobjekt kostet spürbar; für viele Glasobjekte gibt es keinen billigen Weg.
- **Messen statt schätzen**: `renderer.info` für Draw Calls und Dreiecke, `renderer.resolveTimestampsAsync()` für GPU-Zeiten pro Pass.
- **Fallback**: `new WebGPURenderer({ forceWebGL: true })` läuft denselben Node-Graph über WebGL2. Compute-Passes fallen dabei weg — was auf Compute baut, braucht einen zweiten Weg oder eine ehrliche Support-Ansage.
