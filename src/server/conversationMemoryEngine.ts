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
import type { ConversationTurn, SessionSearchSource } from './intentAndContextEngine.ts';
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
    .slice(0, 12)
    .map((e) => `- ${e.key}: ${e.value}`)
    .join('\n');
  return `[تفضيلات وذاكرة المستخدم طويلة المدى]:\n${items}`;
}
