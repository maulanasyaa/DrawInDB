import { describe, it, expect, afterEach } from 'vitest';
import { useEditorStore } from '../src/store/editorStore.js';
import { CONNECT_STRATEGIES } from '../src/config/connectStrategies.js';
import { EDITOR_TYPES } from '../src/config/editorTypes.jsx';
import { buildOpenApiExport } from '../src/utils/openapiExport.js';
import { seed, restore, s } from './helpers.js';

const API = { type: 'apicontract', name: 'Orders API' };

afterEach(restore);

describe('editorStore API Contract — addApiNode', () => {
  it('endpoint default GET + path default', () => {
    seed(API);
    s().addApiNode('endpoint', { x: 5, y: 6 });
    const n = s().nodes[0];
    expect(n.id).toMatch(/^api-\d+-\d+$/);
    expect(n.type).toBe('apicontract');
    expect(n.position).toEqual({ x: 5, y: 6 });
    expect(n.data.kind).toBe('endpoint');
    expect(n.data.method).toBe('GET');
    expect(n.data.path).toBe('/api/resource');
    expect(n.data.summary).toBe('');
    expect(n.data.tags).toEqual([]);
  });

  it('schema dimulai kosong', () => {
    seed(API);
    s().addApiNode('schema', { x: 0, y: 0 });
    expect(s().nodes[0].data.kind).toBe('schema');
    expect(s().nodes[0].data.name).toBe('Schema');
    expect(s().nodes[0].data.fields).toEqual([]);
  });

  it('tableref menyimpan referensi ERD', () => {
    seed(API);
    s().addApiNode('tableref', { x: 0, y: 0 });
    const n = s().nodes[0];
    expect(n.data.kind).toBe('tableref');
    expect(n.data.tableName).toBe('');
    expect(n.data.erdFilename).toBe('');
  });

  it('tableref dengan data ERD dari sidebar', () => {
    seed(API);
    s().addApiNode('tableref', { x: 0, y: 0 }, { tableName: 'users', erdFilename: 'schema_erd.json', erdName: 'Schema' });
    const n = s().nodes[0];
    expect(n.data.tableName).toBe('users');
    expect(n.data.erdFilename).toBe('schema_erd.json');
    expect(n.data.erdName).toBe('Schema');
  });
});

describe('registry editor API Contract', () => {
  it('nodeTypes memakai satu kunci per tipe (dispatcher apicontract)', () => {
    expect(Object.keys(EDITOR_TYPES.apicontract.nodeTypes)).toEqual(['apicontract']);
  });
});

describe('connectStrategies apicontract', () => {
  const setupPair = () => {
    seed(API);
    s().addApiNode('endpoint', { x: 0, y: 0 });
    s().addApiNode('schema', { x: 200, y: 0 });
    const [ep, sc] = s().nodes;
    return { ep, sc };
  };

  it('handle req → edge berlabel request', () => {
    const { ep, sc } = setupPair();
    const patch = CONNECT_STRATEGIES.apicontract(
      { source: ep.id, target: sc.id, sourceHandle: 'req', targetHandle: null },
      { get: s },
    );
    const edge = patch.flowEdges[0];
    expect(edge.data.kind).toBe('req');
    expect(edge.label).toBe('request');
  });

  it('handle res → edge berlabel response', () => {
    const { ep, sc } = setupPair();
    const patch = CONNECT_STRATEGIES.apicontract(
      { source: ep.id, target: sc.id, sourceHandle: 'res', targetHandle: null },
      { get: s },
    );
    expect(patch.flowEdges[0].data.kind).toBe('res');
  });

  it('self-loop ditolak', () => {
    seed(API);
    s().addApiNode('endpoint', { x: 0, y: 0 });
    const [ep] = s().nodes;
    const patch = CONNECT_STRATEGIES.apicontract(
      { source: ep.id, target: ep.id, sourceHandle: 'res', targetHandle: null },
      { get: s },
    );
    expect(patch).toBeNull();
  });
});

describe('openapiExport', () => {
  it('menghasilkan OpenAPI 3.1 dari endpoint+schema', () => {
    const nodes = [
      { id: 'api-1-1', type: 'apicontract', position: { x: 0, y: 0 }, data: { kind: 'endpoint', method: 'POST', path: '/orders', summary: 'Buat pesanan', tags: ['orders'] } },
      { id: 'api-1-2', type: 'apicontract', position: { x: 200, y: 0 }, data: { kind: 'schema', name: 'Order', fields: [{ id: 'f1', name: 'id', type: 'integer', required: true }] } },
    ];
    const edges = [
      { id: 'api-e1', source: 'api-1-1', target: 'api-1-2', sourceHandle: 'req', data: { kind: 'req' } },
      { id: 'api-e2', source: 'api-1-1', target: 'api-1-2', sourceHandle: 'res', data: { kind: 'res' } },
    ];
    const doc = buildOpenApiExport({ name: 'Orders API', type: 'apicontract' }, nodes, edges);
    expect(doc.openapi).toMatch(/^3\.1\./);
    expect(doc.info.title).toBe('Orders API');
    expect(doc.paths['/orders'].post.summary).toBe('Buat pesanan');
    expect(doc.paths['/orders'].post.tags).toEqual(['orders']);
    expect(doc.components.schemas.Order.properties.id.type).toBe('integer');
    expect(doc.components.schemas.Order.required).toEqual(['id']);
    expect(doc.paths['/orders'].post.requestBody.content['application/json'].schema.$ref).toBe('#/components/schemas/Order');
    expect(doc.paths['/orders'].post.responses['200'].content['application/json'].schema.$ref).toBe('#/components/schemas/Order');
  });

  it('menormalkan nama schema + alias tipe (valid OpenAPI)', () => {
    const nodes = [
      { id: 'api-a', type: 'apicontract', position: { x: 0, y: 0 }, data: { kind: 'endpoint', method: 'POST', path: '/register', summary: '', tags: [] } },
      { id: 'api-b', type: 'apicontract', position: { x: 0, y: 0 }, data: { kind: 'schema', name: 'Register Request', fields: [
        { id: 'f1', name: 'id', type: 'int', required: true },
        { id: 'f2', name: 'ok', type: 'bool', required: false },
        { id: 'f3', name: 'email', type: 'str', required: true },
        { id: 'f4', name: 'score', type: 'num', required: false },
        { id: 'f5', name: 'born', type: 'date', required: false },
      ] } },
    ];
    const edges = [{ id: 'e1', source: 'api-a', target: 'api-b', sourceHandle: 'res', data: { kind: 'res' } }];
    const doc = buildOpenApiExport({ name: 'test', type: 'apicontract' }, nodes, edges);
    expect(doc.components.schemas.RegisterRequest).toBeTruthy();
    expect(doc.components.schemas['Register Request']).toBeUndefined();
    expect(doc.components.schemas.RegisterRequest.properties.id.type).toBe('integer');
    expect(doc.components.schemas.RegisterRequest.properties.ok.type).toBe('boolean');
    expect(doc.components.schemas.RegisterRequest.properties.email.type).toBe('string');
    expect(doc.components.schemas.RegisterRequest.properties.score.type).toBe('number');
    expect(doc.components.schemas.RegisterRequest.properties.born.type).toBe('date');
    expect(doc.paths['/register'].post.responses['200'].content['application/json'].schema.$ref).toBe('#/components/schemas/RegisterRequest');
  });

  it('endpoint tanpa schema tetap valid', () => {
    const nodes = [{ id: 'api-1-1', type: 'apicontract', position: { x: 0, y: 0 }, data: { kind: 'endpoint', method: 'GET', path: '/health', summary: '', tags: [] } }];
    const doc = buildOpenApiExport({ name: 'Health', type: 'apicontract' }, nodes, []);
    expect(doc.paths['/health'].get.responses['200'].description).toBe('OK');
    expect(doc.components.schemas).toEqual({});
  });
});
