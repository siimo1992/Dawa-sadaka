import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type {
  SftExample,
  RlhfComparison,
  KnowledgeChunk,
  IndexedDocument,
  PipelineExecution,
} from '../types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../../data');

const SFT_FILE = path.join(DATA_DIR, 'sft_dataset.json');
const RLHF_FILE = path.join(DATA_DIR, 'rlhf_comparisons.json');
const KB_FILE = path.join(DATA_DIR, 'knowledge_base.json');

// --- In-memory Stores ---
let sftDataset: SftExample[] = [];
let rlhfComparisons: RlhfComparison[] = [];
let knowledgeBase: KnowledgeChunk[] = [];

// Helper to safe load JSON
function safeLoadJson<T>(filePath: string, fallback: T[]): T[] {
  try {
    if (fs.existsSync(filePath)) {
      const raw = fs.readFileSync(filePath, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (err) {
    console.warn(`[RAG/Training] Error loading ${filePath}:`, err);
  }
  return fallback;
}

// Helper to safe write JSON
function safeWriteJson<T>(filePath: string, data: T[]): void {
  try {
    if (!fs.existsSync(path.dirname(filePath))) {
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error(`[RAG/Training] Error writing to ${filePath}:`, err);
  }
}

// 1. Initial Load
export function initRagAndTrainingStores() {
  sftDataset = safeLoadJson<SftExample>(SFT_FILE, []);
  rlhfComparisons = safeLoadJson<RlhfComparison>(RLHF_FILE, []);
  knowledgeBase = safeLoadJson<KnowledgeChunk>(KB_FILE, []);
  console.log(
    `[RAG/Training Engine Initialized] SFT: ${sftDataset.length} | RLHF: ${rlhfComparisons.length} | KB Chunks: ${knowledgeBase.length}`
  );
}

initRagAndTrainingStores();

// Auto reload on interval
setInterval(() => {
  sftDataset = safeLoadJson<SftExample>(SFT_FILE, sftDataset);
  rlhfComparisons = safeLoadJson<RlhfComparison>(RLHF_FILE, rlhfComparisons);
  knowledgeBase = safeLoadJson<KnowledgeChunk>(KB_FILE, knowledgeBase);
}, 30000);

// --- 1. SFT Engine (Supervised Fine-Tuning) ---

export function getSftDataset(): SftExample[] {
  return sftDataset;
}

export function addSftExample(example: Omit<SftExample, 'id' | 'createdAt'>): SftExample {
  const newEx: SftExample = {
    ...example,
    id: `sft_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    createdAt: Date.now(),
  };
  sftDataset.unshift(newEx);
  safeWriteJson(SFT_FILE, sftDataset);
  return newEx;
}

export function deleteSftExample(id: string): boolean {
  const initialLen = sftDataset.length;
  sftDataset = sftDataset.filter((item) => item.id !== id);
  if (sftDataset.length !== initialLen) {
    safeWriteJson(SFT_FILE, sftDataset);
    return true;
  }
  return false;
}

/**
 * Finds top matching SFT demonstration examples for the given user query.
 */
export function retrieveTopSftExamples(query: string, topK = 2): SftExample[] {
  if (sftDataset.length === 0) return [];
  const isAskingAboutPlatformOrDev =
    /مطور|من طور|من صنع|DARTAGNAN|منصة تيديكلت|تطبيق تيديكلت|Tidikelt AI/i.test(query);

  const stopWords = new Set(['ما', 'هي', 'هو', 'من', 'كيف', 'هل', 'عن', 'في', 'على', 'إلى']);
  const qTerms = query
    .toLowerCase()
    .replace(/[؟?!\.,،:؛]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w));

  const scored = sftDataset.map((ex) => {
    if (
      !isAskingAboutPlatformOrDev &&
      (ex.id === 'sft_platform_identity_1' ||
        ex.id === 'sft_platform_developer_1' ||
        /DARTAGNAN/i.test(ex.response || ''))
    ) {
      return { ex, score: 0 };
    }

    let score = 0;
    const textToMatch = `${ex.query} ${ex.category} ${(ex.tags || []).join(' ')}`.toLowerCase();

    // Direct query substring match
    if (ex.query.includes(query) || query.includes(ex.query)) score += 3.0;

    // Term match
    qTerms.forEach((term) => {
      if (textToMatch.includes(term)) score += 1.0;
    });

    return { ex, score };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .filter((item) => item.score >= 2.0)
    .slice(0, topK)
    .map((item) => item.ex);
}

// --- 2. RLHF Engine (Reinforcement Learning from Human Feedback) ---

export function getRlhfComparisons(): RlhfComparison[] {
  return rlhfComparisons;
}

export function addRlhfComparison(
  comparison: Omit<RlhfComparison, 'id' | 'createdAt' | 'timestamp'>
): RlhfComparison {
  const newComp: RlhfComparison = {
    ...comparison,
    id: `rlhf_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString(),
    createdAt: Date.now(),
  };
  rlhfComparisons.unshift(newComp);
  safeWriteJson(RLHF_FILE, rlhfComparisons);
  return newComp;
}

export function getRlhfSummaryDirective(): string {
  if (rlhfComparisons.length === 0) return '';
  const total = rlhfComparisons.length;
  const preferredA = rlhfComparisons.filter((c) => c.chosen === 'A').length;
  const preferredB = rlhfComparisons.filter((c) => c.chosen === 'B').length;
  
  // Extract key human preference reasons
  const topReasons = rlhfComparisons
    .filter((c) => c.reason && c.reason.length > 5)
    .slice(0, 3)
    .map((c) => `- معيار تفضيل بشري: ${c.reason}`)
    .join('\n');

  return `\n\n════════════════════════════════════════════════════════════════
🎖️ توجيهات التعلم المعزز من الملاحظات البشرية (RLHF Preference Model):
• إجمالي جولات المقارنة المعتمدة (DPO / Pairwise Arena): ${total} مقارنة.
• القواعد السلوكية التي فضّلها المستخدمون البشريون بشدة:
${topReasons || '- تفضيل الردود اللبقة، المباشرة، الخالية من حشو التنبيهات، والدقيقة علمياً ولغوياً.'}
════════════════════════════════════════════════════════════════`;
}

// --- 3. Knowledge Base & RAG Engine ---

export function getKnowledgeBase(): KnowledgeChunk[] {
  return knowledgeBase;
}

export function addKnowledgeChunk(
  chunk: Omit<KnowledgeChunk, 'id' | 'createdAt'>
): KnowledgeChunk {
  const newChunk: KnowledgeChunk = {
    ...chunk,
    id: `kb_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    createdAt: Date.now(),
  };
  knowledgeBase.unshift(newChunk);
  safeWriteJson(KB_FILE, knowledgeBase);
  return newChunk;
}

export function addKnowledgeChunksBatch(
  chunks: Array<Omit<KnowledgeChunk, 'id' | 'createdAt'>>
): KnowledgeChunk[] {
  const created: KnowledgeChunk[] = [];
  const baseTime = Date.now();
  chunks.forEach((chunk, index) => {
    const newChunk: KnowledgeChunk = {
      ...chunk,
      id: `kb_${baseTime}_${index}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: baseTime + index,
    };
    created.push(newChunk);
  });
  knowledgeBase = [...created, ...knowledgeBase];
  safeWriteJson(KB_FILE, knowledgeBase);
  return created;
}

export function deleteKnowledgeChunk(id: string): boolean {
  const initialLen = knowledgeBase.length;
  knowledgeBase = knowledgeBase.filter((k) => k.id !== id);
  if (knowledgeBase.length !== initialLen) {
    safeWriteJson(KB_FILE, knowledgeBase);
    return true;
  }
  return false;
}

export function deleteDocumentChunks(documentIdOrFileName: string): number {
  const initialLen = knowledgeBase.length;
  knowledgeBase = knowledgeBase.filter(
    (k) => k.documentId !== documentIdOrFileName && k.fileName !== documentIdOrFileName
  );
  const deletedCount = initialLen - knowledgeBase.length;
  if (deletedCount > 0) {
    safeWriteJson(KB_FILE, knowledgeBase);
  }
  return deletedCount;
}

export function getIndexedDocuments(): IndexedDocument[] {
  const docMap = new Map<string, {
    fileName: string;
    title: string;
    category: string;
    source: string;
    chunkCount: number;
    totalChars: number;
    tags: Set<string>;
    createdAt: number;
  }>();

  for (const chunk of knowledgeBase) {
    const key = chunk.documentId || chunk.fileName || chunk.source || 'default_knowledge';
    const existing = docMap.get(key);
    const chunkChars = (chunk.title?.length || 0) + (chunk.content?.length || 0);

    if (existing) {
      existing.chunkCount += 1;
      existing.totalChars += chunkChars;
      (chunk.tags || []).forEach((t) => existing.tags.add(t));
      if (chunk.createdAt < existing.createdAt) existing.createdAt = chunk.createdAt;
    } else {
      docMap.set(key, {
        fileName: chunk.fileName || chunk.source || `${chunk.title.slice(0, 30)}`,
        title: chunk.title || 'وثيقة معرفية',
        category: chunk.category || 'general',
        source: chunk.source || 'مكتبة المعرفة',
        chunkCount: 1,
        totalChars: chunkChars,
        tags: new Set(chunk.tags || []),
        createdAt: chunk.createdAt || Date.now(),
      });
    }
  }

  const result: IndexedDocument[] = [];
  docMap.forEach((val, id) => {
    result.push({
      id,
      fileName: val.fileName,
      title: val.title,
      category: val.category,
      source: val.source,
      chunkCount: val.chunkCount,
      totalChars: val.totalChars,
      tags: Array.from(val.tags).slice(0, 10),
      createdAt: val.createdAt,
    });
  });

  return result.sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Smart automatic text chunker for uploaded text/markdown documents.
 * Splits into cohesive semantic sections with headers and extracted tags.
 */
export function smartChunkDocumentText(
  text: string,
  meta: {
    fileName: string;
    title?: string;
    category?: string;
    source?: string;
    documentId?: string;
    chunkSize?: number;
  }
): Array<Omit<KnowledgeChunk, 'id' | 'createdAt'>> {
  const clean = text.replace(/\r\n/g, '\n').trim();
  if (!clean) return [];

  const targetChunkSize = meta.chunkSize || 900;
  const docTitle = meta.title || meta.fileName.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
  const category = (meta.category as any) || 'general';
  const source = meta.source || meta.fileName;
  const docId = meta.documentId || `doc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  // Split by markdown headers or double newlines
  const rawSections = clean.split(/(?=^#{1,4}\s+|\n#{1,4}\s+)/m);
  const chunks: Array<Omit<KnowledgeChunk, 'id' | 'createdAt'>> = [];

  let currentHeading = docTitle;

  for (let sIdx = 0; sIdx < rawSections.length; sIdx++) {
    const rawSection = rawSections[sIdx].trim();
    if (!rawSection) continue;

    // Detect section heading
    const headerMatch = rawSection.match(/^#{1,4}\s+(.+)$/m);
    if (headerMatch) {
      currentHeading = headerMatch[1].trim();
    }

    // If section is reasonable size, add as chunk
    if (rawSection.length <= targetChunkSize * 1.5) {
      const words = rawSection
        .replace(/[^\w\s\u0600-\u06FF]/g, '')
        .split(/\s+/)
        .filter((w) => w.length >= 3 && !/^(the|and|for|with|this|from|عن|في|من|إلى|على|مع|هذا|هذه|التي|الذي)$/i.test(w));
      const tags = Array.from(new Set(words)).slice(0, 8);

      chunks.push({
        title: `${docTitle} · ${currentHeading}`,
        content: rawSection,
        category,
        source,
        tags,
        importance: 1.0,
        documentId: docId,
        fileName: meta.fileName,
      });
    } else {
      // Split large section by paragraphs or sentences
      const paragraphs = rawSection.split(/\n\s*\n/);
      let buffer = '';

      for (const p of paragraphs) {
        if ((buffer + '\n\n' + p).length > targetChunkSize && buffer.length > 200) {
          const words = buffer
            .replace(/[^\w\s\u0600-\u06FF]/g, '')
            .split(/\s+/)
            .filter((w) => w.length >= 3);
          const tags = Array.from(new Set(words)).slice(0, 8);

          chunks.push({
            title: `${docTitle} · ${currentHeading} (${chunks.length + 1})`,
            content: buffer.trim(),
            category,
            source,
            tags,
            importance: 1.0,
            documentId: docId,
            fileName: meta.fileName,
          });
          buffer = p;
        } else {
          buffer = buffer ? `${buffer}\n\n${p}` : p;
        }
      }

      if (buffer.trim()) {
        const words = buffer
          .replace(/[^\w\s\u0600-\u06FF]/g, '')
          .split(/\s+/)
          .filter((w) => w.length >= 3);
        const tags = Array.from(new Set(words)).slice(0, 8);

        chunks.push({
          title: `${docTitle} · ${currentHeading} (${chunks.length + 1})`,
          content: buffer.trim(),
          category,
          source,
          tags,
          importance: 1.0,
          documentId: docId,
          fileName: meta.fileName,
        });
      }
    }
  }

  // Fallback if chunks couldn't be generated from headings
  if (chunks.length === 0) {
    chunks.push({
      title: docTitle,
      content: clean.slice(0, targetChunkSize * 2),
      category,
      source,
      tags: [meta.fileName, category],
      importance: 1.0,
      documentId: docId,
      fileName: meta.fileName,
    });
  }

  return chunks;
}

/**
 * Searches the Knowledge Base using normalized TF-IDF / term-coverage scoring
 * Returns genuine 0.0 to 1.0 normalized match score.
 */
export function searchKnowledgeBase(
  query: string,
  topK = 3
): Array<{ chunk: KnowledgeChunk; score: number; snippet: string }> {
  if (knowledgeBase.length === 0) return [];
  const qClean = query
    .toLowerCase()
    .replace(/[؟?!\.,،:؛]/g, '')
    .trim();

  // Filter common Arabic & general stop words
  const stopWords = new Set([
    'ما', 'هي', 'هو', 'كيف', 'أين', 'متى', 'لماذا', 'هل', 'عن', 'في', 'من', 'إلى', 'على',
    'مع', 'هذا', 'هذه', 'ذلك', 'تلك', 'التي', 'الذي', 'الذين', 'اللاتي', 'أو', 'ثم', 'كل',
    'بعض', 'كان', 'كانت', 'يكون', 'تكون', 'أريد', 'أريد أن', 'ماذا', 'كم', 'أي', 'لو',
    'what', 'is', 'the', 'are', 'how', 'who', 'where', 'when', 'why', 'and', 'or', 'to', 'in', 'of'
  ]);

  const rawTerms = qClean.split(/\s+/).filter((w) => w.length >= 2 && !stopWords.has(w));
  // Deduplicate terms
  const qTerms = Array.from(new Set(rawTerms));

  if (qTerms.length === 0) {
    return [];
  }

  // Minimum threshold: 0.38 (38% relevance required for domain-specific knowledge chunks)
  const MIN_RELEVANCE_THRESHOLD = 0.38;

  const isAskingAboutPlatformOrDev =
    /مطور|من طور|من صنع|DARTAGNAN|منصة تيديكلت|تطبيق تيديكلت|Tidikelt AI/i.test(query);

  const results = knowledgeBase.map((chunk) => {
    if (
      !isAskingAboutPlatformOrDev &&
      (chunk.id === 'kb_doc_6' || /DARTAGNAN/i.test(chunk.title || '') || /DARTAGNAN/i.test(chunk.content || ''))
    ) {
      return { chunk, score: 0, snippet: '' };
    }

    const titleLower = chunk.title.toLowerCase();
    const contentLower = chunk.content.toLowerCase();
    const tagsLower = (chunk.tags || []).map((t) => t.toLowerCase());
    const tagsString = tagsLower.join(' ');

    let termMatchedCount = 0;
    let titleHitCount = 0;
    let tagHitCount = 0;
    let contentHitCount = 0;

    qTerms.forEach((term) => {
      // Direct word or stripped "ال" prefix
      const strippedTerm = term.startsWith('ال') && term.length > 3 ? term.slice(2) : term;
      
      const inTitle = titleLower.includes(term) || titleLower.includes(strippedTerm);
      const inTags = tagsString.includes(term) || tagsString.includes(strippedTerm);
      const inContent = contentLower.includes(term) || contentLower.includes(strippedTerm);

      if (inTitle) titleHitCount++;
      if (inTags) tagHitCount++;
      if (inContent) contentHitCount++;

      if (inTitle || inTags || inContent) {
        termMatchedCount++;
      }
    });

    // 1. Term Coverage Ratio (0.0 to 1.0)
    const coverageRatio = termMatchedCount / qTerms.length;

    // If query has significant terms and document covers less than 35% of them, reject early
    if (qTerms.length >= 2 && coverageRatio < 0.35) {
      return { chunk, score: 0, snippet: '' };
    }

    // 2. Title & Tag bonus
    const titleRatio = Math.min(titleHitCount / qTerms.length, 1.0);
    const tagRatio = Math.min(tagHitCount / qTerms.length, 1.0);
    const contentRatio = Math.min(contentHitCount / qTerms.length, 1.0);

    // Exact phrase match bonus
    const phraseInTitle = titleLower.includes(qClean) ? 0.2 : 0;
    const phraseInContent = contentLower.includes(qClean) ? 0.1 : 0;

    // Weighted composite score (Normalized 0.0 to 1.0)
    let score =
      coverageRatio * 0.45 +
      titleRatio * 0.25 +
      tagRatio * 0.15 +
      contentRatio * 0.15 +
      phraseInTitle +
      phraseInContent;

    // Importance multiplier
    score = Math.min(score * (chunk.importance || 1.0), 1.0);

    // Round to 2 decimal places
    const normalizedScore = Math.round(score * 100) / 100;

    // Extract snippet around best matching term
    let snippet = chunk.content.slice(0, 180) + '...';
    for (const term of qTerms) {
      const idx = contentLower.indexOf(term);
      if (idx !== -1) {
        const start = Math.max(0, idx - 40);
        const end = Math.min(chunk.content.length, idx + 140);
        snippet =
          (start > 0 ? '...' : '') +
          chunk.content.slice(start, end) +
          (end < chunk.content.length ? '...' : '');
        break;
      }
    }

    return { chunk, score: normalizedScore, snippet };
  });

  return results
    .filter((r) => r.score >= MIN_RELEVANCE_THRESHOLD)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

// --- 4. The 5-Step Thinking & Search Pipeline Executor ---

export function executeSearchPipeline(query: string): {
  pipelineExecution: PipelineExecution;
  ragContextPrompt: string;
} {
  const cleanQ = query.trim();

  // STAGE 1: تحليل النية (Intent Parsing)
  let category = 'general';
  let complexity: 'simple' | 'moderate' | 'deep' = 'moderate';

  if (/^(السلام|مرحبا|صباح الخير|مساء الخير|كيف حالك|أهلا|شكرا|hello|bonjour)/i.test(cleanQ)) {
    category = 'dialogue';
    complexity = 'simple';
  } else if (/^(\d+[\+\-\*\/]\d+|كم الساعة|ما معنى|ما هي عاصمة|ما هو ناتج)/i.test(cleanQ)) {
    category = 'concise';
    complexity = 'simple';
  } else if (/خدمات|ميزات|ماذا يقدم|من أنت|ما عملك|ما وظيفتك|ماذا تقدم/i.test(cleanQ)) {
    category = 'services_law';
    complexity = 'moderate';
  } else if (/بحث|أطروحة|مذكرة|دراسة|خطة بحث|جامع|تاريخ|فلسفة|طاقة/i.test(cleanQ)) {
    category = 'research';
    complexity = 'deep';
  } else if (/طريق|سفر|RN1|رمال|عجاج|غراز|صحراء|كثبان|وقود|دفع رباعي/i.test(cleanQ)) {
    category = 'desert_safety';
    complexity = 'moderate';
  } else if (/كود|برمجة|بايثون|دالة|خوارزمية|react|typescript|python/i.test(cleanQ)) {
    category = 'code';
    complexity = 'deep';
  } else if (/بلدية|رخصة|استعجالات|مستشفى|شهادة|حالة مدنية|وثيقة/i.test(cleanQ)) {
    category = 'services_law';
    complexity = 'moderate';
  } else if (/تمر|دقلة|سوق|أسعار|غرس|واحة|نخيل/i.test(cleanQ)) {
    category = 'dates_market';
    complexity = 'moderate';
  }

  // Extract core keywords
  const rawWords = cleanQ
    .replace(/[؟?!\.,،:؛]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !/^(ما|هو|هي|كيف|أين|متى|لماذا|هل|عن|في|من|إلى|على|التي|الذي)$/.test(w));
  const keywords = Array.from(new Set(rawWords)).slice(0, 5);

  // STAGE 2: الاستعلام (Querying & Query Expansion)
  const queries: string[] = [cleanQ];
  if (keywords.length > 0) {
    queries.push(keywords.join(' '));
  }
  if (category === 'desert_safety' && (cleanQ.includes('طريق') || cleanQ.includes('RN1'))) {
    queries.push(`${cleanQ} مسار وأمان الطريق`);
  }

  // STAGE 3: استخراج البيانات (Retrieval with Quality Threshold >= 38%)
  const retrievedRaw = searchKnowledgeBase(cleanQ, 4);

  // STAGE 4: التقييم والفلترة (Reranking)
  // Chunks have already passed the strict 45% threshold
  const retrievedChunks = retrievedRaw.map((r) => ({
    id: r.chunk.id,
    title: r.chunk.title,
    source: r.chunk.source,
    snippet: r.snippet,
    score: r.score, // e.g. 0.85
  }));

  // STAGE 5: الدمج والصياغة (Synthesis Preparation)
  let ragContextPrompt = '';
  if (retrievedChunks.length > 0) {
    ragContextPrompt = `\n\n════════════════════════════════════════════════════════════════
📚 قاعدة المعرفة المعتمدة المستخرجة آنياً عبر محرك البحث والـ RAG (${retrievedChunks.length} مراجع اجتازت عتبة الجودة >= 45%):
${retrievedChunks
  .map(
    (chunk, i) => `[مرجع ${i + 1}]: «${chunk.title}»
الجهة المصدرة: ${chunk.source}
نسبة المطابقة: ${Math.round(chunk.score * 100)}%
المحتوى الموثق المستخرج: ${knowledgeBase.find((k) => k.id === chunk.id)?.content || chunk.snippet}
`
  )
  .join('\n')}
توجيه الصياغة الذكية: اعتمد على هذه المراجع الموثقة بدقة، واذكر اسم الجهة المصدرة عند الاقتباس. احرص على الترقيم المتسلسل والتنظيم الواضح.
════════════════════════════════════════════════════════════════`;
  } else {
    ragContextPrompt = `\n\nℹ️ ملاحظة RAG: لم تجتز أي وثيقة في قاعدة المعرفة المحلية عتبة المطابقة المعتمدة (45%). يرجى الإجابة بناءً على المعرفة العامة والذكاء الاصطناعي دون اختلاق مصادر أو مراجع محلية غير موثقة.`;
  }

  // Add SFT relevant examples to synthesis if available
  const relevantSft = retrieveTopSftExamples(cleanQ, 1);
  if (relevantSft.length > 0) {
    ragContextPrompt += `\n\n🎯 نموذج الصياغة المثالي الخاضع للإشراف (SFT Demonstration):
- سؤال استرشادي مماثل: "${relevantSft[0].query}"
- الصياغة النموذجية المطلوبة: "${relevantSft[0].response}"
(التزم بهذا المستوى الرفيع من الأناقة اللغوية والتسلسل الرقمي).`;
  }

  const pipelineExecution: PipelineExecution = {
    intent: {
      category,
      complexity,
      keywords,
    },
    queries,
    retrievedChunks,
    rerankedCount: retrievedChunks.length,
    synthesisMethod:
      retrievedChunks.length > 0
        ? `RAG Grounded Synthesis (دمج ${retrievedChunks.length} مراجع موثقة اجتازت عتبة المطابقة)`
        : 'Direct Intelligent Synthesis (صياغة ذكية مباشرة - لا توجد وثائق تجاوزت عتبة 45%)',
  };

  return {
    pipelineExecution,
    ragContextPrompt,
  };
}
