/**
 * Bangun dokumen OpenAPI 3.1 dari diagram API Contract.
 * Node: endpoint / schema / tableref. Edge: endpoint → schema dengan
 * `data.kind` = 'req' (request body) atau 'res' (response 200). TableRef
 * murni visual (penghubung ke ERD), tidak ikut diekspor.
 */
export function buildOpenApiExport(diagramMeta = {}, nodes = [], edges = []) {
  const paths = {};
  const schemas = {};

  const refFor = (targetId) => {
    const target = nodes.find((n) => n.id === targetId);
    if (!target || target.data?.kind !== 'schema' || !target.data.name) return null;
    return { $ref: `#/components/schemas/${target.data.name}` };
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
    if (n.data?.kind !== 'schema' || !n.data.name) continue;
    const properties = {};
    const required = [];
    for (const f of n.data.fields || []) {
      if (!f.name) continue;
      properties[f.name] = { type: f.type || 'string' };
      if (f.required) required.push(f.name);
    }
    schemas[n.data.name] = {
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
