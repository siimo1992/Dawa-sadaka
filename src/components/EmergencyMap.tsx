import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import {
  PhoneCall,
  Navigation,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Shield,
  Cross,
  Plus,
  Compass,
  MapPin,
  ExternalLink,
  Info,
} from 'lucide-react';

export interface EmergencyPoint {
  id: string;
  name: string;
  type: 'rescue' | 'hospital' | 'clinic' | 'security';
  lat: number;
  lng: number;
  address: string;
  phone: string;
  description: string;
  availableHours: string;
}

export const EMERGENCY_POINTS: EmergencyPoint[] = [
  {
    id: 'rescue-main',
    name: 'الوحدة الرئيسية للحماية المدنية - عين صالح',
    type: 'rescue',
    lat: 27.2085,
    lng: 2.455,
    address: 'المدخل الشمالي للمدينة، الطريق الوطني رقم 1 (RN 1)',
    phone: '14',
    description: 'مركز التدخل السريع، الإنقاذ في الطرق الصحراوية، إسعاف حوادث المرور وإطفاء الحرائق.',
    availableHours: '24/24 ساعة - طوال أيام الأسبوع',
  },
  {
    id: 'hospital-main',
    name: 'مستشفى عين صالح العمومي (EPH عين صالح)',
    type: 'hospital',
    lat: 27.191,
    lng: 2.468,
    address: 'وسط المدينة، قرب حي الديس',
    phone: '029731100',
    description: 'المستشفى المركزي بالولاية، مصلحة الاستعجالات الطبية الجراحية، بنك الدم، والإنعاش.',
    availableHours: 'مصلحة الاستعجالات 24/24 ساعة',
  },
  {
    id: 'clinic-salam',
    name: 'العيادة متعددة الخدمات "حي السلام"',
    type: 'clinic',
    lat: 27.184,
    lng: 2.451,
    address: 'حي السلام، عين صالح',
    phone: '029732020',
    description: 'فحوصات طبية استعجالية، خدمات التمريض، والمناوبة الطبية النهارية.',
    availableHours: '08:00 - 20:00 (مناوبة نهارية)',
  },
  {
    id: 'rescue-foggaret',
    name: 'وحدة التدخل للحماية المدنية - فقارة الزوى',
    type: 'rescue',
    lat: 27.155,
    lng: 2.532,
    address: 'بلدية فقارة الزوى (شرق عين صالح)',
    phone: '14',
    description: 'نقطة إسناد متقدمة لمراقبة مسالك الكثبان الرملية والواحات الشرقية.',
    availableHours: '24/24 ساعة',
  },
  {
    id: 'rescue-south-rn1',
    name: 'مركز الإسعاف المتقدم - طريق تمنراست (RN 1)',
    type: 'rescue',
    lat: 27.11,
    lng: 2.475,
    address: 'المخرج الجنوبي باتجاه أراك وتمنراست',
    phone: '14',
    description: 'موقع إسناد استراتيجي لإسعاف المسافرين والتائهين على مسار الصحراء الكبرى.',
    availableHours: '24/24 ساعة',
  },
  {
    id: 'gendarmerie-main',
    name: 'مقر كتيبة الدرك الوطني - عين صالح',
    type: 'security',
    lat: 27.202,
    lng: 2.449,
    address: 'محاذاة الطريق الوطني رقم 1',
    phone: '1055',
    description: 'تأمين شبكة الطرق الصحراوية، التدخل الأمني، والمساعدة في عمليات البحث.',
    availableHours: '24/24 ساعة',
  },
];

// Helper to calculate approximate distance in km (Haversine formula)
function getDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

interface EmergencyMapProps {
  userLocation?: { lat: number; lng: number } | null;
  lang?: 'ar' | 'en' | 'fr';
}

export const EmergencyMap: React.FC<EmergencyMapProps> = ({ userLocation, lang = 'ar' }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<EmergencyPoint | null>(
    EMERGENCY_POINTS[0]
  );
  const [filterType, setFilterType] = useState<'all' | 'rescue' | 'health'>('all');
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  const t = {
    ar: {
      title: 'خريطة مراكز الطوارئ والمستشفيات (D3 التفاعلية)',
      subtitle: 'تحديد مواقع الحماية المدنية، المستشفيات، ونقاط الإسعاف في عين صالح',
      all: 'الكل',
      rescue: '🚒 الحماية (14)',
      health: '🏥 الصحة',
      zoomIn: 'تكبير',
      zoomOut: 'تصغير',
      reset: 'إعادة ضبط المشهد',
      legendRescue: 'الحماية المدنية (14)',
      legendHealth: 'مستشفى / عيادة صحية',
      legendRoad: 'الطريق الوطني رقم 1 (RN 1)',
      yourLocation: 'موقعك الآن',
      distanceAway: 'تبعد عنك:',
      km: 'كم',
      call: 'اتصال',
      openMaps: 'فتح في الخرائط',
    },
    en: {
      title: 'Emergency Centers & Hospitals Map (Interactive D3)',
      subtitle: 'Locations of Civil Protection, regional hospitals, and clinics in In Salah',
      all: 'All',
      rescue: '🚒 Civil Prot. (14)',
      health: '🏥 Health',
      zoomIn: 'Zoom In',
      zoomOut: 'Zoom Out',
      reset: 'Reset View',
      legendRescue: 'Civil Protection (14)',
      legendHealth: 'Hospital / Clinic',
      legendRoad: 'National Route 1 (RN 1)',
      yourLocation: 'Your Location',
      distanceAway: 'Distance:',
      km: 'km',
      call: 'Call',
      openMaps: 'Open in Maps',
    },
    fr: {
      title: 'Carte des centres d\'urgence et hôpitaux (D3 Interactif)',
      subtitle: 'Emplacements de la Protection Civile, hôpitaux et cliniques à In Salah',
      all: 'Tous',
      rescue: '🚒 Protection (14)',
      health: '🏥 Santé',
      zoomIn: 'Zoom avant',
      zoomOut: 'Zoom arrière',
      reset: 'Réinitialiser la vue',
      legendRescue: 'Protection Civile (14)',
      legendHealth: 'Hôpital / Clinique',
      legendRoad: 'Route Nationale 1 (RN 1)',
      yourLocation: 'Votre position',
      distanceAway: 'Distance :',
      km: 'km',
      call: 'Appeler',
      openMaps: 'Ouvrir dans Maps',
    },
  }[lang];

  const filteredPoints = EMERGENCY_POINTS.filter((p) => {
    if (filterType === 'rescue') return p.type === 'rescue';
    if (filterType === 'health') return p.type === 'hospital' || p.type === 'clinic';
    return true;
  });

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const width = containerRef.current.clientWidth || 550;
    const height = 360;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Map projection centered tightly around In Salah & surroundings
    const centerLng = 2.475;
    const centerLat = 27.185;
    const scale = width * 180; // Precise zoom scale for city & nearby oasis

    const projection = d3
      .geoMercator()
      .center([centerLng, centerLat])
      .scale(scale)
      .translate([width / 2, height / 2]);

    // Zoom container
    const g = svg.append('g').attr('class', 'map-viewport');

    // Setup D3 Zoom & Pan
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.7, 5])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);
    zoomBehaviorRef.current = zoom;

    // 1. Draw Desert Background Grids
    const defs = svg.append('defs');

    // Radial gradient for radar pulse
    const pulseGrad = defs
      .append('radialGradient')
      .attr('id', 'radarPulse')
      .attr('cx', '50%')
      .attr('cy', '50%')
      .attr('r', '50%');
    pulseGrad.append('stop').attr('offset', '0%').attr('stop-color', '#B3402A').attr('stop-opacity', 0.6);
    pulseGrad.append('stop').attr('offset', '100%').attr('stop-color', '#B3402A').attr('stop-opacity', 0);

    // Oasis Palm Grove polygon coordinates (In Salah Oasis Belt)
    const oasisCoords: [number, number][] = [
      [2.455, 27.205],
      [2.475, 27.195],
      [2.482, 27.182],
      [2.47, 27.175],
      [2.452, 27.18],
      [2.448, 27.195],
    ];

    const oasisPathData = oasisCoords
      .map((c, i) => {
        const p = projection(c) || [0, 0];
        return `${i === 0 ? 'M' : 'L'}${p[0]},${p[1]}`;
      })
      .join(' ') + 'Z';

    // Draw Oasis green belt
    g.append('path')
      .attr('d', oasisPathData)
      .attr('fill', '#2F5D50')
      .attr('fill-opacity', 0.15)
      .attr('stroke', '#2F5D50')
      .attr('stroke-opacity', 0.3)
      .attr('stroke-width', 1.5)
      .attr('stroke-dasharray', '4 2');

    g.append('text')
      .attr('x', (projection([2.465, 27.188]) || [0, 0])[0])
      .attr('y', (projection([2.465, 27.188]) || [0, 0])[1])
      .attr('text-anchor', 'middle')
      .attr('fill', '#2F5D50')
      .attr('font-size', '10px')
      .attr('font-weight', '600')
      .attr('opacity', 0.7)
      .text('واحة نخيل عين صالح');

    // 2. Draw Major Saharan Highway Axes
    // Route Nationale 1 (RN 1): North-South axis
    const rn1Coords: [number, number][] = [
      [2.448, 27.235], // From North (El Menia / Ghardaia)
      [2.455, 27.208],
      [2.462, 27.192], // City center
      [2.475, 27.14],
      [2.478, 27.09], // South towards Arak / Tamanrasset
    ];

    const rn1Line = d3
      .line<[number, number]>()
      .x((d) => projection(d)?.[0] || 0)
      .y((d) => projection(d)?.[1] || 0)
      .curve(d3.curveCatmullRom.alpha(0.5));

    // Road shadow/casing
    g.append('path')
      .datum(rn1Coords)
      .attr('d', rn1Line)
      .attr('fill', 'none')
      .attr('stroke', 'var(--line)')
      .attr('stroke-width', 6);

    // Highway core
    g.append('path')
      .datum(rn1Coords)
      .attr('d', rn1Line)
      .attr('fill', 'none')
      .attr('stroke', '#C9922E')
      .attr('stroke-width', 2.5)
      .attr('stroke-dasharray', '6 3');

    // Highway Label RN 1
    const rn1LabelPos = projection([2.45, 27.225]) || [0, 0];
    g.append('text')
      .attr('x', rn1LabelPos[0] + 8)
      .attr('y', rn1LabelPos[1])
      .attr('fill', '#C9922E')
      .attr('font-size', '9px')
      .attr('font-weight', 'bold')
      .text('الطريق الوطني رقم 1 (RN 1)');

    // Route Nationale 52 (RN 52): West towards In Ghar & Adrar
    const rn52Coords: [number, number][] = [
      [2.462, 27.192],
      [2.44, 27.188],
      [2.405, 27.182],
      [2.36, 27.175], // West to In-Ghar
    ];

    g.append('path')
      .datum(rn52Coords)
      .attr('d', rn1Line)
      .attr('fill', 'none')
      .attr('stroke', 'var(--line)')
      .attr('stroke-width', 4);

    g.append('path')
      .datum(rn52Coords)
      .attr('d', rn1Line)
      .attr('fill', 'none')
      .attr('stroke', '#C9922E')
      .attr('stroke-width', 2);

    // 3. User Current Location Pin (if provided)
    if (userLocation) {
      const userCoord = projection([userLocation.lng, userLocation.lat]);
      if (userCoord) {
        // Pulsing ring
        g.append('circle')
          .attr('cx', userCoord[0])
          .attr('cy', userCoord[1])
          .attr('r', 16)
          .attr('fill', '#3B82F6')
          .attr('fill-opacity', 0.25)
          .append('animate')
          .attr('attributeName', 'r')
          .attr('values', '8;22;8')
          .attr('dur', '2s')
          .attr('repeatCount', 'indefinite');

        // User center dot
        g.append('circle')
          .attr('cx', userCoord[0])
          .attr('cy', userCoord[1])
          .attr('r', 6)
          .attr('fill', '#3B82F6')
          .attr('stroke', '#ffffff')
          .attr('stroke-width', 2);

        // Label
        g.append('text')
          .attr('x', userCoord[0])
          .attr('y', userCoord[1] - 12)
          .attr('text-anchor', 'middle')
          .attr('fill', '#3B82F6')
          .attr('font-size', '10px')
          .attr('font-weight', 'bold')
          .text('موقعك الآن');
      }
    }

    // 4. Render Emergency Points
    filteredPoints.forEach((point) => {
      const coord = projection([point.lng, point.lat]);
      if (!coord) return;

      const isSelected = selectedPoint?.id === point.id;
      const isRescue = point.type === 'rescue';
      const isHealth = point.type === 'hospital' || point.type === 'clinic';
      const markerColor = isRescue ? '#B3402A' : isHealth ? '#2F5D50' : '#C9922E';

      const pointGroup = g
        .append('g')
        .attr('class', 'emergency-marker cursor-pointer')
        .on('click', () => setSelectedPoint(point));

      // Radar ping for Protection Civile / Hospital
      if (isRescue || isHealth) {
        pointGroup
          .append('circle')
          .attr('cx', coord[0])
          .attr('cy', coord[1])
          .attr('r', isSelected ? 20 : 14)
          .attr('fill', markerColor)
          .attr('fill-opacity', isSelected ? 0.35 : 0.18)
          .append('animate')
          .attr('attributeName', 'r')
          .attr('values', `${isSelected ? 16 : 10};${isSelected ? 26 : 18};${isSelected ? 16 : 10}`)
          .attr('dur', '2.5s')
          .attr('repeatCount', 'indefinite');
      }

      // Marker Outer Ring
      pointGroup
        .append('circle')
        .attr('cx', coord[0])
        .attr('cy', coord[1])
        .attr('r', isSelected ? 12 : 9)
        .attr('fill', markerColor)
        .attr('stroke', '#ffffff')
        .attr('stroke-width', isSelected ? 2.5 : 1.5)
        .attr('filter', 'drop-shadow(0px 2px 4px rgba(0,0,0,0.3))');

      // Inner Symbol / Emoji text
      pointGroup
        .append('text')
        .attr('x', coord[0])
        .attr('y', coord[1] + 3.5)
        .attr('text-anchor', 'middle')
        .attr('font-size', isSelected ? '10px' : '8px')
        .attr('fill', '#ffffff')
        .attr('font-weight', 'bold')
        .attr('pointer-events', 'none')
        .text(isRescue ? '14' : isHealth ? '+' : '🛡️');

      // Permanent Marker Label (below icon)
      pointGroup
        .append('text')
        .attr('x', coord[0])
        .attr('y', coord[1] + (isSelected ? 20 : 16))
        .attr('text-anchor', 'middle')
        .attr('fill', 'var(--ink)')
        .attr('font-size', isSelected ? '10px' : '8.5px')
        .attr('font-weight', isSelected ? 'bold' : '600')
        .attr('stroke', 'var(--card)')
        .attr('stroke-width', 2.5)
        .attr('paint-order', 'stroke')
        .text(point.name.split('-')[0].replace('الوحدة الرئيسية للحماية المدنية', 'الحماية المدنية'));
    });
  }, [filteredPoints, selectedPoint, userLocation]);

  const handleZoomIn = () => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    d3.select(svgRef.current).transition().duration(300).call(zoomBehaviorRef.current.scaleBy, 1.3);
  };

  const handleZoomOut = () => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    d3.select(svgRef.current).transition().duration(300).call(zoomBehaviorRef.current.scaleBy, 0.7);
  };

  const handleResetZoom = () => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    d3.select(svgRef.current).transition().duration(400).call(zoomBehaviorRef.current.transform, d3.zoomIdentity);
  };

  return (
    <div className="bg-[var(--card)] border border-[var(--line)] rounded-2xl p-4 space-y-3.5 shadow-sm">
      {/* Header with Title and Filter Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-[var(--line)]">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[var(--bad)]/15 text-[var(--bad)] flex items-center justify-center">
            <Compass className="w-4 h-4 animate-spin-slow" />
          </div>
          <div>
            <b className="text-sm text-[var(--ink)] block">
              {t.title}
            </b>
            <p className="text-[11px] text-[var(--mute)] m-0">
              {t.subtitle}
            </p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 bg-[var(--bg)] p-1 rounded-xl border border-[var(--line)] self-start sm:self-auto">
          <button
            onClick={() => setFilterType('all')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              filterType === 'all'
                ? 'bg-[var(--green)] text-[var(--on)]'
                : 'text-[var(--mute)] hover:text-[var(--ink)]'
            }`}
          >
            {t.all} ({EMERGENCY_POINTS.length})
          </button>
          <button
            onClick={() => setFilterType('rescue')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
              filterType === 'rescue'
                ? 'bg-[var(--bad)] text-[var(--on)]'
                : 'text-[var(--mute)] hover:text-[var(--ink)]'
            }`}
          >
            <span>{t.rescue}</span>
          </button>
          <button
            onClick={() => setFilterType('health')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1 ${
              filterType === 'health'
                ? 'bg-[var(--green)] text-[var(--on)]'
                : 'text-[var(--mute)] hover:text-[var(--ink)]'
            }`}
          >
            <span>{t.health}</span>
          </button>
        </div>
      </div>

      {/* D3 Map Canvas Container */}
      <div
        ref={containerRef}
        className="relative w-full h-[360px] rounded-xl overflow-hidden border border-[var(--line)] bg-[var(--bg)] select-none"
      >
        <svg
          ref={svgRef}
          className="w-full h-full cursor-grab active:cursor-grabbing"
          style={{ touchAction: 'none' }}
        />

        {/* Floating Zoom & Controls Box */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
          <button
            onClick={handleZoomIn}
            className="w-8 h-8 rounded-lg bg-[var(--card)]/90 backdrop-blur-sm border border-[var(--line)] text-[var(--ink)] hover:bg-[var(--card)] flex items-center justify-center shadow-sm cursor-pointer"
            title={t.zoomIn}
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomOut}
            className="w-8 h-8 rounded-lg bg-[var(--card)]/90 backdrop-blur-sm border border-[var(--line)] text-[var(--ink)] hover:bg-[var(--card)] flex items-center justify-center shadow-sm cursor-pointer"
            title={t.zoomOut}
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={handleResetZoom}
            className="w-8 h-8 rounded-lg bg-[var(--card)]/90 backdrop-blur-sm border border-[var(--line)] text-[var(--ink)] hover:bg-[var(--card)] flex items-center justify-center shadow-sm cursor-pointer"
            title={t.reset}
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Map Legend Overlay */}
        <div className="absolute bottom-2.5 right-2.5 bg-[var(--card)]/90 backdrop-blur-sm border border-[var(--line)] px-2.5 py-1.5 rounded-lg text-[10px] space-y-1 shadow-sm pointer-events-none">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#B3402A]" />
            <span className="font-semibold text-[var(--ink)]">{t.legendRescue}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#2F5D50]" />
            <span className="font-semibold text-[var(--ink)]">{t.legendHealth}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#C9922E]" />
            <span className="font-semibold text-[var(--ink)]">{t.legendRoad}</span>
          </div>
        </div>
      </div>

      {/* Selected Point Detail Card */}
      {selectedPoint && (
        <div className="p-3.5 rounded-xl bg-[var(--bg)] border border-[var(--line)] space-y-2.5 animate-in fade-in">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2">
              <span className="text-xl">
                {selectedPoint.type === 'rescue'
                  ? '🚒'
                  : selectedPoint.type === 'hospital'
                  ? '🏥'
                  : selectedPoint.type === 'clinic'
                  ? '🩺'
                  : '🛡️'}
              </span>
              <div>
                <h4 className="text-xs font-bold text-[var(--ink)] m-0 leading-snug">
                  {selectedPoint.name}
                </h4>
                <p className="text-[11px] text-[var(--mute)] m-0 mt-0.5">{selectedPoint.address}</p>
              </div>
            </div>

            {/* Distance badge if user location available */}
            {userLocation && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--green)]/15 text-[var(--green)] border border-[var(--green)]/30 shrink-0">
                {t.distanceAway} {getDistanceKm(userLocation.lat, userLocation.lng, selectedPoint.lat, selectedPoint.lng)} {t.km}
              </span>
            )}
          </div>

          <p className="text-xs text-[var(--ink)] leading-relaxed m-0 bg-[var(--card)] p-2 rounded-lg border border-[var(--line)]/60">
            {selectedPoint.description}
          </p>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-1.5 text-[11px] text-[var(--mute)]">
              <Info className="w-3.5 h-3.5 text-[var(--green)]" />
              <span>{selectedPoint.availableHours}</span>
            </div>

            <div className="flex items-center gap-2">
              {/* Direct Emergency Call */}
              <a
                href={`tel:${selectedPoint.phone}`}
                className="bg-[var(--bad)] text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm hover:opacity-90"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                <span>{t.call} ({selectedPoint.phone})</span>
              </a>

              {/* Open in Google Maps */}
              <a
                href={`https://maps.google.com/?q=${selectedPoint.lat},${selectedPoint.lng}`}
                target="_blank"
                rel="noreferrer"
                className="border border-[var(--line)] bg-[var(--card)] text-[var(--ink)] px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 hover:border-[var(--green)]"
              >
                <ExternalLink className="w-3.5 h-3.5 text-[var(--green)]" />
                <span>{t.openMaps}</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
