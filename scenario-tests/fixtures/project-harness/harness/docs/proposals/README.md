# Proposals

Verbindliche Spezifikation, eine Datei je Domain. Der Status jedes Proposals
steht in seinem Kopf, nicht hier.

| Proposal | Kürzel | Zuständig für — hier gewinnt es |
| --- | --- | --- |
| [`core.md`](./core.md) | CO | Datenmodell `Measurement`, Speicherzugriff |
| [`export.md`](./export.md) | EX | CSV-Export: Format, Reihenfolge, Fehler |
| [`sync.md`](./sync.md) | SY | Abgleich mit dem Server |

Ein Kürzel ist die einzige Definition und wird nie geändert oder neu vergeben.

## Vorrang

Für eine strittige Aussage gilt das Proposal, in dessen Domain sie fällt.
Berühren sich zwei Domains echt, gilt diese Kette, absteigend:

export  >  sync  >  core
