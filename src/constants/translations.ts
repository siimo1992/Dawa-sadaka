export type AppLanguage = 'ar' | 'en' | 'fr';

export interface Translations {
  appName: string;
  assistantSubtitle: string;
  unifiedEngine: string;
  newChat: string;
  clearChat: string;
  confirmClear: string;
  copied: string;
  copy: string;
  listen: string;
  correct: string;
  like: string;
  dislike: string;
  ratingToastLike: string;
  ratingToastDislike: string;
  ratingFeedbackTitleLike: string;
  ratingFeedbackTitleDislike: string;
  ratingFeedbackReasonPrompt: string;
  ratingFeedbackCommentPlaceholderLike: string;
  ratingFeedbackCommentPlaceholderDislike: string;
  saveFeedback: string;
  feedbackSaved: string;
  close: string;
  skip: string;
  typingPlaceholder: string;
  send: string;
  attachImage: string;
  attachPdf: string;
  cameraPhoto: string;
  imageAttached: string;
  pdfAttached: string;
  downloadPdf: string;
  welcomeTitle: string;
  thinking: string;
  emergencyTitle: string;
  civilDefense: string;
  gendarmerie: string;
  police: string;
  tabs: {
    chat: string;
    news: string;
    desert: string;
    admin: string;
  };
  ratingReasons: {
    accurate: string;
    concise: string;
    helpful_format: string;
    fast: string;
    inaccurate: string;
    too_long: string;
    not_answered: string;
    outdated: string;
    unclear: string;
    other: string;
  };
  agents: Record<
    string,
    {
      name: string;
      desc: string;
    }
  >;
  quickPrompts: string[];
}

export const TRANSLATIONS: Record<AppLanguage, Translations> = {
  ar: {
    appName: 'تيديكلت Ai',
    assistantSubtitle: 'مساعدك الذكي',
    unifiedEngine: 'استقصاء وتحليل موحد: جيمناي (بحث حي) · نانو بنانا 2 · كلود · قروك',
    newChat: 'محادثة جديدة',
    clearChat: 'مسح المحادثة',
    confirmClear: 'هل أنت متأكد من مسح هذه المحادثة؟',
    copied: 'تم النسخ!',
    copy: 'نسخ',
    listen: 'استماع',
    correct: 'تصحيح',
    like: 'أعجبني',
    dislike: 'لم يعجبني',
    ratingToastLike: 'تم تسجيل إعجابك وحفظه في قاعدة البيانات لتعزيز جودة الردود مستقبلاً 👍',
    ratingToastDislike: 'تم حفظ تقييمك في قاعدة البيانات. يمكنك توضيح السبب أدناه لتحسين الإجابات القادمة 🎯',
    ratingFeedbackTitleLike: 'ما الذي نال إعجابك في هذا الرد؟',
    ratingFeedbackTitleDislike: 'ما سبب عدم إعجابك بهذا الرد؟',
    ratingFeedbackReasonPrompt: 'حدد السبب لمساعدتنا في تحسين جودة المساعد مستقبلاً:',
    ratingFeedbackCommentPlaceholderLike: 'ملاحظة إضافية تود مشاركتها (اختياري)...',
    ratingFeedbackCommentPlaceholderDislike: 'اكتب ملاحظتك التوضيحية لتحسين الرد مستقبلاً...',
    saveFeedback: 'حفظ الملاحظة',
    feedbackSaved: 'تم حفظ ملاحظتك وتحديث قاعدة البيانات بنجاح ✨',
    close: 'إغلاق',
    skip: 'تخطي',
    typingPlaceholder: 'اكتب رسالتك أو استفسارك هنا... (Enter للإرسال، Shift+Enter لسطر جديد)',
    send: 'إرسال',
    attachImage: 'إرفاق صورة للتحليل',
    attachPdf: 'إرفاق مستند أو تقرير إداري PDF',
    cameraPhoto: 'التقاط صورة بالكاميرا',
    imageAttached: 'تقرير مصور مرفق للتحليل البصري',
    pdfAttached: 'مستند PDF مرفق للتلخيص',
    downloadPdf: 'تحميل',
    welcomeTitle: 'كيف يمكنني مساعدتك اليوم؟',
    thinking: 'جاري التفكير وتوليد الرد بالذكاء الاصطناعي...',
    emergencyTitle: 'طوارئ النجدة السريعة:',
    civilDefense: 'الحماية 14',
    gendarmerie: 'الدرك 1055',
    police: 'الشرطة 17',
    tabs: {
      chat: 'المحادثة الذكية',
      news: 'الأخبار والطقس',
      desert: 'مسالك الصحراء وRN1',
      admin: 'لوحة المشرف',
    },
    ratingReasons: {
      accurate: 'دقيق ومفيد جداً 🎯',
      concise: 'موجز ومباشر ⚡',
      helpful_format: 'تنسيق منظم ومريح 📋',
      fast: 'إجابة وافية وسريعة 🚀',
      inaccurate: 'معلومات غير دقيقة ⚠️',
      too_long: 'إجابة طويلة ومملة 📏',
      not_answered: 'لم يجب عن سؤالي ❓',
      outdated: 'معلومات قديمة / تحتاج تحديث ⏳',
      unclear: 'صياغة غير واضحة ✍️',
      other: 'سبب آخر 💬',
    },
    agents: {
      swarm: {
        name: 'فريق الوكلاء المتكامل',
        desc: 'غرفة العمليات المشتركة: تشاور الوكلاء لتقديم أسرع وأشمل جواب متكامل.',
      },
      research: {
        name: 'الباحث الأكاديمي والمعرفي',
        desc: 'إنجاز البحوث المدرسية والجامعية، إعداد خطط البحث والمراجع العلمية.',
      },
      guide: {
        name: 'المرشد المحلي',
        desc: 'إجابات عن المدينة والمرافق والصيدليات والإدارات والمواعيد.',
      },
      desert: {
        name: 'حارس الصحراء',
        desc: 'إرشادات السلامة وتأمين مسالك الطرق الصحراوية (تمنراست، أدرار، المنيعة).',
      },
      doctor: {
        name: 'طبيب الاستعجالات',
        desc: 'إرشادات وقائية لضربات الشمس، الجفاف، لدغات العقارب، والإسعافات.',
      },
      market: {
        name: 'دليل الأسواق والتمور',
        desc: 'دليل أسعار التمور والأسواق الأسبوعية ومحطات الوقود في الواحة.',
      },
      check: {
        name: 'المدقق الإخباري',
        desc: 'التحقق من صحة الأخبار والإشاعات ومطابقتها للمصادر المعتمدة.',
      },
      news: {
        name: 'جامع الأخبار',
        desc: 'تلخيص المستجدات المحلية التي يضيفها السكان مع ذكر المصدر.',
      },
      fix: {
        name: 'المصحح اللغوي',
        desc: 'تصحيح الإملاء وإعادة صياغة الرسائل والمنشورات بأسلوب راقٍ.',
      },
    },
    quickPrompts: [
      '📊 أنجز لي جدولاً بيانياً مفصلاً يقارن بين واحات تديكلت ومسافات الطرق',
      '🎓 أنجز لي بحثاً متكاملاً حول الثورة التحريرية الجزائرية مع خطة ومراجع',
      '💻 اكتب لي كود بايثون عملي لحساب واستهلاك الطاقة الشمسية مع الشرح',
      '🛣️ ما هي حالة طريق عين صالح تمنراست RN1 والطقس اليوم؟',
      '✍️ صغ لي طلباً إدارياً رسمياً موجهاً للبلدية أو الولاية',
      '🩺 إسعافات أولية عاجلة للدغة عقرب صحراوي في عين صالح',
    ],
  },
  en: {
    appName: 'Tidikelt AI',
    assistantSubtitle: 'Your Smart Assistant',
    unifiedEngine: 'Unified Intelligence: Gemini (Live Search) · Nano Banana 2 · Claude · Grok',
    newChat: 'New Chat',
    clearChat: 'Clear Chat',
    confirmClear: 'Are you sure you want to clear this conversation?',
    copied: 'Copied!',
    copy: 'Copy',
    listen: 'Listen',
    correct: 'Feedback',
    like: 'Like',
    dislike: 'Dislike',
    ratingToastLike: 'Thank you! Your positive rating has been saved to train future responses 👍',
    ratingToastDislike: 'Your rating has been saved in the database to improve future responses 🎯',
    ratingFeedbackTitleLike: 'What did you like about this response?',
    ratingFeedbackTitleDislike: 'What was the issue with this response?',
    ratingFeedbackReasonPrompt: 'Select a reason to help us continuously train the assistant:',
    ratingFeedbackCommentPlaceholderLike: 'Additional note or praise (optional)...',
    ratingFeedbackCommentPlaceholderDislike: 'Describe what could be improved...',
    saveFeedback: 'Save Feedback',
    feedbackSaved: 'Feedback successfully saved and merged into AI memory ✨',
    close: 'Close',
    skip: 'Skip',
    typingPlaceholder: 'Type your message or inquiry here... (Enter to send, Shift+Enter for newline)',
    send: 'Send',
    attachImage: 'Attach image for vision analysis',
    attachPdf: 'Attach PDF document or report',
    cameraPhoto: 'Capture photo with camera',
    imageAttached: 'Image attached for visual inspection',
    pdfAttached: 'PDF document attached for summary',
    downloadPdf: 'Download',
    welcomeTitle: 'How can I help you today?',
    thinking: 'AI is thinking and drafting the response...',
    emergencyTitle: 'Emergency Quick Access:',
    civilDefense: 'Civil Defense 14',
    gendarmerie: 'Gendarmerie 1055',
    police: 'Police 17',
    tabs: {
      chat: 'Smart Chat',
      news: 'News & Weather',
      desert: 'Desert Routes & Safety',
      admin: 'Supervisor Dashboard',
    },
    ratingReasons: {
      accurate: 'Very accurate & helpful 🎯',
      concise: 'Concise & direct ⚡',
      helpful_format: 'Well formatted & readable 📋',
      fast: 'Comprehensive & prompt 🚀',
      inaccurate: 'Inaccurate info ⚠️',
      too_long: 'Too verbose or repetitive 📏',
      not_answered: 'Did not answer my question ❓',
      outdated: 'Outdated info / Needs update ⏳',
      unclear: 'Unclear phrasing ✍️',
      other: 'Other reason 💬',
    },
    agents: {
      swarm: {
        name: 'Multi-Agent Swarm',
        desc: 'Collaborative operations: all specialized agents consult in parallel for complete insights.',
      },
      research: {
        name: 'Academic Researcher',
        desc: 'Scholarly papers, thesis structuring, bibliography, and general knowledge synthesis.',
      },
      guide: {
        name: 'Local City Guide',
        desc: 'City administration, pharmacies on duty, local venues, and practical life advice.',
      },
      desert: {
        name: 'Desert Ranger (RN1)',
        desc: 'Sahara route safety, sand navigation, breakdown protocols (In Salah, Tamanrasset, Adrar).',
      },
      doctor: {
        name: 'Emergency Medical',
        desc: 'First aid for heatstroke, dehydration, scorpion stings, and desert medical precautions.',
      },
      market: {
        name: 'Markets & Dates Guide',
        desc: 'Prices of Deglet Nour dates, weekly oasis souks, and fuel station availability.',
      },
      check: {
        name: 'Fact Checker',
        desc: 'Verifies rumors, validates official sources, and debunking disinformation.',
      },
      news: {
        name: 'Community News Gatherer',
        desc: 'Summarizes verified local citizen reports with primary source citations.',
      },
      fix: {
        name: 'Language & Letter Editor',
        desc: 'Proofreads grammar, crafts official administrative correspondence, and refines prose.',
      },
    },
    quickPrompts: [
      '📊 Create a detailed comparison table of Tidikelt oases and route distances',
      '🎓 Prepare a comprehensive academic research plan on clean energy with references',
      '💻 Write a practical Python script to calculate solar power production with explanation',
      '🛣️ What is the current status of National Road RN1 and the desert weather?',
      '✍️ Draft a professional administrative request letter to municipal authorities',
      '🩺 Emergency first-aid guidance for desert scorpion sting in In Salah',
    ],
  },
  fr: {
    appName: 'Tidikelt IA',
    assistantSubtitle: 'Votre Assistant Intelligent',
    unifiedEngine: 'Intelligence Unifiée : Gemini (Recherche en direct) · Nano Banana 2 · Claude · Grok',
    newChat: 'Nouvelle discussion',
    clearChat: 'Effacer la discussion',
    confirmClear: 'Êtes-vous sûr de vouloir effacer cette conversation ?',
    copied: 'Copié !',
    copy: 'Copier',
    listen: 'Écouter',
    correct: 'Commentaire',
    like: "J'aime",
    dislike: "Je n'aime pas",
    ratingToastLike: 'Merci ! Votre avis a été enregistré pour améliorer les réponses futures 👍',
    ratingToastDislike: 'Votre avis a été enregistré pour ajuster la qualité du modèle 🎯',
    ratingFeedbackTitleLike: 'Qu’avez-vous apprécié dans cette réponse ?',
    ratingFeedbackTitleDislike: 'Quel était le problème avec cette réponse ?',
    ratingFeedbackReasonPrompt: 'Sélectionnez un motif pour nous aider à entraîner l’assistant :',
    ratingFeedbackCommentPlaceholderLike: 'Remarque ou précision supplémentaire (facultatif)...',
    ratingFeedbackCommentPlaceholderDislike: 'Décrivez ce qui pourrait être amélioré...',
    saveFeedback: 'Enregistrer le retour',
    feedbackSaved: 'Retour enregistré avec succès dans la base de données ✨',
    close: 'Fermer',
    skip: 'Passer',
    typingPlaceholder: 'Écrivez votre message ou question ici... (Entrée pour envoyer, Maj+Entrée pour un saut de ligne)',
    send: 'Envoyer',
    attachImage: 'Joindre une photo pour analyse visuelle',
    attachPdf: 'Joindre un rapport ou document PDF',
    cameraPhoto: 'Prendre une photo avec l’appareil',
    imageAttached: 'Image jointe pour inspection visuelle',
    pdfAttached: 'Document PDF joint pour synthèse',
    downloadPdf: 'Télécharger',
    welcomeTitle: "Comment puis-je vous aider aujourd'hui ?",
    thinking: "L'IA réfléchit et rédige la réponse...",
    emergencyTitle: 'Urgences & Numéros Verts :',
    civilDefense: 'Protection Civile 14',
    gendarmerie: 'Gendarmerie 1055',
    police: 'Police 17',
    tabs: {
      chat: 'Chat Intelligent',
      news: 'Actualités & Météo',
      desert: 'Pistes du Désert & RN1',
      admin: 'Tableau de Bord Superviseur',
    },
    ratingReasons: {
      accurate: 'Très précis et utile 🎯',
      concise: 'Concis et direct ⚡',
      helpful_format: 'Mise en page claire et lisible 📋',
      fast: 'Réponse rapide et complète 🚀',
      inaccurate: 'Informations inexactes ⚠️',
      too_long: 'Trop long ou répétitif 📏',
      not_answered: 'N’a pas répondu à ma question ❓',
      outdated: 'Informations obsolètes / À actualiser ⏳',
      unclear: 'Formulation peu claire ✍️',
      other: 'Autre motif 💬',
    },
    agents: {
      swarm: {
        name: 'Équipe d’Agents Intégrée',
        desc: 'Opérations conjointes : concertation parallèle de tous les agents pour une réponse complète.',
      },
      research: {
        name: 'Chercheur Académique',
        desc: 'Recherches scolaires et universitaires, plans d’études et bibliographie scientifique.',
      },
      guide: {
        name: 'Guide Local d’In Salah',
        desc: 'Services municipaux, pharmacies de garde, démarches et vie quotidienne.',
      },
      desert: {
        name: 'Gardien du Désert (RN1)',
        desc: 'Sécurité saharienne, franchissement des dunes et secours (In Salah, Tamanrasset, Adrar).',
      },
      doctor: {
        name: 'Médecin Urgentiste',
        desc: 'Conseils pour coups de chaleur, déshydratation, piqûres de scorpions et premiers secours.',
      },
      market: {
        name: 'Guide des Marchés & Dattes',
        desc: 'Cours des dattes Deglet Nour, marchés hebdomadaires et stations de carburant.',
      },
      check: {
        name: 'Vérificateur d’Informations',
        desc: 'Validation des faits, vérification des rumeurs et recoupement officiel.',
      },
      news: {
        name: 'Collecteur d’Actualités',
        desc: 'Synthèse des actualités locales vérifiées signalées par les habitants.',
      },
      fix: {
        name: 'Correcteur & Rédacteur',
        desc: 'Correction de la syntaxe, rédaction de requêtes administratives et style soigné.',
      },
    },
    quickPrompts: [
      '📊 Crée un tableau comparatif détaillé des oasis du Tidikelt et des distances routières',
      '🎓 Rédige un plan de recherche complet sur les énergies renouvelables au Sahara avec références',
      '💻 Écris un code Python pratique pour calculer la production d’énergie solaire avec explications',
      '🛣️ Quel est l’état de la route nationale RN1 vers Tamanrasset et la météo aujourd’hui ?',
      '✍️ Rédige une lettre officielle de demande administrative adressée à la mairie',
      '🩺 Premiers secours d’urgence en cas de piqûre de scorpion saharien à In Salah',
    ],
  },
};
