export function generateSQL(diagram) {
  if (!diagram || !diagram.tables) return '';

  const dbType = diagram.meta?.db_type || 'generic';
  let sql = '';

  // 1. Generate tables
  for (const table of diagram.tables) {
    sql += generateTableSQL(table.data, dbType, diagram.relationships, diagram.tables) + '\n\n';
  }

  // 2. Generate Foreign Keys (for non-SQLite)
  if (dbType !== 'sqlite' && diagram.relationships && diagram.relationships.length > 0) {
    const fks = generateForeignKeys(diagram.relationships, diagram.tables, dbType);
    if (fks) {
      sql += fks + '\n';
    }
  }

  return sql.trim() + '\n';
}

export function generateTableSQL(tableData, dbType, relationships = [], allTables = []) {
  if (!tableData.columns || tableData.columns.length === 0) {
    return `-- Table ${tableData.name} has no columns`;
  }

  const tableName = escapeIdentifier(tableData.name, dbType);
  let lines = [];
  let primaryKeys = [];

  for (const col of tableData.columns) {
    let line = `  ${escapeIdentifier(col.name, dbType)} ${formatType(col.type, dbType)}`;

    if (dbType === 'postgresql' && col.pk && (col.type === 'INTEGER' || col.type === 'BIGINT')) {
       // SERIAL shorthand for PG
       line = `  ${escapeIdentifier(col.name, dbType)} ${col.type === 'BIGINT' ? 'BIGSERIAL' : 'SERIAL'} PRIMARY KEY`;
       primaryKeys.push(col.name); // Still track, but don't add constraint line
    } else if (dbType === 'sqlite' && col.pk && col.type === 'INTEGER') {
      line += ' PRIMARY KEY AUTOINCREMENT';
      primaryKeys.push(col.name);
    } else {
      if (col.notNull || col.pk) line += ' NOT NULL';
      if (col.unique) line += ' UNIQUE';
      if (dbType === 'mysql' && col.pk && (col.type === 'INT' || col.type === 'BIGINT' || col.type === 'INTEGER')) {
        line += ' AUTO_INCREMENT';
      }
    }

    // SQLite Inline Foreign Keys
    if (dbType === 'sqlite') {
      const inlineFk = getSQLiteInlineFK(tableData, col, relationships, allTables);
      if (inlineFk) {
        line += ` ${inlineFk}`;
      }
    }

    lines.push(line);
    
    // Track PKs for non-shorthand dialects
    if (col.pk && !(dbType === 'postgresql' && (col.type === 'INTEGER' || col.type === 'BIGINT')) && !(dbType === 'sqlite' && col.type === 'INTEGER')) {
      primaryKeys.push(col.name);
    }
  }

  if (primaryKeys.length > 0 && dbType !== 'sqlite') {
    // Only add PK constraint if we didn't inline it (PG SERIAL / SQLite AUTOINCREMENT)
    const pks = primaryKeys.map(pk => escapeIdentifier(pk, dbType)).join(', ');
    lines.push(`  PRIMARY KEY (${pks})`);
  }

  let sql = `CREATE TABLE ${tableName} (\n${lines.join(',\n')}\n)`;

  if (dbType === 'mysql') {
    sql += ' ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;';
  } else {
    sql += ';';
  }

  return sql;
}

export function generateForeignKeys(relationships, tables, dbType) {
  let alterStatements = [];

  for (const rel of relationships) {
    const sourceTable = tables.find(t => t.id === rel.source);
    const targetTable = tables.find(t => t.id === rel.target);

    if (!sourceTable || !targetTable) continue;

    // source is the parent (referenced), target is the child (referencing)
    // Actually, React Flow edges are drawn from Source handle to Target handle.
    // Usually Source = Parent PK, Target = Child FK.
    const sourceCol = sourceTable.data.columns.find(c => c.id === rel.sourceHandle);
    const targetCol = targetTable.data.columns.find(c => c.id === rel.targetHandle);

    if (!sourceCol || !targetCol) continue;

    const childTableName = escapeIdentifier(targetTable.data.name, dbType);
    const childColName = escapeIdentifier(targetCol.name, dbType);
    const parentTableName = escapeIdentifier(sourceTable.data.name, dbType);
    const parentColName = escapeIdentifier(sourceCol.name, dbType);
    
    const constraintName = escapeIdentifier(`fk_${targetTable.data.name}_${targetCol.name}`, dbType);

    alterStatements.push(
      `ALTER TABLE ${childTableName} ADD CONSTRAINT ${constraintName} FOREIGN KEY (${childColName}) REFERENCES ${parentTableName} (${parentColName});`
    );
  }

  return alterStatements.join('\n');
}

// Helpers

function escapeIdentifier(name, dbType) {
  switch (dbType) {
    case 'mysql': return `\`${name}\``;
    case 'postgresql': return `"${name}"`;
    default: return name; // sqlite, generic
  }
}

function formatType(type, dbType) {
  let t = type.toUpperCase();
  if (t === 'INT' && (dbType === 'postgresql' || dbType === 'sqlite' || dbType === 'generic')) return 'INTEGER';
  if (t === 'DATETIME' && dbType === 'postgresql') return 'TIMESTAMP';
  if (t === 'DATETIME' && dbType === 'sqlite') return 'TEXT';
  // SQLite type affinities
  if (dbType === 'sqlite' && t.includes('VARCHAR')) return 'TEXT';
  if (t.includes('VARCHAR') && !t.includes('(')) return 'VARCHAR(255)';
  return t;
}

function getSQLiteInlineFK(tableData, col, relationships, allTables) {
  // Find if this column is a target in any relationship
  const rel = relationships.find(r => r.target === tableData.id && r.targetHandle === col.id); // Assuming target is child
  if (!rel) return null;

  const sourceTable = allTables.find(t => t.id === rel.source);
  if (!sourceTable) return null;

  const sourceCol = sourceTable.data.columns.find(c => c.id === rel.sourceHandle);
  if (!sourceCol) return null;

  return `REFERENCES ${sourceTable.data.name}(${sourceCol.name})`;
}
