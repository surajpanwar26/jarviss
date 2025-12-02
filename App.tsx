import React, { useState } from 'react';
import { HomePage } from './pages/HomePage';
import { QuickResultPage } from './pages/QuickResultPage';
import { DeepResearchPage } from './pages/DeepResearchPage';
import { DocAnalysisPage } from './pages/DocAnalysisPage';
import { LoginPage } from './pages/LoginPage';
import { PageView } from './types';

interface NavState {
  page: PageView;
  initialQuery?: string;
  initialFile?: File;
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [navState, setNavState] = useState<NavState>({ page: 'HOME' });

  const handleNavigate = (page: PageView, initialQuery?: string, initialFile?: File) => {
    setNavState({ page, initialQuery, initialFile });
  };

  const handleLogin = () => {
    // Mock login for now
    setIsAuthenticated(true);
  };

  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-[#0B0F19] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-[#0B0F19] to-[#0B0F19] flex flex-col font-sans overflow-hidden text-slate-200">
      
      {/* Background Ambience */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none z-0">
         <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full bg-purple-600/5 blur-[100px]"></div>
         <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full bg-cyan-600/5 blur-[100px]"></div>
      </div>

      {/* Main Content View Port */}
      <main className="relative z-10 flex-1 h-screen overflow-hidden">
        {navState.page === 'HOME' && (
          <HomePage onNavigate={handleNavigate} />
        )}
        
        {navState.page === 'QUICK_RESULT' && (
          <QuickResultPage 
            initialQuery={navState.initialQuery} 
            onBack={() => setNavState({ page: 'HOME' })} 
          />
        )}
        
        {navState.page === 'DEEP_RESULT' && (
          <DeepResearchPage 
            initialQuery={navState.initialQuery} 
            onBack={() => setNavState({ page: 'HOME' })} 
          />
        )}
        
        {navState.page === 'DOC_ANALYSIS' && (
          <DocAnalysisPage 
            initialFile={navState.initialFile} 
            onBack={() => setNavState({ page: 'HOME' })} 
          />
        )}
      </main>

    </div>
  );
}

export default App;