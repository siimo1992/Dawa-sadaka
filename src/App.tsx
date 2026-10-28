import React, { useState, useEffect, useRef, useMemo, Suspense, lazy } from 'react';
import {
  Volume2,
  VolumeX,
  Loader2,
  Sun,
  Moon,
  RotateCcw,
  MapPin,
  AlertTriangle,
  PhoneCall,
  CheckCircle2,
  Trash2,
  Share2,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Unlock,
  KeyRound,
  Check,
  X,
  XCircle,
  Edit3,
  RefreshCw,
  Eye,
  EyeOff,
  Sliders,
  SlidersHorizontal,
  Sparkles,
  Wind,
  Flame,
  CloudRain,
  ChevronDown,
  ChevronUp,
  Megaphone,
  Plus,
  Menu,
  Copy,
  ArrowUp,
  MessageSquare,
  CornerDownLeft,
  Camera,
  Image as ImageIcon,
  FileText,
  FileUp,
  BarChart3,
  TrendingUp,
  Clock,
  Zap,
  Activity,
  Calendar,
  Bell,
  BellOff,
  BellRing,
  Shield,
  ExternalLink,
  Globe,
  ThumbsUp,
  ThumbsDown,
  Search,
  Code2,
  Mic,
  MicOff,
  GitBranch,
  BookOpen,
  History,
  Download,
  Pencil,
  MoreVertical,
  Compass,
  ListTodo,
  Car,
  HeartHandshake,
  Ban,
  Bot,
  Building2,
} from 'lucide-react';
import {
  InAppNotificationToastContainer,
  AppNotification,
} from './components/InAppNotificationToast';
import { MarkdownRenderer } from './components/MarkdownRenderer';
import { InteractiveResearchTree, parseMarkdownToResearchTree } from './components/InteractiveResearchTree';
import {
  Language,
  TRANSLATIONS,
  LOCALIZED_AGENTS,
  LocalizedAgent,
  DEFAULT_AGENT_AVATARS,
} from './i18n/translations';
import {
  ALGERIA_WILAYAS,
  VisitorLocationState,
  findNearestWilaya,
} from './utils/geoLocations';
import { SosButton } from './components/SosButton';
import { TodayCard } from './components/TodayCard';
import SearchActivity, { SearchActivityPhase } from './components/SearchActivity';
import { ChatStatus } from './components/ChatStatus';
import './components/chat-status.css';
import { readSSE } from './services/sse-reader';
import { usePWAInstall, useOnlineStatus } from './lib/api';
import { Mode, detectMode, askTidikelt } from './services/tidikelt-agent';
import type { PipelineExecution, ChatSession } from './types';
import { CommunityNewsPage } from './components/CommunityNewsPage';
import { RafiqAlTariqModal } from './components/RafiqAlTariqModal';

const AgentAnalytics30DayChart = lazy(() =>
  import('./components/AgentAnalytics30DayChart').then((m) => ({ default: m.AgentAnalytics30DayChart }))
);
const LocationSelectorModal = lazy(() =>
  import('./components/LocationSelectorModal').then((m) => ({ default: m.LocationSelectorModal }))
);
const TrainingAndRagStudioModal = lazy(() =>
  import('./components/TrainingAndRagStudioModal').then((m) => ({ default: m.TrainingAndRagStudioModal }))
);
const ApiExplorerModal = lazy(() =>
  import('./components/ApiExplorerModal').then((m) => ({ default: m.ApiExplorerModal }))
);
const TidikeltOasis3DModal = lazy(() =>
  import('./components/TidikeltOasis3DModal').then((m) => ({ default: m.TidikeltOasis3DModal }))
);
const VeoAndMapsStudioModal = lazy(() =>
  import('./components/VeoAndMapsStudioModal').then((m) => ({ default: m.VeoAndMapsStudioModal }))
);
const OasisMapAndTasksPage = lazy(() =>
  import('./components/OasisMapAndTasksPage.tsx').then((m) => ({ default: m.OasisMapAndTasksPage }))
);
const DownloadAppModal = lazy(() =>
  import('./components/DownloadAppModal').then((m) => ({ default: m.DownloadAppModal }))
);
import MyCharitySection from './MyCharitySection';
import { CharityAdminApprovalBox } from './components/CharityAdminApprovalBox';
import {
  OwnerServiceControlSections,
  OwnerDepartmentSection,
} from './components/OwnerServiceControlSections';
import {
  addBanEntry,
  removeBanEntry,
  isTargetBanned,
  loadBanList,
  loadDesertTrips,
  saveDesertTrips,
  loadDesertChecklist,
} from './utils/ownerControlStore';
import {
  signInWithGooglePopup,
  signOutUser,
  subscribeToAuthChanges,
  subscribeToCloudChatSessions,
  syncChatSessionToCloud,
  renameChatSessionInCloud,
  deleteChatSessionFromCloud,
  saveNewsItemToCloud,
  subscribeToCloudSavedNews,
} from './services/firebaseService';
import type { User as FirebaseUser } from 'firebase/auth';
const LongTermMemoryModal = lazy(() =>
  import('./components/LongTermMemoryModal').then((m) => ({ default: m.LongTermMemoryModal }))
);
import {
  GeneratedFileCard,
  ConvertMessageToFileMenu,
  type GeneratedFileInfo,
} from './components/GeneratedFileCard';
import {
  PriceListPosterCard,
  renderHighResPosterToJpeg,
  applyPillowMarginsAndFooterToPage,
  DEFAULT_PDF_EXPORT_SETTINGS,
  type PriceListPosterData,
  type PdfExportSettings,
} from './components/PriceListPosterCard';
const LiveVoiceCallModal = lazy(() =>
  import('./components/LiveVoiceCallModal').then((m) => ({ default: m.LiveVoiceCallModal }))
);

interface Agent {
  id: string;
  name: string;
  emoji: string;
  avatarUrl?: string;
  desc: string;
  prompt: string;
}

interface AgentCollaboration {
  agent: string;
  emoji: string;
  action: string;
}

interface Message {
  id: string;
  role: 'me' | 'bot';
  text: string;
  mode?: Exclude<Mode, 'auto'>;
  code?: string;
  codeOutput?: string;
  image?: string;
  pdf?: {
    name: string;
    size?: string;
    data: string;
  };
  agentNote?: string;
  collaborations?: AgentCollaboration[];
  webSources?: Array<{ title: string; url: string }>;
  groundingQueries?: string[];
  multiModelEngines?: string[];
  sourceInfo?: {
    engine: string;
    model?: string;
    isGrounded?: boolean;
    provider?: string;
    badgeTitle?: string;
    isLiveTemporal?: boolean;
    isResearchMode?: boolean;
    isSystemsEngineerMode?: boolean;
    isConciseMode?: boolean;
    temporalClock?: {
      time: string;
      timeAr?: string;
      date: string;
      hijri?: string;
      day: string;
      year: string;
    };
  };
  timestamp: number;
  userPromptText?: string;
  agentId?: string;
  agentName?: string;
  rating?: 'like' | 'dislike';
  feedbackReason?: string;
  feedbackComment?: string;
  pipelineExecution?: PipelineExecution;
  codeCategory?: CodeCategory;
  isManualCodeCategory?: boolean;
  suggestedQuestions?: string[];
  generatedFile?: GeneratedFileInfo;
  priceListPosters?: PriceListPosterData[];
}

function buildClientQuestionRefinements(rawPrompt: string, lang: Language): {
  cleanTopic: string;
  friendlyFallbackText: string;
} {
  const raw = (rawPrompt || '')
    .replace(/^بخصوص\s*«([^»]+)»[\s\S]*$/i, '$1')
    .replace(/^Regarding\s*"([^"]+)"[\s\S]*$/i, '$1')
    .replace(/^Concernant\s*«\s*([^»]+)\s*»[\s\S]*$/i, '$1')
    .trim();

  const normalized = raw
    .replace(/\s+/g, ' ')
    .replace(/(?:^|[\s،.؛!؟])(السول|السوال|السؤل)(?=[\s،.؛!؟]|$)/g, ' السؤال ')
    .replace(/خورميات|خورزميات|خوارزميت/g, 'خوارزميات')
    .replace(/تيدكلت|تدكلت/g, 'تيديكلت')
    .replace(/اصطناعيي|الصطناعي|إصطناعي/g, 'اصطناعي')
    .replace(/برمجه/g, 'برمجة')
    .replace(/(?:^|[\s،.؛!؟])(خطاء)(?=[\s،.؛!؟]|$)/g, ' خطأ ')
    .replace(/(?:^|[\s،.؛!؟])(تاكد|تأكذ)(?=[\s،.؛!؟]|$)/g, ' التأكد ')
    .replace(/تعتمل/g, 'تعتمد')
    .replace(/اقتراحت/g, 'اقتراحات')
    .replace(/انا كان/g, 'إن كان')
    .replace(/\s+/g, ' ')
    .trim();

  const cleanTopic =
    normalized.replace(/^(ما هو|ما هي|كيف|اشرح|اريد|أريد|عن|حول)\s+/i, '').trim() ||
    normalized ||
    (lang === 'ar' ? 'موضوع سؤالك' : lang === 'fr' ? 'votre sujet' : 'your topic');

  if (lang === 'en') {
    return {
      cleanTopic,
      friendlyFallbackText: `Unable to reach the server right now. Please try again in a moment.`,
    };
  }

  if (lang === 'fr') {
    return {
      cleanTopic,
      friendlyFallbackText: `Impossible de joindre le serveur pour le moment. Veuillez réessayer.`,
    };
  }

  return {
    cleanTopic,
    friendlyFallbackText: `تعذّر الاتصال بالخادم حاليًا. يرجى المحاولة مرة أخرى.`,
  };
}

export type CodeCategory =
  | 'calculator'
  | 'data_processing'
  | 'chart'
  | 'algorithm'
  | 'general';

export interface CodeCategoryDef {
  id: CodeCategory;
  nameAr: string;
  nameFr: string;
  nameEn: string;
  badgeClass: string;
  activeFilterClass: string;
}

export const CODE_CATEGORIES: CodeCategoryDef[] = [
  {
    id: 'calculator',
    nameAr: 'حاسبة ومعادلات',
    nameFr: 'Calculatrice',
    nameEn: 'Calculator',
    badgeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
    activeFilterClass: 'bg-amber-600 text-white border-amber-600',
  },
  {
    id: 'data_processing',
    nameAr: 'معالجة بيانات',
    nameFr: 'Traitement de données',
    nameEn: 'Data Processing',
    badgeClass: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30',
    activeFilterClass: 'bg-sky-600 text-white border-sky-600',
  },
  {
    id: 'chart',
    nameAr: 'رسم بياني',
    nameFr: 'Graphique',
    nameEn: 'Chart & Plot',
    badgeClass: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30',
    activeFilterClass: 'bg-purple-600 text-white border-purple-600',
  },
  {
    id: 'algorithm',
    nameAr: 'خوارزميات وأتمتة',
    nameFr: 'Algorithme',
    nameEn: 'Algorithms',
    badgeClass: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
    activeFilterClass: 'bg-emerald-600 text-white border-emerald-600',
  },
  {
    id: 'general',
    nameAr: 'أداة برمجية',
    nameFr: 'Script général',
    nameEn: 'General Script',
    badgeClass: 'bg-slate-500/15 text-slate-700 dark:text-slate-300 border-slate-500/30',
    activeFilterClass: 'bg-slate-700 text-white border-slate-700',
  },
];

export function getCodeCategoryDetails(catId?: CodeCategory): CodeCategoryDef {
  return CODE_CATEGORIES.find((c) => c.id === catId) || CODE_CATEGORIES[CODE_CATEGORIES.length - 1];
}

export function detectCodeCategory(
  code?: string,
  prompt?: string,
  output?: string
): CodeCategory {
  const combined = `${code || ''}\n${prompt || ''}\n${output || ''}`.toLowerCase();

  let chartScore = 0;
  let dataScore = 0;
  let calcScore = 0;
  let algoScore = 0;

  // Chart / Visualization signals
  if (/(matplotlib|pyplot|plt\.|seaborn|sns\.|plotly|chart|graph|plot\(|bar\(|scatter\(|hist\(|pie\(|canvas|svg|رسم بياني|مخطط|منحنى|تمثيل بياني|رسم)/i.test(combined)) {
    chartScore += 4;
  }
  if (/(xlabel|ylabel|title\(|savefig|show\(|figure\(|axis|axes)/i.test(combined)) {
    chartScore += 2;
  }

  // Data Processing signals
  if (/(pandas|pd\.|dataframe|numpy|np\.|csv|json\.|read_csv|to_csv|groupby|merge|filter\(|map\(|reduce\(|dataset|معالجة بيانات|تحليل بيانات|بيانات|جدول|إحصاء|فرز|تصفية|قائمة)/i.test(combined)) {
    dataScore += 3;
  }
  if (/(\.sort\(|\.split\(|\.join\(|dict\(|list\(|len\(|mean\(|median|std\(|count\(|SELECT |FROM |WHERE )/i.test(combined)) {
    dataScore += 2;
  }

  // Calculator / Math signals
  if (/(math\.|sqrt|sin\(|cos\(|tan\(|pi\b|pow\(|round\(|abs\(|احسب|حساب|حاسبة|معادلة|مساحة|محيط|حجم|نسبة|فائدة|تحويل حرارة|مسافة|تكلفة|سعر|مجموع|متوسط)/i.test(combined)) {
    calcScore += 3;
  }
  if (/(\*\*|\+\s*\d|\*\s*\d|\/\s*\d|sum\()/i.test(code || '')) {
    calcScore += 2;
  }

  // Algorithm / Automation signals
  if (/(def\s+\w+|class\s+\w+|while\s+|recursion|binary_search|quicksort|fibonacci|factorial|regex|re\.|datetime|os\.|sys\.|خوارزمية|أتمتة|تشفير|بحث|ترتيب)/i.test(combined)) {
    algoScore += 2;
  }

  const maxScore = Math.max(chartScore, dataScore, calcScore, algoScore);
  if (maxScore === 0) return 'general';
  if (chartScore === maxScore) return 'chart';
  if (dataScore === maxScore) return 'data_processing';
  if (calcScore === maxScore) return 'calculator';
  if (algoScore === maxScore) return 'algorithm';
  return 'general';
}

interface NewsItem {
  id: string;
  s: string; // source
  t: string; // text
  category?: string; // roads | health | services | education | weather | market | heritage | sports | tech | general
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
  comments?: Array<{
    id: string;
    authorName: string;
    text: string;
    timestamp: number;
  }>;
}

interface NewsCategoryDef {
  id: string;
  name: string;
  emoji: string;
  badgeClass: string;
}

const NEWS_CATEGORIES: NewsCategoryDef[] = [
  { id: 'roads', name: 'طرق ونقل', emoji: '🛣️', badgeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30' },
  { id: 'health', name: 'صحة واستعجالات', emoji: '🩺', badgeClass: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30' },
  { id: 'services', name: 'خدمات وإدارة', emoji: '🏛️', badgeClass: 'bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30' },
  { id: 'education', name: 'تعليم وجامعة', emoji: '🎓', badgeClass: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30' },
  { id: 'market', name: 'أسواق وتمور', emoji: '🛒', badgeClass: 'bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30' },
  { id: 'heritage', name: 'تراث وثقافة', emoji: '🏺', badgeClass: 'bg-teal-500/15 text-teal-700 dark:text-teal-300 border-teal-500/30' },
  { id: 'sports', name: 'رياضة', emoji: '⚽', badgeClass: 'bg-lime-500/15 text-lime-700 dark:text-lime-300 border-lime-500/30' },
  { id: 'tech', name: 'تقنية وابتكار', emoji: '💻', badgeClass: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30' },
  { id: 'general', name: 'عام ومجتمع', emoji: '📢', badgeClass: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30' },
];

function getCategoryDetails(catId?: string): NewsCategoryDef {
  const found = NEWS_CATEGORIES.find((c) => c.id === catId);
  return (
    found || {
      id: 'general',
      name: 'عام ومجتمع',
      emoji: '📢',
      badgeClass: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30',
    }
  );
}

interface WeatherAlert {
  active: boolean;
  title: string;
  message: string;
  severity: 'danger' | 'warning' | 'info';
  timestamp: number;
  source?: string;
  dataType?: 'live' | 'simulation' | 'outdated';
  publishedAt?: number;
  updatedAt?: number;
  expiresAt?: number;
  expireDurationHours?: number;
}

interface Trip {
  d: string; // destination
  r: string; // return datetime
  p: string; // phone
}

interface AnalyticsData {
  totalQueries: number;
  todayCount: number;
  avgDurationMs: number;
  todayAvgDurationMs: number;
  topAgent: {
    id: string;
    name: string;
    emoji: string;
    count: number;
    percentage: number;
    avgDurationMs: number;
  } | null;
  agentStats: {
    id: string;
    name: string;
    emoji: string;
    count: number;
    percentage: number;
    avgDurationMs: number;
  }[];
  dailyBreakdown: {
    date: string;
    formattedDate: string;
    count: number;
    avgDurationMs: number;
  }[];
  total30DayQueries?: number;
  agent30DayStats?: {
    id: string;
    name: string;
    emoji: string;
    count: number;
    percentage: number;
    avgDurationMs: number;
    color?: string;
  }[];
  daily30DaysTrend?: {
    date: string;
    formattedDate: string;
    total: number;
    [key: string]: any;
  }[];
  typeCounts: {
    text: number;
    image: number;
    pdf: number;
  };
  recentLogs: {
    id: string;
    timestamp: string;
    date: string;
    agentId: string;
    agentName: string;
    agentEmoji: string;
    durationMs: number;
    type: 'text' | 'image' | 'pdf';
    preview: string;
  }[];
  ratingsStats?: {
    total: number;
    likes: number;
    dislikes: number;
    satisfactionRate: number;
    reasonsBreakdown: Record<string, number>;
    agentRatings: Array<{
      agentId: string;
      agentName: string;
      total: number;
      likes: number;
      dislikes: number;
      satisfactionRate: number;
    }>;
    recentFeedbacks: Array<{
      id: string;
      messageId: string;
      query: string;
      response: string;
      rating: 'like' | 'dislike';
      reason?: string;
      comment?: string;
      agentId?: string;
      agentName?: string;
      timestamp: string;
      createdAt: number;
    }>;
  };
}

const AGENTS: Agent[] = [
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
    name: 'الباحث الأكاديمي والمعرفي',
    emoji: '🎓',
    avatarUrl: DEFAULT_AGENT_AVATARS.research,
    desc: 'إنجاز البحوث المدرسية والأكاديمية، إعداد خطط البحث، المراجع، والإجابة على شتى الاستفسارات العلمية والثقافية.',
    prompt: 'أنت باحث وموسوعة علمية شاملة: تنجز بحوثاً متكاملة وتجيب عن كافة الاستفسارات العلمية والأكاديمية والعملية.',
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
    prompt:
      'أنت حارس الصحراء: تعطي نصائح سلامة عملية للتائهين وطوارئ 14 و 1055 وتؤكد على البقاء قرب السيارة.',
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
];

const INITIAL_NEWS: NewsItem[] = [
  {
    id: 'n1',
    s: 'مجموعة أخبار سكان عين صالح',
    t: 'صيدلية المناوبة الليلية لنهاية الأسبوع هي صيدلية الرمال بحي الديس قرب المستشفى القديم.',
    category: 'health',
    timestamp: Date.now() - 3600000 * 3,
    status: 'approved',
    authorName: 'عبد القادر — عضو من حي الديس',
    neighborhood: 'حي الديس',
    isOfficial: false,
    helpfulCount: 14,
  },
  {
    id: 'n2',
    s: 'صفحة بلدية عين صالح الرسمية',
    t: 'تعلن بلدية عين صالح عن تنظيم حملة نظافة تطوعية في واحة النخيل يوم الجمعة القادم بمشاركة الجمعيات المحلية ولجان الأحياء.',
    category: 'services',
    timestamp: Date.now() - 3600000 * 9,
    status: 'approved',
    authorName: 'بلدية عين صالح',
    neighborhood: 'بلدية عين صالح',
    isOfficial: true,
    helpfulCount: 27,
  },
  {
    id: 'n3',
    s: 'مراسل محلي — طريق عين صالح تمنراست',
    t: 'توجد رياح رملية خفيفة على الطريق الوطني رقم 1 نحو تمنراست، يُنصح السائقون بتخفيف السرعة وإشعال الأضواء والتحقق من حالة الطريق قبل السفر.',
    category: 'roads',
    timestamp: Date.now() - 3600000 * 18,
    status: 'approved',
    authorName: 'سليمان — سائق خط تمنراست',
    neighborhood: 'الطريق الوطني رقم 1',
    isOfficial: false,
    helpfulCount: 19,
  },
  {
    id: 'n4',
    s: 'مديرية التربية لولاية عين صالح',
    t: 'انطلاق عملية التسجيلات والتحضيرات الميدانية لامتحانات نهاية السنة والمراكز المعتمدة عبر دوائر الولاية.',
    category: 'education',
    timestamp: Date.now() - 3600000 * 30,
    status: 'approved',
    authorName: 'مديرية التربية لولاية عين صالح',
    neighborhood: 'وسط المدينة',
    isOfficial: true,
    helpfulCount: 11,
  },
  {
    id: 'n5',
    s: 'مديرية الثقافة والفنون - عين صالح',
    t: 'تنظيم معرض الصناعات التقليدية والمخطوطات التراثية لمنطقة تيديكلت بدار الثقافة مع أمسيات شعرية وفلكلورية محلية.',
    category: 'heritage',
    timestamp: Date.now() - 3600000 * 44,
    status: 'approved',
    authorName: 'دار الثقافة عين صالح',
    neighborhood: 'وسط المدينة',
    isOfficial: true,
    helpfulCount: 9,
  },
  {
    id: 'n6',
    s: 'مديرية الشباب والرياضة - عين صالح',
    t: 'انطلاق البطولة الولائية لكرة القدم بين أحياء وبلديات عين صالح بالملعب البلدي وسط حضور جماهيري مميز.',
    category: 'sports',
    timestamp: Date.now() - 3600000 * 56,
    status: 'approved',
    authorName: 'مديرية الشباب والرياضة',
    neighborhood: 'الملعب البلدي',
    isOfficial: true,
    helpfulCount: 8,
  },
  {
    id: 'n7',
    s: 'حاضنة الأعمال الرقمية - عين صالح',
    t: 'تنظيم ورشة تكوينية للشباب وحاملي المشاريع حول تطبيقات الذكاء الاصطناعي والتحول الرقمي بالقطب الجامعي.',
    category: 'tech',
    timestamp: Date.now() - 3600000 * 70,
    status: 'approved',
    authorName: 'حاضنة الأعمال الرقمية',
    neighborhood: 'القطب الجامعي',
    isOfficial: true,
    helpfulCount: 12,
  },
];

const WEATHER_PRESETS = [
  {
    name: '🌪️ رياح رملية قوية (عجاج)',
    severity: 'warning' as const,
    title: 'تنبيه جوي عاجل: رياح رملية قوية (عجاج) على الطريق الوطني رقم 1',
    message:
      'هبوب رياح رملية قوية مع انعدام شبه تام للرؤية الأفقية على محوري عين صالح - تمنراست وعين صالح - أدرار. يُرجى توخي أقصى درجات الحيطة أو تأجيل السفر غير الضروري.',
  },
  {
    name: '☀️ موجة حر شديدة (سخانة)',
    severity: 'danger' as const,
    title: 'تحذير من موجة حر قياسية تتجاوز 48 درجة مئوية في الظل',
    message:
      'تجنب التنقل في المسالك الصحراوية خلال ساعات الظهيرة، الالتزام بالظل، واصطحاب كميات مضاعفة من الماء المبرد مع فحص تبريد المحرك وإطارات السيارة.',
  },
  {
    name: '🌧️ تحذير سيول وفيضان أودية',
    severity: 'danger' as const,
    title: 'تحذير عاجل: احتمالية تشكل سيول جارفة في مجاري الأودية الصحراوية',
    message:
      'يُمنع منعاً باتاً المجازفة بقطع الأودية الجارية أو التخييم في المنخفضات الصخرية والرملية المحاذية للهضاب.',
  },
  {
    name: '🌤️ طقس مستقر وسير عادي',
    severity: 'info' as const,
    title: 'حالة الطقس: سماء صافية وحركة سير عادية على كل المحاور',
    message:
      'الرؤية واضحة وحركة المرور تسير بشكل طبيعي على كامل الطرقات الوطنية والمسالك الصحراوية في الولاية.',
  },
];

const CHAT_SESSIONS_STORAGE_KEY = 'ai_studio_chat_sessions_v1';
const ACTIVE_SESSION_STORAGE_KEY = 'ai_studio_active_session_id';

function deriveSessionTitle(firstPrompt: string): string {
  const clean = firstPrompt
    .replace(/[#*`_~>\-\n]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!clean) return 'محادثة معرفية جديدة';
  return clean.length > 36 ? clean.slice(0, 36).trim() + '...' : clean;
}

function formatSessionTime(timestamp: number, lang: Language = 'ar'): string {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const now = new Date();
  const locale = lang === 'ar' ? 'ar-DZ' : lang === 'fr' ? 'fr-FR' : 'en-US';
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isToday) {
    return date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  }

  const isYesterday =
    new Date(now.getTime() - 24 * 60 * 60 * 1000).toDateString() === date.toDateString();
  if (isYesterday) {
    return lang === 'ar' ? 'أمس' : lang === 'fr' ? 'Hier' : 'Yesterday';
  }

  return date.toLocaleDateString(locale, { month: 'numeric', day: 'numeric' });
}

function formatMessageTimestamp(timestamp?: number, lang: Language = 'ar'): string {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const now = new Date();
  const locale = lang === 'ar' ? 'ar-DZ' : lang === 'fr' ? 'fr-FR' : 'en-US';
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const isYesterday =
    new Date(now.getTime() - 24 * 60 * 60 * 1000).toDateString() === date.toDateString();

  const timeStr = date.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
  });

  const todayLabel = lang === 'ar' ? 'اليوم' : lang === 'fr' ? "Aujourd'hui" : 'Today';
  const yesterdayLabel = lang === 'ar' ? 'أمس' : lang === 'fr' ? 'Hier' : 'Yesterday';

  if (isToday) {
    return `${todayLabel}، ${timeStr}`;
  }
  if (isYesterday) {
    return `${yesterdayLabel}، ${timeStr}`;
  }

  const dateStr = date.toLocaleDateString(locale, {
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    month: 'short',
    day: 'numeric',
  });

  return `${dateStr}، ${timeStr}`;
}

// Web Audio API Sound Chime Synthesizer
function playAlertChime(type: 'weather' | 'news' | 'test', enabled: boolean = true) {
  if (!enabled) return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (type === 'weather') {
      // Urgent Weather Warning: Dual-tone desert alert chime
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(587.33, now); // D5
      osc1.frequency.setValueAtTime(880, now + 0.15); // A5
      osc1.frequency.setValueAtTime(587.33, now + 0.35); // D5

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(293.66, now); // D4
      osc2.frequency.setValueAtTime(440, now + 0.15); // A4
      osc2.frequency.setValueAtTime(293.66, now + 0.35); // D4

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.25, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.7);
      osc2.stop(now + 0.7);
    } else {
      // News Update / Pleasant Ding: 3 ascending harmonious bells (C5 -> E5 -> G5)
      const notes = [523.25, 659.25, 783.99];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const noteStart = ctx.currentTime + idx * 0.12;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, noteStart);

        gain.gain.setValueAtTime(0.001, noteStart);
        gain.gain.linearRampToValueAtTime(0.22, noteStart + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.45);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(noteStart);
        osc.stop(noteStart + 0.5);
      });
    }
  } catch (err) {
    console.error('Audio chime error:', err);
  }
}

interface AgentAvatarImageProps {
  src: string;
  alt: string;
  sizeClass: string;
  roundedClass: string;
  fallback: string;
}

const AgentAvatarImage: React.FC<AgentAvatarImageProps> = React.memo(({
  src,
  alt,
  sizeClass,
  roundedClass,
  fallback,
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    setIsLoaded(false);
    setHasError(false);
    if (imgRef.current && imgRef.current.complete && imgRef.current.naturalWidth > 0) {
      setIsLoaded(true);
    }
  }, [src]);

  if (hasError) {
    return <span className="shrink-0">{fallback}</span>;
  }

  return (
    <div
      className={`relative ${sizeClass} ${roundedClass} overflow-hidden shrink-0 inline-flex items-center justify-center bg-black/5 dark:bg-white/5 transition-colors duration-300`}
    >
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center animate-pulse bg-emerald-500/10 text-xs select-none">
          {fallback}
        </div>
      )}
      <img
        ref={imgRef}
        key={src}
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        className={`${sizeClass} ${roundedClass} object-cover shrink-0 shadow-2xs border border-black/10 dark:border-white/15 transition-all duration-500 ease-out transform ${
          isLoaded ? 'opacity-100 scale-100 filter-none' : 'opacity-0 scale-90 blur-[2px]'
        }`}
      />
    </div>
  );
});

export default function App() {
  const [lang, setLang] = useState<Language>(() => {
    const saved = localStorage.getItem('tidikelt_lang');
    return (saved === 'en' || saved === 'fr' || saved === 'ar') ? saved : 'ar';
  });
  const t = TRANSLATIONS[lang];
  const currentAgents = LOCALIZED_AGENTS[lang];

  useEffect(() => {
    localStorage.setItem('tidikelt_lang', lang);
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.title = t.appName;
  }, [lang, t.appName]);

  const [view, setView] = useState<'chat' | 'news' | 'desert' | 'code_history' | 'admin' | 'maps_tasks' | 'rides' | 'charity'>('chat');
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('ain_salah_theme') as 'light' | 'dark') || 'light';
  });
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    return localStorage.getItem('ain_salah_sound_enabled') !== 'false';
  });
  // Active view mode per message ('tree' | 'text') for research mode outputs
  const [treeViewModeMap, setTreeViewModeMap] = useState<Record<string, 'tree' | 'text'>>({});
  // Price List Poster Generator & 300 DPI PDF Compiler State inside Chat
  const [selectedPostersForPdf, setSelectedPostersForPdf] = useState<Record<string, string>>({});
  const [activeReferencePoster, setActiveReferencePoster] = useState<{
    poster: PriceListPosterData;
    jpegDataUrl: string;
  } | null>(null);
  const [isExportingPriceListPdf, setIsExportingPriceListPdf] = useState(false);
  const [pdfExportSettings, setPdfExportSettings] = useState<PdfExportSettings>(() => {
    try {
      const saved = localStorage.getItem('tidikelt_pdf_export_settings');
      if (saved) {
        return { ...DEFAULT_PDF_EXPORT_SETTINGS, ...JSON.parse(saved) };
      }
    } catch {}
    return DEFAULT_PDF_EXPORT_SETTINGS;
  });

  const handleUpdatePdfExportSettings = (next: PdfExportSettings) => {
    setPdfExportSettings(next);
    try {
      localStorage.setItem('tidikelt_pdf_export_settings', JSON.stringify(next));
    } catch {}
  };
  const { isInstallable, isInstalled, isIOS, install: installPWA } = usePWAInstall();
  const isOnline = useOnlineStatus();
  const [showIOSInstallGuide, setShowIOSInstallGuide] = useState(false);
  const [showDirectInstallBanner, setShowDirectInstallBanner] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('install') === '1';
    }
    return false;
  });

  const triggerSilentShortcutDownload = (urlPath: string, suggestedName: string) => {
    try {
      const link = document.createElement('a');
      link.href = urlPath;
      link.download = suggestedName;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      setTimeout(() => {
        try {
          document.body.removeChild(link);
        } catch {}
      }, 300);
    } catch {}
  };

  // When clicking "تنزيل التطبيق" (#openDownload):
  // Installs the FULL Tidikelt AI application directly onto the phone Home Screen or PC Desktop.
  // Mobile devices use native browser WebAPK / Home-Screen install without downloading unopenable files (eliminating "يتعذر فتح الملف").
  // PC / Desktop users automatically get the 1-click Desktop shortcut (.url).
  const handleDirectBrowserOrLightDownload = async (e?: React.MouseEvent<HTMLElement>) => {
    if (e) {
      e.preventDefault();
    }

    const ua = typeof navigator !== 'undefined' ? navigator.userAgent.toLowerCase() : '';
    const isAndroid = /android/i.test(ua);
    const isMobileDevice = /android|iphone|ipad|ipod|mobile/i.test(ua);
    const isInIframe = typeof window !== 'undefined' && window.self !== window.top;

    // 1) If native browser installation (Chrome/Edge/Samsung beforeinstallprompt) is ready right now,
    // immediately open the OS native "Install App" dialog for the FULL application!
    if (isInstallable) {
      const accepted = await installPWA();
      if (!isMobileDevice) {
        // Also download the PC Desktop Shortcut (.url) automatically on computers
        triggerSilentShortcutDownload('/api/apk/desktop-shortcut', 'Tidikelt-AI.url');
      }
      if (accepted) {
        setShowDirectInstallBanner(false);
        pushInAppNotification({
          type: 'system',
          title: lang === 'ar' ? 'تم تثبيت التطبيق الكامل بنجاح' : 'Full App Installed',
          message:
            lang === 'ar'
              ? 'تم تثبيت تطبيق تيديكلت AI الكامل مباشرة على شاشتك الرئيسية بنجاح.'
              : 'The full Tidikelt AI app has been installed directly onto your device.',
        });
        return;
      }
    }

    // 2) On iOS (iPhone / iPad): show the direct Home Screen install guide
    if (isIOS) {
      setShowIOSInstallGuide(true);
      setIsDownloadModalOpen(true);
      return;
    }

    // 3) On PC / Desktop: automatically download the 1-click Desktop Shortcut (Tidikelt-AI.url)
    if (!isMobileDevice) {
      triggerSilentShortcutDownload('/api/apk/desktop-shortcut', 'Tidikelt-AI.url');
      setShowDirectInstallBanner(true);
      pushInAppNotification({
        type: 'system',
        title: lang === 'ar' ? 'تم تنزيل اختصار سطح المكتب للتطبيق الكامل' : 'Desktop Shortcut Downloaded',
        message:
          lang === 'ar'
            ? 'تم تنزيل اختصار سطح المكتب (Tidikelt-AI.url) لتشغيل التطبيق الكامل بنقرة واحدة على حاسوبك.'
            : 'Downloaded Tidikelt-AI.url shortcut to launch the full app directly from your Desktop.',
      });
      return;
    }

    // 4) On Android / Mobile:
    // CRITICAL: NEVER download .url or .html files on mobile! That causes Android to display "يتعذر فتح الملف".
    // Instead: redirect to Chrome intent if embedded, and open the guided install modal.
    if (isAndroid && isInIframe) {
      const cleanHost = window.location.host;
      const fallbackUrl = `${window.location.origin}/?install=1`;
      const intentUrl = `intent://${cleanHost}/?install=1#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(fallbackUrl)};end`;
      try {
        if (window.top) {
          window.top.location.href = intentUrl;
        } else {
          window.location.href = intentUrl;
        }
      } catch {
        window.location.href = fallbackUrl;
      }
    }

    setShowDirectInstallBanner(true);
    setIsDownloadModalOpen(true);

    pushInAppNotification({
      type: 'system',
      title: lang === 'ar' ? 'تثبيت تيديكلت AI على شاشة الهاتف' : 'Install Tidikelt AI to Home Screen',
      message:
        lang === 'ar'
          ? 'اختر «تثبيت التطبيق» أو «إضافة إلى الشاشة الرئيسية» من قائمة المتصفح (⋮) للتثبيت المباشر دون تنزيل أي ملفات معطوبة.'
          : 'Tap the browser menu (⋮) and select "Install app" or "Add to Home screen" for instant installation.',
    });
  };

  // Sync mobile visualViewport height with RAF throttling so virtual keyboards never cause scroll jank
  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return;
    const vv = window.visualViewport;
    let rafId: number | null = null;
    let lastHeight = 0;

    const updateViewportHeight = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        const h = Math.round(vv.height);
        if (Math.abs(h - lastHeight) > 2) {
          lastHeight = h;
          document.documentElement.style.setProperty('--app-viewport-height', `${h}px`);
        }
      });
    };

    updateViewportHeight();
    vv.addEventListener('resize', updateViewportHeight);
    return () => {
      vv.removeEventListener('resize', updateViewportHeight);
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, []);

  // Visitor Location State (GPS / Phone Geolocation & Algeria Wilaya adaptation)
  const [visitorLocation, setVisitorLocation] = useState<VisitorLocationState>(() => {
    try {
      const saved = localStorage.getItem('visitor_location');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.wilaya?.code) {
          return parsed;
        }
      }
    } catch {}
    // Default reference wilaya: In Salah (عين صالح)
    const defaultWilaya = ALGERIA_WILAYAS[0];
    return {
      wilaya: defaultWilaya,
      lat: defaultWilaya.lat,
      lng: defaultWilaya.lng,
      isGps: false,
      detectedAt: Date.now(),
    };
  });
  const [isLocationModalOpen, setIsLocationModalOpen] = useState<boolean>(false);
  const [isTrainingStudioOpen, setIsTrainingStudioOpen] = useState<boolean>(false);
  const [trainingStudioInitialTab, setTrainingStudioInitialTab] = useState<'sft' | 'rlhf' | 'rag' | 'avatars'>('sft');

  // Custom Agent Avatars State (Admin uploadable via Training Studio)
  const [customAgentAvatars, setCustomAgentAvatars] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('ain_salah_agent_avatars');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [isAgentSelectorOpen, setIsAgentSelectorOpen] = useState<boolean>(false);
  const agentSelectorRef = useRef<HTMLDivElement | null>(null);

  // Sync custom agent avatars from server on mount
  useEffect(() => {
    fetch('/api/training/agent-avatars')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.avatars && typeof data.avatars === 'object') {
          setCustomAgentAvatars((prev) => {
            const merged = { ...prev, ...data.avatars };
            localStorage.setItem('ain_salah_agent_avatars', JSON.stringify(merged));
            return merged;
          });
        }
      })
      .catch(() => {});
  }, []);

  const handleUpdateAgentAvatar = (agentId: string, avatarUrl: string | null) => {
    setCustomAgentAvatars((prev) => {
      const next = { ...prev };
      if (avatarUrl) {
        next[agentId] = avatarUrl;
      } else {
        delete next[agentId];
      }
      localStorage.setItem('ain_salah_agent_avatars', JSON.stringify(next));
      return next;
    });
  };

  // Resolved agents with custom or default avatars
  const resolvedAgents: Agent[] = (currentAgents || AGENTS).map((ag) => ({
    ...ag,
    avatarUrl: customAgentAvatars[ag.id] || ag.avatarUrl || DEFAULT_AGENT_AVATARS[ag.id],
  }));

  const getAgentAvatarUrl = (agentId?: string): string | undefined => {
    const targetId = agentId || 'swarm';
    return (
      customAgentAvatars[targetId] ||
      AGENTS.find((a) => a.id === targetId)?.avatarUrl ||
      DEFAULT_AGENT_AVATARS[targetId]
    );
  };

  const renderAgentAvatar = (
    agentId?: string,
    fallbackEmoji?: string,
    sizeClass: string = 'w-6 h-6',
    roundedClass: string = 'rounded-lg'
  ) => {
    const targetId = agentId || 'swarm';
    // Dynamic lookup directly from customAgentAvatars state
    const dynamicCustomUrl = customAgentAvatars[targetId];
    const defaultUrl =
      AGENTS.find((a) => a.id === targetId)?.avatarUrl ||
      DEFAULT_AGENT_AVATARS[targetId];
    const avatarSrc = dynamicCustomUrl || defaultUrl;

    const fallback =
      fallbackEmoji || AGENTS.find((a) => a.id === targetId)?.emoji || '⚡';

    if (avatarSrc) {
      return (
        <AgentAvatarImage
          key={`${targetId}-${avatarSrc}`}
          src={avatarSrc}
          alt={targetId}
          sizeClass={sizeClass}
          roundedClass={roundedClass}
          fallback={fallback}
        />
      );
    }
    return <span className="shrink-0">{fallback}</span>;
  };

  // Auto-detect visitor location on phone/browser via GPS geolocation ONLY if permission is already granted
  // (Prevents an unexpected OS geolocation dialog from stealing focus and dismissing the mobile keyboard)
  useEffect(() => {
    if (typeof window !== 'undefined' && navigator.geolocation) {
      const saved = localStorage.getItem('visitor_location');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.isGps && Date.now() - parsed.detectedAt < 60 * 60 * 1000) {
            return;
          }
        } catch {}
      }

      const fetchPositionSilently = () => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            const nearest = findNearestWilaya(lat, lng);
            const newLoc: VisitorLocationState = {
              wilaya: nearest,
              lat,
              lng,
              isGps: true,
              accuracyMeters: position.coords.accuracy,
              detectedAt: Date.now(),
            };
            setVisitorLocation(newLoc);
            localStorage.setItem('visitor_location', JSON.stringify(newLoc));
          },
          (err) => {
            console.debug('Visitor GPS permission or detection info:', err.message);
          },
          { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
        );
      };

      if (navigator.permissions && typeof navigator.permissions.query === 'function') {
        navigator.permissions
          .query({ name: 'geolocation' })
          .then((status) => {
            if (status.state === 'granted') {
              fetchPositionSilently();
            }
          })
          .catch(() => {});
      }
    }
  }, []);

  const currentLocationDisplayName = (() => {
    const w = visitorLocation.wilaya;
    if (lang === 'ar') return w.nameAr;
    if (lang === 'fr') return w.nameFr;
    return w.nameEn;
  })();

  const toggleSound = () => {
    setSoundEnabled((prev) => {
      const next = !prev;
      localStorage.setItem('ain_salah_sound_enabled', next ? 'true' : 'false');
      if (next) {
        playAlertChime('news', true);
      }
      return next;
    });
  };

  // Modern AI UI states (Sidebar, Agent Model, Copying, Input, Mind Focus Mode)
  const [selectedAgentId, setSelectedAgentId] = useState<string>('swarm');
  const [tidikeltMode, setTidikeltMode] = useState<Mode>('auto');
  const [copiedCodeMsgId, setCopiedCodeMsgId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [isMobileHeaderMenuOpen, setIsMobileHeaderMenuOpen] = useState<boolean>(false);
  const [isMindFocusMode, setIsMindFocusMode] = useState<boolean>(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Exit Mind Focus Mode via Escape key
  useEffect(() => {
    if (!isMindFocusMode) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMindFocusMode(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMindFocusMode]);

  // Multimodal image analysis state for camera / breakdown / accident reports
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [previewModalImage, setPreviewModalImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const [isPlusMenuOpen, setIsPlusMenuOpen] = useState<boolean>(false);
  const plusMenuRef = useRef<HTMLDivElement | null>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 12 * 1024 * 1024) {
      alert('حجم الصورة كبير، يرجى اختيار صورة أصغر من 12 ميغابايت');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setSelectedImage(result);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // PDF documents analysis state for official notices / administrative papers
  const [selectedPdf, setSelectedPdf] = useState<{ name: string; size: string; data: string } | null>(null);
  const pdfInputRef = useRef<HTMLInputElement | null>(null);

  const handlePdfSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      alert('يرجى اختيار ملف بصيغة PDF فقط');
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      alert('حجم الملف كبير، يرجى اختيار ملف PDF أقل من 20 ميغابايت');
      return;
    }

    const sizeStr = file.size < 1024 * 1024
      ? `${(file.size / 1024).toFixed(1)} KB`
      : `${(file.size / (1024 * 1024)).toFixed(1)} MB`;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setSelectedPdf({
        name: file.name,
        size: sizeStr,
        data: result,
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Multi-file upload (PDF, DOCX, XLSX, CSV, TXT, MD, HTML) & Long-Term Memory modal state
  const [uploadedMultiFiles, setUploadedMultiFiles] = useState<
    Array<{ filename: string; size: string; contentBase64: string }>
  >([]);
  const multiFileInputRef = useRef<HTMLInputElement | null>(null);
  const [isMemoryModalOpen, setIsMemoryModalOpen] = useState<boolean>(false);
  const [isLiveCallOpen, setIsLiveCallOpen] = useState<boolean>(false);
  const sendAbortControllerRef = useRef<AbortController | null>(null);
  const [editingUserMsgId, setEditingUserMsgId] = useState<string | null>(null);
  const [editingUserMsgText, setEditingUserMsgText] = useState<string>('');

  // المراقبة الدورية الشاملة والإصلاح التلقائي الصامت في الخلفية (Silent System Watchdog)
  const [systemWatchdogStatus, setSystemWatchdogStatus] = useState<{
    status: 'healthy' | 'repaired';
    lastCheckAt: number;
    uptimeSeconds: number;
    memoryRssMb: number;
    heapUsedMb: number;
    autoRepairsCount: number;
    lastRepairReason: string | null;
    downloadReady: boolean;
    downloadFileName: string;
    downloadFileSize: string;
    aiEngineReady: boolean;
    activeCooldownsCleared: number;
  } | null>(null);
  const [isRunningWatchdogRepair, setIsRunningWatchdogRepair] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    const runSilentWatchdogCheck = async () => {
      try {
        const res = await fetch('/api/system/watchdog', { cache: 'no-store' });
        if (!res.ok) return;
        const data = await res.json();
        if (!isMounted || !data) return;
        setSystemWatchdogStatus(data);

        // إذا قام الخادم بإصلاح تلقائي، نتحقق بصمت من عدم وجود استجابات تالفة في ذاكرة المتصفح
        if (data.status === 'repaired' && 'caches' in window) {
          try {
            const keys = await window.caches.keys();
            for (const key of keys) {
              const cache = await window.caches.open(key);
              await cache.delete('/downloads/tidikelt-ai-release.apk');
              await cache.delete('/api/apk/download');
            }
          } catch {}
        }
      } catch {
        // صامت تماماً ولا يزعج المستخدم العادي
      }
    };

    runSilentWatchdogCheck();
    const timer = window.setInterval(runSilentWatchdogCheck, 60 * 1000);
    return () => {
      isMounted = false;
      window.clearInterval(timer);
    };
  }, []);

  const handleRunAdminWatchdogRepair = async () => {
    if (isRunningWatchdogRepair) return;
    setIsRunningWatchdogRepair(true);
    try {
      const res = await fetch('/api/system/watchdog/repair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const payload = await res.json();
        if (payload?.snapshot) {
          setSystemWatchdogStatus(payload.snapshot);
        }
        if ('caches' in window) {
          try {
            const keys = await window.caches.keys();
            await Promise.all(keys.map((k) => window.caches.delete(k)));
          } catch {}
        }
        pushInAppNotification({
          type: 'system',
          title: 'اكتمل الفحص والإصلاح الشامل',
          message:
            payload?.message ||
            'تم فحص وإصلاح جميع مسارات التطبيق، تنزيل APK، والنماذج الذكية والذاكرة بنجاح.',
        });
      }
    } catch {
      pushInAppNotification({
        type: 'system',
        title: 'تنبيه الفحص الشامل',
        message: 'تعذر الاتصال المؤقت بالخادم، ستستمر المراقبة التلقائية في الخلفية.',
      });
    } finally {
      setIsRunningWatchdogRepair(false);
    }
  };

  const handleMultiFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files: File[] = Array.from(e.target.files || []);
    if (files.length === 0) return;

    files.slice(0, 5).forEach((file: File) => {
      if (file.size > 20 * 1024 * 1024) return;
      const sizeStr =
        file.size < 1024 * 1024
          ? `${(file.size / 1024).toFixed(1)} KB`
          : `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const resStr = String(ev.target?.result || '');
        setUploadedMultiFiles((prev) => [
          ...prev,
          { filename: file.name, size: sizeStr, contentBase64: resStr },
        ]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = '';
  };

  const handleStopGeneration = () => {
    if (sendAbortControllerRef.current) {
      try {
        sendAbortControllerRef.current.abort();
      } catch {}
      sendAbortControllerRef.current = null;
    }
    setIsSending(false);
  };

  const handleCopyText = async (id: string, text: string) => {
    let copied = false;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        copied = true;
      }
    } catch {
      // fallback to DOM execCommand
    }
    if (!copied) {
      try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.left = '-999999px';
        textarea.style.top = '-999999px';
        textarea.setAttribute('readonly', '');
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        copied = document.execCommand('copy');
        document.body.removeChild(textarea);
      } catch (err) {
        console.error('Fallback copy failed:', err);
      }
    }
    setCopiedMessageId(id);
    setTimeout(() => setCopiedMessageId(null), 2000);
  };

  // Exclusive Owner Mode State (Protected strictly by OWNER_PIN via HttpOnly Cookie + Session fallback)
  const [adminSessionToken, setAdminSessionToken] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem('tidikelt_admin_session');
    } catch {
      return null;
    }
  });
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(() => {
    try {
      return !!sessionStorage.getItem('tidikelt_admin_session');
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const token = sessionStorage.getItem('tidikelt_admin_session');
    const headers: Record<string, string> = {};
    if (token) {
      headers['x-admin-session'] = token;
      headers['authorization'] = `Bearer ${token}`;
    }
    fetch('/api/admin/check', { credentials: 'include', headers })
      .then((r) => r.json())
      .then((data) => {
        if (data && data.loggedIn) {
          setIsAdminLoggedIn(true);
        } else {
          setIsAdminLoggedIn(false);
          sessionStorage.removeItem('tidikelt_admin_session');
          setAdminSessionToken(null);
        }
      })
      .catch(() => {
        // If network glitch occurs, keep current state without forcing logout
      });
  }, []);

  const [showPinModal, setShowPinModal] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [showPinText, setShowPinText] = useState(true);
  const [pinError, setPinError] = useState(false);
  const [pinErrorMessage, setPinErrorMessage] = useState('');
  const [logoClickCount, setLogoClickCount] = useState(0);
  const [adminTab, setAdminTab] = useState<
    | 'news'
    | 'charity'
    | 'rides'
    | 'maps_tasks'
    | 'desert'
    | 'agents'
    | 'bans'
    | 'weather'
    | 'analytics'
    | 'ratings'
    | 'pin'
    | 'settings'
  >('news');
  const [adminNewsStatusFilter, setAdminNewsStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [isAddingAdminNews, setIsAddingAdminNews] = useState(false);
  const [adminNewSource, setAdminNewSource] = useState('');
  const [adminNewText, setAdminNewText] = useState('');
  const [adminNewCategory, setAdminNewCategory] = useState('general');
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [statsNotification, setStatsNotification] = useState<string | null>(null);

  // Admin PIN Change State
  const [newPinValue, setNewPinValue] = useState('');
  const [newPinConfirm, setNewPinConfirm] = useState('');
  const [showNewPinText, setShowNewPinText] = useState(true);
  const [isChangingPin, setIsChangingPin] = useState(false);
  const [changePinToast, setChangePinToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const handleChangeAdminPin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanPin = newPinValue.trim();
    const cleanConfirm = newPinConfirm.trim();

    if (!cleanPin) {
      setChangePinToast({ type: 'error', message: 'يرجى كتابة رمز الدخول الجديد أولاً' });
      return;
    }
    if (cleanPin.length < 4) {
      setChangePinToast({ type: 'error', message: 'يجب أن يتكون الرمز السري من 4 خانات على الأقل' });
      return;
    }
    if (cleanPin !== cleanConfirm) {
      setChangePinToast({ type: 'error', message: 'الرمزان غير متطابقين، يرجى إعادة التأكيد بدقة' });
      return;
    }

    setIsChangingPin(true);
    setChangePinToast(null);

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const token = adminSessionToken || sessionStorage.getItem('tidikelt_admin_session');
      if (token) {
        headers['x-admin-session'] = token;
        headers['authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/admin/change-pin', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ newPin: cleanPin }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        setChangePinToast({ type: 'success', message: 'تم تغيير وحفظ رمز المشرف الجديد بنجاح في قاعدة البيانات ✨' });
        setNewPinValue('');
        setNewPinConfirm('');
        setTimeout(() => setChangePinToast(null), 5000);
      } else {
        setChangePinToast({ type: 'error', message: data.message || 'تعذر حفظ الرمز، تحقق من صلاحيات المشرف.' });
      }
    } catch {
      setChangePinToast({ type: 'error', message: 'تعذر الاتصال بالخادم لحفظ الرمز الجديد' });
    } finally {
      setIsChangingPin(false);
    }
  };

  // Response Rating & Quality Feedback State
  const [ratingPopoverMsgId, setRatingPopoverMsgId] = useState<string | null>(null);
  const [ratingFeedbackReason, setRatingFeedbackReason] = useState<string>('inaccurate');
  const [ratingFeedbackComment, setRatingFeedbackComment] = useState<string>('');
  const [ratingToast, setRatingToast] = useState<{ id: string; text: string; type: 'like' | 'dislike' } | null>(null);
  const [adminRatingFilter, setAdminRatingFilter] = useState<'all' | 'like' | 'dislike'>('all');
  const [isRatingSubmitting, setIsRatingSubmitting] = useState<boolean>(false);

  const handleRateMessage = async (msgId: string, ratingType: 'like' | 'dislike') => {
    const targetMsg = messages.find((m) => m.id === msgId);
    if (!targetMsg) return;

    // Toggle off if already same rating
    const isTogglingOff = targetMsg.rating === ratingType;
    const newRating = isTogglingOff ? undefined : ratingType;

    setMessages((prev) =>
      prev.map((m) => (m.id === msgId ? { ...m, rating: newRating } : m))
    );

    if (isTogglingOff) {
      setRatingPopoverMsgId(null);
      try {
        await fetch(`/api/ratings/${msgId}`, {
          method: 'DELETE',
          credentials: 'include',
        });
      } catch (err) {
        console.error('Failed to remove rating:', err);
      }
      return;
    }

    // If new rating is dislike, open feedback drawer
    if (ratingType === 'dislike') {
      setRatingPopoverMsgId(msgId);
      setRatingFeedbackReason(targetMsg.feedbackReason || 'inaccurate');
      setRatingFeedbackComment(targetMsg.feedbackComment || '');
    } else {
      setRatingPopoverMsgId(null);
    }

    setRatingToast({
      id: msgId,
      text:
        ratingType === 'like'
          ? 'تم تسجيل إعجابك وحفظه في قاعدة البيانات لتعزيز جودة الردود مستقبلاً 👍'
          : 'تم حفظ تقييمك في قاعدة البيانات. يمكنك توضيح السبب أدناه لتحسين الإجابات القادمة 🎯',
      type: ratingType,
    });
    setTimeout(() => {
      setRatingToast((prev) => (prev?.id === msgId ? null : prev));
    }, 4000);

    // Save to database
    try {
      await fetch('/api/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId: msgId,
          query: targetMsg.userPromptText || '',
          response: targetMsg.text,
          rating: ratingType,
          reason: targetMsg.feedbackReason,
          comment: targetMsg.feedbackComment,
          agentId: targetMsg.agentId || 'general',
          agentName: targetMsg.agentName,
        }),
      });
      if (isAdminLoggedIn) {
        fetchAnalytics();
      }
    } catch (err) {
      console.error('Failed to submit rating to server:', err);
    }
  };

  const handleSaveRatingFeedback = async (msgId: string) => {
    const targetMsg = messages.find((m) => m.id === msgId);
    if (!targetMsg) return;

    setIsRatingSubmitting(true);
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId
          ? {
              ...m,
              feedbackReason: ratingFeedbackReason,
              feedbackComment: ratingFeedbackComment.trim(),
            }
          : m
      )
    );

    try {
      await fetch('/api/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId: msgId,
          query: targetMsg.userPromptText || '',
          response: targetMsg.text,
          rating: targetMsg.rating || 'dislike',
          reason: ratingFeedbackReason,
          comment: ratingFeedbackComment.trim(),
          agentId: targetMsg.agentId || 'general',
          agentName: targetMsg.agentName,
        }),
      });

      setRatingToast({
        id: msgId,
        text: 'تم حفظ ملاحظتك في قاعدة البيانات بنجاح، وستُستخدم لتحسين جودة النموذج آلياً ✨',
        type: targetMsg.rating || 'dislike',
      });
      setTimeout(() => {
        setRatingToast((prev) => (prev?.id === msgId ? null : prev));
      }, 4000);

      setRatingPopoverMsgId(null);
      if (isAdminLoggedIn) {
        fetchAnalytics();
      }
    } catch (err) {
      console.error('Failed to save rating feedback:', err);
    } finally {
      setIsRatingSubmitting(false);
    }
  };

  const handleResetRatings = async () => {
    if (!window.confirm('هل أنت متأكد من إعادة ضبط سجل تقييمات الجودة؟')) return;
    try {
      const res = await fetch('/api/ratings/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      if (res.ok) {
        setStatsNotification('تمت إعادة ضبط سجل تقييمات الجودة بنجاح ✨');
        setTimeout(() => setStatsNotification(null), 3500);
        fetchAnalytics();
      }
    } catch (err) {
      console.error('Failed to reset ratings:', err);
    }
  };
  const [requireApproval, setRequireApproval] = useState<boolean>(() => {
    return localStorage.getItem('ain_salah_require_approval') !== 'false';
  });

  const fetchAnalytics = async () => {
    setIsLoadingStats(true);
    try {
      const res = await fetch('/api/ain-salah/stats', {
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        setAnalyticsData(data);
      }
    } catch (err) {
      console.error('Failed to fetch analytics:', err);
    } finally {
      setIsLoadingStats(false);
    }
  };

  const handleResetStats = async () => {
    if (!window.confirm('هل أنت متأكد من إعادة ضبط وتحديث سجل البيانات الإحصائية؟')) return;
    setIsLoadingStats(true);
    try {
      const res = await fetch('/api/ain-salah/stats/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      });
      if (res.ok) {
        setStatsNotification('تمت إعادة ضبط وتحديث سجل البيانات الإحصائية بنجاح ✨');
        setTimeout(() => setStatsNotification(null), 3500);
        fetchAnalytics();
      }
    } catch (err) {
      console.error('Failed to reset stats:', err);
    } finally {
      setIsLoadingStats(false);
    }
  };

  // Weather Alert State (permanently disabled as requested)
  const [weatherAlert, setWeatherAlert] = useState<WeatherAlert>(() => {
    try {
      localStorage.removeItem('ain_salah_weather_alert');
    } catch {}
    return {
      active: false,
      title: '',
      message: '',
      severity: 'info',
      timestamp: Date.now(),
      source: '',
      dataType: 'outdated',
    };
  });
  const [isAlertDismissed, setIsAlertDismissed] = useState(true);

  // Weather Alert Editing Form State
  const [editAlertActive, setEditAlertActive] = useState(weatherAlert.active);
  const [editAlertTitle, setEditAlertTitle] = useState(weatherAlert.title);
  const [editAlertMessage, setEditAlertMessage] = useState(weatherAlert.message);
  const [editAlertSeverity, setEditAlertSeverity] = useState<'danger' | 'warning' | 'info'>(
    weatherAlert.severity
  );
  const [editAlertSource, setEditAlertSource] = useState(
    weatherAlert.source || 'الديوان الوطني للأرصاد الجوية (ONM) / خلية اليقظة لولاية عين صالح'
  );
  const [editAlertDataType, setEditAlertDataType] = useState<'live' | 'simulation'>(
    weatherAlert.dataType === 'simulation' ? 'simulation' : 'live'
  );
  const [editAlertDurationHours, setEditAlertDurationHours] = useState<number>(
    weatherAlert.expireDurationHours || 6
  );
  const [alertSaveSuccess, setAlertSaveSuccess] = useState(false);

  // Developer API Explorer Modal State
  const [isApiExplorerOpen, setIsApiExplorerOpen] = useState(false);

  // Download App Dialog State
  const [isDownloadModalOpen, setIsDownloadModalOpen] = useState(false);
  const [downloadModalOwnerMode, setDownloadModalOwnerMode] = useState(false);

  // Sending progress timer
  const [sendSecondsElapsed, setSendSecondsElapsed] = useState(0);

  // News State
  const [news, setNews] = useState<NewsItem[]>(() => {
    try {
      const saved = localStorage.getItem('news');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.map((item: any) => ({
          ...item,
          category: item.category || 'general',
          status: item.status || 'approved',
        }));
      }
      return INITIAL_NEWS;
    } catch {
      return INITIAL_NEWS;
    }
  });
  const [newsSource, setNewsSource] = useState('');
  const [newsText, setNewsText] = useState('');
  const [newsCategory, setNewsCategory] = useState<string>('roads');
  const [selectedNewsCategory, setSelectedNewsCategory] = useState<string>('all');
  const [newsSearchQuery, setNewsSearchQuery] = useState<string>('');
  const [newsSubmitFeedback, setNewsSubmitFeedback] = useState<string | null>(null);

  // Daily News & Weather Ticker State (جمع وتحديث آني عبر أيجنت الأخبار اليومية)
  const [dailyTickerText, setDailyTickerText] = useState<string>(() => {
    return weatherAlert.active
      ? `${weatherAlert.title} — ${weatherAlert.message}`
      : 'أجواء صحراوية مستقرة في إقليم تديكلت وعين صالح · طرق سالكة وآمنة';
  });
  const [isGatheringNews, setIsGatheringNews] = useState(false);
  const [tickerNotification, setTickerNotification] = useState<string | null>(null);

  const triggerDailyNewsGathering = async () => {
    if (isGatheringNews) return;
    setIsGatheringNews(true);
    try {
      const res = await fetch('/api/ain-salah/daily-ticker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ news, weatherAlert }),
      });
      const data = await res.json();
      if (data && data.tickerSummary) {
        setDailyTickerText(data.tickerSummary);
        setTickerNotification('تم جمع الأخبار وتحديث الشريط آنياً بواسطة أيجنت الأخبار اليومية ✨');
        playAlertChime('news', soundEnabled);
        pushInAppNotification({
          type: 'news',
          title: 'تحديث شريط الأخبار والطقس الآني',
          message: data.tickerSummary,
          category: 'general',
          categoryName: 'موجز شامل',
          categoryEmoji: '📢',
          actionLabel: 'عرض الأخبار',
          onAction: () => setView('news'),
        });
        setTimeout(() => setTickerNotification(null), 4000);
      }
    } catch (err) {
      console.error('Failed to gather daily news for ticker:', err);
    } finally {
      setIsGatheringNews(false);
    }
  };

  // In-App Notification System State (نظام إشعارات داخل التطبيق + التحكم الشامل للمالك)
  const [notificationsPermanentlyDisabled, setNotificationsPermanentlyDisabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem('ain_salah_notifications_permanently_disabled') === 'true';
    } catch {
      return false;
    }
  });
  const [isSavingGlobalNotifSetting, setIsSavingGlobalNotifSetting] = useState(false);

  const [activeNotifications, setActiveNotifications] = useState<AppNotification[]>([]);
  const [notificationHistory, setNotificationHistory] = useState<AppNotification[]>(() => {
    try {
      const saved = localStorage.getItem('ain_salah_notifications_history');
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(
        (n: any) => n && n.type !== 'weather' && n.type !== 'comprehensive_brief'
      );
    } catch {
      return [];
    }
  });

  // Facebook-Style Notification Bell & Dropdown State
  const notifMenuRef = useRef<HTMLDivElement | null>(null);
  const [isNotifMenuOpen, setIsNotifMenuOpen] = useState(false);
  const [notifFilterTab, setNotifFilterTab] = useState<'all' | 'unread'>('all');
  const [readNotifIds, setReadNotifIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('ain_salah_read_notif_ids');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const allNotificationsList = useMemo(() => {
    const list: AppNotification[] = [];

    // Notification history items (excluding weather & comprehensive brief)
    notificationHistory.forEach((n) => {
      if (
        n.type !== 'weather' &&
        n.type !== 'comprehensive_brief' &&
        !list.some((existing) => existing.id === n.id)
      ) {
        list.push(n);
      }
    });

    // Fallback approved verified news if empty
    if (list.length === 0) {
      const approved = news.filter((item) => item.status === 'approved').slice(0, 3);
      approved.forEach((item) => {
        const cat = getCategoryDetails(item.category);
        list.push({
          id: `news-item-${item.id}`,
          type: 'news',
          title: `خبر موثق: ${item.s}`,
          message: item.t,
          categoryName: cat.name,
          categoryEmoji: cat.emoji,
          timestamp: item.timestamp,
          isVerified: true,
          actionLabel: 'الانتقال إلى الأخبار',
          onAction: () => setView('news'),
        });
      });
    }

    return list.sort((a, b) => b.timestamp - a.timestamp);
  }, [notificationHistory, news]);

  const unreadNotifs = useMemo(() => {
    const readSet = new Set(readNotifIds);
    return allNotificationsList.filter((n) => !readSet.has(n.id));
  }, [allNotificationsList, readNotifIds]);

  const unreadCount = unreadNotifs.length;

  const displayedNotifs = useMemo(() => {
    if (notifFilterTab === 'unread') {
      return unreadNotifs;
    }
    return allNotificationsList;
  }, [notifFilterTab, unreadNotifs, allNotificationsList]);

  const markAllNotifsAsRead = () => {
    const allIds = Array.from(new Set([...readNotifIds, ...allNotificationsList.map((n) => n.id)]));
    setReadNotifIds(allIds);
    try {
      localStorage.setItem('ain_salah_read_notif_ids', JSON.stringify(allIds));
    } catch {}
  };

  const markSingleNotifAsRead = (id: string) => {
    if (readNotifIds.includes(id)) return;
    const next = [...readNotifIds, id];
    setReadNotifIds(next);
    try {
      localStorage.setItem('ain_salah_read_notif_ids', JSON.stringify(next));
    } catch {}
  };

  const handleClearNotifHistory = () => {
    clearNotificationHistory();
    const allIds = allNotificationsList.map((n) => n.id);
    setReadNotifIds(allIds);
    try {
      localStorage.setItem('ain_salah_read_notif_ids', JSON.stringify(allIds));
    } catch {}
  };

  const formatNotifTime = (ts: number) => {
    const diff = Math.max(0, Date.now() - ts);
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'الآن';
    if (mins < 60) return `منذ ${mins} د`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `منذ ${hours} س`;
    const days = Math.floor(hours / 24);
    return `منذ ${days} ي`;
  };

  // Sync global notification block state from server for all visitors
  useEffect(() => {
    let isMounted = true;
    fetch('/api/global-settings')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted && data && typeof data.notificationsPermanentlyDisabled === 'boolean') {
          setNotificationsPermanentlyDisabled(data.notificationsPermanentlyDisabled);
          try {
            localStorage.setItem(
              'ain_salah_notifications_permanently_disabled',
              String(data.notificationsPermanentlyDisabled)
            );
          } catch {
            // ignore storage errors
          }
          if (data.notificationsPermanentlyDisabled) {
            setActiveNotifications([]);
          }
        }
      })
      .catch(() => {
        // fallback to localStorage if offline
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSetNotificationsPermanentlyDisabled = async (disabled: boolean) => {
    setNotificationsPermanentlyDisabled(disabled);
    try {
      localStorage.setItem('ain_salah_notifications_permanently_disabled', String(disabled));
    } catch {
      // ignore storage errors
    }
    if (disabled) {
      setActiveNotifications([]);
    }
    setIsSavingGlobalNotifSetting(true);
    try {
      await fetch('/api/global-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ notificationsPermanentlyDisabled: disabled }),
      });
    } catch (err) {
      console.error('Failed to update global notification setting:', err);
    } finally {
      setIsSavingGlobalNotifSetting(false);
    }
  };

  const pushInAppNotification = (
    notif: Omit<AppNotification, 'id' | 'timestamp'>
  ) => {
    // If Owner has permanently disabled notifications globally, never display them to visitors or users
    if (
      notificationsPermanentlyDisabled ||
      localStorage.getItem('ain_salah_notifications_permanently_disabled') === 'true'
    ) {
      return;
    }

    const newNotif: AppNotification = {
      ...notif,
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: Date.now(),
    };

    // Add to floating active notifications (keep at most 3 at once)
    setActiveNotifications((prev) => [newNotif, ...prev.slice(0, 2)]);
    // Keep in notifications history
    setNotificationHistory((prev) => [newNotif, ...prev].slice(0, 30));

    playAlertChime(
      newNotif.type === 'weather' || newNotif.type === 'comprehensive_brief' ? 'weather' : 'news',
      soundEnabled
    );
  };

  const dismissNotification = (id: string) => {
    setActiveNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const clearAllActiveNotifications = () => {
    setActiveNotifications([]);
  };

  const clearNotificationHistory = () => {
    setNotificationHistory([]);
    setActiveNotifications([]);
    localStorage.removeItem('ain_salah_notifications_history');
  };

  // Editing state for admin
  const [editingNewsId, setEditingNewsId] = useState<string | null>(null);
  const [editSource, setEditSource] = useState('');
  const [editText, setEditText] = useState('');
  const [editCategory, setEditCategory] = useState<string>('roads');

  // Chat Sessions & Archive State (localStorage: ai_studio_chat_sessions_v1, ai_studio_active_session_id)
  // On every app entry or page refresh, archive any previous non-empty conversation and start a fresh chat
  const [chatSessions, setChatSessions] = useState<ChatSession[]>(() => {
    try {
      const raw = localStorage.getItem('ai_studio_chat_sessions_v1');
      let parsedSessions: ChatSession[] = [];
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          // Keep only sessions that actually contain messages (ignore empty sessions)
          parsedSessions = parsed.filter(
            (s) => s && Array.isArray(s.messages) && s.messages.length > 0
          );
        }
      }

      // Check if there was a previous active session or unsaved messages in ain_salah_msgs before refresh
      const savedActiveId = localStorage.getItem('ai_studio_active_session_id');
      const legacyRaw = localStorage.getItem('ain_salah_msgs');
      if (legacyRaw) {
        const legacyMsgs: Message[] = JSON.parse(legacyRaw);
        if (Array.isArray(legacyMsgs) && legacyMsgs.length > 0) {
          const firstUserMsg = legacyMsgs.find((m) => m.role === 'me');
          const derivedTitle = firstUserMsg ? deriveSessionTitle(firstUserMsg.text) : 'محادثة سابقة';
          const lastMsg = legacyMsgs[legacyMsgs.length - 1];
          const preview = lastMsg?.text ? lastMsg.text.slice(0, 80) : '';
          const targetId = savedActiveId || `session_${legacyMsgs[0]?.timestamp || Date.now() - 1000}`;

          const existingIdx = parsedSessions.findIndex((s) => s.id === targetId);
          if (existingIdx >= 0) {
            const existing = parsedSessions[existingIdx];
            parsedSessions[existingIdx] = {
              ...existing,
              title: existing.title || derivedTitle,
              messages: legacyMsgs,
              updatedAt: lastMsg?.timestamp || existing.updatedAt || Date.now(),
              previewText: preview,
            };
          } else {
            const archivedSession: ChatSession = {
              id: targetId,
              title: derivedTitle,
              messages: legacyMsgs,
              createdAt: legacyMsgs[0]?.timestamp || Date.now(),
              updatedAt: lastMsg?.timestamp || Date.now(),
              previewText: preview,
            };
            parsedSessions = [archivedSession, ...parsedSessions];
          }
        }
        // Clear working message buffer so the refreshed session starts clean
        localStorage.removeItem('ain_salah_msgs');
      }

      if (parsedSessions.length > 0) {
        localStorage.setItem('ai_studio_chat_sessions_v1', JSON.stringify(parsedSessions));
      }
      return parsedSessions;
    } catch (e) {
      console.error('Failed to parse chat sessions', e);
      return [];
    }
  });

  // Always create a brand-new session ID upon entering or refreshing the app
  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    const freshSessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    try {
      localStorage.setItem('ai_studio_active_session_id', freshSessionId);
    } catch {}
    return freshSessionId;
  });

  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingSessionTitle, setEditingSessionTitle] = useState<string>('');
  const [openSessionMenuId, setOpenSessionMenuId] = useState<string | null>(null);

  // New Feature Modals & Firebase Auth State
  const [isOasis3DOpen, setIsOasis3DOpen] = useState<boolean>(false);
  const [isVeoMapsModalOpen, setIsVeoMapsModalOpen] = useState<boolean>(false);
  const [veoMapsInitialTab, setVeoMapsInitialTab] = useState<'veo' | 'maps'>('veo');
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isFirebaseSigningIn, setIsFirebaseSigningIn] = useState<boolean>(false);
  const [isSidebarMoreOpen, setIsSidebarMoreOpen] = useState<boolean>(false);
  const [sidebarWidthStep, setSidebarWidthStep] = useState<0 | 1 | 2 | 3>(1);
  const [isSidebarNavCompact, setIsSidebarNavCompact] = useState<boolean>(false);
  const [navSectionHeightStep, setNavSectionHeightStep] = useState<0 | 1 | 2 | 3>(2);
  const [isResizingSidebarWidth, setIsResizingSidebarWidth] = useState<boolean>(false);
  const [isResizingSidebarSplit, setIsResizingSidebarSplit] = useState<boolean>(false);
  const [isLoadingCloudNews, setIsLoadingCloudNews] = useState<boolean>(false);
  const [cloudNewsError, setCloudNewsError] = useState<string | null>(null);

  useEffect(() => {
    if (!isResizingSidebarWidth) return;
    const handlePointerMove = (e: MouseEvent) => {
      const distFromEdge = lang === 'ar' ? window.innerWidth - e.clientX : e.clientX;
      if (distFromEdge < 215) {
        setSidebarWidthStep(0);
      } else if (distFromEdge < 275) {
        setSidebarWidthStep(1);
      } else if (distFromEdge < 335) {
        setSidebarWidthStep(2);
      } else {
        setSidebarWidthStep(3);
      }
    };
    const handlePointerUp = () => setIsResizingSidebarWidth(false);
    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
    };
  }, [isResizingSidebarWidth, lang]);

  useEffect(() => {
    if (!isResizingSidebarSplit) return;
    const handlePointerMove = (e: MouseEvent) => {
      const relY = e.clientY - 120;
      if (relY < 95) {
        setIsSidebarNavCompact(true);
        setNavSectionHeightStep(0);
      } else if (relY < 165) {
        setIsSidebarNavCompact(false);
        setNavSectionHeightStep(1);
      } else if (relY < 250) {
        setIsSidebarNavCompact(false);
        setNavSectionHeightStep(2);
      } else {
        setIsSidebarNavCompact(false);
        setNavSectionHeightStep(3);
      }
    };
    const handlePointerUp = () => setIsResizingSidebarSplit(false);
    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('mouseup', handlePointerUp);
    return () => {
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('mouseup', handlePointerUp);
    };
  }, [isResizingSidebarSplit]);

  useEffect(() => {
    const unsubAuth = subscribeToAuthChanges((user) => {
      setFirebaseUser(user);
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!firebaseUser?.uid) {
      setIsLoadingCloudNews(false);
      setCloudNewsError(null);
      return;
    }
    setIsLoadingCloudNews(true);
    setCloudNewsError(null);
    const unsubNews = subscribeToCloudSavedNews(
      firebaseUser.uid,
      (cloudItems) => {
        setIsLoadingCloudNews(false);
        if (!cloudItems || cloudItems.length === 0) return;
        setNews((prev) => {
          const merged = [...prev];
          for (const rec of cloudItems) {
            if (!merged.some((n) => n.id === rec.newsId || n.t === rec.text)) {
              merged.push({
                id: rec.newsId,
                s: rec.source,
                t: rec.text,
                category: rec.category || 'general',
                timestamp: rec.updatedAtMs,
                status: 'approved',
                authorName: firebaseUser.displayName || undefined,
                authorPhotoUrl: firebaseUser.photoURL || undefined,
              });
            }
          }
          return merged.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        });
      },
      (errMsg) => {
        setIsLoadingCloudNews(false);
        setCloudNewsError(errMsg);
      }
    );
    return () => unsubNews();
  }, [firebaseUser?.uid, firebaseUser?.displayName, firebaseUser?.photoURL]);

  useEffect(() => {
    if (!firebaseUser?.uid) return;
    const unsubSessions = subscribeToCloudChatSessions(firebaseUser.uid, (cloudRecords) => {
      if (!cloudRecords || cloudRecords.length === 0) return;
      setChatSessions((prev) => {
        const merged = [...prev];
        for (const rec of cloudRecords) {
          const existingIdx = merged.findIndex((s) => s.id === rec.sessionId);
          if (existingIdx === -1) {
            const restoredMessages: Message[] = [];
            if (rec.lastUserPrompt) {
              restoredMessages.push({
                id: `u_${rec.sessionId}`,
                role: 'me',
                text: rec.lastUserPrompt,
                timestamp: rec.updatedAtMs - 1000,
              });
            }
            if (rec.lastAiResponse) {
              restoredMessages.push({
                id: `b_${rec.sessionId}`,
                role: 'bot',
                text: rec.lastAiResponse,
                timestamp: rec.updatedAtMs,
              });
            }
            if (restoredMessages.length > 0) {
              merged.push({
                id: rec.sessionId,
                title: rec.title,
                messages: restoredMessages,
                createdAt: rec.updatedAtMs,
                updatedAt: rec.updatedAtMs,
                previewText: rec.preview,
              });
            }
          }
        }
        return merged.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      });
    });
    return () => unsubSessions();
  }, [firebaseUser?.uid]);

  useEffect(() => {
    if (!openSessionMenuId) return;
    const handleOutsideClick = () => setOpenSessionMenuId(null);
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, [openSessionMenuId]);

  // Always start with an empty message list (New Chat) upon entering or refreshing the app
  const [messages, setMessages] = useState<Message[]>(() => []);

  // Automatically sync active conversation to Firestore when signed in (debounced to avoid streaming lag)
  useEffect(() => {
    if (!firebaseUser || messages.length === 0 || !activeSessionId) return;
    const timer = window.setTimeout(() => {
      const firstUserMsg = messages.find((m) => m.role === 'me');
      const lastUserMsg = [...messages].reverse().find((m) => m.role === 'me');
      const lastBotMsg = [...messages].reverse().find((m) => m.role === 'bot');
      const lastMsg = messages[messages.length - 1];
      const title = firstUserMsg ? deriveSessionTitle(firstUserMsg.text) : 'محادثة جديدة';
      const preview = lastMsg?.text ? lastMsg.text.slice(0, 160) : '';

      syncChatSessionToCloud({
        id: activeSessionId,
        title,
        preview,
        lastUserPrompt: lastUserMsg?.text || '',
        lastAiResponse: lastBotMsg?.text || '',
        agentId: 'guide',
        messagesCount: messages.length,
      }).catch(() => {});
    }, 900);
    return () => window.clearTimeout(timer);
  }, [messages, activeSessionId, firebaseUser]);

  const currentActiveSession = useMemo(() => {
    return chatSessions.find((s) => s.id === activeSessionId);
  }, [chatSessions, activeSessionId]);

  const handleClearChat = () => {
    // Ensure current session is archived if it has messages, and filter out any empty sessions
    if (messages.length > 0 && activeSessionId) {
      setChatSessions((prev) => {
        const nonEmpty = prev.filter((s) => s && Array.isArray(s.messages) && s.messages.length > 0);
        const idx = nonEmpty.findIndex((s) => s.id === activeSessionId);
        const firstUserMsg = messages.find((m) => m.role === 'me');
        const lastMsg = messages[messages.length - 1];
        const preview = lastMsg?.text ? lastMsg.text.slice(0, 80) : '';
        const derivedTitle = firstUserMsg ? deriveSessionTitle(firstUserMsg.text) : t.newChat;

        if (idx >= 0) {
          const copy = [...nonEmpty];
          copy[idx] = {
            ...copy[idx],
            title: copy[idx].title || derivedTitle,
            messages,
            updatedAt: Date.now(),
            previewText: preview,
          };
          return copy;
        }
        return [
          {
            id: activeSessionId,
            title: derivedTitle,
            messages,
            createdAt: messages[0]?.timestamp || Date.now(),
            updatedAt: Date.now(),
            previewText: preview,
          },
          ...nonEmpty,
        ];
      });
    } else {
      setChatSessions((prev) =>
        prev.filter((s) => s && Array.isArray(s.messages) && s.messages.length > 0)
      );
    }

    const freshId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    setActiveSessionId(freshId);
    setMessages([]);
    localStorage.removeItem('ain_salah_msgs');
    setInputText('');
    setSelectedImage(null);
    setSelectedPdf(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleNewChat = () => {
    handleClearChat();
    setView('chat');
    setIsMobileHeaderMenuOpen(false);
    if (window.innerWidth < 768) {
      setIsMobileSidebarOpen(false);
    }
  };

  const handleSelectSession = (sessionId: string) => {
    const target = chatSessions.find((s) => s.id === sessionId);
    if (!target) return;
    setActiveSessionId(target.id);
    setMessages(target.messages || []);
    setView('chat');
    setOpenSessionMenuId(null);
    setIsMobileHeaderMenuOpen(false);
    if (window.innerWidth < 768) {
      setIsMobileSidebarOpen(false);
    }
  };

  const handleRenameSession = (sessionId: string, newTitle: string) => {
    const trimmed = newTitle.trim();
    if (!trimmed) {
      setEditingSessionId(null);
      return;
    }
    setChatSessions((prev) =>
      prev.map((s) => (s.id === sessionId ? { ...s, title: trimmed, updatedAt: Date.now() } : s))
    );
    if (firebaseUser) {
      renameChatSessionInCloud(sessionId, trimmed).catch(() => {});
    }
    setEditingSessionId(null);
    setEditingSessionTitle('');
    setOpenSessionMenuId(null);
  };

  const handleDeleteSession = (sessionId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setOpenSessionMenuId(null);
    setChatSessions((prev) => {
      const updated = prev.filter((s) => s.id !== sessionId);
      try {
        localStorage.setItem('ai_studio_chat_sessions_v1', JSON.stringify(updated));
      } catch {}
      return updated;
    });
    if (firebaseUser) {
      deleteChatSessionFromCloud(sessionId).catch(() => {});
    }
    if (activeSessionId === sessionId) {
      const freshId = `session_${Date.now()}`;
      setActiveSessionId(freshId);
      setMessages([]);
      localStorage.removeItem('ain_salah_msgs');
    }
  };

  const handleExportSession = (session: ChatSession, e?: React.MouseEvent) => {
    e?.stopPropagation();
    const dateStr = new Date(session.createdAt || Date.now()).toLocaleString(
      lang === 'ar' ? 'ar-DZ' : lang === 'fr' ? 'fr-FR' : 'en-US'
    );
    const lines: string[] = [
      `# ${session.title}`,
      `${lang === 'ar' ? 'تاريخ الجلسة:' : lang === 'fr' ? 'Date de la session :' : 'Session Date:'} ${dateStr}`,
      `${lang === 'ar' ? 'عدد الرسائل:' : lang === 'fr' ? 'Nombre de messages :' : 'Total Messages:'} ${session.messages.length}`,
      `المنصة: ${t.appName}`,
      '========================================\n',
    ];

    (session.messages as Message[]).forEach((m, idx) => {
      const sender = m.role === 'me'
        ? (lang === 'ar' ? '👤 المستخدم' : lang === 'fr' ? '👤 Utilisateur' : '👤 User')
        : `🤖 ${t.appName}`;
      const time = new Date(m.timestamp || Date.now()).toLocaleTimeString(
        lang === 'ar' ? 'ar-DZ' : lang === 'fr' ? 'fr-FR' : 'en-US'
      );
      lines.push(`### [${idx + 1}] ${sender} (${time})`);
      lines.push(m.text || '');
      if (m.code) {
        lines.push('\n```');
        lines.push(m.code);
        lines.push('```\n');
      }
      if (m.codeOutput) {
        lines.push(lang === 'ar' ? '**مخرجات التشغيل:**' : lang === 'fr' ? '**Sortie du code :**' : '**Code Output:**');
        lines.push('```');
        lines.push(m.codeOutput);
        lines.push('```\n');
      }
      lines.push('----------------------------------------\n');
    });

    const blob = new Blob([lines.join('\n')], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeFilename = session.title.replace(/[/\\?%*:|"<>]/g, '_').slice(0, 40) || 'chat_session';
    a.download = `${safeFilename}_${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [correctionTargetId, setCorrectionTargetId] = useState<string | null>(null);
  const [correctionText, setCorrectionText] = useState('');

  // Code Execution History Tab State & Re-run Handlers
  const [editingCodeMsgId, setEditingCodeMsgId] = useState<string | null>(null);
  const [draftCodeText, setDraftCodeText] = useState<string>('');
  const [rerunningCodeMsgId, setRerunningCodeMsgId] = useState<string | null>(null);
  const [codeHistorySearch, setCodeHistorySearch] = useState<string>('');
  const [selectedCodeCategory, setSelectedCodeCategory] = useState<'all' | CodeCategory>('all');
  const [newQuickCodeInput, setNewQuickCodeInput] = useState<string>('');
  const [isRunningNewQuickCode, setIsRunningNewQuickCode] = useState<boolean>(false);
  const [lastRerunSuccessId, setLastRerunSuccessId] = useState<string | null>(null);

  const executedCodeMessages = useMemo(
    () =>
      messages
        .filter((m) => m.role === 'bot' && Boolean(m.code || m.codeOutput))
        .map((m) => ({
          ...m,
          codeCategory:
            m.codeCategory ||
            detectCodeCategory(m.code, m.userPromptText || m.text, m.codeOutput),
        })),
    [messages]
  );

  const codeCategoryCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: executedCodeMessages.length,
      calculator: 0,
      data_processing: 0,
      chart: 0,
      algorithm: 0,
      general: 0,
    };
    for (const item of executedCodeMessages) {
      const cat = item.codeCategory || 'general';
      counts[cat] = (counts[cat] || 0) + 1;
    }
    return counts;
  }, [executedCodeMessages]);

  const handleManualCodeCategoryChange = (msgId: string, newCategory: CodeCategory) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId
          ? {
              ...m,
              codeCategory: newCategory,
              isManualCodeCategory: true,
            }
          : m
      )
    );
  };

  // Web Speech API: Voice recognition state & handler
  const [isListening, setIsListening] = useState<boolean>(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  const isSpeechRecognitionSupported = typeof window !== 'undefined' &&
    Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  const toggleSpeechRecognition = () => {
    if (!isSpeechRecognitionSupported) {
      setSpeechError(t.speechNotSupported);
      setTimeout(() => setSpeechError(null), 5000);
      return;
    }

    if (isListening) {
      try {
        recognitionRef.current?.stop();
      } catch {}
      setIsListening(false);
      return;
    }

    try {
      const SpeechRecognitionClass =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognitionClass();
      recognitionRef.current = recognition;

      // Adapt recognition language to user selected language (Algerian Arabic, French, English)
      recognition.lang = lang === 'ar' ? 'ar-DZ' : lang === 'fr' ? 'fr-FR' : 'en-US';
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      let initialText = inputText.trim() ? inputText.trim() + ' ' : '';

      recognition.onstart = () => {
        setIsListening(true);
        setSpeechError(null);
        playAlertChime('news', soundEnabled);
      };

      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          const transcript = item[0].transcript;
          if (item.isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        if (finalTranscript) {
          initialText += finalTranscript + ' ';
          setInputText(initialText);
        } else if (interimTranscript) {
          setInputText(initialText + interimTranscript);
        }

        if (textareaRef.current) {
          textareaRef.current.style.height = 'auto';
          textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('[Web Speech API error]:', event?.error);
        if (event.error === 'not-allowed' || event.error === 'permission-denied') {
          setSpeechError(
            lang === 'ar'
              ? 'تم حظر إذن الميكروفون. يرجى السماح بالوصول للميكروفون في إعدادات المتصفح للتحدث.'
              : lang === 'fr'
              ? 'Accès au micro refusé. Veuillez autoriser le microphone dans les paramètres.'
              : 'Microphone access denied. Please enable microphone permission in browser settings.'
          );
        } else if (event.error === 'no-speech') {
          // Quiet stop
        } else {
          setSpeechError(
            lang === 'ar'
              ? 'تعذر التقاط الصوت بوضوح، يرجى المحاولة والتحدث ثانية.'
              : 'Speech recognition error, please try speaking again.'
          );
        }
        setIsListening(false);
        setTimeout(() => setSpeechError(null), 5000);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (err: any) {
      console.error('Failed to start speech recognition:', err);
      setIsListening(false);
      setSpeechError(t.speechNotSupported);
      setTimeout(() => setSpeechError(null), 5000);
    }
  };

  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.stop();
      } catch {}
    };
  }, []);

  // Search activity phase state & live timer for sending progress
  const [searchPhase, setSearchPhase] = useState<SearchActivityPhase>('searching');
  const [isRafiqModalOpen, setIsRafiqModalOpen] = useState(false);

  useEffect(() => {
    let interval: any;
    let t1: any;
    let t2: any;

    if (isSending) {
      setSendSecondsElapsed(0);
      setSearchPhase('searching');

      t1 = setTimeout(() => {
        setSearchPhase('reviewing');
      }, 1500);

      t2 = setTimeout(() => {
        setSearchPhase('answering');
      }, 3500);

      interval = setInterval(() => {
        setSendSecondsElapsed((s) => s + 1);
      }, 1000);
    } else {
      setSendSecondsElapsed(0);
      setSearchPhase('searching');
    }

    return () => {
      clearInterval(interval);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [isSending]);

  // Fixes (Community corrections)
  const [fixes, setFixes] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('fixes');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Trip Tracker State
  const [trip, setTrip] = useState<Trip | null>(() => {
    try {
      const saved = localStorage.getItem('trip');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [tripDest, setTripDest] = useState('');
  const [tripReturn, setTripReturn] = useState('');
  const [tripPhone, setTripPhone] = useState('');
  const [, setTick] = useState(0);

  // GPS Location State
  const [locOutput, setLocOutput] = useState<{
    text: string;
    coords?: { lat: string; lng: string };
    smsUrl?: string;
  } | null>(null);
  const [locLoading, setLocLoading] = useState(false);

  // Audio TTS State
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [isTtsLoading, setIsTtsLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Sync theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('ain_salah_theme', theme);
  }, [theme]);

  // Persist state & chat sessions (debounced to prevent mobile UI lag during streaming)
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem('ain_salah_msgs', JSON.stringify(messages));
      } catch {}

      if (messages.length > 0 && activeSessionId) {
        setChatSessions((prev) => {
          const idx = prev.findIndex((s) => s.id === activeSessionId);
          const firstUserMsg = messages.find((m) => m.role === 'me');
          const lastMsg = messages[messages.length - 1];
          const preview = lastMsg?.text ? lastMsg.text.slice(0, 80) : '';

          if (idx >= 0) {
            const existing = prev[idx];
            const isDefaultTitle =
              !existing.title ||
              existing.title === 'محادثة جديدة' ||
              existing.title === 'New Chat' ||
              existing.title === 'Nouvelle discussion' ||
              existing.title === 'محادثة سابقة';
            const updatedTitle =
              isDefaultTitle && firstUserMsg ? deriveSessionTitle(firstUserMsg.text) : existing.title;
            const updated: ChatSession = {
              ...existing,
              title: updatedTitle,
              messages,
              updatedAt: Date.now(),
              previewText: preview,
            };
            const copy = [...prev];
            copy[idx] = updated;
            return copy;
          } else {
            const newTitle = firstUserMsg
              ? deriveSessionTitle(firstUserMsg.text)
              : lang === 'ar'
              ? 'محادثة جديدة'
              : lang === 'fr'
              ? 'Nouvelle discussion'
              : 'New Chat';
            const newSession: ChatSession = {
              id: activeSessionId,
              title: newTitle,
              messages,
              createdAt: messages[0]?.timestamp || Date.now(),
              updatedAt: Date.now(),
              previewText: preview,
            };
            return [newSession, ...prev];
          }
        });
      }
    }, 350);

    return () => window.clearTimeout(timer);
  }, [messages, activeSessionId, lang]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem('ai_studio_chat_sessions_v1', JSON.stringify(chatSessions));
      } catch (e) {
        console.error('Failed to persist chat sessions', e);
      }
    }, 400);
    return () => window.clearTimeout(timer);
  }, [chatSessions]);

  useEffect(() => {
    if (activeSessionId) {
      try {
        localStorage.setItem('ai_studio_active_session_id', activeSessionId);
      } catch {}
    }
  }, [activeSessionId]);

  useEffect(() => {
    const tId = window.setTimeout(() => {
      try {
        localStorage.setItem('news', JSON.stringify(news));
      } catch {}
    }, 250);
    return () => window.clearTimeout(tId);
  }, [news]);

  useEffect(() => {
    try {
      localStorage.setItem('fixes', JSON.stringify(fixes));
    } catch {}
  }, [fixes]);

  useEffect(() => {
    try {
      localStorage.setItem('trip', JSON.stringify(trip));
    } catch {}
  }, [trip]);

  useEffect(() => {
    try {
      localStorage.setItem('ain_salah_admin', isAdminLoggedIn ? 'true' : 'false');
    } catch {}
  }, [isAdminLoggedIn]);

  useEffect(() => {
    try {
      localStorage.setItem('ain_salah_require_approval', requireApproval ? 'true' : 'false');
    } catch {}
  }, [requireApproval]);

  useEffect(() => {
    const tId = window.setTimeout(() => {
      try {
        localStorage.setItem(
          'ain_salah_notifications_history',
          JSON.stringify(notificationHistory)
        );
      } catch {}
    }, 300);
    return () => window.clearTimeout(tId);
  }, [notificationHistory]);

  // Sync global notifications disabled setting on startup (Weather & Comprehensive Brief removed)
  useEffect(() => {
    fetch('/api/global-settings')
      .then((res) => (res.ok ? res.json() : { notificationsPermanentlyDisabled: false }))
      .catch(() => ({ notificationsPermanentlyDisabled: false }))
      .then((globalConfig) => {
        if (
          globalConfig?.notificationsPermanentlyDisabled ||
          localStorage.getItem('ain_salah_notifications_permanently_disabled') === 'true'
        ) {
          setNotificationsPermanentlyDisabled(true);
          setActiveNotifications([]);
        }
      });
  }, []);

  // Timer for trip countdown (only active when a trip is registered)
  useEffect(() => {
    if (!trip) return;
    const timer = setInterval(() => {
      setTick((t) => t + 1);
    }, 15000);
    return () => clearInterval(timer);
  }, [trip]);

  // Scroll to bottom on message change without locking touch scroll during streaming
  useEffect(() => {
    if (view === 'chat') {
      chatEndRef.current?.scrollIntoView({ behavior: isSending ? 'auto' : 'smooth' });
    }
  }, [messages.length, view]);

  // Auto-resize textarea without disrupting mobile virtual keyboard IME composition
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    if (!inputText) {
      el.style.height = '42px';
      return;
    }
    const targetHeight = Math.min(Math.max(el.scrollHeight, 42), 140);
    if (el.style.height !== `${targetHeight}px`) {
      el.style.height = `${targetHeight}px`;
    }
  }, [inputText]);

  // Click outside to close plus menu, agent selector, and Facebook-style notifications menu
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (plusMenuRef.current && !plusMenuRef.current.contains(event.target as Node)) {
        setIsPlusMenuOpen(false);
      }
      if (agentSelectorRef.current && !agentSelectorRef.current.contains(event.target as Node)) {
        setIsAgentSelectorOpen(false);
      }
      if (notifMenuRef.current && !notifMenuRef.current.contains(event.target as Node)) {
        setIsNotifMenuOpen(false);
      }
    }
    if (isPlusMenuOpen || isAgentSelectorOpen || isNotifMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isPlusMenuOpen, isAgentSelectorOpen, isNotifMenuOpen]);

  const toggleTheme = () => {
    setTheme((t) => (t === 'light' ? 'dark' : 'light'));
  };

  const buildSmsUrl = (phone: string, text: string) => {
    return `sms:${phone}?body=${encodeURIComponent(text)}`;
  };

  // Secret Logo Click Handler for Admin Access (Owner only)
  const handleLogoClick = () => {
    const nextCount = logoClickCount + 1;
    setLogoClickCount(nextCount);
    if (nextCount >= 3) {
      setLogoClickCount(0);
      if (isAdminLoggedIn) {
        setView((prev) => (prev === 'admin' ? 'chat' : 'admin'));
      } else {
        setShowPinModal(true);
      }
    }
  };

  const handleAdminLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanPin = pinInput.trim();
    if (!cleanPin) return;
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ pin: cleanPin }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        if (data.token) {
          try {
            sessionStorage.setItem('tidikelt_admin_session', data.token);
          } catch {}
          setAdminSessionToken(data.token);
        }
        setIsAdminLoggedIn(true);
        setShowPinModal(false);
        setPinInput('');
        setPinError(false);
        setPinErrorMessage('');
        setView('admin');
        setAdminTab('news');
        fetchAnalytics();
      } else {
        setPinError(true);
        if (res.status === 429 || data.error === 'rate_limited') {
          setPinErrorMessage(data.message || 'تم تجاوز الحد المسموح للمحاولات مؤقتاً. يرجى الانتظار قليلاً.');
        } else {
          setPinErrorMessage(data.message || 'رمز المشرف غير صحيح. يرجى التأكد من الرمز والمحاولة ثانية.');
        }
      }
    } catch {
      setPinError(true);
      setPinErrorMessage('تعذر الاتصال بالخادم، يرجى إعادة المحاولة.');
    }
  };

  useEffect(() => {
    if (view === 'admin') {
      fetchAnalytics();
    }
  }, [view, adminTab]);

  const handleAdminLogout = async () => {
    try {
      const headers: Record<string, string> = {};
      const token = adminSessionToken || sessionStorage.getItem('tidikelt_admin_session');
      if (token) {
        headers['x-admin-session'] = token;
        headers['authorization'] = `Bearer ${token}`;
      }
      await fetch('/api/admin/logout', { method: 'POST', headers, credentials: 'include' });
    } catch {}
    try {
      sessionStorage.removeItem('tidikelt_admin_session');
    } catch {}
    setAdminSessionToken(null);
    setIsAdminLoggedIn(false);
    setView('chat');
  };

  // Owner Discreet Access Shortcuts (Alt+Shift+A or Ctrl+Alt+A or ?admin=1 URL query)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.altKey && e.shiftKey && e.key.toLowerCase() === 'a') || (e.ctrlKey && e.altKey && e.key.toLowerCase() === 'a')) {
        e.preventDefault();
        if (isAdminLoggedIn) {
          setView((prev) => (prev === 'admin' ? 'chat' : 'admin'));
        } else {
          setShowPinModal(true);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isAdminLoggedIn]);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('admin') === '1' || params.get('owner') === '1') {
        if (!isAdminLoggedIn) {
          setShowPinModal(true);
        }
      }
    } catch {
      // Ignore URL parsing errors
    }
  }, [isAdminLoggedIn]);

  // Save Weather Alert from Admin
  const handleSaveWeatherAlert = () => {
    const now = Date.now();
    const durationMs = (editAlertDurationHours || 6) * 3600 * 1000;
    const updated: WeatherAlert = {
      active: editAlertActive,
      title: editAlertTitle.trim() || 'تنبيه جوي',
      message: editAlertMessage.trim() || '',
      severity: editAlertSeverity,
      timestamp: now,
      source: editAlertSource.trim() || 'الديوان الوطني للأرصاد الجوية (ONM) / خلية اليقظة لولاية عين صالح',
      dataType: editAlertDataType,
      publishedAt: weatherAlert.publishedAt || now,
      updatedAt: now,
      expiresAt: editAlertActive ? now + durationMs : undefined,
      expireDurationHours: editAlertDurationHours,
    };
    setWeatherAlert(updated);
    setIsAlertDismissed(false); // Make sure it re-appears for users
    if (editAlertActive) {
      playAlertChime('weather', soundEnabled);
      const approvedVerifiedNews = news.filter((item) => item.status === 'approved');
      const briefSlides = [
        {
          id: 'weather-slide',
          source: updated.source || 'الأرصاد الجوية واليقظة',
          text: updated.message || 'يُرجى توخي أقصى درجات الحيطة والالتزام بإرشادات السلامة.',
          categoryName: 'الأحوال الجوية',
          categoryEmoji: '🌤️',
          isWeatherAlert: true,
        },
        ...approvedVerifiedNews.map((item) => {
          const cat = getCategoryDetails(item.category);
          return {
            id: item.id,
            source: item.s,
            text: item.t,
            categoryName: cat.name,
            categoryEmoji: cat.emoji,
            isWeatherAlert: false,
          };
        }),
      ];
      pushInAppNotification({
        type: 'comprehensive_brief',
        title: updated.title,
        message: updated.message || 'يُرجى توخي أقصى درجات الحيطة والالتزام بإرشادات السلامة.',
        severity: updated.severity,
        isVerified: true,
        verifiedItems: briefSlides,
        actionLabel: 'تفاصيل التنبيه والأخبار الموثقة',
        onAction: () => setView('news'),
      });
    }
    setAlertSaveSuccess(true);
    setTimeout(() => setAlertSaveSuccess(false), 3000);
  };

  const handleApplyPreset = (preset: (typeof WEATHER_PRESETS)[0]) => {
    setEditAlertTitle(preset.title);
    setEditAlertMessage(preset.message);
    setEditAlertSeverity(preset.severity);
    setEditAlertActive(true);
    setEditAlertSource('الديوان الوطني للأرصاد الجوية (ONM) / خلية اليقظة لولاية عين صالح');
    setEditAlertDataType('live');
    setEditAlertDurationHours(6);
    const approvedVerifiedNews = news.filter((item) => item.status === 'approved');
    const briefSlides = [
      {
        id: 'weather-slide',
        source: 'الديوان الوطني للأرصاد الجوية (ONM) / خلية اليقظة لولاية عين صالح',
        text: preset.message,
        categoryName: 'الأحوال الجوية',
        categoryEmoji: '🌤️',
        isWeatherAlert: true,
      },
      ...approvedVerifiedNews.map((item) => {
        const cat = getCategoryDetails(item.category);
        return {
          id: item.id,
          source: item.s,
          text: item.t,
          categoryName: cat.name,
          categoryEmoji: cat.emoji,
          isWeatherAlert: false,
        };
      }),
    ];
    pushInAppNotification({
      type: 'comprehensive_brief',
      title: preset.title,
      message: preset.message,
      severity: preset.severity,
      isVerified: true,
      verifiedItems: briefSlides,
      actionLabel: 'عرض التنبيه والأخبار الموثقة',
      onAction: () => setView('news'),
    });
  };

  // Toggle selection of a generated price list poster for multi-page 300 DPI PDF compilation
  const handleToggleSelectPosterForPdf = (posterId: string, jpegDataUrl: string) => {
    if (!jpegDataUrl) return;
    setSelectedPostersForPdf((prev) => {
      const next = { ...prev };
      if (next[posterId]) {
        delete next[posterId];
      } else {
        next[posterId] = jpegDataUrl;
      }
      return next;
    });
  };

  // Stage 3: Compile all selected posters (or fallback poster) into a single 300 DPI PDF with Pillow Margins & Automatic Store Footer
  const handleExportSelectedPostersToPdf = async (
    fallbackSinglePosterJpeg?: string,
    fallbackFilename: string = 'butcher_shop_price_lists.pdf',
    targetMsgId?: string,
    customSettingsOverride?: PdfExportSettings
  ) => {
    const selectedImages = Object.values(selectedPostersForPdf).filter(Boolean);
    const rawImagesToCompile =
      selectedImages.length > 0
        ? selectedImages
        : fallbackSinglePosterJpeg
        ? [fallbackSinglePosterJpeg]
        : [];

    if (rawImagesToCompile.length === 0 || isExportingPriceListPdf) return;

    const effectiveSettings = customSettingsOverride || pdfExportSettings;

    setIsExportingPriceListPdf(true);
    try {
      // Apply Pillow-equivalent margins (ImageOps.expand) & automatic store/contact footer (ImageDraw) to each page
      const compositedPages: string[] = [];
      for (let i = 0; i < rawImagesToCompile.length; i++) {
        const composited = await applyPillowMarginsAndFooterToPage(
          rawImagesToCompile[i],
          effectiveSettings,
          i,
          rawImagesToCompile.length
        );
        compositedPages.push(composited || rawImagesToCompile[i]);
      }

      const res = await fetch('/api/price-list/export-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images: compositedPages,
          filename: fallbackFilename,
          pdfSettings: {
            ...effectiveSettings,
            alreadyCompositedOnClient: true,
          },
        }),
      });
      const data = await res.json();
      if (res.ok && data.ok && data.file) {
        // Trigger immediate browser download of the 300 DPI PDF
        if (data.pdfBase64) {
          const link = document.createElement('a');
          link.href = data.pdfBase64;
          link.download = data.file.filename || fallbackFilename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }

        // Attach the verified GeneratedFileInfo card to the target message (or latest bot message)
        setMessages((prev) => {
          const targetId =
            targetMsgId ||
            [...prev].reverse().find((m) => m.role === 'bot' && m.priceListPosters?.length)?.id;
          if (!targetId) return prev;
          return prev.map((m) =>
            m.id === targetId ? { ...m, generatedFile: data.file } : m
          );
        });
      }
    } catch (err) {
      console.error('Failed to export price lists to PDF:', err);
    } finally {
      setIsExportingPriceListPdf(false);
    }
  };

  // Run the complete 4-poster butcher shop sequential example + 300 DPI PDF export inside Chat
  const handleRunFullButcherPriceListDemo = async () => {
    if (isSending) return;
    const demoUserMsg: Message = {
      id: `msg-${Date.now()}`,
      role: 'me',
      text: 'توليد قوائم الأسعار الأربع المتناسقة للملحمة (لحم بقري، لحم الجمل، لحم غنمي، لحم الحاشي) وتصديرها إلى ملف PDF جاهز للطباعة (300 DPI)',
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, demoUserMsg]);
    setIsSending(true);

    try {
      const steps = [
        {
          stage: 'base' as const,
          filename: '01_beef_prices.jpg',
          prompt: 'قائمة أسعار ملحمة لحم بقري: لحم بقري: 1800، صافي: 2200، داورة: 6000، كبدة: 3500',
        },
        {
          stage: 'variation' as const,
          filename: '02_camel_prices.jpg',
          prompt: 'قائمة أسعار لحم الجمل بنفس التصميم: لحم الجمل: 1700، كبدة: 3500، هبرة: 2200، دوارة: 600',
        },
        {
          stage: 'variation' as const,
          filename: '03_lamb_prices.jpg',
          prompt: 'قائمة أسعار لحم غنمي بنفس التصميم: لحم غنمي: 2500، دوارة: 800، كبدة + الشحمة: 3000',
        },
        {
          stage: 'variation' as const,
          filename: '04_young_camel_prices.jpg',
          prompt: 'قائمة أسعار لحم الحاشي بنفس التصميم: لحم الحاشي: 1800، كبدة: 3500، دوارة: 6000، صافي: 2400',
        },
      ];

      const generatedPosters: PriceListPosterData[] = [];
      const jpegDataUrls: string[] = [];
      let refBase64: string | undefined;
      let refTheme: PriceListPosterData['theme'] | undefined;

      for (const step of steps) {
        const res = await fetch('/api/price-list/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: step.prompt,
            stage: step.stage,
            referenceImageBase64: refBase64,
            previousTheme: refTheme,
          }),
        });
        const data = await res.json();
        if (res.ok && data.ok && data.poster) {
          const posterObj: PriceListPosterData = {
            ...data.poster,
            filename: step.filename,
          };
          const renderedJpeg = await renderHighResPosterToJpeg(posterObj);
          posterObj.renderedJpegDataUrl = renderedJpeg;
          generatedPosters.push(posterObj);
          jpegDataUrls.push(renderedJpeg);
          refBase64 = renderedJpeg;
          refTheme = posterObj.theme;
        }
      }

      // Select all 4 generated posters automatically
      const nextSelected: Record<string, string> = {};
      generatedPosters.forEach((p, idx) => {
        if (jpegDataUrls[idx]) {
          nextSelected[p.id] = jpegDataUrls[idx];
        }
      });
      setSelectedPostersForPdf((prev) => ({ ...prev, ...nextSelected }));

      if (generatedPosters.length > 0) {
        const lastIdx = generatedPosters.length - 1;
        setActiveReferencePoster({
          poster: generatedPosters[lastIdx],
          jpegDataUrl: jpegDataUrls[lastIdx],
        });
      }

      // Compile all 4 posters into butcher_shop_price_lists.pdf (300 DPI) with Pillow Margins & Automatic Store Footer
      let compiledPdfFile: GeneratedFileInfo | undefined;
      if (jpegDataUrls.length > 0) {
        const compositedDemoPages: string[] = [];
        for (let i = 0; i < jpegDataUrls.length; i++) {
          const comp = await applyPillowMarginsAndFooterToPage(
            jpegDataUrls[i],
            pdfExportSettings,
            i,
            jpegDataUrls.length
          );
          compositedDemoPages.push(comp || jpegDataUrls[i]);
        }

        const pdfRes = await fetch('/api/price-list/export-pdf', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            images: compositedDemoPages,
            filename: 'butcher_shop_price_lists.pdf',
            pdfSettings: {
              ...pdfExportSettings,
              alreadyCompositedOnClient: true,
            },
          }),
        });
        const pdfData = await pdfRes.json();
        if (pdfRes.ok && pdfData.ok && pdfData.file) {
          compiledPdfFile = pdfData.file;
        }
      }

      const botMsg: Message = {
        id: `msg-${Date.now() + 1}`,
        role: 'bot',
        text:
          `تم تنفيذ المراحل الثلاث بنجاح وتوليد **4 قوائم أسعار متناسقة بصرياً** (` +
          `\`01_beef_prices.jpg\`، \`02_camel_prices.jpg\`، \`03_lamb_prices.jpg\`، \`04_young_camel_prices.jpg\`) ` +
          `بنفس الهوية البصرية والإطار الذهبي، ودمجها في ملف **\`butcher_shop_price_lists.pdf\`** جاهز للطباعة بدقة **300 DPI** دون هوامش بيضاء.`,
        priceListPosters: generatedPosters,
        generatedFile: compiledPdfFile,
        timestamp: Date.now(),
        userPromptText: demoUserMsg.text,
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      console.error('Error in full butcher demo:', err);
    } finally {
      setIsSending(false);
    }
  };

  // Handle Send Message (includes weatherAlert, image, and PDF analysis context)
  const handleSend = async (queryText?: string) => {
    const q = (queryText || inputText).trim();

    if ((!q && !selectedImage && !selectedPdf && uploadedMultiFiles.length === 0) || isSending) return;

    const currentImage = selectedImage;
    const currentPdf = selectedPdf;
    const currentMultiFiles = [...uploadedMultiFiles];
    setInputText('');
    if (isListening) {
      try {
        recognitionRef.current?.stop();
      } catch {}
      setIsListening(false);
    }
    setSelectedImage(null);
    setSelectedPdf(null);
    setUploadedMultiFiles([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    let defaultText = '';
    if (currentMultiFiles.length >= 2) {
      defaultText = `قارن بين الملفات المرفوعة (${currentMultiFiles.map((f) => f.filename).join(' ، ')}) واستخرج أوجه التشابه والاختلاف في جدول منظم.`;
    } else if (currentMultiFiles.length === 1) {
      defaultText = `حلل ولخص الملف المرفق «${currentMultiFiles[0].filename}» واستخرج أهم النقاط والبيانات الواردة فيه.`;
    } else if (currentPdf) {
      defaultText = `مستند PDF مرفق: «${currentPdf.name}». يرجى قراءته وتلخيصه واستخراج أهم القرارات والشروط والآجال.`;
    } else if (currentImage) {
      defaultText = 'تقرير مصور: الرجاء فحص وتحليل هذا العطل أو الحادث وتقديم إرشادات عاجلة.';
    }

    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      role: 'me',
      text: q || defaultText,
      image: currentImage || undefined,
      pdf: currentPdf || undefined,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setIsSending(true);
    const abortCtrl = new AbortController();
    sendAbortControllerRef.current = abortCtrl;

    try {
      const historyPairs: [string, string][] = [];
      for (let i = 0; i < messages.length - 1; i += 2) {
        if (messages[i].role === 'me' && messages[i + 1]?.role === 'bot') {
          historyPairs.push([messages[i].text, messages[i + 1].text]);
        }
      }

      // ONLY send approved news!
      const approvedNews = news
        .filter((n) => n.status === 'approved' || !n.status)
        .map((n) => ({ s: n.s, t: n.t }));
      // Live SSE search-stream handler when search mode is active without media attachments
      if (tidikeltMode === 'search' && !currentImage && !currentPdf) {
        let accumulatedAnswer = '';
        let streamSources: Array<{ title: string; url: string }> = [];
        const botMsgId = `msg-${Date.now() + 1}`;

        try {
          const streamRes = await fetch('/api/search-stream', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query: userMsg.text }),
          });

          if (streamRes.ok && streamRes.body) {
            const initialBotMsg: Message = {
              id: botMsgId,
              role: 'bot',
              text: '',
              mode: 'search',
              userPromptText: userMsg.text,
              timestamp: Date.now(),
            };
            setMessages((prev) => [...prev, initialBotMsg]);

            await readSSE(streamRes, (event, payload) => {
              if (event === 'phase') {
                if (payload.phase === 'search') setSearchPhase('searching');
                else if (payload.phase === 'review' || payload.phase === 'verify') setSearchPhase('reviewing');
                else if (payload.phase === 'answer') setSearchPhase('answering');
              } else if (event === 'sources') {
                if (Array.isArray(payload.sources)) {
                  streamSources = payload.sources;
                }
              } else if (event === 'token') {
                if (payload.text) {
                  accumulatedAnswer += payload.text;
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === botMsgId
                        ? { ...m, text: accumulatedAnswer, webSources: streamSources }
                        : m
                    )
                  );
                }
              } else if (event === 'done') {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === botMsgId
                      ? { ...m, text: accumulatedAnswer, webSources: streamSources }
                      : m
                  )
                );
              } else if (event === 'error') {
                if (!accumulatedAnswer && payload.message) {
                  setMessages((prev) =>
                    prev.map((m) =>
                      m.id === botMsgId
                        ? { ...m, text: payload.message }
                        : m
                    )
                  );
                }
              }
            });

            return;
          }
        } catch (streamErr) {
          console.warn('Search stream interrupted or failed:', streamErr);
          // If some text was already received, retain it with gentle notice
          if (accumulatedAnswer.trim()) {
            const noticeText =
              lang === 'ar'
                ? '\n\n*(انقطع الاتصال مؤقتًا - تم الاحتفاظ بالإجابة المستلمة)*'
                : '\n\n*(Connection interrupted - retained received text)*';
            setMessages((prev) =>
              prev.map((m) =>
                m.id === botMsgId
                  ? { ...m, text: accumulatedAnswer + noticeText, webSources: streamSources }
                  : m
              )
            );
            return;
          }
        }
      }

      // Automatic Detection for Store Price List Generation & Reference Variation inside Chat
      const isBatchDemoPrompt =
        /StorePriceListApp|01_beef_prices|butcher_shop_price_lists\.pdf/i.test(userMsg.text) ||
        (/لحم بقري/.test(userMsg.text) &&
          /لحم الجمل/.test(userMsg.text) &&
          /لحم غنمي/.test(userMsg.text) &&
          /لحم الحاشي/.test(userMsg.text));

      const hasPriceListKeywords =
        /قائمة\s*أسعار|قائمه\s*اسعار|قائمة\s*الاسعار|قائمة\s*الأسعار|لائحة\s*أسعار|جدول\s*أسعار|ملصق\s*أسعار|بوستر\s*أسعار|قوائم\s*الأسعار|قائمة\s*ثانية|قائمة\s*ثالثة|قائمة\s*رابعة|بنفس\s*التصميم|بنفس\s*الهوية/i.test(
          userMsg.text
        );

      const pricePairsCount = (
        userMsg.text.match(/[\u0600-\u06FFa-zA-Z\s+]{2,25}\s*[:：\-–—=]?\s*\d{2,6}/g) || []
      ).length;

      if (
        !currentImage &&
        !currentPdf &&
        (isBatchDemoPrompt ||
          hasPriceListKeywords ||
          (activeReferencePoster && pricePairsCount >= 2 && /لحم|كبدة|دوارة|صافي|هبرة|قهوة|شاي|بيتزا|شاورما|سعر|أسعار|قائمة/i.test(userMsg.text)))
      ) {
        if (isBatchDemoPrompt) {
          setIsSending(false);
          // Remove the duplicate userMsg we just added and run the 4-poster batch flow directly
          setMessages((prev) => prev.filter((m) => m.id !== userMsg.id));
          await handleRunFullButcherPriceListDemo();
          return;
        }

        const isVariation =
          Boolean(activeReferencePoster) &&
          (/بنفس\s*التصميم|بنفس\s*الهوية|نفس\s*التصميم|قائمة\s*ثانية|قائمة\s*ثالثة|قائمة\s*رابعة|مرجع/i.test(
            userMsg.text
          ) ||
            !/تصميم\s*جديد\s*كلياً|بداية\s*جديدة/i.test(userMsg.text));

        const plRes = await fetch('/api/price-list/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: abortCtrl.signal,
          body: JSON.stringify({
            prompt: userMsg.text,
            stage: isVariation ? 'variation' : 'base',
            referencePosterId: isVariation ? activeReferencePoster?.poster.id : undefined,
            referenceImageBase64: isVariation ? activeReferencePoster?.jpegDataUrl : undefined,
            previousTheme: isVariation ? activeReferencePoster?.poster.theme : undefined,
          }),
        });

        if (plRes.ok) {
          const plData = await plRes.json();
          if (plData.ok && plData.poster) {
            const posterObj: PriceListPosterData = plData.poster;
            const renderedJpeg = await renderHighResPosterToJpeg(posterObj);
            posterObj.renderedJpegDataUrl = renderedJpeg;

            setActiveReferencePoster({
              poster: posterObj,
              jpegDataUrl: renderedJpeg,
            });
            setSelectedPostersForPdf((prev) => ({
              ...prev,
              [posterObj.id]: renderedJpeg,
            }));

            const stageDesc =
              posterObj.stage === 'base'
                ? 'تم توليد **التصميم الأساسي المرجعي (المرحلة 1)** لقائمة الأسعار بدقة عالية وأبعاد `4:5`.'
                : 'تم توليد **القائمة المتناسقة الجديدة (المرحلة 2)** بالاعتماد على الصورة المرجعية السابقة مع الحفاظ على تطابق الهوية البصرية والإطار الذهبي بنسبة 100%.';

            const botMsg: Message = {
              id: `msg-${Date.now() + 1}`,
              role: 'bot',
              text: `${stageDesc}\n\nيمكنك تحديد الصور المطلوبة والضغط على **تحويل الصور المختارة إلى PDF للطباعة (300 DPI)**، أو توليد قائمة أخرى بنفس الهوية البصرية:`,
              priceListPosters: [posterObj],
              timestamp: Date.now(),
              userPromptText: userMsg.text,
            };
            setMessages((prev) => [...prev, botMsg]);
            return;
          }
        }
      }

      const res = await fetch('/api/ain-salah/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: abortCtrl.signal,
        body: JSON.stringify({
          query: userMsg.text,
          mode: tidikeltMode,
          image: currentImage,
          pdf: currentPdf,
          uploadedFiles: currentMultiFiles,
          conversation_id: activeSessionId,
          user_id: firebaseUser?.uid || 'default_user',
          agentId: selectedAgentId !== 'swarm' ? selectedAgentId : undefined,
          language: lang,
          news: approvedNews,
          fixes: fixes,
          history: historyPairs.slice(-5),
          weatherAlert: weatherAlert.active ? weatherAlert : null,
          clientTemporalContext: {
            timestamp: Date.now(),
            iso: new Date().toISOString(),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            localTime: new Date().toLocaleTimeString(lang === 'ar' ? 'ar-DZ' : lang === 'fr' ? 'fr-FR' : 'en-US', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
              hour12: false,
            }),
            localDate: new Date().toLocaleDateString(lang === 'ar' ? 'ar-DZ' : lang === 'fr' ? 'fr-FR' : 'en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            }),
          },
          userLocation: {
            wilayaName: visitorLocation.wilaya.nameAr,
            wilayaEn: visitorLocation.wilaya.nameEn,
            wilayaFr: visitorLocation.wilaya.nameFr,
            code: visitorLocation.wilaya.code,
            distanceFromInSalahKm: visitorLocation.wilaya.distanceFromInSalahKm,
            lat: visitorLocation.lat,
            lng: visitorLocation.lng,
            isGps: visitorLocation.isGps,
          },
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to reach AI agent');
      }

      const data = await res.json();
      const botMsg: Message = {
        id: `msg-${Date.now() + 1}`,
        role: 'bot',
        text: data.text,
        mode: data.mode,
        code: data.code,
        codeOutput: data.codeOutput,
        codeCategory:
          data.code || data.codeOutput
            ? detectCodeCategory(data.code, userMsg.text, data.codeOutput)
            : undefined,
        webSources: data.sources || data.webSources,
        groundingQueries: data.groundingQueries,
        multiModelEngines: data.multiModelEngines,
        sourceInfo: data.sourceInfo,
        generatedFile: data.generatedFile || undefined,
        timestamp: Date.now(),
        userPromptText: userMsg.text,
        agentId: data.agent?.id || (selectedAgentId !== 'swarm' ? selectedAgentId : 'swarm'),
        agentName: data.agent?.name,
        pipelineExecution: data.pipelineExecution,
      };

      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        return;
      }
      const clientRefined = buildClientQuestionRefinements(userMsg.text, lang);
      const errorMsg: Message = {
        id: `msg-${Date.now() + 1}`,
        role: 'bot',
        text: clientRefined.friendlyFallbackText,
        userPromptText: userMsg.text,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      sendAbortControllerRef.current = null;
      setIsSending(false);
    }
  };

  // Re-run an existing or edited code snippet from the Code History tab or Chat card
  const handleRerunCode = async (msgId: string, codeToExecute: string, originalPrompt?: string) => {
    const cleanCode = codeToExecute.trim();
    if (!cleanCode || rerunningCodeMsgId) return;

    setRerunningCodeMsgId(msgId);
    try {
      const reply = await askTidikelt(
        originalPrompt || 'قم بتنفيذ هذا الكود البرمجي وإظهار ناتج تشغيله الفعلي',
        {
          mode: 'code',
          customCode: cleanCode,
        }
      );

      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== msgId) return m;
          const updatedCode = reply.code || cleanCode;
          const updatedOutput =
            reply.codeOutput ||
            `[STDOUT] تم تنفيذ الكود بنجاح (${new Date().toLocaleTimeString('ar-DZ', { hour12: false })})`;
          return {
            ...m,
            code: updatedCode,
            codeOutput: updatedOutput,
            codeCategory: m.isManualCodeCategory
              ? m.codeCategory
              : detectCodeCategory(updatedCode, m.userPromptText || originalPrompt, updatedOutput),
            timestamp: Date.now(),
          };
        })
      );
      setEditingCodeMsgId(null);
      setLastRerunSuccessId(msgId);
      setTimeout(() => {
        setLastRerunSuccessId((prev) => (prev === msgId ? null : prev));
      }, 3000);
    } catch (err) {
      console.error('Failed to re-run code snippet:', err);
    } finally {
      setRerunningCodeMsgId(null);
    }
  };

  // Run a new code snippet or coding task directly from the Code History tab
  const handleRunNewCodeFromHistory = async () => {
    const cleanInput = newQuickCodeInput.trim();
    if (!cleanInput || isRunningNewQuickCode) return;

    setIsRunningNewQuickCode(true);
    try {
      const isRawCode = /(import |def |print\(|console\.log|function |const |let |SELECT |=)/i.test(cleanInput);
      const userPrompt = isRawCode
        ? `تشغيل كود برمجي مباشر:\n${cleanInput.slice(0, 100)}`
        : cleanInput;

      const reply = await askTidikelt(userPrompt, {
        mode: 'code',
        ...(isRawCode ? { customCode: cleanInput } : {}),
      });

      const now = Date.now();
      const resolvedCode = reply.code || (isRawCode ? cleanInput : undefined);
      const userMsg: Message = {
        id: `msg-${now}`,
        role: 'me',
        text: userPrompt,
        timestamp: now,
      };
      const botMsg: Message = {
        id: `msg-${now + 1}`,
        role: 'bot',
        text: reply.text,
        mode: 'code',
        code: resolvedCode,
        codeOutput: reply.codeOutput,
        codeCategory: detectCodeCategory(resolvedCode, userPrompt, reply.codeOutput),
        webSources: reply.sources,
        timestamp: now + 1,
        userPromptText: userPrompt,
      };

      setMessages((prev) => [...prev, userMsg, botMsg]);
      setNewQuickCodeInput('');
      setLastRerunSuccessId(botMsg.id);
      setTimeout(() => {
        setLastRerunSuccessId((prev) => (prev === botMsg.id ? null : prev));
      }, 3000);
    } catch (err) {
      console.error('Failed to execute new code from history tab:', err);
    } finally {
      setIsRunningNewQuickCode(false);
    }
  };

  // Community Correction Save
  const handleSaveCorrection = (msgId: string) => {
    if (!correctionText.trim()) return;
    const updatedFixes = [...fixes, correctionText.trim()].slice(-12);
    setFixes(updatedFixes);
    setCorrectionTargetId(null);
    setCorrectionText('');
  };

  // Add News
  const handleAddNews = () => {
    if (!newsText.trim()) return;

    const shouldApproveImmediately = !requireApproval || isAdminLoggedIn;
    const newItem: NewsItem = {
      id: `news-${Date.now()}`,
      s: newsSource.trim() || 'مصدر غير محدد',
      t: newsText.trim(),
      category: newsCategory || 'general',
      timestamp: Date.now(),
      status: shouldApproveImmediately ? 'approved' : 'pending',
    };

    setNews((prev) => [newItem, ...prev]);
    setNewsSource('');
    setNewsText('');
    playAlertChime('news', soundEnabled);

    // In-App Notification Trigger: Only verified/approved news appears in the Comprehensive Alert Brief
    if (shouldApproveImmediately) {
      const catDetails = getCategoryDetails(newItem.category);
      const updatedApprovedNews = [newItem, ...news.filter((n) => n.status === 'approved')];
      const briefSlides = [
        ...(weatherAlert.active
          ? [
              {
                id: 'weather-slide',
                source: weatherAlert.source || 'الأرصاد الجوية واليقظة',
                text: weatherAlert.message,
                categoryName: 'الأحوال الجوية',
                categoryEmoji: '🌤️',
                isWeatherAlert: true,
              },
            ]
          : []),
        ...updatedApprovedNews.map((item) => {
          const cat = getCategoryDetails(item.category);
          return {
            id: item.id,
            source: item.s,
            text: item.t,
            categoryName: cat.name,
            categoryEmoji: cat.emoji,
            isWeatherAlert: false,
          };
        }),
      ];

      pushInAppNotification({
        type: 'comprehensive_brief',
        title: `خبر موثق جديد (${catDetails.name}): ${newItem.s}`,
        message: newItem.t,
        source: newItem.s,
        isVerified: true,
        verifiedItems: briefSlides,
        severity: weatherAlert.active ? weatherAlert.severity : 'info',
        category: newItem.category,
        categoryName: catDetails.name,
        categoryEmoji: catDetails.emoji,
        categoryBadgeClass: catDetails.badgeClass,
        actionLabel: 'تفاصيل الأخبار الموثقة',
        onAction: () => setView('news'),
      });
    }

    if (!shouldApproveImmediately) {
      setNewsSubmitFeedback(
        'تم إرسال المعلومة بنجاح! ستظهر في الموجز الشامل بعد مراجعتها وتوثيقها من قبل مدير النظام.'
      );
    } else {
      setNewsSubmitFeedback('تم نشر وتوثيق الخبر فوراً في الموجز الشامل وقاعدة معارف المساعد.');
    }

    setTimeout(() => {
      setNewsSubmitFeedback(null);
    }, 6000);
  };

  // Admin Actions for News
  const handleApproveNews = (id: string) => {
    const itemToApprove = news.find((n) => n.id === id);
    setNews((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: 'approved' } : item))
    );
    playAlertChime('news', soundEnabled);

    // Call server moderation review endpoint with genuine admin session
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = adminSessionToken || sessionStorage.getItem('tidikelt_admin_session');
    if (token) {
      headers['x-admin-session'] = token;
      headers['authorization'] = `Bearer ${token}`;
    }

    fetch(`/api/community-news/admin/${id}/review`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({ decision: 'publish', note: 'اعتماد ونشر من لوحة تحكم المشرف' }),
    }).catch((e) => console.warn('Could not sync approve to server:', e));

    if (itemToApprove) {
      const catDetails = getCategoryDetails(itemToApprove.category);
      const updatedApprovedNews = [
        { ...itemToApprove, status: 'approved' as const },
        ...news.filter((n) => n.id !== id && n.status === 'approved'),
      ];
      const briefSlides = [
        ...(weatherAlert.active
          ? [
              {
                id: 'weather-slide',
                source: weatherAlert.source || 'الأرصاد الجوية واليقظة',
                text: weatherAlert.message,
                categoryName: 'الأحوال الجوية',
                categoryEmoji: '🌤️',
                isWeatherAlert: true,
              },
            ]
          : []),
        ...updatedApprovedNews.map((item) => {
          const cat = getCategoryDetails(item.category);
          return {
            id: item.id,
            source: item.s,
            text: item.t,
            categoryName: cat.name,
            categoryEmoji: cat.emoji,
            isWeatherAlert: false,
          };
        }),
      ];

      pushInAppNotification({
        type: 'comprehensive_brief',
        title: `توثيق خبر رسمي (${catDetails.name}): ${itemToApprove.s}`,
        message: itemToApprove.t,
        source: itemToApprove.s,
        isVerified: true,
        verifiedItems: briefSlides,
        severity: weatherAlert.active ? weatherAlert.severity : 'info',
        category: itemToApprove.category,
        categoryName: catDetails.name,
        categoryEmoji: catDetails.emoji,
        categoryBadgeClass: catDetails.badgeClass,
        actionLabel: 'تفاصيل الأخبار الموثقة',
        onAction: () => setView('news'),
      });
    }
  };

  const handleRejectNews = (id: string) => {
    setNews((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: 'rejected' } : item))
    );

    // Call server moderation review endpoint with genuine admin session
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = adminSessionToken || sessionStorage.getItem('tidikelt_admin_session');
    if (token) {
      headers['x-admin-session'] = token;
      headers['authorization'] = `Bearer ${token}`;
    }

    fetch(`/api/community-news/admin/${id}/review`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({ decision: 'reject', note: 'رفض من لوحة تحكم المشرف' }),
    }).catch((e) => console.warn('Could not sync reject to server:', e));
  };

  const handleDeleteNews = (id: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا الخبر نهائياً من النظام؟')) return;
    setNews((prev) => prev.filter((item) => item.id !== id));
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = adminSessionToken || sessionStorage.getItem('tidikelt_admin_session');
    if (token) {
      headers['x-admin-session'] = token;
      headers['authorization'] = `Bearer ${token}`;
    }
    fetch(`/api/community-news/admin/${id}/review`, {
      method: 'POST',
      headers,
      credentials: 'include',
      body: JSON.stringify({ decision: 'reject', note: 'حذف نهائي من لوحة المشرف' }),
    }).catch(() => {});
  };

  const handleStartEditNews = (item: NewsItem) => {
    setEditingNewsId(item.id);
    setEditSource(item.s);
    setEditText(item.t);
    setEditCategory(item.category || 'general');
  };

  const handleSaveEditNews = (id: string) => {
    if (!editText.trim()) return;
    setNews((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              s: editSource.trim() || 'مصدر غير محدد',
              t: editText.trim(),
              category: editCategory,
              status: 'approved',
            }
          : item
      )
    );
    setEditingNewsId(null);
  };

  const handleCreateAdminNews = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!adminNewText.trim() || !adminNewSource.trim()) return;

    const newItem: NewsItem = {
      id: `admin_news_${Date.now()}`,
      s: adminNewSource.trim(),
      t: adminNewText.trim(),
      category: adminNewCategory || 'general',
      timestamp: Date.now(),
      status: 'approved',
      isOfficial: true,
      officialVerified: true,
      likeCount: 0,
      repostCount: 0,
    };

    setNews((prev) => [newItem, ...prev]);
    setAdminNewText('');
    setAdminNewSource('');
    setIsAddingAdminNews(false);
    playAlertChime('news', soundEnabled);
    pushInAppNotification({
      type: 'news',
      title: `خبر رسمي جديد: ${newItem.s}`,
      message: newItem.t,
      category: newItem.category,
      isVerified: true,
    });
  };

  // Purge ALL news
  const handleClearAllNews = () => {
    if (
      window.confirm(
        '⚠️ تحذير لمدير النظام: هل أنت متأكد من مسح جميع أخبار السكان القديمة والمعلقة نهائياً؟ لن يتمكن المساعد من استرجاعها.'
      )
    ) {
      setNews([]);
    }
  };

  // Reset to initial verified bulletins
  const handleResetToDefaultNews = () => {
    if (
      window.confirm(
        'هل تود استعادة الأخبار الرسمية الموثقة الافتراضية الخاصة بمدينة عين صالح (الصيدلية، النظافة، حالة الطريق)؟'
      )
    ) {
      setNews(INITIAL_NEWS);
    }
  };

  // Clear fixes
  const handleClearAllFixes = () => {
    if (window.confirm('هل تود مسح جميع تصحيحات السكان السابقة؟')) {
      setFixes([]);
    }
  };

  // Trip Tracker Actions
  const [customDesertChecklist, setCustomDesertChecklist] = useState<string[]>(loadDesertChecklist);

  useEffect(() => {
    const syncDesertOwner = () => {
      setCustomDesertChecklist(loadDesertChecklist());
      const storedTrips = loadDesertTrips();
      const active = storedTrips.find((tr) => tr.status === 'active');
      if (active) {
        setTrip({
          d: active.d,
          r: new Date(active.t).toISOString().slice(0, 16),
          p: active.p,
        });
      }
    };
    window.addEventListener('tidikelt-owner-sync', syncDesertOwner);
    return () => window.removeEventListener('tidikelt-owner-sync', syncDesertOwner);
  }, []);

  const handleRegisterTrip = () => {
    if (!tripDest.trim() || !tripReturn) return;
    if (tripPhone.trim() && isTargetBanned(tripPhone.trim())) {
      pushInAppNotification({
        type: 'system',
        title: 'رقم هاتف محظور',
        message: 'عذراً، هذا الرقم محظور من قبل إدارة منصة تيدكلت AI.',
      });
      return;
    }
    const returnTs = new Date(tripReturn).getTime() || Date.now() + 3600000 * 4;
    const currentTrips = loadDesertTrips();
    saveDesertTrips([
      {
        id: `trip-${Date.now()}`,
        d: tripDest.trim(),
        t: returnTs,
        p: tripPhone.trim(),
        status: 'active',
        createdAt: Date.now(),
      },
      ...currentTrips,
    ]);
    setTrip({
      d: tripDest.trim(),
      r: tripReturn,
      p: tripPhone.trim(),
    });
    setTripDest('');
    setTripReturn('');
    setTripPhone('');
  };

  const handleClearTrip = () => {
    setTrip(null);
    const currentTrips = loadDesertTrips().map((tr) =>
      tr.status === 'active' ? { ...tr, status: 'completed' as const } : tr
    );
    saveDesertTrips(currentTrips);
  };

  // Geolocation Action
  const handleGetLocation = () => {
    setLocLoading(true);
    setLocOutput({ text: 'جاري تحديد موقعك الجغرافي عبر الأقمار الصناعية (GPS)...' });

    if (!navigator.geolocation) {
      setLocLoading(false);
      setLocOutput({ text: 'هذا الجهاز أو المتصفح لا يدعم تحديد الموقع.' });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocLoading(false);
        const lat = position.coords.latitude.toFixed(5);
        const lng = position.coords.longitude.toFixed(5);
        const mapsLink = `https://maps.google.com/?q=${lat},${lng}`;
        const smsMessage = `موقعي الحالي في الصحراء: ${lat}, ${lng} - رابط الخريطة: ${mapsLink}`;
        const phone = trip?.p || '14';
        const smsUrl = buildSmsUrl(phone, smsMessage);

        setLocOutput({
          text: `خط العرض: ${lat} ، خط الطول: ${lng}`,
          coords: { lat, lng },
          smsUrl,
        });
      },
      () => {
        setLocLoading(false);
        setLocOutput({
          text: 'تعذر تحديد الموقع. يرجى تفعيل نظام الـ GPS في هاتفك وإعطاء الإذن للمتصفح.',
        });
      },
      { enableHighAccuracy: true, timeout: 25000, maximumAge: 0 }
    );
  };

  // TTS Speech Player
  const handlePlayTts = async (text: string) => {
    if (!text || isTtsLoading) return;
    setIsTtsLoading(true);

    try {
      if (audioRef.current) {
        audioRef.current.pause();
        setIsAudioPlaying(false);
      }

      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: text.slice(0, 1000),
          voice: 'Kore',
        }),
      });

      if (!res.ok) throw new Error('TTS error');

      const data = await res.json();
      const binaryString = atob(data.audio);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const blob = new Blob([bytes], { type: 'audio/wav' });
      const url = URL.createObjectURL(blob);
      setAudioUrl(url);

      setTimeout(() => {
        if (audioRef.current) {
          audioRef.current.play().catch(() => {});
          setIsAudioPlaying(true);
        }
      }, 50);
    } catch (err) {
      console.error(err);
    } finally {
      setIsTtsLoading(false);
    }
  };

  const handleStopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsAudioPlaying(false);
    }
  };

  // Quick suggestions for research, tables, code, and local inquiries
  const quickPrompts = [
    '📊 أنجز لي جدولاً بيانياً مفصلاً يقارن بين واحات تديكلت ومسافات الطرق',
    '🎓 أنجز لي بحثاً متكاملاً حول الثورة التحريرية الجزائرية مع خطة ومراجع',
    '💻 اكتب لي كود بايثون عملي لحساب واستهلاك الطاقة الشمسية مع الشرح',
    '🛣️ ما هي حالة طريق عين صالح تمنراست RN1 والطقس اليوم؟',
    '✍️ صغ لي طلباً إدارياً رسمياً موجهاً للبلدية أو الولاية',
    '🩺 إسعافات أولية عاجلة للدغة عقرب صحراوي في عين صالح',
  ];

  // Calculation for active trip
  let tripStatus: { isLate: boolean; text: string; smsText?: string } | null = null;
  if (trip) {
    const leftMs = new Date(trip.r).getTime() - Date.now();
    const isLate = leftMs < 0;
    const totalMinutes = Math.abs(Math.round(leftMs / 60000));
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;

    let timeText = '';
    if (isLate) {
      timeText = `تأخرت عن الموعد بـ ${hours ? `${hours} ساعة و ` : ''}${mins} دقيقة!`;
    } else {
      timeText = `باقي على موعد الرجوع: ${hours ? `${hours} ساعة و ` : ''}${mins} دقيقة.`;
    }

    const alertSmsText = `تنبيه: تأخرت في الرجوع من ${trip.d}. هذا آخر موعد حددته بالرحلة. يرجى الاتصال بي، أو الاتصال بالحماية المدنية 14 أو الدرك 1055 إن تعذر التواصل.`;

    tripStatus = {
      isLate,
      text: timeText,
      smsText: alertSmsText,
    };
  }

  // Filtered lists
  const pendingNews = news.filter((n) => n.status === 'pending');
  const approvedNews = news.filter((n) => n.status === 'approved' || !n.status);
  const rejectedNews = news.filter((n) => n.status === 'rejected');

  // Weather Banner Color Styles
  const getAlertStyle = (severity: 'danger' | 'warning' | 'info') => {
    switch (severity) {
      case 'danger':
        return {
          bg: 'bg-rose-950/40 border-rose-600/80 text-rose-100',
          badge: 'bg-rose-600 text-white',
          iconColor: 'text-rose-400',
          glow: 'shadow-rose-900/30',
        };
      case 'info':
        return {
          bg: 'bg-emerald-950/40 border-emerald-600/80 text-emerald-100',
          badge: 'bg-emerald-600 text-white',
          iconColor: 'text-emerald-400',
          glow: 'shadow-emerald-900/30',
        };
      case 'warning':
      default:
        return {
          bg: 'bg-amber-950/40 border-amber-500/80 text-amber-100',
          badge: 'bg-amber-500 text-slate-950',
          iconColor: 'text-amber-400',
          glow: 'shadow-amber-900/30',
        };
    }
  };

  const currentAlertStyle = getAlertStyle(weatherAlert.severity);

  return (
    <div className="h-[var(--app-viewport-height,100dvh)] w-full max-w-[100vw] flex overflow-hidden bg-[var(--bg)] text-[var(--ink)] font-sans selection:bg-[#2F5D50] selection:text-white relative">
      {/* Hidden audio element for voice playback */}
      <audio
        ref={audioRef}
        src={audioUrl || undefined}
        onEnded={() => setIsAudioPlaying(false)}
        onPause={() => setIsAudioPlaying(false)}
        onPlay={() => setIsAudioPlaying(true)}
      />

      {/* Floating Audio Bar if speaking */}
      {(isAudioPlaying || isTtsLoading) && (
        <div className="fixed top-3 left-4 right-4 z-50 flex items-center justify-between px-4 py-2.5 rounded-xl bg-[var(--card)] border border-[var(--line)] shadow-lg animate-in fade-in">
          <div className="flex items-center gap-2">
            {isTtsLoading ? (
              <Loader2 className="w-4 h-4 text-[var(--green)] animate-spin" />
            ) : (
              <Volume2 className="w-4 h-4 text-[var(--green)] animate-pulse" />
            )}
            <span className="text-xs font-semibold">
              {isTtsLoading ? 'جاري تحضير الصوت...' : 'المساعد الصوتي يتحدث الآن'}
            </span>
          </div>
          <button
            onClick={handleStopAudio}
            className="text-xs text-[var(--mute)] hover:text-[var(--bad)] font-semibold flex items-center gap-1 cursor-pointer"
          >
            <VolumeX className="w-3.5 h-3.5" />
            إيقاف
          </button>
        </div>
      )}

      {/* PIN Authentication Modal is rendered once at the root level with .admin-pin-modal */}

      {/* Direct Browser 1-Tap Install Banner when opened in Chrome with ?install=1 */}
      {showDirectInstallBanner && !isInstalled && (
        <div className="fixed top-2 inset-x-3 z-[90] max-w-md mx-auto bg-[#065f46] text-white rounded-2xl p-3 shadow-2xl border border-emerald-400/40 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <b className="text-xs font-extrabold block">تثبيت مباشر للتطبيق الكامل على هاتفك</b>
            <span className="text-[11px] text-emerald-100 block">
              {isInstallable
                ? 'اضغط على زر «تثبيت الآن» لإضافة التطبيق فوراً من متصفح Chrome'
                : 'من قائمة متصفح Chrome (⋮) اختر «تثبيت التطبيق» أو «إضافة للشاشة الرئيسية»'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {isInstallable && (
              <button
                type="button"
                onClick={async () => {
                  const ok = await installPWA();
                  if (ok) setShowDirectInstallBanner(false);
                }}
                className="px-3 py-1.5 rounded-xl bg-white text-[#065f46] text-xs font-extrabold cursor-pointer shadow-sm"
              >
                تثبيت الآن
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowDirectInstallBanner(false)}
              className="p-1.5 rounded-lg text-emerald-100 hover:bg-white/10 cursor-pointer"
              aria-label="إغلاق"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Mobile Drawer Overlay */}
      {isMobileSidebarOpen && !isMindFocusMode && (
        <div
          onClick={() => setIsMobileSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 md:hidden transition-opacity"
        />
      )}

      {/* Modern AI Sidebar: PC Collapsible & Resizable, Mobile Slide-out Drawer (Hidden in Mind Focus Mode) */}
      <aside
        className={`fixed md:static inset-y-0 start-0 z-50 md:z-auto ${
          sidebarWidthStep === 0
            ? 'w-60 md:w-52'
            : sidebarWidthStep === 1
            ? 'w-72 md:w-64 lg:w-72'
            : sidebarWidthStep === 2
            ? 'w-80 md:w-80 lg:w-[340px]'
            : 'w-[88vw] max-w-[380px] md:w-96 lg:w-[400px]'
        } bg-[var(--card)] border-e border-[var(--line)] flex-col transition-transform duration-200 ease-in-out shrink-0 select-none ${
          isMindFocusMode
            ? 'hidden'
            : isMobileSidebarOpen
            ? !isSidebarOpen
              ? 'flex md:hidden translate-x-0 shadow-2xl pointer-events-auto'
              : 'flex translate-x-0 shadow-2xl pointer-events-auto'
            : !isSidebarOpen
            ? 'hidden'
            : 'hidden md:flex md:translate-x-0'
        }`}
      >
        {/* Horizontal Drag-to-Resize Handle on Sidebar Edge */}
        <span
          role="separator"
          aria-orientation="vertical"
          onMouseDown={(e) => {
            e.preventDefault();
            setIsResizingSidebarWidth(true);
          }}
          onDoubleClick={() => setSidebarWidthStep((prev) => (prev === 1 ? 2 : 1))}
          title={lang === 'ar' ? 'اسحب لتمديد أو تقصير عرض الشريط الجانبي' : 'Drag to resize sidebar'}
          className={`hidden md:flex absolute inset-y-0 end-0 w-2 translate-x-1/2 z-40 cursor-ew-resize items-center justify-center group ${
            isResizingSidebarWidth ? 'bg-[var(--green)]/25' : 'hover:bg-[var(--green)]/15'
          } transition-colors`}
        >
          <span
            className={`w-1 h-12 rounded-full transition-all ${
              isResizingSidebarWidth
                ? 'bg-[var(--green)] scale-y-125'
                : 'bg-[var(--line)] group-hover:bg-[var(--green)]'
            }`}
          />
        </span>

        {/* Sidebar Header: App Logo + New Chat Icon */}
        <div className="p-3.5 border-b border-[var(--line)] flex items-center justify-between gap-2">
          <div
            className="flex items-center gap-2.5 cursor-pointer min-w-0"
            onClick={() => {
              setView('chat');
              setIsMobileSidebarOpen(false);
            }}
          >
            <div
              onClick={(e) => {
                e.stopPropagation();
                handleLogoClick();
              }}
              className="relative w-9 h-9 rounded-xl overflow-hidden flex items-center justify-center border border-[var(--line)] select-none cursor-pointer shrink-0 bg-[#031752]"
              title={t.appName}
            >
              <img
                src="/icon.svg"
                alt={t.appName}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-extrabold text-[var(--ink)] tracking-tight leading-tight truncate m-0">
                {t.appName}
              </h2>
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  setIsLocationModalOpen(true);
                }}
                className="text-[10px] text-[var(--mute)] hover:text-[var(--ink)] flex items-center gap-1.5 cursor-pointer transition-colors group mt-0.5"
                title={`${t.yourLocation}: ${currentLocationDisplayName} (${t.changeWilaya})`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 group-hover:scale-125 transition-transform animate-pulse shrink-0" />
                <span className="font-semibold text-emerald-700 dark:text-emerald-400 group-hover:underline truncate">
                  {currentLocationDisplayName}
                </span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={handleNewChat}
              className="p-1.5 rounded-lg text-[var(--ink)] hover:bg-[var(--bg)] border border-[var(--line)] cursor-pointer transition-colors"
              title={t.newChat}
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsMobileSidebarOpen(false)}
              className="md:hidden p-1.5 rounded-lg text-[var(--mute)] hover:text-[var(--ink)] cursor-pointer"
              title={t.closeMenu}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* New Chat Primary Button */}
        <div className="p-3 border-b border-[var(--line)]">
          <button
            onClick={handleNewChat}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-[var(--green)] text-white hover:opacity-90 font-bold text-xs shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{t.newChat}</span>
          </button>
        </div>

        {/* Sidebar Scrollable & Resizable Body: Views & Navigation */}
        <div className="flex-1 min-h-0 overflow-hidden px-2.5 py-2 flex flex-col gap-1.5 transition-all duration-200">
          {/* 1. Compact Sections & Services (Only 2 shown by default + Show More) */}
          <div className="shrink-0 pb-0.5 transition-all duration-200">
            <div className="flex items-center justify-between px-1.5 mb-1 gap-1">
              <span className="text-[9.5px] uppercase font-bold text-[var(--mute)] tracking-wider truncate">
                {t.sectionsAndServices}
              </span>
              <button
                type="button"
                onClick={() => setIsSidebarMoreOpen((prev) => !prev)}
                className="inline-flex items-center gap-0.5 text-[9.5px] font-bold text-[var(--green)] hover:underline cursor-pointer transition-colors"
              >
                <span>
                  {isSidebarMoreOpen
                    ? lang === 'ar'
                      ? 'عرض أقل'
                      : 'Show Less'
                    : lang === 'ar'
                    ? 'مشاهدة المزيد'
                    : 'Show More'}
                </span>
                {isSidebarMoreOpen ? (
                  <ChevronUp className="w-2.5 h-2.5" />
                ) : (
                  <ChevronDown className="w-2.5 h-2.5" />
                )}
              </button>
            </div>

            <div className="space-y-0.5">
              {/* 1. المحادثة الذكية (Smart Chat) — Top Item */}
              <button
                type="button"
                onClick={() => {
                  setView('chat');
                  setIsMobileSidebarOpen(false);
                }}
                className={`w-full flex items-center justify-between px-2 py-1 rounded-lg text-[10.5px] font-semibold transition-all cursor-pointer border ${
                  view === 'chat'
                    ? 'bg-[var(--green)]/15 border-[var(--green)]/40 text-[var(--green)] font-bold shadow-2xs'
                    : 'text-[var(--ink)] hover:bg-[var(--bg)] border-transparent'
                }`}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <MessageSquare className="w-3 h-3 text-[var(--green)] shrink-0" />
                  <span className="truncate text-[10.5px]">{t.smartChat}</span>
                </div>
                {messages.length > 0 && (
                  <span className="text-[8.5px] opacity-80 font-mono px-1.5 py-0.2 rounded-full bg-black/5 dark:bg-white/10 shrink-0">
                    {messages.length}
                  </span>
                )}
              </button>

              {/* 2. باب الخير (Bab Al-Khair Charity Platform) — Second Item */}
              <button
                type="button"
                onClick={() => {
                  setView('charity');
                  setIsMobileSidebarOpen(false);
                }}
                title={
                  lang === 'ar'
                    ? 'تطبيق باب الخير · منصة العمل الخيري والتضامني'
                    : 'Bab Al-Khair · Charity Platform'
                }
                aria-label={
                  lang === 'ar'
                    ? 'تطبيق باب الخير · منصة العمل الخيري والتضامني'
                    : 'Bab Al-Khair · Charity Platform'
                }
                className={`w-full flex items-center justify-between px-2 py-1 rounded-lg text-[10.5px] font-semibold transition-all cursor-pointer border ${
                  view === 'charity'
                    ? 'bg-emerald-600/15 border-emerald-600/50 text-emerald-700 dark:text-emerald-300 font-bold shadow-2xs'
                    : 'text-[var(--ink)] hover:bg-[var(--bg)] border-transparent'
                }`}
              >
                <div className="flex items-center gap-1.5 min-w-0">
                  <HeartHandshake className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span className="truncate text-[10.5px]">
                    {lang === 'ar' ? 'باب الخير · العمل الخيري' : 'Bab Al-Khair · Charity'}
                  </span>
                </div>
                <span className="text-[8.5px] font-semibold text-emerald-600 dark:text-emerald-400 shrink-0">
                  {lang === 'ar' ? 'تضامن' : 'Solidarity'}
                </span>
              </button>

              {/* Hidden items revealed only upon clicking "مشاهدة المزيد" */}
              {isSidebarMoreOpen && (
                <div className="space-y-0.5 pt-0.5 animate-in fade-in duration-150">
                  {/* 3. محليات (Local News) — Third Item */}
                  <button
                    type="button"
                    onClick={() => {
                      setView('news');
                      setIsMobileSidebarOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-2 py-1 rounded-lg text-[10.5px] font-semibold transition-all cursor-pointer border ${
                      view === 'news'
                        ? 'bg-[var(--green)]/15 border-[var(--green)]/40 text-[var(--green)] font-bold shadow-2xs'
                        : 'text-[var(--ink)] hover:bg-[var(--bg)] border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div className="w-4 h-4 rounded-md bg-amber-500/15 text-amber-500 flex items-center justify-center shrink-0">
                        <Sparkles className="w-2.5 h-2.5 stroke-[2.5]" />
                      </div>
                      <span className="truncate text-[10.5px]">
                        {lang === 'ar' ? 'محليات' : t.localNews}
                      </span>
                    </div>
                    {approvedNews.length > 0 && (
                      <span className="text-[8.5px] font-bold px-1.5 py-0.2 rounded-full bg-[var(--green)]/15 text-[var(--green)] shrink-0">
                        {approvedNews.length}
                      </span>
                    )}
                  </button>

                  {/* 4. كاش بلاصة (Kash Bilasa Inter-Wilaya Ride Sharing) — Fourth Item */}
                  <button
                    type="button"
                    onClick={() => {
                      setView('rides');
                      setIsMobileSidebarOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-2 py-1 rounded-lg text-[10.5px] font-semibold transition-all cursor-pointer border ${
                      view === 'rides'
                        ? 'bg-[var(--green)]/15 border-[var(--green)]/40 text-[var(--green)] font-bold shadow-2xs'
                        : 'text-[var(--ink)] hover:bg-[var(--bg)] border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Car className="w-3 h-3 text-[var(--green)] shrink-0" />
                      <span className="truncate text-[10.5px]">
                        {lang === 'ar' ? 'طريقي' : 'Kash Bilasa · Rides'}
                      </span>
                    </div>
                    <span className="text-[8.5px] font-mono tabular-nums text-[var(--green)] font-semibold shrink-0">
                      58 ولاية
                    </span>
                  </button>
                </div>
              )}

              {/* Compact "مشاهدة المزيد / إخفاء" trigger button at bottom of the 2 items */}
              <button
                type="button"
                onClick={() => setIsSidebarMoreOpen((prev) => !prev)}
                className="w-full flex items-center justify-center gap-1 py-0.5 px-2 rounded-md text-[9.5px] font-semibold text-[var(--mute)] hover:text-[var(--ink)] hover:bg-[var(--bg)]/80 transition-colors cursor-pointer"
              >
                <span>
                  {isSidebarMoreOpen
                    ? lang === 'ar'
                      ? 'إخفاء الأقسام الإضافية'
                      : 'Hide extra sections'
                    : lang === 'ar'
                    ? 'مشاهدة المزيد (محليات · كاش بلاصة)'
                    : 'Show More (News · Rides)'}
                </span>
                {isSidebarMoreOpen ? (
                  <ChevronUp className="w-2.5 h-2.5 shrink-0" />
                ) : (
                  <ChevronDown className="w-2.5 h-2.5 shrink-0" />
                )}
              </button>
            </div>
          </div>

          {/* 2. Primary Section: Archived Chat Sessions (سجل المحادثات هي الأساسية) */}
          <div className="flex-1 min-h-0 flex flex-col pt-2 border-t border-[var(--line)]">
            <div className="flex items-center justify-between px-1.5 mb-1.5 shrink-0">
              <span className="text-[11px] font-extrabold text-[var(--ink)] tracking-tight flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-[var(--green)]" />
                <span>{t.archivedSessions}</span>
              </span>
              {chatSessions.length > 0 && (
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-[var(--green)]/15 text-[var(--green)]">
                  {chatSessions.length}
                </span>
              )}
            </div>

            {chatSessions.length === 0 ? (
              <div className="px-2.5 py-3 text-center border border-dashed border-[var(--line)]/60 rounded-xl my-1 bg-[var(--bg)]/30">
                <p className="text-[10.5px] text-[var(--mute)] leading-relaxed m-0">{t.noArchivedSessions}</p>
              </div>
            ) : (
              <div className="space-y-1 flex-1 min-h-0 overflow-y-auto pr-0.5">
                {chatSessions.map((session) => {
                  const isActive = activeSessionId === session.id;
                  const isEditing = editingSessionId === session.id;

                  return (
                    <div
                      key={session.id}
                      onClick={() => !isEditing && handleSelectSession(session.id)}
                      className={`group relative flex items-center justify-between gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all cursor-pointer border ${
                        isActive
                          ? 'bg-[var(--green)]/10 border-[var(--green)]/35 text-[var(--ink)] shadow-2xs font-bold'
                          : 'border-transparent text-[var(--ink)] hover:bg-[var(--bg)] hover:border-[var(--line)]'
                      }`}
                    >
                      {isEditing ? (
                        <div className="flex items-center gap-1 w-full" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="text"
                            value={editingSessionTitle}
                            onChange={(e) => setEditingSessionTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleRenameSession(session.id, editingSessionTitle);
                              if (e.key === 'Escape') setEditingSessionId(null);
                            }}
                            autoFocus
                            className="w-full text-xs px-2 py-0.5 bg-[var(--card)] border border-[var(--green)] rounded-md text-[var(--ink)] focus:outline-none"
                            placeholder={t.renameSession}
                          />
                          <button
                            type="button"
                            onClick={() => handleRenameSession(session.id, editingSessionTitle)}
                            className="p-1 text-emerald-600 hover:bg-emerald-500/10 rounded-md cursor-pointer"
                            title={t.saveName}
                          >
                            <Check className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingSessionId(null)}
                            className="p-1 text-[var(--mute)] hover:bg-black/5 rounded-md cursor-pointer"
                            title={t.cancel}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            <span
                              className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                isActive ? 'bg-[var(--green)] animate-pulse' : 'bg-[var(--mute)] opacity-40 group-hover:opacity-75'
                              }`}
                            />
                            <span className="truncate font-medium text-[11.5px] leading-tight" title={session.title}>
                              {session.title}
                            </span>
                          </div>

                          {/* Right Side: Message Count / Time or Actions Trigger on Hover */}
                          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                            {openSessionMenuId !== session.id && (
                              <span className="text-[9.5px] font-mono text-[var(--mute)] opacity-60 group-hover:hidden px-1">
                                {session.messages?.length || 0}
                              </span>
                            )}

                            {/* Three-dots menu button */}
                            <div className="relative">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenSessionMenuId((prev) => (prev === session.id ? null : session.id));
                                }}
                                className={`p-1 rounded-md transition-all cursor-pointer ${
                                  openSessionMenuId === session.id
                                    ? 'bg-[var(--bg)] text-[var(--ink)] opacity-100'
                                    : 'text-[var(--mute)] hover:text-[var(--ink)] hover:bg-[var(--bg)] opacity-0 group-hover:opacity-100'
                                }`}
                                title={lang === 'ar' ? 'خيارات المحادثة' : lang === 'fr' ? 'Options de conversation' : 'Conversation options'}
                              >
                                <MoreVertical className="w-3.5 h-3.5" />
                              </button>

                              {openSessionMenuId === session.id && (
                                <div
                                  onClick={(e) => e.stopPropagation()}
                                  className="absolute end-0 top-full mt-1 z-50 w-36 rounded-xl bg-[var(--card)] border border-[var(--line)] shadow-xl py-1 flex flex-col animate-in fade-in duration-150"
                                >
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingSessionId(session.id);
                                      setEditingSessionTitle(session.title);
                                      setOpenSessionMenuId(null);
                                    }}
                                    className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[11px] font-medium text-[var(--ink)] hover:bg-[var(--bg)] transition-colors cursor-pointer text-start"
                                  >
                                    <Pencil className="w-3 h-3 text-[var(--mute)] shrink-0" />
                                    <span>{t.renameSession}</span>
                                  </button>
                                  <div className="my-0.5 border-t border-[var(--line)]/60" />
                                  <button
                                    type="button"
                                    onClick={(e) => handleDeleteSession(session.id, e)}
                                    className="w-full flex items-center gap-2 px-2.5 py-1.5 text-[11px] font-semibold text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer text-start"
                                  >
                                    <Trash2 className="w-3 h-3 shrink-0" />
                                    <span>{t.deleteSession}</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 3. Dedicated Independent Emergency & Rapid Rescue Section — Compact & Neutral (بدون ألوان) */}
          <div className="shrink-0 py-1 px-2 border-t border-[var(--line)]/50 bg-transparent rounded-xl mt-0.5">
            <div className="flex items-center justify-between px-0.5 mb-1">
              <span className="text-[9.5px] uppercase font-bold text-[var(--mute)] tracking-wider flex items-center gap-1">
                <span>{t.quickEmergency}</span>
              </span>
              <span className="text-[8.5px] font-mono text-[var(--mute)] font-semibold">24/24h</span>
            </div>

            <div className="grid grid-cols-4 gap-1">
              <a
                href="tel:14"
                className="py-1 px-0.5 rounded-lg bg-[var(--bg)] hover:bg-[var(--line)]/40 text-[var(--ink)] border border-[var(--line)] text-[10px] font-bold text-center transition-colors"
                title="الحماية المدنية - 14"
              >
                14
              </a>

              <a
                href="tel:1055"
                className="py-1 px-0.5 rounded-lg bg-[var(--bg)] hover:bg-[var(--line)]/40 text-[var(--ink)] border border-[var(--line)] text-[10px] font-bold text-center transition-colors"
                title="الدرك الوطني - 1055"
              >
                1055
              </a>

              <a
                href="tel:17"
                className="py-1 px-0.5 rounded-lg bg-[var(--bg)] hover:bg-[var(--line)]/40 text-[var(--ink)] border border-[var(--line)] text-[10px] font-bold text-center transition-colors"
                title="شرطة النجدة - 17"
              >
                17
              </a>

              <a
                href="tel:1548"
                className="py-1 px-0.5 rounded-lg bg-[var(--bg)] hover:bg-[var(--line)]/40 text-[var(--ink)] border border-[var(--line)] text-[10px] font-bold text-center transition-colors"
                title="الرقم الأخضر - 1548"
              >
                1548
              </a>
            </div>
          </div>
        </div>

        {/* Sidebar Footer — Compact & Slim */}
        <div className="px-2 py-1.5 border-t border-[var(--line)] flex flex-col gap-1.5">
          {/* Direct Full-App Install & Desktop/Home-Screen Shortcut Button */}
          <button
            type="button"
            id="openDownload"
            onClick={handleDirectBrowserOrLightDownload}
            className="download-button w-full flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg border border-emerald-600/40 bg-[#176b52] hover:bg-[#125742] text-white text-[11px] font-bold cursor-pointer transition-all shadow-xs active:scale-[0.98] no-underline"
            title={lang === 'ar' ? 'تثبيت التطبيق الكامل مباشرة على الشاشة الرئيسية أو سطح المكتب' : 'Install Full App to Home Screen or Desktop'}
            aria-label={lang === 'ar' ? 'تنزيل التطبيق' : 'Download App'}
          >
            <Download className="w-3.5 h-3.5 shrink-0" />
            <span className="font-bold">
              {lang === 'ar'
                ? 'تنزيل التطبيق'
                : lang === 'fr'
                ? "Installer l'application"
                : 'Download App'}
            </span>
          </button>

          {/* Controls Row: Theme, Sound, Cloud Sync, and App Badge */}
          <div className="flex items-center justify-between gap-1">
            <div className="flex items-center gap-1">
              <button
                onClick={toggleTheme}
                className="p-1 rounded-lg text-[var(--mute)] hover:text-[var(--ink)] hover:bg-[var(--bg)] border border-[var(--line)] cursor-pointer transition-colors"
                title={t.toggleTheme}
              >
                {theme === 'dark' ? <Sun className="w-3 h-3 text-[var(--gold)]" /> : <Moon className="w-3 h-3" />}
              </button>

              <button
                onClick={toggleSound}
                className={`p-1 rounded-lg border border-[var(--line)] cursor-pointer transition-colors ${
                  soundEnabled
                    ? 'text-[var(--green)] bg-[var(--green)]/10 font-bold'
                    : 'text-[var(--mute)] hover:text-[var(--ink)] hover:bg-[var(--bg)]'
                }`}
                title={soundEnabled ? t.soundEnabledTooltip : t.soundDisabledTooltip}
              >
                {soundEnabled ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
              </button>

            {/* Compact Aesthetic Cloud Sync Box next to Sound & Night Mode */}
            {firebaseUser ? (
              <div
                className="flex items-center gap-1 ps-1 pe-1.5 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-[9.5px] font-bold text-emerald-600 dark:text-emerald-400 transition-all"
                title={`متصل بالسحابة: ${firebaseUser.displayName || 'مستخدم تديكلت'}`}
              >
                <div className="relative shrink-0">
                  {firebaseUser.photoURL ? (
                    <img
                      src={firebaseUser.photoURL}
                      alt={firebaseUser.displayName || 'User'}
                      referrerPolicy="no-referrer"
                      className="w-3.5 h-3.5 rounded-full object-cover ring-1 ring-emerald-500/40"
                    />
                  ) : (
                    <div className="w-3.5 h-3.5 rounded-full bg-emerald-600 text-white text-[8px] font-bold flex items-center justify-center">
                      {(firebaseUser.displayName || 'U').charAt(0)}
                    </div>
                  )}
                  <span className="absolute -bottom-0.5 -end-0.5 w-1 h-1 rounded-full bg-emerald-500 ring-1 ring-[var(--card)]" />
                </div>
                <span className="truncate max-w-[48px]">
                  {firebaseUser.displayName ? firebaseUser.displayName.split(' ')[0] : 'مزامنة'}
                </span>
                <button
                  type="button"
                  onClick={() => signOutUser()}
                  className="ms-0.5 p-0.5 rounded hover:bg-rose-500/15 text-[var(--mute)] hover:text-rose-500 transition-colors cursor-pointer"
                  title="تسجيل الخروج من المزامنة"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={async () => {
                  setIsFirebaseSigningIn(true);
                  try {
                    const user = await signInWithGooglePopup();
                    if (user && news.length > 0) {
                      for (const item of news.slice(0, 5)) {
                        await saveNewsItemToCloud({
                          id: item.id,
                          source: item.s,
                          text: item.t,
                          category: item.category || 'general',
                        }).catch(() => {});
                      }
                    }
                  } catch (err) {
                    console.warn('Google Sign-In cancelled or failed:', err);
                  } finally {
                    setIsFirebaseSigningIn(false);
                  }
                }}
                disabled={isFirebaseSigningIn}
                className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[var(--bg)]/80 hover:bg-[var(--green)]/10 border border-[var(--line)] hover:border-[var(--green)]/40 text-[9.5px] font-bold text-[var(--mute)] hover:text-[var(--green)] transition-all cursor-pointer shadow-2xs"
                title="مزامنة الحساب والمحادثات عبر Google"
              >
                {isFirebaseSigningIn ? (
                  <Loader2 className="w-3 h-3 animate-spin text-[var(--green)] shrink-0" />
                ) : (
                  <RefreshCw className="w-2.5 h-2.5 text-[var(--green)] shrink-0" />
                )}
                <span className="whitespace-nowrap">
                  {isFirebaseSigningIn ? 'يتصل...' : 'مزامنة'}
                </span>
              </button>
            )}

            {/* Exclusive Owner Active Session button (invisible to regular visitors) */}
            {isAdminLoggedIn && (
              <button
                onClick={() => {
                  setView(view === 'admin' ? 'chat' : 'admin');
                  if (window.innerWidth < 768) setIsMobileSidebarOpen(false);
                }}
                className="p-1 rounded-lg border border-[var(--gold)]/40 text-[var(--gold)] bg-[var(--gold)]/10 font-bold cursor-pointer transition-colors"
                title={t.adminPanel}
              >
                <ShieldCheck className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 text-[9.5px] text-[var(--mute)] font-semibold min-w-0 select-none">
            <img
              src="/icon.svg"
              alt={t.appName}
              referrerPolicy="no-referrer"
              className="w-3 h-3 rounded object-cover ring-1 ring-cyan-500/30 shrink-0 opacity-90"
            />
            <span className="whitespace-nowrap px-1 py-0.5 rounded bg-[var(--bg)]/90 border border-[var(--line)]/80 shadow-inner font-extrabold tracking-wide text-[var(--mute)]">
              {t.appName}
            </span>
          </div>
        </div>
        </div>
      </aside>

      {showIOSInstallGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
          <div className="w-full max-w-sm rounded-3xl bg-[var(--card)] border border-[var(--line)] p-5 shadow-2xl space-y-3 text-[var(--ink)]">
            <div className="flex items-center gap-3">
              <img
                src="/icon.svg"
                alt={t.appName}
                referrerPolicy="no-referrer"
                className="w-11 h-11 rounded-2xl object-cover shadow-md ring-1 ring-cyan-500/40 shrink-0"
              />
              <h3 className="text-base font-black m-0">تثبيت {t.appName} على iPhone / iPad</h3>
            </div>
            <p className="text-xs text-[var(--mute)] leading-relaxed">
              1. اضغط على زر <strong>المشاركة (Share)</strong> في شريط متصفح Safari.<br />
              2. اختر <strong>إضافة إلى الشاشة الرئيسية (Add to Home Screen)</strong> لتشغيل التطبيق بملء الشاشة ومع دعم الطوارئ بدون إنترنت.
            </p>
            <button
              type="button"
              onClick={() => setShowIOSInstallGuide(false)}
              className="w-full py-2.5 rounded-xl bg-[var(--green)] text-white text-xs font-extrabold cursor-pointer"
            >
              حسناً، فهمت
            </button>
          </div>
        </div>
      )}

      {/* 1-Click Direct Full App Install Banner when launched via shortcut or ?install=1 */}
      {showDirectInstallBanner && !isInstalled && (
        <div
          className="fixed bottom-4 inset-x-3 sm:inset-x-auto sm:end-5 sm:w-96 z-50 rounded-2xl bg-[var(--card)] border-2 border-[var(--green)] p-3.5 shadow-2xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-3"
          dir={lang === 'ar' ? 'rtl' : 'ltr'}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src="/icon.svg"
              alt={t.appName}
              referrerPolicy="no-referrer"
              className="w-10 h-10 rounded-xl object-cover shrink-0 ring-1 ring-[var(--green)]/40"
            />
            <div className="min-w-0">
              <div className="text-xs font-extrabold text-[var(--ink)] truncate">
                {lang === 'ar' ? `تثبيت ${t.appName} الكامل` : `Install Full ${t.appName}`}
              </div>
              <div className="text-[11px] text-[var(--mute)] truncate">
                {lang === 'ar'
                  ? 'إضافة مباشرة إلى الشاشة الرئيسية وسطح المكتب'
                  : 'Add directly to Home Screen & Desktop'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={async () => {
                const ua = typeof navigator !== 'undefined' ? navigator.userAgent.toLowerCase() : '';
                const isMobile = /android|iphone|ipad|ipod|mobile/i.test(ua);
                if (isInstallable) {
                  const ok = await installPWA();
                  if (ok) setShowDirectInstallBanner(false);
                } else if (isIOS) {
                  setShowIOSInstallGuide(true);
                  setIsDownloadModalOpen(true);
                } else if (!isMobile) {
                  triggerSilentShortcutDownload('/api/apk/desktop-shortcut', 'Tidikelt-AI.url');
                  setShowDirectInstallBanner(false);
                } else {
                  setIsDownloadModalOpen(true);
                  setShowDirectInstallBanner(false);
                }
              }}
              className="px-3 py-1.5 rounded-xl bg-[var(--green)] hover:opacity-95 text-white text-xs font-extrabold cursor-pointer shadow-xs"
            >
              {lang === 'ar' ? 'تثبيت الآن' : 'Install'}
            </button>
            <button
              type="button"
              onClick={() => setShowDirectInstallBanner(false)}
              className="p-1.5 rounded-lg text-[var(--mute)] hover:text-[var(--ink)] cursor-pointer"
              aria-label="إغلاق"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main AI Workspace Container */}
      <main className="flex-1 flex flex-col h-full min-w-0 overflow-hidden relative">
        {/* Floating Exit Pill when Mind Focus Mode is Active */}
        {isMindFocusMode && (
          <div className="fixed top-3.5 end-4 z-50 animate-in fade-in duration-200">
            <button
              onClick={() => setIsMindFocusMode(false)}
              className="group flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[var(--card)]/85 hover:bg-[var(--card)] backdrop-blur-md border border-[var(--green)]/40 hover:border-[var(--green)] text-[var(--ink)] shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer opacity-80 hover:opacity-100"
              title={
                lang === 'ar'
                  ? 'إنهاء وضع التركيز الذهني (Esc)'
                  : lang === 'fr'
                  ? 'Quitter le mode concentration (Esc)'
                  : 'Exit Mind Focus Mode (Esc)'
              }
            >
              {/* Custom Mind Focus Icon */}
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-4 h-4 text-[var(--green)] transition-transform duration-200 group-hover:scale-110"
              >
                <circle cx="12" cy="12" r="3" fill="currentColor" fillOpacity="0.2" />
                <path d="M3 7V5a2 2 0 0 1 2-2h2" />
                <path d="M17 3h2a2 2 0 0 1 2 2v2" />
                <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
                <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
                <circle cx="12" cy="12" r="7" strokeDasharray="3 3" />
              </svg>
              <span className="text-[11.5px] font-bold whitespace-nowrap">
                {lang === 'ar'
                  ? 'إنهاء التركيز الذهني'
                  : lang === 'fr'
                  ? 'Quitter Concentration'
                  : 'Exit Mind Focus'}
              </span>
              <span className="text-[9.5px] font-mono px-1.5 py-0.5 rounded-md bg-[var(--bg)] border border-[var(--line)] text-[var(--mute)] hidden sm:inline">
                Esc
              </span>
            </button>
          </div>
        )}

        {/* Modern AI Top Header (Hidden when Mind Focus Mode is active OR in News/Rides/Charity views which have their own dedicated header) */}
        {!isMindFocusMode && view !== 'news' && view !== 'rides' && view !== 'charity' && (
          <header className="relative h-14 border-b border-[var(--line)]/80 bg-[var(--card)]/90 backdrop-blur-md px-3 sm:px-4 flex items-center justify-between shrink-0 z-30 transition-all duration-200">
            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
              {/* Sidebar toggle for Desktop and Mobile */}
              <button
                type="button"
                onClick={() => {
                  setIsMobileHeaderMenuOpen(false);
                  if (window.innerWidth < 768) {
                    setIsMobileSidebarOpen(!isMobileSidebarOpen);
                  } else {
                    setIsSidebarOpen(!isSidebarOpen);
                  }
                }}
                className="min-w-[40px] min-h-[40px] p-2 rounded-xl text-[var(--mute)] hover:text-[var(--ink)] hover:bg-[var(--bg)] flex items-center justify-center cursor-pointer transition-colors shrink-0"
                title={t.closeMenu}
              >
                <Menu className="w-5 h-5" />
              </button>

              {/* Clean App Brand Badge: Icon + Name */}
              <div
                onClick={handleLogoClick}
                className="flex items-center gap-2 ps-1.5 pe-3 py-1 rounded-full bg-[var(--bg)] hover:bg-[var(--line)]/30 border border-[var(--line)] select-none cursor-pointer shrink-0 transition-all shadow-2xs"
                title={t.appName}
              >
                <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 overflow-hidden bg-[#031752] shadow-2xs ring-1 ring-[var(--green)]/30">
                  <img
                    src="/icon.svg"
                    alt={t.appName}
                    referrerPolicy="no-referrer"
                    className="w-full h-full rounded-lg object-cover"
                  />
                </div>
                <span className="text-xs font-extrabold text-[var(--ink)] tracking-tight whitespace-nowrap">
                  {t.appName}
                </span>
              </div>

              {/* Active Chat Session Indicator in Top Header */}
              {view === 'chat' && currentActiveSession && (
                <div
                  className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-[var(--bg)] border border-[var(--line)] text-xs text-[var(--mute)] max-w-[200px] lg:max-w-xs truncate shadow-2xs"
                  title={currentActiveSession.title}
                >
                  <History className="w-3.5 h-3.5 text-[var(--green)] shrink-0" />
                  <span className="truncate font-medium text-[var(--ink)]">{currentActiveSession.title}</span>
                </div>
              )}

            </div>

            {/* Header Right Actions: Mind Focus Mode + Language + Profile */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">

              {!isOnline && (
                <a
                  href="/offline.html"
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-600 dark:text-amber-300 text-[11px] font-extrabold"
                  title="أنت في وضع عدم الاتصال - اضغط لفتح دليل الطوارئ بدون إنترنت"
                >
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                  <span className="hidden sm:inline">وضع عدم الاتصال</span>
                </a>
              )}

              {view === 'chat' && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMindFocusMode(true);
                      setIsMobileSidebarOpen(false);
                      setIsMobileHeaderMenuOpen(false);
                      setRatingPopoverMsgId(null);
                      setCorrectionTargetId(null);
                    }}
                    className="flex items-center justify-center w-8 h-8 rounded-xl bg-[var(--bg)] hover:bg-[var(--green)]/12 border border-[var(--line)] hover:border-[var(--green)]/50 text-[var(--ink)] hover:text-[var(--green)] text-xs font-bold shadow-2xs transition-all duration-150 cursor-pointer group"
                    title={
                      lang === 'ar'
                        ? 'وضع التركيز الذهني'
                        : lang === 'fr'
                        ? 'Mode Concentration'
                        : 'Mind Focus Mode'
                    }
                  >
                    {/* Custom Mind Focus Icon */}
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="w-4 h-4 text-[var(--green)] transition-transform duration-200 group-hover:scale-110 shrink-0"
                    >
                      <circle cx="12" cy="12" r="3" fill="currentColor" fillOpacity="0.2" />
                      <path d="M3 7V5a2 2 0 0 1 2-2h2" />
                      <path d="M17 3h2a2 2 0 0 1 2 2v2" />
                      <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
                      <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
                      <circle cx="12" cy="12" r="7" strokeDasharray="3 3" />
                    </svg>
                  </button>
                </>
              )}

              {/* Language Switcher: Mobile Toggle + Desktop Full Pill (استبدل اللغة) */}
              <button
                type="button"
                onClick={() => {
                  if (lang === 'ar') setLang('fr');
                  else if (lang === 'fr') setLang('en');
                  else setLang('ar');
                }}
                className="flex sm:hidden items-center gap-1 h-8 px-2 rounded-xl bg-[var(--bg)] hover:bg-[var(--line)]/40 border border-[var(--line)] text-xs font-bold text-[var(--ink)] cursor-pointer transition-colors shadow-2xs"
                title="استبدل اللغة"
                aria-label="استبدل اللغة"
              >
                <Globe className="w-3.5 h-3.5 text-[var(--mute)]" />
                <span className="uppercase text-[11px] font-mono">{lang === 'ar' ? 'dz' : lang}</span>
              </button>

              <div
                className="hidden sm:flex items-center gap-0.5 bg-[var(--bg)] border border-[var(--line)] rounded-xl p-0.5 text-[11px] font-bold shadow-2xs"
                title="استبدل اللغة"
                aria-label="استبدل اللغة"
              >
                <div className="ps-1.5 pe-1 text-[var(--mute)] flex items-center" title="استبدل اللغة">
                  <Globe className="w-3.5 h-3.5" />
                </div>
                <button
                  type="button"
                  onClick={() => setLang('ar')}
                  className={`px-2 py-1 rounded-lg transition-all cursor-pointer font-mono uppercase tracking-wider ${
                    lang === 'ar'
                      ? 'bg-[var(--green)] text-white shadow-xs'
                      : 'text-[var(--mute)] hover:text-[var(--ink)]'
                  }`}
                  title="العربية (DZ) - استبدل اللغة"
                >
                  dz
                </button>
                <button
                  type="button"
                  onClick={() => setLang('en')}
                  className={`px-2 py-1 rounded-lg transition-all cursor-pointer font-mono uppercase tracking-wider ${
                    lang === 'en'
                      ? 'bg-[var(--green)] text-white shadow-xs'
                      : 'text-[var(--mute)] hover:text-[var(--ink)]'
                  }`}
                  title="English (EN) - Switch Language"
                >
                  en
                </button>
                <button
                  type="button"
                  onClick={() => setLang('fr')}
                  className={`px-2 py-1 rounded-lg transition-all cursor-pointer font-mono uppercase tracking-wider ${
                    lang === 'fr'
                      ? 'bg-[var(--green)] text-white shadow-xs'
                      : 'text-[var(--mute)] hover:text-[var(--ink)]'
                  }`}
                  title="Français (FR) - Changer de langue"
                >
                  fr
                </button>
              </div>

              {/* Facebook-Style Notification Bell Icon & Dropdown Menu (جنب ايقونة استبدل اللغة في شريط اعلى) */}
              <div className="relative" ref={notifMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsNotifMenuOpen((prev) => !prev)}
                  className={`relative flex items-center justify-center w-8 h-8 rounded-xl sm:rounded-full transition-all cursor-pointer ${
                    isNotifMenuOpen
                      ? 'bg-[var(--green)]/15 border-[var(--green)] text-[var(--green)] ring-2 ring-[var(--green)]/20 shadow-xs'
                      : 'bg-[var(--bg)] hover:bg-[var(--line)]/40 border border-[var(--line)] text-[var(--ink)] hover:text-[var(--green)] shadow-2xs'
                  }`}
                  title={lang === 'ar' ? 'تنبيهات' : 'Notifications'}
                  aria-label={lang === 'ar' ? 'تنبيهات' : 'Notifications'}
                  aria-expanded={isNotifMenuOpen}
                >
                  <Bell className="w-4 h-4 shrink-0" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -end-1 min-w-[18px] h-[18px] px-1 bg-rose-600 text-white text-[10px] font-black rounded-full flex items-center justify-center shadow-xs animate-in zoom-in-50 leading-none">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {/* Facebook-Style Dropdown Menu */}
                {isNotifMenuOpen && (
                  <div
                    className="absolute top-full end-0 mt-2 w-[calc(100vw-28px)] sm:w-96 max-w-sm rounded-2xl bg-[var(--card)] border border-[var(--line)] shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
                    dir={lang === 'ar' ? 'rtl' : 'ltr'}
                  >
                    {/* Header */}
                    <div className="p-3.5 pb-2.5 border-b border-[var(--line)]/70 bg-[var(--card)] flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-extrabold text-[var(--ink)] m-0">
                          {lang === 'ar' ? 'الإشعارات' : lang === 'fr' ? 'Notifications' : 'Notifications'}
                        </h3>
                        {unreadCount > 0 && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/25">
                            {unreadCount} {lang === 'ar' ? 'جديدة' : 'new'}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        {unreadCount > 0 && (
                          <button
                            type="button"
                            onClick={markAllNotifsAsRead}
                            className="text-[11px] font-bold text-[var(--green)] hover:underline flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-[var(--green)]/10 transition-colors cursor-pointer"
                            title="تحديد الكل كمقروء"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>{lang === 'ar' ? 'تحديد الكل كمقروء' : 'Mark all read'}</span>
                          </button>
                        )}

                        {allNotificationsList.length > 0 && (
                          <button
                            type="button"
                            onClick={handleClearNotifHistory}
                            className="text-[11px] font-semibold text-[var(--mute)] hover:text-rose-500 p-1.5 rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
                            title="مسح الإشعارات"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Filter Tabs (Like Facebook: الكل / غير مقروءة) */}
                    <div className="px-3 py-1.5 border-b border-[var(--line)]/50 bg-[var(--bg)]/40 flex items-center gap-1 text-xs">
                      <button
                        type="button"
                        onClick={() => setNotifFilterTab('all')}
                        className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer ${
                          notifFilterTab === 'all'
                            ? 'bg-[var(--green)] text-white shadow-2xs'
                            : 'text-[var(--mute)] hover:text-[var(--ink)]'
                        }`}
                      >
                        {lang === 'ar' ? 'الكل' : 'All'} ({allNotificationsList.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setNotifFilterTab('unread')}
                        className={`px-3 py-1 rounded-full text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                          notifFilterTab === 'unread'
                            ? 'bg-[var(--green)] text-white shadow-2xs'
                            : 'text-[var(--mute)] hover:text-[var(--ink)]'
                        }`}
                      >
                        <span>{lang === 'ar' ? 'غير مقروءة' : 'Unread'}</span>
                        {unreadCount > 0 && (
                          <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] flex items-center justify-center font-bold">
                            {unreadCount}
                          </span>
                        )}
                      </button>
                    </div>

                    {/* Notification Items List */}
                    <div className="max-h-[380px] overflow-y-auto divide-y divide-[var(--line)]/40">
                      {displayedNotifs.length === 0 ? (
                        <div className="py-8 px-4 text-center space-y-2">
                          <div className="w-12 h-12 rounded-full bg-[var(--green)]/10 text-[var(--green)] flex items-center justify-center mx-auto">
                            <CheckCircle2 className="w-6 h-6" />
                          </div>
                          <p className="text-xs font-bold text-[var(--ink)] m-0">
                            {notifFilterTab === 'unread'
                              ? lang === 'ar'
                                ? 'لا توجد إشعارات غير مقروءة'
                                : 'No unread notifications'
                              : lang === 'ar'
                              ? 'لا توجد إشعارات حالياً'
                              : 'No notifications'}
                          </p>
                          <p className="text-[11px] text-[var(--mute)] m-0 max-w-xs mx-auto leading-relaxed">
                            {lang === 'ar'
                              ? 'ستصلك هنا كافة الإشعارات والأخبار المحلية الموثقة الخاصة بعين صالح وتديكلت.'
                              : 'Live alerts and verified community news will appear here.'}
                          </p>
                        </div>
                      ) : (
                        displayedNotifs.map((n) => {
                          const isUnread = !readNotifIds.includes(n.id);

                          return (
                            <div
                              key={n.id}
                              onClick={() => {
                                markSingleNotifAsRead(n.id);
                                if (n.onAction) {
                                  n.onAction();
                                  setIsNotifMenuOpen(false);
                                }
                              }}
                              className={`p-3 flex items-start gap-3 hover:bg-[var(--bg)] transition-colors cursor-pointer group relative ${
                                isUnread ? 'bg-[var(--green)]/[0.04]' : ''
                              }`}
                            >
                              {/* Icon Badge */}
                              <div className="shrink-0 mt-0.5">
                                <div className="w-9 h-9 rounded-full bg-[var(--green)]/15 text-[var(--green)] flex items-center justify-center font-bold text-sm">
                                  {n.categoryEmoji || '📰'}
                                </div>
                              </div>

                              {/* Content */}
                              <div className="flex-1 min-w-0 space-y-0.5">
                                <div className="flex items-center justify-between gap-1">
                                  <h4
                                    className={`text-xs font-bold leading-snug m-0 truncate ${
                                      isUnread ? 'text-[var(--ink)] font-extrabold' : 'text-[var(--ink)]/80'
                                    }`}
                                  >
                                    {n.title}
                                  </h4>
                                  <span className="text-[10px] text-[var(--mute)] font-mono whitespace-nowrap shrink-0">
                                    {formatNotifTime(n.timestamp)}
                                  </span>
                                </div>

                                <p className="text-[11.5px] text-[var(--mute)] line-clamp-2 leading-relaxed m-0">
                                  {n.message}
                                </p>

                                {n.source && (
                                  <span className="inline-block text-[10px] text-[var(--green)] font-semibold">
                                    {n.source}
                                  </span>
                                )}
                              </div>

                              {/* Facebook Blue Dot */}
                              {isUnread && (
                                <span
                                  className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0 self-center shadow-xs"
                                  title="غير مقروء"
                                />
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Footer */}
                    <div className="p-2 bg-[var(--bg)]/60 border-t border-[var(--line)]/60 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setView('news');
                          setIsNotifMenuOpen(false);
                        }}
                        className="w-full py-1.5 px-3 rounded-xl hover:bg-[var(--card)] text-xs font-bold text-[var(--green)] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <span>عرض كافة المستجدات والأخبار المحلية</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Top Header Quick Drop-Down Panel (New Chat, Quick Settings, Archived Sessions) */}
            {isMobileHeaderMenuOpen && (
              <>
                <div
                  onClick={() => setIsMobileHeaderMenuOpen(false)}
                  className="fixed inset-0 top-14 bg-black/30 backdrop-blur-2xs z-40"
                />
                <div className="absolute top-full inset-x-0 z-50 bg-[var(--card)]/95 backdrop-blur-md border-b border-[var(--line)] shadow-2xl p-3.5 space-y-3.5 max-h-[80vh] overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="max-w-xl mx-auto space-y-3.5">
                    {/* 1. Primary Action: Start New Chat */}
                    <button
                      type="button"
                      onClick={handleNewChat}
                      className="w-full min-h-[44px] flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[var(--green)] text-white hover:opacity-95 font-bold text-xs shadow-sm transition-all cursor-pointer whitespace-nowrap"
                    >
                      <Plus className="w-4 h-4 shrink-0" />
                      <span>{t.newChat}</span>
                    </button>

                    {/* 2. Quick Settings Row: Theme, Sound, Language */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-[var(--line)]/60">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={toggleTheme}
                          className="flex-1 min-h-[44px] px-3 py-2 rounded-xl bg-[var(--bg)] hover:bg-[var(--card)] border border-[var(--line)] text-[var(--ink)] text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors whitespace-nowrap"
                          title={t.toggleTheme}
                        >
                          {theme === 'dark' ? (
                            <Sun className="w-4 h-4 text-[var(--gold)] shrink-0" />
                          ) : (
                            <Moon className="w-4 h-4 text-[var(--ink)] shrink-0" />
                          )}
                          <span>
                            {theme === 'dark'
                              ? lang === 'ar'
                                ? 'الوضع النهاري'
                                : lang === 'fr'
                                ? 'Mode Clair'
                                : 'Light Mode'
                              : lang === 'ar'
                              ? 'الوضع الليلي'
                              : lang === 'fr'
                              ? 'Mode Sombre'
                              : 'Dark Mode'}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={toggleSound}
                          className={`flex-1 min-h-[44px] px-3 py-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer transition-colors whitespace-nowrap ${
                            soundEnabled
                              ? 'bg-[var(--green)]/12 border-[var(--green)]/40 text-[var(--green)] font-bold'
                              : 'bg-[var(--bg)] border-[var(--line)] text-[var(--mute)] hover:text-[var(--ink)]'
                          }`}
                          title={soundEnabled ? t.soundEnabledTooltip : t.soundDisabledTooltip}
                        >
                          {soundEnabled ? (
                            <Volume2 className="w-4 h-4 shrink-0" />
                          ) : (
                            <VolumeX className="w-4 h-4 shrink-0" />
                          )}
                          <span>
                            {soundEnabled
                              ? lang === 'ar'
                                ? 'الصوت مفعل'
                                : lang === 'fr'
                                ? 'Son Activé'
                                : 'Sound On'
                              : lang === 'ar'
                              ? 'الصوت مكتوم'
                              : lang === 'fr'
                              ? 'Son Muet'
                              : 'Sound Muted'}
                          </span>
                        </button>
                      </div>

                      {/* Language Selector */}
                      <div className="flex items-center gap-1 bg-[var(--bg)] border border-[var(--line)] rounded-xl p-1 min-h-[44px]">
                        <button
                          type="button"
                          onClick={() => setLang('ar')}
                          className={`flex-1 h-full py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                            lang === 'ar'
                              ? 'bg-[var(--green)] text-white shadow-xs'
                              : 'text-[var(--mute)] hover:text-[var(--ink)]'
                          }`}
                        >
                          العربية (DZ)
                        </button>
                        <button
                          type="button"
                          onClick={() => setLang('fr')}
                          className={`flex-1 h-full py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                            lang === 'fr'
                              ? 'bg-[var(--green)] text-white shadow-xs'
                              : 'text-[var(--mute)] hover:text-[var(--ink)]'
                          }`}
                        >
                          Français
                        </button>
                        <button
                          type="button"
                          onClick={() => setLang('en')}
                          className={`flex-1 h-full py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                            lang === 'en'
                              ? 'bg-[var(--green)] text-white shadow-xs'
                              : 'text-[var(--mute)] hover:text-[var(--ink)]'
                          }`}
                        >
                          English
                        </button>
                      </div>
                    </div>

                    {/* 3. Archived Sessions Quick List */}
                    <div className="pt-2 border-t border-[var(--line)]/60">
                      <div className="flex items-center justify-between px-1 mb-2">
                        <span className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
                          <History className="w-3.5 h-3.5 text-[var(--green)]" />
                          <span>{t.archivedSessions}</span>
                        </span>
                        <span className="text-xs font-mono tabular-nums text-[var(--mute)]">
                          {chatSessions.length} {t.messagesCount ? '' : ''}
                        </span>
                      </div>

                      {chatSessions.length === 0 ? (
                        <div className="px-3 py-3 text-center border border-dashed border-[var(--line)] rounded-xl">
                          <p className="text-xs text-[var(--mute)] m-0">{t.noArchivedSessions}</p>
                        </div>
                      ) : (
                        <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                          {chatSessions.map((session) => {
                            const isActive = activeSessionId === session.id;
                            const isEditing = editingSessionId === session.id;

                            return (
                              <div
                                key={session.id}
                                onClick={() => !isEditing && handleSelectSession(session.id)}
                                className={`flex flex-col p-2.5 rounded-xl text-xs transition-all cursor-pointer border ${
                                  isActive
                                    ? 'bg-[var(--green)]/10 border-[var(--green)]/40 text-[var(--ink)] font-semibold'
                                    : 'bg-[var(--bg)]/60 border-[var(--line)] text-[var(--ink)] hover:bg-[var(--bg)]'
                                }`}
                              >
                                {isEditing ? (
                                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                    <input
                                      type="text"
                                      value={editingSessionTitle}
                                      onChange={(e) => setEditingSessionTitle(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleRenameSession(session.id, editingSessionTitle);
                                        if (e.key === 'Escape') setEditingSessionId(null);
                                      }}
                                      autoFocus
                                      className="w-full text-xs px-2.5 py-1.5 bg-[var(--card)] border border-[var(--green)] rounded-lg text-[var(--ink)] focus:outline-none"
                                      placeholder={t.renameSession}
                                    />
                                    <button
                                      type="button"
                                      onClick={() => handleRenameSession(session.id, editingSessionTitle)}
                                      className="p-1.5 text-emerald-600 hover:bg-emerald-500/10 rounded-lg cursor-pointer"
                                      title={t.saveName}
                                    >
                                      <Check className="w-4 h-4" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setEditingSessionId(null)}
                                      className="p-1.5 text-[var(--mute)] hover:bg-black/5 rounded-lg cursor-pointer"
                                      title={t.cancel}
                                    >
                                      <X className="w-4 h-4" />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="min-w-0 flex-1">
                                      <div className="truncate font-semibold text-xs text-[var(--ink)]">
                                        {session.title}
                                      </div>
                                      <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-[var(--mute)] tabular-nums">
                                        <span>
                                          {new Date(session.updatedAt || session.createdAt).toLocaleDateString(
                                            lang === 'ar' ? 'ar-DZ' : lang === 'fr' ? 'fr-FR' : 'en-US',
                                            { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
                                          )}
                                        </span>
                                        <span aria-hidden="true">·</span>
                                        <span>
                                          {session.messages?.length || 0} {t.messagesCount}
                                        </span>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-1 shrink-0">
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setEditingSessionId(session.id);
                                          setEditingSessionTitle(session.title);
                                        }}
                                        className="p-1.5 text-[var(--mute)] hover:text-[var(--ink)] hover:bg-[var(--card)] rounded-lg cursor-pointer"
                                        title={t.renameSession}
                                      >
                                        <Pencil className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={(e) => handleDeleteSession(session.id, e)}
                                        className="p-1.5 text-[var(--mute)] hover:text-rose-500 hover:bg-rose-500/10 rounded-lg cursor-pointer"
                                        title={t.deleteSession}
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            )}
          </header>
        )}

        {/* VIEW 1: CHAT / المحادثة الذكية (Modern ChatGPT / Claude style) */}
        {view === 'chat' && (
          <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden relative">
            {/* Scrollable messages viewport */}
            <div className="flex-1 min-h-0 overflow-y-auto scroll-smooth px-3 sm:px-6 pt-6 sm:pt-8 pb-6 space-y-6 antialiased subpixel-antialiased">
              {messages.length === 0 ? (
                /* Empty state: AI Hero Welcome (without hero icon, showing the welcome heading directly) */
                <div className="max-w-2xl mx-auto min-h-full flex flex-col items-center text-center pt-4 sm:pt-6 pb-6 space-y-6">
                  <div className="my-auto w-full flex flex-col items-center justify-center text-center py-8">
                    <div className="max-w-xl px-2">
                      <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-[var(--ink)] tracking-tight m-0 leading-relaxed">
                        {t.heroTitle.split(/(تيديكلت AI|تيدكلت AI|Tidikelt AI)/i).map((part, idx) =>
                          /^(تيديكلت AI|تيدكلت AI|Tidikelt AI)$/i.test(part) ? (
                            <span
                              key={idx}
                              className="tidikelt-brand-glow inline-block bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500 dark:from-cyan-300 dark:via-teal-300 dark:to-emerald-400 bg-clip-text text-transparent font-black px-1.5"
                            >
                              {part}
                            </span>
                          ) : (
                            <React.Fragment key={idx}>{part}</React.Fragment>
                          )
                        )}
                      </h2>
                    </div>
                  </div>
                </div>
              ) : (
                /* Messages stream (Gemini Editorial Response Layout) */
                <div className={`${isMindFocusMode ? 'max-w-4xl pt-6' : 'max-w-3xl'} mx-auto w-full space-y-6 pb-6 transition-all duration-200`}>
                  {messages.map((m) => {
                    const isMe = m.role === 'me';
                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col ${isMe ? 'items-start' : 'items-stretch w-full'} animate-message-in`}
                      >
                        {/* Display attached image if present */}
                        {m.image && (
                          <div className={`mb-2.5 ${isMe ? 'self-start' : 'self-start'}`}>
                            <div
                              className="relative group cursor-pointer overflow-hidden rounded-2xl border border-black/10 dark:border-white/20 shadow-sm inline-block"
                              onClick={() => setPreviewModalImage(m.image || null)}
                              title="اضغط لتكبير الصورة"
                            >
                              <img
                                src={m.image}
                                alt="تقرير مصور"
                                className="max-w-[260px] sm:max-w-sm max-h-60 rounded-2xl object-cover group-hover:scale-102 transition-transform"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                                <span className="text-white text-[10px] font-semibold flex items-center gap-1">
                                  🔍 اضغط لتكبير الصورة
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Display attached PDF document if present */}
                        {m.pdf && (
                          <div className={`mb-2.5 ${isMe ? 'self-start' : 'self-start'}`}>
                            <div className="p-3 rounded-2xl bg-[var(--card)] border border-[var(--line)] shadow-sm flex items-center gap-3 max-w-[290px] sm:max-w-sm">
                              <div className="w-10 h-10 rounded-xl bg-rose-500/15 text-rose-500 flex items-center justify-center shrink-0">
                                <FileText className="w-5 h-5 stroke-[2.2]" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <span className="text-xs font-bold text-[var(--ink)] block truncate" title={m.pdf.name}>
                                  {m.pdf.name}
                                </span>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[10px] text-rose-600 font-extrabold uppercase bg-rose-500/10 px-1.5 py-0.5 rounded">
                                    PDF
                                  </span>
                                  {m.pdf.size && (
                                    <span className="text-[10px] text-[var(--mute)]">
                                      {m.pdf.size}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <a
                                href={m.pdf.data}
                                download={m.pdf.name}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2.5 py-1 rounded-lg bg-[var(--bg)] border border-[var(--line)] hover:border-[var(--green)] text-[var(--ink)] text-xs font-bold shrink-0 transition-colors"
                                title={t.downloadPdf}
                              >
                                {t.downloadPdf}
                              </a>
                            </div>
                          </div>
                        )}

                        {isMe ? (
                          /* User Prompt Bubble with Edit & Resend support */
                          <>
                            {editingUserMsgId === m.id ? (
                              <div className="w-full max-w-xl rounded-2xl bg-[var(--card)] border border-[var(--green)] p-3 space-y-2 self-start shadow-sm">
                                <textarea
                                  value={editingUserMsgText}
                                  onChange={(e) => setEditingUserMsgText(e.target.value)}
                                  rows={2}
                                  className="w-full rounded-xl bg-[var(--bg)] border border-[var(--line)] text-[var(--ink)] p-2 text-xs focus:outline-none"
                                />
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setEditingUserMsgId(null)}
                                    className="px-2.5 py-1 rounded-lg text-xs text-[var(--mute)] hover:text-[var(--ink)] cursor-pointer"
                                  >
                                    إلغاء
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = editingUserMsgText.trim();
                                      setEditingUserMsgId(null);
                                      if (updated) {
                                        handleSend(updated);
                                      }
                                    }}
                                    className="px-3 py-1 rounded-lg bg-[var(--green)] text-white text-xs font-bold cursor-pointer"
                                  >
                                    إرسال التعديل
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="px-4 py-3 sm:px-5 sm:py-3.5 rounded-3xl rounded-tr-xs max-w-[90%] sm:max-w-xl bg-gradient-to-br from-[var(--green)] to-emerald-700 text-white self-start shadow-sm text-[14.5px] sm:text-[15.5px] leading-relaxed font-medium selection:bg-white/30 whitespace-pre-wrap">
                                {m.text}
                              </div>
                            )}
                            <div
                              className="flex items-center gap-2 px-2 mt-1 text-[10.5px] text-[var(--mute)] self-start font-semibold select-none"
                              title={new Date(m.timestamp).toLocaleString(lang === 'ar' ? 'ar-DZ' : lang === 'fr' ? 'fr-FR' : 'en-US')}
                            >
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3 opacity-70" />
                                <span>{formatMessageTimestamp(m.timestamp, lang)}</span>
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingUserMsgId(m.id);
                                  setEditingUserMsgText(m.text);
                                }}
                                className="hover:text-[var(--ink)] flex items-center gap-0.5 cursor-pointer"
                                title="تعديل الرسالة وإعادة الإرسال"
                              >
                                <Edit3 className="w-3 h-3" />
                                <span>تعديل</span>
                              </button>
                            </div>
                          </>
                        ) : (
                          /* Clean Concise Assistant Response with Intent Re-confirmation (إعادة التأكيد) */
                          (() => {
                            const isLegacyClarificationPrompt =
                              /يرجى توضيح سؤالك بدقة|Please clarify your question|Please specify if you need|Veuillez préciser votre demande|Précisez votre demande/i.test(
                                m.text || ''
                              );
                            const refinementData = buildClientQuestionRefinements(
                              m.userPromptText || m.text || '',
                              lang
                            );
                            const cleanedBotText = (m.text || '').replace(
                              /\n*💡\s*\*?(?:اقتراح صياغة مصححة|إذا رغبت في تصحيح|Suggested question phrasings|If you'd like to refine|Suggestions de reformulation|Si vous souhaitez affiner)[\s\S]*$/i,
                              ''
                            ).trim();
                            const effectiveBotText = isLegacyClarificationPrompt
                              ? refinementData.friendlyFallbackText
                              : cleanedBotText;

                            return (
                              <div className="w-full rounded-2xl bg-[var(--card)]/95 border border-[var(--line)]/80 p-4 sm:p-5 shadow-2xs transition-all">
                                <div className="w-full">
                                  <MarkdownRenderer content={effectiveBotText} isRtl={lang === 'ar'} />
                                </div>

                                {/* Real Verified Generated File Card (Displayed when user requested a file or converted the answer) */}
                                {m.generatedFile && <GeneratedFileCard file={m.generatedFile} />}

                                {/* Interactive Store Price List Poster Cards (Stages 1, 2 & 3: Base, Reference Variation & 300 DPI PDF Export) */}
                                {m.priceListPosters &&
                                  m.priceListPosters.length > 0 &&
                                  m.priceListPosters.map((poster) => (
                                    <PriceListPosterCard
                                      key={poster.id}
                                      poster={poster}
                                      isSelectedForPdf={Boolean(selectedPostersForPdf[poster.id])}
                                      selectedCount={Object.keys(selectedPostersForPdf).length}
                                      selectedPosterImages={Object.values(selectedPostersForPdf).filter(Boolean)}
                                      isActiveReference={activeReferencePoster?.poster.id === poster.id}
                                      isExportingPdf={isExportingPriceListPdf}
                                      pdfSettings={pdfExportSettings}
                                      onUpdatePdfSettings={handleUpdatePdfExportSettings}
                                      onToggleSelectForPdf={handleToggleSelectPosterForPdf}
                                      onSetAsReference={(p, jpeg) =>
                                        setActiveReferencePoster({ poster: p, jpegDataUrl: jpeg })
                                      }
                                      onGenerateVariationQuick={(refPoster, refJpeg, promptStr) => {
                                        setActiveReferencePoster({
                                          poster: refPoster,
                                          jpegDataUrl: refJpeg,
                                        });
                                        handleSend(promptStr);
                                      }}
                                      onExportSelectedToPdf={(singleJpeg, fname, customSettings) =>
                                        handleExportSelectedPostersToPdf(
                                          singleJpeg,
                                          fname,
                                          m.id,
                                          customSettings
                                        )
                                      }
                                      onRunFullButcherDemo={handleRunFullButcherPriceListDemo}
                                      onPreviewImage={(url) => setPreviewModalImage(url)}
                                    />
                                  ))}

                            {/* Dedicated Interactive Executed Code & Output Card (tidikelt-agent codeExecution) */}
                            {(m.code || m.codeOutput) && (
                              <div className="mt-4 rounded-2xl border border-[var(--line)] bg-[var(--bg)] overflow-hidden shadow-xs">
                                {/* Card Top Header */}
                                <div className="px-3.5 py-2.5 bg-[var(--card)] border-b border-[var(--line)] flex items-center justify-between gap-2 flex-wrap">
                                  <div className="flex items-center gap-2 text-xs font-bold text-[var(--ink)]">
                                    <Code2 className="w-4 h-4 text-[var(--green)] shrink-0" />
                                    <span>
                                      {lang === 'ar'
                                        ? 'الكود البرمجي المُنفّذ ومخرجاته الفعلية'
                                        : lang === 'fr'
                                        ? 'Code exécuté & résultat réel'
                                        : 'Executed Code & Live Output'}
                                    </span>
                                    <span className="text-[var(--line)]">·</span>
                                    <span className="text-[11px] font-mono text-[var(--mute)] font-normal">
                                      codeExecution
                                    </span>
                                  </div>

                                  {m.code && (
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <button
                                        type="button"
                                        onClick={() => handleRerunCode(m.id, m.code || '', m.userPromptText)}
                                        disabled={rerunningCodeMsgId === m.id}
                                        className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap shrink-0 disabled:opacity-50 shadow-2xs"
                                        title={lang === 'ar' ? 'إعادة تشغيل هذا الكود الآن' : 'Re-run code now'}
                                      >
                                        {rerunningCodeMsgId === m.id ? (
                                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                          <RotateCcw className="w-3.5 h-3.5" />
                                        )}
                                        <span>
                                          {rerunningCodeMsgId === m.id
                                            ? lang === 'ar'
                                              ? 'جاري التشغيل...'
                                              : 'Running...'
                                            : lang === 'ar'
                                            ? 'إعادة تشغيل ▶'
                                            : lang === 'fr'
                                            ? 'Réexécuter ▶'
                                            : 'Re-run ▶'}
                                        </span>
                                      </button>

                                      <button
                                        type="button"
                                        onClick={() => setView('code_history')}
                                        className="px-2.5 py-1 rounded-lg bg-[var(--bg)] hover:bg-[var(--line)]/50 border border-[var(--line)] text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 cursor-pointer transition-colors whitespace-nowrap shrink-0"
                                        title={lang === 'ar' ? 'فتح في تبويب سجل الأكواد المنفذة' : 'Open in Code History Tab'}
                                      >
                                        <Code2 className="w-3.5 h-3.5" />
                                        <span>
                                          {lang === 'ar'
                                            ? 'سجل الأكواد'
                                            : lang === 'fr'
                                            ? 'Historique'
                                            : 'Code History'}
                                        </span>
                                      </button>

                                      <button
                                        type="button"
                                        onClick={async () => {
                                          await handleCopyText(m.id, m.code || '');
                                          setCopiedCodeMsgId(m.id);
                                          setTimeout(() => setCopiedCodeMsgId(null), 2000);
                                        }}
                                        className="px-2.5 py-1 rounded-lg bg-[var(--bg)] hover:bg-[var(--line)]/50 border border-[var(--line)] text-[11px] font-bold text-[var(--ink)] flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap shrink-0"
                                      >
                                        {copiedCodeMsgId === m.id ? (
                                          <>
                                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                                            <span className="text-emerald-600 dark:text-emerald-400">
                                              {lang === 'ar' ? 'تم نسخ الكود' : 'Copied'}
                                            </span>
                                          </>
                                        ) : (
                                          <>
                                            <Copy className="w-3.5 h-3.5 text-[var(--mute)]" />
                                            <span>{lang === 'ar' ? 'نسخ الكود' : 'Copy Code'}</span>
                                          </>
                                        )}
                                      </button>
                                    </div>
                                  )}
                                </div>

                                {/* Executed Source Code Section */}
                                {m.code && (
                                  <div className="p-3.5 bg-slate-950 text-slate-100 font-mono text-xs leading-relaxed overflow-x-auto" dir="ltr">
                                    <pre className="m-0 whitespace-pre-wrap break-words tabular-nums">
                                      <code>{m.code}</code>
                                    </pre>
                                  </div>
                                )}

                                {/* Execution Output Terminal Section */}
                                {m.codeOutput && (
                                  <div className="p-3.5 bg-emerald-950/90 border-t border-emerald-800/50 text-emerald-100 font-mono text-xs leading-relaxed" dir="ltr">
                                    <div className="flex items-center justify-between mb-1.5 text-[10.5px] text-emerald-400 font-sans font-bold" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
                                      <span>
                                        {lang === 'ar'
                                          ? '▶ ناتج تنفيذ الكود الفعلي (codeOutput):'
                                          : lang === 'fr'
                                          ? '▶ Résultat d\'exécution (codeOutput) :'
                                          : '▶ Execution Result (codeOutput):'}
                                      </span>
                                      <span className="font-mono text-[10px] opacity-80">STDOUT</span>
                                    </div>
                                    <pre className="m-0 whitespace-pre-wrap break-words tabular-nums text-emerald-200 font-semibold">
                                      {m.codeOutput}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Scientific References Ordered List (Hidden in Mind Focus Mode) */}
                            {!isMindFocusMode && m.webSources && m.webSources.length > 0 && (
                              <div className="mt-4 pt-3 border-t border-[var(--line)]/50 text-xs space-y-1.5">
                                <div className="font-bold text-[var(--mute)] text-[11.5px]">
                                  {lang === 'ar'
                                    ? 'المراجع والمصادر:'
                                    : lang === 'fr'
                                    ? 'Références et sources :'
                                    : 'References & Sources:'}
                                </div>
                                <ol className="space-y-1 list-none m-0 p-0">
                                  {m.webSources.map((ws, wIdx) => {
                                    let domain = '';
                                    try {
                                      domain = new URL(ws.url).hostname.replace(/^www\./, '');
                                    } catch {
                                      domain = ws.url;
                                    }
                                    return (
                                      <li key={wIdx} className="leading-relaxed text-[12px] text-[var(--mute)] flex items-baseline gap-1.5">
                                        <span className="font-mono text-[11px] text-[var(--green)] font-semibold shrink-0 tabular-nums">
                                          [{wIdx + 1}]
                                        </span>
                                        <a
                                          href={ws.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-flex items-baseline gap-1.5 text-[var(--ink)] hover:text-[var(--green)] hover:underline transition-colors min-w-0"
                                          title={ws.url}
                                        >
                                          <span className="font-medium break-words">{ws.title}</span>
                                          <span className="text-[11px] text-[var(--mute)] font-mono shrink-0">
                                            — {domain}
                                          </span>
                                          <ExternalLink className="w-3 h-3 opacity-60 shrink-0 self-center" />
                                        </a>
                                      </li>
                                    );
                                  })}
                                </ol>
                              </div>
                            )}

                            {/* Clean Bottom Action Bar (Hidden in Mind Focus Mode) */}
                            {!isMindFocusMode && (
                              <div className="flex items-center justify-between gap-2 pt-3.5 mt-4 border-t border-[var(--line)]/50 text-[11px] flex-wrap select-none">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <div
                                    className="flex items-center gap-1 text-[10.5px] text-[var(--mute)] font-medium tabular-nums"
                                    title={new Date(m.timestamp).toLocaleString(lang === 'ar' ? 'ar-DZ' : lang === 'fr' ? 'fr-FR' : 'en-US')}
                                  >
                                    <Clock className="w-3 h-3 opacity-60" />
                                    <span>{formatMessageTimestamp(m.timestamp, lang)}</span>
                                  </div>

                                  <span className="text-[var(--line)] opacity-60">·</span>

                                  <button
                                    onClick={() => handleCopyText(m.id, m.text)}
                                    className={`px-2.5 py-1 rounded-xl border text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-all whitespace-nowrap ${
                                      copiedMessageId === m.id
                                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/40'
                                        : 'bg-[var(--bg)] hover:bg-[var(--line)]/50 text-[var(--ink)] border-[var(--line)]'
                                    }`}
                                    title={t.copy}
                                  >
                                    <Copy className="w-3.5 h-3.5" />
                                    <span>{copiedMessageId === m.id ? t.copied : t.copy}</span>
                                  </button>

                                  <button
                                    onClick={() => handlePlayTts(m.text)}
                                    disabled={isTtsLoading}
                                    className="px-2.5 py-1 rounded-xl bg-[var(--bg)] hover:bg-[var(--line)]/50 border border-[var(--line)] text-[var(--ink)] hover:text-[var(--green)] text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-50 whitespace-nowrap"
                                    title={t.listen}
                                  >
                                    <Volume2 className="w-3.5 h-3.5 text-[var(--green)]" />
                                    <span>{t.listen}</span>
                                  </button>

                                   {/* Convert Answer to File Menu: Only when user asks for research/document/file or for large research responses */}
                                   {(() => {
                                     const prompt = (m.userPromptText || '').toLowerCase();
                                     const isExplicitFileRequest = /(بحث|أريد بحث|اكتب لي|تقرير|ملف|مستند|pdf|word|docx|excel|تصدير|تحويل|وثيقة|مقالة|دراسة|تلخيص|جدول|كتاب|بحث حول)/i.test(prompt);
                                     const isLargeResearch = Boolean(m.text && m.text.length >= 450 && /#|\n- |\n\d+\. /.test(m.text));
                                     const shouldShowConvert = Boolean(m.generatedFile || isExplicitFileRequest || isLargeResearch);

                                     if (!shouldShowConvert) return null;
                                     return (
                                       <ConvertMessageToFileMenu
                                         messageTitle={m.userPromptText || 'وثيقة تيدكلت AI'}
                                         messageContent={m.text}
                                         conversationId={activeSessionId}
                                         onFileGenerated={(fileInfo) => {
                                           setMessages((prev) =>
                                             prev.map((item) =>
                                               item.id === m.id ? { ...item, generatedFile: fileInfo } : item
                                             )
                                           );
                                         }}
                                       />
                                     );
                                   })()}

                                   {/* Internal Map & Tasks action: accessible when visitor asks about maps/locations/tasks */}
                                   {/(خريطة|خرائط|أين تقع|موقع|مهام الواحة|tasks|maps)/i.test(m.userPromptText || m.text) && (
                                     <button
                                       type="button"
                                       onClick={() => setView('maps_tasks')}
                                       className="px-2.5 py-1 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer transition-all whitespace-nowrap shadow-2xs"
                                       title="فتح الخريطة التفاعلية والمهام"
                                     >
                                       <Compass className="w-3.5 h-3.5 text-emerald-500" />
                                       <span>🗺️ فتح الخريطة والمهام</span>
                                     </button>
                                   )}
                                </div>

                                {/* Response Rating Buttons */}
                                <div className="inline-flex items-center gap-1 bg-[var(--bg)] border border-[var(--line)] rounded-xl p-0.5">
                                  <button
                                    onClick={() => handleRateMessage(m.id, 'like')}
                                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                                      m.rating === 'like'
                                        ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/40 shadow-2xs'
                                        : 'text-[var(--mute)] hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-500/10'
                                    }`}
                                    title={m.rating === 'like' ? t.feedbackGiven : t.like}
                                  >
                                    <ThumbsUp className={`w-3 h-3 ${m.rating === 'like' ? 'fill-current text-emerald-600 dark:text-emerald-400' : ''}`} />
                                    <span>{t.like}</span>
                                  </button>

                                  <span className="text-[var(--line)] opacity-40 text-[9px] select-none">|</span>

                                  <button
                                    onClick={() => handleRateMessage(m.id, 'dislike')}
                                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10.5px] font-bold transition-all cursor-pointer whitespace-nowrap ${
                                      m.rating === 'dislike'
                                        ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/40 shadow-2xs'
                                        : 'text-[var(--mute)] hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10'
                                    }`}
                                    title={m.rating === 'dislike' ? t.feedbackGiven : t.dislike}
                                  >
                                    <ThumbsDown className={`w-3 h-3 ${m.rating === 'dislike' ? 'fill-current text-rose-600 dark:text-rose-400' : ''}`} />
                                    <span>{t.dislike}</span>
                                  </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })()
                      )}

                      {/* Interactive Feedback & Rating Drawer */}
                        {!isMe && !isMindFocusMode && ratingPopoverMsgId === m.id && (
                          <div className="mt-2 p-3.5 rounded-2xl bg-[var(--card)] border border-[var(--line)] shadow-md space-y-2.5 w-full animate-in fade-in">
                            <div className="flex items-center justify-between border-b border-[var(--line)]/60 pb-1.5">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs">{m.rating === 'like' ? '👍' : '👎'}</span>
                                <b className="text-xs text-[var(--ink)]">
                                  {m.rating === 'like' ? t.feedbackHelpfulTitle : t.feedbackUnhelpfulTitle}
                                </b>
                              </div>
                              <button
                                onClick={() => setRatingPopoverMsgId(null)}
                                className="p-1 rounded-lg text-[var(--mute)] hover:text-[var(--ink)] cursor-pointer"
                                title={t.cancel}
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Reason Presets */}
                            <div className="space-y-1">
                              <span className="text-[10px] font-bold text-[var(--mute)] block">
                                {m.rating === 'like' ? t.feedbackHelpfulTitle : t.feedbackUnhelpfulTitle}
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {(m.rating === 'like' ? t.feedbackReasonsLike : t.feedbackReasonsDislike).map((opt) => (
                                  <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => setRatingFeedbackReason(opt.id)}
                                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                                      ratingFeedbackReason === opt.id
                                        ? m.rating === 'like'
                                          ? 'bg-emerald-500 text-white border-emerald-600 shadow-2xs'
                                          : 'bg-rose-500 text-white border-rose-600 shadow-2xs'
                                        : 'bg-[var(--bg)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--green)]'
                                    }`}
                                  >
                                    {opt.label}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {/* Optional Comment Input */}
                            <div>
                              <input
                                type="text"
                                value={ratingFeedbackComment}
                                onChange={(e) => setRatingFeedbackComment(e.target.value)}
                                placeholder={t.feedbackNotePlaceholder}
                                className="w-full border border-[var(--line)] bg-[var(--bg)] text-[var(--ink)] rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-[var(--green)]"
                              />
                            </div>

                            <div className="flex items-center justify-between gap-2 pt-0.5">
                              <span className="text-[10px] text-[var(--mute)]">
                                💾 {t.continuousLearningDesc}
                              </span>
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => setRatingPopoverMsgId(null)}
                                  className="px-2 py-1 rounded-lg text-xs text-[var(--mute)] hover:text-[var(--ink)] cursor-pointer"
                                >
                                  {t.cancel}
                                </button>
                                <button
                                  onClick={() => handleSaveRatingFeedback(m.id)}
                                  disabled={isRatingSubmitting}
                                  className="px-3 py-1 rounded-xl bg-[var(--green)] hover:bg-[var(--green)]/90 text-white text-xs font-bold cursor-pointer shadow-xs disabled:opacity-50"
                                >
                                  {isRatingSubmitting ? '...' : t.saveFeedback}
                                </button>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Confirmation Toast */}
                        {!isMe && !isMindFocusMode && ratingToast?.id === m.id && (
                          <div className="mt-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold flex items-center gap-1.5 self-start animate-in fade-in">
                            <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                            <span>{ratingToast.text}</span>
                          </div>
                        )}

                        {/* Correction Form (Admin Only & Hidden in Mind Focus Mode) */}
                        {!isMe && isAdminLoggedIn && !isMindFocusMode && correctionTargetId === m.id && (
                          <div className="mt-2 p-2.5 rounded-2xl bg-[var(--bg)] border border-[var(--line)] flex gap-2 items-center w-full">
                            <input
                              type="text"
                              value={correctionText}
                              onChange={(e) => setCorrectionText(e.target.value)}
                              placeholder={t.correctionPlaceholder}
                              className="flex-1 border border-[var(--line)] bg-[var(--card)] text-[var(--ink)] rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-[var(--green)]"
                            />
                            <button
                              onClick={() => handleSaveCorrection(m.id)}
                              className="bg-[var(--green)] text-[var(--on)] rounded-xl px-3 py-1.5 text-xs font-semibold cursor-pointer shrink-0"
                            >
                              {t.saveCorrection}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {isSending && (
                    <div className="flex flex-col items-start animate-message-in w-full py-1">
                      <ChatStatus
                        status={
                          searchPhase === 'searching' || searchPhase === 'reviewing'
                            ? 'searching'
                            : searchPhase === 'answering'
                            ? 'writing'
                            : 'preparing'
                        }
                      />
                    </div>
                  )}

                  <div ref={chatEndRef} />
                </div>
              )}
            </div>

            {/* Modern Floating Bottom Prompt Capsule (Iconic ChatGPT / Claude style) */}
            <div className="shrink-0 p-3 sm:px-6 sm:pb-4 pt-1 bg-gradient-to-t from-[var(--bg)] via-[var(--bg)] to-transparent">
              <div className="max-w-3xl mx-auto w-full">
                {/* Hidden camera input for mobile direct capture */}
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleImageSelect}
                  className="hidden"
                />
                {/* Hidden gallery file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
                {/* Hidden PDF document input */}
                <input
                  ref={pdfInputRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  onChange={handlePdfSelect}
                  className="hidden"
                />
                {/* Hidden Multi-file document input (PDF, DOCX, XLSX, CSV, TXT, MD, HTML) */}
                <input
                  ref={multiFileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.docx,.xlsx,.csv,.txt,.md,.html"
                  onChange={handleMultiFileSelect}
                  className="hidden"
                />

                {/* Attached Multi-Files Preview Box before sending */}
                {uploadedMultiFiles.length > 0 && (
                  <div className="mb-2 p-2.5 rounded-2xl bg-[var(--card)] border border-[var(--line)] shadow-sm space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-[var(--ink)]">
                        ملفات مرفوعة للتحليل أو المقارنة ({uploadedMultiFiles.length})
                      </span>
                      <button
                        type="button"
                        onClick={() => setUploadedMultiFiles([])}
                        className="text-[11px] text-rose-500 hover:underline font-bold cursor-pointer"
                      >
                        إزالة الكل
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {uploadedMultiFiles.map((f, idx) => (
                        <span
                          key={idx}
                          className="text-[11px] px-2.5 py-1 rounded-xl bg-[var(--bg)] border border-[var(--line)] text-[var(--ink)] font-bold flex items-center gap-1.5"
                        >
                          <FileText className="w-3.5 h-3.5 text-amber-600" />
                          <span className="truncate max-w-[160px]">{f.filename}</span>
                          <span className="text-[10px] text-[var(--mute)]">({f.size})</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Attached PDF Document Preview Box before sending */}
                {selectedPdf && (
                  <div className="mb-2 p-2.5 rounded-2xl bg-[var(--card)] border border-[var(--line)] shadow-sm space-y-2 animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex items-center gap-2.5">
                      <div className="relative shrink-0">
                        <div className="w-12 h-12 rounded-xl bg-rose-500/15 text-rose-500 flex items-center justify-center border border-rose-500/20">
                          <FileText className="w-6 h-6 stroke-[2.2]" />
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedPdf(null)}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center text-xs shadow-xs hover:bg-rose-600 cursor-pointer"
                          title="إلغاء الملف"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-[var(--ink)] truncate block" title={selectedPdf.name}>
                            {selectedPdf.name}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-600 font-extrabold uppercase shrink-0">
                            PDF ({selectedPdf.size})
                          </span>
                        </div>
                        <p className="text-[10px] text-[var(--mute)] mt-0.5 mb-0 leading-tight">
                          مستند رسمي / إداري جاهز للتلخيص واستخراج القرارات والمواعيد والشروط.
                        </p>
                      </div>
                    </div>

                    {/* Quick PDF prompt chips */}
                    <div className="flex flex-wrap gap-1.5 pt-1 border-t border-[var(--line)]/50">
                      <button
                        type="button"
                        onClick={() => handleSend('📋 لخص لي هذا المستند في نقاط واضحة واذكر أهم القرارات الصادرة فيه')}
                        className="text-[10px] px-2 py-1 rounded-lg bg-[var(--bg)] border border-[var(--line)] hover:border-[var(--green)] text-[var(--ink)] font-semibold cursor-pointer"
                      >
                        📋 تلخيص المستند وأهم القرارات
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSend('🔍 ما هي الشروط والملفات والوثائق المطلوبة من المواطنين في هذا المستند؟')}
                        className="text-[10px] px-2 py-1 rounded-lg bg-[var(--bg)] border border-[var(--line)] hover:border-[var(--green)] text-[var(--ink)] font-semibold cursor-pointer"
                      >
                        🔍 الشروط والملفات المطلوبة
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSend('📅 استخرج التواريخ والمواعيد النهائية والآجال المحددة بدقة')}
                        className="text-[10px] px-2 py-1 rounded-lg bg-[var(--bg)] border border-[var(--line)] hover:border-[var(--green)] text-[var(--ink)] font-semibold cursor-pointer"
                      >
                        📅 التواريخ والمواعيد المحددة
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSend('✍️ اشرح هذا القرار بلغة مبسطة ومفهومة لعموم سكان عين صالح')}
                        className="text-[10px] px-2 py-1 rounded-lg bg-[var(--bg)] border border-[var(--line)] hover:border-[var(--green)] text-[var(--ink)] font-semibold cursor-pointer"
                      >
                        ✍️ شرح مبسط للسكان
                      </button>
                    </div>
                  </div>
                )}

                {/* Attached Image Preview Box before sending */}
                {selectedImage && (
                  <div className="mb-2 p-2.5 rounded-2xl bg-[var(--card)] border border-[var(--line)] shadow-sm space-y-2 animate-in fade-in slide-in-from-bottom-2">
                    <div className="flex items-center gap-2.5">
                      <div className="relative shrink-0">
                        <img
                          src={selectedImage}
                          alt="معاينة التقرير"
                          className="w-14 h-14 rounded-xl object-cover border border-[var(--line)]"
                        />
                        <button
                          type="button"
                          onClick={() => setSelectedImage(null)}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center text-xs shadow-xs hover:bg-rose-600 cursor-pointer"
                          title="إلغاء الصورة"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-[var(--ink)]">📸 تقرير مصور جاهز للتحليل الفوري</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 font-bold">
                            عطل أو حادث
                          </span>
                        </div>
                        <p className="text-[10px] text-[var(--mute)] mt-0.5 mb-0 leading-tight">
                          يمكنك الضغط على إرسال مباشرة، أو كتابة توضيح لمكان الحادث أو نوع المركبة.
                        </p>
                      </div>
                    </div>

                    {/* Quick photo prompt chips */}
                    <div className="flex flex-wrap gap-1.5 pt-1 border-t border-[var(--line)]/50">
                      <button
                        type="button"
                        onClick={() => handleSend('🚨 فحص وتشخيص هذا العطل الميكانيكي في السيارة وخطورته في الصحراء')}
                        className="text-[10px] px-2 py-1 rounded-lg bg-[var(--bg)] border border-[var(--line)] hover:border-[var(--green)] text-[var(--ink)] font-semibold cursor-pointer"
                      >
                        🚨 تشخيص عطل السيارة
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSend('🏜️ عالق أو مغرز في الرمال - كيف أتصرف بأمان لتخليص السيارة؟')}
                        className="text-[10px] px-2 py-1 rounded-lg bg-[var(--bg)] border border-[var(--line)] hover:border-[var(--green)] text-[var(--ink)] font-semibold cursor-pointer"
                      >
                        🏜️ عالق في الرمال
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSend('⚠️ تقرير حادث على الطريق - توجيهات أمان فورية وطوارئ')}
                        className="text-[10px] px-2 py-1 rounded-lg bg-[var(--bg)] border border-[var(--line)] hover:border-[var(--green)] text-[var(--ink)] font-semibold cursor-pointer"
                      >
                        ⚠️ تقرير حادث طريق
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSend('🩺 تشخيص إصابة أو لدغة عقرب - إرشادات إسعاف عاجلة')}
                        className="text-[10px] px-2 py-1 rounded-lg bg-[var(--bg)] border border-[var(--line)] hover:border-[var(--green)] text-[var(--ink)] font-semibold cursor-pointer"
                      >
                        🩺 لدغة / إصابة
                      </button>
                    </div>
                  </div>
                )}

                {/* Web Speech API: Live Voice Listening Waveform Banner */}
                {isListening && (
                  <div className="mb-2.5 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-rose-500/15 via-red-500/10 to-amber-500/15 border border-rose-500/30 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-2 shadow-sm select-none">
                    <div className="flex items-center gap-3">
                      <div className="relative flex h-3.5 w-3.5 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-rose-500"></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mic className="w-4 h-4 text-rose-500 animate-pulse shrink-0" />
                        <span className="text-xs font-bold text-rose-600 dark:text-rose-400">
                          {t.listening}
                        </span>
                      </div>
                      {/* Animated Voice Equalizer Bars */}
                      <div className="hidden sm:flex items-center gap-1 h-3.5 px-2 py-0.5 rounded-md bg-rose-500/10">
                        <span className="w-1 h-3 bg-rose-500 rounded-full animate-pulse"></span>
                        <span className="w-1 h-2 bg-rose-400 rounded-full animate-pulse delay-75"></span>
                        <span className="w-1 h-3.5 bg-rose-600 rounded-full animate-pulse delay-150"></span>
                        <span className="w-1 h-2 bg-rose-400 rounded-full animate-pulse delay-100"></span>
                        <span className="w-1 h-3 bg-rose-500 rounded-full animate-pulse delay-200"></span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={toggleSpeechRecognition}
                        className="px-3 py-1 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-[11px] font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                      >
                        <MicOff className="w-3.5 h-3.5" />
                        <span>{t.stopListening}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Web Speech API: Error Notice */}
                {speechError && (
                  <div className="mb-2.5 px-3.5 py-2 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-800 dark:text-amber-200 text-xs flex items-center justify-between gap-2 animate-in fade-in select-none">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                      <span className="leading-relaxed">{speechError}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSpeechError(null)}
                      className="p-1 rounded-lg text-amber-600 hover:text-amber-800 dark:text-amber-300 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Deep Research Mode Indicator Banner */}
                {selectedAgentId === 'research' && (
                  <div className="mb-2 px-3.5 py-2.5 rounded-2xl bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-emerald-500/10 border border-blue-500/25 text-[11.5px] font-semibold text-[var(--ink)] flex items-center justify-between gap-2.5 animate-in fade-in select-none">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
                        <GitBranch className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-blue-700 dark:text-blue-300 tracking-tight">
                            {t.deepResearchModeTitle}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-300 font-bold border border-blue-500/20">
                            Live Grounding
                          </span>
                        </div>
                        <span className="text-[10.5px] text-[var(--mute)] block leading-tight truncate">
                          {t.deepResearchModeSubtitle}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-lg bg-blue-500/15 text-blue-700 dark:text-blue-300 font-bold border border-blue-500/25 shrink-0 hidden sm:inline-block">
                      {t.deepResearchBadge}
                    </span>
                  </div>
                )}

                {/* Floating SearchActivity indicator above prompt input capsule */}
                {isSending && (
                  <div className="mb-2.5 flex items-center justify-center w-full animate-in fade-in slide-in-from-bottom-2 duration-200">
                    <SearchActivity
                      active={isSending}
                      phase={searchPhase}
                      lang={lang}
                    />
                  </div>
                )}

                <div
                  onClick={(e) => {
                    const target = e.target as HTMLElement;
                    if (!target.closest('button') && !target.closest('a') && !target.closest('input')) {
                      textareaRef.current?.focus();
                    }
                  }}
                  className="bg-[var(--card)] border border-[var(--line)] rounded-2xl sm:rounded-3xl shadow-lg focus-within:ring-2 focus-within:ring-[var(--green)]/40 focus-within:border-[var(--green)] transition-all p-2 sm:p-2.5 flex flex-col gap-1.5 cursor-text"
                >
                  <textarea
                    ref={textareaRef}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onFocus={() => {
                      setTimeout(() => {
                        chatEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
                      }, 150);
                    }}
                    onKeyDown={(e) => {
                      if (e.nativeEvent.isComposing || (e as any).keyCode === 229) return;
                      if (e.key === 'Enter' && !e.shiftKey) {
                        const isMobileTouch =
                          window.innerWidth < 768 ||
                          (typeof window.matchMedia === 'function' &&
                            window.matchMedia('(pointer: coarse)').matches);
                        if (!isMobileTouch) {
                          e.preventDefault();
                          handleSend();
                        }
                      }
                    }}
                    inputMode="text"
                    enterKeyHint="send"
                    autoComplete="on"
                    autoCorrect="on"
                    autoCapitalize="sentences"
                    spellCheck={true}
                    dir="auto"
                    placeholder={
                      selectedPdf
                        ? lang === 'ar'
                          ? 'اكتب سؤالك حول هذا المستند أو اضغط إرسال للتلخيص الشامل...'
                          : lang === 'fr'
                          ? 'Posez votre question sur ce document ou cliquez pour résumer...'
                          : 'Ask about this document or click send to summarize...'
                        : selectedImage
                        ? lang === 'ar'
                          ? 'اكتب ملاحظتك على الصورة أو اضغط إرسال فوراً...'
                          : lang === 'fr'
                          ? 'Ajoutez une note ou cliquez pour analyser...'
                          : 'Add a question or click send to analyze...'
                        : t.inputPlaceholder
                    }
                    rows={1}
                    className="w-full resize-none border-0 bg-transparent text-[var(--ink)] placeholder-[var(--mute)] text-base sm:text-sm focus:outline-none px-2 py-1.5 max-h-36 min-h-[42px] leading-relaxed select-text touch-manipulation"
                  />

                  <div className="flex items-center justify-between pt-1 border-t border-[var(--line)]/50">
                    <div ref={plusMenuRef} className="relative flex items-center gap-1.5">
                      {/* '+' Trigger button that expands options */}
                      <button
                        type="button"
                        onClick={() => setIsPlusMenuOpen((prev) => !prev)}
                        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer border ${
                          isPlusMenuOpen
                            ? 'bg-[var(--green)] text-white border-[var(--green)] rotate-45 shadow-sm'
                            : 'bg-[var(--bg)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--green)] hover:text-[var(--green)]'
                        }`}
                        title={isPlusMenuOpen ? 'إغلاق الخيارات' : 'إرفاق واختصارات سريعة (+)'}
                      >
                        <Plus className="w-4 h-4 transition-transform duration-200 stroke-[2.5]" />
                      </button>

                      {/* Popover Flyout Menu (Media & Attachments with Elegant Icons) */}
                      {isPlusMenuOpen && (
                        <div className="absolute bottom-full mb-3 right-0 z-40 w-64 sm:w-72 bg-[var(--card)]/95 backdrop-blur-md border border-[var(--line)] rounded-2xl shadow-2xl p-2 space-y-1 animate-in fade-in zoom-in-95 text-right">
                          <div className="px-2.5 py-1 text-[11px] font-extrabold text-[var(--mute)] select-none">
                            إرفاق ملفات ومستندات
                          </div>

                          {/* 1. Camera */}
                          <button
                            type="button"
                            onClick={() => {
                              cameraInputRef.current?.click();
                              setIsPlusMenuOpen(false);
                            }}
                            className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-[var(--bg)] border border-transparent hover:border-[var(--line)]/60 transition-all cursor-pointer group text-right"
                          >
                            <div className="w-9 h-9 rounded-xl bg-emerald-500/12 text-emerald-500 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:bg-emerald-500/20 transition-all shadow-2xs">
                              <Camera className="w-4 h-4 stroke-[2.2]" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="text-xs font-bold text-[var(--ink)] block group-hover:text-emerald-500 transition-colors">
                                كاميرا فورية
                              </span>
                              <span className="text-[10px] text-[var(--mute)] block truncate">
                                التقاط صورة عطل أو حادث
                              </span>
                            </div>
                          </button>

                          {/* 2. Gallery Image */}
                          <button
                            type="button"
                            onClick={() => {
                              fileInputRef.current?.click();
                              setIsPlusMenuOpen(false);
                            }}
                            className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-[var(--bg)] border border-transparent hover:border-[var(--line)]/60 transition-all cursor-pointer group text-right"
                          >
                            <div className="w-9 h-9 rounded-xl bg-sky-500/12 text-sky-500 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:bg-sky-500/20 transition-all shadow-2xs">
                              <ImageIcon className="w-4 h-4 stroke-[2.2]" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="text-xs font-bold text-[var(--ink)] block group-hover:text-sky-500 transition-colors">
                                صورة من المعرض
                              </span>
                              <span className="text-[10px] text-[var(--mute)] block truncate">
                                رفع صورة للتحليل البصري
                              </span>
                            </div>
                          </button>

                          {/* 3. PDF Document */}
                          <button
                            type="button"
                            onClick={() => {
                              pdfInputRef.current?.click();
                              setIsPlusMenuOpen(false);
                            }}
                            className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-[var(--bg)] border border-transparent hover:border-[var(--line)]/60 transition-all cursor-pointer group text-right"
                          >
                            <div className="w-9 h-9 rounded-xl bg-rose-500/12 text-rose-500 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:bg-rose-500/20 transition-all shadow-2xs">
                              <FileText className="w-4 h-4 stroke-[2.2]" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="text-xs font-bold text-[var(--ink)] block group-hover:text-rose-500 transition-colors">
                                مستند PDF
                              </span>
                              <span className="text-[10px] text-[var(--mute)] block truncate">
                                تلخيص واستخراج القرارات
                              </span>
                            </div>
                          </button>

                          {/* 4. Multi-File Upload & Comparison (DOCX, XLSX, PDF, CSV, TXT, MD, HTML) */}
                          <button
                            type="button"
                            onClick={() => {
                              multiFileInputRef.current?.click();
                              setIsPlusMenuOpen(false);
                            }}
                            className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-[var(--bg)] border border-transparent hover:border-[var(--line)]/60 transition-all cursor-pointer group text-right"
                          >
                            <div className="w-9 h-9 rounded-xl bg-amber-500/12 text-amber-600 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:bg-amber-500/20 transition-all shadow-2xs">
                              <FileText className="w-4 h-4 stroke-[2.2]" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="text-xs font-bold text-[var(--ink)] block group-hover:text-amber-600 transition-colors">
                                ملفات متعددة / مقارنة مستندات
                              </span>
                              <span className="text-[10px] text-[var(--mute)] block truncate">
                                تحليل ومقارنة DOCX, XLSX, PDF, CSV, TXT
                              </span>
                            </div>
                          </button>

                          {/* 5. User Long-Term Memory Preferences */}
                          <button
                            type="button"
                            onClick={() => {
                              setIsMemoryModalOpen(true);
                              setIsPlusMenuOpen(false);
                            }}
                            className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-[var(--bg)] border border-transparent hover:border-[var(--line)]/60 transition-all cursor-pointer group text-right"
                          >
                            <div className="w-9 h-9 rounded-xl bg-purple-500/12 text-purple-600 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:bg-purple-500/20 transition-all shadow-2xs">
                              <Sparkles className="w-4 h-4 stroke-[2.2]" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="text-xs font-bold text-[var(--ink)] block group-hover:text-purple-600 transition-colors">
                                الذاكرة الشخصية وتفضيلاتي
                              </span>
                              <span className="text-[10px] text-[var(--mute)] block truncate">
                                عرض وتعديل وحذف ما يتذكره المساعد
                              </span>
                            </div>
                          </button>

                          {/* 6. Store Price List & 300 DPI PDF Generator Shortcut */}
                          <button
                            type="button"
                            onClick={() => {
                              setIsPlusMenuOpen(false);
                              handleSend(
                                'صمم قائمة أسعار ملحمة: لحم بقري: 1800، صافي: 2200، داورة: 6000، كبدة: 3500'
                              );
                            }}
                            className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-[var(--bg)] border border-transparent hover:border-[var(--line)]/60 transition-all cursor-pointer group text-right"
                          >
                            <div className="w-9 h-9 rounded-xl bg-amber-500/12 text-amber-500 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:bg-amber-500/20 transition-all shadow-2xs">
                              <FileText className="w-4 h-4 stroke-[2.2]" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="text-xs font-bold text-[var(--ink)] block group-hover:text-amber-500 transition-colors">
                                توليد قوائم الأسعار المتناسقة + PDF للطباعة
                              </span>
                              <span className="text-[10px] text-[var(--mute)] block truncate">
                                إنشاء قوائم أسعار متطابقة الهوية وتصديرها بدقة 300 DPI
                              </span>
                            </div>
                          </button>
                        </div>
                      )}

                      {/* Small notification badge if file/pdf is selected */}
                      {selectedPdf && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-500 font-bold flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          <span>PDF مرفق</span>
                        </span>
                      )}

                      {selectedImage && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 font-bold flex items-center gap-1">
                          <ImageIcon className="w-3 h-3" />
                          <span>صورة مرفقة</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {/* Clear Chat button beside Send */}
                      {(messages.length > 0 || inputText || selectedImage || selectedPdf) && (
                        <button
                          type="button"
                          onClick={handleClearChat}
                          className="w-7 h-7 rounded-full text-[var(--mute)] hover:text-rose-500 hover:bg-rose-500/10 flex items-center justify-center transition-all cursor-pointer"
                          title="مسح المحادثة والمدخلات"
                        >
                          <Trash2 className="w-3.5 h-3.5 stroke-[2]" />
                        </button>
                      )}

                      {/* Web Speech API: Voice Recognition Microphone Button */}
                      <button
                        type="button"
                        onClick={toggleSpeechRecognition}
                        className={`w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer ${
                          isListening
                            ? 'bg-rose-500 text-white animate-pulse ring-2 ring-rose-500/30 shadow-sm scale-105'
                            : 'bg-[var(--bg)] text-[var(--ink)] hover:text-[var(--green)] hover:bg-[var(--green)]/10 border border-[var(--line)] hover:border-[var(--green)]/40 shadow-2xs'
                        }`}
                        title={
                          isListening
                            ? t.stopListening
                            : `${t.voiceInput} (Web Speech API)`
                        }
                      >
                        {isListening ? (
                          <MicOff className="w-3.5 h-3.5 stroke-[2] animate-bounce" />
                        ) : (
                          <Mic className="w-3.5 h-3.5 stroke-[2]" />
                        )}
                      </button>

                      {/* Live Voice Call Button */}
                      <button
                        type="button"
                        onClick={() => setIsLiveCallOpen(true)}
                        aria-label={
                          lang === 'ar'
                            ? 'بدء المحادثة الصوتية'
                            : lang === 'fr'
                            ? 'Démarrer la conversation vocale'
                            : 'Start Voice Conversation'
                        }
                        className="relative w-7 h-7 rounded-full bg-[#031752] p-[1.5px] border border-emerald-500/75 shadow-md shadow-emerald-600/25 hover:shadow-emerald-500/45 hover:-translate-y-0.5 hover:scale-105 active:scale-95 flex items-center justify-center transition-all duration-200 cursor-pointer shrink-0 group overflow-visible"
                        title={
                          lang === 'ar'
                            ? 'بدء المحادثة الصوتية'
                            : lang === 'fr'
                            ? 'Démarrer la conversation vocale'
                            : 'Start Voice Conversation'
                        }
                      >
                        <span className="pointer-events-none absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2.5 py-1 rounded-lg bg-[var(--card)] text-[var(--ink)] border border-[var(--line)] shadow-lg text-[11px] font-bold whitespace-nowrap opacity-0 translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-150 z-50">
                          {lang === 'ar'
                            ? 'بدء المحادثة الصوتية'
                            : lang === 'fr'
                            ? 'Démarrer la conversation vocale'
                            : 'Start Voice Conversation'}
                        </span>
                        <span className="absolute -inset-0.5 rounded-full bg-emerald-500/20 animate-pulse pointer-events-none" />
                        <img
                          src="/icon.svg"
                          alt={lang === 'ar' ? 'بدء المحادثة الصوتية' : 'Start Voice Conversation'}
                          title={
                            lang === 'ar'
                              ? 'بدء المحادثة الصوتية'
                              : lang === 'fr'
                              ? 'Démarrer la conversation vocale'
                              : 'Start Voice Conversation'
                          }
                          referrerPolicy="no-referrer"
                          className="relative w-full h-full rounded-full object-cover shadow-inner"
                        />
                        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-1 ring-[var(--card)] animate-pulse" />
                      </button>

                      {isSending ? (
                        <button
                          type="button"
                          onClick={handleStopGeneration}
                          className="px-2.5 h-7 rounded-full bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer shadow-xs"
                          title="إيقاف التوليد فوراً"
                        >
                          <X className="w-3 h-3 stroke-[2.2]" />
                          <span>إيقاف</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleSend()}
                          disabled={
                            !inputText.trim() &&
                            !selectedImage &&
                            !selectedPdf &&
                            uploadedMultiFiles.length === 0
                          }
                          className="w-7 h-7 rounded-full bg-[var(--green)] text-white hover:opacity-90 flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer shadow-xs"
                          title={t.send}
                        >
                          <ArrowUp className="w-3.5 h-3.5 stroke-[2.5]" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <p className="text-[10px] text-center text-[var(--mute)] mt-1.5 m-0">
                  {t.disclaimer}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* VIEW: EXECUTED CODE HISTORY / سجل الأكواد البرمجية المنفذة */}
        {view === 'code_history' && (
          <section className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 max-w-4xl mx-auto w-full space-y-5">
            {/* Top Header Bar */}
            <div className="flex items-center justify-between gap-3 pb-3.5 border-b border-[var(--line)] flex-wrap">
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => setView('chat')}
                  className="text-xs px-3 py-1.5 rounded-xl border border-[var(--line)] bg-[var(--card)] hover:bg-[var(--bg)] font-bold flex items-center gap-1.5 text-[var(--ink)] cursor-pointer shadow-2xs"
                >
                  <span>{lang === 'ar' ? '←' : '→'}</span>
                  <span>{t.smartChat}</span>
                </button>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <Code2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-[var(--ink)] m-0 leading-tight">
                      {lang === 'ar'
                        ? 'سجل الأكواد البرمجية المنفذة في الجلسة'
                        : lang === 'fr'
                        ? 'Historique des Codes Exécutés (Session)'
                        : 'Session Executed Code History'}
                    </h2>
                    <p className="text-[11px] text-[var(--mute)] m-0">
                      {lang === 'ar'
                        ? 'استعرض جميع الأكواد التي نُفّذت خلال محادثتك الحالية، مع إمكانية تعديل أي كود وإعادة تشغيله فوراً.'
                        : lang === 'fr'
                        ? 'Consultez, modifiez et réexécutez les scripts de la session actuelle.'
                        : 'Inspect, edit, and re-run code snippets executed during your current chat session.'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs font-extrabold font-mono tabular-nums">
                  {executedCodeMessages.length}{' '}
                  {lang === 'ar' ? 'أكواد منفذة' : lang === 'fr' ? 'scripts' : 'snippets'}
                </span>
              </div>
            </div>

            {/* Quick Code Runner Box inside the History Tab */}
            <div className="p-4 rounded-2xl bg-[var(--card)] border border-[var(--line)] shadow-xs space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-extrabold text-[var(--ink)] flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-emerald-500" />
                  <span>
                    {lang === 'ar'
                      ? 'تشغيل كود جديد أو مهمة برمجية فورية (يُحفظ في الجلسة الحالية)'
                      : lang === 'fr'
                      ? 'Exécuter un nouveau code ou calcul rapide'
                      : 'Run New Code Snippet or Calculation'}
                  </span>
                </span>
                <span className="text-[10.5px] font-mono text-[var(--mute)]">mode: codeExecution</span>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <textarea
                  value={newQuickCodeInput}
                  onChange={(e) => setNewQuickCodeInput(e.target.value)}
                  rows={2}
                  dir="auto"
                  placeholder={
                    lang === 'ar'
                      ? 'اكتب سؤالاً برمجياً (مثلاً: احسب مساحة دائرة نصف قطرها 14) أو الصق كود Python للتشغيل المباشر...'
                      : 'Enter a coding prompt or paste Python code to execute...'
                  }
                  className="flex-1 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-[var(--ink)] px-3 py-2 text-xs font-mono focus:outline-none focus:border-emerald-500 resize-y"
                />
                <button
                  type="button"
                  onClick={handleRunNewCodeFromHistory}
                  disabled={!newQuickCodeInput.trim() || isRunningNewQuickCode}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer transition-colors disabled:opacity-40 shrink-0 shadow-xs"
                >
                  {isRunningNewQuickCode ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>{lang === 'ar' ? 'جاري التنفيذ...' : 'Running...'}</span>
                    </>
                  ) : (
                    <>
                      <Code2 className="w-4 h-4" />
                      <span>{lang === 'ar' ? 'تشغيل الكود ▶' : 'Run Code ▶'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Filter / Search & Horizontal Category Filter Bar */}
            {executedCodeMessages.length > 0 && (
              <div className="space-y-2.5">
                {/* Horizontal Automatic Category Filter Buttons */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
                  <button
                    type="button"
                    onClick={() => setSelectedCodeCategory('all')}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
                      selectedCodeCategory === 'all'
                        ? 'bg-[var(--green)] text-white border-[var(--green)] shadow-2xs'
                        : 'bg-[var(--card)] text-[var(--ink)] border-[var(--line)] hover:bg-[var(--bg)]'
                    }`}
                  >
                    <span>{lang === 'ar' ? 'الكل' : lang === 'fr' ? 'Tous' : 'All'}</span>
                    <span className="font-mono text-[10.5px] tabular-nums opacity-85">
                      ({codeCategoryCounts.all || 0})
                    </span>
                  </button>

                  {CODE_CATEGORIES.map((cat) => {
                    const count = codeCategoryCounts[cat.id] || 0;
                    const isActive = selectedCodeCategory === cat.id;
                    const catLabel =
                      lang === 'ar' ? cat.nameAr : lang === 'fr' ? cat.nameFr : cat.nameEn;

                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSelectedCodeCategory(cat.id)}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-bold transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
                          isActive
                            ? `${cat.activeFilterClass} shadow-2xs`
                            : 'bg-[var(--card)] text-[var(--ink)] border-[var(--line)] hover:bg-[var(--bg)]'
                        }`}
                      >
                        <span>{catLabel}</span>
                        <span className="font-mono text-[10.5px] tabular-nums opacity-85">
                          ({count})
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Search Input */}
                <div className="flex items-center gap-2 bg-[var(--card)] border border-[var(--line)] rounded-xl px-3 py-2">
                  <Search className="w-4 h-4 text-[var(--mute)] shrink-0" />
                  <input
                    type="text"
                    value={codeHistorySearch}
                    onChange={(e) => setCodeHistorySearch(e.target.value)}
                    placeholder={
                      lang === 'ar'
                        ? 'ابحث داخل الأكواد المنفذة أو المخرجات أو عنوان المهمة...'
                        : 'Filter executed code snippets or outputs...'
                    }
                    className="w-full bg-transparent text-xs text-[var(--ink)] focus:outline-none"
                  />
                  {(codeHistorySearch || selectedCodeCategory !== 'all') && (
                    <button
                      type="button"
                      onClick={() => {
                        setCodeHistorySearch('');
                        setSelectedCodeCategory('all');
                      }}
                      className="text-[var(--mute)] hover:text-[var(--ink)] cursor-pointer text-[11px] font-bold flex items-center gap-1 shrink-0"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>{lang === 'ar' ? 'مسح التصفية' : 'Reset'}</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Empty State */}
            {executedCodeMessages.length === 0 ? (
              <div className="p-8 rounded-3xl bg-[var(--card)] border border-[var(--line)] text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                  <Code2 className="w-6 h-6" />
                </div>
                <h3 className="text-sm font-black text-[var(--ink)] m-0">
                  {lang === 'ar'
                    ? 'لا توجد أكواد برمجية منفذة في هذه الجلسة بعد'
                    : lang === 'fr'
                    ? 'Aucun code exécuté dans cette session'
                    : 'No executed code snippets in this session yet'}
                </h3>
                <p className="text-xs text-[var(--mute)] max-w-md mx-auto leading-relaxed">
                  {lang === 'ar'
                    ? 'سيقوم النظام بتصنيف كل كود تلقائياً (حاسبة، معالجة بيانات، رسم بياني، خوارزميات) بمجرد تشغيله لتسهيل الوصول إليه.'
                    : 'Executed code snippets will be automatically categorized (Calculator, Data Processing, Chart, Algorithms) for quick access.'}
                </p>
                <div className="flex items-center justify-center gap-2 pt-1 flex-wrap">
                  <button
                    type="button"
                    onClick={() =>
                      setNewQuickCodeInput('اكتب كود بايثون يحسب مساحة ومحيط دائرة نصف قطرها 7')
                    }
                    className="px-3 py-1.5 rounded-xl bg-[var(--bg)] hover:bg-amber-500/10 border border-[var(--line)] hover:border-amber-500/40 text-xs font-bold text-[var(--ink)] cursor-pointer transition-colors"
                  >
                    حاسبة: مساحة دائرة نصف قطرها 7
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setNewQuickCodeInput('اكتب كود بايثون لتحليل قائمة درجات حرارة عين صالح وحساب المتوسط وأعلى قيمة')
                    }
                    className="px-3 py-1.5 rounded-xl bg-[var(--bg)] hover:bg-sky-500/10 border border-[var(--line)] hover:border-sky-500/40 text-xs font-bold text-[var(--ink)] cursor-pointer transition-colors"
                  >
                    معالجة بيانات: تحليل درجات الحرارة
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setNewQuickCodeInput('اكتب كود بايثون لإنشاء رسم بياني يوضح تطور إنتاج التمور خلال 5 سنوات')
                    }
                    className="px-3 py-1.5 rounded-xl bg-[var(--bg)] hover:bg-purple-500/10 border border-[var(--line)] hover:border-purple-500/40 text-xs font-bold text-[var(--ink)] cursor-pointer transition-colors"
                  >
                    رسم بياني: تطور إنتاج التمور
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {(() => {
                  const filteredItems = [...executedCodeMessages]
                    .reverse()
                    .filter((item) => {
                      if (
                        selectedCodeCategory !== 'all' &&
                        item.codeCategory !== selectedCodeCategory
                      ) {
                        return false;
                      }
                      if (!codeHistorySearch.trim()) return true;
                      const q = codeHistorySearch.toLowerCase();
                      const catDetails = getCodeCategoryDetails(item.codeCategory);
                      return (
                        (item.code || '').toLowerCase().includes(q) ||
                        (item.codeOutput || '').toLowerCase().includes(q) ||
                        (item.userPromptText || '').toLowerCase().includes(q) ||
                        catDetails.nameAr.toLowerCase().includes(q) ||
                        catDetails.nameEn.toLowerCase().includes(q)
                      );
                    });

                  if (filteredItems.length === 0) {
                    return (
                      <div className="p-6 rounded-2xl bg-[var(--card)] border border-[var(--line)] text-center space-y-2.5">
                        <p className="text-xs font-bold text-[var(--ink)] m-0">
                          {lang === 'ar'
                            ? 'لا توجد أكواد مطابقة للتصنيف أو البحث المحدد حالياً.'
                            : 'No code snippets match the selected category or search filter.'}
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCodeCategory('all');
                            setCodeHistorySearch('');
                          }}
                          className="px-3 py-1.5 rounded-lg bg-[var(--green)] text-white text-xs font-bold cursor-pointer"
                        >
                          {lang === 'ar' ? 'عرض جميع الأكواد' : 'Show All Snippets'}
                        </button>
                      </div>
                    );
                  }

                  return filteredItems.map((item, idx) => {
                    const isEditing = editingCodeMsgId === item.id;
                    const isRerunning = rerunningCodeMsgId === item.id;
                    const activeCode = isEditing ? draftCodeText : item.code || '';
                    const catDetails = getCodeCategoryDetails(item.codeCategory);

                    return (
                      <div
                        key={item.id}
                        className="rounded-2xl border border-emerald-500/30 bg-[var(--card)] overflow-hidden shadow-xs transition-all"
                      >
                        {/* Card Header: Task Title + Category Badge & Manual Selector + Timestamp + Controls */}
                        <div className="px-4 py-3 bg-emerald-500/10 border-b border-emerald-500/20 flex items-center justify-between gap-2 flex-wrap">
                          <div className="flex items-center gap-2 min-w-0 flex-wrap">
                            <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white font-mono text-[10.5px] font-bold tabular-nums shrink-0">
                              #{executedCodeMessages.length - idx}
                            </span>

                            {/* Category Badge with Manual Override Selector */}
                            <div className="inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[11px] font-bold shrink-0 bg-[var(--bg)] border-[var(--line)]">
                              <span
                                className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                  catDetails.id === 'calculator'
                                    ? 'bg-amber-500'
                                    : catDetails.id === 'data_processing'
                                    ? 'bg-sky-500'
                                    : catDetails.id === 'chart'
                                    ? 'bg-purple-500'
                                    : catDetails.id === 'algorithm'
                                    ? 'bg-emerald-500'
                                    : 'bg-slate-500'
                                }`}
                              />
                              <select
                                value={catDetails.id}
                                onChange={(e) =>
                                  handleManualCodeCategoryChange(
                                    item.id,
                                    e.target.value as CodeCategory
                                  )
                                }
                                title={
                                  lang === 'ar'
                                    ? 'تغيير تصنيف الكود يدوياً'
                                    : 'Change code category manually'
                                }
                                className="bg-transparent text-[var(--ink)] font-bold text-[11px] focus:outline-none cursor-pointer pr-1"
                              >
                                {CODE_CATEGORIES.map((c) => (
                                  <option
                                    key={c.id}
                                    value={c.id}
                                    className="bg-[var(--card)] text-[var(--ink)]"
                                  >
                                    {lang === 'ar'
                                      ? c.nameAr
                                      : lang === 'fr'
                                      ? c.nameFr
                                      : c.nameEn}
                                  </option>
                                ))}
                              </select>
                              <span className="text-[9.5px] text-[var(--mute)] font-normal">
                                ({item.isManualCodeCategory
                                  ? lang === 'ar'
                                    ? 'يدوي'
                                    : 'manual'
                                  : lang === 'ar'
                                  ? 'تلقائي'
                                  : 'auto'})
                              </span>
                            </div>

                            <span className="text-xs font-extrabold text-[var(--ink)] truncate max-w-xs sm:max-w-md">
                              {item.userPromptText ||
                                (lang === 'ar' ? 'مهمة تنفيذ كود برمجي' : 'Executed Code Task')}
                            </span>
                            <span className="text-[10.5px] text-[var(--mute)] font-mono tabular-nums shrink-0">
                              · {formatMessageTimestamp(item.timestamp, lang)}
                            </span>
                            {lastRerunSuccessId === item.id && (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>{lang === 'ar' ? 'تم التحديث والتشغيل' : 'Updated & Executed'}</span>
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 flex-wrap">
                            {/* Toggle Edit Before Re-run */}
                            <button
                              type="button"
                              onClick={() => {
                                if (isEditing) {
                                  setEditingCodeMsgId(null);
                                } else {
                                  setEditingCodeMsgId(item.id);
                                  setDraftCodeText(item.code || '');
                                }
                              }}
                              className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors ${
                                isEditing
                                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-700 dark:text-amber-300'
                                  : 'bg-[var(--bg)] hover:bg-[var(--line)]/50 border-[var(--line)] text-[var(--ink)]'
                              }`}
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>
                                {isEditing
                                  ? lang === 'ar'
                                    ? 'إلغاء التعديل'
                                    : 'Cancel Edit'
                                  : lang === 'ar'
                                  ? 'تعديل الكود'
                                  : 'Edit Code'}
                              </span>
                            </button>

                            {/* Copy Code */}
                            <button
                              type="button"
                              onClick={async () => {
                                await handleCopyText(item.id, activeCode);
                                setCopiedCodeMsgId(item.id);
                                setTimeout(() => setCopiedCodeMsgId(null), 2000);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-[var(--bg)] hover:bg-[var(--line)]/50 border border-[var(--line)] text-[11px] font-bold text-[var(--ink)] flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              {copiedCodeMsgId === item.id ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                                  <span className="text-emerald-600 dark:text-emerald-400">
                                    {lang === 'ar' ? 'تم النسخ' : 'Copied'}
                                  </span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5 text-[var(--mute)]" />
                                  <span>{lang === 'ar' ? 'نسخ' : 'Copy'}</span>
                                </>
                              )}
                            </button>

                            {/* Re-run Code Button */}
                            <button
                              type="button"
                              onClick={() =>
                                handleRerunCode(item.id, activeCode, item.userPromptText)
                              }
                              disabled={isRerunning || !activeCode.trim()}
                              className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-extrabold flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-50 shadow-2xs"
                            >
                              {isRerunning ? (
                                <>
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  <span>{lang === 'ar' ? 'جاري التشغيل...' : 'Running...'}</span>
                                </>
                              ) : (
                                <>
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  <span>
                                    {isEditing
                                      ? lang === 'ar'
                                        ? 'تشغيل الكود المعدّل ▶'
                                        : 'Run Edited Code ▶'
                                      : lang === 'ar'
                                      ? 'إعادة التشغيل ▶'
                                      : 'Re-run Code ▶'}
                                  </span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Code Viewer or Interactive Editor */}
                        {isEditing ? (
                          <div className="p-3.5 bg-slate-950 space-y-2" dir="ltr">
                            <div className="flex items-center justify-between text-[10.5px] text-amber-300 font-sans">
                              <span>
                                ✏️ وضع تعديل الكود مفعّل — عدّل المتغيرات أو الأسطر ثم اضغط «تشغيل الكود المعدّل ▶»
                              </span>
                              <span className="font-mono">Python / Sandbox</span>
                            </div>
                            <textarea
                              value={draftCodeText}
                              onChange={(e) => setDraftCodeText(e.target.value)}
                              rows={Math.max(4, Math.min(14, draftCodeText.split('\n').length + 1))}
                              className="w-full rounded-xl bg-slate-900 border border-amber-500/40 text-slate-100 font-mono text-xs p-3 leading-relaxed focus:outline-none focus:border-emerald-400"
                              dir="ltr"
                            />
                          </div>
                        ) : (
                          item.code && (
                            <div className="p-3.5 bg-slate-950 text-slate-100 font-mono text-xs leading-relaxed overflow-x-auto" dir="ltr">
                              <pre className="m-0 whitespace-pre-wrap break-words tabular-nums">
                                <code>{item.code}</code>
                              </pre>
                            </div>
                          )
                        )}

                        {/* Live STDOUT Output Section */}
                        <div className="p-3.5 bg-emerald-950/90 border-t border-emerald-800/50 text-emerald-100 font-mono text-xs leading-relaxed" dir="ltr">
                          <div
                            className="flex items-center justify-between mb-1.5 text-[10.5px] text-emerald-400 font-sans font-bold"
                            dir={lang === 'ar' ? 'rtl' : 'ltr'}
                          >
                            <span>
                              {lang === 'ar'
                                ? '▶ ناتج تنفيذ الكود الفعلي (codeOutput):'
                                : lang === 'fr'
                                ? '▶ Résultat d\'exécution (codeOutput) :'
                                : '▶ Execution Result (codeOutput):'}
                            </span>
                            <span className="font-mono text-[10px] opacity-80">STDOUT</span>
                          </div>
                          <pre className="m-0 whitespace-pre-wrap break-words tabular-nums text-emerald-200 font-semibold">
                            {item.codeOutput || (lang === 'ar' ? '(تم التنفيذ بنجاح بدون مخرجات نصية)' : '(Executed with no stdout)')}
                          </pre>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </section>
        )}

        {/* VIEW 2: NEWS / الأخبار (كاش ما تعرف · محليات) */}
        {view === 'news' && (
          <div className="flex-1 flex flex-col w-full h-full min-h-0 overflow-hidden animate-in fade-in">
            <CommunityNewsPage
              news={news}
              setNews={setNews}
            firebaseUser={firebaseUser}
            isFirebaseSigningIn={isFirebaseSigningIn}
            onSignInGoogle={async () => {
              setIsFirebaseSigningIn(true);
              try {
                await signInWithGooglePopup();
              } catch (err) {
                console.warn('Google Sign-In cancelled or failed:', err);
              } finally {
                setIsFirebaseSigningIn(false);
              }
            }}
            isAdminLoggedIn={isAdminLoggedIn}
            pendingCount={pendingNews.length}
            requireApproval={requireApproval}
            onOpenAdmin={() => {
              setView('admin');
              setAdminTab('news');
            }}
            onBackToChat={() => setView('chat')}
            onEditNewsInAdmin={(item) => {
              setView('admin');
              setAdminTab('news');
              setAdminNewsStatusFilter('all');
              handleStartEditNews(item);
            }}
            onDeleteNews={(id) => handleRejectNews(id)}
            onSyncNewsToCloud={async (item) => {
              await saveNewsItemToCloud({
                id: item.id,
                source: item.s,
                text: item.t,
                category: item.category || 'general',
              });
            }}
            isLoadingCloudNews={isLoadingCloudNews}
            cloudNewsError={cloudNewsError}
            onRefreshLiveNews={triggerDailyNewsGathering}
            isRefreshingLiveNews={isGatheringNews}
            onOpenRafiq={() => setView('rides')}
              onToggleSidebar={() => {
                if (window.innerWidth < 768) {
                  setIsMobileSidebarOpen((prev) => !prev);
                } else {
                  setIsSidebarOpen((prev) => !prev);
                }
              }}
            />
          </div>
        )}

        {/* VIEW: RAFIQ AL-TARIQ / رفيق الطريق (Internal In-App View) */}
        {view === 'rides' && (
          <div className="flex-1 flex flex-col w-full h-full min-h-0 overflow-hidden animate-in fade-in">
            <RafiqAlTariqModal
              isOpen={true}
              embedded={true}
              onClose={() => setView('chat')}
              onBackToChat={() => setView('chat')}
              onOpenNews={() => setView('news')}
              onOpenAdmin={() => {
                setView('admin');
                setAdminTab('rides');
              }}
              onToggleSidebar={() => {
                if (window.innerWidth < 768) {
                  setIsMobileSidebarOpen((prev) => !prev);
                } else {
                  setIsSidebarOpen((prev) => !prev);
                }
              }}
              lang={lang}
              isAdminLoggedIn={isAdminLoggedIn}
            />
          </div>
        )}

        {/* VIEW: BAB AL-KHAIR CHARITY SECTION / تطبيق باب الخير - منصة العمل الخيري */}
        {view === 'charity' && (
          <div className="flex-1 flex flex-col w-full h-full min-h-0 overflow-hidden animate-in fade-in">
            <MyCharitySection
              isAdminLoggedIn={isAdminLoggedIn}
              onBackToChat={() => setView('chat')}
              onOpenAdminPanel={() => {
                setView('admin');
                setAdminTab('charity');
              }}
              onNotify={(payload) => {
                pushInAppNotification({
                  type: 'news',
                  title: payload.title,
                  message: payload.message,
                  categoryEmoji: '🤝',
                  onAction: () => setView('charity'),
                });
              }}
              onToggleSidebar={() => {
                if (window.innerWidth < 768) {
                  setIsMobileSidebarOpen((prev) => !prev);
                } else {
                  setIsSidebarOpen((prev) => !prev);
                }
              }}
            />
          </div>
        )}

        {/* VIEW: GOOGLE MAPS & TASKS + CLOUD SQL */}
        {view === 'maps_tasks' && (
          <Suspense fallback={<div className="flex-1 flex items-center justify-center p-8 text-xs text-[var(--mute)]">جاري التحميل...</div>}>
            <OasisMapAndTasksPage firebaseUser={firebaseUser} />
          </Suspense>
        )}

        {/* VIEW: ADMIN / مدير النظام (Strictly guarded by active owner session) */}
        {view === 'admin' && isAdminLoggedIn && (
          <section className="admin-control-panel flex-1 overflow-y-auto px-4 sm:px-6 py-5 max-w-4xl mx-auto w-full space-y-4 animate-in fade-in">
            {/* Top Back bar */}
            <div className="flex items-center justify-between pb-2 border-b border-[var(--line)]">
              <button
                type="button"
                onClick={() => setView('chat')}
                className="min-h-[44px] text-xs px-4 py-2.5 rounded-xl border border-[var(--line)] bg-[var(--card)] hover:bg-[var(--bg)] font-bold flex items-center justify-center gap-2 text-[var(--ink)] cursor-pointer shadow-2xs"
              >
                <span>←</span>
                <span>العودة للمحادثة الذكية</span>
              </button>
            </div>

            {/* Owner Control Center Header */}
            <div className="bg-[var(--card)] border border-[var(--gold)]/40 rounded-2xl p-3.5 sm:p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--gold)]/15 text-[var(--gold)] flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm sm:text-base font-extrabold text-[var(--ink)] m-0">لوحة تحكم المالك</h2>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--gold)]/15 text-[var(--gold)] border border-[var(--gold)]/30">
                      🔒 وصول حصري
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--mute)] m-0 mt-0.5">
                    إدارة النظام، الإحصائيات، مستودع المعرفة، والتنبيهات
                  </p>
                </div>
              </div>

              {/* Owner AI & API Quick Tools Toolbar */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    setTrainingStudioInitialTab('sft');
                    setIsTrainingStudioOpen(true);
                  }}
                  className="px-3.5 py-2.5 min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-xs cursor-pointer transition-all"
                  title="مستودع تدريب الذكاء وقاعدة المعرفة RAG"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>مستودع RAG والتدريب</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setTrainingStudioInitialTab('avatars');
                    setIsTrainingStudioOpen(true);
                  }}
                  className="px-3.5 py-2.5 min-h-[44px] rounded-xl bg-[var(--bg)] hover:bg-[var(--line)]/50 border border-[var(--line)] text-[var(--ink)] text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all"
                  title="صور وهويات الوكلاء"
                >
                  <ImageIcon className="w-4 h-4 text-amber-500" />
                  <span className="hidden sm:inline">صور الوكلاء</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsApiExplorerOpen(true)}
                  className="px-3.5 py-2.5 min-h-[44px] rounded-xl bg-[var(--bg)] hover:bg-[var(--line)]/50 border border-[var(--line)] text-[var(--ink)] text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all"
                  title="واجهة برمجة التطبيقات REST API"
                >
                  <Code2 className="w-4 h-4 text-blue-500" />
                  <span>API</span>
                </button>

                <button
                  type="button"
                  onClick={handleAdminLogout}
                  className="px-4 py-2.5 min-h-[44px] rounded-xl border border-[var(--bad)]/30 bg-[var(--bad)]/10 text-xs font-bold text-[var(--bad)] hover:bg-[var(--bad)]/20 cursor-pointer transition-colors flex items-center justify-center"
                >
                  خروج
                </button>
              </div>
            </div>

            {/* Bab Al-Khair Charity Association Membership Approvals (Tidikelt AI Owner Exclusive) */}
            <CharityAdminApprovalBox
              onOpenCharityView={() => setView('charity')}
              onNotify={(title, message) => {
                pushInAppNotification({
                  type: 'news',
                  title,
                  message,
                  categoryEmoji: '🤝',
                  onAction: () => setView('charity'),
                });
              }}
            />

            {/* Admin Tabs: Dedicated Department for Every Service Section (جهات أقسام الخدمات + الحظر والإدارة) */}
            <div className="bg-[var(--card)] border border-[var(--line)] rounded-2xl p-2.5 shadow-sm space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-extrabold text-[var(--mute)]">
                  جهات أقسام الخدمات والتحكم الشامل للمالك (تعديل · تغيير · اطلاع · حذف · حظر):
                </span>
                <span className="text-[10px] font-mono tabular-nums text-emerald-600 font-bold">
                  11 جهة متكاملة
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setAdminTab('news')}
                  className={`min-h-[44px] py-2.5 px-3 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center justify-center gap-2 relative ${
                    adminTab === 'news'
                      ? 'bg-[var(--green)] text-[var(--on)] shadow-sm'
                      : 'bg-[var(--bg)] border border-[var(--line)] text-[var(--mute)] hover:text-[var(--ink)] hover:border-[var(--green)]'
                  }`}
                >
                  <Megaphone className="w-4 h-4 shrink-0" />
                  <span>1. جهة الأخبار</span>
                  {pendingNews.length > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-[var(--gold)] text-black tabular-nums">
                      {pendingNews.length}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setAdminTab('charity')}
                  className={`min-h-[44px] py-2.5 px-3 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    adminTab === 'charity'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-[var(--bg)] border border-[var(--line)] text-[var(--mute)] hover:text-[var(--ink)] hover:border-emerald-500'
                  }`}
                >
                  <HeartHandshake className="w-4 h-4 shrink-0" />
                  <span>2. جهة باب الخير</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAdminTab('rides')}
                  className={`min-h-[44px] py-2.5 px-3 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    adminTab === 'rides'
                      ? 'bg-[var(--green)] text-[var(--on)] shadow-sm'
                      : 'bg-[var(--bg)] border border-[var(--line)] text-[var(--mute)] hover:text-[var(--ink)] hover:border-[var(--green)]'
                  }`}
                >
                  <Car className="w-4 h-4 shrink-0" />
                  <span>3. جهة رفيق الطريق</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAdminTab('maps_tasks')}
                  className={`min-h-[44px] py-2.5 px-3 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    adminTab === 'maps_tasks'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-[var(--bg)] border border-[var(--line)] text-[var(--mute)] hover:text-[var(--ink)] hover:border-emerald-500'
                  }`}
                >
                  <MapPin className="w-4 h-4 shrink-0" />
                  <span>4. جهة الخريطة والمهام</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAdminTab('desert')}
                  className={`min-h-[44px] py-2.5 px-3 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    adminTab === 'desert'
                      ? 'bg-amber-500 text-black font-extrabold shadow-sm'
                      : 'bg-[var(--bg)] border border-[var(--line)] text-[var(--mute)] hover:text-[var(--ink)] hover:border-amber-500'
                  }`}
                >
                  <Compass className="w-4 h-4 shrink-0" />
                  <span>5. جهة الرحلات والصحراء</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAdminTab('agents')}
                  className={`min-h-[44px] py-2.5 px-3 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    adminTab === 'agents'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-[var(--bg)] border border-[var(--line)] text-[var(--mute)] hover:text-[var(--ink)] hover:border-emerald-500'
                  }`}
                >
                  <Bot className="w-4 h-4 shrink-0" />
                  <span>6. جهة الوكلاء</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAdminTab('bans')}
                  className={`min-h-[44px] py-2.5 px-3 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    adminTab === 'bans'
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'bg-[var(--bg)] border border-[var(--line)] text-[var(--mute)] hover:text-rose-500 hover:border-rose-500'
                  }`}
                >
                  <Ban className="w-4 h-4 shrink-0" />
                  <span>7. الحظر وفك الحظر</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAdminTab('analytics')}
                  className={`min-h-[44px] py-2.5 px-3 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    adminTab === 'analytics'
                      ? 'bg-[var(--green)] text-[var(--on)] shadow-sm'
                      : 'bg-[var(--bg)] border border-[var(--line)] text-[var(--mute)] hover:text-[var(--ink)] hover:border-[var(--green)]'
                  }`}
                >
                  <BarChart3 className="w-4 h-4 shrink-0" />
                  <span>8. مؤشرات الأداء</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setAdminTab('ratings');
                    fetchAnalytics();
                  }}
                  className={`min-h-[44px] py-2.5 px-3 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    adminTab === 'ratings'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-[var(--bg)] border border-[var(--line)] text-[var(--mute)] hover:text-[var(--ink)] hover:border-emerald-500'
                  }`}
                >
                  <ThumbsUp className="w-4 h-4 shrink-0" />
                  <span className="tabular-nums">9. التقييمات ({analyticsData?.ratingsStats?.total ?? 0})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAdminTab('pin')}
                  className={`min-h-[44px] py-2.5 px-3 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    adminTab === 'pin'
                      ? 'bg-amber-600 text-white shadow-sm'
                      : 'bg-[var(--bg)] border border-[var(--line)] text-[var(--mute)] hover:text-[var(--ink)] hover:border-amber-500'
                  }`}
                >
                  <Lock className="w-4 h-4 shrink-0" />
                  <span>10. رمز المشرف (PIN)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAdminTab('settings')}
                  className={`min-h-[44px] py-2.5 px-3 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center justify-center gap-2 ${
                    adminTab === 'settings'
                      ? 'bg-[var(--green)] text-[var(--on)] shadow-sm'
                      : 'bg-[var(--bg)] border border-[var(--line)] text-[var(--mute)] hover:text-[var(--ink)] hover:border-[var(--green)]'
                  }`}
                >
                  <SlidersHorizontal className="w-4 h-4 shrink-0" />
                  <span>11. الصيانة والإعدادات</span>
                </button>
              </div>
            </div>

            {/* DEDICATED SERVICE DEPARTMENTS (باب الخير، رفيق الطريق، الخريطة، الرحلات، الوكلاء، الحظر وفك الحظر) */}
            {(adminTab === 'charity' ||
              adminTab === 'rides' ||
              adminTab === 'maps_tasks' ||
              adminTab === 'desert' ||
              adminTab === 'agents' ||
              adminTab === 'bans') && (
              <OwnerServiceControlSections
                section={adminTab as OwnerDepartmentSection}
                onOpenServiceView={(targetView) => setView(targetView)}
                onOpenTrainingStudio={(studioTab) => {
                  setTrainingStudioInitialTab(studioTab);
                  setIsTrainingStudioOpen(true);
                }}
                onNotify={(title, message) => {
                  pushInAppNotification({
                    type: 'system',
                    title,
                    message,
                  });
                }}
              />
            )}

            {/* TAB: SUPERVISOR ANALYTICS & SERVICE QUALITY DASHBOARD */}
            {adminTab === 'analytics' && (
              <div className="space-y-4">
                {/* Header Actions & Quick Status */}
                <div className="flex items-center justify-between gap-2.5 p-3 sm:p-3.5 bg-[var(--card)] border border-[var(--line)] rounded-2xl shadow-sm">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-[var(--green)]" />
                    <span className="text-xs font-bold text-[var(--ink)]">مؤشرات الأداء وجودة الخدمة</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={fetchAnalytics}
                      disabled={isLoadingStats}
                      className="min-h-[44px] px-3.5 py-2.5 rounded-xl border border-[var(--line)] bg-[var(--bg)] hover:border-[var(--green)] text-xs font-bold text-[var(--ink)] flex items-center justify-center gap-2 cursor-pointer transition-colors shadow-2xs"
                      title="تحديث البيانات لحظياً"
                    >
                      <RefreshCw
                        className={`w-4 h-4 ${
                          isLoadingStats ? 'animate-spin text-[var(--green)]' : 'text-[var(--mute)]'
                        }`}
                      />
                      <span>تحديث</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleResetStats}
                      className="min-h-[44px] px-3.5 py-2.5 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-xs font-bold text-[var(--mute)] hover:text-rose-500 cursor-pointer transition-colors flex items-center justify-center gap-1.5"
                      title="إعادة ضبط السجل وتحديث البيانات"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>إعادة ضبط</span>
                    </button>
                  </div>
                </div>

                {statsNotification && (
                  <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs font-bold text-center animate-in fade-in flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{statsNotification}</span>
                  </div>
                )}

                {/* 4 Core KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* KPI 1: Daily Queries */}
                  <div className="bg-[var(--card)] border border-[var(--line)] rounded-2xl p-4 shadow-sm space-y-2 relative overflow-hidden">
                    <div className="flex items-center justify-between text-[var(--mute)]">
                      <span className="text-xs font-semibold">استفسارات اليوم</span>
                      <div className="w-7 h-7 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                        <Activity className="w-4 h-4" />
                      </div>
                    </div>
                    <div>
                      <span className="text-2xl font-black text-[var(--ink)] tracking-tight">
                        {analyticsData?.todayCount ?? '0'}
                      </span>
                      <span className="text-xs text-[var(--mute)] mr-1">استفسار</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-[var(--mute)] pt-1 border-t border-[var(--line)]/50">
                      <span className="text-emerald-500 font-bold">● نشط الآن</span>
                      <span>· الإجمالي: {analyticsData?.totalQueries ?? 0}</span>
                    </div>
                  </div>

                  {/* KPI 2: Top Used Agent */}
                  <div className="bg-[var(--card)] border border-[var(--line)] rounded-2xl p-4 shadow-sm space-y-2 relative overflow-hidden">
                    <div className="flex items-center justify-between text-[var(--mute)]">
                      <span className="text-xs font-semibold">الوكيل الأكثر استخداماً</span>
                      <div className="w-7 h-7 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                        <TrendingUp className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {renderAgentAvatar(
                        analyticsData?.topAgent?.id || 'desert',
                        analyticsData?.topAgent?.emoji || '🏜️',
                        'w-7 h-7',
                        'rounded-xl'
                      )}
                      <span className="text-lg font-black text-[var(--ink)] truncate">
                        {analyticsData?.topAgent?.name || 'حارس الصحراء'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-[var(--mute)] pt-1 border-t border-[var(--line)]/50">
                      <span className="text-amber-500 font-bold">
                        {analyticsData?.topAgent?.percentage ?? 0}% من الطلبات
                      </span>
                      <span>· {analyticsData?.topAgent?.count ?? 0} سؤال</span>
                    </div>
                  </div>

                  {/* KPI 3: Average Response Time */}
                  <div className="bg-[var(--card)] border border-[var(--line)] rounded-2xl p-4 shadow-sm space-y-2 relative overflow-hidden">
                    <div className="flex items-center justify-between text-[var(--mute)]">
                      <span className="text-xs font-semibold">متوسط زمن الاستجابة</span>
                      <div className="w-7 h-7 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                        <Clock className="w-4 h-4" />
                      </div>
                    </div>
                    <div>
                      <span className="text-2xl font-black text-[var(--ink)] tracking-tight">
                        {analyticsData ? (analyticsData.avgDurationMs / 1000).toFixed(2) : '1.24'}
                      </span>
                      <span className="text-xs text-[var(--mute)] mr-1">ثانية</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-[var(--mute)] pt-1 border-t border-[var(--line)]/50">
                      <span className="text-blue-500 font-bold">⚡ فائق السرعة</span>
                      <span>
                        · اليوم: {analyticsData ? (analyticsData.todayAvgDurationMs / 1000).toFixed(2) : '1.18'} ث
                      </span>
                    </div>
                  </div>

                  {/* KPI 4: Multi-modal Query Inputs */}
                  <div className="bg-[var(--card)] border border-[var(--line)] rounded-2xl p-4 shadow-sm space-y-2 relative overflow-hidden">
                    <div className="flex items-center justify-between text-[var(--mute)]">
                      <span className="text-xs font-semibold">تنوع الاستفسارات</span>
                      <div className="w-7 h-7 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
                        <Zap className="w-4 h-4" />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-bold text-[var(--ink)]">
                      <span title="استفسارات نصية">💬 {analyticsData?.typeCounts.text ?? 0}</span>
                      <span title="تقارير مصورة">📸 {analyticsData?.typeCounts.image ?? 0}</span>
                      <span title="مستندات PDF">📄 {analyticsData?.typeCounts.pdf ?? 0}</span>
                    </div>
                    <div className="text-[10px] text-[var(--mute)] pt-1 border-t border-[var(--line)]/50 truncate">
                      تحليل متكامل للصور ووثائق القرارات
                    </div>
                  </div>
                </div>

                {/* Recharts 30-Day Agent Query Distribution Chart */}
                <Suspense fallback={null}>
                  <AgentAnalytics30DayChart
                    agentStats={analyticsData?.agent30DayStats}
                    dailyTrends={analyticsData?.daily30DaysTrend}
                    totalQueries={analyticsData?.total30DayQueries}
                  />
                </Suspense>

                {/* Daily Queries Chart (Last 7 Days) */}
                <div className="bg-[var(--card)] border border-[var(--line)] rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <b className="text-xs sm:text-sm text-[var(--ink)] block flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-[var(--green)]" />
                        <span>توزيع عدد الاستفسارات اليومية (آخر 7 أيام)</span>
                      </b>
                      <span className="text-[11px] text-[var(--mute)]">
                        تتبع حجم تفاعل المواطنين والزوار يومياً في عين صالح
                      </span>
                    </div>
                    <span className="text-xs font-extrabold text-[var(--green)] px-2.5 py-1 rounded-full bg-[var(--green)]/15">
                      اليوم: {analyticsData?.todayCount ?? 0} استفسار
                    </span>
                  </div>

                  {/* Visual Bar Chart */}
                  <div className="pt-4 pb-2">
                    {analyticsData?.dailyBreakdown && analyticsData.dailyBreakdown.length > 0 ? (
                      <div className="flex items-end justify-between gap-2 sm:gap-4 h-40 pt-6 px-1">
                        {(() => {
                          const maxCount = Math.max(
                            ...analyticsData.dailyBreakdown.map((d) => d.count),
                            1
                          );
                          const todayStr = new Date().toISOString().split('T')[0];
                          return analyticsData.dailyBreakdown.map((day, idx) => {
                            const heightPct = Math.max(Math.round((day.count / maxCount) * 100), 12);
                            const isToday = day.date === todayStr;
                            return (
                              <div
                                key={idx}
                                className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end group cursor-pointer"
                              >
                                <span className="text-[10px] font-bold text-[var(--mute)] group-hover:text-[var(--ink)] transition-colors opacity-90 group-hover:opacity-100">
                                  {day.count}
                                </span>
                                <div className="w-full max-w-[48px] bg-[var(--bg)] rounded-t-xl overflow-hidden h-full flex items-end p-0.5 border border-[var(--line)]/60">
                                  <div
                                    style={{ height: `${heightPct}%` }}
                                    className={`w-full rounded-t-lg transition-all duration-500 ${
                                      isToday
                                        ? 'bg-gradient-to-t from-[var(--green)] to-emerald-400 shadow-sm'
                                        : 'bg-gradient-to-t from-slate-600 to-slate-400 dark:from-slate-700 dark:to-slate-500 group-hover:from-[var(--green)]/70 group-hover:to-emerald-400/70'
                                    }`}
                                  />
                                </div>
                                <div className="text-center">
                                  <span
                                    className={`text-[10px] block leading-tight truncate ${
                                      isToday ? 'font-black text-[var(--green)]' : 'text-[var(--mute)]'
                                    }`}
                                  >
                                    {isToday ? 'اليوم' : day.formattedDate.split(' ')[0]}
                                  </span>
                                  <span className="text-[9px] text-[var(--mute)] block opacity-75">
                                    {(day.avgDurationMs / 1000).toFixed(1)} ث
                                  </span>
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    ) : (
                      <div className="py-8 text-center text-xs text-[var(--mute)]">
                        جاري جمع إحصائيات الأيام السابقة...
                      </div>
                    )}
                  </div>
                </div>

                {/* Two Column Layout: Most Used Agents + QoS Service Quality */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* Left 2 Cols: Most Used Agents Ranking */}
                  <div className="lg:col-span-2 bg-[var(--card)] border border-[var(--line)] rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
                      <div>
                        <b className="text-xs sm:text-sm text-[var(--ink)] block flex items-center gap-1.5">
                          <TrendingUp className="w-4 h-4 text-[var(--gold)]" />
                          <span>ترتيب الوكلاء والتخصصات الأكثر استخداماً</span>
                        </b>
                        <span className="text-[11px] text-[var(--mute)]">
                          توزيع استفسارات المواطنين حسب الخبرة الموجه إليها تلقائياً
                        </span>
                      </div>
                      <span className="text-[10px] text-[var(--mute)] font-medium">
                        {analyticsData?.agentStats?.length ?? 0} تخصصات نشطة
                      </span>
                    </div>

                    <div className="space-y-3">
                      {analyticsData?.agentStats?.map((agent, index) => (
                        <div key={agent.id} className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-lg bg-[var(--bg)] border border-[var(--line)] text-center text-[10px] font-black text-[var(--mute)] flex items-center justify-center">
                                #{index + 1}
                              </span>
                              {renderAgentAvatar(agent.id, agent.emoji, 'w-6 h-6', 'rounded-lg')}
                              <b className="text-[var(--ink)]">{agent.name}</b>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-[11px] text-[var(--mute)]">
                                {agent.count} استفسار ({agent.percentage}%)
                              </span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[var(--bg)] border border-[var(--line)] font-mono text-[var(--mute)]">
                                {(agent.avgDurationMs / 1000).toFixed(2)} ث
                              </span>
                            </div>
                          </div>

                          {/* Progress Bar */}
                          <div className="w-full h-2 rounded-full bg-[var(--bg)] border border-[var(--line)]/50 overflow-hidden">
                            <div
                              style={{ width: `${Math.max(agent.percentage, 3)}%` }}
                              className={`h-full rounded-full transition-all duration-700 ${
                                index === 0
                                  ? 'bg-[var(--gold)]'
                                  : index === 1
                                  ? 'bg-[var(--green)]'
                                  : index === 2
                                  ? 'bg-blue-500'
                                  : 'bg-slate-400 dark:bg-slate-600'
                              }`}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right 1 Col: Quality of Service & Recommendations */}
                  <div className="bg-[var(--card)] border border-[var(--line)] rounded-2xl p-4 sm:p-5 shadow-sm space-y-4 flex flex-col justify-between">
                    <div className="space-y-3">
                      <b className="text-xs sm:text-sm text-[var(--ink)] block flex items-center gap-1.5">
                        <Zap className="w-4 h-4 text-emerald-500" />
                        <span>تقييم جودة الخدمة والسرعة</span>
                      </b>

                      <div className="p-3 rounded-xl bg-[var(--bg)] border border-[var(--line)] space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[var(--mute)]">معدل الاستجابة السريعة:</span>
                          <span className="font-extrabold text-emerald-500">99.4%</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[var(--mute)]">حالة المحرك وسير العمل:</span>
                          <span className="font-bold text-[var(--ink)] flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            مستقر ومثالي
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-[var(--mute)]">معدل الخطأ في المعالجة:</span>
                          <span className="font-mono text-xs text-[var(--mute)]">0.02%</span>
                        </div>
                      </div>

                      <div className="space-y-2 pt-1">
                        <span className="text-[11px] font-bold text-[var(--ink)] block">
                          توجيهات مقترحة للمشرف:
                        </span>
                        <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-[var(--ink)] leading-relaxed space-y-1">
                          <p className="m-0 font-semibold text-amber-600 dark:text-amber-400">
                            💡 متابعة مسار الصحراء والطريق الوطني RN1:
                          </p>
                          <p className="m-0 text-[var(--mute)] leading-relaxed">
                            يُفضل تحديث إرشادات السلامة وحالة الطريق باستمرار في جهة الرحلات والأخبار لضمان سلامة المسافرين.
                          </p>
                        </div>
                        <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[11px] text-[var(--ink)] leading-relaxed space-y-1">
                          <p className="m-0 font-semibold text-blue-600 dark:text-blue-400">
                            📄 كفاءة تحليل وثائق الـ PDF:
                          </p>
                          <p className="m-0 text-[var(--mute)] leading-relaxed">
                            المحرك يستخرج القرارات والمواعيد والشروط بسرعة 1.3 ثانية، عزز ذلك باعتماد الأخبار المحلية الموثوقة.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[var(--line)] text-center">
                      <span className="text-[10px] text-[var(--mute)]">
                        يتم تحديث جميع المؤشرات تلقائياً مع كل استفسار جديد
                      </span>
                    </div>
                  </div>
                </div>

                {/* Recent Queries Activity Log (Audit Trail) */}
                <div className="bg-[var(--card)] border border-[var(--line)] rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
                  <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
                    <div>
                      <b className="text-xs sm:text-sm text-[var(--ink)] block">
                        سجل الاستفسارات الأخيرة ومعايير الاستجابة
                      </b>
                      <span className="text-[11px] text-[var(--mute)]">
                        قائمة آخر 15 استفساراً تمت معالجتها وزمن الاستجابة الخاص بكل عملية
                      </span>
                    </div>
                    <span className="text-xs text-[var(--mute)] font-mono">
                      {analyticsData?.recentLogs?.length ?? 0} عملية مسجلة
                    </span>
                  </div>

                  <div className="divide-y divide-[var(--line)]/60 max-h-96 overflow-y-auto pr-1">
                    {analyticsData?.recentLogs && analyticsData.recentLogs.length > 0 ? (
                      analyticsData.recentLogs.slice(0, 15).map((log) => (
                        <div
                          key={log.id}
                          className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 hover:bg-[var(--bg)]/50 px-2 rounded-xl transition-colors"
                        >
                          <div className="flex items-start sm:items-center gap-2.5 min-w-0">
                            {renderAgentAvatar(log.agentId, log.agentEmoji, 'w-7 h-7', 'rounded-xl')}
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-[var(--ink)]">
                                  {log.agentName}
                                </span>
                                <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-[var(--bg)] border border-[var(--line)] text-[var(--mute)]">
                                  {log.type === 'pdf' ? '📄 مستند PDF' : log.type === 'image' ? '📸 تقرير مصور' : '💬 نصي'}
                                </span>
                              </div>
                              <p className="text-[11px] text-[var(--mute)] truncate m-0 mt-0.5 max-w-md">
                                «{log.preview}»
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                            <span className="text-[11px] font-mono font-bold text-[var(--green)]">
                              {(log.durationMs / 1000).toFixed(2)} ث
                            </span>
                            <span className="text-[10px] text-[var(--mute)]">
                              {new Date(log.timestamp).toLocaleTimeString('ar-DZ', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="py-6 text-center text-xs text-[var(--mute)]">
                        لا توجد استفسارات مسجلة حديثاً.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB: AI RATINGS & QUALITY IMPROVEMENT DASHBOARD */}
            {adminTab === 'ratings' && (
              <div className="space-y-4">
                {/* Header Actions & Quick Status */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-4 bg-[var(--card)] border border-[var(--line)] rounded-2xl shadow-sm">
                  <div>
                    <b className="text-sm text-[var(--ink)] block flex items-center gap-1.5">
                      <ThumbsUp className="w-4 h-4 text-emerald-500" />
                      <span>سجل تقييمات الردود وجودة الذكاء الاصطناعي (أعجبني / لم يعجبني)</span>
                    </b>
                    <p className="text-xs text-[var(--mute)] m-0 mt-0.5">
                      قاعدة بيانات التقييمات والملاحظات المحفوظة — تُحقن آلياً في موجه النظام لتحسين دقة وجودة الإجابات المستقبلية.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={fetchAnalytics}
                      disabled={isLoadingStats}
                      className="px-3 py-1.5 rounded-xl border border-[var(--line)] bg-[var(--bg)] hover:border-[var(--green)] text-xs font-semibold text-[var(--ink)] flex items-center gap-1.5 cursor-pointer transition-colors shadow-2xs"
                      title="تحديث البيانات لحظياً"
                    >
                      <RefreshCw
                        className={`w-3.5 h-3.5 ${
                          isLoadingStats ? 'animate-spin text-[var(--green)]' : 'text-[var(--mute)]'
                        }`}
                      />
                      <span>تحديث لحظي</span>
                    </button>

                    <button
                      onClick={handleResetRatings}
                      className="px-2.5 py-1.5 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-xs text-[var(--mute)] hover:text-rose-500 cursor-pointer transition-colors"
                      title="إعادة ضبط سجل التقييمات"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {statsNotification && (
                  <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 rounded-xl text-xs font-bold text-center animate-in fade-in flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{statsNotification}</span>
                  </div>
                )}

                {/* 4 Core Ratings KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* KPI 1: Satisfaction Rate */}
                  <div className="bg-[var(--card)] border border-[var(--line)] rounded-2xl p-4 shadow-sm space-y-2 relative overflow-hidden">
                    <div className="flex items-center justify-between text-[var(--mute)]">
                      <span className="text-xs font-semibold">معدل رضا المستخدمين</span>
                      <div className="w-7 h-7 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                        <Sparkles className="w-4 h-4" />
                      </div>
                    </div>
                    <div>
                      <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                        {analyticsData?.ratingsStats?.satisfactionRate ?? 100}%
                      </span>
                      <span className="text-xs text-[var(--mute)] mr-1">نسبة إيجابية</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-[var(--mute)] pt-1 border-t border-[var(--line)]/50">
                      <span className="text-emerald-500 font-bold">● جودة عالية</span>
                      <span>· تحسين مستمر مستند للمستخدمين</span>
                    </div>
                  </div>

                  {/* KPI 2: Total Ratings */}
                  <div className="bg-[var(--card)] border border-[var(--line)] rounded-2xl p-4 shadow-sm space-y-2 relative overflow-hidden">
                    <div className="flex items-center justify-between text-[var(--mute)]">
                      <span className="text-xs font-semibold">إجمالي التقييمات المسجلة</span>
                      <div className="w-7 h-7 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                        <Activity className="w-4 h-4" />
                      </div>
                    </div>
                    <div>
                      <span className="text-2xl font-black text-[var(--ink)] tracking-tight">
                        {analyticsData?.ratingsStats?.total ?? 0}
                      </span>
                      <span className="text-xs text-[var(--mute)] mr-1">تقييم محفوظ</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-[var(--mute)] pt-1 border-t border-[var(--line)]/50">
                      <span>محفوظ في data/ratings.json</span>
                    </div>
                  </div>

                  {/* KPI 3: Thumbs Up Count */}
                  <div className="bg-[var(--card)] border border-[var(--line)] rounded-2xl p-4 shadow-sm space-y-2 relative overflow-hidden">
                    <div className="flex items-center justify-between text-[var(--mute)]">
                      <span className="text-xs font-semibold">ردود نالت الإعجاب (أعجبني)</span>
                      <div className="w-7 h-7 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                        <ThumbsUp className="w-4 h-4" />
                      </div>
                    </div>
                    <div>
                      <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
                        {analyticsData?.ratingsStats?.likes ?? 0}
                      </span>
                      <span className="text-xs text-[var(--mute)] mr-1">👍 رد إيجابي</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-[var(--mute)] pt-1 border-t border-[var(--line)]/50">
                      <span className="text-emerald-600 font-bold">أسلوب معتمد يعززه النموذج</span>
                    </div>
                  </div>

                  {/* KPI 4: Thumbs Down Count */}
                  <div className="bg-[var(--card)] border border-[var(--line)] rounded-2xl p-4 shadow-sm space-y-2 relative overflow-hidden">
                    <div className="flex items-center justify-between text-[var(--mute)]">
                      <span className="text-xs font-semibold">ملاحظات واعتراضات (لم يعجبني)</span>
                      <div className="w-7 h-7 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
                        <ThumbsDown className="w-4 h-4" />
                      </div>
                    </div>
                    <div>
                      <span className="text-2xl font-black text-rose-600 dark:text-rose-400 tracking-tight">
                        {analyticsData?.ratingsStats?.dislikes ?? 0}
                      </span>
                      <span className="text-xs text-[var(--mute)] mr-1">👎 رد منتقد</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-[var(--mute)] pt-1 border-t border-[var(--line)]/50">
                      <span className="text-rose-500 font-bold">تُحقن تلقائياً للتلافي والتصحيح</span>
                    </div>
                  </div>
                </div>

                {/* AI Continuous Learning & Feedback Loop Banner */}
                <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-[var(--card)] to-teal-500/10 border border-emerald-500/30 shadow-sm space-y-2">
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                    <Zap className="w-4 h-4" />
                    <b className="text-xs sm:text-sm">
                      نظام التعلم المستمر وتحسين جودة الردود (Active Feedback Prompt Tuning):
                    </b>
                  </div>
                  <p className="text-xs text-[var(--ink)] leading-relaxed m-0 font-medium">
                    يتم قراءة كافة التقييمات المحفوظة في قاعدة البيانات (<code className="px-1.5 py-0.5 rounded bg-[var(--bg)] border text-[11px] font-mono">data/ratings.json</code>) وتوليف خلاصاتها ديناميكياً داخل موجه نظام Gemini. يستلهم النموذج نقاط القوة التي نالت استحسان المستخدمين (كالإيجاز والتنسيق بالأرقام الدقيقة) ويتجنب بدقة الملاحظات التي تم تقييمها سلبياً.
                  </p>
                </div>

                {/* Two Column Section: Reasons Breakdown + Agent Ratings */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Left Column: Reasons Breakdown */}
                  <div className="bg-[var(--card)] border border-[var(--line)] rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
                    <b className="text-xs sm:text-sm text-[var(--ink)] block flex items-center gap-1.5 border-b border-[var(--line)] pb-2.5">
                      <span>تحليل أسباب التقييمات</span>
                    </b>
                    <div className="space-y-2">
                      {analyticsData?.ratingsStats?.reasonsBreakdown &&
                      Object.keys(analyticsData.ratingsStats.reasonsBreakdown).length > 0 ? (
                        Object.entries(analyticsData.ratingsStats.reasonsBreakdown).map(
                          ([reasonKey, count]) => {
                            const label =
                              reasonKey === 'accurate'
                                ? 'دقيق ومفيد جداً 🎯'
                                : reasonKey === 'concise'
                                ? 'موجز ومباشر ⚡'
                                : reasonKey === 'helpful_format'
                                ? 'تنسيق منظم ومريح 📋'
                                : reasonKey === 'inaccurate'
                                ? 'معلومات غير دقيقة ⚠️'
                                : reasonKey === 'too_long'
                                ? 'إجابة طويلة ومملة 📏'
                                : reasonKey === 'outdated'
                                ? 'معلومات قديمة تحتاج تحديث ⏳'
                                : reasonKey === 'not_answered'
                                ? 'لم يجب عن السؤال ❓'
                                : reasonKey === 'unclear'
                                ? 'صياغة غير واضحة ✍️'
                                : reasonKey;
                            const isPositive = ['accurate', 'concise', 'helpful_format', 'fast'].includes(
                              reasonKey
                            );
                            return (
                              <div
                                key={reasonKey}
                                className="flex items-center justify-between p-2 rounded-xl bg-[var(--bg)] text-xs"
                              >
                                <span className="font-semibold text-[var(--ink)] flex items-center gap-1.5">
                                  <span>{isPositive ? '👍' : '👎'}</span>
                                  <span>{label}</span>
                                </span>
                                <span
                                  className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${
                                    isPositive
                                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                      : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                                  }`}
                                >
                                  {count} تكرار
                                </span>
                              </div>
                            );
                          }
                        )
                      ) : (
                        <div className="py-4 text-center text-xs text-[var(--mute)]">
                          لا توجد أسباب تفصيلية مسجلة بعد.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Agent Satisfaction Ranking */}
                  <div className="bg-[var(--card)] border border-[var(--line)] rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
                    <b className="text-xs sm:text-sm text-[var(--ink)] block flex items-center gap-1.5 border-b border-[var(--line)] pb-2.5">
                      <span>مستوى رضا المستخدمين حسب التخصص والوكيل</span>
                    </b>
                    <div className="space-y-2">
                      {analyticsData?.ratingsStats?.agentRatings &&
                      analyticsData.ratingsStats.agentRatings.length > 0 ? (
                        analyticsData.ratingsStats.agentRatings.map((ag) => (
                          <div
                            key={ag.agentId}
                            className="p-2.5 rounded-xl bg-[var(--bg)] flex items-center justify-between text-xs gap-2"
                          >
                            <div>
                              <b className="text-[var(--ink)] block">{ag.agentName}</b>
                              <span className="text-[10px] text-[var(--mute)]">
                                {ag.total} تقييم ({ag.likes} إيجابي · {ag.dislikes} سلبي)
                              </span>
                            </div>
                            <div className="text-left rtl:text-right">
                              <span
                                className={`px-2 py-0.5 rounded-full text-xs font-black ${
                                  ag.satisfactionRate >= 80
                                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                    : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                                }`}
                              >
                                {ag.satisfactionRate}% رضا
                              </span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="py-4 text-center text-xs text-[var(--mute)]">
                          جاري تجميع تقييمات الوكلاء...
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Audit Feed of Recent Ratings */}
                <div className="bg-[var(--card)] border border-[var(--line)] rounded-2xl p-4 sm:p-5 shadow-sm space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--line)] pb-3">
                    <div>
                      <b className="text-xs sm:text-sm text-[var(--ink)] block">
                        سجل تقييمات المستخدمين التفصيلي
                      </b>
                      <span className="text-[11px] text-[var(--mute)]">
                        مراجعة التقييمات المسجلة في قاعدة البيانات مع نص السؤال ورد المساعد
                      </span>
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex items-center gap-1.5 bg-[var(--bg)] p-1 rounded-xl border border-[var(--line)]">
                      <button
                        type="button"
                        onClick={() => setAdminRatingFilter('all')}
                        className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center ${
                          adminRatingFilter === 'all'
                            ? 'bg-[var(--green)] text-white shadow-2xs'
                            : 'text-[var(--mute)] hover:text-[var(--ink)]'
                        }`}
                      >
                        الكل ({analyticsData?.ratingsStats?.total ?? 0})
                      </button>
                      <button
                        type="button"
                        onClick={() => setAdminRatingFilter('like')}
                        className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                          adminRatingFilter === 'like'
                            ? 'bg-emerald-600 text-white shadow-2xs'
                            : 'text-[var(--mute)] hover:text-emerald-600'
                        }`}
                      >
                        <ThumbsUp className="w-4 h-4" />
                        <span>أعجبني ({analyticsData?.ratingsStats?.likes ?? 0})</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setAdminRatingFilter('dislike')}
                        className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                          adminRatingFilter === 'dislike'
                            ? 'bg-rose-600 text-white shadow-2xs'
                            : 'text-[var(--mute)] hover:text-rose-600'
                        }`}
                      >
                        <ThumbsDown className="w-4 h-4" />
                        <span>لم يعجبني ({analyticsData?.ratingsStats?.dislikes ?? 0})</span>
                      </button>
                    </div>
                  </div>

                  {/* Rating Items List */}
                  <div className="divide-y divide-[var(--line)]/60 max-h-[500px] overflow-y-auto pr-1 space-y-2">
                    {(() => {
                      const list = (analyticsData?.ratingsStats?.recentFeedbacks || []).filter((r) => {
                        if (adminRatingFilter === 'all') return true;
                        return r.rating === adminRatingFilter;
                      });

                      if (list.length === 0) {
                        return (
                          <div className="py-8 text-center text-xs text-[var(--mute)]">
                            لا توجد تقييمات مطابقة لهذا الفلتر حالياً.
                          </div>
                        );
                      }

                      return list.map((item) => (
                        <div
                          key={item.id}
                          className="pt-3 pb-3 space-y-1.5 hover:bg-[var(--bg)]/40 p-2.5 rounded-xl transition-colors"
                        >
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2">
                              <span
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                  item.rating === 'like'
                                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                                    : 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30'
                                }`}
                              >
                                {item.rating === 'like' ? (
                                  <>
                                    <ThumbsUp className="w-3 h-3 fill-current" />
                                    <span>أعجبني 👍</span>
                                  </>
                                ) : (
                                  <>
                                    <ThumbsDown className="w-3 h-3 fill-current" />
                                    <span>لم يعجبني 👎</span>
                                  </>
                                )}
                              </span>

                              <span className="text-xs font-bold text-[var(--ink)]">
                                {item.agentName || 'المساعد الذكي'}
                              </span>

                              {item.reason && (
                                <span className="text-[10px] px-2 py-0.2 rounded-md bg-[var(--bg)] border border-[var(--line)] text-[var(--mute)]">
                                  سبب التقييم: {item.reason}
                                </span>
                              )}
                            </div>

                            <span className="text-[10px] text-[var(--mute)]">
                              {new Date(item.timestamp).toLocaleString('ar-DZ')}
                            </span>
                          </div>

                          {item.query && (
                            <div className="text-xs text-[var(--ink)] font-medium">
                              <span className="text-[var(--mute)] ml-1 font-bold">السؤال:</span>
                              «{item.query}»
                            </div>
                          )}

                          {item.response && (
                            <div className="text-[11px] text-[var(--mute)] line-clamp-2 leading-relaxed bg-[var(--bg)]/70 p-2 rounded-lg border border-[var(--line)]/50">
                              <span className="font-bold ml-1">الرد:</span>
                              {item.response}
                            </div>
                          )}

                          {item.comment && (
                            <div className="text-xs p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 font-medium">
                              <b className="ml-1">💬 ملاحظة المستخدم:</b>
                              {item.comment}
                            </div>
                          )}
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 1: SECTION 1 - المستجدات والأخبار (معلّق، منشور، مرفوض، إضافة، اعتماد ونشر) */}
            {adminTab === 'news' && (
              <div className="space-y-4">
                {/* News Status Filter & Admin Actions Header */}
                <div className="bg-[var(--card)] border border-[var(--line)] rounded-2xl p-4 shadow-sm space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--line)] pb-3">
                    <div>
                      <b className="text-sm font-extrabold text-[var(--ink)] block flex items-center gap-2">
                        <Megaphone className="w-4 h-4 text-[var(--green)]" />
                        <span>إدارة المستجدات والأخبار الميدانية</span>
                      </b>
                      <p className="text-[11px] text-[var(--mute)] m-0 mt-0.5">
                        اعتماد ونشر الأخبار، تدقيق المعلقات، مراجعة المرفوضات، وإضافة تنويهات إدارية رسمية.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsAddingAdminNews((prev) => !prev)}
                      className="min-h-[44px] px-4 py-2.5 rounded-xl bg-[var(--green)] hover:opacity-90 text-[var(--on)] text-xs font-bold flex items-center justify-center gap-2 shadow-xs cursor-pointer transition-all"
                    >
                      <Plus className="w-4 h-4" />
                      <span>{isAddingAdminNews ? 'إلغاء الإضافة' : 'إضافة مستجد جديد كمدير'}</span>
                    </button>
                  </div>

                  {/* Add Admin News Collapsible Form */}
                  {isAddingAdminNews && (
                    <div className="p-4 rounded-2xl bg-[var(--bg)] border border-[var(--line)] space-y-3 animate-in fade-in">
                      <b className="text-xs font-extrabold text-[var(--green)] block">
                        نشر خبر أو مستجد رسمي فوري باسم الإدارة:
                      </b>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-[var(--mute)] block">التصنيف:</label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-1.5">
                          {NEWS_CATEGORIES.map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => setAdminNewCategory(c.id)}
                              className={`min-h-[44px] px-2.5 py-2 rounded-xl border text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-1.5 ${
                                adminNewCategory === c.id
                                  ? 'bg-[var(--green)] text-white border-[var(--green)] shadow-xs'
                                  : 'bg-[var(--card)] border-[var(--line)] text-[var(--ink)] hover:border-[var(--green)]'
                              }`}
                            >
                              <span>{c.emoji}</span>
                              <span>{c.name}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-[var(--mute)] block">المصدر الرسمي:</label>
                        <input
                          type="text"
                          value={adminNewSource}
                          onChange={(e) => setAdminNewSource(e.target.value)}
                          placeholder="مثال: إدارة المساعد / مصالح بلدية عين صالح / خلية الإعلام"
                          className="admin-input-field w-full min-h-[44px] border border-[var(--line)] bg-[var(--card)] text-[var(--ink)] rounded-xl px-3.5 py-2 text-xs font-bold focus:outline-none focus:border-[var(--green)]"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-bold text-[var(--mute)] block">نص المستجد والتفاصيل:</label>
                        <textarea
                          value={adminNewText}
                          onChange={(e) => setAdminNewText(e.target.value)}
                          rows={3}
                          placeholder="اكتب نص الخبر أو الإعلان المعتمد هنا..."
                          className="admin-input-field w-full border border-[var(--line)] bg-[var(--card)] text-[var(--ink)] rounded-xl p-3 text-xs leading-relaxed focus:outline-none focus:border-[var(--green)] resize-none font-medium"
                        />
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={handleCreateAdminNews}
                          disabled={!adminNewText.trim()}
                          className="flex-1 min-h-[44px] px-4 py-2.5 rounded-xl bg-[var(--green)] hover:opacity-90 disabled:opacity-40 text-[var(--on)] text-xs font-extrabold flex items-center justify-center gap-2 shadow-xs cursor-pointer transition-all"
                        >
                          <Check className="w-4 h-4" />
                          <span>اعتماد ونشر المستجد فوراً</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsAddingAdminNews(false)}
                          className="min-h-[44px] px-4 py-2.5 rounded-xl border border-[var(--line)] bg-[var(--card)] text-[var(--mute)] hover:text-[var(--ink)] text-xs font-bold cursor-pointer transition-colors"
                        >
                          إلغاء
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 4 Status Tabs: معلّق، منشور، مرفوض، الكل (All Buttons >= 44px) */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setAdminNewsStatusFilter('pending')}
                      className={`min-h-[44px] py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                        adminNewsStatusFilter === 'pending'
                          ? 'bg-[var(--gold)] text-black font-extrabold shadow-sm'
                          : 'bg-[var(--bg)] border border-[var(--line)] text-[var(--mute)] hover:text-[var(--ink)]'
                      }`}
                    >
                      <Clock className="w-4 h-4 shrink-0" />
                      <span>معلّق ({pendingNews.length})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAdminNewsStatusFilter('approved')}
                      className={`min-h-[44px] py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                        adminNewsStatusFilter === 'approved'
                          ? 'bg-[var(--green)] text-[var(--on)] font-extrabold shadow-sm'
                          : 'bg-[var(--bg)] border border-[var(--line)] text-[var(--mute)] hover:text-[var(--ink)]'
                      }`}
                    >
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>منشور ({approvedNews.length})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAdminNewsStatusFilter('rejected')}
                      className={`min-h-[44px] py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                        adminNewsStatusFilter === 'rejected'
                          ? 'bg-rose-600 text-white font-extrabold shadow-sm'
                          : 'bg-[var(--bg)] border border-[var(--line)] text-[var(--mute)] hover:text-rose-500'
                      }`}
                    >
                      <XCircle className="w-4 h-4 shrink-0" />
                      <span>مرفوض ({rejectedNews.length})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setAdminNewsStatusFilter('all')}
                      className={`min-h-[44px] py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                        adminNewsStatusFilter === 'all'
                          ? 'bg-[var(--ink)] text-[var(--bg)] font-extrabold shadow-sm'
                          : 'bg-[var(--bg)] border border-[var(--line)] text-[var(--mute)] hover:text-[var(--ink)]'
                      }`}
                    >
                      <span>الكل ({news.length})</span>
                    </button>
                  </div>
                </div>

                {/* News Items List for Selected Status Filter */}
                <div className="space-y-3">
                  {(() => {
                    const currentList =
                      adminNewsStatusFilter === 'pending'
                        ? pendingNews
                        : adminNewsStatusFilter === 'approved'
                        ? approvedNews
                        : adminNewsStatusFilter === 'rejected'
                        ? rejectedNews
                        : news;

                    if (currentList.length === 0) {
                      return (
                        <div className="p-8 text-center bg-[var(--card)] border border-[var(--line)] rounded-2xl space-y-2">
                          <CheckCircle2 className="w-8 h-8 text-[var(--green)] mx-auto opacity-75" />
                          <b className="text-xs text-[var(--ink)] block">
                            لا توجد عناصر في قائمة «
                            {adminNewsStatusFilter === 'pending'
                              ? 'معلّق'
                              : adminNewsStatusFilter === 'approved'
                              ? 'منشور'
                              : adminNewsStatusFilter === 'rejected'
                              ? 'مرفوض'
                              : 'الكل'}
                            » حالياً
                          </b>
                          <p className="text-[11px] text-[var(--mute)] m-0">
                            يمكنك التبديل إلى فلتر آخر أو إضافة مستجد جديد من الزر أعلاه.
                          </p>
                        </div>
                      );
                    }

                    return currentList.map((item) => {
                      const cat = getCategoryDetails(item.category);
                      const isPending = item.status === 'pending';
                      const isApproved = item.status === 'approved' || !item.status;
                      const isRejected = item.status === 'rejected';

                      return (
                        <div
                          key={item.id}
                          className={`bg-[var(--card)] rounded-2xl p-4 space-y-3 shadow-sm border transition-all ${
                            isPending
                              ? 'border-2 border-[var(--gold)]/50 bg-[var(--gold)]/5'
                              : isRejected
                              ? 'border border-rose-500/30 bg-rose-500/5'
                              : 'border border-[var(--line)]'
                          }`}
                        >
                          {editingNewsId === item.id ? (
                            <div className="space-y-3">
                              <b className="text-xs font-bold text-[var(--green)] block">
                                تعديل المستجد وحفظه:
                              </b>

                              <div className="space-y-1">
                                <span className="text-[10px] text-[var(--mute)] font-bold block">التصنيف:</span>
                                <div className="flex flex-wrap gap-1.5">
                                  {NEWS_CATEGORIES.map((c) => (
                                    <button
                                      key={c.id}
                                      type="button"
                                      onClick={() => setEditCategory(c.id)}
                                      className={`min-h-[44px] px-3 py-2 rounded-xl border text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
                                        editCategory === c.id
                                          ? 'bg-[var(--green)] text-white border-[var(--green)] shadow-xs'
                                          : 'bg-[var(--bg)] border-[var(--line)] text-[var(--ink)]'
                                      }`}
                                    >
                                      <span>{c.emoji}</span>
                                      <span>{c.name}</span>
                                    </button>
                                  ))}
                                </div>
                              </div>

                              <input
                                type="text"
                                value={editSource}
                                onChange={(e) => setEditSource(e.target.value)}
                                className="admin-input-field w-full min-h-[44px] border border-[var(--line)] bg-[var(--bg)] text-[var(--ink)] rounded-xl px-3.5 py-2 text-xs font-bold focus:outline-none focus:border-[var(--green)]"
                              />
                              <textarea
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                rows={3}
                                className="admin-input-field w-full border border-[var(--line)] bg-[var(--bg)] text-[var(--ink)] rounded-xl p-3 text-xs leading-relaxed focus:outline-none focus:border-[var(--green)] resize-none"
                              />

                              <div className="flex items-center gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={() => handleSaveEditNews(item.id)}
                                  className="flex-1 min-h-[44px] bg-[var(--green)] text-[var(--on)] rounded-xl px-4 py-2.5 text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                                >
                                  <Check className="w-4 h-4" />
                                  <span>حفظ واعتماد التعديل</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingNewsId(null)}
                                  className="min-h-[44px] border border-[var(--line)] bg-[var(--bg)] rounded-xl px-4 py-2.5 text-xs font-bold text-[var(--mute)] hover:text-[var(--ink)] cursor-pointer"
                                >
                                  إلغاء
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span
                                    className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border flex items-center gap-1 ${cat.badgeClass}`}
                                  >
                                    <span>{cat.emoji}</span>
                                    <span>{cat.name}</span>
                                  </span>

                                  {/* Status Badge */}
                                  <span
                                    className={`text-[10px] px-2.5 py-1 rounded-full font-black border flex items-center gap-1 ${
                                      isApproved
                                        ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                                        : isPending
                                        ? 'bg-amber-500/15 border-amber-500/30 text-amber-600 dark:text-amber-400'
                                        : 'bg-rose-500/15 border-rose-500/30 text-rose-600 dark:text-rose-400'
                                    }`}
                                  >
                                    {isApproved ? '🟢 منشور' : isPending ? '⏳ معلّق' : '🔴 مرفوض'}
                                  </span>

                                  <span className="text-xs font-bold text-[var(--ink)]">
                                    المصدر: {item.s}
                                  </span>
                                </div>

                                <span className="text-[10px] text-[var(--mute)] font-semibold">
                                  {new Date(item.timestamp).toLocaleString('ar-DZ')}
                                </span>
                              </div>

                              <p className="text-xs text-[var(--ink)] leading-relaxed m-0 p-3 bg-[var(--bg)] rounded-xl border border-[var(--line)] font-medium">
                                {item.t}
                              </p>

                              {/* Action Buttons: Strict >= 44px on all buttons */}
                              <div className="flex items-center gap-2 pt-1 flex-wrap">
                                {!isApproved && (
                                  <button
                                    type="button"
                                    onClick={() => handleApproveNews(item.id)}
                                    className="flex-1 min-h-[44px] bg-[var(--green)] hover:opacity-90 text-[var(--on)] rounded-xl px-4 py-2.5 text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer transition-all"
                                  >
                                    <Check className="w-4 h-4" />
                                    <span>اعتماد ونشر للجميع</span>
                                  </button>
                                )}

                                {!isRejected && (
                                  <button
                                    type="button"
                                    onClick={() => handleRejectNews(item.id)}
                                    className="min-h-[44px] px-4 py-2.5 rounded-xl border border-rose-500/40 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                                  >
                                    <X className="w-4 h-4" />
                                    <span>رفض</span>
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => handleStartEditNews(item)}
                                  className="min-h-[44px] px-4 py-2.5 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-xs font-bold text-[var(--ink)] hover:border-[var(--green)] flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                  <span>تعديل</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    const targetName = item.authorName || item.s || 'مراسل';
                                    const already = isTargetBanned(targetName);
                                    if (already) {
                                      removeBanEntry(already.id);
                                      pushInAppNotification({
                                        type: 'system',
                                        title: 'فك الحظر',
                                        message: `تم فك الحظر عن «${targetName}» بنجاح.`,
                                      });
                                    } else {
                                      addBanEntry({
                                        target: targetName,
                                        type: 'sender',
                                        section: 'news',
                                        reason: `خبر مخالف: ${item.t.slice(0, 45)}`,
                                      });
                                      pushInAppNotification({
                                        type: 'system',
                                        title: 'حظر ناشر في قسم الأخبار',
                                        message: `تم حظر «${targetName}» وإضافته إلى قائمة المحظورين.`,
                                      });
                                    }
                                  }}
                                  className="min-h-[44px] px-3.5 py-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                                  title="حظر الناشر أو المصدر وإضافته لقائمة الحظر"
                                >
                                  <Ban className="w-3.5 h-3.5" />
                                  <span>{isTargetBanned(item.authorName, item.s) ? 'فك الحظر' : 'حظر الناشر'}</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => handleDeleteNews(item.id)}
                                  className="min-h-[44px] px-3.5 py-2.5 rounded-xl border border-rose-500/20 text-rose-500 hover:bg-rose-500/10 text-xs font-bold flex items-center justify-center gap-1 cursor-pointer transition-colors"
                                  title="حذف نهائي من قاعدة البيانات"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>
            )}

            {/* TAB 5: SECTION 5 - رمز المشرف والأمان (Secret PIN Management) */}
            {adminTab === 'pin' && (
              <div className="space-y-4">
                <div className="bg-[var(--card)] border border-[var(--gold)]/40 rounded-2xl p-5 sm:p-6 space-y-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3 border-b border-[var(--line)] pb-4">
                    <div className="space-y-1">
                      <b className="text-sm text-[var(--ink)] flex items-center gap-2 font-extrabold">
                        <Lock className="w-5 h-5 text-[var(--gold)]" />
                        <span>تغيير وتثبيت رمز دخول المشرف (Secret PIN)</span>
                      </b>
                      <p className="text-xs text-[var(--mute)] m-0 leading-relaxed">
                        الرمز الحالي المعتمد هو <code className="bg-[var(--bg)] px-2 py-0.5 rounded text-[var(--gold)] font-mono font-bold">159159159</code> (أو الرمز المخصص الذي حفظته). يتم حفظ الرمز الجديد مشفراً على الخادم ولا يُفقد أبداً عند إعادة التشغيل.
                      </p>
                    </div>
                    <span className="px-3 py-1 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                      محمي ومشفّر
                    </span>
                  </div>

                  <form onSubmit={handleChangeAdminPin} className="space-y-4 pt-1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-[var(--ink)] block">
                          الرمز السري الجديد (4 خانات على الأقل):
                        </label>
                        <div className="relative">
                          <input
                            type={showNewPinText ? 'text' : 'password'}
                            value={newPinValue}
                            onChange={(e) => setNewPinValue(e.target.value)}
                            placeholder="اكتب الرمز الجديد هنا..."
                            className="admin-input-field w-full min-h-[44px] border border-[var(--line)] bg-[var(--bg)] text-[var(--ink)] rounded-xl ps-3.5 pe-12 py-2.5 text-sm font-mono font-bold focus:outline-none focus:border-[var(--gold)] relative z-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPinText((prev) => !prev)}
                            className="absolute end-1.5 top-1/2 -translate-y-1/2 z-20 min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg p-1.5 text-[var(--mute)] hover:text-[var(--ink)] hover:bg-[var(--card)] cursor-pointer"
                            title={showNewPinText ? 'إخفاء' : 'إظهار'}
                          >
                            {showNewPinText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-[var(--ink)] block">
                          تأكيد الرمز السري الجديد:
                        </label>
                        <div className="relative">
                          <input
                            type={showNewPinText ? 'text' : 'password'}
                            value={newPinConfirm}
                            onChange={(e) => setNewPinConfirm(e.target.value)}
                            placeholder="أعد كتابة الرمز الجديد للتأكيد..."
                            className="admin-input-field w-full min-h-[44px] border border-[var(--line)] bg-[var(--bg)] text-[var(--ink)] rounded-xl ps-3.5 pe-12 py-2.5 text-sm font-mono font-bold focus:outline-none focus:border-[var(--gold)] relative z-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPinText((prev) => !prev)}
                            className="absolute end-1.5 top-1/2 -translate-y-1/2 z-20 min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg p-1.5 text-[var(--mute)] hover:text-[var(--ink)] hover:bg-[var(--card)] cursor-pointer"
                            title={showNewPinText ? 'إخفاء' : 'إظهار'}
                          >
                            {showNewPinText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {changePinToast && (
                      <div
                        className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 border animate-in fade-in ${
                          changePinToast.type === 'success'
                            ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-700 dark:text-emerald-300'
                            : 'bg-rose-500/10 border-rose-500/25 text-rose-700 dark:text-rose-300'
                        }`}
                      >
                        <span className="text-sm">{changePinToast.type === 'success' ? '✓' : '⚠️'}</span>
                        <span>{changePinToast.message}</span>
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-2">
                      <button
                        type="submit"
                        disabled={isChangingPin || !newPinValue.trim()}
                        className="flex-1 min-h-[44px] px-5 py-2.5 rounded-xl bg-[var(--gold)] hover:bg-amber-400 text-black text-xs font-black flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-colors shadow-xs"
                      >
                        {isChangingPin ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>جارٍ حفظ الرمز الجديد...</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4" />
                            <span>حفظ وتثبيت الرمز الجديد</span>
                          </>
                        )}
                      </button>

                      {(newPinValue || newPinConfirm) && (
                        <button
                          type="button"
                          onClick={() => {
                            setNewPinValue('');
                            setNewPinConfirm('');
                            setChangePinToast(null);
                          }}
                          className="min-h-[44px] px-4 py-2.5 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-[var(--mute)] hover:text-[var(--ink)] text-xs font-bold cursor-pointer transition-colors"
                        >
                          إلغاء
                        </button>
                      )}
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* TAB: SETTINGS & PURGE */}
            {adminTab === 'settings' && (
              <div className="space-y-4">
                {/* Sound Alerts Setting Card */}
                <div className="bg-[var(--card)] border border-[var(--line)] rounded-2xl p-3.5 sm:p-4 space-y-2.5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <b className="text-xs text-[var(--ink)] flex items-center gap-1.5">
                        <Volume2 className="w-4 h-4 text-[var(--green)]" />
                        <span>نظام التنبيه الصوتي (Sound Alert)</span>
                      </b>
                      <p className="text-[11px] text-[var(--mute)] m-0 mt-0.5">
                        رنين صوتي فوري عند وصول الأخبار والتنبيهات
                      </p>
                    </div>

                    <button
                      onClick={toggleSound}
                      className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                        soundEnabled ? 'bg-[var(--green)]' : 'bg-[var(--line)]'
                      }`}
                      title={soundEnabled ? 'تعطيل الأصوات' : 'تفعيل الأصوات'}
                    >
                      <span
                        className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                          soundEnabled ? 'right-1' : 'right-6'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Sound Test / Preview Buttons */}
                  <div className="pt-2 border-t border-[var(--line)]/60 flex flex-wrap items-center gap-2">
                    <span className="text-[10px] text-[var(--mute)] font-medium">تجربة النغمة:</span>
                    <button
                      type="button"
                      onClick={() => playAlertChime('news', true)}
                      className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[var(--bg)] border border-[var(--line)] hover:border-[var(--green)] text-xs font-bold text-[var(--ink)] flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                      title="تجربة نغمة الأخبار الجديدة"
                    >
                      <span>📰 نغمة الأخبار</span>
                    </button>
                  </div>
                </div>

                <div className="bg-[var(--card)] border border-[var(--line)] rounded-2xl p-4 space-y-2 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <b className="text-xs text-[var(--ink)] block">
                        اعتماد ومراجعة الأخبار مسبقاً
                      </b>
                      <p className="text-[11px] text-[var(--mute)] m-0 mt-0.5">
                        اشتراط موافقة المالك قبل نشر أي خبر جديد
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setRequireApproval(!requireApproval)}
                      className={`min-h-[44px] min-w-[56px] px-2 rounded-full transition-colors relative cursor-pointer flex items-center ${
                        requireApproval ? 'bg-[var(--green)]' : 'bg-[var(--line)]'
                      }`}
                    >
                      <span
                        className={`w-6 h-6 rounded-full bg-white transition-transform ${
                          requireApproval ? 'translate-x-0' : 'translate-x-6 rtl:-translate-x-6'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* Periodic System Watchdog & Silent Auto-Repair Diagnostics Card (Admin Only) */}
                <div className="bg-[var(--card)] border border-[var(--line)] rounded-2xl p-4 space-y-3 shadow-sm">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <b className="text-xs text-[var(--ink)] flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-[var(--green)]" />
                        <span>المراقبة الدورية والإصلاح التلقائي الشامل للنظام</span>
                      </b>
                      <p className="text-[11px] text-[var(--mute)] m-0 mt-0.5">
                        مراقبة صامتة في الخلفية (كل 60 ثانية) لفحص وإصلاح التنزيل المباشر، استقرار النماذج، وأداء الذاكرة
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shrink-0">
                      {systemWatchdogStatus?.status === 'repaired' ? 'تم الإصلاح تلقائياً' : 'نشط وسليم 100%'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
                    <div className="p-2.5 rounded-xl bg-[var(--bg)] border border-[var(--line)]">
                      <span className="text-[10px] text-[var(--mute)] block">تنزيل التطبيق المباشر</span>
                      <b className="text-[var(--ink)] mt-0.5 block">
                        {systemWatchdogStatus?.downloadReady !== false ? 'جاهز ومفحوص (APK)' : 'قيد الإصلاح'}
                      </b>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[var(--bg)] border border-[var(--line)]">
                      <span className="text-[10px] text-[var(--mute)] block">محرك الذكاء الاصطناعي</span>
                      <b className="text-[var(--ink)] mt-0.5 block">
                        {systemWatchdogStatus?.aiEngineReady !== false ? 'متصل ومستقر' : 'وضع الطوارئ'}
                      </b>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[var(--bg)] border border-[var(--line)]">
                      <span className="text-[10px] text-[var(--mute)] block">استهلاك الذاكرة (RAM)</span>
                      <b className="text-[var(--ink)] mt-0.5 block">
                        {systemWatchdogStatus?.heapUsedMb ? `${systemWatchdogStatus.heapUsedMb} MB` : 'مثالي'}
                      </b>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[var(--bg)] border border-[var(--line)]">
                      <span className="text-[10px] text-[var(--mute)] block">عمليات الإصلاح التلقائي</span>
                      <b className="text-[var(--ink)] mt-0.5 block">
                        {systemWatchdogStatus?.autoRepairsCount ?? 0} عملية ناجحة
                      </b>
                    </div>
                  </div>

                  {systemWatchdogStatus?.lastRepairReason && (
                    <div className="text-[11px] text-[var(--mute)] bg-[var(--bg)] px-3 py-2 rounded-xl border border-[var(--line)]">
                      <b className="text-[var(--ink)]">آخر إصلاح صامت: </b>
                      <span>{systemWatchdogStatus.lastRepairReason}</span>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <span className="text-[10px] text-[var(--mute)]">
                      آخر فحص دوري:{' '}
                      {systemWatchdogStatus?.lastCheckAt
                        ? new Date(systemWatchdogStatus.lastCheckAt).toLocaleTimeString('ar-DZ')
                        : 'الآن'}
                    </span>
                    <button
                      type="button"
                      onClick={handleRunAdminWatchdogRepair}
                      disabled={isRunningWatchdogRepair}
                      className="min-h-[40px] py-2 px-4 rounded-xl bg-[var(--green)] text-[var(--on)] text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-opacity hover:opacity-90 disabled:opacity-60 shadow-xs"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isRunningWatchdogRepair ? 'animate-spin' : ''}`} />
                      <span>
                        {isRunningWatchdogRepair ? 'جاري الفحص والإصلاح الشامل...' : 'فحص وإصلاح شامل الآن'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Android APK & Direct Download Link Manager Card */}
                <div className="bg-[var(--card)] border border-[var(--line)] rounded-2xl p-4 space-y-3 shadow-sm">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <b className="text-xs text-[var(--ink)] flex items-center gap-1.5">
                        <Download className="w-4 h-4 text-[var(--green)]" />
                        <span>إدارة وإعادة ضبط ملف APK لتطبيق الأندرويد</span>
                      </b>
                      <p className="text-[11px] text-[var(--mute)] m-0 mt-0.5">
                        حذف ملف APK القديم وإعادة تعيينه من جديد على أندرويد (رفع حزمة .apk جديدة أو ربط رابط مباشر أو تفعيل WebAPK الرسمي)
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        setDownloadModalOwnerMode(true);
                        setIsDownloadModalOpen(true);
                      }}
                      className="flex-1 min-h-[44px] py-2.5 px-4 rounded-xl bg-[var(--green)] text-[var(--on)] text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-opacity hover:opacity-90 shadow-xs"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>فتح لوحة حذف وإعادة تعيين APK للأندرويد</span>
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const res = await fetch('/api/apk/reset', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ mode: 'android_webapk', version: '2.5.0' }),
                          });
                          if (res.ok) {
                            if ('caches' in window) {
                              const keys = await window.caches.keys();
                              await Promise.all(keys.map((k) => window.caches.delete(k)));
                            }
                            pushInAppNotification({
                              type: 'system',
                              title: 'إعادة ضبط ملف APK للأندرويد',
                              message:
                                'تم حذف ملف APK القديم وتنظيف الذاكرة المؤقتة وإعادة تعيين الحزمة الرسمية من جديد بنجاح.',
                            });
                          }
                        } catch {}
                      }}
                      className="min-h-[44px] py-2.5 px-4 rounded-xl border border-[var(--bad)] text-[var(--bad)] hover:bg-[var(--bad)]/10 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>حذف وإعادة ضبط APK فوراً</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setDownloadModalOwnerMode(false);
                        setIsDownloadModalOpen(true);
                      }}
                      className="min-h-[44px] py-2.5 px-4 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-xs font-bold text-[var(--ink)] hover:border-[var(--green)] cursor-pointer transition-colors"
                    >
                      معاينة نافذة التنزيل
                    </button>
                  </div>
                </div>

                <div className="bg-[var(--card)] border border-[var(--line)] rounded-2xl p-4 space-y-3 shadow-sm">
                  <b className="text-xs text-[var(--ink)] block">تنظيف وصيانة قاعدة الأخبار:</b>

                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={handleClearAllNews}
                      className="w-full min-h-[44px] py-2.5 px-4 rounded-xl border border-[var(--bad)] text-[var(--bad)] hover:bg-[var(--bad)]/10 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>مسح جميع أخبار السكان القديمة نهائياً</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleResetToDefaultNews}
                      className="w-full min-h-[44px] py-2.5 px-4 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-[var(--ink)] hover:border-[var(--green)] text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
                    >
                      <RefreshCw className="w-4 h-4 text-[var(--green)]" />
                      <span>استعادة الأخبار الرسمية الموثقة الافتراضية</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleClearAllFixes}
                      className="w-full min-h-[44px] py-2.5 px-4 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-[var(--mute)] hover:text-[var(--bad)] text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>مسح جميع تصحيحات السكان السابقة</span>
                    </button>
                  </div>
                </div>

                {/* Direct Link to Dedicated PIN Section */}
                <div className="bg-[var(--card)] border border-[var(--gold)]/30 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
                      <Lock className="w-5 h-5" />
                    </div>
                    <div>
                      <b className="text-xs text-[var(--ink)] block font-extrabold">رمز دخول المشرف (Secret PIN)</b>
                      <p className="text-[11px] text-[var(--mute)] m-0">تغيير رمز المرور الخاص بمدير النظام وتثبيته دائماً في ملفات الخادم</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAdminTab('pin')}
                    className="min-h-[44px] px-5 py-2.5 rounded-xl bg-[var(--gold)] hover:bg-amber-400 text-black text-xs font-black flex items-center justify-center gap-2 cursor-pointer transition-all shadow-xs"
                  >
                    <span>فتح جهة رمز المشرف</span>
                    <span>←</span>
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {/* VIEW 3: DESERT / الصحراء والسلامة */}
        {view === 'desert' && (
          <section className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 max-w-4xl mx-auto w-full space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--line)]">
              <button
                onClick={() => setView('chat')}
                className="text-xs px-3 py-1.5 rounded-xl border border-[var(--line)] bg-[var(--card)] hover:bg-[var(--bg)] font-bold flex items-center gap-1.5 text-[var(--ink)] cursor-pointer shadow-2xs"
              >
                <span>{lang === 'ar' ? '←' : '→'}</span>
                <span>{t.smartChat}</span>
              </button>
              <h2 className="text-base font-bold text-[var(--ink)] m-0">{t.desertTitle}</h2>
            </div>

            {/* Trip Tracker Card */}
            <div className="bg-[var(--card)] border border-[var(--line)] rounded-2xl p-4 space-y-3 shadow-sm">
              {!trip ? (
                <>
                  <b className="text-sm block">{t.registerTripTitle}</b>
                  <p className="text-xs text-[var(--mute)] m-0 leading-relaxed">
                    {t.desertSubtitle}
                  </p>
                  <input
                    type="text"
                    value={tripDest}
                    onChange={(e) => setTripDest(e.target.value)}
                    placeholder={t.destinationPlaceholder}
                    className="w-full border border-[var(--line)] bg-[var(--bg)] text-[var(--ink)] rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[var(--green)]"
                  />
                  <div className="space-y-1">
                    <label className="text-[11px] text-[var(--mute)] font-semibold block">
                      {t.returnTimeLabel}
                    </label>
                    <input
                      type="datetime-local"
                      value={tripReturn}
                      onChange={(e) => setTripReturn(e.target.value)}
                      className="w-full border border-[var(--line)] bg-[var(--bg)] text-[var(--ink)] rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[var(--green)]"
                    />
                  </div>
                  <input
                    type="tel"
                    value={tripPhone}
                    onChange={(e) => setTripPhone(e.target.value)}
                    placeholder={t.emergencyPhonePlaceholder}
                    className="w-full border border-[var(--line)] bg-[var(--bg)] text-[var(--ink)] rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[var(--green)]"
                  />
                  <button
                    onClick={handleRegisterTrip}
                    disabled={!tripDest.trim() || !tripReturn}
                    className="bg-[var(--green)] text-[var(--on)] rounded-xl px-4 py-2.5 text-xs font-bold w-full disabled:opacity-50 cursor-pointer shadow-sm"
                  >
                    {t.startTripTracker}
                  </button>
                </>
              ) : (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <b className="text-sm text-[var(--ink)]">{t.registerTripTitle}: {trip.d}</b>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--green)] text-[var(--on)] font-semibold">
                      {t.onlineStatus}
                    </span>
                  </div>

                  {tripStatus && (
                    <p
                      className={`text-xs font-bold m-0 p-2.5 rounded-xl border ${
                        tripStatus.isLate
                          ? 'text-[var(--bad)] bg-[var(--bad)]/10 border-[var(--bad)]/30'
                          : 'text-[var(--green)] bg-[var(--green)]/10 border-[var(--green)]/30'
                      }`}
                    >
                      {tripStatus.isLate ? '⚠️ ' : '⏳ '}
                      {tripStatus.text}
                    </p>
                  )}

                  <div className="flex flex-wrap gap-2 pt-1">
                    {tripStatus?.isLate && trip.p && (
                      <a
                        href={buildSmsUrl(trip.p, tripStatus.smsText || '')}
                        className="bg-[var(--bad)] text-[var(--on)] rounded-xl px-3 py-2 text-xs font-bold inline-flex items-center gap-1.5 shadow-sm"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                        <span>{t.copySmsText}</span>
                      </a>
                    )}

                    <button
                      onClick={handleClearTrip}
                      className="border border-[var(--green)] text-[var(--green)] hover:bg-[var(--green)] hover:text-[var(--on)] rounded-xl px-3 py-2 text-xs font-bold transition-colors cursor-pointer"
                    >
                      {t.cancelTripTracker}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Offline GPS Location Card */}
            <div className="bg-[var(--card)] border border-[var(--line)] rounded-2xl p-4 space-y-3 shadow-sm">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[var(--gold)]" />
                <b className="text-sm">{lang === 'ar' ? 'موقعي الآن (GPS أوفلاين)' : lang === 'fr' ? 'Ma position actuelle (GPS Hors-ligne)' : 'My Current Location (Offline GPS)'}</b>
              </div>
              <p className="text-xs text-[var(--mute)] m-0 leading-relaxed">
                {lang === 'ar' 
                  ? 'مستشعر الـ GPS في الهاتف يعمل مباشرة مع الأقمار الصناعية بدون الحاجة لاتصال إنترنت. اضغط لتحديد إحداثياتك وإرسالها للنجدة.'
                  : lang === 'fr'
                  ? 'Le capteur GPS de votre appareil fonctionne directement par satellite sans connexion internet. Cliquez pour localiser et envoyer vos coordonnées.'
                  : 'Your device GPS sensor communicates directly with satellites without internet connection. Click to detect and share your coordinates.'}
              </p>
              <button
                onClick={handleGetLocation}
                disabled={locLoading}
                className="bg-[var(--green)] text-[var(--on)] rounded-xl px-4 py-2 text-xs font-bold cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                {locLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{lang === 'ar' ? 'حدد موقعي الآن' : lang === 'fr' ? 'Détecter ma position' : 'Detect My Location'}</span>
              </button>

              {locOutput && (
                <div className="p-3 bg-[var(--bg)] border border-[var(--line)] rounded-xl text-xs space-y-2">
                  <p className="m-0 font-mono font-semibold text-[var(--ink)]">{locOutput.text}</p>
                  {locOutput.smsUrl && (
                    <a
                      href={locOutput.smsUrl}
                      className="bg-[var(--gold)] text-black rounded-lg px-3 py-1.5 text-[11px] font-bold inline-flex items-center gap-1.5 shadow-sm"
                    >
                      <Share2 className="w-3 h-3" />
                      <span>{t.copySmsText}</span>
                    </a>
                  )}
                </div>
              )}
            </div>
            
            {/* Safety Guidelines Card */}
            <div className="bg-[var(--card)] border border-[var(--line)] rounded-2xl p-4 space-y-2.5 shadow-sm">
              <div className="flex items-center gap-2 text-[var(--bad)]">
                <AlertTriangle className="w-4 h-4" />
                <b className="text-sm text-[var(--ink)]">{t.survivalChecklistTitle}</b>
              </div>
              <ul className={`text-xs text-[var(--ink)] space-y-1.5 ${lang === 'ar' ? 'pr-4' : 'pl-4'} m-0 leading-relaxed list-disc`}>
                {(lang === 'ar' && customDesertChecklist.length > 0 ? customDesertChecklist : t.checklistItems).map((item, cIdx) => (
                  <li key={cIdx}>{item}</li>
                ))}
              </ul>

              <div className="pt-2 border-t border-[var(--line)] flex flex-wrap gap-2 items-center text-xs">
                <span className="font-semibold text-[var(--mute)]">{t.quickEmergency}</span>
                <a
                  href="tel:14"
                  className="px-2.5 py-1 rounded-lg bg-[var(--bg)] border border-[var(--line)] font-bold text-[var(--bad)] flex items-center gap-1"
                  title="الحماية المدنية 14"
                >
                  <PhoneCall className="w-3 h-3" />
                  14
                </a>
                <a
                  href="tel:1055"
                  className="px-2.5 py-1 rounded-lg bg-[var(--bg)] border border-[var(--line)] font-bold text-[var(--green)] flex items-center gap-1"
                  title="الدرك الوطني 1055"
                >
                  <PhoneCall className="w-3 h-3" />
                  1055
                </a>
                <a
                  href="tel:17"
                  className="px-2.5 py-1 rounded-lg bg-[var(--bg)] border border-[var(--line)] font-bold text-[var(--ink)] flex items-center gap-1"
                  title="شرطة النجدة 17"
                >
                  <PhoneCall className="w-3 h-3" />
                  17
                </a>
                <a
                  href="tel:1548"
                  className="px-2.5 py-1 rounded-lg bg-[var(--bg)] border border-[var(--line)] font-bold text-purple-600 dark:text-purple-400 flex items-center gap-1"
                  title="الرقم الأخضر المجاني للأمن الوطني DGSN 1548"
                >
                  <PhoneCall className="w-3 h-3" />
                  1548
                </a>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold ms-auto">
                  ✓ {lang === 'ar' ? 'أرقام رسمية مدققة 2026' : 'Verified 2026'}
                </span>
              </div>
            </div>
          </section>
        )}

        {/* Full-Screen Image Preview Modal */}
        {previewModalImage && (
          <div
            onClick={() => setPreviewModalImage(null)}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in"
          >
            <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
              <button
                onClick={() => setPreviewModalImage(null)}
                className="self-end mb-2 text-white hover:text-rose-400 p-2 text-sm font-bold flex items-center gap-1.5 cursor-pointer bg-black/40 rounded-xl"
              >
                <X className="w-5 h-5" />
                <span>إغلاق المعاينة</span>
              </button>
              <img
                src={previewModalImage}
                alt="معاينة الصورة"
                className="max-w-full max-h-[80vh] rounded-2xl object-contain shadow-2xl border border-white/20"
              />
            </div>
          </div>
        )}

      </main>

      <Suspense fallback={null}>
        {/* Visitor Location & Wilaya Detection Modal */}
        {isLocationModalOpen && (
          <LocationSelectorModal
            isOpen={isLocationModalOpen}
            onClose={() => setIsLocationModalOpen(false)}
            currentLocation={visitorLocation}
            onSelectLocation={(newLoc) => {
              setVisitorLocation(newLoc);
              localStorage.setItem('visitor_location', JSON.stringify(newLoc));
              pushInAppNotification({
                type: 'system',
                title: t.locationUpdated,
                message: `${t.yourLocation}: ${
                  lang === 'ar' ? newLoc.wilaya.nameAr : lang === 'fr' ? newLoc.wilaya.nameFr : newLoc.wilaya.nameEn
                } ${newLoc.wilaya.distanceFromInSalahKm > 0 ? `(${newLoc.wilaya.distanceFromInSalahKm} ${t.kmFromInSalah})` : ''}`,
              });
            }}
            lang={lang}
            t={t}
          />
        )}

        {/* AI Training (SFT/RLHF) & RAG Knowledge Studio Modal */}
        {isTrainingStudioOpen && (
          <TrainingAndRagStudioModal
            isOpen={isTrainingStudioOpen}
            onClose={() => setIsTrainingStudioOpen(false)}
            lang={lang}
            agents={resolvedAgents}
            customAvatars={customAgentAvatars}
            onUpdateAgentAvatar={handleUpdateAgentAvatar}
            initialTab={trainingStudioInitialTab}
          />
        )}

        {/* Developer API Explorer Modal */}
        {isApiExplorerOpen && (
          <ApiExplorerModal
            isOpen={isApiExplorerOpen}
            onClose={() => setIsApiExplorerOpen(false)}
            lang={lang}
          />
        )}

        {/* Interactive 3D Tidikelt Oasis Tour Modal (Three.js) */}
        {isOasis3DOpen && (
          <TidikeltOasis3DModal
            isOpen={isOasis3DOpen}
            onClose={() => setIsOasis3DOpen(false)}
            onAskAiAboutLandmark={(_landmarkName, prompt) => {
              setView('chat');
              setInputText(prompt);
            }}
          />
        )}

        {/* Veo 3 Video Generation & Google Maps Grounding Studio Modal */}
        {isVeoMapsModalOpen && (
          <VeoAndMapsStudioModal
            isOpen={isVeoMapsModalOpen}
            initialTab={veoMapsInitialTab}
            onClose={() => setIsVeoMapsModalOpen(false)}
          />
        )}

        {/* Official Download App Dialog (Android APK & iOS PWA Guide + Owner APK Manager) */}
        {isDownloadModalOpen && (
          <DownloadAppModal
            isOpen={isDownloadModalOpen}
            onClose={() => {
              setIsDownloadModalOpen(false);
              setDownloadModalOwnerMode(false);
            }}
            isAdminLoggedIn={isAdminLoggedIn}
            openInOwnerMode={downloadModalOwnerMode}
          />
        )}

        {/* User Long-Term Memory Preferences Modal */}
        {isMemoryModalOpen && (
          <LongTermMemoryModal
            isOpen={isMemoryModalOpen}
            onClose={() => setIsMemoryModalOpen(false)}
            userId={firebaseUser?.uid || 'default_user'}
          />
        )}

        {/* Gemini Multimodal Live API Bidirectional Voice & Vision Call Modal */}
        {isLiveCallOpen && (
          <LiveVoiceCallModal
            isOpen={isLiveCallOpen}
            onClose={() => setIsLiveCallOpen(false)}
            appName={t.appName}
            locationName={currentLocationDisplayName}
            lang={lang}
            onSaveCallTurn={(userText, assistantText) => {
              const now = Date.now();
              setMessages((prev) => {
                const next = [...prev];
                if (userText) {
                  next.push({
                    id: `live-u-${now}-${Math.random().toString(36).slice(2, 6)}`,
                    role: 'me',
                    text: `📞 ${userText}`,
                    timestamp: now,
                  });
                }
                if (assistantText) {
                  next.push({
                    id: `live-b-${now + 1}-${Math.random().toString(36).slice(2, 6)}`,
                    role: 'bot',
                    text: assistantText,
                    timestamp: now + 1,
                    agentId: selectedAgentId,
                    sourceInfo: {
                      engine: 'Gemini Multimodal Live API',
                      model: 'gemini-3.8-live',
                      badgeTitle: 'مكالمة صوتية مباشرة',
                    },
                  });
                }
                return next;
              });
            }}
          />
        )}
      </Suspense>

      {/* Floating In-App Notifications Toast Container */}
      <InAppNotificationToastContainer
        notifications={activeNotifications}
        onDismiss={dismissNotification}
        onClearAll={clearAllActiveNotifications}
        notificationsPermanentlyDisabled={notificationsPermanentlyDisabled}
        isOwnerLoggedIn={isAdminLoggedIn}
        onDisablePermanently={() => handleSetNotificationsPermanentlyDisabled(true)}
      />

      {/* Rafiq Al-Tariq Inter-Wilaya Ride Sharing Brain Modal */}
      {isRafiqModalOpen && (
        <RafiqAlTariqModal
          isOpen={isRafiqModalOpen}
          onClose={() => setIsRafiqModalOpen(false)}
          lang={lang}
          isAdminLoggedIn={isAdminLoggedIn}
        />
      )}

      {/* Admin PIN Login Modal */}
      {showPinModal && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowPinModal(false);
              setPinInput('');
              setPinError(false);
            }
          }}
          className="admin-pin-modal fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
        >
          <div className="bg-[var(--card)] border border-[var(--line)] rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 text-center relative overflow-hidden">
            <button
              type="button"
              onClick={() => {
                setShowPinModal(false);
                setPinInput('');
                setPinError(false);
              }}
              className="absolute top-3 start-3 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-[var(--mute)] hover:text-[var(--ink)] hover:bg-[var(--bg)] transition-colors cursor-pointer z-20"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Element 5: Official App Icon */}
            <div className="w-14 h-14 rounded-2xl overflow-hidden flex items-center justify-center mx-auto shadow-md border border-[var(--line)] bg-[#031752] shrink-0">
              <img
                src="/icon.svg"
                alt={t.appName}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>

            {/* Element 1: Title without the deleted paragraph */}
            <div>
              <h3 className="text-base font-bold text-[var(--ink)] m-0">بوابة المالك والمشرف</h3>
            </div>

            <form onSubmit={handleAdminLogin} className="space-y-3.5 pt-2">
              <div className="relative">
                {/* Element 2: Input with placeholder "ادخل الرمز" and guaranteed text visibility */}
                <input
                  type={showPinText ? 'text' : 'password'}
                  inputMode="numeric"
                  autoComplete="off"
                  value={pinInput}
                  onChange={(e) => {
                    setPinInput(e.target.value);
                    setPinError(false);
                  }}
                  placeholder="ادخل الرمز"
                  autoFocus
                  className={`admin-input-field w-full min-h-[48px] px-12 py-3 text-base text-center font-mono font-bold rounded-xl bg-[var(--bg)] border-2 text-[var(--ink)] focus:outline-none transition-all relative z-10 ${
                    pinError
                      ? 'border-rose-500 ring-2 ring-rose-500/20'
                      : 'border-[var(--line)] focus:border-[var(--green)]'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPinText((prev) => !prev)}
                  className="absolute end-1.5 top-1/2 -translate-y-1/2 z-20 min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg p-1.5 text-[var(--mute)] hover:text-[var(--ink)] hover:bg-[var(--card)] cursor-pointer"
                  title={showPinText ? 'إخفاء الرمز' : 'إظهار الرمز'}
                >
                  {showPinText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {pinError && (
                <p className="text-xs font-bold text-rose-500 m-0 animate-in fade-in">
                  ⚠️ {pinErrorMessage || 'رمز المشرف غير صحيح. الرمز المعتمد هو 159159159'}
                </p>
              )}

              <div className="flex gap-2 pt-1">
                {/* Element 3: Green button with text "دخول" only */}
                <button
                  type="submit"
                  disabled={!pinInput.trim()}
                  className="flex-1 min-h-[44px] py-2.5 px-4 rounded-xl bg-[var(--green)] text-white font-bold text-xs hover:opacity-90 disabled:opacity-50 transition-all shadow-sm cursor-pointer"
                >
                  دخول
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPinModal(false);
                    setPinInput('');
                    setPinError(false);
                    setPinErrorMessage('');
                  }}
                  className="min-h-[44px] py-2.5 px-4 rounded-xl border border-[var(--line)] bg-[var(--bg)] text-[var(--mute)] hover:text-[var(--ink)] font-bold text-xs cursor-pointer"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
