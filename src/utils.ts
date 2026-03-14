import { AdjacencyMatrix, GraphData, GraphMetrics, Node, Edge, FaultCondition } from './types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { getLaplacianMatrix, matrixPower, trace } from './math/matrix';
import { jacobiEigenvalue } from './math/eigen';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function matrixToGraph(matrix: AdjacencyMatrix): GraphData {
  const n = matrix.length;
  const nodes: Node[] = Array.from({ length: n }, (_, i) => ({
    id: i,
    label: `V${i}`,
  }));

  const edges: Edge[] = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (matrix[i][j] === 1) {
        edges.push({ source: i, target: j });
      }
    }
  }

  return { nodes, edges };
}

export function graphToMatrix(nodes: Node[], edges: Edge[]): AdjacencyMatrix {
  const n = nodes?.length || 0;
  const matrix: AdjacencyMatrix = Array.from({ length: n }, () => Array(n).fill(0));

  if (Array.isArray(edges)) {
    edges.forEach(edge => {
      const s = parseInt(typeof edge.source === 'string' ? edge.source : (edge.source as any).id);
      const t = parseInt(typeof edge.target === 'string' ? edge.target : (edge.target as any).id);
      if (s < n && t < n) {
        matrix[s][t] = 1;
        matrix[t][s] = 1;
      }
    });
  }

  return matrix;
}

export function calculateMetrics(matrix: AdjacencyMatrix): GraphMetrics {
  const n = matrix.length;
  let edgeCount = 0;
  const degrees = Array(n).fill(0);

  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (matrix[i][j] === 1) {
        edgeCount++;
        degrees[i]++;
        degrees[j]++;
      }
    }
  }

  const maxDegree = n > 0 ? Math.max(...degrees) : 0;
  const minDegree = n > 0 ? Math.min(...degrees) : 0;
  const avgDegree = n > 0 ? (2 * edgeCount) / n : 0;
  const density = n > 1 ? (2 * edgeCount) / (n * (n - 1)) : 0;

  // BFS to find components
  const visited = new Set<number>();
  let components = 0;

  for (let i = 0; i < n; i++) {
    if (!visited.has(i)) {
      components++;
      const queue = [i];
      visited.add(i);
      while (queue.length > 0) {
        const u = queue.shift()!;
        for (let v = 0; v < n; v++) {
          if (matrix[u][v] === 1 && !visited.has(v)) {
            visited.add(v);
            queue.push(v);
          }
        }
      }
    }
  }

  // Algebraic Connectivity (Fiedler value)
  let algebraicConnectivity = 0;
  let fiedlerVector: number[] | undefined;
  let spectrum: number[] | undefined;
  let fiedlerIndex = 1;

  if (n > 1) {
    const L = getLaplacianMatrix(matrix);
    const { eigenvalues, eigenvectors } = jacobiEigenvalue(L);
    
    // Clean up floating point inaccuracies
    spectrum = (eigenvalues || []).map(e => Math.abs(e) < 1e-7 ? 0 : e);
    
    // Find the first non-zero eigenvalue (or default to 1 if all are zero)
    fiedlerIndex = (spectrum || []).findIndex((e, i) => i > 0 && e > 1e-7);
    if (fiedlerIndex === -1) fiedlerIndex = 1;

    algebraicConnectivity = spectrum ? (spectrum[fiedlerIndex] || 0) : 0;
    
    // Extract the Fiedler vector
    fiedlerVector = (eigenvectors || []).map(row => row[fiedlerIndex]);
  }

  // Triangles: Tr(A^3) / 6
  let triangles = 0;
  if (n >= 3) {
    const A3 = matrixPower(matrix, 3);
    triangles = Math.round(trace(A3) / 6);
  }

  return {
    nodeCount: n,
    edgeCount,
    density,
    degrees,
    avgDegree,
    maxDegree,
    minDegree,
    components,
    isSimple: true, // Assumed by constraints
    isComplete: edgeCount === (n * (n - 1)) / 2 && n > 0,
    algebraicConnectivity,
    triangles,
    fiedlerVector,
    spectrum,
    fiedlerIndex
  };
}

export function isConnected(matrix: AdjacencyMatrix): boolean {
  const n = matrix.length;
  if (n === 0) return true;
  if (n === 1) return true;

  const visited = new Set<number>();
  const queue = [0];
  visited.add(0);

  while (queue.length > 0) {
    const u = queue.shift()!;
    for (let v = 0; v < n; v++) {
      if (matrix[u][v] === 1 && !visited.has(v)) {
        visited.add(v);
        queue.push(v);
      }
    }
  }

  return visited.size === n;
}

function* getCombinations<T>(array: T[], k: number): IterableIterator<T[]> {
  const n = array.length;
  if (k > n) return;
  const indices = Array.from({ length: k }, (_, i) => i);
  yield indices.map(i => array[i]);
  while (true) {
    let i = k - 1;
    while (i >= 0 && indices[i] === i + n - k) i--;
    if (i < 0) return;
    indices[i]++;
    for (let j = i + 1; j < k; j++) indices[j] = indices[j - 1] + 1;
    yield indices.map(idx => array[idx]);
  }
}

export interface CutSet {
  vertices: number[];
  edges: [number, number][];
}

export function findCutSet(matrix: AdjacencyMatrix, vCount: number, eCount: number): CutSet | null {
  const n = matrix.length;
  if (n === 0) return null;

  // 1. Pick vCount vertices to remove
  const allNodes = Array.from({ length: n }, (_, i) => i);
  for (const nodesToRemove of getCombinations(allNodes, vCount)) {
    const remainingNodes = allNodes.filter(node => !nodesToRemove.includes(node));
    const subMatrix: AdjacencyMatrix = remainingNodes.map(i => 
      remainingNodes.map(j => matrix[i][j])
    );

    // If we removed vertices and only 0 or 1 remain, is it "disconnected"?
    // In graph theory, a graph with 0 or 1 node is connected.
    // However, for fault tolerance, if we can reduce the graph to < 2 nodes, 
    // it might be considered a failure depending on the context.
    // But usually, connectivity refers to paths between pairs of nodes.
    
    if (subMatrix.length > 1 && !isConnected(subMatrix)) {
      return { vertices: nodesToRemove, edges: [] };
    }

    if (eCount > 0 && subMatrix.length > 0) {
      const remainingEdges: [number, number][] = [];
      const subN = subMatrix.length;
      for (let i = 0; i < subN; i++) {
        for (let j = i + 1; j < subN; j++) {
          if (subMatrix[i][j] === 1) {
            remainingEdges.push([remainingNodes[i], remainingNodes[j]]);
          }
        }
      }

      if (eCount > remainingEdges.length) {
        // If we need to remove more edges than exist, it's definitely disconnected (or empty)
        // But we need to return which ones. Let's just return all of them.
        return { vertices: nodesToRemove, edges: remainingEdges };
      }

      for (const edgesToRemove of getCombinations(remainingEdges, eCount)) {
        // Test connectivity
        const testMatrix = (matrix || []).map(row => [...(row || [])]);
        // Remove vertices
        const nodesToKeep = allNodes.filter(node => !nodesToRemove.includes(node));
        // Remove edges
        const finalEdgesToRemove = [...edgesToRemove];
        
        // Build a temporary matrix for the remaining nodes
        const testSubMatrix: AdjacencyMatrix = nodesToKeep.map(i => 
          nodesToKeep.map(j => {
            if (matrix[i][j] === 0) return 0;
            // Check if this edge [i,j] is in edgesToRemove
            const isRemoved = edgesToRemove.some(([u, v]) => (u === i && v === j) || (u === j && v === i));
            return isRemoved ? 0 : 1;
          })
        );

        if (testSubMatrix.length > 1 && !isConnected(testSubMatrix)) {
          return { vertices: nodesToRemove, edges: edgesToRemove };
        }
      }
    }
  }

  // Special case: if the graph is already disconnected
  if (!isConnected(matrix) && n > 1) {
    return { vertices: [], edges: [] };
  }

  return null;
}

export function canDisconnect(matrix: AdjacencyMatrix, vCount: number, eCount: number): boolean {
  return findCutSet(matrix, vCount, eCount) !== null;
}

export function evaluateFaultCondition(matrix: AdjacencyMatrix, condition: FaultCondition): boolean {
  if (condition.type === 'atomic') {
    return !canDisconnect(matrix, condition.vertices, condition.edges);
  } else {
    if (condition.op === 'AND') {
      return (condition.conditions || []).every(c => evaluateFaultCondition(matrix, c));
    } else {
      return (condition.conditions || []).some(c => evaluateFaultCondition(matrix, c));
    }
  }
}

export interface HardeningSolution {
  edges: Edge[];
  isUnique: boolean;
  minEdges: number;
}

export function findMinimumHardeningEdges(matrix: AdjacencyMatrix, condition: FaultCondition): HardeningSolution | null {
  if (!matrix || !Array.isArray(matrix)) return null;
  const n = matrix.length;
  if (evaluateFaultCondition(matrix, condition)) {
    return { edges: [], isUnique: true, minEdges: 0 };
  }

  const missingEdges: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (matrix[i] && matrix[i][j] === 0) {
        missingEdges.push([i, j]);
      }
    }
  }

  // Try adding 1 edge
  const solutions1: [number, number][][] = [];
  for (const edge of missingEdges) {
    const testMatrix = matrix.map(row => [...(row || [])]);
    testMatrix[edge[0]][edge[1]] = 1;
    testMatrix[edge[1]][edge[0]] = 1;
    if (evaluateFaultCondition(testMatrix, condition)) {
      solutions1.push([edge]);
    }
  }

  if (solutions1.length > 0) {
    return {
      edges: solutions1[0].map(([s, t]) => ({ source: s, target: t })),
      isUnique: solutions1.length === 1,
      minEdges: 1
    };
  }

  // Try adding 2 edges
  if (missingEdges.length < 100) {
    const solutions2: [number, number][][] = [];
    for (let i = 0; i < missingEdges.length; i++) {
      for (let j = i + 1; j < missingEdges.length; j++) {
        const e1 = missingEdges[i];
        const e2 = missingEdges[j];
        const testMatrix = matrix.map(row => [...(row || [])]);
        testMatrix[e1[0]][e1[1]] = 1;
        testMatrix[e1[1]][e1[0]] = 1;
        testMatrix[e2[0]][e2[1]] = 1;
        testMatrix[e2[1]][e2[0]] = 1;
        if (evaluateFaultCondition(testMatrix, condition)) {
          solutions2.push([e1, e2]);
          if (solutions2.length > 1) break;
        }
      }
      if (solutions2.length > 1) break;
    }

    if (solutions2.length > 0) {
      return {
        edges: solutions2[0].map(([s, t]) => ({ source: s, target: t })),
        isUnique: solutions2.length === 1,
        minEdges: 2
      };
    }
  }

  // Greedy fallback
  let currentMatrix = matrix.map(row => [...(row || [])]);
  const addedEdges: Edge[] = [];
  for (let k = 0; k < 5; k++) {
    let bestEdge: [number, number] | null = null;
    for (const edge of missingEdges) {
      if (currentMatrix[edge[0]][edge[1]] === 1) continue;
      const testMatrix = currentMatrix.map(row => [...row]);
      testMatrix[edge[0]][edge[1]] = 1;
      testMatrix[edge[1]][edge[0]] = 1;
      if (evaluateFaultCondition(testMatrix, condition)) {
        addedEdges.push({ source: edge[0], target: edge[1] });
        return { edges: addedEdges, isUnique: false, minEdges: addedEdges.length };
      }
      if (!bestEdge) bestEdge = edge;
    }
    if (bestEdge) {
      currentMatrix[bestEdge[0]][bestEdge[1]] = 1;
      currentMatrix[bestEdge[1]][bestEdge[0]] = 1;
      addedEdges.push({ source: bestEdge[0], target: bestEdge[1] });
    } else break;
  }

  return null;
}

export const PRESETS: Record<string, AdjacencyMatrix> = {
  'Triangle': [
    [0, 1, 1],
    [1, 0, 1],
    [1, 1, 0]
  ],
  'Square': [
    [0, 1, 0, 1],
    [1, 0, 1, 0],
    [0, 1, 0, 1],
    [1, 0, 1, 0]
  ],
  'Star (5)': [
    [0, 1, 1, 1, 1],
    [1, 0, 0, 0, 0],
    [1, 0, 0, 0, 0],
    [1, 0, 0, 0, 0],
    [1, 0, 0, 0, 0]
  ],
  'Complete (5)': [
    [0, 1, 1, 1, 1],
    [1, 0, 1, 1, 1],
    [1, 1, 0, 1, 1],
    [1, 1, 1, 0, 1],
    [1, 1, 1, 1, 0]
  ],
  'Cycle (6)': [
    [0, 1, 0, 0, 0, 1],
    [1, 0, 1, 0, 0, 0],
    [0, 1, 0, 1, 0, 0],
    [0, 0, 1, 0, 1, 0],
    [0, 0, 0, 1, 0, 1],
    [1, 0, 0, 0, 1, 0]
  ],
  'Petersen (Partial)': [
    [0, 1, 0, 0, 1, 1, 0, 0, 0, 0],
    [1, 0, 1, 0, 0, 0, 1, 0, 0, 0],
    [0, 1, 0, 1, 0, 0, 0, 1, 0, 0],
    [0, 0, 1, 0, 1, 0, 0, 0, 1, 0],
    [1, 0, 0, 1, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 1, 1, 0],
    [0, 1, 0, 0, 0, 0, 0, 0, 1, 1],
    [0, 0, 1, 0, 0, 1, 0, 0, 0, 1],
    [0, 0, 0, 1, 0, 1, 1, 0, 0, 0],
    [0, 0, 0, 0, 1, 0, 1, 1, 0, 0]
  ]
};
