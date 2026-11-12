export const DB_DATA_TYPES = {
  mysql: [
    "INT", "BIGINT", "SMALLINT", "TINYINT",
    "DECIMAL", "FLOAT", "DOUBLE",
    "VARCHAR", "TEXT", "LONGTEXT", "CHAR",
    "DATE", "DATETIME", "TIMESTAMP", "TIME",
    "BOOLEAN", "JSON", "BLOB", "ENUM"
  ],
  postgresql: [
    "INTEGER", "BIGINT", "SMALLINT",
    "NUMERIC", "REAL", "DOUBLE PRECISION",
    "VARCHAR", "TEXT", "CHAR",
    "DATE", "TIMESTAMP", "TIMESTAMPTZ", "TIME",
    "BOOLEAN", "JSON", "JSONB", "UUID", "BYTEA",
    "SERIAL", "BIGSERIAL"
  ],
  sqlite: [
    "INTEGER", "REAL", "TEXT", "BLOB", "NUMERIC"
  ],
  generic: [
    "INTEGER", "BIGINT", "DECIMAL", "FLOAT",
    "VARCHAR", "TEXT", "CHAR",
    "DATE", "DATETIME",
    "BOOLEAN", "JSON", "BLOB", "ENUM"
  ]
};

/**
 * Tipe yang menerima argumen ukuran/limit (mis. VARCHAR(10), DECIMAL(10,2)).
 * ENUM sengaja tidak masuk karena argumennya daftar nilai, bukan angka.
 */
export const LENGTH_TYPES = new Set(['VARCHAR', 'CHAR', 'DECIMAL', 'NUMERIC']);
