# Architektur

Vier Packages:

- `packages/shared` — gemeinsame Typen (`Vec2`, `Entity`, Nachrichten zwischen
  Main Thread und Worker).
- `packages/render` — Renderer im Worker, bekommt `Entity`-Snapshots per
  `postMessage`.
- `packages/input` — Tastatur, Maus, Touch; erzeugt Kommandos.
- `packages/net` — WebSocket zum Spielserver, synchronisiert Entities.
