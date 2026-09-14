import { RoadLayoutType, TrackBiome } from '../types';

export interface RoadLayoutPreset {
  id: RoadLayoutType;
  name: string;
  description: string;
}

export const ROAD_LAYOUT_PRESETS: RoadLayoutPreset[] = [
  {
    id: 'GRAND_PRIX_OVAL',
    name: '1. Grand Prix Oval Siêu Tốc',
    description: 'Vòng đua hình bầu dục tốc độ cao với các góc nghiêng ngân hàng cho vận tốc tối đa trên 500 km/h.'
  },
  {
    id: 'MONZA_TEMPLE_OF_SPEED',
    name: '2. Monza Temple of Speed',
    description: 'Đường đua huyền thoại với các đoạn thẳng dài bất tận kết hợp cua Parabolica nghẹt thở.'
  },
  {
    id: 'FIGURE_EIGHT_BRIDGE',
    name: '3. Cầu Vượt Số 8 Figure-8',
    description: 'Thiết kế số 8 giao thoa qua cầu vượt 3D trên cao, tạo cảm giác không gian đa chiều ngoạn mục.'
  },
  {
    id: 'MOUNTAIN_HAIRPIN_PASS',
    name: '4. Đèo Núi Khúc Cua Chữ U (Touge)',
    description: 'Đường đèo dốc hiểm trở với các khúc cua tay áo chữ U liên tiếp cho các pha drift đỉnh cao.'
  },
  {
    id: 'AIRPORT_RUNWAY_DRAG',
    name: '5. Sân Bay Quân Sự Runway Drag',
    description: 'Đường băng quân sự siêu rộng với 12 làn đua phẳng phiu cho các cỗ máy Hypercar so kè nước rút.'
  },
  {
    id: 'COASTAL_CLIFF_HIGHWAY',
    name: '6. Cao Tốc Vách Đá Ven Biển',
    description: 'Cung đường lượn sát vách đá nhìn ra biển cả bao la với gió lộng và sóng vỗ dạt dào.'
  },
  {
    id: 'TOKYO_EXPRESSWAY_RING',
    name: '7. Đường Vành Đai Tokyo Shuto',
    description: 'Cao tốc đô thị đêm ngập tràn ánh đèn neon, biển quảng cáo rực rỡ và khúc cua hẹp.'
  },
  {
    id: 'SUZUKA_TECHNICAL_S',
    name: '8. Suzuka Kỹ Thuật Chữ S Liên Hoàn',
    description: 'Chuỗi góc cua chữ S liên tục thử thách khả năng bám đường và phản xạ của tay đua.'
  },
  {
    id: 'DESERT_CANYON_DUNES',
    name: '9. Hẻm Núi Sa Mạc Cát Đỏ',
    description: 'Lượn qua các cồn cát sa mạc hoang dã với ánh hoàng hôn rực lửa và gió cát cuộn trào.'
  },
  {
    id: 'NURBURGRING_ROLLER_COASTER',
    name: '10. Nurburgring Tàu Lượn Siêu Tốc',
    description: 'Địa ngục xanh với độ dốc biến đổi liên tục, nhấp nhô như đường ray tàu lượn.'
  },
  {
    id: 'CITY_GRID_INTERSECTION',
    name: '11. Ngã Tư Đô Thị Phồn Hoa',
    description: 'Đường đua phố phường xuyên qua những tòa nhà chọc trời và các góc vuông 90 độ.'
  },
  {
    id: 'FOREST_RIVER_MEANDER',
    name: '12. Khúc Quanh Sông Rừng Xanh',
    description: 'Uốn lượn mềm mại theo dòng sông chảy giữa rừng nguyên sinh xanh mát.'
  },
  {
    id: 'HARBOR_DOCK_CIRCUIT',
    name: '13. Cảng Biển Vận Tải Quốc Tế',
    description: 'Đường đua container giữa các cần cẩu khổng lồ và mặt nước biển lung linh.'
  },
  {
    id: 'ALPINE_SUMMIT_SPIRAL',
    name: '14. Xoắn Ốc Đỉnh Núi Tuyết Alpine',
    description: 'Băng qua đỉnh núi phủ tuyết trắng với mặt đường đóng băng trơn trượt kịch tính.'
  },
  {
    id: 'FUTURISTIC_HYPERLOOP',
    name: '15. Hyperloop Tương Lai 2099',
    description: 'Ống dẫn lượng tử siêu dẫn từ trường với hiệu ứng ánh sáng neon cyber hiện đại.'
  },
  {
    id: 'VOLCANO_CALDERA_RIM',
    name: '16. Miệng Núi Lửa Magma Rực Lửa',
    description: 'Chạy men theo bờ miệng núi lửa đang sôi sục với nham thạch đỏ rực và khói bụi.'
  },
  {
    id: 'AIRPORT_HANGAR_CHICANE',
    name: '17. Vòng Xoay Nhà Ga Máy Bay',
    description: 'Lượn qua các nhà vòm hangar máy bay với góc cua chicane hẹp đầy thử thách.'
  },
  {
    id: 'ISLAND_BRIDGE_CROSSING',
    name: '18. Cầu Vượt Biển Nối Đảo Ngọc',
    description: 'Cây cầu dây văng dài hàng chục km nối liền các hòn đảo giữa đại dương trong xanh.'
  },
  {
    id: 'NEON_TUNNEL_METRO',
    name: '19. Đường Hầm Tàu Điện Ngầm Neon',
    description: 'Đường ngầm sâu dưới lòng đất với dàn đèn LED đồng bộ chạy dọc theo vách vòm.'
  },
  {
    id: 'STADIUM_SUPERCROSS',
    name: '20. Sân Vận Động Supercross Olympic',
    description: 'Trường đua trong nhà tráng lệ với hàng chục ngàn khán giả reo hò cổ vũ cuồng nhiệt.'
  }
];

export const BIOMES: TrackBiome[] = [
  {
    id: 'emerald_highway',
    name: 'Emerald Highway',
    skyColor: 0x38bdf8,
    groundColor: 0x166534,
    trackColor: 0x1e293b,
    kerbColor1: 0xffffff,
    kerbColor2: 0xef4444,
    fogColor: 0xbae6fd,
    fogDensity: 0.00018,
    lightIntensity: 1.25,
    ambientColor: 0x64748b,
    theme: 'Đồng Cỏ Cao Tốc',
    roadLayoutType: 'GRAND_PRIX_OVAL'
  },
  {
    id: 'neon_cyber_city',
    name: 'Neon Cyber City',
    skyColor: 0x09090b,
    groundColor: 0x18181b,
    trackColor: 0x0f172a,
    kerbColor1: 0x06b6d4,
    kerbColor2: 0xec4899,
    fogColor: 0x1e1b4b,
    fogDensity: 0.00035,
    lightIntensity: 0.9,
    ambientColor: 0x3b0764,
    theme: 'Đô Thị Neon 2099',
    roadLayoutType: 'TOKYO_EXPRESSWAY_RING'
  },
  {
    id: 'crimson_sunset_canyon',
    name: 'Crimson Sunset Canyon',
    skyColor: 0xf97316,
    groundColor: 0x7c2d12,
    trackColor: 0x27272a,
    kerbColor1: 0xfef08a,
    kerbColor2: 0xe11d48,
    fogColor: 0xfb923c,
    fogDensity: 0.00025,
    lightIntensity: 1.1,
    ambientColor: 0x9a3412,
    theme: 'Hoàng Hôn Hẻm Núi',
    roadLayoutType: 'DESERT_CANYON_DUNES'
  },
  {
    id: 'alpine_snow_ridge',
    name: 'Alpine Snow Ridge',
    skyColor: 0x93c5fd,
    groundColor: 0xe2e8f0,
    trackColor: 0x334155,
    kerbColor1: 0x3b82f6,
    kerbColor2: 0xffffff,
    fogColor: 0xdbeafe,
    fogDensity: 0.00045,
    lightIntensity: 1.35,
    ambientColor: 0x94a3b8,
    theme: 'Đỉnh Tuyết Băng Giá',
    roadLayoutType: 'ALPINE_SUMMIT_SPIRAL'
  },
  {
    id: 'monza_speed_temple',
    name: 'Monza Speed Temple',
    skyColor: 0x60a5fa,
    groundColor: 0x15803d,
    trackColor: 0x1e1e24,
    kerbColor1: 0xffffff,
    kerbColor2: 0x22c55e,
    fogColor: 0xbfdbfe,
    fogDensity: 0.00015,
    lightIntensity: 1.3,
    ambientColor: 0x475569,
    theme: 'Thánh Địa Tốc Độ F1',
    roadLayoutType: 'MONZA_TEMPLE_OF_SPEED'
  },
  {
    id: 'coastal_azure_bay',
    name: 'Coastal Azure Bay',
    skyColor: 0x38bdf8,
    groundColor: 0x0284c7,
    trackColor: 0x1f2937,
    kerbColor1: 0xffffff,
    kerbColor2: 0x0ea5e9,
    fogColor: 0x7dd3fc,
    fogDensity: 0.0002,
    lightIntensity: 1.25,
    ambientColor: 0x0369a1,
    theme: 'Vịnh Biển Xanh Ngọc',
    roadLayoutType: 'COASTAL_CLIFF_HIGHWAY'
  },
  {
    id: 'midnight_aurora',
    name: 'Midnight Aurora',
    skyColor: 0x030712,
    groundColor: 0x111827,
    trackColor: 0x0f172a,
    kerbColor1: 0x10b981,
    kerbColor2: 0x6366f1,
    fogColor: 0x064e3b,
    fogDensity: 0.0003,
    lightIntensity: 0.85,
    ambientColor: 0x042f2e,
    theme: 'Cực Quang Đêm Bắc Cực',
    roadLayoutType: 'FIGURE_EIGHT_BRIDGE'
  },
  {
    id: 'volcano_magma_rim',
    name: 'Volcano Magma Rim',
    skyColor: 0x450a0a,
    groundColor: 0x1c1917,
    trackColor: 0x18181b,
    kerbColor1: 0xf97316,
    kerbColor2: 0xb91c1c,
    fogColor: 0x7f1d1d,
    fogDensity: 0.0005,
    lightIntensity: 1.0,
    ambientColor: 0x7f1d1d,
    theme: 'Miệng Núi Lửa Magma',
    roadLayoutType: 'VOLCANO_CALDERA_RIM'
  },
  {
    id: 'foggy_redwood_pass',
    name: 'Foggy Redwood Pass',
    skyColor: 0x94a3b8,
    groundColor: 0x14532d,
    trackColor: 0x27272a,
    kerbColor1: 0xffffff,
    kerbColor2: 0xf59e0b,
    fogColor: 0x64748b,
    fogDensity: 0.0006,
    lightIntensity: 0.95,
    ambientColor: 0x334155,
    theme: 'Rừng Thông Sương Mù',
    roadLayoutType: 'MOUNTAIN_HAIRPIN_PASS'
  },
  {
    id: 'tokyo_night_rain',
    name: 'Tokyo Night Rain',
    skyColor: 0x020617,
    groundColor: 0x0f172a,
    trackColor: 0x020617,
    kerbColor1: 0x38bdf8,
    kerbColor2: 0xa855f7,
    fogColor: 0x1e293b,
    fogDensity: 0.0004,
    lightIntensity: 0.85,
    ambientColor: 0x1e1b4b,
    theme: 'Mưa Đêm Tokyo',
    roadLayoutType: 'TOKYO_EXPRESSWAY_RING'
  }
];
