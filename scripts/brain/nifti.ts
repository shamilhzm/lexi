// A NIfTI-1 reader, enough of one to load a template volume and know where it
// sits in MNI space. Build-time only — nothing here ships.
//
// Written rather than depended on because the format's useful part is a fixed
// 348-byte header, and the alternative was a package that reads forty variants
// we will never meet.
import { gunzipSync } from 'node:zlib';
import { readFileSync } from 'node:fs';

export interface Volume {
  /** Voxel counts along i, j, k. */
  dims: [number, number, number];
  /** Millimetres per voxel. */
  pixdim: [number, number, number];
  /** Scalar value per voxel, i fastest. */
  data: Float32Array;
  /** Voxel index → world (MNI) millimetres, as a 4×3 affine in row-major order. */
  affine: number[];
  at(i: number, j: number, k: number): number;
  /** Map a voxel index to MNI millimetres. */
  toWorld(i: number, j: number, k: number): [number, number, number];
}

// NIfTI datatype codes we actually handle.
const T_UINT8 = 2, T_INT16 = 4, T_INT32 = 8, T_FLOAT32 = 16, T_FLOAT64 = 64, T_UINT16 = 512;

export function readNifti(path: string): Volume {
  const raw = readFileSync(path);
  const buf: Buffer = raw[0] === 0x1f && raw[1] === 0x8b ? gunzipSync(raw) : raw;

  // `sizeof_hdr` is 348 and tells us the endianness: if it reads as 348 the
  // file matches this machine, otherwise every field is byte-swapped.
  const leSize = buf.readInt32LE(0);
  const little = leSize === 348;
  if (!little && buf.readInt32BE(0) !== 348) {
    throw new Error(`not a NIfTI-1 file: sizeof_hdr = ${leSize}`);
  }
  const i16 = (o: number) => (little ? buf.readInt16LE(o) : buf.readInt16BE(o));
  const f32 = (o: number) => (little ? buf.readFloatLE(o) : buf.readFloatBE(o));

  const dims: [number, number, number] = [i16(42), i16(44), i16(46)];
  const pixdim: [number, number, number] = [f32(80), f32(84), f32(88)];
  const datatype = i16(70);
  const voxOffset = Math.round(f32(108));
  const sclSlope = f32(112) || 1;
  const sclInter = f32(116);

  // `srow_*` is the voxel→world affine. Templates always carry it.
  const affine: number[] = [];
  for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) affine.push(f32(280 + r * 16 + c * 4));

  const n = dims[0] * dims[1] * dims[2];
  const data = new Float32Array(n);
  const readers: Record<number, [size: number, get: (o: number) => number]> = {
    [T_UINT8]: [1, (o) => buf.readUInt8(o)],
    [T_INT16]: [2, (o) => (little ? buf.readInt16LE(o) : buf.readInt16BE(o))],
    [T_UINT16]: [2, (o) => (little ? buf.readUInt16LE(o) : buf.readUInt16BE(o))],
    [T_INT32]: [4, (o) => (little ? buf.readInt32LE(o) : buf.readInt32BE(o))],
    [T_FLOAT32]: [4, (o) => (little ? buf.readFloatLE(o) : buf.readFloatBE(o))],
    [T_FLOAT64]: [8, (o) => (little ? buf.readDoubleLE(o) : buf.readDoubleBE(o))],
  };
  const r = readers[datatype];
  if (!r) throw new Error(`unsupported NIfTI datatype ${datatype}`);
  const [size, get] = r;
  for (let x = 0; x < n; x++) data[x] = get(voxOffset + x * size) * sclSlope + sclInter;

  const [nx, ny] = dims;
  return {
    dims, pixdim, data, affine,
    at: (i, j, k) => data[i + nx * (j + ny * k)],
    toWorld: (i, j, k) => [
      affine[0] * i + affine[1] * j + affine[2] * k + affine[3],
      affine[4] * i + affine[5] * j + affine[6] * k + affine[7],
      affine[8] * i + affine[9] * j + affine[10] * k + affine[11],
    ],
  };
}
