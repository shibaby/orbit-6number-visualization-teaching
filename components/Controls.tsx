import React, { useState } from 'react';
import { OrbitalElements, ParameterKey } from '../types';
import { Info, RotateCcw, AlertTriangle, ChevronRight } from 'lucide-react';

interface ControlsProps {
  elements: OrbitalElements;
  onUpdate: (key: ParameterKey, value: number) => void;
  onExplain: (key: ParameterKey, value: number, unit: string) => void;
  explanationLoading: boolean;
  onReset: () => void;
  onClose?: () => void;
}

const SliderControl = ({ 
  label, 
  value, 
  min, 
  max, 
  step, 
  unit, 
  onChange,
  onInfoClick,
  disabled = false,
  disabledMessage = "",
  subLabel = ""
}: { 
  label: string; 
  value: number; 
  min: number; 
  max: number; 
  step: number; 
  unit: string;
  onChange: (val: number) => void;
  onInfoClick: () => void;
  disabled?: boolean;
  disabledMessage?: string;
  subLabel?: string;
}) => {
  const [isDragging, setIsDragging] = useState(false);

  return (
    <div 
      className={`mb-4 p-3 rounded-xl border transition-all duration-200 group relative
        ${disabled 
          ? 'opacity-50 border-dashed border-gray-700 bg-gray-900/50' 
          : isDragging 
            ? 'bg-gray-800 border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)] scale-[1.02]' 
            : 'border-white/5 bg-white/0 hover:bg-white/5 hover:border-white/10 focus-within:bg-gray-800 focus-within:border-cyan-500/50 focus-within:shadow-lg focus-within:shadow-cyan-900/20'
        }
      `}
    >
      {/* Disabled Overlay Message */}
      {disabled && (
        <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
           <div className="bg-black/80 text-yellow-500 text-xs px-2 py-1 rounded flex items-center gap-1 border border-yellow-500/30">
             <AlertTriangle size={10} /> {disabledMessage}
           </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-3">
        <label className={`text-sm font-medium flex items-center gap-2 transition-colors
          ${disabled ? 'text-gray-500' : isDragging ? 'text-cyan-300' : 'text-gray-300 group-focus-within:text-cyan-100'}
        `}>
          {label}
          <button 
            onClick={onInfoClick}
            disabled={disabled}
            className={`transition-colors p-1 rounded-full
              ${disabled ? 'hidden' : isDragging ? 'text-cyan-400 bg-cyan-900/30 opacity-100' : 'text-gray-600 hover:text-cyan-400 hover:bg-white/10 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100'}
            `}
            title="点击获取AI详细讲解"
          >
            <Info size={14} />
          </button>
        </label>
        <span className={`text-xs font-mono px-2 py-1 rounded border min-w-[4.5rem] text-center transition-all
          ${disabled ? 'text-gray-600 border-gray-800' :
            isDragging 
            ? 'bg-cyan-500 text-white border-cyan-400 font-bold' 
            : 'text-cyan-400 bg-cyan-950/30 border-cyan-500/20 group-focus-within:bg-cyan-500/20 group-focus-within:text-cyan-200'
          }
        `}>
          {value.toFixed(step < 0.1 ? 2 : 0)} {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        onPointerDown={() => !disabled && setIsDragging(true)}
        onPointerUp={() => setIsDragging(false)}
        onBlur={() => setIsDragging(false)}
        className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer focus:outline-none transition-all
            ${disabled ? 'bg-gray-800 cursor-not-allowed' : 'bg-gray-700 accent-cyan-500 hover:accent-cyan-400'}
        `}
      />
      {subLabel && !disabled && (
        <div className="mt-1 text-[10px] text-gray-500 text-right">{subLabel}</div>
      )}
    </div>
  );
};

export const Controls: React.FC<ControlsProps> = ({ elements, onUpdate, onExplain, explanationLoading, onReset, onClose }) => {
  
  // --- Logic for Interdependence ---
  // 1. Circular Orbit Singularity: If e ≈ 0, Argument of Perigee (omega) is undefined.
  const isCircular = elements.e < 0.01;
  
  // 2. Equatorial Orbit Singularity: If i ≈ 0, RAAN (Ω) is undefined (node line is undefined).
  const isEquatorial = elements.i < 0.01 * (Math.PI / 180); // Less than 0.01 degrees
  
  // --- Helper for Range Text ---
  const getInclinationText = (rad: number) => {
    const deg = rad * (180/Math.PI);
    if (deg < 90) return "顺行轨道 (Prograde)";
    if (Math.abs(deg - 90) < 1) return "极地轨道 (Polar)";
    return "逆行轨道 (Retrograde)";
  };

  const getEccentricityText = (e: number) => {
    if (e === 0) return "正圆";
    if (e < 0.2) return "近圆";
    if (e < 0.8) return "椭圆";
    return "高偏心椭圆";
  };

  return (
    <div className="flex flex-col h-full p-6 bg-gray-900/95 backdrop-blur-md overflow-y-auto custom-scrollbar">
      <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/10">
        <h2 className="text-xl font-bold text-white flex items-center gap-3">
          <div className="relative w-6 h-6">
            <div className="absolute inset-0 bg-cyan-500 rounded-full opacity-20 animate-ping"></div>
            <div className="absolute inset-1 bg-cyan-400 rounded-full"></div>
          </div>
          参数控制台
        </h2>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={onReset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-gray-400 hover:text-white border border-transparent hover:border-gray-600 hover:bg-gray-800 transition-all active:scale-95"
            title="重置所有参数"
          >
            <RotateCcw size={14} />
            重置
          </button>
          {onClose && (
            <button 
              onClick={onClose}
              className="p-1.5 rounded-md text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
              title="收起面板"
            >
              <ChevronRight size={20} />
            </button>
          )}
        </div>
      </div>

      <div className="space-y-8">
        <div>
          <h3 className="text-xs uppercase tracking-widest text-gray-500 font-bold mb-2 pl-2 flex items-center gap-2">
            <span className="w-1 h-3 bg-blue-500 rounded-full"></span>
            轨道形状 (Shape)
          </h3>
          <SliderControl
            label="半长轴 a"
            value={elements.a}
            min={4}
            max={15}
            step={0.1}
            unit="DU"
            onChange={(v) => onUpdate(ParameterKey.A, v)}
            onInfoClick={() => onExplain(ParameterKey.A, elements.a, "距离单位")}
            subLabel="控制轨道大小"
          />
          <SliderControl
            label="偏心率 e"
            value={elements.e}
            min={0}
            max={0.85}
            step={0.01}
            unit=""
            onChange={(v) => onUpdate(ParameterKey.E, v)}
            onInfoClick={() => onExplain(ParameterKey.E, elements.e, "无量纲")}
            subLabel={getEccentricityText(elements.e)}
          />
        </div>

        <div>
          <h3 className="text-xs uppercase tracking-widest text-gray-500 font-bold mb-2 pl-2 flex items-center gap-2">
             <span className="w-1 h-3 bg-purple-500 rounded-full"></span>
            空间姿态 (Orientation)
          </h3>
          <SliderControl
            label="轨道倾角 i"
            value={elements.i * (180/Math.PI)}
            min={0}
            max={180}
            step={1}
            unit="°"
            onChange={(v) => onUpdate(ParameterKey.I, v * (Math.PI/180))}
            onInfoClick={() => onExplain(ParameterKey.I, elements.i * (180/Math.PI), "度")}
            subLabel={getInclinationText(elements.i)}
          />
          <SliderControl
            label="升交点赤经 Ω"
            value={elements.raan * (180/Math.PI)}
            min={0}
            max={360}
            step={1}
            unit="°"
            onChange={(v) => onUpdate(ParameterKey.RAAN, v * (Math.PI/180))}
            onInfoClick={() => onExplain(ParameterKey.RAAN, elements.raan * (180/Math.PI), "度")}
            disabled={isEquatorial}
            disabledMessage="赤道轨道无交点"
            subLabel="轨道面绕Z轴旋转"
          />
          <SliderControl
            label="近地点幅角 ω"
            value={elements.omega * (180/Math.PI)}
            min={0}
            max={360}
            step={1}
            unit="°"
            onChange={(v) => onUpdate(ParameterKey.OMEGA, v * (Math.PI/180))}
            onInfoClick={() => onExplain(ParameterKey.OMEGA, elements.omega * (180/Math.PI), "度")}
            disabled={isCircular}
            disabledMessage="圆轨道无近地点"
            subLabel="椭圆在轨道面内的朝向"
          />
        </div>

        <div>
          <h3 className="text-xs uppercase tracking-widest text-gray-500 font-bold mb-2 pl-2 flex items-center gap-2">
            <span className="w-1 h-3 bg-cyan-500 rounded-full"></span>
            卫星位置 (Position)
          </h3>
          <SliderControl
            label="真近点角 ν"
            value={elements.nu * (180/Math.PI)}
            min={0}
            max={360}
            step={1}
            unit="°"
            onChange={(v) => onUpdate(ParameterKey.NU, v * (Math.PI/180))}
            onInfoClick={() => onExplain(ParameterKey.NU, elements.nu * (180/Math.PI), "度")}
            subLabel="卫星沿轨道运行的角度"
          />
        </div>
      </div>

      <div className="mt-auto pt-6 text-[10px] text-gray-600 text-center leading-relaxed">
        <p>提示：当 e=0 或 i=0 时，部分参数会因几何奇异性而锁定。</p>
      </div>
    </div>
  );
};