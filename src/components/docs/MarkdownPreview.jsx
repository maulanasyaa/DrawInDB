import React from "react";
import { parseMarkdown } from "../../utils/markdown";

function Inline({ tokens }) {
  return tokens.map((token, i) => {
    switch (token.type) {
      case "text":
        return <React.Fragment key={i}>{token.value}</React.Fragment>;
      case "code":
        return (
          <code
            key={i}
            className="px-1.5 py-0.5 rounded bg-surface-2 border border-theme font-mono text-[0.9em]"
          >
            {token.value}
          </code>
        );
      case "strong":
        return (
          <strong key={i} className="font-semibold text-primary">
            <Inline tokens={token.children} />
          </strong>
        );
      case "em":
        return (
          <em key={i}>
            <Inline tokens={token.children} />
          </em>
        );
      case "link":
        return (
          <a
            key={i}
            href={token.href}
            target="_blank"
            rel="noreferrer noopener"
            className="text-primary underline underline-offset-2 decoration-theme hover:decoration-primary"
          >
            <Inline tokens={token.children} />
          </a>
        );
      default:
        return null;
    }
  });
}

const HEADING = {
  1: "text-2xl mt-2",
  2: "text-xl mt-4",
  3: "text-lg mt-3",
};

/**
 * Preview markdown dari token (bukan string HTML), jadi tidak ada
 * dangerouslySetInnerHTML dan tidak ada HTML dari user yang bisa dieksekusi.
 */
export default function MarkdownPreview({ text }) {
  const blocks = parseMarkdown(text);

  if (blocks.length === 0) {
    return <p className="text-sm text-muted italic">Empty section.</p>;
  }

  return (
    <div className="text-sm text-secondary leading-relaxed flex flex-col gap-3">
      {blocks.map((block, i) => {
        if (block.type === "heading") {
          return (
            <h3
              key={i}
              className={`font-display text-primary ${HEADING[block.level] || HEADING[3]}`}
            >
              <Inline tokens={block.inline} />
            </h3>
          );
        }

        if (block.type === "code") {
          return (
            <pre
              key={i}
              className="bg-base border border-theme rounded-lg p-3 overflow-x-auto font-mono text-xs text-primary whitespace-pre"
            >
              {block.value}
            </pre>
          );
        }

        if (block.type === "hr") {
          return <hr key={i} className="border-theme" />;
        }

        if (block.type === "list") {
          const List = block.ordered ? "ol" : "ul";
          return (
            <List
              key={i}
              className={`flex flex-col gap-1 pl-5 ${
                block.ordered ? "list-decimal" : "list-disc"
              }`}
            >
              {block.items.map((item, j) => (
                <li key={j}>
                  <Inline tokens={item} />
                </li>
              ))}
            </List>
          );
        }

        return (
          <p key={i} className="whitespace-pre-wrap">
            <Inline tokens={block.inline} />
          </p>
        );
      })}
    </div>
  );
}
