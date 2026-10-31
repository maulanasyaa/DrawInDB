import { describe, it, expect } from 'vitest';
import { parseMarkdown, parseInline } from '../src/utils/markdown.js';

const types = (tokens) => tokens.map((t) => t.type);

describe('parseInline', () => {
  it('teks biasa jadi satu token text', () => {
    expect(parseInline('hello world')).toEqual([{ type: 'text', value: 'hello world' }]);
  });

  it('code inline', () => {
    expect(parseInline('a `b` c')).toEqual([
      { type: 'text', value: 'a ' },
      { type: 'code', value: 'b' },
      { type: 'text', value: ' c' },
    ]);
  });

  it('bold dan italic', () => {
    expect(parseInline('**b**')[0]).toMatchObject({ type: 'strong' });
    expect(parseInline('*i*')[0]).toMatchObject({ type: 'em' });
  });

  it('backtick tanpa pasangan dibiarkan teks', () => {
    expect(parseInline('a `b')).toEqual([{ type: 'text', value: 'a `b' }]);
  });

  it('link http(s) jadi token link', () => {
    expect(parseInline('[docs](https://example.com)')).toEqual([
      { type: 'link', href: 'https://example.com', children: [{ type: 'text', value: 'docs' }] },
    ]);
  });

  it('menolak javascript: dan data: URL', () => {
    for (const url of ['javascript:alert(1)', 'data:text/html,x', 'file:///etc/passwd']) {
      const tokens = parseInline(`[x](${url})`);
      expect(types(tokens)).toEqual(['text']);
      expect(tokens[0].value).toContain(url.slice(0, 10));
    }
  });
});

describe('parseMarkdown', () => {
  it('string kosong / bukan string', () => {
    expect(parseMarkdown('')).toEqual([]);
    expect(parseMarkdown(null)).toEqual([]);
    expect(parseMarkdown('   \n ')).toEqual([]);
  });

  it('heading 1-3 dengan level', () => {
    const blocks = parseMarkdown('# A\n## B\n### C\n#### not');
    expect(blocks.slice(0, 3)).toEqual([
      { type: 'heading', level: 1, inline: [{ type: 'text', value: 'A' }] },
      { type: 'heading', level: 2, inline: [{ type: 'text', value: 'B' }] },
      { type: 'heading', level: 3, inline: [{ type: 'text', value: 'C' }] },
    ]);
    expect(blocks[3].type).toBe('paragraph');
  });

  it('unordered & ordered list', () => {
    const [ul, ol] = parseMarkdown('- a\n- b\n\n1. x\n2. y');
    expect(ul).toMatchObject({ type: 'list', ordered: false });
    expect(ul.items).toHaveLength(2);
    expect(ol).toMatchObject({ type: 'list', ordered: true });
    expect(ol.items).toHaveLength(2);
  });

  it('fenced code mengambil isi apa adanya', () => {
    const [block] = parseMarkdown('```\n**not bold**\n```');
    expect(block).toEqual({ type: 'code', value: '**not bold**' });
  });

  it('paragraph multi-baris digabung', () => {
    const [block] = parseMarkdown('line one\nline two');
    expect(block.type).toBe('paragraph');
    expect(block.inline[0].value).toBe('line one\nline two');
  });

  it('hr', () => {
    expect(parseMarkdown('---')).toEqual([{ type: 'hr' }]);
  });

  it('teks berbahaya tidak jadi link', () => {
    const [block] = parseMarkdown('[klik](javascript:alert(1))');
    expect(block.inline.some((t) => t.type === 'link')).toBe(false);
  });
});
