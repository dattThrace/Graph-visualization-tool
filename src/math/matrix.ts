export function multiplyMatrices(a: number[][], b: number[][]): number[][] {
  const n = a.length;
  if (n === 0) return [];
  const p = b.length;
  if (p === 0) return Array.from({ length: n }, () => []);
  const m = b[0]?.length || 0;
  const result = Array.from({ length: n }, () => Array(m).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      for (let k = 0; k < p; k++) {
        result[i][j] += a[i][k] * b[k][j];
      }
    }
  }
  return result;
}

export function matrixPower(matrix: number[][], power: number): number[][] {
  const n = matrix.length;
  let result: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))
  ); // Identity matrix
  let base = matrix.map(row => [...row]);

  let p = power;
  while (p > 0) {
    if (p % 2 === 1) {
      result = multiplyMatrices(result, base);
    }
    base = multiplyMatrices(base, base);
    p = Math.floor(p / 2);
  }
  return result;
}

export function trace(matrix: number[][]): number {
  let sum = 0;
  for (let i = 0; i < matrix.length; i++) {
    sum += matrix[i][i];
  }
  return sum;
}

export function getDegreeMatrix(adjacency: number[][]): number[][] {
  const n = adjacency.length;
  const degree = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    let d = 0;
    for (let j = 0; j < n; j++) {
      d += adjacency[i][j];
    }
    degree[i][i] = d;
  }
  return degree;
}

export function getLaplacianMatrix(adjacency: number[][]): number[][] {
  const n = adjacency.length;
  const laplacian = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    let d = 0;
    for (let j = 0; j < n; j++) {
      if (i !== j) {
        laplacian[i][j] = -adjacency[i][j];
        d += adjacency[i][j];
      }
    }
    laplacian[i][i] = d;
  }
  return laplacian;
}
