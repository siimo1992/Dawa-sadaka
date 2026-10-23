import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Brain,
  BookOpen,
  Scale,
  Plus,
  Trash2,
  Search,
  Download,
  CheckCircle2,
  Layers,
  ThumbsUp,
  Cpu,
  Loader2,
  FileText,
  Tag,
  Hash,
  Upload,
  Image as ImageIcon,
  RotateCcw,
  UserCheck,
  FileUp,
  FileCheck,
  FolderArchive,
  Eye,
  Filter,
  Check,
} from 'lucide-react';
import type { SftExample, RlhfComparison, KnowledgeChunk, IndexedDocument, AppLanguage } from '../types';
import { LOCALIZED_AGENTS, DEFAULT_AGENT_AVATARS } from '../i18n/translations';

export interface AgentAvatarItem {
  id: string;
  name: string;
  emoji: string;
  avatarUrl?: string;
  desc: string;
  prompt: string;
}

interface TrainingAndRagStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang?: AppLanguage | string;
  agents?: AgentAvatarItem[];
  customAvatars?: Record<string, string>;
  onUpdateAgentAvatar?: (agentId: string, avatarUrl: string | null) => void;
  initialTab?: 'sft' | 'rlhf' | 'rag' | 'avatars';
}

export const TrainingAndRagStudioModal: React.FC<TrainingAndRagStudioModalProps> = ({
  isOpen,
  onClose,
  lang = 'ar',
  agents,
  customAvatars: externalCustomAvatars,
  onUpdateAgentAvatar,
  initialTab = 'sft',
}) => {
  const [activeTab, setActiveTab] = useState<'sft' | 'rlhf' | 'rag' | 'avatars'>(initialTab);

  // SFT State
  const [sftDataset, setSftDataset] = useState<SftExample[]>([]);
  const [sftFilter, setSftFilter] = useState('');
  const [newSftQuery, setNewSftQuery] = useState('');
  const [newSftResponse, setNewSftResponse] = useState('');
  const [newSftCategory, setNewSftCategory] = useState<SftExample['category']>('dialogue');
  const [newSftSource, setNewSftSource] = useState('');
  const [isAddingSft, setIsAddingSft] = useState(false);

  // RLHF State
  const [rlhfComparisons, setRlhfComparisons] = useState<RlhfComparison[]>([]);
  const [arenaPrompt, setArenaPrompt] = useState('ما هي أهمية الطاقة الشمسية في عين صالح؟');
  const [arenaResponseA, setArenaResponseA] = useState('');
  const [arenaResponseB, setArenaResponseB] = useState('');
  const [isGeneratingPair, setIsGeneratingPair] = useState(false);
  const [votedChoice, setVotedChoice] = useState<'A' | 'B' | null>(null);
  const [voteReason, setVoteReason] = useState('');
  const [voteCriteria, setVoteCriteria] = useState<RlhfComparison['criteria']>('accurate');
  const [isSubmittingVote, setIsSubmittingVote] = useState(false);

  // RAG Knowledge Base State
  const [knowledgeBase, setKnowledgeBase] = useState<KnowledgeChunk[]>([]);
  const [ragSearchQuery, setRagSearchQuery] = useState('');
  const [ragSearchResults, setRagSearchResults] = useState<any[]>([]);
  const [isSearchingRag, setIsSearchingRag] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocContent, setNewDocContent] = useState('');
  const [newDocCategory, setNewDocCategory] = useState<KnowledgeChunk['category']>('general');
  const [newDocSource, setNewDocSource] = useState('');
  const [newDocTags, setNewDocTags] = useState('');
  const [isAddingDoc, setIsAddingDoc] = useState(false);

  // Custom Knowledge Documents Indexing & Upload State
  const [ragSubTab, setRagSubTab] = useState<'upload' | 'documents' | 'simulator' | 'chunks'>('upload');
  const [indexedDocs, setIndexedDocs] = useState<IndexedDocument[]>([]);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadDocTitle, setUploadDocTitle] = useState('');
  const [uploadCategory, setUploadCategory] = useState<string>('science_energy');
  const [uploadSource, setUploadSource] = useState('');
  const [uploadDirectText, setUploadDirectText] = useState('');
  const [isDirectTextMode, setIsDirectTextMode] = useState(false);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [uploadProgressMsg, setUploadProgressMsg] = useState<string | null>(null);
  const [lastIndexedResult, setLastIndexedResult] = useState<{
    doc: IndexedDocument;
    chunksCount: number;
  } | null>(null);
  const [activeDocFilter, setActiveDocFilter] = useState<string | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  const [loading, setLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Agent Avatars State
  const [localAvatars, setLocalAvatars] = useState<Record<string, string>>(() => {
    try {
      const saved = localStorage.getItem('ain_salah_agent_avatars');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [uploadingAgentId, setUploadingAgentId] = useState<string | null>(null);
  const [urlInputByAgent, setUrlInputByAgent] = useState<Record<string, string>>({});

  const effectiveAvatars = externalCustomAvatars || localAvatars;
  const displayAgents: AgentAvatarItem[] =
    agents && agents.length > 0
      ? agents
      : LOCALIZED_AGENTS[(lang === 'en' || lang === 'fr' ? lang : 'ar') as 'ar' | 'en' | 'fr'];

  const ADMIN_HEADERS = { 'x-admin-token': '159159' };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Fetch initial data
  const fetchData = async () => {
    setLoading(true);
    try {
      const [sftRes, rlhfRes, ragRes, docsRes, avatarsRes] = await Promise.all([
        fetch('/api/training/sft', { headers: ADMIN_HEADERS }).then((r) => r.json()),
        fetch('/api/training/rlhf', { headers: ADMIN_HEADERS }).then((r) => r.json()),
        fetch('/api/rag/knowledge-base').then((r) => r.json()),
        fetch('/api/rag/documents')
          .then((r) => (r.ok ? r.json() : { documents: [] }))
          .catch(() => ({ documents: [] })),
        fetch('/api/training/agent-avatars')
          .then((r) => (r.ok ? r.json() : { avatars: {} }))
          .catch(() => ({ avatars: {} })),
      ]);

      if (sftRes?.dataset) setSftDataset(sftRes.dataset);
      if (rlhfRes?.comparisons) setRlhfComparisons(rlhfRes.comparisons);
      if (ragRes?.documents) setKnowledgeBase(ragRes.documents);
      if (docsRes?.documents) setIndexedDocs(docsRes.documents);
      if (avatarsRes?.avatars && typeof avatarsRes.avatars === 'object') {
        setLocalAvatars((prev) => {
          const merged = { ...prev, ...avatarsRes.avatars };
          localStorage.setItem('ain_salah_agent_avatars', JSON.stringify(merged));
          return merged;
        });
      }
    } catch (err) {
      console.error('Failed to load training data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Save or Reset Agent Avatar
  const handleSaveAgentAvatar = async (agentId: string, avatarDataUrl: string | null) => {
    setUploadingAgentId(agentId);
    try {
      const next = { ...effectiveAvatars };
      if (!avatarDataUrl) {
        delete next[agentId];
      } else {
        next[agentId] = avatarDataUrl;
      }
      setLocalAvatars(next);
      localStorage.setItem('ain_salah_agent_avatars', JSON.stringify(next));
      if (onUpdateAgentAvatar) {
        onUpdateAgentAvatar(agentId, avatarDataUrl);
      }

      if (avatarDataUrl) {
        await fetch('/api/training/agent-avatars', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...ADMIN_HEADERS },
          body: JSON.stringify({ agentId, avatarUrl: avatarDataUrl }),
        });
        showToast('تم رفع وحفظ الصورة الرمزية المخصصة للوكيل بنجاح!');
      } else {
        await fetch(`/api/training/agent-avatars/${agentId}`, {
          method: 'DELETE',
          headers: ADMIN_HEADERS,
        });
        showToast('تمت استعادة الصورة الرمزية الافتراضية للوكيل.');
      }
    } catch (err) {
      console.error('Failed to save agent avatar:', err);
      showToast('تم حفظ الصورة محلياً بنجاح.');
    } finally {
      setUploadingAgentId(null);
    }
  };

  // Compress & Resize uploaded image file to 256x256 Data URL
  const handleAvatarFileChange = (agentId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('يرجى اختيار ملف صورة صالح (PNG, JPG, WebP, SVG).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const rawDataUrl = event.target?.result as string;
      if (!rawDataUrl) return;

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 256;
        let w = img.width;
        let h = img.height;
        if (w > h) {
          if (w > maxDim) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          }
        } else {
          if (h > maxDim) {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          const compressed = canvas.toDataURL('image/webp', 0.88);
          handleSaveAgentAvatar(agentId, compressed);
        } else {
          handleSaveAgentAvatar(agentId, rawDataUrl);
        }
      };
      img.onerror = () => {
        handleSaveAgentAvatar(agentId, rawDataUrl);
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Add SFT Example
  const handleAddSft = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSftQuery.trim() || !newSftResponse.trim()) return;
    setIsAddingSft(true);
    try {
      const res = await fetch('/api/training/sft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...ADMIN_HEADERS },
        body: JSON.stringify({
          query: newSftQuery,
          response: newSftResponse,
          category: newSftCategory,
          source: newSftSource || 'إضافة المشرف اليدوية',
          qualityScore: 1.0,
        }),
      });
      const data = await res.json();
      if (data.success && data.example) {
        setSftDataset((prev) => [data.example, ...prev]);
        setNewSftQuery('');
        setNewSftResponse('');
        showToast('تمت إضافة المثال النموذجي إلى بيانات التدريب SFT بنجاح!');
      }
    } catch {
      showToast('تعذر حفظ المثال التدريبي.');
    } finally {
      setIsAddingSft(false);
    }
  };

  // Delete SFT Example
  const handleDeleteSft = async (id: string) => {
    try {
      await fetch(`/api/training/sft/${id}`, {
        method: 'DELETE',
        headers: ADMIN_HEADERS,
      });
      setSftDataset((prev) => prev.filter((item) => item.id !== id));
      showToast('تم حذف المثال من حزمة SFT.');
    } catch {
      showToast('فشل حذف المثال.');
    }
  };

  // Export Hugging Face Format
  const handleExportHuggingFace = () => {
    const hfFormat = sftDataset.map((item) => ({
      instruction: item.query,
      input: '',
      output: item.response,
      category: item.category,
      source: item.source,
    }));
    const blob = new Blob([JSON.stringify(hfFormat, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sft_arabic_dataset_${Date.now()}.json`;
    a.click();
    showToast('تم تصدير حزمة التدريب بنجاح بصيغة Hugging Face / JSON!');
  };

  // RLHF Arena Generate Pair
  const handleGeneratePair = async () => {
    if (!arenaPrompt.trim()) return;
    setIsGeneratingPair(true);
    setArenaResponseA('');
    setArenaResponseB('');
    setVotedChoice(null);
    try {
      const res = await fetch('/api/training/rlhf/generate-pair', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: arenaPrompt }),
      });
      const data = await res.json();
      if (data.responseA && data.responseB) {
        setArenaResponseA(data.responseA);
        setArenaResponseB(data.responseB);
      }
    } catch {
      showToast('تعذر توليد الردود المتنافسة.');
    } finally {
      setIsGeneratingPair(false);
    }
  };

  // Submit RLHF Vote
  const handleVoteRlhf = async (choice: 'A' | 'B') => {
    if (!arenaPrompt || !arenaResponseA || !arenaResponseB) return;
    setIsSubmittingVote(true);
    setVotedChoice(choice);
    try {
      const res = await fetch('/api/training/rlhf/vote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...ADMIN_HEADERS },
        body: JSON.stringify({
          prompt: arenaPrompt,
          responseA: arenaResponseA,
          responseB: arenaResponseB,
          chosen: choice,
          criteria: voteCriteria,
          reason: voteReason || (choice === 'A' ? 'الرد (أ) أكثر دقة وإيجازاً' : 'الرد (ب) أكثر شمولية'),
        }),
      });
      const data = await res.json();
      if (data.success && data.record) {
        setRlhfComparisons((prev) => [data.record, ...prev]);
        showToast('تم تسجيل تصويتك البشري في نموذج التفضيل (RLHF)!');
      }
    } catch {
      showToast('فشل تسجيل التصويت.');
    } finally {
      setIsSubmittingVote(false);
    }
  };

  // Add RAG Knowledge Document
  const handleAddKnowledgeDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocTitle.trim() || !newDocContent.trim()) return;
    setIsAddingDoc(true);
    try {
      const tags = newDocTags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      const res = await fetch('/api/rag/knowledge-base', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...ADMIN_HEADERS },
        body: JSON.stringify({
          title: newDocTitle,
          content: newDocContent,
          category: newDocCategory,
          source: newDocSource || 'مكتبة المعرفة والبحث',
          tags,
          importance: 1.0,
        }),
      });
      const data = await res.json();
      if (data.success && data.chunk) {
        setKnowledgeBase((prev) => [data.chunk, ...prev]);
        setNewDocTitle('');
        setNewDocContent('');
        setNewDocTags('');
        showToast('تمت إضافة الوثيقة وفهرستها في محرك RAG بنجاح!');
      }
    } catch {
      showToast('فشل حفظ الوثيقة.');
    } finally {
      setIsAddingDoc(false);
    }
  };

  // Delete RAG Document Chunk
  const handleDeleteDoc = async (id: string) => {
    try {
      await fetch(`/api/rag/knowledge-base/${id}`, {
        method: 'DELETE',
        headers: ADMIN_HEADERS,
      });
      setKnowledgeBase((prev) => prev.filter((k) => k.id !== id));
      showToast('تم حذف المقطع من قاعدة المعرفة.');
    } catch {
      showToast('فشل حذف المقطع.');
    }
  };

  // Handle local file selection for indexing
  const handleFileSelect = (file: File) => {
    setUploadFile(file);
    const cleanTitle = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
    if (!uploadDocTitle.trim()) {
      setUploadDocTitle(cleanTitle);
    }
    if (!uploadSource.trim()) {
      setUploadSource(file.name);
    }
    // Auto-detect category from file name if possible
    const lower = file.name.toLowerCase();
    if (lower.includes('med') || lower.includes('health') || lower.includes('طب') || lower.includes('صحة')) {
      setUploadCategory('medical_health');
    } else if (lower.includes('tech') || lower.includes('code') || lower.includes('برمج') || lower.includes('software')) {
      setUploadCategory('technology_code');
    } else if (lower.includes('law') || lower.includes('قانون') || lower.includes('نظام') || lower.includes('إدار')) {
      setUploadCategory('services_law');
    } else if (lower.includes('solar') || lower.includes('energy') || lower.includes('طاقة') || lower.includes('بيئة')) {
      setUploadCategory('science_energy');
    }
  };

  // Upload and Index Custom Document (PDF / Text / Markdown)
  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile && !uploadDirectText.trim()) {
      showToast('يرجى اختيار ملف (PDF, TXT, MD) أو كتابة نص المستند أولاً.');
      return;
    }

    setIsUploadingDoc(true);
    setUploadProgressMsg('جاري قراءة وتحليل بيانات المستند...');

    try {
      let fileContent = uploadDirectText.trim();
      let detectedFileName = uploadFile?.name || (uploadDocTitle.trim() ? `${uploadDocTitle.trim()}.txt` : 'custom_knowledge.txt');
      let detectedFileType = 'text';

      if (uploadFile) {
        detectedFileName = uploadFile.name;
        const isPdf = uploadFile.type === 'application/pdf' || uploadFile.name.toLowerCase().endsWith('.pdf');
        detectedFileType = isPdf ? 'pdf' : 'text';

        setUploadProgressMsg(isPdf ? 'جاري استخراج وفك بنية ملف PDF عبر الذكاء الاصطناعي...' : 'جاري قراءة وتجزئة محتوى الملف النصي...');

        fileContent = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          if (isPdf) {
            reader.readAsDataURL(uploadFile);
          } else {
            reader.readAsText(uploadFile);
          }
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = (err) => reject(err);
        });
      }

      setUploadProgressMsg('جاري التجزئة الدلالية إلى مقاطع معنونة وفهرستها في محرك RAG...');

      const res = await fetch('/api/rag/upload-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...ADMIN_HEADERS },
        body: JSON.stringify({
          fileName: detectedFileName,
          fileType: detectedFileType,
          content: fileContent,
          title: uploadDocTitle.trim() || undefined,
          category: uploadCategory,
          source: uploadSource.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'فشلت معالجة المستند');
      }

      if (Array.isArray(data.chunks)) {
        setKnowledgeBase((prev) => [...data.chunks, ...prev]);
      }
      if (data.document) {
        setIndexedDocs((prev) => [data.document, ...prev.filter((d) => d.id !== data.document.id)]);
      }

      setLastIndexedResult({
        doc: data.document,
        chunksCount: data.chunks?.length || 0,
      });

      // Clear file selection
      setUploadFile(null);
      setUploadDocTitle('');
      setUploadDirectText('');
      setUploadSource('');
      showToast(data.message || 'تمت فهرسة المستند بنجاح!');
    } catch (err: any) {
      showToast(err?.message || 'تعذر رفع وفهرسة المستند.');
    } finally {
      setIsUploadingDoc(false);
      setUploadProgressMsg(null);
    }
  };

  // Delete entire indexed document and its chunks
  const handleDeleteIndexedDocument = async (docId: string, title: string) => {
    if (!confirm(`هل أنت متأكد من حذف المستند «${title}» وجميع مقاطعه المعرفية من قاعدة المعرفة RAG؟`)) {
      return;
    }
    try {
      const res = await fetch(`/api/rag/documents/${encodeURIComponent(docId)}`, {
        method: 'DELETE',
        headers: ADMIN_HEADERS,
      });
      const data = await res.json();
      if (data.success) {
        setIndexedDocs((prev) => prev.filter((d) => d.id !== docId));
        setKnowledgeBase((prev) => prev.filter((k) => k.documentId !== docId && k.fileName !== docId));
        if (activeDocFilter === docId) setActiveDocFilter(null);
        showToast(data.message || 'تم حذف المستند ومقاطعه بنجاح.');
      } else {
        showToast(data.error || 'فشل حذف المستند.');
      }
    } catch {
      showToast('تعذر حذف المستند.');
    }
  };

  // Simulate RAG Search
  const handleSearchRagSimulator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ragSearchQuery.trim()) return;
    setIsSearchingRag(true);
    try {
      const res = await fetch('/api/rag/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: ragSearchQuery, topK: 4 }),
      });
      const data = await res.json();
      setRagSearchResults(data.results || []);
    } catch {
      showToast('تعذر إجراء محاكاة البحث.');
    } finally {
      setIsSearchingRag(false);
    }
  };

  // SFT filtered items
  const filteredSft = sftDataset.filter((item) => {
    if (!sftFilter) return true;
    const q = sftFilter.toLowerCase();
    return (
      item.query.toLowerCase().includes(q) ||
      item.response.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-sm animate-message-in">
      <div className="bg-[var(--card)] border border-[var(--line)] rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-[var(--line)] flex items-center justify-between shrink-0 bg-[var(--bg)]/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[var(--ink)] m-0 leading-tight">
                مستودع تدريب الذكاء وقاعدة المعرفة (RAG Studio)
              </h2>
              <p className="text-[11px] text-[var(--mute)] m-0">
                الضبط الدقيق SFT · تفضيل RLHF · مستودع المستندات RAG
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-[var(--mute)] hover:text-[var(--ink)] hover:bg-[var(--line)]/50 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="px-5 pt-3 pb-2 border-b border-[var(--line)] flex items-center gap-2 overflow-x-auto bg-[var(--card)] shrink-0">
          <button
            onClick={() => setActiveTab('sft')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'sft'
                ? 'bg-[var(--green)] text-white shadow-xs'
                : 'text-[var(--mute)] hover:text-[var(--ink)] hover:bg-[var(--bg)]'
            }`}
          >
            <Brain className="w-4 h-4" />
            <span>1. الضبط الدقيق (SFT Datasets)</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
              {sftDataset.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('rlhf')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'rlhf'
                ? 'bg-[var(--green)] text-white shadow-xs'
                : 'text-[var(--mute)] hover:text-[var(--ink)] hover:bg-[var(--bg)]'
            }`}
          >
            <Scale className="w-4 h-4" />
            <span>2. حلبة الملاحظات البشرية (RLHF Arena)</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
              {rlhfComparisons.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('rag')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'rag'
                ? 'bg-[var(--green)] text-white shadow-xs'
                : 'text-[var(--mute)] hover:text-[var(--ink)] hover:bg-[var(--bg)]'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>3. مستودع المستندات (RAG)</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
              {knowledgeBase.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('avatars')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'avatars'
                ? 'bg-[var(--green)] text-white shadow-xs'
                : 'text-[var(--mute)] hover:text-[var(--ink)] hover:bg-[var(--bg)]'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>4. صور وهويات الوكلاء (Avatars)</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
              {displayAgents.length}
            </span>
          </button>
        </div>

        {/* Modal Body / Tab Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* TAB 1: SFT DATASET */}
          {activeTab === 'sft' && (
            <div className="space-y-6">
              {/* Concept Banner */}
              <div className="p-3 sm:p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-xs flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 font-bold text-blue-700 dark:text-blue-300">
                  <Brain className="w-4 h-4" />
                  <span>أمثلة الضبط الدقيق (SFT Datasets)</span>
                </div>
                <button
                  onClick={handleExportHuggingFace}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-700 transition-colors cursor-pointer shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>تصدير حزمة Hugging Face JSON</span>
                </button>
              </div>

              {/* Add SFT Example Form */}
              <div className="p-4 rounded-2xl bg-[var(--bg)] border border-[var(--line)] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
                    <Plus className="w-4 h-4 text-[var(--green)]" />
                    <span>إضافة مثال تدريبي جديد (سؤال وجواب نموذجي)</span>
                  </span>
                  <span className="text-[10px] text-[var(--mute)]">عربي فصيح متقن</span>
                </div>

                <form onSubmit={handleAddSft} className="space-y-3">
                  <div>
                    <label className="text-[11px] font-semibold text-[var(--mute)] block mb-1">
                      السؤال أو استفسار المستخدم:
                    </label>
                    <input
                      type="text"
                      value={newSftQuery}
                      onChange={(e) => setNewSftQuery(e.target.value)}
                      placeholder="مثال: ما هي عاصمة الجزائر؟ أو كيفية فحص زيت المحرك في الصحراء..."
                      className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--card)] border border-[var(--line)] text-[var(--ink)] focus:outline-hidden focus:border-[var(--green)]"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-[var(--mute)] block mb-1">
                      الجواب النموذجي المعتمد (خالٍ من الأخطاء، مباشر وبليغ):
                    </label>
                    <textarea
                      rows={3}
                      value={newSftResponse}
                      onChange={(e) => setNewSftResponse(e.target.value)}
                      placeholder="اكتب الإجابة النموذجية المتقنة التي تريد أن يتعلم النموذج محاكاتها..."
                      className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--card)] border border-[var(--line)] text-[var(--ink)] focus:outline-hidden focus:border-[var(--green)] resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-[var(--mute)] block mb-1">
                        التصنيف:
                      </label>
                      <select
                        value={newSftCategory}
                        onChange={(e) => setNewSftCategory(e.target.value as any)}
                        className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--card)] border border-[var(--line)] text-[var(--ink)] focus:outline-hidden focus:border-[var(--green)]"
                      >
                        <option value="dialogue">تحية ودردشة راقية (Dialogue)</option>
                        <option value="concise">سؤال بسيط وإيجاز ذكي (Concise Q&A)</option>
                        <option value="research">بحث علمي وأكاديمي (Research)</option>
                        <option value="desert">سلامة ومسالك الصحراء (Desert Safety)</option>
                        <option value="code">برمجة وخوارزميات (Code)</option>
                        <option value="general">معرفة عامة (General)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-[var(--mute)] block mb-1">
                        المصدر أو المرجع المعتمد:
                      </label>
                      <input
                        type="text"
                        value={newSftSource}
                        onChange={(e) => setNewSftSource(e.target.value)}
                        placeholder="مثال: أطلس تديكلت، معجم الفصحى، دليل البقاء..."
                        className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--card)] border border-[var(--line)] text-[var(--ink)] focus:outline-hidden focus:border-[var(--green)]"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-1">
                    <button
                      type="submit"
                      disabled={isAddingSft || !newSftQuery.trim() || !newSftResponse.trim()}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--green)] text-white text-xs font-bold hover:opacity-90 disabled:opacity-50 cursor-pointer shadow-xs transition-all"
                    >
                      {isAddingSft ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                      <span>حفظ وإدراج في بيانات التدريب</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* SFT Dataset Browser */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <h3 className="text-xs font-bold text-[var(--ink)] m-0">
                    أمثلة التدريب المحفوظة ({filteredSft.length} من {sftDataset.length})
                  </h3>
                  <div className="relative min-w-[220px]">
                    <Search className="w-3.5 h-3.5 absolute start-2.5 top-1/2 -translate-y-1/2 text-[var(--mute)] pointer-events-none" />
                    <input
                      type="text"
                      value={sftFilter}
                      onChange={(e) => setSftFilter(e.target.value)}
                      placeholder="بحث في أسئلة وأجوبة SFT..."
                      className="w-full ps-8 pe-3 py-1.5 text-xs rounded-xl bg-[var(--bg)] border border-[var(--line)] text-[var(--ink)] focus:outline-hidden focus:border-[var(--green)]"
                    />
                  </div>
                </div>

                <div className="space-y-2.5">
                  {filteredSft.map((item) => (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-2xl bg-[var(--bg)] border border-[var(--line)] space-y-2 relative group hover:border-[var(--green)]/40 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[var(--green)]/15 text-[var(--green)] border border-[var(--green)]/30">
                            {item.category}
                          </span>
                          <span className="text-[11px] font-bold text-[var(--ink)]">
                            س: {item.query}
                          </span>
                        </div>
                        <button
                          onClick={() => handleDeleteSft(item.id)}
                          className="p-1.5 rounded-lg text-[var(--mute)] hover:text-rose-500 hover:bg-rose-500/10 cursor-pointer transition-colors"
                          title="حذف المثال"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="text-xs text-[var(--ink)] leading-relaxed ps-2 border-s-2 border-[var(--green)] bg-[var(--card)]/50 p-2 rounded-lg">
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400 block mb-0.5">
                          ج (الرد النموذجي):
                        </span>
                        {item.response}
                      </div>

                      <div className="flex flex-wrap items-center justify-between text-[10px] text-[var(--mute)] pt-1.5 border-t border-[var(--line)]/50 gap-2">
                        <span>📌 {item.source || 'قاعدة تدريب تديكلت'}</span>
                        <div className="flex items-center gap-1.5" title="معيار تقييم توضيحي (Benchmark Rubric): مراجَع بشرياً وفق معايير الدقة اللغوية (40%)، الإيجاز (30%)، وسلامة المعطيات (30%). ليس ضماناً مطلقاً للجودة بل مقياس ضبط مرجعي.">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20">
                            ⭐ معيار الصياغة المرجعي: {Math.round((item.qualityScore ? Math.min(item.qualityScore, 0.98) : 0.95) * 100)}%
                          </span>
                          <span className="text-[9px] text-[var(--mute)] italic">(تقييم توضيحي مراجَع بشرياً)</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: RLHF ARENA */}
          {activeTab === 'rlhf' && (
            <div className="space-y-6">
              {/* RLHF Header */}
              <div className="p-3 sm:p-3.5 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-xs flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 font-bold text-purple-700 dark:text-purple-300">
                  <Scale className="w-4 h-4" />
                  <span>حلبة تفضيل الردود (RLHF Arena)</span>
                </div>
                <span className="text-[10px] text-[var(--mute)] font-medium">مقارنة وتفضيل بشري</span>
              </div>

              {/* Pairwise Generation Box */}
              <div className="p-4 rounded-2xl bg-[var(--bg)] border border-[var(--line)] space-y-3">
                <label className="text-xs font-bold text-[var(--ink)] block">
                  أدخل أي سؤال للمقارنة وتدريب التفضيل البشري:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={arenaPrompt}
                    onChange={(e) => setArenaPrompt(e.target.value)}
                    placeholder="اكتب سؤالاً مثل: كيف أتصرف عند عاصفة رملية؟ أو شرح خوارزمية..."
                    className="flex-1 px-3 py-2 text-xs rounded-xl bg-[var(--card)] border border-[var(--line)] text-[var(--ink)] focus:outline-hidden focus:border-[var(--green)]"
                  />
                  <button
                    onClick={handleGeneratePair}
                    disabled={isGeneratingPair || !arenaPrompt.trim()}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 text-white font-bold text-xs hover:bg-purple-700 disabled:opacity-50 cursor-pointer transition-all shadow-xs shrink-0"
                  >
                    {isGeneratingPair ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Cpu className="w-3.5 h-3.5" />
                    )}
                    <span>توليد رَدّين متنافسين (A vs B)</span>
                  </button>
                </div>

                {/* Candidate Responses Comparison Arena */}
                {(arenaResponseA || arenaResponseB) && (
                  <div className="pt-3 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Candidate A */}
                      <div
                        className={`p-4 rounded-2xl border transition-all ${
                          votedChoice === 'A'
                            ? 'bg-emerald-500/10 border-emerald-500 shadow-md ring-2 ring-emerald-500/30'
                            : 'bg-[var(--card)] border-[var(--line)]'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-extrabold text-xs px-2.5 py-0.5 rounded-lg bg-blue-500/15 text-blue-700 dark:text-blue-300">
                            الاستجابة (أ)
                          </span>
                          <span className="text-[10px] text-[var(--mute)]">صياغة مركزة ودقيقة</span>
                        </div>
                        <p className="text-xs text-[var(--ink)] leading-relaxed min-h-[90px] whitespace-pre-wrap">
                          {arenaResponseA}
                        </p>
                        <div className="pt-3 border-t border-[var(--line)]/50 mt-3 flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleVoteRlhf('A')}
                            disabled={isSubmittingVote || votedChoice !== null}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                              votedChoice === 'A'
                                ? 'bg-emerald-600 text-white'
                                : 'bg-[var(--bg)] hover:bg-emerald-600 hover:text-white border border-[var(--line)] text-[var(--ink)]'
                            }`}
                          >
                            <ThumbsUp className="w-3.5 h-3.5" />
                            <span>{votedChoice === 'A' ? 'تم اختيار (أ) كأفضل 👍' : 'أفضّل الرد (أ)'}</span>
                          </button>
                        </div>
                      </div>

                      {/* Candidate B */}
                      <div
                        className={`p-4 rounded-2xl border transition-all ${
                          votedChoice === 'B'
                            ? 'bg-emerald-500/10 border-emerald-500 shadow-md ring-2 ring-emerald-500/30'
                            : 'bg-[var(--card)] border-[var(--line)]'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-extrabold text-xs px-2.5 py-0.5 rounded-lg bg-purple-500/15 text-purple-700 dark:text-purple-300">
                            الاستجابة (ب)
                          </span>
                          <span className="text-[10px] text-[var(--mute)]">صياغة تفصيلية موسعة</span>
                        </div>
                        <p className="text-xs text-[var(--ink)] leading-relaxed min-h-[90px] whitespace-pre-wrap">
                          {arenaResponseB}
                        </p>
                        <div className="pt-3 border-t border-[var(--line)]/50 mt-3 flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleVoteRlhf('B')}
                            disabled={isSubmittingVote || votedChoice !== null}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                              votedChoice === 'B'
                                ? 'bg-emerald-600 text-white'
                                : 'bg-[var(--bg)] hover:bg-emerald-600 hover:text-white border border-[var(--line)] text-[var(--ink)]'
                            }`}
                          >
                            <ThumbsUp className="w-3.5 h-3.5" />
                            <span>{votedChoice === 'B' ? 'تم اختيار (ب) كأفضل 👍' : 'أفضّل الرد (ب)'}</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Voting criteria */}
                    <div className="p-3 rounded-xl bg-[var(--card)] border border-[var(--line)] flex items-center justify-between gap-3 flex-wrap text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[var(--ink)]">معيار التفضيل:</span>
                        <select
                          value={voteCriteria}
                          onChange={(e) => setVoteCriteria(e.target.value as any)}
                          className="px-2 py-1 rounded-lg bg-[var(--bg)] border border-[var(--line)] text-xs text-[var(--ink)]"
                        >
                          <option value="polite">أكثر أدباً ولباقة (Polite)</option>
                          <option value="accurate">أكثر دقة ومصداقية (Accurate)</option>
                          <option value="concise">إيجاز ذكي دون استطراد (Concise)</option>
                          <option value="helpful_format">تنظيم وتنسيق أوضح (Helpful Format)</option>
                          <option value="safe">أكثر أماناً وحماية للمستخدم (Safe)</option>
                        </select>
                      </div>
                      <input
                        type="text"
                        value={voteReason}
                        onChange={(e) => setVoteReason(e.target.value)}
                        placeholder="سبب اختيارك باختصار (مثلاً: أوضح وخالٍ من الحشو)..."
                        className="flex-1 min-w-[200px] px-2.5 py-1 text-xs rounded-lg bg-[var(--bg)] border border-[var(--line)] text-[var(--ink)]"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Comparison History */}
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-[var(--ink)] m-0">
                  سجل تفضيلات المقارنة المعتمدة ({rlhfComparisons.length} جولة)
                </h3>
                <div className="space-y-2.5">
                  {rlhfComparisons.map((c) => (
                    <div
                      key={c.id}
                      className="p-3 rounded-2xl bg-[var(--bg)] border border-[var(--line)] space-y-1.5 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[var(--ink)]">س: "{c.prompt}"</span>
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-700 dark:text-purple-300">
                          الرد المفضل: ({c.chosen}) · معيار {c.criteria}
                        </span>
                      </div>
                      {c.reason && (
                        <p className="text-[11px] text-[var(--mute)] m-0 italic">
                          💡 ملاحظة التفضيل: "{c.reason}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: RAG KNOWLEDGE BASE & CUSTOM DOCUMENT INDEXING */}
          {activeTab === 'rag' && (
            <div className="space-y-6">
              {/* RAG Knowledge Overview Header */}
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 font-bold text-amber-700 dark:text-amber-300">
                  <BookOpen className="w-4 h-4" />
                  <span>مستودع المستندات والمعرفة (RAG Knowledge Studio)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-200">
                    {indexedDocs.length} مستند مفهرس
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-800 dark:text-emerald-200">
                    {knowledgeBase.length} مقطع معرفي
                  </span>
                </div>
              </div>

              {/* RAG Sub-Navigation Switcher */}
              <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[var(--bg)] border border-[var(--line)] overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setRagSubTab('upload')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    ragSubTab === 'upload'
                      ? 'bg-[var(--card)] text-[var(--ink)] shadow-2xs border border-[var(--line)]'
                      : 'text-[var(--mute)] hover:text-[var(--ink)]'
                  }`}
                >
                  <FileUp className="w-3.5 h-3.5 text-amber-500" />
                  <span>1. رفع وفهرسة مستند جديد</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRagSubTab('documents')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    ragSubTab === 'documents'
                      ? 'bg-[var(--card)] text-[var(--ink)] shadow-2xs border border-[var(--line)]'
                      : 'text-[var(--mute)] hover:text-[var(--ink)]'
                  }`}
                >
                  <FolderArchive className="w-3.5 h-3.5 text-blue-500" />
                  <span>2. المستندات المفهرسة</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-blue-500/15 text-blue-600">
                    {indexedDocs.length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setRagSubTab('simulator')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    ragSubTab === 'simulator'
                      ? 'bg-[var(--card)] text-[var(--ink)] shadow-2xs border border-[var(--line)]'
                      : 'text-[var(--mute)] hover:text-[var(--ink)]'
                  }`}
                >
                  <Search className="w-3.5 h-3.5 text-emerald-500" />
                  <span>3. محاكي البحث والاسترجاع</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRagSubTab('chunks')}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                    ragSubTab === 'chunks'
                      ? 'bg-[var(--card)] text-[var(--ink)] shadow-2xs border border-[var(--line)]'
                      : 'text-[var(--mute)] hover:text-[var(--ink)]'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5 text-purple-500" />
                  <span>4. استعراض المقاطع المعرفية</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-purple-500/15 text-purple-600">
                    {knowledgeBase.length}
                  </span>
                </button>
              </div>

              {/* SUB-VIEW 1: UPLOAD & INDEX CUSTOM DOCUMENTS */}
              {ragSubTab === 'upload' && (
                <div className="space-y-4">
                  {/* Last Upload Success Toast Banner */}
                  {lastIndexedResult && (
                    <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 space-y-2 animate-message-in">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                          <span>تمت الفهرسة بنجاح: «{lastIndexedResult.doc.title}»</span>
                        </div>
                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700">
                          {lastIndexedResult.chunksCount} مقاطع مفهرسة
                        </span>
                      </div>
                      <p className="text-[11px] text-[var(--mute)] m-0">
                        أصبح هذا المستند الآن متاحاً للمساعد الذكي للإجابة عن الاستفسارات في مجال ({lastIndexedResult.doc.category}).
                      </p>
                      <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
                        <div className="flex items-center gap-1 text-[10px] text-[var(--mute)]">
                          <span>الوسوم:</span>
                          {(lastIndexedResult.doc.tags || []).slice(0, 5).map((t, i) => (
                            <span key={i} className="px-1.5 py-0.5 rounded bg-[var(--card)] border border-[var(--line)]">
                              #{t}
                            </span>
                          ))}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setRagSearchQuery(lastIndexedResult.doc.title);
                            setRagSubTab('simulator');
                          }}
                          className="flex items-center gap-1 px-3 py-1 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors cursor-pointer"
                        >
                          <Search className="w-3 h-3" />
                          <span>اختبر استرجاع هذا المستند في المحاكي ⚡</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Mode Toggle (File Dropzone vs Direct Text) */}
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="font-bold text-[var(--ink)]">طريقة إدخال المستند:</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setIsDirectTextMode(false)}
                        className={`px-3 py-1.5 rounded-xl font-bold cursor-pointer transition-colors ${
                          !isDirectTextMode
                            ? 'bg-amber-600 text-white shadow-2xs'
                            : 'bg-[var(--bg)] text-[var(--mute)] hover:text-[var(--ink)]'
                        }`}
                      >
                        📂 رفع ملف (PDF / Text / MD)
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsDirectTextMode(true)}
                        className={`px-3 py-1.5 rounded-xl font-bold cursor-pointer transition-colors ${
                          isDirectTextMode
                            ? 'bg-amber-600 text-white shadow-2xs'
                            : 'bg-[var(--bg)] text-[var(--mute)] hover:text-[var(--ink)]'
                        }`}
                      >
                        ✍️ لصق أو كتابة نص مباشر
                      </button>
                    </div>
                  </div>

                  {/* Upload Form */}
                  <form onSubmit={handleUploadDocument} className="space-y-4">
                    {!isDirectTextMode ? (
                      /* Drag & Drop File Zone */
                      <div
                        onDragOver={(e) => {
                          e.preventDefault();
                          setIsDraggingFile(true);
                        }}
                        onDragLeave={() => setIsDraggingFile(false)}
                        onDrop={(e) => {
                          e.preventDefault();
                          setIsDraggingFile(false);
                          if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                            handleFileSelect(e.dataTransfer.files[0]);
                          }
                        }}
                        className={`border-2 border-dashed rounded-3xl p-6 text-center transition-all ${
                          isDraggingFile
                            ? 'border-amber-500 bg-amber-500/10'
                            : uploadFile
                            ? 'border-emerald-500 bg-emerald-500/5'
                            : 'border-[var(--line)] bg-[var(--bg)]/50 hover:border-amber-500/50'
                        }`}
                      >
                        <input
                          type="file"
                          id="rag-file-input"
                          accept=".pdf,.txt,.md,.markdown,.csv,.json"
                          onChange={(e) => {
                            if (e.target.files && e.target.files[0]) {
                              handleFileSelect(e.target.files[0]);
                            }
                          }}
                          className="hidden"
                        />

                        {uploadFile ? (
                          <div className="space-y-2">
                            <div className="w-12 h-12 mx-auto rounded-2xl bg-emerald-500/15 text-emerald-600 flex items-center justify-center">
                              <FileCheck className="w-6 h-6" />
                            </div>
                            <div className="font-bold text-xs text-[var(--ink)]">{uploadFile.name}</div>
                            <div className="text-[10px] text-[var(--mute)]">
                              الحجم: {(uploadFile.size / 1024).toFixed(1)} كيلوبايت · النوع:{' '}
                              {uploadFile.type || 'مستند معرفي'}
                            </div>
                            <div className="pt-2">
                              <label
                                htmlFor="rag-file-input"
                                className="px-3 py-1 rounded-xl bg-[var(--card)] border border-[var(--line)] text-xs text-[var(--ink)] font-bold cursor-pointer hover:border-amber-500 transition-colors"
                              >
                                تغيير الملف
                              </label>
                            </div>
                          </div>
                        ) : (
                          <label htmlFor="rag-file-input" className="cursor-pointer block space-y-2">
                            <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-500/15 text-amber-600 flex items-center justify-center">
                              <FileUp className="w-6 h-6" />
                            </div>
                            <div className="font-bold text-xs text-[var(--ink)]">
                              اختر مستنداً أو اسحبه وأفلته هنا
                            </div>
                            <div className="text-[11px] text-[var(--mute)]">
                              PDF · TXT · Markdown · CSV · JSON
                            </div>
                          </label>
                        )}
                      </div>
                    ) : (
                      /* Direct Text / Markdown Input */
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-[var(--mute)] block">
                          محتوى المستند أو النص المعرفي (Markdown أو نص خام):
                        </label>
                        <textarea
                          rows={6}
                          value={uploadDirectText}
                          onChange={(e) => setUploadDirectText(e.target.value)}
                          placeholder="الصق هنا نص المقال، الوثيقة القانونية، الدليل الطبي، مواصفات الكود، أو الأوراق العلمية..."
                          className="w-full px-3.5 py-2.5 text-xs rounded-2xl bg-[var(--card)] border border-[var(--line)] text-[var(--ink)] focus:outline-hidden focus:border-amber-500 font-mono leading-relaxed resize-y"
                        />
                      </div>
                    )}

                    {/* Metadata Settings Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-[var(--bg)] border border-[var(--line)]">
                      <div>
                        <label className="text-[11px] font-bold text-[var(--mute)] block mb-1">
                          عنوان المستند (Title):
                        </label>
                        <input
                          type="text"
                          value={uploadDocTitle}
                          onChange={(e) => setUploadDocTitle(e.target.value)}
                          placeholder="مثال: دليل تقنيات الحوسبة الكمومية..."
                          className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--card)] border border-[var(--line)] text-[var(--ink)] focus:outline-hidden focus:border-amber-500"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-[var(--mute)] block mb-1">
                          المجال التخصصي (Domain / Category):
                        </label>
                        <select
                          value={uploadCategory}
                          onChange={(e) => setUploadCategory(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--card)] border border-[var(--line)] text-[var(--ink)] focus:outline-hidden focus:border-amber-500"
                        >
                          <option value="science_energy">طاقة وبيئة وعلوم (Science & Energy)</option>
                          <option value="technology_code">تقنية وبرمجيات وهندسة (Tech & Code)</option>
                          <option value="medical_health">طب ورعاية صحية (Medical & Health)</option>
                          <option value="services_law">أنظمة وقوانين وإدارة (Legal & Governance)</option>
                          <option value="desert_safety">سلامة ميدانية وملاحة (Field Safety)</option>
                          <option value="dates_agriculture">فلاحة وزراعة (Agriculture)</option>
                          <option value="general">معارف وأبحاث عامة (General Knowledge)</option>
                          <option value="custom_domain">مجال تخصصي مخصص (Custom Domain)</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-[11px] font-bold text-[var(--mute)] block mb-1">
                          المصدر / الجهة المصدرة (Source):
                        </label>
                        <input
                          type="text"
                          value={uploadSource}
                          onChange={(e) => setUploadSource(e.target.value)}
                          placeholder="مثال: المختبر العلمي، المركز الوطني، دليل 2026..."
                          className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--card)] border border-[var(--line)] text-[var(--ink)] focus:outline-hidden focus:border-amber-500"
                        />
                      </div>
                    </div>

                    {/* Submit Action & Live Progress */}
                    <div className="flex items-center justify-between gap-3 pt-1">
                      <div className="text-[11px] text-[var(--mute)]">
                        {uploadProgressMsg ? (
                          <span className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-bold animate-pulse">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>{uploadProgressMsg}</span>
                          </span>
                        ) : (
                          <span>⚡ يتم استخراج المعرفة وتوليد العناوين الدلالية آلياً</span>
                        )}
                      </div>

                      <button
                        type="submit"
                        disabled={isUploadingDoc || (!uploadFile && !uploadDirectText.trim())}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 text-white font-bold text-xs hover:bg-amber-700 disabled:opacity-50 cursor-pointer shadow-xs transition-all shrink-0"
                      >
                        {isUploadingDoc ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <FileUp className="w-4 h-4" />
                        )}
                        <span>{isUploadingDoc ? 'جاري المعالجة والفهرسة...' : 'بدء الفهرسة المعرفية الذكية'}</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* SUB-VIEW 2: INDEXED DOCUMENTS HUB */}
              {ragSubTab === 'documents' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <span className="text-xs font-bold text-[var(--ink)] flex items-center gap-2">
                      <FolderArchive className="w-4 h-4 text-blue-500" />
                      <span>المستندات وقواعد المعرفة المفهرسة ({indexedDocs.length})</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setRagSubTab('upload')}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-600 text-white font-bold text-xs hover:bg-amber-700 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>رفع مستند جديد</span>
                    </button>
                  </div>

                  {indexedDocs.length === 0 ? (
                    <div className="p-8 rounded-3xl bg-[var(--bg)] border border-[var(--line)] text-center space-y-2">
                      <FolderArchive className="w-10 h-10 mx-auto text-[var(--mute)]" />
                      <div className="font-bold text-xs text-[var(--ink)]">لا توجد مستندات مخصصة مفهرسة بعد</div>
                      <p className="text-[11px] text-[var(--mute)] max-w-sm mx-auto m-0">
                        قم برفع مستنداتك الأولى (PDF أو نصوص) ليتمكن المساعد من استخدامها في الإجابة عن استفساراتك التخصصية.
                      </p>
                      <button
                        type="button"
                        onClick={() => setRagSubTab('upload')}
                        className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 text-white font-bold text-xs hover:bg-amber-700 transition-colors cursor-pointer"
                      >
                        <FileUp className="w-3.5 h-3.5" />
                        <span>رفع أول مستند الآن</span>
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {indexedDocs.map((doc) => (
                        <div
                          key={doc.id}
                          className="p-4 rounded-2xl bg-[var(--bg)] border border-[var(--line)] space-y-3 relative group hover:border-amber-500/40 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-1">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-600">
                                {doc.category}
                              </span>
                              <h4 className="text-xs font-bold text-[var(--ink)] m-0 leading-snug">
                                {doc.title}
                              </h4>
                              <div className="text-[10px] text-[var(--mute)] font-mono">
                                📄 {doc.fileName}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteIndexedDocument(doc.id, doc.title)}
                              className="p-1.5 rounded-lg text-[var(--mute)] hover:text-rose-500 hover:bg-rose-500/10 cursor-pointer transition-colors"
                              title="حذف هذا المستند وجميع مقاطعه"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>

                          <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-[var(--card)]/60 border border-[var(--line)]/50 text-[11px]">
                            <div>
                              <span className="text-[var(--mute)] block text-[10px]">المقاطع المفهرسة:</span>
                              <strong className="text-[var(--ink)] font-bold">{doc.chunkCount} مقطع</strong>
                            </div>
                            <div>
                              <span className="text-[var(--mute)] block text-[10px]">حجم المحتوى:</span>
                              <strong className="text-[var(--ink)] font-bold">{Math.round(doc.totalChars / 100) / 10}k حرف</strong>
                            </div>
                          </div>

                          {doc.tags && doc.tags.length > 0 && (
                            <div className="flex items-center gap-1 flex-wrap text-[10px]">
                              {doc.tags.slice(0, 4).map((tg, i) => (
                                <span key={i} className="px-1.5 py-0.2 rounded bg-[var(--card)] border border-[var(--line)] text-[var(--mute)]">
                                  #{tg}
                                </span>
                              ))}
                            </div>
                          )}

                          <div className="flex items-center justify-between pt-2 border-t border-[var(--line)]/40 text-xs">
                            <button
                              type="button"
                              onClick={() => {
                                setActiveDocFilter(doc.id);
                                setRagSubTab('chunks');
                              }}
                              className="flex items-center gap-1 text-[var(--mute)] hover:text-[var(--ink)] font-semibold text-[11px] cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>استعراض المقاطع ({doc.chunkCount})</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setRagSearchQuery(doc.title);
                                setRagSubTab('simulator');
                              }}
                              className="flex items-center gap-1 text-amber-600 hover:text-amber-700 font-bold text-[11px] cursor-pointer"
                            >
                              <Search className="w-3.5 h-3.5" />
                              <span>اختبار في المحاكي</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* SUB-VIEW 3: RAG SEARCH & RETRIEVAL SIMULATOR */}
              {ragSubTab === 'simulator' && (
                <div className="p-4 rounded-2xl bg-[var(--bg)] border border-[var(--line)] space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
                      <Search className="w-4 h-4 text-amber-500" />
                      <span>محاكي البحث الدلالي والاسترجاع (RAG Retrieval & Reranker Simulator)</span>
                    </span>
                    <span className="text-[10px] text-[var(--mute)]">عتبة المطابقة: 38% فأعلى</span>
                  </div>

                  <form onSubmit={handleSearchRagSimulator} className="flex gap-2">
                    <input
                      type="text"
                      value={ragSearchQuery}
                      onChange={(e) => setRagSearchQuery(e.target.value)}
                      placeholder="اطرح سؤالاً عن وثائقك أو مستنداتك المرفوعة لاختبار الاسترجاع المباشر..."
                      className="flex-1 px-3.5 py-2 text-xs rounded-xl bg-[var(--card)] border border-[var(--line)] text-[var(--ink)] focus:outline-hidden focus:border-[var(--green)]"
                    />
                    <button
                      type="submit"
                      disabled={isSearchingRag || !ragSearchQuery.trim()}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 text-white font-bold text-xs hover:bg-amber-700 disabled:opacity-50 cursor-pointer transition-all shadow-xs shrink-0"
                    >
                      {isSearchingRag ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Search className="w-3.5 h-3.5" />
                      )}
                      <span>اختبار الاسترجاع</span>
                    </button>
                  </form>

                  {/* Simulator Results */}
                  {ragSearchResults.length > 0 ? (
                    <div className="pt-2 space-y-2.5">
                      <span className="text-[11px] font-bold text-[var(--ink)] block">
                        الفقرات المسترجعة والمرتبة دلالياً ({ragSearchResults.length} نتائج اجتازت عتبة الجودة):
                      </span>
                      <div className="space-y-2.5">
                        {ragSearchResults.map((resItem, idx) => (
                          <div
                            key={idx}
                            className="p-3.5 rounded-xl bg-[var(--card)] border border-[var(--line)] text-xs space-y-1.5"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-[var(--ink)]">
                                #{idx + 1} {resItem.chunk.title}
                              </span>
                              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-600">
                                درجة التطابق: {Math.round(resItem.score * 100)}%
                              </span>
                            </div>
                            <p className="text-[11px] text-[var(--mute)] leading-relaxed m-0 italic bg-[var(--bg)]/50 p-2 rounded-lg">
                              «{resItem.snippet}»
                            </p>
                            <div className="flex items-center justify-between text-[10px] text-[var(--mute)] pt-0.5">
                              <span>📌 المصدر: {resItem.chunk.source}</span>
                              {resItem.chunk.fileName && (
                                <span className="font-mono">📄 {resItem.chunk.fileName}</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : ragSearchQuery && !isSearchingRag ? (
                    <div className="p-4 rounded-xl bg-[var(--card)] border border-[var(--line)] text-center text-xs text-[var(--mute)]">
                      لم تجتز أي فقرة عتبة التطابقة (38%) لهذا الاستعلام. جرّب كلمات أكثر تحديداً أو ارفع مستنداً يغطي هذا الموضوع.
                    </div>
                  ) : null}
                </div>
              )}

              {/* SUB-VIEW 4: ALL CHUNKS & MANUAL CREATION */}
              {ragSubTab === 'chunks' && (
                <div className="space-y-4">
                  {/* Manual Creation Form */}
                  <div className="p-4 rounded-2xl bg-[var(--bg)] border border-[var(--line)] space-y-3">
                    <span className="text-xs font-bold text-[var(--ink)] flex items-center gap-1.5">
                      <Plus className="w-4 h-4 text-[var(--green)]" />
                      <span>إضافة مقطع معرفي يدوي</span>
                    </span>

                    <form onSubmit={handleAddKnowledgeDoc} className="space-y-3">
                      <div>
                        <label className="text-[11px] font-semibold text-[var(--mute)] block mb-1">
                          عنوان المقطع:
                        </label>
                        <input
                          type="text"
                          value={newDocTitle}
                          onChange={(e) => setNewDocTitle(e.target.value)}
                          placeholder="مثال: تعريف تقنية كذا، أو إجراء السلامة رقم 4..."
                          className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--card)] border border-[var(--line)] text-[var(--ink)] focus:outline-hidden focus:border-[var(--green)]"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-[var(--mute)] block mb-1">
                          محتوى المقطع المعرفي:
                        </label>
                        <textarea
                          rows={3}
                          value={newDocContent}
                          onChange={(e) => setNewDocContent(e.target.value)}
                          placeholder="اكتب المعطيات والحقائق بدقة ليعتمد عليها الذكاء الاصطناعي..."
                          className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--card)] border border-[var(--line)] text-[var(--ink)] focus:outline-hidden focus:border-[var(--green)] resize-none"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="text-[11px] font-semibold text-[var(--mute)] block mb-1">
                            التصنيف:
                          </label>
                          <select
                            value={newDocCategory}
                            onChange={(e) => setNewDocCategory(e.target.value as any)}
                            className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--card)] border border-[var(--line)] text-[var(--ink)] focus:outline-hidden focus:border-[var(--green)]"
                          >
                            <option value="science_energy">طاقة وبيئة وعلوم (Science & Energy)</option>
                            <option value="technology_code">تقنية وبرمجيات وهندسة (Tech & Code)</option>
                            <option value="medical_health">طب وصحة ورعاية (Medical & Health)</option>
                            <option value="services_law">أنظمة وقوانين وإدارة (Legal & Governance)</option>
                            <option value="desert_safety">سلامة الصحراء والطرق (Desert Safety)</option>
                            <option value="dates_agriculture">فلاحة وزراعة (Agriculture)</option>
                            <option value="general">معارف عامة (General)</option>
                            <option value="custom_domain">مجال مخصص (Custom Domain)</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-[var(--mute)] block mb-1">
                            المصدر:
                          </label>
                          <input
                            type="text"
                            value={newDocSource}
                            onChange={(e) => setNewDocSource(e.target.value)}
                            placeholder="مثال: الدليل الرسمي..."
                            className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--card)] border border-[var(--line)] text-[var(--ink)] focus:outline-hidden focus:border-[var(--green)]"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-semibold text-[var(--mute)] block mb-1">
                            الوسوم (مفصولة بفاصلة):
                          </label>
                          <input
                            type="text"
                            value={newDocTags}
                            onChange={(e) => setNewDocTags(e.target.value)}
                            placeholder="موضوع, كلمة, مفتاح"
                            className="w-full px-3 py-2 text-xs rounded-xl bg-[var(--card)] border border-[var(--line)] text-[var(--ink)] focus:outline-hidden focus:border-[var(--green)]"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end pt-1">
                        <button
                          type="submit"
                          disabled={isAddingDoc || !newDocTitle.trim() || !newDocContent.trim()}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 text-white text-xs font-bold hover:bg-amber-700 disabled:opacity-50 cursor-pointer shadow-xs transition-all"
                        >
                          {isAddingDoc ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                          <span>فهرسة وإدراج المقطع</span>
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Filter by Document Banner */}
                  {activeDocFilter && (
                    <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-between text-xs">
                      <span className="font-bold text-blue-700 dark:text-blue-300">
                        🔍 تصفية المقاطع المعروضة حسب المستند المحدد ({activeDocFilter})
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveDocFilter(null)}
                        className="text-blue-600 hover:underline font-bold cursor-pointer"
                      >
                        عرض جميع المقاطع
                      </button>
                    </div>
                  )}

                  {/* Knowledge Base Chunks List */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-[var(--ink)] m-0">
                      المقاطع المعرفية المفهرسة (
                      {activeDocFilter
                        ? knowledgeBase.filter((k) => k.documentId === activeDocFilter || k.fileName === activeDocFilter).length
                        : knowledgeBase.length}{' '}
                      مقطع)
                    </h3>
                    <div className="space-y-2.5">
                      {(activeDocFilter
                        ? knowledgeBase.filter((k) => k.documentId === activeDocFilter || k.fileName === activeDocFilter)
                        : knowledgeBase
                      ).map((chunk) => (
                        <div
                          key={chunk.id}
                          className="p-3.5 rounded-2xl bg-[var(--bg)] border border-[var(--line)] space-y-2 relative group hover:border-amber-500/40 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300">
                                {chunk.category}
                              </span>
                              <span className="text-xs font-bold text-[var(--ink)]">
                                {chunk.title}
                              </span>
                            </div>
                            <button
                              onClick={() => handleDeleteDoc(chunk.id)}
                              className="p-1.5 rounded-lg text-[var(--mute)] hover:text-rose-500 hover:bg-rose-500/10 cursor-pointer transition-colors"
                              title="حذف هذا المقطع"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <p className="text-xs text-[var(--ink)] leading-relaxed m-0 bg-[var(--card)]/50 p-2.5 rounded-xl border border-[var(--line)]/40">
                            {chunk.content}
                          </p>

                          <div className="flex items-center justify-between text-[10px] text-[var(--mute)] pt-1 flex-wrap gap-2">
                            <span>📌 المصدر: {chunk.source}</span>
                            {chunk.fileName && (
                              <span className="font-mono text-[9px] text-[var(--mute)]">📄 {chunk.fileName}</span>
                            )}
                            {chunk.tags && chunk.tags.length > 0 && (
                              <div className="flex items-center gap-1">
                                {chunk.tags.map((tg, i) => (
                                  <span key={i} className="px-1.5 py-0.2 rounded bg-[var(--bg)] border border-[var(--line)]">
                                    #{tg}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: CUSTOM AGENT AVATARS MANAGER */}
          {activeTab === 'avatars' && (
            <div className="space-y-6">
              {/* Banner */}
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 text-xs space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-emerald-700 dark:text-emerald-300">
                  <ImageIcon className="w-4 h-4" />
                  <span>تخصيص ورفع الصور الرمزية للوكلاء (Custom Agent Avatars Studio)</span>
                </div>
                <p className="text-[11px] text-[var(--mute)] leading-relaxed m-0">
                  يمكنك هنا رفع صور رمزية مخصصة (Avatars) لكل وكيل في منظومة <code>AGENTS</code> بدلاً من الاكتفاء بالإيموجي، أو وضع رابط صورة مباشر. تظهر هذه الصور الرمزية فوراً في قائمة الوكلاء، بطاقات المحادثة، ولوحة الإحصائيات.
                </p>
              </div>

              {/* Agents Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {displayAgents.map((agent) => {
                  const customUrl = effectiveAvatars[agent.id];
                  const activeAvatarUrl = customUrl || agent.avatarUrl || DEFAULT_AGENT_AVATARS[agent.id];
                  const isCustomUploaded = Boolean(customUrl);
                  const isUploadingThis = uploadingAgentId === agent.id;
                  const urlDraft = urlInputByAgent[agent.id] || '';

                  return (
                    <div
                      key={agent.id}
                      className="p-4 rounded-2xl bg-[var(--bg)] border border-[var(--line)] hover:border-[var(--green)]/50 transition-all flex flex-col justify-between gap-3.5 shadow-2xs"
                    >
                      <div className="flex items-start gap-3.5">
                        {/* Avatar Preview Box */}
                        <div className="relative shrink-0 group">
                          <div className="w-16 h-16 rounded-2xl bg-[var(--card)] border-2 border-[var(--line)] overflow-hidden flex items-center justify-center shadow-sm">
                            {activeAvatarUrl ? (
                              <img
                                src={activeAvatarUrl}
                                alt={agent.name}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                                }}
                              />
                            ) : (
                              <span className="text-2xl">{agent.emoji}</span>
                            )}
                          </div>
                          {/* Emoji badge in corner */}
                          <span
                            className="absolute -bottom-1 -end-1 w-6 h-6 rounded-lg bg-[var(--card)] border border-[var(--line)] flex items-center justify-center text-xs shadow-xs"
                            title={`الرمز: ${agent.emoji}`}
                          >
                            {agent.emoji}
                          </span>
                        </div>

                        {/* Agent Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="text-xs sm:text-sm font-extrabold text-[var(--ink)] m-0 truncate">
                              {agent.name}
                            </h4>
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-md whitespace-nowrap ${
                                isCustomUploaded
                                  ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                                  : 'bg-[var(--card)] text-[var(--mute)] border border-[var(--line)]'
                              }`}
                            >
                              {isCustomUploaded ? 'صورة مرفوعة مخصصة' : 'صورة رمزية قياسية'}
                            </span>
                          </div>
                          <p className="text-[11px] text-[var(--mute)] mt-1 mb-0 line-clamp-2 leading-relaxed">
                            {agent.desc}
                          </p>
                        </div>
                      </div>

                      {/* Upload & URL Controls */}
                      <div className="pt-2.5 border-t border-[var(--line)]/60 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <label className="flex-1 min-w-[140px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--green)] hover:opacity-95 text-white text-xs font-bold cursor-pointer shadow-xs transition-all">
                            {isUploadingThis ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Upload className="w-3.5 h-3.5" />
                            )}
                            <span>رفع صورة رمزية من الجهاز</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleAvatarFileChange(agent.id, e)}
                              className="hidden"
                            />
                          </label>

                          {isCustomUploaded && (
                            <button
                              type="button"
                              onClick={() => handleSaveAgentAvatar(agent.id, null)}
                              disabled={isUploadingThis}
                              className="px-3 py-2 rounded-xl bg-[var(--card)] hover:bg-rose-500/10 text-[var(--mute)] hover:text-rose-500 border border-[var(--line)] text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                              title="استعادة الصورة الرمزية الافتراضية"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>استعادة الافتراضي</span>
                            </button>
                          )}
                        </div>

                        {/* Optional Direct Image URL Input */}
                        <div className="flex items-center gap-1.5">
                          <input
                            type="url"
                            value={urlDraft}
                            onChange={(e) =>
                              setUrlInputByAgent((prev) => ({
                                ...prev,
                                [agent.id]: e.target.value,
                              }))
                            }
                            placeholder="أو الصق رابط صورة مباشر (https://...)..."
                            className="flex-1 px-2.5 py-1.5 text-[11px] rounded-xl bg-[var(--card)] border border-[var(--line)] text-[var(--ink)] focus:outline-hidden focus:border-[var(--green)]"
                          />
                          <button
                            type="button"
                            disabled={!urlDraft.trim() || isUploadingThis}
                            onClick={() => {
                              if (!urlDraft.trim()) return;
                              handleSaveAgentAvatar(agent.id, urlDraft.trim());
                              setUrlInputByAgent((prev) => ({ ...prev, [agent.id]: '' }));
                            }}
                            className="px-3 py-1.5 rounded-xl bg-[var(--card)] hover:bg-[var(--green)] hover:text-white border border-[var(--line)] text-[11px] font-bold text-[var(--ink)] disabled:opacity-40 cursor-pointer transition-colors shrink-0"
                          >
                            اعتماد الرابط
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-[var(--line)] bg-[var(--bg)]/50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-[11px] text-[var(--mute)]">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>نظام التدريب و RAG متصل بملفات التخزين الدائم (Persistent Storage)</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-[var(--card)] hover:bg-[var(--line)]/50 border border-[var(--line)] text-xs font-bold text-[var(--ink)] cursor-pointer transition-colors"
          >
            إغلاق
          </button>
        </div>

        {/* Toast */}
        {toastMessage && (
          <div className="fixed bottom-6 start-1/2 -translate-x-1/2 bg-[var(--ink)] text-[var(--card)] px-4 py-2.5 rounded-2xl text-xs font-bold shadow-xl animate-message-in z-60 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        )}
      </div>
    </div>
  );
};
