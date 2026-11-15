import React from 'react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
  if (!content) return null;

  // Render paragraphs, headings, bullet points, and tables nicely
  const lines = content.split('\n');
  const renderedElements: React.ReactNode[] = [];
  let inList = false;
  let listItems: string[] = [];

  const flushList = () => {
    if (listItems.length > 0) {
      renderedElements.push(
        <ul key={`ul-${renderedElements.length}`} className="list-disc list-inside space-y-1 my-2 text-slate-700">
          {listItems.map((item, idx) => (
            <li key={idx} className="leading-relaxed">
              {renderFormattedInline(item)}
            </li>
          ))}
        </ul>
      );
      listItems = [];
      inList = false;
    }
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    // Headings
    if (trimmed.startsWith('### ')) {
      flushList();
      renderedElements.push(
        <h3 key={index} className="text-base font-bold text-slate-900 mt-4 mb-2 flex items-center gap-2">
          <span className="w-1.5 h-4 bg-indigo-600 rounded-full inline-block"></span>
          {renderFormattedInline(trimmed.replace('### ', ''))}
        </h3>
      );
    } else if (trimmed.startsWith('## ')) {
      flushList();
      renderedElements.push(
        <h2 key={index} className="text-lg font-bold text-slate-900 mt-5 mb-2 pb-1 border-b border-slate-200">
          {renderFormattedInline(trimmed.replace('## ', ''))}
        </h2>
      );
    } else if (trimmed.startsWith('# ')) {
      flushList();
      renderedElements.push(
        <h1 key={index} className="text-xl font-extrabold text-slate-900 mt-6 mb-3">
          {renderFormattedInline(trimmed.replace('# ', ''))}
        </h1>
      );
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || /^\d+\.\s/.test(trimmed)) {
      inList = true;
      listItems.push(trimmed.replace(/^[-*]\s+|\d+\.\s+/, ''));
    } else if (trimmed === '') {
      flushList();
    } else {
      flushList();
      renderedElements.push(
        <p key={index} className="text-sm text-slate-700 leading-relaxed mb-3">
          {renderFormattedInline(trimmed)}
        </p>
      );
    }
  });

  flushList();

  return <div className={`prose-custom ${className}`}>{renderedElements}</div>;
};

function renderFormattedInline(text: string): React.ReactNode {
  // Simple regex parser for **bold** and `code`
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let keyIdx = 0;

  while (remaining) {
    const boldMatch = remaining.match(/\*\*(.*?)\*\*/);
    const codeMatch = remaining.match(/`(.*?)`/);

    if (boldMatch && (!codeMatch || boldMatch.index! < codeMatch.index!)) {
      const before = remaining.substring(0, boldMatch.index);
      if (before) parts.push(before);
      parts.push(
        <strong key={keyIdx++} className="font-semibold text-slate-900">
          {boldMatch[1]}
        </strong>
      );
      remaining = remaining.substring(boldMatch.index! + boldMatch[0].length);
    } else if (codeMatch) {
      const before = remaining.substring(0, codeMatch.index);
      if (before) parts.push(before);
      parts.push(
        <code key={keyIdx++} className="px-1.5 py-0.5 rounded bg-slate-100 text-indigo-600 font-mono text-xs">
          {codeMatch[1]}
        </code>
      );
      remaining = remaining.substring(codeMatch.index! + codeMatch[0].length);
    } else {
      parts.push(remaining);
      break;
    }
  }

  return <>{parts}</>;
}
