import { describe, it, expect } from 'vitest';
import { pngFileName, nodesMeasured } from '../src/utils/exportImage.js';

describe('pngFileName', () => {
  it('spasi jadi underscore dan huruf kecil', () => {
    expect(pngFileName('Login Flow')).toBe('login_flow.png');
  });

  it('nama bercampur karakter dipertahankan selain spasi', () => {
    expect(pngFileName('Order-Status v2')).toBe('order-status_v2.png');
  });

  it('nama kosong jatuh ke diagram.png', () => {
    expect(pngFileName('')).toBe('diagram.png');
    expect(pngFileName(undefined)).toBe('diagram.png');
  });
});

describe('nodesMeasured', () => {
  it('true bila semua node punya width & height', () => {
    expect(nodesMeasured([
      { id: 'a', width: 80, height: 130 },
      { id: 'b', width: 160, height: 80 },
    ])).toBe(true);
  });

  it('false bila satu node belum terukur', () => {
    expect(nodesMeasured([
      { id: 'a', width: 80, height: 130 },
      { id: 'b' },
    ])).toBe(false);
  });

  it('false bila ukuran masih 0', () => {
    expect(nodesMeasured([{ id: 'a', width: 0, height: 130 }])).toBe(false);
  });

  it('array kosong dianggap siap (guard kosong ada di pemanggil)', () => {
    expect(nodesMeasured([])).toBe(true);
    expect(nodesMeasured(undefined)).toBe(true);
  });
});
