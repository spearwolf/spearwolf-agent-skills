# Core

> **Status: gebaut.**

## 1. Zweck

Das Datenmodell der Messwerte und der Zugriff auf den lokalen Speicher.

## 2. Datenmodell

`Measurement` hat `id` (ganze Zahl, eindeutig), `createdAt` (ISO-8601) und
`value` (Zahl).

## 3. Speicher

`loadAll()` liefert alle gespeicherten Messwerte, ohne zugesicherte Reihenfolge.
