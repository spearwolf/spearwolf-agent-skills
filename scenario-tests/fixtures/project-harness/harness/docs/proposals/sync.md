# Sync

Abgleich der lokalen Messwerte mit dem Server.

## 1. Ablauf

Der Sync lädt alle Messwerte über `loadAll()` (CO §3) und schickt sie als CSV
nach EX §2.1 an den Server. Für große Mengen gilt EX §9.1.

## 2. Konflikte

Bei einem Konflikt gewinnt der Server; die Einzelheiten folgen XY §3.

## 3. Was offen bleibt

- **Konfliktauflösung pro Feld** — dran, wenn der Server Feldversionen liefert.
