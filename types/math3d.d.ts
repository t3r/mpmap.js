declare module 'math3d' {
  export class Vector3 {
    constructor(x: number, y: number, z: number)
    magnitude: number
  }

  export class Quaternion {
    constructor(x: number, y: number, z: number, w: number)
    conjugate(): Quaternion
    mul(other: Quaternion): Quaternion
    eulerAngles: { x: number; y: number; z: number }
    static AngleAxis(axis: Vector3, angleDeg: number): Quaternion
  }
}
