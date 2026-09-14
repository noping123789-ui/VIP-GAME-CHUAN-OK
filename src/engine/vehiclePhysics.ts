import * as THREE from 'three';
import { AICarState } from '../types';
import { safeGetPointAt, safeGetTangentAt, getSafeCurveU } from './curveUtils';
import { carModelManager } from './carModelManager';

// Pre-allocated reusable Three.js objects to prevent garbage collection spikes in the render loop
const _upVec = new THREE.Vector3(0, 1, 0);
const _normalVec = new THREE.Vector3();
const _finalPos = new THREE.Vector3();
const _lookTargetVec = new THREE.Vector3();
const _dummyTarget = new THREE.Object3D();
const _rotAxisY = new THREE.Vector3(0, 1, 0);

export interface Car3DObject {
  group: THREE.Group;
  bodyMesh: THREE.Mesh;
  wheels: THREE.Mesh[];
  headlights: THREE.Mesh[];
  taillights: THREE.Mesh[];
  exhaustPuffs: THREE.Points;
  state: AICarState;
}

export class VehiclePhysicsSystem {
  private static flameTexture: THREE.Texture | null = null;

  static createFlameTexture(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
      grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
      grad.addColorStop(0.2, 'rgba(255, 210, 0, 1)');
      grad.addColorStop(0.45, 'rgba(255, 55, 0, 0.8)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 32, 32);
    }
    const tex = new THREE.CanvasTexture(canvas);
    return tex;
  }

  static getFlameTexture(): THREE.Texture {
    if (!this.flameTexture) {
      this.flameTexture = this.createFlameTexture();
    }
    return this.flameTexture;
  }

  /**
   * Builds an aerodynamic 3D racing car model
   */
  static createCarMesh(state: AICarState): Car3DObject {
    const group = new THREE.Group();

    // Car Body Material
    const bodyMat = new THREE.MeshStandardMaterial({
      color: state.hexColor,
      metalness: 0.85,
      roughness: 0.25,
    });

    const carbonMat = new THREE.MeshStandardMaterial({
      color: 0x111116,
      metalness: 0.5,
      roughness: 0.6,
    });

    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x050b14,
      metalness: 0.9,
      roughness: 0.1,
      transmission: 0.6,
      transparent: true,
      opacity: 0.85,
    });

    // 1. Lower Chassis
    const chassisGeo = new THREE.BoxGeometry(1.5, 0.38, 3.3);
    const chassisMesh = new THREE.Mesh(chassisGeo, bodyMat);
    chassisMesh.position.y = 0.4;
    group.add(chassisMesh);

    // 2. Cockpit / Cabin
    const cabinGeo = new THREE.BoxGeometry(1.2, 0.45, 1.6);
    const cabinMesh = new THREE.Mesh(cabinGeo, glassMat);
    cabinMesh.position.set(0, 0.72, -0.15);
    group.add(cabinMesh);

    // 3. Hood slope
    const hoodGeo = new THREE.BoxGeometry(1.4, 0.2, 1.0);
    const hoodMesh = new THREE.Mesh(hoodGeo, bodyMat);
    hoodMesh.position.set(0, 0.5, 0.95);
    hoodMesh.rotation.x = 0.1;
    group.add(hoodMesh);

    // 4. Rear Wing / Spoiler
    const wingPillarGeo = new THREE.BoxGeometry(0.08, 0.4, 0.15);
    const pLeft = new THREE.Mesh(wingPillarGeo, carbonMat);
    pLeft.position.set(0.5, 0.75, -1.35);
    const pRight = new THREE.Mesh(wingPillarGeo, carbonMat);
    pRight.position.set(-0.5, 0.75, -1.35);

    const wingBladeGeo = new THREE.BoxGeometry(1.5, 0.06, 0.35);
    const wingBlade = new THREE.Mesh(wingBladeGeo, carbonMat);
    wingBlade.position.set(0, 0.95, -1.35);
    group.add(pLeft, pRight, wingBlade);

    // 5. Headlights
    const lightMat = new THREE.MeshBasicMaterial({ color: 0xeeffff });
    const headlightGeo = new THREE.BoxGeometry(0.25, 0.1, 0.08);
    const hl1 = new THREE.Mesh(headlightGeo, lightMat);
    hl1.position.set(0.55, 0.45, 1.65);
    const hl2 = new THREE.Mesh(headlightGeo, lightMat);
    hl2.position.set(-0.55, 0.45, 1.65);
    group.add(hl1, hl2);

    // 6. Taillights (Red LED bar - High Emissive Standard Material)
    const tailMat = new THREE.MeshStandardMaterial({
      color: 0xff0033,
      emissive: 0xff0000,
      emissiveIntensity: 3.5,
      roughness: 0.1,
      metalness: 0.9
    });
    const tailGeo = new THREE.BoxGeometry(1.4, 0.09, 0.08);
    const tailMesh = new THREE.Mesh(tailGeo, tailMat);
    tailMesh.position.set(0, 0.5, -1.65);
    group.add(tailMesh);

    // 7. Wheels
    const wheelGeo = new THREE.CylinderGeometry(0.35, 0.35, 0.28, 16);
    wheelGeo.rotateZ(Math.PI / 2);
    const wheelMat = new THREE.MeshStandardMaterial({
      color: 0x1a1a1a,
      roughness: 0.8,
      metalness: 0.2
    });

    const rimMat = new THREE.MeshStandardMaterial({
      color: 0xdddddd,
      metalness: 0.9,
      roughness: 0.2
    });

    const wheels: THREE.Mesh[] = [];
    const wheelPositions = [
      [-0.75, 0.35, 0.95],  // Front Left
      [0.75, 0.35, 0.95],   // Front Right
      [-0.75, 0.35, -0.95], // Rear Left
      [0.75, 0.35, -0.95],  // Rear Right
    ];

    wheelPositions.forEach(([x, y, z]) => {
      const tire = new THREE.Mesh(wheelGeo, wheelMat);
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.29, 8), rimMat);
      rim.rotateZ(Math.PI / 2);
      tire.add(rim);
      tire.position.set(x, y, z);
      group.add(tire);
      wheels.push(tire);
    });

    // 8. Nitro / Exhaust Trail Particle System (Procedural glowing spheres with additive blending)
    // Add two beautiful glowing blue LED lights on the sides, and 1 central flame-throwing nozzle
    const blueLedGeo = new THREE.SphereGeometry(0.08, 8, 8);
    const blueLedMat = new THREE.MeshStandardMaterial({
      color: 0x00d2ff,
      emissive: 0x0078ff,
      emissiveIntensity: 6.0,
      roughness: 0.1,
      metalness: 0.9
    });
    const leftExhaustLed = new THREE.Mesh(blueLedGeo, blueLedMat);
    leftExhaustLed.position.set(-0.4, 0.25, -1.65);
    const rightExhaustLed = new THREE.Mesh(blueLedGeo, blueLedMat);
    rightExhaustLed.position.set(0.4, 0.25, -1.65);
    group.add(leftExhaustLed, rightExhaustLed);

    const particleCount = 18;
    const pGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i++) pPos[i] = 0;
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    const pMat = new THREE.PointsMaterial({
      color: 0x00f0ff,
      size: 0.45,
      map: VehiclePhysicsSystem.getFlameTexture(),
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const exhaustPuffs = new THREE.Points(pGeo, pMat);
    exhaustPuffs.position.set(0, 0.25, -1.7); // Placed at center
    group.add(exhaustPuffs);

    group.castShadow = true;
    group.receiveShadow = true;

    const carObj: Car3DObject = {
      group,
      bodyMesh: chassisMesh,
      wheels,
      headlights: [hl1, hl2],
      taillights: [tailMesh],
      exhaustPuffs,
      state
    };

    // Attach authentic high-fidelity 3D car model from xedep.usdz (Model index 0-7)
    const placeholders: THREE.Object3D[] = [
      chassisMesh,
      cabinMesh,
      hoodMesh,
      pLeft,
      pRight,
      wingBlade,
      hl1,
      hl2,
      tailMesh,
      ...wheels
    ];
    carModelManager.attachCarVisual(carObj, state.meshIndex ?? 0, placeholders);

    return carObj;
  }

  /**
   * Updates AI Vehicle steering, throttle, overtaking logic, and position on track
   */
  static updateVehicles(
    cars: Car3DObject[],
    curve: THREE.CatmullRomCurve3,
    totalLength: number,
    delta: number,
    globalAggression: number
  ): { activeOvertakeCarId: string | null; collisionCarId: string | null } {
    let activeOvertakeCarId: string | null = null;
    let collisionCarId: string | null = null;

    const trackWidth = 12.0;

    // Step 1: Update AI decisions for each car
    for (let i = 0; i < cars.length; i++) {
      const car = cars[i];
      const s = car.state;

      // Ensure s.lapProgress is valid finite number
      if (typeof s.lapProgress !== 'number' || isNaN(s.lapProgress) || !isFinite(s.lapProgress)) {
        s.lapProgress = 0;
      }
      s.lapProgress = ((s.lapProgress % 1.0) + 1.0) % 1.0;

      // Track curvature & turning direction ahead to adapt speed and drift physics accurately
      const lookAheadT = getSafeCurveU(s.lapProgress + 0.015);
      const currentTangent = safeGetTangentAt(curve, s.lapProgress);
      const aheadTangent = safeGetTangentAt(curve, lookAheadT);
      const upVec = new THREE.Vector3(0, 1, 0);
      const trackNormal = new THREE.Vector3().crossVectors(currentTangent, upVec).normalize();
      
      // turnCurl: > 0 means track turns LEFT (towards normal), < 0 means track turns RIGHT
      const turnCurl = aheadTangent.dot(trackNormal);
      const curveAngle = Math.abs(currentTangent.angleTo(aheadTangent)) || 0;

      // Desired speed based on turn sharpness and vehicle max speed (keep speed hyper-fast 460 - 520 km/h)
      const turnPenalty = Math.max(0.93, 1.0 - curveAngle * 0.35);
      s.targetSpeed = s.maxSpeed * turnPenalty;

      // Check proximity to car ahead
      let carAheadDist = 9999;
      let carAheadLateral = 0;
      let carAheadId = '';

      for (let j = 0; j < cars.length; j++) {
        if (i === j) continue;
        const other = cars[j].state;
        let distAlong = (other.lapProgress - s.lapProgress);
        if (distAlong < -0.5) distAlong += 1.0; // wraparound
        if (distAlong > 0 && distAlong < 0.18) {
          const worldDist = distAlong * totalLength;
          if (worldDist < carAheadDist) {
            carAheadDist = worldDist;
            carAheadLateral = other.lateralOffset;
            carAheadId = other.id;
          }
        }
      }

      // Overtake or slipstream drafting logic
      if (carAheadDist < 30) {
        // In slipstream drafting zone! Boost speed significantly to prepare for overtake
        if (carAheadDist > 10 && Math.abs(carAheadLateral - s.lateralOffset) < 0.4) {
          s.targetSpeed = Math.min(s.maxSpeed + 45, s.targetSpeed + 35);
        }

        if (carAheadDist < 12) {
          // Close quarters battle - speed UP aggressively to pass instead of slowing down!
          const targetCarSpeed = cars.find(c => c.state.id === carAheadId)?.state.speed || 460;
          s.targetSpeed = Math.min(s.maxSpeed + 50, targetCarSpeed + 35 + s.aggression * 20);
        }

        // Steer laterally to execute high-speed overtake on the open side
        const overtakeSide = carAheadLateral > 0 ? -0.65 : 0.65;
        s.targetLateralOffset = overtakeSide * (0.6 + s.aggression * 0.4);

        // Mark overtake action
        if (s.speed > (cars.find(c => c.state.id === carAheadId)?.state.speed || 0) + 5) {
          activeOvertakeCarId = s.id;
        }
      } else {
        // Clear track ahead - dynamic racing line
        const wandering = Math.sin(Date.now() * 0.0015 + i * 2.2) * 0.3;
        s.targetLateralOffset = wandering;
      }

      // Smooth lateral steering (lateral offset interpolation)
      const steerSpeed = 3.2 * (s.aggression + 0.3);
      const steerDiff = s.targetLateralOffset - s.lateralOffset;
      s.lateralOffset += steerDiff * Math.min(1.0, delta * steerSpeed);
      s.lateralOffset = Math.max(-0.85, Math.min(0.85, s.lateralOffset));
      s.steerAngle = THREE.MathUtils.lerp(s.steerAngle, steerDiff * 1.5, Math.min(1.0, delta * 12.0));

      // Hyper-Speed Acceleration / Braking (Smooth linear ramp triệt tiêu giật tốc độ)
      if (s.speed < s.targetSpeed) {
        const accelRate = s.acceleration * 20.0;
        s.speed = Math.min(s.targetSpeed, s.speed + accelRate * delta);
      } else if (s.speed > s.targetSpeed) {
        const brakeRate = 30.0;
        s.speed = Math.max(s.targetSpeed, s.speed - brakeRate * delta);
      }

      // High-speed track progression (scaled 2.4x for blistering 460-520 km/h velocity sensation)
      const speedUnitsPerSec = (s.speed * 1000 / 3600) * 2.4;
      const progressDelta = (speedUnitsPerSec * delta) / totalLength;

      s.lapProgress += progressDelta;
      if (s.lapProgress >= 1.0) {
        s.lapProgress -= 1.0;
        s.lap += 1;
      }

      // Bỏ dòng đường hầm tốc độ cao theo yêu cầu người dùng
      s.inTunnel = false;

      // Drift detection tuân thủ chính xác quy tắc vật lý đua xe thể thao:
      // Khi đường rẽ phải (turnCurl < 0), xe drift ôm cua về bên PHẢI (targetDrift > 0, rotateOnAxis +Y hướng mũi sang phải)
      // Khi đường rẽ trái (turnCurl > 0), xe drift ôm cua về bên TRÁI (targetDrift < 0, rotateOnAxis +Y hướng mũi sang trái)
      // Bánh trước counter-steer ngược lại để giữ thăng bằng drift chuẩn xác.
      const hasCurveTurn = Math.abs(turnCurl) > 0.04 && s.speed > 290;
      const hasSwerve = Math.abs(steerDiff) > 0.32 && s.speed > 330;

      if (hasCurveTurn || hasSwerve) {
        s.isDrifting = true;
        let targetDrift = 0;
        if (hasCurveTurn) {
          // Đường rẽ phải (turnCurl < 0) -> drift ôm sang phải (+); đường rẽ trái (turnCurl > 0) -> drift ôm sang trái (-)
          targetDrift = -Math.sign(turnCurl) * Math.min(0.32, Math.abs(turnCurl) * 1.8 + 0.12);
        } else if (hasSwerve) {
          targetDrift = -Math.sign(steerDiff) * 0.20;
        }
        s.driftAngle = THREE.MathUtils.lerp(s.driftAngle, targetDrift, Math.min(1.0, delta * 8.0));
      } else {
        s.isDrifting = false;
        s.driftAngle = THREE.MathUtils.lerp(s.driftAngle, 0, Math.min(1.0, delta * 6.0));
      }

      // Update collision cooldown
      if (s.collisionCooldown > 0) {
        s.collisionCooldown -= delta;
      }
    }

    // Step 2: Car-to-car collision resolution
    for (let i = 0; i < cars.length; i++) {
      for (let j = i + 1; j < cars.length; j++) {
        const c1 = cars[i];
        const c2 = cars[j];

        const p1Dist = c1.state.lap * totalLength + c1.state.lapProgress * totalLength;
        const p2Dist = c2.state.lap * totalLength + c2.state.lapProgress * totalLength;

        const longitudinalDist = Math.abs(p1Dist - p2Dist);
        const lateralDist = Math.abs(c1.state.lateralOffset - c2.state.lateralOffset) * (trackWidth / 2);

        if (longitudinalDist < 3.2 && lateralDist < 1.4) {
          // Collision occurred!
          collisionCarId = c1.state.id;

          if (c1.state.collisionCooldown <= 0 && c2.state.collisionCooldown <= 0) {
            c1.state.collisionCooldown = 0.8;
            c2.state.collisionCooldown = 0.8;

            // Phản lực tách làn mượt mà, không teleport giật cục
            const pushDir = c1.state.lateralOffset > c2.state.lateralOffset ? 1 : -1;
            const pushDelta = pushDir * Math.min(0.04, 0.4 * delta);
            c1.state.lateralOffset = Math.max(-0.85, Math.min(0.85, c1.state.lateralOffset + pushDelta));
            c2.state.lateralOffset = Math.max(-0.85, Math.min(0.85, c2.state.lateralOffset - pushDelta));

            // Ma sát giảm tốc độ nhẹ tự nhiên khi va chạm
            c1.state.speed *= 0.96;
            c2.state.speed *= 0.96;
          }
        }
      }
    }

    // Step 3: Update 3D Positions and Rotations along Curve
    cars.forEach(car => {
      const s = car.state;
      const t = getSafeCurveU(s.lapProgress);

      const centerPoint = safeGetPointAt(curve, t);
      const tangent = safeGetTangentAt(curve, t);
      const up = _upVec;
      _normalVec.crossVectors(tangent, up).normalize();

      // World position with lateral offset using pre-allocated _finalPos
      const lateralDist = s.lateralOffset * (trackWidth / 2);
      _finalPos.copy(centerPoint).addScaledVector(_normalVec, lateralDist);

      // Copy position and orientation directly to completely eliminate micro-stutters, deformation, and relative lag
      car.group.position.copy(_finalPos);

      // Orientation matching tangent + drift yaw using pre-allocated variables
      _dummyTarget.position.copy(_finalPos);
      _lookTargetVec.copy(_finalPos).add(tangent);
      _dummyTarget.lookAt(_lookTargetVec);
      if (Math.abs(s.driftAngle) > 0.001) {
        _dummyTarget.rotateOnAxis(_rotAxisY, s.driftAngle);
      }
      car.group.quaternion.copy(_dummyTarget.quaternion);

      // Realistic Wheel spin animation & Front wheel counter-steering
      const wheelRotSpeed = ((s.speed * 1000 / 3600) / 0.42) * delta;
      car.wheels.forEach((w, wIdx) => {
        w.rotation.x += wheelRotSpeed;
        if (wIdx < 2) {
          // Bánh trước counter-steer khi drift tạo thế drift thể thao chuyên nghiệp
          const counterSteer = -s.driftAngle * 0.75 + s.steerAngle * 0.3;
          w.rotation.y = Math.max(-0.42, Math.min(0.42, counterSteer));
        }
      });

      // Dynamically flare up tail lights when braking or drifting
      if (car.taillights) {
        car.taillights.forEach(tl => {
          const m = tl.material as THREE.MeshStandardMaterial;
          if (m && m.isMeshStandardMaterial) {
            m.emissiveIntensity = s.isDrifting || s.speed > s.targetSpeed ? 8.5 : 2.0;
          }
        });
      }

      // Nitro & Exhaust Flame Particles animation with organic state-aware physics
      if (car.exhaustPuffs) {
        const posAttr = car.exhaustPuffs.geometry.attributes.position as THREE.BufferAttribute;
        const arr = posAttr.array as Float32Array;
        const isSuperSpeed = s.speed > 240;
        const isDrifting = s.isDrifting;

        for (let p = 0; p < arr.length / 3; p++) {
          const idx = p * 3;
          
          // Blow particles backward relative to car (+z is forward, so subtract from z)
          const blowSpeed = isDrifting ? 14.0 : (isSuperSpeed ? 20.0 : 6.0);
          arr[idx + 2] -= delta * blowSpeed;
          
          // Random lateral & vertical dispersion
          arr[idx] += (Math.random() - 0.5) * (isSuperSpeed || isDrifting ? 0.12 : 0.04);
          arr[idx + 1] += (Math.random() - 0.5) * (isSuperSpeed || isDrifting ? 0.08 : 0.03);

          // If particle gets too far, reset back to the single central tailpipe
          const maxDist = isDrifting ? -1.8 : -2.8;
          if (arr[idx + 2] < maxDist) {
            arr[idx] = (Math.random() - 0.5) * 0.08; // Single centralized nozzle
            arr[idx + 1] = -0.15 + (Math.random() - 0.5) * 0.06;
            arr[idx + 2] = 0;
          }
        }
        posAttr.needsUpdate = true;

        // Dynamic coloring and size adjusting based on car performance state
        const mat = car.exhaustPuffs.material as THREE.PointsMaterial;
        if (isDrifting) {
          mat.color.setHex(0xff5500); // Drifting: Blazing fire orange
          mat.size = 0.58;
          mat.opacity = 0.95;
        } else if (isSuperSpeed) {
          mat.color.setHex(0x00d2ff); // Super speed: Nitro rocket blue
          mat.size = 0.48;
          mat.opacity = 0.85;
        } else {
          mat.color.setHex(0xaaaaaa); // Idle: subtle grey exhaust mist
          mat.size = 0.28;
          mat.opacity = 0.4;
        }
      }
    });

    // Step 4: Re-calculate leaderboard ranks based on (lap * 1000 + lapProgress)
    const sorted = [...cars].sort((a, b) => {
      const scoreA = a.state.lap + a.state.lapProgress;
      const scoreB = b.state.lap + b.state.lapProgress;
      return scoreB - scoreA;
    });

    sorted.forEach((car, index) => {
      car.state.rank = index + 1;
    });

    return { activeOvertakeCarId, collisionCarId };
  }
}
