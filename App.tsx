import React, { useState, useCallback } from 'react';
import { OrbitalElements, ParameterKey } from './types';
import { OrbitalScene } from './components/OrbitalScene';
import { Controls } from './components/Controls';
import { ExplanationPanel } from './components/ExplanationPanel';
import { generateOrbitalExplanation } from './services/geminiService';
import { Settings2 } from 'lucide-react';

const INITIAL_ELEMENTS: OrbitalElements = {
  a: 8,               // Semi-major axis
  e: 0.4,             // Eccentricity
  i: 45 * (Math.PI/180), // Inclination
  omega: 45 * (Math.PI/180), // Argument of Perigee
  raan: 30 * (Math.PI/180),  // RAAN
  nu: 0               // True Anomaly
};

const PARAM_NAMES: Record<ParameterKey, string> = {
  [ParameterKey.A]: "半长轴 (Semi-Major Axis)",
  [ParameterKey.E]: "偏心率 (Eccentricity)",
  [ParameterKey.I]: "轨道倾角 (Inclination)",
  [ParameterKey.OMEGA]: "近地点幅角 (Argument of Perigee)",
  [ParameterKey.RAAN]: "升交点赤经 (RAAN)",
  [ParameterKey.NU]: "真近点角 (True Anomaly)"
};

const App: React.FC = () => {
  const [elements, setElements] = useState<OrbitalElements>(INITIAL_ELEMENTS);
  
  // Reset trigger allows us to signal the 3D scene to reset camera
  const [resetTrigger, setResetTrigger] = useState(0);
  
  // UI State
  const [showControls, setShowControls] = useState(true);
  
  // AI Explanation State
  const [explanation, setExplanation] = useState<{ title: string, content: string } | null>(null);
  const [isLoadingExplanation, setIsLoadingExplanation] = useState(false);
  const [isPanelVisible, setIsPanelVisible] = useState(false);

  const handleUpdateElement = useCallback((key: ParameterKey, value: number) => {
    setElements(prev => ({
      ...prev,
      [key]: value
    }));
  }, []);

  const handleReset = useCallback(() => {
    // Spread INITIAL_ELEMENTS to ensure a new object reference is created, 
    // forcing React to update all downstream components (sliders, etc.)
    setElements({ ...INITIAL_ELEMENTS });
    // Increment trigger to notify Scene to reset camera
    setResetTrigger(prev => prev + 1);
  }, []);

  const handleExplain = useCallback(async (key: ParameterKey, value: number, unit: string) => {
    setIsPanelVisible(true);
    setIsLoadingExplanation(true);
    const name = PARAM_NAMES[key];
    
    try {
      const content = await generateOrbitalExplanation(name, value, unit);
      setExplanation({ title: name, content });
    } catch (err) {
      setExplanation({ title: "错误", content: "无法获取解释。" });
    } finally {
      setIsLoadingExplanation(false);
    }
  }, []);

  return (
    <div className="flex w-full h-screen bg-black text-white overflow-hidden relative font-sans">
      {/* Main 3D Viewport - Added min-w-0 to prevent flex item from overflowing parent on resize */}
      <div className="flex-grow h-full relative z-0 min-w-0">
        <OrbitalScene elements={elements} resetTrigger={resetTrigger} />
        
        {/* Toggle Button (Visible when sidebar is closed) */}
        <div className={`absolute top-6 right-6 z-20 transition-all duration-500 ${showControls ? 'opacity-0 pointer-events-none translate-x-10' : 'opacity-100 translate-x-0'}`}>
          <button 
            onClick={() => setShowControls(true)}
            className="bg-gray-900/80 backdrop-blur-md border border-cyan-500/30 text-cyan-400 px-4 py-2 rounded-full shadow-lg hover:bg-gray-800 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 font-bold text-sm"
          >
            <Settings2 size={16} />
            参数设置
          </button>
        </div>
      </div>

      {/* Side Control Panel Container */}
      {/* We animate width and translate to create a smooth slide effect without squashing content immediately */}
      <div className={`
        h-full z-10 shadow-2xl flex-shrink-0 bg-gray-900 border-l border-white/10 relative overflow-hidden transition-all duration-500 cubic-bezier(0.25, 0.8, 0.25, 1)
        ${showControls ? 'w-[400px] translate-x-0' : 'w-0 translate-x-20 opacity-0'}
      `}>
        {/* Inner container maintains fixed width to prevent content layout shift during width transition */}
        <div className="w-[400px] h-full absolute right-0 top-0">
          <Controls 
            elements={elements} 
            onUpdate={handleUpdateElement} 
            onExplain={handleExplain}
            explanationLoading={isLoadingExplanation}
            onReset={handleReset}
            onClose={() => setShowControls(false)}
          />
        </div>
      </div>

      {/* Floating Explanation Panel */}
      <ExplanationPanel 
        title={explanation?.title || ''} 
        content={explanation?.content || ''} 
        isVisible={isPanelVisible}
        isLoading={isLoadingExplanation}
        onClose={() => setIsPanelVisible(false)}
        sidePanelOpen={showControls}
      />

      {/* Mobile Warning (if screen is too small) */}
      <div className="absolute top-0 left-0 w-full h-full bg-black flex items-center justify-center z-50 md:hidden p-8 text-center">
        <p className="text-gray-400">为了获得最佳的3D教学体验，请在更大的屏幕或横屏模式下查看。</p>
      </div>
    </div>
  );
};

export default App;