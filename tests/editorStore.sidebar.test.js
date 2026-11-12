import { describe, it, expect, afterEach } from 'vitest';
import { seed, restore, s } from './helpers.js';

afterEach(restore);

describe('editorStore sidebar — toggleSidebar', () => {
  it('default sidebar terbuka (true)', () => {
    seed({ type: 'flowchart' });
    expect(s().isSidebarOpen).toBe(true);
  });

  it('toggle menutup lalu membuka lagi', () => {
    seed({ type: 'flowchart' });
    expect(s().isSidebarOpen).toBe(true);

    s().toggleSidebar();
    expect(s().isSidebarOpen).toBe(false);

    s().toggleSidebar();
    expect(s().isSidebarOpen).toBe(true);
  });
});
