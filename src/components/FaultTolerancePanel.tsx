import React, { useMemo } from 'react';
import { AdjacencyMatrix, FaultCondition, BooleanOp } from '../types';
import { evaluateFaultCondition, cn, findCutSet, CutSet } from '../utils';
import { Shield, ShieldAlert, ShieldCheck, Plus, Trash2, Zap, Layers, ChevronRight, Eye, EyeOff } from 'lucide-react';

interface FaultTolerancePanelProps {
  matrix: AdjacencyMatrix;
  onHarden?: (condition: FaultCondition) => void;
  isHardening?: boolean;
  onShowFailure?: (cut: CutSet | null) => void;
  activeFailure?: CutSet | null;
  conditions: FaultCondition[];
  onConditionsChange: (conditions: FaultCondition[]) => void;
  globalOp: BooleanOp;
  onGlobalOpChange: (op: BooleanOp) => void;
}

const FaultTolerancePanel: React.FC<FaultTolerancePanelProps> = ({ 
  matrix, 
  onHarden,
  isHardening = false,
  onShowFailure,
  activeFailure = null,
  conditions,
  onConditionsChange,
  globalOp,
  onGlobalOpChange
}) => {
  const activeCondition: FaultCondition = useMemo(() => {
    const conds = conditions || [];
    if (conds.length === 1) return conds[0];
    return { type: 'composite', op: globalOp, conditions: conds };
  }, [conditions, globalOp]);

  const addAtomic = () => {
    const newCond: FaultCondition = { type: 'atomic', vertices: 1, edges: 0 };
    onConditionsChange([...(conditions || []), newCond]);
  };

  const removeCondition = (index: number) => {
    onConditionsChange((conditions || []).filter((_, i) => i !== index));
  };

  const updateAtomic = (index: number, field: 'vertices' | 'edges', val: number) => {
    const newConditions = [...(conditions || [])];
    const cond = newConditions[index];
    if (cond && cond.type === 'atomic') {
      cond[field] = Math.max(0, Math.min(5, val));
      onConditionsChange(newConditions);
    }
  };

  const overallPassed = useMemo(() => {
    const conds = conditions || [];
    if (conds.length === 0) return true;
    if (globalOp === 'AND') {
      return conds.every(c => evaluateFaultCondition(matrix, c));
    } else {
      return conds.some(c => evaluateFaultCondition(matrix, c));
    }
  }, [matrix, conditions, globalOp]);

  const handleToggleFailure = (cond: FaultCondition) => {
    if (!onShowFailure) return;
    if (activeFailure) {
      onShowFailure(null);
    } else {
      if (cond.type === 'atomic') {
        const cut = findCutSet(matrix, cond.vertices, cond.edges);
        onShowFailure(cut);
      }
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6 bg-[#E4E3E0] border border-[#141414] rounded-sm">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className={cn(
            "p-2 rounded-full border border-[#141414]",
            overallPassed ? "bg-emerald-500/20 text-emerald-700" : "bg-rose-500/20 text-rose-700"
          )}>
            {overallPassed ? <ShieldCheck size={20} /> : <ShieldAlert size={20} />}
          </div>
          <div>
            <h3 className="font-bold uppercase tracking-tighter text-sm">Fault Tolerance</h3>
            <p className="font-serif italic text-[10px] opacity-60">Adversarial Connectivity Probing</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          {(conditions || []).length > 1 && (
            <button 
              onClick={() => onGlobalOpChange(globalOp === 'AND' ? 'OR' : 'AND')}
              className={cn(
                "px-3 py-1 border border-[#141414] font-mono text-[10px] transition-colors",
                globalOp === 'AND' ? "bg-[#141414] text-[#E4E3E0]" : "bg-white text-[#141414]"
              )}
              title={globalOp === 'AND' ? "Must survive ALL rules (Strictest)" : "Must survive AT LEAST ONE rule (Weakest)"}
            >
              MODE: {globalOp === 'AND' ? 'STRICT (ALL)' : 'PARTIAL (ANY)'}
            </button>
          )}
          <button 
            onClick={addAtomic}
            className="flex items-center gap-1 px-3 py-1 bg-[#141414] text-[#E4E3E0] font-bold text-[10px] uppercase tracking-widest hover:opacity-90"
          >
            <Plus size={12} /> Add Rule
          </button>
          {(conditions || []).length > 0 && onHarden && (
            <button 
              onClick={() => onHarden(activeCondition)}
              disabled={!isHardening && overallPassed}
              className={cn(
                "flex items-center gap-1 px-3 py-1 font-bold text-[10px] uppercase tracking-widest transition-all",
                !isHardening && overallPassed 
                  ? "bg-emerald-500/20 text-emerald-700 cursor-default border border-emerald-500/20" 
                  : isHardening 
                    ? "bg-emerald-600 text-white hover:bg-emerald-700" 
                    : "bg-[#141414] text-[#E4E3E0] hover:bg-emerald-600"
              )}
            >
              <Zap size={12} /> {isHardening ? 'Dismiss Solution' : 'Harden'}
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {(conditions || []).length === 0 ? (
          <div className="py-8 border border-dashed border-[#141414]/20 flex flex-col items-center justify-center gap-2 opacity-40">
            <Shield size={24} />
            <span className="font-serif italic text-xs">No failure conditions defined</span>
          </div>
        ) : (
          (conditions || []).map((cond, idx) => {
            if (cond.type !== 'atomic') return null;
            const passed = evaluateFaultCondition(matrix, cond);
            
            return (
              <div key={idx} className="group relative flex flex-col gap-3 p-4 border border-[#141414] bg-white/50">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-2 h-2 rounded-full",
                      passed ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]"
                    )} />
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wider">
                      Rule {idx + 1}: {passed ? 'SURVIVED' : 'FAILED'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    {!passed && onShowFailure && (
                      <button 
                        onClick={() => handleToggleFailure(cond)}
                        className={cn(
                          "p-1 transition-all rounded-sm",
                          activeFailure ? "bg-rose-600 text-white" : "text-rose-600 hover:bg-rose-50"
                        )}
                        title="Show failure scenario"
                      >
                        {activeFailure ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    )}
                    <button 
                      onClick={() => removeCondition(idx)}
                      className="opacity-0 group-hover:opacity-100 p-1 text-rose-600 hover:bg-rose-50 transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="flex flex-col gap-1">
                    <label className="font-serif italic text-[9px] opacity-50 uppercase tracking-widest">Vertices to remove</label>
                    <div className="flex items-center gap-2">
                      <Zap size={12} className="opacity-40" />
                      <div className="flex border border-[#141414]">
                        <button onClick={() => updateAtomic(idx, 'vertices', cond.vertices - 1)} className="px-2 py-1 hover:bg-[#141414] hover:text-[#E4E3E0]">-</button>
                        <span className="px-3 py-1 font-mono text-xs border-x border-[#141414] min-w-[30px] text-center">{cond.vertices}</span>
                        <button onClick={() => updateAtomic(idx, 'vertices', cond.vertices + 1)} className="px-2 py-1 hover:bg-[#141414] hover:text-[#E4E3E0]">+</button>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="font-serif italic text-[9px] opacity-50 uppercase tracking-widest">Edges to remove</label>
                    <div className="flex items-center gap-2">
                      <Layers size={12} className="opacity-40" />
                      <div className="flex border border-[#141414]">
                        <button onClick={() => updateAtomic(idx, 'edges', cond.edges - 1)} className="px-2 py-1 hover:bg-[#141414] hover:text-[#E4E3E0]">-</button>
                        <span className="px-3 py-1 font-mono text-xs border-x border-[#141414] min-w-[30px] text-center">{cond.edges}</span>
                        <button onClick={() => updateAtomic(idx, 'edges', cond.edges + 1)} className="px-2 py-1 hover:bg-[#141414] hover:text-[#E4E3E0]">+</button>
                      </div>
                    </div>
                  </div>
                </div>

                {(idx < (conditions?.length || 0) - 1) && (
                  <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 z-10 bg-[#141414] text-[#E4E3E0] px-2 py-0.5 font-mono text-[8px] uppercase tracking-widest">
                    {globalOp}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="mt-auto pt-4 border-t border-[#141414]/10">
        <div className="flex items-start gap-2 opacity-50">
          <ChevronRight size={12} className="mt-0.5" />
          <p className="text-[9px] font-mono leading-tight">
            The graph is considered <strong>Fault Tolerant</strong> if it remains connected under the specified failure scenarios. 
            Probing is performed exhaustively across all combinations.
          </p>
        </div>
      </div>
    </div>
  );
};

export default FaultTolerancePanel;
