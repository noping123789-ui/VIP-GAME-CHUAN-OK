import * as THREE from 'three';
import { TrackBiome } from '../types';
import { safeGetPointAt, safeGetTangentAt } from './curveUtils';
import { generatePointsForLayout } from './trackLayouts';

export interface GeneratedTrack {
  curve: THREE.CatmullRomCurve3;
  trackMesh: THREE.Mesh;
  curbMeshes: THREE.Mesh[];
  sceneryGroup: THREE.Group;
  totalLength: number;
}

export class TrackGenerator {
  /**
   * Generates a closed circuit path based on seed, biome, and road layout
   * Scaled 10x larger for long 32km - 42km high-speed racing circuits
   * Ensures cars never repeat any curve within 2 full minutes of racing!
   */
  static generateTrack(seed: number, biome: TrackBiome): GeneratedTrack {
    const layout = biome.roadLayoutType || 'GRAND_PRIX_OVAL';
    // 100 Con Đường Đua Độc Nhất, quy mô dài gấp 10 lần (~32,000m - 42,000m)
    // Xe đua suốt 2 phút liên tục không lặp lại bất kỳ khúc cua cũ nào!
    const points = generatePointsForLayout(layout, seed);

    const curve = new THREE.CatmullRomCurve3(points, true, 'centripetal', 0.5);
    curve.arcLengthDivisions = 6000; // Siêu mịn, triệt tiêu vi chấn bước nhảy spline
    const totalLength = curve.getLength();

    // Generate Track Ribbon Geometry (width = 15 units, extra spacious for 15 racing cars!)
    const trackWidth = 15;
    const segments = 1200; // High resolution for silky-smooth 35km curves
    const trackGeo = new THREE.BufferGeometry();
    const positions: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const point = safeGetPointAt(curve, t);
      const tangent = safeGetTangentAt(curve, t);
      const up = new THREE.Vector3(0, 1, 0);
      const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();

      // Left edge, Center, Right edge
      const pLeft = point.clone().addScaledVector(normal, trackWidth / 2);
      const pRight = point.clone().addScaledVector(normal, -trackWidth / 2);

      positions.push(pLeft.x, pLeft.y + 0.1, pLeft.z);
      positions.push(pRight.x, pRight.y + 0.1, pRight.z);

      normals.push(0, 1, 0);
      normals.push(0, 1, 0);

      uvs.push(0, t * 480);
      uvs.push(1, t * 480);

      if (i < segments) {
        const base = i * 2;
        indices.push(base, base + 1, base + 2);
        indices.push(base + 1, base + 3, base + 2);
      }
    }

    trackGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    trackGeo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    trackGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    trackGeo.setIndex(indices);

    const trackMat = new THREE.MeshStandardMaterial({
      color: 0x14171d, // Deep dark Grand Prix asphalt for maximum contrast against terrain
      roughness: 0.82,
      metalness: 0.12,
    });

    const trackMesh = new THREE.Mesh(trackGeo, trackMat);
    trackMesh.receiveShadow = true;

    // Scenery items (curbs, light poles, arches, center markings)
    const sceneryGroup = new THREE.Group();
    const curbMeshes: THREE.Mesh[] = [];

    const dummy = new THREE.Object3D();
    const up = new THREE.Vector3(0, 1, 0);

    // =========================================================================
    // 1. VẠCH KẺ ĐƯỜNG TRẮNG BIÊN 2 BÊN (ROAD EDGE WHITE LINES) - RÕ RÀNG NÉT CĂNG
    // Giúp con đường tách biệt hoàn toàn và nổi bật 100% so với nền đất xung quanh
    // =========================================================================
    const edgeLinesCount = 900;
    const edgeLineGeo = new THREE.BoxGeometry(0.35, 0.05, 12.0);
    const edgeLineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const leftEdgeMesh = new THREE.InstancedMesh(edgeLineGeo, edgeLineMat, edgeLinesCount);
    const rightEdgeMesh = new THREE.InstancedMesh(edgeLineGeo, edgeLineMat, edgeLinesCount);
    leftEdgeMesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    rightEdgeMesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);

    for (let i = 0; i < edgeLinesCount; i++) {
      const t = i / edgeLinesCount;
      const point = safeGetPointAt(curve, t);
      const tangent = safeGetTangentAt(curve, t);
      const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();

      // Vạch biên trái
      const pL = point.clone().addScaledVector(normal, trackWidth / 2 - 0.4);
      dummy.position.set(pL.x, pL.y + 0.14, pL.z);
      dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      leftEdgeMesh.setMatrixAt(i, dummy.matrix);

      // Vạch biên phải
      const pR = point.clone().addScaledVector(normal, -trackWidth / 2 + 0.4);
      dummy.position.set(pR.x, pR.y + 0.14, pR.z);
      dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      rightEdgeMesh.setMatrixAt(i, dummy.matrix);
    }
    leftEdgeMesh.instanceMatrix.needsUpdate = true;
    rightEdgeMesh.instanceMatrix.needsUpdate = true;
    sceneryGroup.add(leftEdgeMesh, rightEdgeMesh);

    // =========================================================================
    // 2. VẠCH KẺ ĐƯỜNG Ở GIỮA (CENTER LINE)
    // 100 kiểu vạch đường độc nhất: màu sắc, độ dày, hoa văn (đơn, đôi, nhấp nháy)
    // =========================================================================
    const centerLinesCount = 1800;
    const lineWidth = biome.centerLineWidth || 0.44;
    const lineLength = biome.centerLineLength || 6.5;
    const isDoubleLine = biome.centerLinePattern === 'double';

    const lineGeo = new THREE.BoxGeometry(lineWidth, 0.06, lineLength);
    const lineMat = new THREE.MeshBasicMaterial({ color: biome.centerLineColor || 0xf8fafc });
    
    // Nếu là vạch đôi (double line), tạo 2 vạch song song ở tim đường
    const totalLinesToRender = isDoubleLine ? centerLinesCount * 2 : centerLinesCount;
    const centerLinesMesh = new THREE.InstancedMesh(lineGeo, lineMat, totalLinesToRender);
    centerLinesMesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);

    for (let i = 0; i < centerLinesCount; i++) {
      const t = i / centerLinesCount;
      const point = safeGetPointAt(curve, t);
      const tangent = safeGetTangentAt(curve, t);
      const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();

      if (isDoubleLine) {
        // Vạch đôi tim đường: 2 vạch lệch trái phải 0.32m
        const p1 = point.clone().addScaledVector(normal, 0.32);
        dummy.position.set(p1.x, p1.y + 0.16, p1.z);
        dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        centerLinesMesh.setMatrixAt(i * 2, dummy.matrix);

        const p2 = point.clone().addScaledVector(normal, -0.32);
        dummy.position.set(p2.x, p2.y + 0.16, p2.z);
        dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        centerLinesMesh.setMatrixAt(i * 2 + 1, dummy.matrix);
      } else {
        // Vạch đơn ở giữa tâm đường
        dummy.position.set(point.x, point.y + 0.16, point.z);
        dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        centerLinesMesh.setMatrixAt(i, dummy.matrix);
      }
    }
    centerLinesMesh.instanceMatrix.needsUpdate = true;
    sceneryGroup.add(centerLinesMesh);

    // =========================================================================
    // 2. CỘT VEN ĐƯỜNG & CỘT ĐÈN CAO TẦNG - GIẢM ĐI 3 LẦN THEO YÊU CẦU NGƯỜI DÙNG
    // Cọc tiêu giảm từ 1400 -> 460 (giảm 3 lần)
    // Cột đèn cao tầng giảm từ 350 -> 115 (giảm 3 lần)
    // =========================================================================
    const bollardCount = 460; // Giảm 3 lần theo yêu cầu
    const bollardHeight = 1.8;
    const bollardGeo = new THREE.CylinderGeometry(0.18, 0.22, bollardHeight, 8);
    const bollardMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.3,
      metalness: 0.8
    });
    const leftBollardsMesh = new THREE.InstancedMesh(bollardGeo, bollardMat, bollardCount);
    const rightBollardsMesh = new THREE.InstancedMesh(bollardGeo, bollardMat, bollardCount);
    leftBollardsMesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    rightBollardsMesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);

    // Mũ phản quang phát sáng trên đầu mỗi cột (Màu sắc riêng theo 100 bản đồ)
    const capGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.35, 8);
    const capMat = new THREE.MeshBasicMaterial({ color: biome.bollardReflectorColor || 0xf59e0b });
    const leftCapsMesh = new THREE.InstancedMesh(capGeo, capMat, bollardCount);
    const rightCapsMesh = new THREE.InstancedMesh(capGeo, capMat, bollardCount);
    leftCapsMesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    rightCapsMesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);

    // Cột đèn cao tầng chiếu sáng (Giảm 3 lần: 350 -> 115 cột)
    const tallPoleCount = 115;
    const tallPoleHeight = 12;
    const tallPoleGeo = new THREE.CylinderGeometry(0.25, 0.35, tallPoleHeight, 8);
    const tallPoleMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.85, roughness: 0.25 });
    const leftTallPolesMesh = new THREE.InstancedMesh(tallPoleGeo, tallPoleMat, tallPoleCount);
    const rightTallPolesMesh = new THREE.InstancedMesh(tallPoleGeo, tallPoleMat, tallPoleCount);

    // Đèn LED trên đỉnh cột cao tầng (Màu sắc ánh sáng riêng biệt của từng bản đồ)
    const tallLampGeo = new THREE.BoxGeometry(1.6, 0.3, 0.8);
    const tallLampMat = new THREE.MeshBasicMaterial({ color: biome.lampColor || 0x38bdf8 });
    const leftTallLampsMesh = new THREE.InstancedMesh(tallLampGeo, tallLampMat, tallPoleCount);
    const rightTallLampsMesh = new THREE.InstancedMesh(tallLampGeo, tallLampMat, tallPoleCount);

    for (let b = 0; b < bollardCount; b++) {
      const t = b / bollardCount;
      const point = safeGetPointAt(curve, t);
      const tangent = safeGetTangentAt(curve, t);
      const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();

      // Cột tiêu lề trái
      const pLeft = point.clone().addScaledVector(normal, trackWidth / 2 + 1.2);
      dummy.position.set(pLeft.x, pLeft.y + bollardHeight / 2, pLeft.z);
      dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      leftBollardsMesh.setMatrixAt(b, dummy.matrix);

      // Mũ phản quang trái
      dummy.position.set(pLeft.x, pLeft.y + bollardHeight - 0.15, pLeft.z);
      dummy.updateMatrix();
      leftCapsMesh.setMatrixAt(b, dummy.matrix);

      // Cột tiêu lề phải
      const pRight = point.clone().addScaledVector(normal, -trackWidth / 2 - 1.2);
      dummy.position.set(pRight.x, pRight.y + bollardHeight / 2, pRight.z);
      dummy.updateMatrix();
      rightBollardsMesh.setMatrixAt(b, dummy.matrix);

      // Mũ phản quang phải
      dummy.position.set(pRight.x, pRight.y + bollardHeight - 0.15, pRight.z);
      dummy.updateMatrix();
      rightCapsMesh.setMatrixAt(b, dummy.matrix);
    }
    leftBollardsMesh.instanceMatrix.needsUpdate = true;
    rightBollardsMesh.instanceMatrix.needsUpdate = true;
    leftCapsMesh.instanceMatrix.needsUpdate = true;
    rightCapsMesh.instanceMatrix.needsUpdate = true;
    sceneryGroup.add(leftBollardsMesh, rightBollardsMesh, leftCapsMesh, rightCapsMesh);

    for (let p = 0; p < tallPoleCount; p++) {
      const t = p / tallPoleCount;
      const point = safeGetPointAt(curve, t);
      const tangent = safeGetTangentAt(curve, t);
      const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();

      // Cột đèn cao lề trái
      const pLeft = point.clone().addScaledVector(normal, trackWidth / 2 + 3.8);
      dummy.position.set(pLeft.x, pLeft.y + tallPoleHeight / 2, pLeft.z);
      dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();
      leftTallPolesMesh.setMatrixAt(p, dummy.matrix);

      dummy.position.set(pLeft.x, pLeft.y + tallPoleHeight, pLeft.z);
      dummy.updateMatrix();
      leftTallLampsMesh.setMatrixAt(p, dummy.matrix);

      // Cột đèn cao lề phải
      const pRight = point.clone().addScaledVector(normal, -trackWidth / 2 - 3.8);
      dummy.position.set(pRight.x, pRight.y + tallPoleHeight / 2, pRight.z);
      dummy.updateMatrix();
      rightTallPolesMesh.setMatrixAt(p, dummy.matrix);

      dummy.position.set(pRight.x, pRight.y + tallPoleHeight, pRight.z);
      dummy.updateMatrix();
      rightTallLampsMesh.setMatrixAt(p, dummy.matrix);
    }
    leftTallPolesMesh.instanceMatrix.needsUpdate = true;
    rightTallPolesMesh.instanceMatrix.needsUpdate = true;
    leftTallLampsMesh.instanceMatrix.needsUpdate = true;
    rightTallLampsMesh.instanceMatrix.needsUpdate = true;
    sceneryGroup.add(leftTallPolesMesh, rightTallPolesMesh, leftTallLampsMesh, rightTallLampsMesh);

    // Giảm bớt gờ mép đường (curb) 2 bên theo yêu cầu người dùng (giảm 4 lần, ngắt quãng thoáng đãng)
    const curbSegments = 90;
    const curbGeo = new THREE.BoxGeometry(0.8, 0.25, 8.0);
    const curbMat1 = new THREE.MeshStandardMaterial({
      color: biome.kerbColor1 || 0xffffff,
      roughness: 0.5,
      metalness: 0.15
    });
    const curbMat2 = new THREE.MeshStandardMaterial({
      color: biome.kerbColor2 || 0xef4444,
      roughness: 0.5,
      metalness: 0.15
    });

    for (let c = 0; c < curbSegments; c += 2) {
      // Bớt đi các đoạn thừa, chỉ giữ lại các cụm gờ curb nhẹ nhàng ở các khúc cua
      if ((c / 2) % 3 === 2) continue;

      const t = c / curbSegments;
      const point = safeGetPointAt(curve, t);
      const tangent = safeGetTangentAt(curve, t);
      const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();

      const isCurb1 = (c / 2) % 2 === 0;
      const currentCurbMat = isCurb1 ? curbMat1 : curbMat2;

      // Left curb
      const pLeft = point.clone().addScaledVector(normal, trackWidth / 2 + 0.4);
      const curbLeft = new THREE.Mesh(curbGeo, currentCurbMat);
      curbLeft.position.set(pLeft.x, pLeft.y + 0.15, pLeft.z);
      curbLeft.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);
      sceneryGroup.add(curbLeft);
      curbMeshes.push(curbLeft);

      // Right curb
      const pRight = point.clone().addScaledVector(normal, -trackWidth / 2 - 0.4);
      const curbRight = new THREE.Mesh(curbGeo, currentCurbMat);
      curbRight.position.set(pRight.x, pRight.y + 0.15, pRight.z);
      curbRight.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);
      sceneryGroup.add(curbRight);
      curbMeshes.push(curbRight);
    }

    // =========================================================================
    // ĐƯỜNG HẦM TỐC ĐỘ CAO (HIGH-SPEED NEON TUNNEL) - XUẤT HIỆN TRÊN MỌI BẢN ĐỒ!
    // Khoảng cách từ t = 0.62 đến t = 0.76 (~5km dài)
    // =========================================================================
    const tunnelStartT = 0.62;
    const tunnelEndT = 0.76;
    const tunnelRingsCount = 30;

    const archRingGeo = new THREE.TorusGeometry(trackWidth / 2 + 1.6, 0.45, 8, 24, Math.PI);
    const archMatDark = new THREE.MeshStandardMaterial({ color: biome.archColor || 0x0f172a, metalness: 0.9, roughness: 0.2 });
    const neonLightGeo = new THREE.BoxGeometry(trackWidth + 2, 0.25, 0.35);
    const neonGlowMat = new THREE.MeshBasicMaterial({ color: biome.lampColor || 0x00f0ff }); // Neon Glow theo bản đồ
    const neonSideGlowMat = new THREE.MeshBasicMaterial({ color: biome.centerLineColor || 0xff007f }); // Neon Accent theo bản đồ

    for (let r = 0; r <= tunnelRingsCount; r++) {
      const ringT = tunnelStartT + (r / tunnelRingsCount) * (tunnelEndT - tunnelStartT);
      const ringPos = safeGetPointAt(curve, ringT);
      const ringTan = safeGetTangentAt(curve, ringT);
      const up = new THREE.Vector3(0, 1, 0);
      const ringNorm = new THREE.Vector3().crossVectors(ringTan, up).normalize();

      // Vòm hầm Torus Arch
      const archRing = new THREE.Mesh(archRingGeo, archMatDark);
      archRing.position.set(ringPos.x, ringPos.y + 0.2, ringPos.z);
      archRing.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), ringTan);
      archRing.rotation.z = Math.PI / 2;
      sceneryGroup.add(archRing);

      // Thanh đèn LED Neon trên nóc hầm
      const ceilingNeon = new THREE.Mesh(neonLightGeo, (r % 2 === 0) ? neonGlowMat : neonSideGlowMat);
      ceilingNeon.position.set(ringPos.x, ringPos.y + (trackWidth / 2 + 1.2), ringPos.z);
      ceilingNeon.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), ringNorm);
      sceneryGroup.add(ceilingNeon);

      // Cổng chào ĐẦU HẦM TỐC ĐỘ CAO (Entrance Portal)
      if (r === 0) {
        const portalPillarGeo = new THREE.BoxGeometry(1.6, 12, 1.6);
        const pL = new THREE.Mesh(portalPillarGeo, archMatDark);
        pL.position.copy(ringPos).addScaledVector(ringNorm, trackWidth / 2 + 2.5);
        pL.position.y += 6;

        const pR = new THREE.Mesh(portalPillarGeo, archMatDark);
        pR.position.copy(ringPos).addScaledVector(ringNorm, -trackWidth / 2 - 2.5);
        pR.position.y += 6;

        const bannerGeo = new THREE.PlaneGeometry(trackWidth + 3, 2.2);
        const bannerMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, side: THREE.DoubleSide });
        const portalSign = new THREE.Mesh(bannerGeo, bannerMat);
        portalSign.position.copy(ringPos);
        portalSign.position.y += 11.5;
        portalSign.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), ringTan);

        sceneryGroup.add(pL, pR, portalSign);
      }

      // Cổng chào CUỐI HẦM (Exit Portal)
      if (r === tunnelRingsCount) {
        const portalPillarGeo = new THREE.BoxGeometry(1.6, 12, 1.6);
        const pL = new THREE.Mesh(portalPillarGeo, archMatDark);
        pL.position.copy(ringPos).addScaledVector(ringNorm, trackWidth / 2 + 2.5);
        pL.position.y += 6;

        const pR = new THREE.Mesh(portalPillarGeo, archMatDark);
        pR.position.copy(ringPos).addScaledVector(ringNorm, -trackWidth / 2 - 2.5);
        pR.position.y += 6;

        const bannerGeo = new THREE.PlaneGeometry(trackWidth + 3, 2.2);
        const bannerMat = new THREE.MeshBasicMaterial({ color: 0x22c55e, side: THREE.DoubleSide });
        const exitSign = new THREE.Mesh(bannerGeo, bannerMat);
        exitSign.position.copy(ringPos);
        exitSign.position.y += 11.5;
        exitSign.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), ringTan);

        sceneryGroup.add(pL, pR, exitSign);
      }
    }

    // Start/Finish Arch Gantry (Cổng xuất phát & đích)
    const startPoint = safeGetPointAt(curve, 0);
    const startTangent = safeGetTangentAt(curve, 0);
    const startNormal = new THREE.Vector3().crossVectors(startTangent, new THREE.Vector3(0, 1, 0)).normalize();

    const archGroup = new THREE.Group();
    const pillarGeo = new THREE.BoxGeometry(1.4, 11, 1.4);
    const archMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9, roughness: 0.2 });

    const p1 = new THREE.Mesh(pillarGeo, archMat);
    p1.position.copy(startPoint).addScaledVector(startNormal, trackWidth / 2 + 2.0);
    p1.position.y += 5.5;

    const p2 = new THREE.Mesh(pillarGeo, archMat);
    p2.position.copy(startPoint).addScaledVector(startNormal, -trackWidth / 2 - 2.0);
    p2.position.y += 5.5;

    const crossbarGeo = new THREE.BoxGeometry(trackWidth + 5, 2.0, 2.0);
    const crossbar = new THREE.Mesh(crossbarGeo, new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.3, metalness: 0.4 }));
    crossbar.position.copy(startPoint);
    crossbar.position.y += 11;
    crossbar.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), startNormal);

    // Start lights (5 green LEDs)
    const lightGeo = new THREE.SphereGeometry(0.38, 12, 12);
    const lightMat = new THREE.MeshBasicMaterial({ color: 0x22c55e });
    for (let sl = -2; sl <= 2; sl++) {
      const slMesh = new THREE.Mesh(lightGeo, lightMat);
      slMesh.position.copy(startPoint).addScaledVector(startNormal, sl * 1.8);
      slMesh.position.y += 10.1;
      archGroup.add(slMesh);
    }

    const bannerGeo = new THREE.PlaneGeometry(trackWidth - 1, 1.6);
    const bannerMat = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
    const banner = new THREE.Mesh(bannerGeo, bannerMat);
    banner.position.copy(crossbar.position);
    banner.position.y -= 0.4;
    banner.lookAt(startPoint.clone().add(startTangent));

    archGroup.add(p1, p2, crossbar, banner);
    sceneryGroup.add(archGroup);

    // Ground terrain plane (Mặt đất mở rộng 35000x35000 bao quát toàn bộ đường đua 35km)
    const groundGeo = new THREE.PlaneGeometry(35000, 35000, 48, 48);
    const groundMat = new THREE.MeshStandardMaterial({
      color: biome.groundColor,
      roughness: 0.9,
      metalness: 0.05
    });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.position.y = -0.5;
    groundMesh.receiveShadow = true;
    sceneryGroup.add(groundMesh);

    return {
      curve,
      trackMesh,
      curbMeshes,
      sceneryGroup,
      totalLength
    };
  }
}
