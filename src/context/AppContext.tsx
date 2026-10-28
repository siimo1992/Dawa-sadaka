import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { isTargetBanned } from '../utils/ownerControlStore';

export type CharityRoleView = 'sender' | 'receiver' | 'space';

export type AssociationStatus = 'approved' | 'pending' | 'rejected';

export interface CharityAssociation {
  id: string;
  name: string;
  specialty: string;
  neighborhood: string;
  phone: string;
  whatsapp: string;
  email: string;
  accessCode: string;
  status: AssociationStatus;
  createdAt: number;
}

export interface CharityMessage {
  id: string;
  associationId: string;
  senderName: string;
  senderPhone: string;
  neighborhood: string;
  subject: string;
  content: string;
  status: 'unread' | 'read';
  createdAt: number;
}

export interface AssociationPostComment {
  id: string;
  authorName: string;
  authorAssociationId?: string;
  text: string;
  createdAt: number;
}

export interface AssociationPost {
  id: string;
  associationId: string;
  associationName: string;
  neighborhood: string;
  title?: string;
  content: string;
  imageUrl?: string;
  videoUrl?: string;
  likesCount: number;
  likedByMe?: boolean;
  comments: AssociationPostComment[];
  createdAt: number;
  updatedAt?: number;
}

export interface CharityNotificationPayload {
  title: string;
  message: string;
  associationId?: string;
}

interface AppContextValue {
  activeView: CharityRoleView;
  setActiveView: (v: CharityRoleView) => void;
  associations: CharityAssociation[];
  approvedAssociations: CharityAssociation[];
  pendingAssociations: CharityAssociation[];
  messages: CharityMessage[];
  posts: AssociationPost[];
  activeAssociation: CharityAssociation | null;
  activeAssociationMessages: CharityMessage[];
  preselectedSenderAssocId: string | null;
  setPreselectedSenderAssocId: (id: string | null) => void;
  loginAssociation: (associationId: string, accessCode: string) => boolean;
  logoutAssociation: () => void;
  sendMessageToAssociation: (data: {
    associationId: string;
    senderName: string;
    senderPhone: string;
    neighborhood: string;
    subject: string;
    content: string;
    notifyChannels: {
      inApp: boolean;
      whatsapp: boolean;
      email: boolean;
    };
  }) => CharityMessage | null;
  addAssociationPost: (data: {
    associationId?: string;
    title?: string;
    content: string;
    imageUrl?: string;
    videoUrl?: string;
  }) => AssociationPost | null;
  updateAssociationPost: (
    postId: string,
    data: {
      title?: string;
      content: string;
      imageUrl?: string;
      videoUrl?: string;
    }
  ) => boolean;
  deleteAssociationPost: (postId: string) => boolean;
  toggleLikePost: (postId: string) => void;
  addCommentToPost: (postId: string, authorName: string, text: string) => void;
  deleteCommentFromPost: (postId: string, commentId: string) => void;
  requestAssociationMembership: (data: {
    name: string;
    specialty: string;
    neighborhood: string;
    phone: string;
    whatsapp: string;
    email: string;
    accessCode: string;
  }) => CharityAssociation;
  approveAssociation: (id: string) => void;
  rejectOrRemoveAssociation: (id: string) => void;
  markMessageAsRead: (msgId: string) => void;
  deleteMessage: (msgId: string) => void;
  toastMessage: string | null;
  showToast: (msg: string) => void;
  isAdminLoggedIn: boolean;
  onBackToChat?: () => void;
  onToggleSidebar?: () => void;
  onOpenAdminPanel?: () => void;
}

export const ASSOCIATIONS_STORAGE_KEY = 'bab_alkhair_associations_v2';
export const MESSAGES_STORAGE_KEY = 'bab_alkhair_messages_v2';
export const POSTS_STORAGE_KEY = 'bab_alkhair_posts_social_v3';
const ACTIVE_ASSOC_SESSION_KEY = 'bab_alkhair_active_assoc_id_v2';

export const TIDIKELT_NEIGHBORHOODS = [
  'القصر العتيق - عين صالح',
  'حي السلام - عين صالح',
  'حي البركة - عين صالح',
  'حي الديس - عين صالح',
  'القصر الجديد - عين صالح',
  'صحنوت - عين صالح',
  'حاسي لحجر - عين صالح',
  'فقارة الزوى',
  'إينغر',
  'تينركوك',
  'زاوية سيدي بلقاسم',
];

export const INITIAL_APPROVED_ASSOCIATIONS: CharityAssociation[] = [
  {
    id: 'assoc-kafil',
    name: 'جمعية كافل اليتيم الوطنية — مكتب عين صالح',
    specialty: 'رعاية الأيتام والأرامل والمؤونة الغذائية',
    neighborhood: 'حي السلام - عين صالح',
    phone: '0661458210',
    whatsapp: '213661458210',
    email: 'kafil.insalah@charity.dz',
    accessCode: '1111',
    status: 'approved',
    createdAt: Date.now() - 86400000 * 30,
  },
  {
    id: 'assoc-cra',
    name: 'الهلال الأحمر الجزائري — اللجنة المحلية عين صالح',
    specialty: 'الإغاثة الطارئة والمساعدات الطبية والإنسانية',
    neighborhood: 'وسط المدينة - عين صالح',
    phone: '0550912344',
    whatsapp: '213550912344',
    email: 'cra.insalah@charity.dz',
    accessCode: '2222',
    status: 'approved',
    createdAt: Date.now() - 86400000 * 25,
  },
  {
    id: 'assoc-irchad',
    name: 'جمعية الإرشاد والإصلاح — فرع عين صالح',
    specialty: 'التكافل الاجتماعي والدعم المدرسي والأسري',
    neighborhood: 'القصر العتيق - عين صالح',
    phone: '0770334890',
    whatsapp: '213770334890',
    email: 'irchad.insalah@charity.dz',
    accessCode: '3333',
    status: 'approved',
    createdAt: Date.now() - 86400000 * 20,
  },
  {
    id: 'assoc-baraka',
    name: 'مجموعة شباب الخير التطوعية بتديكلت',
    specialty: 'العمل التطوعي والمبادرات الشبانية والبيئية',
    neighborhood: 'حي البركة - عين صالح',
    phone: '0662781905',
    whatsapp: '213662781905',
    email: 'shabab.khair@charity.dz',
    accessCode: '4444',
    status: 'approved',
    createdAt: Date.now() - 86400000 * 15,
  },
];

const INITIAL_MESSAGES: CharityMessage[] = [
  {
    id: 'msg-101',
    associationId: 'assoc-kafil',
    senderName: 'عائلة متعففة (أم ياسين)',
    senderPhone: '0661001122',
    neighborhood: 'حي السلام - عين صالح',
    subject: 'طلب قفة غذائية ومستلزمات لأطفال أيتام',
    content:
      'السلام عليكم ورحمة الله، أنا أرملة أتكفل بأربعة أطفال متمدرسين ونحتاج إلى مساعدة في المؤونة الغذائية الشهرية بارك الله فيكم.',
    status: 'unread',
    createdAt: Date.now() - 3600000 * 4,
  },
  {
    id: 'msg-102',
    associationId: 'assoc-cra',
    senderName: 'مواطن مبلّغ عن حالة',
    senderPhone: '0550334455',
    neighborhood: 'القصر العتيق - عين صالح',
    subject: 'حاجة ماسة لجهاز أكسجين لمسن مقعد',
    content:
      'يوجد شيخ مسن في الحي يعاني من ضيق تنفس حاد ويحتاج إلى جهاز مكثف أكسجين منزلي بصفة مستعجلة.',
    status: 'unread',
    createdAt: Date.now() - 3600000 * 8,
  },
];

const INITIAL_POSTS: AssociationPost[] = [
  {
    id: 'post-301',
    associationId: 'assoc-baraka',
    associationName: 'مجموعة شباب الخير التطوعية بتديكلت',
    neighborhood: 'حي البركة - عين صالح',
    content:
      'صور من خرجتنا التطوعية الصباحية لغرس الأشجار وتنظيف المحيط رفقة شباب الحي 🌴💚 أجواء أخوية رائعة، شكراً لكل المتطوعين الذين حضروا اليوم!',
    imageUrl:
      'https://images.unsplash.com/photo-1559027615-cd4628902d4a?auto=format&fit=crop&w=1000&q=80',
    likesCount: 24,
    likedByMe: false,
    comments: [
      {
        id: 'c-1',
        authorName: 'عبد القادر تواتي',
        text: 'ما شاء الله عليكم يا شباب تديكلت، ربي يبارك في جهودكم.',
        createdAt: Date.now() - 3600000 * 3,
      },
    ],
    createdAt: Date.now() - 3600000 * 5,
  },
  {
    id: 'post-302',
    associationId: 'assoc-irchad',
    associationName: 'جمعية الإرشاد والإصلاح — فرع عين صالح',
    neighborhood: 'القصر العتيق - عين صالح',
    content:
      'جانب من الحفل التكريمي لتلاميذنا المتفوقين في الامتحانات الفصلية وتوزيع الجوائز التشجيعية بحضور الأولياء والأساتذة 📚🎓 بالتوفيق لجميع أبنائنا.',
    imageUrl:
      'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit&crop&w=1000&q=80',
    likesCount: 39,
    likedByMe: false,
    comments: [
      {
        id: 'c-2',
        authorName: 'جمعية كافل اليتيم الوطنية — مكتب عين صالح',
        authorAssociationId: 'assoc-kafil',
        text: 'مبادرة طيبة ومباركة، مزيداً من التألق والنجاح لأبنائنا.',
        createdAt: Date.now() - 3600000 * 12,
      },
    ],
    createdAt: Date.now() - 3600000 * 18,
  },
  {
    id: 'post-303',
    associationId: 'assoc-cra',
    associationName: 'الهلال الأحمر الجزائري — اللجنة المحلية عين صالح',
    neighborhood: 'وسط المدينة - عين صالح',
    content:
      'اختتام الدورة التكوينية في الإسعافات الأولية لفائدة الشباب والمتطوعين الجدد بمقر اللجنة المحلية. نرحب دائماً بكل من يرغب في تعلم مبادئ الإسعاف والعمل التطوعي.',
    likesCount: 18,
    likedByMe: false,
    comments: [],
    createdAt: Date.now() - 3600000 * 28,
  },
];

export function loadStoredAssociations(): CharityAssociation[] {
  try {
    const raw = localStorage.getItem(ASSOCIATIONS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // ignore storage errors
  }
  return INITIAL_APPROVED_ASSOCIATIONS;
}

export function saveStoredAssociations(list: CharityAssociation[]): void {
  try {
    localStorage.setItem(ASSOCIATIONS_STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent('bab-alkhair-sync'));
  } catch {
    // ignore storage errors
  }
}

export function loadStoredMessages(): CharityMessage[] {
  try {
    const raw = localStorage.getItem(MESSAGES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch {
    // ignore storage errors
  }
  return INITIAL_MESSAGES;
}

export function saveStoredMessages(list: CharityMessage[]): void {
  try {
    localStorage.setItem(MESSAGES_STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent('bab-alkhair-sync'));
  } catch {
    // ignore storage errors
  }
}

export function loadStoredPosts(): AssociationPost[] {
  try {
    const raw = localStorage.getItem(POSTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((p) => ({
          ...p,
          likesCount: typeof p.likesCount === 'number' ? p.likesCount : 0,
          comments: Array.isArray(p.comments) ? p.comments : [],
        }));
      }
    }
  } catch {
    // ignore storage errors
  }
  return INITIAL_POSTS;
}

export function saveStoredPosts(list: AssociationPost[]): void {
  try {
    localStorage.setItem(POSTS_STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(new CustomEvent('bab-alkhair-sync'));
  } catch {
    // ignore storage errors
  }
}

const AppContext = createContext<AppContextValue | undefined>(undefined);

export interface AppProviderProps {
  children: React.ReactNode;
  isAdminLoggedIn?: boolean;
  onBackToChat?: () => void;
  onToggleSidebar?: () => void;
  onOpenAdminPanel?: () => void;
  onNotify?: (payload: CharityNotificationPayload) => void;
}

export const AppProvider: React.FC<AppProviderProps> = ({
  children,
  isAdminLoggedIn = false,
  onBackToChat,
  onToggleSidebar,
  onOpenAdminPanel,
  onNotify,
}) => {
  const [activeView, setActiveView] = useState<CharityRoleView>('space');
  const [associations, setAssociations] = useState<CharityAssociation[]>(loadStoredAssociations);
  const [messages, setMessages] = useState<CharityMessage[]>(loadStoredMessages);
  const [posts, setPosts] = useState<AssociationPost[]>(loadStoredPosts);
  const [preselectedSenderAssocId, setPreselectedSenderAssocId] = useState<string | null>(null);
  const [activeAssociationId, setActiveAssociationId] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem(ACTIVE_ASSOC_SESSION_KEY);
    } catch {
      return null;
    }
  });
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    window.setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 3400);
  }, []);

  useEffect(() => {
    const handleSync = () => {
      setAssociations(loadStoredAssociations());
      setMessages(loadStoredMessages());
      setPosts(loadStoredPosts());
    };
    window.addEventListener('bab-alkhair-sync', handleSync);
    window.addEventListener('tidikelt-owner-sync', handleSync);
    window.addEventListener('storage', handleSync);
    return () => {
      window.removeEventListener('bab-alkhair-sync', handleSync);
      window.removeEventListener('tidikelt-owner-sync', handleSync);
      window.removeEventListener('storage', handleSync);
    };
  }, []);

  const approvedAssociations = useMemo(
    () => associations.filter((a) => a.status === 'approved'),
    [associations]
  );

  const pendingAssociations = useMemo(
    () => associations.filter((a) => a.status === 'pending'),
    [associations]
  );

  const activeAssociation = useMemo(() => {
    if (!activeAssociationId) return null;
    const found = associations.find(
      (a) => a.id === activeAssociationId && a.status === 'approved'
    );
    return found || null;
  }, [associations, activeAssociationId]);

  const activeAssociationMessages = useMemo(() => {
    if (!activeAssociation) return [];
    return messages
      .filter((m) => m.associationId === activeAssociation.id)
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [messages, activeAssociation]);

  const sortedPosts = useMemo(
    () => [...posts].sort((a, b) => b.createdAt - a.createdAt),
    [posts]
  );

  const loginAssociation = (associationId: string, accessCode: string): boolean => {
    const target = associations.find((a) => a.id === associationId);
    if (!target) {
      showToast('الجمعية غير موجودة');
      return false;
    }
    if (target.status !== 'approved') {
      showToast('عضوية هذه الجمعية قيد المراجعة ولم يوافق عليها مالك المنصة بعد');
      return false;
    }
    if (!isAdminLoggedIn && target.accessCode.trim() !== accessCode.trim()) {
      showToast('رمز دخول الجمعية غير صحيح');
      return false;
    }
    setActiveAssociationId(target.id);
    try {
      sessionStorage.setItem(ACTIVE_ASSOC_SESSION_KEY, target.id);
    } catch {}
    showToast(`تم تسجيل الدخول باسم «${target.name}»`);
    return true;
  };

  const logoutAssociation = () => {
    setActiveAssociationId(null);
    try {
      sessionStorage.removeItem(ACTIVE_ASSOC_SESSION_KEY);
    } catch {}
    showToast('تم تسجيل الخروج من حساب الجمعية');
  };

  const sendMessageToAssociation: AppContextValue['sendMessageToAssociation'] = ({
    associationId,
    senderName,
    senderPhone,
    neighborhood,
    subject,
    content,
    notifyChannels,
  }) => {
    if (isTargetBanned(senderPhone, senderName)) {
      showToast('عذراً، هذا الرقم أو المرسل محظور من قبل إدارة منصة تيدكلت AI');
      return null;
    }

    const targetAssoc = approvedAssociations.find((a) => a.id === associationId);
    if (!targetAssoc) {
      showToast('يرجى اختيار جمعية خيرية معتمدة');
      return null;
    }

    const newMsg: CharityMessage = {
      id: `msg-${Date.now()}`,
      associationId: targetAssoc.id,
      senderName: senderName.trim() || 'مواطن / عائلة متعففة',
      senderPhone: senderPhone.trim(),
      neighborhood: neighborhood.trim() || 'عين صالح',
      subject: subject.trim() || 'رسالة خاصة للجمعية',
      content: content.trim(),
      status: 'unread',
      createdAt: Date.now(),
    };

    const nextMessages = [newMsg, ...messages];
    setMessages(nextMessages);
    saveStoredMessages(nextMessages);

    if (notifyChannels.inApp && onNotify) {
      onNotify({
        title: `رسالة جديدة موجهة إلى ${targetAssoc.name}`,
        message: `${newMsg.subject} — من ${newMsg.neighborhood}`,
        associationId: targetAssoc.id,
      });
    }

    if (notifyChannels.whatsapp && targetAssoc.whatsapp) {
      const cleanWa = targetAssoc.whatsapp.replace(/\D/g, '');
      const waNumber = cleanWa.startsWith('0') ? `213${cleanWa.slice(1)}` : cleanWa;
      const waText = encodeURIComponent(
        `🔔 إشعار رسالة جديدة عبر منصة باب الخير (تيديكلت AI)\n` +
          `إلى: ${targetAssoc.name}\n` +
          `المرسل: ${newMsg.senderName}\n` +
          `الهاتف: ${newMsg.senderPhone}\n` +
          `الحي: ${newMsg.neighborhood}\n` +
          `الموضوع: ${newMsg.subject}\n` +
          `الرسالة: ${newMsg.content}`
      );
      window.open(`https://wa.me/${waNumber}?text=${waText}`, '_blank', 'noopener,noreferrer');
    }

    if (notifyChannels.email && targetAssoc.email) {
      const mailSubject = encodeURIComponent(
        `[باب الخير - تيديكلت AI] رسالة جديدة: ${newMsg.subject}`
      );
      const mailBody = encodeURIComponent(
        `السلام عليكم ورحمة الله،\n\n` +
          `وصلتكم رسالة جديدة عبر منصة باب الخير (تيديكلت AI):\n\n` +
          `• الجمعية المستقبلة: ${targetAssoc.name}\n` +
          `• اسم المرسل: ${newMsg.senderName}\n` +
          `• رقم الهاتف: ${newMsg.senderPhone}\n` +
          `• الحي / البلدية: ${newMsg.neighborhood}\n` +
          `• الموضوع: ${newMsg.subject}\n\n` +
          `نص الرسالة:\n${newMsg.content}\n`
      );
      window.open(
        `mailto:${targetAssoc.email}?subject=${mailSubject}&body=${mailBody}`,
        '_self'
      );
    }

    showToast(`تم إرسال رسالتك بنجاح إلى «${targetAssoc.name}»`);
    return newMsg;
  };

  const addAssociationPost: AppContextValue['addAssociationPost'] = ({
    associationId,
    title,
    content,
    imageUrl,
    videoUrl,
  }) => {
    const publisher =
      activeAssociation ||
      (isAdminLoggedIn && associationId
        ? approvedAssociations.find((a) => a.id === associationId) || approvedAssociations[0]
        : null);

    if (!publisher || publisher.status !== 'approved') {
      showToast('النشر في فضاء الجمعيات متاح لأعضاء الجمعيات المعتمدة من المالك فقط');
      return null;
    }

    const newPost: AssociationPost = {
      id: `post-${Date.now()}`,
      associationId: publisher.id,
      associationName: publisher.name,
      neighborhood: publisher.neighborhood,
      title: title?.trim() || undefined,
      content: content.trim(),
      imageUrl: imageUrl || undefined,
      videoUrl: videoUrl?.trim() || undefined,
      likesCount: 0,
      likedByMe: false,
      comments: [],
      createdAt: Date.now(),
    };

    const nextPosts = [newPost, ...posts];
    setPosts(nextPosts);
    saveStoredPosts(nextPosts);

    if (onNotify) {
      onNotify({
        title: `منشور جديد من ${publisher.name}`,
        message: newPost.title || newPost.content.slice(0, 80) || 'تم نشر وسائط جديدة في فضاء الجمعيات',
        associationId: publisher.id,
      });
    }

    showToast(newPost.title ? 'تم نشر المقال / التدوينة بنجاح' : 'تم نشر المنشور في فضاء الجمعيات');
    return newPost;
  };

  const updateAssociationPost: AppContextValue['updateAssociationPost'] = (
    postId,
    data
  ) => {
    const existing = posts.find((p) => p.id === postId);
    if (!existing) return false;

    const canManage =
      isAdminLoggedIn ||
      (activeAssociation && activeAssociation.id === existing.associationId);

    if (!canManage) {
      showToast('لا تملك صلاحية تعديل هذا المنشور');
      return false;
    }

    const nextPosts = posts.map((p) =>
      p.id === postId
        ? {
            ...p,
            title: data.title?.trim() || undefined,
            content: data.content.trim(),
            imageUrl: data.imageUrl,
            videoUrl: data.videoUrl?.trim() || undefined,
            updatedAt: Date.now(),
          }
        : p
    );
    setPosts(nextPosts);
    saveStoredPosts(nextPosts);
    showToast('تم تعديل المنشور بنجاح');
    return true;
  };

  const deleteAssociationPost = (postId: string): boolean => {
    const existing = posts.find((p) => p.id === postId);
    if (!existing) return false;

    const canManage =
      isAdminLoggedIn ||
      (activeAssociation && activeAssociation.id === existing.associationId);

    if (!canManage) {
      showToast('الحذف متاح للجمعية الناشرة أو مالك المنصة فقط');
      return false;
    }

    const nextPosts = posts.filter((p) => p.id !== postId);
    setPosts(nextPosts);
    saveStoredPosts(nextPosts);
    showToast('تم حذف المنشور');
    return true;
  };

  const toggleLikePost = (postId: string) => {
    const nextPosts = posts.map((p) => {
      if (p.id !== postId) return p;
      const liked = !p.likedByMe;
      return {
        ...p,
        likedByMe: liked,
        likesCount: Math.max(0, (p.likesCount || 0) + (liked ? 1 : -1)),
      };
    });
    setPosts(nextPosts);
    saveStoredPosts(nextPosts);
  };

  const addCommentToPost = (postId: string, authorName: string, text: string) => {
    const cleanText = text.trim();
    if (!cleanText) return;

    const finalAuthor =
      activeAssociation?.name ||
      authorName.trim() ||
      (isAdminLoggedIn ? 'إدارة تيدكلت AI' : 'متابع');

    if (isTargetBanned(finalAuthor, authorName)) {
      showToast('عذراً، هذا الاسم محظور من التعليق من قبل إدارة منصة تيدكلت AI');
      return;
    }

    const newComment: AssociationPostComment = {
      id: `cmt-${Date.now()}`,
      authorName: finalAuthor,
      authorAssociationId: activeAssociation?.id,
      text: cleanText,
      createdAt: Date.now(),
    };

    const nextPosts = posts.map((p) =>
      p.id === postId
        ? { ...p, comments: [...(p.comments || []), newComment] }
        : p
    );
    setPosts(nextPosts);
    saveStoredPosts(nextPosts);
  };

  const deleteCommentFromPost = (postId: string, commentId: string) => {
    const nextPosts = posts.map((p) =>
      p.id === postId
        ? { ...p, comments: (p.comments || []).filter((c) => c.id !== commentId) }
        : p
    );
    setPosts(nextPosts);
    saveStoredPosts(nextPosts);
  };

  const requestAssociationMembership: AppContextValue['requestAssociationMembership'] = (
    data
  ) => {
    const cleanPhone = data.phone.trim();
    if (isTargetBanned(cleanPhone, data.name)) {
      showToast('عذراً، هذا الرقم أو الجمعية محظورة من قبل إدارة منصة تيدكلت AI');
      return associations[0];
    }
    const cleanWa = (data.whatsapp || cleanPhone).replace(/\D/g, '');
    const formattedWa = cleanWa.startsWith('0') ? `213${cleanWa.slice(1)}` : cleanWa;

    const newAssoc: CharityAssociation = {
      id: `assoc-${Date.now()}`,
      name: data.name.trim(),
      specialty: data.specialty.trim() || 'عمل خيري وتضامني',
      neighborhood: data.neighborhood.trim() || 'عين صالح',
      phone: cleanPhone,
      whatsapp: formattedWa,
      email: data.email.trim(),
      accessCode: data.accessCode.trim() || '1234',
      status: 'pending',
      createdAt: Date.now(),
    };

    const nextList = [newAssoc, ...associations];
    setAssociations(nextList);
    saveStoredAssociations(nextList);

    if (onNotify) {
      onNotify({
        title: 'طلب انضمام جمعية خيرية جديدة (باب الخير)',
        message: `قدمت «${newAssoc.name}» (${newAssoc.neighborhood}) طلب عضوية بانتظار موافقة مالك تيديكلت AI.`,
        associationId: newAssoc.id,
      });
    }

    showToast(
      'تم رفع طلب انضمام الجمعية إلى مالك منصة تيدكلت AI للمراجعة والموافقة'
    );
    return newAssoc;
  };

  const approveAssociation = (id: string) => {
    if (!isAdminLoggedIn) {
      showToast('الموافقة متاحة لمالك منصة تيدكلت AI فقط');
      return;
    }
    const nextList = associations.map((a) =>
      a.id === id ? { ...a, status: 'approved' as const } : a
    );
    setAssociations(nextList);
    saveStoredAssociations(nextList);
    const target = associations.find((a) => a.id === id);
    if (target && onNotify) {
      onNotify({
        title: 'تمت الموافقة على عضوية جمعية خيرية',
        message: `تم تفعيل عضوية «${target.name}» في منصة باب الخير.`,
        associationId: target.id,
      });
    }
    showToast('تمت الموافقة على الجمعية وتفعيل عضويتها للنشر واستقبال الرسائل');
  };

  const rejectOrRemoveAssociation = (id: string) => {
    if (!isAdminLoggedIn) {
      showToast('هذا الإجراء متاح لمالك منصة تيدكلت AI فقط');
      return;
    }
    const nextList = associations.filter((a) => a.id !== id);
    setAssociations(nextList);
    saveStoredAssociations(nextList);
    if (activeAssociationId === id) {
      setActiveAssociationId(null);
    }
    showToast('تم حذف / رفض طلب الجمعية');
  };

  const markMessageAsRead = (msgId: string) => {
    const nextMessages = messages.map((m) =>
      m.id === msgId ? { ...m, status: 'read' as const } : m
    );
    setMessages(nextMessages);
    saveStoredMessages(nextMessages);
  };

  const deleteMessage = (msgId: string) => {
    const nextMessages = messages.filter((m) => m.id !== msgId);
    setMessages(nextMessages);
    saveStoredMessages(nextMessages);
    showToast('تم حذف الرسالة من صندوق الجمعية');
  };

  return (
    <AppContext.Provider
      value={{
        activeView,
        setActiveView,
        associations,
        approvedAssociations,
        pendingAssociations,
        messages,
        posts: sortedPosts,
        activeAssociation,
        activeAssociationMessages,
        preselectedSenderAssocId,
        setPreselectedSenderAssocId,
        loginAssociation,
        logoutAssociation,
        sendMessageToAssociation,
        addAssociationPost,
        updateAssociationPost,
        deleteAssociationPost,
        toggleLikePost,
        addCommentToPost,
        deleteCommentFromPost,
        requestAssociationMembership,
        approveAssociation,
        rejectOrRemoveAssociation,
        markMessageAsRead,
        deleteMessage,
        toastMessage,
        showToast,
        isAdminLoggedIn,
        onBackToChat,
        onToggleSidebar,
        onOpenAdminPanel,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return ctx;
}
