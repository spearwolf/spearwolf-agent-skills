import { describe, expect, it } from 'vitest';
import { ExportError, exportCsv } from '../src/export';

describe('exportCsv', () => {
  it('writes the header', () => {
    expect(exportCsv([]).split('\n')[0]).toBe('id,createdAt,value');
  });
  it('rejects non-finite values', () => {
    expect(() => exportCsv([{ id: 1, createdAt: '2026-01-01', value: Number.NaN }])).toThrow(ExportError);
  });
});
