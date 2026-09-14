/**
 * Racing Video Factory & 3D High-End Simulator - Type Definitions
 */
export type ResolutionPreset = '1080x1920 (Full HD Dọc)' | '720x1280 (HD Dọc)' | '1440x2560 (2K Dọc)' | '2160x3840 (4K Dọc)' | '1080p (Ngang)' | '720p' | '4K';
export type AspectRatioOption = '9:16' | '16:9';
export type VideoFileFormat = 'mp4' | 'mov' | 'webm';
export type FPSOption = 30 | 60 | 120;
export type VideoDurationPreset = 30 | 60 | 120 | number;

export enum CameraMode {
  // === 9 GÓC QUAY TRUYỀN HÌNH THỰC TẾ (BROADCAST TV) ===
  TRACKSIDE_TELEPHOTO = 'TRACKSIDE_TELEPHOTO', // 1. Máy quay Telephoto ven đường lia theo xe (Ống kính 85mm F1)
  GRANDSTAND_PANORAMIC = 'GRANDSTAND_PANORAMIC', // 2. Khán đài trung tâm lia theo đoàn xe
  SKY_DRONE_BROADCAST = 'SKY_DRONE_BROADCAST', // 3. Drone truyền hình thể thao bám cao (Gimbal 3 trục)
  TRACKSIDE_APEX = 'TRACKSIDE_APEX', // 4. Trạm quay đỉnh góc cua Apex đón xe
  CHOPPER_HELI_CHASE = 'CHOPPER_HELI_CHASE', // 5. Trực thăng truyền hình F1
  PIT_WALL_BROADCAST = 'PIT_WALL_BROADCAST', // 6. Vách kỹ thuật Pit Wall lia theo xe
  PASSING_STATIONARY = 'PASSING_STATIONARY', // 7. Trạm quay tĩnh ven rào chắn xé gió
  BROADCAST_CHASE_SMOOTH = 'BROADCAST_CHASE_SMOOTH', // 8. Xe kỹ thuật ban tổ chức bám đuôi mượt mà
  VERTICAL_PORTRAIT_OPTIMIZED = 'VERTICAL_PORTRAIT_OPTIMIZED', // 9. Khung hình dọc 9:16 truyền hình

  // === 10 GÓC QUAY CINEMATIC KINH ĐIỂN (CLASSIC CAMERAS) ===
  BEHIND = 'BEHIND', // 1. Phía Sau Xe (Bám sau đuôi xe góc nhìn thứ 3 với khoảng cách động)
  HOOD = 'HOOD', // 2. Mui Xe / Cockpit (Góc nhìn thấp từ nắp capo nhìn thẳng đường đua)
  LOW_GROUND = 'LOW_GROUND', // 3. Sát Mặt Đường (Góc siêu thấp sát lốp và hệ thống giảm xóc)
  SIDE_PROFILE = 'SIDE_PROFILE', // 4. Bên Hông Xe (Quay ngang hông xe và các pha so kè bánh xe)
  FLYCAM = 'FLYCAM', // 5. Flycam Drone (Camera trên không trung bám đuổi theo cung đường)
  PANORAMIC = 'PANORAMIC', // 6. Toàn Cảnh Khán Đài (Camera góc rộng toàn cảnh từ khán đài)
  LEADER_TRACKING = 'LEADER_TRACKING', // 7. Bám Xe Dẫn Đầu (Tự động khóa mục tiêu bám theo xe hạng 1 P1)
  OVERTAKE_ACTION = 'OVERTAKE_ACTION', // 8. Góc Vượt Mặt (Cận cảnh hành động khi xe lách qua đối thủ)
  COLLISION_DRIFT = 'COLLISION_DRIFT', // 9. Va Chạm & Drift (Bắt khoảnh khắc trượt bánh, bốc khói và va chạm)
  CINEMATIC_ORBIT = 'CINEMATIC_ORBIT', // 10. Xoay 360 Vòng (Quỹ đạo xoay mượt mà liên tục quanh xe)
}

export type WeatherType =
  | 'Sunny'
  | 'Sunset'
  | 'HeavyRain'
  | 'NeonNight'
  | 'DenseFog'
  | 'Thunderstorm'
  | 'SnowBlizzard'
  | 'Sandstorm'
  | 'MidnightFullMoon'
  | 'AuroraBorealis'
  | 'VolcanicAsh'
  | 'BloodMoon'
  | 'ToxicHaze'
  | 'HeatwaveMirage'
  | 'SunriseDawn'
  | 'AutumnDrizzle'
  | 'TropicalMonsoon'
  | 'SolarEclipse'
  | 'StarlightGalaxy'
  | 'VaporwaveDusk'
  | 'CrystalRain'
  | 'OvercastGloom'
  | 'DustDevil'
  | 'PolarTwilight'
  | 'OceanBreeze'
  // Legacy support
  | 'Overcast'
  | 'Night'
  | 'Neon';

export type RoadLayoutType =
  | 'GRAND_PRIX_OVAL'
  | 'FIGURE_EIGHT_BRIDGE'
  | 'MOUNTAIN_HAIRPIN_PASS'
  | 'AIRPORT_RUNWAY_DRAG'
  | 'COASTAL_CLIFF_HIGHWAY'
  | 'CITY_GRID_INTERSECTION'
  | 'SUZUKA_TECHNICAL_S'
  | 'MONZA_TEMPLE_OF_SPEED'
  | 'DESERT_CANYON_DUNES'
  | 'NURBURGRING_ROLLER_COASTER'
  | 'TOKYO_EXPRESSWAY_RING'
  | 'FOREST_RIVER_MEANDER'
  | 'HARBOR_DOCK_CIRCUIT'
  | 'ALPINE_SUMMIT_SPIRAL'
  | 'FUTURISTIC_HYPERLOOP'
  | 'VOLCANO_CALDERA_RIM'
  | 'AIRPORT_HANGAR_CHICANE'
  | 'ISLAND_BRIDGE_CROSSING'
  | 'NEON_TUNNEL_METRO'
  | 'STADIUM_SUPERCROSS'
  | string;

export interface TrackBiome {
  id: string;
  name: string;
  skyColor: number;
  groundColor: number;
  trackColor: number;
  kerbColor1: number;
  kerbColor2: number;
  fogColor: number;
  fogDensity: number;
  lightIntensity: number;
  ambientColor: number;
  theme: string;
  roadLayoutType?: RoadLayoutType;
  // 100 Kiểu vạch đường và chi tiết độc nhất
  centerLineColor?: number;
  centerLineWidth?: number;
  centerLineLength?: number;
  centerLinePattern?: 'single' | 'double' | 'strobe' | 'pulse';
  lampColor?: number;
  bollardReflectorColor?: number;
  archColor?: number;
  curbFrequency?: number;
}

export interface AICarState {
  id: string;
  name: string;
  driverName?: string; // Tên nhân vật / tài xế lái xe
  color: string;
  hexColor: number;
  type: 'hypercar' | 'muscle' | 'formula' | 'gt_racer' | 'cyber_coupe';
  speed: number;
  targetSpeed: number;
  maxSpeed: number;
  acceleration: number;
  lap: number;
  lapProgress: number; // 0 to 1 along track
  lateralOffset: number; // offset from track center line (-1.0 to 1.0)
  targetLateralOffset: number;
  steerAngle: number;
  rank: number;
  aggression: number;
  isDrifting: boolean;
  driftAngle: number;
  collisionCooldown: number;
  meshIndex: number;
  inTunnel?: boolean;
}

export interface InstanceSeedData {
  seed: number;
  instanceId: number;
  biome: TrackBiome;
  weather: WeatherType;
  roadLayout: RoadLayoutType;
  carCount: number;
  cars: AICarState[];
  aiAggressionBase: number;
  createdAt: string;
}

export interface InstanceRuntime {
  id: number;
  name: string;
  active: boolean;
  seedData: InstanceSeedData;
  currentCameraMode: CameraMode;
  cameraDwellTimer: number;
  cameraNextSwitchDuration: number;
  targetCarId: string;
  cars: AICarState[];
  lapLeaderId: string;
  isRecording: boolean;
  currentVideoChunkIndex: number;
  chunkTimeElapsed: number; // seconds into current 2-minute cycle
  totalChunkDuration: number; // 120 seconds default
  fps: number;
  status: 'idle' | 'rendering' | 'exporting' | 'recovering';
  errorMessage?: string;
  inTunnel?: boolean;
  lastViewport?: { x: number; y: number; w: number; h: number };
}

export interface VideoRecordJob {
  id: string;
  instanceId: number;
  videoNumber: number;
  fileName: string;
  url: string;
  blob?: Blob;
  sizeMB: number;
  durationSeconds: number;
  timestamp: string;
  seed: number;
  biomeName: string;
  winnerCar: string;
  topSpeedKmh: number;
  resolution: ResolutionPreset;
  fps: number;
  status?: 'processing' | 'ready' | 'failed';
  progressPercent?: number;
}

export interface SystemConfig {
  instanceCount: 1 | 2 | 4 | 6 | 8 | 10;
  resolution: ResolutionPreset;
  aspectRatio: AspectRatioOption;
  fileFormat: VideoFileFormat;
  fps: FPSOption;
  carsPerRace?: 6 | 8 | 10 | 12 | 15; // Số lượng xe đua cùng nhau (mặc định: 10, tối đa 15)
  durationSeconds: number; // 120 for 2 mins
  saveDirectory: string;
  autoExportToDisk: boolean;
  codec: 'video/webm;codecs=vp9' | 'video/mp4;codecs=avc1' | 'video/webm';
  aiAggressionGlobal: number; // 0.2 - 1.0
  cinematicAutoDirector: boolean;
}

export interface SystemHardwareStats {
  engineFPS: number;
  cpuUsagePct: number;
  gpuUsagePct: number;
  ramUsageMB: number;
  ramTotalMB: number;
  diskFreeGB: number;
  totalVideosCreated: number;
  systemUptimeSeconds: number;
}

export interface LogMessage {
  id: string;
  timestamp: string;
  instanceId?: number;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
}
