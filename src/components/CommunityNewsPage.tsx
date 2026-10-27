import React, { useState, useRef, useEffect } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';

export interface NewsCommentItem {
  id: string;
  authorName: string;
  text: string;
  timestamp: number;
}

export interface CommunityNewsItem {
  id: string;
  s: string; // source or link
  t: string; // text
  category?: string;
  timestamp: number;
  status: 'approved' | 'pending' | 'rejected';
  authorName?: string;
  authorPhotoUrl?: string;
  neighborhood?: string;
  isOfficial?: boolean;
  officialVerified?: boolean;
  helpfulCount?: number;
  repostCount?: number;
  likeCount?: number;
  comments?: NewsCommentItem[];
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  mediaName?: string;
}

interface CommunityNewsPageProps {
  news: CommunityNewsItem[];
  setNews: React.Dispatch<React.SetStateAction<CommunityNewsItem[]>>;
  firebaseUser: FirebaseUser | null;
  isFirebaseSigningIn: boolean;
  onSignInGoogle: () => Promise<void>;
  isAdminLoggedIn: boolean;
  pendingCount: number;
  requireApproval: boolean;
  onOpenAdmin: () => void;
  onBackToChat: () => void;
  onEditNewsInAdmin: (item: CommunityNewsItem) => void;
  onDeleteNews: (id: string) => void;
  onSyncNewsToCloud?: (item: CommunityNewsItem) => Promise<void>;
  isLoadingCloudNews?: boolean;
  cloudNewsError?: string | null;
  onRefreshLiveNews?: () => Promise<void>;
  isRefreshingLiveNews?: boolean;
  onOpenRafiq?: () => void;
  onToggleSidebar?: () => void;
}

type CategoryKey = 'daily' | 'services' | 'roads' | 'health' | 'community';

interface MahaliyatUser {
  id: string;
  name: string;
  verified?: boolean;
  banned?: boolean;
}

interface MahaliyatPost {
  id: number;
  uid: string;
  cat: CategoryKey;
  place: string;
  ts: number;
  likes: number;
  demo?: boolean;
  review?: boolean;
  edited?: boolean;
  text: string;
  source: string;
  comments: string[];
  media?: {
    url: string;
    video: boolean;
  } | null;
}

const H = 3600e3;
const LOCK = 'mh_loc';

const CATS: Record<CategoryKey, [string, string]> = {
  daily: ['news', 'يوميات'],
  services: ['building', 'خدمات'],
  roads: ['road', 'طرق'],
  health: ['cross', 'صحة'],
  community: ['users', 'مجتمع'],
};

const INITIAL_USERS: MahaliyatUser[] = [
  { id: 'u0', name: 'أنت' },
  { id: 'u1', name: 'عبد القادر' },
  { id: 'u2', name: 'بلدية عين صالح', verified: true },
  { id: 'u3', name: 'سليمان' },
  { id: 'u4', name: 'دار الثقافة عين صالح', verified: true },
  { id: 'u5', name: 'مستخدم جديد' },
];

const createInitialPosts = (): MahaliyatPost[] => {
  const now = Date.now();
  return [
    {
      id: 1,
      uid: 'u1',
      cat: 'health',
      place: 'حي الديس',
      ts: now - 20 * H,
      likes: 14,
      demo: true,
      text: 'صيدلية المناوبة الليلية لنهاية الأسبوع هي صيدلية الرمال بحي الديس، قرب المستشفى القديم. يُرجى التأكد هاتفيًا قبل التنقل.',
      source: 'مجموعة أخبار سكان عين صالح',
      comments: ['مريم: شكرًا على التنبيه، هل المناوبة حتى الصباح؟'],
    },
    {
      id: 2,
      uid: 'u2',
      cat: 'services',
      place: 'وسط المدينة',
      ts: now - 26 * H,
      likes: 27,
      demo: true,
      text: 'تعلن بلدية عين صالح عن تنظيم حملة نظافة تطوعية في واحة النخيل يوم الجمعة القادم، بمشاركة الجمعيات المحلية ولجان الأحياء. نرحب بكل من يرغب في المشاركة.',
      source: 'صفحة بلدية عين صالح الرسمية',
      comments: ['إبراهيم: بالتوفيق، هل تتوفر أدوات للمشاركين؟'],
    },
    {
      id: 3,
      uid: 'u3',
      cat: 'roads',
      place: 'الطريق الوطني رقم 1',
      ts: now - 44 * H,
      likes: 19,
      demo: true,
      text: 'توجد رياح رملية خفيفة على الطريق الوطني رقم 1 باتجاه تمنراست. يُنصح السائقون بتخفيف السرعة، وتشغيل الأضواء، والتحقق من حالة الطريق قبل السفر.',
      source: 'مراسل محلي',
      comments: ['ناصر: شكرًا، الطريق سالكة الآن إلى غاية أراك.'],
    },
    {
      id: 4,
      uid: 'u4',
      cat: 'community',
      place: 'وسط المدينة',
      ts: now - 52 * H,
      likes: 9,
      demo: true,
      text: 'تنظيم معرض للصناعات التقليدية والمخطوطات التراثية لمنطقة تيديكلت بدار الثقافة، مع أمسيات شعرية وفلكلورية محلية. الدعوة مفتوحة للعائلات والمهتمين.',
      source: 'مديرية الثقافة والفنون',
      comments: ['فاطمة: مبادرة جميلة، ما توقيت بداية المعرض؟'],
    },
    {
      id: 5,
      uid: 'u5',
      cat: 'community',
      place: 'عين صالح',
      ts: now - 1 * H,
      likes: 0,
      demo: true,
      review: true,
      text: 'هل يعرف أحد مواعيد مكتب البريد هذا الأسبوع؟',
      source: '',
      comments: [],
    },
    {
      id: 6,
      uid: 'u1',
      cat: 'community',
      place: 'أدرار',
      ts: now - 14 * H,
      likes: 18,
      demo: true,
      text: 'افتتاح موسم جني وتسويق التمور في واحات أدرار وتيميمون مع إقبال واسع على الأسواق الشعبية وتوفر أصناف عالية الجودة.',
      source: 'شبكة فلاحي أدرار',
      comments: ['سالم: نوعية ممتازة هذا العام والأسعار مشجعة.'],
    },
    {
      id: 7,
      uid: 'u3',
      cat: 'services',
      place: 'تمنراست',
      ts: now - 28 * H,
      likes: 22,
      demo: true,
      text: 'انطلاق معرض الحرف التقليدية وتجهيزات الطاقة الشمسية والري الفلاحي بمدينة تمنراست بمشاركة حرفيين من مختلف بلديات الولاية.',
      source: 'غرفة الصناعة التقليدية تمنراست',
      comments: ['أحمد: فرصة ممتازة للشباب والمزارعين.'],
    },
    {
      id: 8,
      uid: 'u2',
      cat: 'services',
      place: 'الجزائر العاصمة',
      ts: now - 8 * H,
      likes: 35,
      demo: true,
      text: 'توسيع خدمات الدفع الإلكتروني والبطاقة الذهبية عبر كافة المكاتب البريدية والمراكز الحضرية.',
      source: 'بريد الجزائر',
      comments: [],
    },
  ];
};

function ago(ts: number): string {
  const m = Math.round((Date.now() - ts) / 6e4);
  if (m < 1) return 'الآن';
  if (m < 60) return 'قبل ' + m + (m <= 10 ? ' دقائق' : ' دقيقة');
  const h = Math.round(m / 60);
  if (h < 24) {
    return h === 1 ? 'قبل ساعة' : h === 2 ? 'قبل ساعتين' : 'قبل ' + h + (h <= 10 ? ' ساعات' : ' ساعة');
  }
  if (h < 48) return 'أمس';
  return new Date(ts).toLocaleDateString('ar-DZ', { day: 'numeric', month: 'short' });
}

function fallbackCountry(): string {
  try {
    if (Intl.DateTimeFormat().resolvedOptions().timeZone === 'Africa/Algiers') return 'الجزائر';
    const r = (navigator.language || '').split('-')[1];
    if (r) {
      const display = new Intl.DisplayNames(['ar'], { type: 'region' }).of(r.toUpperCase());
      if (display) return display;
    }
  } catch {
    // ignore
  }
  return 'الجزائر';
}

const cleanName = (n: string): string =>
  String(n || '')
    .replace(/^ولاية\s+/, '')
    .replace(/^(Wilaya|Province) of\s+/i, '')
    .replace(/\s+(Province|Wilaya)$/i, '')
    .trim();

export const CommunityNewsPage: React.FC<CommunityNewsPageProps> = ({
  setNews,
  isAdminLoggedIn,
  onOpenAdmin,
  onBackToChat,
  onSyncNewsToCloud,
  onOpenRafiq,
  onToggleSidebar,
}) => {
  const ME = 'u0';
  const [users, setUsers] = useState<MahaliyatUser[]>(INITIAL_USERS);
  const [posts, setPosts] = useState<MahaliyatPost[]>(createInitialPosts);

  const [selectedCat, setSelectedCat] = useState<'all' | CategoryKey>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'new' | 'top'>('new');
  const [notificationsOn, setNotificationsOn] = useState(false);

  const [openCommentsIds, setOpenCommentsIds] = useState<Set<number>>(new Set());
  const [likedIds, setLikedIds] = useState<Set<number>>(new Set());
  const [commentInputs, setCommentInputs] = useState<Record<number, string>>({});

  // Composer state
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [composerText, setComposerText] = useState('');
  const [composerCat, setComposerCat] = useState<CategoryKey>('daily');
  const [composerPlace, setComposerPlace] = useState('');
  const [composerSource, setComposerSource] = useState('');
  const [attachedFile, setAttachedFile] = useState<File | null>(null);

  // Admin & Menu state (strictly controlled by Owner Control Panel login)
  const isAdminMode = isAdminLoggedIn;
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [adminTab, setAdminTab] = useState<'users' | 'queue'>('users');
  const [openMenuPostId, setOpenMenuPostId] = useState<number | null>(null);

  // Inline edit state
  const [editingPostId, setEditingPostId] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');

  // Confirm Dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    okLabel: string;
    onConfirm: () => void;
  } | null>(null);

  // News feed displays automatically from everywhere without manual selection
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const composerRef = useRef<HTMLElement | null>(null);
  const txtRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToastMsg(null);
    }, 2300);
  };

  const getUser = (uid: string): MahaliyatUser =>
    users.find((u) => u.id === uid) || { id: uid, name: 'مستخدم' };

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (!target.closest('.menu-wrap')) {
        setOpenMenuPostId(null);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenMenuPostId(null);
        setConfirmDialog(null);
        setIsAdminPanelOpen(false);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('click', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const canEdit = (p: MahaliyatPost) => p.uid === ME && !getUser(ME).banned;
  const canMenu = (p: MahaliyatPost) => isAdminMode || p.uid === ME;
  const isPostVisible = (p: MahaliyatPost) => {
    if (isAdminMode) return true;
    const u = getUser(p.uid);
    if (u.banned) return false;
    if (p.review && p.uid !== ME) return false;
    return true;
  };

  const openComposer = () => {
    setIsComposerOpen(true);
    requestAnimationFrame(() => {
      txtRef.current?.focus();
    });
  };

  const handlePublish = async () => {
    if (getUser(ME).banned) {
      showToast('حسابك محظور من النشر');
      return;
    }
    const text = composerText.trim();
    if (text.length < 5) {
      showToast('اكتب نص الخبر أولًا');
      txtRef.current?.focus();
      return;
    }
    const placeVal = composerPlace.trim() || 'عين صالح';
    const sourceVal = composerSource.trim();
    const newId = Date.now();
    const newPost: MahaliyatPost = {
      id: newId,
      uid: ME,
      cat: composerCat,
      place: placeVal,
      ts: newId,
      likes: 0,
      review: !isAdminMode,
      text,
      source: sourceVal,
      comments: [],
      media: attachedFile
        ? {
            url: URL.createObjectURL(attachedFile),
            video: attachedFile.type.startsWith('video'),
          }
        : null,
    };

    setPosts((prev) => [newPost, ...prev]);

    const syncedItem: CommunityNewsItem = {
      id: String(newId),
      s: sourceVal || placeVal || 'محليات تيديكلت',
      t: text,
      category: composerCat,
      timestamp: newId,
      status: isAdminMode ? 'approved' : 'pending',
      authorName: 'أنت',
      neighborhood: placeVal,
    };
    setNews((prev) => [syncedItem, ...prev]);
    if (onSyncNewsToCloud) {
      try {
        await onSyncNewsToCloud(syncedItem);
      } catch {
        // ignore cloud sync error
      }
    }

    setComposerText('');
    setComposerPlace('');
    setComposerSource('');
    setAttachedFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setIsComposerOpen(false);
    setSelectedCat('all');
    setSortBy('new');
    showToast(isAdminMode ? 'تم نشر المنشور' : 'وصل منشورك للمراجعة');
  };

  const askConfirm = (
    title: string,
    message: string,
    okLabel: string,
    onConfirm: () => void
  ) => {
    setConfirmDialog({ title, message, okLabel, onConfirm });
  };

  const toggleVerifyUser = (uid: string) => {
    const target = getUser(uid);
    const nextVerified = !target.verified;
    setUsers((prev) =>
      prev.map((u) => (u.id === uid ? { ...u, verified: nextVerified } : u))
    );
    showToast(
      nextVerified
        ? 'مُنحت علامة التوثيق لـ ' + target.name
        : 'نُزعت علامة التوثيق من ' + target.name
    );
  };

  const toggleBanUser = (uid: string) => {
    const target = getUser(uid);
    if (target.banned) {
      setUsers((prev) =>
        prev.map((u) => (u.id === uid ? { ...u, banned: false } : u))
      );
      showToast('أُلغي حظر ' + target.name);
      return;
    }
    askConfirm(
      'حظر ' + target.name,
      'ستُخفى كل منشوراته، ولن يستطيع النشر أو التعليق.',
      'حظر',
      () => {
        setUsers((prev) =>
          prev.map((u) => (u.id === uid ? { ...u, banned: true } : u))
        );
        showToast('تم حظر ' + target.name);
      }
    );
  };

  const purgeUserPosts = (uid: string) => {
    const target = getUser(uid);
    askConfirm(
      'حذف منشورات ' + target.name,
      'ستُحذف كل منشوراته نهائيًا.',
      'حذف الكل',
      () => {
        setPosts((prev) => prev.filter((p) => p.uid !== uid));
        showToast('حُذفت منشورات ' + target.name);
      }
    );
  };

  const handleMenuAction = (p: MahaliyatPost, action: string) => {
    setOpenMenuPostId(null);
    if (action === 'edit') {
      setEditingPostId(p.id);
      setEditingText(p.text);
    } else if (action === 'del') {
      askConfirm('حذف المنشور', 'سيُحذف هذا المنشور نهائيًا.', 'حذف', () => {
        setPosts((prev) => prev.filter((x) => x.id !== p.id));
        setOpenCommentsIds((prev) => {
          const next = new Set(prev);
          next.delete(p.id);
          return next;
        });
        showToast('تم حذف المنشور');
      });
    } else if (action === 'ok') {
      setPosts((prev) =>
        prev.map((x) => (x.id === p.id ? { ...x, review: false } : x))
      );
      showToast('تم اعتماد المنشور');
    } else if (action === 'verify') {
      toggleVerifyUser(p.uid);
    } else if (action === 'ban') {
      toggleBanUser(p.uid);
    }
  };

  const handleToggleLike = (id: number) => {
    setLikedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleComments = (id: number) => {
    setOpenCommentsIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleShare = async (p: MahaliyatPost) => {
    const text = p.text.slice(0, 230) + (p.source ? '\nالمصدر: ' + p.source : '');
    try {
      if (navigator.share) {
        await navigator.share({ title: 'من محليات', text });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(text);
        showToast('نُسخ الخبر');
      }
    } catch {
      // ignore
    }
  };

  const handleAddComment = (e: React.FormEvent, postId: number) => {
    e.preventDefault();
    if (getUser(ME).banned) {
      showToast('حسابك محظور من التعليق');
      return;
    }
    const val = (commentInputs[postId] || '').trim();
    if (!val) return;
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId ? { ...p, comments: [...p.comments, 'أنت: ' + val] } : p
      )
    );
    setCommentInputs((prev) => ({ ...prev, [postId]: '' }));
  };

  const handleSaveEdit = (postId: number) => {
    const t = editingText.trim();
    if (t.length < 5) {
      showToast('اكتب نص الخبر أولًا');
      return;
    }
    setPosts((prev) =>
      prev.map((p) => (p.id === postId ? { ...p, text: t, edited: true } : p))
    );
    setEditingPostId(null);
    setEditingText('');
    showToast('تم حفظ التعديل');
  };

  const qLower = searchQuery.trim().toLowerCase();
  const getLikesCount = (p: MahaliyatPost) => p.likes + (likedIds.has(p.id) ? 1 : 0);

  const filteredPosts = posts
    .filter((p) => {
      if (!isPostVisible(p)) return false;
      if (selectedCat !== 'all' && p.cat !== selectedCat) return false;

      if (qLower) {
        const u = getUser(p.uid);
        const haystack = `${p.text} ${u.name} ${p.place} ${p.source || ''}`.toLowerCase();
        if (!haystack.includes(qLower)) return false;
      }
      return true;
    })
    .sort((a, b) =>
      sortBy === 'new' ? b.ts - a.ts : getLikesCount(b) - getLikesCount(a)
    );

  const pendingPosts = posts.filter((p) => p.review);
  const bannedUsersCount = users.filter((u) => u.banned).length;

  return (
    <div className="mahaliyat-page" dir="rtl" lang="ar">
      {/* SVG Sprite Symbols */}
      <svg className="svg-defs" aria-hidden="true">
        <defs>
          <symbol id="i-menu" viewBox="0 0 24 24">
            <path d="M4 6h16M4 12h16M4 18h16" />
          </symbol>
          <symbol id="i-search" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </symbol>
          <symbol id="i-bell" viewBox="0 0 24 24">
            <path d="M6 16v-5a6 6 0 0 1 12 0v5l2 2H4zM10 21h4" />
          </symbol>
          <symbol id="i-wheel" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9" />
            <circle cx="12" cy="12" r="2.2" />
            <path d="M12 14.2V21M9.9 11.2 3.6 9.6M14.1 11.2l6.3-1.6" />
          </symbol>
          <symbol id="i-image" viewBox="0 0 24 24">
            <rect x="3" y="4" width="18" height="16" rx="3" />
            <circle cx="9" cy="10" r="1.8" />
            <path d="m21 16-5-5-8 8" />
          </symbol>
          <symbol id="i-link" viewBox="0 0 24 24">
            <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" />
          </symbol>
          <symbol id="i-pin" viewBox="0 0 24 24">
            <path d="M12 21s7-6 7-11a7 7 0 0 0-14 0c0 5 7 11 7 11z" />
            <circle cx="12" cy="10" r="2.5" />
          </symbol>
          <symbol id="i-shield" viewBox="0 0 24 24">
            <path d="M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6z" />
            <path d="M12 8v5M12 16h.01" />
          </symbol>
          <symbol id="i-check" viewBox="0 0 24 24">
            <path d="M12 3l2.4 1.8 3-.1.9 2.9 2.4 1.8-.9 2.9.9 2.9-2.4 1.8-.9 2.9-3-.1L12 21l-2.4-1.8-3 .1-.9-2.9-2.4-1.8.9-2.9-.9-2.9 2.4-1.8.9-2.9 3 .1z" />
            <path d="m8.8 12 2.2 2.2 4.2-4.4" />
          </symbol>
          <symbol id="i-thumb" viewBox="0 0 24 24">
            <path d="M7 11v9H4v-9zM7 11l4-8a2 2 0 0 1 2 2v4h5.5a2 2 0 0 1 2 2.3l-1.2 6A2 2 0 0 1 17.3 20H7" />
          </symbol>
          <symbol id="i-chat" viewBox="0 0 24 24">
            <path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" />
          </symbol>
          <symbol id="i-share" viewBox="0 0 24 24">
            <circle cx="6" cy="12" r="2.5" />
            <circle cx="18" cy="6" r="2.5" />
            <circle cx="18" cy="18" r="2.5" />
            <path d="m8.2 10.8 7.6-3.6M8.2 13.2l7.6 3.6" />
          </symbol>
          <symbol id="i-flag" viewBox="0 0 24 24">
            <path d="M5 21V4M5 4h11l-2 4 2 4H5" />
          </symbol>
          <symbol id="i-send" viewBox="0 0 24 24">
            <path d="m22 3-9 18-2-8-8-2z" />
          </symbol>
          <symbol id="i-plus" viewBox="0 0 24 24">
            <path d="M12 5v14M5 12h14" />
          </symbol>
          <symbol id="i-x" viewBox="0 0 24 24">
            <path d="M6 6l12 12M18 6 6 18" />
          </symbol>
          <symbol id="i-clock" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </symbol>
          <symbol id="i-list" viewBox="0 0 24 24">
            <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />
          </symbol>
          <symbol id="i-news" viewBox="0 0 24 24">
            <rect x="4" y="4" width="16" height="16" rx="3" />
            <path d="M8 9h8M8 13h8M8 17h5" />
          </symbol>
          <symbol id="i-building" viewBox="0 0 24 24">
            <path d="M4 21V9l8-5 8 5v12M2 21h20M9 21v-6h6v6M9 11h.01M15 11h.01" />
          </symbol>
          <symbol id="i-road" viewBox="0 0 24 24">
            <path d="M8 3 5 21M16 3l3 18M12 4v3M12 11v3M12 18v3" />
          </symbol>
          <symbol id="i-cross" viewBox="0 0 24 24">
            <rect x="3" y="3" width="18" height="18" rx="4" />
            <path d="M12 8v8M8 12h8" />
          </symbol>
          <symbol id="i-users" viewBox="0 0 24 24">
            <circle cx="9" cy="8" r="3.2" />
            <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
            <circle cx="17.5" cy="9" r="2.4" />
            <path d="M17 14.2c2.4.2 4.5 2.1 4.5 5" />
          </symbol>
          <symbol id="i-dots" viewBox="0 0 24 24">
            <circle cx="5" cy="12" r="1.3" />
            <circle cx="12" cy="12" r="1.3" />
            <circle cx="19" cy="12" r="1.3" />
          </symbol>
          <symbol id="i-edit" viewBox="0 0 24 24">
            <path d="M4 20h4L19 9l-4-4L4 16z" />
            <path d="m13.5 6.5 4 4" />
          </symbol>
          <symbol id="i-trash" viewBox="0 0 24 24">
            <path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" />
          </symbol>
          <symbol id="i-ban" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9" />
            <path d="m5.6 5.6 12.8 12.8" />
          </symbol>
          <symbol id="i-panel" viewBox="0 0 24 24">
            <rect x="3" y="3" width="8" height="8" rx="2" />
            <rect x="13" y="3" width="8" height="5" rx="2" />
            <rect x="13" y="10" width="8" height="11" rx="2" />
            <rect x="3" y="13" width="8" height="8" rx="2" />
          </symbol>
          <symbol id="i-shieldok" viewBox="0 0 24 24">
            <path d="M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6z" />
            <path d="m8.8 12 2.2 2.2 4.2-4.4" />
          </symbol>
        </defs>
      </svg>

      {/* Top Sticky Bar — Simplified & Optimized for Mobile */}
      <header className="bar">
        <div className="bar-in">
          <div className="brand">
            {onToggleSidebar && (
              <button
                type="button"
                className="ib"
                onClick={onToggleSidebar}
                aria-label="القائمة الجانبية"
                title="القائمة الجانبية"
              >
                <svg className="i" aria-hidden="true">
                  <use href="#i-menu" />
                </svg>
              </button>
            )}
            <button
              type="button"
              className="mark"
              onClick={onBackToChat}
              title="العودة إلى المحادثة الذكية"
              aria-label="تيديكلت AI"
            >
              <img
                src="/icon.svg"
                alt="TA"
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover rounded-[9px]"
              />
            </button>
            <div className="brand-info">
              <span className="brand-title">كاش ما تعرف</span>
              <span className="loc" id="loc" title="أخبار ومستجدات المجتمع المحلي">
                <svg className="i i-12 text-[var(--green)]" aria-hidden="true">
                  <use href="#i-pin" />
                </svg>
                <span id="locT" className="font-bold">منشورات المجتمع المحلي</span>
              </span>
            </div>
          </div>

          <div className="bar-actions">
            {onOpenRafiq && (
              <button
                type="button"
                className="rafiq-switch-btn"
                aria-label="الانتقال إلى قسم الرحالة (كاش بلاصة معك)"
                title="كاش بلاصة معك · الرحالة"
                onClick={onOpenRafiq}
              >
                <svg className="i i-16" aria-hidden="true">
                  <use href="#i-wheel" />
                </svg>
                <span>الرحالة</span>
              </button>
            )}

            <button
              className="ib"
              id="sBtn"
              type="button"
              aria-label="بحث"
              aria-pressed={isSearchOpen}
              onClick={() => {
                const next = !isSearchOpen;
                setIsSearchOpen(next);
                if (next) {
                  setTimeout(() => searchInputRef.current?.focus(), 20);
                } else {
                  setSearchQuery('');
                }
              }}
            >
              <svg className="i">
                <use href="#i-search" />
              </svg>
            </button>

            {isAdminMode && (
              <button
                className="ib"
                id="pBtn"
                type="button"
                aria-label="لوحة التحكم"
                title="لوحة تحكم المشرف والمالك"
                onClick={() => setIsAdminPanelOpen(true)}
              >
                <svg className="i">
                  <use href="#i-panel" />
                </svg>
              </button>
            )}

            <button
              className="ib"
              type="button"
              aria-label="العودة للمحادثة"
              title="العودة إلى المحادثة الذكية"
              onClick={onBackToChat}
            >
              <svg className="i" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M19 12H5M11 6l-6 6 6 6" />
              </svg>
            </button>
          </div>
        </div>

        <div className={`searchrow${isSearchOpen ? ' open' : ''}`} id="sRow">
          <label className="field">
            <svg className="i">
              <use href="#i-search" />
            </svg>
            <input
              ref={searchInputRef}
              id="q"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ابحث في المنشورات أو الأحياء..."
              aria-label="ابحث في الأخبار"
              autoComplete="off"
            />
            {searchQuery && (
              <button
                type="button"
                className="clear-search-btn"
                onClick={() => setSearchQuery('')}
                aria-label="مسح البحث"
              >
                <svg className="i i-14">
                  <use href="#i-x" />
                </svg>
              </button>
            )}
          </label>
        </div>
      </header>

      <div className="mahaliyat-main">
        {/* Post Composer */}
        <section
          ref={composerRef}
          className={`composer${isComposerOpen ? ' open' : ''}`}
          id="comp"
          aria-label="إنشاء منشور"
        >
          <div className="c-top">
            <span className="av" aria-hidden="true">
              ع
            </span>
            <button
              className="prompt"
              id="prompt"
              type="button"
              onClick={openComposer}
            >
              شارك خبرًا أو استفسارًا مع أهل المنطقة...
            </button>
            {!isComposerOpen && (
              <button
                type="button"
                className="quick-post-btn"
                onClick={openComposer}
              >
                <svg className="i i-16" aria-hidden="true">
                  <use href="#i-plus" />
                </svg>
                <span>نشر</span>
              </button>
            )}
          </div>
          <div className="c-more">
            <textarea
              ref={txtRef}
              id="txt"
              maxLength={600}
              value={composerText}
              onChange={(e) => setComposerText(e.target.value)}
              aria-label="نص الخبر"
              placeholder="اكتب الخبر أو الإعلان بوضوح..."
            />
            <div className="grid2">
              <label className="field">
                <svg className="i">
                  <use href="#i-list" />
                </svg>
                <select
                  id="cat"
                  aria-label="التصنيف"
                  value={composerCat}
                  onChange={(e) => setComposerCat(e.target.value as CategoryKey)}
                >
                  {(Object.entries(CATS) as [CategoryKey, [string, string]][]).map(
                    ([k, v]) => (
                      <option key={k} value={k}>
                        {v[1]}
                      </option>
                    )
                  )}
                </select>
              </label>
              <label className="field">
                <svg className="i">
                  <use href="#i-pin" />
                </svg>
                <input
                  id="place"
                  value={composerPlace}
                  onChange={(e) => setComposerPlace(e.target.value)}
                  aria-label="الحي أو البلدية"
                  placeholder="الحي أو القصر (اختياري)"
                />
              </label>
            </div>
            <label className="field">
              <svg className="i">
                <use href="#i-link" />
              </svg>
              <input
                id="src"
                value={composerSource}
                onChange={(e) => setComposerSource(e.target.value)}
                aria-label="المصدر"
                placeholder="المصدر أو الرابط (اختياري)"
              />
            </label>
            <div className="hint">
              <svg className="i i-16">
                <use href="#i-shield" />
              </svg>
              <span>تحقق من الخبر قبل نشره واحترم خصوصية الناس.</span>
            </div>
            <div className="c-bar">
              <button
                className="ib"
                id="attach"
                type="button"
                aria-label="إرفاق صورة أو فيديو"
                onClick={() => fileInputRef.current?.click()}
              >
                <svg className="i">
                  <use href="#i-image" />
                </svg>
              </button>
              <input
                ref={fileInputRef}
                id="file"
                type="file"
                accept="image/*,video/*"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setAttachedFile(f);
                }}
              />
              <span
                className={`file-chip${attachedFile ? ' show' : ''}`}
                id="fchip"
              >
                <span id="fname">{attachedFile?.name || ''}</span>
                <button
                  type="button"
                  id="fx"
                  aria-label="إزالة المرفق"
                  onClick={() => {
                    setAttachedFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                >
                  <svg className="i i-16">
                    <use href="#i-x" />
                  </svg>
                </button>
              </span>
              <button
                type="button"
                className="cancel-compose-btn"
                onClick={() => setIsComposerOpen(false)}
              >
                إلغاء
              </button>
              <button
                className="send"
                id="pub"
                type="button"
                onClick={handlePublish}
              >
                <svg className="i">
                  <use href="#i-send" />
                </svg>
                نشر الخبر
              </button>
            </div>
          </div>
        </section>

        {/* Category Filter Chips */}
        <div className="chips" id="chips" role="group" aria-label="التصنيف">
          <button
            className="chip"
            type="button"
            aria-pressed={selectedCat === 'all'}
            onClick={() => setSelectedCat('all')}
          >
            <svg className="i" aria-hidden="true">
              <use href="#i-list" />
            </svg>
            الكل
          </button>
          {(Object.entries(CATS) as [CategoryKey, [string, string]][]).map(
            ([k, v]) => (
              <button
                key={k}
                className="chip"
                type="button"
                aria-pressed={selectedCat === k}
                onClick={() => setSelectedCat(k)}
              >
                <svg className="i" aria-hidden="true">
                  <use href={`#i-${v[0]}`} />
                </svg>
                {v[1]}
              </button>
            )
          )}
        </div>

        {/* Count & Sort Toolbar */}
        <div className="tool">
          <span className="m" id="count" aria-live="polite">
            <svg className="i i-16" aria-hidden="true">
              <use href="#i-news" />
            </svg>
            <b>{filteredPosts.length}</b>
            <span>{filteredPosts.length === 1 ? 'منشور معروض' : 'منشورات معروضة'}</span>
          </span>
          <button
            className="sort"
            id="sort"
            type="button"
            onClick={() => setSortBy((prev) => (prev === 'new' ? 'top' : 'new'))}
          >
            <svg className="i i-16" aria-hidden="true">
              <use href={sortBy === 'new' ? '#i-clock' : '#i-thumb'} />
            </svg>
            <span>الترتيب: {sortBy === 'new' ? 'الأحدث' : 'الأكثر نفعًا'}</span>
          </button>
        </div>

        {/* Feed List */}
        <div className="feed" id="feed">
          {filteredPosts.length === 0 ? (
            <div className="empty">
              <svg className="i" aria-hidden="true">
                <use href="#i-search" />
              </svg>
              <div>لا توجد منشورات مطابقة</div>
            </div>
          ) : (
            filteredPosts.map((p) => {
              const c = CATS[p.cat];
              const u = getUser(p.uid);
              const liked = likedIds.has(p.id);
              const isCommentsOpen = openCommentsIds.has(p.id);
              const isEditing = editingPostId === p.id;
              const isMenuOpen = openMenuPostId === p.id;
              const isMine = canEdit(p);
              const isLink = /^https?:\/\/\S+$/i.test(p.source || '');

              return (
                <article
                  key={p.id}
                  className={`card cat-${p.cat}${u.banned ? ' banned' : ''}`}
                  data-id={p.id}
                >
                  <div className="head">
                    <span
                      className={`av${u.verified ? ' off' : ''}`}
                      aria-hidden="true"
                    >
                      {u.name.charAt(0)}
                    </span>
                    <div className="who">
                      <div className="line">
                        <span className="author-name">{u.name}</span>
                        {u.verified && (
                          <span className="ok" title="موثّق" aria-label="موثّق">
                            <svg className="i i-16" aria-hidden="true">
                              <use href="#i-check" />
                            </svg>
                          </span>
                        )}
                        {p.demo && <span className="pill">تجريبي</span>}
                        {p.review && <span className="pill rev">قيد المراجعة</span>}
                        {u.banned && <span className="pill ban">محظور</span>}
                      </div>
                      <div className="meta">
                        <span>{ago(p.ts)}</span>
                        {p.edited && <span> · عُدّل</span>}
                        {p.place && (
                          <span className="place-tag">
                            <svg className="i i-12" aria-hidden="true">
                              <use href="#i-pin" />
                            </svg>
                            {p.place}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="head-end">
                      <span className={`cat cat-badge-${p.cat}`}>
                        <svg className="i" aria-hidden="true">
                          <use href={`#i-${c[0]}`} />
                        </svg>
                        {c[1]}
                      </span>

                      {canMenu(p) && (
                        <div className="menu-wrap">
                          <button
                            className="menu-btn"
                            type="button"
                            aria-haspopup="menu"
                            aria-expanded={isMenuOpen}
                            aria-label="خيارات المنشور"
                            onClick={() =>
                              setOpenMenuPostId((prev) =>
                                prev === p.id ? null : p.id
                              )
                            }
                          >
                            <svg className="i" aria-hidden="true">
                              <use href="#i-dots" />
                            </svg>
                          </button>

                          <div
                            className={`pop${isMenuOpen ? ' show' : ''}`}
                            role="menu"
                          >
                            {isMine && (
                              <button
                                type="button"
                                role="menuitem"
                                onClick={() => handleMenuAction(p, 'edit')}
                              >
                                <svg className="i" aria-hidden="true">
                                  <use href="#i-edit" />
                                </svg>
                                تعديل المنشور
                              </button>
                            )}
                            {(isMine || isAdminMode) && (
                              <button
                                type="button"
                                role="menuitem"
                                className="danger"
                                onClick={() => handleMenuAction(p, 'del')}
                              >
                                <svg className="i" aria-hidden="true">
                                  <use href="#i-trash" />
                                </svg>
                                حذف المنشور
                              </button>
                            )}
                            {isAdminMode && (p.review || p.uid !== ME) && (
                              <>
                                <hr />
                                <div className="lbl">
                                  <svg className="i i-14" aria-hidden="true">
                                    <use href="#i-shieldok" />
                                  </svg>
                                  صلاحيات المشرف
                                </div>
                                {p.review && (
                                  <button
                                    type="button"
                                    role="menuitem"
                                    onClick={() => handleMenuAction(p, 'ok')}
                                  >
                                    <svg className="i" aria-hidden="true">
                                      <use href="#i-check" />
                                    </svg>
                                    اعتماد النشر
                                  </button>
                                )}
                                {p.uid !== ME && (
                                  <>
                                    <button
                                      type="button"
                                      role="menuitem"
                                      onClick={() => handleMenuAction(p, 'verify')}
                                    >
                                      <svg className="i" aria-hidden="true">
                                        <use href="#i-shieldok" />
                                      </svg>
                                      {u.verified
                                        ? 'نزع علامة التوثيق'
                                        : 'منح علامة التوثيق'}
                                    </button>
                                    <button
                                      type="button"
                                      role="menuitem"
                                      className={!u.banned ? 'danger' : ''}
                                      onClick={() => handleMenuAction(p, 'ban')}
                                    >
                                      <svg className="i" aria-hidden="true">
                                        <use href="#i-ban" />
                                      </svg>
                                      {u.banned ? 'إلغاء حظر الناشر' : 'حظر الناشر'}
                                    </button>
                                  </>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {isEditing ? (
                    <div className="editbox">
                      <textarea
                        className="etxt"
                        maxLength={600}
                        aria-label="تعديل المنشور"
                        value={editingText}
                        onChange={(e) => setEditingText(e.target.value)}
                      />
                      <div className="q-acts">
                        <button
                          type="button"
                          className="ap"
                          onClick={() => handleSaveEdit(p.id)}
                        >
                          <svg className="i i-16" aria-hidden="true">
                            <use href="#i-check" />
                          </svg>
                          حفظ
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingPostId(null);
                            setEditingText('');
                          }}
                        >
                          <svg className="i i-16" aria-hidden="true">
                            <use href="#i-x" />
                          </svg>
                          إلغاء
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="txt">{p.text}</p>
                  )}

                  {p.media &&
                    (p.media.video ? (
                      <video className="media" controls src={p.media.url} />
                    ) : (
                      <img className="media" alt="" src={p.media.url} />
                    ))}

                  {p.source && (
                    <div className="src">
                      <svg className="i i-14" aria-hidden="true">
                        <use href="#i-link" />
                      </svg>
                      <span>
                        {isLink ? (
                          <a
                            href={p.source}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {p.source}
                          </a>
                        ) : (
                          p.source
                        )}
                      </span>
                    </div>
                  )}

                  <div className="acts">
                    <button
                      className="act"
                      type="button"
                      aria-pressed={liked}
                      aria-label="مفيد"
                      onClick={() => handleToggleLike(p.id)}
                    >
                      <svg className="i i-16" aria-hidden="true">
                        <use href="#i-thumb" />
                      </svg>
                      <span className="act-lbl">مفيد</span>
                      <b className="act-cnt">{p.likes + (liked ? 1 : 0)}</b>
                    </button>

                    <button
                      className="act"
                      type="button"
                      aria-pressed={isCommentsOpen}
                      aria-label="التعليقات"
                      onClick={() => handleToggleComments(p.id)}
                    >
                      <svg className="i i-16" aria-hidden="true">
                        <use href="#i-chat" />
                      </svg>
                      <span className="act-lbl">تعليق</span>
                      <b className="act-cnt">{p.comments.length}</b>
                    </button>

                    <button
                      className="act"
                      type="button"
                      aria-label="مشاركة"
                      onClick={() => handleShare(p)}
                    >
                      <svg className="i i-16" aria-hidden="true">
                        <use href="#i-share" />
                      </svg>
                      <span className="act-lbl">مشاركة</span>
                    </button>

                    <button
                      className="act end"
                      type="button"
                      aria-label="إبلاغ"
                      title="إبلاغ عن المنشور"
                      onClick={() => showToast('تم تسجيل البلاغ للمراجعة')}
                    >
                      <svg className="i i-16" aria-hidden="true">
                        <use href="#i-flag" />
                      </svg>
                    </button>
                  </div>

                  {isCommentsOpen && (
                    <div className="cmts">
                      {p.comments.map((cmtText, idx) => (
                        <div key={idx} className="cmt">
                          {cmtText}
                        </div>
                      ))}
                      <form
                        className="cform"
                        onSubmit={(e) => handleAddComment(e, p.id)}
                      >
                        <input
                          aria-label="اكتب تعليقًا"
                          placeholder="اكتب تعليقًا مفيدًا..."
                          maxLength={240}
                          required
                          value={commentInputs[p.id] || ''}
                          onChange={(e) =>
                            setCommentInputs((prev) => ({
                              ...prev,
                              [p.id]: e.target.value,
                            }))
                          }
                        />
                        <button type="submit" aria-label="إرسال">
                          <svg className="i i-16" aria-hidden="true">
                            <use href="#i-send" />
                          </svg>
                        </button>
                      </form>
                    </div>
                  )}
                </article>
              );
            })
          )}
        </div>
      </div>

      {/* Admin Control Panel Modal */}
      {isAdminMode && isAdminPanelOpen && (
        <div
          className="dlg-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsAdminPanelOpen(false);
          }}
        >
          <div className="dlg-modal" role="dialog" aria-modal="true" id="adm">
            <div className="dlg">
              <h2>
                <svg className="i" aria-hidden="true">
                  <use href="#i-panel" />
                </svg>
                <span>لوحة تحكم المشرف</span>
                <button
                  type="button"
                  className="chip ms-auto"
                  onClick={() => {
                    setIsAdminPanelOpen(false);
                    onOpenAdmin();
                  }}
                >
                  بوابة المالك الشاملة
                </button>
                <button
                  className="ib"
                  id="aClose"
                  type="button"
                  aria-label="إغلاق"
                  onClick={() => setIsAdminPanelOpen(false)}
                >
                  <svg className="i" aria-hidden="true">
                    <use href="#i-x" />
                  </svg>
                </button>
              </h2>

              <div className="stat-row" id="stats">
                <div className="stat">
                  <svg className="i" aria-hidden="true">
                    <use href="#i-news" />
                  </svg>
                  <b>{posts.length}</b>
                  <span className="sr">المنشورات</span>
                </div>
                <div className="stat">
                  <svg className="i" aria-hidden="true">
                    <use href="#i-clock" />
                  </svg>
                  <b>{pendingPosts.length}</b>
                  <span className="sr">بانتظار المراجعة</span>
                </div>
                <div className="stat">
                  <svg className="i" aria-hidden="true">
                    <use href="#i-ban" />
                  </svg>
                  <b>{bannedUsersCount}</b>
                  <span className="sr">المحظورون</span>
                </div>
              </div>

              <div className="chips" id="aTabs" role="group" aria-label="أقسام اللوحة">
                <button
                  className="chip"
                  type="button"
                  aria-pressed={adminTab === 'users'}
                  onClick={() => setAdminTab('users')}
                >
                  <svg className="i" aria-hidden="true">
                    <use href="#i-users" />
                  </svg>
                  الناشرون
                </button>
                <button
                  className="chip"
                  type="button"
                  aria-pressed={adminTab === 'queue'}
                  onClick={() => setAdminTab('queue')}
                >
                  <svg className="i" aria-hidden="true">
                    <use href="#i-clock" />
                  </svg>
                  المراجعة {pendingPosts.length}
                </button>
              </div>

              <div id="aBody">
                {adminTab === 'users' ? (
                  users
                    .filter((u) => u.id !== ME)
                    .map((u) => {
                      const n = posts.filter((p) => p.uid === u.id).length;
                      return (
                        <div key={u.id} className="urow">
                          <span
                            className={`av${u.verified ? ' off' : ''}`}
                            aria-hidden="true"
                          >
                            {u.name.charAt(0)}
                          </span>
                          <div className="who">
                            <div className="line">
                              <span>{u.name}</span>
                              {u.verified && (
                                <span className="ok" title="موثّق" aria-label="موثّق">
                                  <svg className="i i-16" aria-hidden="true">
                                    <use href="#i-check" />
                                  </svg>
                                </span>
                              )}
                              {u.banned && <span className="pill ban">محظور</span>}
                            </div>
                            <div className="meta">
                              {n}
                              {n === 1 ? ' منشور' : ' منشورات'}
                            </div>
                          </div>
                          <button
                            className="tgl vf"
                            type="button"
                            aria-pressed={!!u.verified}
                            title={u.verified ? 'نزع التوثيق' : 'منح التوثيق'}
                            aria-label={
                              u.verified ? 'نزع علامة التوثيق' : 'منح علامة التوثيق'
                            }
                            onClick={() => toggleVerifyUser(u.id)}
                          >
                            <svg className="i" aria-hidden="true">
                              <use href="#i-shieldok" />
                            </svg>
                          </button>
                          <button
                            className="tgl bn"
                            type="button"
                            aria-pressed={!!u.banned}
                            title={u.banned ? 'إلغاء الحظر' : 'حظر'}
                            aria-label={u.banned ? 'إلغاء الحظر' : 'حظر الناشر'}
                            onClick={() => toggleBanUser(u.id)}
                          >
                            <svg className="i" aria-hidden="true">
                              <use href="#i-ban" />
                            </svg>
                          </button>
                          <button
                            className="tgl dl"
                            type="button"
                            title="حذف كل منشوراته"
                            aria-label="حذف كل منشوراته"
                            onClick={() => purgeUserPosts(u.id)}
                          >
                            <svg className="i" aria-hidden="true">
                              <use href="#i-trash" />
                            </svg>
                          </button>
                        </div>
                      );
                    })
                ) : pendingPosts.length === 0 ? (
                  <div className="empty">
                    <svg className="i" aria-hidden="true">
                      <use href="#i-check" />
                    </svg>
                    <div>لا شيء بانتظار المراجعة</div>
                  </div>
                ) : (
                  pendingPosts.map((p) => {
                    const u = getUser(p.uid);
                    return (
                      <div key={p.id} className="q-item">
                        <div className="line">
                          <span>{u.name}</span>
                          {u.verified && (
                            <span className="ok" title="موثّق" aria-label="موثّق">
                              <svg className="i i-16" aria-hidden="true">
                                <use href="#i-check" />
                              </svg>
                            </span>
                          )}
                          <span className="meta meta-light">{ago(p.ts)}</span>
                        </div>
                        <p>{p.text}</p>
                        <div className="q-acts">
                          <button
                            type="button"
                            className="ap"
                            onClick={() => {
                              setPosts((prev) =>
                                prev.map((x) =>
                                  x.id === p.id ? { ...x, review: false } : x
                                )
                              );
                              showToast('تم اعتماد المنشور');
                            }}
                          >
                            <svg className="i i-16" aria-hidden="true">
                              <use href="#i-check" />
                            </svg>
                            اعتماد
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setPosts((prev) =>
                                prev.filter((x) => x.id !== p.id)
                              );
                              showToast('تم رفض المنشور');
                            }}
                          >
                            <svg className="i i-16" aria-hidden="true">
                              <use href="#i-x" />
                            </svg>
                            رفض
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      {confirmDialog && (
        <div
          className="dlg-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) setConfirmDialog(null);
          }}
        >
          <div className="dlg-modal" role="dialog" aria-modal="true" id="cdlg">
            <div className="dlg">
              <h2 id="cT">{confirmDialog.title}</h2>
              <p id="cM">{confirmDialog.message}</p>
              <div className="dlg-actions">
                <button
                  className="send danger"
                  id="cOk"
                  type="button"
                  onClick={() => {
                    const fn = confirmDialog.onConfirm;
                    setConfirmDialog(null);
                    fn();
                  }}
                >
                  {confirmDialog.okLabel}
                </button>
                <button
                  className="ib"
                  id="cNo"
                  type="button"
                  aria-label="إلغاء"
                  onClick={() => setConfirmDialog(null)}
                >
                  <svg className="i" aria-hidden="true">
                    <use href="#i-x" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}



      {/* Floating Action Button (Hidden when composer is open) */}
      {!isComposerOpen && (
        <button
          className="fab"
          id="fab"
          type="button"
          aria-label="منشور جديد"
          onClick={openComposer}
        >
          <svg className="i i-24" aria-hidden="true">
            <use href="#i-plus" />
          </svg>
        </button>
      )}

      {/* Toast Notification */}
      <div
        className={`toast${toastMsg ? ' show' : ''}`}
        id="toast"
        role="status"
      >
        {toastMsg || ''}
      </div>
    </div>
  );
};
