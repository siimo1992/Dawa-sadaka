/**
 * tidikeltAssistantRoutes.ts — المنسق الشامل والمسارات المتكاملة لتيدكلت AI
 *
 * يربط:
 *  1) فهم القصد وتصحيح الإملاء واللهجة والربط السياقي (intentAndContextEngine)
 *  2) إنشاء وتحويل الملفات الحقيقية عند الطلب الصريح فقط (fileGeneratorEngine)
 *  3) ذاكرة الجلسة والذاكرة طويلة المدى القابلة للتحكم (conversationMemoryEngine)
 *  4) البحث الذكي واستخراج المحتوى والمقارنة (smartWebSearchEngine)
 *  5) قراءة وتحليل ومقارنة الملفات المرفوعة (uploadedFileAnalyzer)
 */
import fs from 'fs';
import type { Express, Request, Response } from 'express';
import {
  resolveUserIntentAndContext,
  type ConversationTurn,
  type SupportedFileFormat,
  type IntentAndContextAnalysis,
} from './intentAndContextEngine.ts';
import {
  generateAndVerifyFile,
  getGeneratedFileById,
  type GeneratedFileMetadata,
} from './fileGeneratorEngine.ts';
import {
  getOrCreateConversation,
  appendConversationTurn,
  saveSessionSources,
  appendGeneratedFileToConversation,
  appendUploadedFileToConversation,
  listUserConversations,
  deleteConversation,
  getUserMemoryProfile,
  setUserMemoryEnabled,
  upsertUserMemoryEntry,
  updateUserMemoryEntryById,
  deleteUserMemoryEntry,
  clearUserMemoryEntries,
  buildMemoryPromptContext,
} from './conversationMemoryEngine.ts';
import {
  enrichSearchSourcesWithPageContent,
  searchWikipediaSources,
  buildSessionSourceFollowUpContext,
} from './smartWebSearchEngine.ts';
import {
  analyzeUploadedFileBuffer,
  buildMultiFileComparisonPrompt,
  type AnalyzedUploadedFile,
} from './uploadedFileAnalyzer.ts';

export interface AssistantPreprocessOutput {
  conversationId: string;
  userId: string;
  analysis: IntentAndContextAnalysis;
  enrichedQueryForModel: string;
  systemContextInjection: string;
  immediateClarificationReply?: {
    text: string;
    options: string[];
  };
}

/**
 * يعالج طلب المستخدم قبل إرساله إلى النموذج:
 * - يحمّل سجل المحادثة ومصادر الجلسة والملفات المرفوعة
 * - يصحح الأخطاء الإملائية واللهجة الجزائرية والعامية
 * - يحفظ التفضيلات في الذاكرة طويلة المدى إن طلب المستخدم ذلك
 * - يبني السياق الكامل (التلخيص التراكمي + آخر الرسائل + شرح/مقارنة المصادر + مقارنة الملفات)
 */
export function preprocessAssistantRequest(params: {
  rawQuery: string;
  conversationId?: string;
  userId?: string;
  clientHistory?: Array<{ role: string; text?: string; content?: string }>;
  uploadedFilesPayload?: Array<{ filename: string; contentBase64?: string; textContent?: string }>;
}): AssistantPreprocessOutput {
  const userId = params.userId || 'default_user';
  const conv = getOrCreateConversation(params.conversationId, userId);

  // Merge client history into stored conversation if stored conversation is empty
  if (conv.messages.length === 0 && Array.isArray(params.clientHistory) && params.clientHistory.length > 0) {
    for (const h of params.clientHistory.slice(-12)) {
      const txt = String(h.text || h.content || '').trim();
      if (!txt) continue;
      appendConversationTurn(
        conv.conversation_id,
        {
          role: h.role === 'model' || h.role === 'assistant' ? 'assistant' : 'user',
          content: txt,
        },
        userId
      );
    }
  }

  // Analyze any newly uploaded files attached to the request
  const analyzedUploads: AnalyzedUploadedFile[] = [];
  if (Array.isArray(params.uploadedFilesPayload) && params.uploadedFilesPayload.length > 0) {
    for (const item of params.uploadedFilesPayload) {
      if (!item || !item.filename) continue;
      const buf = item.contentBase64
        ? Buffer.from(item.contentBase64.replace(/^data:[^;]+;base64,/, ''), 'base64')
        : Buffer.from(String(item.textContent || ''), 'utf8');
      const analyzed = analyzeUploadedFileBuffer(item.filename, buf);
      analyzedUploads.push(analyzed);
      appendUploadedFileToConversation(
        conv.conversation_id,
        {
          id: analyzed.id,
          filename: analyzed.filename,
          mimeType: analyzed.extension,
          extractedText: analyzed.extractedText,
          summary: analyzed.summary,
        },
        userId
      );
    }
  }

  const analysis = resolveUserIntentAndContext(
    params.rawQuery,
    conv.messages as ConversationTurn[],
    conv.sources
  );

  // Save user preference to Long-Term Memory if explicitly stated
  if (analysis.memoryPreferenceCommand) {
    upsertUserMemoryEntry(
      userId,
      analysis.memoryPreferenceCommand.key,
      analysis.memoryPreferenceCommand.value,
      'style'
    );
  }

  // If the query is ultra-short and ambiguous without prior context, return a concise clarifying question
  if (analysis.ambiguityCheck.isAmbiguous && conv.messages.length === 0 && analyzedUploads.length === 0) {
    return {
      conversationId: conv.conversation_id,
      userId,
      analysis,
      enrichedQueryForModel: analysis.expandedContextualPrompt,
      systemContextInjection: '',
      immediateClarificationReply: {
        text: analysis.ambiguityCheck.clarificationQuestion || 'هل يمكنك توضيح المقصود أكثر؟',
        options: analysis.ambiguityCheck.suggestedOptions || [],
      },
    };
  }

  const contextBlocks: string[] = [];

  // 1. Long-Term Memory preferences
  const memoryBlock = buildMemoryPromptContext(userId);
  if (memoryBlock) {
    contextBlocks.push(memoryBlock);
  }

  // 2. Rolling summary of older messages in this conversation
  if (conv.summary) {
    contextBlocks.push(`[ملخص السياق السابق للمحادثة]:\n${conv.summary}`);
  }

  // 3. Session source follow-up or comparison («اشرح المصدر الثاني»، «قارن النتيجة الأولى بالثالثة»)
  if (
    conv.sources.length > 0 &&
    (analysis.referencedSourceIndices.length > 0 ||
      analysis.intent === 'source_explanation' ||
      analysis.intent === 'comparison')
  ) {
    const srcFollowUp = buildSessionSourceFollowUpContext(
      conv.sources,
      analysis.referencedSourceIndices,
      analysis.intent === 'comparison'
    );
    if (srcFollowUp) {
      contextBlocks.push(srcFollowUp);
    }
  }

  // 4. Uploaded files analysis or multi-file comparison
  if (analyzedUploads.length > 0) {
    contextBlocks.push(buildMultiFileComparisonPrompt(analyzedUploads));
  } else if (
    conv.uploaded_files.length > 0 &&
    (analysis.intent === 'uploaded_file_analysis' ||
      analysis.intent === 'comparison' ||
      /ملف|المستند|الوثيقة|الجدول|قارن|لخص/i.test(params.rawQuery))
  ) {
    const storedAsAnalyzed: AnalyzedUploadedFile[] = conv.uploaded_files.slice(-3).map((u) => ({
      id: u.id,
      filename: u.filename,
      extension: u.mimeType,
      sizeBytes: u.extractedText.length,
      extractedText: u.extractedText,
      sections: [{ label: 'القسم 1', content: u.extractedText.slice(0, 3500) }],
      tables: [],
      wordCount: u.extractedText.split(/\s+/).length,
      summary: u.summary,
    }));
    contextBlocks.push(buildMultiFileComparisonPrompt(storedAsAnalyzed));
  }

  // 5. Dialect & spelling awareness directive
  if (analysis.appliedCorrections.length > 0) {
    contextBlocks.push(
      `[ملاحظة فهم اللغات واللهجات]: كتب المستخدم "${params.rawQuery}" والمقصود الدقيق هو "${analysis.correctedText}". أجب مباشرة وباحترافية دون إحراج المستخدم بشأن الأخطاء الإملائية.`
    );
  }

  return {
    conversationId: conv.conversation_id,
    userId,
    analysis,
    enrichedQueryForModel: analysis.expandedContextualPrompt,
    systemContextInjection: contextBlocks.join('\n\n'),
  };
}

/**
 * يعالج إجابة النموذج بعد توليدها:
 * - يسجل رسالة المستخدم وإجابة المساعد في سجل المحادثة المرتب
 * - يثري ويحفظ مصادر البحث في سياق الجلسة للرجوع إليها لاحقاً
 * - ينشئ الملف الفعلي القابل للتنزيل **فقط** إذا كان طلب المستخدم صريحاً بإنشاء أو تحويل ملف
 */
export async function postprocessAssistantResponse(params: {
  conversationId: string;
  userId?: string;
  rawUserQuery: string;
  assistantReplyText: string;
  analysis: IntentAndContextAnalysis;
  rawSources?: Array<{ title: string; url: string; snippet?: string }>;
}): Promise<{
  conversationId: string;
  generatedFile: GeneratedFileMetadata | null;
  enrichedSources: Array<{
    index: number;
    title: string;
    url: string;
    snippet: string;
    publishedDate?: string;
    domain: string;
  }>;
}> {
  const userId = params.userId || 'default_user';
  const convId = params.conversationId;

  // Find last assistant message before appending current turns (useful if user said "حولها لبدياف")
  const existingConv = getOrCreateConversation(convId, userId);
  const previousAssistantTurn = [...existingConv.messages]
    .reverse()
    .find((m) => m.role === 'assistant');

  // Record user turn and assistant reply
  appendConversationTurn(convId, { role: 'user', content: params.rawUserQuery }, userId);
  appendConversationTurn(convId, { role: 'assistant', content: params.assistantReplyText }, userId);

  // Enrich and persist search sources if present
  let enrichedSources: Array<{
    index: number;
    title: string;
    url: string;
    snippet: string;
    publishedDate?: string;
    domain: string;
  }> = [];

  if (Array.isArray(params.rawSources) && params.rawSources.length > 0) {
    const enriched = await enrichSearchSourcesWithPageContent(params.rawSources);
    saveSessionSources(convId, enriched, userId);
    enrichedSources = enriched.map((s) => ({
      index: s.index,
      title: s.title,
      url: s.url,
      snippet: s.snippet,
      publishedDate: s.publishedDate,
      domain: s.domain,
    }));
  } else if (existingConv.sources.length > 0) {
    enrichedSources = existingConv.sources.map((s) => ({
      index: s.index,
      title: s.title,
      url: s.url,
      snippet: s.snippet,
      publishedDate: s.publishedDate,
      domain: 'web',
    }));
  }

  // Strictly check if the user EXPLICITLY requested file generation or conversion
  let generatedFile: GeneratedFileMetadata | null = null;
  if (params.analysis.explicitFileRequest && params.analysis.requestedFileFormat) {
    const format: SupportedFileFormat = params.analysis.requestedFileFormat;
    // If user asked to convert previous answer ("حولها لبدياف") and previous answer is richer, combine or use it
    const isConvertingPrevious =
      params.analysis.referencedPreviousTurn &&
      previousAssistantTurn &&
      previousAssistantTurn.content.length > 40 &&
      params.rawUserQuery.trim().split(/\s+/).length <= 8;

    const contentToExport = isConvertingPrevious
      ? `${previousAssistantTurn!.content}\n\n${params.assistantReplyText}`
      : params.assistantReplyText;

    const cleanTitle =
      params.rawUserQuery
        .replace(/حولها|حوله|ديرلي|اعمل|انشئ|أنشئ|ملف|تقرير|بصيغة|إلى|لـ|pdf|docx|xlsx|pptx|word|excel|csv|html|md|txt/gi, '')
        .trim()
        .slice(0, 50) || 'وثيقة_تيدكلت_AI';

    try {
      generatedFile = generateAndVerifyFile({
        title: cleanTitle,
        content: contentToExport,
        format,
      });
      appendGeneratedFileToConversation(convId, generatedFile, userId);
    } catch (err) {
      console.error('[FileGeneratorEngine Error]:', err);
    }
  }

  return {
    conversationId: convId,
    generatedFile,
    enrichedSources,
  };
}

/* ───────────────────────── Register Express Routes ───────────────────────── */

export function registerTidikeltAssistantRoutes(app: Express): void {
  // 1. Explicit File Generation / Conversion Route
  app.post('/api/files/generate', (req: Request, res: Response) => {
    try {
      const {
        title = 'وثيقة تيدكلت AI',
        content = '',
        format = 'pdf',
        tables,
        slides,
        conversation_id,
        user_id = 'default_user',
      } = req.body || {};

      const validFormats: SupportedFileFormat[] = [
        'pdf',
        'docx',
        'xlsx',
        'pptx',
        'csv',
        'txt',
        'md',
        'html',
      ];
      const normalizedFormat = String(format || 'pdf').toLowerCase() as SupportedFileFormat;
      const finalFormat: SupportedFileFormat = validFormats.includes(normalizedFormat)
        ? normalizedFormat
        : 'pdf';

      if (!String(content || '').trim() && (!Array.isArray(tables) || tables.length === 0)) {
        res.status(400).json({ error: 'المحتوى مطلوب لإنشاء الملف.' });
        return;
      }

      const fileMeta = generateAndVerifyFile({
        title: String(title || 'وثيقة تيدكلت AI').trim(),
        content: String(content || ''),
        format: finalFormat,
        tables: Array.isArray(tables) ? tables : undefined,
        slides: Array.isArray(slides) ? slides : undefined,
      });

      if (conversation_id) {
        appendGeneratedFileToConversation(String(conversation_id), fileMeta, String(user_id));
      }

      res.json({
        success: true,
        file: fileMeta,
      });
    } catch (err: any) {
      res.status(500).json({
        error: err?.message || 'تعذر إنشاء الملف المطلوب.',
      });
    }
  });

  // 2. Real File Download / Inline Preview Route
  app.get('/api/files/download/:id', (req: Request, res: Response) => {
    try {
      const fileId = String(req.params.id || '').trim();
      const entry = getGeneratedFileById(fileId);
      if (!entry || !fs.existsSync(entry.diskPath)) {
        res.status(404).json({ error: 'الملف غير موجود أو انتهت صلاحيته.' });
        return;
      }

      const isInline = req.query.inline === '1' || req.query.inline === 'true';
      const dispositionType = isInline ? 'inline' : 'attachment';
      const encodedFilename = encodeURIComponent(entry.filename);

      res.setHeader('Content-Type', entry.mimeType);
      res.setHeader('Content-Length', String(entry.sizeBytes));
      res.setHeader(
        'Content-Disposition',
        `${dispositionType}; filename="tidikelt.${entry.format}"; filename*=UTF-8''${encodedFilename}`
      );

      const stream = fs.createReadStream(entry.diskPath);
      stream.pipe(res);
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'تعذر تنزيل الملف.' });
    }
  });

  // 3. Uploaded File(s) Analysis & Multi-File Comparison Route
  app.post('/api/files/analyze', (req: Request, res: Response) => {
    try {
      const { files = [], conversation_id, user_id = 'default_user' } = req.body || {};
      if (!Array.isArray(files) || files.length === 0) {
        res.status(400).json({ error: 'يرجى إرفاق ملف واحد على الأقل للتحليل.' });
        return;
      }

      const analyzedList: AnalyzedUploadedFile[] = [];
      for (const f of files) {
        if (!f || !f.filename) continue;
        const buf = f.contentBase64
          ? Buffer.from(String(f.contentBase64).replace(/^data:[^;]+;base64,/, ''), 'base64')
          : Buffer.from(String(f.textContent || ''), 'utf8');
        const analyzed = analyzeUploadedFileBuffer(String(f.filename), buf);
        analyzedList.push(analyzed);

        if (conversation_id) {
          appendUploadedFileToConversation(
            String(conversation_id),
            {
              id: analyzed.id,
              filename: analyzed.filename,
              mimeType: analyzed.extension,
              extractedText: analyzed.extractedText,
              summary: analyzed.summary,
            },
            String(user_id)
          );
        }
      }

      const comparisonPrompt = buildMultiFileComparisonPrompt(analyzedList);

      res.json({
        success: true,
        files: analyzedList,
        comparisonPrompt,
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'تعذر تحليل الملفات المرفوعة.' });
    }
  });

  // 4. Long-Term Memory CRUD Routes (User Controllable)
  app.get('/api/memory', (req: Request, res: Response) => {
    const userId = String(req.query.user_id || 'default_user');
    const profile = getUserMemoryProfile(userId);
    res.json(profile);
  });

  app.post('/api/memory', (req: Request, res: Response) => {
    const { user_id = 'default_user', key, value, category = 'general' } = req.body || {};
    if (!key || !value) {
      res.status(400).json({ error: 'الخاصية والقيمة مطلوبتان لحفظ الذاكرة.' });
      return;
    }
    const profile = upsertUserMemoryEntry(String(user_id), String(key), String(value), category);
    res.json(profile);
  });

  app.put('/api/memory/:id', (req: Request, res: Response) => {
    const { user_id = 'default_user', key, value, category } = req.body || {};
    const profile = updateUserMemoryEntryById(String(user_id), String(req.params.id), {
      key,
      value,
      category,
    });
    res.json(profile);
  });

  app.post('/api/memory/toggle', (req: Request, res: Response) => {
    const { user_id = 'default_user', enabled = true } = req.body || {};
    const profile = setUserMemoryEnabled(String(user_id), Boolean(enabled));
    res.json(profile);
  });

  app.delete('/api/memory/:id', (req: Request, res: Response) => {
    const userId = String(req.query.user_id || req.body?.user_id || 'default_user');
    const profile = deleteUserMemoryEntry(userId, String(req.params.id));
    res.json(profile);
  });

  app.delete('/api/memory', (req: Request, res: Response) => {
    const userId = String(req.query.user_id || req.body?.user_id || 'default_user');
    const profile = clearUserMemoryEntries(userId);
    res.json(profile);
  });

  // 5. Conversations History & Context Routes
  app.get('/api/conversations', (req: Request, res: Response) => {
    const userId = String(req.query.user_id || 'default_user');
    const list = listUserConversations(userId);
    res.json({ conversations: list });
  });

  app.get('/api/conversations/:id', (req: Request, res: Response) => {
    const userId = String(req.query.user_id || 'default_user');
    const conv = getOrCreateConversation(String(req.params.id), userId);
    res.json(conv);
  });

  app.delete('/api/conversations/:id', (req: Request, res: Response) => {
    const deleted = deleteConversation(String(req.params.id));
    res.json({ success: deleted });
  });

  // 6. Smart Web Search & Source Enrichment Endpoint
  app.post('/api/smart-search', async (req: Request, res: Response) => {
    try {
      const { query = '', lang = 'ar', conversation_id, user_id = 'default_user' } = req.body || {};
      const cleanQ = String(query || '').trim();
      if (!cleanQ) {
        res.status(400).json({ error: 'استعلام البحث مطلوب.' });
        return;
      }
      const wikiResults = await searchWikipediaSources(
        cleanQ,
        lang === 'fr' ? 'fr' : lang === 'en' ? 'en' : 'ar',
        5
      );
      const enriched = await enrichSearchSourcesWithPageContent(wikiResults);
      if (conversation_id && enriched.length > 0) {
        saveSessionSources(String(conversation_id), enriched, String(user_id));
      }
      res.json({
        query: cleanQ,
        sources: enriched,
      });
    } catch (err: any) {
      res.status(500).json({ error: err?.message || 'فشل البحث الذكي.' });
    }
  });
}
