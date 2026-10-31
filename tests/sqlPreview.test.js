import { describe, it, expect } from 'vitest';
import { previewSql } from '../src/utils/sqlPreview.js';

const users = {
  id: 'users',
  data: {
    name: 'users',
    columns: [
      { id: 'users.id', name: 'id', type: 'INTEGER', pk: true, fk: false, notNull: false, unique: false },
    ],
  },
};

const orders = {
  id: 'orders',
  data: {
    name: 'orders',
    columns: [
      { id: 'orders.id', name: 'id', type: 'INTEGER', pk: true, fk: false, notNull: false, unique: false },
      { id: 'orders.user_id', name: 'user_id', type: 'INTEGER', pk: false, fk: true, notNull: true, unique: false },
    ],
  },
};

const rel = {
  id: 'rel-1',
  source: 'users',
  sourceHandle: 'users.id',
  target: 'orders',
  targetHandle: 'orders.user_id',
};

describe('previewSql', () => {
  it('tanpa tabel → string kosong (empty state, bukan error)', () => {
    expect(previewSql({ db_type: 'mysql' }, [], [], 'mysql')).toBe('');
  });

  it('tabel tanpa kolom → string kosong', () => {
    const noCols = { id: 't', data: { name: 't', columns: [] } };
    expect(previewSql({ db_type: 'generic' }, [noCols], [], 'generic')).toBe('');
  });

  it('tabel berkolom → memuat CREATE TABLE', () => {
    expect(previewSql({ db_type: 'generic' }, [users], [], 'generic')).toContain('CREATE TABLE users');
  });

  it('relasi → memuat ALTER TABLE (dialek non-SQLite)', () => {
    expect(previewSql({ db_type: 'generic' }, [users, orders], [rel], 'generic')).toContain('ALTER TABLE');
  });

  it('tanpa argumen dialek memakai meta.db_type', () => {
    expect(previewSql({ db_type: 'mysql' }, [users], [])).toContain('`users`');
  });

  it('argumen dialek menimpa meta tanpa memutasi meta asli', () => {
    const meta = { db_type: 'mysql' };
    expect(previewSql(meta, [users], [], 'postgresql')).toContain('"users"');
    expect(meta.db_type).toBe('mysql');
  });
});
