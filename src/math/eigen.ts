// Jacobi eigenvalue algorithm for real symmetric matrices
export function jacobiEigenvalue(matrix: number[][], maxIter = 1000, tolerance = 1e-9) {
  const n = matrix.length;
  // Make a copy of the matrix to avoid mutating the original
  const A = matrix.map(row => [...row]);
  // Initialize eigenvectors to identity matrix
  const V: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))
  );

  for (let iter = 0; iter < maxIter; iter++) {
    // Find largest off-diagonal element
    let maxVal = 0;
    let p = 0, q = 1;
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        if (Math.abs(A[i][j]) > maxVal) {
          maxVal = Math.abs(A[i][j]);
          p = i;
          q = j;
        }
      }
    }

    if (maxVal < tolerance) break;

    // Calculate rotation angle
    let theta;
    if (A[p][p] === A[q][q]) {
      theta = (Math.PI / 4) * Math.sign(A[p][q]);
    } else {
      theta = 0.5 * Math.atan((2 * A[p][q]) / (A[p][p] - A[q][q]));
    }

    const c = Math.cos(theta);
    const s = Math.sin(theta);

    // Apply rotation A = J^T * A * J
    for (let i = 0; i < n; i++) {
      if (i !== p && i !== q) {
        const api = A[p][i];
        const aqi = A[q][i];
        A[p][i] = c * api - s * aqi;
        A[i][p] = A[p][i];
        A[q][i] = s * api + c * aqi;
        A[i][q] = A[q][i];
      }
    }
    const app = A[p][p];
    const aqq = A[q][q];
    const apq = A[p][q];
    
    A[p][p] = c * c * app - 2 * s * c * apq + s * s * aqq;
    A[q][q] = s * s * app + 2 * s * c * apq + c * c * aqq;
    A[p][q] = 0;
    A[q][p] = 0;

    // Update eigenvectors V = V * J
    for (let i = 0; i < n; i++) {
      const vip = V[i][p];
      const viq = V[i][q];
      V[i][p] = c * vip - s * viq;
      V[i][q] = s * vip + c * viq;
    }
  }

  // Extract eigenvalues from diagonal
  const eigenvalues = A.map((row, i) => row[i]);

  // Sort eigenvalues and eigenvectors (ascending)
  const indices = eigenvalues.map((_, i) => i).sort((a, b) => eigenvalues[a] - eigenvalues[b]);
  const sortedEigenvalues = indices.map(i => eigenvalues[i]);
  const sortedEigenvectors = V.map(row => indices.map(i => row[i]));

  return { eigenvalues: sortedEigenvalues, eigenvectors: sortedEigenvectors };
}
