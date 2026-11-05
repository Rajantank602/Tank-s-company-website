import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export function mergeTransformedGeometries(meshes: readonly THREE.Mesh[]) {
  if (meshes.length === 0) return null;

  const geometries: THREE.BufferGeometry[] = [];
  try {
    for (const mesh of meshes) {
      mesh.updateMatrix();
      const geometry = mesh.geometry.clone();
      geometries.push(geometry);
      geometry.applyMatrix4(mesh.matrix);
    }
    return mergeGeometries(geometries);
  } finally {
    geometries.forEach((geometry) => geometry.dispose());
  }
}
