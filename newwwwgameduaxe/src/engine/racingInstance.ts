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
    const biome = { ...BIOMES[biomeIndex] };

    // Select Road Layout
    const layoutIndex = (this.id - 1 + Math.floor(seed / 10)) % ROAD_LAYOUT_PRESETS.length;
    biome.roadLayoutType = ROAD_LAYOUT_PRESETS[layoutIndex].id;

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
    const biome = BIOMES.find(b => b.id === biomeId);
    if (!biome || !this.seedData) return;
    this.seedData.biome = { ...biome, roadLayoutType: this.seedData.roadLayout };
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
