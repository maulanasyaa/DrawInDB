import { describe, it, expect, afterEach, vi } from 'vitest';
import { copyText } from '../src/utils/clipboard.js';

// Node 22 punya `navigator` sebagai getter-only, jadi stub lewat vi.stubGlobal.
afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function stubClipboard(writeText) {
  vi.stubGlobal('navigator', { clipboard: { writeText } });
}

describe('copyText', () => {
  it('memakai navigator.clipboard bila tersedia', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubClipboard(writeText);

    await expect(copyText('# hi')).resolves.toBe(true);
    expect(writeText).toHaveBeenCalledWith('# hi');
  });

  it('jatuh ke execCommand saat clipboard ditolak', async () => {
    stubClipboard(vi.fn().mockRejectedValue(new Error('denied')));

    const removed = [];
    const execCommand = vi.fn().mockReturnValue(true);
    vi.stubGlobal('document', {
      body: { appendChild: () => {}, removeChild: (el) => removed.push(el) },
      createElement: () => ({ style: {}, setAttribute() {}, select() {}, value: '' }),
      execCommand,
    });

    await expect(copyText('fallback')).resolves.toBe(true);
    expect(execCommand).toHaveBeenCalledWith('copy');
    expect(removed).toHaveLength(1); // textarea selalu dibersihkan
  });

  it('kedua jalur gagal → false, tidak melempar', async () => {
    stubClipboard(vi.fn().mockRejectedValue(new Error('denied')));
    vi.stubGlobal('document', {
      body: { appendChild: () => {}, removeChild: () => {} },
      createElement: () => ({ style: {}, setAttribute() {}, select() {} }),
      execCommand: () => false,
    });

    await expect(copyText('x')).resolves.toBe(false);
  });

  it('tanpa navigator dan tanpa document → false', async () => {
    vi.stubGlobal('navigator', {});
    vi.stubGlobal('document', undefined);

    await expect(copyText('x')).resolves.toBe(false);
  });

  it('null/undefined disalin sebagai string kosong', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    stubClipboard(writeText);

    await copyText(null);
    expect(writeText).toHaveBeenCalledWith('');
  });
});
