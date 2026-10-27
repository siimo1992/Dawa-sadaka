/**
 * conversationMemoryEngine.ts — محرك إدارة سياق المحادثات والذاكرة طويلة المدى لتيدكلت AI
 *
 * يدير:
 *  1) حفظ واسترجاع سجل المحادثات المرتب حسب conversation_id
 *  2) التلخيص الذكي التراكمي للرسائل القديمة عند طال الحوار
 *  3) حفظ مصادر البحث وملفات الجلسة للرجوع إليها («اشرح المصدر الثاني»، «حوّله إلى PDF»)
 *  4) الذاكرة طويلة المدى القابلة للعرض والتعديل والحذف والتعطيل من قِبل المستخدم
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  correctUserTextAndDialect,
  type ConversationTurn,
  type SessionSearchSource,
} from './intentAndContextEngine.ts';
import type { GeneratedFileMetadata } from './fileGeneratorEngine.ts';

export interface StoredConversation {
  conversation_id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  summary: string;
  messages: ConversationTurn[];
  sources: SessionSearchSource[];
  generated_files: GeneratedFileMetadata[];
  uploaded_files: Array<{
    id: string;
    filename: string;
    mimeType: string;
    extractedText: string;
    summary: string;
    uploadedAt: string;
  }>;
}

export interface LongTermMemoryEntry {
  id: string;
  key: string;
  value: string;
  category: 'language' | 'style' | 'interest' | 'domain' | 'general';
  createdAt: string;
  updatedAt: string;
}

export interface UserMemoryProfile {
  user_id: string;
  enabled: boolean;
  entries: LongTermMemoryEntry[];
}

const DATA_DIR = path.join(process.cwd(), 'data');
const CONVERSATIONS_FILE = path.join(DATA_DIR, 'conversations_store.json');
const USER_MEMORIES_FILE = path.join(DATA_DIR, 'user_memories_store.json');

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

let conversationsCache: Record<string, StoredConversation> | null = null;
let memoriesCache: Record<string, UserMemoryProfile> | null = null;

function getConversationsMap(): Record<string, StoredConversation> {
  if (conversationsCache) return conversationsCache;
  ensureDataDir();
  try {
    if (fs.existsSync(CONVERSATIONS_FILE)) {
      conversationsCache = JSON.parse(fs.readFileSync(CONVERSATIONS_FILE, 'utf8'));
      return conversationsCache!;
    }
  } catch {
    // ignore corrupt file
  }
  conversationsCache = {};
  return conversationsCache;
}

function saveConversationsMap(): void {
  if (!conversationsCache) return;
  ensureDataDir();
  const tmpFile = `${CONVERSATIONS_FILE}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(conversationsCache, null, 2), 'utf8');
  fs.renameSync(tmpFile, CONVERSATIONS_FILE);
}

function getMemoriesMap(): Record<string, UserMemoryProfile> {
  if (memoriesCache) return memoriesCache;
  ensureDataDir();
  try {
    if (fs.existsSync(USER_MEMORIES_FILE)) {
      memoriesCache = JSON.parse(fs.readFileSync(USER_MEMORIES_FILE, 'utf8'));
      return memoriesCache!;
    }
  } catch {
    // ignore
  }
  memoriesCache = {};
  return memoriesCache;
}

function saveMemoriesMap(): void {
  if (!memoriesCache) return;
  ensureDataDir();
  const tmpFile = `${USER_MEMORIES_FILE}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(memoriesCache, null, 2), 'utf8');
  fs.renameSync(tmpFile, USER_MEMORIES_FILE);
}

/* ───────────────────────── 1. Conversation Management ───────────────────────── */

export function getOrCreateConversation(
  conversationId?: string,
  userId = 'default_user'
): StoredConversation {
  const map = getConversationsMap();
  const id = (conversationId && conversationId.trim()) || `conv_${crypto.randomBytes(6).toString('hex')}`;
  if (!map[id]) {
    const now = new Date().toISOString();
    map[id] = {
      conversation_id: id,
      user_id: userId,
      title: 'محادثة جديدة',
      created_at: now,
      updated_at: now,
      summary: '',
      messages: [],
      sources: [],
      generated_files: [],
      uploaded_files: [],
    };
    saveConversationsMap();
  }
  return map[id];
}

/**
 * تلخيص ذكي للرسائل القديمة عند تجاوز السجل 14 رسالة، مع الحفاظ على آخر الرسائل كاملة.
 */
function updateRollingSummaryIfNeeded(conv: StoredConversation): void {
  const MAX_FULL_MESSAGES = 14;
  if (conv.messages.length <= MAX_FULL_MESSAGES) return;

  const olderMessages = conv.messages.slice(0, conv.messages.length - 10);
  const bulletPoints: string[] = [];
  for (const msg of olderMessages.slice(-8)) {
    const roleLabel = msg.role === 'user' ? 'سأل المستخدم' : 'أجاب المساعد';
    const snippet = String(msg.content || '').replace(/\s+/g, ' ').trim().slice(0, 140);
    if (snippet) {
      bulletPoints.push(`${roleLabel}: ${snippet}`);
    }
  }
  conv.summary = bulletPoints.join(' | ');
}

export function appendConversationTurn(
  conversationId: string,
  turn: ConversationTurn,
  userId = 'default_user'
): StoredConversation {
  const conv = getOrCreateConversation(conversationId, userId);
  conv.messages.push({
    role: turn.role,
    content: turn.content,
    timestamp: turn.timestamp || Date.now(),
  });
  if (conv.messages.length === 1 && turn.role === 'user') {
    conv.title = turn.content.slice(0, 60);
  }
  conv.updated_at = new Date().toISOString();
  updateRollingSummaryIfNeeded(conv);
  saveConversationsMap();
  return conv;
}

export function saveSessionSources(
  conversationId: string,
  sources: SessionSearchSource[],
  userId = 'default_user'
): StoredConversation {
  const conv = getOrCreateConversation(conversationId, userId);
  conv.sources = sources;
  conv.updated_at = new Date().toISOString();
  saveConversationsMap();
  return conv;
}

export function appendGeneratedFileToConversation(
  conversationId: string,
  fileMeta: GeneratedFileMetadata,
  userId = 'default_user'
): StoredConversation {
  const conv = getOrCreateConversation(conversationId, userId);
  conv.generated_files.push(fileMeta);
  conv.updated_at = new Date().toISOString();
  saveConversationsMap();
  return conv;
}

export function appendUploadedFileToConversation(
  conversationId: string,
  uploaded: {
    id: string;
    filename: string;
    mimeType: string;
    extractedText: string;
    summary: string;
  },
  userId = 'default_user'
): StoredConversation {
  const conv = getOrCreateConversation(conversationId, userId);
  // Prevent duplicate id
  conv.uploaded_files = conv.uploaded_files.filter((f) => f.id !== uploaded.id);
  conv.uploaded_files.push({
    ...uploaded,
    uploadedAt: new Date().toISOString(),
  });
  conv.updated_at = new Date().toISOString();
  saveConversationsMap();
  return conv;
}

export function listUserConversations(userId = 'default_user'): StoredConversation[] {
  const map = getConversationsMap();
  return Object.values(map)
    .filter((c) => !userId || c.user_id === userId || c.user_id === 'default_user')
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
}

export function deleteConversation(conversationId: string): boolean {
  const map = getConversationsMap();
  if (map[conversationId]) {
    delete map[conversationId];
    saveConversationsMap();
    return true;
  }
  return false;
}

/* ───────────────────────── 2. Long-Term Memory Management ───────────────────────── */

export function getUserMemoryProfile(userId = 'default_user'): UserMemoryProfile {
  const map = getMemoriesMap();
  if (!map[userId]) {
    map[userId] = {
      user_id: userId,
      enabled: true,
      entries: [],
    };
    saveMemoriesMap();
  }
  return map[userId];
}

export function setUserMemoryEnabled(userId: string, enabled: boolean): UserMemoryProfile {
  const profile = getUserMemoryProfile(userId);
  profile.enabled = Boolean(enabled);
  saveMemoriesMap();
  return profile;
}

export function upsertUserMemoryEntry(
  userId: string,
  key: string,
  value: string,
  category: LongTermMemoryEntry['category'] = 'general'
): UserMemoryProfile {
  const profile = getUserMemoryProfile(userId);
  if (!profile.enabled) return profile;

  const normalizedKey = String(key || '').trim();
  const normalizedVal = String(value || '').trim();
  if (!normalizedKey || !normalizedVal) return profile;

  const now = new Date().toISOString();
  const existing = profile.entries.find(
    (e) => e.key.toLowerCase() === normalizedKey.toLowerCase() || e.value === normalizedVal
  );
  if (existing) {
    existing.value = normalizedVal;
    existing.category = category;
    existing.updatedAt = now;
  } else {
    profile.entries.unshift({
      id: `mem_${crypto.randomBytes(5).toString('hex')}`,
      key: normalizedKey,
      value: normalizedVal,
      category,
      createdAt: now,
      updatedAt: now,
    });
  }
  saveMemoriesMap();
  return profile;
}

export function updateUserMemoryEntryById(
  userId: string,
  entryId: string,
  updates: { key?: string; value?: string; category?: LongTermMemoryEntry['category'] }
): UserMemoryProfile {
  const profile = getUserMemoryProfile(userId);
  const entry = profile.entries.find((e) => e.id === entryId);
  if (entry) {
    if (updates.key !== undefined) entry.key = String(updates.key).trim();
    if (updates.value !== undefined) entry.value = String(updates.value).trim();
    if (updates.category !== undefined) entry.category = updates.category;
    entry.updatedAt = new Date().toISOString();
    saveMemoriesMap();
  }
  return profile;
}

export function deleteUserMemoryEntry(userId: string, entryId: string): UserMemoryProfile {
  const profile = getUserMemoryProfile(userId);
  profile.entries = profile.entries.filter((e) => e.id !== entryId);
  saveMemoriesMap();
  return profile;
}

export function clearUserMemoryEntries(userId: string): UserMemoryProfile {
  const profile = getUserMemoryProfile(userId);
  profile.entries = [];
  saveMemoriesMap();
  return profile;
}

export function buildMemoryPromptContext(userId = 'default_user'): string {
  const profile = getUserMemoryProfile(userId);
  if (!profile.enabled || profile.entries.length === 0) return '';
  const items = profile.entries
    .slice(0, 16)
    .map((e) => `- ${e.key}: ${e.value}`)
    .join('\n');
  return `[تفضيلات وذاكرة المستخدم طويلة المدى والمفردات المحلية المكتسبة]:\n${items}`;
}

/* ───────────── 3. Sahrawi & Tidikelt Dialect Learning + Voice/Chat Memory ───────────── */

export const SAHRAWI_TIDIKELT_DIALECT_GUIDE = `
[دليل اللهجة الصحراوية الجزائرية المتوازنة (عين صالح، تيدكلت، أدرار، تمنراست، ورقلة، غرداية، بشار، الجنوب الجزائري) + العربية البسيطة الواضحة]:
- تحدث دائماً بمزيج متوازن وطبيعي من الدارجة الصحراوية الجزائرية الأصيلة (لهجة أهل الجنوب الجزائري وتيدكلت وعين صالح) والعربية البسيطة الواضحة للجميع.
- انتبه: المقصود باللهجة الصحراوية هو اللهجة الصحراوية الجزائرية حصراً (الدارجة الجزائرية الجنوبية التيدكلتية)، وليس أي لهجة خارج الجزائر.
- استخدم عبارات الترحيب والتقدير الصحراوية الجزائرية بطبيعية وحسب السياق مثل: «مرحبا بيك خويا/أختي»، «واش حالك لاباس عليك»، «ما يكون غير الخير إن شاء الله»، «الله يحفظك ويبارك فيك»، «على سلامتك»، «بلا مزية هذا واجبنا»، «أسمعني مليح»، «درك نوضحلك»، «واش خصك»، «ربي يعاونك ويستر خطاك».
- إذا تحدث معك الزائر بمفردات أو مصطلحات من لهجته الصحراوية الجزائرية المحلية (مثل: الفقارة، القصر، الجنان، تيدكلت، الهقار، الساهلة، العرق، الرق، الجماعة، التويزة، أتاي الصحراء)، تفاعل معها بنفس الروح واللهجة الجزائرية الصحراوية وتعلّم منها واستخدمها في ردودك.
`.trim();

/**
 * يستخرج ويتعلم تلقائياً من كل جولة محادثة (صوتية أو نصية):
 * 1) يصحح الأخطاء الإملائية والصوتية في اللهجة الصحراوية الجزائرية تلقائياً.
 * 2) يحفظ الحوار في الذاكرة قصيرة المدى (سجل المحادثة النشطة + التلخيص التراكمي).
 * 3) يلتقط المعلومات الشخصية أو التفضيلات أو الكلمات الصحراوية الجزائرية التي يعلّمها المستخدم ويحفظها في الذاكرة طويلة المدى.
 */
export function learnLocalDialectAndMemoryFromTurn(params: {
  userText: string;
  assistantText: string;
  conversationId?: string;
  userId?: string;
  voicePersonaName?: string;
}): void {
  const rawUser = String(params.userText || '').trim();
  const userText = correctUserTextAndDialect(rawUser) || rawUser;
  const assistantText = String(params.assistantText || '').trim();
  const userId = params.userId || 'default_user';
  const convId = params.conversationId || 'voice_live_default';

  if (!userText && !assistantText) return;

  // 1. Save into Short-Term Conversation Memory (with automatic rolling summary)
  if (userText) {
    appendConversationTurn(
      convId,
      {
        role: 'user',
        content: userText,
        timestamp: Date.now(),
      },
      userId
    );
  }
  if (assistantText) {
    appendConversationTurn(
      convId,
      {
        role: 'assistant',
        content: params.voicePersonaName
          ? `[${params.voicePersonaName}]: ${assistantText}`
          : assistantText,
        timestamp: Date.now(),
      },
      userId
    );
  }

  if (!userText) return;

  // 2. Learn user's name if mentioned ("اسمي ...", "أنا اسمي ...", "عيطلي ...")
  const nameMatch = userText.match(
    /(?:اسمي|إسمي|انا اسمي|أنا اسمي|عيطلي|ناديني)\s+([^\s،.؟!]{2,20}(?:\s+[^\s،.؟!]{2,20})?)/i
  );
  if (nameMatch && nameMatch[1]) {
    upsertUserMemoryEntry(userId, 'اسم الزائر', nameMatch[1].trim(), 'general');
  }

  // 3. Learn user's location / neighborhood / origin ("نسكن في ...", "أنا من ...")
  const placeMatch = userText.match(
    /(?:نسكن في|أسكن في|انا من|أنا من|حي|من قصر)\s+([^\s،.؟!]{2,25}(?:\s+[^\s،.؟!]{2,25})?)/i
  );
  if (placeMatch && placeMatch[1]) {
    upsertUserMemoryEntry(userId, 'منطقة أو حي الزائر', placeMatch[1].trim(), 'general');
  }

  // 4. Learn explicit dialect definitions or user instructions ("عندنا نقولو ...", "معناها ...", "تذكر ...", "احفظ ...")
  const teachMatch = userText.match(
    /(?:عندنا نقولو|حنا نقولو|في لهجتنا|في تيدكلت نقولو|كلمة\s+.+\s+معناها|معناها عندنا|تذكر أن|تذكر بلي|احفظ بلي|شفا بلي)\s+(.{4,140})/i
  );
  if (teachMatch && teachMatch[1]) {
    upsertUserMemoryEntry(
      userId,
      `معلومة أو عبارة صحراوية جزائرية علّمها الزائر (${new Date().toLocaleDateString('ar-DZ')})`,
      userText.slice(0, 160),
      'language'
    );
  }

  // 5. Detect rich Algerian Saharan / Tidikelt local expressions in the user's speech and store them in learned dialect memory
  const sahrawiExpressionsRegex =
    /(وشحالك|واش حالك|إيوا|يا خويا|يا اختي|تيدكلت|تيديكلت|عين صالح|فقارة|القصر|الجنان|التويزة|أتاي|الصحراء|أولف|تيميمون|أدرار|تمنراست|إيليزي|ورقلة|غرداية|بشار|رقان|إنغر|فقارة الزوى|البركة|مرحبا بيك|ما يكون غير الخير|على سلامتك|واش خصك|درك|نقولك الصح|ربي يعاونك|الله يحفظك)/i;
  if (sahrawiExpressionsRegex.test(userText) && userText.length >= 6 && userText.length <= 180) {
    upsertUserMemoryEntry(
      userId,
      'عبارة بلهجة الزائر الصحراوية الجزائرية',
      userText,
      'language'
    );
  }
}

/**
 * يبني سياق الذاكرة المدمج (الذاكرة طويلة المدى + المفردات الصحراوية المتعلمة + الذاكرة قصيرة المدى لآخر جولات الحوار)
 * ليُحقن في كل من المكالمة الصوتية المباشرة والدردشة النصية.
 */
export function buildVoiceAndChatMemoryContext(params: {
  conversationId?: string;
  userId?: string;
  recentTurnsLimit?: number;
}): string {
  const userId = params.userId || 'default_user';
  const limit = params.recentTurnsLimit || 8;
  const blocks: string[] = [SAHRAWI_TIDIKELT_DIALECT_GUIDE];

  // 1. Long-Term Memory & Learned Sahrawi Vocabulary
  const longTermBlock = buildMemoryPromptContext(userId);
  if (longTermBlock) {
    blocks.push(longTermBlock);
  }

  // 2. Short-Term Memory (Current voice/chat conversation + most recent conversation turns)
  const convMap = getConversationsMap();
  const targetConv =
    (params.conversationId && convMap[params.conversationId]) ||
    convMap['voice_live_default'] ||
    listUserConversations(userId)[0];

  if (targetConv) {
    const shortTermLines: string[] = [];
    if (targetConv.summary) {
      shortTermLines.push(`ملخص سابق للمحادثة: ${targetConv.summary}`);
    }
    const recentMsgs = targetConv.messages.slice(-limit);
    for (const m of recentMsgs) {
      const speaker = m.role === 'user' ? 'الزائر' : 'المساعد';
      shortTermLines.push(`${speaker}: ${m.content}`);
    }
    if (shortTermLines.length > 0) {
      blocks.push(
        `[الذاكرة قصيرة المدى — سياق المحادثة الأخيرة للاستفادة منه في الرد]:\n${shortTermLines.join('\n')}`
      );
    }
  }

  return blocks.join('\n\n');
}

