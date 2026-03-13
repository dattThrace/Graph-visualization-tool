export interface Node {
  id: number;
  label: string;
}

export interface Edge {
  source: number;
  target: number;
}

export interface GraphData {
  nodes: Node[];
  edges: Edge[];
}

export type AdjacencyMatrix = number[][];

export interface GraphMetrics {
  nodeCount: number;
  edgeCount: number;
  density: number;
  degrees: number[];
  avgDegree: number;
  maxDegree: number;
  minDegree: number;
  components: number;
  isSimple: boolean;
  isComplete: boolean;
}

export type BooleanOp = 'AND' | 'OR';

export interface AtomicCondition {
  type: 'atomic';
  vertices: number;
  edges: number;
}

export interface CompositeCondition {
  type: 'composite';
  op: BooleanOp;
  conditions: FaultCondition[];
}

export type FaultCondition = AtomicCondition | CompositeCondition;

export interface FaultResult {
  conditionId: string;
  passed: boolean; // "Passed" means the graph stayed connected in ALL scenarios of this condition
  details?: string;
}
