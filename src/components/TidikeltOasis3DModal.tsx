import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  Compass,
  Volume2,
  VolumeX,
  Sun,
  Sunset,
  Moon,
  Camera,
  CheckCircle2,
  Sparkles,
  X,
  Play,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  MapPin,
} from 'lucide-react';

export interface OasisLandmark {
  id: string;
  name: string;
  subtitle: string;
  position: [number, number, number];
  coordinates: string;
  description: string;
  historicalFact: string;
  colorHex: number;
}

export const TIDIKELT_LANDMARKS: OasisLandmark[] = [
  {
    id: 'ksar_ain_salah',
    name: 'قصر عين صالح العتيق',
    subtitle: 'العمارة الطينية الصحراوية التراثية',
    position: [0, 0, -24],
    coordinates: '27.1952° N, 2.4614° E',
    description:
      'أحد أعرق القصور الصحراوية في إقليم تديكلت، شُيّد بالطوب الطيني الأحمر وجذوع النخيل ليوفّر عزلاً حرارياً طبيعياً فائقاً ضد رياح السموم الصيفية.',
    historicalFact:
      'كان القصر محطة محورية لقوافل التجارة العابرة للصحراء الكبرى ومجمعاً للعلماء والفقهاء في قلب الواحة.',
    colorHex: 0xd97706,
  },
  {
    id: 'palm_oasis',
    name: 'واحة النخيل والغرس',
    subtitle: 'الحزام الأخضر والتنوع الزراعي الواحي',
    position: [-28, 0, -6],
    coordinates: '27.1890° N, 2.4530° E',
    description:
      'تضم آلاف أشجار النخيل المثمرة (أصناف الغرس، تينيسين، وتقربوشت) التي تشكّل مظلة بيئية تحمي الزراعات التحتية من التبخر العالي.',
    historicalFact:
      'تعتمد الواحة على نظام زراعي ثلاثي الطبقات: النخيل في الأعلى، الأشجار المثمرة في الوسط، والخضروات والأعلاف في الأسفل.',
    colorHex: 0x10b981,
  },
  {
    id: 'foggara_system',
    name: 'نظام الفقارات المائي',
    subtitle: 'هندسة الري الجوفي التقليدية',
    position: [28, 0, -8],
    coordinates: '27.2040° N, 2.4780° E',
    description:
      'شبكة عبقرية من القنوات الجوفية وآبار التهوية المتتالية تنقل المياه من الطبقات الجوفية بانسيابية الجاذبية دون أي مضخات ميكانيكية.',
    historicalFact:
      'تُقسّم المياه عبر «القصرية» و«المشط» بدقة حسابية متناهية بين ملاك البساتين منذ قرون.',
    colorHex: 0x0ea5e9,
  },
  {
    id: 'moving_dunes',
    name: 'كثبان الرق المتحركة',
    subtitle: 'ظاهرة زحف الرمال الذهبية غرب عين صالح',
    position: [-22, 0, 24],
    coordinates: '27.1825° N, 2.4410° E',
    description:
      'كثبان هلالية شاهقة تتشكل بفعل الرياح الصحراوية وتحيط بالواحة في مشهد طبيعي ساحر عند الشروق والغروب.',
    historicalFact:
      'تُعد كثبان عين صالح مقصداً للسياحة الصحراوية والتداوي بالرمال الساخنة (الحمام الرملي الطبيعي).',
    colorHex: 0xf59e0b,
  },
  {
    id: 'sahara_observatory',
    name: 'مرصد الصحراء والطاقة الشمسية',
    subtitle: 'الريادة الطاقوية والمناخية في الجنوب الكبير',
    position: [24, 0, 22],
    coordinates: '27.2110° N, 2.4890° E',
    description:
      'مركز رصد مناخي وألواح طاقة شمسية يستثمر أحد أعلى معدلات السطوع الشمسي في العالم لتوليد الطاقة النظيفة ومراقبة الرياح الرملية.',
    historicalFact:
      'تسجل منطقة تديكلت أكثر من 3,600 ساعة سطوع شمسي سنوياً، ما يجعلها قطباً استراتيجياً للطاقة المتجددة.',
    colorHex: 0x6366f1,
  },
];

type GameState = 'title' | 'playing' | 'paused' | 'completed';
type LightingPreset = 'golden_sunset' | 'bright_oasis' | 'starry_sahara';
type CameraMode = 'chase' | 'orbit' | 'aerial';

interface TidikeltOasis3DModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAskAiAboutLandmark?: (landmarkName: string, prompt: string) => void;
}

export const TidikeltOasis3DModal: React.FC<TidikeltOasis3DModalProps> = ({
  isOpen,
  onClose,
  onAskAiAboutLandmark,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  const [gameState, setGameState] = useState<GameState>('title');
  const [lightingPreset, setLightingPreset] = useState<LightingPreset>('golden_sunset');
  const [cameraMode, setCameraMode] = useState<CameraMode>('chase');
  const [discoveredIds, setDiscoveredIds] = useState<string[]>([]);
  const [nearbyLandmark, setNearbyLandmark] = useState<OasisLandmark | null>(null);
  const [activeLandmarkModal, setActiveLandmarkModal] = useState<OasisLandmark | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isDockCollapsed, setIsDockCollapsed] = useState<boolean>(false);
  const [roverCoords, setRoverCoords] = useState<{ x: number; z: number; speed: number }>({
    x: 0,
    z: 8,
    speed: 0,
  });

  // Refs for runtime loop access without re-creating scene
  const gameStateRef = useRef<GameState>(gameState);
  const cameraModeRef = useRef<CameraMode>(cameraMode);
  const lightingPresetRef = useRef<LightingPreset>(lightingPreset);
  const discoveredRef = useRef<Set<string>>(new Set());
  const nearbyRef = useRef<OasisLandmark | null>(null);
  const keysRef = useRef<Record<string, boolean>>({});
  const audioCtxRef = useRef<AudioContext | null>(null);
  const isMutedRef = useRef<boolean>(isMuted);

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    cameraModeRef.current = cameraMode;
  }, [cameraMode]);

  useEffect(() => {
    lightingPresetRef.current = lightingPreset;
  }, [lightingPreset]);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  // Procedural Web Audio Synthesizer for discovery chime & interaction feedback
  const playDiscoverySound = useCallback((freq = 528) => {
    if (isMutedRef.current) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc2.type = 'triangle';
      osc1.frequency.setValueAtTime(freq, now);
      osc1.frequency.exponentialRampToValueAtTime(freq * 1.5, now + 0.35);

      osc2.frequency.setValueAtTime(freq * 0.5, now);
      osc2.frequency.exponentialRampToValueAtTime(freq, now + 0.45);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.14, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.65);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.66);
      osc2.stop(now + 0.66);
    } catch {
      // Ignore audio errors if blocked by browser autoplay policy
    }
  }, []);

  const handleInspectLandmark = useCallback(
    (landmark: OasisLandmark) => {
      playDiscoverySound(587.33);
      setActiveLandmarkModal(landmark);
      setDiscoveredIds((prev) => {
        if (prev.includes(landmark.id)) return prev;
        const next = [...prev, landmark.id];
        discoveredRef.current = new Set(next);
        if (next.length === TIDIKELT_LANDMARKS.length) {
          setTimeout(() => setGameState('completed'), 400);
        }
        return next;
      });
    },
    [playDiscoverySound]
  );

  // Main Three.js Scene Setup & Animation Loop
  useEffect(() => {
    if (!isOpen || !mountRef.current) return;
    const container = mountRef.current;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1c140d);
    scene.fog = new THREE.FogExp2(0x2a1c11, 0.009);

    const camera = new THREE.PerspectiveCamera(
      55,
      container.clientWidth / Math.max(1, container.clientHeight),
      0.1,
      400
    );
    camera.position.set(0, 12, 24);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Environment Map (PMREMGenerator + RoomEnvironment for rich PBR reflections)
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;

    // OrbitControls for orbit/aerial inspection modes
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.maxPolarAngle = Math.PI / 2 - 0.04;
    controls.minDistance = 6;
    controls.maxDistance = 95;
    controls.enabled = false;

    // --- Three-Point + Hemisphere Desert Lighting ---
    const hemiLight = new THREE.HemisphereLight(0xffdfa8, 0x8c5828, 0.75);
    hemiLight.position.set(0, 50, 0);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0xffb86c, 2.6);
    sunLight.position.set(45, 55, -35);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 1;
    sunLight.shadow.camera.far = 160;
    const d = 55;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.bias = -0.0005;
    scene.add(sunLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.55);
    rimLight.position.set(-40, 25, 40);
    scene.add(rimLight);

    // --- Sculpted Sahara Terrain ---
    const terrainGeo = new THREE.PlaneGeometry(220, 220, 96, 96);
    terrainGeo.rotateX(-Math.PI / 2);
    const posAttr = terrainGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const x = posAttr.getX(i);
      const z = posAttr.getZ(i);
      const distFromCenter = Math.sqrt(x * x + z * z);
      // Keep center pathways relatively flat while sculpting outer sand dunes
      const duneFactor = THREE.MathUtils.smoothstep(distFromCenter, 12, 65);
      const wave =
        Math.sin(x * 0.06) * Math.cos(z * 0.06) * 2.4 +
        Math.sin((x + z) * 0.03) * 3.2;
      posAttr.setY(i, wave * duneFactor);
    }
    terrainGeo.computeVertexNormals();

    const terrainMat = new THREE.MeshStandardMaterial({
      color: 0xd4944e,
      roughness: 0.88,
      metalness: 0.05,
    });
    const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
    terrainMesh.receiveShadow = true;
    scene.add(terrainMesh);

    // Helper function to sample ground height at (x, z)
    const getTerrainHeight = (x: number, z: number): number => {
      const distFromCenter = Math.sqrt(x * x + z * z);
      const duneFactor = THREE.MathUtils.smoothstep(distFromCenter, 12, 65);
      const wave =
        Math.sin(x * 0.06) * Math.cos(z * 0.06) * 2.4 +
        Math.sin((x + z) * 0.03) * 3.2;
      return wave * duneFactor;
    };

    // --- 1. Ksar Ain Salah (Composite Earthen Fortress) ---
    const ksarGroup = new THREE.Group();
    const ksarY = getTerrainHeight(0, -24);
    ksarGroup.position.set(0, ksarY, -24);

    const clayMat = new THREE.MeshStandardMaterial({
      color: 0xb85d38,
      roughness: 0.9,
      metalness: 0.04,
    });
    const darkWoodMat = new THREE.MeshStandardMaterial({
      color: 0x452212,
      roughness: 0.85,
    });
    const warmWindowMat = new THREE.MeshStandardMaterial({
      color: 0xffd166,
      emissive: 0xf59e0b,
      emissiveIntensity: 1.8,
      roughness: 0.3,
    });

    // Main central keep
    const mainKeep = new THREE.Mesh(new THREE.BoxGeometry(10, 6.5, 8), clayMat);
    mainKeep.position.y = 3.25;
    mainKeep.castShadow = true;
    mainKeep.receiveShadow = true;
    ksarGroup.add(mainKeep);

    // 4 Corner earthen watchtowers (tapered cylinders)
    const towerPositions: [number, number][] = [
      [-5.2, -4.2],
      [5.2, -4.2],
      [-5.2, 4.2],
      [5.2, 4.2],
    ];
    towerPositions.forEach(([tx, tz]) => {
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.8, 8.5, 12), clayMat);
      tower.position.set(tx, 4.25, tz);
      tower.castShadow = true;
      tower.receiveShadow = true;
      ksarGroup.add(tower);

      const crown = new THREE.Mesh(new THREE.ConeGeometry(1.45, 1.4, 4), clayMat);
      crown.position.set(tx, 9.1, tz);
      crown.rotation.y = Math.PI / 4;
      ksarGroup.add(crown);
    });

    // Arched Wooden Gate & Glowing Windows
    const gateMesh = new THREE.Mesh(new THREE.BoxGeometry(2.6, 3.6, 0.5), darkWoodMat);
    gateMesh.position.set(0, 1.8, 4.05);
    ksarGroup.add(gateMesh);

    for (let wx = -3; wx <= 3; wx += 3) {
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.1, 0.2), warmWindowMat);
      win.position.set(wx, 4.6, 4.02);
      ksarGroup.add(win);
    }
    scene.add(ksarGroup);

    // --- 2. Tidikelt Palm Oasis (InstancedMesh Date Palms + Water Basin) ---
    const oasisGroup = new THREE.Group();
    const oasisY = getTerrainHeight(-28, -6);
    oasisGroup.position.set(-28, oasisY, -6);

    const waterGeo = new THREE.CylinderGeometry(7.5, 7.5, 0.35, 32);
    const waterMat = new THREE.MeshPhysicalMaterial({
      color: 0x0ea5e9,
      roughness: 0.12,
      metalness: 0.1,
      transmission: 0.65,
      thickness: 1.2,
    });
    const waterBasin = new THREE.Mesh(waterGeo, waterMat);
    waterBasin.position.y = 0.2;
    oasisGroup.add(waterBasin);

    // Instanced Palm Trunks & Fronds (28 palms around the oasis)
    const palmCount = 28;
    const trunkGeo = new THREE.CylinderGeometry(0.22, 0.38, 5.8, 8);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 0.9 });
    const trunkInstanced = new THREE.InstancedMesh(trunkGeo, trunkMat, palmCount);
    trunkInstanced.castShadow = true;

    const canopyGeo = new THREE.ConeGeometry(2.3, 2.2, 7);
    const canopyMat = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.65 });
    const canopyInstanced = new THREE.InstancedMesh(canopyGeo, canopyMat, palmCount);
    canopyInstanced.castShadow = true;

    const dummy = new THREE.Object3D();
    for (let i = 0; i < palmCount; i++) {
      const angle = (i / palmCount) * Math.PI * 2;
      const radius = 8.2 + (i % 3) * 2.4;
      const px = Math.cos(angle) * radius;
      const pz = Math.sin(angle) * radius;
      const scale = 0.85 + (i % 4) * 0.12;

      dummy.position.set(px, 2.9 * scale, pz);
      dummy.scale.set(scale, scale, scale);
      dummy.rotation.set((i % 2) * 0.06, angle, 0);
      dummy.updateMatrix();
      trunkInstanced.setMatrixAt(i, dummy.matrix);

      dummy.position.set(px, 5.8 * scale, pz);
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();
      canopyInstanced.setMatrixAt(i, dummy.matrix);
    }
    oasisGroup.add(trunkInstanced);
    oasisGroup.add(canopyInstanced);
    scene.add(oasisGroup);

    // --- 3. Foggara Water System (Shafts & Flowing Channel) ---
    const foggaraGroup = new THREE.Group();
    const foggaraY = getTerrainHeight(28, -8);
    foggaraGroup.position.set(28, foggaraY, -8);

    const channelMesh = new THREE.Mesh(
      new THREE.BoxGeometry(16, 0.45, 1.8),
      waterMat
    );
    channelMesh.position.set(0, 0.25, 0);
    foggaraGroup.add(channelMesh);

    for (let s = -6; s <= 6; s += 3) {
      const wellRim = new THREE.Mesh(
        new THREE.TorusGeometry(0.95, 0.32, 10, 20),
        clayMat
      );
      wellRim.rotation.x = Math.PI / 2;
      wellRim.position.set(s, 0.4, -2.5);
      wellRim.castShadow = true;
      foggaraGroup.add(wellRim);
    }
    scene.add(foggaraGroup);

    // --- 4. Moving Sand Dunes Monument ---
    const dunesGroup = new THREE.Group();
    const dunesY = getTerrainHeight(-22, 24);
    dunesGroup.position.set(-22, dunesY, 24);

    const duneMoundGeo = new THREE.ConeGeometry(8.5, 5.5, 24);
    const duneMoundMat = new THREE.MeshStandardMaterial({
      color: 0xeab308,
      roughness: 0.82,
    });
    const duneMound = new THREE.Mesh(duneMoundGeo, duneMoundMat);
    duneMound.position.y = 2.5;
    duneMound.scale.set(1.4, 1, 0.85);
    duneMound.castShadow = true;
    duneMound.receiveShadow = true;
    dunesGroup.add(duneMound);
    scene.add(dunesGroup);

    // --- 5. Sahara Solar & Weather Observatory ---
    const solarGroup = new THREE.Group();
    const solarY = getTerrainHeight(24, 22);
    solarGroup.position.set(24, solarY, 22);

    const panelMat = new THREE.MeshPhysicalMaterial({
      color: 0x1e3a8a,
      metalness: 0.75,
      roughness: 0.2,
      clearcoat: 0.9,
    });
    const steelMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.8,
      roughness: 0.3,
    });

    for (let px = -4; px <= 4; px += 4) {
      for (let pz = -2.5; pz <= 2.5; pz += 5) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 2.2, 8), steelMat);
        post.position.set(px, 1.1, pz);
        post.castShadow = true;
        solarGroup.add(post);

        const panel = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.12, 2.2), panelMat);
        panel.position.set(px, 2.25, pz);
        panel.rotation.x = 0.35;
        panel.castShadow = true;
        solarGroup.add(panel);
      }
    }

    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.25, 9, 10), steelMat);
    mast.position.set(0, 4.5, 0);
    mast.castShadow = true;
    solarGroup.add(mast);
    scene.add(solarGroup);

    // --- Glowing Beacons Above All 5 Landmarks ---
    const beaconMeshes: { id: string; ring: THREE.Mesh; crystal: THREE.Mesh; basePos: THREE.Vector3 }[] = [];
    TIDIKELT_LANDMARKS.forEach((lm) => {
      const by = getTerrainHeight(lm.position[0], lm.position[2]);
      const basePos = new THREE.Vector3(lm.position[0], by, lm.position[2]);

      const ringGeo = new THREE.TorusGeometry(3.2, 0.12, 12, 36);
      const ringMat = new THREE.MeshStandardMaterial({
        color: lm.colorHex,
        emissive: lm.colorHex,
        emissiveIntensity: 1.5,
        roughness: 0.2,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(basePos.x, basePos.y + 0.35, basePos.z);
      scene.add(ring);

      const crystalGeo = new THREE.OctahedronGeometry(0.85, 0);
      const crystalMat = new THREE.MeshStandardMaterial({
        color: lm.colorHex,
        emissive: lm.colorHex,
        emissiveIntensity: 2.0,
        roughness: 0.15,
        metalness: 0.5,
      });
      const crystal = new THREE.Mesh(crystalGeo, crystalMat);
      crystal.position.set(basePos.x, basePos.y + 7.5, basePos.z);
      scene.add(crystal);

      beaconMeshes.push({ id: lm.id, ring, crystal, basePos });
    });

    // --- Composite 9-Part Procedural Desert 4x4 Explorer Rover ---
    const roverGroup = new THREE.Group();
    roverGroup.position.set(0, getTerrainHeight(0, 8), 8);

    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.32,
      metalness: 0.45,
    });
    const cabinMat = new THREE.MeshPhysicalMaterial({
      color: 0x0f172a,
      roughness: 0.15,
      metalness: 0.2,
      clearcoat: 0.8,
    });
    const tireMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.85,
    });
    const headlightMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xfef08a,
      emissiveIntensity: 3.0,
    });

    const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.75, 3.8), bodyMat);
    chassis.position.y = 0.85;
    chassis.castShadow = true;
    roverGroup.add(chassis);

    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.75, 2.0), cabinMat);
    cabin.position.set(0, 1.55, -0.2);
    cabin.castShadow = true;
    roverGroup.add(cabin);

    const roofRack = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.12, 1.8), steelMat);
    roofRack.position.set(0, 1.98, -0.2);
    roverGroup.add(roofRack);

    const headlightL = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.15, 12), headlightMat);
    headlightL.rotation.x = Math.PI / 2;
    headlightL.position.set(-0.68, 0.9, -1.92);
    roverGroup.add(headlightL);

    const headlightR = headlightL.clone();
    headlightR.position.set(0.68, 0.9, -1.92);
    roverGroup.add(headlightR);

    const wheels: THREE.Mesh[] = [];
    const wheelOffsets: [number, number][] = [
      [-1.12, -1.25],
      [1.12, -1.25],
      [-1.12, 1.25],
      [1.12, 1.25],
    ];
    wheelOffsets.forEach(([wx, wz]) => {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.52, 0.42, 16), tireMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(wx, 0.52, wz);
      wheel.castShadow = true;
      roverGroup.add(wheel);
      wheels.push(wheel);
    });

    scene.add(roverGroup);

    // --- Atmospheric Floating Sand Dust Particles ---
    const particleCount = 450;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      particlePositions[i * 3] = (Math.random() - 0.5) * 140;
      particlePositions[i * 3 + 1] = Math.random() * 18 + 0.5;
      particlePositions[i * 3 + 2] = (Math.random() - 0.5) * 140;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0xfde68a,
      size: 0.28,
      transparent: true,
      opacity: 0.55,
    });
    const dustParticles = new THREE.Points(particleGeo, particleMat);
    scene.add(dustParticles);

    // --- Keyboard Input Listeners ---
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keysRef.current[key] = true;

      if (e.key === 'Escape') {
        setActiveLandmarkModal((currModal) => {
          if (currModal) return null;
          setGameState((prev) => (prev === 'playing' ? 'paused' : prev === 'paused' ? 'playing' : prev));
          return null;
        });
      } else if (key === 'h') {
        setIsDockCollapsed((prev) => !prev);
      } else if (e.key === ' ' || e.key === 'Enter') {
        if (gameStateRef.current === 'title') {
          e.preventDefault();
          playDiscoverySound(440);
          setGameState('playing');
        } else if (gameStateRef.current === 'playing' && nearbyRef.current && e.key === ' ') {
          e.preventDefault();
          handleInspectLandmark(nearbyRef.current);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.key.toLowerCase()] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // --- Responsive ResizeObserver ---
    const resizeObserver = new ResizeObserver(() => {
      if (!container) return;
      const w = container.clientWidth;
      const h = Math.max(1, container.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    });
    resizeObserver.observe(container);

    // --- Clock & Frame-Rate Independent Animation Loop ---
    const clock = new THREE.Clock();
    let roverSpeed = 0;
    let roverHeading = 0;
    let hudUpdateCounter = 0;
    let animFrameId = 0;

    const animate = () => {
      animFrameId = requestAnimationFrame(animate);
      const dt = Math.min(clock.getDelta(), 0.1);
      const elapsed = clock.getElapsedTime();

      // Update lighting preset smoothly
      const preset = lightingPresetRef.current;
      if (preset === 'golden_sunset') {
        scene.background = new THREE.Color(0x23150c);
        (scene.fog as THREE.FogExp2).color.setHex(0x2e1b0f);
        sunLight.color.setHex(0xff9e44);
        sunLight.intensity = 2.6;
        sunLight.position.set(45, 32, -35);
      } else if (preset === 'bright_oasis') {
        scene.background = new THREE.Color(0x7dd3fc);
        (scene.fog as THREE.FogExp2).color.setHex(0xdbeafe);
        sunLight.color.setHex(0xfffbeb);
        sunLight.intensity = 3.2;
        sunLight.position.set(25, 75, -20);
      } else {
        scene.background = new THREE.Color(0x090d16);
        (scene.fog as THREE.FogExp2).color.setHex(0x090d16);
        sunLight.color.setHex(0x818cf8);
        sunLight.intensity = 1.1;
        sunLight.position.set(-30, 50, -30);
      }

      // Animate landmark beacons
      beaconMeshes.forEach((b, idx) => {
        const isFound = discoveredRef.current.has(b.id);
        b.crystal.rotation.y = elapsed * 1.4 + idx;
        b.crystal.position.y = b.basePos.y + 7.2 + Math.sin(elapsed * 2.2 + idx) * 0.55;
        const scalePulse = 1 + Math.sin(elapsed * 3 + idx) * 0.08;
        b.ring.scale.set(scalePulse, scalePulse, 1);
        const mat = b.crystal.material as THREE.MeshStandardMaterial;
        mat.emissiveIntensity = isFound ? 0.6 : 2.2;
      });

      // Drift sand particles gently
      dustParticles.rotation.y = elapsed * 0.02;

      if (gameStateRef.current === 'title') {
        // Cinematic orbital flyover during Title Screen
        const camAngle = elapsed * 0.18;
        camera.position.set(Math.sin(camAngle) * 38, 16 + Math.sin(elapsed * 0.5) * 2, Math.cos(camAngle) * 38);
        camera.lookAt(0, 3, -6);
      } else if (gameStateRef.current === 'playing') {
        const keys = keysRef.current;
        const forward = (keys['w'] || keys['arrowup'] ? 1 : 0) - (keys['s'] || keys['arrowdown'] ? 1 : 0);
        const turn = (keys['a'] || keys['arrowleft'] ? 1 : 0) - (keys['d'] || keys['arrowright'] ? 1 : 0);

        const targetSpeed = forward * 16;
        roverSpeed = THREE.MathUtils.lerp(roverSpeed, targetSpeed, 1 - Math.exp(-6 * dt));

        if (Math.abs(roverSpeed) > 0.2) {
          roverHeading += turn * 2.1 * dt * Math.sign(roverSpeed || 1);
        } else {
          roverHeading += turn * 1.5 * dt;
        }

        const nextX = THREE.MathUtils.clamp(
          roverGroup.position.x - Math.sin(roverHeading) * roverSpeed * dt,
          -65,
          65
        );
        const nextZ = THREE.MathUtils.clamp(
          roverGroup.position.z - Math.cos(roverHeading) * roverSpeed * dt,
          -65,
          65
        );

        roverGroup.position.x = nextX;
        roverGroup.position.z = nextZ;
        roverGroup.position.y = getTerrainHeight(nextX, nextZ);
        roverGroup.rotation.y = roverHeading;

        // Spin rover wheels proportionally to speed
        wheels.forEach((w) => {
          w.rotation.x -= roverSpeed * dt * 1.6;
        });

        // Check proximity to landmarks
        let closest: OasisLandmark | null = null;
        let minDist = 9.5;
        for (const lm of TIDIKELT_LANDMARKS) {
          const dx = roverGroup.position.x - lm.position[0];
          const dz = roverGroup.position.z - lm.position[2];
          const dist = Math.sqrt(dx * dx + dz * dz);
          if (dist < minDist) {
            minDist = dist;
            closest = lm;
          }
        }
        if (nearbyRef.current?.id !== closest?.id) {
          nearbyRef.current = closest;
          setNearbyLandmark(closest);
        }

        // Update HUD coordinates periodically
        hudUpdateCounter++;
        if (hudUpdateCounter % 8 === 0) {
          setRoverCoords({
            x: Math.round(roverGroup.position.x),
            z: Math.round(roverGroup.position.z),
            speed: Math.abs(Math.round(roverSpeed * 3.6)),
          });
        }

        // Camera Mode Handling
        if (cameraModeRef.current === 'chase') {
          controls.enabled = false;
          const offset = new THREE.Vector3(0, 6.2, 13.5).applyAxisAngle(
            new THREE.Vector3(0, 1, 0),
            roverHeading
          );
          const desiredCamPos = roverGroup.position.clone().add(offset);
          camera.position.lerp(desiredCamPos, 1 - Math.exp(-5.5 * dt));
          const lookTarget = roverGroup.position
            .clone()
            .add(new THREE.Vector3(0, 1.8, 0));
          camera.lookAt(lookTarget);
        } else if (cameraModeRef.current === 'aerial') {
          controls.enabled = false;
          const desiredAerialPos = new THREE.Vector3(
            roverGroup.position.x,
            roverGroup.position.y + 38,
            roverGroup.position.z + 18
          );
          camera.position.lerp(desiredAerialPos, 1 - Math.exp(-4 * dt));
          camera.lookAt(roverGroup.position);
        } else {
          controls.enabled = true;
          controls.target.lerp(roverGroup.position, 0.1);
          controls.update();
        }
      }

      renderer.render(scene, camera);
    };

    animFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animFrameId);
      resizeObserver.disconnect();
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      controls.dispose();
      pmremGenerator.dispose();
      renderer.dispose();
    };
  }, [isOpen, handleInspectLandmark, playDiscoverySound]);

  // Touch / On-Screen D-Pad helpers for mobile & mouse users
  const setMoveKey = (key: string, pressed: boolean) => {
    keysRef.current[key] = pressed;
  };

  if (!isOpen) return null;

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-[120] w-screen h-screen overflow-hidden bg-[#0c0a09] text-stone-100 select-none font-sans"
    >
      {/* Full-Viewport 3D WebGL Canvas */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full" />

      {/* Top Spatial HUD Bar (No backdrop-filter over WebGL to preserve 60fps) */}
      <div className="absolute top-4 inset-x-4 z-20 flex flex-wrap items-center justify-between gap-3 pointer-events-none">
        <div className="flex items-center gap-3 bg-[#14110f]/90 border border-amber-500/30 rounded-xl px-4 py-2.5 shadow-xl pointer-events-auto">
          <div className="w-9 h-9 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
            <Compass className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-amber-100">جولة واحة عين صالح وتديكلت 3D</h2>
            <p className="text-[11px] text-stone-400 font-mono tabular-nums">
              المعالم المكتشفة: {discoveredIds.length} / {TIDIKELT_LANDMARKS.length} · السرعة:{' '}
              {roverCoords.speed} كم/س
            </p>
          </div>
        </div>

        {/* Landmark Progress Chips */}
        <div className="hidden lg:flex items-center gap-1.5 bg-[#14110f]/90 border border-stone-800 rounded-xl px-3 py-2 pointer-events-auto">
          {TIDIKELT_LANDMARKS.map((lm) => {
            const done = discoveredIds.includes(lm.id);
            return (
              <button
                key={lm.id}
                onClick={() => handleInspectLandmark(lm)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                  done
                    ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-600/40'
                    : 'bg-stone-900/90 text-stone-400 hover:text-stone-200 border border-stone-800'
                }`}
                title="انقر لمعاينة المعلم"
              >
                <CheckCircle2 className={`w-3.5 h-3.5 ${done ? 'text-emerald-400' : 'text-stone-600'}`} />
                <span>{lm.name}</span>
              </button>
            );
          })}
        </div>

        {/* Audio Mute & Exit Buttons */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={() => setIsMuted((m) => !m)}
            className="p-2.5 rounded-xl bg-[#14110f]/90 border border-stone-700/80 text-stone-200 hover:border-amber-500/50 transition-colors"
            title={isMuted ? 'تشغيل الصوت' : 'كتم الصوت'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-amber-400" />}
          </button>
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-950/90 hover:bg-rose-900 text-rose-200 border border-rose-700/50 text-xs font-bold transition-colors"
          >
            <X className="w-4 h-4" />
            <span>إغلاق الجولة</span>
          </button>
        </div>
      </div>

      {/* State 1: Title Screen Overlay */}
      {gameState === 'title' && (
        <div className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-black/55">
          <div className="max-w-lg w-full bg-[#16120e] border border-amber-500/35 rounded-2xl p-7 text-center shadow-2xl">
            {/* Custom Bespoke SVG Title Lockup */}
            <div className="mx-auto mb-4 w-20 h-20 rounded-2xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center">
              <svg viewBox="0 0 64 64" className="w-12 h-12 text-amber-400" fill="none">
                <circle cx="46" cy="18" r="8" fill="currentColor" fillOpacity="0.85" />
                <path
                  d="M6 48C18 36 28 36 40 48C48 40 54 40 58 44V54H6V48Z"
                  fill="#D97706"
                  fillOpacity="0.45"
                />
                <path
                  d="M22 46V26M22 26C16 24 12 28 10 32M22 26C28 24 32 28 34 32M22 26C18 19 13 18 9 20M22 26C26 19 31 18 35 20"
                  stroke="#10B981"
                  strokeWidth="3"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            <span className="inline-block px-3 py-1 rounded-md bg-amber-500/15 text-amber-300 text-xs font-semibold mb-2">
              تجربة تفاعلية ثلاثية الأبعاد · Three.js WebGL
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-2">
              مستكشف واحة عين صالح وتديكلت
            </h1>
            <p className="text-sm text-stone-300 leading-relaxed mb-6">
              قد مركبة الاستكشاف الصحراوية عبر معالم عين صالح الخمسة: القصر العتيق، واحة النخيل، نظام الفقارات المائي، كثبان الرق، ومرصد الطاقة الشمسية.
            </p>

            <button
              onClick={() => {
                playDiscoverySound(440);
                setGameState('playing');
              }}
              className="w-full py-3.5 px-6 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-base shadow-lg flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>بدء الجولة الاستكشافية (Enter / Space)</span>
            </button>

            <div className="mt-5 pt-4 border-t border-stone-800 text-[11px] text-stone-400 font-mono">
              WASD / الأسهم للتحرك · Space لاستكشاف المعلم · Esc للإيقاف المؤقت · H لإخفاء الشريط
            </div>
          </div>
        </div>
      )}

      {/* Nearby Landmark Interactive Prompt Banner */}
      {gameState === 'playing' && nearbyLandmark && !activeLandmarkModal && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-20 bg-[#14110f]/95 border-2 border-amber-500 rounded-2xl px-5 py-3 shadow-2xl flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
            <MapPin className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs text-amber-300 font-semibold">أنت بالقرب من معلم تاريخي</div>
            <div className="text-sm font-bold text-white">{nearbyLandmark.name}</div>
          </div>
          <button
            onClick={() => handleInspectLandmark(nearbyLandmark)}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs transition-colors cursor-pointer"
          >
            استكشاف (Space)
          </button>
        </div>
      )}

      {/* Landmark Inspection Detail Modal */}
      {activeLandmarkModal && (
        <div className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-black/60">
          <div className="max-w-md w-full bg-[#16120e] border border-amber-500/40 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <span className="text-xs font-mono text-amber-400">{activeLandmarkModal.coordinates}</span>
                <h3 className="text-xl font-extrabold text-white mt-0.5">{activeLandmarkModal.name}</h3>
                <p className="text-xs text-stone-400">{activeLandmarkModal.subtitle}</p>
              </div>
              <button
                onClick={() => setActiveLandmarkModal(null)}
                className="p-1.5 rounded-lg bg-stone-800 text-stone-300 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-sm text-stone-200 leading-relaxed mb-4">{activeLandmarkModal.description}</p>

            <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-600/30 mb-5">
              <div className="text-xs font-bold text-amber-300 mb-1">معلومة تاريخية وميدانية:</div>
              <p className="text-xs text-amber-100/90 leading-relaxed">{activeLandmarkModal.historicalFact}</p>
            </div>

            <div className="flex items-center gap-2.5">
              {onAskAiAboutLandmark && (
                <button
                  onClick={() => {
                    const lm = activeLandmarkModal;
                    setActiveLandmarkModal(null);
                    onClose();
                    onAskAiAboutLandmark(
                      lm.name,
                      `حدثني بالتفصيل عن ${lm.name} في عين صالح وتديكلت وأهميته التاريخية والسياحية.`
                    );
                  }}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>اسأل المساعد الذكي عن هذا المعلم</span>
                </button>
              )}
              <button
                onClick={() => setActiveLandmarkModal(null)}
                className="py-2.5 px-4 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-xs transition-colors cursor-pointer"
              >
                متابعة الجولة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* State 3: Paused Modal */}
      {gameState === 'paused' && (
        <div className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-black/60">
          <div className="max-w-sm w-full bg-[#16120e] border border-stone-700 rounded-2xl p-6 text-center shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-2">الجولة متوقفة مؤقتاً</h3>
            <p className="text-xs text-stone-400 mb-5">
              اكتشفت حتى الآن {discoveredIds.length} من أصل {TIDIKELT_LANDMARKS.length} معالم في واحة تديكلت.
            </p>
            <div className="flex flex-col gap-2.5">
              <button
                onClick={() => setGameState('playing')}
                className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm"
              >
                استئناف الجولة
              </button>
              <button
                onClick={() => {
                  setDiscoveredIds([]);
                  discoveredRef.current.clear();
                  setGameState('playing');
                }}
                className="w-full py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-semibold text-sm flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-4 h-4" />
                <span>إعادة ضبط المعالم المكتشفة</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* State 4: Completed All Landmarks Celebration */}
      {gameState === 'completed' && (
        <div className="absolute inset-0 z-30 flex items-center justify-center p-4 bg-black/65">
          <div className="max-w-md w-full bg-[#16120e] border-2 border-emerald-500/60 rounded-2xl p-6 text-center shadow-2xl">
            <div className="mx-auto mb-3 w-14 h-14 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-2xl font-extrabold text-white mb-1">أتممت استكشاف واحة تديكلت!</h3>
            <p className="text-sm text-stone-300 mb-5">
              لقد زرت جميع المعالم الخمسة الكبرى في عين صالح وتعرفت على إرثها المعماري والمائي والطبيعي.
            </p>
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setGameState('playing')}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer"
              >
                مواصلة التجول الحر
              </button>
              <button
                onClick={onClose}
                className="py-2.5 px-4 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-xs cursor-pointer"
              >
                العودة للمنصة
              </button>
            </div>
          </div>
        </div>
      )}

      {/* On-Screen Touch / Mouse Movement Controls for Mobile & Quick Navigation */}
      {gameState === 'playing' && (
        <div className="absolute bottom-20 right-4 z-20 flex flex-col items-center gap-1.5 select-none">
          <button
            onMouseDown={() => setMoveKey('w', true)}
            onMouseUp={() => setMoveKey('w', false)}
            onMouseLeave={() => setMoveKey('w', false)}
            onTouchStart={() => setMoveKey('w', true)}
            onTouchEnd={() => setMoveKey('w', false)}
            className="w-11 h-11 rounded-xl bg-[#14110f]/90 border border-stone-700 active:bg-amber-600 text-stone-200 font-bold text-xs flex items-center justify-center shadow-lg"
            title="تقدم للأمام (W)"
          >
            ▲
          </button>
          <div className="flex items-center gap-1.5">
            <button
              onMouseDown={() => setMoveKey('d', true)}
              onMouseUp={() => setMoveKey('d', false)}
              onMouseLeave={() => setMoveKey('d', false)}
              onTouchStart={() => setMoveKey('d', true)}
              onTouchEnd={() => setMoveKey('d', false)}
              className="w-11 h-11 rounded-xl bg-[#14110f]/90 border border-stone-700 active:bg-amber-600 text-stone-200 font-bold text-xs flex items-center justify-center shadow-lg"
              title="انعطف يميناً (D)"
            >
              ▶
            </button>
            <button
              onMouseDown={() => setMoveKey('s', true)}
              onMouseUp={() => setMoveKey('s', false)}
              onMouseLeave={() => setMoveKey('s', false)}
              onTouchStart={() => setMoveKey('s', true)}
              onTouchEnd={() => setMoveKey('s', false)}
              className="w-11 h-11 rounded-xl bg-[#14110f]/90 border border-stone-700 active:bg-amber-600 text-stone-200 font-bold text-xs flex items-center justify-center shadow-lg"
              title="تراجع للخلف (S)"
            >
              ▼
            </button>
            <button
              onMouseDown={() => setMoveKey('a', true)}
              onMouseUp={() => setMoveKey('a', false)}
              onMouseLeave={() => setMoveKey('a', false)}
              onTouchStart={() => setMoveKey('a', true)}
              onTouchEnd={() => setMoveKey('a', false)}
              className="w-11 h-11 rounded-xl bg-[#14110f]/90 border border-stone-700 active:bg-amber-600 text-stone-200 font-bold text-xs flex items-center justify-center shadow-lg"
              title="انعطف يساراً (A)"
            >
              ◀
            </button>
          </div>
        </div>
      )}

      {/* Compact Collapsible Bottom Control Dock (<= 15% Viewport, Solid Dark Surface) */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 max-w-2xl w-[94%] pointer-events-auto">
        <div className="bg-[#14110f]/95 border border-stone-800 rounded-2xl px-4 py-2.5 shadow-2xl">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-stone-300">
              إعدادات المشهد والكاميرا (اضغط H للطي)
            </span>
            <button
              onClick={() => setIsDockCollapsed((c) => !c)}
              className="p-1 rounded-lg bg-stone-800 text-stone-300 hover:text-white"
            >
              {isDockCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          {!isDockCollapsed && (
            <div className="mt-2.5 pt-2.5 border-t border-stone-800/80 flex flex-wrap items-center justify-between gap-3">
              {/* Lighting Presets */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-stone-400 ml-1">الإضاءة:</span>
                <button
                  onClick={() => setLightingPreset('golden_sunset')}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium ${
                    lightingPreset === 'golden_sunset'
                      ? 'bg-amber-600 text-white'
                      : 'bg-stone-900 text-stone-400 hover:text-stone-200'
                  }`}
                >
                  <Sunset className="w-3.5 h-3.5" />
                  <span>غروب ذهبي</span>
                </button>
                <button
                  onClick={() => setLightingPreset('bright_oasis')}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium ${
                    lightingPreset === 'bright_oasis'
                      ? 'bg-sky-600 text-white'
                      : 'bg-stone-900 text-stone-400 hover:text-stone-200'
                  }`}
                >
                  <Sun className="w-3.5 h-3.5" />
                  <span>ظهيرة مشمسة</span>
                </button>
                <button
                  onClick={() => setLightingPreset('starry_sahara')}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium ${
                    lightingPreset === 'starry_sahara'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-stone-900 text-stone-400 hover:text-stone-200'
                  }`}
                >
                  <Moon className="w-3.5 h-3.5" />
                  <span>ليل صحراوي</span>
                </button>
              </div>

              {/* Camera Mode Switcher */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-stone-400 ml-1">الكاميرا:</span>
                <button
                  onClick={() => setCameraMode('chase')}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium ${
                    cameraMode === 'chase'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-stone-900 text-stone-400 hover:text-stone-200'
                  }`}
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>تتبع المركبة</span>
                </button>
                <button
                  onClick={() => setCameraMode('aerial')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium ${
                    cameraMode === 'aerial'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-stone-900 text-stone-400 hover:text-stone-200'
                  }`}
                >
                  منظور جوي
                </button>
                <button
                  onClick={() => setCameraMode('orbit')}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-medium ${
                    cameraMode === 'orbit'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-stone-900 text-stone-400 hover:text-stone-200'
                  }`}
                >
                  حرة (ماوس)
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
