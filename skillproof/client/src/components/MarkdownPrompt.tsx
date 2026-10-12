import React from 'react';

interface MarkdownPromptProps {
  content: string;
  className?: string;
}

/**
 * Parses inline code `like this` into styled inline code elements.
 */
function renderInlineCode(text: string): React.ReactNode[] {
  const parts = text.split(/(`[^`]+`)/g);
  return parts.map((part, index) => {
    if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
      const code = part.slice(1, -1);
      return (
        <code
          key={index}
          className="px-1.5 py-0.5 mx-0.5 rounded-md bg-slate-100 border border-slate-300 font-mono text-[0.85em] font-semibold text-blue-700"
        >
          {code}
        </code>
      );
    }
    return <React.Fragment key={index}>{part}</React.Fragment>;
  });
}

/**
 * Renders markdown text with ``` code fences and `inline code`.
 */
export const MarkdownPrompt: React.FC<MarkdownPromptProps> = ({ content, className = '' }) => {
  if (!content) return null;

  // Split on code fences ```lang ... ``` or ``` ... ```
  const codeBlockRegex = /```(?:[a-zA-Z0-9_-]+)?\n?([\s\S]*?)```/g;
  const segments: { type: 'text' | 'code'; text: string }[] = [];

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      segments.push({
        type: 'text',
        text: content.slice(lastIndex, match.index),
      });
    }
    segments.push({
      type: 'code',
      text: match[1]?.trim() || '',
    });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    segments.push({
      type: 'text',
      text: content.slice(lastIndex),
    });
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {segments.map((seg, idx) => {
        if (seg.type === 'code') {
          return (
            <div
              key={idx}
              className="my-3 rounded-2xl bg-slate-900 border border-slate-800 p-4 font-mono text-xs text-emerald-400 overflow-x-auto shadow-inner leading-relaxed"
            >
              <pre>
                <code>{seg.text}</code>
              </pre>
            </div>
          );
        }

        // Split text by newlines into paragraphs
        const paragraphs = seg.text.split('\n').filter((p) => p.trim().length > 0);
        return (
          <React.Fragment key={idx}>
            {paragraphs.map((para, pIdx) => (
              <p key={pIdx} className="leading-relaxed">
                {renderInlineCode(para)}
              </p>
            ))}
          </React.Fragment>
        );
      })}
    </div>
  );
};

