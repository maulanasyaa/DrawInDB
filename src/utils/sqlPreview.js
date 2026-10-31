import { generateSQL } from './sqlGenerator';

/**
 * SQL untuk panel preview. `dbType` menimpa `meta.db_type` hanya untuk render
 * (store tidak disentuh). '' bila tidak ada CREATE TABLE — panel menampilkan
 * empty state, bukan error.
 */
export function previewSql(meta, tables, relationships, dbType) {
  const sql = generateSQL({
    meta: { ...meta, db_type: dbType || meta?.db_type || 'generic' },
    tables,
    relationships,
  });
  return sql.includes('CREATE TABLE') ? sql : '';
}
