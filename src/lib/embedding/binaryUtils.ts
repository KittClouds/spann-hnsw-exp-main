
/**
 * Utilities for converting between Float32Array and Uint8Array for LiveStore blob storage
 */

export function vecToBlob(vector: Float32Array): Uint8Array {
  return new Uint8Array(vector.buffer, vector.byteOffset, vector.byteLength);
}

export function blobToVec(blob: Uint8Array, dim: number = 384): Float32Array {
  return new Float32Array(blob.buffer, blob.byteOffset, dim);
}

export function validateEmbedding(vector: Float32Array | Uint8Array, expectedDim: number): boolean {
  if (vector instanceof Float32Array) {
    return vector.length === expectedDim;
  } else {
    return vector.byteLength === expectedDim * 4; // 4 bytes per float32
  }
}
