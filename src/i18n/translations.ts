export type Language = 'ar' | 'en' | 'fr';

export interface Translations {
  // Brand & Meta
  appName: string;
  appRegion: string;
  appTagline: string;
  assistantTitle: string;
  onlineStatus: string;
  languageName: string;
  yourLocation: string;
  detectLocation: string;
  detectingLocation: string;
  changeWilaya: string;
  chooseWilaya: string;
  kmFromInSalah: string;
  gpsActive: string;
  manualLocation: string;
  locationUpdated: string;

  // Sidebar & Navigation
  newChat: string;
  archivedSessions: string;
  noArchivedSessions: string;
  renameSession: string;
  exportSession: string;
  deleteSession: string;
  confirmDeleteSession: string;
  saveName: string;
  messagesCount: string;
  currentActiveSession: string;
  sectionsAndServices: string;
  smartChat: string;
  localNews: string;
  desertSafety: string;
  adminPanel: string;
  quickEmergency: string;
  civilProtection: string;
  gendarmerie: string;
  police: string;
  toggleTheme: string;
  toggleSound: string;
  soundEnabledTooltip: string;
  soundDisabledTooltip: string;
  adminLogin: string;
  adminLogout: string;
  closeMenu: string;

  // Chat View
  heroTitle: string;
  heroSubtitle: string;
  quickPrompts: string[];
  selectAgent: string;
  swarmMode: string;
  allAgentsCooperating: string;
  inputPlaceholder: string;
  send: string;
  stop: string;
  attachImage: string;
  attachPdf: string;
  voiceInput: string;
  listening: string;
  stopListening: string;
  speechNotSupported: string;
  disclaimer: string;
  liveWebSearch: string;
  webSources: string;
  groundingQueries: string;
  multiModelEngines: string;
  deepResearchModeTitle: string;
  deepResearchModeSubtitle: string;
  deepResearchBadge: string;
  directConciseBadge: string;
  expandDetails: string;
  collapseDetails: string;
  treeViewTab: string;
  fullTextTab: string;
  you: string;
  bot: string;

  // Message Actions
  copy: string;
  copied: string;
  listen: string;
  stopAudio: string;
  audioPreparing: string;
  audioPlaying: string;
  like: string;
  dislike: string;
  feedbackGiven: string;
  suggestCorrection: string;
  share: string;
  zoomImage: string;
  downloadPdf: string;

  // Feedback / Rating Drawer
  feedbackTitle: string;
  feedbackHelpfulTitle: string;
  feedbackUnhelpfulTitle: string;
  feedbackNotePlaceholder: string;
  saveFeedback: string;
  feedbackSavedSuccess: string;
  feedbackReasonsLike: { id: string; label: string }[];
  feedbackReasonsDislike: { id: string; label: string }[];

  // Corrections
  correctionPlaceholder: string;
  saveCorrection: string;
  cancelCorrection: string;

  // News View
  newsTitle: string;
  newsSubtitle: string;
  addNewsTitle: string;
  newsSourceLabel: string;
  newsSourcePlaceholder: string;
  newsCategoryLabel: string;
  newsTextLabel: string;
  newsTextPlaceholder: string;
  submitNews: string;
  requireApprovalHint: string;
  pendingApproval: string;
  approvedBadge: string;
  filterAll: string;
  noNewsFound: string;
  categories: Record<string, string>;

  // Desert Safety View
  desertTitle: string;
  desertSubtitle: string;
  registerTripTitle: string;
  destinationLabel: string;
  destinationPlaceholder: string;
  returnTimeLabel: string;
  emergencyPhoneLabel: string;
  emergencyPhonePlaceholder: string;
  startTripTracker: string;
  cancelTripTracker: string;
  activeTripWarningLate: string;
  activeTripRemaining: string;
  sosAlertSmsTemplate: string;
  copySmsText: string;
  copiedSms: string;
  callCivilProt: string;
  callGendarmerie: string;
  callPolice: string;
  survivalChecklistTitle: string;
  checklistItems: string[];
  emergencyMapTitle: string;
  emergencyMapSubtitle: string;

  // Weather View
  weatherForecastTitle: string;
  weatherForecastSubtitle: string;
  currentTemp: string;
  windSpeed: string;
  humidity: string;
  uvIndex: string;
  forecast5Days: string;
  riskLevels: {
    medium: string;
    high: string;
    extreme: string;
  };

  // Admin View
  adminTitle: string;
  adminSubtitle: string;
  adminPinPrompt: string;
  pinPlaceholder: string;
  adminPinError: string;
  enterDashboard: string;
  cancel: string;
  tabWeather: string;
  tabNews: string;
  tabAnalytics: string;
  tabRatings: string;
  tabFixes: string;

  // Ratings Analytics Dashboard
  ratingsTotal: string;
  satisfactionRate: string;
  likesCount: string;
  dislikesCount: string;
  continuousLearningActive: string;
  continuousLearningDesc: string;
  ratingsFeedTitle: string;
  filterAllRatings: string;
  filterLikesOnly: string;
  filterDislikesOnly: string;
  noRatingsYet: string;
  resetRatings: string;
  agentPerformanceTitle: string;
}

export const TRANSLATIONS: Record<Language, Translations> = {
  ar: {
    appName: 'تيديكلت AI',
    appRegion: 'Tidikelt AI',
    appTagline: 'منصة ذكاء اصطناعي مستقلة وشاملة · المطور DARTAGNAN MAHMUOD',
    assistantTitle: 'منصة ذكاء اصطناعي مستقلة',
    onlineStatus: 'متصل',
    languageName: 'العربية',
    yourLocation: 'موقعك الحالي',
    detectLocation: 'تحديد موقعي عبر GPS',
    detectingLocation: 'جاري تحديد موقعك...',
    changeWilaya: 'تغيير الولاية / الموقع',
    chooseWilaya: 'اختر ولايتك الحالية',
    kmFromInSalah: 'كم',
    gpsActive: 'موقع GPS دقيق',
    manualLocation: 'موقع محدد يدوياً',
    locationUpdated: 'تم تحديث موقعك بنجاح',

    newChat: 'محادثة جديدة',
    archivedSessions: 'سجل المحادثات المؤرشفة',
    noArchivedSessions: 'لا توجد محادثات سابقة بعد',
    renameSession: 'تعديل اسم الجلسة',
    exportSession: 'تصدير المحادثة (نص/MD)',
    deleteSession: 'حذف الجلسة',
    confirmDeleteSession: 'هل أنت متأكد من حذف هذه الجلسة نهائياً من السجل؟',
    saveName: 'حفظ الاسم',
    messagesCount: 'رسالة',
    currentActiveSession: 'الجلسة الحالية',
    sectionsAndServices: 'الأقسام والخدمات',
    smartChat: 'المحادثة الذكية',
    localNews: 'المستجدات والأخبار',
    desertSafety: 'السلامة والمسارات',
    adminPanel: 'لوحة تحكم المدير',
    quickEmergency: 'طوارئ النجدة السريعة:',
    civilProtection: 'الحماية 14',
    gendarmerie: 'الدرك 1055',
    police: 'الشرطة 17 / 1548',
    toggleTheme: 'تبديل الوضع الليلي / النهاري',
    toggleSound: 'التنبيهات الصوتية',
    soundEnabledTooltip: 'التنبيهات الصوتية مفعلة (اضغط للكتم)',
    soundDisabledTooltip: 'التنبيهات الصوتية معطلة (اضغط للتفعيل)',
    adminLogin: 'تسجيل دخول المشرف',
    adminLogout: 'لوحة تحكم المدير',
    closeMenu: 'إغلاق القائمة',

    heroTitle: 'كيف لـ تيديكلت AI مساعدتك اليوم',
    heroSubtitle: 'منصة تيديكلت AI المستقلة للذكاء الاصطناعي والبحث المعرفي والبرمجة · تطوير DARTAGNAN MAHMUOD',
    quickPrompts: [
      '🤖 ما هي منصة تيديكلت AI ومن هو مطورها؟',
      '🌐 ما هي آخر الأخبار والتطورات الحية والأحداث لليوم؟',
      '💻 اكتب كود بايثون متكامل لتحليل البيانات مع شرح خطوات التشغيل',
      '🎓 أنجز لي بحثاً علمياً موثقاً حول تقنيات الذكاء الاصطناعي التوليدي وتطبيقاته',
      '⚙️ صمم بنية نظام تقني متطور مع تحليل المتطلبات ونقاط التحقق',
      '📄 كيف يمكنني تحليل مستندات PDF والصور عبر منصة تيديكلت AI؟',
    ],
    selectAgent: 'اختر الوكيل المتخصص',
    swarmMode: 'فريق الوكلاء المتكامل',
    allAgentsCooperating: 'غرفة العمليات المشتركة: تشاور بالتوازي لتقديم أدق إجابة',
    inputPlaceholder: 'اسأل تيديكلت AI، أنجز بحثاً، اطلب كوداً، أو ارفع ملفاً...',
    send: 'إرسال',
    stop: 'إيقاف',
    attachImage: 'إرفاق صورة',
    attachPdf: 'إرفاق مستند PDF',
    voiceInput: 'التحدث الصوتي المباشر',
    listening: 'جاري الاستماع إلى صوتك الآن...',
    stopListening: 'إيقاف الاستماع الصوتي',
    speechNotSupported: 'خاصية التعرف على الصوت غير مدعومة في متصفحك الحالي، يرجى استخدام متصفح Chrome أو Edge.',
    disclaimer: 'تيديكلت Ai يعتمد على الذكاء الاصطناعي والمصادر المحلية الميدانية.',
    liveWebSearch: 'بحث حي عبر الويب',
    webSources: 'المصادر ومواقع الويب الموثقة:',
    groundingQueries: 'استعلامات البحث المعتمدة:',
    multiModelEngines: 'تم التوليف عبر محركات الذكاء الاصطناعي الموحدة',
    deepResearchModeTitle: 'وضع البحث المعمق والشامل مفعّل',
    deepResearchModeSubtitle: 'استقصاء لحظي شامل في الويب وتنظيم النتائج في هيكل شجري مرقم مع تدقيق الحقائق والمصادر',
    deepResearchBadge: 'بحث معمق وهيكل شجري 🎓',
    directConciseBadge: 'إجابة مباشرة وموجزة · خالية من الحشو ⚡',
    expandDetails: 'تفاصيل إضافية وشرح موسع 📖',
    collapseDetails: 'طي التفاصيل 🔼',
    treeViewTab: 'الهيكل الشجري التفاعلي',
    fullTextTab: 'القراءة النصية الكاملة',
    you: 'أنت',
    bot: 'AI Studio Hub',

    copy: 'نسخ',
    copied: 'تم النسخ!',
    listen: 'استماع',
    stopAudio: 'إيقاف',
    audioPreparing: 'جاري تحضير الصوت...',
    audioPlaying: 'المساعد الصوتي يتحدث الآن',
    like: 'أعجبني',
    dislike: 'لم يعجبني',
    feedbackGiven: 'تم التقييم',
    suggestCorrection: 'تصحيح معلومة',
    share: 'مشاركة',
    zoomImage: 'اضغط لتكبير الصورة',
    downloadPdf: 'تحميل المستند',

    feedbackTitle: 'تقييم جودة الرد',
    feedbackHelpfulTitle: 'ما الذي أعجبك في هذا الرد؟',
    feedbackUnhelpfulTitle: 'ما المشكلة في هذا الرد؟',
    feedbackNotePlaceholder: 'ملاحظة إضافية لتحسين الجودة مستقبلاً (اختياري)...',
    saveFeedback: 'حفظ التقييم في قاعدة البيانات',
    feedbackSavedSuccess: 'شكراً لتقييمك! تم حفظه في قاعدة البيانات لتحسين جودة المساعد مستقبلاً ✨',
    feedbackReasonsLike: [
      { id: 'accurate', label: 'معلومات دقيقة وشاملة' },
      { id: 'fast_helpful', label: 'سريع ومفيد جداً' },
      { id: 'good_format', label: 'تنسيق ممتاز وجداول واضحة' },
      { id: 'clear_explanation', label: 'شرح مبسط وواضح' },
    ],
    feedbackReasonsDislike: [
      { id: 'inaccurate', label: 'معلومة غير دقيقة أو قديمة' },
      { id: 'incomplete', label: 'إجابة ناقصة أو مقتضبة' },
      { id: 'unclear', label: 'غير واضحة أو مشوشة' },
      { id: 'formatting_error', label: 'خطأ برمجي أو تنسيق سيء' },
    ],

    correctionPlaceholder: 'اكتب المعلومة الصحيحة بدقة ليتعلم منها المساعد مستقبلاً...',
    saveCorrection: 'حفظ التصحيح',
    cancelCorrection: 'إلغاء',

    newsTitle: 'مستجدات وأخبار تديكلت',
    newsSubtitle: 'أخبار ومعلومات موثقة من سكان ومصالح إقليم عين صالح',
    addNewsTitle: 'إضافة معلومة أو خبر محلي جديد',
    newsSourceLabel: 'المصدر:',
    newsSourcePlaceholder: 'مثال: بلدية عين صالح، الدرك الوطني، مواطن...',
    newsCategoryLabel: 'التصنيف:',
    newsTextLabel: 'نص المعلومة أو الخبر:',
    newsTextPlaceholder: 'اكتب الخبر هنا بوضوح مع ذكر المكان أو التفاصيل...',
    submitNews: 'نشر المعلومة',
    requireApprovalHint: 'تخضع الأخبار لمراجعة الإدارة لضمان الدقة والمصداقية.',
    pendingApproval: 'قيد المراجعة والاعتماد',
    approvedBadge: 'معتمد وموثق',
    filterAll: 'كافة التصنيفات',
    noNewsFound: 'لا توجد أخبار في هذا التصنيف حالياً.',
    categories: {
      roads: 'طرق ونقل',
      health: 'صحة واستعجالات',
      services: 'خدمات وإدارة',
      education: 'تعليم وجامعة',
      weather: 'طقس وبيئة',
      market: 'أسواق وتمور',
      heritage: 'تراث وثقافة',
      sports: 'رياضة',
      tech: 'تقنية وابتكار',
      general: 'عام ومجتمع',
    },

    desertTitle: 'سلامة ومسار الصحراء',
    desertSubtitle: 'دليل النجاة، متابعة الرحلات، وخريطة الطوارئ لإقليم عين صالح',
    registerTripTitle: 'تسجيل رحلة صحراوية آمنة',
    destinationLabel: 'الوجهة أو المسار الصحراوي:',
    destinationPlaceholder: 'مثال: عين صالح نحو تمنراست، أدرار، العرق الغربي...',
    returnTimeLabel: 'تاريخ ووقت الرجوع المتوقع:',
    emergencyPhoneLabel: 'رقم هاتف المرافق أو الطوارئ:',
    emergencyPhonePlaceholder: '06XX XX XX XX',
    startTripTracker: 'تفعيل متابعة الرحلة',
    cancelTripTracker: 'إنهاء أو إلغاء الرحلة',
    activeTripWarningLate: 'تأخرت عن موعد الرجوع المحدد!',
    activeTripRemaining: 'باقي على موعد الرجوع المتوقع:',
    sosAlertSmsTemplate: 'تنبيه طوارئ: لم يتم تأكيد الرجوع من الرحلة. يرجى الاتصال بي فوراً أو إبلاغ الحماية المدنية 14 أو الدرك 1055.',
    copySmsText: 'نسخ نص رسالة الطوارئ (SOS SMS)',
    copiedSms: 'تم نسخ رسالة الطوارئ!',
    callCivilProt: 'اتصال بالحماية المدنية 14',
    callGendarmerie: 'اتصال بالدرك 1055',
    callPolice: 'اتصال بالشرطة 17',
    survivalChecklistTitle: 'حقيبة السلامة الصحراوية الأساسية',
    checklistItems: [
      'اصطحاب 5 لتر ماء على الأقل لكل شخص يومياً في أوعية محكمة.',
      'فحص إطار الاحتياط (السبيكور) ومضخة الهواء ورافعة السيارة (الكريك).',
      'حفظ مسارات GPS بدون إنترنت وعدم مغادرة المسار الرئيسي المعتمد.',
      'في حال التعطل بالرمل: ابق قرب سيارتك تماماً ولا تمشِ في الهجيرة.',
      'تجهيز أدوات الإسعاف الأولي ومصل/مضاد لدغات العقارب والأفاعي.',
    ],
    emergencyMapTitle: 'خريطة مراكز الطوارئ والإنقاذ',
    emergencyMapSubtitle: 'الوحدات الرئيسية للحماية المدنية، المستشفيات والعيادات بعين صالح',

    weatherForecastTitle: 'توقعات الطقس ورياح الصحراء',
    weatherForecastSubtitle: 'رصد درجات الحرارة ومؤشرات الزوابع الرملية لـ 5 أيام قادمة',
    currentTemp: 'درجة الحرارة الحالية',
    windSpeed: 'سرعة الرياح',
    humidity: 'الرطوبة',
    uvIndex: 'مؤشر الأشعة فوق البنفسجية',
    forecast5Days: 'توقعات 5 أيام',
    riskLevels: {
      medium: 'متوسط',
      high: 'مرتفع',
      extreme: 'أقصى درجات الحذر',
    },

    adminTitle: 'بوابة المالك الحصرية',
    adminSubtitle: 'خاص بالمالك الفعلي للتطبيق فقط (إدارة التنبيهات، الأخبار، الإحصائيات ومختبر الذكاء)',
    adminPinPrompt: 'الرقم السري للمالك:',
    pinPlaceholder: '••••••',
    adminPinError: 'الرقم السري غير صحيح!',
    enterDashboard: 'دخول واجهة المالك',
    cancel: 'إلغاء',
    tabWeather: 'التنبيهات الجوية',
    tabNews: 'مراجعة الأخبار',
    tabAnalytics: 'إحصائيات 30 يوماً',
    tabRatings: 'تقييمات الردود (👍/👎)',
    tabFixes: 'تصحيحات السكان',

    ratingsTotal: 'إجمالي التقييمات',
    satisfactionRate: 'نسبة الرضا',
    likesCount: 'أعجبني 👍',
    dislikesCount: 'لم يعجبني 👎',
    continuousLearningActive: 'نظام التعلم المستمر من التقييمات مفعّل',
    continuousLearningDesc: 'تُحقن التقييمات الإيجابية وتنبيهات الأخطاء تلقائياً في موجه النظام لتحسين جودة الإجابات المستقبلية.',
    ratingsFeedTitle: 'سجل التقييمات المباشر من المستخدمين',
    filterAllRatings: 'الكل',
    filterLikesOnly: 'الإيجابية (👍)',
    filterDislikesOnly: 'السلبية (👎)',
    noRatingsYet: 'لا توجد تقييمات مسجلة حتى الآن.',
    resetRatings: 'إعادة ضبط التقييمات الافتراضية',
    agentPerformanceTitle: 'معدل رضا المستخدمين حسب الوكلاء',
  },

  en: {
    appName: 'تيديكلت AI',
    appRegion: 'Tidikelt AI',
    appTagline: 'Independent AI Platform · Developed by DARTAGNAN MAHMUOD',
    assistantTitle: 'Independent AI Platform',
    onlineStatus: 'Online',
    languageName: 'English',
    yourLocation: 'Your Location',
    detectLocation: 'Detect Location via GPS',
    detectingLocation: 'Detecting location...',
    changeWilaya: 'Change Wilaya / Region',
    chooseWilaya: 'Select your current wilaya',
    kmFromInSalah: 'km',
    gpsActive: 'Live GPS Location',
    manualLocation: 'Manually selected',
    locationUpdated: 'Location updated successfully',

    newChat: 'New Chat',
    archivedSessions: 'Archived Conversations',
    noArchivedSessions: 'No archived chats yet',
    renameSession: 'Rename Session',
    exportSession: 'Export Chat (Text/MD)',
    deleteSession: 'Delete Session',
    confirmDeleteSession: 'Are you sure you want to permanently delete this chat session?',
    saveName: 'Save',
    messagesCount: 'messages',
    currentActiveSession: 'Active session',
    sectionsAndServices: 'Sections & Services',
    smartChat: 'Smart Chat',
    localNews: 'News & Updates',
    desertSafety: 'Safety & Routes',
    adminPanel: 'Admin Panel',
    quickEmergency: 'Quick Emergency Hotlines:',
    civilProtection: 'Civil Prot. 14',
    gendarmerie: 'Gendarmerie 1055',
    police: 'Police 17 / 1548',
    toggleTheme: 'Toggle Dark / Light Mode',
    toggleSound: 'Audio Chimes',
    soundEnabledTooltip: 'Sound alerts enabled (click to mute)',
    soundDisabledTooltip: 'Sound alerts muted (click to enable)',
    adminLogin: 'Admin Login',
    adminLogout: 'Supervisor Dashboard',
    closeMenu: 'Close menu',

    heroTitle: 'How can Tidikelt AI help you today?',
    heroSubtitle: 'Tidikelt AI Independent Platform for Smart Chat, RAG & Coding · Developed by DARTAGNAN MAHMUOD',
    quickPrompts: [
      '🤖 What is Tidikelt AI and who is its developer?',
      '🌐 What are today\'s latest live news, updates, and developments?',
      '💻 Write a Python script for data analysis with execution steps',
      '🎓 Prepare an in-depth academic research paper on generative AI with verified sources',
      '⚙️ Architect a scalable software system with requirements analysis and checkpoints',
    ],
    selectAgent: 'Select Specialized Agent',
    swarmMode: 'Integrated Agent Swarm',
    allAgentsCooperating: 'Joint Operations Room: Agents consult in parallel for the best answer',
    inputPlaceholder: 'Ask Tidikelt AI, request research, generate code, or upload files...',
    send: 'Send',
    stop: 'Stop',
    attachImage: 'Attach Image',
    attachPdf: 'Attach PDF document',
    voiceInput: 'Voice Input',
    listening: 'Listening to your voice...',
    stopListening: 'Stop Voice Input',
    speechNotSupported: 'Speech recognition is not supported in this browser. Please use Google Chrome or Microsoft Edge.',
    disclaimer: 'Tidikelt AI is powered by multi-engine AI and local verified sources.',
    liveWebSearch: 'Live Web Search',
    webSources: 'Verified Web Sources:',
    groundingQueries: 'Search queries used:',
    multiModelEngines: 'Synthesized via Unified AI Engines',
    deepResearchModeTitle: 'Deep Research Mode Active',
    deepResearchModeSubtitle: 'Real-time comprehensive web research structured into interactive numbered tree hierarchy with verified citations',
    deepResearchBadge: 'Deep Research 🎓',
    directConciseBadge: 'Direct & Concise · Zero Fluff ⚡',
    expandDetails: 'Additional Expanded Details 📖',
    collapseDetails: 'Collapse Details 🔼',
    treeViewTab: 'Interactive Tree View',
    fullTextTab: 'Full Text Reading',
    you: 'You',
    bot: 'AI Studio Hub',

    copy: 'Copy',
    copied: 'Copied!',
    listen: 'Listen',
    stopAudio: 'Stop',
    audioPreparing: 'Preparing voice audio...',
    audioPlaying: 'Voice assistant is speaking',
    like: 'Helpful',
    dislike: 'Not helpful',
    feedbackGiven: 'Rated',
    suggestCorrection: 'Suggest Correction',
    share: 'Share',
    zoomImage: 'Click to enlarge image',
    downloadPdf: 'Download document',

    feedbackTitle: 'Rate Response Quality',
    feedbackHelpfulTitle: 'What did you like about this answer?',
    feedbackUnhelpfulTitle: 'What went wrong with this answer?',
    feedbackNotePlaceholder: 'Additional feedback to improve future responses (optional)...',
    saveFeedback: 'Save Feedback to Database',
    feedbackSavedSuccess: 'Thank you! Your feedback has been saved to improve future answers ✨',
    feedbackReasonsLike: [
      { id: 'accurate', label: 'Accurate & comprehensive information' },
      { id: 'fast_helpful', label: 'Fast & very helpful' },
      { id: 'good_format', label: 'Great formatting & clear tables' },
      { id: 'clear_explanation', label: 'Simple, concise explanation' },
    ],
    feedbackReasonsDislike: [
      { id: 'inaccurate', label: 'Inaccurate or outdated information' },
      { id: 'incomplete', label: 'Incomplete or too brief' },
      { id: 'unclear', label: 'Unclear or confusing' },
      { id: 'formatting_error', label: 'Code error or bad formatting' },
    ],

    correctionPlaceholder: 'Provide the verified accurate information for AI future training...',
    saveCorrection: 'Save Correction',
    cancelCorrection: 'Cancel',

    newsTitle: 'Tidikelt Local News & Bulletins',
    newsSubtitle: 'Verified community updates from citizens and authorities of In Salah',
    addNewsTitle: 'Submit a New Local Bulletin',
    newsSourceLabel: 'Source:',
    newsSourcePlaceholder: 'e.g., In Salah Municipality, Gendarmerie, Citizen...',
    newsCategoryLabel: 'Category:',
    newsTextLabel: 'Bulletin Content:',
    newsTextPlaceholder: 'Write the announcement clearly with locations and dates...',
    submitNews: 'Publish Bulletin',
    requireApprovalHint: 'Submissions are reviewed by administrators to ensure accuracy.',
    pendingApproval: 'Pending Review & Approval',
    approvedBadge: 'Verified & Approved',
    filterAll: 'All Categories',
    noNewsFound: 'No bulletins found in this category.',
    categories: {
      roads: 'Roads & Transport',
      health: 'Health & Emergencies',
      services: 'Services & Administration',
      education: 'Education & University',
      weather: 'Weather & Climate',
      market: 'Markets & Dates',
      heritage: 'Heritage & Culture',
      sports: 'Sports',
      tech: 'Tech & Innovation',
      general: 'General & Community',
    },

    desertTitle: 'Desert Safety & Routes',
    desertSubtitle: 'Survival guide, journey tracker, and emergency map for In Salah region',
    registerTripTitle: 'Register a Safe Desert Journey',
    destinationLabel: 'Destination or Route:',
    destinationPlaceholder: 'e.g., In Salah to Tamanrasset, Adrar, Grand Erg...',
    returnTimeLabel: 'Expected Return Date & Time:',
    emergencyPhoneLabel: 'Emergency Contact Phone:',
    emergencyPhonePlaceholder: '+213 6XX XX XX XX',
    startTripTracker: 'Activate Journey Tracker',
    cancelTripTracker: 'End or Cancel Journey',
    activeTripWarningLate: 'You are overdue from your scheduled return time!',
    activeTripRemaining: 'Time remaining until scheduled return:',
    sosAlertSmsTemplate: 'EMERGENCY ALERT: Scheduled desert trip return deadline exceeded. Please call me or alert Civil Protection 14 / Gendarmerie 1055.',
    copySmsText: 'Copy SOS SMS Emergency Message',
    copiedSms: 'Emergency text copied!',
    callCivilProt: 'Call Civil Protection 14',
    callGendarmerie: 'Call Gendarmerie 1055',
    callPolice: 'Call Police 17',
    survivalChecklistTitle: 'Essential Desert Survival Checklist',
    checklistItems: [
      'Carry at least 5 liters of drinking water per person per day in sealed containers.',
      'Check the spare tire, tire pressure pump, and mechanical jack before leaving.',
      'Download offline GPS maps and stay on authorized paved or marked routes.',
      'If stranded in sand: STAY with your vehicle; never wander in midday heat.',
      'Pack a first-aid kit and anti-venom for desert scorpion and snake bites.',
    ],
    emergencyMapTitle: 'Emergency Rescue & Healthcare Map',
    emergencyMapSubtitle: 'Main Civil Protection units, regional hospitals, and clinics in In Salah',

    weatherForecastTitle: 'Weather & Desert Wind Forecast',
    weatherForecastSubtitle: 'Temperature monitoring and sandstorm risk index for the next 5 days',
    currentTemp: 'Current Temperature',
    windSpeed: 'Wind Speed',
    humidity: 'Humidity',
    uvIndex: 'UV Index',
    forecast5Days: '5-Day Forecast',
    riskLevels: {
      medium: 'Moderate',
      high: 'High',
      extreme: 'Extreme Caution Required',
    },

    adminTitle: 'Exclusive Owner Portal',
    adminSubtitle: 'Restricted strictly to the application owner',
    adminPinPrompt: 'Owner Secret PIN:',
    pinPlaceholder: '••••••',
    adminPinError: 'Incorrect Owner PIN!',
    enterDashboard: 'Enter Owner Dashboard',
    cancel: 'Cancel',
    tabWeather: 'Weather Alerts',
    tabNews: 'News Moderation',
    tabAnalytics: '30-Day Analytics',
    tabRatings: 'Response Ratings (👍/👎)',
    tabFixes: 'Community Corrections',

    ratingsTotal: 'Total Ratings',
    satisfactionRate: 'Satisfaction Rate',
    likesCount: 'Likes 👍',
    dislikesCount: 'Dislikes 👎',
    continuousLearningActive: 'Continuous Learning Feedback System Active',
    continuousLearningDesc: 'Positive ratings and user corrections are injected into system prompts to train and refine future answers.',
    ratingsFeedTitle: 'Live User Ratings & Feedback Feed',
    filterAllRatings: 'All',
    filterLikesOnly: 'Helpful (👍)',
    filterDislikesOnly: 'Not helpful (👎)',
    noRatingsYet: 'No ratings recorded yet.',
    resetRatings: 'Reset to Seed Ratings',
    agentPerformanceTitle: 'Agent Satisfaction Breakdown',
  },

  fr: {
    appName: 'تيديكلت AI',
    appRegion: 'Tidikelt AI',
    appTagline: 'Plateforme IA Indépendante · Développée par DARTAGNAN MAHMUOD',
    assistantTitle: 'Plateforme IA Indépendante',
    onlineStatus: 'En ligne',
    languageName: 'Français',
    yourLocation: 'Votre position',
    detectLocation: 'Détecter ma position GPS',
    detectingLocation: 'Détection en cours...',
    changeWilaya: 'Changer la wilaya / région',
    chooseWilaya: 'Sélectionnez votre wilaya actuelle',
    kmFromInSalah: 'km',
    gpsActive: 'Position GPS précise',
    manualLocation: 'Sélection manuelle',
    locationUpdated: 'Position mise à jour avec succès',

    newChat: 'Nouvelle discussion',
    archivedSessions: 'Conversations Archivées',
    noArchivedSessions: 'Aucune discussion archivée pour le moment',
    renameSession: 'Renommer la session',
    exportSession: 'Exporter la discussion (Texte/MD)',
    deleteSession: 'Supprimer la session',
    confirmDeleteSession: 'Voulez-vous vraiment supprimer définitivement cette session ?',
    saveName: 'Enregistrer',
    messagesCount: 'messages',
    currentActiveSession: 'Session active',
    sectionsAndServices: 'Sections & Services',
    smartChat: 'Discussion IA',
    localNews: 'Actualités',
    desertSafety: 'Sécurité & Routes',
    adminPanel: "Panneau d'administration",
    quickEmergency: "Numéros d'urgence :",
    civilProtection: 'Protection Civile 14',
    gendarmerie: 'Gendarmerie 1055',
    police: 'Police 17 / 1548',
    toggleTheme: 'Basculer mode Sombre / Clair',
    toggleSound: 'Alertes Sonores',
    soundEnabledTooltip: 'Alertes sonores activées (cliquer pour couper)',
    soundDisabledTooltip: 'Alertes sonores coupées (cliquer pour activer)',
    adminLogin: 'Connexion Superviseur',
    adminLogout: "Tableau d'administration",
    closeMenu: 'Fermer le menu',

    heroTitle: "Comment Tidikelt AI peut-il vous aider aujourd'hui ?",
    heroSubtitle: 'Plateforme IA indépendante Tidikelt AI · Développée par DARTAGNAN MAHMUOD',
    quickPrompts: [
      '🤖 Qu\'est-ce que la plateforme Tidikelt AI et qui est son développeur ?',
      '🌐 Quelles sont les dernières actualités et nouvelles en direct d\'aujourd\'hui ?',
      '💻 Écrivez un script Python pour l\'analyse de données avec explication',
      '🎓 Préparez une étude approfondie sur l\'intelligence artificielle avec sources',
      '⚙️ Concevoir une architecture logicielle complète avec analyse des exigences',
    ],
    selectAgent: 'Choisir un agent spécialisé',
    swarmMode: "Essaim d'agents intégrés",
    allAgentsCooperating: 'Salle des opérations : Tous les agents collaborent en parallèle pour la meilleure réponse',
    inputPlaceholder: 'Posez une question à Tidikelt AI, demandez une recherche ou générez du code...',
    send: 'Envoyer',
    stop: 'Arrêter',
    attachImage: 'Joindre une image',
    attachPdf: 'Joindre un document PDF',
    voiceInput: 'Saisie vocale directe',
    listening: 'Écoute de votre voix en cours...',
    stopListening: "Arrêter l'écoute vocale",
    speechNotSupported: 'La reconnaissance vocale n\'est pas prise en charge sur ce navigateur. Veuillez utiliser Chrome ou Edge.',
    disclaimer: "Tidikelt IA est alimenté par des modèles d'IA avancés et des sources locales vérifiées.",
    liveWebSearch: 'Recherche Web en direct',
    webSources: 'Sources web vérifiées :',
    groundingQueries: 'Requêtes de recherche utilisées :',
    multiModelEngines: "Synthèse effectuée via les moteurs d'IA unifiés",
    deepResearchModeTitle: 'Mode Recherche Approfondie Actif',
    deepResearchModeSubtitle: 'Recherche Web en temps réel structurée en arborescence hiérarchique interactive avec sources vérifiées',
    deepResearchBadge: 'Recherche Approfondie 🎓',
    directConciseBadge: 'Réponse directe & concise · Sans fioritures ⚡',
    expandDetails: 'Détails et explications complémentaires 📖',
    collapseDetails: 'Replier les détails 🔼',
    treeViewTab: 'Arborescence Interactive',
    fullTextTab: 'Lecture du Texte Intégral',
    you: 'Vous',
    bot: 'AI Studio Hub',

    copy: 'Copier',
    copied: 'Copié !',
    listen: 'Écouter',
    stopAudio: 'Arrêter',
    audioPreparing: 'Génération de la voix...',
    audioPlaying: "L'assistant vocal parle en ce moment",
    like: 'Utile',
    dislike: 'Pas utile',
    feedbackGiven: 'Évalué',
    suggestCorrection: 'Proposer une correction',
    share: 'Partager',
    zoomImage: "Cliquer pour agrandir l'image",
    downloadPdf: 'Télécharger le document',

    feedbackTitle: 'Évaluer la qualité de la réponse',
    feedbackHelpfulTitle: "Qu'avez-vous apprécié dans cette réponse ?",
    feedbackUnhelpfulTitle: 'Quel est le problème avec cette réponse ?',
    feedbackNotePlaceholder: 'Remarque additionnelle pour améliorer les futures réponses (facultatif)...',
    saveFeedback: "Enregistrer l'évaluation dans la base",
    feedbackSavedSuccess: 'Merci pour votre retour ! Enregistré dans la base pour perfectionner les futures réponses ✨',
    feedbackReasonsLike: [
      { id: 'accurate', label: 'Informations précises et complètes' },
      { id: 'fast_helpful', label: 'Rapide et très utile' },
      { id: 'good_format', label: 'Mise en page soignée & tableaux clairs' },
      { id: 'clear_explanation', label: 'Explication simple et claire' },
    ],
    feedbackReasonsDislike: [
      { id: 'inaccurate', label: 'Information inexacte ou obsolète' },
      { id: 'incomplete', label: 'Réponse incomplète ou trop brève' },
      { id: 'unclear', label: 'Floue ou difficile à comprendre' },
      { id: 'formatting_error', label: 'Erreur de code ou mauvaise mise en page' },
    ],

    correctionPlaceholder: 'Indiquez la correction exacte pour guider les prochaines réponses de l\'IA...',
    saveCorrection: 'Enregistrer la correction',
    cancelCorrection: 'Annuler',

    newsTitle: 'Actualités & Avis de Tidikelt',
    newsSubtitle: "Informations vérifiées transmises par les habitants et services d'In Salah",
    addNewsTitle: 'Publier une nouvelle annonce locale',
    newsSourceLabel: 'Source :',
    newsSourcePlaceholder: "ex. : Mairie d'In Salah, Gendarmerie, Citoyen...",
    newsCategoryLabel: 'Catégorie :',
    newsTextLabel: "Texte de l'annonce :",
    newsTextPlaceholder: "Rédigez l'information clairement en précisant les lieux et dates...",
    submitNews: "Publier l'annonce",
    requireApprovalHint: "Les annonces sont examinées par l'administration pour garantir leur exactitude.",
    pendingApproval: 'En attente de validation',
    approvedBadge: 'Vérifié & Approuvé',
    filterAll: 'Toutes les catégories',
    noNewsFound: 'Aucune actualité trouvée dans cette catégorie.',
    categories: {
      roads: 'Routes & Transport',
      health: 'Santé & Urgences',
      services: 'Services & Administration',
      education: 'Éducation & Université',
      weather: 'Météo & Climat',
      market: 'Marchés & Dattes',
      heritage: 'Patrimoine & Culture',
      sports: 'Sport',
      tech: 'Tech & Innovation',
      general: 'Général & Société',
    },

    desertTitle: 'Sécurité & Pistes du Désert',
    desertSubtitle: "Guide de survie, suivi de trajet et carte d'urgence pour la région d'In Salah",
    registerTripTitle: 'Enregistrer un trajet sécurisé dans le désert',
    destinationLabel: 'Destination ou itinéraire :',
    destinationPlaceholder: 'ex. : In Salah vers Tamanrasset, Adrar, Grand Erg...',
    returnTimeLabel: 'Date et heure de retour prévues :',
    emergencyPhoneLabel: "Téléphone de contact d'urgence :",
    emergencyPhonePlaceholder: '+213 6XX XX XX XX',
    startTripTracker: 'Activer le suivi de voyage',
    cancelTripTracker: 'Terminer ou annuler le voyage',
    activeTripWarningLate: 'Vous avez dépassé votre heure de retour prévue !',
    activeTripRemaining: 'Temps restant avant l\'heure de retour prévue :',
    sosAlertSmsTemplate: 'ALERTE URGENCE : L\'heure limite de retour du trajet dans le désert a été dépassée. Contactez-moi immédiatement ou alertez la Protection Civile 14 / Gendarmerie 1055.',
    copySmsText: "Copier le message d'urgence (SMS SOS)",
    copiedSms: 'Message d\'urgence copié !',
    callCivilProt: 'Appeler la Protection Civile 14',
    callGendarmerie: 'Appeler la Gendarmerie 1055',
    callPolice: 'Appeler la Police 17',
    survivalChecklistTitle: 'Check-list essentielle de survie dans le désert',
    checklistItems: [
      'Emporter au moins 5 litres d\'eau potable par personne et par jour dans des bidons scellés.',
      'Vérifier la roue de secours, la pompe à air et le cric mécanique avant le départ.',
      'Télécharger les cartes GPS hors-ligne et ne pas s\'éloigner des axes balisés.',
      'En cas d\'ensablement ou de panne : RESTEZ près de votre véhicule, ne marchez jamais en plein soleil.',
      'Prévoir une trousse de secours avec sérum/antivenin pour les piqûres de scorpion et morsures.',
    ],
    emergencyMapTitle: 'Carte des centres de secours et soins',
    emergencyMapSubtitle: 'Unités de la Protection Civile, hôpitaux et cliniques à In Salah',

    weatherForecastTitle: 'Météo & Vents du Désert',
    weatherForecastSubtitle: 'Surveillance des températures et risque de tempêtes de sable pour les 5 prochains jours',
    currentTemp: 'Température actuelle',
    windSpeed: 'Vitesse du vent',
    humidity: 'Humidité',
    uvIndex: 'Indice UV',
    forecast5Days: 'Prévisions 5 jours',
    riskLevels: {
      medium: 'Modéré',
      high: 'Élevé',
      extreme: 'Vigilance extrême requise',
    },

    adminTitle: 'Portail Exclusif du Propriétaire',
    adminSubtitle: 'Accès strictement réservé au propriétaire de l\'application',
    adminPinPrompt: 'Code secret du propriétaire :',
    pinPlaceholder: '••••••',
    adminPinError: 'Code secret incorrect !',
    enterDashboard: 'Accéder au portail',
    cancel: 'Annuler',
    tabWeather: 'Alertes Météo',
    tabNews: 'Modération des avis',
    tabAnalytics: 'Analyses 30 jours',
    tabRatings: 'Évaluations (👍/👎)',
    tabFixes: 'Corrections des usagers',

    ratingsTotal: 'Total des évaluations',
    satisfactionRate: 'Taux de satisfaction',
    likesCount: 'Mentions J\'aime 👍',
    dislikesCount: 'Mentions Je n\'aime pas 👎',
    continuousLearningActive: 'Système d\'apprentissage continu par retours actif',
    continuousLearningDesc: 'Les avis positifs et corrections sont injectés dans les prompts pour perfectionner les futures réponses.',
    ratingsFeedTitle: 'Flux en direct des avis des utilisateurs',
    filterAllRatings: 'Tous',
    filterLikesOnly: 'Utiles (👍)',
    filterDislikesOnly: 'Non utiles (👎)',
    noRatingsYet: 'Aucune évaluation enregistrée pour le moment.',
    resetRatings: 'Réinitialiser aux avis de test',
    agentPerformanceTitle: 'Taux de satisfaction par agent',
  },
};

export interface LocalizedAgent {
  id: string;
  name: string;
  emoji: string;
  avatarUrl?: string;
  desc: string;
  prompt: string;
}

export const DEFAULT_AGENT_AVATARS: Record<string, string> = {
  swarm: '/icon.svg',
  research: `data:image/svg+xml;utf8,${encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#3b82f6"/><stop offset="100%" stop-color="#1d4ed8"/></linearGradient></defs><rect width="80" height="80" rx="22" fill="url(#g)"/><path d="M40 20L14 32l26 12 21-9.7V50h5V32L40 20z" fill="#fef08a"/><path d="M24 40v11c0 5 7 9 16 9s16-4 16-9V40L40 47.5 24 40z" fill="#dbeafe"/></svg>'
  )}`,
  guide: `data:image/svg+xml;utf8,${encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#0d9488"/><stop offset="100%" stop-color="#115e59"/></linearGradient></defs><rect width="80" height="80" rx="22" fill="url(#g)"/><circle cx="40" cy="40" r="22" fill="#f0fdfa" opacity="0.15"/><circle cx="40" cy="40" r="19" fill="none" stroke="#99f6e4" stroke-width="2.5"/><polygon points="40,23 46,40 40,36 34,40" fill="#fbbf24"/><polygon points="40,57 46,40 40,44 34,40" fill="#e2e8f0"/></svg>'
  )}`,
  desert: `data:image/svg+xml;utf8,${encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#d97706"/><stop offset="100%" stop-color="#92400e"/></linearGradient></defs><rect width="80" height="80" rx="22" fill="url(#g)"/><circle cx="52" cy="26" r="9" fill="#fef08a"/><path d="M12 58Q28 38 46 52T68 48L68 64L12 64Z" fill="#fde68a"/><path d="M24 64Q44 44 68 56L68 64Z" fill="#f59e0b"/></svg>'
  )}`,
  doctor: `data:image/svg+xml;utf8,${encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#e11d48"/><stop offset="100%" stop-color="#9f1239"/></linearGradient></defs><rect width="80" height="80" rx="22" fill="url(#g)"/><rect x="34" y="20" width="12" height="40" rx="4" fill="#fff"/><rect x="20" y="34" width="40" height="12" rx="4" fill="#fff"/><path d="M18 40h12l4-8 6 16 4-8h18" fill="none" stroke="#fecdd3" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  )}`,
  market: `data:image/svg+xml;utf8,${encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#ea580c"/><stop offset="100%" stop-color="#9a3412"/></linearGradient></defs><rect width="80" height="80" rx="22" fill="url(#g)"/><path d="M22 30h38l-4 22H26L22 30z" fill="#ffedd5"/><circle cx="30" cy="58" r="4" fill="#fed7aa"/><circle cx="50" cy="58" r="4" fill="#fed7aa"/><path d="M16 24h6l4 28h28" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/></svg>'
  )}`,
  check: `data:image/svg+xml;utf8,${encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#10b981"/><stop offset="100%" stop-color="#047857"/></linearGradient></defs><rect width="80" height="80" rx="22" fill="url(#g)"/><path d="M40 16l20 8v14c0 13-8.5 22-20 26-11.5-4-20-13-20-26V24l20-8z" fill="#d1fae5" opacity="0.22"/><path d="M29 41l7 7 16-16" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  )}`,
  news: `data:image/svg+xml;utf8,${encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#0284c7"/><stop offset="100%" stop-color="#0369a1"/></linearGradient></defs><rect width="80" height="80" rx="22" fill="url(#g)"/><rect x="20" y="20" width="40" height="40" rx="6" fill="#e0f2fe"/><rect x="26" y="27" width="16" height="10" rx="2" fill="#0284c7"/><line x1="26" y1="43" x2="54" y2="43" stroke="#0369a1" stroke-width="3" stroke-linecap="round"/><line x1="26" y1="51" x2="46" y2="51" stroke="#0369a1" stroke-width="3" stroke-linecap="round"/></svg>'
  )}`,
  fix: `data:image/svg+xml;utf8,${encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#7c3aed"/><stop offset="100%" stop-color="#5b21b6"/></linearGradient></defs><rect width="80" height="80" rx="22" fill="url(#g)"/><path d="M50 20l10 10-26 26-12 2 2-12 26-26z" fill="#ede9fe" stroke="#fff" stroke-width="2" stroke-linejoin="round"/><line x1="44" y1="26" x2="54" y2="36" stroke="#7c3aed" stroke-width="2.5"/></svg>'
  )}`,
};

export const LOCALIZED_AGENTS: Record<Language, LocalizedAgent[]> = {
  ar: [
    {
      id: 'swarm',
      name: 'فريق الوكلاء المتكامل',
      emoji: '⚡',
      avatarUrl: DEFAULT_AGENT_AVATARS.swarm,
      desc: 'غرفة العمليات المشتركة: يتشاور كافة الوكلاء معاً بالتوازي لتقديم أسرع وأشمل جواب متكامل للسكان.',
      prompt: 'فريق العمل الجماعي المنسق بين كافة وكلاء عين صالح.',
    },
    {
      id: 'research',
      name: 'الباحث الأكاديمي (بحث معمق)',
      emoji: '🎓',
      avatarUrl: DEFAULT_AGENT_AVATARS.research,
      desc: 'مساعد بحثي متقدم: إجراء بحث شامل ومستمر عبر الإنترنت وتنظيم النتائج في هيكل شجري مرقم قابل للطي مع توثيق الحقائق والمصادر بدقة.',
      prompt: 'أنت مساعد بحثي متقدم: تجري بحثاً شاملاً مستمراً وتنظم النتائج في هيكل شجري مرقم ومصادر موثقة.',
    },
    {
      id: 'guide',
      name: 'المرشد المحلي',
      emoji: '🧭',
      avatarUrl: DEFAULT_AGENT_AVATARS.guide,
      desc: 'يجاوب على أسئلة السكان عن المدينة والمرافق والصيدليات والمصالح الإدارية.',
      prompt: 'أنت المرشد: تجاوب على أسئلة السكان عن الخدمات والحياة اليومية.',
    },
    {
      id: 'desert',
      name: 'حارس الصحراء',
      emoji: '🏜️',
      avatarUrl: DEFAULT_AGENT_AVATARS.desert,
      desc: 'نصائح السلامة وإرشادات النجاة وتأمين مسالك الطرق الصحراوية (تمنراست، أدرار، المنيعة).',
      prompt: 'أنت حارس الصحراء: تعطي نصائح سلامة عملية للتائهين وطوارئ 14 و 1055 وتؤكد على البقاء قرب السيارة.',
    },
    {
      id: 'doctor',
      name: 'طبيب الاستعجالات',
      emoji: '🩺',
      avatarUrl: DEFAULT_AGENT_AVATARS.doctor,
      desc: 'إرشادات وقائية سريعة للتعامل مع ضربات الشمس، التجفاف، لدغات العقارب، والإسعافات الأولية.',
      prompt: 'أنت طبيب الاستعجالات الصحراوي في عين صالح.',
    },
    {
      id: 'market',
      name: 'دليل الأسواق والتمور',
      emoji: '🛒',
      avatarUrl: DEFAULT_AGENT_AVATARS.market,
      desc: 'دليل أسعار التمور المشهورة، الأسواق الأسبوعية، محطات الوقود، والمحلات في واحة عين صالح.',
      prompt: 'أنت دليل الأسواق والمحلات في عين صالح.',
    },
    {
      id: 'check',
      name: 'المدقق الإخباري',
      emoji: '✅',
      avatarUrl: DEFAULT_AGENT_AVATARS.check,
      desc: 'يتحقق من مدى صحة الأخبار والإشاعات ومطابقتها للمصادر الرسمية المعتمدة.',
      prompt: 'أنت المدقق: تقيّم هل المعلومة مؤكدة أو مجرد إشاعة.',
    },
    {
      id: 'news',
      name: 'جامع الأخبار',
      emoji: '📰',
      avatarUrl: DEFAULT_AGENT_AVATARS.news,
      desc: 'يلخص المعلومات المحلية التي يضيفها السكان من فيسبوك والمجموعات مع ذكر المصدر.',
      prompt: 'أنت جامع الأخبار: تلخص المعلومات المضافة من السكان وتذكر المصدر.',
    },
    {
      id: 'fix',
      name: 'المصحح اللغوي',
      emoji: '✍️',
      avatarUrl: DEFAULT_AGENT_AVATARS.fix,
      desc: 'يصحح الإملاء ويعيد صياغة المنشورات والرسائل بأسلوب واضح وراقٍ.',
      prompt: 'أنت المصحح: تصحح الإملاء وتعيد صياغة النص بوضوح.',
    },
  ],

  en: [
    {
      id: 'swarm',
      name: 'Integrated Agent Swarm',
      emoji: '⚡',
      avatarUrl: DEFAULT_AGENT_AVATARS.swarm,
      desc: 'Joint Operations Room: All agents collaborate in parallel to deliver the fastest, most comprehensive answers.',
      prompt: 'Team coordination swarm uniting all In Salah specialized AI agents.',
    },
    {
      id: 'research',
      name: 'Academic & Deep Researcher',
      emoji: '🎓',
      avatarUrl: DEFAULT_AGENT_AVATARS.research,
      desc: 'Advanced Research Assistant: Comprehensive web research structured into interactive numbered collapsible tree hierarchies with verified citations.',
      prompt: 'You are an advanced research assistant: conduct continuous web research organized in numbered trees with verified sources.',
    },
    {
      id: 'guide',
      name: 'Local Guide',
      emoji: '🧭',
      avatarUrl: DEFAULT_AGENT_AVATARS.guide,
      desc: 'Answers questions about city landmarks, municipal facilities, duty pharmacies, and administrative services.',
      prompt: 'You are the Local Guide: provide accurate answers on municipal services and daily life in In Salah.',
    },
    {
      id: 'desert',
      name: 'Desert Guardian',
      emoji: '🏜️',
      avatarUrl: DEFAULT_AGENT_AVATARS.desert,
      desc: 'Safety advice, survival guidelines, and secure routes across Sahara highways (Tamanrasset, Adrar, El Meniaa).',
      prompt: 'You are the Desert Guardian: give vital safety advice to stranded travelers and emphasize staying with the car.',
    },
    {
      id: 'doctor',
      name: 'Emergency Doctor',
      emoji: '🩺',
      avatarUrl: DEFAULT_AGENT_AVATARS.doctor,
      desc: 'Rapid preventive advice for heat stroke, dehydration, scorpion stings, and desert first aid.',
      prompt: 'You are the desert emergency physician in In Salah: provide rapid, calm first-aid advice.',
    },
    {
      id: 'market',
      name: 'Markets & Dates Guide',
      emoji: '🛒',
      avatarUrl: DEFAULT_AGENT_AVATARS.market,
      desc: 'Prices of famous Saharan dates, weekly souks, fuel stations, and local shops in In Salah oasis.',
      prompt: 'You are the market and commercial guide in In Salah oasis.',
    },
    {
      id: 'check',
      name: 'Fact & News Verifier',
      emoji: '✅',
      avatarUrl: DEFAULT_AGENT_AVATARS.check,
      desc: 'Verifies the authenticity of local news, debunking rumors against official authorized sources.',
      prompt: 'You are the Fact Checker: evaluate claims and debunk viral rumors with verified sources.',
    },
    {
      id: 'news',
      name: 'Community News Collector',
      emoji: '📰',
      avatarUrl: DEFAULT_AGENT_AVATARS.news,
      desc: 'Summarizes local announcements submitted by citizens from Facebook and local channels with source citations.',
      prompt: 'You are the News Collector: summarize citizen-reported announcements with exact sources.',
    },
    {
      id: 'fix',
      name: 'Proofreader & Stylist',
      emoji: '✍️',
      avatarUrl: DEFAULT_AGENT_AVATARS.fix,
      desc: 'Corrects spelling and refines administrative letters and announcements into clear, eloquent prose.',
      prompt: 'You are the Editor & Proofreader: fix typos, grammar, and polish texts with elegance.',
    },
  ],

  fr: [
    {
      id: 'swarm',
      name: "Essaim d'agents intégrés",
      emoji: '⚡',
      avatarUrl: DEFAULT_AGENT_AVATARS.swarm,
      desc: 'Salle des opérations conjointe : tous les agents se consultent en parallèle pour la réponse la plus complète.',
      prompt: 'Coordination de l\'essaim d\'agents experts de la région d\'In Salah.',
    },
    {
      id: 'research',
      name: 'Chercheur académique & Recherche approfondie',
      emoji: '🎓',
      avatarUrl: DEFAULT_AGENT_AVATARS.research,
      desc: 'Assistant de recherche avancée : Recherches continues sur le Web organisées en structure arborescente numérotée et pliable avec faits et sources vérifiés.',
      prompt: 'Vous êtes un assistant de recherche avancée : menez des recherches Web approfondies organisées en arborescence avec sources fiables.',
    },
    {
      id: 'guide',
      name: 'Guide Local d\'In Salah',
      emoji: '🧭',
      avatarUrl: DEFAULT_AGENT_AVATARS.guide,
      desc: 'Répond aux questions sur la ville, les services municipaux, les pharmacies de garde et les administrations.',
      prompt: 'Vous êtes le Guide local : renseignez les usagers sur les services et le quotidien à In Salah.',
    },
    {
      id: 'desert',
      name: 'Gardien du Désert',
      emoji: '🏜️',
      avatarUrl: DEFAULT_AGENT_AVATARS.desert,
      desc: 'Conseils de survie, sécurité routière et état des pistes du Sahara (Tamanrasset, Adrar, El Meniaa).',
      prompt: 'Vous êtes le Gardien du désert : donnez des conseils cruciaux de survie et rappelez de rester près du véhicule.',
    },
    {
      id: 'doctor',
      name: 'Médecin d\'urgence',
      emoji: '🩺',
      avatarUrl: DEFAULT_AGENT_AVATARS.doctor,
      desc: 'Conseils rapides face aux coups de chaleur, à la déshydratation, aux piqûres de scorpions et premiers secours.',
      prompt: 'Vous êtes le médecin d\'urgence du désert : donnez des conseils préventifs et de premiers secours immédiats.',
    },
    {
      id: 'market',
      name: 'Guide des Marchés & Dattes',
      emoji: '🛒',
      avatarUrl: DEFAULT_AGENT_AVATARS.market,
      desc: 'Prix des dattes réputées, marchés hebdomadaires, stations-service et commerces de l\'oasis.',
      prompt: 'Vous êtes le guide commercial et des marchés d\'In Salah.',
    },
    {
      id: 'check',
      name: 'Vérificateur d\'informations',
      emoji: '✅',
      avatarUrl: DEFAULT_AGENT_AVATARS.check,
      desc: 'Vérifie l\'exactitude des annonces et rumeurs en les recoupant avec les sources officielles.',
      prompt: 'Vous êtes le vérificateur : évaluez la véracité des informations et démentez les fausses rumeurs.',
    },
    {
      id: 'news',
      name: 'Collecteur d\'actualités locales',
      emoji: '📰',
      avatarUrl: DEFAULT_AGENT_AVATARS.news,
      desc: 'Résume les actualités et annonces citoyennes provenant des réseaux locaux avec mention des sources.',
      prompt: 'Vous êtes le collecteur d\'actualités : synthétisez les publications locales avec leur source.',
    },
    {
      id: 'fix',
      name: 'Correcteur & Styliste',
      emoji: '✍️',
      avatarUrl: DEFAULT_AGENT_AVATARS.fix,
      desc: 'Corrige l\'orthographe et reformule courriers administratifs et messages avec élégance et précision.',
      prompt: 'Vous êtes le correcteur : améliorez l\'orthographe, la syntaxe et la clarté des écrits.',
    },
  ],
};
