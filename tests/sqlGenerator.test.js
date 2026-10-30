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

  // BUG (belum diperbaiki): cabang "track PK untuk constraint terpisah" di
  // sqlGenerator.js:61 lupa mengecualikan PK SERIAL, sehingga output memuat
  // `"id" SERIAL PRIMARY KEY` DAN `PRIMARY KEY ("id")` sekaligus. PostgreSQL
  // menolak DDL tersebut ("multiple primary keys for table"). Kode lama sama
  // rusak — bukan regresi P0.
  it.fails('tidak menggandakan PRIMARY KEY setelah SERIAL inline', () => {
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
    // FK SQLite dibahas di blok "bug terverifikasi": generator saat ini
    // tidak pernah menuliskannya. Yang dikunci di sini: tidak ada ALTER TABLE.
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

describe('sqlGenerator — bug terverifikasi', () => {
  // BUG: `getSQLiteInlineFK` mencari relasi dengan `r.target === tableData.id`,
  // tapi `generateTableSQL` menerima `table.data` (tanpa field `id`) dari
  // `generateSQL`. Akibatnya kondisi tak pernah cocok dan SQL SQLite untuk
  // diagram apa pun tidak pernah memuat FOREIGN KEY. Kode lama sama rusak —
  // bukan regresi P0. Pecah kondisi jadi `find(...)` murni + `it`.
  it.fails('SQLite menulis FOREIGN KEY inline untuk kolom FK', () => {
    expect(sql('sqlite')).toContain('REFERENCES users(id)');
  });
});

describe('sqlGenerator — umum', () => {
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
