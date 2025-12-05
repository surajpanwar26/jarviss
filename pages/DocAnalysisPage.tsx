import React, { useState, useEffect, useRef } from 'react';
import { ResearchLogs } from '../components/ResearchLogs';
import { MarkdownRenderer } from '../components/MarkdownRenderer';
import { ChatPanel } from '../components/ChatPanel';
import { FileUploader } from '../components/FileUploader';
import { ActivityIcon, ArrowLeftIcon, DownloadIcon, FileIcon } from '../components/Icons';
import { ResearchStatus, LogEntry, ResearchResult, ChatMessage } from '../types';
import { askFollowUp, analyzeDocument } from '../services/analysisService';
import { logActivity } from '../services/mongoService';
import { exportToPDF, exportToDOCX } from '../services/exportService';

const generateId = () => Math.random().toString(36).substr(2, 9);

interface DocAnalysisPageProps {
  initialFile?: File;
  onBack: () => void;
}

export const DocAnalysisPage: React.FC<DocAnalysisPageProps> = ({ initialFile, onBack }) => {
  const [status, setStatus] = useState<ResearchStatus>(ResearchStatus.IDLE);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [result, setResult] = useState<ResearchResult | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const [docName, setDocName] = useState('');
  const [showExportMenu, setShowExportMenu] = useState(false);
  
  const hasStarted = useRef(false);

  useEffect(() => {
    if (initialFile && !hasStarted.current) {
       handleFileUpload(initialFile);
       hasStarted.current = true;
    }
  }, [initialFile]);

  const handleFileUpload = async (file: File) => {
    setStatus(ResearchStatus.PLANNING);
    setDocName(file.name);
    setLogs([]);
    setLogs(p => [...p, { id: generateId(), message: `Ingesting ${file.name}...`, timestamp: new Date(), type: 'system' }]);
    
    logActivity({
      actionType: 'DOC_ANALYSIS',
      documentName: file.name,
      documentFormat: file.type
    });

    try {
        const reader = new FileReader();
        reader.onload = async (e) => {
          try {
             const base64 = (e.target?.result as string).split(',')[1];
             setStatus(ResearchStatus.SYNTHESIZING);
             setLogs(p => [...p, { id: generateId(), message: 'RAG Protocol: Retrieving key contexts...', timestamp: new Date(), type: 'info' }]);
             
             const data = await analyzeDocument(base64, file.type || 'text/plain');
             setResult(data);
             setStatus(ResearchStatus.COMPLETED);
             setLogs(p => [...p, { id: generateId(), message: 'Analysis Complete', timestamp: new Date(), type: 'success' }]);
          } catch (analysisError: any) {
             setStatus(ResearchStatus.ERROR);
             setLogs(p => [...p, { id: generateId(), message: `Analysis Error: ${analysisError.message}`, timestamp: new Date(), type: 'error' }]);
          }
        };
        reader.readAsDataURL(file);
    } catch (e: any) {
        setStatus(ResearchStatus.ERROR);
        setLogs(p => [...p, { id: generateId(), message: `Upload Failed: ${e.message}`, timestamp: new Date(), type: 'error' }]);
    }
  };

  const handleChat = async (question: string) => {
    if (!result) return;
    
    logActivity({
      actionType: 'DOC_ANALYSIS',
      query: question,
      documentName: docName
    });

    setChatMessages(p => [...p, { id: generateId(), role: 'user', content: question, timestamp: new Date() }]);
    setIsLoadingChat(true);
    
    try {
        const answer = await askFollowUp(chatMessages, result.report, question);
        setChatMessages(p => [...p, { id: generateId(), role: 'assistant', content: answer, timestamp: new Date() }]);
    } catch (e: any) {
        setLogs(p => [...p, { id: generateId(), message: `Chat Error: ${e.message}`, timestamp: new Date(), type: 'error' }]);
        setChatMessages(p => [...p, { id: generateId(), role: 'assistant', content: "Error: Unable to fetch response.", timestamp: new Date() }]);
    } finally {
        setIsLoadingChat(false);
    }
  };

  const handleExport = (type: 'pdf' | 'docx') => {
    if (!result?.report) return;
    const title = docName || "Doc_Analysis_Report";
    
    if (type === 'pdf') exportToPDF(title, result.report);
    if (type === 'docx') exportToDOCX(title, result.report);
    setShowExportMenu(false);
  };

  return (
    <div className="h-full flex flex-col max-w-7xl mx-auto p-6 animate-fade-in">
       <div className="mb-6 flex items-center justify-between">
         <div className="flex items-center space-x-4">
            <button 
                onClick={onBack} 
                className="flex items-center text-slate-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg border border-white/5"
            >
                <ArrowLeftIcon className="w-4 h-4 mr-2" /> Start Over
            </button>
            <div className="h-8 w-[1px] bg-white/10"></div>
            <div className="flex items-center space-x-2 text-purple-400">
                <ActivityIcon className="w-6 h-6" />
                <h2 className="text-xl font-bold font-display uppercase tracking-widest">Doc Intelligence</h2>
            </div>
         </div>
         
         <div className="flex items-center gap-4">
            {docName && <div className="text-xs font-mono text-slate-500 border border-white/10 px-3 py-1 rounded bg-white/5">ACTIVE_DOC: {docName}</div>}
            
            {/* Export Dropdown */}
            <div className="relative">
               <button 
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  disabled={!result}
                  className="flex items-center space-x-2 bg-white/5 hover:bg-white/10 text-slate-300 px-4 py-2 rounded-lg text-sm font-medium border border-white/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
               >
                  <DownloadIcon className="w-4 h-4" />
                  <span>Export</span>
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
       </div>

       <div className="flex-1 grid grid-cols-1 xl:grid-cols-12 gap-6 min-h-0 overflow-hidden">
          {/* Left Column: Logs (Smaller) */}
          <div className="xl:col-span-3 flex flex-col gap-6 overflow-hidden h-full">
            {/* Logs Container with Loading State */}
            <div className="flex-1 bg-black/20 rounded-xl p-3 border border-white/10 overflow-hidden flex flex-col relative">
              <div className="text-[10px] text-slate-500 font-bold mb-2 uppercase flex justify-between items-center">
                <span>Processing Logs</span>
                {(status === ResearchStatus.PLANNING || status === ResearchStatus.SYNTHESIZING) && (
                  <span className="flex items-center text-cyan-400">
                    <span className="flex w-2 h-2 mr-1">
                      <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-cyan-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                    </span>
                    LIVE
                  </span>
                )}
              </div>
              <div className="flex-1 overflow-hidden bg-black/40 rounded border border-white/5 p-2">
                <ResearchLogs logs={logs} />
              </div>
              
              {/* Loading Overlay for Logs */}
              {(status === ResearchStatus.PLANNING || status === ResearchStatus.SYNTHESIZING) && (
                <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px] rounded-xl flex items-center justify-center z-10">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                    <span className="text-xs text-cyan-400 font-mono">PROCESSING</span>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Middle Column: Report Analysis (Larger/Main Focus) */}
          <div className="xl:col-span-6 flex flex-col overflow-hidden h-full">
            <div className="flex-1 glass-card rounded-xl border border-white/10 flex flex-col overflow-hidden shadow-2xl relative">
              <div className="p-3 bg-white/5 border-b border-white/10 text-xs font-bold text-slate-300 flex justify-between items-center">
                <span>ANALYSIS REPORT</span>
                <span className="text-purple-400">RAG ENABLED</span>
              </div>
              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-black/20 relative">
                {/* Loading State for Report */}
                {(status === ResearchStatus.PLANNING || status === ResearchStatus.SYNTHESIZING) && !result && (
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] rounded-xl flex flex-col items-center justify-center z-10">
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                      <span className="text-sm text-purple-400 font-mono">ANALYZING DOCUMENT</span>
                      <span className="text-xs text-slate-500 mt-1">RAG Protocol Engaged...</span>
                    </div>
                  </div>
                )}
                
                {result ? (
                  <MarkdownRenderer content={result.report || ""} />
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-600">
                    <div className="text-center">
                      <ActivityIcon className="w-12 h-12 mx-auto mb-3 opacity-20" />
                      <p className="text-sm font-mono">Upload a document to begin analysis</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Right Column: AI Chatbot (Smaller) */}
          <div className="xl:col-span-3 flex flex-col h-full">
            <div className="h-full rounded-xl overflow-hidden shadow-2xl flex flex-col relative">
              {/* Loading State for Chat */}
              {result && (status === ResearchStatus.PLANNING || status === ResearchStatus.SYNTHESIZING) && (
                <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] rounded-xl flex items-center justify-center z-10">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                    <span className="text-xs text-cyan-400 font-mono">INITIALIZING CHAT</span>
                  </div>
                </div>
              )}
              
              {result ? (
                <ChatPanel messages={chatMessages} onSendMessage={handleChat} isLoading={isLoadingChat} />
              ) : (
                <div className="h-full border-2 border-dashed border-white/5 rounded-xl flex flex-col items-center justify-center text-slate-600 bg-white/5 relative">
                  <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px] rounded-xl flex items-center justify-center z-10">
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 border-2 border-slate-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                      <span className="text-xs text-slate-500 font-mono">AWAITING ANALYSIS</span>
                    </div>
                  </div>
                  
                  <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                    <ActivityIcon className="w-8 h-8 opacity-20" />
                  </div>
                  <p className="text-sm font-mono">Upload a document to enable AI Chatbot</p>
                </div>
              )}
            </div>
          </div>
       </div>
    </div>
  );
};