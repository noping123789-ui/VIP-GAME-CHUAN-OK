import * as THREE from 'three';
import { CameraMode } from '../types';
import { Car3DObject } from './vehiclePhysics';

export class CameraDirector {
  public currentMode: CameraMode = CameraMode.TRACKSIDE_TELEPHOTO;
  public camera: THREE.PerspectiveCamera;
  private currentTargetCarId: string = '';
  private dwellTimer: number = 0;
  private nextSwitchTime: number = 5.0; // 4 to 7 seconds per realistic broadcast shot
  private orbitAngle: number = 0;

  // Trạm quay phim ven đường tĩnh (Trackside Static Station) cho cảm giác truyền hình F1 chân thực
  private tracksideStationPos: THREE.Vector3 = new THREE.Vector3();
  private hasStationPos: boolean = false;
  private grandstandStationPos: THREE.Vector3 = new THREE.Vector3();
  private hasGrandstandPos: boolean = false;
  private spectatorStationPos: THREE.Vector3 = new THREE.Vector3();
  private hasSpectatorPos: boolean = false;
  private helipadStationPos: THREE.Vector3 = new THREE.Vector3();
  private hasHelipadPos: boolean = false;

  // Smoothing buffers for cinematic movement (Gimbal chống rung quang học)
  private smoothedCamPos: THREE.Vector3 = new THREE.Vector3(0, 10, 20);
  private smoothedLookTarget: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private isFirstFrame: boolean = true;

  // Gyro-stabilized broadcast tracking anchor: cách ly hoàn toàn rung giật va chạm
  private stabilizedAnchorPos: THREE.Vector3 = new THREE.Vector3();
  private stabilizedAnchorForward: THREE.Vector3 = new THREE.Vector3(0, 0, 1);
  private hasStabilizedAnchor: boolean = false;

  // Thời gian mô phỏng đồng bộ tuyệt đối với delta (triệt tiêu 100% hiện tượng lệch nhịp rung chấn)
  private simulatedTime: number = 0;

  // Tiêu cự quang học chuẩn thể thao: 68° góc rộng điện ảnh, mở rộng động lên 88° khi đạt 500 km/h
  private readonly BASE_FOV: number = 68;

  constructor(fov: number = 68, aspect: number = 16 / 9) {
    this.camera = new THREE.PerspectiveCamera(fov, aspect, 0.1, 15000);
  }

  setCameraMode(mode: CameraMode) {
    this.currentMode = mode;
    this.dwellTimer = 0;
    this.hasStationPos = false;
    this.hasGrandstandPos = false;
    this.hasSpectatorPos = false;
    this.hasHelipadPos = false;
    this.isFirstFrame = true; // Bắt tức thì vào vị trí góc quay mới, triệt tiêu việc bị cách xa hàng trăm mét
  }

  resetFirstFrame() {
    this.isFirstFrame = true;
    this.hasStationPos = false;
    this.hasGrandstandPos = false;
    this.hasSpectatorPos = false;
    this.hasHelipadPos = false;
    this.hasStabilizedAnchor = false;
  }

  update(
    cars: Car3DObject[],
    delta: number,
    activeOvertakeCarId: string | null,
    collisionCarId: string | null,
    autoDirectorEnabled: boolean = true
  ): CameraMode {
    if (cars.length === 0) return this.currentMode;

    this.dwellTimer += delta;
    this.simulatedTime += delta;
    this.orbitAngle += delta * (this.currentMode === CameraMode.CINEMATIC_ORBIT ? 0.95 : 0.35);

    // Determine Leader (P1)
    const leaderCar = cars.find(c => c.state.rank === 1) || cars[0];

    // Priority event-driven director switches (Chuẩn đạo diễn truyền hình thể thao F1)
    // Lưu ý: Không rung lắc hay chuyển giật khi xe va chạm, giữ trọn vẹn chất truyền hình ổn định
    if (autoDirectorEnabled) {
      if (activeOvertakeCarId && this.dwellTimer > 4.5 && Math.random() < 0.4) {
        // Chuyển sang góc quay bám sát hoặc trạm cua khi có xe đang so kè vượt mặt
        this.currentMode = Math.random() > 0.5 ? CameraMode.CHOPPER_HELI_CHASE : CameraMode.TRACKSIDE_APEX;
        this.currentTargetCarId = activeOvertakeCarId;
        this.dwellTimer = 0;
        this.nextSwitchTime = 4.0 + Math.random() * 2.5;
        this.hasStationPos = false;
      } else if (this.dwellTimer >= this.nextSwitchTime) {
        // Chuyển góc quay truyền hình thực tế: giữ mỗi góc 4.5 đến 7.0 giây để người xem thưởng thức trọn vẹn
        this.cycleNextCinematicMode();
        this.dwellTimer = 0;
        this.nextSwitchTime = 4.5 + Math.random() * 2.5;
        this.hasStationPos = false;
        this.hasGrandstandPos = false;
      }
    }

    // Select target car based on mode
    let targetCar = cars.find(c => c.state.id === this.currentTargetCarId);
    if (!targetCar || this.currentMode === CameraMode.LEADER_TRACKING) {
      targetCar = leaderCar;
      this.currentTargetCarId = targetCar.state.id;
    }

    const idealPos = new THREE.Vector3();
    const lookTarget = new THREE.Vector3();

    const carPos = targetCar.group.position;
    const rawForward = new THREE.Vector3(0, 0, 1).applyQuaternion(targetCar.group.quaternion).normalize();
    const up = new THREE.Vector3(0, 1, 0);

    // =========================================================================
    // HỆ THỐNG CON QUAY HỒI CHUYỂN CHỐNG RUNG TRUYỀN HÌNH (GYRO GIMBAL STABILIZER)
    // Cách ly hoàn toàn máy quay khỏi các cú giật nảy do va chạm hoặc đánh lái gắt.
    // =========================================================================
    const isCloseMode = (
      this.currentMode === CameraMode.BEHIND ||
      this.currentMode === CameraMode.HOOD ||
      this.currentMode === CameraMode.LOW_GROUND ||
      this.currentMode === CameraMode.SIDE_PROFILE
    );

    if (!this.hasStabilizedAnchor || this.isFirstFrame) {
      this.stabilizedAnchorPos.copy(carPos);
      this.stabilizedAnchorForward.copy(rawForward);
      this.hasStabilizedAnchor = true;
    } else {
      if (isCloseMode) {
        // Khi quay gần hoặc xe BTC đuổi, vị trí gốc bám tức thời theo xe để triệt tiêu hoàn toàn hiện tượng lệch nhịp nảy giật xe
        this.stabilizedAnchorPos.copy(carPos);
        this.stabilizedAnchorForward.lerp(rawForward, Math.min(1.0, delta * 18.0)).normalize();
      } else {
        const anchorSmoothSpeed = Math.min(1.0, delta * 25.0);
        this.stabilizedAnchorPos.lerp(carPos, anchorSmoothSpeed);
        this.stabilizedAnchorForward.lerp(rawForward, Math.min(1.0, delta * 20.0)).normalize();
      }
    }

    const trackedPos = this.stabilizedAnchorPos;
    const forward = this.stabilizedAnchorForward;
    const right = new THREE.Vector3().crossVectors(forward, up).normalize();
    const currentSpeed = targetCar.state.speed || 0;

    // Tốc độ lerp máy quay (Smooth Damping factor)
    let camSmoothSpeed = 4.5;

    switch (this.currentMode) {
      // =========================================================================
      // 1. MÁY QUAY TELEPHOTO VEN ĐƯỜNG LIA THEO XE (TRACKSIDE TELEPHOTO 85mm)
      // Máy quay lia theo xe chuẩn cự ly Telephoto 85mm, siêu mượt, không giật giật, luôn căn giữa xe
      // =========================================================================
      case CameraMode.TRACKSIDE_TELEPHOTO: {
        camSmoothSpeed = 7.0; // Lia ống kính mượt mà theo xe, triệt tiêu 100% rung lắc
        idealPos.copy(trackedPos)
          .addScaledVector(right, 13.5)
          .addScaledVector(forward, -14.0)
          .addScaledVector(up, 2.6);
        lookTarget.copy(trackedPos).addScaledVector(forward, 2.0).addScaledVector(up, 0.85);
        break;
      }

      // =========================================================================
      // 2. KHÁN ĐÀI TRUNG TÂM / TOÀN CẢNH (GRANDSTAND PANORAMIC)
      // Đặt ở một góc riêng độc lập trên cao, quan sát toàn cảnh phân khu đường đua
      // TUYỆT ĐỐI không uốn éo hay xoay theo các góc cua trong game
      // =========================================================================
      case CameraMode.GRANDSTAND_PANORAMIC:
      case CameraMode.PANORAMIC: {
        camSmoothSpeed = 1.5; // Chân máy tĩnh lặng trên khán đài, ổn định tuyệt đối
        const distToGrandstand = trackedPos.distanceTo(this.grandstandStationPos);

        // Duy trì vị trí trạm quay cố định ở một góc riêng trên cao, không đổi hướng theo khúc cua
        if (!this.hasGrandstandPos || distToGrandstand > 160.0) {
          this.grandstandStationPos.set(
            trackedPos.x + 46.0,
            trackedPos.y + 25.0,
            trackedPos.z - 46.0
          );
          this.hasGrandstandPos = true;
        }

        idealPos.copy(this.grandstandStationPos);
        lookTarget.copy(trackedPos).addScaledVector(up, 0.85);
        break;
      }

      // =========================================================================
      // 3. DRONE TRUYỀN HÌNH BÁM CAO (SKY DRONE BROADCAST)
      // Flycam trên không trung giữ một góc quay riêng biệt trong không gian thế giới,
      // không uốn éo theo con đường và không xoay theo các góc cua của xe
      // =========================================================================
      case CameraMode.SKY_DRONE_BROADCAST: {
        camSmoothSpeed = 3.0; // Độ mượt gimbal drone cực cao, lướt êm ái
        idealPos.set(trackedPos.x + 22.0, trackedPos.y + 20.0, trackedPos.z - 22.0);
        lookTarget.copy(trackedPos).addScaledVector(up, 0.85);
        break;
      }

      // =========================================================================
      // 4. TRẠM QUAY ĐỈNH GÓC CUA APEX (TRACKSIDE APEX)
      // Đặt ngay mép vỉa cua (apex curb), đón xe ôm cua rõ nét
      // =========================================================================
      case CameraMode.TRACKSIDE_APEX: {
        camSmoothSpeed = 8.0;
        idealPos.copy(trackedPos)
          .addScaledVector(forward, 4.5)
          .addScaledVector(right, -5.2)
          .addScaledVector(up, 1.2);
        lookTarget.copy(trackedPos).addScaledVector(forward, -0.5).addScaledVector(up, 0.7);
        break;
      }

      // =========================================================================
      // 5. TRỰC THĂNG TRUYỀN HÌNH F1 (CHOPPER HELI CHASE)
      // Bay trên cao 35m với góc quay riêng biệt, hoàn toàn không uốn éo theo con đường
      // =========================================================================
      case CameraMode.CHOPPER_HELI_CHASE: {
        camSmoothSpeed = 2.2; // Trực thăng lướt đằm, ổn định cao
        idealPos.set(trackedPos.x - 32.0, trackedPos.y + 35.0, trackedPos.z + 28.0);
        lookTarget.copy(trackedPos).addScaledVector(up, 1.0);
        break;
      }

      // =========================================================================
      // 6. VÁCH KỸ THUẬT PIT WALL (PIT WALL BROADCAST)
      // Góc nhìn từ tường chỉ đạo pit stop nhìn đoàn xe xé gió đoạn thẳng
      // =========================================================================
      case CameraMode.PIT_WALL_BROADCAST: {
        camSmoothSpeed = 7.5;
        idealPos.copy(trackedPos)
          .addScaledVector(right, -16.0)
          .addScaledVector(forward, 16.0)
          .addScaledVector(up, 3.2);
        lookTarget.copy(trackedPos).addScaledVector(up, 1.0);
        break;
      }

      // =========================================================================
      // 7. TRẠM QUAY TĨNH SÁT RÀO CHẮN XÉ GIÓ (PASSING STATIONARY)
      // Máy quay gắn sát rào chắn xé gió (Armco Barrier Rush), rào chắn và vạch sơn vút qua cực mượt mà
      // =========================================================================
      case CameraMode.PASSING_STATIONARY: {
        camSmoothSpeed = 10.0;
        idealPos.copy(trackedPos)
          .addScaledVector(right, 6.2)
          .addScaledVector(forward, -1.8)
          .addScaledVector(up, 1.25);
        lookTarget.copy(trackedPos)
          .addScaledVector(forward, 2.5)
          .addScaledVector(up, 0.75);
        break;
      }

      // =========================================================================
      // 9. KHUNG HÌNH DỌC 9:16 TRUYỀN HÌNH (VERTICAL PORTRAIT OPTIMIZED)
      // Cân chỉnh tỉ lệ vàng cho màn hình điện thoại (Shorts / Reels)
      // =========================================================================
      case CameraMode.VERTICAL_PORTRAIT_OPTIMIZED: {
        camSmoothSpeed = 6.0;
        idealPos.copy(trackedPos).addScaledVector(forward, -8.5).addScaledVector(up, 3.4);
        lookTarget.copy(trackedPos).addScaledVector(forward, 8.0).addScaledVector(up, 1.0);
        break;
      }

      // =========================================================================
      // 10. GÓC QUAY NGƯỜI ĐỨNG VEN ĐƯỜNG (SPECTATOR TRACKSIDE)
      // Camera đứng hoàn toàn yên vị một chỗ, chỉ xoay hướng lia nhìn theo xe tốc độ cao đi qua
      // =========================================================================
      case CameraMode.SPECTATOR_TRACKSIDE: {
        camSmoothSpeed = 12.0; // Panning/tracking speed
        const distToSpectator = trackedPos.distanceTo(this.spectatorStationPos);
        if (!this.hasSpectatorPos || distToSpectator > 140.0) {
          this.spectatorStationPos.copy(trackedPos)
            .addScaledVector(right, 13.0)
            .addScaledVector(forward, 45.0);
          this.spectatorStationPos.y += 1.65; // Tầm mắt khán giả đứng ven đường
          this.hasSpectatorPos = true;
        }
        idealPos.copy(this.spectatorStationPos); // Tuyệt đối đứng yên!
        lookTarget.copy(trackedPos).addScaledVector(up, 0.85); // Lia theo thân xe
        break;
      }

      // =========================================================================
      // 11. TRỰC THĂNG TREO TĨNH THU PHÓNG TỪ XA (HELIPAD ZOOM)
      // Máy quay tĩnh trên tháp cao hoặc trực thăng đứng yên, dùng zoom cực viễn để bám xe
      // =========================================================================
      case CameraMode.HELIPAD_ZOOM: {
        camSmoothSpeed = 5.0;
        const distToHelipad = trackedPos.distanceTo(this.helipadStationPos);
        if (!this.hasHelipadPos || distToHelipad > 350.0) {
          this.helipadStationPos.copy(trackedPos)
            .addScaledVector(right, -35.0)
            .addScaledVector(forward, 120.0);
          this.helipadStationPos.y += 45.0; // Đặt trên cao 45m tĩnh
          this.hasHelipadPos = true;
        }
        idealPos.copy(this.helipadStationPos);
        lookTarget.copy(trackedPos).addScaledVector(up, 0.8);
        break;
      }

      // =========================================================================
      // 12. VỆ TINH QUỸ ĐẠO TỪ KHÔNG GIAN (SATELLITE ORBIT)
      // Góc nhìn vuông góc từ bầu khí quyển nhìn hất thẳng xuống xe đang xé gió
      // =========================================================================
      case CameraMode.SATELLITE_ORBIT: {
        camSmoothSpeed = 6.0;
        idealPos.copy(trackedPos).addScaledVector(forward, -2.0).addScaledVector(up, 130.0);
        lookTarget.copy(trackedPos);
        break;
      }

      // =========================================================================
      // 13. CAMERA TRẦN HẦM HẤT XUỐNG SIÊU TỐC (TUNNEL_CEILING_FAST)
      // Gắn dọc trần hầm nhìn từ trên xuống cực kỳ kịch tính khi xe vút qua bên dưới
      // =========================================================================
      case CameraMode.TUNNEL_CEILING_FAST: {
        camSmoothSpeed = 16.0;
        idealPos.copy(trackedPos).addScaledVector(forward, 15.0).addScaledVector(up, 6.2);
        lookTarget.copy(trackedPos).addScaledVector(forward, -2.0).addScaledVector(up, 0.5);
        break;
      }

      // =========================================================================
      // 14. CAMERA CHẮN BÙN NHÌN LỐP VÀ HÔNG XE (FENDER_WHEEL_LOOK)
      // Góc bám lốp xe trước bên hông, thấy rõ bánh xe quay tít mù khói và mặt đường trôi
      // =========================================================================
      case CameraMode.FENDER_WHEEL_LOOK: {
        camSmoothSpeed = 25.0; // Khóa cứng
        idealPos.copy(trackedPos)
          .addScaledVector(right, 1.85)
          .addScaledVector(forward, 1.25)
          .addScaledVector(up, 0.75);
        lookTarget.copy(trackedPos)
          .addScaledVector(right, 0.8)
          .addScaledVector(forward, -1.8)
          .addScaledVector(up, 0.45);
        break;
      }

      // =========================================================================
      // 15. ĐUÔI GIÓ NHÌN NGƯỢC VỀ TRƯỚC (WING_REAR_LOOK)
      // Gắn trên cánh gió sau nhìn vượt qua nóc xe về phía trước, cảm nhận tốc độ cực hạn
      // =========================================================================
      case CameraMode.WING_REAR_LOOK: {
        camSmoothSpeed = 25.0; // Khóa cứng
        idealPos.copy(trackedPos)
          .addScaledVector(forward, -1.75)
          .addScaledVector(up, 1.6);
        lookTarget.copy(trackedPos)
          .addScaledVector(forward, 15.0)
          .addScaledVector(up, 0.95);
        break;
      }

      // =========================================================================
      // 16. CAMERA ÂM VỈA GỜ GIẢM TỐC (KERB_CAM_GROUND)
      // Gầm xe sượt ngay bên trên camera với hiệu ứng tốc độ bốc lửa
      // =========================================================================
      case CameraMode.KERB_CAM_GROUND: {
        camSmoothSpeed = 20.0;
        idealPos.copy(trackedPos).addScaledVector(right, 3.2).addScaledVector(forward, 4.0);
        idealPos.y = Math.max(0.05, trackedPos.y - 0.45);
        lookTarget.copy(trackedPos).addScaledVector(up, 0.35);
        break;
      }

      // =========================================================================
      // 17. GÓC LÁI THỨ NHẤT TRONG CABIN (COCKPIT_FIRST_PERSON)
      // Trải nghiệm trực tiếp bên trong buồng lái xe đua tốc độ cực cao
      // =========================================================================
      case CameraMode.COCKPIT_FIRST_PERSON: {
        camSmoothSpeed = 25.0; // Khóa cứng
        idealPos.copy(trackedPos).addScaledVector(forward, 0.15).addScaledVector(up, 1.05);
        lookTarget.copy(trackedPos).addScaledVector(forward, 35.0).addScaledVector(up, 0.95);
        break;
      }

      // =========================================================================
      // 18. GÓC CẢN TRƯỚC SIÊU TỐC (BUMPER_FIRST_PERSON)
      // Camera gắn sát cản trước ngay trên mặt đường nhựa bốc lửa
      // =========================================================================
      case CameraMode.BUMPER_FIRST_PERSON: {
        camSmoothSpeed = 25.0; // Khóa cứng
        idealPos.copy(trackedPos).addScaledVector(forward, 1.85).addScaledVector(up, 0.45);
        lookTarget.copy(trackedPos).addScaledVector(forward, 40.0).addScaledVector(up, 0.45);
        break;
      }

      // =========================================================================
      // === 10 GÓC QUAY CINEMATIC KINH ĐIỂN (CLASSIC CAMERAS) ===
      // =========================================================================

      // 1. Phía Sau Xe: Bám sát sau đuôi xe góc nhìn thứ 3 thể thao cự ly chuẩn thoáng đãng
      case CameraMode.BEHIND: {
        camSmoothSpeed = 25.0; // Increased to 25.0 to lock tightly onto the car and prevent any rubberband jitter
        const dist = 8.8; // Cự ly chuẩn nhìn rõ xe và cảnh quan, không bị quá sát
        const height = 2.5;
        idealPos.copy(trackedPos).addScaledVector(forward, -dist).addScaledVector(up, height);
        lookTarget.copy(trackedPos).addScaledVector(forward, 7.5).addScaledVector(up, 0.9);
        break;
      }

      // 2. Mui Xe / Cockpit: Góc nhìn thấp từ nắp capo nhìn thẳng đường đua
      case CameraMode.HOOD: {
        camSmoothSpeed = 25.0; // Locked tightly to avoid visual sliding
        idealPos.copy(trackedPos).addScaledVector(forward, 1.1).addScaledVector(up, 0.92);
        lookTarget.copy(trackedPos).addScaledVector(forward, 38.0).addScaledVector(up, 0.85);
        break;
      }

      // 3. Sát Mặt Đường: Góc siêu thấp sát lốp và mặt đường, cảm nhận tốc độ cực hạn
      case CameraMode.LOW_GROUND: {
        camSmoothSpeed = 9.0;
        idealPos.copy(trackedPos).addScaledVector(forward, -3.2).addScaledVector(right, 1.6).addScaledVector(up, 0.45);
        lookTarget.copy(trackedPos).addScaledVector(forward, 24.0).addScaledVector(up, 0.5);
        break;
      }

      // 4. Bên Hông Xe: Quay ngang hông xe và các pha so kè bánh xe
      case CameraMode.SIDE_PROFILE: {
        camSmoothSpeed = 7.0;
        idealPos.copy(trackedPos).addScaledVector(right, -4.8).addScaledVector(forward, 0.2).addScaledVector(up, 1.4);
        lookTarget.copy(trackedPos).addScaledVector(forward, 5.0).addScaledVector(up, 0.85);
        break;
      }

      // 5. Flycam Drone: Camera trên không trung giữ góc riêng biệt, không uốn éo theo góc cua
      case CameraMode.FLYCAM: {
        camSmoothSpeed = 3.0;
        idealPos.set(trackedPos.x - 22.0, trackedPos.y + 19.0, trackedPos.z + 24.0);
        lookTarget.copy(trackedPos).addScaledVector(up, 0.85);
        break;
      }

      // 6. Toàn Cảnh Khán Đài: Xử lý đồng bộ tại case GRANDSTAND_PANORAMIC ở trên

      // 7. Bám Xe Dẫn Đầu: Tự động khóa mục tiêu bám theo xe hạng 1 (P1)
      case CameraMode.LEADER_TRACKING: {
        camSmoothSpeed = 6.0;
        idealPos.copy(trackedPos).addScaledVector(forward, -11.0).addScaledVector(up, 3.4);
        lookTarget.copy(trackedPos).addScaledVector(forward, 10.0).addScaledVector(up, 0.95);
        break;
      }

      // 8. Góc Vượt Mặt: Cận cảnh hành động khi xe lách qua đối thủ
      case CameraMode.OVERTAKE_ACTION: {
        camSmoothSpeed = 6.0;
        idealPos.copy(trackedPos)
          .addScaledVector(right, -4.5)
          .addScaledVector(forward, -6.5)
          .addScaledVector(up, 2.2);
        lookTarget.copy(trackedPos).addScaledVector(forward, 7.0).addScaledVector(up, 0.95);
        break;
      }

      // 9. Va Chạm & Drift: Góc truyền hình cận cảnh theo dõi pha so kè, tuyệt đối không rung lắc
      case CameraMode.COLLISION_DRIFT: {
        camSmoothSpeed = 6.0;
        const driftOffset = (targetCar.state.isDrifting ? -1 : 1) * 4.0;
        idealPos.copy(trackedPos).addScaledVector(right, driftOffset).addScaledVector(forward, -6.5).addScaledVector(up, 2.0);
        lookTarget.copy(trackedPos).addScaledVector(forward, 3.0).addScaledVector(up, 0.85);
        break;
      }

      // 10. Xoay 360 Vòng: Quỹ đạo xoay mượt mà liên tục quanh xe theo hệ trục cục bộ
      case CameraMode.CINEMATIC_ORBIT: {
        camSmoothSpeed = 12.0;
        const orbitRadius = 7.5;
        const orbitHeight = 2.2 + Math.sin(this.orbitAngle * 0.8) * 0.35;
        const orbitX = Math.sin(this.orbitAngle) * orbitRadius;
        const orbitZ = Math.cos(this.orbitAngle) * orbitRadius;
        idealPos.copy(trackedPos)
          .addScaledVector(right, orbitX)
          .addScaledVector(forward, orbitZ)
          .addScaledVector(up, orbitHeight);
        lookTarget.copy(trackedPos).addScaledVector(up, 0.75);
        break;
      }

      // Fallback: Mặc định chuyển về máy quay Telephoto ven đường
      default: {
        camSmoothSpeed = 7.0;
        idealPos.copy(trackedPos).addScaledVector(forward, -10.0).addScaledVector(up, 3.0);
        lookTarget.copy(trackedPos).addScaledVector(forward, 7.0).addScaledVector(up, 0.95);
        break;
      }
    }

    // Camera Smoothing Damping (Quán tính quang học mượt mà)
    if (this.isFirstFrame) {
      this.smoothedCamPos.copy(idealPos);
      this.smoothedLookTarget.copy(lookTarget);
      this.isFirstFrame = false;
    } else {
      const isCloseShot = (
        this.currentMode === CameraMode.BEHIND ||
        this.currentMode === CameraMode.HOOD ||
        this.currentMode === CameraMode.LOW_GROUND ||
        this.currentMode === CameraMode.SIDE_PROFILE ||
        this.currentMode === CameraMode.COCKPIT_FIRST_PERSON ||
        this.currentMode === CameraMode.BUMPER_FIRST_PERSON ||
        this.currentMode === CameraMode.FENDER_WHEEL_LOOK ||
        this.currentMode === CameraMode.WING_REAR_LOOK
      );
      if (isCloseShot) {
        // Khi quay gần, khóa cứng chính xác vị trí và mục tiêu góc nhìn vào xe để triệt tiêu hoàn toàn hiện tượng rung lắc, nảy giật hoặc trễ hình ở vận tốc cao
        this.smoothedCamPos.copy(idealPos);
        this.smoothedLookTarget.copy(lookTarget);
      } else {
        this.smoothedCamPos.lerp(idealPos, Math.min(1.0, delta * camSmoothSpeed));
        this.smoothedLookTarget.lerp(lookTarget, Math.min(1.0, delta * camSmoothSpeed));
      }
    }

    // =========================================================================
    // DYNAMIC FOV & SPEED SENSATION:
    // Tiêu cự chuẩn từng thể loại: 85mm cho Telephoto ven đường, mở rộng xé gió cho Chase
    // =========================================================================
    const speedRatio = Math.min(1.0, currentSpeed / 520);
    let modeBaseFov = this.BASE_FOV;
    let speedFovBoost = Math.pow(speedRatio, 1.25) * 16.0;

    if (this.currentMode === CameraMode.GRANDSTAND_PANORAMIC || this.currentMode === CameraMode.PANORAMIC) {
      // Chuẩn thu phóng quang học truyền hình thực tế (Broadcast Optical Zoom):
      const distToCam = this.smoothedCamPos.distanceTo(trackedPos);
      const zoomFactor = THREE.MathUtils.clamp((distToCam - 25.0) / 80.0, 0.0, 1.0);
      modeBaseFov = THREE.MathUtils.lerp(38.0, 24.0, zoomFactor);
      speedFovBoost = 0; 
    } else if (this.currentMode === CameraMode.SPECTATOR_TRACKSIDE) {
      // Khán giả ven đường: tự động zoom ống kính tùy khoảng cách xe để bắt trọn khung hình xe cực đẹp
      const distToCam = this.smoothedCamPos.distanceTo(trackedPos);
      const zoomFactor = THREE.MathUtils.clamp((distToCam - 15.0) / 100.0, 0.0, 1.0);
      modeBaseFov = THREE.MathUtils.lerp(52.0, 18.0, zoomFactor);
      speedFovBoost = 0;
    } else if (this.currentMode === CameraMode.HELIPAD_ZOOM) {
      // Thu phóng quang học viễn vọng từ xa (Extreme Telephoto Zoom)
      const distToCam = this.smoothedCamPos.distanceTo(trackedPos);
      const zoomFactor = THREE.MathUtils.clamp((distToCam - 40.0) / 250.0, 0.0, 1.0);
      modeBaseFov = THREE.MathUtils.lerp(24.0, 5.0, zoomFactor); // Zoom siêu khủng từ xa hệt trực thăng F1
      speedFovBoost = 0;
    } else if (this.currentMode === CameraMode.BEHIND) {
      modeBaseFov = 58.0; 
      speedFovBoost = Math.pow(speedRatio, 1.25) * 4.0;
    } else if (this.currentMode === CameraMode.COCKPIT_FIRST_PERSON) {
      modeBaseFov = 78.0; // Khoang lái điện ảnh góc rộng chân thực
      speedFovBoost = Math.pow(speedRatio, 1.25) * 15.0; // Hiệu ứng kéo dãn không gian cực đã
    } else if (this.currentMode === CameraMode.BUMPER_FIRST_PERSON) {
      modeBaseFov = 88.0; // Góc cản trước xé gió siêu tốc
      speedFovBoost = Math.pow(speedRatio, 1.25) * 22.0; // Kéo dãn cực hạn lên tới 110 FOV!
    } else if (this.currentMode === CameraMode.TRACKSIDE_TELEPHOTO) {
      modeBaseFov = 28.0; 
      speedFovBoost = Math.pow(speedRatio, 1.25) * 3.0;
    } else if (this.currentMode === CameraMode.TRACKSIDE_APEX) {
      modeBaseFov = 62.0; 
      speedFovBoost = Math.pow(speedRatio, 1.25) * 8.0;
    } else if (this.currentMode === CameraMode.CINEMATIC_ORBIT) {
      modeBaseFov = 65.0; 
      speedFovBoost = Math.pow(speedRatio, 1.25) * 6.0;
    } else if (this.currentMode === CameraMode.PASSING_STATIONARY) {
      modeBaseFov = 74.0; 
      speedFovBoost = Math.pow(speedRatio, 1.25) * 16.0;
    } else if (this.currentMode === CameraMode.TUNNEL_CEILING_FAST) {
      modeBaseFov = 75.0;
      speedFovBoost = Math.pow(speedRatio, 1.25) * 12.0;
    } else if (this.currentMode === CameraMode.FENDER_WHEEL_LOOK || this.currentMode === CameraMode.WING_REAR_LOOK) {
      modeBaseFov = 72.0;
      speedFovBoost = Math.pow(speedRatio, 1.25) * 10.0;
    }

    const targetFov = modeBaseFov + speedFovBoost;
    this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFov, Math.min(1.0, delta * 5.0));
    this.camera.updateProjectionMatrix();

    // Ổn định quang học chuẩn Gimbal F1 (Shotover / Cineflex):
    // Giữ camera hoàn toàn tĩnh mượt, triệt tiêu 100% rung giật vi chấn làm xao động xe
    this.camera.position.copy(this.smoothedCamPos);
    this.camera.lookAt(this.smoothedLookTarget);

    return this.currentMode;
  }

  /**
   * Chuyển đổi tự động giữa các góc quay truyền hình & cinematic kinh điển
   */
  private cycleNextCinematicMode() {
    const allModes = [
      // 15 Góc quay truyền hình thực tế
      CameraMode.TRACKSIDE_TELEPHOTO,
      CameraMode.GRANDSTAND_PANORAMIC,
      CameraMode.SKY_DRONE_BROADCAST,
      CameraMode.TRACKSIDE_APEX,
      CameraMode.CHOPPER_HELI_CHASE,
      CameraMode.PASSING_STATIONARY,
      CameraMode.PIT_WALL_BROADCAST,
      CameraMode.VERTICAL_PORTRAIT_OPTIMIZED,
      CameraMode.SPECTATOR_TRACKSIDE,
      CameraMode.HELIPAD_ZOOM,
      CameraMode.SATELLITE_ORBIT,
      CameraMode.TUNNEL_CEILING_FAST,
      CameraMode.FENDER_WHEEL_LOOK,
      CameraMode.WING_REAR_LOOK,
      CameraMode.KERB_CAM_GROUND,
      // 12 Góc quay Cinematic kinh điển
      CameraMode.BEHIND,
      CameraMode.HOOD,
      CameraMode.LOW_GROUND,
      CameraMode.SIDE_PROFILE,
      CameraMode.FLYCAM,
      CameraMode.PANORAMIC,
      CameraMode.LEADER_TRACKING,
      CameraMode.OVERTAKE_ACTION,
      CameraMode.COLLISION_DRIFT,
      CameraMode.CINEMATIC_ORBIT,
      CameraMode.COCKPIT_FIRST_PERSON,
      CameraMode.BUMPER_FIRST_PERSON,
    ];

    const available = allModes.filter(m => m !== this.currentMode);
    if (available.length > 0) {
      this.currentMode = available[Math.floor(Math.random() * available.length)];
    } else {
      this.currentMode = CameraMode.TRACKSIDE_TELEPHOTO;
    }
  }
}
