import fs from 'fs';
import path from 'path';
import type { Request, Response } from 'express';
import type express from 'express';
import { GoogleGenAI } from '@google/genai';

/*
 * مثال خادمي مستقل لمنطق «مستجدات وأخبار المجتمع».
 * يتطلب ربط الدوال بقاعدة بيانات المشروع، ونظام المصادقة، ومزوّد الذكاء الاصطناعي.
 * لا تضع مفاتيح API في المتصفح.
 */

export type Role = "member" | "moderator" | "owner";
export type PostStatus = "pending_review" | "published" | "rejected" | "removed";
export type PostCategory =
  | "local_daily"
  | "invitation"
  | "condolence"
  | "services"
  | "roads"
  | "health"
  | "education"
  | "weather"
  | "community"
  | "other";
export type ModerationDecision = "allow" | "review" | "block";

export interface Actor {
  id: string;
  role: Role;
  name?: string;
  photoUrl?: string;
}

export interface ModerationResult {
  decision: ModerationDecision;
  category: PostCategory;
  reasons: string[];
  needsSource: boolean;
  // وصف مختصر للمشرف فقط، لا يُعرض كحقيقة مثبتة للمستخدمين.
  moderatorNote?: string;
}

export interface NewsPostInput {
  text: string;
  category: PostCategory;
  sourceUrl?: string;
  location?: string;
  authorName?: string;
  authorPhotoUrl?: string;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  mediaName?: string;
}

export interface NewsPost {
  id: string;
  authorId: string;
  authorName?: string | null;
  authorPhotoUrl?: string | null;
  text: string;
  category: PostCategory;
  sourceUrl?: string | null;
  location?: string | null;
  status: PostStatus;
  createdAt: Date;
  officialVerified: boolean;
  verifiedUntil?: Date | null;
  likeCount: number;
  commentCount: number;
  repostCount: number;
  uniqueEngagers: number;
  uniqueReports: number;
  mediaUrl?: string | null;
  mediaType?: 'image' | 'video' | null;
  mediaName?: string | null;
  moderatorNote?: string | null;
}

/*
 * واجهة مجردة للمخزن. اربطها باستعلامات PostgreSQL/ORM الخاص بتطبيقك.
 * كل دوال الإدارة يجب أن تتحقق من الصلاحيات على الخادم، لا في الواجهة فقط.
 */
export interface NewsStore {
  createPost(input: Omit<NewsPost, "id" | "createdAt" | "likeCount" | "commentCount" | "repostCount" | "uniqueEngagers" | "uniqueReports" | "officialVerified" | "verifiedUntil">): Promise<NewsPost>;
  updatePostStatus(postId: string, status: PostStatus, moderatorId: string, note?: string): Promise<void>;
  saveModeration(postId: string, result: ModerationResult): Promise<void>;
  listPublishedPosts(limit: number): Promise<NewsPost[]>;
  findVerificationRequest(requestId: string): Promise<{ id: string; status: "pending" | "approved" | "rejected"; proofPrivateRef: string; organizationName: string; accountId: string } | null>;
  decideVerification(requestId: string, decision: "approved" | "rejected", ownerId: string, note: string, verifiedUntil?: Date): Promise<void>;
  markPostForReview(postId: string, reason: string): Promise<void>;
  countRecentRepostsByUser(userId: string, since: Date): Promise<number>;
  hasReposted(postId: string, userId: string): Promise<boolean>;
  createRepost(postId: string, userId: string): Promise<void>;
  listAllPosts(limit?: number): Promise<NewsPost[]>;
  toggleLike(postId: string, userId: string): Promise<{ liked: boolean; likeCount: number }>;
  addReport(postId: string, userId: string, reason: string): Promise<{ totalReports: number }>;
  getModeration(postId: string): ModerationResult | null;
}

export interface TextModerator {
  classify(input: { text: string; category: PostCategory; sourceUrl?: string }): Promise<ModerationResult>;
}

export const ALLOWED_CATEGORIES = new Set<PostCategory>([
  "local_daily", "invitation", "condolence", "services", "roads",
  "health", "education", "weather", "community", "other"
]);

export function requireNonEmptyText(text: string): string {
  const normalized = text.trim();
  if (normalized.length < 5) throw new Error("اكتب تفاصيل كافية عن المنشور (5 أحرف على الأقل).");
  if (normalized.length > 5000) throw new Error("المنشور طويل جدًا؛ الحد الأقصى 5000 حرف.");
  return normalized;
}

export function validateSourceUrl(value?: string): string | undefined {
  if (!value?.trim()) return undefined;
  const url = new URL(value);
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("رابط المصدر غير صالح.");
  }
  return url.toString();
}

export function requireRole(actor: Actor, ...roles: Role[]): void {
  if (!roles.includes(actor.role)) throw new Error("غير مصرح لك بتنفيذ هذا الإجراء.");
}

/*
 * أرسل الطلب إلى مزودك من الخادم فقط، مع Structured Output إن توفر.
 * لا تطلب من النموذج تقرير أن اتهامًا «كاذب» كحقيقة؛ ليصنّف المخاطر ويوصي
 * بالمراجعة. تُحال الادعاءات عن أشخاص أو الوقائع الحساسة إلى إنسان.
 */
export const MODERATION_SYSTEM_PROMPT = `
أنت مصنّف مخاطر لموجز أخبار محلي. لا تحكم بصحة الادعاءات الواقعية من النص وحده.
أعد JSON فقط بهذه الحقول:
- decision: allow | review | block
- category: local_daily | invitation | condolence | services | roads | health | education | weather | community | other
- reasons: مصفوفة قصيرة من رموز أسباب مثل personal_data, targeted_harassment,
  serious_unverified_claim, threat, spam, impersonation, unsupported_emergency
- needsSource: true أو false
- moderatorNote: ملاحظة موجزة للمشرف فقط

قواعد القرار:
1) أخبار الحياة اليومية والدعوات والتعازي والخدمات المحلية المحايدة يمكن أن تكون allow.
2) اتهام شخص محدد بجريمة أو فساد أو سلوك ضار، أو محتوى يمس السمعة، يكون review؛ لا تصفه بالكذب أو بالصحة من دون تحقق بشري ومصدر.
3) ادعاء عاجل قد يسبب ضررًا (مثل خطر صحي/أمني أو إغلاق طريق) بلا مصدر واضح يكون review، لا ينشر كتنبيه مؤكد.
4) تهديد صريح، كشف عنوان/هاتف/بيانات خاصة بقصد الإضرار، تحرش موجّه، أو انتحال واضح: block أو review بحسب الوضوح، مع توضيح السبب للمشرف.
5) لا ترفض رأيًا أو خبرًا لمجرد اختلافه أو لغته أو لهجته. لا تستنتج هوية الكاتب أو نيته.
6) إن كنت غير متأكد، اختر review. لا تتخذ قرارًا نهائيًا بشأن السمعة أو التضليل وحدك.
`;

/**
 * ينشئ المنشور بعد مرور النص على المصنف.
 * عند تعطل مزود الذكاء الاصطناعي، لا ينشر المنشور تلقائيًا؛ يحوله للمراجعة.
 */
export async function submitNewsPost(
  store: NewsStore,
  moderator: TextModerator,
  actor: Actor,
  input: NewsPostInput
): Promise<{ post: NewsPost; message: string; moderation: ModerationResult }> {
  const text = requireNonEmptyText(input.text);
  if (!ALLOWED_CATEGORIES.has(input.category)) throw new Error("التصنيف غير مسموح.");
  const sourceUrl = validateSourceUrl(input.sourceUrl);

  let result: ModerationResult;
  try {
    result = await moderator.classify({ text, category: input.category, sourceUrl });
  } catch {
    result = {
      decision: "review",
      category: input.category,
      reasons: ["moderation_unavailable"],
      needsSource: false,
      moderatorNote: "تعذر تشغيل التصنيف الآلي؛ يتطلب المنشور مراجعة بشرية."
    };
  }

  // لا تسمح للمخرج الآلي بإضافة تصنيف خارج القائمة.
  if (!ALLOWED_CATEGORIES.has(result.category)) {
    result = { ...result, decision: "review", category: input.category, reasons: [...result.reasons, "invalid_ai_category"] };
  }

  const status: PostStatus = result.decision === "allow"
    ? "published"
    : result.decision === "block"
      ? "rejected"
      : "pending_review";

  const post = await store.createPost({
    authorId: actor.id,
    authorName: input.authorName || actor.name || null,
    authorPhotoUrl: input.authorPhotoUrl || actor.photoUrl || null,
    text,
    category: result.category,
    sourceUrl: sourceUrl ?? null,
    location: input.location?.trim() || null,
    status,
    mediaUrl: input.mediaUrl || null,
    mediaType: input.mediaType || null,
    mediaName: input.mediaName || null,
    moderatorNote: result.moderatorNote || null,
  });
  await store.saveModeration(post.id, result);

  const message = status === "published"
    ? "نُشر المنشور بنجاح في موجز المجتمع."
    : status === "pending_review"
      ? "أُرسل المنشور للمراجعة قبل ظهوره للناس."
      : "لم يُنشر المنشور؛ راجع إرشادات المجتمع أو اطلب مراجعة المشرف.";
  return { post, message, moderation: result };
}

/** القرار النهائي بشأن المنشورات المعلّقة للمشرف/المالك فقط. */
export async function reviewPost(
  store: NewsStore,
  actor: Actor,
  postId: string,
  decision: "publish" | "reject",
  note: string
): Promise<void> {
  requireRole(actor, "moderator", "owner");
  const trimmedNote = note.trim();
  if (trimmedNote.length > 1000) throw new Error("ملاحظة المراجعة طويلة جدًا.");
  await store.updatePostStatus(postId, decision === "publish" ? "published" : "rejected", actor.id, trimmedNote);
}

/*
 * التوثيق: لا تمنح الشارة لمجرد إرسال طلب.
 * خزّن الأدلة في مساحة خاصة، ولا تجعل وثائق المؤسسة متاحة للزوار.
 * صاحب التطبيق (owner) وحده يعتمد الطلب في هذا المثال.
 */
export async function decideOrganizationVerification(
  store: NewsStore,
  actor: Actor,
  requestId: string,
  decision: "approved" | "rejected",
  note: string
): Promise<void> {
  requireRole(actor, "owner");
  const request = await store.findVerificationRequest(requestId);
  if (!request || request.status !== "pending") throw new Error("طلب التوثيق غير موجود أو تمت مراجعته.");

  // هنا يراجع المالك يدويًا: صفة مقدم الطلب، موقع/بريد المؤسسة الرسمي،
  // مستند التفويض أو قناة اتصال مستقلة. لا تعتمد الشارة على تصنيف AI وحده.
  const expiresAt = decision === "approved"
    ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    : undefined;
  await store.decideVerification(requestId, decision, actor.id, note.trim(), expiresAt);
}

/**
 * ترتيب معتدل: التوثيق يرفع الأولوية، والتفاعل يساعد، لكن حداثة الخبر مهمة.
 * استخدم تفاعلات فريدة من حسابات مختلفة، ولا تجعل إعادة النشر وحدها تهيمن.
 * البلاغات لا تنقص الترتيب آليًا لأنها قابلة لإساءة الاستخدام؛ كثرتها تفتح مراجعة.
 */
export function rankNewsPosts(posts: NewsPost[], now = Date.now()): NewsPost[] {
  const score = (post: NewsPost): number => {
    const postTime = post.createdAt instanceof Date ? post.createdAt.getTime() : new Date(post.createdAt).getTime();
    const ageHours = Math.max(0, (now - postTime) / 3_600_000);
    const fresh = Math.exp(-ageHours / 72); // ينخفض تدريجيًا خلال الأيام
    const validVerified = post.officialVerified && !!post.verifiedUntil && (post.verifiedUntil instanceof Date ? post.verifiedUntil.getTime() : new Date(post.verifiedUntil).getTime()) > now;
    const officialBoost = validVerified ? 0.45 : 0;
    const engagement =
      Math.log1p(Math.max(0, post.likeCount)) * 0.12 +
      Math.log1p(Math.max(0, post.commentCount)) * 0.20 +
      Math.log1p(Math.max(0, post.repostCount)) * 0.16 +
      Math.log1p(Math.max(0, post.uniqueEngagers)) * 0.10;
    const cappedEngagement = Math.min(0.9, engagement);
    return fresh * (1 + officialBoost + cappedEngagement);
  };

  return posts
    .filter(post => post.status === "published")
    .sort((a, b) => score(b) - score(a));
}

/**
 * البلاغات المكررة من الحساب نفسه يجب أن تُمنع بقاعدة UNIQUE(post_id,user_id).
 * لا تحذف المنشور آليًا عند كثرة البلاغات؛ ضع علامة لمراجعة بشرية.
 */
export async function reportPostIfNeeded(
  store: NewsStore,
  postId: string,
  uniqueReportCount: number
): Promise<void> {
  if (uniqueReportCount >= 3) {
    await store.markPostForReview(postId, "وصلت بلاغات فريدة متعددة؛ يلزم فحص مشرف.");
  }
}

/** حماية بسيطة لإعادة النشر من التكرار والإغراق؛ استكملها بمحدد معدل عام. */
export async function repostNews(
  store: NewsStore,
  actor: Actor,
  postId: string
): Promise<void> {
  const since = new Date(Date.now() - 60 * 60 * 1000);
  const recentCount = await store.countRecentRepostsByUser(actor.id, since);
  if (recentCount >= 20) throw new Error("وصلت إلى الحد المؤقت لإعادة النشر (20 في الساعة).");
  if (await store.hasReposted(postId, actor.id)) throw new Error("سبق أن أعدت نشر هذا الخبر.");
  await store.createRepost(postId, actor.id);
}

// ============================================================================
// Real Server Implementation: Gemini Text Moderator
// ============================================================================

export class GeminiTextModerator implements TextModerator {
  private ai: GoogleGenAI;

  constructor(ai: GoogleGenAI) {
    this.ai = ai;
  }

  async classify(input: { text: string; category: PostCategory; sourceUrl?: string }): Promise<ModerationResult> {
    const promptText = `
فحص منشور للمجتمع:
- التصنيف المختار من الكاتب: ${input.category}
- رابط المصدر (إن وجد): ${input.sourceUrl || 'لا يوجد'}
- نص المنشور:
${input.text}
`;

    const response = await this.ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: promptText,
      config: {
        systemInstruction: MODERATION_SYSTEM_PROMPT,
        responseMimeType: 'application/json',
      },
    });

    const raw = response?.text?.trim() || '';
    if (!raw) {
      throw new Error('لم يرجع نموذج الذكاء الاصطناعي نتيجة.');
    }

    const parsed = JSON.parse(raw);
    const decision: ModerationDecision =
      parsed.decision === 'allow' || parsed.decision === 'block' || parsed.decision === 'review'
        ? parsed.decision
        : 'review';

    const category: PostCategory = ALLOWED_CATEGORIES.has(parsed.category)
      ? parsed.category
      : input.category;

    const reasons: string[] = Array.isArray(parsed.reasons)
      ? parsed.reasons.map((r: any) => String(r)).slice(0, 5)
      : [];

    const needsSource = Boolean(parsed.needsSource);
    const moderatorNote = typeof parsed.moderatorNote === 'string' ? parsed.moderatorNote.slice(0, 500) : undefined;

    return {
      decision,
      category,
      reasons,
      needsSource,
      moderatorNote,
    };
  }
}

// ============================================================================
// Real Server Implementation: Persistent News Store
// ============================================================================

interface VerificationRecord {
  id: string;
  accountId: string;
  organizationName: string;
  proofPrivateRef: string;
  status: "pending" | "approved" | "rejected";
  moderatorId?: string;
  note?: string;
  createdAt: string;
  decidedAt?: string;
  verifiedUntil?: string;
}

interface StoredData {
  posts: NewsPost[];
  moderations: Record<string, ModerationResult>;
  verificationRequests: VerificationRecord[];
  reposts: Array<{ postId: string; userId: string; timestamp: string }>;
  reports: Array<{ postId: string; userId: string; reason: string; timestamp: string }>;
  likes: Record<string, string[]>; // postId -> array of userIds
}

export class JsonFileNewsStore implements NewsStore {
  private filePath: string;
  private data: StoredData;

  constructor(storageDir: string) {
    this.filePath = path.join(storageDir, 'community_news_store.json');
    if (!fs.existsSync(storageDir)) {
      try {
        fs.mkdirSync(storageDir, { recursive: true });
      } catch {}
    }
    this.data = this.loadOrSeed();
  }

  private loadOrSeed(): StoredData {
    if (fs.existsSync(this.filePath)) {
      try {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        const parsed = JSON.parse(raw);
        // Revive dates
        if (Array.isArray(parsed?.posts)) {
          parsed.posts = parsed.posts.map((p: any) => ({
            ...p,
            createdAt: new Date(p.createdAt),
            verifiedUntil: p.verifiedUntil ? new Date(p.verifiedUntil) : null,
          }));
        }
        return {
          posts: parsed.posts || [],
          moderations: parsed.moderations || {},
          verificationRequests: parsed.verificationRequests || [],
          reposts: parsed.reposts || [],
          reports: parsed.reports || [],
          likes: parsed.likes || {},
        };
      } catch (e) {
        console.warn('Error reading community_news_store.json, creating initial seed:', e);
      }
    }
    const seed = this.generateSeedData();
    this.saveData(seed);
    return seed;
  }

  private saveData(dataToSave: StoredData = this.data): void {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(dataToSave, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to write community_news_store.json:', err);
    }
  }

  private generateSeedData(): StoredData {
    const now = Date.now();
    const verifiedExpiry = new Date(now + 180 * 24 * 60 * 60 * 1000);

    const initialPosts: NewsPost[] = [
      {
        id: 'post_seed_roads_rn1',
        authorId: 'auth_gendarmerie_ainsalah',
        authorName: 'خلية الإعلام — أمن الطرقات RN1',
        authorPhotoUrl: undefined,
        text: 'حالة الطريق الوطني رقم 1 (RN 1) محور عين صالح — المنيعة — تمنراست: حركة المرور سالكة بصفة عادية مع رياح معتدلة وتطاير خفيف للرمال في المقاطع المكشوفة قرب إينغر وخنقة الحجاج. يُرجى من كافة السائقين تخفيف السرعة وإشعال الأضواء التحذيرية.',
        category: 'roads',
        sourceUrl: 'https://tariki.dz',
        location: 'الطريق الوطني رقم 1 — عين صالح',
        status: 'published',
        createdAt: new Date(now - 2 * 3600 * 1000),
        officialVerified: true,
        verifiedUntil: verifiedExpiry,
        likeCount: 24,
        commentCount: 5,
        repostCount: 8,
        uniqueEngagers: 29,
        uniqueReports: 0,
      },
      {
        id: 'post_seed_solar_station',
        authorId: 'auth_sonelgaz_tidikelt',
        authorName: 'مصلحة الخدمات التقنية والطاقة',
        authorPhotoUrl: undefined,
        text: 'إعلان أشغال صيانة وقائية على شبكة التوزيع الكهربائية غداً الأربعاء من الساعة 06:00 إلى 09:00 صباحاً في بعض أحياء وسط عين صالح وفقارة الزوى لربط خطوط المحطة الشمسية الجديدة. نشكر المواطنين على تفهمهم.',
        category: 'services',
        sourceUrl: 'https://sonelgaz.dz',
        location: 'حي تيديكلت وفقارة الزوى',
        status: 'published',
        createdAt: new Date(now - 6 * 3600 * 1000),
        officialVerified: true,
        verifiedUntil: verifiedExpiry,
        likeCount: 19,
        commentCount: 3,
        repostCount: 11,
        uniqueEngagers: 26,
        uniqueReports: 0,
      },
      {
        id: 'post_seed_dates_market',
        authorId: 'auth_oasis_community',
        authorName: 'جمعية مزارعي واحات تديكلت',
        authorPhotoUrl: undefined,
        text: 'انطلاق السوق التضامني للتمور الموسمية ومنتجات الواحة بساحة السوق الأسبوعي بعين صالح ابتداءً من صباح الجمعة. توفير تمور دقلة نور والغرس والفقوس الصحراوي بأسعار مناسبة مباشرة من المنتج إلى المستهلك.',
        category: 'local_daily',
        sourceUrl: undefined,
        location: 'ساحة السوق الأسبوعي — عين صالح',
        status: 'published',
        createdAt: new Date(now - 14 * 3600 * 1000),
        officialVerified: false,
        verifiedUntil: null,
        likeCount: 31,
        commentCount: 8,
        repostCount: 6,
        uniqueEngagers: 37,
        uniqueReports: 0,
      },
      {
        id: 'post_seed_health_pharmacy',
        authorId: 'auth_health_ainsalah',
        authorName: 'المؤسسة العمومية للصحة الجوارية',
        authorPhotoUrl: undefined,
        text: 'صيدلية المناوبة الليلية المعتمدة لهذا الأسبوع: صيدلية الرمال بحي الديس قرب المستشفى. في الحالات الاستعجالية القصوى يُرجى الاتصال فوراً بالرقم الأخضر للحماية المدنية 14 أو مصلحة الاستعجالات الطبية 1055.',
        category: 'health',
        sourceUrl: undefined,
        location: 'حي الديس — عين صالح',
        status: 'published',
        createdAt: new Date(now - 22 * 3600 * 1000),
        officialVerified: true,
        verifiedUntil: verifiedExpiry,
        likeCount: 42,
        commentCount: 4,
        repostCount: 15,
        uniqueEngagers: 50,
        uniqueReports: 0,
      },
    ];

    const initialVerifications: VerificationRecord[] = [
      {
        id: 'verif_seed_1',
        accountId: 'auth_gendarmerie_ainsalah',
        organizationName: 'خلية أمن الطرقات RN1',
        proofPrivateRef: 'docs/gendarmerie_mandate.pdf',
        status: 'approved',
        moderatorId: 'owner_primary',
        note: 'تم التحقق من الصفة الرسمية لخلية الإعلام الولائية',
        createdAt: new Date(now - 30 * 86400 * 1000).toISOString(),
        decidedAt: new Date(now - 29 * 86400 * 1000).toISOString(),
        verifiedUntil: verifiedExpiry.toISOString(),
      },
    ];

    return {
      posts: initialPosts,
      moderations: {},
      verificationRequests: initialVerifications,
      reposts: [],
      reports: [],
      likes: {},
    };
  }

  async createPost(input: Omit<NewsPost, "id" | "createdAt" | "likeCount" | "commentCount" | "repostCount" | "uniqueEngagers" | "uniqueReports" | "officialVerified" | "verifiedUntil">): Promise<NewsPost> {
    const post: NewsPost = {
      ...input,
      id: `post_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      createdAt: new Date(),
      likeCount: 0,
      commentCount: 0,
      repostCount: 0,
      uniqueEngagers: 0,
      uniqueReports: 0,
      officialVerified: false,
      verifiedUntil: null,
    };
    this.data.posts.unshift(post);
    this.saveData();
    return post;
  }

  async updatePostStatus(postId: string, status: PostStatus, moderatorId: string, note?: string): Promise<void> {
    const post = this.data.posts.find((p) => p.id === postId);
    if (!post) throw new Error("المنشور غير موجود.");
    post.status = status;
    if (note) {
      post.moderatorNote = `[المشرف ${moderatorId}]: ${note}`;
    }
    this.saveData();
  }

  async saveModeration(postId: string, result: ModerationResult): Promise<void> {
    this.data.moderations[postId] = result;
    this.saveData();
  }

  async listPublishedPosts(limit = 100): Promise<NewsPost[]> {
    return this.data.posts
      .filter((p) => p.status === "published")
      .slice(0, limit);
  }

  async listAllPosts(limit = 200): Promise<NewsPost[]> {
    return this.data.posts.slice(0, limit);
  }

  async findVerificationRequest(requestId: string): Promise<{ id: string; status: "pending" | "approved" | "rejected"; proofPrivateRef: string; organizationName: string; accountId: string } | null> {
    const req = this.data.verificationRequests.find((r) => r.id === requestId);
    if (!req) return null;
    return {
      id: req.id,
      status: req.status,
      proofPrivateRef: req.proofPrivateRef,
      organizationName: req.organizationName,
      accountId: req.accountId,
    };
  }

  async decideVerification(requestId: string, decision: "approved" | "rejected", ownerId: string, note: string, verifiedUntil?: Date): Promise<void> {
    const req = this.data.verificationRequests.find((r) => r.id === requestId);
    if (!req) throw new Error("طلب التوثيق غير موجود.");
    req.status = decision;
    req.moderatorId = ownerId;
    req.note = note;
    req.decidedAt = new Date().toISOString();
    if (verifiedUntil) {
      req.verifiedUntil = verifiedUntil.toISOString();
      // Also update author's existing posts
      this.data.posts.forEach((p) => {
        if (p.authorId === req.accountId) {
          p.officialVerified = true;
          p.verifiedUntil = verifiedUntil;
        }
      });
    }
    this.saveData();
  }

  async markPostForReview(postId: string, reason: string): Promise<void> {
    const post = this.data.posts.find((p) => p.id === postId);
    if (post) {
      post.status = "pending_review";
      post.moderatorNote = `[مراجعة تلقائية للبلاغات]: ${reason}`;
      this.saveData();
    }
  }

  async countRecentRepostsByUser(userId: string, since: Date): Promise<number> {
    const sinceMs = since.getTime();
    return this.data.reposts.filter(
      (r) => r.userId === userId && new Date(r.timestamp).getTime() >= sinceMs
    ).length;
  }

  async hasReposted(postId: string, userId: string): Promise<boolean> {
    return this.data.reposts.some((r) => r.postId === postId && r.userId === userId);
  }

  async createRepost(postId: string, userId: string): Promise<void> {
    this.data.reposts.push({
      postId,
      userId,
      timestamp: new Date().toISOString(),
    });
    const post = this.data.posts.find((p) => p.id === postId);
    if (post) {
      post.repostCount = (post.repostCount || 0) + 1;
      post.uniqueEngagers = (post.uniqueEngagers || 0) + 1;
    }
    this.saveData();
  }

  // Interactive helper for likes
  async toggleLike(postId: string, userId: string): Promise<{ liked: boolean; likeCount: number }> {
    if (!this.data.likes[postId]) {
      this.data.likes[postId] = [];
    }
    const userLikes = this.data.likes[postId];
    const idx = userLikes.indexOf(userId);
    const post = this.data.posts.find((p) => p.id === postId);
    let liked = false;

    if (idx >= 0) {
      userLikes.splice(idx, 1);
      liked = false;
    } else {
      userLikes.push(userId);
      liked = true;
    }

    if (post) {
      post.likeCount = userLikes.length;
      if (liked) {
        post.uniqueEngagers = Math.max(post.uniqueEngagers, userLikes.length);
      }
    }
    this.saveData();
    return { liked, likeCount: userLikes.length };
  }

  // Interactive helper for reports
  async addReport(postId: string, userId: string, reason: string): Promise<{ totalReports: number }> {
    const existing = this.data.reports.find((r) => r.postId === postId && r.userId === userId);
    if (!existing) {
      this.data.reports.push({
        postId,
        userId,
        reason: reason.trim().slice(0, 500),
        timestamp: new Date().toISOString(),
      });
      const post = this.data.posts.find((p) => p.id === postId);
      if (post) {
        const uniqueForPost = new Set(this.data.reports.filter((r) => r.postId === postId).map((r) => r.userId));
        post.uniqueReports = uniqueForPost.size;
        this.saveData();
        await reportPostIfNeeded(this, postId, post.uniqueReports);
        return { totalReports: post.uniqueReports };
      }
    }
    const count = this.data.reports.filter((r) => r.postId === postId).length;
    return { totalReports: count };
  }

  getModeration(postId: string): ModerationResult | null {
    return this.data.moderations[postId] || null;
  }
}

// ============================================================================
// Express API Router Registration
// ============================================================================

import { CloudSqlNewsStore } from './cloudSqlNewsStore.ts';

export function registerCommunityNewsRoutes(app: express.Express, ai: GoogleGenAI) {
  const dataDir = path.join(process.cwd(), 'data');
  const store: NewsStore = process.env.SQL_HOST
    ? new CloudSqlNewsStore()
    : new JsonFileNewsStore(dataDir);
  const moderator = new GeminiTextModerator(ai);

  // Helper to extract actor from request headers
  function getActor(req: Request): Actor {
    const authHeader = req.headers['authorization'];
    const customRole = req.headers['x-user-role'];
    const userIdHeader = req.headers['x-user-id'];
    const userNameHeader = req.headers['x-user-name'];

    const id = typeof userIdHeader === 'string' && userIdHeader.trim()
      ? userIdHeader.trim()
      : 'guest_' + (req.ip || '127.0.0.1').replace(/[^a-zA-Z0-9]/g, '_');

    let role: Role = 'member';
    if (customRole === 'owner') role = 'owner';
    else if (customRole === 'moderator') role = 'moderator';

    return {
      id,
      role,
      name: typeof userNameHeader === 'string' ? decodeURIComponent(userNameHeader) : undefined,
    };
  }

  // 1. GET /api/community-news: Returns ranked published posts
  app.get('/api/community-news', async (req: Request, res: Response) => {
    try {
      const category = typeof req.query.category === 'string' ? req.query.category : undefined;
      const search = typeof req.query.q === 'string' ? req.query.q.trim().toLowerCase() : undefined;

      const rawPosts = await store.listPublishedPosts(150);
      let ranked = rankNewsPosts(rawPosts);

      if (category && category !== 'all' && ALLOWED_CATEGORIES.has(category as PostCategory)) {
        ranked = ranked.filter((p) => p.category === category);
      }

      if (search) {
        ranked = ranked.filter(
          (p) =>
            p.text.toLowerCase().includes(search) ||
            (p.authorName && p.authorName.toLowerCase().includes(search)) ||
            (p.location && p.location.toLowerCase().includes(search))
        );
      }

      return res.json({
        posts: ranked,
        count: ranked.length,
      });
    } catch (err: any) {
      console.error('GET /api/community-news error:', err);
      return res.status(500).json({ error: err.message || 'تعذر جلب موجز الأخبار' });
    }
  });

  // 2. POST /api/community-news: Submit new post with server-side AI moderation
  app.post('/api/community-news', async (req: Request, res: Response) => {
    try {
      const actor = getActor(req);
      const { text, category, sourceUrl, location, mediaUrl, mediaType, mediaName, authorName, authorPhotoUrl } = req.body || {};

      const input: NewsPostInput = {
        text: String(text || ''),
        category: (ALLOWED_CATEGORIES.has(category) ? category : 'community') as PostCategory,
        sourceUrl: typeof sourceUrl === 'string' ? sourceUrl : undefined,
        location: typeof location === 'string' ? location : undefined,
        authorName: typeof authorName === 'string' ? authorName : undefined,
        authorPhotoUrl: typeof authorPhotoUrl === 'string' ? authorPhotoUrl : undefined,
        mediaUrl: typeof mediaUrl === 'string' ? mediaUrl : undefined,
        mediaType: mediaType === 'image' || mediaType === 'video' ? mediaType : undefined,
        mediaName: typeof mediaName === 'string' ? mediaName : undefined,
      };

      const result = await submitNewsPost(store, moderator, actor, input);
      return res.json(result);
    } catch (err: any) {
      console.error('POST /api/community-news error:', err);
      return res.status(400).json({ error: err.message || 'فشل نشر الخبر' });
    }
  });

  // 3. POST /api/community-news/:id/like: Like / Unlike
  app.post('/api/community-news/:id/like', async (req: Request, res: Response) => {
    try {
      const actor = getActor(req);
      const postId = req.params.id;
      const result = await store.toggleLike(postId, actor.id);
      return res.json(result);
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'تعذر تسجيل الإعجاب' });
    }
  });

  // 4. POST /api/community-news/:id/repost: Repost news with anti-spam check
  app.post('/api/community-news/:id/repost', async (req: Request, res: Response) => {
    try {
      const actor = getActor(req);
      const postId = req.params.id;
      await repostNews(store, actor, postId);
      return res.json({ success: true, message: 'تمت إعادة نشر الخبر بنجاح.' });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'تعذر إعادة نشر الخبر' });
    }
  });

  // 5. POST /api/community-news/:id/report: Report post
  app.post('/api/community-news/:id/report', async (req: Request, res: Response) => {
    try {
      const actor = getActor(req);
      const postId = req.params.id;
      const reason = typeof req.body?.reason === 'string' ? req.body.reason : 'بلاغ مستخدم';
      const result = await store.addReport(postId, actor.id, reason);
      return res.json({
        success: true,
        message: 'تم استلام بلاغك وسيقوم المشرف بفحصه.',
        ...result,
      });
    } catch (err: any) {
      return res.status(400).json({ error: err.message || 'تعذر تسجيل البلاغ' });
    }
  });

  // 6. GET /api/community-news/admin/posts: List all posts for moderation
  app.get('/api/community-news/admin/posts', async (req: Request, res: Response) => {
    try {
      const actor = getActor(req);
      requireRole(actor, 'moderator', 'owner');
      const posts = await store.listAllPosts();
      return res.json({ posts });
    } catch (err: any) {
      return res.status(403).json({ error: err.message || 'غير مصرح لك بالوصول لإدارة الأخبار' });
    }
  });

  // 7. POST /api/community-news/admin/:id/review: Approve or reject post
  app.post('/api/community-news/admin/:id/review', async (req: Request, res: Response) => {
    try {
      const actor = getActor(req);
      const postId = req.params.id;
      const decision = req.body?.decision === 'publish' ? 'publish' : 'reject';
      const note = typeof req.body?.note === 'string' ? req.body.note : 'مراجعة من لوحة الإشراف';
      await reviewPost(store, actor, postId, decision, note);
      return res.json({ success: true, message: `تم تحديث حالة المنشور إلى: ${decision === 'publish' ? 'منشور' : 'مرفوض'}` });
    } catch (err: any) {
      return res.status(403).json({ error: err.message || 'تعذر اتخاذ قرار المراجعة' });
    }
  });

  // 8. POST /api/community-news/admin/verify-org: Decide organization verification
  app.post('/api/community-news/admin/verify-org', async (req: Request, res: Response) => {
    try {
      const actor = getActor(req);
      const { requestId, decision, note } = req.body || {};
      await decideOrganizationVerification(store, actor, String(requestId), decision === 'approved' ? 'approved' : 'rejected', String(note || ''));
      return res.json({ success: true, message: 'تم اتخاذ القرار بشأن طلب التوثيق.' });
    } catch (err: any) {
      return res.status(403).json({ error: err.message || 'تعذر مراجعة طلب التوثيق' });
    }
  });
}
