import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const VAULT = '/tmp/drawindb-test-vault';

function installFakeFs() {
  const files = new Map();
  const dirs = new Set();
  const touched = [];

  const api = {
    pathJoin: (...parts) => parts.filter(Boolean).join('/'),
    pathExists: async (p) =>
      files.has(p) || dirs.has(p) || [...files.keys()].some((k) => k.startsWith(`${p}/`)),
    readFile: async (p) => {
      if (!files.has(p)) throw new Error(`ENOENT: ${p}`);
      return files.get(p);
    },
    writeFile: async (p, content) => {
      files.set(p, content);
    },
    mkdir: async (p) => {
      dirs.add(p);
    },
    listFiles: async (p) => {
      const names = new Set();
      for (const key of files.keys()) {
        if (!key.startsWith(`${p}/`)) continue;
        names.add(key.slice(p.length + 1).split('/')[0]);
      }
      for (const d of dirs) {
        if (d.startsWith(`${p}/`)) names.add(d.slice(p.length + 1).split('/')[0]);
      }
      return [...names].map((name) => ({ name, isDirectory: !files.has(`${p}/${name}`) }));
    },
    saveRecentVault: async () => true,
    getRecentVaults: async () => [VAULT],
    setCurrentVaultPath: async (p) => {
      touched.push(p);
      return true;
    },
  };

  globalThis.window = { api };
  return { files, dirs, touched };
}

const vault = () => useVaultStore.getState().currentVault;

let useVaultStore;

beforeEach(async () => {
  vi.resetModules();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  ({ useVaultStore } = await import('../src/store/vaultStore.js'));
  useVaultStore.setState({ currentVault: null, isLoading: false, error: null });
});

afterEach(() => {
  vi.restoreAllMocks();
  delete globalThis.window;
});

describe('createVault', () => {
  it('menghasilkan bentuk vault yang sama dengan openVault (projects: [])', async () => {
    const { files } = installFakeFs();

    await useVaultStore.getState().createVault(VAULT);

    const state = useVaultStore.getState();
    expect(state.error).toBeNull();
    expect(state.isLoading).toBe(false);
    expect(vault()).toMatchObject({ path: VAULT, name: 'drawindb-test-vault', projects: [] });
    expect(files.has(`${VAULT}/.drawindb/config.json`)).toBe(true);
    expect(JSON.parse(files.get(`${VAULT}/.drawindb/config.json`)).vault_name).toBe(
      'drawindb-test-vault'
    );
  });

  it('menyetel guard IPC sebelum operasi file', async () => {
    const { touched } = installFakeFs();

    await useVaultStore.getState().createVault(VAULT);

    expect(touched).toContain(VAULT);
  });

  it('folder yang sudah berisi vault dibuka, bukan ditimpa', async () => {
    const { files } = installFakeFs();
    files.set(
      `${VAULT}/.drawindb/config.json`,
      JSON.stringify({ vault_name: 'existing' })
    );

    await useVaultStore.getState().createVault(VAULT);

    expect(useVaultStore.getState().error).toBeNull();
    expect(vault()).toMatchObject({ name: 'existing', projects: [] });
  });
});
