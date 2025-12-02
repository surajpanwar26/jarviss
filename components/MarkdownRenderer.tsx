import React from 'react';

interface MarkdownRendererProps {
  content: string;
}

const parseMarkdown = (text: string) => {
  if (!text) return '';
  
  let html = text.replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // Headers
  html = html.replace(/^### (.*$)/gim, '<h3 class="text-xl font-bold text-cyan-100 mt-6 mb-3">$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2 class="text-2xl font-bold text-white mt-8 mb-4 border-b border-white/10 pb-2">$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1 class="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 mb-6">$1</h1>');

  // Bold
  html = html.replace(/\*\*(.*?)\*\*/gim, '<strong class="text-cyan-300 font-semibold">$1</strong>');
  
  // Italic
  html = html.replace(/\*(.*?)\*/gim, '<em class="text-slate-300">$1</em>');

  // Lists
  html = html.replace(/^\s*-\s(.*$)/gim, '<li class="ml-4 mb-2 text-slate-300 list-disc marker:text-cyan-500">$1</li>');
  
  // Blockquotes
  html = html.replace(/^> (.*$)/gim, '<blockquote class="border-l-4 border-cyan-500/50 pl-4 py-1 my-4 bg-white/5 rounded-r text-slate-400 italic">$1</blockquote>');

  // Code blocks
  html = html.replace(/```([\s\S]*?)```/gim, '<pre class="bg-[#0B1221] p-4 rounded-lg my-4 overflow-x-auto border border-white/10"><code class="text-sm font-mono text-cyan-300">$1</code></pre>');
  html = html.replace(/`([^`]+)`/gim, '<code class="bg-white/10 px-1.5 py-0.5 rounded text-cyan-200 font-mono text-sm">$1</code>');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/gim, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-cyan-400 hover:text-cyan-300 underline underline-offset-4 decoration-cyan-500/30 hover:decoration-cyan-500 transition-all">$1</a>');

  // Line breaks
  html = html.replace(/\n/gim, '<br />');
  
  return html;
};

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  return (
    <div 
      className="markdown-body font-sans leading-relaxed"
      dangerouslySetInnerHTML={{ __html: parseMarkdown(content) }}
    />
  );
};