import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, OrbitControls, useGLTF } from '@react-three/drei';
import { type MutableRefObject, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { storySteps } from './content';
import { mergeTransformedGeometries } from './modelGeometry';

const tankModelUrl = `${import.meta.env.BASE_URL}tank-parts.glb`;
const cameraFitRatio = 0.86;
const shadowCameraExtent = 8;
const revealMaterialColor = new THREE.Color('#a9c4db');
const wireframeEndColor = new THREE.Color('#536171');
const metallicFinishes = [
  { color: new THREE.Color('#8997a3'), metalness: 0.82, roughness: 0.28 },
  { color: new THREE.Color('#b28b5b'), metalness: 0.84, roughness: 0.25 },
  { color: new THREE.Color('#9b6244'), metalness: 0.8, roughness: 0.3 },
  { color: new THREE.Color('#515c64'), metalness: 0.86, roughness: 0.24 },
];
const blendedFinishColor = new THREE.Color();

type ModelMeshes = {
  mesh: THREE.Mesh;
  wireframeMesh: THREE.Mesh;
};

type ModelPart = ModelMeshes & {
  assembledPosition: THREE.Vector3;
  explodedPosition: THREE.Vector3;
  assembledQuaternion: THREE.Quaternion;
  explodedQuaternion: THREE.Quaternion;
};

type MaterialSet = {
  solid: THREE.Material;
  wireframe: THREE.MeshBasicMaterial;
};

type MachineModelProps = {
  assemblyProgress: MutableRefObject<number>;
  storyProgress: MutableRefObject<number>;
  heroProgress: MutableRefObject<number>;
  alignRight: boolean;
  interactive: boolean;
};

type ViewerActions = {
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
};

function ViewerZoom({ actions }: { actions: MutableRefObject<ViewerActions | null> }) {
  const { camera, invalidate } = useThree();

  useEffect(() => {
    const zoom = (factor: number) => {
      camera.zoom = THREE.MathUtils.clamp(camera.zoom * factor, 0.65, 3);
      camera.updateProjectionMatrix();
      invalidate();
    };
    actions.current = {
      zoomIn: () => zoom(1.2),
      zoomOut: () => zoom(1 / 1.2),
      resetZoom: () => {
        camera.zoom = 1;
        camera.updateProjectionMatrix();
        invalidate();
      },
    };

    return () => {
      actions.current = null;
    };
  }, [actions, camera, invalidate]);

  return null;
}

function CameraFit({
  radius,
  heroProgress,
  enableHeroZoom,
  allowOrbit,
}: {
  radius: number;
  heroProgress: MutableRefObject<number>;
  enableHeroZoom: boolean;
  allowOrbit: boolean;
}) {
  const { camera, size, invalidate } = useThree();
  const baseDistance = useRef<number | null>(null);

  useEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return;

    const aspect = size.width / Math.max(size.height, 1);
    const halfFov = THREE.MathUtils.degToRad(camera.fov / 2);
    const fitRatio = aspect < 0.65 ? 0.95 : cameraFitRatio;
    const distance = radius / (fitRatio * Math.tan(halfFov) * Math.min(1, aspect));
    baseDistance.current = distance;
    camera.position.set(0, distance * 0.3, distance);
    camera.near = Math.max(distance / 100, 0.01);
    camera.far = distance * 50;
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    invalidate();
  }, [camera, invalidate, radius, size.height, size.width]);

  useFrame(() => {
    if (allowOrbit) return;
    if (!(camera instanceof THREE.PerspectiveCamera) || baseDistance.current === null) return;

    const progress = enableHeroZoom
      ? THREE.MathUtils.smoothstep(heroProgress.current, 0, 1)
      : 1;
    const distance = baseDistance.current * THREE.MathUtils.lerp(1.25, 1, progress);
    const horizontalOffset = enableHeroZoom ? -distance * 0.12 * (1 - progress) : 0;
    camera.position.set(horizontalOffset, distance * 0.3, distance);
    camera.lookAt(horizontalOffset, 0, 0);
  });

  return null;
}

function MachineModel({
  assemblyProgress,
  storyProgress,
  heroProgress,
  alignRight,
  interactive,
}: MachineModelProps) {
  const { scene } = useGLTF(tankModelUrl);
  const { size, invalidate } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const assembledRef = useRef<THREE.Group>(null);
  const separatedRef = useRef<THREE.Group>(null);
  const groundRef = useRef<THREE.Mesh>(null);
  const isPortrait = size.width / Math.max(size.height, 1) < 0.65;
  const isMobile = size.width <= 768;

  const { parts, batches, materialSets, radius, floorY } = useMemo(() => {
    const source = scene.clone(true);
    source.updateMatrixWorld(true);

    const bounds = new THREE.Box3().setFromObject(source);
    const center = bounds.getCenter(new THREE.Vector3());
    const size = bounds.getSize(new THREE.Vector3());
    const maxDimension = Math.max(size.x, size.y, size.z);
    const scale = maxDimension > 0 ? 5 / maxDimension : 1;
    const sourceMeshes: THREE.Mesh[] = [];

    source.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        sourceMeshes.push(object);
      }
    });

    const materialsBySource = new Map<THREE.Material, MaterialSet>();
    const getMaterials = (sourceMaterial: THREE.Material): MaterialSet => {
      const existing = materialsBySource.get(sourceMaterial);
      if (existing) return existing;

      const solid = sourceMaterial.clone();
      solid.userData.fadeBaseOpacity = solid.opacity;
      solid.userData.fadeBaseTransparent = solid.transparent;
      solid.userData.fadeBaseDepthWrite = solid.depthWrite;
      if (solid instanceof THREE.MeshStandardMaterial) {
        solid.color.set('#536171');
        solid.emissive.set('#11151a');
        solid.emissiveIntensity = 0.08;
        solid.metalness = 0.28;
        solid.roughness = 0.48;
        solid.envMapIntensity = 0.5;
      }
      const wireframe = new THREE.MeshBasicMaterial({
        color: '#66717f',
        side: THREE.DoubleSide,
        wireframe: true,
        transparent: true,
        opacity: 0.82,
        depthWrite: false,
        forceSinglePass: true,
      });
      wireframe.userData.fadeBaseOpacity = wireframe.opacity;
      wireframe.userData.fadeBaseTransparent = wireframe.transparent;
      wireframe.userData.fadeBaseDepthWrite = wireframe.depthWrite;
      const materials = { solid, wireframe };
      materialsBySource.set(sourceMaterial, materials);
      return materials;
    };

    const modelParts = sourceMeshes.map((sourceMesh, index): ModelPart => {
      const mesh = sourceMesh.clone(false);
      const materials = (Array.isArray(sourceMesh.material)
        ? sourceMesh.material
        : [sourceMesh.material]
      ).map(getMaterials);
      mesh.material = Array.isArray(sourceMesh.material)
        ? materials.map((material) => material.solid)
        : materials[0].solid;
      const wireframeMesh = sourceMesh.clone(false);
      wireframeMesh.material = Array.isArray(sourceMesh.material)
        ? materials.map((material) => material.wireframe)
        : materials[0].wireframe;
      const worldPosition = new THREE.Vector3();
      const worldQuaternion = new THREE.Quaternion();
      const worldScale = new THREE.Vector3();
      sourceMesh.matrixWorld.decompose(worldPosition, worldQuaternion, worldScale);
      worldPosition.sub(center).multiplyScalar(scale);
      worldScale.multiplyScalar(scale);

      mesh.position.copy(worldPosition);
      mesh.quaternion.copy(worldQuaternion);
      mesh.scale.copy(worldScale);
      wireframeMesh.position.copy(worldPosition);
      wireframeMesh.quaternion.copy(worldQuaternion);
      wireframeMesh.scale.copy(worldScale);
      mesh.visible = false;
      mesh.castShadow = true;
      mesh.receiveShadow = true;

      const bounds = new THREE.Box3().setFromObject(sourceMesh);
      const partSize = bounds.getSize(new THREE.Vector3()).multiplyScalar(scale);
      const partCenter = bounds.getCenter(new THREE.Vector3()).sub(center).multiplyScalar(scale);
      const direction = partCenter.lengthSq() > 0.01
        ? partCenter.normalize()
        : new THREE.Vector3(index % 2 === 0 ? -1 : 1, index % 3 === 0 ? 1 : -1, index % 2 === 0 ? 1 : -1).normalize();
      const partExtent = partSize.length();
      const separation = partExtent > 1.2 ? 1.15 : partExtent > 0.55 ? 0.72 : 0.38;
      const explodedQuaternion = worldQuaternion.clone().multiply(
        new THREE.Quaternion().setFromEuler(
          new THREE.Euler(
            (index % 2 === 0 ? 1 : -1) * 0.12,
            (index % 3 === 0 ? 1 : -1) * 0.16,
            (index % 2 === 0 ? -1 : 1) * 0.1,
          ),
        ),
      );

      return {
        mesh,
        wireframeMesh,
        assembledPosition: worldPosition.clone(),
        explodedPosition: worldPosition.clone().addScaledVector(direction, separation),
        assembledQuaternion: worldQuaternion,
        explodedQuaternion,
      };
    });

    let mergedBatches: ModelMeshes[] = [];
    const canBatch = sourceMeshes.every((mesh) => (
      !Array.isArray(mesh.material)
      && !(mesh instanceof THREE.InstancedMesh)
      && !(mesh instanceof THREE.SkinnedMesh)
      && mesh.matrixWorld.determinant() > 0
      && Object.keys(mesh.geometry.morphAttributes).length === 0
      && mesh.geometry.groups.length === 0
      && mesh.geometry.drawRange.start === 0
      && mesh.geometry.drawRange.count === Infinity
    ));
    if (canBatch) {
      const meshesByMaterial = new Map<THREE.Material, THREE.Mesh[]>();
      sourceMeshes.forEach((sourceMesh, index) => {
        const material = sourceMesh.material;
        if (Array.isArray(material)) {
          throw new Error('Cannot batch a tank model mesh with multiple materials.');
        }
        const meshes = meshesByMaterial.get(material) ?? [];
        meshes.push(modelParts[index].mesh);
        meshesByMaterial.set(material, meshes);
      });

      for (const [sourceMaterial, meshes] of meshesByMaterial) {
        const geometry = mergeTransformedGeometries(meshes);
        if (!geometry) {
          console.warn('Unable to batch the tank model; rendering its individual parts instead.');
          mergedBatches.forEach((batch) => batch.mesh.geometry.dispose());
          mergedBatches = [];
          break;
        }
        const materials = getMaterials(sourceMaterial);
        const mesh = new THREE.Mesh(geometry, materials.solid);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        const wireframeMesh = new THREE.Mesh(geometry, materials.wireframe);
        mergedBatches.push({ mesh, wireframeMesh });
      }
    } else {
      console.warn('The tank model contains unsupported geometry for batching; rendering individual parts instead.');
    }

    return {
      parts: modelParts,
      batches: mergedBatches,
      materialSets: Array.from(materialsBySource.values()),
      radius: (size.length() / 2) * scale,
      floorY: (bounds.min.y - center.y) * scale,
    };
  }, [scene]);

  useEffect(() => {
    if (interactive) return undefined;
    const handleScroll = () => invalidate();
    window.addEventListener('scroll', handleScroll, { passive: true });
    invalidate();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [interactive, invalidate]);

  useEffect(() => () => {
    batches.forEach((batch) => batch.mesh.geometry.dispose());
    materialSets.forEach(({ solid, wireframe }) => {
      solid.dispose();
      wireframe.dispose();
    });
  }, [batches, materialSets]);

  useFrame((_, delta) => {
    const eased = THREE.MathUtils.smoothstep(assemblyProgress.current, 0, 1);
    const storyProgressValue = THREE.MathUtils.clamp(storyProgress.current, 0, 1);
    const appearance = THREE.MathUtils.smoothstep(storyProgressValue, 0, 0.12);
    const renderBlend = isMobile
      ? THREE.MathUtils.smoothstep(storyProgressValue, 0.12, 0.34)
      : 1;
    const wireframeOpacity = isMobile
      ? appearance * (1 - renderBlend)
      : THREE.MathUtils.smoothstep(storyProgressValue, 0.08, 0.32) * 0.26;
    const renderedOpacity = isMobile ? appearance * renderBlend : 1;
    const finishPosition = storyProgressValue * metallicFinishes.length;
    const finishIndex = Math.floor(finishPosition) % metallicFinishes.length;
    const nextFinishIndex = (finishIndex + 1) % metallicFinishes.length;
    const finishBlend = THREE.MathUtils.smoothstep(finishPosition % 1, 0, 1);
    const currentFinish = metallicFinishes[finishIndex];
    const nextFinish = metallicFinishes[nextFinishIndex];
    blendedFinishColor.copy(currentFinish.color).lerp(nextFinish.color, finishBlend);
    const finishMetalness = THREE.MathUtils.lerp(
      currentFinish.metalness,
      nextFinish.metalness,
      finishBlend,
    );
    const finishRoughness = THREE.MathUtils.lerp(
      currentFinish.roughness,
      nextFinish.roughness,
      finishBlend,
    );

    const applyOpacity = (material: THREE.Material, opacity: number) => {
      material.opacity = material.userData.fadeBaseOpacity * opacity;
      material.transparent = material.userData.fadeBaseTransparent || opacity < 0.999;
      material.depthWrite = opacity < 0.999
        ? false
        : material.userData.fadeBaseDepthWrite;
    };

    materialSets.forEach(({ solid, wireframe }) => {
      applyOpacity(solid, renderedOpacity);
      if (solid instanceof THREE.MeshStandardMaterial) {
        solid.color.lerpColors(revealMaterialColor, blendedFinishColor, renderBlend);
        solid.metalness = THREE.MathUtils.lerp(0.72, finishMetalness, renderBlend);
        solid.roughness = THREE.MathUtils.lerp(0.24, finishRoughness, renderBlend);
      }
      applyOpacity(wireframe, wireframeOpacity);
      wireframe.color.copy(revealMaterialColor).lerp(wireframeEndColor, renderBlend);
    });

    const useBatches = batches.length > 0 && eased === 1;
    if (assembledRef.current) assembledRef.current.visible = useBatches;
    if (separatedRef.current) separatedRef.current.visible = !useBatches;
    if (!useBatches) {
      parts.forEach((part) => {
        part.mesh.position.lerpVectors(part.explodedPosition, part.assembledPosition, eased);
        part.mesh.quaternion.slerpQuaternions(part.explodedQuaternion, part.assembledQuaternion, eased);
        part.wireframeMesh.position.copy(part.mesh.position);
        part.wireframeMesh.quaternion.copy(part.mesh.quaternion);
      });
    }
    (useBatches ? batches : parts).forEach(({ mesh, wireframeMesh }) => {
      mesh.visible = renderedOpacity > 0.001;
      wireframeMesh.visible = wireframeOpacity > 0.001;
    });

    const group = groupRef.current;
    if (!group) return;
    group.visible = wireframeOpacity > 0.001 || renderedOpacity > 0.001;
    const horizontalPosition = isPortrait ? 0 : alignRight ? 2 : 0.55;
    const verticalPosition = isPortrait ? -1.35 : -0.35;
    group.position.set(horizontalPosition, verticalPosition, 0);
    group.scale.setScalar(1);
    const targetRotation = 0.9 + storyProgressValue * Math.PI * 2;
    group.rotation.y = THREE.MathUtils.damp(
      group.rotation.y,
      targetRotation,
      5,
      Math.min(delta, 0.05),
    );
    if (Math.abs(group.rotation.y - targetRotation) > 0.001) {
      invalidate();
    } else {
      group.rotation.y = targetRotation;
    }
    group.rotation.x = 0;
    group.rotation.z = 0;
    groundRef.current?.position.set(horizontalPosition, verticalPosition + floorY - 0.015, 0);
  });

  return (
    <>
      <group ref={groupRef} position={[isPortrait ? 0 : alignRight ? 2 : 0.55, isPortrait ? -1.35 : -0.35, 0]} rotation={[0, 0.9, 0]}>
        <CameraFit
          radius={radius}
          heroProgress={heroProgress}
          enableHeroZoom={alignRight && !isMobile}
          allowOrbit={interactive}
        />
        <group ref={assembledRef}>
          {batches.map((batch) => (
            <group key={batch.mesh.uuid}>
              <primitive object={batch.mesh} />
              <primitive object={batch.wireframeMesh} />
            </group>
          ))}
        </group>
        <group ref={separatedRef} visible={false}>
          {parts.map((part) => (
            <group key={part.mesh.uuid}>
              <primitive object={part.mesh} />
              <primitive object={part.wireframeMesh} />
            </group>
          ))}
        </group>
      </group>
      <mesh
        ref={groundRef}
        position={[isPortrait ? 0 : alignRight ? 2 : 0.55, (isPortrait ? -1.35 : -0.35) + floorY - 0.015, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[30, 30]} />
        <shadowMaterial transparent opacity={0.32} />
      </mesh>
    </>
  );
}

type MachineSceneProps = {
  assemblyProgress: MutableRefObject<number>;
  storyProgress: MutableRefObject<number>;
  heroProgress?: MutableRefObject<number>;
  isVisible: boolean;
  interactive?: boolean;
  alignRight?: boolean;
};

export default function MachineScene({
  assemblyProgress,
  storyProgress,
  heroProgress,
  isVisible,
  interactive = false,
  alignRight = false,
}: MachineSceneProps) {
  const [autoRotate, setAutoRotate] = useState(interactive);
  const [inViewport, setInViewport] = useState(true);
  const [compactViewport, setCompactViewport] = useState(
    () => window.matchMedia('(max-width: 768px)').matches,
  );
  const shellRef = useRef<HTMLDivElement>(null);
  const viewerActions = useRef<ViewerActions | null>(null);
  const defaultHeroProgress = useRef(1);

  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return undefined;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry) setInViewport(entry.isIntersecting);
    });
    observer.observe(shell);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const query = window.matchMedia('(max-width: 768px)');
    const update = () => setCompactViewport(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  return (
    <div ref={shellRef} className={`scene-shell ${isVisible ? 'is-visible' : ''}${interactive ? ' scene-shell--interactive' : ''}`} aria-label="Tank's tiny machine product view">
      <Canvas
        camera={{ position: [2.8, 2.4, 7], fov: 32 }}
        shadows
        dpr={[1, compactViewport ? 1.25 : 1.5]}
        frameloop={!isVisible || !inViewport ? 'never' : interactive && autoRotate ? 'always' : 'demand'}
        gl={{ alpha: true }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0);
          gl.shadowMap.type = THREE.PCFSoftShadowMap;
        }}
      >
        <ambientLight intensity={0.62} />
        <directionalLight
          key={compactViewport ? 'compact-shadow' : 'full-shadow'}
          castShadow
          position={[4, 7, 5]}
          intensity={1.65}
          shadow-mapSize-width={compactViewport ? 512 : 768}
          shadow-mapSize-height={compactViewport ? 512 : 768}
          shadow-bias={-0.0001}
          shadow-normalBias={0.008}
          shadow-camera-left={-shadowCameraExtent}
          shadow-camera-right={shadowCameraExtent}
          shadow-camera-top={shadowCameraExtent}
          shadow-camera-bottom={-shadowCameraExtent}
          shadow-camera-near={0.1}
          shadow-camera-far={30}
        />
        <spotLight position={[-4, 5, 2]} intensity={1.1} angle={0.45} penumbra={1} color="#dfeaff" />
        <pointLight position={[3, 2, -4]} intensity={0.7} color="#8eafff" />
        <MachineModel
          assemblyProgress={assemblyProgress}
          storyProgress={storyProgress}
          heroProgress={heroProgress ?? defaultHeroProgress}
          alignRight={alignRight}
          interactive={interactive}
        />
        <Environment preset="studio" environmentIntensity={0.72} />
        {interactive && (
          <>
            <OrbitControls
              makeDefault
              autoRotate={autoRotate}
              autoRotateSpeed={0.7}
              enableDamping
              enableRotate
              enableZoom
              enablePan={false}
              minDistance={2}
              maxDistance={20}
              zoomSpeed={0.9}
              onStart={() => setAutoRotate(false)}
            />
            <ViewerZoom actions={viewerActions} />
          </>
        )}
      </Canvas>
      {interactive && (
        <div className="model-viewer-controls" aria-label="3D model controls">
          <p className="model-viewer-hint">Drag to rotate <span aria-hidden="true">·</span> Scroll to zoom</p>
          <div className="model-viewer-buttons">
            <button type="button" aria-label="Zoom out" onClick={() => viewerActions.current?.zoomOut()}>−</button>
            <button type="button" aria-label="Zoom in" onClick={() => viewerActions.current?.zoomIn()}>+</button>

          </div>
        </div>
      )}
    </div>
  );
}
