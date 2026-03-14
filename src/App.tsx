import React, { useState, useMemo } from 'react';
import { AdjacencyMatrix, FaultCondition, BooleanOp, MatrixType } from './types';
import { PRESETS, matrixToGraph, calculateMetrics, findMinimumHardeningEdges, HardeningSolution, cn, CutSet } from './utils';
import { getDegreeMatrix, getLaplacianMatrix } from './math/matrix';
import GraphView from './components/GraphView';
import AdjacencyMatrixView from './components/AdjacencyMatrix';
import MetricsPanel from './components/MetricsPanel';
import FaultTolerancePanel from './components/FaultTolerancePanel';
import { GraphView3D } from './components/GraphView3D';
import { Settings, Grid3X3, Share2, Info, Plus, Minus, RefreshCw, Shield, Sliders, Zap, Lock, Unlock, AlertTriangle, Calculator, Activity, Box } from 'lucide-react';

export default function App() {
  const [matrix, setMatrix] = useState<AdjacencyMatrix>(PRESETS['Triangle']);
  const [customSize, setCustomSize] = useState(5);
  const [matrixViewType, setMatrixViewType] = useState<MatrixType>('adjacency');
  const [showPartition, setShowPartition] = useState(false);
  
  // 3D View State
  const [is3DMode, setIs3DMode] = useState(false);
  const [view3DMode, setView3DMode] = useState<'planar' | 'wave' | 'heat'>('planar');
  
  // Physics Settings
  const [gravity, setGravity] = useState(-300);
  const [spring, setSpring] = useState(100);

  // Hardening State
  const [hardeningSolution, setHardeningSolution] = useState<HardeningSolution | null>(null);
  const [isHardeningMode, setIsHardeningMode] = useState(false);

  // Failure Scenario State
  const [failureScenario, setFailureScenario] = useState<CutSet | null>(null);

  // Fault Tolerance Conditions State
  const [conditions, setConditions] = useState<FaultCondition[]>([]);
  const [globalOp, setGlobalOp] = useState<BooleanOp>('AND');

  const clearRealization = () => {
    setHardeningSolution(null);
    setIsHardeningMode(false);
    setFailureScenario(null);
  };

  const graphData = useMemo(() => matrixToGraph(matrix), [matrix]);
  const metrics = useMemo(() => calculateMetrics(matrix), [matrix]);

  const displayMatrix = useMemo(() => {
    if (matrixViewType === 'degree') return getDegreeMatrix(matrix);
    if (matrixViewType === 'laplacian') return getLaplacianMatrix(matrix);
    return matrix;
  }, [matrix, matrixViewType]);

  const handleToggleEdge = (i: number, j: number) => {
    if (i === j || isHardeningMode || failureScenario || matrixViewType !== 'adjacency') return;
    const newMatrix = matrix.map(row => [...row]);
    const newVal = newMatrix[i][j] === 1 ? 0 : 1;
    newMatrix[i][j] = newVal;
    newMatrix[j][i] = newVal; // Symmetric
    setMatrix(newMatrix);
    // Reset states if graph changes
    clearRealization();
  };

  const handlePresetChange = (name: string) => {
    setMatrix(PRESETS[name]);
    clearRealization();
  };

  const handleCreateCustom = () => {
    const size = Math.max(2, Math.min(20, customSize));
    const newMatrix = Array.from({ length: size }, () => Array(size).fill(0));
    setMatrix(newMatrix);
    clearRealization();
  };

  const handleHarden = (condition: FaultCondition) => {
    if (isHardeningMode) {
      setIsHardeningMode(false);
      setHardeningSolution(null);
    } else {
      setFailureScenario(null); // Mutual exclusivity
      const solution = findMinimumHardeningEdges(matrix, condition);
      setHardeningSolution(solution);
      setIsHardeningMode(true);
    }
  };

  const handleShowFailure = (cut: CutSet | null) => {
    setFailureScenario(cut);
    if (cut) {
      setIsHardeningMode(false); // Mutual exclusivity
      setHardeningSolution(null);
    }
  };

  const handleConditionsChange = (newConditions: FaultCondition[]) => {
    setConditions(newConditions);
    clearRealization();
  };

  const handleGlobalOpChange = (op: BooleanOp) => {
    setGlobalOp(op);
    clearRealization();
  };

  const toggleHardeningMode = () => {
    setIsHardeningMode(!isHardeningMode);
  };

  return (
    <div className="min-h-screen bg-[#E4E3E0] text-[#141414] font-sans selection:bg-[#141414] selection:text-[#E4E3E0]">
      {/* Header */}
      <header className="border-bottom border-[#141414] p-6 flex justify-between items-center border-b">
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold tracking-tighter uppercase flex items-center gap-2">
            <Grid3X3 size={24} />
            Graph Theory Explorer
          </h1>
          <p className="font-serif italic text-xs opacity-60">
            Interactive adjacency matrix & vertex-edge visualization
          </p>
        </div>
        <div className="flex gap-4">
          <button className="p-2 border border-[#141414] hover:bg-[#141414] hover:text-[#E4E3E0] transition-colors">
            <Settings size={18} />
          </button>
          <button className="p-2 border border-[#141414] hover:bg-[#141414] hover:text-[#E4E3E0] transition-colors">
            <Share2 size={18} />
          </button>
        </div>
      </header>

      <main className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Sidebar: Controls & Metrics */}
        <div className="lg:col-span-3 flex flex-col gap-8">
          {/* Presets */}
          <section className="flex flex-col gap-4">
            <h2 className="font-serif italic text-sm uppercase tracking-widest opacity-50 flex items-center gap-2">
              <RefreshCw size={14} />
              Presets
            </h2>
            <div className="flex flex-wrap gap-2">
              {Object.keys(PRESETS).map(name => (
                <button
                  key={name}
                  onClick={() => handlePresetChange(name)}
                  className="px-3 py-1.5 border border-[#141414] text-xs font-mono hover:bg-[#141414] hover:text-[#E4E3E0] transition-colors"
                >
                  {name}
                </button>
              ))}
            </div>
          </section>

          {/* Custom Dimension */}
          <section className="flex flex-col gap-4">
            <h2 className="font-serif italic text-sm uppercase tracking-widest opacity-50 flex items-center gap-2">
              <Plus size={14} />
              Initialize Custom
            </h2>
            <div className="flex items-center gap-2">
              <div className="flex border border-[#141414]">
                <button 
                  onClick={() => setCustomSize(s => Math.max(2, s - 1))}
                  className="p-2 hover:bg-[#141414] hover:text-[#E4E3E0]"
                >
                  <Minus size={14} />
                </button>
                <input 
                  type="number" 
                  value={customSize}
                  onChange={(e) => setCustomSize(parseInt(e.target.value) || 2)}
                  className="w-12 text-center font-mono bg-transparent outline-none border-x border-[#141414]"
                />
                <button 
                  onClick={() => setCustomSize(s => Math.min(20, s + 1))}
                  className="p-2 hover:bg-[#141414] hover:text-[#E4E3E0]"
                >
                  <Plus size={14} />
                </button>
              </div>
              <button 
                onClick={handleCreateCustom}
                className="flex-1 py-2 bg-[#141414] text-[#E4E3E0] text-xs font-bold uppercase tracking-widest hover:opacity-90 active:scale-95 transition-all"
              >
                Create
              </button>
            </div>
          </section>

          {/* Metrics */}
          <section className="flex flex-col gap-4">
            <h2 className="font-serif italic text-sm uppercase tracking-widest opacity-50 flex items-center gap-2">
              <Info size={14} />
              Measurements
            </h2>
            <MetricsPanel metrics={metrics} />
          </section>

          {/* Spectral Analysis */}
          <section className="flex flex-col gap-4">
            <h2 className="font-serif italic text-sm uppercase tracking-widest opacity-50 flex items-center gap-2">
              <Activity size={14} />
              Spectral Analysis
            </h2>
            <div className="flex flex-col gap-4 p-4 bg-[#E4E3E0] border border-[#141414] rounded-sm">
              <div className="flex justify-between items-center">
                <label className="font-serif italic text-[10px] uppercase tracking-widest opacity-60">
                  Fiedler Partitioning
                </label>
                <button
                  onClick={() => setShowPartition(!showPartition)}
                  className={cn(
                    "px-3 py-1 font-mono text-[10px] uppercase tracking-widest transition-colors border border-[#141414]",
                    showPartition ? "bg-[#141414] text-[#E4E3E0]" : "hover:bg-slate-100"
                  )}
                >
                  {showPartition ? 'Hide' : 'Show'}
                </button>
              </div>
              
              {metrics.spectrum && (
                <div className="flex flex-col gap-2">
                  <label className="font-serif italic text-[10px] uppercase tracking-widest opacity-60">
                    Laplacian Spectrum (Eigenvalues)
                  </label>
                  <div className="flex flex-wrap gap-1">
                    {metrics.spectrum.map((val, idx) => (
                      <div 
                        key={idx} 
                        className={cn(
                          "px-2 py-1 font-mono text-[10px] border border-[#141414]",
                          idx === (metrics.fiedlerIndex ?? 1) ? "bg-indigo-100 font-bold" : "bg-white/50"
                        )}
                        title={idx === (metrics.fiedlerIndex ?? 1) ? "Algebraic Connectivity (Fiedler Value)" : `Eigenvalue ${idx}`}
                      >
                        {val.toFixed(3)}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Physics Controls */}
          <section className="flex flex-col gap-4">
            <h2 className="font-serif italic text-sm uppercase tracking-widest opacity-50 flex items-center gap-2">
              <Sliders size={14} />
              Physics Engine
            </h2>
            <div className="flex flex-col gap-4 p-4 bg-[#E4E3E0] border border-[#141414] rounded-sm">
              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center">
                  <label className="font-serif italic text-[10px] uppercase tracking-widest opacity-60">Gravity</label>
                  <span className="font-mono text-[10px]">{gravity}</span>
                </div>
                <input 
                  type="range" min="-1000" max="0" step="50" 
                  value={gravity} 
                  onChange={(e) => setGravity(parseInt(e.target.value))}
                  className="w-full accent-[#141414]"
                />
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex justify-between items-center">
                  <label className="font-serif italic text-[10px] uppercase tracking-widest opacity-60">Spring</label>
                  <span className="font-mono text-[10px]">{spring}</span>
                </div>
                <input 
                  type="range" min="20" max="300" step="10" 
                  value={spring} 
                  onChange={(e) => setSpring(parseInt(e.target.value))}
                  className="w-full accent-[#141414]"
                />
              </div>
            </div>
          </section>

          {/* Fault Tolerance */}
          <section className="flex flex-col gap-4">
            <h2 className="font-serif italic text-sm uppercase tracking-widest opacity-50 flex items-center gap-2">
              <Shield size={14} />
              Fault Tolerance
            </h2>
            <FaultTolerancePanel 
              matrix={matrix} 
              onHarden={handleHarden}
              isHardening={isHardeningMode}
              onShowFailure={handleShowFailure}
              activeFailure={failureScenario}
              conditions={conditions}
              onConditionsChange={handleConditionsChange}
              globalOp={globalOp}
              onGlobalOpChange={handleGlobalOpChange}
            />
          </section>
        </div>

        {/* Main Content: Side-by-Side Visualization */}
        <div className="lg:col-span-9 flex flex-col gap-8">
          {/* Hardening Mode Banner */}
          {isHardeningMode && hardeningSolution && (
            <div className="bg-emerald-500 text-white p-4 flex justify-between items-center rounded-sm shadow-lg animate-in fade-in slide-in-from-top-4">
              <div className="flex items-center gap-3">
                <Zap size={20} />
                <div>
                  <h3 className="font-bold uppercase tracking-tighter text-sm">Hardening Solution Found</h3>
                  <p className="font-mono text-[10px] opacity-90">
                    Add {hardeningSolution.minEdges} edge{hardeningSolution.minEdges !== 1 ? 's' : ''} to satisfy conditions. 
                    {hardeningSolution.isUnique ? ' (Unique Solution)' : ' (Non-unique solution shown)'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full">
                  <Lock size={14} />
                  <span className="font-mono text-[10px] font-bold uppercase">Editing Locked</span>
                </div>
                <button 
                  onClick={() => setIsHardeningMode(false)}
                  className="px-4 py-1.5 bg-white text-emerald-600 font-bold text-xs uppercase tracking-widest hover:bg-emerald-50 transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {/* Failure Mode Banner */}
          {failureScenario && (
            <div className="bg-rose-500 text-white p-4 flex justify-between items-center rounded-sm shadow-lg animate-in fade-in slide-in-from-top-4">
              <div className="flex items-center gap-3">
                <AlertTriangle size={20} />
                <div>
                  <h3 className="font-bold uppercase tracking-tighter text-sm">Vulnerability Identified</h3>
                  <p className="font-mono text-[10px] opacity-90">
                    Removing {failureScenario.vertices.length} vertices and {failureScenario.edges.length} edges disconnects the graph.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 px-3 py-1 bg-white/20 rounded-full">
                  <Lock size={14} />
                  <span className="font-mono text-[10px] font-bold uppercase">Editing Locked</span>
                </div>
                <button 
                  onClick={() => setFailureScenario(null)}
                  className="px-4 py-1.5 bg-white text-rose-600 font-bold text-xs uppercase tracking-widest hover:bg-rose-50 transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {/* Graph Visualization */}
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <h2 className="font-serif italic text-sm uppercase tracking-widest opacity-50 flex items-center gap-2">
                  Vertex-Edge Model
                  {isHardeningMode && <span className="text-emerald-600 flex items-center gap-1"><Zap size={12} /> Showing Suggestions</span>}
                  {failureScenario && <span className="text-rose-600 flex items-center gap-1"><AlertTriangle size={12} /> Showing Vulnerability</span>}
                </h2>
                
                {/* 3D Mode Toggle */}
                <div className="flex items-center gap-2">
                  {is3DMode && (
                    <select 
                      value={view3DMode}
                      onChange={(e) => setView3DMode(e.target.value as any)}
                      className="bg-transparent border border-[#141414] rounded-sm px-2 py-1 font-mono text-[10px] uppercase tracking-widest outline-none"
                    >
                      <option value="planar">Planar Analysis</option>
                      <option value="wave">Wave Eq.</option>
                      <option value="heat">Heat Eq.</option>
                    </select>
                  )}
                  <button
                    onClick={() => setIs3DMode(!is3DMode)}
                    className={cn(
                      "flex items-center gap-1 px-3 py-1 font-mono text-[10px] uppercase tracking-widest transition-colors border border-[#141414] rounded-sm",
                      is3DMode ? "bg-[#141414] text-[#E4E3E0]" : "bg-white hover:bg-slate-100"
                    )}
                  >
                    <Box size={12} />
                    {is3DMode ? '2D View' : '3D View'}
                  </button>
                </div>
              </div>
              <div className="aspect-square xl:aspect-auto xl:h-[500px]">
                {is3DMode ? (
                  <GraphView3D
                    data={graphData}
                    height={500}
                    width={800}
                    mode={view3DMode}
                    fiedlerVector={metrics.fiedlerVector}
                    showPartition={showPartition}
                  />
                ) : (
                  <GraphView 
                    data={graphData} 
                    height={500} 
                    width={800} 
                    gravityStrength={gravity}
                    springConstant={spring}
                    suggestedEdges={isHardeningMode ? hardeningSolution?.edges : []}
                    failedNodes={failureScenario?.vertices}
                    failedEdges={failureScenario?.edges}
                    fiedlerVector={metrics.fiedlerVector}
                    showPartition={showPartition}
                  />
                )}
              </div>
            </div>

            {/* Adjacency Matrix */}
            <div className="flex flex-col gap-4 relative">
              <div className="flex justify-between items-center">
                <h2 className="font-serif italic text-sm uppercase tracking-widest opacity-50 flex items-center gap-2">
                  <Calculator size={14} />
                  Matrix Representation
                </h2>
                <div className="flex bg-white border border-[#141414] rounded-sm overflow-hidden">
                  {(['adjacency', 'degree', 'laplacian'] as MatrixType[]).map(type => (
                    <button
                      key={type}
                      onClick={() => setMatrixViewType(type)}
                      className={cn(
                        "px-3 py-1 font-mono text-[10px] uppercase tracking-widest transition-colors",
                        matrixViewType === type ? "bg-[#141414] text-[#E4E3E0]" : "hover:bg-slate-100"
                      )}
                    >
                      {type === 'adjacency' ? 'A' : type === 'degree' ? 'D' : 'L'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="relative">
                <div className={cn((isHardeningMode || failureScenario || matrixViewType !== 'adjacency') && "pointer-events-none")}>
                  <AdjacencyMatrixView 
                    matrix={displayMatrix} 
                    type={matrixViewType}
                    onToggle={handleToggleEdge} 
                    highlightedEdges={isHardeningMode ? hardeningSolution?.edges : []}
                    failedNodes={failureScenario?.vertices}
                    failedEdges={failureScenario?.edges}
                  />
                </div>
                {(isHardeningMode || failureScenario || matrixViewType !== 'adjacency') && (
                  <div className="absolute top-2 right-2 flex items-center gap-2 px-2 py-1 bg-[#141414] text-[#E4E3E0] rounded-sm shadow-lg z-20">
                    <Lock size={12} />
                    <span className="font-mono text-[8px] uppercase tracking-widest">
                      {matrixViewType !== 'adjacency' ? 'Read Only' : 'Locked'}
                    </span>
                  </div>
                )}
              </div>
              <p className="text-[10px] font-mono opacity-40 leading-tight">
                {matrixViewType === 'adjacency' && "* Click cells to toggle edges. Matrix is symmetric (A = Aᵀ). Self-loops (diagonal) are disabled."}
                {matrixViewType === 'degree' && "* Degree matrix (D): Diagonal contains vertex degrees, off-diagonal is 0."}
                {matrixViewType === 'laplacian' && "* Laplacian matrix (L = D - A): Diagonal contains degrees, off-diagonal is -1 for connected vertices."}
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="mt-12 border-t border-[#141414] p-8 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4 opacity-40">
          <span className="font-mono text-[10px]">v1.0.0</span>
          <span className="font-mono text-[10px]">UNDIRECTED_GRAPH_MODE</span>
        </div>
        <div className="text-[10px] font-mono opacity-40 text-center md:text-right">
          Built for research and educational purposes in graph theory.
        </div>
      </footer>
    </div>
  );
}
