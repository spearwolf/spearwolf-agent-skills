# Live-Seite: Belege statt Vermutungen

Nachschlagewerk für Schritt 0, **nur wenn die Referenz eine aufrufbare Seite ist** — eine Demo, ein Portfolio, eine Produktseite, ein Shadertoy-Link.

Das ist der Glücksfall dieses Skills. Bei einem Standbild bleibt fast alles Schluss; bei einer laufenden Seite lassen sich Framework, Assets, Texturformate, Draw Calls und teilweise der Shader-Quelltext **auslesen**. Was ausgelesen wurde, ist `belegt` — und der Report wird dadurch um Klassen besser.

## Die Reihenfolge

**Das Bild kommt zuerst.** Erst Screenshot, erst hinsehen, erst klassifizieren. Wer mit dem Bundle anfängt, beschreibt am Ende die Bibliothek statt den Look.

1. Seite öffnen und **Screenshot** — mit `chrome-devtools` MCP oder Playwright. Eine Sekunde warten, bevor geschossen wird; WebGL-Szenen brauchen einen Moment bis zum ersten sauberen Frame.
2. Bei animierten Szenen **3–5 Screenshots im Abstand von ein bis zwei Sekunden**. Das schaltet den Layer `temporal` frei: Ghosting, Akkumulationsrauschen, Partikel-Lebensdauer, Vertex-Animation sind sonst unsichtbar.
3. Dann erst die technische Aufklärung unten.

Alles hier ist lesend. Keine Formulare, keine Klicks über das hinaus, was nötig ist, um die Szene sichtbar zu machen (Cookie-Banner wegklicken, »Start« drücken).

## Framework und Kontext

```js
// evaluate_script / browser_evaluate
const canvas = document.querySelector('canvas');
return {
  three:    window.THREE?.REVISION ?? window.__THREE__ ?? null,
  babylon:  window.BABYLON?.Engine?.Version ?? null,
  pixi:     window.PIXI?.VERSION ?? null,
  // getContext liefert den bereits erzeugten Kontext zurueck, sonst null:
  webgpu:   !!canvas?.getContext('webgpu'),
  webgl2:   !!canvas?.getContext('webgl2'),
  size:     canvas ? [canvas.width, canvas.height, devicePixelRatio] : null,
  canvases: document.querySelectorAll('canvas').length,
};
```

`canvas.width` gegen die CSS-Breite mal `devicePixelRatio` gehalten verrät, ob unterabgetastet gerendert wird — ein häufiger und im Screenshot schwer sichtbarer Performance-Kniff.

Mehrere Canvas-Elemente heißen: entweder mehrere unabhängige Szenen, oder ein 2D-Overlay über der 3D-Szene.

## Assets aus dem Netzwerk-Traffic

Die Liste der Requests ist die Materialliste der Szene. Nach diesen Endungen und Mustern suchen:

| Fund | Was er verrät |
| --- | --- |
| `.glb`, `.gltf` | Modellierte Assets. Größe notieren — sie sagt etwas über die Poly-Dichte |
| `.hdr`, `.exr` | IBL. Damit ist die Frage »IBL oder konstantes Ambient« beantwortet |
| `.ktx2`, `.basis` | Komprimierte Texturen, also eine durchdachte Pipeline |
| `.drc`, meshopt im Bundle | Geometriekompression |
| Texturnamen mit `_normal`, `_orm`, `_rough`, `_ao`, `_disp`, `_emissive` | Der PBR-Kanalsatz, direkt ablesbar |
| `.bin` neben einer `.gltf` | Ungepackter glTF-Export |
| Sehr viele kleine Bilder | Atlas-loser Aufbau, ein Draw-Call-Befund |
| `.mp4`, `.webm` als Textur | Video-Textur, keine prozedurale Animation |

Auflösung der Texturen zählt: über die Request-Größe oder, sauberer, ein `new Image()` auf die URL. Das ist die einzige belastbare Aussage über texel density, die überhaupt zu haben ist.

## Shader-Quelltext

Im geladenen JavaScript nach Shader-Signaturen suchen — im Sources-Panel oder über den Netzwerk-Response der Bundles:

| Muster | Bedeutet |
| --- | --- |
| `@fragment`, `@vertex`, `fn main`, `var<uniform>` | WGSL, also WebGPU |
| `gl_FragColor`, `varying`, `precision highp` | GLSL ES 1.0, WebGL1-Ära |
| `#version 300 es`, `out vec4` | GLSL ES 3.0, WebGL2 |
| `THREE.ShaderMaterial`, `onBeforeCompile` | Eingriff in ein Standard-Material |
| `NodeMaterial`, `tsl`, `MeshStandardNodeMaterial` | Der Node-Weg, also derselbe Stack wie das Ziel |
| `EffectComposer`, `UnrealBloomPass`, `SSAOPass` | Die Post-Kette, namentlich |
| `postprocessing` (das npm-Paket von pmndrs) | Eigenes Effekt-Vokabular: `BloomEffect`, `DepthOfFieldEffect`, `EffectPass` |

Ein Bundle mit sourcemap gibt die Originaldateinamen preis, und damit oft die komplette Effekt-Liste in Klarnamen. Das ist der kürzeste Weg zu einer belegten Post-Kette.

Sind die Bundles minifiziert und ohne sourcemap, ist eine Volltextsuche nach `uniform`, `vec3(` oder `texture2D` immer noch ergiebig — Shader-Strings überleben die Minifizierung als Literale.

## Laufzeitwerte

Ist der Renderer global erreichbar (in Demos und Portfolios häufiger als man denkt), liefert er harte Zahlen:

```js
const r = window.renderer ?? window.__renderer;
return r ? { calls: r.info.render.calls, tris: r.info.render.triangles,
             textures: r.info.memory.textures, geometries: r.info.memory.geometries,
             shadowMap: r.shadowMap.enabled, toneMapping: r.toneMapping } : 'nicht exponiert';
```

Ist er das nicht: ein Performance-Trace über die devtools-MCP-Tools zeigt GPU-Zeit pro Frame und die Zahl der Zeichenbefehle. Weniger präzise, aber immer verfügbar.

Weitere billige Belege aus der Konsole: WebGL-Warnungen nennen oft Extension-Namen und Texturformate, und ein `console.log` der Anwendung selbst verrät gelegentlich das komplette Setup.

## Was ins Protokoll gehört

Jeder ausgelesene Wert wandert als eigener Befund mit `confidence: belegt` in die Sammlung, und der Report nennt in Abschnitt 0 die Quelle: »three.js r{N}, WebGPU-Kontext, Post-Kette aus dem Bundle gelesen« ist eine völlig andere Aussagequalität als »sieht nach three.js aus«.

**Der Rest bleibt trotzdem Schluss.** Dass eine Seite `BloomNode.js` lädt, sagt nichts über Threshold, Strength und Radius. Die Parameter liest man weiter aus dem Bild.
