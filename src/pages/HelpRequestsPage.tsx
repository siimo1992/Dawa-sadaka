import React, { useState, useEffect } from 'react';
import {
  Send,
  Inbox,
  Building2,
  Phone,
  MessageCircle,
  Mail,
  Bell,
  Lock,
  LogOut,
  Check,
  Trash2,
  PlusCircle,
  ShieldCheck,
  Clock,
  MapPin,
  Megaphone,
  ImagePlus,
  Video,
  Link2,
  ThumbsUp,
  MessageSquare,
  Pencil,
  X,
} from 'lucide-react';
import {
  useAppContext,
  TIDIKELT_NEIGHBORHOODS,
  AssociationPost,
} from '../context/AppContext';

function getYoutubeEmbedUrl(url: string): string | null {
  try {
    const trimmed = url.trim();
    const ytRegex =
      /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/;
    const match = trimmed.match(ytRegex);
    if (match && match[1]) {
      return `https://www.youtube.com/embed/${match[1]}`;
    }
  } catch {
    return null;
  }
  return null;
}

function getFacebookEmbedUrl(url: string): string | null {
  try {
    const trimmed = url.trim();
    if (
      trimmed.includes('facebook.com/') ||
      trimmed.includes('fb.watch/')
    ) {
      return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(
        trimmed
      )}&show_text=false`;
    }
  } catch {
    return null;
  }
  return null;
}

export const HelpRequestsPage: React.FC = () => {
  const {
    activeView,
    setActiveView,
    approvedAssociations,
    pendingAssociations,
    activeAssociation,
    activeAssociationMessages,
    posts,
    loginAssociation,
    logoutAssociation,
    sendMessageToAssociation,
    requestAssociationMembership,
    approveAssociation,
    rejectOrRemoveAssociation,
    markMessageAsRead,
    deleteMessage,
    addAssociationPost,
    updateAssociationPost,
    deleteAssociationPost,
    toggleLikePost,
    addCommentToPost,
    deleteCommentFromPost,
    preselectedSenderAssocId,
    setPreselectedSenderAssocId,
    showToast,
    isAdminLoggedIn,
    onOpenAdminPanel,
  } = useAppContext();

  // --- VIEW 1: SENDER FORM STATE ---
  const [selectedAssocId, setSelectedAssocId] = useState<string>(
    approvedAssociations[0]?.id || ''
  );
  const [assocSearchQuery, setAssocSearchQuery] = useState('');
  const [showAssocSuggestions, setShowAssocSuggestions] = useState(false);
  const [senderName, setSenderName] = useState('');
  const [senderPhone, setSenderPhone] = useState('');
  const [senderNeighborhood, setSenderNeighborhood] = useState('');
  const [messageContent, setMessageContent] = useState('');
  const [notifyInApp, setNotifyInApp] = useState(true);
  const [notifyWhatsapp, setNotifyWhatsapp] = useState(false);
  const [notifyEmail, setNotifyEmail] = useState(false);
  const [lastSentAssocName, setLastSentAssocName] = useState<string | null>(null);

  useEffect(() => {
    if (preselectedSenderAssocId) {
      setSelectedAssocId(preselectedSenderAssocId);
      setPreselectedSenderAssocId(null);
    } else if (!selectedAssocId && approvedAssociations.length > 0) {
      setSelectedAssocId(approvedAssociations[0].id);
    }
  }, [
    approvedAssociations,
    selectedAssocId,
    preselectedSenderAssocId,
    setPreselectedSenderAssocId,
  ]);

  // --- VIEW 2: RECEIVER (ASSOCIATION LOGIN & REGISTRATION) STATE ---
  const [receiverSubMode, setReceiverSubMode] = useState<'login' | 'register'>('login');
  const [loginAssocId, setLoginAssocId] = useState<string>(
    approvedAssociations[0]?.id || ''
  );
  const [loginAssocSearchQuery, setLoginAssocSearchQuery] = useState(
    approvedAssociations[0]?.name || ''
  );
  const [showLoginAssocSuggestions, setShowLoginAssocSuggestions] = useState(false);
  const [loginAccessCode, setLoginAccessCode] = useState('');
  const [msgFilter, setMsgFilter] = useState<'all' | 'unread'>('all');

  useEffect(() => {
    if (!loginAssocId && approvedAssociations.length > 0) {
      setLoginAssocId(approvedAssociations[0].id);
    }
  }, [approvedAssociations, loginAssocId]);

  // Association Membership Request Form State
  const [regName, setRegName] = useState('');
  const [regSpecialty, setRegSpecialty] = useState('');
  const [regNeighborhood, setRegNeighborhood] = useState(TIDIKELT_NEIGHBORHOODS[0]);
  const [regPhone, setRegPhone] = useState('');
  const [regWhatsapp, setRegWhatsapp] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regAccessCode, setRegAccessCode] = useState('');
  const [showRegSuccess, setShowRegSuccess] = useState(false);

  // --- VIEW 3: FACEBOOK-STYLE ASSOCIATIONS SPACE (فضاء الجمعيات) STATE ---
  const [postArticleTitle, setPostArticleTitle] = useState('');
  const [isArticleMode, setIsArticleMode] = useState(false);
  const [postContent, setPostContent] = useState('');
  const [postImageUrl, setPostImageUrl] = useState<string | undefined>(undefined);
  const [postVideoUrl, setPostVideoUrl] = useState<string>('');
  const [showVideoLinkInput, setShowVideoLinkInput] = useState(false);
  const [adminPublishAssocId, setAdminPublishAssocId] = useState<string>(
    approvedAssociations[0]?.id || ''
  );
  const [spaceAssocFilter, setSpaceAssocFilter] = useState<string>('all');

  // Inline Editing State for Posts
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editArticleTitle, setEditArticleTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editImageUrl, setEditImageUrl] = useState<string | undefined>(undefined);
  const [editVideoUrl, setEditVideoUrl] = useState<string>('');

  // Comments State per Post
  const [openCommentsMap, setOpenCommentsMap] = useState<Record<string, boolean>>({});
  const [commentTextMap, setCommentTextMap] = useState<Record<string, string>>({});
  const [visitorCommentName, setVisitorCommentName] = useState('');

  useEffect(() => {
    if (!adminPublishAssocId && approvedAssociations.length > 0) {
      setAdminPublishAssocId(approvedAssociations[0].id);
    }
  }, [approvedAssociations, adminPublishAssocId]);

  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    onResult: (dataUrl: string | undefined) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast('حجم الصورة كبير، يرجى اختيار صورة أقل من 5 ميغابايت');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onResult(reader.result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleVideoFileUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    onResult: (dataUrl: string) => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      showToast('حجم الفيديو كبير للحفظ المحلي، يرجى اختيار فيديو قصير أو وضع رابط الفيديو');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onResult(reader.result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handlePublishPost = (e: React.FormEvent) => {
    e.preventDefault();
    if (!postContent.trim() && !postImageUrl && !postVideoUrl.trim()) {
      showToast('اكتب شيئاً أو أرفق صورة أو فيديو للنشر');
      return;
    }

    const created = addAssociationPost({
      title: postArticleTitle.trim() || undefined,
      content: postContent,
      imageUrl: postImageUrl,
      videoUrl: postVideoUrl.trim() || undefined,
      associationId: activeAssociation?.id || adminPublishAssocId,
    });

    if (created) {
      setPostArticleTitle('');
      setPostContent('');
      setPostImageUrl(undefined);
      setPostVideoUrl('');
      setShowVideoLinkInput(false);
    }
  };

  const startEditingPost = (post: AssociationPost) => {
    setEditingPostId(post.id);
    setEditArticleTitle(post.title || '');
    setEditContent(post.content);
    setEditImageUrl(post.imageUrl);
    setEditVideoUrl(post.videoUrl || '');
  };

  const handleSaveEditedPost = (e: React.FormEvent, postId: string) => {
    e.preventDefault();
    if (!editContent.trim() && !editImageUrl && !editVideoUrl.trim()) {
      showToast('لا يمكن حفظ منشور فارغ');
      return;
    }
    updateAssociationPost(postId, {
      title: editArticleTitle.trim() || undefined,
      content: editContent,
      imageUrl: editImageUrl,
      videoUrl: editVideoUrl.trim() || undefined,
    });
    setEditingPostId(null);
  };

  const handleMessageAssociationFromPost = (assocId: string) => {
    setPreselectedSenderAssocId(assocId);
    setSelectedAssocId(assocId);
    setActiveView('sender');
  };

  const handleAddCommentSubmit = (e: React.FormEvent, postId: string) => {
    e.preventDefault();
    const txt = commentTextMap[postId] || '';
    if (!txt.trim()) return;
    addCommentToPost(postId, visitorCommentName, txt);
    setCommentTextMap((prev) => ({ ...prev, [postId]: '' }));
    setOpenCommentsMap((prev) => ({ ...prev, [postId]: true }));
  };

  const renderPostVideo = (videoUrl?: string) => {
    if (!videoUrl) return null;
    const ytEmbed = getYoutubeEmbedUrl(videoUrl);
    if (ytEmbed) {
      return (
        <div className="aspect-video w-full rounded-xl overflow-hidden bg-black border border-[var(--line)]">
          <iframe
            src={ytEmbed}
            title="فيديو يوتيوب"
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      );
    }
    const fbEmbed = getFacebookEmbedUrl(videoUrl);
    if (fbEmbed) {
      return (
        <div className="aspect-video w-full rounded-xl overflow-hidden bg-black border border-[var(--line)]">
          <iframe
            src={fbEmbed}
            title="فيديو فيسبوك"
            className="w-full h-full border-0"
            allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      );
    }
    return (
      <div className="rounded-xl overflow-hidden bg-black border border-[var(--line)] max-h-96 flex items-center justify-center">
        <video
          src={videoUrl}
          controls
          playsInline
          className="max-h-96 w-full object-contain"
        />
      </div>
    );
  };

  const handleSendCitizenMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAssocId) {
      showToast('يرجى اختيار الجمعية الخيرية المستقبلة');
      return;
    }
    if (!senderPhone.trim() || !messageContent.trim()) {
      showToast('يرجى كتابة رقم الهاتف ونص الرسالة');
      return;
    }

    const targetAssoc = approvedAssociations.find((a) => a.id === selectedAssocId);
    const created = sendMessageToAssociation({
      associationId: selectedAssocId,
      senderName,
      senderPhone,
      neighborhood: senderNeighborhood,
      subject: 'رسالة جديدة عبر باب الخير',
      content: messageContent,
      notifyChannels: {
        inApp: notifyInApp,
        whatsapp: notifyWhatsapp,
        email: notifyEmail,
      },
    });

    if (created) {
      setLastSentAssocName(targetAssoc?.name || 'الجمعية المختارة');
      setSenderName('');
      setSenderPhone('');
      setSenderNeighborhood('');
      setMessageContent('');
    }
  };

  const handleAssociationLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginAssocId) {
      showToast('يرجى اختيار الجمعية');
      return;
    }
    loginAssociation(loginAssocId, loginAccessCode);
    setLoginAccessCode('');
  };

  const handleRegisterNewAssociation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regPhone.trim() || !regAccessCode.trim()) {
      showToast('يرجى إدخال اسم الجمعية ورقم الهاتف ورمز الدخول الخاص بها');
      return;
    }

    requestAssociationMembership({
      name: regName,
      specialty: regSpecialty,
      neighborhood: regNeighborhood,
      phone: regPhone,
      whatsapp: regWhatsapp || regPhone,
      email: regEmail,
      accessCode: regAccessCode,
    });

    setRegName('');
    setRegSpecialty('');
    setRegPhone('');
    setRegWhatsapp('');
    setRegEmail('');
    setRegAccessCode('');
    setShowRegSuccess(true);
  };

  const formatTime = (ts: number) => {
    try {
      return new Date(ts).toLocaleString('ar-DZ', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return '';
    }
  };

  const displayedMessages =
    msgFilter === 'unread'
      ? activeAssociationMessages.filter((m) => m.status === 'unread')
      : activeAssociationMessages;

  const displayedPosts =
    spaceAssocFilter === 'all'
      ? posts
      : posts.filter((p) => p.associationId === spaceAssocFilter);

  const currentPublisherName =
    activeAssociation?.name ||
    approvedAssociations.find((a) => a.id === adminPublishAssocId)?.name ||
    'الجمعية المعتمدة';

  return (
    <div className="space-y-5">
      {/* =====================================================================
          VIEW 1: SENDER (واجهة المرسل — إرسال رسالة مباشرة إلى جمعية خيرية)
         ===================================================================== */}
      {activeView === 'sender' && (
        <section className="rounded-2xl bg-[var(--card)] border border-[var(--line)] p-5 sm:p-6 space-y-5">
          <div className="border-b border-[var(--line)] pb-3.5">
            <h2 className="text-xl sm:text-2xl font-black text-[var(--ink)] m-0">
              اختر الجمعية التي تريد مراسلتها
            </h2>
          </div>

          {lastSentAssocName && (
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs sm:text-sm text-[var(--ink)] flex items-center justify-between gap-2">
              <span>
                تم إرسال رسالتك بنجاح إلى <b>{lastSentAssocName}</b>.
              </span>
              <button
                type="button"
                onClick={() => setLastSentAssocName(null)}
                title="إخفاء التنبيه"
                aria-label="إخفاء التنبيه"
                className="text-xs font-bold text-emerald-600 hover:underline cursor-pointer shrink-0"
              >
                حسناً
              </button>
            </div>
          )}

          <form onSubmit={handleSendCitizenMessage} className="space-y-4">
            {/* 1. Association Autocomplete Search */}
            <div className="space-y-1.5 relative">
              <label
                htmlFor="target-assoc-search"
                className="block text-sm sm:text-base font-black text-[var(--ink)]"
              >
                اختر الجمعية التي تريد مراسلتها *
              </label>
              <input
                id="target-assoc-search"
                type="text"
                required
                value={assocSearchQuery}
                onChange={(e) => {
                  setAssocSearchQuery(e.target.value);
                  setShowAssocSuggestions(true);
                  if (e.target.value === '') setSelectedAssocId('');
                }}
                onFocus={() => setShowAssocSuggestions(true)}
                placeholder="ابحث عن اسم الجمعية..."
                className="w-full px-4 py-3 rounded-2xl bg-[var(--bg)] border-2 border-[var(--line)] text-sm sm:text-base text-[var(--ink)] font-bold focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
              />
              {showAssocSuggestions && assocSearchQuery && (
                <div className="absolute z-40 w-full mt-2 bg-[var(--card)] border border-[var(--line)] rounded-2xl shadow-xl max-h-48 overflow-y-auto">
                  {approvedAssociations
                    .filter((a) => a.name.includes(assocSearchQuery))
                    .map((assoc) => (
                      <button
                        key={assoc.id}
                        type="button"
                        onClick={() => {
                          setSelectedAssocId(assoc.id);
                          setAssocSearchQuery(assoc.name);
                          setShowAssocSuggestions(false);
                        }}
                        className="w-full text-start px-4 py-3 text-sm sm:text-base text-[var(--ink)] hover:bg-emerald-500/10 cursor-pointer border-b border-[var(--line)] last:border-0"
                      >
                        {assoc.name}
                      </button>
                    ))}
                  {approvedAssociations.filter((a) => a.name.includes(assocSearchQuery)).length === 0 && (
                    <div className="px-4 py-3 text-sm text-[var(--mute)]">لا توجد جمعية بهذا الاسم</div>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label
                  htmlFor="sender-name"
                  className="block text-xs font-bold text-[var(--ink)]"
                >
                  الاسم الكامل والصحيح (مهم) *
                </label>
                <input
                  id="sender-name"
                  type="text"
                  required
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  placeholder="اكتب اسمك الكامل"
                  className="w-full px-4 py-3 rounded-xl bg-[var(--bg)] border border-[var(--line)] text-sm text-[var(--ink)] focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
                />
              </div>

              <div className="space-y-1.5">
                <label
                  htmlFor="sender-phone"
                  className="block text-xs font-bold text-[var(--ink)]"
                >
                  رقم الهاتف (ضروري) *
                </label>
                <input
                  id="sender-phone"
                  type="tel"
                  required
                  value={senderPhone}
                  onChange={(e) => setSenderPhone(e.target.value)}
                  placeholder="0661000000"
                  className="w-full px-4 py-3 rounded-xl bg-[var(--bg)] border border-[var(--line)] text-sm text-[var(--ink)] font-mono focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="sender-wilaya"
                className="block text-xs font-bold text-[var(--ink)]"
              >
                الولاية *
              </label>
              <input
                id="sender-wilaya"
                type="text"
                required
                value={senderNeighborhood}
                onChange={(e) => setSenderNeighborhood(e.target.value)}
                placeholder="اسم الولاية"
                className="w-full px-4 py-3 rounded-xl bg-[var(--bg)] border border-[var(--line)] text-sm text-[var(--ink)] focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="msg-content"
                className="block text-xs font-bold text-[var(--ink)]"
              >
                نص الرسالة *
              </label>
              <textarea
                id="msg-content"
                rows={4}
                required
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                placeholder="اكتب رسالتك هنا..."
                className="w-full p-4 rounded-xl bg-[var(--bg)] border border-[var(--line)] text-sm text-[var(--ink)] leading-relaxed focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
              />
            </div>

            <div className="p-5 rounded-2xl bg-[var(--bg)] border border-[var(--line)] space-y-4">
              <div className="text-xs font-bold text-[var(--ink)]">
                طريقة تنبيه الجمعية (يمكن اختيار عدة):
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-[var(--ink)]">
                <label className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all cursor-pointer ${notifyInApp ? 'bg-emerald-500/10 border-emerald-500 text-emerald-700 dark:text-emerald-300' : 'bg-[var(--card)] border-[var(--line)] hover:border-emerald-500/50'}`}>
                  <input
                    type="checkbox"
                    checked={notifyInApp}
                    onChange={(e) => setNotifyInApp(e.target.checked)}
                    className="w-5 h-5 accent-emerald-600 rounded"
                  />
                  <div className="flex flex-col gap-1">
                    <Bell className="w-5 h-5" />
                    <span className="font-bold">التطبيق</span>
                  </div>
                </label>

                <label className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all cursor-pointer ${notifyWhatsapp ? 'bg-emerald-500/10 border-emerald-500 text-emerald-700 dark:text-emerald-300' : 'bg-[var(--card)] border-[var(--line)] hover:border-emerald-500/50'}`}>
                  <input
                    type="checkbox"
                    checked={notifyWhatsapp}
                    onChange={(e) => setNotifyWhatsapp(e.target.checked)}
                    className="w-5 h-5 accent-emerald-600 rounded"
                  />
                  <div className="flex flex-col gap-1">
                    <MessageCircle className="w-5 h-5" />
                    <span className="font-bold">واتساب</span>
                  </div>
                </label>

                <label className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all cursor-pointer ${notifyEmail ? 'bg-emerald-500/10 border-emerald-500 text-emerald-700 dark:text-emerald-300' : 'bg-[var(--card)] border-[var(--line)] hover:border-emerald-500/50'}`}>
                  <input
                    type="checkbox"
                    checked={notifyEmail}
                    onChange={(e) => setNotifyEmail(e.target.checked)}
                    className="w-5 h-5 accent-emerald-600 rounded"
                  />
                  <div className="flex flex-col gap-1">
                    <Mail className="w-5 h-5" />
                    <span className="font-bold">بريد</span>
                  </div>
                </label>
              </div>
            </div>

            <button
              type="submit"
              title="إرسال"
              aria-label="إرسال"
              className="w-full py-3 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Send className="w-4 h-4 shrink-0" />
              <span>إرسال</span>
            </button>
          </form>
        </section>
      )}

      {/* =====================================================================
          VIEW 2: RECEIVER (واجهة المستقبل — صندوق رسائل الجمعيات الخيرية)
         ===================================================================== */}
      {activeView === 'receiver' && (
        <div className="space-y-5">
          {activeAssociation ? (
            <section className="rounded-2xl bg-[var(--card)] border border-[var(--line)] p-5 sm:p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--line)] pb-4">
                <div>
                  <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-bold">
                    <ShieldCheck className="w-4 h-4 shrink-0" />
                    <span>صندوق الوارد الخاص بالجمعية المعتمدة</span>
                  </div>
                  <h2 className="text-base sm:text-lg font-black text-[var(--ink)] m-0 mt-0.5">
                    {activeAssociation.name}
                  </h2>
                  <div className="text-xs text-[var(--mute)] mt-0.5">
                    {activeAssociation.neighborhood} · {activeAssociation.specialty}
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-center">
                  <button
                    type="button"
                    onClick={() => setActiveView('space')}
                    title="الانتقال إلى فضاء الجمعيات لنشر صور أو فيديو أو منشور"
                    aria-label="النشر في فضاء الجمعيات"
                    className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Megaphone className="w-3.5 h-3.5 shrink-0" />
                    <span>النشر في فضاء الجمعيات</span>
                  </button>

                  <button
                    type="button"
                    onClick={logoutAssociation}
                    title="تسجيل الخروج من حساب الجمعية"
                    aria-label="تسجيل الخروج من حساب الجمعية"
                    className="px-3.5 py-2 rounded-xl border border-[var(--line)] bg-[var(--bg)] hover:border-rose-500/40 text-xs font-bold text-[var(--ink)] inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    <span>خروج</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setMsgFilter('all')}
                    title="عرض كل الرسائل الواردة للجمعية"
                    aria-label="عرض كل الرسائل"
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                      msgFilter === 'all'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-[var(--bg)] text-[var(--mute)] hover:text-[var(--ink)] border border-[var(--line)]'
                    }`}
                  >
                    كل الرسائل ({activeAssociationMessages.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setMsgFilter('unread')}
                    title="عرض الرسائل الجديدة غير المقروءة"
                    aria-label="الرسائل غير المقروءة"
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                      msgFilter === 'unread'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-[var(--bg)] text-[var(--mute)] hover:text-[var(--ink)] border border-[var(--line)]'
                    }`}
                  >
                    غير مقروءة (
                    {activeAssociationMessages.filter((m) => m.status === 'unread').length})
                  </button>
                </div>

                <span className="text-xs text-[var(--mute)]">
                  تظهر هنا الرسائل الموجهة لجمعيتكم فقط
                </span>
              </div>

              {displayedMessages.length === 0 ? (
                <div className="py-10 text-center space-y-2 border border-dashed border-[var(--line)] rounded-xl bg-[var(--bg)]/40">
                  <Inbox className="w-8 h-8 text-[var(--mute)] mx-auto stroke-[1.5]" />
                  <div className="text-sm font-bold text-[var(--ink)]">
                    لا توجد رسائل واردة في هذا القسم حالياً
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {displayedMessages.map((msg) => (
                    <article
                      key={msg.id}
                      className={`p-4 rounded-xl border transition-colors space-y-2.5 ${
                        msg.status === 'unread'
                          ? 'bg-emerald-500/[0.04] border-emerald-500/40'
                          : 'bg-[var(--bg)] border-[var(--line)]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center flex-wrap gap-2 text-xs text-[var(--mute)]">
                            <span className="font-bold text-[var(--ink)]">
                              {msg.senderName}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                              {msg.neighborhood}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono tabular-nums">
                              {formatTime(msg.createdAt)}
                            </span>
                          </div>
                          <h3 className="text-sm sm:text-base font-extrabold text-[var(--ink)] m-0 mt-1">
                            {msg.subject}
                          </h3>
                        </div>

                        {msg.status === 'unread' && (
                          <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 shrink-0">
                            جديدة
                          </span>
                        )}
                      </div>

                      <p className="text-xs sm:text-sm text-[var(--ink)]/90 m-0 leading-relaxed whitespace-pre-line">
                        {msg.content}
                      </p>

                      <div className="flex items-center flex-wrap gap-2 pt-2 border-t border-[var(--line)]/60">
                        <a
                          href={`tel:+213${msg.senderPhone.replace(/^0/, '')}`}
                          title="اتصال هاتفي بالمرسل"
                          aria-label="اتصال هاتفي بالمرسل"
                          className="cbtn py-1.5 px-3 rounded-lg bg-[var(--card)] border border-[var(--line)] hover:border-emerald-500 text-xs font-bold text-[var(--ink)] inline-flex items-center gap-1.5"
                        >
                          <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="font-mono">{msg.senderPhone}</span>
                        </a>

                        <a
                          href={`https://wa.me/213${msg.senderPhone.replace(
                            /^0/,
                            ''
                          )}?text=${encodeURIComponent(
                            `السلام عليكم، نتواصل معكم من «${activeAssociation.name}» بخصوص رسالتكم (${msg.subject}) عبر منصة باب الخير:`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="رد مباشر عبر واتساب"
                          aria-label="رد مباشر عبر واتساب"
                          className="cbtn py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold inline-flex items-center gap-1.5"
                        >
                          <MessageCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>رد واتساب</span>
                        </a>

                        {msg.status === 'unread' && (
                          <button
                            type="button"
                            onClick={() => markMessageAsRead(msg.id)}
                            title="تحديد الرسالة كمقروءة"
                            aria-label="تحديد الرسالة كمقروءة"
                            className="py-1.5 px-3 rounded-lg bg-[var(--card)] border border-[var(--line)] hover:border-emerald-500 text-xs font-bold text-[var(--ink)] inline-flex items-center gap-1 cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>تمت القراءة</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => deleteMessage(msg.id)}
                          title="حذف الرسالة"
                          aria-label="حذف الرسالة"
                          className="ms-auto py-1.5 px-2.5 rounded-lg text-[var(--mute)] hover:text-rose-500 hover:bg-rose-500/10 text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5 shrink-0" />
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          ) : (
            <section className="rounded-2xl bg-[var(--card)] border border-[var(--line)] p-5 sm:p-6 space-y-5">
              <div className="flex items-center gap-2 border-b border-[var(--line)] pb-4">
                <button
                  type="button"
                  onClick={() => setReceiverSubMode('login')}
                  title="دخول الجمعية المعتمدة للاطلاع على رسائلها"
                  aria-label="دخول الجمعية المعتمدة"
                  className={`flex-1 py-2 px-3 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                    receiverSubMode === 'login'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-[var(--bg)] text-[var(--mute)] hover:text-[var(--ink)] border border-[var(--line)]'
                  }`}
                >
                  <Lock className="w-4 h-4 shrink-0" />
                  <span>دخول الجمعية المعتمدة</span>
                </button>

                <button
                  type="button"
                  onClick={() => setReceiverSubMode('register')}
                  title="طلب انضمام جمعية خيرية جديدة عبر تيدكلت AI"
                  aria-label="طلب إضافة جمعية جديدة"
                  className={`flex-1 py-2 px-3 rounded-xl text-xs sm:text-sm font-extrabold flex items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                    receiverSubMode === 'register'
                      ? 'bg-emerald-600 text-white'
                      : 'bg-[var(--bg)] text-[var(--mute)] hover:text-[var(--ink)] border border-[var(--line)]'
                  }`}
                >
                  <PlusCircle className="w-4 h-4 shrink-0" />
                  <span>طلب إضافة جمعية جديدة</span>
                </button>
              </div>

              {receiverSubMode === 'login' ? (
                <form onSubmit={handleAssociationLogin} className="space-y-4">
                  <div className="space-y-1">
                    <h3 className="text-sm sm:text-base font-black text-[var(--ink)] m-0">
                      دخول الجمعية المعتمدة (الرسائل والنشر)
                    </h3>
                    <p className="text-xs text-[var(--mute)] m-0">
                      بعد موافقة مالك منصة تيدكلت AI على عضوية الجمعية، يمكنها الدخول برمزها الخاص للاطلاع على رسائلها أو مشاركة منشوراتها وصورها وفيديوهاتها في فضاء الجمعيات.
                    </p>
                  </div>

                  <div className="space-y-1.5 relative">
                    <label
                      htmlFor="login-assoc-search"
                      className="block text-xs font-bold text-[var(--ink)]"
                    >
                      اختر الجمعية المعتمدة *
                    </label>
                    <input
                      id="login-assoc-search"
                      type="text"
                      required
                      value={loginAssocSearchQuery}
                      onChange={(e) => {
                        setLoginAssocSearchQuery(e.target.value);
                        setShowLoginAssocSuggestions(true);
                        if (e.target.value === '') setLoginAssocId('');
                      }}
                      onFocus={() => setShowLoginAssocSuggestions(true)}
                      placeholder="ابحث عن اسم الجمعية..."
                      className="w-full px-4 py-3 rounded-2xl bg-[var(--bg)] border-2 border-[var(--line)] text-sm sm:text-base text-[var(--ink)] font-bold focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
                    />
                    {showLoginAssocSuggestions && loginAssocSearchQuery && (
                      <div className="absolute z-40 w-full mt-1 bg-[var(--card)] border border-[var(--line)] rounded-xl shadow-lg max-h-48 overflow-y-auto">
                        {approvedAssociations
                          .filter((a) => a.name.includes(loginAssocSearchQuery))
                          .map((assoc) => (
                            <button
                              key={assoc.id}
                              type="button"
                              onClick={() => {
                                setLoginAssocId(assoc.id);
                                setLoginAssocSearchQuery(assoc.name);
                                setShowLoginAssocSuggestions(false);
                              }}
                              className="w-full text-start px-3.5 py-2 text-xs sm:text-sm text-[var(--ink)] hover:bg-emerald-500/10 cursor-pointer border-b border-[var(--line)] last:border-0"
                            >
                              {assoc.name}
                            </button>
                          ))}
                        {approvedAssociations.filter((a) => a.name.includes(loginAssocSearchQuery)).length === 0 && (
                          <div className="px-3.5 py-2 text-xs text-[var(--mute)]">لا توجد جمعية بهذا الاسم</div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor="login-assoc-code"
                      className="block text-xs font-bold text-[var(--ink)]"
                    >
                      رمز عضوية الجمعية *
                    </label>
                    <input
                      id="login-assoc-code"
                      type="password"
                      required={!isAdminLoggedIn}
                      value={loginAccessCode}
                      onChange={(e) => setLoginAccessCode(e.target.value)}
                      placeholder={
                        isAdminLoggedIn
                          ? 'وضع المالك مفعل — يمكنك الدخول مباشرة دون رمز'
                          : 'أدخل رمز العضوية الخاص بالجمعية'
                      }
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg)] border border-[var(--line)] text-xs sm:text-sm text-[var(--ink)] font-mono focus:outline-none focus:border-emerald-600"
                    />
                  </div>

                  <button
                    type="submit"
                    title="تسجيل دخول الجمعية"
                    aria-label="تسجيل دخول الجمعية"
                    className="w-full py-2.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 cursor-pointer transition-colors"
                  >
                    <Inbox className="w-4 h-4 shrink-0" />
                    <span>دخول حساب الجمعية</span>
                  </button>
                </form>
              ) : (
                <form onSubmit={handleRegisterNewAssociation} className="space-y-4">
                  <div className="space-y-1">
                    <h3 className="text-sm sm:text-base font-black text-[var(--ink)] m-0">
                      طلب إضافة جمعية خيرية في منصة تيدكلت AI
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-[var(--ink)]">
                        اسم الجمعية *
                      </label>
                      <input
                        type="text"
                        required
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        placeholder="مثال: جمعية البركة الخيرية"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg)] border border-[var(--line)] text-xs sm:text-sm text-[var(--ink)] focus:outline-none focus:border-emerald-600"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-[var(--ink)]">
                        الحي / البلدية *
                      </label>
                      <select
                        value={regNeighborhood}
                        onChange={(e) => setRegNeighborhood(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg)] border border-[var(--line)] text-xs sm:text-sm text-[var(--ink)] focus:outline-none focus:border-emerald-600"
                      >
                        {TIDIKELT_NEIGHBORHOODS.map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-[var(--ink)]">
                        مجال نشاط الجمعية
                      </label>
                      <input
                        type="text"
                        value={regSpecialty}
                        onChange={(e) => setRegSpecialty(e.target.value)}
                        placeholder="مثال: عمل تطوعي، ثقافي، اجتماعي"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg)] border border-[var(--line)] text-xs sm:text-sm text-[var(--ink)] focus:outline-none focus:border-emerald-600"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-[var(--ink)]">
                        رمز الدخول الخاص بالجمعية *
                      </label>
                      <input
                        type="text"
                        required
                        value={regAccessCode}
                        onChange={(e) => setRegAccessCode(e.target.value)}
                        placeholder="اختر رمزاً سرياً للجمعية"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg)] border border-[var(--line)] text-xs sm:text-sm text-[var(--ink)] font-mono focus:outline-none focus:border-emerald-600"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-[var(--ink)]">
                        رقم الهاتف *
                      </label>
                      <input
                        type="tel"
                        required
                        value={regPhone}
                        onChange={(e) => setRegPhone(e.target.value)}
                        placeholder="0661000000"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg)] border border-[var(--line)] text-xs sm:text-sm text-[var(--ink)] font-mono focus:outline-none focus:border-emerald-600"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-[var(--ink)]">
                        رقم واتساب للإشعارات
                      </label>
                      <input
                        type="tel"
                        value={regWhatsapp}
                        onChange={(e) => setRegWhatsapp(e.target.value)}
                        placeholder="0661000000"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg)] border border-[var(--line)] text-xs sm:text-sm text-[var(--ink)] font-mono focus:outline-none focus:border-emerald-600"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-[var(--ink)]">
                        البريد الإلكتروني للإشعارات
                      </label>
                      <input
                        type="email"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="charity@example.com"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg)] border border-[var(--line)] text-xs sm:text-sm text-[var(--ink)] font-mono focus:outline-none focus:border-emerald-600"
                      />
                    </div>
                  </div>

                  {showRegSuccess ? (
                    <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-sm font-bold text-center">
                      تم استلام طلبك بنجاح. سيتم الموافقة على طلبك من طرف مسيري منصة تيدكلت AI.
                    </div>
                  ) : (
                    <button
                      type="submit"
                      title="إرسال"
                      aria-label="إرسال"
                      className="w-full py-2.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-extrabold flex items-center justify-center gap-2 cursor-pointer transition-colors"
                    >
                      <Send className="w-4 h-4 shrink-0" />
                      <span>إرسال</span>
                    </button>
                  )}
                </form>
              )}
            </section>
          )}

          {isAdminLoggedIn && onOpenAdminPanel && (
            <div className="rounded-2xl bg-[var(--card)] border border-emerald-500/40 p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                <span className="text-xs font-extrabold text-[var(--ink)]">
                  إدارة الجمعيات والرسائل والمنشورات والحظر متاحة حصرياً عبر جهة باب الخير في لوحة تحكم المالك
                </span>
              </div>
              <button
                type="button"
                onClick={onOpenAdminPanel}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold cursor-pointer shrink-0"
              >
                فتح لوحة تحكم المالك
              </button>
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          VIEW 3: FACEBOOK-STYLE ASSOCIATIONS SPACE (فضاء الجمعيات — منشورات وصور وفيديو)
         ===================================================================== */}
      {activeView === 'space' && (
        <div className="space-y-5">
          {/* A. FACEBOOK-STYLE COMPOSER BOX (For Approved Association Members or Owner) */}
          {activeAssociation || isAdminLoggedIn ? (
            <section className="rounded-2xl bg-[var(--card)] border border-[var(--line)] p-4 sm:p-5 space-y-3.5">
              {/* Top Row: Association Avatar + Name + Logout */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-emerald-600 text-white font-black text-sm flex items-center justify-center shrink-0">
                    {currentPublisherName.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs sm:text-sm font-black text-[var(--ink)] truncate">
                        {currentPublisherName}
                      </span>
                      <ShieldCheck
                        className="w-4 h-4 text-emerald-600 shrink-0"
                         aria-label="جمعية معتمدة"
                      />
                    </div>
                    <span className="text-[11px] text-[var(--mute)] block">
                      {activeAssociation
                        ? activeAssociation.neighborhood
                        : 'النشر بصلاحية مالك تيدكلت AI'}
                    </span>
                  </div>
                </div>

                {activeAssociation && (
                  <button
                    type="button"
                    onClick={logoutAssociation}
                    title="تسجيل الخروج من حساب الجمعية"
                    aria-label="تسجيل الخروج من حساب الجمعية"
                    className="px-3 py-1.5 rounded-xl border border-[var(--line)] bg-[var(--bg)] hover:border-rose-500/40 text-xs font-bold text-[var(--ink)] inline-flex items-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <LogOut className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                    <span>خروج</span>
                  </button>
                )}
              </div>

              {/* Admin Association Selector if Admin is not logged into a specific association */}
              {!activeAssociation && isAdminLoggedIn && (
                <div>
                  <select
                    aria-label="اختر الجمعية للنشر باسمها"
                    value={adminPublishAssocId}
                    onChange={(e) => setAdminPublishAssocId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg)] border border-[var(--line)] text-xs font-bold text-[var(--ink)] focus:outline-none focus:border-emerald-600"
                  >
                    {approvedAssociations.map((a) => (
                      <option key={a.id} value={a.id}>
                        النشر باسم: {a.name} ({a.neighborhood})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Facebook-Style Blogging & Free Post Form */}
              <form onSubmit={handlePublishPost} className="space-y-3">
                {/* Direct Article / Blog Title Field */}
                <div>
                  <input
                    type="text"
                    value={postArticleTitle}
                    onChange={(e) => setPostArticleTitle(e.target.value)}
                    placeholder="عنوان التدوينة أو المقال (اختياري)..."
                    aria-label="عنوان التدوينة أو المقال"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[var(--bg)] border border-[var(--line)] text-xs sm:text-sm text-[var(--ink)] font-bold focus:outline-none focus:border-emerald-600"
                  />
                </div>

                {/* Main Content Text Area */}
                <textarea
                  rows={4}
                  value={postContent}
                  onChange={(e) => setPostContent(e.target.value)}
                  placeholder={`اكتب نص التدوينة، الخبر، أو المنشور هنا...`}
                  aria-label="نص التدوينة أو المنشور"
                  className="w-full p-3.5 rounded-2xl bg-[var(--bg)] border border-[var(--line)] text-xs sm:text-sm text-[var(--ink)] leading-relaxed focus:outline-none focus:border-emerald-600 resize-y"
                />

                {/* Video URL Input if Toggled */}
                {showVideoLinkInput && (
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[var(--bg)] border border-[var(--line)]">
                    <Link2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <input
                      type="url"
                      value={postVideoUrl}
                      onChange={(e) => setPostVideoUrl(e.target.value)}
                      placeholder="ضع رابط فيديو يوتيوب أو فيسبوك أو رابط فيديو مباشر..."
                      aria-label="رابط فيديو"
                      className="flex-1 bg-transparent text-xs sm:text-sm text-[var(--ink)] focus:outline-none font-mono"
                    />
                    {postVideoUrl && (
                      <button
                        type="button"
                        onClick={() => setPostVideoUrl('')}
                        title="مسح رابط الفيديو"
                        aria-label="مسح رابط الفيديو"
                        className="text-[var(--mute)] hover:text-rose-500 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                )}

                {/* Media Previews (Photo or Video) */}
                {postImageUrl && (
                  <div className="relative rounded-xl overflow-hidden border border-[var(--line)] bg-[var(--bg)] max-h-72 flex items-center justify-center">
                    <img
                      src={postImageUrl}
                      alt="معاينة الصورة"
                      className="max-h-72 w-auto object-contain"
                    />
                    <button
                      type="button"
                      onClick={() => setPostImageUrl(undefined)}
                      title="إزالة الصورة"
                      aria-label="إزالة الصورة"
                      className="absolute top-2 start-2 w-8 h-8 rounded-full bg-slate-900/80 text-white flex items-center justify-center hover:bg-rose-600 transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {postVideoUrl && (
                  <div className="relative">
                    {renderPostVideo(postVideoUrl)}
                    <button
                      type="button"
                      onClick={() => setPostVideoUrl('')}
                      title="إزالة الفيديو"
                      aria-label="إزالة الفيديو"
                      className="absolute top-2 start-2 z-10 w-8 h-8 rounded-full bg-slate-900/80 text-white flex items-center justify-center hover:bg-rose-600 transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Attachment Action Bar */}
                <div className="pt-2 border-t border-[var(--line)] flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {/* Upload Photo */}
                    <label
                      title="إضافة صورة إلى التدوينة"
                      aria-label="إضافة صورة إلى التدوينة"
                      className="px-3 py-2 rounded-xl bg-[var(--bg)] hover:bg-emerald-500/10 border border-[var(--line)] text-xs font-bold text-[var(--ink)] inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <ImagePlus className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>صورة</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, setPostImageUrl)}
                        className="hidden"
                      />
                    </label>

                    {/* Upload Video File */}
                    <label
                      title="رفع ملف فيديو من الجهاز"
                      aria-label="رفع ملف فيديو من الجهاز"
                      className="px-3 py-2 rounded-xl bg-[var(--bg)] hover:bg-emerald-500/10 border border-[var(--line)] text-xs font-bold text-[var(--ink)] inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Video className="w-4 h-4 text-rose-500 shrink-0" />
                      <span>فيديو</span>
                      <input
                        type="file"
                        accept="video/*"
                        onChange={(e) => handleVideoFileUpload(e, setPostVideoUrl)}
                        className="hidden"
                      />
                    </label>

                    {/* Video Link Toggle */}
                    <button
                      type="button"
                      onClick={() => setShowVideoLinkInput((v) => !v)}
                      title="إدراج رابط فيديو (يوتيوب / فيسبوك / مباشر)"
                      aria-label="إدراج رابط فيديو"
                      className={`px-3 py-2 rounded-xl border text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
                        showVideoLinkInput || (postVideoUrl && !postVideoUrl.startsWith('data:'))
                          ? 'bg-emerald-600/15 border-emerald-500/50 text-emerald-600 dark:text-emerald-400'
                          : 'bg-[var(--bg)] border-[var(--line)] text-[var(--ink)] hover:bg-emerald-500/10'
                      }`}
                    >
                      <Link2 className="w-4 h-4 text-sky-500 shrink-0" />
                      <span>رابط فيديو</span>
                    </button>
                  </div>

                  <button
                    type="submit"
                    title="نشر التدوينة في فضاء الجمعيات"
                    aria-label="نشر التدوينة"
                    className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-extrabold inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                  >
                    <Send className="w-3.5 h-3.5 shrink-0" />
                    <span>نشر التدوينة</span>
                  </button>
                </div>
              </form>
            </section>
          ) : (
            /* Visitor Bar: Join/Login as Approved Association to Post */
            <section className="rounded-2xl bg-[var(--card)] border border-[var(--line)] p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-full bg-emerald-600/15 text-emerald-600 flex items-center justify-center shrink-0">
                  <Megaphone className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs sm:text-sm font-black text-[var(--ink)] truncate">
                    فضاء الجمعيات — تدوينات، منشورات، وصور الجمعيات
                  </div>
                  <div className="text-[11px] text-[var(--mute)] truncate">
                    التدوين والنشر مخصص لأعضاء الجمعيات المعتمدة من مالك منصة تيدكلت AI
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setReceiverSubMode('login');
                  setActiveView('receiver');
                }}
                title="دخول عضو جمعية معتمدة للتعديل أو النشر"
                aria-label="دخول جمعية للتدوين"
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold inline-flex items-center gap-1.5 shrink-0 cursor-pointer transition-colors"
              >
                <Lock className="w-3.5 h-3.5 shrink-0" />
                <span>دخول للتدوين</span>
              </button>
            </section>
          )}

          {/* B. FACEBOOK-STYLE SOCIAL FEED */}
          {displayedPosts.length === 0 ? (
            <div className="rounded-2xl bg-[var(--card)] border border-dashed border-[var(--line)] py-12 px-4 text-center space-y-2">
              <Megaphone className="w-8 h-8 text-[var(--mute)] mx-auto stroke-[1.5]" />
              <div className="text-sm font-bold text-[var(--ink)]">
                لا توجد منشورات بعد في هذا الفضاء
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {displayedPosts.map((post) => {
                const canManagePost = activeAssociation?.id === post.associationId;
                const isEditingThis = editingPostId === post.id;
                const commentsList = post.comments || [];
                const isCommentsOpen = openCommentsMap[post.id] ?? true;

                return (
                  <article
                    key={post.id}
                    className="rounded-2xl bg-[var(--card)] border border-[var(--line)] overflow-hidden transition-colors"
                  >
                    {isEditingThis ? (
                      <form
                        onSubmit={(e) => handleSaveEditedPost(e, post.id)}
                        className="p-4 sm:p-5 space-y-3"
                      >
                        <div className="flex items-center justify-between border-b border-[var(--line)] pb-2">
                          <span className="text-xs font-extrabold text-emerald-600">
                            تعديل منشور {post.associationName}
                          </span>
                          <button
                            type="button"
                            onClick={() => setEditingPostId(null)}
                            title="إلغاء التعديل"
                            aria-label="إلغاء التعديل"
                            className="text-xs font-bold text-[var(--mute)] hover:text-[var(--ink)] cursor-pointer"
                          >
                            إلغاء
                          </button>
                        </div>

                        <textarea
                          rows={3}
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                          placeholder="نص المنشور..."
                          className="w-full p-3 rounded-xl bg-[var(--bg)] border border-[var(--line)] text-xs sm:text-sm text-[var(--ink)] leading-relaxed"
                        />

                        <div className="flex items-center gap-2 p-2 rounded-xl bg-[var(--bg)] border border-[var(--line)]">
                          <Link2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          <input
                            type="text"
                            value={editVideoUrl}
                            onChange={(e) => setEditVideoUrl(e.target.value)}
                            placeholder="رابط فيديو (اختياري)..."
                            className="flex-1 bg-transparent text-xs text-[var(--ink)] focus:outline-none font-mono"
                          />
                          {editVideoUrl && (
                            <button
                              type="button"
                              onClick={() => setEditVideoUrl('')}
                              title="حذف الفيديو"
                              aria-label="حذف الفيديو"
                              className="text-[var(--mute)] hover:text-rose-500 cursor-pointer"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        {editImageUrl && (
                          <div className="relative rounded-xl overflow-hidden border border-[var(--line)] bg-[var(--bg)] max-h-60 flex items-center justify-center">
                            <img
                              src={editImageUrl}
                              alt="صورة المنشور"
                              className="max-h-60 w-auto object-contain"
                            />
                            <button
                              type="button"
                              onClick={() => setEditImageUrl(undefined)}
                              title="حذف الصورة"
                              aria-label="حذف الصورة"
                              className="absolute top-2 start-2 w-7 h-7 rounded-full bg-slate-900/80 text-white flex items-center justify-center hover:bg-rose-600 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}

                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <label
                              title="تغيير أو إضافة صورة"
                              aria-label="تغيير أو إضافة صورة"
                              className="px-3 py-1.5 rounded-lg bg-[var(--bg)] border border-[var(--line)] text-xs font-bold text-[var(--ink)] inline-flex items-center gap-1.5 cursor-pointer"
                            >
                              <ImagePlus className="w-3.5 h-3.5 text-emerald-600" />
                              <span>صورة</span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleImageUpload(e, setEditImageUrl)}
                                className="hidden"
                              />
                            </label>

                            <label
                              title="رفع فيديو من الجهاز"
                              aria-label="رفع فيديو من الجهاز"
                              className="px-3 py-1.5 rounded-lg bg-[var(--bg)] border border-[var(--line)] text-xs font-bold text-[var(--ink)] inline-flex items-center gap-1.5 cursor-pointer"
                            >
                              <Video className="w-3.5 h-3.5 text-rose-500" />
                              <span>فيديو</span>
                              <input
                                type="file"
                                accept="video/*"
                                onChange={(e) =>
                                  handleVideoFileUpload(e, setEditVideoUrl)
                                }
                                className="hidden"
                              />
                            </label>
                          </div>

                          <button
                            type="submit"
                            title="حفظ التعديلات"
                            aria-label="حفظ التعديلات"
                            className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold cursor-pointer"
                          >
                            حفظ التعديلات
                          </button>
                        </div>
                      </form>
                    ) : (
                      <>
                        {/* 1. Post Author Header (Facebook-style) */}
                        <div className="p-4 pb-3 flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-10 h-10 rounded-full bg-emerald-600/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-black text-sm flex items-center justify-center shrink-0">
                              {post.associationName.charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1">
                                <h3 className="text-xs sm:text-sm font-black text-[var(--ink)] m-0 truncate">
                                  {post.associationName}
                                </h3>
                                <ShieldCheck
                                  className="w-3.5 h-3.5 text-emerald-600 shrink-0"
                                  aria-label="جمعية معتمدة"
                                />
                              </div>
                              <div className="flex items-center gap-1.5 text-[11px] text-[var(--mute)] mt-0.5">
                                <span>{post.neighborhood}</span>
                                <span aria-hidden="true">·</span>
                                <span className="font-mono tabular-nums">
                                  {formatTime(post.createdAt)}
                                </span>
                              </div>
                            </div>
                          </div>

                          {canManagePost && (
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => startEditingPost(post)}
                                title="تعديل المنشور"
                                aria-label="تعديل المنشور"
                                className="icon-btn p-1.5 rounded-lg text-[var(--mute)] hover:text-emerald-600 hover:bg-emerald-500/10 transition-colors cursor-pointer"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteAssociationPost(post.id)}
                                title="حذف المنشور"
                                aria-label="حذف المنشور"
                                className="icon-btn p-1.5 rounded-lg text-[var(--mute)] hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* 2. Post Title & Text Content */}
                        {(post.title || post.content) && (
                          <div className="px-4 pb-3 space-y-1.5">
                            {post.title && (
                              <div className="space-y-1">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-600/15 text-emerald-600 dark:text-emerald-400 text-[10px] font-extrabold">
                                  <Pencil className="w-2.5 h-2.5 shrink-0" />
                                  تدوينة / مقال
                                </span>
                                <h3 className="text-sm sm:text-base font-black text-[var(--ink)] m-0 leading-snug">
                                  {post.title}
                                </h3>
                              </div>
                            )}
                            {post.content && (
                              <p className="text-xs sm:text-sm text-[var(--ink)]/90 m-0 leading-relaxed whitespace-pre-line">
                                {post.content}
                              </p>
                            )}
                          </div>
                        )}

                        {/* 3. Post Image / Video Media */}
                        {post.imageUrl && (
                          <div className="px-4 pb-3">
                            <div className="rounded-xl overflow-hidden border border-[var(--line)] bg-[var(--bg)] max-h-96 flex items-center justify-center">
                              <img
                                src={post.imageUrl}
                                alt={post.associationName}
                                className="max-h-96 w-full object-cover"
                                loading="lazy"
                              />
                            </div>
                          </div>
                        )}

                        {post.videoUrl && (
                          <div className="px-4 pb-3">
                            {renderPostVideo(post.videoUrl)}
                          </div>
                        )}

                        {/* 4. Likes & Comments Summary Bar */}
                        <div className="px-4 py-2 flex items-center justify-between text-xs text-[var(--mute)] border-t border-[var(--line)]/60">
                          <span className="inline-flex items-center gap-1.5">
                            <span
                              className={`w-5 h-5 rounded-full inline-flex items-center justify-center transition-colors ${
                                post.likedByMe
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-emerald-500/15 text-emerald-600'
                              }`}
                            >
                              <ThumbsUp className="w-3 h-3 fill-current" />
                            </span>
                            <span className="font-mono tabular-nums font-bold text-[var(--ink)]">
                              {post.likesCount || 0}
                            </span>
                            <span>
                              {post.likedByMe ? 'أنت ومعجبون آخرون' : 'إعجاب'}
                            </span>
                          </span>

                          <button
                            type="button"
                            onClick={() =>
                              setOpenCommentsMap((prev) => ({
                                ...prev,
                                [post.id]: !isCommentsOpen,
                              }))
                            }
                            title="عرض أو إخفاء التعليقات"
                            aria-label="عرض أو إخفاء التعليقات"
                            className="hover:underline cursor-pointer font-bold"
                          >
                            {commentsList.length} تعليق
                          </button>
                        </div>

                        {/* 5. Facebook-style Interaction Buttons (أعجبني / تعليق / مراسلة) */}
                        <div className="px-2.5 py-1.5 border-t border-[var(--line)] grid grid-cols-3 gap-1.5">
                          <button
                            type="button"
                            onClick={() => toggleLikePost(post.id)}
                            title={
                              post.likedByMe
                                ? 'إلغاء الإعجاب بالمنشور'
                                : 'أعجبني هذا المنشور'
                            }
                            aria-label="أعجبني"
                            aria-pressed={Boolean(post.likedByMe)}
                            className={`py-2 px-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer transition-all duration-200 border ${
                              post.likedByMe
                                ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                                : 'bg-transparent border-transparent text-[var(--mute)] hover:bg-[var(--bg)] hover:text-[var(--ink)]'
                            }`}
                          >
                            <ThumbsUp
                              className={`w-4 h-4 shrink-0 transition-transform duration-200 ${
                                post.likedByMe ? 'fill-current scale-110' : ''
                              }`}
                            />
                            <span>{post.likedByMe ? 'أعجبني ✓' : 'أعجبني'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setOpenCommentsMap((prev) => ({
                                ...prev,
                                [post.id]: true,
                              }));
                              window.setTimeout(() => {
                                const inputEl = document.getElementById(
                                  `comment-input-${post.id}`
                                );
                                inputEl?.focus();
                              }, 50);
                            }}
                            title="كتابة تعليق على المنشور"
                            aria-label="تعليق على المنشور"
                            className="py-2 px-3 rounded-xl text-xs font-extrabold text-[var(--mute)] hover:bg-[var(--bg)] hover:text-[var(--ink)] flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                          >
                            <MessageSquare className="w-4 h-4 shrink-0" />
                            <span>تعليق ({commentsList.length})</span>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              handleMessageAssociationFromPost(post.associationId)
                            }
                            title={`إرسال رسالة خاصة إلى ${post.associationName}`}
                            aria-label={`مراسلة ${post.associationName}`}
                            className="py-2 px-3 rounded-xl text-xs font-extrabold text-[var(--mute)] hover:bg-[var(--bg)] hover:text-emerald-600 flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                          >
                            <Send className="w-3.5 h-3.5 shrink-0" />
                            <span>مراسلة</span>
                          </button>
                        </div>

                        {/* 6. Interactive Comments Section & Input Field (Always accessible per post) */}
                        {isCommentsOpen && (
                          <div className="p-4 pt-3 bg-[var(--bg)]/50 border-t border-[var(--line)] space-y-3">
                            {/* Existing Comments List */}
                            {commentsList.length > 0 && (
                              <div className="space-y-2">
                                {commentsList.map((cmt) => (
                                  <div
                                    key={cmt.id}
                                    className="flex items-start justify-between gap-2 p-2.5 rounded-xl bg-[var(--card)] border border-[var(--line)]"
                                  >
                                    <div className="flex items-start gap-2 min-w-0">
                                      <div className="w-7 h-7 rounded-full bg-emerald-600/15 text-emerald-600 font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                                        {cmt.authorName.charAt(0)}
                                      </div>
                                      <div className="space-y-0.5 min-w-0">
                                        <div className="flex items-center flex-wrap gap-1.5 text-xs">
                                          <span className="font-extrabold text-[var(--ink)]">
                                            {cmt.authorName}
                                          </span>
                                          {cmt.authorAssociationId && (
                                            <ShieldCheck
                                              className="w-3.5 h-3.5 text-emerald-600 shrink-0"
                                              aria-label="جمعية معتمدة"
                                            />
                                          )}
                                          <span className="text-[10px] text-[var(--mute)] font-mono">
                                            · {formatTime(cmt.createdAt)}
                                          </span>
                                        </div>
                                        <p className="text-xs text-[var(--ink)]/90 m-0 leading-relaxed break-words">
                                          {cmt.text}
                                        </p>
                                      </div>
                                    </div>

                                    {canManagePost && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          deleteCommentFromPost(post.id, cmt.id)
                                        }
                                        title="حذف التعليق"
                                        aria-label="حذف التعليق"
                                        className="text-[var(--mute)] hover:text-rose-500 p-1 cursor-pointer shrink-0"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Write a Comment Text Field */}
                            <form
                              onSubmit={(e) => handleAddCommentSubmit(e, post.id)}
                              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
                            >
                              {!activeAssociation && !isAdminLoggedIn && (
                                <input
                                  type="text"
                                  value={visitorCommentName}
                                  onChange={(e) => setVisitorCommentName(e.target.value)}
                                  placeholder="اسمك (اختياري)"
                                  aria-label="اسم المعلق"
                                  className="sm:w-32 px-3 py-2 rounded-xl bg-[var(--card)] border border-[var(--line)] text-xs text-[var(--ink)] focus:outline-none focus:border-emerald-600"
                                />
                              )}
                              <div className="flex-1 flex items-center gap-1.5">
                                <input
                                  id={`comment-input-${post.id}`}
                                  type="text"
                                  value={commentTextMap[post.id] || ''}
                                  onChange={(e) =>
                                    setCommentTextMap((prev) => ({
                                      ...prev,
                                      [post.id]: e.target.value,
                                    }))
                                  }
                                  placeholder="اكتب تعليقاً على هذا المنشور..."
                                  aria-label="اكتب تعليقاً على هذا المنشور"
                                  className="flex-1 px-3.5 py-2 rounded-xl bg-[var(--card)] border border-[var(--line)] text-xs text-[var(--ink)] focus:outline-none focus:border-emerald-600"
                                />
                                <button
                                  type="submit"
                                  title="نشر التعليق"
                                  aria-label="نشر التعليق"
                                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold inline-flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors"
                                >
                                  <Send className="w-3 h-3 shrink-0" />
                                  <span>تعليق</span>
                                </button>
                              </div>
                            </form>
                          </div>
                        )}
                      </>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
