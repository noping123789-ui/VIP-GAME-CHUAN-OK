import * as THREE from 'three';
import { CameraDirector } from './cameraDirector';
import { TrackGenerator, GeneratedTrack } from './trackGenerator';
import { VehiclePhysicsSystem, Car3DObject } from './vehiclePhysics';
import { BIOMES, ROAD_LAYOUT_PRESETS } from './scenarioGenerator';
import {
  CameraMode,
  AICarState,
  InstanceSeedData,
  InstanceRuntime,
  RoadLayoutType,
  TrackBiome,
  WeatherType
} from '../types';

const CAR_NAMES = [
  'Apex Predator', 'Phantom GT', 'Viper X', 'Nebula Turbo', 'Cyber Falcon',
  'Solar Flare', 'Thunderbolt', 'Spectre RS', 'Titan R', 'Crimson Hawk',
  'Vortex 9', 'Velocity Zero', 'Zenith F1', 'Onyx Hyper', 'Quantum Drifter'
];

const MASTER_DECORATOR_ITEMS = [
  // 1. Roadside safety/signage
  'Cột đèn đường cao', 'Đèn chiếu sáng sân đua', 'Đèn LED dọc đường', 'Biển báo giới hạn tốc độ', 
  'Biển báo hướng cua', 'Biển báo nguy hiểm', 'Biển báo đường trơn', 'Biển báo giảm tốc', 
  'Biển báo khu vực xuất phát', 'Biển báo khu vực về đích', 'Cột mốc khoảng cách', 'Cọc tiêu giao thông', 
  'Rào chắn nhựa', 'Hàng rào thép', 'Hàng rào lưới B40', 'Tường chắn bê tông', 'Barrier bảo vệ đường đua', 
  'Gờ giảm tốc', 'Gương cầu giao thông', 'Cột phản quang',
  // 2. Start/Finish & Race banners
  'Cổng xuất phát', 'Cổng về đích', 'Bảng điện tử thời gian', 'Đồng hồ đếm ngược', 'Đèn tín hiệu xuất phát', 
  'Bảng số vòng đua', 'Bảng tên đường đua', 'Bảng quảng cáo nhà tài trợ', 'Banner treo trên hàng rào', 
  'Cờ caro', 'Cờ đua nhiều màu', 'Cờ quốc gia', 'Cờ cảnh báo vàng', 'Cờ đỏ', 'Cột cờ', 'Phao đánh dấu góc cua', 
  'Biển số Turn 1', 'Biển số Turn 2', 'Biển số Turn 3', 'Bảng khoảng cách đến cua',
  // 3. Pit-lane & Team gear
  'Nhà pit', 'Gara đội đua', 'Trạm sửa xe', 'Bàn dụng cụ', 'Thùng dụng cụ', 'Kệ lốp xe', 'Lốp xe xếp chồng', 
  'Bình chữa cháy', 'Xe cứu hộ', 'Xe kéo', 'Xe an ninh', 'Xe y tế', 'Xe kiểm tra đường đua', 
  'Xe chở nhiên liệu', 'Máy nén khí', 'Giá nâng xe', 'Cầu nâng ô tô', 'Cột đèn pit', 'Bảng pit crew', 'Ghế chờ đội đua',
  // 4. Grandstands & Spectator facilities
  'Khán đài lớn', 'Khán đài nhỏ', 'Ghế khán giả', 'Lều VIP', 'Khu vực VIP', 'Hàng rào ngăn khán giả', 
  'Cổng kiểm soát', 'Cabin bảo vệ', 'Bảng chỉ dẫn khán đài', 'Màn hình LED khổng lồ',
  // 5. Nature & Landscape
  'Cây xanh', 'Cây thông', 'Cây dừa', 'Cây bụi', 'Bồn hoa', 'Thảm cỏ', 'Đồi đất', 'Núi phía xa', 
  'Hồ nước', 'Suối nhỏ', 'Hàng cây ven đường', 'Bụi cây thấp', 'Đá lớn', 'Đá trang trí', 'Tường cây xanh',
  // 6. Urban & Utilities
  'Nhà dân', 'Nhà kho', 'Trạm xăng', 'Cửa hàng tiện lợi', 'Quán cà phê', 'Nhà hàng', 'Bãi đỗ xe', 'Cột điện', 
  'Dây điện', 'Trạm xe buýt', 'Xe đậu bên đường', 'Xe tải vận chuyển', 'Container', 'Máy bán hàng tự động', 
  'Billboard quảng cáo khổng lồ'
];

export function getDecoratorsForSeed(seed: number): string[] {
  let sVal = Math.abs(seed) || 42;
  const pRand = () => {
    sVal = (sVal * 16807) % 2147483647;
    return (sVal - 1) / 2147483646;
  };
  const arr = [...MASTER_DECORATOR_ITEMS];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(pRand() * (i + 1));
    const temp = arr[i];
    arr[i] = arr[j];
    arr[j] = temp;
  }
  return arr.slice(0, 15);
}

/**
 * Hàm biến đổi cấu hình môi trường dựa trên seed để tạo ra 100 bản đồ độc nhất vô nhị
 * về màu nền (sky/ground), màu vạch đường, độ dày mỏng của vạch và màu đèn chiếu sáng.
 */
function customizeBiomeBySeed(baseBiome: TrackBiome, seed: number): TrackBiome {
  const biome = { ...baseBiome };
  let sValue = Math.abs(seed) || 42;
  const pseudoRand = () => {
    sValue = (sValue * 16807) % 2147483647;
    return (sValue - 1) / 2147483646;
  };

  const seedHue = pseudoRand() * 360;
  // Đảm bảo groundHue lệch hẳn ra so với bầu trời
  const groundHue = (seedHue + 120 + pseudoRand() * 60) % 360;
  // Màu đường tương phản hoàn toàn với màu đất nền, sử dụng màu sắc neon rực rỡ khác biệt hoàn toàn (không nhất thiết là đen)
  const trackHueShift = 100 + pseudoRand() * 140; // Lệch tối thiểu 100 độ so với đất nền
  const trackHue = (groundHue + trackHueShift) % 360;

  const hsvToHex = (h: number, s: number, v: number) => {
    const c = new THREE.Color().setHSL(h / 360, s, v);
    return c.getHex();
  };

  // Tạo các biến màu sắc độc bản rực rỡ và hài hòa dựa trên seed
  biome.skyColor = hsvToHex(seedHue, 0.45 + pseudoRand() * 0.15, 0.12 + pseudoRand() * 0.28);
  biome.groundColor = hsvToHex(groundHue, 0.35 + pseudoRand() * 0.15, 0.08 + pseudoRand() * 0.15);
  // Đường đua nổi bật rực rỡ: Độ bão hòa cao (s), Độ sáng cao (v)
  biome.trackColor = hsvToHex(trackHue, 0.65 + pseudoRand() * 0.25, 0.32 + pseudoRand() * 0.28);
  biome.kerbColor1 = hsvToHex(pseudoRand() * 360, 0.85, 0.8);
  biome.kerbColor2 = hsvToHex(pseudoRand() * 360, 0.85, 0.45);
  biome.fogColor = hsvToHex(seedHue, 0.4, 0.12 + pseudoRand() * 0.22);
  biome.ambientColor = hsvToHex(seedHue, 0.35, 0.12);
  biome.lampColor = hsvToHex(pseudoRand() * 360, 0.95, 0.75);
  biome.bollardReflectorColor = hsvToHex(pseudoRand() * 360, 0.95, 0.8);

  const lineRand = pseudoRand();
  biome.centerLinePattern = lineRand < 0.35 ? 'double' : (lineRand < 0.7 ? 'pulse' : 'single');
  biome.centerLineColor = hsvToHex(pseudoRand() * 360, 0.9, 0.85);
  biome.centerLineWidth = 0.32 + pseudoRand() * 0.22;
  biome.centerLineLength = 4.2 + pseudoRand() * 5.5;

  biome.name = `${baseBiome.name} (Chặng #${(seed % 100) + 1})`;
  biome.highlightDecorations = getDecoratorsForSeed(seed);
  return biome;
}

const DRIVER_NAMES = [
  'Lionel Messi', 'Cristiano Ronaldo', 'Neymar Jr.', 'David Beckham', 'Kylian Mbappé',
  'Ronaldinho', 'Ronaldo Nazário', 'Zinedine Zidane', 'Pelé', 'Zlatan Ibrahimović',
  'Diego Maradona', 'Thierry Henry', 'Kaká', 'Karim Benzema', 'Robert Lewandowski',
  'Xavi', 'Andrés Iniesta', 'Andrea Pirlo', 'Gianluigi Buffon', 'Paolo Maldini',
  'Cafu', 'Roberto Carlos', 'Rivaldo', 'Arjen Robben', 'Robin van Persie',
  'Miroslav Klose', 'Bastian Schweinsteiger', 'Iker Casillas', 'Fernando Torres', 'Francesco Totti',
  'Sergio Ramos', 'Thiago Silva', 'Thomas Müller', 'Manuel Neuer', 'Eden Hazard',
  'Marcelo', 'Gerard Piqué', 'N\'Golo Kanté', 'Vinícius Júnior', 'Erling Haaland',
  'Harry Kane', 'Mohamed Salah', 'Kevin De Bruyne', 'Jude Bellingham', 'Lamine Yamal',
  'Sergio Busquets', 'Pepe', 'Luis Suárez', 'Edinson Cavani', 'Ángel Di María',
  'Sergio Agüero', 'James Rodríguez', 'Wayne Rooney', 'Steven Gerrard', 'Frank Lampard',
  'Paul Scholes', 'Didier Drogba', 'Samuel Eto\'o', 'Antoine Griezmann', 'Luis Figo'
];

const CAR_COLORS = [
  { name: 'Crimson Red', hex: 0xdc2626 },
  { name: 'Cobalt Blue', hex: 0x2563eb },
  { name: 'Emerald Green', hex: 0x16a34a },
  { name: 'Solar Yellow', hex: 0xeab308 },
  { name: 'Neon Purple', hex: 0x9333ea },
  { name: 'Cyber Cyan', hex: 0x06b6d4 },
  { name: 'Blaze Orange', hex: 0xea580c },
  { name: 'Magma Pink', hex: 0xec4899 },
  { name: 'Pure White', hex: 0xf8fafc },
  { name: 'Stealth Black', hex: 0x1e293b },
  { name: 'Gold Rush', hex: 0xd97706 },
  { name: 'Lime Venom', hex: 0x84cc16 },
  { name: 'Sky Silver', hex: 0x94a3b8 },
  { name: 'Electric Violet', hex: 0x7c3aed },
  { name: 'Rose Gold', hex: 0xf43f5e }
];

export class RacingInstance {
  public id: number;
  public scene: THREE.Scene;
  public cameraDirector: CameraDirector;
  public track!: GeneratedTrack;
  public cars: Car3DObject[] = [];
  public seedData!: InstanceSeedData;

  public videoChunkIndex: number = 1;
  public chunkTimeElapsed: number = 0;
  public totalChunkDuration: number = 120; // 120s by default
  public desiredCarCount: number = 10;
  public status: 'idle' | 'rendering' | 'exporting' | 'recovering' = 'rendering';
  public isOfflineExport: boolean = false;
  public lastViewport?: { x: number; y: number; w: number; h: number };

  private trackMeshGroup: THREE.Group = new THREE.Group();
  private carsGroup: THREE.Group = new THREE.Group();
  private dirLight!: THREE.DirectionalLight;
  private hemiLight!: THREE.HemisphereLight;

  constructor(
    id: number,
    durationSeconds: number = 120,
    seed?: number,
    carCount: number = 10
  ) {
    this.id = id;
    this.totalChunkDuration = durationSeconds;
    this.desiredCarCount = Math.max(2, Math.min(15, carCount));

    this.scene = new THREE.Scene();
    this.cameraDirector = new CameraDirector(68, 9 / 16);

    this.scene.add(this.trackMeshGroup);
    this.scene.add(this.carsGroup);

    this.setupLighting();
    this.initRace(seed);
  }

  get currentCameraMode(): CameraMode {
    return this.cameraDirector.currentMode;
  }

  private setupLighting() {
    this.hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.8);
    this.hemiLight.position.set(0, 200, 0);
    this.scene.add(this.hemiLight);

    this.dirLight = new THREE.DirectionalLight(0xffffff, 1.4);
    this.dirLight.position.set(100, 300, 150);
    this.scene.add(this.dirLight);
  }

  private initRace(customSeed?: number) {
    const seed = customSeed !== undefined ? customSeed : Math.floor(Math.random() * 900000 + 100000);
    const biomeIndex = (this.id - 1 + seed) % BIOMES.length;

    // Select Road Layout
    const layoutIndex = (this.id - 1 + Math.floor(seed / 10)) % ROAD_LAYOUT_PRESETS.length;
    const rawBiome = { ...BIOMES[biomeIndex], roadLayoutType: ROAD_LAYOUT_PRESETS[layoutIndex].id };
    const biome = customizeBiomeBySeed(rawBiome, seed);

    // Apply Biome Atmosphere
    this.scene.background = new THREE.Color(biome.skyColor);
    this.scene.fog = new THREE.FogExp2(biome.fogColor, biome.fogDensity);
    this.dirLight.intensity = biome.lightIntensity;
    this.hemiLight.color.setHex(biome.ambientColor);

    // Build Track
    this.rebuildTrack(seed, biome);

    // Build Cars
    this.rebuildCars(seed, biome);

    this.seedData = {
      seed,
      instanceId: this.id,
      biome,
      weather: 'Sunny',
      roadLayout: biome.roadLayoutType,
      carCount: this.cars.length,
      cars: this.cars.map(c => c.state),
      aiAggressionBase: 0.85,
      createdAt: new Date().toISOString()
    };

    this.chunkTimeElapsed = 0;
    this.cameraDirector.resetFirstFrame();
  }

  private rebuildTrack(seed: number, biome: TrackBiome) {
    while (this.trackMeshGroup.children.length > 0) {
      this.trackMeshGroup.remove(this.trackMeshGroup.children[0]);
    }

    this.track = TrackGenerator.generateTrack(seed, biome);
    this.trackMeshGroup.add(this.track.trackMesh);
    this.track.curbMeshes.forEach(mesh => this.trackMeshGroup.add(mesh));
    this.trackMeshGroup.add(this.track.sceneryGroup);
  }

  private rebuildCars(seed: number, _biome: TrackBiome) {
    while (this.carsGroup.children.length > 0) {
      this.carsGroup.remove(this.carsGroup.children[0]);
    }
    this.cars = [];

    const numCars = this.desiredCarCount;
    // Bố trí cự ly xuất phát theo tiêu chuẩn hàng đôi Grand Prix (2 xe mỗi hàng)
    // Khoảng cách mỗi hàng: 8.0m (thay vì 875m như trước làm các xe bị khuất mù trong sương)
    // Đảm bảo toàn bộ 10 xe hoặc 15 xe đều xuất hiện cùng nhau trên cùng khung hình
    const trackLen = (this.track && this.track.totalLength > 100) ? this.track.totalLength : 35000;
    const rowDistanceMeters = 8.0;
    const progressPerRow = rowDistanceMeters / trackLen;
    const startProgress = 0.08;

    for (let i = 0; i < numCars; i++) {
      const colorInfo = CAR_COLORS[i % CAR_COLORS.length];
      const carName = CAR_NAMES[i % CAR_NAMES.length];
      const driver = DRIVER_NAMES[((this.id - 1) * 10 + i) % DRIVER_NAMES.length];
      const meshIdx = i % 5;

      const rowIndex = Math.floor(i / 2);
      const isLeft = i % 2 === 0;
      // Xe bên phải lùi so le 4m so với xe bên trái
      const staggerOffset = rowIndex * progressPerRow + (isLeft ? 0 : (4.0 / trackLen));
      let initialProgress = startProgress - staggerOffset;
      if (initialProgress < 0) initialProgress += 1.0;

      const laneOffset = isLeft ? -0.32 : 0.32;

      const state: AICarState = {
        id: `car_${this.id}_${i + 1}`,
        name: `${carName} #${i + 1}`,
        driverName: driver,
        color: colorInfo.name,
        hexColor: colorInfo.hex,
        type: i % 2 === 0 ? 'hypercar' : 'formula',
        speed: 460 + Math.random() * 40,
        targetSpeed: 480 + Math.random() * 40,
        maxSpeed: 510 + (i === 0 ? 15 : Math.random() * 10),
        acceleration: 1.2 + Math.random() * 0.4,
        lap: 0,
        lapProgress: initialProgress,
        lateralOffset: laneOffset + (Math.random() * 0.04 - 0.02),
        targetLateralOffset: laneOffset,
        steerAngle: 0,
        rank: i + 1,
        aggression: 0.65 + Math.random() * 0.35,
        isDrifting: false,
        driftAngle: 0,
        collisionCooldown: 0,
        meshIndex: meshIdx,
        inTunnel: false
      };

      const carObj = VehiclePhysicsSystem.createCarMesh(state);
      this.cars.push(carObj);
      this.carsGroup.add(carObj.group);
    }
  }

  setCameraMode(mode: CameraMode) {
    this.cameraDirector.setCameraMode(mode);
  }

  setRoadLayout(layout: RoadLayoutType) {
    if (!this.seedData) return;
    this.seedData.roadLayout = layout;
    this.seedData.biome.roadLayoutType = layout;
    this.rebuildTrack(this.seedData.seed, this.seedData.biome);
    this.cameraDirector.resetFirstFrame();
  }

  setBiome(biomeId: string) {
    const baseBiome = BIOMES.find(b => b.id === biomeId);
    if (!baseBiome || !this.seedData) return;
    const rawBiome = { ...baseBiome, roadLayoutType: this.seedData.roadLayout };
    const biome = customizeBiomeBySeed(rawBiome, this.seedData.seed);
    this.seedData.biome = biome;
    this.scene.background = new THREE.Color(biome.skyColor);
    this.scene.fog = new THREE.FogExp2(biome.fogColor, biome.fogDensity);
    this.dirLight.intensity = biome.lightIntensity;
    this.hemiLight.color.setHex(biome.ambientColor);
    this.rebuildTrack(this.seedData.seed, this.seedData.biome);
  }

  recycleToNextRace(durationSeconds?: number, carsPerRace?: number) {
    if (durationSeconds !== undefined) {
      this.totalChunkDuration = durationSeconds;
    }
    if (carsPerRace !== undefined) {
      this.desiredCarCount = Math.max(2, Math.min(15, carsPerRace));
    }
    this.videoChunkIndex++;
    this.initRace();
  }

  update(
    delta: number,
    aiAggressionGlobal: number = 0.85,
    cinematicAutoDirector: boolean = true
  ): { chunkCompleted: boolean } {
    this.chunkTimeElapsed += delta;
    const chunkCompleted = this.chunkTimeElapsed >= this.totalChunkDuration;

    if (this.track && this.cars.length > 0) {
      // 1. Run vehicle physics & steering AI
      const { activeOvertakeCarId, collisionCarId } = VehiclePhysicsSystem.updateVehicles(
        this.cars,
        this.track.curve,
        this.track.totalLength,
        delta,
        aiAggressionGlobal
      );

      // 2. Sort ranks by total distance
      const sorted = [...this.cars].sort((a, b) => {
        const distA = a.state.lap + a.state.lapProgress;
        const distB = b.state.lap + b.state.lapProgress;
        return distB - distA;
      });
      sorted.forEach((car, index) => {
        car.state.rank = index + 1;
      });

      // 3. Update Camera Director
      this.cameraDirector.update(
        this.cars,
        delta,
        activeOvertakeCarId,
        collisionCarId,
        cinematicAutoDirector
      );
    }

    return { chunkCompleted };
  }

  getRuntimeState(): InstanceRuntime {
    const leaderCar = this.cars.find(c => c.state.rank === 1) || this.cars[0];
    return {
      id: this.id,
      name: `Luồng #${this.id.toString().padStart(2, '0')}`,
      active: true,
      seedData: this.seedData,
      currentCameraMode: this.cameraDirector.currentMode,
      cameraDwellTimer: 0,
      cameraNextSwitchDuration: 5.0,
      targetCarId: leaderCar ? leaderCar.state.id : '',
      cars: this.cars.map(c => c.state),
      lapLeaderId: leaderCar ? leaderCar.state.id : '',
      isRecording: false,
      currentVideoChunkIndex: this.videoChunkIndex,
      chunkTimeElapsed: this.chunkTimeElapsed,
      totalChunkDuration: this.totalChunkDuration,
      fps: 60,
      status: this.status,
      lastViewport: this.lastViewport
    };
  }
}
