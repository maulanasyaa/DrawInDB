/**
 * Bangun dokumen OpenAPI 3.1 dari diagram API Contract.
 * Node: endpoint / schema / tableref. Edge: endpoint → schema dengan
 * `data.kind` = 'req' (request body) atau 'res' (response 200). TableRef
 * murni visual (penghubung ke ERD), tidak ikut diekspor.
 */
const TYPE_ALIASES = { int: 'integer', str: 'string', num: 'number', bool: 'boolean' };

/** String format JSON Schema — bukan tipe; diekspor sebagai type:string + format. */
const SCHEMA_FORMATS = new Set(['date-time', 'uuid', 'email']);

/** Nama schema valid untuk $ref: tanpa spasi (Register Request → RegisterRequest). */
const safeSchemaName = (raw) => (raw || '').replace(/\s+/g, '') || null;

export function buildOpenApiExport(diagramMeta = {}, nodes = [], edges = []) {
  const paths = {};
  const schemas = {};

  const refFor = (targetId) => {
    const target = nodes.find((n) => n.id === targetId);
    const name = target ? safeSchemaName(target.data?.name) : null;
    if (!target || target.data?.kind !== 'schema' || !name) return null;
    return { $ref: `#/components/schemas/${name}` };
  };

  for (const n of nodes) {
    if (n.data?.kind !== 'endpoint') continue;
    const { method, path, summary = '', tags = [] } = n.data;
    if (!path || !method) continue;
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const op = { tags: [...tags], summary };

    for (const e of edges) {
      if (e.source !== n.id) continue;
      const schema = refFor(e.target);
      if (!schema) continue;
      const kind = e.data?.kind || 'res';
      if (kind === 'req') {
        op.requestBody = {
          required: true,
          content: { 'application/json': { schema } },
        };
      } else {
        op.responses = op.responses || {};
        op.responses['200'] = {
          description: 'OK',
          content: { 'application/json': { schema } },
        };
      }
    }
    op.responses = op.responses || { '200': { description: 'OK' } };

    paths[cleanPath] = paths[cleanPath] || {};
    paths[cleanPath][method.toLowerCase()] = op;
  }

  for (const n of nodes) {
    if (n.data?.kind !== 'schema') continue;
    const name = safeSchemaName(n.data?.name);
    if (!name) continue;
    const properties = {};
    const required = [];
    for (const f of n.data.fields || []) {
      if (!f.name) continue;
      const rawType = f.type || 'string';
      if (SCHEMA_FORMATS.has(rawType)) {
        properties[f.name] = { type: 'string', format: rawType };
      } else {
        properties[f.name] = { type: TYPE_ALIASES[rawType] || rawType };
      }
      if (f.required) required.push(f.name);
    }
    schemas[name] = {
      type: 'object',
      properties,
      ...(required.length ? { required } : {}),
    };
  }

  return {
    openapi: '3.1.0',
    info: { title: diagramMeta.name || 'Untitled API', version: '1.0.0' },
    paths,
    components: { schemas },
  };
}
