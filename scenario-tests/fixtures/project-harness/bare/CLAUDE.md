# CLAUDE.md

Monorepo für ein kleines 2D-Spiel im Browser. pnpm workspaces.

## Invarianten

- **Rendering läuft nur im Worker.** Der Main Thread berührt kein Canvas; so
  bleibt die UI flüssig, auch wenn der Renderer hängt. Ein Main-Thread-Canvas
  mit `requestIdleCallback` haben wir abgewogen und verworfen, weil lange Frames
  dann die Eingabe blockieren.
- **Netzwerkcode kennt das Rendering nicht.** `packages/net` importiert nichts
  aus `packages/render`.
