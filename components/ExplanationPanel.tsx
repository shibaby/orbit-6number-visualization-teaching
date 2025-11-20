import React from 'react';
import { Sparkles, X, BookOpen } from 'lucide-react';

interface ExplanationPanelProps {
  title: string;
  content: string;
  isVisible: boolean;
  onClose: () => void;
  isLoading: boolean;
  sidePanelOpen?: boolean;
}

export const ExplanationPanel: React.FC<ExplanationPanelProps> = ({ 
  title, 
  content, 
  isVisible, 
  onClose,
  isLoading,
  sidePanelOpen = true
}) => {
  if (!isVisible && !isLoading) return null;

  return (
    <div 
      className={`absolute bottom-6 transition-all duration-500 cubic-bezier(0.16, 1, 0.3, 1) transform 
        ${isVisible || isLoading ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'}
        ${sidePanelOpen ? 'right-6 md:right-[420px] left-6' : 'right-6 left-6 md:left-auto md:w-[500px]'}
      `}
    >
      <div className="bg-gray-900/90 backdrop-blur-xl border border-cyan-500/30 rounded-2xl p-6 shadow-2xl shadow-cyan-900/20 max-w-3xl">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isLoading ? 'bg-cyan-900/30' : 'bg-blue-900/30'}`}>
               {isLoading ? <Sparkles className="w-5 h-5 text-cyan-300 animate-pulse" /> : <BookOpen className="w-5 h-5 text-blue-400" />}
            </div>
            <div>
                <h3 className="font-bold text-lg text-white tracking-wide">
                {isLoading ? "AI 老师思考中..." : title}
                </h3>
                {!isLoading && <div className="text-[10px] text-cyan-500 uppercase font-semibold tracking-wider">知识点讲解</div>}
            </div>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors p-1 hover:bg-gray-800 rounded-full">
            <X size={20} />
          </button>
        </div>
        
        <div className="text-gray-200 leading-7 text-sm md:text-base pl-2">
          {isLoading ? (
             <div className="space-y-3 py-2">
               <div className="h-2 bg-gray-700/50 rounded w-3/4 animate-pulse"></div>
               <div className="h-2 bg-gray-700/50 rounded w-full animate-pulse"></div>
               <div className="h-2 bg-gray-700/50 rounded w-5/6 animate-pulse"></div>
             </div>
          ) : (
            <div className="markdown-body font-light">
                {content}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};