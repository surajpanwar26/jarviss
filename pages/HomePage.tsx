
import React, { useState } from 'react';
import { ZapIcon, LayersIcon, ActivityIcon, SearchIcon, ArrowLeftIcon } from '../components/Icons';
import { JarvisLogo } from '../components/Logo';
import { PageView } from '../types';
import { logActivity } from '../services/mongoService';
import { FileUploader } from '../components/FileUploader';

interface HomePageProps {
  onNavigate: (page: PageView, query?: string, file?: File) => void;
}

type TabMode = 'QUICK' | 'DEEP' | 'DOCS';

export const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState<TabMode>('QUICK');
  const [query, setQuery] = useState('');
  
  const handleLaunch = (file?: File) => {
    if (activeTab === 'DOCS') {
       if (file) {
         logActivity({ actionType: 'NAVIGATE', query: 'DOC_ANALYSIS' });
         onNavigate('DOC_ANALYSIS', undefined, file);
       }
       return;
    }

    if (!query.trim()) return;

    if (activeTab === 'QUICK') {
      logActivity({ actionType: 'NAVIGATE', query: 'QUICK_SEARCH' });
      onNavigate('QUICK_RESULT', query);
    } else {
      logActivity({ actionType: 'NAVIGATE', query: 'DEEP_RESEARCH' });
      onNavigate('DEEP_RESULT', query);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full relative overflow-hidden bg-[#0B0F19] p-6">
      
      {/* Brand Header */}
      <div className="z-10 flex flex-col items-center mb-12 animate-fade-in">
        <JarvisLogo size="lg" className="mb-8 drop-shadow-[0_0_30px_rgba(6,182,212,0.3)]" />
        <h1 className="text-6xl md:text-8xl font-bold font-display text-transparent bg-clip-text bg-gradient-to-br from-white via-cyan-100 to-slate-400 tracking-tighter mb-4 text-center">
          JARVIS
        </h1>
        <p className="text-cyan-400/80 font-mono text-sm tracking-[0.3em] uppercase glow-text">
          Advanced Neural Research System
        </p>
      </div>

      {/* Pill Navigation & Interaction Zone */}
      <div className="z-10 w-full max-w-3xl flex flex-col items-center animate-fade-in animation-delay-200">
        
        {/* Pill Tabs */}
        <div className="flex p-1 bg-white/5 backdrop-blur-md rounded-full border border-white/10 mb-8 relative">
           {/* Slider Background */}
           <div 
             className={`absolute top-1 bottom-1 rounded-full bg-cyan-600 shadow-[0_0_20px_rgba(8,145,178,0.4)] transition-all duration-300 ease-out z-0`}
             style={{
               left: activeTab === 'QUICK' ? '4px' : activeTab === 'DEEP' ? '33.33%' : '66.66%',
               width: 'calc(33.33% - 4px)',
               transform: activeTab !== 'QUICK' ? 'translateX(2px)' : 'translateX(0)'
             }}
           />

           <button 
             onClick={() => setActiveTab('QUICK')}
             className={`relative z-10 px-8 py-3 rounded-full text-sm font-bold uppercase tracking-wider transition-colors w-36 flex items-center justify-center gap-2 ${activeTab === 'QUICK' ? 'text-white' : 'text-slate-400 hover:text-white'}`}
           >
             <ZapIcon className="w-4 h-4" /> Quick
           </button>
           <button 
             onClick={() => setActiveTab('DEEP')}
             className={`relative z-10 px-8 py-3 rounded-full text-sm font-bold uppercase tracking-wider transition-colors w-36 flex items-center justify-center gap-2 ${activeTab === 'DEEP' ? 'text-white' : 'text-slate-400 hover:text-white'}`}
           >
             <LayersIcon className="w-4 h-4" /> Deep
           </button>
           <button 
             onClick={() => setActiveTab('DOCS')}
             className={`relative z-10 px-8 py-3 rounded-full text-sm font-bold uppercase tracking-wider transition-colors w-36 flex items-center justify-center gap-2 ${activeTab === 'DOCS' ? 'text-white' : 'text-slate-400 hover:text-white'}`}
           >
             <ActivityIcon className="w-4 h-4" /> Docs
           </button>
        </div>

        {/* Input Area */}
        <div className="w-full relative group perspective-1000">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          <div className="relative bg-[#0F1629]/80 backdrop-blur-xl border border-white/10 rounded-2xl p-2 shadow-2xl overflow-hidden transition-all duration-300 ring-1 ring-white/5 hover:ring-cyan-500/30">
            
            {activeTab !== 'DOCS' ? (
              <div className="flex items-center">
                 <div className="pl-6 pr-4">
                   <SearchIcon className={`w-6 h-6 transition-colors duration-300 ${activeTab === 'QUICK' ? 'text-amber-400' : 'text-cyan-400'}`} />
                 </div>
                 <input 
                   autoFocus
                   value={query}
                   onChange={(e) => setQuery(e.target.value)}
                   onKeyDown={(e) => e.key === 'Enter' && handleLaunch()}
                   placeholder={activeTab === 'QUICK' ? "Enter a topic for a quick briefing..." : "Enter complex topic for deep research..."}
                   className="flex-1 bg-transparent border-none outline-none text-lg text-white placeholder-slate-500 py-6 font-light"
                 />
                 <button 
                   onClick={() => handleLaunch()}
                   disabled={!query.trim()}
                   className="mx-2 px-8 py-4 bg-white text-black font-bold rounded-xl hover:bg-cyan-50 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none disabled:scale-100 shadow-[0_0_20px_rgba(255,255,255,0.2)]"
                 >
                   INITIATE
                 </button>
              </div>
            ) : (
              <div className="p-4">
                 <FileUploader onFileSelect={(file) => handleLaunch(file)} isLoading={false} />
              </div>
            )}
            
          </div>
        </div>

        {/* Helper Text */}
        <div className="mt-8 text-center animate-fade-in animation-delay-500">
           <p className="text-slate-500 text-xs font-mono uppercase tracking-widest mb-2">
             {activeTab === 'QUICK' && "Capabilities: Rapid Web Scraping • Summary Generation"}
             {activeTab === 'DEEP' && "Capabilities: Multi-Agent Recursion • Deep Reasoning • Fact Checking"}
             {activeTab === 'DOCS' && "Capabilities: Long-Context RAG • PDF/CSV Analysis • Q&A"}
           </p>
        </div>

      </div>

    </div>
  );
};
