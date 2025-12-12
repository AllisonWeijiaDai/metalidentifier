import React, { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { ArrowLeft, Save } from 'lucide-react';
import { AnalysisResult } from '../types';
import { Button } from './Button';

interface ResultViewProps {
  result: AnalysisResult;
  onReset: () => void;
  isSaved?: boolean;
}

export const ResultView: React.FC<ResultViewProps> = ({ result, onReset, isSaved }) => {
  
  // ----------------------------------------------------------------------
  // UNKNOWN ENTITY / NOT FOUND STATE
  // ----------------------------------------------------------------------
  if (result.identifiedName === 'Unknown Entity') {
    return (
      <div className="flex flex-col h-full bg-black items-center justify-center p-8 text-center relative z-20 overflow-hidden">
        {/* Background Image - Blurred Source */}
        <div className="absolute inset-0 z-0">
           <img src={result.sourceImage} className="w-full h-full object-cover grayscale blur-xl opacity-20" />
           <div className="absolute inset-0 bg-black/80" />
        </div>

        <div className="relative z-10 space-y-8 max-w-md flex flex-col items-center">
          {/* Replaced Skull with the Source Image Thumbnail */}
          <div className="w-24 h-24 md:w-32 md:h-32 bg-black border-2 border-neutral-700 p-1 shadow-2xl rotate-3 transform hover:rotate-0 transition-transform duration-500">
            <div className="w-full h-full relative overflow-hidden bg-neutral-900">
              <img 
                src={result.sourceImage} 
                alt="The devoured entity" 
                className="w-full h-full object-cover grayscale contrast-125 opacity-80" 
              />
              <div className="absolute inset-0 shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] pointer-events-none" />
            </div>
          </div>
          
          <h2 className="text-2xl md:text-3xl font-typewriter text-neutral-400 leading-none tracking-widest text-bloom">
            The void stared back. <br />
            Your quest has failed,<br />
            please give up.
          </h2>
          
          <div className="pt-8">
            <Button variant="secondary" onClick={onReset} className="border-neutral-700 hover:border-neutral-400 text-neutral-500 hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-2" /> Give Up
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------------------------
  // SUCCESS STATE
  // ----------------------------------------------------------------------

  const otherLinks = useMemo(() => {
     return result.groundingChunks?.filter(c => c.web) || [];
  }, [result.groundingChunks]);

  return (
    <div className="flex flex-col h-full bg-black text-neutral-200 overflow-y-auto relative z-20">
      
      {/* Header Image - Forced Grayscale & High Contrast */}
      <div className="relative w-full h-[40vh] flex-shrink-0 bg-neutral-900 overflow-hidden">
        <img 
          src={result.sourceImage} 
          alt="Captured" 
          className="w-full h-full object-contain grayscale contrast-[1.2] brightness-90 opacity-100 translate-y-12"
        />
        {/* Fog Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black" />
        
        <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-center z-10">
          <button 
            onClick={onReset}
            className="group flex items-center gap-2 text-neutral-400 hover:text-white transition-all font-typewriter text-xs tracking-[0.2em] uppercase hover:text-bloom"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            <span>Return</span>
          </button>
          
          {isSaved && (
             <div className="flex items-center gap-2 text-neutral-400 font-typewriter text-xs tracking-[0.2em] uppercase cursor-default opacity-80">
               <Save className="w-4 h-4" />
               <span>Saved</span>
             </div>
          )}
        </div>

        <div className="absolute bottom-8 left-8 right-8 text-center">
          <div className="text-neutral-400 text-s font-typewriter uppercase tracking-[0.5em] mb-2">{result.identifiedType}</div>
          <h1 className="text-3xl md:text-5xl font-typewriter text-white tracking-widest uppercase text-bloom drop-shadow-2xl">
            {result.identifiedName}
          </h1>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-8 md:p-12 max-w-3xl mx-auto w-full relative z-10 space-y-12">
        
        {/* Main AI Output */}
        <div className="prose prose-invert max-w-none font-typewriter">
          <ReactMarkdown 
            components={{
              h1: ({node, ...props}) => <h1 className="hidden" {...props} />,
              h2: ({node, ...props}) => <h2 className="text-xl border-b border-neutral-800 pb-4 mt-10 mb-6 font-typewriter tracking-widest uppercase text-neutral-300" {...props} />,
              h3: ({node, ...props}) => <h3 className="text-lg text-neutral-500 mt-8 mb-4 italic font-typewriter" {...props} />,
              li: ({node, ...props}) => <li className="text-neutral-400 marker:text-neutral-700 font-typewriter mb-2" {...props} />,
              p: ({node, ...props}) => <p className="font-typewriter text-neutral-400 leading-loose mb-6" {...props} />,
              strong: ({node, ...props}) => <strong className="font-typewriter font-bold text-white" {...props} />,
              a: ({node, ...props}) => <a className="font-typewriter text-white underline underline-offset-4 decoration-neutral-700 hover:decoration-white transition-all" {...props} />,
            }}
          >
            {result.text}
          </ReactMarkdown>
        </div>

        {/* Other Web Sources */}
        {otherLinks.length > 0 && (
           <div className="pt-8 pb-8">
             <h4 className="text-[15px] font-typewriter text-neutral-300 uppercase tracking-[0.2em] mb-4">Web Sources</h4>
             <ul className="space-y-3">
               {otherLinks.slice(0, 3).map((link, i) => (
                 <li key={i}>
                   <a 
                     href={link.web?.uri} 
                     target="_blank" 
                     rel="noopener noreferrer" 
                     referrerPolicy="no-referrer"
                     className="text-xs font-typewriter text-neutral-600 hover:text-neutral-300 block transition-colors hover:underline decoration-neutral-800 underline-offset-4 truncate"
                   >
                     {link.web?.title}
                   </a>
                 </li>
               ))}
             </ul>
           </div>
        )}
      </div>
    </div>
  );
};