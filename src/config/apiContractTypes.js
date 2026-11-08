// API Contract: konstanta terpusat untuk tipe diagram apicontract.

export const API_METHODS = [
  { method: 'GET', color: '#10b981' },
  { method: 'POST', color: '#3b82f6' },
  { method: 'PUT', color: '#f59e0b' },
  { method: 'PATCH', color: '#8b5cf6' },
  { method: 'DELETE', color: '#ef4444' },
];

export const API_METHOD_COLOR = (method) =>
  API_METHODS.find((m) => m.method === method)?.color || '#71717a';

export const API_NODE_KINDS = ['endpoint', 'schema', 'tableref'];

export const API_DEFAULT_PATH = '/api/resource';
export const API_DEFAULT_SCHEMA_NAME = 'Schema';
export const API_DEFAULT_TAG = 'default';

/** Koneksi dari Endpoint (sourceHandle) → schema. */
export const API_EDGE_KIND_LABELS = {
  req: 'request',
  res: 'response',
};
