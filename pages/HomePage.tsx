import React, { useState } from 'react';
import { ZapIcon, LayersIcon, ActivityIcon, SearchIcon, ArrowLeftIcon } from '../components/Icons';
import { JarvisLogo } from '../components/Logo';
import { PageView } from '../types';
import { logActivity } from '../services/mongoService';
import { FileUploader } from '../components/FileUploader';

interface HomePageProps {
  onNavigate: (page: PageView, query?: string, file?: File) => void;
  onLogout?: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigate, onLogout }) => {
  const [activeTab, setActiveTab] = useState<'QUICK' | 'DEEP' | 'DOCS'>('QUICK');
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
    <div className="flex flex-col items-center justify-center h-full relative overflow-hidden p-6">
      
      {/* Logout Button - Top Right Corner */}
      {onLogout && (
        <button 
          onClick={onLogout}
          className="absolute top-4 right-4 px-3 py-1.5 text-xs font-mono text-slate-400 hover:text-white border border-slate-700 rounded-lg hover:border-cyan-500/50 transition-all z-20"
        >
          LOGOUT
        </button>
      )}
      
      {/* Brand Header */}
      <div className="z-10 flex flex-col items-center mb-8 animate-fade-in">
        <JarvisLogo size="md" className="mb-4 drop-shadow-[0_0_30px_rgba(6,182,212,0.6)]" />
        <h1 className="text-4xl md:text-5xl font-bold font-display text-transparent bg-clip-text bg-gradient-to-br from-white via-cyan-100 to-slate-400 tracking-tighter mb-2 text-center">
          JARVIS
        </h1>
        <p className="text-cyan-400/80 font-mono text-xs tracking-[0.3em] uppercase glow-text">
          AI Research Assistant
        </p>
      </div>

      {/* Pill Navigation & Interaction Zone */}
      <div className="z-10 w-full max-w-2xl flex flex-col items-center animate-fade-in animation-delay-200">
        
        {/* Pill Tabs - Normal Size */}
        <div className="flex p-1 bg-white/5 backdrop-blur-md rounded-full border border-white/10 mb-6 relative shadow-xl">
           {/* Slider Background */}
           <div 
             className={`absolute top-1 bottom-1 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600 shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all duration-300 ease-out z-0`}
             style={{
               left: activeTab === 'QUICK' ? '4px' : activeTab === 'DEEP' ? '33.33%' : '66.66%',
               width: 'calc(33.33% - 3px)',
               transform: activeTab !== 'QUICK' ? 'translateX(1.5px)' : 'translateX(0)'
             }}
           />

           <button 
             onClick={() => setActiveTab('QUICK')}
             className={`relative z-10 px-4 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-colors flex-1 flex items-center justify-center gap-2 ${activeTab === 'QUICK' ? 'text-white' : 'text-slate-400 hover:text-white'}`}
           >
             <ZapIcon className="w-4 h-4" /> Quick Research
           </button>
           <button 
             onClick={() => setActiveTab('DEEP')}
             className={`relative z-10 px-4 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-colors flex-1 flex items-center justify-center gap-2 ${activeTab === 'DEEP' ? 'text-white' : 'text-slate-400 hover:text-white'}`}
           >
             <LayersIcon className="w-4 h-4" /> Deep Research
           </button>
           <button 
             onClick={() => setActiveTab('DOCS')}
             className={`relative z-10 px-4 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition-colors flex-1 flex items-center justify-center gap-2 ${activeTab === 'DOCS' ? 'text-white' : 'text-slate-400 hover:text-white'}`}
           >
             <ActivityIcon className="w-4 h-4" /> Doc Analysis
           </button>
        </div>

        {/* Input Area */}
        <div className="w-full relative group perspective-1000">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-purple-500/10 rounded-xl blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          <div className="relative bg-[#0F1629]/80 backdrop-blur-lg border border-white/10 rounded-xl p-1.5 shadow-xl overflow-hidden transition-all duration-300 ring-1 ring-white/5 hover:ring-cyan-500/20">
            
            {activeTab !== 'DOCS' ? (
              <div className="flex items-center">
                 <div className="pl-4 pr-3">
                   <SearchIcon className={`w-5 h-5 transition-colors duration-300 ${activeTab === 'QUICK' ? 'text-amber-400' : 'text-cyan-400'}`} />
                 </div>
                 <input 
                   autoFocus
                   value={query}
                   onChange={(e) => setQuery(e.target.value)}
                   onKeyDown={(e) => e.key === 'Enter' && handleLaunch()}
                   placeholder={activeTab === 'QUICK' ? "Quick search..." : "Deep research..."}
                   className="flex-1 bg-transparent border-none outline-none text-base text-white placeholder-slate-500 py-4 font-light"
                 />
                 <button 
                   onClick={() => handleLaunch()}
                   disabled={!query.trim()}
                   className="mx-1.5 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold rounded-lg hover:shadow-[0_0_20px_rgba(6,182,212,0.5)] hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none disabled:scale-100 shadow-md border border-white/10 tracking-wide text-sm"
                 >
                   SEARCH
                 </button>
              </div>
            ) : (
              <div className="p-3">
                 <FileUploader onFileSelect={(file) => handleLaunch(file)} isLoading={false} />
              </div>
            )}
            
          </div>
        </div>

        {/* Helper Text */}
        <div className="mt-6 text-center animate-fade-in animation-delay-300">
           <p className="text-slate-500 text-xs font-mono uppercase tracking-widest">
             {activeTab === 'QUICK' && "Rapid Web Scraping • Summary Generation"}
             {activeTab === 'DEEP' && "Multi-Agent Recursion • Deep Reasoning"}
             {activeTab === 'DOCS' && "Long-Context RAG • PDF/CSV Analysis"}
           </p>
        </div>

      </div>

    </div>
  );
};