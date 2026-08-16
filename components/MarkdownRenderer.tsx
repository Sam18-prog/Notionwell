'use client';

import React, { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import Prism from 'prismjs';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-bash';
import 'prismjs/components/prism-json';
import 'prismjs/components/prism-sql';
import 'prismjs/components/prism-cpp';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export default function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  useEffect(() => {
    Prism.highlightAll();
  }, [content]);

  const handleCopyCode = (codeText: string) => {
    navigator.clipboard.writeText(codeText);
    setCopiedCode(codeText);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className={`prose dark:prose-invert max-w-none text-left leading-relaxed ${className}`}>
      <ReactMarkdown
        components={{
          code({ node, inline, className: codeClassName, children, ...props }: any) {
            const match = /language-(\w+)/.exec(codeClassName || '');
            const language = match ? match[1] : '';
            const codeText = String(children).replace(/\n$/, '');

            if (!inline && (match || codeText.includes('\n'))) {
              const langKey = language || 'code';
              return (
                <div className="relative my-3 rounded-2xl overflow-hidden border border-[#E2E8F0] dark:border-[#263449] bg-[#0F172A] text-[#F8FAFC] shadow-sm">
                  {/* CODE HEADER BAR */}
                  <div className="flex items-center justify-between px-4 py-2 bg-[#1E293B] border-b border-[#334155] text-xs font-mono text-[#94A3B8]">
                    <span className="uppercase font-bold tracking-wider text-[#60A5FA]">
                      {langKey}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopyCode(codeText)}
                      className="px-2.5 py-1 rounded-lg bg-[#334155] hover:bg-[#475569] text-white text-[11px] font-sans font-semibold transition-all"
                    >
                      {copiedCode === codeText ? '✓ Copied' : 'Copy'}
                    </button>
                  </div>

                  {/* CODE BLOCK CONTENT */}
                  <pre className="p-4 overflow-x-auto text-xs sm:text-sm font-mono leading-relaxed bg-[#0F172A] text-[#E2E8F0]">
                    <code className={`language-${langKey}`}>{codeText}</code>
                  </pre>
                </div>
              );
            }

            return (
              <code
                className="px-1.5 py-0.5 rounded-md bg-[#EFF6FF] dark:bg-[#172554] text-[#2563EB] dark:text-[#60A5FA] font-mono text-xs font-semibold border border-[#DBEAFE] dark:border-[#1E3A8A]"
                {...props}
              >
                {children}
              </code>
            );
          },
          h1: ({ children }) => (
            <h1 className="text-xl font-extrabold text-[#0F172A] dark:text-[#F8FAFC] my-2">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC] my-2">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-base font-bold text-[#0F172A] dark:text-[#F8FAFC] my-1">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="my-1.5 text-[#334155] dark:text-[#CBD5E1] text-sm sm:text-base leading-relaxed">
              {children}
            </p>
          ),
          ul: ({ children }) => (
            <ul className="list-disc list-inside my-2 space-y-1 text-sm text-[#334155] dark:text-[#CBD5E1]">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside my-2 space-y-1 text-sm text-[#334155] dark:text-[#CBD5E1]">
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="my-0.5">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-[#2563EB] dark:border-[#3B82F6] pl-4 italic my-3 text-[#475569] dark:text-[#94A3B8]">
              {children}
            </blockquote>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
