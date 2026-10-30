// Parser markdown minimal untuk preview dokumen. Menghasilkan token, BUKAN
// string HTML, jadi renderer JSX tidak perlu dangerouslySetInnerHTML.
// Ponytail: tanpa escaping `\*`, tanpa nested list, tanpa tabel/inline image.
// Cukup sampai itu tak lagi cukup.

const SAFE_HREF = /^https?:\/\//i;

const isBlank = (line) => !line.trim();
const isHeading = (line) => /^(#{1,3})\s+\S/.test(line);
const isHr = (line) => /^\s*([-*_])(\s*\1){2,}\s*$/.test(line);
const listMatch = (line) => /^\s*([-*+]|\d+\.)\s+(.*)$/.exec(line);
const isFence = (line) => /^\s*```/.test(line);

function indexOfClose(text, from, needle) {
  return text.indexOf(needle, from);
}

/** Parse inline: `code`, **bold**, *italic*, [teks](url). */
export function parseInline(text) {
  const src = String(text ?? "");
  const out = [];
  let buf = "";
  let i = 0;

  const flush = () => {
    if (buf) {
      out.push({ type: "text", value: buf });
      buf = "";
    }
  };

  while (i < src.length) {
    const ch = src[i];

    if (ch === "`") {
      const end = indexOfClose(src, i + 1, "`");
      if (end > i + 1) {
        flush();
        out.push({ type: "code", value: src.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    }

    if (ch === "*" && src[i + 1] === "*") {
      const end = indexOfClose(src, i + 2, "**");
      if (end > i + 2) {
        flush();
        out.push({ type: "strong", children: parseInline(src.slice(i + 2, end)) });
        i = end + 2;
        continue;
      }
    }

    if (ch === "*" && src[i + 1] !== "*") {
      const end = indexOfClose(src, i + 1, "*");
      if (end > i + 1) {
        flush();
        out.push({ type: "em", children: parseInline(src.slice(i + 1, end)) });
        i = end + 1;
        continue;
      }
    }

    if (ch === "[") {
      const close = src.indexOf("](", i + 1);
      if (close > i) {
        const end = src.indexOf(")", close + 2);
        if (end > close + 2) {
          const label = src.slice(i + 1, close);
          const href = src.slice(close + 2, end);
          if (SAFE_HREF.test(href)) {
            flush();
            out.push({ type: "link", href, children: parseInline(label) });
          } else {
            // URL tak aman (javascript:, data:, file:) dibiarkan sebagai teks biasa.
            buf += src.slice(i, end + 1);
          }
          i = end + 1;
          continue;
        }
      }
    }

    buf += ch;
    i += 1;
  }

  flush();
  return out;
}

/**
 * Parse block markdown: heading 1-3, fenced code, list (ul/ol),
 * horizontal rule, paragraf.
 */
export function parseMarkdown(text) {
  if (typeof text !== "string" || !text.trim()) return [];

  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const blocks = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (isBlank(line)) {
      i += 1;
      continue;
    }

    if (isFence(line)) {
      const code = [];
      i += 1;
      while (i < lines.length && !isFence(lines[i])) {
        code.push(lines[i]);
        i += 1;
      }
      i += 1; // lewati fence penutup (atau EOF)
      blocks.push({ type: "code", value: code.join("\n") });
      continue;
    }

    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    if (heading) {
      blocks.push({
        type: "heading",
        level: heading[1].length,
        inline: parseInline(heading[2]),
      });
      i += 1;
      continue;
    }

    if (isHr(line)) {
      blocks.push({ type: "hr" });
      i += 1;
      continue;
    }

    const list = listMatch(line);
    if (list) {
      const ordered = /\d/.test(list[1]);
      const items = [];
      while (i < lines.length) {
        const item = listMatch(lines[i]);
        if (!item) break;
        items.push(parseInline(item[2]));
        i += 1;
      }
      blocks.push({ type: "list", ordered, items });
      continue;
    }

    const paragraph = [line];
    i += 1;
    while (
      i < lines.length &&
      !isBlank(lines[i]) &&
      !isHeading(lines[i]) &&
      !isHr(lines[i]) &&
      !listMatch(lines[i]) &&
      !isFence(lines[i])
    ) {
      paragraph.push(lines[i]);
      i += 1;
    }
    blocks.push({ type: "paragraph", inline: parseInline(paragraph.join("\n")) });
  }

  return blocks;
}
