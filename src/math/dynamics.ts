export class GraphDynamics {
  laplacian: number[][];
  n: number;
  u: Float64Array; // Current values
  v: Float64Array; // Velocities
  dt: number = 0.05;
  c: number = 2.0; // Wave speed
  damping: number = 0.01;

  constructor(laplacian: number[][]) {
    this.laplacian = laplacian;
    this.n = laplacian.length;
    this.u = new Float64Array(this.n);
    this.v = new Float64Array(this.n);
  }

  // Pluck a specific node to start a wave
  pluck(index: number, amplitude: number = 1.0) {
    if (index >= 0 && index < this.n) {
      this.u[index] += amplitude;
    }
  }

  // Heat equation step: du/dt = -k * L * u
  stepHeat(k: number = 0.5) {
    const du = new Float64Array(this.n);
    for (let i = 0; i < this.n; i++) {
      let Lu_i = 0;
      for (let j = 0; j < this.n; j++) {
        Lu_i += this.laplacian[i][j] * this.u[j];
      }
      du[i] = -k * Lu_i;
    }
    for (let i = 0; i < this.n; i++) {
      this.u[i] += du[i] * this.dt;
      // Slowly decay heat to ambient 0
      this.u[i] *= 0.999;
    }
  }

  // Wave equation step using semi-implicit Euler
  // d2u/dt2 = -c^2 * L * u - damping * du/dt
  stepWave() {
    const accel = new Float64Array(this.n);
    for (let i = 0; i < this.n; i++) {
      let Lu_i = 0;
      for (let j = 0; j < this.n; j++) {
        Lu_i += this.laplacian[i][j] * this.u[j];
      }
      accel[i] = -this.c * this.c * Lu_i - this.damping * this.v[i];
    }

    for (let i = 0; i < this.n; i++) {
      this.v[i] += accel[i] * this.dt;
      this.u[i] += this.v[i] * this.dt;
    }
  }

  getValues(): Float64Array {
    return this.u;
  }
}
