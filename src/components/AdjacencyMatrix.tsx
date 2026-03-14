import React from 'react';
import { AdjacencyMatrix, MatrixType } from '../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface AdjacencyMatrixProps {
  matrix: AdjacencyMatrix;
  type?: MatrixType;
  onToggle: (i: number, j: number) => void;
  highlightedEdges?: { source: number; target: number }[];
  failedNodes?: number[];
  failedEdges?: [number, number][];
}

const AdjacencyMatrixView: React.FC<AdjacencyMatrixProps> = ({ 
  matrix, 
  type = 'adjacency',
  onToggle, 
  highlightedEdges = [],
  failedNodes = [],
  failedEdges = []
}) => {
  const n = matrix.length;

  const isHighlighted = (i: number, j: number) => {
    return (highlightedEdges || []).some(e => 
      (e.source === i && e.target === j) || (e.source === j && e.target === i)
    );
  };

  const isFailedEdge = (i: number, j: number) => {
    return (failedEdges || []).some(([u, v]) => 
      (u === i && v === j) || (u === j && v === i)
    );
  };

  return (
    <div className="flex flex-col gap-1 p-4 bg-[#E4E3E0] border border-[#141414] rounded-sm overflow-auto max-h-[600px]">
      <div className="flex">
        <div className="w-8 h-8 flex items-center justify-center font-mono text-[10px] opacity-50 italic">
          #
        </div>
        {Array.from({ length: n }).map((_, j) => {
          const isFailed = (failedNodes || []).includes(j);
          return (
            <div 
              key={j} 
              className={cn(
                "w-8 h-8 flex items-center justify-center font-mono text-[10px] transition-colors",
                isFailed ? "bg-rose-500 text-white font-bold" : "opacity-50"
              )}
            >
              {j}
            </div>
          );
        })}
      </div>
      
      {matrix.map((row, i) => {
        const isRowFailed = (failedNodes || []).includes(i);
        return (
          <div key={i} className="flex">
            <div className={cn(
              "w-8 h-8 flex items-center justify-center font-mono text-[10px] transition-colors",
              isRowFailed ? "bg-rose-500 text-white font-bold" : "opacity-50"
            )}>
              {i}
            </div>
            {row.map((val, j) => {
              const isSelf = i === j;
              const highlighted = isHighlighted(i, j);
              const failed = isFailedEdge(i, j);
              
              let displayVal = val;
              if (type === 'adjacency' && highlighted) displayVal = 1;

              // Determine styling based on type and value
              let cellClass = "bg-transparent text-[#141414]";
              if (type === 'adjacency') {
                if (displayVal === 1) cellClass = "bg-[#141414] text-[#E4E3E0]";
              } else if (type === 'degree') {
                if (displayVal > 0) cellClass = "bg-indigo-600 text-white";
              } else if (type === 'laplacian') {
                if (displayVal > 0) cellClass = "bg-indigo-600 text-white";
                else if (displayVal < 0) cellClass = "bg-rose-600 text-white";
              }

              return (
                <button
                  key={j}
                  disabled={isSelf || type !== 'adjacency'}
                  onClick={() => onToggle(i, j)}
                  className={cn(
                    "w-8 h-8 border border-[#141414] flex items-center justify-center transition-colors duration-150 relative",
                    cellClass,
                    highlighted && type === 'adjacency' && "bg-emerald-600 border-emerald-400 text-white z-10",
                    failed && type === 'adjacency' && "bg-rose-500 border-rose-400 text-white z-10",
                    (isRowFailed || failedNodes.includes(j)) && !failed && !highlighted && "opacity-30 grayscale",
                    isSelf && type === 'adjacency' ? "opacity-20 cursor-not-allowed bg-slate-400" : "",
                    !isSelf && type === 'adjacency' ? "hover:bg-[#141414] hover:text-[#E4E3E0] cursor-pointer" : ""
                  )}
                >
                  <span className="font-mono text-xs">{displayVal}</span>
                  {failed && type === 'adjacency' && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-full h-[1px] bg-white/50 rotate-45" />
                      <div className="w-full h-[1px] bg-white/50 -rotate-45" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        );
      })}
    </div>
  );
};

export default AdjacencyMatrixView;
