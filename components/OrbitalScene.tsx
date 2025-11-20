import React, { useMemo, useRef, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars, Line, Html } from '@react-three/drei';
import * as THREE from 'three';
import { HelpCircle, X, Move } from 'lucide-react';
import { OrbitalElements } from '../types';
import { calculatePosition, generateOrbitPath, perifocalToThree, getNodeVector, getPerigeeVector, getOrbitNormal } from '../utils/orbitalMath';

interface OrbitalSceneProps {
  elements: OrbitalElements;
  resetTrigger?: number;
}

// --- Color Palette (Optimized for Contrast) ---
const COLORS = {
  vernal: '#ef4444',  // Red - X Axis (Standard)
  north: '#3b82f6',   // Blue - Z Axis (Standard) - DISTINCT from Perigee
  
  node: '#e879f9',    // Magenta - High contrast against Blue/Green
  normal: '#22c55e',  // Green - High contrast against Magenta (Node)
  
  perigee: '#ffffff', // White - Brightest element, distinct from all colors
  majorAxis: '#f97316', // Orange - Distinct from White (Perigee) and Gold (Orbit)
  orbit: '#fbbf24',   // Amber/Gold - Classic orbit color
  
  equator: '#06b6d4', // Cyan - For Equator
  anomaly: '#38bdf8', // Sky Blue - For Satellite Position vector
  
  planeEquator: '#06b6d4', // Cyan fill
  planeOrbit: '#fcd34d',   // Lighter Amber fill
};

// --- Visual Helpers ---

const AngleArc = ({ 
  startVec, 
  endVec, 
  center = new THREE.Vector3(0,0,0), 
  color, 
  radius = 3, 
  label 
}: { 
  startVec: THREE.Vector3, 
  endVec: THREE.Vector3, 
  center?: THREE.Vector3,
  color: string, 
  radius?: number,
  label?: string
}) => {
  const points = useMemo(() => {
    const pts = [];
    const segments = 32;
    const v1 = startVec.clone().normalize();
    const v2 = endVec.clone().normalize();
    
    let angle = v1.angleTo(v2);
    const cross = new THREE.Vector3().crossVectors(v1, v2);
    if (cross.lengthSq() < 0.0001) return [];
    
    const axis = cross.normalize();
    if (Math.abs(angle) < 0.01) return [];

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const rotated = v1.clone().applyAxisAngle(axis, angle * t);
      pts.push(rotated.multiplyScalar(radius).add(center));
    }
    return pts;
  }, [startVec, endVec, radius, center]);

  if (points.length === 0) return null;

  const midPoint = points[Math.floor(points.length / 2)];

  return (
    <group>
      <Line points={points} color={color} lineWidth={3} transparent opacity={0.8} />
      {label && (
        <Html position={midPoint} center>
          <div className="bg-black/80 text-white px-1.5 py-0.5 rounded text-xs font-bold border border-white/20 select-none whitespace-nowrap backdrop-blur-sm shadow-sm" style={{ color: color, borderColor: color }}>
            {label}
          </div>
        </Html>
      )}
    </group>
  );
};

const VectorLine = ({ 
  start, 
  end, 
  color, 
  label, 
  dashed = false,
  throughEarth = false
}: { 
  start: THREE.Vector3, 
  end: THREE.Vector3, 
  color: string, 
  label?: string, 
  dashed?: boolean,
  throughEarth?: boolean 
}) => {
  return (
    <group>
      <Line 
        points={[start, end]} 
        color={color} 
        lineWidth={2} 
        dashed={dashed} 
        dashScale={2} 
        gapSize={0.5}
        depthTest={!throughEarth}
        opacity={throughEarth ? 0.6 : 1}
        transparent={throughEarth}
        renderOrder={throughEarth ? 999 : 0}
      />
      {label && (
        <Html position={end} center>
          <div className="text-xs font-bold whitespace-nowrap ml-2 select-none shadow-black drop-shadow-md bg-black/30 px-1 rounded backdrop-blur-[2px]" style={{ color: color }}>
            {label}
          </div>
        </Html>
      )}
    </group>
  );
};

// --- Scene Components ---

const Satellite = ({ position }: { position: THREE.Vector3 }) => {
  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[0.5, 16, 16]} />
        <meshStandardMaterial color="#00ffff" emissive="#00aaaa" emissiveIntensity={1} />
      </mesh>
      <pointLight distance={8} intensity={8} color="#00ffff" />
      <Html position={[0.8, 0.8, 0]}>
        <div className="text-cyan-400 text-xs font-mono font-bold bg-black/50 px-1 rounded">卫星</div>
      </Html>
    </group>
  );
};

const Earth = () => {
  return (
    <group>
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[2, 64, 64]} />
        <meshPhongMaterial 
          color="#1e3a8a" 
          emissive="#05102b"
          specular="#333"
          shininess={15}
        />
      </mesh>

      {/* Equator Line (Torus) - Thicker and slightly larger radius to stand out */}
      <mesh rotation={[Math.PI/2, 0, 0]}>
        <torusGeometry args={[2.05, 0.05, 64, 100]} />
        <meshBasicMaterial color={COLORS.equator} />
      </mesh>

      {/* Equatorial Plane Visualization */}
      <group position={[0, 0, 0]}>
        {/* 1. Large Filled Disc (Subtle tint) */}
        <mesh rotation={[-Math.PI/2, 0, 0]}>
          <circleGeometry args={[30, 64]} />
          <meshBasicMaterial 
            color={COLORS.planeEquator} 
            opacity={0.1} 
            transparent 
            side={THREE.DoubleSide} 
            depthWrite={false} 
          />
        </mesh>
        
        {/* 2. Standard Grid Helper (Square grid) - Replaces PolarGrid for better 'plane' feel */}
        {/* Default gridHelper is on XZ plane, which matches Equator in our setup */}
        <gridHelper args={[60, 20, COLORS.planeEquator, COLORS.planeEquator]}>
          <meshBasicMaterial attach="material" color={COLORS.planeEquator} transparent opacity={0.2} depthWrite={false} />
        </gridHelper>
      </group>

      <Html position={[2.6, 0.3, 0]}>
        <div className="text-cyan-400 text-[10px] font-bold whitespace-nowrap opacity-90 select-none bg-black/40 px-1.5 py-0.5 rounded border border-cyan-500/30 backdrop-blur-sm">
          赤道
        </div>
      </Html>
    </group>
  );
};

const OrbitalPlaneSurface = ({ elements }: { elements: OrbitalElements }) => {
  const geometry = useMemo(() => {
    const points = generateOrbitPath(elements, 128);
    const vertices = [0, 0, 0]; // Index 0 is center
    points.forEach(p => vertices.push(p.x, p.y, p.z));

    const indices = [];
    for (let i = 1; i < points.length; i++) {
      indices.push(0, i, i + 1);
    }

    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geom.setIndex(indices);
    geom.computeVertexNormals();
    return geom;
  }, [elements]);

  return (
    <mesh geometry={geometry}>
      <meshBasicMaterial 
        color={COLORS.planeOrbit} 
        opacity={0.2} 
        transparent 
        side={THREE.DoubleSide} 
        depthWrite={false} 
      />
    </mesh>
  );
};

const OrbitPath = ({ elements }: { elements: OrbitalElements }) => {
  const points = useMemo(() => generateOrbitPath(elements), [elements]);
  return (
    <group>
      <Line points={points} color={COLORS.orbit} lineWidth={2} />
      <OrbitalPlaneSurface elements={elements} />
    </group>
  );
};

const VisualGuides = ({ elements }: { elements: OrbitalElements }) => {
  const { a, e, i, omega, raan, nu } = elements;

  // --- Constants & Vectors ---
  const center = new THREE.Vector3(0,0,0);
  const vernalVec = new THREE.Vector3(14, 0, 0); // X-Axis (Extended)
  const northVec = new THREE.Vector3(0, 14, 0);  // Y-Axis (Extended)

  // --- Calculated Vectors ---
  const nodeVec = getNodeVector(elements).multiplyScalar(12);
  const perigeeDir = getPerigeeVector(elements);
  const perigeeVec = perigeeDir.clone().multiplyScalar(12);
  const orbitNormal = getOrbitNormal(elements).multiplyScalar(10);
  const satPos = calculatePosition(elements, nu);

  // Ellipse centers
  const ellipseCenter = perifocalToThree(-a * e, 0, 0, elements);
  const apogeePos = calculatePosition(elements, Math.PI);
  const perigeePosForLine = calculatePosition(elements, 0);

  return (
    <group>
      <Html position={[20, 0, 20]} center>
        <div className="text-cyan-900/40 text-4xl font-black whitespace-nowrap select-none pointer-events-none transform -rotate-45 tracking-widest">
          赤道平面
        </div>
      </Html>

      <VectorLine start={center} end={vernalVec} color={COLORS.vernal} label="春分点 (X)" throughEarth />
      <VectorLine start={center} end={northVec} color={COLORS.north} label="北极 (Z)" throughEarth />

      {/* --- Orbital Elements Visuals --- */}

      {/* 1. RAAN (Ω) - Magenta */}
      <VectorLine start={center} end={nodeVec} color={COLORS.node} label="升交点线" dashed throughEarth />
      <AngleArc 
        startVec={new THREE.Vector3(1,0,0)} 
        endVec={nodeVec.clone().projectOnPlane(new THREE.Vector3(0,1,0))}
        color={COLORS.node} 
        radius={5} 
        label={`Ω ${(raan * 180 / Math.PI).toFixed(0)}°`}
      />

      {/* 2. Inclination (i) - Green (Distinct from Magenta) */}
      <VectorLine start={center} end={orbitNormal} color={COLORS.normal} dashed label="轨道法线" throughEarth />
      <AngleArc 
        startVec={new THREE.Vector3(0,1,0)} 
        endVec={orbitNormal} 
        color={COLORS.normal} 
        radius={4} 
        label={`i ${(i * 180 / Math.PI).toFixed(0)}°`} 
      />

      {/* 3. Argument of Perigee (ω) - White (High Contrast) */}
      <VectorLine start={center} end={perigeeVec} color={COLORS.perigee} label="近地点" dashed throughEarth />
      <AngleArc 
        startVec={nodeVec} 
        endVec={perigeeVec} 
        color={COLORS.perigee} 
        radius={7} 
        label={`ω ${(omega * 180 / Math.PI).toFixed(0)}°`} 
      />

      {/* 4. True Anomaly (ν) - Sky Blue */}
      <VectorLine start={center} end={satPos} color={COLORS.anomaly} dashed throughEarth />
      <AngleArc 
        startVec={perigeeVec} 
        endVec={satPos} 
        color={COLORS.anomaly} 
        radius={3} 
        label={`ν ${(nu * 180 / Math.PI).toFixed(0)}°`} 
      />

      {/* 5 & 6. a, e Visuals */}
      {/* Major Axis Line (Visible through Earth) - Updated to Orange */}
      <VectorLine 
        start={perigeePosForLine} 
        end={apogeePos} 
        color={COLORS.majorAxis} 
        dashed 
        throughEarth 
        label="长轴"
      />
      
      {/* Center Marker */}
      <mesh position={ellipseCenter}>
        <boxGeometry args={[0.3, 0.3, 0.3]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      
      {/* Label for a */}
      <Html position={ellipseCenter.clone().lerp(apogeePos, 0.6)}>
        <div className="text-white font-bold text-xs bg-gray-800/50 px-1 rounded border border-white/10" style={{color: COLORS.majorAxis}}>
          a (半长轴)
        </div>
      </Html>
    </group>
  );
};

const SceneContent = ({ elements, resetTrigger }: { elements: OrbitalElements, resetTrigger?: number }) => {
  const satellitePos = useMemo(() => calculatePosition(elements), [elements]);
  const controlsRef = useRef<any>(null);

  useEffect(() => {
    if (controlsRef.current && resetTrigger !== undefined && resetTrigger > 0) {
      controlsRef.current.reset();
    }
  }, [resetTrigger]);
  
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[10, 10, 5]} intensity={2} />
      <Stars radius={100} depth={50} count={5000} factor={4} fade />
      
      <Earth />
      <OrbitPath elements={elements} />
      <VisualGuides elements={elements} />
      <Satellite position={satellitePos} />

      <OrbitControls ref={controlsRef} minDistance={5} maxDistance={60} />
    </>
  );
};

// --- Help/Glossary Component ---

const HelpModal = ({ onClose }: { onClose: () => void }) => {
  const [position, setPosition] = useState({ x: 40, y: 40 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  return (
    <div 
      style={{ left: position.x, top: position.y }}
      className="absolute z-50 w-full max-w-md flex flex-col max-h-[80vh] bg-gray-900/95 backdrop-blur-md border border-gray-600 rounded-xl shadow-2xl"
    >
      <div 
        className="flex justify-between items-center p-4 border-b border-gray-700 cursor-move bg-gray-800/50 rounded-t-xl select-none hover:bg-gray-800 transition-colors"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <h2 className="text-lg font-bold text-cyan-400 flex items-center gap-2">
          <HelpCircle size={20} /> 3D 视图图解指南
        </h2>
        <div className="flex items-center gap-3">
            <span className="text-[10px] text-gray-500 uppercase font-bold flex items-center gap-1">
                <Move size={10} /> 拖动我
            </span>
            <button 
              onClick={onClose} 
              onPointerDown={(e) => e.stopPropagation()}
              className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-white/10 rounded"
            >
                <X size={20} />
            </button>
        </div>
      </div>

      <div className="overflow-y-auto custom-scrollbar p-6">
        <div className="space-y-6 text-gray-200 text-sm">
          <section>
            <h3 className="text-white font-bold border-b border-gray-700 pb-2 mb-3">参考基准面</h3>
            <div className="grid grid-cols-1 gap-3">
              <div className="bg-slate-800/50 p-2 rounded flex gap-3 items-center border-l-2 border-cyan-500">
                <div className="w-4 h-4 rounded bg-cyan-500/50 border border-cyan-400 flex-shrink-0"></div>
                <div>
                    <span className="text-cyan-400 font-bold block text-xs">赤道平面 (Equatorial Plane)</span>
                    <p className="text-gray-400 text-[10px]">带有网格的青色方形平面。所有角度测量的基准水平面。</p>
                </div>
              </div>
              <div className="bg-slate-800/50 p-2 rounded flex gap-3 items-center border-l-2 border-amber-500">
                <div className="w-4 h-4 rounded bg-amber-500/50 border border-amber-400 flex-shrink-0"></div>
                <div>
                    <span className="text-amber-400 font-bold block text-xs">轨道平面 (Orbital Plane)</span>
                    <p className="text-gray-400 text-[10px]">金黄色的填充椭圆面。卫星在其上运动，随倾角(i)倾斜。</p>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h3 className="text-white font-bold border-b border-gray-700 pb-2 mb-3">关键矢量与颜色</h3>
            <div className="space-y-4">
              <div className="flex gap-3 items-start">
                <div className="min-w-[3rem] font-bold text-xs mt-1" style={{color: COLORS.majorAxis}}>半长轴</div>
                <div>
                  <div className="font-semibold text-xs text-white">Semi-major Axis (橙色)</div>
                  <p className="text-gray-400 text-xs leading-tight mt-1">连接近地点和远地点的虚线。代表轨道的大小。</p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <div className="min-w-[3rem] font-bold text-xs mt-1" style={{color: COLORS.node}}>升交点线</div>
                <div>
                  <div className="font-semibold text-xs text-white">Line of Nodes (洋红色)</div>
                  <p className="text-gray-400 text-xs leading-tight mt-1">轨道面穿过赤道面的交线。颜色鲜艳，与绿色法线对比强烈。</p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <div className="min-w-[3rem] font-bold text-xs mt-1" style={{color: COLORS.perigee}}>近地点</div>
                <div>
                  <div className="font-semibold text-xs text-white">Perigee (白色)</div>
                  <p className="text-gray-400 text-xs leading-tight mt-1">轨道上离地球最近的点。白色高亮，区别于所有其他彩色轴线。</p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <div className="min-w-[3rem] font-bold text-xs mt-1" style={{color: COLORS.normal}}>轨道法线</div>
                <div>
                  <div className="font-semibold text-xs text-white">Orbit Normal (绿色)</div>
                  <p className="text-gray-400 text-xs leading-tight mt-1">垂直于轨道面的指针。决定了轨道的倾斜程度(i)。</p>
                </div>
              </div>
               <div className="flex gap-3 items-start">
                <div className="min-w-[3rem] font-bold text-xs mt-1" style={{color: COLORS.north}}>北极</div>
                <div>
                  <div className="font-semibold text-xs text-white">North Pole (蓝色)</div>
                  <p className="text-gray-400 text-xs leading-tight mt-1">地球自转轴正北方向。Z轴基准。</p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export const OrbitalScene: React.FC<OrbitalSceneProps> = ({ elements, resetTrigger }) => {
  const [showHelp, setShowHelp] = useState(false);

  return (
    <div className="w-full h-full bg-black relative group">
      <Canvas camera={{ position: [15, 15, 20], fov: 45 }}>
        <SceneContent elements={elements} resetTrigger={resetTrigger} />
      </Canvas>
      
      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}

      {/* Bottom Legend */}
      <div className="absolute bottom-6 left-6 pointer-events-none select-none z-10 flex gap-4 items-end">
         <div className="bg-gray-900/90 backdrop-blur-md p-4 rounded-lg border border-gray-700 text-xs text-gray-300 space-y-2 shadow-xl">
            <div className="font-bold text-white mb-2 text-sm border-b border-gray-600 pb-2 flex justify-between items-center">
              3D 视图图例
            </div>
            {/* Expanded Grid for Legend items */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2">
               <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{backgroundColor: COLORS.vernal}}></span> 春分点 (X)</div>
               <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{backgroundColor: COLORS.north}}></span> 北极 (Z)</div>
               <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{backgroundColor: COLORS.node}}></span> Ω: 升交点</div>
               
               <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{backgroundColor: COLORS.normal}}></span> i: 轨道法线</div>
               <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-white border border-gray-500"></span> ω: 近地点</div>
               <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full" style={{backgroundColor: COLORS.anomaly}}></span> ν: 卫星位置</div>
               
               <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full border border-white/50" style={{backgroundColor: COLORS.majorAxis}}></span> a: 半长轴</div>
               <div className="flex items-center gap-2"><span className="w-3 h-3 rounded border border-white/50 bg-white"></span> 几何中心 (e)</div>
               <div className="flex items-center gap-2"><span className="w-3 h-3 rounded border border-white/50" style={{backgroundColor: COLORS.planeEquator}}></span> 赤道面</div>
               {/* Move Orbit Plane to ensure grid balance if needed, or just let it wrap */}
               <div className="flex items-center gap-2"><span className="w-3 h-3 rounded border border-white/50" style={{backgroundColor: COLORS.planeOrbit}}></span> 轨道面</div>
            </div>
         </div>
         
         <button 
            onClick={() => setShowHelp(prev => !prev)}
            className="pointer-events-auto bg-gray-800 hover:bg-gray-700 text-cyan-400 border border-cyan-500/50 p-3 rounded-full shadow-lg transition-all hover:scale-110 active:scale-95 flex items-center justify-center"
            title={showHelp ? "关闭图解指南" : "打开图解指南"}
         >
            {showHelp ? <X size={24} /> : <HelpCircle size={24} />}
         </button>
      </div>
    </div>
  );
};