import { describe, it, expect, afterEach } from 'vitest';
import {
  seed,
  restore,
  s,
  table,
  col,
  colsOf,
  findCol,
} from './helpers.js';

const ERD = { type: 'erd', name: 'Test ERD', db_type: 'mysql' };

// Setup ERD: users.id (PK) <- orders.user_id (FK)
function seedErd() {
  seed(ERD, {
    tables: [
      table('users', 'users', [col('users.id', 'id', 'INT', { pk: true })]),
      table('orders', 'orders', [
        col('orders.id', 'id', 'INT', { pk: true }),
        col('orders.user_id', 'user_id', 'INT'),
      ]),
    ],
  });
}

function connectUserToOrder() {
  s().onConnect({
    source: 'users',
    sourceHandle: 'users.id',
    target: 'orders',
    targetHandle: 'orders.user_id',
  });
}

// users.id (PK) -> orders.user_id <- admins.id (PK): dua relasi, satu kolom target.
function seedTwoParentsToOneCol() {
  seed(ERD, {
    tables: [
      table('users', 'users', [col('users.id', 'id', 'INT', { pk: true })]),
      table('admins', 'admins', [col('admins.id', 'id', 'INT', { pk: true })]),
      table('orders', 'orders', [col('orders.user_id', 'user_id', 'INT')]),
    ],
  });
  s().onConnect({
    source: 'users',
    sourceHandle: 'users.id',
    target: 'orders',
    targetHandle: 'orders.user_id',
  });
  s().onConnect({
    source: 'admins',
    sourceHandle: 'admins.id',
    target: 'orders',
    targetHandle: 'orders.user_id',
  });
}

afterEach(restore);

describe('editorStore ERD — table', () => {
  it('addTable menambah tabel baru dengan kolom kosong', () => {
    seed(ERD);
    s().addTable({ x: 10, y: 20 });

    expect(s().tables).toHaveLength(1);
    const t = s().tables[0];
    expect(t.id).toMatch(/^table-\d+$/);
    expect(t.type).toBe('table');
    expect(t.position).toEqual({ x: 10, y: 20 });
    expect(t.data).toEqual({ name: 'new_table', columns: [] });
    expect(s().isDirty).toBe(true);
  });

  it('updateTable merge data tanpa menghapus kolom', () => {
    seedErd();
    const otherBefore = s().tables.find((x) => x.id === 'orders');
    s().updateTable('users', { name: 'app_users' });

    const t = s().tables.find((x) => x.id === 'users');
    expect(t.data.name).toBe('app_users');
    expect(t.data.columns).toHaveLength(1);
    expect(s().tables.find((x) => x.id === 'orders')).toBe(otherBefore);
  });

  it('deleteTable menghapus tabel + relasi terkait + reset selectedTableId', () => {
    seedErd();
    connectUserToOrder();
    s().setSelectedTable('orders');
    expect(s().relationships).toHaveLength(1);
    expect(findCol('orders.user_id').fk).toBe(true);

    s().deleteTable('orders');

    expect(s().tables.map((t) => t.id)).toEqual(['users']);
    expect(s().relationships).toEqual([]);
    expect(s().selectedTableId).toBe(null);
  });
});

describe('editorStore ERD — column', () => {
  it('addColumn menambah kolom dengan default lengkap', () => {
    seedErd();
    s().addColumn('users');

    const cols = colsOf('users');
    expect(cols).toHaveLength(2);
    expect(cols[1]).toMatchObject({
      name: 'new_column',
      type: 'VARCHAR',
      pk: false,
      fk: false,
      notNull: false,
      unique: false,
    });
    expect(cols[1].id).toMatch(/^col-\d+$/);
  });

  it('updateColumn merge field kolom saja', () => {
    seedErd();
    s().updateColumn('orders', 'orders.user_id', {
      name: 'customer_id',
      notNull: true,
    });

    const c = findCol('orders.user_id');
    expect(c.name).toBe('customer_id');
    expect(c.notNull).toBe(true);
    expect(c.type).toBe('INT');
    expect(c.fk).toBe(false);
    expect(findCol('orders.id').name).toBe('id');
  });

  it('deleteColumn menghapus kolom dan relasi yang menyentuhnya', () => {
    seedErd();
    connectUserToOrder();
    expect(s().relationships).toHaveLength(1);

    s().deleteColumn('orders', 'orders.user_id');

    expect(findCol('orders.user_id')).toBeUndefined();
    expect(s().relationships).toEqual([]);
    expect(colsOf('orders').map((c) => c.id)).toEqual(['orders.id']);
  });

  it('deleteColumn kolom target membersihkan FK kolom pasangan', () => {
    seedErd();
    connectUserToOrder();

    s().deleteColumn('users', 'users.id');

    expect(findCol('users.id')).toBeUndefined();
    expect(s().relationships).toEqual([]);
    expect(findCol('orders.user_id').fk).toBe(false);
  });

  it('deleteColumn kolom source tidak menyentuh FK kolom target relasi lain', () => {
    seed(ERD, {
      tables: [
        table('users', 'users', [
          col('users.id', 'id', 'INT', { pk: true }),
          col('users.email', 'email', 'VARCHAR', { pk: true }),
        ]),
        table('orders', 'orders', [col('orders.user_id', 'user_id', 'INT')]),
        table('logs', 'logs', [col('logs.user_id', 'user_id', 'INT')]),
      ],
    });
    s().onConnect({
      source: 'users',
      sourceHandle: 'users.id',
      target: 'orders',
      targetHandle: 'orders.user_id',
    });
    s().onConnect({
      source: 'users',
      sourceHandle: 'users.email',
      target: 'logs',
      targetHandle: 'logs.user_id',
    });
    expect(s().relationships).toHaveLength(2);

    // Hanya relasi ke orders yang ikut terhapus; relasi ke logs tetap hidup.
    s().deleteColumn('users', 'users.id');

    expect(s().relationships).toHaveLength(1);
    expect(findCol('orders.user_id').fk).toBe(false);
    expect(findCol('logs.user_id').fk).toBe(true);
  });

  it('reorderColumns memindahkan kolom ke indeks tujuan', () => {
    seedErd();
    s().addColumn('orders'); // orders: id, user_id, new_column

    s().reorderColumns('orders', 2, 0);

    expect(colsOf('orders').map((c) => c.name)).toEqual([
      'new_column',
      'id',
      'user_id',
    ]);
  });
});

describe('editorStore ERD — FK lifecycle', () => {
  it('onConnect menandai FK + menyamakan tipe pada kolom child (parent = PK)', () => {
    seedErd();
    connectUserToOrder();

    expect(s().relationships).toHaveLength(1);
    expect(s().relationships[0]).toMatchObject({
      source: 'users',
      sourceHandle: 'users.id',
      target: 'orders',
      targetHandle: 'orders.user_id',
      type: 'smoothstep',
      animated: false,
    });

    const child = findCol('orders.user_id');
    expect(child.fk).toBe(true);
    expect(child.type).toBe('INT');
  });

  it('onConnect tidak menandai FK bila handle kolom tidak valid', () => {
    seedErd();
    s().onConnect({
      source: 'users',
      sourceHandle: 'tidak-ada',
      target: 'orders',
      targetHandle: 'orders.user_id',
    });

    expect(s().relationships).toEqual([]);
    expect(findCol('orders.user_id').fk).toBe(false);
  });

  it('onEdgesChange remove membersihkan FK kolom target', () => {
    seedErd();
    connectUserToOrder();
    const relId = s().relationships[0].id;
    expect(findCol('orders.user_id').fk).toBe(true);

    s().onEdgesChange([{ id: relId, type: 'remove' }]);

    expect(s().relationships).toEqual([]);
    expect(findCol('orders.user_id').fk).toBe(false);
  });

  it('onEdgesChange remove TIDAK membersihkan FK bila masih ada relasi lain ke kolom yang sama', () => {
    seedTwoParentsToOneCol();
    expect(new Set(s().relationships.map((r) => r.id)).size).toBe(2);

    s().onEdgesChange([{ id: s().relationships[0].id, type: 'remove' }]);

    expect(s().relationships).toHaveLength(1);
    expect(findCol('orders.user_id').fk).toBe(true);
  });

  it('deleteRelationship membersihkan FK kolom target', () => {
    seedErd();
    connectUserToOrder();
    expect(findCol('orders.user_id').fk).toBe(true);

    s().deleteRelationship(s().relationships[0].id);

    expect(s().relationships).toEqual([]);
    expect(findCol('orders.user_id').fk).toBe(false);
  });

  it('dua relasi ke satu kolom: FK hilang hanya saat relasi terakhir dihapus', () => {
    seedTwoParentsToOneCol();

    s().deleteRelationship(s().relationships[0].id);
    expect(s().relationships).toHaveLength(1);
    expect(findCol('orders.user_id').fk).toBe(true);

    s().deleteRelationship(s().relationships[0].id);
    expect(s().relationships).toEqual([]);
    expect(findCol('orders.user_id').fk).toBe(false);
  });
});
