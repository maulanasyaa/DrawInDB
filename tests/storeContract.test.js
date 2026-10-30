import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { useEditorStore } from '../src/store/editorStore.js';

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '../src');

function walk(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

const FILES = walk(SRC).filter((f) => /\.(jsx?|mjs)$/.test(f));

/** Nama state yang benar-benar ada di store. */
const STORE_KEYS = new Set(Object.keys(useEditorStore.getState()));

describe('kontrak store ↔ komponen', () => {
  /**
   * Ambil nama state dari setiap pemakaian useEditorStore(...).
   * Pola yang dikenali: `useEditorStore((state) => state.x)`,
   * `useEditorStore(state => state.x)`, dan destructure
   * `const { a, b } = useEditorStore()`.
   */
  function storeReferences(file) {
    const src = readFileSync(file, 'utf8');
    const names = [];

    for (const m of src.matchAll(/useEditorStore\(([\s\S]{0,120}?)\)\s*[,;\n]/g)) {
      const body = m[1];
      const param = body.match(/^\s*(?:\(\s*([\w$]+)\s*\)|([\w$]+))\s*=>/);
      if (param) {
        const p = param[1] || param[2];
        for (const ref of body.matchAll(new RegExp(`\\b${p}\\s*\\.\\s*([\\w$]+)`, 'g'))) {
          names.push(ref[1]);
        }
      } else {
        for (const ref of body.matchAll(/[\w$]+/g)) names.push(ref[0]);
      }
    }
    return names;
  }

  // Masih gagal: src/hooks/useEditorShortcuts.js memakai `state.forceSave`
  // yang tidak ada di store (mod+S mati). File itu di luar cakupan refactor
  // ini dan tidak di-import siapa pun; ganti ke `it` setelah hook dirapikan
  // atau dihapus.
  it.fails('semua `state.<nama>` yang dipakai komponen ada di editorStore', () => {
    const missing = [];

    for (const file of FILES) {
      if (file.endsWith('store/editorStore.js')) continue;
      if (!readFileSync(file, 'utf8').includes('useEditorStore')) continue;

      for (const name of storeReferences(file)) {
        if (!STORE_KEYS.has(name)) missing.push(`${file.replace(`${SRC}/`, '')}: state.${name}`);
      }
    }

    expect([...new Set(missing)]).toEqual([]);
  });

  it('detektor benar-benar membaca selector (sanity check)', () => {
    // Kalau regex rusak dan tak menghasilkan apa pun, test di atas lolos palsu.
    const found = FILES.flatMap((f) =>
      readFileSync(f, 'utf8').includes('useEditorStore') ? storeReferences(f) : [],
    );
    expect(found).toContain('diagramMeta');
    expect(found).toContain('tables');
  });

  // Kebalikan dari di atas: menangkap import yang tersisa setelah simbol
  // sumbernya di-rename atau dihapus.
  it('tidak ada import mati dari utils/', () => {
    const dead = [];
    for (const file of FILES) {
      const src = readFileSync(file, 'utf8');
      for (const m of src.matchAll(/import\s*\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]/g)) {
        const names = m[1].split(',').map((n) => n.trim().split(/\s+as\s+/)[0]).filter(Boolean);
        const spec = m[2];
        if (!spec.startsWith('.')) continue;
        const target = resolve(dirname(file), spec.endsWith('.js') ? spec : `${spec}.js`);
        let targetSrc;
        try {
          targetSrc = readFileSync(target, 'utf8');
        } catch {
          continue; // .jsx / file tak ada
        }
        for (const name of names) {
          const used = new RegExp(`\\b${name}\\b`, 'g');
          const occurrences = (src.match(used) || []).length;
          if (occurrences <= 1) dead.push(`${file.replace(`${SRC}/`, '')}: ${name} (dari ${spec})`);
        }
      }
    }
    expect([...new Set(dead)]).toEqual([]);
  });

  it('tidak ada sisa referensi isNodeBasedType di src/', () => {
    const hits = FILES.filter((f) =>
      readFileSync(f, 'utf8').includes('isNodeBasedType'),
    ).map((f) => f.replace(`${SRC}/`, ''));

    expect(hits).toEqual([]);
  });

  it('tidak ada lagi deteksi tipe inline `isFlowchart || isUseCase`', () => {
    const legacy = FILES.filter((f) => {
      if (f.endsWith('config/diagramTypes.js')) return false;
      return readFileSync(f, 'utf8')
        .split('\n')
        .some((line) => /isFlowchart\s*\|\|\s*isUseCase/.test(line));
    });
    expect(legacy.map((f) => f.replace(`${SRC}/`, ''))).toEqual([]);
  });
});
