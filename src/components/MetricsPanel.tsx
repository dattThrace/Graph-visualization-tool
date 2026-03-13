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
    { label: 'Max Degree', value: metrics.maxDegree },
    { label: 'Min Degree', value: metrics.minDegree },
    { label: 'Components', value: metrics.components },
    { label: 'Complete?', value: metrics.isComplete ? 'Yes' : 'No' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[#141414] border border-[#141414] rounded-sm overflow-hidden">
      {items.map((item, idx) => (
        <div key={idx} className="bg-[#E4E3E0] p-3 flex flex-col gap-1">
          <span className="font-serif italic text-[10px] uppercase tracking-wider opacity-60">
            {item.label}
          </span>
          <span className="font-mono text-lg font-bold">
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
};

export default MetricsPanel;
