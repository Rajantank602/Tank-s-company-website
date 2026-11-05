import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import { mergeTransformedGeometries } from './modelGeometry.ts';

test('merges transformed geometry without changing the source meshes', () => {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([
    0, 0, 0, 1, 0, 0, 0, 1, 0,
  ], 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute([
    0, 0, 1, 0, 0, 1, 0, 0, 1,
  ], 3));
  geometry.setIndex([0, 1, 2]);

  const first = new THREE.Mesh(geometry);
  first.position.set(1, 2, 3);
  first.rotation.y = Math.PI / 2;
  first.scale.set(2, 3, 4);
  const second = new THREE.Mesh(geometry);
  second.position.set(-2, 1, 0);
  second.rotation.x = Math.PI / 2;

  const merged = mergeTransformedGeometries([first, second]);
  assert.ok(merged);
  assert.deepEqual(Array.from(merged.index!.array), [0, 1, 2, 3, 4, 5]);

  const positions = merged.getAttribute('position');
  const normals = merged.getAttribute('normal');
  const sourcePositions = geometry.getAttribute('position');
  const sourceNormals = geometry.getAttribute('normal');
  for (const [meshIndex, mesh] of [first, second].entries()) {
    const normalMatrix = new THREE.Matrix3().getNormalMatrix(mesh.matrix);
    for (let index = 0; index < sourcePositions.count; index += 1) {
      const expectedPosition = new THREE.Vector3()
        .fromBufferAttribute(sourcePositions, index)
        .applyMatrix4(mesh.matrix);
      const actualPosition = new THREE.Vector3().fromBufferAttribute(positions, meshIndex * 3 + index);
      assert.ok(actualPosition.distanceTo(expectedPosition) < 1e-6);

      const expectedNormal = new THREE.Vector3()
        .fromBufferAttribute(sourceNormals, index)
        .applyNormalMatrix(normalMatrix);
      const actualNormal = new THREE.Vector3().fromBufferAttribute(normals, meshIndex * 3 + index);
      assert.ok(actualNormal.distanceTo(expectedNormal) < 1e-6);
    }
  }
  assert.deepEqual(Array.from(sourcePositions.array), [0, 0, 0, 1, 0, 0, 0, 1, 0]);
  assert.equal(mergeTransformedGeometries([]), null);
});
