import React, { useEffect, useRef, useState, useMemo } from 'react';
import ForceGraph3D from 'react-force-graph-3d';
import { GraphData, Node as GraphNode, Edge as GraphEdge } from '../types';
import { GraphDynamics } from '../math/dynamics';
import { getLaplacianMatrix } from '../math/matrix';

interface GraphView3DProps {
  data: GraphData;
  width?: number;
  height?: number;
  mode?: 'planar' | 'wave' | 'heat';
  fiedlerVector?: number[];
  showPartition?: boolean;
}

export const GraphView3D: React.FC<GraphView3DProps> = ({
  data,
  width = 600,
  height = 400,
  mode = 'planar',
  fiedlerVector = [],
  showPartition = false,
}) => {
  const fgRef = useRef<any>();
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width, height });
  const [dynamics, setDynamics] = useState<GraphDynamics | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!containerRef.current) return;
    const observer = new ResizeObserver(entries => {
      if (entries[0]) {
        const { width, height } = entries[0].contentRect;
        setDimensions({ width, height });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Initialize dynamics when graph changes
  useEffect(() => {
    if (mode === 'wave' || mode === 'heat') {
      const n = data?.nodes?.length || 0;
      const adjacency = Array.from({ length: n }, () => Array(n).fill(0));
      if (data?.edges) {
        (data.edges || []).forEach(e => {
          const sourceId = typeof e.source === 'object' ? (e.source as any).id : e.source;
          const targetId = typeof e.target === 'object' ? (e.target as any).id : e.target;
          if (sourceId < n && targetId < n) {
            adjacency[sourceId][targetId] = 1;
            adjacency[targetId][sourceId] = 1;
          }
        });
      }
      const laplacian = getLaplacianMatrix(adjacency);
      const dyn = new GraphDynamics(laplacian);
      setDynamics(dyn);
      
      // Flatten the graph to 2D initially for wave/heat
      if (fgRef.current) {
        const gData = fgRef.current.graphData();
        const nodes = gData ? gData.nodes : [];
        (nodes || []).forEach((node: any) => {
          node.fz = 0;
        });
      }
    } else {
      setDynamics(null);
      // Release Z constraint for planar mode
      if (fgRef.current) {
        const gData = fgRef.current.graphData();
        const nodes = gData ? gData.nodes : [];
        (nodes || []).forEach((node: any) => {
          node.fz = undefined;
        });
      }
    }
  }, [data, mode, showPartition, fiedlerVector]);

  // Animation loop for dynamics
  useEffect(() => {
    if (!dynamics || mode === 'planar') return;

    let animationFrameId: number;
    let lastTime = performance.now();

    const animate = (time: number) => {
      const dt = (time - lastTime) / 1000;
      lastTime = time;

      // Step simulation
      if (mode === 'wave') {
        dynamics.stepWave();
      } else if (mode === 'heat') {
        dynamics.stepHeat(2.0); // Faster heat diffusion
      }

      // Update node visuals
      const fg = fgRef.current;
      if (fg) {
        const u = dynamics.getValues();
        const gData = fg.graphData();
        const nodes = gData ? gData.nodes : [];
        (nodes || []).forEach((node: any) => {
          const val = u[node.id] || 0;
          node.val = val; // Store for color/size
            
          // In wave mode, we displace in Z.
          if (mode === 'wave') {
            const zPos = val * 20;
            node.fz = zPos;
            node.z = zPos;
          }
        });
        
        // Reheat simulation slightly to update links if nodes moved
        if (mode === 'wave') {
          fg.d3ReheatSimulation();
        }
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [dynamics, mode]);

  // Update colors when partition changes in planar mode
  useEffect(() => {
    // No-op, ForceGraph3D will re-render via nodeColor prop
  }, [showPartition, fiedlerVector, mode]);
  const handleNodeClick = (node: any) => {
    if (dynamics) {
      dynamics.pluck(node.id, mode === 'wave' ? 2.0 : 1.0);
    }
  };

  // Prepare data for ForceGraph3D
  const graphData = useMemo(() => {
    return {
      nodes: (data?.nodes || []).map(n => ({ ...n })),
      edges: (data?.edges || []).map(e => ({ ...e }))
    };
  }, [data]);

  return (
    <div ref={containerRef} className="border border-[#141414] bg-[#141414] overflow-hidden rounded-sm h-full w-full relative">
      {mounted && dimensions.width > 0 && dimensions.height > 0 && (
        <ForceGraph3D
          ref={fgRef}
          width={dimensions.width}
          height={dimensions.height}
          graphData={graphData}
          nodeLabel="label"
          nodeRelSize={6}
          nodeColor={(node: any) => {
            if (mode === 'wave') {
              const val = node.val || 0;
              const hue = val > 0 ? 0.6 : 0.0;
              const lightness = 0.5 + Math.abs(val) * 0.5;
              return `hsl(${hue * 360}, 100%, ${Math.min(100, lightness * 100)}%)`;
            }
            if (mode === 'heat') {
              const heat = Math.max(-1, Math.min(1, node.val || 0));
              const hue = (1 - heat) * 0.33;
              return `hsl(${hue * 360}, 100%, 50%)`;
            }
            if (showPartition && fiedlerVector && fiedlerVector[node.id] !== undefined) {
              return fiedlerVector[node.id] > 0 ? '#818cf8' : '#fbbf24';
            }
            return '#E4E3E0';
          }}
          nodeVal={(node: any) => {
            if (mode === 'heat') return 1 + Math.abs(node.val || 0) * 5;
            return 6;
          }}
        linkColor={() => '#404040'}
        linkWidth={1}
        onNodeClick={handleNodeClick}
        backgroundColor="#141414"
      />
      )}
      
      {/* Overlay controls/info */}
      <div className="absolute top-4 left-4 text-[#E4E3E0] font-mono text-xs pointer-events-none">
        {mode === 'planar' && (
          <div>
            <div className="font-bold mb-1">Planar Analysis Mode (3D)</div>
            <div className="opacity-70">Rotate to inspect edge crossings.</div>
            <div className="opacity-70">If it can be untangled without crossings, it's planar.</div>
          </div>
        )}
        {mode === 'wave' && (
          <div>
            <div className="font-bold mb-1">Wave Equation Simulator</div>
            <div className="opacity-70">Click nodes to "pluck" the graph.</div>
            <div className="opacity-70">Waves propagate via the Laplacian.</div>
          </div>
        )}
        {mode === 'heat' && (
          <div>
            <div className="font-bold mb-1">Heat Diffusion Simulator</div>
            <div className="opacity-70">Click nodes to inject heat.</div>
            <div className="opacity-70">Heat diffuses via the Laplacian.</div>
          </div>
        )}
      </div>
    </div>
  );
};
