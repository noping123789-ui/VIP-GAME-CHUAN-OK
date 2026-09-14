/**
 * 3D Car Model Manager - USDZ Loader & GPU Geometry Cache
 */
import * as THREE from 'three';
import { USDLoader } from 'three/examples/jsm/loaders/USDLoader.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export interface CarModelDefinition {
  index: number;
  url: string;
  name: string;
  rotationY?: number; // Góc xoay trục Y (radian) chuẩn hóa hướng mũi xe nhìn về phía trước (+Z)
  rotateY90: boolean;
  targetLength: number; // 3.3 meters (tỉ lệ chuẩn xe đua thể thao khí động học)
}

export class CarModelManager {
  private static instance: CarModelManager;
  private loader: USDLoader;
  private cache: Map<number, THREE.Group> = new Map();
  private loadingPromises: Map<number, Promise<THREE.Group>> = new Map();

  // Kích thước chuẩn 3.3m: nhỏ gọn, thanh thoát, ôm sát đường cua và vừa vặn làn đua 14m
  public static readonly TARGET_CAR_LENGTH = 3.3;

  public static readonly MODELS: CarModelDefinition[] = [
    { index: 0, url: '/cars/xedep_1.usdz', name: 'Speedster Hyper GT', rotationY: Math.PI / 2, rotateY90: true, targetLength: 3.3 },
    { index: 1, url: '/cars/xedep_2.usdz', name: 'Mansory Carbon RS', rotationY: 0, rotateY90: false, targetLength: 3.3 },
    { index: 2, url: '/cars/xedep_3.usdz', name: 'Ferrari SF90 Spider', rotationY: 0, rotateY90: false, targetLength: 3.3 },
    { index: 3, url: '/cars/xedep_4.usdz', name: 'Apex Prototype AWD', rotationY: 0, rotateY90: false, targetLength: 3.3 },
    { index: 4, url: '/cars/xedep_5.usdz', name: 'Bugatti Tourbillon', rotationY: 0, rotateY90: false, targetLength: 3.3 },
    // Xe số 5 (LeMans Prototype Aero): mũi xe ở trục +X ban đầu, cần xoay -90 độ (-PI/2) để hướng thẳng về phía trước (+Z), sửa triệt để lỗi xe bị quay ngược về sau
    { index: 5, url: '/cars/xedep_6.usdz', name: 'LeMans Prototype Aero', rotationY: -Math.PI / 2, rotateY90: false, targetLength: 3.3 },
    { index: 6, url: '/cars/xedep_7.usdz', name: 'Deus Vayanne Hypercar', rotationY: 0, rotateY90: false, targetLength: 3.3 },
    { index: 7, url: '/cars/xedep_8.usdz', name: 'Ferrari Monza SP2', rotationY: 0, rotateY90: false, targetLength: 3.3 },
  ];

  private constructor() {
    this.loader = new USDLoader();
    this.preloadAll();
  }

  public static getInstance(): CarModelManager {
    if (!CarModelManager.instance) {
      CarModelManager.instance = new CarModelManager();
    }
    return CarModelManager.instance;
  }

  /**
   * Preload all 8 models into cache
   */
  public preloadAll(): void {
    CarModelManager.MODELS.forEach(def => {
      this.loadModel(def.index).catch(err => {
        console.warn(`[CarModelManager] Error preloading model ${def.index}:`, err);
      });
    });
  }

  /**
   * Load and normalize a model by index (0-7)
   */
  public async loadModel(index: number): Promise<THREE.Group> {
    const safeIndex = ((index % CarModelManager.MODELS.length) + CarModelManager.MODELS.length) % CarModelManager.MODELS.length;

    if (this.cache.has(safeIndex)) {
      return this.cache.get(safeIndex)!;
    }

    if (this.loadingPromises.has(safeIndex)) {
      return this.loadingPromises.get(safeIndex)!;
    }

    const def = CarModelManager.MODELS[safeIndex];

    const promise = new Promise<THREE.Group>((resolve, reject) => {
      this.loader.load(
        def.url,
        (loadedObject) => {
          try {
            const normalized = this.normalizeModel(loadedObject, def);
            this.cache.set(safeIndex, normalized);
            resolve(normalized);
          } catch (e) {
            console.error(`[CarModelManager] Failed normalizing model ${safeIndex}:`, e);
            reject(e);
          }
        },
        undefined,
        (error) => {
          console.error(`[CarModelManager] Failed loading ${def.url}:`, error);
          reject(error);
        }
      );
    });

    this.loadingPromises.set(safeIndex, promise);
    return promise;
  }

  /**
   * Normalizes the 3D car model:
   * 1. Loại bỏ mặt phẳng sàn/bóng vô hạn hoặc khối thừa.
   * 2. Tối ưu gom nhóm meshes theo chất liệu (mergeGeometries) giảm số mesh từ 1250+ xuống còn 15-28 meshes.
   * 3. Tính toán pháp tuyến vertex mượt mà, khử lỗi bóng răng cưa.
   * 4. Cân chỉnh kích thước chính xác 3.3m (chiều dài Z), chiều rộng X ~1.5m, chiều cao Y ~0.8-1.0m.
   * 5. Căn giữa X=0, Z=0 và đáy tiếp xúc mặt đường tại Y=0.
   */
  private normalizeModel(rawObject: THREE.Object3D, def: CarModelDefinition): THREE.Group {
    const wrapper = new THREE.Group();
    wrapper.name = `usdz_car_${def.index}_${def.name}`;

    rawObject.updateMatrixWorld(true);

    // 1. Loại bỏ mặt sàn, shadow plane hoặc các khối phụ trợ
    const planesToRemove: THREE.Object3D[] = [];
    rawObject.traverse(child => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const name = (mesh.name || '').toLowerCase();
        if (
          name.includes('plane_') ||
          name.includes('shadow_plane') ||
          name.includes('ground') ||
          name.includes('floor') ||
          (def.index === 0 && name.includes('cube_044'))
        ) {
          planesToRemove.push(mesh);
        }
      }
    });
    planesToRemove.forEach(p => p.parent?.remove(p));

    // 2. Gom nhóm tối ưu hóa giảm số lượng mesh (Mesh Batching by Material Signature)
    const contentGroup = new THREE.Group();
    const meshes: THREE.Mesh[] = [];
    rawObject.traverse(c => {
      if ((c as THREE.Mesh).isMesh) {
        const m = c as THREE.Mesh;
        if (m.geometry && m.geometry.attributes && m.geometry.attributes.position) {
          meshes.push(m);
        }
      }
    });

    const groups = new Map<string, { material: THREE.Material; geometries: THREE.BufferGeometry[] }>();

    meshes.forEach(mesh => {
      mesh.updateMatrixWorld(true);
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      const mat = mats[0];
      if (!mat) return;

      const anyMat = mat as any;
      const sig = [
        mat.type,
        'color' in mat && anyMat.color ? anyMat.color.getHexString() : 'none',
        Math.round((anyMat.roughness || 0) * 100),
        Math.round((anyMat.metalness || 0) * 100),
        Math.round((anyMat.opacity !== undefined ? anyMat.opacity : 1) * 100),
        mat.transparent || false,
        'map' in mat && anyMat.map ? anyMat.map.uuid : 'nomap'
      ].join('_');

      if (!groups.has(sig)) {
        groups.set(sig, { material: mat, geometries: [] });
      }

      const clonedGeo = mesh.geometry.clone();
      clonedGeo.applyMatrix4(mesh.matrixWorld);
      groups.get(sig)!.geometries.push(clonedGeo);
    });

    for (const entry of groups.values()) {
      try {
        const merged = mergeGeometries(entry.geometries, false);
        if (merged) {
          merged.computeVertexNormals();
          const newMesh = new THREE.Mesh(merged, entry.material);
          newMesh.castShadow = true;
          newMesh.receiveShadow = true;
          contentGroup.add(newMesh);
        } else {
          entry.geometries.forEach(geo => {
            const fallbackMesh = new THREE.Mesh(geo, entry.material);
            fallbackMesh.castShadow = true;
            fallbackMesh.receiveShadow = true;
            contentGroup.add(fallbackMesh);
          });
        }
      } catch (err) {
        entry.geometries.forEach(geo => {
          const fallbackMesh = new THREE.Mesh(geo, entry.material);
          fallbackMesh.castShadow = true;
          fallbackMesh.receiveShadow = true;
          contentGroup.add(fallbackMesh);
        });
      }
    }

    wrapper.add(contentGroup);

    // 3. Xoay góc nếu mô hình hướng ngang hoặc cần chuẩn hóa hướng tiến
    if (def.rotationY !== undefined) {
      contentGroup.rotation.y = def.rotationY;
    } else if (def.rotateY90) {
      contentGroup.rotation.y = Math.PI / 2;
    }
    contentGroup.updateMatrixWorld(true);

    // 4. Đo đạc và scale chuẩn xác về chiều dài mong muốn (3.3m)
    let box = new THREE.Box3().setFromObject(contentGroup);
    let size = new THREE.Vector3();
    box.getSize(size);

    const currentLength = size.z > 0.001 ? size.z : def.targetLength;
    const scale = def.targetLength / currentLength;
    contentGroup.scale.set(scale, scale, scale);
    contentGroup.updateMatrixWorld(true);

    // 5. Căn giữa X, Z và đặt đáy tiếp xúc mặt đường tại Y = 0
    box = new THREE.Box3().setFromObject(contentGroup);
    const center = new THREE.Vector3();
    box.getCenter(center);
    box.getSize(size);

    contentGroup.position.x -= center.x;
    contentGroup.position.z -= center.z;
    contentGroup.position.y -= box.min.y;
    contentGroup.updateMatrixWorld(true);

    return wrapper;
  }

  /**
   * Clones and attaches the 3D car model into a car group.
   * If not yet loaded, attaches a temporary placeholder and swaps cleanly upon load.
   */
  public attachCarVisual(
    parentGroup: THREE.Group,
    modelIndex: number,
    placeholderMeshes: THREE.Object3D[]
  ): void {
    const safeIndex = ((modelIndex % CarModelManager.MODELS.length) + CarModelManager.MODELS.length) % CarModelManager.MODELS.length;

    const swapInModel = (cached: THREE.Group) => {
      // Check if real visual already added
      if (parentGroup.getObjectByName('real_usdz_car')) {
        return;
      }
      // Remove temporary placeholder meshes
      placeholderMeshes.forEach(mesh => {
        if (mesh.parent === parentGroup) {
          parentGroup.remove(mesh);
        }
      });

      // Clone cached model
      const clone = cached.clone(true);
      clone.name = 'real_usdz_car';
      parentGroup.add(clone);
    };

    if (this.cache.has(safeIndex)) {
      swapInModel(this.cache.get(safeIndex)!);
    } else {
      this.loadModel(safeIndex).then(model => {
        swapInModel(model);
      }).catch(err => {
        console.warn(`[CarModelManager] Could not swap in 3D car ${safeIndex}, keeping placeholder:`, err);
      });
    }
  }
}

export const carModelManager = CarModelManager.getInstance();
