import React, { useEffect, useRef } from 'react';
import { LogEntry } from '../types';

interface ResearchLogsProps {
  logs: LogEntry[];
}

export const ResearchLogs: React.FC<ResearchLogsProps> = ({ logs }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  if (logs.length === 0) return null;

  return (
    <div className="h-full overflow-hidden flex flex-col font-mono text-[11px] leading-relaxed relative" ref={scrollRef}>
      {logs.map((log) => (
        <div key={log.id} className="mb-2 last:mb-0 animate-fade-in flex items-start group">
          <span className="text-slate-700 mr-2 shrink-0 select-none w-14">
            {log.timestamp.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
          <span className={`break-words flex-1
            ${log.type === 'error' ? 'text-red-400' : ''}
            ${log.type === 'success' ? 'text-emerald-400' : ''}
            ${log.type === 'info' ? 'text-cyan-300/80' : ''}
            ${log.type === 'system' ? 'text-purple-400 font-bold' : ''}
            ${log.type === 'thought' ? 'text-yellow-500/80 italic' : ''}
          `}>
            {log.type === 'info' && '> '}
            {log.type === 'success' && '✓ '}
            {log.type === 'error' && '✗ '}
            {log.type === 'system' && '⚡ '}
            {log.type === 'thought' && '// '}
            {log.message}
          </span>
        </div>
      ))}
      <div className="w-2 h-4 bg-cyan-500/50 animate-pulse mt-1"></div>
    </div>
  );
};