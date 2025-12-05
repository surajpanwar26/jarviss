import React, { useRef, useState } from 'react';
import { UploadIcon, FileTextIcon } from './Icons';

interface FileUploaderProps {
  onFileSelect: (file: File) => void;
  isLoading: boolean;
}

export const FileUploader: React.FC<FileUploaderProps> = ({ onFileSelect, isLoading }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
    setSelectedFileName(file.name);
    onFileSelect(file);
  };

  const onButtonClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div 
      className={`relative w-full h-64 border-2 border-dashed rounded-xl flex flex-col items-center justify-center transition-all cursor-pointer
        ${dragActive ? 'border-cyan-400 bg-cyan-400/10' : 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20'}
        ${isLoading ? 'opacity-50 pointer-events-none' : ''}
      `}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      onClick={onButtonClick}
    >
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={handleChange}
        accept=".pdf,.txt,.md,.csv"
      />
      
      {isLoading ? (
        <div className="flex flex-col items-center justify-center h-full">
          <div className="text-slate-400 text-sm font-mono">Processing file...</div>
        </div>
      ) : selectedFileName ? (
        <div className="flex flex-col items-center animate-fade-in text-center p-4">
          <div className="w-16 h-16 bg-cyan-500/20 rounded-full flex items-center justify-center mb-4">
            <FileTextIcon className="w-8 h-8 text-cyan-400" />
          </div>
          <p className="text-white font-medium text-lg mb-1">{selectedFileName}</p>
          <p className="text-slate-400 text-sm">Click to change file</p>
        </div>
      ) : (
        <div className="flex flex-col items-center text-center p-4">
          <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4 group-hover:bg-white/10 transition-colors">
            <UploadIcon className="w-8 h-8 text-slate-400" />
          </div>
          <p className="text-slate-200 font-medium text-lg mb-2">
            Drag & Drop or Click to Upload
          </p>
          <p className="text-slate-500 text-sm max-w-xs">
            Supported formats: PDF, TXT, MD, CSV (Max 10MB)
          </p>
        </div>
      )}
    </div>
  );
};
