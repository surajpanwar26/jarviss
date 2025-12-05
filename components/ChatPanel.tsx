import React, { useState, useRef, useEffect } from 'react';
import { SendIcon, MessageSquareIcon } from './Icons';
import { ChatMessage } from '../types';

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  isLoading: boolean;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ messages, onSendMessage, isLoading }) => {
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input);
      setInput('');
    }
  };

  return (
    <div className="flex flex-col h-full bg-black/20 rounded-xl border border-white/10 overflow-hidden">
      <div className="p-4 border-b border-white/10 bg-white/5 flex items-center">
        <MessageSquareIcon className="w-4 h-4 text-cyan-400 mr-2" />
        <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider font-mono">AI Chatbot</h3>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center opacity-50">
            <MessageSquareIcon className="w-8 h-8 mb-2" />
            <p className="text-xs">Ask questions about the report...</p>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-lg p-3 text-sm leading-relaxed ${
                msg.role === 'user' 
                  ? 'bg-cyan-600/20 border border-cyan-500/30 text-cyan-100 rounded-br-none' 
                  : 'bg-white/10 border border-white/10 text-slate-200 rounded-bl-none'
              }`}>
                {msg.content}
              </div>
            </div>
          ))
        )}
        {isLoading && (
          <div className="flex justify-start">
             <div className="bg-white/10 border border-white/10 rounded-lg p-3 rounded-bl-none flex items-center h-10">
                <div className="text-slate-400 text-sm font-mono">Thinking...</div>
             </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-3 bg-white/5 border-t border-white/10">
        <div className="relative">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a follow-up question..."
            disabled={isLoading}
            className="w-full bg-black/40 border border-white/10 rounded-lg py-2.5 pl-4 pr-10 text-sm text-white placeholder-slate-500 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 outline-none transition-all"
          />
          <button 
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute right-2 top-2 p-1 text-slate-400 hover:text-cyan-400 disabled:opacity-30 disabled:hover:text-slate-400 transition-colors"
          >
            <SendIcon className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};
