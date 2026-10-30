import { describe, it, expect } from 'vitest';
import { collectRecentWork } from '../src/utils/recentWork.js';

const vault = {
  projects: [
    {
      id: 'p1',
      name: 'API',
      diagrams: [
        { filename: 'auth.json', name: 'Auth', type: 'erd', db_type: 'mysql', updated_at: '2026-01-01T00:00:00.000Z' },
        { filename: 'flow.json', name: 'Flow', type: 'flowchart', updated_at: '2026-03-01T00:00:00.000Z' },
      ],
      documents: [],
    },
    {
      id: 'p2',
      name: 'Web',
      diagrams: [],
      documents: [
        { filename: 'prd.json', name: 'PRD', type: 'prd', updated_at: '2026-02-01T00:00:00.000Z' },
      ],
    },
  ],
};

describe('collectRecentWork', () => {
  it('menggabung diagram dan dokumen, urut terbaru', () => {
    const items = collectRecentWork(vault);

    expect(items.map((i) => i.name)).toEqual(['Flow', 'PRD', 'Auth']);
    expect(items[0]).toMatchObject({
      kind: 'diagram',
      projectId: 'p1',
      projectName: 'API',
      filename: 'flow.json',
    });
    expect(items[1]).toMatchObject({
      kind: 'document',
      projectId: 'p2',
      projectName: 'Web',
      type: 'prd',
    });
    expect(items[0].dbType).toBeUndefined();
    expect(items[2].dbType).toBe('mysql');
  });

  it('menghormati limit', () => {
    expect(collectRecentWork(vault, 2)).toHaveLength(2);
  });

  it('vault kosong, projects hilang, atau array hilang tidak melempar', () => {
    expect(collectRecentWork(null)).toEqual([]);
    expect(collectRecentWork({})).toEqual([]);
    expect(collectRecentWork({ projects: [{ id: 'x', name: 'X' }] })).toEqual([]);
  });

  it('updated_at kosong masuk paling akhir, tidak mengacak urutan', () => {
    const items = collectRecentWork({
      projects: [
        {
          id: 'p',
          name: 'P',
          diagrams: [
            { filename: 'a.json', name: 'No date', type: 'erd' },
            { filename: 'b.json', name: 'Dated', type: 'erd', updated_at: '2026-05-05T00:00:00.000Z' },
          ],
        },
      ],
    });

    expect(items.map((i) => i.name)).toEqual(['Dated', 'No date']);
  });
});
