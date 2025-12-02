import React, { useState } from 'react';

export const JarvisLogo: React.FC<{ className?: string, size?: 'sm' | 'md' | 'lg' }> = ({ className = '', size = 'md' }) => {
  const dim = size === 'sm' ? 32 : size === 'md' ? 64 : 120;
  const [imageError, setImageError] = useState(false);
  
  // Fallback SVG logo if ICO fails to load
  const fallbackLogo = (
    <svg width={dim} height={dim} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Outer Ring */}
      <circle cx="50" cy="50" r="45" stroke="url(#blue-gradient)" strokeWidth="2" className="animate-[spin_10s_linear_infinite]" strokeDasharray="10 5" />
      <circle cx="50" cy="50" r="45" stroke="url(#cyan-gradient)" strokeWidth="1" className="animate-[spin_15s_linear_infinite_reverse] opacity-50" />
      
      {/* Inner Tech Details */}
      <path d="M50 10 L50 20 M50 80 L50 90 M10 50 L20 50 M80 50 L90 50" stroke="#06b6d4" strokeWidth="2" />
      <path d="M25 25 L35 35 M75 75 L65 65 M25 75 L35 65 M75 25 L65 35" stroke="#3b82f6" strokeWidth="2" />
      
      {/* Core Eye */}
      <circle cx="50" cy="50" r="15" fill="#0B0F19" stroke="#06b6d4" strokeWidth="2" />
      <circle cx="50" cy="50" r="8" fill="#06b6d4" className="animate-pulse">
         <animate attributeName="opacity" values="0.5;1;0.5" dur="2s" repeatCount="indefinite" />
      </circle>
      
      {/* Gradients */}
      <defs>
        <linearGradient id="blue-gradient" x1="0" y1="0" x2="100" y2="100">
          <stop offset="0%" stopColor="#06b6d4" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
        <linearGradient id="cyan-gradient" x1="100" y1="0" x2="0" y2="100">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>
      </defs>
    </svg>
  );

  if (imageError) {
    return (
      <div className={`relative flex items-center justify-center ${className}`}>
        {fallbackLogo}
        {/* Glow Effect */}
        <div className="absolute inset-0 bg-cyan-500/20 blur-xl rounded-full -z-10 animate-pulse"></div>
      </div>
    );
  }
  
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <img 
        src="/Jarvis.ico" 
        alt="JARVIS Logo" 
        width={dim} 
        height={dim} 
        className="rounded-full"
        onError={() => setImageError(true)}
      />
    </div>
  );
};