import React, { useState, useEffect } from 'react';
import { Camera, Loader2, History as HistoryIcon, Upload } from 'lucide-react';
import { AppState, AnalysisResult, HistoryItem } from './types';
import { identifyMetalImage } from './services/geminiService';
import { saveToHistory } from './services/historyService';
import { CameraCapture } from './components/CameraCapture';
import { ResultView } from './components/ResultView';
import { HistoryView } from './components/HistoryView';
import { Button } from './components/Button';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  
  // State for parallax background effect
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  // State for fake progress bar and text animation
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingDots, setLoadingDots] = useState('');

  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      let clientX, clientY;
      if ('touches' in e) {
         clientX = e.touches[0].clientX;
         clientY = e.touches[0].clientY;
      } else {
         clientX = (e as MouseEvent).clientX;
         clientY = (e as MouseEvent).clientY;
      }
      
      // Calculate offset from center (range -1 to 1)
      const x = (clientX / window.innerWidth) * 2 - 1;
      const y = (clientY / window.innerHeight) * 2 - 1;
      setMousePos({ x, y });
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('touchmove', handleMove);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('touchmove', handleMove);
    };
  }, []);

  // Fake progress simulation and text animation when analyzing
  useEffect(() => {
    if (appState === AppState.ANALYZING) {
      setLoadingProgress(0);
      setLoadingDots('');

      const progressInterval = setInterval(() => {
        setLoadingProgress((prev) => {
          // Fast at first, slows down as it gets higher, caps at 95%
          const increment = Math.max(1, (95 - prev) / 10); 
          const next = prev + (Math.random() * increment);
          return next >= 95 ? 95 : next;
        });
      }, 150);

      const dotsInterval = setInterval(() => {
        setLoadingDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
      }, 500);
      
      return () => {
        clearInterval(progressInterval);
        clearInterval(dotsInterval);
      };
    } else {
      setLoadingProgress(0);
      setLoadingDots('');
    }
  }, [appState]);

  const handleCapture = async (base64Image: string) => {
    setAppState(AppState.ANALYZING);
    try {
      const result = await identifyMetalImage(base64Image);
      // Auto-save to history
      saveToHistory(result);
      
      // Force progress to 100% briefly before showing result
      setLoadingProgress(100);
      setTimeout(() => {
        setAnalysisResult(result);
        setAppState(AppState.RESULT);
      }, 300); 

    } catch (error: any) {
      setErrorMsg(error.message || "Connection Lost.");
      setAppState(AppState.ERROR);
    }
  };

  const handleHistorySelect = (item: HistoryItem) => {
    setAnalysisResult(item);
    setAppState(AppState.RESULT);
  };

  const resetApp = () => {
    setAppState(AppState.IDLE);
    setAnalysisResult(null);
    setErrorMsg('');
  };

  // ----------------------------------------------------------------------
  // VIEW: CAMERA
  // ----------------------------------------------------------------------
  if (appState === AppState.CAMERA) {
    return <CameraCapture onCapture={handleCapture} onCancel={() => setAppState(AppState.IDLE)} />;
  }

  // ----------------------------------------------------------------------
  // VIEW: ANALYZING (Loading)
  // ----------------------------------------------------------------------
  if (appState === AppState.ANALYZING) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-black p-6 relative overflow-hidden">
         {/* Fog Animation */}
        <div className="absolute inset-0 bg-neutral-900 opacity-20 animate-pulse" />
        
        <div className="relative z-10 flex flex-col items-center w-full max-w-xs">
          <h2 className="text-2xl font-typewriter text-neutral-300 tracking-[0.1em] text-bloom drop-shadow-lg mb-8">
            Into the Abyss<span className="inline-block w-[1em] text-left">{loadingDots}</span>
          </h2>

          {/* Progress Bar Container */}
          <div className="w-full space-y-2">
            <div className="h-1 w-full bg-neutral-900 border border-neutral-800 relative overflow-hidden">
              <div 
                className="h-full bg-neutral-300 shadow-[0_0_15px_rgba(255,255,255,0.6)] transition-all duration-300 ease-out"
                style={{ width: `${loadingProgress}%` }}
              />
            </div>
            
            <div className="flex justify-between text-[10px] font-mono text-neutral-500 uppercase tracking-widest">
               <span>Decoding Sigils</span>
               <span>{Math.round(loadingProgress)}%</span>
            </div>
          </div>

        </div>
      </div>
    );
  }

  // ----------------------------------------------------------------------
  // VIEW: RESULT
  // ----------------------------------------------------------------------
  if (appState === AppState.RESULT && analysisResult) {
    return <ResultView result={analysisResult} onReset={resetApp} isSaved={true} />;
  }

  // ----------------------------------------------------------------------
  // VIEW: HISTORY
  // ----------------------------------------------------------------------
  if (appState === AppState.HISTORY) {
    return <HistoryView onBack={() => setAppState(AppState.IDLE)} onSelectItem={handleHistorySelect} />;
  }

  // ----------------------------------------------------------------------
  // VIEW: HOME (IDLE) / ERROR
  // ----------------------------------------------------------------------
  return (
    <div className="min-h-screen flex flex-col items-center relative overflow-hidden font-typewriter bg-black">
      
      {/* Interactive Background Layer */}
      <div 
        className="absolute inset-0 z-0 transition-transform duration-100 ease-out"
        style={{
          // Dense forest image
          backgroundImage: "url('https://images.unsplash.com/photo-1542273917363-3b1817f69a2d?q=80&w=2600&auto=format&fit=crop')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          // Move background slightly opposite to mouse to create depth
          transform: `scale(1.1) translate(${mousePos.x * -15}px, ${mousePos.y * -15}px)`,
          // Simplified filter: just darken it. We add color via overlay.
          filter: 'brightness(0.6) contrast(1.1)' 
        }}
      />
      
      {/* Blue Tint Overlay - This creates the blue misty look reliably */}
      <div className="absolute inset-0 bg-blue-950/40 z-0 pointer-events-none mix-blend-color" />
      <div className="absolute inset-0 bg-black/30 z-0 pointer-events-none" />

      {/* Main Container: justify-end to push content down, large bottom padding */}
      <main className="flex-1 flex flex-col items-center justify-end pb-32 p-12 w-full max-w-lg relative z-20">
        
        {/* Header */}
        <div className="mb-12 mt-48 text-center space-y-6 w-full">
          <div>
            <h1 className="text-5xl md:text-5xl font-unifrakturmaguntia tracking-[0.02em] text-neutral-300 mb-5 text-bloom leading-none drop-shadow-lg">
              May Darkness Guide Your Quest
            </h1>
            <div className="w-16 h-[3px] bg-neutral-500 mx-auto opacity-50"></div>
          </div>
        </div>

        {/* Actions - Transparent Buttons */}
        <div className="w-full space-y-6">
          <Button 
            variant="secondary"
            onClick={() => setAppState(AppState.CAMERA)} 
            className="w-full h-16 bg-black/20 backdrop-blur-md border-neutral-600/50 text-neutral-300 hover:text-white hover:border-white hover:bg-neutral-900/60 transition-all duration-300"
            icon={<Camera className="w-5 h-5" />}
          >
            Take Picture
          </Button>


          {/* Load Existing File - Button Style with hidden input */}
          {/* Added 'group' class to wrapper and 'group-hover' classes to Button to ensure hover works through the file input */}
          <div className="relative w-full group">
             <Button 
               variant="secondary"
               className="w-full h-16 bg-black/20 backdrop-blur-md border-neutral-600/50 text-neutral-300 group-hover:text-white group-hover:border-white group-hover:bg-neutral-900/60 transition-all duration-500"
               icon={<Upload className="w-5 h-5" />}
             >
                Upload File
             </Button>
             <input 
               type="file" 
               accept="image/*" 
               className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
               onChange={(e) => {
                 const file = e.target.files?.[0];
                 if(file) {
                   const reader = new FileReader();
                   reader.onload = (ev) => handleCapture(ev.target?.result as string);
                   reader.readAsDataURL(file);
                 }
               }} 
              />
          </div>

          <Button 
             variant="secondary"
             onClick={() => setAppState(AppState.HISTORY)}
             className="w-full h-16 bg-black/20 backdrop-blur-md border-neutral-600/50 text-neutral-300 hover:text-white hover:border-white hover:bg-neutral-900/60 transition-all duration-500"
             icon={<HistoryIcon className="w-5 h-5" />}
          >
             Archives
          </Button>
        </div>
      </main>

      {/* Floating Error Modal */}
      {appState === AppState.ERROR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
          <div className="p-10 border border-neutral-600 bg-black/50 text-center max-w-sm w-full shadow-[0_0_50px_rgba(255,255,255,0.05)] relative flex flex-col items-center">
            {/* Inner Border Decoration */}
            <div className="absolute inset-1 border border-neutral-800 pointer-events-none"></div>
            
            <h3 className="text-neutral-200 mb-6 font-typewriter text-lg tracking-[0.2em] uppercase text-bloom border-b border-neutral-700 pb-3 w-full">
              Signal Lost
            </h3>
            
            <p className="text-neutral-400 text-xs font-typewriter mb-10 leading-relaxed uppercase tracking-wider">
              {errorMsg}
            </p>
            
            <Button 
              variant="secondary" 
              onClick={() => setAppState(AppState.IDLE)} 
              className="w-full text-xs text-neutral-300 border-neutral-600 hover:border-white hover:text-white"
            >
              Retry Connection
            </Button>
          </div>
        </div>
      )}

      <footer className="absolute bottom-4 w-full text-center relative z-20 pointer-events-none">
        <p className="text-[9px] text-neutral-500 font-mono tracking-[0.5em] uppercase opacity-50">Gemini Vision Integration</p>
      </footer>
    </div>
  );
};

export default App;