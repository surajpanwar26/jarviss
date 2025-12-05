import React, { useState, useRef, useEffect } from 'react';
import { ResearchWorkflow } from '../services/agentSystem';
import { ResearchLogs } from '../components/ResearchLogs';
import { MarkdownRenderer } from '../components/MarkdownRenderer';
import { ChatPanel } from '../components/ChatPanel';
import { WaveLoader } from '../components/WaveLoader';
import { ZapIcon, ArrowLeftIcon, DownloadIcon, FileIcon, ActivityIcon } from '../components/Icons';
import { ResearchStatus, LogEntry, AgentEvent, ResearchResult, ChatMessage } from '../types';
import { askFollowUp } from '../services/analysisService';
import { logActivity } from '../services/mongoService';
import { exportToPDF, exportToDOCX } from '../services/exportService';

const generateId = () => Math.random().toString(36).substr(2, 9);

interface QuickResultPageProps {
  initialQuery?: string;
  onBack: () => void;
}

export const QuickResultPage: React.FC<QuickResultPageProps> = ({ initialQuery, onBack }) => {
  const [activeTopic, setActiveTopic] = useState(initialQuery || '');
  const [status, setStatus] = useState<ResearchStatus>(ResearchStatus.IDLE);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [result, setResult] = useState<ResearchResult | null>(null);
  const [streamedReport, setStreamedReport] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isLoadingChat, setIsLoadingChat] = useState(false);
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
    setActiveTopic(topic);
    setStatus(ResearchStatus.PLANNING);
    setLogs([]);
    setResult(null);
    setStreamedReport('');
    
    logActivity({ actionType: 'QUICK_SEARCH', query: topic });

    const unsubscribe = workflowRef.current.subscribe((event: AgentEvent) => {
      if (event.type === 'complete') {
        setStatus(ResearchStatus.COMPLETED);
        setResult(event.data);
        setLogs(prev => [...prev, { id: generateId(), message: 'Research Completed', timestamp: new Date(), type: 'success' }]);
      } else if (event.type === 'error') {
        setStatus(ResearchStatus.ERROR);
        setLogs(prev => [...prev, { id: generateId(), message: event.message || 'Error', timestamp: new Date(), type: 'error' }]);
      } else if (event.type === 'report_chunk') {
        setStreamedReport(prev => prev + event.data);
      } else {
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
      await workflowRef.current.start(topic, false); // isDeep = false
    } catch (e: any) {
      setStatus(ResearchStatus.ERROR);
      setLogs(prev => [...prev, { id: generateId(), message: `Execution Error: ${e.message}`, timestamp: new Date(), type: 'error' }]);
    }
  };

  const handleChat = async (question: string) => {
    const currentContext = result?.report || streamedReport;
    if (!currentContext) return;
    
    logActivity({ actionType: 'QUICK_SEARCH', query: question });

    const userMsg: ChatMessage = { id: generateId(), role: 'user', content: question, timestamp: new Date() };
    setChatMessages(p => [...p, userMsg]);
    setIsLoadingChat(true);
    try {
      const answer = await askFollowUp(chatMessages, currentContext, question);
      setChatMessages(p => [...p, { id: generateId(), role: 'assistant', content: answer, timestamp: new Date() }]);
    } catch (e: any) {
      setLogs(prev => [...prev, { id: generateId(), message: `Chat Error: ${e.message}`, timestamp: new Date(), type: 'error' }]);
      setChatMessages(p => [...p, { id: generateId(), role: 'assistant', content: "I encountered an error trying to answer that. Please check the logs.", timestamp: new Date() }]);
    } finally {
      setIsLoadingChat(false);
    }
  };

  const handleExport = (type: 'pdf' | 'docx') => {
    const content = result?.report || streamedReport;
    if (!content) return;
    const title = activeTopic || "Quick_Briefing";
    
    // Quick search usually doesn't have deep sources/images but we pass them if they exist
    const sources = result?.sources || [];
    const images = result?.images || [];
    
    if (type === 'pdf') exportToPDF(title, content, sources, images);
    if (type === 'docx') exportToDOCX(title, content, sources, images);
    setShowExportMenu(false);
  };

  return (
    <div className="h-full flex flex-col max-w-[1800px] mx-auto p-4 animate-fade-in font-sans">
      
      {/* Header */}
      <div className="mb-4 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <button 
            onClick={onBack} 
            className="flex items-center text-slate-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg border border-white/5 text-sm"
          >
            <ArrowLeftIcon className="w-4 h-4 mr-2" />
            <span className="font-medium">New Research</span>
          </button>
          
          <div className="flex items-center space-x-3 bg-amber-500/10 border border-amber-500/20 px-4 py-2 rounded-full">
            <ZapIcon className="w-5 h-5 text-amber-400" />
            <span className="font-bold tracking-wider text-sm text-amber-200 uppercase">Quick Briefing</span>
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

        {/* Active Topic Indicator */}
        <div className="flex justify-center mt-2">
            <div className="text-xl font-display text-white border-b border-white/10 pb-2 px-8">
               <span className="text-slate-500 mr-2 text-sm uppercase tracking-wide">Subject:</span>
               {activeTopic}
            </div>
        </div>
      </div>

      {/* 3-Column Layout: Progress (Left) | Report (Middle) | Chat (Right) */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-4 overflow-hidden min-h-0">
        
        {/* Left: Agent Progress */}
        <div className="lg:col-span-3 flex flex-col overflow-hidden h-full">
            <div className="flex-1 bg-black/20 rounded-xl border border-white/10 p-3 flex flex-col overflow-hidden shadow-xl">
              <h3 className="text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-2 flex items-center">
                <span className="w-2 h-2 rounded-full bg-amber-500 mr-2 animate-pulse"></span>
                Agent Progress
              </h3>
              <div className="flex-1 overflow-hidden bg-black/40 rounded border border-white/5 p-2">
                <ResearchLogs logs={logs} />
              </div>
            </div>
        </div>

        {/* Middle: Report (Wider) */}
        <div className="lg:col-span-6 flex flex-col overflow-hidden h-full">
          <div className="flex-1 glass-card rounded-2xl border border-white/10 overflow-hidden flex flex-col shadow-2xl relative">
             {/* Report Header */}
             <div className="px-6 py-4 border-b border-white/10 bg-white/5 flex items-center justify-between">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">Live Briefing</span>
                {status === ResearchStatus.SEARCHING && <span className="text-xs text-slate-500 animate-pulse">Gathering Intel...</span>}
                {status === ResearchStatus.SYNTHESIZING && <span className="text-xs text-slate-500 animate-pulse">Writing Brief...</span>}
             </div>

             {/* Content */}
             <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-black/20">
                {status === ResearchStatus.IDLE && !streamedReport ? (
                   <div className="flex flex-col items-center justify-center h-full opacity-30 pointer-events-none select-none">
                      <ZapIcon className="w-16 h-16 mb-4 text-amber-900" />
                      <div className="text-sm font-mono text-amber-800">INITIALIZING AGENTS...</div>
                   </div>
                ) : (
                   (status === ResearchStatus.SYNTHESIZING || status === ResearchStatus.SEARCHING) && !streamedReport ? (
                     <WaveLoader message="Generating Quick Briefing..." />
                   ) : (
                     <>
                        <MarkdownRenderer content={streamedReport || (status === ResearchStatus.COMPLETED ? result?.report || "" : "")} />
                        {/* Cursor */}
                        {(status === ResearchStatus.SYNTHESIZING || status === ResearchStatus.SEARCHING) && streamedReport && (
                           <div className="inline-block w-1.5 h-4 bg-amber-500 animate-pulse ml-1 align-middle"></div>
                        )}
                        {status === ResearchStatus.ERROR && !streamedReport && (
                          <div className="text-red-400 text-center font-mono mt-10">
                            System Failure. Check logs for details.
                          </div>
                        )}
                     </>
                   )
                )}
             </div>
          </div>
        </div>

        {/* Right: Ask Assistant */}
        <div className="lg:col-span-3 flex flex-col h-full overflow-hidden">
           <div className="flex-1 rounded-2xl overflow-hidden border border-white/10 shadow-xl bg-black/20 h-full">
              <ChatPanel messages={chatMessages} onSendMessage={handleChat} isLoading={isLoadingChat} />
           </div>
        </div>

      </div>
    </div>
  );
};