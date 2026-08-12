/**
 * KatexRenderer — renders a string that may contain:
 *  - KaTeX inline math:  $...$
 *  - KaTeX block math:   $$...$$
 *  - Plain HTML (from legacy content)
 *
 * Strategy: replace $...$ and $$...$$ with rendered KaTeX HTML spans,
 * then set the result via dangerouslySetInnerHTML.
 */
import React from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

function renderLatex(raw: string): string {
  if (!raw) return "";

  let result = raw;

  // Block math $$...$$ (must come before inline to avoid double-processing)
  result = result.replace(/\$\$([\s\S]+?)\$\$/g, (_, math) => {
    try {
      return katex.renderToString(math.trim(), { displayMode: true, throwOnError: false });
    } catch {
      return `<span class="katex-error">$$${math}$$</span>`;
    }
  });

  // Inline math $...$
  result = result.replace(/\$([^\$\n]+?)\$/g, (_, math) => {
    try {
      return katex.renderToString(math.trim(), { displayMode: false, throwOnError: false });
    } catch {
      return `<span class="katex-error">$${math}$</span>`;
    }
  });

  return result;
}

interface Props {
  content: string;
  className?: string;
  /** If true, wraps in a block div; otherwise inline span */
  block?: boolean;
}

export function KatexRenderer({ content, className = "", block = true }: Props) {
  const html = React.useMemo(() => renderLatex(content ?? ""), [content]);
  if (block) {
    return (
      <div
        className={className}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }
  return (
    <span
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
