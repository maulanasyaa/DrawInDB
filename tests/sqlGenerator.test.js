import { describe, it, expect } from 'vitest';
import { generateSQL } from '../src/utils/sqlGenerator.js';

/**
 * Diagram 2 tabel:
 *   users(id INTEGER PK)  ←  orders(id INTEGER PK, user_id INTEGER NOT NULL UNIQUE)
 * Relasi: users.id (source/parent) → orders.user_id (target/child)
 *
 * Catatan: `INTEGER` dipakai (bukan `INT`) karena itu satu-satunya tipe
 * integer yang ditawarkan UI untuk PostgreSQL & SQLite (`src/config/dbTypes.js`).
 */
function fixture(dbType) {
  return {
    meta: { db_type: dbType },
    tables: [
      {
        id: 'users',
        data: {
          name: 'users',
          columns: [
            { id: 'users.id', name: 'id', type: 'INTEGER', pk: true, fk: false, notNull: false, unique: false },
            { id: 'users.email', name: 'email', type: 'VARCHAR', pk: false, fk: false, notNull: false, unique: true },
          ],
        },
      },
      {
        id: 'orders',
        data: {
          name: 'orders',
          columns: [
            { id: 'orders.id', name: 'id', type: 'INTEGER', pk: true, fk: false, notNull: false, unique: false },
            { id: 'orders.user_id', name: 'user_id', type: 'INTEGER', pk: false, fk: true, notNull: true, unique: false },
          ],
        },
      },
    ],
    relationships: [
      {
        id: 'rel-1',
        source: 'users',
        sourceHandle: 'users.id',
        target: 'orders',
        targetHandle: 'orders.user_id',
      },
    ],
  };
}

const sql = (dbType) => generateSQL(fixture(dbType));

// Baseline diambil dari generator sebelum perbaikan (git HEAD 07aa897).
const MYSQL_SNAPSHOT = `CREATE TABLE \`users\` (
  \`id\` INTEGER NOT NULL AUTO_INCREMENT,
  \`email\` VARCHAR(255) UNIQUE,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE \`orders\` (
  \`id\` INTEGER NOT NULL AUTO_INCREMENT,
  \`user_id\` INTEGER NOT NULL,
  PRIMARY KEY (\`id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE \`orders\` ADD CONSTRAINT \`fk_orders_user_id\` FOREIGN KEY (\`user_id\`) REFERENCES \`users\` (\`id\`);
`;

const GENERIC_SNAPSHOT = `CREATE TABLE users (
  id INTEGER NOT NULL,
  email VARCHAR(255) UNIQUE,
  PRIMARY KEY (id)
);

CREATE TABLE orders (
  id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  PRIMARY KEY (id)
);

ALTER TABLE orders ADD CONSTRAINT fk_orders_user_id FOREIGN KEY (user_id) REFERENCES users (id);
`;

describe('sqlGenerator — MySQL', () => {
  const out = sql('mysql');

  it('PK: AUTO_INCREMENT + PRIMARY KEY (id)', () => {
    expect(out).toContain('`id` INTEGER NOT NULL AUTO_INCREMENT');
    expect(out).toContain('PRIMARY KEY (`id`)');
    expect(out).toContain('ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;');
  });

  it('NOT NULL pada kolom notNull', () => {
    expect(out).toContain('`user_id` INTEGER NOT NULL');
  });

  it('UNIQUE pada kolom unique', () => {
    expect(out).toContain('`email` VARCHAR(255) UNIQUE');
  });

  it('FK lewat ALTER TABLE', () => {
    expect(out).toContain(
      'ALTER TABLE `orders` ADD CONSTRAINT `fk_orders_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);',
    );
  });
});

describe('sqlGenerator — PostgreSQL', () => {
  const out = sql('postgresql');

  it('PK: SERIAL inline', () => {
    expect(out).toContain('"id" SERIAL PRIMARY KEY');
  });

  // Diperbaiki: PK tunggal SERIAL sudah inline, jadi tidak boleh ditambahkan
  // lagi sebagai constraint `PRIMARY KEY ("id")` (PG menolak DDL tersebut:
  // "multiple primary keys for table").
  it('tidak menggandakan PRIMARY KEY setelah SERIAL inline', () => {
    expect(out).not.toMatch(/PRIMARY KEY \("id"\)/);
  });

  it('NOT NULL pada kolom notNull', () => {
    expect(out).toContain('"user_id" INTEGER NOT NULL');
  });

  it('UNIQUE pada kolom unique', () => {
    expect(out).toContain('"email" VARCHAR(255) UNIQUE');
  });

  it('FK lewat ALTER TABLE dengan identifier ber-quote ganda', () => {
    expect(out).toContain(
      'ALTER TABLE "orders" ADD CONSTRAINT "fk_orders_user_id" FOREIGN KEY ("user_id") REFERENCES "users" ("id");',
    );
  });
});

describe('sqlGenerator — SQLite', () => {
  const out = sql('sqlite');

  it('PK: PRIMARY KEY AUTOINCREMENT, tanpa constraint PRIMARY KEY terpisah', () => {
    expect(out).toContain('id INTEGER PRIMARY KEY AUTOINCREMENT');
    expect(out).not.toMatch(/PRIMARY KEY \(/);
  });

  it('NOT NULL pada kolom notNull', () => {
    expect(out).toContain('user_id INTEGER NOT NULL');
  });

  it('UNIQUE pada kolom unique', () => {
    expect(out).toContain('email TEXT UNIQUE');
  });

  it('FK inline REFERENCES, tanpa ALTER TABLE', () => {
    // FK SQLite ditulis inline (dibahas di blok "FK inline & PK"). Kata
    // `FOREIGN KEY` tetap tidak muncul karena SQLite memakai `REFERENCES`.
    expect(out).not.toContain('ALTER TABLE');
    expect(out).not.toContain('FOREIGN KEY');
  });

  it('INT dipetakan ke INTEGER dan VARCHAR ke TEXT', () => {
    const mapped = generateSQL({
      meta: { db_type: 'sqlite' },
      tables: [
        {
          id: 't',
          data: {
            name: 't',
            columns: [
              { id: 't.a', name: 'a', type: 'INT', pk: false, fk: false, notNull: false, unique: false },
              { id: 't.b', name: 'b', type: 'VARCHAR', pk: false, fk: false, notNull: false, unique: false },
              { id: 't.c', name: 'c', type: 'DATETIME', pk: false, fk: false, notNull: false, unique: false },
            ],
          },
        },
      ],
      relationships: [],
    });
    expect(mapped).toContain('a INTEGER');
    expect(mapped).toContain('b TEXT');
    expect(mapped).toContain('c TEXT');
  });
});

describe('sqlGenerator — Generic', () => {
  const out = sql('generic');

  it('PK: baris PRIMARY KEY (id)', () => {
    expect(out).toContain('id INTEGER NOT NULL');
    expect(out).toContain('PRIMARY KEY (id)');
    expect(out).not.toContain('AUTO_INCREMENT');
  });

  it('NOT NULL pada kolom notNull', () => {
    expect(out).toContain('user_id INTEGER NOT NULL');
  });

  it('UNIQUE pada kolom unique', () => {
    expect(out).toContain('email VARCHAR(255) UNIQUE');
  });

  it('FK lewat ALTER TABLE tanpa quote', () => {
    expect(out).toContain(
      'ALTER TABLE orders ADD CONSTRAINT fk_orders_user_id FOREIGN KEY (user_id) REFERENCES users (id);',
    );
  });
});

describe('sqlGenerator — FK inline & PK', () => {
  // Diperbaiki: `getSQLiteInlineFK` dulu membandingkan `r.target` dengan
  // `tableData.id` (undefined, karena `generateSQL` mengirim `table.data`),
  // sehingga FOREIGN KEY SQLite tak pernah ditulis. Sekarang id tabel
  // diteruskan terpisah dari `table.data`.
  it('SQLite menulis FOREIGN KEY inline untuk kolom FK', () => {
    expect(sql('sqlite')).toContain('REFERENCES users(id)');
  });

  it('SQLite: 2 relasi ke 2 tabel sumber berbeda, keduanya inline', () => {
    const out = generateSQL({
      meta: { db_type: 'sqlite' },
      tables: [
        {
          id: 'users',
          data: {
            name: 'users',
            columns: [
              { id: 'users.id', name: 'id', type: 'INTEGER', pk: true, fk: false, notNull: false, unique: false },
            ],
          },
        },
        {
          id: 'products',
          data: {
            name: 'products',
            columns: [
              { id: 'products.id', name: 'id', type: 'INTEGER', pk: true, fk: false, notNull: false, unique: false },
              { id: 'products.sku', name: 'sku', type: 'TEXT', pk: false, fk: false, notNull: false, unique: true },
            ],
          },
        },
        {
          id: 'orders',
          data: {
            name: 'orders',
            columns: [
              { id: 'orders.id', name: 'id', type: 'INTEGER', pk: true, fk: false, notNull: false, unique: false },
              { id: 'orders.user_id', name: 'user_id', type: 'INTEGER', pk: false, fk: true, notNull: true, unique: false },
              { id: 'orders.sku', name: 'sku', type: 'TEXT', pk: false, fk: true, notNull: false, unique: false },
            ],
          },
        },
      ],
      relationships: [
        { id: 'rel-u', source: 'users', sourceHandle: 'users.id', target: 'orders', targetHandle: 'orders.user_id' },
        { id: 'rel-p', source: 'products', sourceHandle: 'products.sku', target: 'orders', targetHandle: 'orders.sku' },
      ],
    });

    expect(out).toContain('user_id INTEGER NOT NULL REFERENCES users(id)');
    expect(out).toContain('sku TEXT REFERENCES products(sku)');
    // PK tabel anak tidak dapat REFERENCES
    expect(out).toContain('id INTEGER PRIMARY KEY AUTOINCREMENT');
    expect(out).not.toContain('ALTER TABLE');
  });

  it('PostgreSQL: composite PK pakai constraint terpisah, tanpa SERIAL inline', () => {
    const out = generateSQL({
      meta: { db_type: 'postgresql' },
      tables: [
        {
          id: 'memberships',
          data: {
            name: 'memberships',
            columns: [
              { id: 'memberships.user_id', name: 'user_id', type: 'INTEGER', pk: true, fk: false, notNull: false, unique: false },
              { id: 'memberships.group_id', name: 'group_id', type: 'INTEGER', pk: true, fk: false, notNull: false, unique: false },
              { id: 'memberships.role', name: 'role', type: 'VARCHAR', pk: false, fk: false, notNull: false, unique: false },
            ],
          },
        },
      ],
      relationships: [],
    });

    expect(out).toContain('PRIMARY KEY ("user_id", "group_id")');
    expect(out).not.toContain('SERIAL');
    // PK komposit tidak boleh inline di baris kolom
    expect(out).not.toMatch(/"user_id" INTEGER (NOT NULL )?PRIMARY KEY/);
    expect(out).not.toMatch(/"group_id" INTEGER (NOT NULL )?PRIMARY KEY/);
  });
});

describe('sqlGenerator — umum', () => {
  // Snapshot dari output SEBELUM perbaikan FK-inline SQLite & PK SERIAL PG.
  // Perbaikan hanya menyentuh jalur SQLite + cabang PG, jadi output MySQL dan
  // Generic wajib identik byte-per-byte.
  it('output MySQL tidak berubah', () => {
    expect(sql('mysql')).toBe(MYSQL_SNAPSHOT);
  });

  it('output Generic tidak berubah', () => {
    expect(sql('generic')).toBe(GENERIC_SNAPSHOT);
  });

  it('db_type tidak dikenal diperlakukan seperti generic', () => {
    expect(generateSQL({ ...fixture('generic'), meta: {} })).toBe(sql('generic'));
  });

  it('diagram tanpa tabel menghasilkan string kosong', () => {
    expect(generateSQL(null)).toBe('');
    expect(generateSQL({})).toBe('');
  });

  it('tabel tanpa kolom diberi komentar, bukan error', () => {
    const out = generateSQL({
      meta: { db_type: 'mysql' },
      tables: [{ id: 't', data: { name: 'empty', columns: [] } }],
      relationships: [],
    });
    expect(out).toContain('-- Table empty has no columns');
  });

  it('relasi dengan handle tidak valid dilewati', () => {
    const d = fixture('mysql');
    d.relationships[0].targetHandle = 'tidak-ada';
    expect(generateSQL(d)).not.toContain('ALTER TABLE');
  });
});
