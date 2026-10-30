import { describe, it, expect } from 'vitest';
import {
  DIAGRAM_TYPES,
  DIAGRAM_TYPE_LIST,
  DEFAULT_DIAGRAM_TYPE,
  getDiagramType,
  isGraphType,
  isErdType,
  isSequenceType,
} from '../src/config/diagramTypes.js';

describe('getDiagramType', () => {
  it.each(['erd', 'flowchart', 'usecase', 'statemachine', 'architecture', 'sequence'])('mengembalikan entri eksak untuk "%s"', (id) => {
    expect(getDiagramType(id)).toBe(DIAGRAM_TYPES[id]);
  });

  it.each([[undefined], [null], ['unknown'], ['ERD'], ['']])(
    'fallback ke ERD untuk %p',
    (id) => {
      expect(getDiagramType(id)).toBe(DIAGRAM_TYPES.erd);
      expect(getDiagramType(id).id).toBe(DEFAULT_DIAGRAM_TYPE);
    },
  );
});

describe('isGraphType', () => {
  it('true untuk flowchart, usecase, statemachine & architecture', () => {
    expect(isGraphType('flowchart')).toBe(true);
    expect(isGraphType('usecase')).toBe(true);
    expect(isGraphType('statemachine')).toBe(true);
    expect(isGraphType('architecture')).toBe(true);
  });

  it('false untuk erd, sequence, dan tipe tak dikenal (fallback ERD)', () => {
    expect(isGraphType('erd')).toBe(false);
    expect(isGraphType('sequence')).toBe(false);
    expect(isGraphType(undefined)).toBe(false);
    expect(isGraphType('unknown')).toBe(false);
  });
});

describe('isSequenceType', () => {
  it('hanya true untuk sequence', () => {
    expect(isSequenceType('sequence')).toBe(true);
    for (const id of ['erd', 'flowchart', 'usecase', 'statemachine', 'architecture']) {
      expect(isSequenceType(id)).toBe(false);
    }
    expect(isSequenceType(undefined)).toBe(false);
  });
});

describe('isErdType', () => {
  it('true untuk erd dan fallback', () => {
    expect(isErdType('erd')).toBe(true);
    expect(isErdType(undefined)).toBe(true);
    expect(isErdType('nope')).toBe(true);
  });

  it('false untuk graph types dan sequence', () => {
    expect(isErdType('flowchart')).toBe(false);
    expect(isErdType('usecase')).toBe(false);
    expect(isErdType('sequence')).toBe(false);
  });
});

describe('registry invariants', () => {
  it('hanya ERD yang punya db_type', () => {
    const withDbType = DIAGRAM_TYPE_LIST.filter((t) => t.hasDbType).map((t) => t.id);
    expect(withDbType).toEqual(['erd']);
  });

  it('dataShape konsisten dengan helper', () => {
    const SHAPES = {
      erd: 'tables',
      flowchart: 'graph',
      usecase: 'graph',
      statemachine: 'graph',
      architecture: 'graph',
      sequence: 'sequence',
    };
    for (const t of DIAGRAM_TYPE_LIST) {
      expect(t.dataShape, t.id).toBe(SHAPES[t.id]);
      expect(isErdType(t.id)).toBe(t.dataShape === 'tables');
      expect(isGraphType(t.id)).toBe(t.dataShape === 'graph');
      expect(isSequenceType(t.id)).toBe(t.dataShape === 'sequence');
    }
  });

  it('setiap entri punya metadata tampilan lengkap', () => {
    const keys = [
      'label',
      'labelPlural',
      'placeholder',
      'badge',
      'backLabel',
      'description',
      'icon',
      'exports',
    ];
    for (const t of DIAGRAM_TYPE_LIST) {
      expect(t.id).toBeTruthy();
      for (const k of keys) {
        expect(t[k], `${t.id}.${k}`).toBeTruthy();
      }
      expect(t.exports).toEqual(
        expect.objectContaining({
          png: expect.any(Boolean),
          sql: expect.any(Boolean),
          json: expect.any(Boolean),
        }),
      );
    }
  });

  it('export SQL hanya ERD, export JSON hanya Use Case, PNG untuk semua kecuali Use Case', () => {
    expect(DIAGRAM_TYPE_LIST.filter((t) => t.exports.sql).map((t) => t.id)).toEqual(['erd']);
    expect(DIAGRAM_TYPE_LIST.filter((t) => t.exports.json).map((t) => t.id)).toEqual(['usecase']);
    expect(DIAGRAM_TYPE_LIST.filter((t) => t.exports.png).map((t) => t.id).sort()).toEqual(
      ['architecture', 'erd', 'flowchart', 'sequence', 'statemachine'],
    );
  });

  it('badge Use Case tampil sebagai "USE CASE" (regresi Home)', () => {
    expect(getDiagramType('usecase').badge).toBe('USE CASE');
  });

  it('DIAGRAM_TYPE_LIST urut erd → … → architecture → sequence (urutan kartu di ProjectDetail)', () => {
    expect(DIAGRAM_TYPE_LIST.map((t) => t.id)).toEqual([
      'erd',
      'flowchart',
      'usecase',
      'statemachine',
      'architecture',
      'sequence',
    ]);
  });
});

describe('statemachine (tipe ke-4)', () => {
  it('entri registry sesuai spek', () => {
    const t = getDiagramType('statemachine');
    expect(t).not.toBe(DIAGRAM_TYPES.erd);
    expect(t).toMatchObject({
      id: 'statemachine',
      label: 'State Machine',
      labelPlural: 'State Machines',
      placeholder: 'Order Status',
      badge: 'STATE MACHINE',
      dataShape: 'graph',
      hasDbType: false,
      exports: { png: true, sql: false, json: false },
    });
  });

  it('helper mengenali tipe graph, bukan ERD', () => {
    expect(isGraphType('statemachine')).toBe(true);
    expect(isErdType('statemachine')).toBe(false);
  });
});
