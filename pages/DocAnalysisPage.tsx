
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
          const base64 = (e.target?.result as string).split(',')[1];
          setStatus(ResearchStatus.SYNTHESIZING);
          setLogs(p => [...p, { id: generateId(), message: 'RAG Protocol: Retrieving key contexts...', timestamp: new Date(), type: 'info' }]);
          
          const data = await analyzeDocument(base64, file.type || 'text/plain');
          setResult(data);
          setStatus(ResearchStatus.COMPLETED);
          setLogs(p => [...p, { id: generateId(), message: 'Analysis Complete', timestamp: new Date(), type: 'success' }]);
        };
        reader.readAsDataURL(file);
    } catch (e) {
        setStatus(ResearchStatus.ERROR);
        setLogs(p => [...p, { id: generateId(), message: 'Ingestion Failed', timestamp: new Date(), type: 'error' }]);
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
    const answer = await askFollowUp(chatMessages, result.report, question);
    setChatMessages(p => [...p, { id: generateId(), role: 'assistant', content: answer, timestamp: new Date() }]);
    setIsLoadingChat(false);
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

       <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-8 min-h-0 overflow-hidden">
          {/* Left Column: Upload or Report */}
          <div className="flex flex-col gap-4 overflow-hidden h-full">
             {status === ResearchStatus.IDLE || status === ResearchStatus.PLANNING ? (
               // If idle and no initial file processed yet (or reset), show uploader
               !initialFile ? (
                 <div className="h-full flex flex-col justify-center">
                    <FileUploader onFileSelect={handleFileUpload} isLoading={status !== ResearchStatus.IDLE} />
                 </div>
               ) : (
                 <div className="h-full flex items-center justify-center text-slate-500 font-mono animate-pulse">
                    Ingesting Document Structure...
                 </div>
               )
             ) : (
               <div className="flex-1 glass-card rounded-xl border border-white/10 flex flex-col overflow-hidden shadow-2xl">
                 <div className="p-3 bg-white/5 border-b border-white/10 text-xs font-bold text-slate-300 flex justify-between">
                    <span>ANALYSIS REPORT</span>
                    <span className="text-purple-400">RAG ENABLED</span>
                 </div>
                 <div className="flex-1 overflow-y-auto p-8 custom-scrollbar bg-black/20">
                    <MarkdownRenderer content={result?.report || ""} />
                 </div>
               </div>
             )}
             
             {/* Logs */}
             {(status !== ResearchStatus.IDLE) && (
               <div className="h-48 bg-black/20 rounded-xl p-3 border border-white/10 overflow-hidden flex flex-col">
                 <div className="text-[10px] text-slate-500 font-bold mb-2 uppercase">Processing Logs</div>
                 <ResearchLogs logs={logs} />
               </div>
             )}
          </div>
          
          {/* Right Column: Q&A */}
          <div className="flex flex-col h-full">
            {result ? (
               <div className="h-full rounded-xl overflow-hidden shadow-2xl">
                 <ChatPanel messages={chatMessages} onSendMessage={handleChat} isLoading={isLoadingChat} />
               </div>
            ) : (
               <div className="h-full border-2 border-dashed border-white/5 rounded-xl flex flex-col items-center justify-center text-slate-600 bg-white/5">
                 <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                    <ActivityIcon className="w-8 h-8 opacity-20" />
                 </div>
                 <p className="text-sm font-mono">Upload a document to enable Q&A</p>
               </div>
            )}
          </div>
       </div>
    </div>
  );
};
