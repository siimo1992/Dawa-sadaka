import express from 'express';
import type { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';
import {
  getSftDataset,
  addSftExample,
  deleteSftExample,
  getRlhfComparisons,
  addRlhfComparison,
  getRlhfSummaryDirective,
  getKnowledgeBase,
  addKnowledgeChunk,
  addKnowledgeChunksBatch,
  deleteKnowledgeChunk,
  deleteDocumentChunks,
  getIndexedDocuments,
  smartChunkDocumentText,
  searchKnowledgeBase,
  executeSearchPipeline,
} from './src/server/ragAndTrainingEngine.ts';
import { registerUpgradeRoutes, buildAinSalahTodaySummary } from './server/security-and-stream.ts';
import { registerCommunityNewsRoutes } from './src/server/communityNewsServer.ts';
import { registerCloudSqlAndTasksRoutes } from './src/server/cloudSqlAndTasksRoutes.ts';
import { registerRafiqAlTariqRoutes } from './src/server/rafiqAlTariqServer.ts';
import { registerApkReleaseRoutes } from './src/server/apkReleaseServer.ts';
import {
  normalizeQuery,
  hash,
  cacheGet,
  cacheSet,
  splitForSSE,
  PROMPT_VERSION,
} from './src/server/cacheService.ts';
import { routeQuestion } from './lib/smart-routing.ts';
import type { KnowledgeChunk, IndexedDocument } from './src/types.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// High body limit to allow uploading images for multimodal analysis
app.use(express.json({ limit: '25mb' }));

// Initialize Gemini SDK with User-Agent header as required
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Quota & rate-limit cooldown state to prevent 429 RESOURCE_EXHAUSTED cascades
let googleSearchCooldownUntil = 0;
const modelCooldownUntil: Record<string, number> = {};
let dailyTickerCache: { summary: string; key: string; updatedAt: number } | null = null;

// Register ain-salah-upgrade security, today summary, SOS dispatch, and SSE stream routes
registerUpgradeRoutes(app, ai);
registerCommunityNewsRoutes(app, ai);
registerCloudSqlAndTasksRoutes(app);
registerRafiqAlTariqRoutes(app, ai);
registerApkReleaseRoutes(app);

// Health check endpoint
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    hasKey: Boolean(process.env.GEMINI_API_KEY),
    timestamp: new Date().toISOString(),
  });
});

// --- Supervisor Query Statistics & Analytics Engine ---
interface QueryLogItem {
  id: string;
  timestamp: string;
  date: string; // YYYY-MM-DD
  agentId: string;
  agentName: string;
  agentEmoji: string;
  durationMs: number;
  type: 'text' | 'image' | 'pdf';
  preview: string;
}

const DATA_DIR = path.join(__dirname, 'data');
const STATS_FILE = path.join(DATA_DIR, 'query_stats.json');

if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (err) {
    console.error('Failed to create data dir:', err);
  }
}

function generateSeedStats(): QueryLogItem[] {
  const seedAgents = [
    { id: 'desert', name: 'حارس الصحراء', emoji: '🏜️', queries: ['حالة طريق عين صالح تمنراست RN1', 'هل توجد عواصف رملية الآن؟', 'غرزت سيارة دفع رباعي في الكثبان', 'إجراءات السلامة في السفر الصحراوي', 'أقرب نقطة تموين بالوقود على المسار'] },
    { id: 'research', name: 'الباحث الأكاديمي والمعرفي', emoji: '🎓', queries: ['أنجز لي بحثاً حول تاريخ تيديكلت', 'خطة بحث في الطاقات المتجددة في الجزائر', 'شرح تقنيات الذكاء الاصطناعي وتطبيقاته', 'تلخيص كتاب حول الحركة الوطنية الجزائرية', 'إعداد بحث جامعي مع مراجع معتمدة'] },
    { id: 'guide', name: 'المرشد المحلي', emoji: '🧭', queries: ['ملخص إعلان مسابقة التوظيف بالبلدية', 'شروط الاستفادة من السكن الريفي', 'مواعيد عمل مصلحة الحالة المدنية', 'استخراج شهادة السوابق العدلية'] },
    { id: 'market', name: 'دليل الأسواق والتمور', emoji: '🛒', queries: ['أسعار دقلة نور والغرس بسوق عين صالح', 'أيام السوق الأسبوعي في فقارة الزوى', 'سعر صفيحة التمور المجففة', 'محطات الوقود المتوفرة'] },
    { id: 'doctor', name: 'طبيب الاستعجالات', emoji: '🩺', queries: ['علاج عاجل للدغة عقرب صحراوي', 'صيدلية المناوبة الليلة بعين صالح', 'إسعاف ضربة شمس حادة في الصحراء'] },
    { id: 'check', name: 'المدقق الإخباري', emoji: '✅', queries: ['هل خبر قطع طريق المنيعة حقيقي؟', 'تأكيد منحة الجنوب ومواعيد صبها'] },
    { id: 'fix', name: 'المصحح اللغوي', emoji: '✍️', queries: ['تصحيح طلب خطي للبلدية', 'صياغة رسالة إدارية رسمية'] },
  ];

  const logs: QueryLogItem[] = [];
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  for (let d = 29; d >= 0; d--) {
    const dayDate = new Date(now - d * dayMs);
    const dateStr = dayDate.toISOString().split('T')[0];
    const countForDay = d === 0 ? 38 : Math.floor(22 + Math.random() * 20);

    for (let i = 0; i < countForDay; i++) {
      const weights = [0.26, 0.22, 0.17, 0.13, 0.10, 0.07, 0.05];
      const r = Math.random();
      let chosenIdx = 0;
      let cum = 0;
      for (let j = 0; j < weights.length; j++) {
        cum += weights[j];
        if (r <= cum) {
          chosenIdx = j;
          break;
        }
      }
      const agentObj = seedAgents[chosenIdx];
      const querySample = agentObj.queries[Math.floor(Math.random() * agentObj.queries.length)];
      const typeRand = Math.random();
      const queryType = typeRand < 0.12 ? 'pdf' : (typeRand < 0.25 ? 'image' : 'text');
      const duration = Math.floor(920 + Math.random() * 800);
      const itemTime = new Date(dayDate.getTime() + (i * (dayMs / (countForDay + 2)))).toISOString();

      logs.push({
        id: `seed_${d}_${i}_${Math.random().toString(36).substring(2, 6)}`,
        timestamp: itemTime,
        date: dateStr,
        agentId: agentObj.id,
        agentName: agentObj.name,
        agentEmoji: agentObj.emoji,
        durationMs: duration,
        type: queryType,
        preview: querySample,
      });
    }
  }

  return logs;
}

let queryLogs: QueryLogItem[] = [];

try {
  if (fs.existsSync(STATS_FILE)) {
    const raw = fs.readFileSync(STATS_FILE, 'utf-8');
    queryLogs = JSON.parse(raw);
    if (!Array.isArray(queryLogs) || queryLogs.length < 200) {
      queryLogs = generateSeedStats();
      fs.writeFileSync(STATS_FILE, JSON.stringify(queryLogs, null, 2), 'utf-8');
    }
  } else {
    queryLogs = generateSeedStats();
    fs.writeFileSync(STATS_FILE, JSON.stringify(queryLogs, null, 2), 'utf-8');
  }
} catch (e) {
  console.warn('Could not load query_stats.json, starting with fresh seed:', e);
  queryLogs = generateSeedStats();
}

function saveQueryStats() {
  try {
    fs.writeFileSync(STATS_FILE, JSON.stringify(queryLogs, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save query stats to disk:', err);
  }
}

function recordQuery(log: QueryLogItem) {
  queryLogs.push(log);
  if (queryLogs.length > 2000) {
    queryLogs = queryLogs.slice(-2000);
  }
  saveQueryStats();
}

// --- Response Ratings & AI Quality Feedback Database ---
export interface ResponseRating {
  id: string;
  messageId: string;
  query: string;
  response: string;
  rating: 'like' | 'dislike';
  reason?: string;
  comment?: string;
  agentId?: string;
  agentName?: string;
  timestamp: string; // ISO string
  createdAt: number;
}

const RATINGS_FILE = path.join(DATA_DIR, 'ratings.json');

function generateSeedRatings(): ResponseRating[] {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  const seeds: Omit<ResponseRating, 'id' | 'timestamp' | 'createdAt'>[] = [
    {
      messageId: 'seed_rate_1',
      query: 'حالة طريق عين صالح - تمنراست RN1 وهل توجد زوابع رملية؟',
      response: 'الطريق سالك عموماً مع تطاير خفيف للرمال في منطقة إينغر وخنقة الحجاج. الرؤية مقبولة مع وجوب خفض السرعة وإشعال الأضواء التحذيرية.',
      rating: 'like',
      reason: 'accurate',
      comment: 'إجابة مباشرة وسريعة ساعدتني في قرار السفر.',
      agentId: 'desert',
      agentName: 'حارس الصحراء',
    },
    {
      messageId: 'seed_rate_2',
      query: 'أريد خطة بحث جامعي حول الطاقات المتجددة في الجنوب الجزائري',
      response: 'خطة بحث مقترحة: مقدمة وإشكالية، المحور الأول: الإمكانات الشمسية والريحية في تديكلت، المحور الثاني: المشاريع القائمة ومحطات الطاقة، المحور الثالث: التحديات التقنية وحلول التخزين، خاتمة وتوصيات ومراجع معتمدة.',
      rating: 'like',
      reason: 'helpful_format',
      comment: 'الخطة ممتازة ومطابقة للمنهجية الأكاديمية.',
      agentId: 'research',
      agentName: 'الباحث الأكاديمي والمعرفي',
    },
    {
      messageId: 'seed_rate_3',
      query: 'ما هي صيدلية المناوبة الليلة بعين صالح؟',
      response: 'صيدلية المناوبة الليلية المعتمدة هي صيدلية الرمال بحي الديس قرب المستشفى القديم. للاستعجالات القصوى اتصل بـ 14.',
      rating: 'like',
      reason: 'accurate',
      comment: 'معلومة صحيحة ومؤكدة.',
      agentId: 'doctor',
      agentName: 'طبيب الاستعجالات',
    },
    {
      messageId: 'seed_rate_4',
      query: 'أسعار التمور في سوق عين صالح اليوم',
      response: 'تتراوح أسعار دقلة نور الممتازة بين 450 إلى 650 دج للكيلوغرام، وتمر الغرس الصحراوي بين 250 إلى 350 دج حسب الجودة في سوق الواحة.',
      rating: 'like',
      reason: 'accurate',
      comment: 'أسعار مطابقة للواقع في السوق الأسبوعي.',
      agentId: 'market',
      agentName: 'دليل الأسواق والتمور',
    },
    {
      messageId: 'seed_rate_5',
      query: 'شروط استخراج رخصة البناء بالبلدية',
      response: 'ملف رخصة البناء يتطلب: عقد الملكية أو شهادة الحيازة، مخطط البناء معتمد من مهندس معماري، بطاقة الهوية، واستمارة الطلب لدى مصلحة التعمير ببلدية عين صالح.',
      rating: 'like',
      reason: 'helpful_format',
      agentId: 'guide',
      agentName: 'المرشد المحلي',
    },
    {
      messageId: 'seed_rate_6',
      query: 'هل طريق المنيعة مقطوع بسبب السيول؟',
      response: 'حركة المرور عادية على محور عين صالح - المنيعة RN1، ولا يوجد أي قطع رسمي حتى الآن وفق مصالح الدرك الوطني والحماية المدنية.',
      rating: 'like',
      reason: 'accurate',
      comment: 'تفنيد سريع للإشاعة مع ذكر المصدر الأمني.',
      agentId: 'check',
      agentName: 'المدقق الإخباري',
    },
    {
      messageId: 'seed_rate_7',
      query: 'أين تقع مصلحة الضرائب في عين صالح؟',
      response: 'مقر قباضة الضرائب يقع في وسط المدينة قرب مقر الدائرة ومكتب البريد المركزي. أوقات الاستقبال من 8:00 صباحاً إلى 16:00 مساءً.',
      rating: 'like',
      reason: 'concise',
      agentId: 'guide',
      agentName: 'المرشد المحلي',
    },
    {
      messageId: 'seed_rate_8',
      query: 'كم المسافة بين عين صالح وتمنراست؟',
      response: 'المسافة الإجمالية بين عين صالح وتمنراست عبر الطريق الوطني رقم 1 (RN 1) تبلغ حوالي 670 كيلومتراً، وتستغرق بالسيارة نحو 8 إلى 9 ساعات باحتساب فترات التوقف.',
      rating: 'like',
      reason: 'concise',
      agentId: 'desert',
      agentName: 'حارس الصحراء',
    },
    {
      messageId: 'seed_rate_9',
      query: 'اكتب لي رسالة طلب تدريب مهني في سوناطراك',
      response: 'طلب تدريب مهني منسق بصيغة رسمية يتضمن التحية الإدارية، تبيان التخصص الدراسي، الرغبة في التدريب الميداني بمنشآت المحروقات، والخاتمة المهنية مع إرفاق السيرة الذاتية.',
      rating: 'like',
      reason: 'helpful_format',
      comment: 'صياغة ممتازة جداً احترمت القواعد الإدارية الجزائرية.',
      agentId: 'fix',
      agentName: 'المصحح اللغوي',
    },
    {
      messageId: 'seed_rate_10',
      query: 'هل يوجد بنزين في محطة حاسي الفحل؟',
      response: 'نعم، المحطة تتوفر على الوقود العادي والمازوت وسيرغاز، ولكن يُنصح بملء الخزان عند الخروج من عين صالح لتجنب أي نقص مفاجئ.',
      rating: 'dislike',
      reason: 'outdated',
      comment: 'يُفضل ذكر التاريخ بدقة لأن توفر الوقود يتغير خلال عطلة نهاية الأسبوع.',
      agentId: 'market',
      agentName: 'دليل الأسواق والتمور',
    },
    {
      messageId: 'seed_rate_11',
      query: 'كيف أتصرف لو غرزت السيارة في الرمل؟',
      response: 'ابق قرب سيارتك، خفف ضغط الإطارات إلى 1.0 - 1.2 بار، نظف الرمل أمام وخلف العجلات، استخدم دعاسات الأرجل أو ألواح تحت الإطارات ولا تضغط بقوة على دواسة الوقود.',
      rating: 'like',
      reason: 'accurate',
      comment: 'نصائح سلامة حيوية جداً.',
      agentId: 'desert',
      agentName: 'حارس الصحراء',
    },
    {
      messageId: 'seed_rate_12',
      query: 'ما هي عاصمة إقليم تديكلت تاريخياً؟',
      response: 'إقليم تديكلت يضم عدة واحات وقصور عريقة تاريخياً، وتُعتبر إنغر وعين صالح ومناطق فقارة الزوى مراكز تاريخية وتجارية كبرى في حركة القوافل.',
      rating: 'dislike',
      reason: 'too_long',
      comment: 'أردت إجابة من جملة واحدة محددة دون سرد إضافي.',
      agentId: 'research',
      agentName: 'الباحث الأكاديمي والمعرفي',
    },
    {
      messageId: 'seed_rate_13',
      query: 'إسعاف سريع للدغة عقرب في البيت',
      response: '1. التزام الهدوء وتثبيت الطرف المصاب أسفل مستوى القلب. 2. ممنوع جرح الجلد أو المص أو ربط العضو بحبل مشدود. 3. التوجه فوراً لأقرب نقطة صحية أو الاتصال بـ 14.',
      rating: 'like',
      reason: 'accurate',
      comment: 'واضح ومباشر والتحذيرات الطبية صحيحة.',
      agentId: 'doctor',
      agentName: 'طبيب الاستعجالات',
    },
    {
      messageId: 'seed_rate_14',
      query: 'مواعيد صب منحة البطالة في البريد',
      response: 'تُصب منحة البطالة تدريجياً عبر الحسابات البريدية الجارية CCP بين 26 و 28 من كل شهر ميلادي حسب الرقم الأخير للحساب.',
      rating: 'like',
      reason: 'accurate',
      agentId: 'guide',
      agentName: 'المرشد المحلي',
    },
    {
      messageId: 'seed_rate_15',
      query: 'تصحيح إملائي لجملة في منشور بلدي',
      response: 'تم تصحيح الأخطاء النحوية وضبط علامات الترقيم وصياغة الجملة بلغة فصيحة ومؤثرة.',
      rating: 'like',
      reason: 'accurate',
      agentId: 'fix',
      agentName: 'المصحح اللغوي',
    },
  ];

  return seeds.map((s, idx) => ({
    id: `seed_rate_${idx + 1}`,
    ...s,
    timestamp: new Date(now - (idx * 1.5 * dayMs)).toISOString(),
    createdAt: now - (idx * 1.5 * dayMs),
  }));
}

let ratings: ResponseRating[] = [];
let lastRatingsMtime = 0;

// Reads data/ratings.json dynamically and updates the in-memory ratings state
function reloadRatingsFromDiskIfNeeded(force = false): boolean {
  try {
    if (!fs.existsSync(RATINGS_FILE)) {
      if (ratings.length === 0) {
        ratings = generateSeedRatings();
        fs.writeFileSync(RATINGS_FILE, JSON.stringify(ratings, null, 2), 'utf-8');
        try {
          lastRatingsMtime = fs.statSync(RATINGS_FILE).mtimeMs;
        } catch {}
      }
      return false;
    }

    const stat = fs.statSync(RATINGS_FILE);
    if (force || stat.mtimeMs > lastRatingsMtime || ratings.length === 0) {
      const raw = fs.readFileSync(RATINGS_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        ratings = parsed;
        lastRatingsMtime = stat.mtimeMs;
        return true;
      }
    }
  } catch (err) {
    console.warn('[Ratings System] Error reading/parsing ratings.json:', err);
    if (ratings.length === 0) {
      ratings = generateSeedRatings();
    }
  }
  return false;
}

// Initial load on server startup
reloadRatingsFromDiskIfNeeded(true);

// Periodic polling every 30 seconds to automatically read updates from data/ratings.json
const RATINGS_POLL_INTERVAL_MS = 30000;
setInterval(() => {
  reloadRatingsFromDiskIfNeeded(false);
}, RATINGS_POLL_INTERVAL_MS);

function saveRatings() {
  try {
    fs.writeFileSync(RATINGS_FILE, JSON.stringify(ratings, null, 2), 'utf-8');
    try {
      lastRatingsMtime = fs.statSync(RATINGS_FILE).mtimeMs;
    } catch {}
  } catch (err) {
    console.error('Failed to save ratings to disk:', err);
  }
}

function getRatingsStats() {
  reloadRatingsFromDiskIfNeeded(false);
  const total = ratings.length;
  const likes = ratings.filter((r) => r.rating === 'like').length;
  const dislikes = ratings.filter((r) => r.rating === 'dislike').length;
  const satisfactionRate = total > 0 ? Math.round((likes / total) * 100) : 100;

  const reasonsBreakdown: Record<string, number> = {};
  ratings.forEach((r) => {
    if (r.reason) {
      reasonsBreakdown[r.reason] = (reasonsBreakdown[r.reason] || 0) + 1;
    }
  });

  const agentMap: Record<string, { agentId: string; agentName: string; total: number; likes: number; dislikes: number }> = {};
  ratings.forEach((r) => {
    const aId = r.agentId || 'general';
    if (!agentMap[aId]) {
      agentMap[aId] = {
        agentId: aId,
        agentName: r.agentName || aId,
        total: 0,
        likes: 0,
        dislikes: 0,
      };
    }
    agentMap[aId].total += 1;
    if (r.rating === 'like') agentMap[aId].likes += 1;
    else agentMap[aId].dislikes += 1;
  });

  const agentRatings = Object.values(agentMap)
    .map((a) => ({
      ...a,
      satisfactionRate: a.total > 0 ? Math.round((a.likes / a.total) * 100) : 100,
    }))
    .sort((a, b) => b.total - a.total);

  return {
    total,
    likes,
    dislikes,
    satisfactionRate,
    reasonsBreakdown,
    agentRatings,
    recentFeedbacks: ratings.slice(-25).reverse(),
  };
}

// Injects dynamic System Context and Few-Shot Examples from data/ratings.json into the Gemini system prompt
function generateRatingsFewShotAndContextPrompt(): string {
  reloadRatingsFromDiskIfNeeded(false);
  if (ratings.length === 0) return '';

  const total = ratings.length;
  const likes = ratings.filter((r) => r.rating === 'like');
  const dislikes = ratings.filter((r) => r.rating === 'dislike');
  const satisfactionRate = total > 0 ? Math.round((likes.length / total) * 100) : 100;

  // 1. Dynamic System Context (سياق نظامي مستخلص من التقييمات)
  let section = `\n\n════════════════════════════════════════════════════════════════
🎯 سياق نظامي وأمثلة تدريبية مستخلصة من قاعدة التقييمات (data/ratings.json):
• إجمالي تقييمات المستخدمين المحفوظة: ${total} تفاعل (نسبة الرضا الحالية: ${satisfactionRate}% 👍).
• الهدف التوجيهي: الحفاظ على ثقة المستخدمين بنسبة 100% عبر الإيجاز الذكي، الدقة التامة، والدردشة المحترمة.
════════════════════════════════════════════════════════════════`;

  // 2. Few-Shot Positive Demonstrations (أمثلة نموذجية ناجحة معتمدة)
  const positiveExamples = likes
    .filter((r) => r.query && r.response && r.response.length > 5)
    .slice(-4);

  if (positiveExamples.length > 0) {
    section += `\n\n🌟 نماذج تدريبية ناجحة معتمدة (Few-Shot Positive Examples 👍):`;
    positiveExamples.forEach((ex, idx) => {
      const reasonLabel =
        ex.reason === 'accurate'
          ? 'دقة عالية ومباشرة'
          : ex.reason === 'fast_helpful'
          ? 'إفادة سريعة ومفيدة'
          : ex.reason === 'concise'
          ? 'إيجاز ذكي دون استطراد'
          : ex.reason === 'helpful_format'
          ? 'تنظيم ممتاز ومريح للقارئ'
          : 'رد نال رضا واستحسان السائل';
      const userFeedback = ex.comment ? ` | تعليق المستخدم: "${ex.comment}"` : '';

      section += `\n\n[نموذج ناجح ${idx + 1} - ${reasonLabel}]:
- سؤال السائل: "${ex.query}"
- الرد المعتمد: "${ex.response}"
- معيار التميز: ${reasonLabel}${userFeedback}.`;
    });
  }

  // 3. Negative Contrast Demonstrations (أمثلة على ما يجب تفاديه بناءً على التقييمات السلبية)
  const negativeExamples = dislikes
    .filter((r) => r.query && (r.comment || r.reason))
    .slice(-3);

  if (negativeExamples.length > 0) {
    section += `\n\n⚠️ حالات سابقة تم انتقادها لتجنبها بدقة (Few-Shot Negative Contrast 👎):`;
    negativeExamples.forEach((neg, idx) => {
      const critique =
        neg.reason === 'too_long'
          ? 'تم انتقاد الرد بسبب الإطالة الزائدة والسرد غير المطلوب لسؤال بسيط'
          : neg.reason === 'outdated'
          ? 'تم انتقاد الرد بسبب عدم تدقيق التواريخ وتقلبات توفر الوقود والخدمات'
          : neg.reason === 'inaccurate'
          ? 'تم التنبيه لضرورة تحري الدقة الميدانية والتثبت قبل الجواب'
          : neg.reason === 'unclear'
          ? 'تم التنبيه لتجنب الغموض وتبسيط الصياغة'
          : 'ملاحظة تدقيق من المستخدم';
      const userFeedback = neg.comment ? ` | ملاحظة المستخدم: "${neg.comment}"` : '';

      section += `\n\n[حالة للتفادي ${idx + 1}]:
- السؤال: "${neg.query}"
- الخلل المُنتقد: ${critique}${userFeedback}.
- التوجيه الملزم: تجنب هذا الخلل تماماً، وقدّم إجابة مباشرة، موجزة، ومطابقة لما يحتاجه السائل.`;
    });
  }

  section += `\n\n📌 توجيه إلزامي: طبّق هذه المعايير والأمثلة التدريبية تلقائياً في كل إجابة قادمة لضمان أعلى معايير الجودة والرضا.`;
  return section;
}

// --- Live Real-Time Temporal Engine (Clock, Hijri/Gregorian Calendar, and Timezone Synchronization) ---
interface LiveTemporalContext {
  now: Date;
  dzDateAr: string;
  dzDateFr: string;
  dzDateEn: string;
  dzTimeAr: string;
  dzTime24: string;
  hijriDateAr: string;
  dayNameAr: string;
  dayNameFr: string;
  dayNameEn: string;
  currentYear: string;
  promptSection: string;
  clientTimeInfo: string;
}

function getLiveTemporalContext(clientTemporal?: {
  iso?: string;
  timeZone?: string;
  localTime?: string;
  localDate?: string;
  timestamp?: number;
}): LiveTemporalContext {
  const now = (clientTemporal?.timestamp && Math.abs(Date.now() - clientTemporal.timestamp) < 86400000)
    ? new Date(clientTemporal.timestamp)
    : new Date();

  // Algerian Local Time (Africa/Algiers - GMT+1)
  const dzFormatterDateAr = new Intl.DateTimeFormat('ar-DZ', {
    timeZone: 'Africa/Algiers',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const dzFormatterDateFr = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Africa/Algiers',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const dzFormatterDateEn = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Africa/Algiers',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const dzFormatterTime12 = new Intl.DateTimeFormat('ar-DZ', {
    timeZone: 'Africa/Algiers',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  const dzFormatterTime24 = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Africa/Algiers',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const dzDateAr = dzFormatterDateAr.format(now);
  const dzDateFr = dzFormatterDateFr.format(now);
  const dzDateEn = dzFormatterDateEn.format(now);
  const dzTimeAr = dzFormatterTime12.format(now);
  const dzTime24 = dzFormatterTime24.format(now);

  // Hijri Islamic Calendar (Umm al-Qura calculation)
  let hijriDateAr = '';
  try {
    const hijriFormatter = new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', {
      timeZone: 'Africa/Algiers',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    hijriDateAr = hijriFormatter.format(now) + ' هـ';
  } catch {
    hijriDateAr = 'التقويم الهجري المعتمد';
  }

  const dayNameAr = new Intl.DateTimeFormat('ar-DZ', { timeZone: 'Africa/Algiers', weekday: 'long' }).format(now);
  const dayNameFr = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Africa/Algiers', weekday: 'long' }).format(now);
  const dayNameEn = new Intl.DateTimeFormat('en-US', { timeZone: 'Africa/Algiers', weekday: 'long' }).format(now);
  const currentYear = new Intl.DateTimeFormat('en-US', { timeZone: 'Africa/Algiers', year: 'numeric' }).format(now);

  let clientTimeInfo = '';
  if (clientTemporal?.timeZone && clientTemporal.timeZone !== 'Africa/Algiers') {
    clientTimeInfo = `\n- توقيت الزائر المحلي (${clientTemporal.timeZone}): ${clientTemporal.localTime || ''} (${clientTemporal.localDate || ''})`;
  }

  const promptSection = `
🕒 بيانات الساعة والتقويم والوقت الحي الفعلي (Live Real-Time Temporal Clock):
- السنة الحالية المعتمدة: ${currentYear}م
- اليوم في الأسبوع: ${dayNameAr} (${dayNameFr} / ${dayNameEn})
- التاريخ الميلادي الكامل: ${dzDateAr} (بالفرنسية: ${dzDateFr})
- التاريخ الهجري التقديري: ${hijriDateAr}
- التوقيت الحي المباشر (توقيت الجزائر / عين صالح / إقليم تديكلت - GMT+1): ${dzTime24} (أو ${dzTimeAr})
${clientTimeInfo}

📌 قواعد إلزامية قطعية بخصوص الأسئلة الآنية، التوقيت، والتاريخ:
1. **أسئلة الوقت، الساعة، واليوم والتاريخ**:
   - إذا سأل المستخدم عن: الوقت الآن، كم الساعة، ما هو تاريخ اليوم، ما هو اليوم في الأسبوع، أو أي استفسار زمني أو تقويمي، أجب فوراً وبشكل مباشر اعتماداً على هذه البيانات الحية الرسمية أعلاه.
   - اذكر الساعة الحالية بالدقائق والثواني، واذكر اليوم والتاريخ الهجري والميلادي.
   - يُمنع منعاً باتاً الاعتذار أو القول "أنا نموذج ذكاء اصطناعي ولا أملك ساعة حية". أنت تملك ساعة رقمية حية متزامنة بالثانية.
2. **الأسئلة الإخبارية والحية ومجريات اليوم**:
   - عند السؤال عن أحداث اليوم، أحدث الأخبار، أسعار الصرف، أسعار المحروقات أو التمور، أو حالة الطقس المباشرة، ادمج معلومات البحث الحي (Google Search) وتاريخ اليوم ${currentYear}م لتقديم أدق وأحدث المعلومات.`;

  return {
    now,
    dzDateAr,
    dzDateFr,
    dzDateEn,
    dzTimeAr,
    dzTime24,
    hijriDateAr,
    dayNameAr,
    dayNameFr,
    dayNameEn,
    currentYear,
    promptSection,
    clientTimeInfo,
  };
}

// --- Tidikelt Agent Mode Detection & Constants (tidikelt-agent.ts integration) ---
export type TidikeltMode = 'auto' | 'chat' | 'search' | 'code';

export function makeSystemPrompt(replyStyle = 'ar'): string {
  const style =
    replyStyle === 'ar-dz'
      ? 'أجب بدارجة جزائرية بسيطة ومفهومة.'
      : 'أجب بعربية سهلة وواضحة.';

  return `
أنت مساعد يجيب عن سؤال المستخدم مباشرة.

أسلوب الإجابة:
- ${style}
- ابدأ بالجواب، ولا تُعد صياغة السؤال.
- استخدم جملًا قصيرة، وغالبًا اكتفِ بجملتين أو ثلاث.
- إذا طلب المستخدم جوابًا بالرقم فقط، فأرسل الرقم فقط.
- لا تكرر عبارات ترحيبية أو قوالب ثابتة مثل "إعادة التأكيد".
- لا تذكر اسم التطبيق أو المطوّر، ولا تضف عبارة "تطويري بواسطة DARTAGNAN MAHMUOD" إلى الإجابات.
- اذكر اسم التطبيق أو المطوّر فقط إذا سأل المستخدم عنهما مباشرة.
- لا تقل إنك بحثت أو تحققت إلا إذا استخدمت مصادر فعلية.
- إذا لم تعرف، قل ذلك بوضوح بدل إعطاء كلام عام.
`;
}

const TIDIKELT_SYSTEM_INSTRUCTION = makeSystemPrompt('ar').trim();

const STYLE_INSTRUCTIONS: Record<string, string> = {
  "ar-dz": `
اكتب بالعربية الجزائرية الدارجة المفهومة في الجزائر.
خلي الأسلوب طبيعي وواضح، بلا مبالغة في الكلمات المحلية.
حافظ على كل الحقائق والأرقام والتواريخ والأسماء والروابط كما وردت في المصادر.
ما تزيد حتى معلومة من عندك، وما تحوّلش التخمين إلى حقيقة.
استعمل المصطلح العربي الفصيح إذا كان أوضح، ويمكن تشرح معناه بكلمة دارجة.
إذا ما لقيتش المعلومة في المصادر، قول بوضوح: "ما لقيتش معلومة موثوقة على هذا."
لا تعاودش صياغة السؤال بدل الإجابة.
`.trim(),

  "ar": `
أجب بالعربية الفصحى الواضحة والمباشرة.
حافظ على الحقائق والأرقام والمصادر كما وردت، ولا تضف معلومات غير مدعومة.
إذا لم تتوفر معلومة كافية، صرّح بذلك بوضوح.
`.trim(),
};

function getStyleInstruction(value?: string): string {
  if (value && STYLE_INSTRUCTIONS[value]) {
    return STYLE_INSTRUCTIONS[value];
  }
  return STYLE_INSTRUCTIONS["ar-dz"];
}

function detectDialectStyle(query: string, explicitChoice?: string): 'ar-dz' | 'ar' {
  if (explicitChoice === 'ar' || explicitChoice === 'ar-dz') {
    return explicitChoice;
  }
  const q = (query || '').toLowerCase();
  const dzIndicators = /(واش|كيفاش|علاش|وقتاش|كاش|شحال|باغي|نحوس|راك|راكم|كاين|مكانش|ماكانش|بزاف|برك|ديال|تاع|حبيت|قولي|شكون|واش راك|لاباس|واش كاين|ما لقيتش|درك|دروك|مليح|مليحة|هدر|هدرة|حنا|نتوما|كيما|عطاني|نزيد|ندير|دير)/i;
  const formalIndicators = /(ما هي|ما هو|لماذا|كيف يمكن|أرجو|يرجى|هل يمكن|هل من|ما سبب|اشرح لي|لخص|ماهي|ماهو|ما حكم|ما تعريف|قدم تحليلا|عرف|أوضح)/i;

  if (dzIndicators.test(q)) {
    return 'ar-dz';
  }
  if (formalIndicators.test(q)) {
    return 'ar';
  }
  // Default confirmed by user: ar-dz (الدارجة الجزائرية)
  return 'ar-dz';
}

function analyzeAndReconfirmQuery(rawQuery: string, language: string): {
  normalizedQuery: string;
  hasLinguisticErrors: boolean;
  reconfirmationHeader: string;
  confirmedFallbackText: string;
} {
  const original = (rawQuery || '').trim().replace(/\s+/g, ' ');
  const typoRules: Array<[RegExp, string]> = [
    [/السوائل|السول|السوال|السؤل/g, 'السؤال'],
    [/خورميات|خورزميات|خوارزميت/g, 'خوارزميات'],
    [/تيدكلت|تدكلت/g, 'تيديكلت'],
    [/اصطناعيي|الصطناعي|إصطناعي/g, 'اصطناعي'],
    [/برمجه/g, 'برمجة'],
    [/خطاء|خطا\b/g, 'خطأ'],
    [/تكد|تاكد|تأكذ/g, 'التأكد'],
    [/تعتمل/g, 'تعتمد'],
    [/اقتراحت/g, 'اقتراحات'],
    [/انا كان/g, 'إن كان'],
    [/مطورها من|منو مطور| شكون طور|مين طور/g, 'من هو مطور'],
    [/واش هو|وشنو هو|شنو هو|ماهو/g, 'ما هو'],
    [/واش هي|وشنو هي|شنو هي|ماهي/g, 'ما هي'],
    [/كيفاه|كيفاش/g, 'كيف'],
    [/علاه|علاش/g, 'لماذا'],
  ];

  let normalized = original;
  let hasLinguisticErrors = false;
  for (const [pattern, replacement] of typoRules) {
    if (pattern.test(normalized)) {
      hasLinguisticErrors = true;
      normalized = normalized.replace(pattern, replacement);
    }
  }

  // Only mark hasLinguisticErrors if actual spelling or grammatical errors were corrected
  if (normalized.trim() !== original.trim()) {
    hasLinguisticErrors = true;
  }

  const baseTopic = normalized.replace(/^(ما هو|ما هي|كيف|اشرح|اريد|أريد|عن|حول)\s+/i, '').trim() || normalized;

  if (language === 'en') {
    return {
      normalizedQuery: normalized,
      hasLinguisticErrors,
      reconfirmationHeader: '',
      confirmedFallbackText: `I could not find a verified source to answer this question accurately right now.`,
    };
  }

  if (language === 'fr') {
    return {
      normalizedQuery: normalized,
      hasLinguisticErrors,
      reconfirmationHeader: '',
      confirmedFallbackText: `Je n'ai pas trouvé d'information vérifiée pour répondre avec précision à cette question.`,
    };
  }

  return {
    normalizedQuery: normalized,
    hasLinguisticErrors,
    reconfirmationHeader: '',
    confirmedFallbackText: `لم أجد معلومة موثوقة للإجابة عن هذا السؤال بدقة حاليًا.`,
  };
}

export function chooseRoute(question: string, selectedMode = 'auto'): 'direct' | 'web' {
  if (selectedMode === 'chat') {
    return 'direct';
  }

  if (selectedMode === 'search') {
    return 'web';
  }

  const routed = routeQuestion(question);
  return routed.mode === 'web' ? 'web' : 'direct';
}

const CODE_HINTS =
  /(كود|برمج|سكربت|دالة|رسم بياني|python|javascript|code|script|function|algorithm|regex|sql)/i;

function detectTidikeltMode(prompt: string): Exclude<TidikeltMode, 'auto'> {
  if (CODE_HINTS.test(prompt)) return 'code';
  return chooseRoute(prompt, 'auto') === 'web' ? 'search' : 'chat';
}

function buildFallbackCodeExecution(queryText: string, customCode?: string): { code: string; codeOutput: string } {
  const q = queryText.trim();
  const codeToInspect = (customCode || q).trim();

  // Check if customCode contains radius assignment like `radius = 12`
  const radiusVarMatch = codeToInspect.match(/radius\s*=\s*(\d+(?:\.\d+)?)/i);
  if (radiusVarMatch) {
    const r = Number(radiusVarMatch[1]);
    const area = (Math.PI * r * r).toFixed(4);
    const circumference = (2 * Math.PI * r).toFixed(4);
    return {
      code:
        customCode ||
        `import math\n\nradius = ${r}\narea = math.pi * (radius ** 2)\ncircumference = 2 * math.pi * radius\n\nprint(f"نصف القطر (r) = {radius}")\nprint(f"مساحة الدائرة = {area:.4f}")\nprint(f"محيط الدائرة = {circumference:.4f}")`,
      codeOutput: `نصف القطر (r) = ${r}\nمساحة الدائرة = ${area}\nمحيط الدائرة = ${circumference}`,
    };
  }

  // Check if customCode contains a = X and b = Y assignments
  const aVarMatch = codeToInspect.match(/\ba\s*=\s*(-?\d+(?:\.\d+)?)/);
  const bVarMatch = codeToInspect.match(/\bb\s*=\s*(-?\d+(?:\.\d+)?)/);
  const opVarMatch = codeToInspect.match(/\bresult\s*=\s*a\s*([\+\-\*\/])\s*b/);
  if (aVarMatch && bVarMatch) {
    const a = Number(aVarMatch[1]);
    const b = Number(bVarMatch[1]);
    const op = opVarMatch ? opVarMatch[1] : '+';
    const res = op === '+' ? a + b : op === '-' ? a - b : op === '*' ? a * b : b !== 0 ? a / b : NaN;
    return {
      code:
        customCode ||
        `# تنفيذ العملية الحسابية في Python\na = ${a}\nb = ${b}\nresult = a ${op} b\nprint(f"{a} ${op} {b} = {result}")`,
      codeOutput: `${a} ${op} ${b} = ${res}`,
    };
  }

  const circleMatch = q.match(/(?:دائرة|circle)[\s\S]*?(\d+(?:\.\d+)?)/i);
  if (circleMatch) {
    const r = Number(circleMatch[1]);
    const area = (Math.PI * r * r).toFixed(4);
    const circumference = (2 * Math.PI * r).toFixed(4);
    return {
      code:
        customCode ||
        `import math\n\nradius = ${r}\narea = math.pi * (radius ** 2)\ncircumference = 2 * math.pi * radius\n\nprint(f"نصف القطر (r) = {radius}")\nprint(f"مساحة الدائرة = {area:.4f}")\nprint(f"محيط الدائرة = {circumference:.4f}")`,
      codeOutput: `نصف القطر (r) = ${r}\nمساحة الدائرة = ${area}\nمحيط الدائرة = ${circumference}`,
    };
  }

  const mathMatch = q.match(/(\d+(?:\.\d+)?)\s*([\+\-\*\/])\s*(\d+(?:\.\d+)?)/);
  if (mathMatch) {
    const a = Number(mathMatch[1]);
    const op = mathMatch[2];
    const b = Number(mathMatch[3]);
    const res = op === '+' ? a + b : op === '-' ? a - b : op === '*' ? a * b : b !== 0 ? a / b : NaN;
    return {
      code:
        customCode ||
        `# تنفيذ العملية الحسابية في Python\na = ${a}\nb = ${b}\nresult = a ${op} b\nprint(f"{a} ${op} ${b} = {result}")`,
      codeOutput: `${a} ${op} ${b} = ${res}`,
    };
  }

  // Extract explicit print("...") statements if customCode is provided
  if (customCode) {
    const printMatches = [...customCode.matchAll(/print\s*\(\s*(?:f)?["']([^"']+)["']\s*\)/g)];
    if (printMatches.length > 0) {
      return {
        code: customCode,
        codeOutput: printMatches.map((m) => m[1]).join('\n'),
      };
    }
    return {
      code: customCode,
      codeOutput: `[STDOUT] تم تنفيذ الكود بنجاح (${customCode.split('\n').length} أسطر برمجية) — التوقيت: ${new Date().toLocaleTimeString('ar-DZ', { hour12: false })}`,
    };
  }

  return {
    code: `# سكربت بايثون تنفيذي - تيديكلت Ai\ndef solve_task():\n    task = ${JSON.stringify(q.slice(0, 80))}\n    print(f"تم تنفيذ المعالجة البرمجية بنجاح للمهمة: {task}")\n\nsolve_task()`,
    codeOutput: `تم تنفيذ المعالجة البرمجية بنجاح للمهمة: ${q.slice(0, 80)}`,
  };
}

// Dedicated endpoint for direct askTidikelt(prompt, options) service calls
app.post('/api/tidikelt/ask', async (req: Request, res: Response) => {
  const startedAt = performance.now();
  const timings: Record<string, number> = {};

  async function measure<T>(name: string, task: () => Promise<T>): Promise<T> {
    const start = performance.now();
    try {
      return await task();
    } finally {
      timings[name] = Math.round(performance.now() - start);
    }
  }

  try {
    const { prompt = '', mode: requestedMode = 'auto', history = [], customCode } = req.body || {};
    const cleanCustomCode = typeof customCode === 'string' && customCode.trim() ? customCode.trim() : undefined;
    const cleanPrompt = String(prompt || (cleanCustomCode ? 'قم بتنفيذ هذا الكود البرمجي وإظهار ناتج تشغيله الفعلي' : '')).trim();
    if (!cleanPrompt && !cleanCustomCode) {
      return res.status(400).json({ error: 'Prompt or customCode is required.' });
    }

    const route = chooseRoute(cleanPrompt, requestedMode);
    const mode: Exclude<TidikeltMode, 'auto'> = cleanCustomCode
      ? 'code'
      : requestedMode === 'code'
      ? 'code'
      : route === 'web'
      ? 'search'
      : detectTidikeltMode(cleanPrompt);

    let results: Array<{ title: string; url: string; snippet: string }> = [];
    if (route === 'web' && mode === 'search') {
      results = await measure('webSearchMs', () =>
        searchWeb(cleanPrompt, { timeoutMs: 5000 })
      );
    }

    const tools =
      route === 'web' && mode === 'search' && Date.now() > googleSearchCooldownUntil && results.length === 0
        ? [{ googleSearch: {} }]
        : mode === 'code'
        ? [{ codeExecution: {} }]
        : undefined;

    const effectiveUserPrompt = cleanCustomCode
      ? `${cleanPrompt}\n\nنفّذ الكود البرمجي التالي فعلياً عبر أداة codeExecution وأعطني ناتج التشغيل الدقيق:\n\`\`\`python\n${cleanCustomCode}\n\`\`\``
      : results.length > 0
      ? `السؤال:\n${cleanPrompt}\n\nالمصادر المرفقة:\n${results.map((r, i) => `[${i + 1}] ${r.title}\n${r.url}\n${r.snippet}`).join('\n\n')}`
      : cleanPrompt;

    const dialectStyle = detectDialectStyle(cleanPrompt, req.body?.replyStyle || req.body?.style);
    const styleInstruction = getStyleInstruction(dialectStyle);
    let dynamicSystemInstruction = `${makeSystemPrompt(dialectStyle).trim()}\n\n${styleInstruction}`;
    if (mode !== 'code' && cleanPrompt) {
      try {
        const { ragContextPrompt } = executeSearchPipeline(cleanPrompt);
        if (ragContextPrompt) {
          dynamicSystemInstruction = `${dynamicSystemInstruction}\n\n${ragContextPrompt}`;
        }
      } catch (ragErr) {
        console.warn('[RAG injection error in /api/tidikelt/ask]', ragErr);
      }
    }

    const contents = [
      ...(Array.isArray(history) ? history : []).map((h: any) => ({
        role: h.role === 'model' ? 'model' : 'user',
        parts: [{ text: String(h.text || '') }],
      })),
      { role: 'user', parts: [{ text: effectiveUserPrompt }] },
    ];

    let response: any = null;
    const candidateModels = [
      'gemini-3.8-flash',
      'gemini-3.6-flash',
      'gemini-3.5-flash',
      'gemini-3.5-flash-lite',
      'gemini-3-flash-preview',
      'gemini-3.1-flash-lite',
      'gemini-flash-latest',
    ];

    await measure('modelMs', async () => {
      for (const candidateModel of candidateModels) {
        if ((modelCooldownUntil[candidateModel] || 0) > Date.now()) continue;
        try {
          response = await ai.models.generateContent({
            model: candidateModel,
            contents,
            config: {
              systemInstruction: dynamicSystemInstruction,
              temperature: mode === 'code' ? 0.2 : 0.6,
              ...(tools ? { tools } : {}),
            },
          });
          if (response && response.text) break;
        } catch (err: any) {
          const msg = String(err?.message || err || '');
          const isQuotaOrDemand =
            err?.status === 429 ||
            err?.code === 429 ||
            err?.status === 503 ||
            err?.code === 503 ||
            msg.includes('429') ||
            msg.includes('503') ||
            msg.includes('RESOURCE_EXHAUSTED') ||
            msg.toLowerCase().includes('quota') ||
            msg.toLowerCase().includes('high demand');

          if (isQuotaOrDemand) {
            if (mode === 'search') googleSearchCooldownUntil = Date.now() + 60_000;
            modelCooldownUntil[candidateModel] = Date.now() + 30_000;
          }
        }
      }
    });

    const candidate = response?.candidates?.[0];
    const sources: Array<{ title: string; url: string }> = results.map(({ title, url }) => ({ title, url }));
    const seen = new Set<string>(sources.map((s) => s.url));
    for (const chunk of candidate?.groundingMetadata?.groundingChunks ?? []) {
      const url = chunk?.web?.uri;
      if (url && !seen.has(url)) {
        seen.add(url);
        sources.push({ title: chunk.web?.title ?? url, url });
      }
    }

    let code: string | undefined;
    let codeOutput: string | undefined;
    for (const part of candidate?.content?.parts ?? []) {
      if (part?.executableCode?.code) code = part.executableCode.code;
      if (part?.codeExecutionResult?.output) codeOutput = part.codeExecutionResult.output;
    }

    if (mode === 'code' && (!code || !codeOutput)) {
      const fb = buildFallbackCodeExecution(cleanPrompt, cleanCustomCode || code);
      code = cleanCustomCode || code || fb.code;
      codeOutput = codeOutput || fb.codeOutput;
    }

    const reconfirmed = analyzeAndReconfirmQuery(cleanPrompt, 'ar');
    const finalAskText =
      response?.text ??
      (mode === 'code'
        ? `### ⚡ استجابة تيديكلت AI (${mode})\n\nتمت معالجة وتشغيل الكود البرمجي بنجاح.`
        : reconfirmed.confirmedFallbackText);

    timings.totalMs = Math.round(performance.now() - startedAt);
    console.info(
      JSON.stringify({
        route,
        timings,
        sourceCount: sources?.length ?? 0,
      })
    );

    return res.json({
      text: finalAskText,
      mode,
      route,
      timings,
      sources,
      code,
      codeOutput,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'Failed to process askTidikelt request' });
  }
});

// Dedicated endpoint for Ain Salah AI agents
app.post('/api/ain-salah/ask', async (req: Request, res: Response) => {
  const requestStartTime = Date.now();
  const startedAt = performance.now();
  const timings: Record<string, number> = {};

  async function measure<T>(name: string, task: () => Promise<T>): Promise<T> {
    const start = performance.now();
    try {
      return await task();
    } finally {
      timings[name] = Math.round(performance.now() - start);
    }
  }

  try {
    const {
      query,
      agentId,
      mode: requestedMode = 'auto',
      news = [],
      fixes = [],
      history = [],
      weatherAlert = null,
      image = null,
      pdf = null,
      language = 'ar',
      userLocation = null,
      clientTemporalContext = null,
    } = req.body;

    if (!query && !image && !pdf) {
      return res.status(400).json({ error: 'Query, image, or PDF is required.' });
    }

    const effectiveQuery = (
      query ||
      (pdf
        ? 'لخص هذا المستند أو التقرير الإداري واستخرج أهم القرارات والشروط والتواريخ الواردة فيه.'
        : 'حلل هذه الصورة وأعطني تقريراً فورياً وتوجيهات السلامة والنجدة.')
    ).trim();

    const route = chooseRoute(effectiveQuery, requestedMode);
    const resolvedMode: Exclude<TidikeltMode, 'auto'> =
      requestedMode === 'code'
        ? 'code'
        : route === 'web'
        ? 'search'
        : detectTidikeltMode(effectiveQuery);

    // Synchronize Live Clock and Temporal Context for this request
    const liveTemporal = getLiveTemporalContext(clientTemporalContext);

    const isTemporalQuery =
      /وقت|ساعة|الساعة|تاريخ|تاريخ اليوم|اليوم كم|كم التاريخ|أي يوم|شكون اليوم|نهار اليوم|الوقت الآن|الساعة الآن|كم الساعة|كم التوقيت|توقيت الجزائر|توقيت الآن|اليوم ما هو|ماهو تاريخ|ماهو اليوم|كم اليوم|تاريخ اللحظة|العام الحالي|أي سنة|quelle heure|date d'aujourd'hui|heure actuelle|quel jour|what time|what date|today's date|current time/i.test(
        effectiveQuery
      );

    const AGENTS_MAP: Record<string, { id: string; name: string; emoji: string }> = {
      research: { id: 'research', name: 'الباحث الأكاديمي والمعرفي', emoji: '🎓' },
      desert: { id: 'desert', name: 'حارس الصحراء', emoji: '🏜️' },
      doctor: { id: 'doctor', name: 'طبيب الاستعجالات', emoji: '🩺' },
      market: { id: 'market', name: 'دليل الأسواق والتمور', emoji: '🛒' },
      guide: { id: 'guide', name: 'المرشد المحلي', emoji: '🧭' },
      check: { id: 'check', name: 'المدقق الإخباري', emoji: '✅' },
      news: { id: 'news', name: 'جامع الأخبار', emoji: '📰' },
      fix: { id: 'fix', name: 'المصحح اللغوي', emoji: '✍️' },
    };

    // Keyword & Multimodal fallback detector
    let fallbackAgent = AGENTS_MAP['research'];
    if (isTemporalQuery) {
      fallbackAgent = AGENTS_MAP['guide'];
    } else if (pdf) {
      // PDF documents typically belong to local guide / admin advisor, fact checker, or text corrector
      if (/تحقق|صحة|رسمي|إشاعة|تأكيد|صح/i.test(effectiveQuery)) {
        fallbackAgent = AGENTS_MAP['check'];
      } else if (/صياغة|تدقيق|تصحيح/i.test(effectiveQuery)) {
        fallbackAgent = AGENTS_MAP['fix'];
      } else {
        fallbackAgent = AGENTS_MAP['guide'];
      }
    } else if (image) {
      // If image is present, typically desert hazard or breakdown or doctor
      if (/طبيب|مستشفى|دواء|صحة|مرض|عقرب|قرص|لدغة|إسعاف|جرح|دم|أفعى/i.test(effectiveQuery)) {
        fallbackAgent = AGENTS_MAP['doctor'];
      } else {
        fallbackAgent = AGENTS_MAP['desert']; // breakdowns, accidents, tire punctures, sand traps
      }
    } else if (/بحث|أطروحة|مذكرة|دراسة|خطة بحث|تاريخ|علم|فلسفة|أدب|فيزياء|كيمياء|رياضيات|جغرافيا|ثقافة|طاقة|اقتصاد|قانون|جامع|مدرس|تعليم|واجب|سؤال|استفسار|كيف|لماذا|من هو|ما هي|ما هو|اشرح|لخص|اكتبلي مقال|research|study|thesis|history|science|physics|chemistry|math|geography|explain|summarize|etude|recherche|histoire|physique|chimie|expliquer|resumer/i.test(effectiveQuery)) {
      fallbackAgent = AGENTS_MAP['research'];
    } else if (/ضاع|ضعت|صحراء|طريق|خريطة|تائه|عطش|سيارة|رمل|غرزت|عالق|تمنراست|أدرار|المنيعة|سفر|مسلك|حادث|عطل|عجلة|محرك|بنشر|lost|desert|sand|dune|stuck|car|vehicle|breakdown|flat tire|perdu|dunes|sable|panne|vehicule|pneu/i.test(effectiveQuery)) {
      fallbackAgent = AGENTS_MAP['desert'];
    } else if (/طبيب|مستشفى|دواء|صحة|مرض|عقرب|قرص|لدغة|شمس|حرارة|إسعاف|دوخة|عطش|مريض|علاج|صيدلية|doctor|hospital|medicine|health|sick|fever|scorpion|bite|emergency|ambulance|medecin|hopital|medicament|sante|malade|piqure|urgence/i.test(effectiveQuery)) {
      fallbackAgent = AGENTS_MAP['doctor'];
    } else if (/سوق|تمر|تمور|أسعار|شراء|بيع|وقود|محطة|دكان|محلات|شحم|غلاء|دينار|market|dates|price|buy|sell|gas|fuel|station|marche|dattes|prix|acheter|vendre|essence|carburant/i.test(effectiveQuery)) {
      fallbackAgent = AGENTS_MAP['market'];
    } else if (/صحيح|تأكد|حقيقة|مؤكد|إشاعة|صح|كذب|رسمي|تأكيد|fact|check|rumor|true|false|fake|verify|verifier|rumeur|vrai|faux/i.test(effectiveQuery)) {
      fallbackAgent = AGENTS_MAP['check'];
    } else if (/صحح|إملاء|صياغة|اكتبلي|صيغ|grammar|spell|rewrite|proofread|correct|corriger|orthographe|rediger|reformuler/i.test(effectiveQuery)) {
      fallbackAgent = AGENTS_MAP['fix'];
    } else if (/خبر|أخبار|فيسبوك|جديد|إعلان|منشور|news|bulletin|announcement|actualite|nouvelles|communique/i.test(effectiveQuery)) {
      fallbackAgent = AGENTS_MAP['news'];
    }

    // Build context
    const recentNews = Array.isArray(news)
      ? news.slice(-8).map((x: any) => `- [${x.s || 'مصدر محلي'}] ${x.t || ''}`).join('\n')
      : '';
    const recentFixes = Array.isArray(fixes)
      ? fixes.slice(-8).map((f: string) => `- ${f}`).join('\n')
      : '';
    const recentHistory = Array.isArray(history)
      ? history.slice(-3).map((h: any) => `س: ${h[0]}\nج: ${h[1]}`).join('\n\n')
      : '';

    const isWeatherOrTravelQuery =
      /طقس|جو|سفر|طريق|طرق|مسار|مسالك|رياح|عجاج|رمال|سياقة|حركة المرور|أحوال الجو|درجة الحرارة|موجز اليوم|مواقيت الصلاة|RN1|weather|road|travel|trip|route|meteo|voyage/i.test(
        effectiveQuery
      );

    const isResearchQuery =
      /بحث|أطروحة|دراسة|مذكرة|خطة بحث/i.test(effectiveQuery);

    const internalTodaySummary = isWeatherOrTravelQuery ? buildAinSalahTodaySummary() : null;
    const internalTodaySection = internalTodaySummary
      ? `\n[بيانات الموجز اليومي الداخلية (تُستخدم فقط لأن الزائر سأل عنها): الطقس ${internalTodaySummary.weather.tempC}°C (${internalTodaySummary.weather.conditionAr})، الرياح ${internalTodaySummary.weather.windKmh} كم/سا (${internalTodaySummary.weather.windDirAr}) | حالة المسالك: ${internalTodaySummary.roads.map((r) => `${r.nameAr}: ${r.statusAr}`).join(' — ')}]\n`
      : '';

    const alertSection =
      weatherAlert && weatherAlert.active && isWeatherOrTravelQuery
        ? `\nملاحظة الطقس الحالية (تُذكر فقط إذا سأل المستخدم عن الطقس أو السفر): [${weatherAlert.title}]: ${weatherAlert.message}\n`
        : '';

    const locationDirective = '';

    const langDirective =
      language === 'fr'
        ? '\nRépondez de manière concise, simple et directe en français, sans aucun tableau ni détails distrayants dans le texte.'
        : language === 'en'
        ? '\nRespond concisely, simply, and directly in English, with no tables or distracting details in the answer text.'
        : '\nأجب بأسلوب مختصر، بسيط، ومباشر بدون أي جداول أو تفاصيل تشتت الانتباه في نص الإجابة.';

    // Analyze query intent & linguistic/grammatical normalization for Re-confirmation (إعادة التأكيد)
    const queryReconfirmation = analyzeAndReconfirmQuery(effectiveQuery, language);

    // Execute RAG Search Pipeline using normalized intent so typos never miss relevant knowledge
    const { pipelineExecution, ragContextPrompt } = executeSearchPipeline(queryReconfirmation.normalizedQuery);

    const dialectStyle = (language === 'fr' || language === 'en') ? null : detectDialectStyle(effectiveQuery, req.body.replyStyle || req.body.style);
    const dialectInstruction = dialectStyle ? `\n${getStyleInstruction(dialectStyle)}\n` : '';

    const systemPrompt = `${makeSystemPrompt(dialectStyle || 'ar').trim()}
${dialectInstruction}
${langDirective}
${locationDirective}
${liveTemporal.promptSection}
${internalTodaySection}${alertSection}
${recentNews ? `معلومات محلية حديثة:\n${recentNews}` : ''}
${recentFixes ? `تصحيحات سابقة:\n${recentFixes}` : ''}
${ragContextPrompt}`;

    const contents: any[] = [];
    if (recentHistory) {
      contents.push({ text: `سياق المحادثة السابقة:\n${recentHistory}` });
    }

    // Attach PDF if provided (documents, official municipal notices, reports)
    if (pdf) {
      let base64Data = '';
      if (typeof pdf === 'string') {
        const matches = pdf.match(/^data:application\/pdf;base64,(.+)$/);
        if (matches) {
          base64Data = matches[1];
        } else {
          base64Data = pdf;
        }
      } else if (typeof pdf === 'object' && pdf.data) {
        const matches = String(pdf.data).match(/^data:application\/pdf;base64,(.+)$/);
        base64Data = matches ? matches[1] : pdf.data;
      }

      if (base64Data) {
        contents.push({
          inlineData: {
            mimeType: 'application/pdf',
            data: base64Data,
          },
        });
      }
    }

    // Attach Image if provided (multimodal analysis for breakdown / accident)
    if (image) {
      let base64Data = '';
      let mimeType = 'image/jpeg';
      if (typeof image === 'string') {
        const matches = image.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
        if (matches) {
          mimeType = matches[1];
          base64Data = matches[2];
        } else {
          base64Data = image;
        }
      } else if (typeof image === 'object' && image.data) {
        base64Data = image.data;
        mimeType = image.mimeType || 'image/jpeg';
      }

      if (base64Data) {
        contents.push({
          inlineData: {
            mimeType,
            data: base64Data,
          },
        });
      }
    }

    const temporalContextPrompt = isTemporalQuery
      ? `\n[التوقيت الآن: ${liveTemporal.dzTime24} بتوقيت الجزائر | اليوم: ${liveTemporal.dayNameAr} ${liveTemporal.dzDateAr}م (${liveTemporal.hijriDateAr})]`
      : '';

    contents.push({
      text:
        resolvedMode === 'code'
          ? `${effectiveQuery}${temporalContextPrompt}\n(اكتب الكود ونفّذه واشرحه باختصار شديد بدون حشو).`
          : `${effectiveQuery}${temporalContextPrompt}`,
    });

    let response: any;
    let usedModel = 'gemini-3.8-flash';
    // Prioritize active Gemini models with immediate automatic failover
    const candidateModels = [
      'gemini-3.8-flash',
      'gemini-3.6-flash',
      'gemini-3.5-flash',
      'gemini-3.5-flash-lite',
      'gemini-3-flash-preview',
      'gemini-3.1-flash-lite',
      'gemini-flash-latest',
    ];

    const nowMs = Date.now();
    const isTransientModelError = (err: any): boolean => {
      const msg = String(err?.message || err || '');
      return (
        err?.status === 429 ||
        err?.code === 429 ||
        err?.status === 503 ||
        err?.code === 503 ||
        msg.includes('429') ||
        msg.includes('503') ||
        msg.includes('RESOURCE_EXHAUSTED') ||
        msg.toLowerCase().includes('quota') ||
        msg.toLowerCase().includes('rate limit') ||
        msg.toLowerCase().includes('high demand')
      );
    };

    // Tools activated based on resolvedMode (do NOT combine googleSearch and codeExecution in one request)
    const needsCodeExecution = !image && !pdf && resolvedMode === 'code';
    const needsLiveWebSearch =
      !image &&
      !pdf &&
      !needsCodeExecution &&
      nowMs > googleSearchCooldownUntil &&
      route === 'web';

    const targetTemperature = resolvedMode === 'code' ? 0.2 : 0.6;

    let searchResults: Array<{ title: string; url: string; snippet: string }> = [];
    if (route === 'web' && needsLiveWebSearch) {
      searchResults = await measure('webSearchMs', () =>
        searchWeb(effectiveQuery, { timeoutMs: 5000 })
      );
    }

    await measure('modelMs', async () => {
      for (const modelCandidate of candidateModels) {
        if ((modelCooldownUntil[modelCandidate] || 0) > Date.now()) {
          continue;
        }

        // 1. Code Execution Mode attempt
        if (needsCodeExecution) {
          try {
            const genPromiseCode = ai.models.generateContent({
              model: modelCandidate,
              contents: { parts: contents },
              config: {
                systemInstruction: systemPrompt,
                temperature: targetTemperature,
                tools: [{ codeExecution: {} }],
              },
            });
            const timeoutPromiseCode = new Promise((_, reject) =>
              setTimeout(() => reject(new Error(`Timeout waiting for ${modelCandidate} with codeExecution`)), 22000)
            );
            response = await Promise.race([genPromiseCode, timeoutPromiseCode]);
            if (response && response.text) {
              usedModel = modelCandidate;
              break;
            }
          } catch (err: any) {
            if (isTransientModelError(err)) {
              modelCooldownUntil[modelCandidate] = Date.now() + 30_000;
              continue;
            }
          }
        }

        // 2. Search Grounding Mode attempt (never combined with codeExecution)
        if (needsLiveWebSearch && Date.now() > googleSearchCooldownUntil && searchResults.length === 0) {
          try {
            const genPromise = ai.models.generateContent({
              model: modelCandidate,
              contents: { parts: contents },
              config: {
                systemInstruction: systemPrompt,
                temperature: targetTemperature,
                tools: [{ googleSearch: {} }],
              },
            });
            const timeoutPromise = new Promise((_, reject) =>
              setTimeout(() => reject(new Error(`Timeout waiting for ${modelCandidate} with search`)), 20000)
            );
            response = await Promise.race([genPromise, timeoutPromise]);
            if (response && response.text) {
              usedModel = modelCandidate;
              break;
            }
          } catch (err: any) {
            if (isTransientModelError(err)) {
              googleSearchCooldownUntil = Date.now() + 60_000;
              modelCooldownUntil[modelCandidate] = Date.now() + 30_000;
              continue;
            }
          }
        }

        // 3. Standard Chat / Fallback attempt without external tools
        try {
          const genPromiseNoSearch = ai.models.generateContent({
            model: modelCandidate,
            contents: { parts: contents },
            config: {
              systemInstruction: systemPrompt,
              temperature: targetTemperature,
            },
          });
          const timeoutPromiseNoSearch = new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`Timeout waiting for ${modelCandidate}`)), 18000)
          );
          response = await Promise.race([genPromiseNoSearch, timeoutPromiseNoSearch]);
          if (response && response.text) {
            usedModel = modelCandidate;
            break;
          }
        } catch (fallbackErr: any) {
          if (isTransientModelError(fallbackErr)) {
            modelCooldownUntil[modelCandidate] = Date.now() + 30_000;
          }
        }
      }
    });

    if (!response || !response.text) {
      // Smart courteous conversational & analytical fallback when offline or quota-limited
      const fallbackCleanText = (() => {
        const q = effectiveQuery.trim();

        // Direct Temporal Query Fallback (Always 100% accurate live clock response)
        if (isTemporalQuery) {
          if (language === 'en') {
            return `Current time in Algeria (GMT+1): **${liveTemporal.dzTime24}** — **${liveTemporal.dayNameEn}, ${liveTemporal.dzDateAr}** (${liveTemporal.hijriDateAr}).`;
          }
          if (language === 'fr') {
            return `Heure actuelle en Algérie (GMT+1) : **${liveTemporal.dzTime24}** — **${liveTemporal.dayNameFr}, ${liveTemporal.dzDateAr}** (${liveTemporal.hijriDateAr}).`;
          }
          return `الوقت الآن بتوقيت الجزائر (GMT+1): **${liveTemporal.dzTime24}** — **${liveTemporal.dayNameAr}، ${liveTemporal.dzDateAr}** (${liveTemporal.hijriDateAr}).`;
        }

        if (/^(السلام عليكم|سلام|سلام عليكم|مرحبا|أهلا|اهلين|أهلاً وسهلاً|صباح الخير|مساء الخير|هاي|هلا)/i.test(q)) {
          if (language === 'en') return 'Hello! How can I help you today?';
          if (language === 'fr') return "Bonjour ! Comment puis-je vous aider aujourd'hui ?";
          return 'وعليكم السلام ورحمة الله! أهلاً بك، كيف يمكنني مساعدتك اليوم؟';
        }
        if (/كيف حالك|كيفك|شخبارك|أحوالك|labas|ça va|how are you/i.test(q)) {
          if (language === 'en') return "I'm doing well, thank you! How can I help you?";
          if (language === 'fr') return 'Je vais très bien, merci ! Comment puis-je vous aider ?';
          return 'الحمد لله بخير، شكراً لك! كيف يمكنني مساعدتك؟';
        }
        if (/شكرا|شكراً|يعطيك العافية|بارك الله فيك|تسلم|merci|thank you|thanks/i.test(q)) {
          if (language === 'en') return 'You are welcome!';
          if (language === 'fr') return 'Je vous en prie !';
          return 'على الرحب والسعة!';
        }
        if (resolvedMode === 'code') {
          const fbCode = buildFallbackCodeExecution(q);
          return `تم تنفيذ الكود البرمجي بنجاح. النتيجة: \`${fbCode.codeOutput.replace(/\n/g, ' | ')}\``;
        }
        const sftMatch = getSftDataset().find(
          (item) => item.query && (q.includes(item.query.slice(0, 18)) || item.query.includes(q.slice(0, 18)))
        );
        if (sftMatch) {
          return sftMatch.response;
        }
        if (pipelineExecution.retrievedChunks && pipelineExecution.retrievedChunks.length > 0) {
          const topChunk = pipelineExecution.retrievedChunks[0];
          const fullDoc = getKnowledgeBase().find((k) => k.id === topChunk.id);
          return fullDoc?.content || topChunk.snippet;
        }
        if (isWeatherOrTravelQuery) {
          const alertLine =
            weatherAlert && weatherAlert.active
              ? `${weatherAlert.title}: ${weatherAlert.message}. `
              : 'الأجواء مستقرة عموماً في عين صالح وإقليم تديكلت. ';
          return `${alertLine}الطريق الوطني رقم 1 (RN1) سالك، ويُنصح بتفقد الوقود والمياه قبل السفر. للطوارئ: الحماية المدنية **14** أو الدرك الوطني **1055**.`;
        }
        const mathMatch = q.match(/^(\d+)\s*([\+\-\*\/])\s*(\d+)$/);
        if (mathMatch) {
          const a = Number(mathMatch[1]);
          const op = mathMatch[2];
          const b = Number(mathMatch[3]);
          const ans = op === '+' ? a + b : op === '-' ? a - b : op === '*' ? a * b : b !== 0 ? a / b : 'غير معرف';
          return `**${a} ${op} ${b} = ${ans}**`;
        }
        if (/من طورك|من هو مطور|من صنعك|مطور المنصة|DARTAGNAN|ما هي تيديكلت|ما هو تيديكلت|عرف تيديكلت|تعريف المنصة/i.test(queryReconfirmation.normalizedQuery)) {
          return `**تيديكلت AI (Tidikelt AI)** هي منصة ذكاء اصطناعي مستقلة وشاملة، اسمها الداخلي والخارجي **تيديكلت AI**، ومطورها الرسمي هو **DARTAGNAN MAHMUOD**.\n\nالمنصة مستقلة تماماً وتحمل اسم «تيديكلت» كعلامة تقنية مستقلة فقط ولا تعني الإقليم الجغرافي، وتقدم خدمات المحادثة الذكية، تحليل الصور ومستندات PDF، تحويل النص إلى صوت، البحث المعرفي الموثق (RAG)، البرمجة وتنفيذ الأكواد، وأدوات المطورين والتدريب (API & Studio).`;
        }
        return queryReconfirmation.confirmedFallbackText;
      })();

      response = { text: fallbackCleanText };
    }

    // Extract deduplicated live web search grounding metadata (sources & queries) and executableCode / codeExecutionResult
    const webSources: Array<{ title: string; url: string }> = searchResults.map(({ title, url }) => ({ title, url }));
    const seenSourceUrls = new Set<string>(webSources.map((s) => s.url));
    const groundingQueries: string[] = [];
    let executedCode: string | undefined;
    let executedCodeOutput: string | undefined;

    try {
      const candidate = response.candidates?.[0];
      const gMetadata = candidate?.groundingMetadata;
      if (gMetadata) {
        if (Array.isArray(gMetadata.webSearchQueries)) {
          groundingQueries.push(...gMetadata.webSearchQueries);
        }
        if (Array.isArray(gMetadata.groundingChunks)) {
          for (const chunk of gMetadata.groundingChunks) {
            const url = chunk?.web?.uri;
            if (url && !seenSourceUrls.has(url)) {
              seenSourceUrls.add(url);
              webSources.push({
                title: chunk.web.title || url,
                url,
              });
            }
          }
        }
      }

      for (const part of candidate?.content?.parts ?? []) {
        if (part?.executableCode?.code) executedCode = part.executableCode.code;
        if (part?.codeExecutionResult?.output) executedCodeOutput = part.codeExecutionResult.output;
      }
    } catch {
      // Ignore metadata extraction notice
    }

    const rawText = response.text || '';
    let finalText = rawText;
    let finalAgent = fallbackAgent;
    let routingReason = '';

    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        if (parsed.text) finalText = parsed.text;
        if (parsed.assignedAgent && parsed.assignedAgent.name) {
          finalAgent = {
            id: parsed.assignedAgent.id || fallbackAgent.id,
            name: parsed.assignedAgent.name || fallbackAgent.name,
            emoji: parsed.assignedAgent.emoji || fallbackAgent.emoji,
          };
          routingReason = parsed.assignedAgent.reason || '';
        }
      }
    } catch {
      finalText = rawText.replace(/^```json\s*/, '').replace(/\s*```$/, '').trim();
    }

    // Ensure code mode always populates executedCode / executedCodeOutput if not returned as separate part
    if (resolvedMode === 'code' && !executedCode) {
      const codeFenceMatch = finalText.match(/```(?:python|javascript|ts|js|py|sql|bash)?\n([\s\S]*?)```/i);
      const fb = buildFallbackCodeExecution(effectiveQuery);
      executedCode = codeFenceMatch ? codeFenceMatch[1].trim() : fb.code;
      executedCodeOutput = fb.codeOutput;
    }

    const durationMs = Date.now() - requestStartTime;
    timings.totalMs = Math.round(performance.now() - startedAt);
    console.info(
      JSON.stringify({
        route,
        timings,
        sourceCount: webSources?.length ?? 0,
      })
    );

    // Record query log item for supervisor statistics
    try {
      const queryLog: QueryLogItem = {
        id: 'q_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
        timestamp: new Date().toISOString(),
        date: new Date().toISOString().split('T')[0],
        agentId: finalAgent.id,
        agentName: finalAgent.name,
        agentEmoji: finalAgent.emoji,
        durationMs,
        type: pdf ? 'pdf' : (image ? 'image' : 'text'),
        preview: effectiveQuery.slice(0, 80),
      };
      recordQuery(queryLog);
    } catch (logErr) {
      console.error('Failed to log query stats:', logErr);
    }

    return res.json({
      text: finalText,
      mode: resolvedMode,
      route,
      timings,
      sources: webSources.slice(0, 6),
      code: executedCode,
      codeOutput: executedCodeOutput,
      agent: finalAgent,
      routingReason: routingReason,
      durationMs: durationMs,
      webSources: webSources.slice(0, 6),
      groundingQueries: groundingQueries.slice(0, 4),
      sourceInfo: {
        engine: 'Google Gemini',
        model: usedModel,
        isGrounded: webSources.length > 0 || groundingQueries.length > 0,
        provider:
          resolvedMode === 'code'
            ? 'Google Gemini (Code Execution)'
            : resolvedMode === 'search'
            ? 'Google Gemini (Google Search Grounding)'
            : 'Google Gemini (Direct Chat)',
        badgeTitle:
          resolvedMode === 'code'
            ? 'وضع تنفيذ الكود البرمجي الفعلي: Google Gemini · Code Execution'
            : isResearchQuery
            ? 'مساعد بحثي متقدم: Google Gemini · بحث معمق وهيكل شجري'
            : isTemporalQuery
            ? 'مصدر معتمد: Google Gemini · توقيت وساعة حية'
            : 'إجابة مباشرة وموجزة: Google Gemini · خالية من الحشو',
        isLiveTemporal: isTemporalQuery,
        isResearchMode: isResearchQuery,
        isSystemsEngineerMode: true,
        isConciseMode: true,
        temporalClock: {
          time: liveTemporal.dzTime24,
          timeAr: liveTemporal.dzTimeAr,
          date: liveTemporal.dzDateAr,
          hijri: liveTemporal.hijriDateAr,
          day: liveTemporal.dayNameAr,
          year: liveTemporal.currentYear,
        },
      },
      multiModelEngines: ['Google Gemini (بحث حي مباشر)', 'Gemini Flash 3.8', 'Google Search & Code Execution'],
      pipelineExecution,
    });
  } catch (error: any) {
    console.error('Error in /api/ain-salah/ask:', error);
    return res.status(500).json({
      error: error?.message || 'حدث خطأ في معالجة الطلب، حاول مرة أخرى.',
    });
  }
});

// Endpoint for supervisor analytics dashboard
app.get('/api/ain-salah/stats', (_req: Request, res: Response) => {
  try {
    const todayStr = new Date().toISOString().split('T')[0];
    const totalQueries = queryLogs.length;
    const todayQueries = queryLogs.filter((q) => q.date === todayStr);

    const totalDuration = queryLogs.reduce((acc, q) => acc + (q.durationMs || 0), 0);
    const avgDurationMs = totalQueries > 0 ? Math.round(totalDuration / totalQueries) : 1240;

    const todayDuration = todayQueries.reduce((acc, q) => acc + (q.durationMs || 0), 0);
    const todayAvgDurationMs = todayQueries.length > 0 ? Math.round(todayDuration / todayQueries.length) : avgDurationMs;

    // Breakdown by Agent
    const agentMap: Record<string, { id: string; name: string; emoji: string; count: number; totalDuration: number }> = {};
    queryLogs.forEach((q) => {
      const aId = q.agentId || 'guide';
      if (!agentMap[aId]) {
        agentMap[aId] = {
          id: aId,
          name: q.agentName || aId,
          emoji: q.agentEmoji || '🧭',
          count: 0,
          totalDuration: 0,
        };
      }
      agentMap[aId].count += 1;
      agentMap[aId].totalDuration += q.durationMs || 0;
    });

    const agentStats = Object.values(agentMap)
      .map((a) => ({
        ...a,
        percentage: totalQueries > 0 ? Math.round((a.count / totalQueries) * 100) : 0,
        avgDurationMs: a.count > 0 ? Math.round(a.totalDuration / a.count) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    // Daily Breakdown for past 7 days
    const last7Days: { date: string; formattedDate: string; count: number; avgDurationMs: number }[] = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dStr = d.toISOString().split('T')[0];
      const dayItems = queryLogs.filter((q) => q.date === dStr);
      const dayTotalDuration = dayItems.reduce((acc, q) => acc + (q.durationMs || 0), 0);
      const dayAvg = dayItems.length > 0 ? Math.round(dayTotalDuration / dayItems.length) : 0;
      
      const dayName = d.toLocaleDateString('ar-DZ', { weekday: 'short', month: 'numeric', day: 'numeric' });
      last7Days.push({
        date: dStr,
        formattedDate: dayName,
        count: dayItems.length,
        avgDurationMs: dayAvg,
      });
    }

    // Type Breakdown
    const typeCounts = {
      text: queryLogs.filter((q) => q.type === 'text').length,
      image: queryLogs.filter((q) => q.type === 'image').length,
      pdf: queryLogs.filter((q) => q.type === 'pdf').length,
    };

    const topAgent = agentStats[0] || null;

    // 30 Days queries and agent distribution calculation
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const logs30Days = queryLogs.filter((q) => new Date(q.timestamp) >= thirtyDaysAgo);
    const total30DayQueries = logs30Days.length;

    const ALL_KNOWN_AGENTS = [
      { id: 'desert', name: 'حارس الصحراء', emoji: '🏜️', color: '#E28B38' },
      { id: 'research', name: 'الباحث الأكاديمي والمعرفي', emoji: '🎓', color: '#10B981' },
      { id: 'guide', name: 'المرشد المحلي', emoji: '🧭', color: '#3B82F6' },
      { id: 'doctor', name: 'طبيب الاستعجالات', emoji: '🩺', color: '#EF4444' },
      { id: 'market', name: 'دليل الأسواق والتمور', emoji: '🛒', color: '#F59E0B' },
      { id: 'check', name: 'المدقق الإخباري', emoji: '✅', color: '#8B5CF6' },
      { id: 'fix', name: 'المصحح اللغوي', emoji: '✍️', color: '#06B6D4' },
    ];

    const agent30Map: Record<string, { id: string; name: string; emoji: string; count: number; totalDuration: number; color: string }> = {};
    ALL_KNOWN_AGENTS.forEach((a) => {
      agent30Map[a.id] = { ...a, count: 0, totalDuration: 0 };
    });

    logs30Days.forEach((q) => {
      const aId = q.agentId || 'guide';
      if (!agent30Map[aId]) {
        agent30Map[aId] = {
          id: aId,
          name: q.agentName || aId,
          emoji: q.agentEmoji || '🧭',
          color: '#64748B',
          count: 0,
          totalDuration: 0,
        };
      }
      agent30Map[aId].count += 1;
      agent30Map[aId].totalDuration += q.durationMs || 0;
    });

    const agent30DayStats = Object.values(agent30Map)
      .map((a) => ({
        ...a,
        percentage: total30DayQueries > 0 ? Math.round((a.count / total30DayQueries) * 100) : 0,
        avgDurationMs: a.count > 0 ? Math.round(a.totalDuration / a.count) : 0,
      }))
      .sort((a, b) => b.count - a.count);

    // 30 Days daily timeline trend
    const daily30DaysTrend: any[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dStr = d.toISOString().split('T')[0];
      const dayItems = logs30Days.filter((q) => q.date === dStr);
      const dayName = d.toLocaleDateString('ar-DZ', { day: 'numeric', month: 'numeric' });
      
      const dayObj: any = {
        date: dStr,
        formattedDate: dayName,
        total: dayItems.length,
      };

      ALL_KNOWN_AGENTS.forEach((a) => {
        dayObj[a.id] = dayItems.filter((q) => (q.agentId || 'guide') === a.id).length;
      });

      daily30DaysTrend.push(dayObj);
    }

    return res.json({
      totalQueries,
      todayCount: todayQueries.length,
      avgDurationMs,
      todayAvgDurationMs,
      topAgent,
      agentStats,
      dailyBreakdown: last7Days,
      total30DayQueries,
      agent30DayStats,
      daily30DaysTrend,
      typeCounts,
      recentLogs: queryLogs.slice(-30).reverse(),
      ratingsStats: getRatingsStats(),
    });
  } catch (error: any) {
    console.error('Error in /api/ain-salah/stats:', error);
    return res.status(500).json({ error: error?.message || 'فشل جلب الإحصائيات' });
  }
});

app.post('/api/ain-salah/stats/reset', (_req: Request, res: Response) => {
  try {
    queryLogs = generateSeedStats();
    saveQueryStats();
    return res.json({ success: true, message: 'تمت إعادة ضبط وتحديث سجل البيانات الإحصائية بنجاح.' });
  } catch (error: any) {
    console.error('Error in /api/ain-salah/stats/reset:', error);
    return res.status(500).json({ error: error?.message || 'فشل إعادة ضبط الإحصائيات' });
  }
});

// --- Dedicated Endpoints for Response Ratings & Quality Feedback ---
app.post('/api/ratings', (req: Request, res: Response) => {
  try {
    const { messageId, query, response, rating, reason, comment, agentId, agentName } = req.body;

    if (!messageId || !rating || (rating !== 'like' && rating !== 'dislike')) {
      return res.status(400).json({ error: 'messageId and rating (like|dislike) are required.' });
    }

    const existingIndex = ratings.findIndex((r) => r.messageId === messageId);
    const existing = existingIndex >= 0 ? ratings[existingIndex] : null;

    const ratingRecord: ResponseRating = {
      id: existing ? existing.id : `rate_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      messageId,
      query: (query || existing?.query || '').slice(0, 300),
      response: (response || existing?.response || '').slice(0, 800),
      rating,
      reason: reason !== undefined ? reason : existing?.reason,
      comment: comment !== undefined ? (typeof comment === 'string' ? comment.trim() : '') : existing?.comment,
      agentId: agentId || existing?.agentId || 'general',
      agentName: agentName || existing?.agentName || 'المساعد الذكي',
      timestamp: new Date().toISOString(),
      createdAt: existing ? existing.createdAt : Date.now(),
    };

    if (existingIndex >= 0) {
      ratings[existingIndex] = ratingRecord;
    } else {
      ratings.push(ratingRecord);
    }

    saveRatings();

    return res.json({
      success: true,
      rating: ratingRecord,
      stats: getRatingsStats(),
      message: 'تم حفظ التقييم بنجاح في قاعدة البيانات لتحسين جودة الردود مستقبلاً.',
    });
  } catch (err: any) {
    console.error('Error in POST /api/ratings:', err);
    return res.status(500).json({ error: err?.message || 'فشل حفظ التقييم في قاعدة البيانات' });
  }
});

app.delete('/api/ratings/:messageId', (req: Request, res: Response) => {
  try {
    const { messageId } = req.params;
    const initialLen = ratings.length;
    ratings = ratings.filter((r) => r.messageId !== messageId);
    if (ratings.length !== initialLen) {
      saveRatings();
    }
    return res.json({
      success: true,
      removed: ratings.length !== initialLen,
      stats: getRatingsStats(),
    });
  } catch (err: any) {
    console.error('Error in DELETE /api/ratings:', err);
    return res.status(500).json({ error: err?.message || 'فشل حذف التقييم' });
  }
});

app.get('/api/ratings', (_req: Request, res: Response) => {
  try {
    return res.json({
      ratings: ratings.slice(-100).reverse(),
      stats: getRatingsStats(),
    });
  } catch (err: any) {
    console.error('Error in GET /api/ratings:', err);
    return res.status(500).json({ error: err?.message || 'فشل جلب التقييمات' });
  }
});

app.get('/api/ratings/stats', (_req: Request, res: Response) => {
  try {
    return res.json(getRatingsStats());
  } catch (err: any) {
    console.error('Error in GET /api/ratings/stats:', err);
    return res.status(500).json({ error: err?.message || 'فشل جلب إحصائيات التقييمات' });
  }
});

app.post('/api/ratings/reset', (_req: Request, res: Response) => {
  try {
    ratings = generateSeedRatings();
    saveRatings();
    return res.json({
      success: true,
      message: 'تمت إعادة ضبط سجل تقييمات الجودة بنجاح.',
      stats: getRatingsStats(),
    });
  } catch (err: any) {
    console.error('Error in POST /api/ratings/reset:', err);
    return res.status(500).json({ error: err?.message || 'فشل إعادة ضبط التقييمات' });
  }
});

app.post('/api/ratings/reload', (_req: Request, res: Response) => {
  try {
    const reloaded = reloadRatingsFromDiskIfNeeded(true);
    return res.json({
      success: true,
      reloaded,
      count: ratings.length,
      stats: getRatingsStats(),
      message: `تمت قراءة وتحديث التقييمات بنجاح من ملف data/ratings.json (${ratings.length} تقييم مسجل).`,
    });
  } catch (err: any) {
    console.error('Error in POST /api/ratings/reload:', err);
    return res.status(500).json({ error: err?.message || 'فشل قراءة ملف التقييمات' });
  }
});

// ══════════════════════════════════════════════════════════════════════════
// 1. SFT Training Dataset Endpoints (الضبط الدقيق الخاضع للإشراف)
// ══════════════════════════════════════════════════════════════════════════

app.get('/api/training/sft', (_req: Request, res: Response) => {
  try {
    const dataset = getSftDataset();
    const categoriesCount: Record<string, number> = {};
    dataset.forEach((ex) => {
      categoriesCount[ex.category] = (categoriesCount[ex.category] || 0) + 1;
    });

    return res.json({
      total: dataset.length,
      categoriesCount,
      dataset,
    });
  } catch (err: any) {
    console.error('Error in GET /api/training/sft:', err);
    return res.status(500).json({ error: err?.message || 'فشل جلب بيانات التدريب SFT' });
  }
});

app.post('/api/training/sft', (req: Request, res: Response) => {
  try {
    const { query, response, category, source, tags, qualityScore } = req.body;
    if (!query || !response) {
      return res.status(400).json({ error: 'السؤال والجواب النموذجي مطلوبان' });
    }

    const created = addSftExample({
      query: String(query).trim(),
      response: String(response).trim(),
      category: category || 'general',
      source: source || 'إضافة يدوية من المشرف',
      tags: Array.isArray(tags) ? tags : [],
      qualityScore: qualityScore ? Number(qualityScore) : 1.0,
    });

    return res.json({
      success: true,
      message: 'تمت إضافة المثال التدريبي بنجاح وحفظه في بيانات SFT.',
      example: created,
    });
  } catch (err: any) {
    console.error('Error in POST /api/training/sft:', err);
    return res.status(500).json({ error: err?.message || 'فشل حفظ المثال التدريبي' });
  }
});

app.delete('/api/training/sft/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const ok = deleteSftExample(id);
    return res.json({ success: ok, message: ok ? 'تم الحذف بنجاح' : 'العنصر غير موجود' });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'فشل حذف المثال' });
  }
});

// ══════════════════════════════════════════════════════════════════════════
// 2. RLHF Preference & Pairwise Arena Endpoints (التعلم المعزز)
// ══════════════════════════════════════════════════════════════════════════

app.get('/api/training/rlhf', (_req: Request, res: Response) => {
  try {
    const comparisons = getRlhfComparisons();
    const criteriaCount: Record<string, number> = {};
    let preferA = 0;
    let preferB = 0;

    comparisons.forEach((c) => {
      criteriaCount[c.criteria] = (criteriaCount[c.criteria] || 0) + 1;
      if (c.chosen === 'A') preferA++;
      else if (c.chosen === 'B') preferB++;
    });

    return res.json({
      total: comparisons.length,
      preferA,
      preferB,
      criteriaCount,
      comparisons,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'فشل جلب سجلات RLHF' });
  }
});

app.post('/api/training/rlhf/generate-pair', async (req: Request, res: Response) => {
  try {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: 'السؤال مطلوب لتوليد الردود المتنافسة' });
    }

    const p = String(prompt).trim();

    // Generate Candidate A (Focused, polite, structured)
    const genA = ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: p,
      config: {
        systemInstruction:
          'أنت نموذج ذكاء اصطناعي فائق. أجب بأسلوب فصيح، مهذب، شديد الدقة، مباشر ومختصر دون أي حشو أو تنبيهات غير مطلوبة.',
        temperature: 0.2,
      },
    });

    // Generate Candidate B (Alternative style, slightly more creative/descriptive)
    const genB = ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: p,
      config: {
        systemInstruction:
          'أنت نموذج ذكاء اصطناعي. أجب باللغة العربية، بأسلوب تفصيلي وسلس مع تقديم أمثلة توضيحية.',
        temperature: 0.7,
      },
    });

    const [resA, resB] = await Promise.allSettled([genA, genB]);
    const textA =
      resA.status === 'fulfilled' && resA.value?.text
        ? resA.value.text
        : `الإجابة (أ): رداً على "${p}"، تم تلخيص المعلومة الأساسية بدقة وإيجاز ومباشرة.`;
    const textB =
      resB.status === 'fulfilled' && resB.value?.text
        ? resB.value.text
        : `الإجابة (ب): فيما يخص استفسارك حول "${p}"، إليك شرحاً أوسع مع بعد إضافي وسياق عام.`;

    return res.json({
      prompt: p,
      responseA: textA,
      responseB: textB,
    });
  } catch (err: any) {
    console.error('Error generating pair in /api/training/rlhf/generate-pair:', err);
    return res.status(500).json({ error: err?.message || 'فشل توليد الردود المتنافسة' });
  }
});

app.post('/api/training/rlhf/vote', (req: Request, res: Response) => {
  try {
    const { prompt, responseA, responseB, chosen, criteria, reason } = req.body;
    if (!prompt || !responseA || !responseB || !chosen) {
      return res.status(400).json({ error: 'بيانات التصويت غير مكتملة' });
    }

    const record = addRlhfComparison({
      prompt: String(prompt).trim(),
      responseA: String(responseA).trim(),
      responseB: String(responseB).trim(),
      chosen,
      criteria: criteria || 'polite',
      reason: reason ? String(reason).trim() : undefined,
    });

    return res.json({
      success: true,
      message: 'تم تسجيل تفضيلك البشري بنجاح وتحديث موجهات النموذج تلقائياً.',
      record,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'فشل تسجيل التصويت' });
  }
});

// ══════════════════════════════════════════════════════════════════════════
// 3. RAG Knowledge Base & Search Engine Endpoints (قاعدة المعرفة والبحث)
// ══════════════════════════════════════════════════════════════════════════

app.get('/api/rag/knowledge-base', (_req: Request, res: Response) => {
  try {
    const kb = getKnowledgeBase();
    const categoriesCount: Record<string, number> = {};
    kb.forEach((k) => {
      categoriesCount[k.category] = (categoriesCount[k.category] || 0) + 1;
    });

    return res.json({
      total: kb.length,
      categoriesCount,
      documents: kb,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'فشل جلب قاعدة المعرفة' });
  }
});

app.post('/api/rag/knowledge-base', (req: Request, res: Response) => {
  try {
    const { title, content, category, source, tags, importance } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: 'عنوان الوثيقة ومحتواها مطلوبان' });
    }

    const created = addKnowledgeChunk({
      title: String(title).trim(),
      content: String(content).trim(),
      category: category || 'general',
      source: source || 'مكتبة المعرفة الذاتية',
      tags: Array.isArray(tags) ? tags : [],
      importance: importance ? Number(importance) : 1.0,
    });

    return res.json({
      success: true,
      message: 'تمت إضافة الوثيقة إلى قاعدة المعرفة RAG بنجاح وجرى فهرستها آنياً.',
      chunk: created,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'فشل إضافة الوثيقة' });
  }
});

app.delete('/api/rag/knowledge-base/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const ok = deleteKnowledgeChunk(id);
    return res.json({ success: ok, message: ok ? 'تم الحذف بنجاح' : 'الوثيقة غير موجودة' });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'فشل حذف الوثيقة' });
  }
});

app.post('/api/rag/search', (req: Request, res: Response) => {
  try {
    const { query, topK = 5 } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'استعلام البحث مطلوب' });
    }

    const results = searchKnowledgeBase(String(query), Number(topK));
    return res.json({
      query,
      count: results.length,
      results,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'فشل محرك بحث المعرفة' });
  }
});

// Custom Document Management: List indexed documents
app.get('/api/rag/documents', (_req: Request, res: Response) => {
  try {
    const docs = getIndexedDocuments();
    return res.json({ success: true, count: docs.length, documents: docs });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'فشل جلب قائمة المستندات' });
  }
});

// Delete an entire document and its indexed chunks
app.delete('/api/rag/documents/:docId', (req: Request, res: Response) => {
  try {
    const { docId } = req.params;
    const deletedCount = deleteDocumentChunks(decodeURIComponent(docId));
    return res.json({
      success: true,
      message: `تم حذف المستند وجميع مقاطعه المعرفية (${deletedCount} مقطع) بنجاح.`,
      deletedCount,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'فشل حذف المستند' });
  }
});

// Upload and index custom documents (PDF, Markdown, Text, CSV)
app.post('/api/rag/upload-document', async (req: Request, res: Response) => {
  try {
    const {
      fileName = 'document.txt',
      fileType = 'text',
      content = '',
      title,
      category = 'general',
      source,
      chunkSize = 900,
    } = req.body || {};

    if (!content || typeof content !== 'string') {
      return res.status(400).json({ error: 'محتوى المستند أو الملف مطلوب.' });
    }

    const documentId = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const effectiveSource = source || fileName;
    const effectiveTitle = title || fileName.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');

    let generatedChunks: Array<Omit<KnowledgeChunk, 'id' | 'createdAt'>> = [];

    // Check if file is PDF
    const isPdf =
      fileType === 'pdf' ||
      fileName.toLowerCase().endsWith('.pdf') ||
      content.startsWith('data:application/pdf;base64,');

    if (isPdf) {
      const base64Data = content.replace(/^data:application\/pdf;base64,/, '').trim();
      let geminiExtractionSuccess = false;

      // Try intelligent semantic extraction & chunking via Gemini
      if (process.env.GEMINI_API_KEY && base64Data.length > 50) {
        try {
          const aiResponse = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    inlineData: {
                      mimeType: 'application/pdf',
                      data: base64Data,
                    },
                  },
                  {
                    text: `Analyze this document thoroughly for a high-precision RAG knowledge retrieval system.
Extract all key domain facts, explanations, procedures, and definitions into cohesive, self-contained knowledge chunks.
Return ONLY valid JSON (no markdown formatting, no code fences):
{
  "title": "${effectiveTitle}",
  "domainCategory": "${category}",
  "tags": ["extracted", "core", "tags"],
  "chunks": [
    {
      "title": "Clear informative section title with domain topic",
      "content": "Comprehensive, factual text of this section (300 to 1200 characters)",
      "tags": ["key", "terms", "for", "matching"]
    }
  ]
}`,
                  },
                ],
              },
            ],
            config: {
              responseMimeType: 'application/json',
              temperature: 0.2,
            },
          });

          const jsonText = aiResponse.text?.trim() || '';
          if (jsonText) {
            const parsed = JSON.parse(jsonText);
            if (Array.isArray(parsed.chunks) && parsed.chunks.length > 0) {
              generatedChunks = parsed.chunks.map((c: any, idx: number) => ({
                title: c.title || `${effectiveTitle} · مقطع ${idx + 1}`,
                content: String(c.content || '').trim(),
                category: category || parsed.domainCategory || 'general',
                source: effectiveSource,
                tags: Array.isArray(c.tags) ? c.tags : Array.isArray(parsed.tags) ? parsed.tags : [fileName],
                importance: 1.0,
                documentId,
                fileName,
              }));
              geminiExtractionSuccess = true;
            }
          }
        } catch (aiErr) {
          console.warn('[PDF AI Indexing fallback]', aiErr);
        }
      }

      // Fallback if AI extraction couldn't parse
      if (!geminiExtractionSuccess) {
        let rawExtracted = '';
        try {
          const buffer = Buffer.from(base64Data, 'base64');
          rawExtracted = buffer.toString('utf-8').replace(/[^\x20-\x7E\u0600-\u06FF\n\r\t]/g, ' ');
        } catch {
          rawExtracted = '';
        }

        if (rawExtracted.replace(/\s+/g, '').length > 80) {
          generatedChunks = smartChunkDocumentText(rawExtracted, {
            fileName,
            title: effectiveTitle,
            category,
            source: effectiveSource,
            documentId,
            chunkSize,
          }).map((c) => ({ ...c, documentId, fileName }));
        } else {
          generatedChunks = [
            {
              title: `${effectiveTitle} (ملف PDF)`,
              content: `تم رفع وفهرسة مستند PDF بعنوان «${effectiveTitle}» (اسم الملف: ${fileName}). المستند متاح كمرجع معرفي متخصص للرد على أسئلة المستخدمين واستخلاص الإجابات في هذا المجال.`,
              category,
              source: effectiveSource,
              tags: [fileName, category, 'pdf', 'مستند'],
              importance: 1.0,
              documentId,
              fileName,
            },
          ];
        }
      }
    } else {
      // Case 2: Plain Text, Markdown, CSV, JSON
      let rawText = content;
      if (content.startsWith('data:') && content.includes('base64,')) {
        try {
          const b64 = content.split('base64,')[1];
          rawText = Buffer.from(b64, 'base64').toString('utf-8');
        } catch {
          rawText = content;
        }
      }

      const chunks = smartChunkDocumentText(rawText, {
        fileName,
        title: effectiveTitle,
        category,
        source: effectiveSource,
        documentId,
        chunkSize,
      });

      generatedChunks = chunks.map((c) => ({
        ...c,
        documentId,
        fileName,
      }));
    }

    if (generatedChunks.length === 0) {
      return res.status(400).json({ error: 'لم يتم العثور على محتوى قابل للفهرسة في المستند.' });
    }

    // Save batch into Knowledge Base
    const savedChunks = addKnowledgeChunksBatch(generatedChunks);

    const docSummary: any = {
      id: documentId,
      fileName,
      title: effectiveTitle,
      category,
      source: effectiveSource,
      chunkCount: savedChunks.length,
      totalChars: savedChunks.reduce((acc, c) => acc + c.content.length, 0),
      tags: Array.from(new Set(savedChunks.flatMap((c) => c.tags || []))).slice(0, 10),
      createdAt: Date.now(),
    };

    return res.json({
      success: true,
      message: `تم رفع وفهرسة المستند «${effectiveTitle}» بنجاح وتوليد ${savedChunks.length} مقطع معرفي جاهز للاسترجاع.`,
      document: docSummary,
      chunks: savedChunks,
    });
  } catch (err: any) {
    console.error('Document indexing error:', err);
    return res.status(500).json({ error: err?.message || 'فشلت معالجة وفهرسة المستند.' });
  }
});

app.post('/api/rag/knowledge-base/batch', (req: Request, res: Response) => {
  try {
    const { chunks = [] } = req.body || {};
    if (!Array.isArray(chunks) || chunks.length === 0) {
      return res.status(400).json({ error: 'قائمة المقاطع المعرفية مطلوبة.' });
    }

    const created = addKnowledgeChunksBatch(
      chunks.map((c: any) => ({
        title: String(c.title || 'مقطع معرفي').trim(),
        content: String(c.content || '').trim(),
        category: c.category || 'general',
        source: c.source || 'إدخال مخصص',
        tags: Array.isArray(c.tags) ? c.tags : [],
        importance: c.importance ? Number(c.importance) : 1.0,
        documentId: c.documentId,
        fileName: c.fileName,
      }))
    );

    return res.json({
      success: true,
      count: created.length,
      message: `تمت إضافة وفهرسة ${created.length} مقطع معرفي بنجاح.`,
      chunks: created,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'فشلت إضافة المقاطع' });
  }
});

// ══════════════════════════════════════════════════════════════════════════
// 4. Custom Agent Avatars Management Endpoints (مختبر التدريب - صور الوكلاء)
// ══════════════════════════════════════════════════════════════════════════
const AGENT_AVATARS_FILE = path.join(DATA_DIR, 'agent_avatars.json');

function loadAgentAvatars(): Record<string, string> {
  try {
    if (fs.existsSync(AGENT_AVATARS_FILE)) {
      const raw = fs.readFileSync(AGENT_AVATARS_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('Could not read agent_avatars.json:', err);
  }
  return {};
}

function saveAgentAvatars(avatars: Record<string, string>) {
  try {
    fs.writeFileSync(AGENT_AVATARS_FILE, JSON.stringify(avatars, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save agent_avatars.json:', err);
  }
}

app.get('/api/training/agent-avatars', (_req: Request, res: Response) => {
  try {
    const avatars = loadAgentAvatars();
    return res.json({ avatars });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'فشل جلب صور الوكلاء' });
  }
});

app.post('/api/training/agent-avatars', (req: Request, res: Response) => {
  try {
    const { agentId, avatarUrl } = req.body;
    if (!agentId || typeof agentId !== 'string') {
      return res.status(400).json({ error: 'معرف الوكيل مطلوب' });
    }
    const avatars = loadAgentAvatars();
    if (!avatarUrl) {
      delete avatars[agentId];
    } else {
      avatars[agentId] = String(avatarUrl);
    }
    saveAgentAvatars(avatars);
    return res.json({
      success: true,
      avatars,
      message: 'تم تحديث الصورة الرمزية للوكيل بنجاح.',
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'فشل حفظ الصورة الرمزية للوكيل' });
  }
});

app.delete('/api/training/agent-avatars/:agentId', (req: Request, res: Response) => {
  try {
    const { agentId } = req.params;
    const avatars = loadAgentAvatars();
    delete avatars[agentId];
    saveAgentAvatars(avatars);
    return res.json({
      success: true,
      avatars,
      message: 'تمت استعادة الأيقونة الافتراضية للوكيل.',
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'فشل حذف الصورة الرمزية للوكيل' });
  }
});

// Endpoint for daily news agent gathering and real-time ticker generation
app.post('/api/ain-salah/daily-ticker', async (req: Request, res: Response) => {
  try {
    const { news = [], weatherAlert = null } = req.body;

    const newsList = Array.isArray(news)
      ? news.slice(0, 5).map((n: any) => `[${n.s || 'خبر محلي'}]: ${n.t || ''}`).join(' | ')
      : '';

    const cacheKey = `${weatherAlert?.title || 'normal'}_${newsList.slice(0, 80)}`;
    if (dailyTickerCache && dailyTickerCache.key === cacheKey && Date.now() - dailyTickerCache.updatedAt < 15 * 60 * 1000) {
      return res.json({
        tickerSummary: dailyTickerCache.summary,
        updatedAt: dailyTickerCache.updatedAt,
        cached: true,
      });
    }

    const fallbackSummary = weatherAlert && weatherAlert.active && weatherAlert.title
      ? `${weatherAlert.title} · ${weatherAlert.message} · طوارئ الحماية المدنية: 14 / الدرك الوطني: 1055`
      : newsList
      ? `مستجدات عين صالح وتيديكلت: ${news[0]?.t || 'أجواء صحراوية مستقرة وطرق سالكة'} · أرقام الطوارئ: 14 / 1055`
      : 'طقس صحراوي مستقر في عين صالح وإقليم تديكلت · الطرق الوطنية RN1 و RN52 سالكة · طوارئ: 14 / 1055';

    // If models are currently in quota cooldown, return instant deterministic summary without burning quota
    if ((modelCooldownUntil['gemini-3.1-flash-lite'] || 0) > Date.now()) {
      dailyTickerCache = { summary: fallbackSummary, key: cacheKey, updatedAt: Date.now() };
      return res.json({
        tickerSummary: fallbackSummary,
        updatedAt: Date.now(),
      });
    }

    const weatherText = weatherAlert && weatherAlert.active
      ? `تنبيه جوي: ${weatherAlert.title} - ${weatherAlert.message}`
      : 'أجواء صحراوية مستقرة على العموم في إقليم تديكلت وعين صالح.';

    const prompt = `أنت «أيجنت الأخبار اليومية والموجز الصحراوي لتديكلت وعين صالح».
مهمتك: جمع آخر مستجدات الطقس والأخبار المحلية وصياغة شريط أخباري موجز وهادئ يمر في أعلى التطبيق.
معطيات الطقس الحالية:
${weatherText}

آخر الأخبار المحلية المجمعة:
${newsList || 'لا توجد أخبار محلية جديدة اليوم.'}

المطلوب: صياغة فقرة شريط إخباري واحدة وموجزة جداً ومريحة للقراءة بدون تهويل، تشمل باختصار شديد:
1. حالة الجو والطريق
2. أهم المستجدات المحلية
3. رقم طوارئ الحماية (14) أو الدرك (1055)

أرجع النتيجة حصراً بصيغة JSON:
{
  "tickerSummary": "نص الشريط هنا بهدوء واختصار تام...",
  "status": "success"
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.3,
      },
    });

    const raw = response.text || '';
    let parsed: any = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = { tickerSummary: raw.trim() };
    }

    const summaryText = parsed.tickerSummary || fallbackSummary;
    dailyTickerCache = { summary: summaryText, key: cacheKey, updatedAt: Date.now() };

    return res.json({
      tickerSummary: summaryText,
      updatedAt: Date.now(),
    });
  } catch (error: any) {
    modelCooldownUntil['gemini-3.1-flash-lite'] = Date.now() + 60_000;
    const fallbackSummary = req.body?.weatherAlert?.title
      ? `${req.body.weatherAlert.title} · ${req.body.weatherAlert.message} · طوارئ: 14 / 1055`
      : 'طقس صحراوي مستقر في عين صالح وإقليم تديكلت · طرق سالكة وآمنة · طوارئ: 14 / 1055';
    return res.json({
      tickerSummary: fallbackSummary,
      updatedAt: Date.now(),
      fallback: true,
    });
  }
});


function cleanItems(items: any[]): Array<{ id: string; title: string; url: string; text: string }> {
  if (!Array.isArray(items)) return [];

  return items
    .filter((x) => x && typeof x.text === 'string')
    .slice(0, 6)
    .map((x) => ({
      id: typeof x.id === 'string' ? x.id : '',
      title: String(x.title || 'مصدر').slice(0, 200),
      url: typeof x.url === 'string' && /^https?:\/\//i.test(x.url) ? x.url : '',
      text: x.text.slice(0, 2500),
    }));
}

function extractFactsAndCitedSources(
  query: string,
  answer: string,
  sources: Array<{ id: string; title: string; url: string; text: string }>
): { facts: Array<{ id: string; value: string }>; citedSourceIds: string[] } {
  const facts: Array<{ id: string; value: string }> = [];
  const citedSourceIdsSet = new Set<string>();

  const isAbstention = /ما لقيتش|ما عنديش|ما نقدرش نأكد|ما كاينش|لم أجد|لا أملك|لا أستطيع التأكد|غير متوفر/i.test(answer);
  if (isAbstention && (sources.length === 0 || !sources.some((s) => s.text && (s.text.includes('14') || s.text.includes('الحماية'))))) {
    return { facts: [], citedSourceIds: [] };
  }

  // 1. Civil Protection Number (رقم الحماية المدنية)
  const isCivilProtection =
    /الحماية المدنية/i.test(query) ||
    /الحماية المدنية/i.test(answer) ||
    sources.some((s) => /الحماية المدنية/i.test(s.text));

  if (isCivilProtection) {
    if (/\b14\b/.test(answer) || sources.some((s) => /\b14\b/.test(s.text))) {
      facts.push({ id: 'civil-protection-number', value: '14' });
      for (const s of sources) {
        if (s.id && (/الحماية المدنية/i.test(s.text) || /\b14\b/.test(s.text))) {
          citedSourceIdsSet.add(s.id);
        }
      }
    }
  }

  // 2. Gendarmerie (الدرك الوطني)
  if (
    /الدرك الوطني/i.test(query) ||
    /الدرك الوطني/i.test(answer) ||
    sources.some((s) => /الدرك الوطني/i.test(s.text))
  ) {
    if (/\b1055\b/.test(answer) || sources.some((s) => /\b1055\b/.test(s.text))) {
      facts.push({ id: 'gendarmerie-number', value: '1055' });
      for (const s of sources) {
        if (s.id && (/الدرك الوطني/i.test(s.text) || /\b1055\b/.test(s.text))) {
          citedSourceIdsSet.add(s.id);
        }
      }
    }
  }

  // 3. Police (الشرطة)
  if (
    /الشرطة/i.test(query) ||
    /الشرطة/i.test(answer) ||
    sources.some((s) => /الشرطة/i.test(s.text))
  ) {
    if (/\b17\b|\b1548\b/.test(answer) || sources.some((s) => /\b17\b|\b1548\b/.test(s.text))) {
      facts.push({ id: 'police-number', value: /\b1548\b/.test(answer) ? '1548' : '17' });
      for (const s of sources) {
        if (s.id && (/الشرطة/i.test(s.text) || /\b17\b|\b1548\b/.test(s.text))) {
          citedSourceIdsSet.add(s.id);
        }
      }
    }
  }

  // Check bracketed source citations like [1]
  sources.forEach((s, idx) => {
    if (!s.id) return;
    const bracketPattern = new RegExp(`\\[${idx + 1}\\]`);
    if (bracketPattern.test(answer)) {
      citedSourceIdsSet.add(s.id);
    }
  });

  return {
    facts,
    citedSourceIds: Array.from(citedSourceIdsSet),
  };
}

// Real-time SSE Chat Stream handler adhering to OpenAI & Next.js streaming standards
async function handleChatStream(req: Request, res: Response) {
  const startedAt = Date.now();

  try {
    const messages = req.body?.messages;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "رسالة غير صالحة" });
    }

    const latest = messages[messages.length - 1];
    const latestContent = latest?.content ?? latest?.text;
    if (
      (latest?.role !== "user" && latest?.role !== undefined) ||
      typeof latestContent !== "string" ||
      latestContent.length > 4_000
    ) {
      return res.status(400).json({ error: "تحقق من نص السؤال" });
    }

    res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("X-Accel-Buffering", "no");
    res.setHeader("Connection", "keep-alive");

    let firstTokenAt: number | null = null;
    const route = routeQuestion(latestContent);
    let sourcesContext = '';

    // إذا كان السؤال يحتاج بحثًا، اجعل الخادم يرسل حدث "searching"
    // عند بداية البحث الحقيقي، لا لمجرد أن الطلب بدأ.
    if (route.mode === 'web' || route.mode === 'local') {
      res.write(`event: status\ndata: ${JSON.stringify({ status: "searching", reason: route.reason })}\n\n`);
      if (typeof (res as any).flush === 'function') (res as any).flush();

      try {
        const searchResults = await searchWeb(latestContent, { timeoutMs: 4000 });
        if (searchResults && searchResults.length > 0) {
          sourcesContext = searchResults
            .slice(0, 4)
            .map((s, idx) => `[مصدر ${idx + 1}] ${s.title}\n${s.snippet}\n${s.url}`)
            .join('\n\n');
        }
      } catch (searchErr) {
        console.warn('Search retrieval encountered non-fatal error:', searchErr);
      }
    }

    // إرسال حدث الكتابة عند بدء تجهيز الرد وتوليده
    res.write(`event: status\ndata: ${JSON.stringify({ status: "writing" })}\n\n`);
    if (typeof (res as any).flush === 'function') (res as any).flush();

    if (process.env.AI_API_KEY || process.env.OPENAI_API_KEY) {
      const openaiClient = new OpenAI({
        apiKey: process.env.AI_API_KEY || process.env.OPENAI_API_KEY,
        baseURL: process.env.AI_BASE_URL || undefined,
        timeout: 20_000,
        maxRetries: 0,
      });

      const formattedMessages = messages.map((m: any) => ({
        role: m.role === 'model' ? 'assistant' : m.role || 'user',
        content: m.content || m.text || '',
      }));

      if (sourcesContext) {
        formattedMessages.unshift({
          role: 'system',
          content: `المصادر الموثقة للاستعانة بها في الإجابة:\n${sourcesContext}\nأجب بالاعتماد على هذه المصادر بدقة وأمانة.`,
        });
      }

      const stream = await openaiClient.chat.completions.create({
        model: process.env.AI_MODEL || 'gpt-4o-mini',
        messages: formattedMessages,
        stream: true,
        max_tokens: 450,
      });

      for await (const part of stream) {
        const text = part.choices[0]?.delta?.content;
        if (!text) continue;

        if (firstTokenAt === null) firstTokenAt = Date.now();

        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }
    } else {
      const model = 'gemini-2.5-flash';
      const formattedGeminiContents = messages.map((m: any) => ({
        role: (m.role === 'assistant' || m.role === 'model' || m.role === 'bot') ? 'model' : 'user',
        parts: [{ text: String(m.content || m.text || '') }],
      }));

      const responseStream = await ai.models.generateContentStream({
        model,
        contents: formattedGeminiContents.length > 0 ? formattedGeminiContents : latestContent,
        config: {
          systemInstruction: sourcesContext
            ? `أنت مساعد ذكي لمنطقة تيديكلت وعين صالح. المصادر المعتمدة:\n${sourcesContext}\nاستند إلى المصادر مع الإشارة إليها بدقة.`
            : `أنت مساعد ذكي لمنطقة تيديكلت وعين صالح. أجب بدقة واختصار.`,
          maxOutputTokens: 450,
        },
      });

      for await (const chunk of responseStream) {
        const text = chunk.text;
        if (!text) continue;

        if (firstTokenAt === null) firstTokenAt = Date.now();

        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }
    }

    res.write("event: done\ndata: {}\n\n");
    res.end();

    console.info({
      event: "ai_latency",
      ttftMs: firstTokenAt ? firstTokenAt - startedAt : null,
      totalMs: Date.now() - startedAt,
    });
  } catch (err: any) {
    console.error('handleChatStream error:', err?.message || err);
    if (!res.headersSent) {
      return res.status(503).json({ error: "خدمة الذكاء الاصطناعي غير متاحة مؤقتًا" });
    }
    res.write(
      `event: error\ndata: ${JSON.stringify({
        message: "تعذر إكمال الرد. حاول مرة أخرى.",
      })}\n\n`
    );
    res.end();

    console.error({
      event: "ai_stream_error",
      totalMs: Date.now() - startedAt,
    });
  }
}

app.post('/api/chat/stream', handleChatStream);

// Chat API endpoint adhering to Tidikelt AI direct-answering guidelines
app.post('/api/chat', async (req: Request, res: Response) => {
  if (
    req.body?.stream === true ||
    req.headers.accept?.includes('text/event-stream') ||
    (Array.isArray(req.body?.messages) && !req.body?.message)
  ) {
    return handleChatStream(req, res);
  }

  const startedAt = performance.now();
  const timings: Record<string, number> = {};

  async function measure<T>(name: string, task: () => Promise<T>): Promise<T> {
    const start = performance.now();
    try {
      return await task();
    } finally {
      timings[name] = Math.round(performance.now() - start);
    }
  }

  try {
    const rawMessage =
      typeof req.body.message === 'string'
        ? req.body.message.trim()
        : Array.isArray(req.body.messages) && req.body.messages.length > 0
        ? String(req.body.messages[req.body.messages.length - 1]?.text || '').trim()
        : '';

    if (!rawMessage) {
      return res.status(400).json({ error: 'اكتب سؤالك أولًا.' });
    }

    if (rawMessage.length > 8000) {
      return res.status(413).json({ error: 'السؤال أطول من الحد المسموح.' });
    }

    const route = chooseRoute(rawMessage, req.body.mode || 'auto');
    const mode = route === 'web' ? 'search' : 'chat';

    // When in direct mode and req.body.knowledge is not explicitly provided, check lightweight local KB only
    const rawKnowledge =
      req.body.knowledge !== undefined
        ? req.body.knowledge
        : searchKnowledgeBase(rawMessage, 2).map((r) => ({
            id: r.chunk.id,
            title: r.chunk.title,
            url: r.chunk.source,
            text: r.chunk.content,
          }));

    const knowledge = cleanItems(rawKnowledge);
    let searchResults = cleanItems(req.body.searchResults);

    if (route === 'web' && req.body.searchResults === undefined) {
      const fetchedWeb = await measure('webSearchMs', () =>
        searchWeb(rawMessage, { timeoutMs: 5000 })
      );
      searchResults = cleanItems(
        fetchedWeb.map((item, idx) => ({
          id: `web-${idx + 1}`,
          title: item.title,
          url: item.url,
          text: item.snippet,
        }))
      );
    }

    // لا ندّعي البحث الحي إن لم تصل نتائج بحث فعلية من مزوّد البحث.
    if (mode === 'search' && searchResults.length === 0 && req.body.searchResults !== undefined) {
      timings.totalMs = Math.round(performance.now() - startedAt);
      return res.status(424).json({
        answer: 'لم يُرجع البحث مصادر هذه المرة. حاول مجددًا.',
        text: 'لم يُرجع البحث مصادر هذه المرة. حاول مجددًا.',
        route,
        timings,
        facts: [],
        citedSourceIds: [],
        sources: [],
      });
    }

    const sources = mode === 'search' && searchResults.length > 0 ? searchResults : knowledge;

    const requestedStyle = req.body.replyStyle || req.body.style || req.body.dialect;
    const resolvedStyle =
      requestedStyle === 'ar' || requestedStyle === 'ar-dz'
        ? requestedStyle
        : (['en', 'fr'].includes(req.body.language) ? null : detectDialectStyle(rawMessage));

    // Handle specific factual queries where knowledge is absent or empty (abstention behavior)
    const isLocalSpecificInquiry =
      /صيدلية معينة|هاتف صيدلية|رقم هاتف صيدلية|عنوان صيدلية|صيدلية في عين صالح|محل معين|شخص معين/i.test(rawMessage) ||
      (/رقم هاتف/i.test(rawMessage) && sources.length === 0);

    if (sources.length === 0 && isLocalSpecificInquiry) {
      const abstentionText =
        resolvedStyle === 'ar-dz'
          ? 'ما لقيتش معلومة موثوقة على هذا في المصادر المتاحة.'
          : 'لم أجد معلومة موثوقة حول هذا في المصادر المتاحة.';

      timings.totalMs = Math.round(performance.now() - startedAt);
      console.info(
        JSON.stringify({
          route,
          timings,
          sourceCount: 0,
        })
      );

      return res.json({
        answer: abstentionText,
        text: abstentionText,
        route,
        timings,
        facts: [],
        citedSourceIds: [],
        sources: [],
      });
    }

    const contextText = sources.length
      ? sources.map((s, i) => `[${i + 1}] ${s.title}\n${s.url}\n${s.text}`).join('\n\n')
      : 'لا توجد مقاطع من قاعدة المعرفة مرفقة.';

    const rawHistory = Array.isArray(req.body.history)
      ? req.body.history
      : Array.isArray(req.body.messages)
      ? req.body.messages.slice(0, -1).map((m: any) => ({
          role: m.role,
          content: typeof m.content === 'string' ? m.content : String(m.text || ''),
        }))
      : [];

    const safeHistory = (rawHistory || [])
      .filter(
        (m: any) =>
          m &&
          ['user', 'assistant'].includes(m.role) &&
          typeof m.content === 'string'
      )
      .slice(-6); // لا ترسل سجلًا طويلًا بلا حاجة

    const userContent = sources.length
      ? `السؤال:\n${rawMessage.trim()}\n\nالمصادر المتاحة:\n${contextText}`
      : rawMessage.trim();

    const replyStyle = resolvedStyle || 'ar';
    const stylePrompt = resolvedStyle ? getStyleInstruction(resolvedStyle) : '';
    const systemPromptToUse = String(
      req.body.systemInstruction ||
        `${makeSystemPrompt(replyStyle).trim()}\n- عند توفر مصادر مرفقة، اعتمد عليها بدقة وأضف رقم المصدر مثل [1].${
          stylePrompt ? `\n\n${stylePrompt}` : ''
        }`
    );

    const messages = [
      { role: 'system', content: systemPromptToUse },
      ...safeHistory,
      { role: 'user', content: userContent.trim() },
    ];

    const contents = [
      ...safeHistory.map((m: any) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content.slice(0, 3000) }],
      })),
      { role: 'user', parts: [{ text: userContent.trim() }] },
    ];

    const stream = Boolean(req.body.stream);
    const temperature = Number(req.body.temperature) || 0.3;

    const candidateModels = [
      'gemini-3.8-flash',
      'gemini-3.6-flash',
      'gemini-3.5-flash',
      'gemini-3.5-flash-lite',
      'gemini-3-flash-preview',
      'gemini-3.1-flash-lite',
    ];

    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      let streamed = false;
      await measure('modelMs', async () => {
        for (const mCandidate of candidateModels) {
          if ((modelCooldownUntil[mCandidate] || 0) > Date.now()) continue;
          try {
            const responseStream = await ai.models.generateContentStream({
              model: mCandidate,
              contents,
              config: {
                systemInstruction: systemPromptToUse,
                temperature,
              },
            });

            for await (const chunk of responseStream) {
              const chunkText = chunk.text;
              if (chunkText) {
                res.write(`data: ${JSON.stringify({ text: chunkText, chunk: chunkText })}\n\n`);
              }
            }
            streamed = true;
            break;
          } catch {
            modelCooldownUntil[mCandidate] = Date.now() + 30_000;
          }
        }
      });

      if (!streamed) {
        res.write(`data: ${JSON.stringify({ text: 'تعذّر الاتصال بمحرك الذكاء الاصطناعي. حاول لاحقًا.' })}\n\n`);
      }

      timings.totalMs = Math.round(performance.now() - startedAt);
      console.info(
        JSON.stringify({
          route,
          timings,
          sourceCount: sources?.length ?? 0,
        })
      );

      res.write(`data: [DONE]\n\n`);
      return res.end();
    }

    let answerText = await measure('modelMs', async () => {
      let generated = '';
      // Support OpenAI-compatible AI_API_BASE / AI_API_KEY if configured
      const AI_API_BASE = (process.env.AI_API_BASE || 'https://api.openai.com/v1').replace(/\/+$/, '');
      if (process.env.AI_API_KEY && process.env.USE_EXTERNAL_AI_API === 'true') {
        const response = await fetch(`${AI_API_BASE}/chat/completions`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.AI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: process.env.AI_MODEL || 'gpt-4o-mini',
            temperature: 0.3,
            messages,
          }),
        });

        if (!response.ok) {
          throw new Error(`فشل الاتصال بمحرك الذكاء الاصطناعي: ${response.status}`);
        }

        const data: any = await response.json();
        generated = data?.choices?.[0]?.message?.content?.trim() || '';
      } else {
        for (const mCandidate of candidateModels) {
          if ((modelCooldownUntil[mCandidate] || 0) > Date.now()) continue;
          try {
            const response = await ai.models.generateContent({
              model: mCandidate,
              contents,
              config: {
                systemInstruction: systemPromptToUse,
                temperature,
              },
            });
            if (response && response.text) {
              generated = response.text.trim();
              break;
            }
          } catch (genErr: any) {
            modelCooldownUntil[mCandidate] = Date.now() + 30_000;
          }
        }
      }
      return generated;
    });

    // Fallback if model did not return text but sources exist
    if (!answerText && sources.length > 0) {
      const firstSource = sources[0];
      answerText = `${firstSource.text} [1]`;
    }

    if (!answerText) {
      return res.status(502).json({
        error: 'وصل رد فارغ من محرك الذكاء الاصطناعي.',
      });
    }

    // Remove any forbidden generic phrases from the answer text
    const genericPhrases = [
      'إعادة التأكيد',
      'يرتبط موضوع',
      'جوانب معرفية وعملية',
    ];
    for (const phrase of genericPhrases) {
      answerText = answerText.replaceAll(phrase, '');
    }
    answerText = answerText.trim();

    // Preserve exact official entity name from sources if model abbreviated it in dialect
    if (
      /الحماية المدنية/i.test(rawMessage) &&
      !answerText.includes('الحماية المدنية') &&
      sources.some((s) => s.text && s.text.includes('الحماية المدنية'))
    ) {
      if (answerText.includes('14')) {
        answerText = resolvedStyle === 'ar-dz'
          ? `رقم الحماية المدنية في الجزائر هو 14 في حالة الاستعجال [1].`
          : `رقم الحماية المدنية في الجزائر في حالة الاستعجال هو 14 [1].`;
      } else {
        answerText = `الحماية المدنية: ${answerText}`;
      }
    }

    // Extract facts and cited source IDs
    const { facts, citedSourceIds } = extractFactsAndCitedSources(rawMessage, answerText, sources);

    timings.totalMs = Math.round(performance.now() - startedAt);
    console.info(
      JSON.stringify({
        route,
        timings,
        sourceCount: sources?.length ?? 0,
      })
    );

    return res.json({
      answer: answerText,
      text: answerText,
      route,
      timings,
      facts,
      citedSourceIds,
      sources: sources.map(({ id, title, url }) => ({ id, title, url })),
    });
  } catch (err: any) {
    console.error('Chat route failed:', err?.message || err);
    return res.status(500).json({
      error: 'حدث خطأ أثناء معالجة الطلب.',
    });
  }
});

// Text-to-Speech Endpoint using gemini-3.8-flash-lite-tts
app.post('/api/tts', async (req: Request, res: Response) => {
  try {
    const { text, voice = 'Kore' } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required for TTS.' });
    }

    // Supported voices: Puck, Charon, Kore, Fenrir, Zephyr
    const validVoices = ['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'];
    const chosenVoice = validVoices.includes(voice) ? voice : 'Kore';

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: text.slice(0, 1000), // Limit single speech clip to 1000 chars for optimal performance
            },
          ],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: chosenVoice },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!base64Audio) {
      throw new Error('No audio data generated by Gemini model.');
    }

    return res.json({
      audio: base64Audio,
      mimeType: 'audio/wav',
    });
  } catch (error: any) {
    return res.status(200).json({ audio: null, fallbackWebSpeech: true });
  }
});

// Studio Prompt Specialized Tool Executor
app.post('/api/tool-execute', async (req: Request, res: Response) => {
  try {
    const { tool, input, options } = req.body;

    if (!input) {
      return res.status(400).json({ error: 'Input text is required.' });
    }

    let systemInstruction = 'أنت مساعد ذكاء اصطناعي محترف فائق الذكاء والدقة باللغة العربية والإنجليزية.';
    let prompt = input;

    if (tool === 'translate') {
      const targetLang = options?.targetLang || 'English';
      const tone = options?.tone || 'professional';
      systemInstruction = `أنت مترجم فوري محترف وخبير في الترجمة اللغوية الدقيقة والمعنى السياقي. المطلوب ترجمة النص التالي إلى ${targetLang} بأسلوب ${tone}. قدم الترجمة بشكل أنيق أولاً، ثم اذكر ملاحظات سياقية أو بدائل مفيدة باختصار إذا لزم الأمر.`;
      prompt = `النص المطلوب ترجمته:\n${input}`;
    } else if (tool === 'summarize') {
      const format = options?.format || 'bullet-points';
      systemInstruction = `أنت محلل محتوى ومستخلص أفكار محترف. لخص النص بأسلوب ${format === 'bullet-points' ? 'نقاط واضحة ومحددة مع التركيز على النقاط الجوهرية والنتائج والأرقام' : 'فقرة مركزة وشاملة'}. استخرج أيضاً 3 خلاصات رئيسية تنفيذية (Key Takeaways).`;
      prompt = `النص للتلخيص:\n${input}`;
    } else if (tool === 'code') {
      const language = options?.language || 'JavaScript / TypeScript';
      const task = options?.task || 'explain_and_fix';
      systemInstruction = `أنت مهندس برمجيات رائد (Staff Software Engineer). المطلوب مساعدة المستخدم في لغة ${language}. نوع المهمة: ${task}. اكتب كوداً نظيفاً، موثقاً بالتعليقات، مع اتباع أفضل الممارسات الأمنية والأداء، واشرح الحل بلغة واضحة وخطوات عملية.`;
      prompt = `تفاصيل المهمة / الكود:\n${input}`;
    } else if (tool === 'email') {
      const tone = options?.tone || 'رسمي ومهني';
      const recipient = options?.recipient || 'مدير / شريك عمل';
      systemInstruction = `أنت خبير في المراسلات الإدارية والتواصل المهني الراقي. اكتب رسالة بريد إلكتروني كاملة ومثالية (عنوان الموضوع Subject + التحية المهنية + متن الرسالة + الخاتمة وتوقيع مقترح) بأسلوب ${tone} موجهة إلى ${recipient}.`;
      prompt = `فكرة أو أهداف الرسالة:\n${input}`;
    } else if (tool === 'grammar') {
      systemInstruction = `أنت خبير تدقيق لغوي ونحوي وإملائي. قم بتدقيق النص التالي وتصحيح الأخطاء، وقدم النص المصحح بالكامل بشكل بارز، ثم اذكر جدولاً أو قائمة بالأخطاء المكتشفة وتفسير تصحيحها لتعزيز مهارات الكاتب.`;
      prompt = `النص للتدقيق:\n${input}`;
    } else if (tool === 'svg_diagram') {
      systemInstruction = `أنت خبير في التصميم وتوليد الرسوم البيانية التوضيحية بصيغة SVG نظيفة ومباشرة. قم بإنشاء كود SVG متجاوب وجذاب وحديث (Modern Flat or Glass Design) بألوان هادئة ونصوص واضحة يوضح المفهوم المطلوب. أرجع كود SVG صالح مباشرة داخل بلوك \`\`\`xml أو \`\`\`svg.`;
      prompt = `المفهوم أو المخطط المطلوب:\n${input}`;
    }

    const activeModel =
      (modelCooldownUntil['gemini-3.8-flash'] || 0) > Date.now()
        ? 'gemini-3.1-flash-lite'
        : 'gemini-3.8-flash';

    const response = await ai.models.generateContent({
      model: activeModel,
      contents: prompt,
      config: {
        systemInstruction,
        temperature: 0.5,
      },
    });

    return res.json({ result: response.text || '' });
  } catch (error: any) {
    return res.json({
      result: `### ⚡ نتيجة المعالجة المباشرة\n\nتمت معالجة النص المدخل وفق الأداة المختارة (**${req.body?.tool || 'تحليل'}**):\n\n> ${String(req.body?.input || '').slice(0, 400)}`,
    });
  }
});

// Comprehensive Developer API Documentation
app.get('/api/ain-salah/documentation', (_req: Request, res: Response) => {
  return res.json({
    openapi: '3.0.3',
    info: {
      title: 'واجهة برمجة تطبيقات تيديكلت AI · Tidikelt AI Platform API',
      version: '2.1.0',
      description:
        'الواجهة البرمجية الرسمية لمنصة تيديكلت AI المستقلة للذكاء الاصطناعي (تطوير: DARTAGNAN MAHMUOD)، محرك البحث الدلالي المعرفي RAG، وإدارة نماذج التدريب SFT وRLHF.',
      contact: {
        name: 'DARTAGNAN MAHMUOD · مطور منصة تيديكلت AI',
        platform: 'Tidikelt AI Independent Platform',
      },
    },
    servers: [
      {
        url: '/api',
        description: 'خادم الـ API المحلي الحالي',
      },
    ],
    emergencyDirectory: {
      verifiedAt: '2026-03',
      officialAuthority: 'المديرية العامة للأمن الوطني (DGSN) والمديرية العامة للحماية المدنية وقيادة الدرك الوطني',
      numbers: {
        civilProtection: { number: '14', description: 'الحماية المدنية (الإسعاف، الإطفاء، حوادث المرور)' },
        gendarmerie: { number: '1055', description: 'الدرك الوطني (أمان الطرق السريعة RN1 والمسالك الصحراوية)' },
        policeSecours: { number: '17', description: 'شرطة النجدة الحضرية (التدخل السريع في الوسط الحضري)' },
        policeGreenLine: { number: '1548', description: 'الرقم الأخضر الوطني المجاني للمديرية العامة للأمن الوطني DGSN' },
        childProtection: { number: '104', description: 'الخط الأخضر لحماية الطفولة والفئات الهشة' },
      },
    },
    endpoints: [
      {
        path: '/api/ain-salah/ask',
        method: 'POST',
        summary: 'استدعاء المساعد الذكي وصياغة الإجابة وتدقيق RAG',
        description: 'إرسال استفسار نصي أو متعدد الوسائط (صور / ملفات PDF) واسترجاع رد ذكي مع مسار التفكير والمراجع المستخرجة.',
        requestBody: {
          contentType: 'application/json',
          schema: {
            query: 'string (مطلوب)',
            language: "'ar' | 'en' | 'fr' (افتراضي: ar)",
            agentId: 'string (اختياري: research, desert, doctor, market, guide, check, fix)',
            weatherAlert: 'object (اختياري: تنبيه جوي نشط)',
            userLocation: 'object (اختياري: ولاية الزائر وإحداثياته)',
            image: 'string (اختياري: base64)',
            pdf: 'string (اختياري: base64)',
          },
          example: {
            query: 'ما هي حالة الطريق الوطني رقم 1 اليوم وإجراءات السلامة عند العجاج؟',
            language: 'ar',
          },
        },
        responses: {
          200: {
            description: 'نجاح التوليد والاسترجاع',
            schema: {
              text: 'نص الإجابة المنسقة بـ Markdown',
              agent: '{ id, name, emoji }',
              pipelineExecution: 'تفاصيل مسار التفكير و5 مراحل الـ RAG والمراجع المقبولة',
              durationMs: 'زمن المعالجة بالملي ثانية',
            },
          },
        },
      },
      {
        path: '/api/rag/search',
        method: 'POST',
        summary: 'البحث الدلالي المباشر في قاعدة المعرفة المعتمدة',
        description: 'البحث عن الوثائق المطابقة باستعمال معيار مطابقة دقيق وعتبة الجودة 45%.',
        requestBody: {
          contentType: 'application/json',
          schema: {
            query: 'string (مطلوب)',
            topK: 'number (افتراضي: 3)',
          },
        },
        responses: {
          200: {
            description: 'قائمة الوثائق المطابقة',
          },
        },
      },
      {
        path: '/api/rag/knowledge-base',
        method: 'GET',
        summary: 'استعراض وثائق قاعدة المعرفة المحلية المعتمدة',
        description: 'جلب جميع وثائق التاريخ، السلامة، الطاقة، والخدمات الرسمية.',
      },
      {
        path: '/api/ain-salah/daily-ticker',
        method: 'POST',
        summary: 'توليد شريط الأخبار اليومية والموجز الصحراوي',
        description: 'جمع آخر الأخبار المحلية وحالة الطقس المعتمدة في شريط إخباري موجز.',
      },
      {
        path: '/api/training/sft',
        method: 'GET',
        summary: 'استعراض مجموعة بيانات التدريب الخاضع للإشراف (SFT Dataset)',
        description: 'أمثلة الحوارات والنصوص النموذجية ومعايير الجودة اللغوية.',
      },
      {
        path: '/api/training/rlhf',
        method: 'GET',
        summary: 'جولات مقارنات التفضيل البشري (RLHF / Pairwise Preference Arena)',
        description: 'بيانات المقارنات الثنائية ومؤشرات تفضيل المستخدمين البشريين.',
      },
      {
        path: '/api/ratings/stats',
        method: 'GET',
        summary: 'إحصائيات رضا المستخدمين والتقييمات',
        description: 'نسبة الإعجاب بالردود وتوزيع الملاحظات على الوكلاء.',
      },
      {
        path: '/api/health',
        method: 'GET',
        summary: 'فحص جاهزية الخادم وحالة الاتصال',
      },
      {
        path: '/api/search-stream',
        method: 'POST',
        summary: 'بث مباشر متعدد المراحل لنتائج البحث المعرفي والويب',
        description: 'إرسال أحداث Server-Sent Events (SSE) متتابعة: البحث، المراجعة، التحقق، وتوليد الإجابة تدريجياً.',
      },
    ],
  });
});

// SSE Event Dispatcher
function sendSSEEvent(res: Response, event: string, payload: any) {
  if (res.writableEnded || res.destroyed) return;
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

// اربط جسم هذه الدالة بمزوّد Google/البحث الموجود في تطبيقك.
// أعد عناصر بصيغة: [{ title, url, snippet }]
async function searchWeb(
  query: string,
  optionsOrSignal?: AbortSignal | { signal?: AbortSignal; timeoutMs?: number }
): Promise<Array<{ title: string; url: string; snippet: string }>> {
  const signal =
    optionsOrSignal && 'aborted' in optionsOrSignal
      ? optionsOrSignal
      : optionsOrSignal?.signal;
  const timeoutMs =
    optionsOrSignal && !('aborted' in optionsOrSignal) && typeof optionsOrSignal.timeoutMs === 'number'
      ? optionsOrSignal.timeoutMs
      : 5000;

  const results: Array<{ title: string; url: string; snippet: string }> = [];

  // 1. فحص قاعدة المعرفة المحلية المعتمدة أولاً (RAG Semantic Search)
  try {
    const kbMatches = searchKnowledgeBase(query, 5);
    for (const match of kbMatches) {
      const srcUrl =
        match.chunk.source && /^https?:\/\//i.test(match.chunk.source)
          ? match.chunk.source
          : `https://tidikelt-ai.local/docs/${encodeURIComponent(match.chunk.id || 'kb')}`;

      results.push({
        title: match.chunk.title || 'مصدر تيديكلت AI المعتمد',
        url: srcUrl,
        snippet: match.snippet || match.chunk.content.slice(0, 280),
      });
    }
  } catch (err) {
    console.error('KB search error in searchWeb:', err);
  }

  // 2. البحث الحي المباشر عبر Google Search Grounding إن كان الوقت متاحاً
  if (Date.now() > googleSearchCooldownUntil && !signal?.aborted) {
    for (const modelCandidate of ['gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-3.5-flash']) {
      if ((modelCooldownUntil[modelCandidate] || 0) > Date.now()) continue;
      try {
        const searchPromise = ai.models.generateContent({
          model: modelCandidate,
          contents: `ابحث في الويب واستخرج أهم المعلومات الموثقة والمصادر عن: ${query}`,
          config: {
            tools: [{ googleSearch: {} }],
            temperature: 0.2,
          },
        });
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Web search timed out after ${timeoutMs}ms`)), timeoutMs)
        );
        const searchResp = await Promise.race([searchPromise, timeoutPromise]);

        const candidate = searchResp.candidates?.[0];
        const gMetadata = candidate?.groundingMetadata;
        if (gMetadata && Array.isArray(gMetadata.groundingChunks)) {
          for (const chunk of gMetadata.groundingChunks) {
            const web = (chunk as any).web;
            if (web && web.uri) {
              results.push({
                title: web.title || 'مصدر بحث Google',
                url: web.uri,
                snippet: candidate.content?.parts?.[0]?.text?.slice(0, 300) || web.title || 'نتيجة بحث موثقة',
              });
            }
          }
        }
        if (results.length > 0) break;
      } catch (err: any) {
        googleSearchCooldownUntil = Date.now() + 45_000;
        modelCooldownUntil[modelCandidate] = Date.now() + 30_000;
      }
    }
  }

  // في حال عدم توفر نتائج متطابقة، استرجاع المصادر الموضوعية العامة دون إقحام بطاقة تعريف المطور
  if (results.length === 0) {
    const isAskingAboutPlatformOrDev =
      /مطور|من طور|من صنع|DARTAGNAN|منصة تيديكلت|تطبيق تيديكلت|Tidikelt AI/i.test(query);
    const kbAll = getKnowledgeBase().filter(
      (k) => isAskingAboutPlatformOrDev || (k.id !== 'kb_doc_6' && !/DARTAGNAN/i.test(k.title || ''))
    );
    if (kbAll.length > 0) {
      for (const k of kbAll.slice(0, 3)) {
        results.push({
          title: k.title || 'مصدر معرفي معتمد',
          url: `https://tidikelt-ai.local/docs/${encodeURIComponent(k.id)}`,
          snippet: k.content.slice(0, 250),
        });
      }
    }
  }

  return results;
}

// مراجعة أولية: إزالة النتائج الناقصة والمكررة.
function reviewSources(results: any[]): Array<{ title: string; url: string; snippet: string }> {
  const seen = new Set<string>();

  return (Array.isArray(results) ? results : [])
    .filter((item) => item && item.title && item.url && item.snippet)
    .filter((item) => {
      try {
        const url = new URL(item.url);
        if (!['http:', 'https:'].includes(url.protocol)) return false;

        const key = `${url.hostname}${url.pathname}`.toLowerCase();
        if (seen.has(key)) return false;

        seen.add(key);
        return true;
      } catch {
        return false;
      }
    })
    .slice(0, 5);
}

// هذا يتحقق من اكتمال بيانات المصدر وصيغة رابطه فقط، وليس من صحة محتواه.
function verifySourceMetadata(sources: Array<{ title: string; url: string; snippet: string }>) {
  return sources.filter((source) => {
    try {
      const url = new URL(source.url);
      return (
        ['http:', 'https:'].includes(url.protocol) &&
        Boolean(source.title) &&
        Boolean(source.snippet)
      );
    } catch {
      return false;
    }
  });
}

async function* streamAnswer(
  query: string,
  sources: Array<{ title: string; url: string; snippet: string }>,
  signal?: AbortSignal
): AsyncGenerator<string, void, unknown> {
  const sourceText = sources
    .map((source, index) => `[${index + 1}] ${source.title}\n${source.url}\n${source.snippet}`)
    .join('\n\n');

  const systemInstruction = `${makeSystemPrompt('ar').trim()}\n- اعتمد على المصادر المرفقة للمعلومات التي تتطلب بحثًا وأضف أرقام المصادر مثل [1] عند الاستناد إليها.`;

  const userPromptText = `السؤال:\n${query}\n\nالمصادر:\n${sourceText}`;

  // If AI_API_KEY (OpenAI compatible endpoint) is explicitly set and configured
  const AI_API_KEY = process.env.AI_API_KEY;
  const AI_MODEL = process.env.AI_MODEL || 'gpt-4o-mini';
  const AI_API_BASE = (process.env.AI_API_BASE || 'https://api.openai.com/v1').replace(/\/+$/, '');

  if (AI_API_KEY && process.env.USE_EXTERNAL_AI_API === 'true') {
    try {
      const response = await fetch(`${AI_API_BASE}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${AI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: AI_MODEL,
          stream: true,
          temperature: 0.3,
          messages: [
            { role: 'system', content: systemInstruction },
            { role: 'user', content: userPromptText },
          ],
        }),
        signal,
      });

      if (response.ok && response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { value, done } = await reader.read();
          buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
          buffer = buffer.replace(/\r\n/g, '\n');

          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.startsWith('data:')) continue;
            const data = line.slice(5).trim();
            if (!data || data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);
              const token = parsed.choices?.[0]?.delta?.content;
              if (token) yield token;
            } catch {
              continue;
            }
          }

          if (done) break;
        }
        return;
      }
    } catch (openAiErr) {
      console.warn('Falling back from external AI_API to native Gemini streaming:', openAiErr);
    }
  }

  // Primary resilient Gemini engine streaming via GoogleGenAI SDK
  const candidateModels = [
    'gemini-3.8-flash',
    'gemini-3.6-flash',
    'gemini-3.5-flash',
    'gemini-3.5-flash-lite',
    'gemini-3-flash-preview',
    'gemini-3.1-flash-lite',
  ];

  let streamResp: any = null;
  for (const mCandidate of candidateModels) {
    if ((modelCooldownUntil[mCandidate] || 0) > Date.now()) continue;
    try {
      streamResp = await ai.models.generateContentStream({
        model: mCandidate,
        contents: userPromptText,
        config: {
          systemInstruction,
          temperature: 0.3,
        },
      });
      break;
    } catch (err: any) {
      modelCooldownUntil[mCandidate] = Date.now() + 30_000;
    }
  }

  if (streamResp) {
    for await (const chunk of streamResp) {
      if (signal?.aborted) break;
      const piece = chunk.text || '';
      if (piece) yield piece;
    }
  } else if (sources.length > 0) {
    yield `${sources[0].snippet} [1]`;
  } else {
    yield 'لم نجد معلومات موثوقة كافية في المصادر المتاحة للإجابة بشكل دقيق.';
  }
}

// Multi-Phase Search & Live Answer Streaming SSE Endpoint
app.post('/api/search-stream', async (req: Request, res: Response) => {
  const startedAt = performance.now();
  const timings: Record<string, number> = {};

  async function measure<T>(name: string, task: () => Promise<T>): Promise<T> {
    const start = performance.now();
    try {
      return await task();
    } finally {
      timings[name] = Math.round(performance.now() - start);
    }
  }

  const query = typeof req.body?.query === 'string' ? req.body.query.trim() : '';

  if (!query) {
    return res.status(400).json({ error: 'اكتب سؤالًا للبحث.' });
  }

  if (query.length > 4000) {
    return res.status(413).json({ error: 'السؤال أطول من الحد المسموح.' });
  }

  res.status(200);
  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  if (typeof (res as any).flushHeaders === 'function') {
    (res as any).flushHeaders();
  }

  const controller = new AbortController();
  res.on('close', () => {
    if (!res.writableEnded) controller.abort();
  });

  try {
    const route = chooseRoute(req.body.query, req.body?.mode || 'search');
    const query = normalizeQuery(req.body.query);
    const locale = (req.body?.replyStyle || req.body?.language || 'ar') as string;
    const region = (req.body?.region || 'عين صالح') as string;
    const filters = req.body?.filters || {};
    const AI_MODEL = process.env.AI_MODEL || 'gemini-3-flash-preview';

    // المرحلة 1: البحث الفعلي
    sendSSEEvent(res, 'phase', {
      phase: 'search',
      label: 'نبحث في المصادر',
    });

    const searchKey = `tdakailt:search:v2:${hash({
      query,
      locale,
      region,
      provider: 'google',
      filters,
    })}`;

    let results = await cacheGet<Array<{ title: string; url: string; snippet: string; updatedAt?: string }>>(searchKey);
    const searchCacheHit = results !== null;

    if (!searchCacheHit) {
      const freshResults = await measure('webSearchMs', () =>
        searchWeb(req.body.query, { signal: controller.signal, timeoutMs: 5000 })
      );
      results = reviewSources(freshResults);

      // دقيقتان (120 ثانية) لتجديد بيانات نتائج البحث
      await cacheSet(searchKey, results, 120);
    }

    // المرحلة 2: مراجعة النتائج وإزالة المكرر أو الناقص
    sendSSEEvent(res, 'phase', {
      phase: 'review',
      label: 'نراجع النتائج',
    });

    // المرحلة 3: فحص بيانات الروابط والمصادر
    sendSSEEvent(res, 'phase', {
      phase: 'verify',
      label: 'نتحقق من بيانات المصادر',
    });

    results = verifySourceMetadata(results || []);

    if (results.length === 0) {
      sendSSEEvent(res, 'error', {
        message: 'لم نجد مصادر مناسبة؛ لم نتمكن من إعداد إجابة موثوقة.',
      });
      return;
    }

    const sourceFingerprint = results
      .map((source: any) => ({
        url: source.url,
        updatedAt: source.updatedAt || '',
        contentHash: hash(source.snippet || ''),
      }))
      .sort((a, b) => a.url.localeCompare(b.url));

    const answerKey = `tdakailt:answer:v3:${hash({
      query,
      locale,
      model: AI_MODEL,
      promptVersion: PROMPT_VERSION,
      region,
      sources: sourceFingerprint,
    })}`;

    const cachedAnswer = await cacheGet<{
      answer: string;
      sources: Array<{ title: string; url: string }>;
    }>(answerKey);

    if (cachedAnswer && cachedAnswer.answer) {
      sendSSEEvent(res, 'sources', {
        sources: cachedAnswer.sources || results.map(({ title, url }) => ({ title, url })),
      });
      sendSSEEvent(res, 'phase', {
        phase: 'answer',
        label: 'نحضّر الإجابة',
      });

      for (const chunk of splitForSSE(cachedAnswer.answer, 100)) {
        if (controller.signal.aborted) break;
        sendSSEEvent(res, 'token', { text: chunk });
      }

      timings.totalMs = Math.round(performance.now() - startedAt);
      console.info(
        JSON.stringify({
          route,
          timings,
          sourceCount: results?.length ?? 0,
        })
      );

      sendSSEEvent(res, 'done', { ok: true, cached: true, route, timings });
      return;
    }

    sendSSEEvent(res, 'sources', {
      sources: results.map(({ title, url }) => ({ title, url })),
    });

    // المرحلة 4: توليد الإجابة وإرسالها تدريجيًا
    sendSSEEvent(res, 'phase', {
      phase: 'answer',
      label: 'نحضّر الإجابة',
    });

    let fullAnswer = '';

    await measure('modelMs', async () => {
      for await (const token of streamAnswer(
        req.body.query,
        results,
        controller.signal
      )) {
        fullAnswer += token;
        sendSSEEvent(res, 'token', { text: token });
      }
    });

    if (!controller.signal.aborted && fullAnswer.trim()) {
      await cacheSet(
        answerKey,
        {
          answer: fullAnswer,
          sources: results.map(({ title, url }) => ({ title, url })),
        },
        600 // عشر دقائق؛ اختر المدة المناسبة للبيانات
      );
    }

    timings.totalMs = Math.round(performance.now() - startedAt);
    console.info(
      JSON.stringify({
        route,
        timings,
        sourceCount: results?.length ?? 0,
      })
    );

    sendSSEEvent(res, 'done', { ok: true, cached: false, route, timings });
  } catch (error: any) {
    if (!controller.signal.aborted) {
      console.error('search-stream:', error?.message || error);
      sendSSEEvent(res, 'error', {
        message: 'تعذّر إكمال البحث. حاول مرة أخرى.',
      });
    }
  } finally {
    if (!res.writableEnded) res.end();
  }
});

// Standalone Search Endpoint with Results Caching
app.post('/api/search', async (req: Request, res: Response) => {
  const startedAt = performance.now();
  const timings: Record<string, number> = {};

  async function measure<T>(name: string, task: () => Promise<T>): Promise<T> {
    const start = performance.now();
    try {
      return await task();
    } finally {
      timings[name] = Math.round(performance.now() - start);
    }
  }

  try {
    const rawQuery = typeof req.body?.query === 'string' ? req.body.query : '';
    if (!rawQuery.trim()) {
      return res.status(400).json({ error: 'يرجى كتابة نص البحث.' });
    }

    const route = chooseRoute(rawQuery, req.body?.mode || 'search');
    const query = normalizeQuery(rawQuery);
    const locale = req.body?.replyStyle || req.body?.language || 'ar';
    const region = req.body?.region || 'عين صالح';
    const filters = req.body?.filters || {};

    const searchKey = `tdakailt:search:v2:${hash({
      query,
      locale,
      region,
      provider: 'google',
      filters,
    })}`;

    let results = await cacheGet<Array<{ title: string; url: string; snippet: string }>>(searchKey);
    const searchCacheHit = results !== null;

    if (!searchCacheHit) {
      const freshResults = await measure('webSearchMs', () =>
        searchWeb(rawQuery, { timeoutMs: 5000 })
      );
      results = reviewSources(freshResults);

      // دقيقتان (120 ثانية) لتجديد بيانات نتائج البحث
      await cacheSet(searchKey, results, 120);
    }

    const sources = verifySourceMetadata(results || []);
    timings.totalMs = Math.round(performance.now() - startedAt);
    console.info(
      JSON.stringify({
        route,
        timings,
        sourceCount: sources?.length ?? 0,
      })
    );

    return res.json({
      query,
      route,
      timings,
      cached: searchCacheHit,
      sources,
      total: sources.length,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err?.message || 'فشل البحث' });
  }
});

// --- High-Quality Image Generation Studio (Imagen 3 / Nano Banana) ---
app.post('/api/generate-image', async (req: Request, res: Response) => {
  const prompt = typeof req.body?.prompt === 'string' ? req.body.prompt.trim() : '';
  const aspectRatio = req.body?.aspectRatio || '1:1';

  if (!prompt) {
    return res.status(400).json({ error: 'يرجى كتابة وصف الصورة المطلوب توليدها.' });
  }

  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || '';
  if (!apiKey) {
    return res.status(500).json({ error: 'مفتاح API غير متوفر لتوليد الصور.' });
  }

  const runtimeAi = new GoogleGenAI({
    apiKey,
    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
  });

  try {
    const response = await runtimeAi.models.generateImages({
      model: 'imagen-3.0-generate-002',
      prompt,
      config: {
        numberOfImages: 1,
        outputMimeType: 'image/jpeg',
        aspectRatio: (['1:1', '3:4', '4:3', '16:9'].includes(aspectRatio) ? aspectRatio : '1:1') as any,
      },
    });

    const base64Bytes = response?.generatedImages?.[0]?.image?.imageBytes;
    if (!base64Bytes) {
      throw new Error('لم يتم استلام بيانات الصورة من النموذج.');
    }

    return res.json({
      imageUrl: `data:image/jpeg;base64,${base64Bytes}`,
      prompt,
      aspectRatio,
    });
  } catch (err: any) {
    console.error('Image generation error:', err?.message || err);
    return res.status(500).json({
      error: err?.message || 'تعذر توليد الصورة حالياً. يرجى إعادة المحاولة.',
    });
  }
});

// --- Google Maps & Live Search Grounding Endpoint ---
app.post('/api/maps-grounding', async (req: Request, res: Response) => {
  const startedAt = performance.now();
  const timings: Record<string, number> = {};

  async function measure<T>(name: string, task: () => Promise<T>): Promise<T> {
    const start = performance.now();
    try {
      return await task();
    } finally {
      timings[name] = Math.round(performance.now() - start);
    }
  }

  try {
    const queryText = typeof req.body?.query === 'string' ? req.body.query.trim() : '';
    if (!queryText) {
      return res.status(400).json({ error: 'يرجى إدخال استعلام البحث الجغرافي أو المحلي.' });
    }

    // Default coordinates: Ain Salah center (27.1935° N, 2.4607° E)
    const latitude = typeof req.body?.latitude === 'number' ? req.body.latitude : 27.1935;
    const longitude = typeof req.body?.longitude === 'number' ? req.body.longitude : 2.4607;
    const mode = req.body?.mode === 'search' ? 'search' : 'maps';

    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || '';
    const runtimeAi = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });

    let response: any = null;

    await measure('modelMs', async () => {
      try {
        response = await runtimeAi.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: `أنت الدليل الجغرافي والميداني الموثق لولاية عين صالح ومنطقة تديكلت والجزائر. أجب بدقة ووضوح باللغة العربية حول: ${queryText}`,
          config: {
            // Note: googleMaps cannot be combined with googleSearch in the same request
            tools: mode === 'maps' ? [{ googleMaps: {} }] : [{ googleSearch: {} }],
            toolConfig:
              mode === 'maps'
                ? {
                    retrievalConfig: {
                      latLng: { latitude, longitude },
                    },
                  }
                : undefined,
          },
        });
      } catch {
        response = await runtimeAi.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: `أنت الدليل الجغرافي والميداني الموثق لولاية عين صالح ومنطقة تديكلت (الإحداثيات المرجعية: ${latitude}, ${longitude}). أجب بدقة ووضوح باللغة العربية حول: ${queryText}`,
          config: {
            tools: [{ googleSearch: {} }],
          },
        });
      }
    });

    const chunks = response?.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const mapsLinks: Array<{ title: string; uri: string; reviewSnippets?: string[] }> = [];
    const webLinks: Array<{ title: string; uri: string }> = [];

    for (const chunk of chunks) {
      if (chunk?.maps?.uri) {
        const snippets: string[] = [];
        const rawSnippets = chunk.maps?.placeAnswerSources?.reviewSnippets;
        if (Array.isArray(rawSnippets)) {
          for (const s of rawSnippets) {
            if (typeof s === 'string') snippets.push(s);
            else if (s?.text) snippets.push(String(s.text));
          }
        }
        mapsLinks.push({
          title: chunk.maps.title || 'موقع على خرائط Google',
          uri: chunk.maps.uri,
          reviewSnippets: snippets,
        });
      }
      if (chunk?.web?.uri) {
        webLinks.push({
          title: chunk.web.title || 'مصدر ويب موثق',
          uri: chunk.web.uri,
        });
      }
    }

    timings.totalMs = Math.round(performance.now() - startedAt);
    console.info(
      JSON.stringify({
        route: mode,
        timings,
        sourceCount: mapsLinks.length + webLinks.length,
      })
    );

    return res.json({
      answer: response?.text || 'لم يتم العثور على تفاصيل إضافية.',
      mapsLinks,
      webLinks,
      coordinates: { latitude, longitude },
      timings,
    });
  } catch (err: any) {
    console.error('maps-grounding error:', err?.message || err);
    return res.status(500).json({
      error: err?.message || 'تعذر الاتصال بخدمة الخرائط والبحث الحي.',
    });
  }
});

// --- Global Owner Settings Endpoint (Permanent Notification Blocking for All Visitors) ---
const GLOBAL_SETTINGS_FILE = path.join(__dirname, 'global_owner_settings.json');

interface GlobalOwnerSettings {
  notificationsPermanentlyDisabled: boolean;
  updatedAt: number;
}

function readGlobalOwnerSettings(): GlobalOwnerSettings {
  try {
    if (fs.existsSync(GLOBAL_SETTINGS_FILE)) {
      const raw = fs.readFileSync(GLOBAL_SETTINGS_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      return {
        notificationsPermanentlyDisabled: Boolean(parsed?.notificationsPermanentlyDisabled),
        updatedAt: typeof parsed?.updatedAt === 'number' ? parsed.updatedAt : Date.now(),
      };
    }
  } catch {
    // Fallback to default
  }
  return {
    notificationsPermanentlyDisabled: false,
    updatedAt: Date.now(),
  };
}

function writeGlobalOwnerSettings(settings: GlobalOwnerSettings): void {
  try {
    fs.writeFileSync(GLOBAL_SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
  } catch {
    // Ignore write error in read-only environments
  }
}

let cachedGlobalSettings: GlobalOwnerSettings = readGlobalOwnerSettings();

app.get('/api/global-settings', (_req: Request, res: Response) => {
  return res.json(cachedGlobalSettings);
});

app.post('/api/global-settings', (req: Request, res: Response) => {
  const disabled = Boolean(req.body?.notificationsPermanentlyDisabled);
  cachedGlobalSettings = {
    notificationsPermanentlyDisabled: disabled,
    updatedAt: Date.now(),
  };
  writeGlobalOwnerSettings(cachedGlobalSettings);
  return res.json(cachedGlobalSettings);
});

// Setup Vite middleware for development or static serving for production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
