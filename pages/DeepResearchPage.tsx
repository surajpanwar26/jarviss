import React, { useState, useRef, useEffect } from 'react';
import { ResearchWorkflow } from '../services/agentSystem';
import { ResearchLogs } from '../components/ResearchLogs';
import { MarkdownRenderer } from '../components/MarkdownRenderer';
import { ChatPanel } from '../components/ChatPanel';
import { LayersIcon, GlobeIcon, ArrowLeftIcon, DownloadIcon, FileIcon } from '../components/Icons';
import { ResearchStatus, LogEntry, AgentEvent, ResearchResult, ChatMessage } from '../types';
import { askFollowUp } from '../services/analysisService';
import { logActivity } from '../services/mongoService';
import { exportToPDF, exportToDOCX } from '../services/exportService';

const generateId = () => Math.random().toString(36).substr(2, 9);

interface DeepResearchPageProps {
  initialQuery?: string;
  onBack: () => void;
}

export const DeepResearchPage: React.FC<DeepResearchPageProps> = ({ initialQuery, onBack }) => {
  const [query, setQuery] = useState(initialQuery || '');
  const [status, setStatus] = useState<ResearchStatus>(ResearchStatus.IDLE);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [result, setResult] = useState<ResearchResult | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const [activeTab, setActiveTab] = useState<'report'|'images'>('report');
  const [streamedReport, setStreamedReport] = useState('');
  const [showExportMenu, setShowExportMenu] = useState(false);
  
  const workflowRef = useRef<ResearchWorkflow>(new ResearchWorkflow());
  const hasRun = useRef(false);

  useEffect(() => {
    if (initialQuery && !hasRun.current) {
      runResearch(initialQuery);
      hasRun.current = true;
    }
  }, [initialQuery]);

  const runResearch = async (topic: string) => {
    setStatus(ResearchStatus.PLANNING);
    setLogs([]);
    setResult(null);
    setStreamedReport('');
    setQuery(topic);
    
    logActivity({ actionType: 'DEEP_RESEARCH', query: topic });

    const unsubscribe = workflowRef.current.subscribe((event: AgentEvent) => {
      if (event.type === 'complete') {
        setStatus(ResearchStatus.COMPLETED);
        setResult(event.data);
        setLogs(prev => [...prev, { id: generateId(), message: 'Deep Research Completed', timestamp: new Date(), type: 'success' }]);
      } else if (event.type === 'error') {
        setStatus(ResearchStatus.ERROR);
        setLogs(prev => [...prev, { id: generateId(), message: event.message || 'Error', timestamp: new Date(), type: 'error' }]);
      } else if (event.type === 'report_chunk') {
        setStreamedReport(prev => prev + event.data);
      } else {
        // Source/Image updates
        if (event.type === 'source') {
           setResult(prev => ({ ...prev!, sources: [...(prev?.sources || []), event.data], report: prev?.report || '' }));
        }
        if (event.type === 'image') {
           setResult(prev => ({ ...prev!, images: [...(prev?.images || []), event.data], report: prev?.report || '' }));
        }

        setLogs(prev => [...prev, { 
          id: generateId(), 
          message: event.message || '', 
          timestamp: event.timestamp, 
          type: event.type === 'agent_action' ? 'system' : event.type === 'thought' ? 'thought' : 'info',
          agent: event.agentName
        }]);
      }
    });

    try {
       await workflowRef.current.start(topic, true); // isDeep = true
    } catch (e: any) {
       setStatus(ResearchStatus.ERROR);
       setLogs(prev => [...prev, { id: generateId(), message: `Execution Error: ${e.message}`, timestamp: new Date(), type: 'error' }]);
    }
  };

  const handleChat = async (question: string) => {
    const currentContext = result?.report || streamedReport;
    if (!currentContext) return;
    
    logActivity({ actionType: 'DEEP_RESEARCH', query: question });

    const userMsg: ChatMessage = { id: generateId(), role: 'user', content: question, timestamp: new Date() };
    setChatMessages(p => [...p, userMsg]);
    setIsLoadingChat(true);
    try {
      const answer = await askFollowUp(chatMessages, currentContext, question);
      setChatMessages(p => [...p, { id: generateId(), role: 'assistant', content: answer, timestamp: new Date() }]);
    } catch (e: any) {
      setLogs(prev => [...prev, { id: generateId(), message: `Chat Error: ${e.message}`, timestamp: new Date(), type: 'error' }]);
      setChatMessages(p => [...p, { id: generateId(), role: 'assistant', content: "System Error: Unable to process request.", timestamp: new Date() }]);
    } finally {
      setIsLoadingChat(false);
    }
  };

  const handleExport = (type: 'pdf' | 'docx') => {
    const content = result?.report || streamedReport;
    if (!content) return;
    const title = query || "Deep_Research_Report";
    const sources = result?.sources || [];
    const images = result?.images || [];
    
    if (type === 'pdf') exportToPDF(title, content, sources, images);
    if (type === 'docx') exportToDOCX(title, content, sources, images);
    setShowExportMenu(false);
  };

  return (
    <div className="h-full flex flex-col p-4 animate-fade-in max-w-[1800px] mx-auto">
       {/* Header */}
       <div className="flex flex-col gap-4 mb-4">
          <div className="flex items-center justify-between">
            <button onClick={onBack} className="flex items-center text-slate-400 hover:text-white transition-colors text-sm px-3 py-1.5 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/10">
              <ArrowLeftIcon className="w-4 h-4 mr-2" /> New Research
            </button>
            
            <div className="text-cyan-400 flex items-center gap-2 font-bold uppercase tracking-widest text-sm bg-cyan-500/10 px-4 py-2 rounded-full border border-cyan-500/20">
              <LayersIcon className="w-4 h-4" /> Deep Research Agent
            </div>

            {/* Export Dropdown */}
            <div className="relative">
               <button 
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  disabled={!streamedReport && !result}
                  className="flex items-center space-x-2 bg-white/5 hover:bg-white/10 text-slate-300 px-4 py-2 rounded-lg text-sm font-medium border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
               >
                  <DownloadIcon className="w-4 h-4" />
                  <span>Export Report</span>
               </button>
               
               {showExportMenu && (
                 <div className="absolute right-0 mt-2 w-48 bg-[#0F1629] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden animate-fade-in">
                    <button onClick={() => handleExport('pdf')} className="w-full flex items-center px-4 py-3 hover:bg-white/5 text-slate-300 hover:text-white transition-colors text-sm text-left">
                       <FileIcon className="w-4 h-4 mr-2 text-red-400" /> Export as PDF
                    </button>
                    <button onClick={() => handleExport('docx')} className="w-full flex items-center px-4 py-3 hover:bg-white/5 text-slate-300 hover:text-white transition-colors text-sm text-left border-t border-white/5">
                       <FileIcon className="w-4 h-4 mr-2 text-blue-400" /> Export as DOCX
                    </button>
                 </div>
               )}
            </div>
          </div>
          
          <div className="flex justify-center mt-2">
            <div className="text-xl font-display text-white border-b border-white/10 pb-2 px-8">
               <span className="text-slate-500 mr-2 text-sm uppercase tracking-wide">Directive:</span>
               {query}
            </div>
          </div>
       </div>

       {/* 3-Column Layout with Improved Sizing */}
       <div className="flex-1 grid grid-cols-1 xl:grid-cols-12 gap-6 overflow-hidden min-h-0">
          
          {/* Col 1: Logs & Chat (Left - Smaller) */}
          <div className="xl:col-span-3 flex flex-col gap-6 overflow-hidden">
             {/* Logs with Loading State */}
             <div className="flex-1 bg-black/20 rounded-xl border border-white/10 p-3 flex flex-col overflow-hidden relative">
                <h3 className="text-[10px] font-bold text-cyan-500 uppercase tracking-widest mb-2 flex items-center justify-between">
                  <span className="flex items-center">
                    <span className="w-2 h-2 rounded-full bg-cyan-500 mr-2 animate-pulse"></span>
                    Agent Operations
                  </span>
                  {(status === ResearchStatus.PLANNING || status === ResearchStatus.SEARCHING || status === ResearchStatus.SYNTHESIZING) && (
                    <span className="flex items-center text-cyan-400">
                      <span className="flex w-2 h-2 mr-1">
                        <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-cyan-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                      </span>
                      LIVE
                    </span>
                  )}
                </h3>
                <div className="flex-1 overflow-hidden bg-black/40 rounded border border-white/5 p-2">
                  <ResearchLogs logs={logs} />
                </div>
                
                {/* Loading Overlay for Logs */}
                {(status === ResearchStatus.PLANNING || status === ResearchStatus.SEARCHING || status === ResearchStatus.SYNTHESIZING) && (
                  <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px] rounded-xl flex items-center justify-center z-10">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                      <span className="text-xs text-cyan-400 font-mono">AGENT ACTIVE</span>
                    </div>
                  </div>
                )}
             </div>
             
             {/* Chat with Loading State */}
             <div className="flex-1 flex flex-col relative">
                {/* Loading Overlay for Chat */}
                {status === ResearchStatus.PLANNING && (
                  <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px] rounded-xl flex items-center justify-center z-10">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                      <span className="text-xs text-cyan-400 font-mono">INITIALIZING CHAT</span>
                    </div>
                  </div>
                )}
                
                <ChatPanel messages={chatMessages} onSendMessage={handleChat} isLoading={isLoadingChat} />
             </div>
          </div>

          {/* Col 2: Report / Images (Middle - Main Stage, Larger) */}
          <div className="xl:col-span-6 flex flex-col overflow-hidden">
             <div className="flex-1 flex flex-col glass-card rounded-xl border border-white/10 overflow-hidden shadow-2xl relative">
                <div className="flex border-b border-white/10 bg-white/5 backdrop-blur-xl z-10">
                   <button onClick={() => setActiveTab('report')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'report' ? 'text-cyan-400 border-b-2 border-cyan-400 bg-white/5' : 'text-slate-500 hover:text-slate-300'}`}>Live Report</button>
                   <button onClick={() => setActiveTab('images')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-all ${activeTab === 'images' ? 'text-cyan-400 border-b-2 border-cyan-400 bg-white/5' : 'text-slate-500 hover:text-slate-300'}`}>Visual Assets ({result?.images?.length || 0})</button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-black/20 relative">
                   {status === ResearchStatus.IDLE && !streamedReport ? (
                      <div className="flex flex-col items-center justify-center h-full opacity-30 pointer-events-none select-none">
                        <LayersIcon className="w-16 h-16 mb-4 text-cyan-900" />
                        <div className="text-sm font-mono text-cyan-800">AWAITING AGENT REPORT</div>
                      </div>
                   ) : (
                      activeTab === 'report' ? (
                        <>
                          <MarkdownRenderer content={streamedReport || (status === ResearchStatus.COMPLETED ? result?.report || "" : "")} />
                          {/* Typing Cursor Effect */}
                          {(status === ResearchStatus.PLANNING || status === ResearchStatus.SEARCHING || status === ResearchStatus.SYNTHESIZING) && (
                            <div className="inline-block w-2 h-4 bg-cyan-500 animate-pulse ml-1 align-middle"></div>
                          )}
                          {status === ResearchStatus.ERROR && !streamedReport && (
                            <div className="text-red-400 text-center font-mono mt-10 p-4 border border-red-500/20 bg-red-500/10 rounded">
                               Mission Aborted. Agent communication failure.
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="grid grid-cols-2 gap-4">
                           {result?.images?.map((img, i) => (
                             <img key={i} src={img} className="w-full rounded-lg border border-white/10 hover:border-cyan-500/50 transition-all cursor-zoom-in" />
                           ))}
                           {(!result?.images || result.images.length === 0) && <div className="col-span-2 text-center text-slate-500 py-10 font-mono text-xs">No visual assets intercepted yet.</div>}
                        </div>
                      )
                   )}
                   
                   {/* Loading Overlay for Report */}
                   {(status === ResearchStatus.PLANNING || status === ResearchStatus.SEARCHING || status === ResearchStatus.SYNTHESIZING) && !streamedReport && (
                     <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] rounded-xl flex items-center justify-center z-10">
                       <div className="flex flex-col items-center">
                         <div className="w-12 h-12 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                         <span className="text-sm text-cyan-400 font-mono">AGENT IN PROGRESS</span>
                         <span className="text-xs text-slate-500 mt-1">Synthesizing intelligence...</span>
                       </div>
                     </div>
                   )}
                </div>
             </div>
          </div>

          {/* Col 3: Sources (Right - Smaller) */}
          <div className="xl:col-span-3 flex flex-col overflow-hidden">
             <div className="glass-card rounded-xl border border-white/10 flex flex-col h-full overflow-hidden relative">
                <div className="p-3 border-b border-white/10 bg-white/5 text-xs font-bold text-emerald-400 uppercase tracking-widest flex items-center justify-between">
                   <span className="flex items-center">
                     <GlobeIcon className="w-3 h-3 mr-2" /> Indexed Sources ({result?.sources?.length || 0})
                   </span>
                   {(status === ResearchStatus.SEARCHING) && (
                     <span className="flex items-center text-emerald-400">
                       <span className="flex w-2 h-2 mr-1">
                         <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-emerald-400 opacity-75"></span>
                         <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                       </span>
                     </span>
                   )}
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar bg-black/10">
                   {(result?.sources || []).map((s, i) => (
                      <a key={i} href={s.uri} target="_blank" className="block p-3 rounded-lg bg-white/5 border border-white/5 hover:border-emerald-500/50 hover:bg-emerald-500/10 transition-all group">
                         <div className="text-xs font-bold text-slate-300 truncate group-hover:text-white">{s.title || "Unknown Source"}</div>
                         <div className="text-[10px] text-slate-500 font-mono truncate mt-1 group-hover:text-emerald-400">{s.uri}</div>
                      </a>
                   ))}
                   {(result?.sources?.length === 0) && (
                      <div className="text-center text-slate-600 text-xs font-mono py-4">Scanning Neural Network...</div>
                   )}
                </div>
                
                {/* Loading Overlay for Sources */}
                {(status === ResearchStatus.SEARCHING) && (
                  <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px] rounded-xl flex items-center justify-center z-10">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                      <span className="text-xs text-emerald-400 font-mono">INDEXING SOURCES</span>
                    </div>
                  </div>
                )}
             </div>
          </div>

       </div>
    </div>
  );
};