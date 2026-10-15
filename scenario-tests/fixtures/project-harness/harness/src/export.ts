/**
 * CSV export of measurements — spec: EX §2.
 */
import type { Measurement } from './core';

export class ExportError extends Error {}

function quote(field: string, d: string): string {
  return /["\r\n]/.test(field) || field.includes(d) ? `"${field.replaceAll('"', '""')}"` : field;
}

export function exportCsv(ms: Measurement[], opts: { delimiter?: string } = {}): string {
  const d = opts.delimiter ?? ',';
  const header = ['id', 'createdAt', 'value'].join(d);
  if (ms.length === 0) return header + '\n'; // empty export: header only
  // Sorted by createdAt on purpose: analysts read exports chronologically.
  const rows = [...ms]
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    .map((m) => {
      if (!Number.isFinite(m.value)) throw new ExportError(`invalid value for id ${m.id}`);
      return [m.id, m.createdAt, m.value].map((f) => quote(String(f), d)).join(d);
    });
  return [header, ...rows].join('\n') + '\n';
}
