import React from 'react';
import { GraphMetrics } from '../types';

interface MetricsPanelProps {
  metrics: GraphMetrics;
}

const MetricsPanel: React.FC<MetricsPanelProps> = ({ metrics }) => {
  const items = [
    { label: 'Vertices (n)', value: metrics.nodeCount },
    { label: 'Edges (m)', value: metrics.edgeCount },
    { label: 'Density', value: metrics.density.toFixed(3) },
    { label: 'Avg Degree', value: metrics.avgDegree.toFixed(2) },
    { label: 'Components', value: metrics.components },
    { label: 'Triangles', value: metrics.triangles ?? 0 },
    { label: 'Alg. Conn. (λ₂)', value: metrics.algebraicConnectivity?.toFixed(3) ?? '0.000' },
    { label: 'Complete?', value: metrics.isComplete ? 'Yes' : 'No' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[#141414] border border-[#141414] rounded-sm overflow-hidden">
      {items.map((item, idx) => (
        <div key={idx} className="bg-[#E4E3E0] p-3 flex flex-col gap-1 relative group">
          <span className="font-serif italic text-[10px] uppercase tracking-wider opacity-60">
            {item.label}
          </span>
          <span className="font-mono text-lg font-bold">
            {item.value}
          </span>
          {item.label === 'Alg. Conn. (λ₂)' && (
            <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block w-48 p-2 bg-[#141414] text-[#E4E3E0] text-[10px] font-mono z-10 rounded-sm shadow-lg">
              The second smallest eigenvalue of the Laplacian matrix. A measure of how well-connected the graph is.
            </div>
          )}
          {item.label === 'Triangles' && (
            <div className="absolute bottom-full left-0 mb-2 hidden group-hover:block w-48 p-2 bg-[#141414] text-[#E4E3E0] text-[10px] font-mono z-10 rounded-sm shadow-lg">
              Calculated algebraically via Tr(A³)/6.
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default MetricsPanel;
