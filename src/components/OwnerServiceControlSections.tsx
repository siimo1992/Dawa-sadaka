import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Ban,
  Check,
  Trash2,
  Edit3,
  Plus,
  Phone,
  MapPin,
  Car,
  Building2,
  Compass,
  Bot,
  Unlock,
  MessageSquare,
  Inbox,
  FileText,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Search,
  Sparkles,
  Image as ImageIcon,
} from 'lucide-react';
import {
  CharityAssociation,
  CharityMessage,
  AssociationPost,
  loadStoredAssociations,
  saveStoredAssociations,
  loadStoredMessages,
  saveStoredMessages,
  loadStoredPosts,
  saveStoredPosts,
  TIDIKELT_NEIGHBORHOODS,
} from '../context/AppContext';
import { RafiqDriverUser, RafiqUiRide, RideUiType } from './RafiqAlTariqModal';
import {
  BannedEntity,
  StoredDesertTrip,
  StoredOasisPlace,
  StoredCommunityTask,
  AgentCustomOverride,
  loadBanList,
  addBanEntry,
  removeBanEntry,
  isTargetBanned,
  loadRafiqRides,
  saveRafiqRides,
  loadRafiqDrivers,
  saveRafiqDrivers,
  loadDesertTrips,
  saveDesertTrips,
  loadDesertChecklist,
  saveDesertChecklist,
  DEFAULT_DESERT_CHECKLIST,
  loadStoredOasisPlaces,
  saveStoredOasisPlaces,
  loadStoredCommunityTasks,
  saveStoredCommunityTasks,
  loadAgentOverrides,
  saveAgentOverrides,
  DEFAULT_AGENTS_LIST,
} from '../utils/ownerControlStore';

export type OwnerDepartmentSection =
  | 'charity'
  | 'rides'
  | 'maps_tasks'
  | 'desert'
  | 'agents'
  | 'bans';

interface OwnerServiceControlSectionsProps {
  section: OwnerDepartmentSection;
  onOpenServiceView?: (viewName: 'charity' | 'rides' | 'maps_tasks' | 'desert' | 'chat') => void;
  onOpenTrainingStudio?: (tab: 'sft' | 'avatars') => void;
  onNotify?: (title: string, message: string) => void;
}

export const OwnerServiceControlSections: React.FC<OwnerServiceControlSectionsProps> = ({
  section,
  onOpenServiceView,
  onOpenTrainingStudio,
  onNotify,
}) => {
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);

  const triggerToast = (msg: string) => {
    setFeedbackToast(msg);
    window.setTimeout(() => {
      setFeedbackToast((prev) => (prev === msg ? null : prev));
    }, 3200);
  };

  // ============================================================================
  // 1. STATE: BAB AL-KHAIR & ASSOCIATIONS (باب الخير والجمعيات)
  // ============================================================================
  const [charitySubTab, setCharitySubTab] = useState<'assocs' | 'posts' | 'messages'>('assocs');
  const [associations, setAssociations] = useState<CharityAssociation[]>(loadStoredAssociations);
  const [charityMessages, setCharityMessages] = useState<CharityMessage[]>(loadStoredMessages);
  const [charityPosts, setCharityPosts] = useState<AssociationPost[]>(loadStoredPosts);

  const [editingAssocId, setEditingAssocId] = useState<string | null>(null);
  const [assocDraft, setAssocDraft] = useState<Partial<CharityAssociation>>({});
  const [isAddingAssoc, setIsAddingAssoc] = useState(false);

  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [postDraft, setPostDraft] = useState<{
    associationId: string;
    title: string;
    content: string;
    imageUrl: string;
    videoUrl: string;
  }>({
    associationId: '',
    title: '',
    content: '',
    imageUrl: '',
    videoUrl: '',
  });
  const [isAddingPost, setIsAddingPost] = useState(false);

  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [msgDraft, setMsgDraft] = useState<Partial<CharityMessage>>({});

  // ============================================================================
  // 2. STATE: RAFIQ AL-TARIQ (رفيق الطريق والرحلات)
  // ============================================================================
  const [ridesSubTab, setRidesSubTab] = useState<'rides' | 'drivers'>('rides');
  const [rides, setRides] = useState<RafiqUiRide[]>(loadRafiqRides);
  const [drivers, setDrivers] = useState<RafiqDriverUser[]>(loadRafiqDrivers);
  const [editingRideId, setEditingRideId] = useState<string | number | null>(null);
  const [isAddingRide, setIsAddingRide] = useState(false);
  const [rideDraft, setRideDraft] = useState<{
    from: string;
    to: string;
    date: string;
    time: string;
    type: RideUiType;
    price: number;
    seats: number;
    car: string;
    note: string;
    who: string;
    phone: string;
  }>({
    from: 'عين صالح',
    to: 'تمنراست',
    date: new Date().toISOString().split('T')[0],
    time: '06:00',
    type: 'fuel',
    price: 1500,
    seats: 3,
    car: '',
    note: '',
    who: 'سائق معتمد',
    phone: '0661000000',
  });

  // ============================================================================
  // 3. STATE: OASIS MAP & COMMUNITY TASKS (الخريطة والمهام)
  // ============================================================================
  const [mapsSubTab, setMapsSubTab] = useState<'places' | 'tasks'>('places');
  const [places, setPlaces] = useState<StoredOasisPlace[]>(loadStoredOasisPlaces);
  const [tasks, setTasks] = useState<StoredCommunityTask[]>(loadStoredCommunityTasks);
  const [editingPlaceId, setEditingPlaceId] = useState<number | null>(null);
  const [isAddingPlace, setIsAddingPlace] = useState(false);
  const [placeDraft, setPlaceDraft] = useState<Omit<StoredOasisPlace, 'id'>>({
    name: '',
    nameAr: '',
    category: 'public_service',
    lat: '27.1975',
    lng: '2.4835',
    description: '',
    phone: '',
  });

  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [taskDraft, setTaskDraft] = useState<Omit<StoredCommunityTask, 'id'>>({
    title: '',
    notes: '',
    status: 'needsAction',
    dueDate: '',
    locationName: 'عين صالح',
    category: 'community',
  });

  // ============================================================================
  // 4. STATE: DESERT SAFETY & TRIPS (السلامة الصحراوية والرحلات)
  // ============================================================================
  const [desertSubTab, setDesertSubTab] = useState<'trips' | 'checklist'>('trips');
  const [desertTrips, setDesertTrips] = useState<StoredDesertTrip[]>(loadDesertTrips);
  const [desertChecklist, setDesertChecklist] = useState<string[]>(loadDesertChecklist);
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [editingChecklistIdx, setEditingChecklistIdx] = useState<number | null>(null);
  const [editingChecklistText, setEditingChecklistText] = useState('');
  const [editingDesertTripId, setEditingDesertTripId] = useState<string | null>(null);
  const [desertTripDraft, setDesertTripDraft] = useState<{
    d: string;
    p: string;
    returnStr: string;
    status: 'active' | 'completed' | 'cancelled';
  }>({
    d: '',
    p: '',
    returnStr: '',
    status: 'active',
  });

  // ============================================================================
  // 5. STATE: AI AGENTS (الوكلاء الذكيون)
  // ============================================================================
  const [agents, setAgents] = useState<AgentCustomOverride[]>(loadAgentOverrides);
  const [editingAgentId, setEditingAgentId] = useState<string | null>(null);
  const [agentDraft, setAgentDraft] = useState<AgentCustomOverride | null>(null);

  // ============================================================================
  // 6. STATE: GLOBAL BAN LIST & UNBAN (حظر الأرقام والمرسلين وفك الحظر)
  // ============================================================================
  const [banList, setBanList] = useState<BannedEntity[]>(loadBanList);
  const [newBanTarget, setNewBanTarget] = useState('');
  const [newBanType, setNewBanType] = useState<BannedEntity['type']>('phone');
  const [newBanSection, setNewBanSection] = useState<BannedEntity['section']>('general');
  const [newBanReason, setNewBanReason] = useState('');
  const [banSearchFilter, setBanSearchFilter] = useState('');

  // Sync all stores when localStorage or owner sync events fire
  useEffect(() => {
    const syncAll = () => {
      setAssociations(loadStoredAssociations());
      setCharityMessages(loadStoredMessages());
      setCharityPosts(loadStoredPosts());
      setRides(loadRafiqRides());
      setDrivers(loadRafiqDrivers());
      setDesertTrips(loadDesertTrips());
      setDesertChecklist(loadDesertChecklist());
      setPlaces(loadStoredOasisPlaces());
      setTasks(loadStoredCommunityTasks());
      setAgents(loadAgentOverrides());
      setBanList(loadBanList());
    };

    window.addEventListener('tidikelt-owner-sync', syncAll);
    window.addEventListener('bab-alkhair-sync', syncAll);
    window.addEventListener('storage', syncAll);
    return () => {
      window.removeEventListener('tidikelt-owner-sync', syncAll);
      window.removeEventListener('bab-alkhair-sync', syncAll);
      window.removeEventListener('storage', syncAll);
    };
  }, []);

  // Load initial places & tasks from server API if available
  useEffect(() => {
    if (section !== 'maps_tasks') return;
    fetch('/api/oasis-places')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.success && Array.isArray(data.places) && data.places.length > 0) {
          setPlaces(data.places);
          saveStoredOasisPlaces(data.places);
        }
      })
      .catch(() => {});

    fetch('/api/community-tasks')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.success && Array.isArray(data.tasks)) {
          setTasks(data.tasks);
          saveStoredCommunityTasks(data.tasks);
        }
      })
      .catch(() => {});
  }, [section]);

  // Quick Ban helper usable from any department
  const handleQuickBan = (
    target: string,
    type: BannedEntity['type'],
    sec: BannedEntity['section'],
    reasonText: string
  ) => {
    if (!target || !target.trim()) return;
    const existing = isTargetBanned(target);
    if (existing) {
      removeBanEntry(existing.id);
      setBanList(loadBanList());
      triggerToast(`تم فك الحظر عن «${target}» بنجاح`);
      return;
    }
    addBanEntry({
      target,
      type,
      section: sec,
      reason: reasonText,
    });
    setBanList(loadBanList());
    triggerToast(`تم حظر «${target}» وإدراجه في قائمة المحظورين`);
    if (onNotify) {
      onNotify('حظر إداري جديد', `تم حظر «${target}» من قبل مالك المنصة.`);
    }
  };

  return (
    <div className="space-y-4">
      {feedbackToast && (
        <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-extrabold flex items-center justify-between gap-2 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{feedbackToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackToast(null)}
            className="text-[11px] underline cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      )}

      {/* =====================================================================
          DEPARTMENT 1: BAB AL-KHAIR & ASSOCIATIONS (جهة باب الخير والجمعيات)
         ===================================================================== */}
      {section === 'charity' && (
        <div className="space-y-4">
          {/* Header & Sub-navigation */}
          <div className="bg-[var(--card)] border border-[var(--line)] rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--line)] pb-3">
              <div>
                <b className="text-sm font-extrabold text-[var(--ink)] flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-emerald-600" />
                  <span>إدارة قسم باب الخير والجمعيات الخيرية (تحكم كامل للمالك)</span>
                </b>
                <p className="text-[11px] text-[var(--mute)] m-0 mt-0.5">
                  تعديل، اعتماد، حذف، أو حظر الجمعيات، المنشورات، التعليقات، ورسائل المواطنين عبر لوحة التحكم.
                </p>
              </div>
              {onOpenServiceView && (
                <button
                  type="button"
                  onClick={() => onOpenServiceView('charity')}
                  className="min-h-[40px] px-3.5 py-2 rounded-xl bg-[var(--bg)] border border-[var(--line)] hover:border-emerald-500 text-xs font-bold text-[var(--ink)] cursor-pointer shrink-0"
                >
                  معاينة قسم باب الخير ↗
                </button>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setCharitySubTab('assocs')}
                className={`min-h-[44px] py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                  charitySubTab === 'assocs'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-[var(--bg)] border border-[var(--line)] text-[var(--mute)] hover:text-[var(--ink)]'
                }`}
              >
                <Building2 className="w-4 h-4 shrink-0" />
                <span className="tabular-nums">الجمعيات ({associations.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setCharitySubTab('posts')}
                className={`min-h-[44px] py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                  charitySubTab === 'posts'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-[var(--bg)] border border-[var(--line)] text-[var(--mute)] hover:text-[var(--ink)]'
                }`}
              >
                <FileText className="w-4 h-4 shrink-0" />
                <span className="tabular-nums">المنشورات والتدوينات ({charityPosts.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setCharitySubTab('messages')}
                className={`min-h-[44px] py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                  charitySubTab === 'messages'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-[var(--bg)] border border-[var(--line)] text-[var(--mute)] hover:text-[var(--ink)]'
                }`}
              >
                <Inbox className="w-4 h-4 shrink-0" />
                <span className="tabular-nums">رسائل المواطنين ({charityMessages.length})</span>
              </button>
            </div>
          </div>

          {/* SUB-TAB 1: ASSOCIATIONS */}
          {charitySubTab === 'assocs' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-[var(--ink)]">
                  قائمة الجمعيات المسجلة وطلبات العضوية ({associations.length})
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingAssoc((prev) => !prev);
                    setEditingAssocId(null);
                    setAssocDraft({
                      name: '',
                      specialty: 'العمل الخيري والتضامني',
                      neighborhood: TIDIKELT_NEIGHBORHOODS[0],
                      phone: '',
                      whatsapp: '',
                      email: '',
                      accessCode: '1234',
                      status: 'approved',
                    });
                  }}
                  className="min-h-[40px] px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isAddingAssoc ? 'إلغاء الإضافة' : 'إضافة جمعية معتمدة'}</span>
                </button>
              </div>

              {(isAddingAssoc || editingAssocId) && (
                <div className="bg-[var(--card)] border border-emerald-500/40 rounded-2xl p-4 space-y-3 shadow-sm">
                  <b className="text-xs font-extrabold text-emerald-600 block">
                    {editingAssocId ? 'تعديل بيانات الجمعية:' : 'إضافة جمعية جديدة مباشرة:'}
                  </b>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-[var(--mute)] block mb-1">اسم الجمعية *</label>
                      <input
                        type="text"
                        value={assocDraft.name || ''}
                        onChange={(e) => setAssocDraft((p) => ({ ...p, name: e.target.value }))}
                        placeholder="اسم الجمعية الخيرية"
                        className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--line)] text-xs font-bold text-[var(--ink)]"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-[var(--mute)] block mb-1">الولاية / الحي *</label>
                      <input
                        type="text"
                        value={assocDraft.neighborhood || ''}
                        onChange={(e) => setAssocDraft((p) => ({ ...p, neighborhood: e.target.value }))}
                        placeholder="عين صالح / الحي"
                        className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--line)] text-xs font-bold text-[var(--ink)]"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-[var(--mute)] block mb-1">التخصص والنشاط</label>
                      <input
                        type="text"
                        value={assocDraft.specialty || ''}
                        onChange={(e) => setAssocDraft((p) => ({ ...p, specialty: e.target.value }))}
                        className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--line)] text-xs text-[var(--ink)]"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-[var(--mute)] block mb-1">رمز دخول الجمعية (Access Code)</label>
                      <input
                        type="text"
                        value={assocDraft.accessCode || ''}
                        onChange={(e) => setAssocDraft((p) => ({ ...p, accessCode: e.target.value }))}
                        className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--line)] text-xs font-mono font-bold text-[var(--ink)]"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-[var(--mute)] block mb-1">رقم الهاتف</label>
                      <input
                        type="tel"
                        value={assocDraft.phone || ''}
                        onChange={(e) => setAssocDraft((p) => ({ ...p, phone: e.target.value }))}
                        className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--line)] text-xs font-mono text-[var(--ink)]"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-[var(--mute)] block mb-1">حالة الاعتماد</label>
                      <select
                        value={assocDraft.status || 'approved'}
                        onChange={(e) =>
                          setAssocDraft((p) => ({
                            ...p,
                            status: e.target.value as CharityAssociation['status'],
                          }))
                        }
                        className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--line)] text-xs font-bold text-[var(--ink)]"
                      >
                        <option value="approved">معتمدة ومنشورة (Approved)</option>
                        <option value="pending">قيد المراجعة (Pending)</option>
                        <option value="rejected">موقوفة / مرفوضة (Rejected)</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (!assocDraft.name?.trim()) return;
                        if (editingAssocId) {
                          const next = associations.map((a) =>
                            a.id === editingAssocId
                              ? {
                                  ...a,
                                  name: assocDraft.name!.trim(),
                                  neighborhood: assocDraft.neighborhood?.trim() || a.neighborhood,
                                  specialty: assocDraft.specialty?.trim() || a.specialty,
                                  phone: assocDraft.phone?.trim() || a.phone,
                                  whatsapp: assocDraft.whatsapp?.trim() || assocDraft.phone?.trim() || a.whatsapp,
                                  email: assocDraft.email?.trim() || a.email,
                                  accessCode: assocDraft.accessCode?.trim() || a.accessCode,
                                  status: assocDraft.status || a.status,
                                }
                              : a
                          );
                          setAssociations(next);
                          saveStoredAssociations(next);
                          setEditingAssocId(null);
                          triggerToast('تم حفظ تعديلات الجمعية بنجاح');
                        } else {
                          const newItem: CharityAssociation = {
                            id: `assoc-${Date.now()}`,
                            name: assocDraft.name.trim(),
                            neighborhood: assocDraft.neighborhood?.trim() || 'عين صالح',
                            specialty: assocDraft.specialty?.trim() || 'عمل خيري وتضامني',
                            phone: assocDraft.phone?.trim() || '0661000000',
                            whatsapp: assocDraft.phone?.trim() || '213661000000',
                            email: assocDraft.email?.trim() || '',
                            accessCode: assocDraft.accessCode?.trim() || '1234',
                            status: assocDraft.status || 'approved',
                            createdAt: Date.now(),
                          };
                          const next = [newItem, ...associations];
                          setAssociations(next);
                          saveStoredAssociations(next);
                          setIsAddingAssoc(false);
                          triggerToast('تمت إضافة الجمعية واعتمادها');
                        }
                      }}
                      className="flex-1 min-h-[42px] bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold cursor-pointer"
                    >
                      حفظ بيانات الجمعية
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingAssoc(false);
                        setEditingAssocId(null);
                      }}
                      className="min-h-[42px] px-4 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-xs font-bold text-[var(--mute)] cursor-pointer"
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              )}

              <div className="space-y-2.5">
                {associations.map((assoc) => {
                  const banned = isTargetBanned(assoc.phone, assoc.name);
                  return (
                    <div
                      key={assoc.id}
                      className="bg-[var(--card)] border border-[var(--line)] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center flex-wrap gap-2">
                          <b className="text-xs sm:text-sm font-extrabold text-[var(--ink)]">{assoc.name}</b>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                              assoc.status === 'approved'
                                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600'
                                : assoc.status === 'pending'
                                ? 'bg-amber-500/15 border-amber-500/30 text-amber-600'
                                : 'bg-rose-500/15 border-rose-500/30 text-rose-600'
                            }`}
                          >
                            {assoc.status === 'approved'
                              ? 'معتمدة'
                              : assoc.status === 'pending'
                              ? 'بانتظار الموافقة'
                              : 'موقوفة'}
                          </span>
                          {banned && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-600 text-white">
                              محظورة
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-[var(--mute)]">
                          {assoc.neighborhood} · {assoc.specialty}
                        </div>
                        <div className="text-[11px] font-mono tabular-nums text-[var(--mute)]">
                          الهاتف: {assoc.phone} · رمز الدخول: <b className="text-emerald-600">{assoc.accessCode}</b>
                        </div>
                      </div>

                      <div className="flex items-center flex-wrap gap-1.5 shrink-0">
                        {assoc.status !== 'approved' && (
                          <button
                            type="button"
                            onClick={() => {
                              const next = associations.map((a) =>
                                a.id === assoc.id ? { ...a, status: 'approved' as const } : a
                              );
                              setAssociations(next);
                              saveStoredAssociations(next);
                              triggerToast(`تم اعتماد وتفعيل «${assoc.name}»`);
                            }}
                            className="min-h-[38px] px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-extrabold cursor-pointer flex items-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>اعتماد</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setEditingAssocId(assoc.id);
                            setIsAddingAssoc(false);
                            setAssocDraft(assoc);
                          }}
                          className="min-h-[38px] px-3 py-1.5 rounded-xl bg-[var(--bg)] border border-[var(--line)] hover:border-emerald-500 text-xs font-bold text-[var(--ink)] cursor-pointer flex items-center gap-1"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>تعديل</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleQuickBan(
                              assoc.phone || assoc.name,
                              'association',
                              'charity',
                              `حظر الجمعية: ${assoc.name}`
                            )
                          }
                          className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1 border ${
                            banned
                              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-600'
                              : 'bg-amber-500/10 border-amber-500/30 text-amber-600'
                          }`}
                        >
                          <Ban className="w-3.5 h-3.5" />
                          <span>{banned ? 'فك الحظر' : 'حظر'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const next = associations.filter((a) => a.id !== assoc.id);
                            setAssociations(next);
                            saveStoredAssociations(next);
                            triggerToast(`تم حذف الجمعية «${assoc.name}» نهائياً`);
                          }}
                          className="min-h-[38px] px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 text-xs font-bold cursor-pointer flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>حذف</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* SUB-TAB 2: CHARITY POSTS & COMMENTS */}
          {charitySubTab === 'posts' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-[var(--ink)]">
                  منشورات وتدوينات فضاء الجمعيات ({charityPosts.length})
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingPost((p) => !p);
                    setEditingPostId(null);
                    setPostDraft({
                      associationId: associations[0]?.id || '',
                      title: '',
                      content: '',
                      imageUrl: '',
                      videoUrl: '',
                    });
                  }}
                  className="min-h-[40px] px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isAddingPost ? 'إلغاء' : 'نشر تدوينة / منشور جديد'}</span>
                </button>
              </div>

              {(isAddingPost || editingPostId) && (
                <div className="bg-[var(--card)] border border-emerald-500/40 rounded-2xl p-4 space-y-3">
                  <b className="text-xs font-extrabold text-emerald-600 block">
                    {editingPostId ? 'تعديل المنشور / التدوينة:' : 'نشر منشور جديد في فضاء الجمعيات:'}
                  </b>
                  {!editingPostId && (
                    <div>
                      <label className="text-[11px] font-bold text-[var(--mute)] block mb-1">الجمعية الناشرة</label>
                      <select
                        value={postDraft.associationId}
                        onChange={(e) => setPostDraft((p) => ({ ...p, associationId: e.target.value }))}
                        className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--line)] text-xs font-bold text-[var(--ink)]"
                      >
                        {associations.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="text-[11px] font-bold text-[var(--mute)] block mb-1">عنوان المقال (اختياري)</label>
                    <input
                      type="text"
                      value={postDraft.title}
                      onChange={(e) => setPostDraft((p) => ({ ...p, title: e.target.value }))}
                      placeholder="عنوان التدوينة أو النشاط..."
                      className="w-full min-h-[42px] px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--line)] text-xs font-bold text-[var(--ink)]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-bold text-[var(--mute)] block mb-1">نص المنشور *</label>
                    <textarea
                      rows={3}
                      value={postDraft.content}
                      onChange={(e) => setPostDraft((p) => ({ ...p, content: e.target.value }))}
                      placeholder="تفاصيل المنشور..."
                      className="w-full p-3 rounded-xl bg-[var(--bg)] border border-[var(--line)] text-xs text-[var(--ink)]"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <input
                      type="text"
                      value={postDraft.imageUrl}
                      onChange={(e) => setPostDraft((p) => ({ ...p, imageUrl: e.target.value }))}
                      placeholder="رابط الصورة (اختياري)"
                      className="w-full min-h-[40px] px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--line)] text-xs text-[var(--ink)]"
                    />
                    <input
                      type="text"
                      value={postDraft.videoUrl}
                      onChange={(e) => setPostDraft((p) => ({ ...p, videoUrl: e.target.value }))}
                      placeholder="رابط فيديو يوتيوب / فيسبوك (اختياري)"
                      className="w-full min-h-[40px] px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--line)] text-xs text-[var(--ink)]"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (!postDraft.content.trim()) return;
                        if (editingPostId) {
                          const next = charityPosts.map((p) =>
                            p.id === editingPostId
                              ? {
                                  ...p,
                                  title: postDraft.title.trim() || undefined,
                                  content: postDraft.content.trim(),
                                  imageUrl: postDraft.imageUrl.trim() || undefined,
                                  videoUrl: postDraft.videoUrl.trim() || undefined,
                                  updatedAt: Date.now(),
                                }
                              : p
                          );
                          setCharityPosts(next);
                          saveStoredPosts(next);
                          setEditingPostId(null);
                          triggerToast('تم حفظ تعديل المنشور');
                        } else {
                          const pubAssoc =
                            associations.find((a) => a.id === postDraft.associationId) || associations[0];
                          const newPost: AssociationPost = {
                            id: `post-${Date.now()}`,
                            associationId: pubAssoc?.id || 'admin',
                            associationName: pubAssoc?.name || 'إدارة تيدكلت AI',
                            neighborhood: pubAssoc?.neighborhood || 'عين صالح',
                            title: postDraft.title.trim() || undefined,
                            content: postDraft.content.trim(),
                            imageUrl: postDraft.imageUrl.trim() || undefined,
                            videoUrl: postDraft.videoUrl.trim() || undefined,
                            likesCount: 0,
                            comments: [],
                            createdAt: Date.now(),
                          };
                          const next = [newPost, ...charityPosts];
                          setCharityPosts(next);
                          saveStoredPosts(next);
                          setIsAddingPost(false);
                          triggerToast('تم نشر التدوينة بنجاح');
                        }
                      }}
                      className="flex-1 min-h-[42px] bg-emerald-600 text-white rounded-xl text-xs font-extrabold cursor-pointer"
                    >
                      حفظ ونشر
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingPost(false);
                        setEditingPostId(null);
                      }}
                      className="min-h-[42px] px-4 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-xs font-bold text-[var(--mute)] cursor-pointer"
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              )}

              {charityPosts.map((post) => (
                <div
                  key={post.id}
                  className="bg-[var(--card)] border border-[var(--line)] rounded-2xl p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <b className="text-xs sm:text-sm font-extrabold text-[var(--ink)] block">
                        {post.associationName}
                      </b>
                      <span className="text-[11px] text-[var(--mute)] font-mono tabular-nums">
                        {post.neighborhood} · {new Date(post.createdAt).toLocaleString('ar-DZ')}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingPostId(post.id);
                          setIsAddingPost(false);
                          setPostDraft({
                            associationId: post.associationId,
                            title: post.title || '',
                            content: post.content,
                            imageUrl: post.imageUrl || '',
                            videoUrl: post.videoUrl || '',
                          });
                        }}
                        className="min-h-[36px] px-3 py-1 rounded-xl bg-[var(--bg)] border border-[var(--line)] text-xs font-bold text-[var(--ink)] cursor-pointer flex items-center gap-1"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>تعديل</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const next = charityPosts.filter((p) => p.id !== post.id);
                          setCharityPosts(next);
                          saveStoredPosts(next);
                          triggerToast('تم حذف المنشور نهائياً');
                        }}
                        className="min-h-[36px] px-3 py-1 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 text-xs font-bold cursor-pointer flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>حذف</span>
                      </button>
                    </div>
                  </div>

                  {post.title && (
                    <div className="text-xs font-extrabold text-emerald-600">{post.title}</div>
                  )}
                  <p className="text-xs text-[var(--ink)] m-0 leading-relaxed bg-[var(--bg)] p-3 rounded-xl border border-[var(--line)]">
                    {post.content}
                  </p>

                  {/* Comments management inside post */}
                  {post.comments && post.comments.length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-[var(--line)]">
                      <span className="text-[11px] font-bold text-[var(--mute)] block">
                        التعليقات ({post.comments.length}):
                      </span>
                      {post.comments.map((cmt) => {
                        const cmtBanned = isTargetBanned(cmt.authorName);
                        return (
                          <div
                            key={cmt.id}
                            className="flex items-center justify-between gap-2 p-2 rounded-xl bg-[var(--bg)] border border-[var(--line)] text-xs"
                          >
                            <div>
                              <b className="text-[var(--ink)]">{cmt.authorName}: </b>
                              <span className="text-[var(--mute)]">{cmt.text}</span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() =>
                                  handleQuickBan(
                                    cmt.authorName,
                                    'sender',
                                    'charity',
                                    `تعليق مخالف: ${cmt.text.slice(0, 40)}`
                                  )
                                }
                                className="px-2 py-1 rounded-lg bg-amber-500/10 text-amber-600 text-[11px] font-bold cursor-pointer"
                              >
                                {cmtBanned ? 'فك الحظر' : 'حظر المعلق'}
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const next = charityPosts.map((p) =>
                                    p.id === post.id
                                      ? { ...p, comments: p.comments.filter((c) => c.id !== cmt.id) }
                                      : p
                                  );
                                  setCharityPosts(next);
                                  saveStoredPosts(next);
                                  triggerToast('تم حذف التعليق');
                                }}
                                className="px-2 py-1 rounded-lg bg-rose-500/10 text-rose-600 text-[11px] font-bold cursor-pointer"
                              >
                                حذف
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* SUB-TAB 3: CITIZEN MESSAGES TO ASSOCIATIONS */}
          {charitySubTab === 'messages' && (
            <div className="space-y-3">
              <div className="text-xs font-extrabold text-[var(--ink)]">
                جميع رسائل وطلبات المواطنين المرسلة للجمعيات ({charityMessages.length})
              </div>

              {editingMsgId && (
                <div className="bg-[var(--card)] border border-emerald-500/40 rounded-2xl p-4 space-y-3">
                  <b className="text-xs font-extrabold text-emerald-600 block">تعديل رسالة المواطن:</b>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <input
                      type="text"
                      value={msgDraft.senderName || ''}
                      onChange={(e) => setMsgDraft((p) => ({ ...p, senderName: e.target.value }))}
                      placeholder="اسم المرسل"
                      className="min-h-[40px] px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--line)] text-xs font-bold text-[var(--ink)]"
                    />
                    <input
                      type="tel"
                      value={msgDraft.senderPhone || ''}
                      onChange={(e) => setMsgDraft((p) => ({ ...p, senderPhone: e.target.value }))}
                      placeholder="رقم الهاتف"
                      className="min-h-[40px] px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--line)] text-xs font-mono text-[var(--ink)]"
                    />
                    <input
                      type="text"
                      value={msgDraft.neighborhood || ''}
                      onChange={(e) => setMsgDraft((p) => ({ ...p, neighborhood: e.target.value }))}
                      placeholder="الولاية"
                      className="min-h-[40px] px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--line)] text-xs text-[var(--ink)]"
                    />
                  </div>
                  <textarea
                    rows={3}
                    value={msgDraft.content || ''}
                    onChange={(e) => setMsgDraft((p) => ({ ...p, content: e.target.value }))}
                    className="w-full p-3 rounded-xl bg-[var(--bg)] border border-[var(--line)] text-xs text-[var(--ink)]"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const next = charityMessages.map((m) =>
                          m.id === editingMsgId
                            ? {
                                ...m,
                                senderName: msgDraft.senderName?.trim() || m.senderName,
                                senderPhone: msgDraft.senderPhone?.trim() || m.senderPhone,
                                neighborhood: msgDraft.neighborhood?.trim() || m.neighborhood,
                                content: msgDraft.content?.trim() || m.content,
                              }
                            : m
                        );
                        setCharityMessages(next);
                        saveStoredMessages(next);
                        setEditingMsgId(null);
                        triggerToast('تم تعديل الرسالة وحفظها');
                      }}
                      className="flex-1 min-h-[40px] bg-emerald-600 text-white rounded-xl text-xs font-extrabold cursor-pointer"
                    >
                      حفظ التعديل
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingMsgId(null)}
                      className="min-h-[40px] px-4 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-xs font-bold text-[var(--mute)] cursor-pointer"
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              )}

              {charityMessages.length === 0 ? (
                <div className="p-6 text-center bg-[var(--card)] border border-[var(--line)] rounded-2xl text-xs text-[var(--mute)]">
                  لا توجد رسائل مسجلة حالياً.
                </div>
              ) : (
                charityMessages.map((msg) => {
                  const targetAssoc = associations.find((a) => a.id === msg.associationId);
                  const isPhoneBanned = isTargetBanned(msg.senderPhone, msg.senderName);
                  return (
                    <div
                      key={msg.id}
                      className="bg-[var(--card)] border border-[var(--line)] rounded-2xl p-4 space-y-2.5"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div>
                          <div className="flex items-center flex-wrap gap-2">
                            <b className="text-xs sm:text-sm font-extrabold text-[var(--ink)]">
                              المرسل: {msg.senderName}
                            </b>
                            <span className="text-xs font-mono tabular-nums px-2 py-0.5 rounded-md bg-[var(--bg)] border border-[var(--line)] text-emerald-600 font-bold">
                              {msg.senderPhone}
                            </span>
                            <span className="text-[11px] text-[var(--mute)]">
                              الولاية: {msg.neighborhood}
                            </span>
                            {isPhoneBanned && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-600 text-white">
                                رقم محظور
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-[var(--mute)] mt-0.5">
                            موجهة إلى: <b className="text-[var(--ink)]">{targetAssoc?.name || msg.associationId}</b>
                          </div>
                        </div>

                        <div className="flex items-center flex-wrap gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingMsgId(msg.id);
                              setMsgDraft(msg);
                            }}
                            className="min-h-[36px] px-3 py-1 rounded-xl bg-[var(--bg)] border border-[var(--line)] text-xs font-bold text-[var(--ink)] cursor-pointer flex items-center gap-1"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            <span>تعديل</span>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleQuickBan(
                                msg.senderPhone || msg.senderName,
                                'phone',
                                'charity',
                                `مرسل مخالف في باب الخير (${msg.senderName})`
                              )
                            }
                            className={`min-h-[36px] px-3 py-1 rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1 border ${
                              isPhoneBanned
                                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-600'
                                : 'bg-amber-500/10 border-amber-500/30 text-amber-600'
                            }`}
                          >
                            <Ban className="w-3.5 h-3.5" />
                            <span>{isPhoneBanned ? 'فك حظر الرقم' : 'حظر الرقم والمرسل'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              const next = charityMessages.filter((m) => m.id !== msg.id);
                              setCharityMessages(next);
                              saveStoredMessages(next);
                              triggerToast('تم حذف الرسالة نهائياً');
                            }}
                            className="min-h-[36px] px-3 py-1 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 text-xs font-bold cursor-pointer flex items-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>حذف</span>
                          </button>
                        </div>
                      </div>

                      <p className="text-xs text-[var(--ink)] m-0 p-3 rounded-xl bg-[var(--bg)] border border-[var(--line)] leading-relaxed">
                        {msg.content}
                      </p>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          DEPARTMENT 2: RAFIQ AL-TARIQ (جهة رفيق الطريق والرحلات)
         ===================================================================== */}
      {section === 'rides' && (
        <div className="space-y-4">
          <div className="bg-[var(--card)] border border-[var(--line)] rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--line)] pb-3">
              <div>
                <b className="text-sm font-extrabold text-[var(--ink)] flex items-center gap-2">
                  <Car className="w-4 h-4 text-[var(--green)]" />
                  <span>إدارة قسم رفيق الطريق (كاش بلاصة · الرحالة)</span>
                </b>
                <p className="text-[11px] text-[var(--mute)] m-0 mt-0.5">
                  اطلاع، تعديل، اعتماد، حذف الرحلات، وتوثيق أو حظر السائقين وأرقام الهواتف.
                </p>
              </div>
              {onOpenServiceView && (
                <button
                  type="button"
                  onClick={() => onOpenServiceView('rides')}
                  className="min-h-[40px] px-3.5 py-2 rounded-xl bg-[var(--bg)] border border-[var(--line)] hover:border-[var(--green)] text-xs font-bold text-[var(--ink)] cursor-pointer shrink-0"
                >
                  معاينة قسم رفيق الطريق ↗
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRidesSubTab('rides')}
                className={`min-h-[44px] py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer ${
                  ridesSubTab === 'rides'
                    ? 'bg-[var(--green)] text-white'
                    : 'bg-[var(--bg)] border border-[var(--line)] text-[var(--mute)]'
                }`}
              >
                <Car className="w-4 h-4" />
                <span className="tabular-nums">إعلانات الرحلات ({rides.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setRidesSubTab('drivers')}
                className={`min-h-[44px] py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer ${
                  ridesSubTab === 'drivers'
                    ? 'bg-[var(--green)] text-white'
                    : 'bg-[var(--bg)] border border-[var(--line)] text-[var(--mute)]'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span className="tabular-nums">السائقون والتوثيق ({drivers.length})</span>
              </button>
            </div>
          </div>

          {ridesSubTab === 'rides' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-[var(--ink)]">
                  جميع الرحلات المنشورة والمعلقة ({rides.length})
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingRide((p) => !p);
                    setEditingRideId(null);
                  }}
                  className="min-h-[40px] px-3.5 py-2 rounded-xl bg-[var(--green)] text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isAddingRide ? 'إلغاء' : 'إضافة رحلة جديدة'}</span>
                </button>
              </div>

              {(isAddingRide || editingRideId !== null) && (
                <div className="bg-[var(--card)] border border-[var(--green)]/40 rounded-2xl p-4 space-y-3">
                  <b className="text-xs font-extrabold text-[var(--green)] block">
                    {editingRideId !== null ? 'تعديل بيانات الرحلة:' : 'نشر رحلة جديدة بأمر المالك:'}
                  </b>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="text-[11px] font-bold text-[var(--mute)] block mb-1">نقطة الانطلاق</label>
                      <input
                        type="text"
                        value={rideDraft.from}
                        onChange={(e) => setRideDraft((p) => ({ ...p, from: e.target.value }))}
                        className="w-full min-h-[40px] px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--line)] text-xs font-bold text-[var(--ink)]"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-[var(--mute)] block mb-1">الوجهة</label>
                      <input
                        type="text"
                        value={rideDraft.to}
                        onChange={(e) => setRideDraft((p) => ({ ...p, to: e.target.value }))}
                        className="w-full min-h-[40px] px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--line)] text-xs font-bold text-[var(--ink)]"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-[var(--mute)] block mb-1">اسم السائق</label>
                      <input
                        type="text"
                        value={rideDraft.who}
                        onChange={(e) => setRideDraft((p) => ({ ...p, who: e.target.value }))}
                        className="w-full min-h-[40px] px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--line)] text-xs font-bold text-[var(--ink)]"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-[var(--mute)] block mb-1">التاريخ</label>
                      <input
                        type="date"
                        value={rideDraft.date}
                        onChange={(e) => setRideDraft((p) => ({ ...p, date: e.target.value }))}
                        className="w-full min-h-[40px] px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--line)] text-xs font-mono text-[var(--ink)]"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-[var(--mute)] block mb-1">الوقت</label>
                      <input
                        type="time"
                        value={rideDraft.time}
                        onChange={(e) => setRideDraft((p) => ({ ...p, time: e.target.value }))}
                        className="w-full min-h-[40px] px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--line)] text-xs font-mono text-[var(--ink)]"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-[var(--mute)] block mb-1">رقم الهاتف</label>
                      <input
                        type="tel"
                        value={rideDraft.phone}
                        onChange={(e) => setRideDraft((p) => ({ ...p, phone: e.target.value }))}
                        className="w-full min-h-[40px] px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--line)] text-xs font-mono text-[var(--ink)]"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-[var(--mute)] block mb-1">المقاعد المتاحة</label>
                      <input
                        type="number"
                        value={rideDraft.seats}
                        onChange={(e) => setRideDraft((p) => ({ ...p, seats: Number(e.target.value) }))}
                        className="w-full min-h-[40px] px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--line)] text-xs font-mono text-[var(--ink)]"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-[var(--mute)] block mb-1">السعر (دج)</label>
                      <input
                        type="number"
                        value={rideDraft.price}
                        onChange={(e) => setRideDraft((p) => ({ ...p, price: Number(e.target.value) }))}
                        className="w-full min-h-[40px] px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--line)] text-xs font-mono text-[var(--ink)]"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-[var(--mute)] block mb-1">المركبة</label>
                      <input
                        type="text"
                        value={rideDraft.car}
                        onChange={(e) => setRideDraft((p) => ({ ...p, car: e.target.value }))}
                        placeholder="مثال: تويوتا هايلوكس"
                        className="w-full min-h-[40px] px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--line)] text-xs text-[var(--ink)]"
                      />
                    </div>
                  </div>
                  <input
                    type="text"
                    value={rideDraft.note}
                    onChange={(e) => setRideDraft((p) => ({ ...p, note: e.target.value }))}
                    placeholder="ملاحظة إضافية للمسافرين..."
                    className="w-full min-h-[40px] px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--line)] text-xs text-[var(--ink)]"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (editingRideId !== null) {
                          const next = rides.map((r) =>
                            r.id === editingRideId
                              ? {
                                  ...r,
                                  from: rideDraft.from.trim(),
                                  to: rideDraft.to.trim(),
                                  date: rideDraft.date,
                                  time: rideDraft.time,
                                  seats: rideDraft.seats,
                                  price: rideDraft.price,
                                  car: rideDraft.car.trim() || '—',
                                  note: rideDraft.note.trim(),
                                  who: rideDraft.who.trim(),
                                  phone: rideDraft.phone.trim(),
                                  edited: true,
                                }
                              : r
                          );
                          setRides(next);
                          saveRafiqRides(next);
                          setEditingRideId(null);
                          triggerToast('تم حفظ تعديل الرحلة');
                        } else {
                          const newRide: RafiqUiRide = {
                            id: `ride-${Date.now()}`,
                            uid: `d-${Date.now()}`,
                            from: rideDraft.from.trim() || 'عين صالح',
                            to: rideDraft.to.trim() || 'تمنراست',
                            date: rideDraft.date,
                            time: rideDraft.time || '06:00',
                            type: rideDraft.type,
                            price: rideDraft.price,
                            seats: rideDraft.seats,
                            car: rideDraft.car.trim() || '—',
                            note: rideDraft.note.trim(),
                            who: rideDraft.who.trim() || 'سائق معتمد',
                            ok: 1,
                            phone: rideDraft.phone.trim() || '0661000000',
                            review: false,
                          };
                          const next = [newRide, ...rides];
                          setRides(next);
                          saveRafiqRides(next);
                          setIsAddingRide(false);
                          triggerToast('تمت إضافة الرحلة واعتمادها فوراً');
                        }
                      }}
                      className="flex-1 min-h-[42px] bg-[var(--green)] text-white rounded-xl text-xs font-extrabold cursor-pointer"
                    >
                      حفظ واعتماد الرحلة
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingRide(false);
                        setEditingRideId(null);
                      }}
                      className="min-h-[42px] px-4 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-xs font-bold text-[var(--mute)] cursor-pointer"
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              )}

              {rides.map((r) => {
                const banned = isTargetBanned(r.phone, r.who);
                return (
                  <div
                    key={r.id}
                    className="bg-[var(--card)] border border-[var(--line)] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center flex-wrap gap-2">
                        <b className="text-xs sm:text-sm font-extrabold text-[var(--ink)]">
                          {r.from} ← {r.to}
                        </b>
                        <span className="text-xs font-mono tabular-nums px-2 py-0.5 rounded-md bg-[var(--bg)] border border-[var(--line)] font-bold text-[var(--green)]">
                          {r.date} · {r.time}
                        </span>
                        <span className="text-xs font-mono tabular-nums font-bold text-[var(--ink)]">
                          {r.price === 0 ? 'مجاناً' : `${r.price} دج`} ({r.seats} مقاعد)
                        </span>
                        {r.review && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-600">
                            قيد المراجعة
                          </span>
                        )}
                        {banned && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-600 text-white">
                            محظور
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-[var(--mute)]">
                        السائق: <b className="text-[var(--ink)]">{r.who}</b> · المركبة: {r.car} · الهاتف:{' '}
                        <span className="font-mono tabular-nums">{r.phone}</span>
                      </div>
                      {r.note && <div className="text-[11px] text-[var(--mute)]">ملاحظة: {r.note}</div>}
                    </div>

                    <div className="flex items-center flex-wrap gap-1.5 shrink-0">
                      {r.review && (
                        <button
                          type="button"
                          onClick={() => {
                            const next = rides.map((x) =>
                              x.id === r.id ? { ...x, review: false } : x
                            );
                            setRides(next);
                            saveRafiqRides(next);
                            triggerToast('تم اعتماد الرحلة ونشرها');
                          }}
                          className="min-h-[36px] px-3 py-1 rounded-xl bg-emerald-600 text-white text-xs font-extrabold cursor-pointer"
                        >
                          اعتماد
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setEditingRideId(r.id);
                          setIsAddingRide(false);
                          setRideDraft({
                            from: r.from,
                            to: r.to,
                            date: r.date,
                            time: r.time,
                            type: r.type,
                            price: r.price,
                            seats: r.seats,
                            car: r.car,
                            note: r.note,
                            who: r.who,
                            phone: r.phone,
                          });
                        }}
                        className="min-h-[36px] px-3 py-1 rounded-xl bg-[var(--bg)] border border-[var(--line)] text-xs font-bold text-[var(--ink)] cursor-pointer flex items-center gap-1"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>تعديل</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleQuickBan(
                            r.phone || r.who,
                            'driver',
                            'rides',
                            `حظر سائق في رفيق الطريق: ${r.who}`
                          )
                        }
                        className={`min-h-[36px] px-3 py-1 rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1 border ${
                          banned
                            ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-600'
                            : 'bg-amber-500/10 border-amber-500/30 text-amber-600'
                        }`}
                      >
                        <Ban className="w-3.5 h-3.5" />
                        <span>{banned ? 'فك الحظر' : 'حظر الرقم'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const next = rides.filter((x) => x.id !== r.id);
                          setRides(next);
                          saveRafiqRides(next);
                          fetch(`/api/rafiq/rides/${r.id}`, { method: 'DELETE' }).catch(() => {});
                          triggerToast('تم حذف الرحلة نهائياً');
                        }}
                        className="min-h-[36px] px-3 py-1 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 text-xs font-bold cursor-pointer flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>حذف</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {ridesSubTab === 'drivers' && (
            <div className="space-y-2.5">
              {drivers.map((dr) => {
                const isBanned = Boolean(dr.banned || isTargetBanned(dr.name));
                return (
                  <div
                    key={dr.id}
                    className="bg-[var(--card)] border border-[var(--line)] rounded-2xl p-4 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-[var(--bg)] border border-[var(--line)] flex items-center justify-center font-extrabold text-xs text-[var(--ink)]">
                        {dr.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <b className="text-xs sm:text-sm text-[var(--ink)]">{dr.name}</b>
                          {dr.verified && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-600">
                              سائق موثّق ✓
                            </span>
                          )}
                          {isBanned && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-600 text-white">
                              محظور
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-[var(--mute)]">
                          عدد الرحلات المسجلة: {rides.filter((r) => r.uid === dr.id || r.who === dr.name).length}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          const next = drivers.map((d) =>
                            d.id === dr.id ? { ...d, verified: !d.verified } : d
                          );
                          setDrivers(next);
                          saveRafiqDrivers(next);
                          triggerToast(
                            !dr.verified
                              ? `تم توثيق السائق «${dr.name}»`
                              : `تم إلغاء توثيق السائق «${dr.name}»`
                          );
                        }}
                        className="min-h-[36px] px-3 py-1 rounded-xl bg-[var(--bg)] border border-[var(--line)] text-xs font-bold text-[var(--ink)] cursor-pointer"
                      >
                        {dr.verified ? 'إلغاء التوثيق' : 'توثيق السائق'}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const nextBanned = !dr.banned;
                          const next = drivers.map((d) =>
                            d.id === dr.id ? { ...d, banned: nextBanned } : d
                          );
                          setDrivers(next);
                          saveRafiqDrivers(next);
                          handleQuickBan(dr.name, 'driver', 'rides', 'حظر سائق من لوحة المالك');
                        }}
                        className={`min-h-[36px] px-3 py-1 rounded-xl text-xs font-bold cursor-pointer border ${
                          isBanned
                            ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-600'
                            : 'bg-rose-500/10 border-rose-500/30 text-rose-600'
                        }`}
                      >
                        {isBanned ? 'فك الحظر' : 'حظر السائق'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          DEPARTMENT 3: OASIS MAP & TASKS (جهة الخريطة والمهام)
         ===================================================================== */}
      {section === 'maps_tasks' && (
        <div className="space-y-4">
          <div className="bg-[var(--card)] border border-[var(--line)] rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--line)] pb-3">
              <div>
                <b className="text-sm font-extrabold text-[var(--ink)] flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-emerald-500" />
                  <span>إدارة خريطة الواحة والمهام المجتمعية</span>
                </b>
                <p className="text-[11px] text-[var(--mute)] m-0 mt-0.5">
                  إضافة وتعديل وحذف المعالم الجغرافية والمرافق الحيوية والمهام المجتمعية في عين صالح.
                </p>
              </div>
              {onOpenServiceView && (
                <button
                  type="button"
                  onClick={() => onOpenServiceView('maps_tasks')}
                  className="min-h-[40px] px-3.5 py-2 rounded-xl bg-[var(--bg)] border border-[var(--line)] hover:border-emerald-500 text-xs font-bold text-[var(--ink)] cursor-pointer shrink-0"
                >
                  معاينة الخريطة والمهام ↗
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMapsSubTab('places')}
                className={`min-h-[44px] py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer ${
                  mapsSubTab === 'places'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-[var(--bg)] border border-[var(--line)] text-[var(--mute)]'
                }`}
              >
                <MapPin className="w-4 h-4" />
                <span className="tabular-nums">معالم الخريطة ({places.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setMapsSubTab('tasks')}
                className={`min-h-[44px] py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer ${
                  mapsSubTab === 'tasks'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-[var(--bg)] border border-[var(--line)] text-[var(--mute)]'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span className="tabular-nums">المهام المجتمعية ({tasks.length})</span>
              </button>
            </div>
          </div>

          {mapsSubTab === 'places' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-[var(--ink)]">
                  المعالم والمرافق المسجلة على الخريطة ({places.length})
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingPlace((p) => !p);
                    setEditingPlaceId(null);
                    setPlaceDraft({
                      name: '',
                      nameAr: '',
                      category: 'public_service',
                      lat: '27.1975',
                      lng: '2.4835',
                      description: '',
                      phone: '',
                    });
                  }}
                  className="min-h-[40px] px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isAddingPlace ? 'إلغاء' : 'إضافة معلم جديد'}</span>
                </button>
              </div>

              {(isAddingPlace || editingPlaceId !== null) && (
                <div className="bg-[var(--card)] border border-emerald-500/40 rounded-2xl p-4 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <input
                      type="text"
                      value={placeDraft.nameAr}
                      onChange={(e) => setPlaceDraft((p) => ({ ...p, nameAr: e.target.value }))}
                      placeholder="الاسم بالعربية *"
                      className="min-h-[40px] px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--line)] text-xs font-bold text-[var(--ink)]"
                    />
                    <input
                      type="text"
                      value={placeDraft.name}
                      onChange={(e) => setPlaceDraft((p) => ({ ...p, name: e.target.value }))}
                      placeholder="الاسم باللاتينية (اختياري)"
                      className="min-h-[40px] px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--line)] text-xs text-[var(--ink)]"
                    />
                    <select
                      value={placeDraft.category}
                      onChange={(e) => setPlaceDraft((p) => ({ ...p, category: e.target.value }))}
                      className="min-h-[40px] px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--line)] text-xs font-bold text-[var(--ink)]"
                    >
                      <option value="health">صحة وطوارئ</option>
                      <option value="heritage">معالم وتراث</option>
                      <option value="oasis">بساتين وفقارات</option>
                      <option value="public_service">مرافق وخدمات</option>
                      <option value="market">أسواق وتمور</option>
                    </select>
                    <input
                      type="tel"
                      value={placeDraft.phone || ''}
                      onChange={(e) => setPlaceDraft((p) => ({ ...p, phone: e.target.value }))}
                      placeholder="رقم الهاتف (اختياري)"
                      className="min-h-[40px] px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--line)] text-xs font-mono text-[var(--ink)]"
                    />
                    <input
                      type="text"
                      value={placeDraft.lat}
                      onChange={(e) => setPlaceDraft((p) => ({ ...p, lat: e.target.value }))}
                      placeholder="خط العرض (Lat)"
                      className="min-h-[40px] px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--line)] text-xs font-mono text-[var(--ink)]"
                    />
                    <input
                      type="text"
                      value={placeDraft.lng}
                      onChange={(e) => setPlaceDraft((p) => ({ ...p, lng: e.target.value }))}
                      placeholder="خط الطول (Lng)"
                      className="min-h-[40px] px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--line)] text-xs font-mono text-[var(--ink)]"
                    />
                  </div>
                  <input
                    type="text"
                    value={placeDraft.description || ''}
                    onChange={(e) => setPlaceDraft((p) => ({ ...p, description: e.target.value }))}
                    placeholder="وصف المعلم أو المرفق..."
                    className="w-full min-h-[40px] px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--line)] text-xs text-[var(--ink)]"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (!placeDraft.nameAr.trim()) return;
                        if (editingPlaceId !== null) {
                          const next = places.map((pl) =>
                            pl.id === editingPlaceId
                              ? {
                                  ...pl,
                                  ...placeDraft,
                                  name: placeDraft.name.trim() || placeDraft.nameAr.trim(),
                                }
                              : pl
                          );
                          setPlaces(next);
                          saveStoredOasisPlaces(next);
                          setEditingPlaceId(null);
                          triggerToast('تم تعديل المعلم الجغرافي');
                        } else {
                          const newPlace: StoredOasisPlace = {
                            id: Date.now(),
                            ...placeDraft,
                            name: placeDraft.name.trim() || placeDraft.nameAr.trim(),
                          };
                          const next = [newPlace, ...places];
                          setPlaces(next);
                          saveStoredOasisPlaces(next);
                          setIsAddingPlace(false);
                          triggerToast('تمت إضافة المعلم إلى خريطة الواحة');
                        }
                      }}
                      className="flex-1 min-h-[40px] bg-emerald-600 text-white rounded-xl text-xs font-extrabold cursor-pointer"
                    >
                      حفظ المعلم
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingPlace(false);
                        setEditingPlaceId(null);
                      }}
                      className="min-h-[40px] px-4 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-xs font-bold text-[var(--mute)] cursor-pointer"
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              )}

              {places.map((pl) => (
                <div
                  key={pl.id}
                  className="bg-[var(--card)] border border-[var(--line)] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div>
                    <b className="text-xs sm:text-sm font-extrabold text-[var(--ink)] block">{pl.nameAr}</b>
                    <span className="text-[11px] text-[var(--mute)] block">{pl.description}</span>
                    <span className="text-[10px] font-mono tabular-nums text-[var(--mute)]">
                      الإحداثيات: {pl.lat}, {pl.lng} {pl.phone ? `· هاتف: ${pl.phone}` : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingPlaceId(pl.id);
                        setIsAddingPlace(false);
                        setPlaceDraft({
                          name: pl.name,
                          nameAr: pl.nameAr,
                          category: pl.category,
                          lat: pl.lat,
                          lng: pl.lng,
                          description: pl.description || '',
                          phone: pl.phone || '',
                        });
                      }}
                      className="min-h-[36px] px-3 py-1 rounded-xl bg-[var(--bg)] border border-[var(--line)] text-xs font-bold text-[var(--ink)] cursor-pointer"
                    >
                      تعديل
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const next = places.filter((x) => x.id !== pl.id);
                        setPlaces(next);
                        saveStoredOasisPlaces(next);
                        triggerToast('تم حذف المعلم من الخريطة');
                      }}
                      className="min-h-[36px] px-3 py-1 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 text-xs font-bold cursor-pointer"
                    >
                      حذف
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {mapsSubTab === 'tasks' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-[var(--ink)]">
                  المهام والمبادرات المجتمعية ({tasks.length})
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingTask((p) => !p);
                    setEditingTaskId(null);
                  }}
                  className="min-h-[40px] px-3.5 py-2 rounded-xl bg-emerald-600 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{isAddingTask ? 'إلغاء' : 'إضافة مهمة جديدة'}</span>
                </button>
              </div>

              {(isAddingTask || editingTaskId !== null) && (
                <div className="bg-[var(--card)] border border-emerald-500/40 rounded-2xl p-4 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <input
                      type="text"
                      value={taskDraft.title}
                      onChange={(e) => setTaskDraft((p) => ({ ...p, title: e.target.value }))}
                      placeholder="عنوان المهمة *"
                      className="min-h-[40px] px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--line)] text-xs font-bold text-[var(--ink)]"
                    />
                    <input
                      type="text"
                      value={taskDraft.locationName || ''}
                      onChange={(e) => setTaskDraft((p) => ({ ...p, locationName: e.target.value }))}
                      placeholder="الموقع / الحي"
                      className="min-h-[40px] px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--line)] text-xs text-[var(--ink)]"
                    />
                  </div>
                  <input
                    type="text"
                    value={taskDraft.notes || ''}
                    onChange={(e) => setTaskDraft((p) => ({ ...p, notes: e.target.value }))}
                    placeholder="ملاحظات وتفاصيل المهمة..."
                    className="w-full min-h-[40px] px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--line)] text-xs text-[var(--ink)]"
                  />
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        if (!taskDraft.title.trim()) return;
                        if (editingTaskId !== null) {
                          const next = tasks.map((t) =>
                            t.id === editingTaskId ? { ...t, ...taskDraft } : t
                          );
                          setTasks(next);
                          saveStoredCommunityTasks(next);
                          setEditingTaskId(null);
                          triggerToast('تم حفظ تعديل المهمة');
                        } else {
                          const newTask: StoredCommunityTask = {
                            id: Date.now(),
                            ...taskDraft,
                          };
                          const next = [newTask, ...tasks];
                          setTasks(next);
                          saveStoredCommunityTasks(next);
                          setIsAddingTask(false);
                          try {
                            await fetch('/api/community-tasks', {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify(taskDraft),
                            });
                          } catch {}
                          triggerToast('تمت إضافة المهمة المجتمعية');
                        }
                      }}
                      className="flex-1 min-h-[40px] bg-emerald-600 text-white rounded-xl text-xs font-extrabold cursor-pointer"
                    >
                      حفظ المهمة
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingTask(false);
                        setEditingTaskId(null);
                      }}
                      className="min-h-[40px] px-4 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-xs font-bold text-[var(--mute)] cursor-pointer"
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              )}

              {tasks.length === 0 ? (
                <div className="p-6 text-center bg-[var(--card)] border border-[var(--line)] rounded-2xl text-xs text-[var(--mute)]">
                  لا توجد مهام مجتمعية مسجلة حالياً.
                </div>
              ) : (
                tasks.map((tk) => (
                  <div
                    key={tk.id}
                    className="bg-[var(--card)] border border-[var(--line)] rounded-2xl p-4 flex items-center justify-between gap-3"
                  >
                    <div>
                      <b className="text-xs sm:text-sm font-extrabold text-[var(--ink)] block">{tk.title}</b>
                      <span className="text-[11px] text-[var(--mute)]">
                        {tk.locationName || 'عين صالح'} {tk.notes ? `· ${tk.notes}` : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingTaskId(tk.id);
                          setIsAddingTask(false);
                          setTaskDraft({
                            title: tk.title,
                            notes: tk.notes || '',
                            status: tk.status,
                            dueDate: tk.dueDate || '',
                            locationName: tk.locationName || '',
                            category: tk.category || 'community',
                          });
                        }}
                        className="min-h-[36px] px-3 py-1 rounded-xl bg-[var(--bg)] border border-[var(--line)] text-xs font-bold text-[var(--ink)] cursor-pointer"
                      >
                        تعديل
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const next = tasks.filter((x) => x.id !== tk.id);
                          setTasks(next);
                          saveStoredCommunityTasks(next);
                          fetch(`/api/community-tasks/${tk.id}`, { method: 'DELETE' }).catch(() => {});
                          triggerToast('تم حذف المهمة');
                        }}
                        className="min-h-[36px] px-3 py-1 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 text-xs font-bold cursor-pointer"
                      >
                        حذف
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          DEPARTMENT 4: DESERT SAFETY & TRIPS (جهة الرحلات الصحراوية والسلامة)
         ===================================================================== */}
      {section === 'desert' && (
        <div className="space-y-4">
          <div className="bg-[var(--card)] border border-[var(--line)] rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--line)] pb-3">
              <div>
                <b className="text-sm font-extrabold text-[var(--ink)] flex items-center gap-2">
                  <Compass className="w-4 h-4 text-amber-500" />
                  <span>إدارة قسم السلامة الصحراوية ومتتبع الرحلات</span>
                </b>
                <p className="text-[11px] text-[var(--mute)] m-0 mt-0.5">
                  متابعة وتعديل وإلغاء الرحلات الصحراوية المسجلة، حظر الأرقام المخالفة، وتحديث قائمة إرشادات السلامة.
                </p>
              </div>
              {onOpenServiceView && (
                <button
                  type="button"
                  onClick={() => onOpenServiceView('desert')}
                  className="min-h-[40px] px-3.5 py-2 rounded-xl bg-[var(--bg)] border border-[var(--line)] hover:border-amber-500 text-xs font-bold text-[var(--ink)] cursor-pointer shrink-0"
                >
                  معاينة قسم الصحراء ↗
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDesertSubTab('trips')}
                className={`min-h-[44px] py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer ${
                  desertSubTab === 'trips'
                    ? 'bg-amber-500 text-black'
                    : 'bg-[var(--bg)] border border-[var(--line)] text-[var(--mute)]'
                }`}
              >
                <Compass className="w-4 h-4" />
                <span className="tabular-nums">الرحلات المسجلة ({desertTrips.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setDesertSubTab('checklist')}
                className={`min-h-[44px] py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer ${
                  desertSubTab === 'checklist'
                    ? 'bg-amber-500 text-black'
                    : 'bg-[var(--bg)] border border-[var(--line)] text-[var(--mute)]'
                }`}
              >
                <AlertTriangle className="w-4 h-4" />
                <span className="tabular-nums">إرشادات السلامة ({desertChecklist.length})</span>
              </button>
            </div>
          </div>

          {desertSubTab === 'trips' && (
            <div className="space-y-3">
              {editingDesertTripId && (
                <div className="bg-[var(--card)] border border-amber-500/40 rounded-2xl p-4 space-y-3">
                  <b className="text-xs font-extrabold text-amber-500 block">تعديل بيانات الرحلة الصحراوية:</b>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <input
                      type="text"
                      value={desertTripDraft.d}
                      onChange={(e) => setDesertTripDraft((p) => ({ ...p, d: e.target.value }))}
                      placeholder="الوجهة الصحراوية"
                      className="min-h-[40px] px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--line)] text-xs font-bold text-[var(--ink)]"
                    />
                    <input
                      type="tel"
                      value={desertTripDraft.p}
                      onChange={(e) => setDesertTripDraft((p) => ({ ...p, p: e.target.value }))}
                      placeholder="هاتف الطوارئ"
                      className="min-h-[40px] px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--line)] text-xs font-mono text-[var(--ink)]"
                    />
                    <select
                      value={desertTripDraft.status}
                      onChange={(e) =>
                        setDesertTripDraft((p) => ({
                          ...p,
                          status: e.target.value as 'active' | 'completed' | 'cancelled',
                        }))
                      }
                      className="min-h-[40px] px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--line)] text-xs font-bold text-[var(--ink)]"
                    >
                      <option value="active">نشطة (جارية)</option>
                      <option value="completed">مكتملة (عاد بسلام)</option>
                      <option value="cancelled">ملغاة</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const next = desertTrips.map((tr) =>
                          tr.id === editingDesertTripId
                            ? {
                                ...tr,
                                d: desertTripDraft.d.trim() || tr.d,
                                p: desertTripDraft.p.trim(),
                                status: desertTripDraft.status,
                              }
                            : tr
                        );
                        setDesertTrips(next);
                        saveDesertTrips(next);
                        setEditingDesertTripId(null);
                        triggerToast('تم تحديث بيانات الرحلة الصحراوية');
                      }}
                      className="flex-1 min-h-[40px] bg-amber-500 text-black rounded-xl text-xs font-extrabold cursor-pointer"
                    >
                      حفظ التعديل
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingDesertTripId(null)}
                      className="min-h-[40px] px-4 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-xs font-bold text-[var(--mute)] cursor-pointer"
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              )}

              {desertTrips.length === 0 ? (
                <div className="p-6 text-center bg-[var(--card)] border border-[var(--line)] rounded-2xl text-xs text-[var(--mute)]">
                  لا توجد رحلات صحراوية مسجلة حالياً في متتبع المسار.
                </div>
              ) : (
                desertTrips.map((tr) => {
                  const isBanned = isTargetBanned(tr.p);
                  return (
                    <div
                      key={tr.id}
                      className="bg-[var(--card)] border border-[var(--line)] rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <b className="text-xs sm:text-sm font-extrabold text-[var(--ink)]">
                            الوجهة: {tr.d}
                          </b>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                              tr.status === 'active'
                                ? 'bg-emerald-500/15 text-emerald-600'
                                : 'bg-[var(--bg)] text-[var(--mute)]'
                            }`}
                          >
                            {tr.status === 'active' ? 'رحلة نشطة' : 'منتهية'}
                          </span>
                        </div>
                        <div className="text-xs text-[var(--mute)] font-mono tabular-nums">
                          موعد العودة: {new Date(tr.t).toLocaleString('ar-DZ')} · هاتف الطوارئ: {tr.p || 'غير محدد'}
                        </div>
                      </div>

                      <div className="flex items-center flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingDesertTripId(tr.id);
                            setDesertTripDraft({
                              d: tr.d,
                              p: tr.p,
                              returnStr: new Date(tr.t).toISOString().slice(0, 16),
                              status: tr.status,
                            });
                          }}
                          className="min-h-[36px] px-3 py-1 rounded-xl bg-[var(--bg)] border border-[var(--line)] text-xs font-bold text-[var(--ink)] cursor-pointer"
                        >
                          تعديل
                        </button>
                        {tr.p && (
                          <button
                            type="button"
                            onClick={() =>
                              handleQuickBan(
                                tr.p,
                                'phone',
                                'desert',
                                `حظر رقم طوارئ في متتبع الصحراء (${tr.d})`
                              )
                            }
                            className="min-h-[36px] px-3 py-1 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-600 text-xs font-bold cursor-pointer"
                          >
                            {isBanned ? 'فك حظر الرقم' : 'حظر الرقم'}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            const next = desertTrips.filter((x) => x.id !== tr.id);
                            setDesertTrips(next);
                            saveDesertTrips(next);
                            triggerToast('تم حذف وإنهاء الرحلة الصحراوية');
                          }}
                          className="min-h-[36px] px-3 py-1 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 text-xs font-bold cursor-pointer"
                        >
                          حذف / إنهاء
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {desertSubTab === 'checklist' && (
            <div className="bg-[var(--card)] border border-[var(--line)] rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <b className="text-xs font-extrabold text-[var(--ink)]">
                  قائمة إرشادات السلامة الصحراوية المعتمدة
                </b>
                <button
                  type="button"
                  onClick={() => {
                    setDesertChecklist(DEFAULT_DESERT_CHECKLIST);
                    saveDesertChecklist(DEFAULT_DESERT_CHECKLIST);
                    triggerToast('تمت استعادة إرشادات السلامة الافتراضية');
                  }}
                  className="text-[11px] font-bold text-amber-600 hover:underline cursor-pointer"
                >
                  استعادة الافتراضي
                </button>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newChecklistItem}
                  onChange={(e) => setNewChecklistItem(e.target.value)}
                  placeholder="أضف بنداً أو توجيهاً جديداً للسلامة الصحراوية..."
                  className="flex-1 min-h-[40px] px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--line)] text-xs text-[var(--ink)]"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!newChecklistItem.trim()) return;
                    const next = [...desertChecklist, newChecklistItem.trim()];
                    setDesertChecklist(next);
                    saveDesertChecklist(next);
                    setNewChecklistItem('');
                    triggerToast('تمت إضافة الإرشاد الجديد');
                  }}
                  className="min-h-[40px] px-4 rounded-xl bg-amber-500 text-black text-xs font-extrabold cursor-pointer"
                >
                  إضافة
                </button>
              </div>

              <div className="space-y-2">
                {desertChecklist.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-[var(--bg)] border border-[var(--line)] flex items-center justify-between gap-2 text-xs"
                  >
                    {editingChecklistIdx === idx ? (
                      <div className="flex-1 flex items-center gap-2">
                        <input
                          type="text"
                          value={editingChecklistText}
                          onChange={(e) => setEditingChecklistText(e.target.value)}
                          className="flex-1 min-h-[36px] px-2.5 py-1 rounded-lg bg-[var(--card)] border border-amber-500 text-xs text-[var(--ink)]"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (!editingChecklistText.trim()) return;
                            const next = desertChecklist.map((it, i) =>
                              i === idx ? editingChecklistText.trim() : it
                            );
                            setDesertChecklist(next);
                            saveDesertChecklist(next);
                            setEditingChecklistIdx(null);
                            triggerToast('تم تعديل البند');
                          }}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold cursor-pointer"
                        >
                          حفظ
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="text-[var(--ink)] leading-relaxed">{item}</span>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingChecklistIdx(idx);
                              setEditingChecklistText(item);
                            }}
                            className="px-2.5 py-1 rounded-lg bg-[var(--card)] border border-[var(--line)] text-[11px] font-bold text-[var(--ink)] cursor-pointer"
                          >
                            تعديل
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const next = desertChecklist.filter((_, i) => i !== idx);
                              setDesertChecklist(next);
                              saveDesertChecklist(next);
                              triggerToast('تم حذف البند');
                            }}
                            className="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-600 text-[11px] font-bold cursor-pointer"
                          >
                            حذف
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          DEPARTMENT 5: AI AGENTS (جهة الوكلاء الذكيين)
         ===================================================================== */}
      {section === 'agents' && (
        <div className="space-y-4">
          <div className="bg-[var(--card)] border border-[var(--line)] rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <b className="text-sm font-extrabold text-[var(--ink)] flex items-center gap-2">
                  <Bot className="w-4 h-4 text-emerald-500" />
                  <span>إدارة وتخصيص الوكلاء الذكيين لمنصة تيدكلت AI</span>
                </b>
                <p className="text-[11px] text-[var(--mute)] m-0 mt-0.5">
                  تعديل أسماء ومهام وتوجيهات الوكلاء أو تفعيل وتعطيل أي وكيل، مع وصول مباشر لمستودع التدريب والصور.
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {onOpenTrainingStudio && (
                  <>
                    <button
                      type="button"
                      onClick={() => onOpenTrainingStudio('sft')}
                      className="min-h-[38px] px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>تدريب RAG</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenTrainingStudio('avatars')}
                      className="min-h-[38px] px-3 py-1.5 rounded-xl bg-[var(--bg)] border border-[var(--line)] text-xs font-bold text-[var(--ink)] flex items-center gap-1.5 cursor-pointer"
                    >
                      <ImageIcon className="w-3.5 h-3.5 text-amber-500" />
                      <span>صور الوكلاء</span>
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setAgents(DEFAULT_AGENTS_LIST);
                    saveAgentOverrides(DEFAULT_AGENTS_LIST);
                    triggerToast('تمت استعادة الإعدادات الافتراضية للوكلاء');
                  }}
                  className="min-h-[38px] px-3 py-1.5 rounded-xl bg-[var(--bg)] border border-[var(--line)] text-xs font-bold text-[var(--mute)] hover:text-[var(--ink)] cursor-pointer"
                >
                  استعادة الافتراضي
                </button>
              </div>
            </div>
          </div>

          {editingAgentId && agentDraft && (
            <div className="bg-[var(--card)] border border-emerald-500/40 rounded-2xl p-4 space-y-3">
              <b className="text-xs font-extrabold text-emerald-600 block">
                تعديل الوكيل الذكي ({agentDraft.name}):
              </b>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <input
                  type="text"
                  value={agentDraft.name}
                  onChange={(e) => setAgentDraft((p) => (p ? { ...p, name: e.target.value } : null))}
                  placeholder="اسم الوكيل"
                  className="min-h-[40px] px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--line)] text-xs font-bold text-[var(--ink)]"
                />
                <input
                  type="text"
                  value={agentDraft.emoji}
                  onChange={(e) => setAgentDraft((p) => (p ? { ...p, emoji: e.target.value } : null))}
                  placeholder="الأيقونة التعبيرية"
                  className="min-h-[40px] px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--line)] text-xs text-[var(--ink)]"
                />
                <input
                  type="text"
                  value={agentDraft.role}
                  onChange={(e) => setAgentDraft((p) => (p ? { ...p, role: e.target.value } : null))}
                  placeholder="التخصص والوصف"
                  className="min-h-[40px] px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--line)] text-xs text-[var(--ink)]"
                />
              </div>
              <textarea
                rows={2}
                value={agentDraft.customPrompt || ''}
                onChange={(e) =>
                  setAgentDraft((p) => (p ? { ...p, customPrompt: e.target.value } : null))
                }
                placeholder="تعليمات إضافية مخصصة لهذا الوكيل (System Prompt Override)..."
                className="w-full p-3 rounded-xl bg-[var(--bg)] border border-[var(--line)] text-xs text-[var(--ink)]"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const next = agents.map((ag) => (ag.id === editingAgentId ? agentDraft : ag));
                    setAgents(next);
                    saveAgentOverrides(next);
                    setEditingAgentId(null);
                    setAgentDraft(null);
                    triggerToast('تم حفظ تعديلات الوكيل الذكي');
                  }}
                  className="flex-1 min-h-[40px] bg-emerald-600 text-white rounded-xl text-xs font-extrabold cursor-pointer"
                >
                  حفظ التعديل
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingAgentId(null);
                    setAgentDraft(null);
                  }}
                  className="min-h-[40px] px-4 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-xs font-bold text-[var(--mute)] cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {agents.map((ag) => (
              <div
                key={ag.id}
                className={`bg-[var(--card)] border rounded-2xl p-4 space-y-2.5 flex flex-col justify-between ${
                  ag.enabled ? 'border-[var(--line)]' : 'border-rose-500/30 opacity-70'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="w-10 h-10 rounded-xl bg-[var(--bg)] border border-[var(--line)] flex items-center justify-center text-lg">
                      {ag.emoji}
                    </span>
                    <div>
                      <b className="text-xs sm:text-sm font-extrabold text-[var(--ink)] block">{ag.name}</b>
                      <span className="text-[11px] text-[var(--mute)]">{ag.role}</span>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                      ag.enabled
                        ? 'bg-emerald-500/15 text-emerald-600'
                        : 'bg-rose-500/15 text-rose-600'
                    }`}
                  >
                    {ag.enabled ? 'مفعّل' : 'معطّل'}
                  </span>
                </div>

                {ag.customPrompt && (
                  <div className="text-[11px] p-2 rounded-lg bg-[var(--bg)] border border-[var(--line)] text-[var(--mute)]">
                    توجيه مخصص: {ag.customPrompt}
                  </div>
                )}

                <div className="flex items-center gap-2 pt-2 border-t border-[var(--line)]/60">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingAgentId(ag.id);
                      setAgentDraft(ag);
                    }}
                    className="flex-1 min-h-[36px] rounded-xl bg-[var(--bg)] border border-[var(--line)] hover:border-emerald-500 text-xs font-bold text-[var(--ink)] cursor-pointer"
                  >
                    تعديل الوكيل
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const next = agents.map((x) =>
                        x.id === ag.id ? { ...x, enabled: !x.enabled } : x
                      );
                      setAgents(next);
                      saveAgentOverrides(next);
                      triggerToast(ag.enabled ? `تم تعطيل ${ag.name}` : `تم تفعيل ${ag.name}`);
                    }}
                    className={`min-h-[36px] px-3 rounded-xl text-xs font-bold cursor-pointer border ${
                      ag.enabled
                        ? 'bg-rose-500/10 border-rose-500/30 text-rose-600'
                        : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600'
                    }`}
                  >
                    {ag.enabled ? 'تعطيل' : 'تفعيل'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =====================================================================
          DEPARTMENT 6: GLOBAL BAN & UNBAN LIST (جهة الحظر وفك الحظر)
         ===================================================================== */}
      {section === 'bans' && (
        <div className="space-y-4">
          {/* Add Ban Form */}
          <div className="bg-[var(--card)] border border-rose-500/30 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-sm">
            <div>
              <b className="text-sm font-extrabold text-[var(--ink)] flex items-center gap-2">
                <Ban className="w-4 h-4 text-rose-500" />
                <span>حظر أرقام الهواتف والمرسلين المخالفين مع قائمة فك الحظر</span>
              </b>
              <p className="text-[11px] text-[var(--mute)] m-0 mt-0.5">
                أي رقم هاتف أو اسم مرسل يُدرج هنا يُمنع فوراً من إرسال الرسائل أو نشر الرحلات أو التعليق في جميع أقسام المنصة حتى يقوم المالك بفك الحظر عنه.
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newBanTarget.trim()) return;
                addBanEntry({
                  target: newBanTarget.trim(),
                  type: newBanType,
                  section: newBanSection,
                  reason: newBanReason.trim() || 'حظر إداري من مالك منصة تيدكلت AI',
                });
                setBanList(loadBanList());
                setNewBanTarget('');
                setNewBanReason('');
                triggerToast('تمت إضافة الحظر بنجاح وتفعيله في المنصة');
              }}
              className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 pt-1"
            >
              <input
                type="text"
                required
                value={newBanTarget}
                onChange={(e) => setNewBanTarget(e.target.value)}
                placeholder="رقم الهاتف أو اسم المرسل *"
                className="min-h-[42px] px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--line)] text-xs font-bold text-[var(--ink)]"
              />
              <select
                value={newBanType}
                onChange={(e) => setNewBanType(e.target.value as BannedEntity['type'])}
                className="min-h-[42px] px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--line)] text-xs font-bold text-[var(--ink)]"
              >
                <option value="phone">رقم هاتف</option>
                <option value="sender">اسم مرسل / معلق</option>
                <option value="driver">سائق رفيق الطريق</option>
                <option value="association">جمعية</option>
              </select>
              <select
                value={newBanSection}
                onChange={(e) => setNewBanSection(e.target.value as BannedEntity['section'])}
                className="min-h-[42px] px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--line)] text-xs font-bold text-[var(--ink)]"
              >
                <option value="general">جميع الأقسام (شامل)</option>
                <option value="charity">قسم باب الخير</option>
                <option value="rides">قسم رفيق الطريق</option>
                <option value="news">قسم الأخبار</option>
                <option value="desert">قسم الصحراء</option>
              </select>
              <button
                type="submit"
                className="min-h-[42px] px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Ban className="w-4 h-4" />
                <span>تأكيد الحظر الفوري</span>
              </button>
              <input
                type="text"
                value={newBanReason}
                onChange={(e) => setNewBanReason(e.target.value)}
                placeholder="سبب الحظر (اختياري — مثال: رقم وهمي أو إزعاج متكرر)"
                className="sm:col-span-4 min-h-[40px] px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--line)] text-xs text-[var(--ink)]"
              />
            </form>
          </div>

          {/* Unban List */}
          <div className="bg-[var(--card)] border border-[var(--line)] rounded-2xl p-4 sm:p-5 space-y-3 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--line)] pb-3">
              <div>
                <b className="text-xs sm:text-sm font-extrabold text-[var(--ink)] block">
                  قائمة المحظورين وفك الحظر ({banList.length})
                </b>
                <span className="text-[11px] text-[var(--mute)]">
                  اضغط على «فك الحظر» بجانب أي رقم أو مرسل لاستعادة صلاحياته فوراً
                </span>
              </div>
              <div className="relative sm:w-64">
                <input
                  type="search"
                  value={banSearchFilter}
                  onChange={(e) => setBanSearchFilter(e.target.value)}
                  placeholder="ابحث بالرقم أو الاسم..."
                  className="w-full min-h-[38px] px-3 py-1.5 rounded-xl bg-[var(--bg)] border border-[var(--line)] text-xs text-[var(--ink)]"
                />
              </div>
            </div>

            {banList.length === 0 ? (
              <div className="py-8 text-center text-xs text-[var(--mute)]">
                قائمة الحظر فارغة حالياً — لا توجد أرقام أو مرسلين محظورين.
              </div>
            ) : (
              <div className="space-y-2">
                {banList
                  .filter(
                    (b) =>
                      !banSearchFilter.trim() ||
                      b.target.toLowerCase().includes(banSearchFilter.trim().toLowerCase()) ||
                      b.reason.toLowerCase().includes(banSearchFilter.trim().toLowerCase())
                  )
                  .map((b) => (
                    <div
                      key={b.id}
                      className="p-3.5 rounded-xl bg-[var(--bg)] border border-rose-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center flex-wrap gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-rose-600 text-white text-[10px] font-extrabold">
                            محظور
                          </span>
                          <b className="text-xs sm:text-sm font-mono tabular-nums font-extrabold text-[var(--ink)]">
                            {b.target}
                          </b>
                          <span className="text-[11px] px-2 py-0.5 rounded-md bg-[var(--card)] border border-[var(--line)] text-[var(--mute)]">
                            القسم:{' '}
                            {b.section === 'charity'
                              ? 'باب الخير'
                              : b.section === 'rides'
                              ? 'رفيق الطريق'
                              : b.section === 'news'
                              ? 'الأخبار'
                              : b.section === 'desert'
                              ? 'الصحراء'
                              : 'شامل'}
                          </span>
                        </div>
                        <div className="text-xs text-[var(--mute)]">
                          السبب: {b.reason} · بتاريخ:{' '}
                          <span className="font-mono tabular-nums">
                            {new Date(b.createdAt).toLocaleString('ar-DZ')}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          removeBanEntry(b.id);
                          setBanList(loadBanList());
                          triggerToast(`تم فك الحظر عن «${b.target}» بنجاح`);
                        }}
                        className="min-h-[40px] px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                      >
                        <Unlock className="w-3.5 h-3.5" />
                        <span>فك الحظر</span>
                      </button>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
