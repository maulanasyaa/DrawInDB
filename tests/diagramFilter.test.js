import { describe, it, expect } from 'vitest';
import { filterDiagrams } from '../src/utils/diagramFilter.js';

const diagrams = [
  { filename: 'auth_schema_erd.json', name: 'Auth Schema', type: 'erd' },
  { filename: 'login_flow_flowchart.json', name: 'Login Flow', type: 'flowchart' },
  { filename: 'booking_sequence.json', name: 'Booking', type: 'sequence' },
];

describe('filterDiagrams', () => {
  it('mencocokkan sebagian nama, case-insensitive', () => {
    expect(filterDiagrams(diagrams, 'login').map((d) => d.name)).toEqual(['Login Flow']);
    expect(filterDiagrams(diagrams, 'AUTH').map((d) => d.name)).toEqual(['Auth Schema']);
  });

  it('mencocokkan label tipe dari registry', () => {
    expect(filterDiagrams(diagrams, 'erd')).toEqual([diagrams[0]]);
    expect(filterDiagrams(diagrams, 'sequence')).toEqual([diagrams[2]]);
    expect(filterDiagrams(diagrams, 'flowchart')).toEqual([diagrams[1]]);
  });

  it('spasi di tepi query diabaikan', () => {
    expect(filterDiagrams(diagrams, '  erd  ')).toEqual([diagrams[0]]);
  });

  it('query kosong atau spasi saja mengembalikan array asli (referensi sama)', () => {
    expect(filterDiagrams(diagrams, '')).toBe(diagrams);
    expect(filterDiagrams(diagrams, '   ')).toBe(diagrams);
    expect(filterDiagrams(diagrams, undefined)).toBe(diagrams);
  });

  it('tanpa hasil mengembalikan array kosong', () => {
    expect(filterDiagrams(diagrams, 'zzz')).toEqual([]);
  });

  it('diagram tanpa type diperlakukan ERD (fallback registry)', () => {
    const legacy = [{ filename: 'old.json', name: 'Old' }];
    expect(filterDiagrams(legacy, 'erd')).toEqual(legacy);
    expect(filterDiagrams(legacy, 'flowchart')).toEqual([]);
  });

  it('tidak memutasi input', () => {
    filterDiagrams(diagrams, 'login');
    expect(diagrams).toHaveLength(3);
  });
});
