import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createRequire } from 'node:module';
import {
  mkdtempSync,
  mkdirSync,
  writeFileSync,
  symlinkSync,
  rmSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
const { isProjectScopedPath, assertSafeToTrash } = require('../electron/pathGuard.js');

const VAULT = '/vault';
const P1 = `${VAULT}/projects/p1`;

describe('isProjectScopedPath (leksikal)', () => {
  it.each([
    `${P1}`,
    `${P1}/diagrams/a_erd.json`,
    `${P1}/docs/a.json`,
    `${VAULT}/projects/p1/deep/nested.json`,
  ])('menerima %s', (path) => {
    expect(isProjectScopedPath(VAULT, path)).toBe(true);
  });

  it.each([
    [VAULT, 'vault root'],
    [`${VAULT}/projects`, 'folder projects'],
    [`${VAULT}/.drawindb/config.json`, '.drawindb'],
    [`${VAULT}/.drawindb/../../projects/p1/x.json`, 'traversal lewat .drawindb'],
    [`${VAULT}/diagrams/x.json`, 'folder lama di root vault'],
    [`${VAULT}/projects/../diagrams/x.json`, 'traversal balik ke root'],
    [`${VAULT}/projects/p1/../../etc/passwd`, 'traversal keluar vault'],
    ['/tmp/other/x.json', 'di luar vault'],
    ['', 'string kosong'],
    [null, 'null'],
    [undefined, 'undefined'],
    [42, 'non-string'],
  ])('menolak %s (%s)', (path) => {
    expect(isProjectScopedPath(VAULT, path)).toBe(false);
  });

  it('menolak project id tersembunyi', () => {
    expect(isProjectScopedPath(VAULT, `${VAULT}/projects/.hidden/x.json`)).toBe(false);
  });
});

describe('assertSafeToTrash', () => {
  let root;

  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'drawindb-guard-'));
    mkdirSync(join(root, 'projects', 'p1', 'diagrams'), { recursive: true });
    mkdirSync(join(root, 'projects', 'p2', 'diagrams'), { recursive: true });
    writeFileSync(join(root, 'projects', 'p1', 'diagrams', 'a_erd.json'), '{}');
    mkdirSync(join(root, '.drawindb'), { recursive: true });
  });

  afterEach(() => {
    rmSync(root, { recursive: true, force: true });
  });

  it('menerima file di dalam project', async () => {
    await expect(
      assertSafeToTrash(root, join(root, 'projects', 'p1', 'diagrams', 'a_erd.json')),
    ).resolves.toBeUndefined();
  });

  it('menerima folder project utuh', async () => {
    await expect(assertSafeToTrash(root, join(root, 'projects', 'p1'))).resolves.toBeUndefined();
  });

  it('menolak saat vault belum dibuka', async () => {
    await expect(assertSafeToTrash(null, join(root, 'projects', 'p1'))).rejects.toThrow(
      'no vault is open',
    );
  });

  it('menolak target yang tidak ada', async () => {
    await expect(
      assertSafeToTrash(root, join(root, 'projects', 'p1', 'diagrams', 'missing.json')),
    ).rejects.toThrow();
  });

  it('menolak vault root dan .drawindb meski ada di disk', async () => {
    await expect(assertSafeToTrash(root, root)).rejects.toThrow('not inside a project');
    await expect(assertSafeToTrash(root, join(root, '.drawindb'))).rejects.toThrow(
      'not inside a project',
    );
  });

  it.skipIf(process.platform === 'win32')(
    'menolak symlink di dalam project yang menunjuk keluar vault',
    async () => {
      const outside = mkdtempSync(join(tmpdir(), 'drawindb-outside-'));
      try {
        writeFileSync(join(outside, 'secret.txt'), 'x');
        symlinkSync(join(outside, 'secret.txt'), join(root, 'projects', 'p1', 'diagrams', 'evil.json'));

        await expect(
          assertSafeToTrash(root, join(root, 'projects', 'p1', 'diagrams', 'evil.json')),
        ).rejects.toThrow('escapes');
      } finally {
        rmSync(outside, { recursive: true, force: true });
      }
    },
  );

  it.skipIf(process.platform === 'win32')(
    'menolak folder project yang di-symlink ke project lain',
    async () => {
      rmSync(join(root, 'projects', 'p2'), { recursive: true, force: true });
      symlinkSync(join(root, 'projects', 'p1'), join(root, 'projects', 'p2'));

      await expect(assertSafeToTrash(root, join(root, 'projects', 'p2'))).rejects.toThrow('escapes');
    },
  );
});
