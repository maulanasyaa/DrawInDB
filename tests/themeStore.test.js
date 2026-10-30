import { describe, it, expect, vi, beforeEach } from 'vitest';

function stubBrowser() {
  const storage = new Map();
  const attrs = {};

  vi.stubGlobal('localStorage', {
    getItem: (k) => (storage.has(k) ? storage.get(k) : null),
    setItem: (k, v) => storage.set(k, String(v)),
    removeItem: (k) => storage.delete(k),
  });
  vi.stubGlobal('document', {
    documentElement: { setAttribute: (k, v) => { attrs[k] = v; } },
  });

  return { storage, attrs };
}

let store;
let browser;

beforeEach(async () => {
  vi.resetModules();
  browser = stubBrowser();
  ({ useThemeStore: store } = await import('../src/store/themeStore.js'));
});

describe('themeStore', () => {
  it('setTheme menulis data-theme dan menyimpan ke localStorage', () => {
    store.getState().setTheme('dark');

    expect(browser.attrs['data-theme']).toBe('dark');
    const saved = JSON.parse(browser.storage.get('drawindb-theme'));
    expect(saved.state.theme).toBe('dark');
  });

  it('toggleTheme membalik tema dan ikut menyimpan', () => {
    store.getState().setTheme('light');
    store.getState().toggleTheme();

    expect(store.getState().theme).toBe('dark');
    expect(browser.attrs['data-theme']).toBe('dark');
    expect(JSON.parse(browser.storage.get('drawindb-theme')).state.theme).toBe('dark');
  });

  it('tema tersimpan dipakai lagi saat store dibuat ulang', async () => {
    store.getState().setTheme('dark');

    vi.resetModules();
    const { useThemeStore: reloaded } = await import('../src/store/themeStore.js');

    expect(reloaded.getState().theme).toBe('dark');
  });
});
