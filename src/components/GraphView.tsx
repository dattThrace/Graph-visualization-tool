import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { GraphData, Node as GraphNode, Edge as GraphEdge } from '../types';

interface D3Node extends d3.SimulationNodeDatum, GraphNode {}
interface D3Edge extends d3.SimulationLinkDatum<D3Node> {
  source: D3Node | number;
  target: D3Node | number;
}

interface GraphViewProps {
  data: GraphData;
  width?: number;
  height?: number;
  gravityStrength?: number;
  springConstant?: number;
  suggestedEdges?: GraphEdge[];
  failedNodes?: number[];
  failedEdges?: [number, number][];
  fiedlerVector?: number[];
  showPartition?: boolean;
}

const GraphView: React.FC<GraphViewProps> = ({ 
  data, 
  width = 600, 
  height = 400,
  gravityStrength = -300,
  springConstant = 100,
  suggestedEdges = [],
  failedNodes = [],
  failedEdges = [],
  fiedlerVector = [],
  showPartition = false
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    // Deep copy data to avoid mutating props, and cast to D3 types
    const nodes: D3Node[] = (data?.nodes || []).map(n => ({ ...n }));
    const edges: D3Edge[] = (data?.edges || []).map(e => ({ ...e }));
    const sEdges: D3Edge[] = (suggestedEdges || []).map(e => ({ ...e }));

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const simulation = d3.forceSimulation<D3Node>(nodes)
      .force("link", d3.forceLink<D3Node, D3Edge>([...edges, ...sEdges]).id(d => d.id).distance(springConstant))
      .force("charge", d3.forceManyBody().strength(gravityStrength))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(30));

    // Suggested Edges (Dashed Emerald)
    const suggestedLink = svg.append("g")
      .attr("stroke", "#10b981")
      .attr("stroke-opacity", 0.9)
      .attr("stroke-dasharray", "8,4")
      .selectAll("line")
      .data(sEdges)
      .join("line")
      .attr("stroke-width", 4)
      .attr("class", "animate-pulse");

    const link = svg.append("g")
      .attr("stroke-opacity", 0.6)
      .selectAll("line")
      .data(edges)
      .join("line")
      .attr("stroke-width", 2)
      .attr("stroke", d => {
        const s = typeof d.source === 'number' ? d.source : (d.source as any).id;
        const t = typeof d.target === 'number' ? d.target : (d.target as any).id;
        const isFailed = (failedEdges || []).some(([u, v]) => (u === s && v === t) || (u === t && v === s));
        return isFailed ? "#f43f5e" : "#141414";
      })
      .attr("stroke-dasharray", d => {
        const s = typeof d.source === 'number' ? d.source : (d.source as any).id;
        const t = typeof d.target === 'number' ? d.target : (d.target as any).id;
        const isFailed = (failedEdges || []).some(([u, v]) => (u === s && v === t) || (u === t && v === s));
        return isFailed ? "4,4" : null;
      });

    const node = svg.append("g")
      .selectAll("g")
      .data(nodes)
      .join("g")
      .call(d3.drag<SVGGElement, D3Node>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended) as any);

    node.append("circle")
      .attr("r", 12)
      .attr("fill", d => {
        if ((failedNodes || []).includes(d.id)) return "#f43f5e";
        if (showPartition && fiedlerVector && fiedlerVector[d.id] !== undefined) {
          return fiedlerVector[d.id] > 0 ? "#818cf8" : "#fbbf24"; // Indigo vs Amber
        }
        return "#E4E3E0";
      })
      .attr("stroke", d => {
        if (failedNodes.includes(d.id)) return "#be123c";
        if (showPartition && fiedlerVector && fiedlerVector[d.id] !== undefined) {
          return fiedlerVector[d.id] > 0 ? "#4f46e5" : "#d97706";
        }
        return "#141414";
      })
      .attr("stroke-width", 2)
      .attr("opacity", d => failedNodes.includes(d.id) ? 0.4 : 1);

    node.append("text")
      .text(d => d.label)
      .attr("x", 0)
      .attr("y", 4)
      .attr("text-anchor", "middle")
      .attr("font-size", "10px")
      .attr("font-family", "monospace")
      .attr("pointer-events", "none")
      .attr("fill", d => {
        if (failedNodes.includes(d.id)) return "#fff";
        if (showPartition && fiedlerVector && fiedlerVector[d.id] !== undefined) {
          return "#141414";
        }
        return "#141414";
      });

    simulation.on("tick", () => {
      suggestedLink
        .attr("x1", d => (d.source as D3Node).x ?? 0)
        .attr("y1", d => (d.source as D3Node).y ?? 0)
        .attr("x2", d => (d.target as D3Node).x ?? 0)
        .attr("y2", d => (d.target as D3Node).y ?? 0);

      link
        .attr("x1", d => (d.source as D3Node).x ?? 0)
        .attr("y1", d => (d.source as D3Node).y ?? 0)
        .attr("x2", d => (d.target as D3Node).x ?? 0)
        .attr("y2", d => (d.target as D3Node).y ?? 0);

      node
        .attr("transform", d => `translate(${d.x ?? 0}, ${d.y ?? 0})`);
    });

    function dragstarted(event: d3.D3DragEvent<SVGGElement, D3Node, D3Node>) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    function dragged(event: d3.D3DragEvent<SVGGElement, D3Node, D3Node>) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function dragended(event: d3.D3DragEvent<SVGGElement, D3Node, D3Node>) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }

    return () => simulation.stop();
  }, [data, width, height, gravityStrength, springConstant, suggestedEdges, failedNodes, failedEdges, fiedlerVector, showPartition]);

  return (
    <div className="border border-[#141414] bg-[#E4E3E0] overflow-hidden rounded-sm h-full">
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-full"
      />
    </div>
  );
};

export default GraphView;
