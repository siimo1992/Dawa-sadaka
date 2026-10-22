import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
  InfoWindow,
} from '@vis.gl/react-google-maps';
import {
  MapPin,
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  Calendar,
  Layers,
  Compass,
  Phone,
  Search,
  RefreshCw,
  ExternalLink,
  AlertCircle,
  ListTodo,
  Sparkles,
  Share2,
} from 'lucide-react';
import type { User } from 'firebase/auth';
import {
  signInWithGooglePopup,
  signOutUser,
  getCachedGoogleAccessToken,
} from '../services/firebaseService.ts';
import {
  fetchGoogleTasks,
  createGoogleTask,
  updateGoogleTaskStatus,
  deleteGoogleTask,
  type GoogleTaskItem,
} from '../services/googleTasksService.ts';

export interface OasisPlace {
  id: number;
  name: string;
  nameAr: string;
  category: string;
  lat: string;
  lng: string;
  description?: string | null;
  phone?: string | null;
}

export interface CloudSqlTask {
  id: number;
  title: string;
  notes?: string | null;
  status: string;
  dueDate?: string | null;
  locationName?: string | null;
  category?: string | null;
  googleTaskId?: string | null;
  createdAt?: string;
}

interface OasisMapAndTasksPageProps {
  firebaseUser: User | null;
}

const DEFAULT_MAP_CENTER = { lat: 27.1975, lng: 2.4835 }; // In Salah Center

const CATEGORY_COLORS: Record<string, { bg: string; text: string; pinBg: string; label: string }> = {
  all: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', pinBg: '#10B981', label: 'الكل' },
  health: { bg: 'bg-red-500/10', text: 'text-red-400', pinBg: '#EF4444', label: 'صحة وطوارئ' },
  heritage: { bg: 'bg-amber-500/10', text: 'text-amber-400', pinBg: '#F59E0B', label: 'معالم وتراث' },
  oasis: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', pinBg: '#059669', label: 'بساتين وفقارات' },
  public_service: { bg: 'bg-blue-500/10', text: 'text-blue-400', pinBg: '#3B82F6', label: 'مرافق وخدمات' },
  weather: { bg: 'bg-sky-500/10', text: 'text-sky-400', pinBg: '#0284C7', label: 'رصد المناخ' },
  market: { bg: 'bg-purple-500/10', text: 'text-purple-400', pinBg: '#8B5CF6', label: 'أسواق وتمور' },
};

export const OasisMapAndTasksPage: React.FC<OasisMapAndTasksPageProps> = ({ firebaseUser }) => {
  // Maps API Key state
  const [apiKey, setApiKey] = useState<string>(
    import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyCllkJGcequpdYXfB5Eg6Qyu5ZEUqfCsRk'
  );

  // Map state
  const [places, setPlaces] = useState<OasisPlace[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<OasisPlace | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [mapType, setMapType] = useState<'roadmap' | 'satellite' | 'hybrid'>('roadmap');
  const [mapCenter, setMapCenter] = useState(DEFAULT_MAP_CENTER);
  const [mapZoom, setMapZoom] = useState(13);

  // Tasks state (Google Tasks + Cloud SQL)
  const [activeTab, setActiveTab] = useState<'map' | 'tasks'>('map');
  const [tasks, setTasks] = useState<CloudSqlTask[]>([]);
  const [googleTasks, setGoogleTasks] = useState<GoogleTaskItem[]>([]);
  const [isTasksLoading, setIsTasksLoading] = useState(false);
  const [tasksError, setTasksError] = useState<string | null>(null);
  const [hasGoogleTasksAccess, setHasGoogleTasksAccess] = useState(false);

  // New task form state
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [newLocationName, setNewLocationName] = useState('');
  const [syncWithGoogleTasks, setSyncWithGoogleTasks] = useState(true);
  const [isSubmittingTask, setIsSubmittingTask] = useState(false);

  // Confirm delete modal state
  const [taskToDelete, setTaskToDelete] = useState<{ id: string | number; title: string; isGoogle: boolean } | null>(null);

  // Load Maps API Key from server if env var is empty
  useEffect(() => {
    fetch('/api/maps/config')
      .then((res) => res.json())
      .then((data) => {
        if (data.apiKey) {
          setApiKey(data.apiKey);
        }
      })
      .catch((err) => console.warn('Could not fetch maps config:', err));
  }, []);

  // Load places from Cloud SQL
  const loadPlaces = useCallback(async () => {
    try {
      const res = await fetch('/api/oasis-places');
      const data = await res.json();
      if (data.success && Array.isArray(data.places)) {
        setPlaces(data.places);
      }
    } catch (err) {
      console.warn('Failed to load places from Cloud SQL:', err);
    }
  }, []);

  // Load Cloud SQL community tasks
  const loadCloudSqlTasks = useCallback(async () => {
    try {
      const res = await fetch('/api/community-tasks');
      const data = await res.json();
      if (data.success && Array.isArray(data.tasks)) {
        setTasks(data.tasks);
      }
    } catch (err) {
      console.warn('Failed to load Cloud SQL tasks:', err);
    }
  }, []);

  // Load Google Tasks
  const loadGoogleTasksList = useCallback(async () => {
    const token = getCachedGoogleAccessToken();
    if (!token) {
      setHasGoogleTasksAccess(false);
      return;
    }
    setIsTasksLoading(true);
    setTasksError(null);
    try {
      const gTasks = await fetchGoogleTasks(token);
      setGoogleTasks(gTasks);
      setHasGoogleTasksAccess(true);
    } catch (err: any) {
      console.warn('Failed to fetch from Google Tasks:', err);
      setHasGoogleTasksAccess(false);
      setTasksError('يتطلب الوصول إلى Google Tasks تسجيل الدخول مع منح الإذن');
    } finally {
      setIsTasksLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlaces();
    loadCloudSqlTasks();
  }, [loadPlaces, loadCloudSqlTasks]);

  useEffect(() => {
    if (firebaseUser) {
      loadGoogleTasksList();
    } else {
      setHasGoogleTasksAccess(false);
      setGoogleTasks([]);
    }
  }, [firebaseUser, loadGoogleTasksList]);

  // Handle Google Sign-in to get Tasks OAuth token
  const handleConnectGoogle = async () => {
    try {
      await signInWithGooglePopup();
      await loadGoogleTasksList();
    } catch (err: any) {
      console.error('Sign-in failed:', err);
      setTasksError('فشل تسجيل الدخول أو تم إلغاؤه من المستخدم.');
    }
  };

  // Filter places
  const filteredPlaces = useMemo(() => {
    return places.filter((p) => {
      const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
      const matchesSearch =
        searchQuery.trim() === '' ||
        p.nameAr.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCategory && matchesSearch;
    });
  }, [places, selectedCategory, searchQuery]);

  // Create Task Handler
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setIsSubmittingTask(true);
    setTasksError(null);

    let googleTaskId: string | null = null;
    const token = getCachedGoogleAccessToken();

    // 1. Optionally sync with Google Tasks
    if (syncWithGoogleTasks && token) {
      try {
        const createdGTask = await createGoogleTask(token, {
          title: newTitle.trim(),
          notes: newNotes.trim() + (newLocationName ? ` [الموقع: ${newLocationName}]` : ''),
          due: newDueDate ? new Date(newDueDate).toISOString() : undefined,
        });
        googleTaskId = createdGTask.id;
      } catch (err) {
        console.warn('Google Tasks creation failed, continuing with Cloud SQL:', err);
      }
    }

    // 2. Persist in Cloud SQL PostgreSQL
    try {
      const res = await fetch('/api/community-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle.trim(),
          notes: newNotes.trim() || null,
          status: 'needsAction',
          dueDate: newDueDate || null,
          locationName: newLocationName || null,
          category: 'community',
          googleTaskId,
        }),
      });
      const data = await res.json();
      if (data.success) {
        await loadCloudSqlTasks();
        if (token) {
          await loadGoogleTasksList();
        }
        setShowNewTaskModal(false);
        setNewTitle('');
        setNewNotes('');
        setNewDueDate('');
        setNewLocationName('');
      } else {
        setTasksError(data.error || 'تعذر حفظ المهمة في Cloud SQL');
      }
    } catch (err: any) {
      setTasksError('حدث خطأ أثناء حفظ المهمة في قاعدة البيانات');
    } finally {
      setIsSubmittingTask(false);
    }
  };

  // Toggle Task Completion
  const handleToggleTaskStatus = async (task: CloudSqlTask) => {
    const newStatus = task.status === 'completed' ? 'needsAction' : 'completed';
    // Update Cloud SQL
    try {
      await fetch(`/api/community-tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      await loadCloudSqlTasks();
    } catch (err) {
      console.warn('Failed to update Cloud SQL task status:', err);
    }

    // Update Google Tasks if linked
    const token = getCachedGoogleAccessToken();
    if (token && task.googleTaskId) {
      try {
        await updateGoogleTaskStatus(token, task.googleTaskId, newStatus as any);
        await loadGoogleTasksList();
      } catch (err) {
        console.warn('Failed to update Google Task status:', err);
      }
    }
  };

  // Toggle Direct Google Task status
  const handleToggleGoogleTask = async (gtask: GoogleTaskItem) => {
    const token = getCachedGoogleAccessToken();
    if (!token) return;
    const nextStatus = gtask.status === 'completed' ? 'needsAction' : 'completed';
    try {
      await updateGoogleTaskStatus(token, gtask.id, nextStatus);
      await loadGoogleTasksList();
    } catch (err) {
      console.error('Failed to toggle Google task:', err);
    }
  };

  // Perform Destructive Delete with mandatory user confirmation
  const handleConfirmDelete = async () => {
    if (!taskToDelete) return;
    const { id, isGoogle } = taskToDelete;
    const token = getCachedGoogleAccessToken();

    try {
      if (isGoogle) {
        if (token) {
          await deleteGoogleTask(token, String(id));
          await loadGoogleTasksList();
        }
      } else {
        await fetch(`/api/community-tasks/${id}`, { method: 'DELETE' });
        await loadCloudSqlTasks();
      }
    } catch (err) {
      console.error('Failed to delete task:', err);
    } finally {
      setTaskToDelete(null);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] w-full bg-[var(--bg)] text-[var(--ink)] overflow-hidden" dir="rtl">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-b border-[var(--line)] bg-[var(--card)]/80 backdrop-blur-md z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Compass className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h1 className="text-base font-bold flex items-center gap-2">
              خريطة عين صالح التفاعلية ومهام الواحة
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 font-normal">
                Google Maps & Tasks + Cloud SQL
              </span>
            </h1>
            <p className="text-xs text-[var(--mute)]">
              استكشاف معالم ومرافق تيديكلت ومزامنة مهام المجتمع مع Google Tasks وقاعدة Cloud SQL
            </p>
          </div>
        </div>

        {/* Tab Switcher & Action Buttons */}
        <div className="flex items-center gap-2">
          <div className="flex bg-[var(--bg)] p-1 rounded-xl border border-[var(--line)]">
            <button
              type="button"
              onClick={() => setActiveTab('map')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'map'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-[var(--mute)] hover:text-[var(--ink)]'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              الخريطة والمعالم ({places.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('tasks')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'tasks'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-[var(--mute)] hover:text-[var(--ink)]'
              }`}
            >
              <ListTodo className="w-3.5 h-3.5" />
              مهام المجتمع و Google Tasks ({tasks.length + googleTasks.length})
            </button>
          </div>

          <button
            type="button"
            onClick={() => setShowNewTaskModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-all shadow-sm shadow-emerald-900/30"
          >
            <Plus className="w-3.5 h-3.5" />
            إضافة مهمة بالواحة
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative">
        {activeTab === 'map' ? (
          /* Google Maps View */
          <div className="flex-1 flex flex-col md:flex-row h-full w-full relative">
            {/* Sidebar with places list & category filters */}
            <div className="w-full md:w-80 border-l border-[var(--line)] bg-[var(--card)] flex flex-col shrink-0 h-full overflow-hidden z-10">
              <div className="p-3 border-b border-[var(--line)] space-y-2">
                <div className="relative">
                  <Search className="w-4 h-4 absolute right-3 top-2.5 text-[var(--mute)]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="بحث في معالم ومرافق عين صالح..."
                    className="w-full pr-9 pl-3 py-1.5 text-xs rounded-xl bg-[var(--bg)] border border-[var(--line)] focus:outline-none focus:border-emerald-500 text-[var(--ink)] placeholder:text-[var(--mute)]"
                  />
                </div>

                {/* Category Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                  {Object.entries(CATEGORY_COLORS).map(([catKey, catInfo]) => (
                    <button
                      key={catKey}
                      type="button"
                      onClick={() => setSelectedCategory(catKey)}
                      className={`text-[11px] px-2.5 py-1 rounded-lg shrink-0 transition-all font-medium ${
                        selectedCategory === catKey
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-[var(--bg)] text-[var(--mute)] hover:text-[var(--ink)] border border-[var(--line)]'
                      }`}
                    >
                      {catInfo.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Places List */}
              <div className="flex-1 overflow-y-auto divide-y divide-[var(--line)] p-2 space-y-1.5">
                {filteredPlaces.length === 0 ? (
                  <div className="text-center py-8 text-xs text-[var(--mute)]">
                    لا توجد معالم مطابقة للبحث في قاعدة البيانات
                  </div>
                ) : (
                  filteredPlaces.map((place) => {
                    const isSelected = selectedPlace?.id === place.id;
                    const catStyle = CATEGORY_COLORS[place.category] || CATEGORY_COLORS.all;
                    return (
                      <div
                        key={place.id}
                        onClick={() => {
                          setSelectedPlace(place);
                          setMapCenter({ lat: parseFloat(place.lat), lng: parseFloat(place.lng) });
                          setMapZoom(15);
                        }}
                        className={`p-2.5 rounded-xl cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-emerald-500/15 border border-emerald-500/30 shadow-xs'
                            : 'hover:bg-[var(--bg)] border border-transparent'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-xs font-bold text-[var(--ink)] leading-snug">{place.nameAr}</h3>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-md font-medium shrink-0 ${catStyle.bg} ${catStyle.text}`}
                          >
                            {catStyle.label}
                          </span>
                        </div>
                        <p className="text-[11px] text-[var(--mute)] mt-1 line-clamp-2 leading-relaxed">
                          {place.description || place.name}
                        </p>
                        {place.phone && (
                          <div className="flex items-center gap-1.5 mt-2 text-[10px] text-emerald-400 font-mono">
                            <Phone className="w-3 h-3" />
                            <span dir="ltr">{place.phone}</span>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Map Type Controls Footer */}
              <div className="p-3 border-t border-[var(--line)] bg-[var(--bg)] flex items-center justify-between text-xs">
                <span className="text-[var(--mute)] text-[11px] flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5" />
                  نوع الخريطة:
                </span>
                <div className="flex gap-1">
                  {(['roadmap', 'satellite', 'hybrid'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setMapType(type)}
                      className={`text-[10px] px-2 py-1 rounded-md transition-all ${
                        mapType === type
                          ? 'bg-emerald-600 text-white'
                          : 'bg-[var(--card)] text-[var(--mute)] hover:text-[var(--ink)] border border-[var(--line)]'
                      }`}
                    >
                      {type === 'roadmap' ? 'شوارع' : type === 'satellite' ? 'قمر صناعي' : 'هجين'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Map Canvas */}
            <div className="flex-1 h-full w-full relative">
              <APIProvider apiKey={apiKey} libraries={['marker', 'places']}>
                <Map
                  mapId="ain_salah_oasis_map"
                  defaultCenter={DEFAULT_MAP_CENTER}
                  center={mapCenter}
                  defaultZoom={13}
                  zoom={mapZoom}
                  onCenterChanged={(e) => setMapCenter(e.detail.center)}
                  onZoomChanged={(e) => setMapZoom(e.detail.zoom)}
                  mapTypeId={mapType}
                  gestureHandling="greedy"
                  disableDefaultUI={false}
                  internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                  className="w-full h-full"
                >
                  {/* Markers for all places */}
                  {filteredPlaces.map((place) => {
                    const lat = parseFloat(place.lat);
                    const lng = parseFloat(place.lng);
                    if (isNaN(lat) || isNaN(lng)) return null;
                    const catStyle = CATEGORY_COLORS[place.category] || CATEGORY_COLORS.all;

                    return (
                      <AdvancedMarker
                        key={place.id}
                        position={{ lat, lng }}
                        title={place.nameAr}
                        onClick={() => setSelectedPlace(place)}
                      >
                        <Pin
                          background={catStyle.pinBg}
                          glyphColor="#FFFFFF"
                          borderColor="#FFFFFF"
                          scale={selectedPlace?.id === place.id ? 1.25 : 1.0}
                        />
                      </AdvancedMarker>
                    );
                  })}

                  {/* InfoWindow for selected place */}
                  {selectedPlace && (
                    <InfoWindow
                      position={{
                        lat: parseFloat(selectedPlace.lat),
                        lng: parseFloat(selectedPlace.lng),
                      }}
                      onCloseClick={() => setSelectedPlace(null)}
                    >
                      <div className="p-1 max-w-xs text-right font-sans" dir="rtl">
                        <span className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider">
                          {CATEGORY_COLORS[selectedPlace.category]?.label || 'معلم'}
                        </span>
                        <h4 className="text-sm font-bold text-gray-900 mt-0.5">{selectedPlace.nameAr}</h4>
                        <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                          {selectedPlace.description || selectedPlace.name}
                        </p>
                        {selectedPlace.phone && (
                          <p className="text-xs text-emerald-700 font-mono mt-1.5 flex items-center gap-1 justify-end">
                            <span dir="ltr">{selectedPlace.phone}</span>
                            <Phone className="w-3 h-3" />
                          </p>
                        )}
                        <div className="mt-2 pt-2 border-t border-gray-200 flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setNewLocationName(selectedPlace.nameAr);
                              setNewTitle(`مهمة في: ${selectedPlace.nameAr}`);
                              setShowNewTaskModal(true);
                            }}
                            className="text-[10px] px-2 py-1 rounded bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors"
                          >
                            + إضافة مهمة هنا
                          </button>
                          <a
                            href={`https://www.google.com/maps/dir/?api=1&destination=${selectedPlace.lat},${selectedPlace.lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5"
                          >
                            الاتجاهات <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        </div>
                      </div>
                    </InfoWindow>
                  )}
                </Map>
              </APIProvider>
            </div>
          </div>
        ) : (
          /* Tasks View (Google Tasks + Cloud SQL Community Tasks) */
          <div className="flex-1 flex flex-col md:flex-row h-full w-full overflow-hidden">
            {/* Left Column: Cloud SQL Community Tasks */}
            <div className="flex-1 flex flex-col border-l border-[var(--line)] bg-[var(--card)] p-4 overflow-hidden">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--line)]">
                <div>
                  <h2 className="text-sm font-bold flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-400" />
                    مهام واحة ومجتمع عين صالح (Cloud SQL)
                  </h2>
                  <p className="text-xs text-[var(--mute)]">
                    مهام مجدولة مخزنة في قاعدة بيانات PostgreSQL Cloud SQL
                  </p>
                </div>
                <button
                  type="button"
                  onClick={loadCloudSqlTasks}
                  className="p-1.5 rounded-lg border border-[var(--line)] hover:bg-[var(--bg)] text-[var(--mute)] hover:text-[var(--ink)]"
                  title="تحديث"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Task list */}
              <div className="flex-1 overflow-y-auto pt-3 space-y-2">
                {tasks.length === 0 ? (
                  <div className="text-center py-12 text-xs text-[var(--mute)] border border-dashed border-[var(--line)] rounded-2xl">
                    لا توجد مهام مسجلة حالياً في Cloud SQL. اضغط «إضافة مهمة بالواحة» بالأعلى لإنشاء أول مهمة!
                  </div>
                ) : (
                  tasks.map((task) => {
                    const isDone = task.status === 'completed';
                    return (
                      <div
                        key={task.id}
                        className={`p-3 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                          isDone
                            ? 'bg-[var(--bg)]/50 border-[var(--line)] opacity-70'
                            : 'bg-[var(--bg)] border-[var(--line)] hover:border-emerald-500/40 shadow-xs'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => handleToggleTaskStatus(task)}
                          className="mt-0.5 text-[var(--mute)] hover:text-emerald-400 transition-colors shrink-0"
                        >
                          {isDone ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                          ) : (
                            <Circle className="w-5 h-5" />
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <h4
                            className={`text-xs font-semibold leading-relaxed ${
                              isDone ? 'line-through text-[var(--mute)]' : 'text-[var(--ink)]'
                            }`}
                          >
                            {task.title}
                          </h4>
                          {task.notes && (
                            <p className="text-[11px] text-[var(--mute)] mt-0.5 leading-normal">{task.notes}</p>
                          )}
                          <div className="flex flex-wrap items-center gap-2 mt-2 text-[10px] text-[var(--mute)]">
                            {task.locationName && (
                              <span className="flex items-center gap-1 text-emerald-400">
                                <MapPin className="w-3 h-3" />
                                {task.locationName}
                              </span>
                            )}
                            {task.dueDate && (
                              <span className="flex items-center gap-1 text-amber-400">
                                <Calendar className="w-3 h-3" />
                                {new Date(task.dueDate).toLocaleDateString('ar-DZ')}
                              </span>
                            )}
                            {task.googleTaskId && (
                              <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                متزامنة مع Google Tasks
                              </span>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            setTaskToDelete({ id: task.id, title: task.title, isGoogle: false })
                          }
                          className="p-1 rounded-lg hover:bg-red-500/10 text-[var(--mute)] hover:text-red-400 transition-colors"
                          title="حذف المهمة"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Column: Google Tasks Live Sync */}
            <div className="flex-1 flex flex-col bg-[var(--bg)] p-4 overflow-hidden">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--line)]">
                <div>
                  <h2 className="text-sm font-bold flex items-center gap-2">
                    <ListTodo className="w-4 h-4 text-blue-400" />
                    حساب Google Tasks الشخصي
                  </h2>
                  <p className="text-xs text-[var(--mute)]">
                    مزامنة حية ومباشرة مع قوائم مهام حساب Google للمستخدم
                  </p>
                </div>

                {hasGoogleTasksAccess && (
                  <button
                    type="button"
                    onClick={loadGoogleTasksList}
                    disabled={isTasksLoading}
                    className="p-1.5 rounded-lg border border-[var(--line)] hover:bg-[var(--card)] text-[var(--mute)] hover:text-[var(--ink)] disabled:opacity-50"
                    title="تحديث Google Tasks"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isTasksLoading ? 'animate-spin' : ''}`} />
                  </button>
                )}
              </div>

              {/* Content / Auth State */}
              <div className="flex-1 overflow-y-auto pt-3">
                {!firebaseUser || !hasGoogleTasksAccess ? (
                  <div className="p-6 text-center border border-dashed border-[var(--line)] rounded-2xl bg-[var(--card)] my-auto space-y-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mx-auto">
                      <ListTodo className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold">ربط حساب Google Tasks</h3>
                      <p className="text-xs text-[var(--mute)] mt-1 max-w-sm mx-auto leading-relaxed">
                        قم بتسجيل الدخول بحساب Google لمنح التطبيق الإذن بمزامنة وعرض مهامك مباشرة مع مهام واحة عين صالح.
                      </p>
                    </div>

                    {/* Standard GSI Material Sign-in Button */}
                    <button
                      type="button"
                      onClick={handleConnectGoogle}
                      className="inline-flex items-center gap-3 px-5 py-2.5 rounded-xl border border-[var(--line)] bg-[var(--bg)] hover:bg-[var(--card)] text-xs font-semibold shadow-xs transition-all hover:border-emerald-500/40"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 48 48">
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
                      </svg>
                      تسجيل الدخول مع Google للمزامنة
                    </button>

                    {tasksError && (
                      <p className="text-xs text-red-400 flex items-center gap-1 justify-center mt-2">
                        <AlertCircle className="w-3.5 h-3.5" />
                        {tasksError}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {googleTasks.length === 0 ? (
                      <div className="text-center py-8 text-xs text-[var(--mute)]">
                        قائمة Google Tasks فارغة. أنشئ مهمة جديدة وسيتم رفعها تلقائياً!
                      </div>
                    ) : (
                      googleTasks.map((gtask) => {
                        const isDone = gtask.status === 'completed';
                        return (
                          <div
                            key={gtask.id}
                            className={`p-3 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                              isDone
                                ? 'bg-[var(--card)]/40 border-[var(--line)] opacity-60'
                                : 'bg-[var(--card)] border-[var(--line)] hover:border-blue-500/40 shadow-xs'
                            }`}
                          >
                            <button
                              type="button"
                              onClick={() => handleToggleGoogleTask(gtask)}
                              className="mt-0.5 text-[var(--mute)] hover:text-blue-400 transition-colors shrink-0"
                            >
                              {isDone ? (
                                <CheckCircle2 className="w-5 h-5 text-blue-400" />
                              ) : (
                                <Circle className="w-5 h-5" />
                              )}
                            </button>
                            <div className="flex-1 min-w-0">
                              <h4
                                className={`text-xs font-semibold leading-relaxed ${
                                  isDone ? 'line-through text-[var(--mute)]' : 'text-[var(--ink)]'
                                }`}
                              >
                                {gtask.title}
                              </h4>
                              {gtask.notes && (
                                <p className="text-[11px] text-[var(--mute)] mt-0.5 leading-normal">
                                  {gtask.notes}
                                </p>
                              )}
                              {gtask.due && (
                                <p className="text-[10px] text-amber-400 flex items-center gap-1 mt-1">
                                  <Calendar className="w-3 h-3" />
                                  {new Date(gtask.due).toLocaleDateString('ar-DZ')}
                                </p>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                setTaskToDelete({ id: gtask.id, title: gtask.title, isGoogle: true })
                              }
                              className="p-1 rounded-lg hover:bg-red-500/10 text-[var(--mute)] hover:text-red-400 transition-colors"
                              title="حذف من Google Tasks"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* New Task Modal */}
      {showNewTaskModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md bg-[var(--card)] border border-[var(--line)] rounded-2xl shadow-xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--line)]">
              <h3 className="text-sm font-bold flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-400" />
                إضافة مهمة جديدة بالواحة
              </h3>
              <button
                type="button"
                onClick={() => setShowNewTaskModal(false)}
                className="text-[var(--mute)] hover:text-[var(--ink)] text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[var(--ink)] mb-1">
                  عنوان المهمة *
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="مثال: تفقد مستوى تدفق مياه الفقارة، صيانة إنارة الطريق..."
                  className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--bg)] border border-[var(--line)] focus:outline-none focus:border-emerald-500 text-[var(--ink)]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--ink)] mb-1">
                  ملاحظات أو تفاصيل
                </label>
                <textarea
                  rows={2}
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="تفاصيل إضافية عن المهمة أو أرقام الاتصال..."
                  className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--bg)] border border-[var(--line)] focus:outline-none focus:border-emerald-500 text-[var(--ink)] resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[var(--ink)] mb-1">
                    الموقع المرتبط
                  </label>
                  <input
                    type="text"
                    value={newLocationName}
                    onChange={(e) => setNewLocationName(e.target.value)}
                    placeholder="مثال: قصر عين صالح، المشفى..."
                    className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--bg)] border border-[var(--line)] focus:outline-none focus:border-emerald-500 text-[var(--ink)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--ink)] mb-1">
                    تاريخ الاستحقاق
                  </label>
                  <input
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--bg)] border border-[var(--line)] focus:outline-none focus:border-emerald-500 text-[var(--ink)]"
                  />
                </div>
              </div>

              {hasGoogleTasksAccess && (
                <label className="flex items-center gap-2 text-xs text-[var(--mute)] cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={syncWithGoogleTasks}
                    onChange={(e) => setSyncWithGoogleTasks(e.target.checked)}
                    className="rounded border-[var(--line)] text-emerald-600 focus:ring-0"
                  />
                  <span>مزامنة المهمة فوراً مع حساب Google Tasks الشخصي</span>
                </label>
              )}

              {tasksError && (
                <p className="text-xs text-red-400 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {tasksError}
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--line)]">
                <button
                  type="button"
                  onClick={() => setShowNewTaskModal(false)}
                  className="px-3 py-1.5 rounded-xl border border-[var(--line)] text-xs text-[var(--mute)] hover:text-[var(--ink)]"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingTask || !newTitle.trim()}
                  className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium disabled:opacity-50 transition-all"
                >
                  {isSubmittingTask ? 'جاري الحفظ...' : 'حفظ المهمة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mandatory User Confirmation Dialog for Destructive Delete */}
      {taskToDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-sm bg-[var(--card)] border border-[var(--line)] rounded-2xl shadow-xl p-5 space-y-4">
            <div className="flex items-center gap-3 text-red-400">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[var(--ink)]">تأكيد حذف المهمة</h3>
                <p className="text-xs text-[var(--mute)] mt-0.5">
                  {taskToDelete.isGoogle ? 'حذف من حساب Google Tasks' : 'حذف من قاعدة Cloud SQL'}
                </p>
              </div>
            </div>

            <p className="text-xs text-[var(--mute)] leading-relaxed">
              هل أنت متأكد من رغبتك في حذف مهمة <strong className="text-[var(--ink)]">«{taskToDelete.title}»</strong> نهائياً؟ هذا الإجراء لا يمكن التراجع عنه.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-[var(--line)]">
              <button
                type="button"
                onClick={() => setTaskToDelete(null)}
                className="px-3 py-1.5 rounded-xl border border-[var(--line)] text-xs text-[var(--mute)] hover:text-[var(--ink)]"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-medium transition-all"
              >
                تأكيد الحذف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
