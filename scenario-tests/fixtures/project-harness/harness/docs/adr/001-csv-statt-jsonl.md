# ADR-001: Export als CSV statt JSON-Lines

- **Status:** akzeptiert
- **Datum:** 2026-09-01
- **Bezug:** `export.md` §2.1

## Kontext

Der erste Entwurf sah JSON-Lines vor. Die Auswertungswerkzeuge der Nutzer
lesen CSV direkt, JSON-Lines nur über ein Plugin.

## Entscheidung

Der Export schreibt CSV nach RFC 4180.

## Alternativen

JSON-Lines: maschinenfreundlicher, aber für die Zielwerkzeuge ein Umweg.

## Konsequenzen

Verschachtelte Werte sind nicht darstellbar; das Datenmodell hat keine.
