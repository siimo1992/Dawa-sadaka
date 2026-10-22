export type Role = 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  role: Role;
  text: string;
  timestamp: number;
  image?: {
    data: string; // base64 without data URI prefix or full data URI
    mimeType: string;
    previewUrl?: string;
  };
  audioUrl?: string; // Cache generated TTS audio
  isError?: boolean;
  rating?: 'like' | 'dislike';
  feedbackReason?: string;
  feedbackComment?: string;
  userPromptText?: string;
  pipelineExecution?: PipelineExecution;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: any[];
  createdAt: number;
  updatedAt: number;
  previewText?: string;
}

export interface SftExample {
  id: string;
  query: string;
  response: string;
  category: 'dialogue' | 'concise' | 'research' | 'desert' | 'code' | 'general';
  qualityScore?: number;
  source?: string;
  tags?: string[];
  createdAt: number;
}

export interface RlhfComparison {
  id: string;
  prompt: string;
  responseA: string;
  responseB: string;
  chosen: 'A' | 'B' | 'tie';
  criteria: 'polite' | 'accurate' | 'concise' | 'helpful_format' | 'safe';
  reason?: string;
  timestamp: string;
  createdAt: number;
}

export interface KnowledgeChunk {
  id: string;
  title: string;
  content: string;
  category: 'desert_safety' | 'local_history' | 'services_law' | 'science_energy' | 'dates_agriculture' | 'general' | 'medical_health' | 'technology_code' | 'law_governance' | 'custom_domain' | string;
  source: string;
  tags: string[];
  importance?: number;
  documentId?: string;
  fileName?: string;
  createdAt: number;
  lastUpdated?: number;
}

export interface IndexedDocument {
  id: string;
  fileName: string;
  title: string;
  category: string;
  source: string;
  chunkCount: number;
  totalChars: number;
  tags: string[];
  createdAt: number;
}

export interface PipelineExecution {
  intent: {
    category: string;
    complexity: 'simple' | 'moderate' | 'deep';
    keywords: string[];
    sentiment?: string;
  };
  queries: string[];
  retrievedChunks: Array<{
    id: string;
    title: string;
    source: string;
    snippet: string;
    score: number;
  }>;
  rerankedCount: number;
  synthesisMethod: string;
}

export interface ResponseRatingData {
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
}

export interface RatingsStats {
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
  recentFeedbacks: ResponseRatingData[];
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
  personaId?: string;
}

export type AppLanguage = 'ar' | 'en' | 'fr';

export type ViewTab = 'chat' | 'tools' | 'tts' | 'visual' | 'settings';

export type PersonaId = 'general' | 'coder' | 'writer' | 'scholar' | 'business';

export interface Persona {
  id: PersonaId;
  name: { ar: string; en: string; fr?: string };
  description: { ar: string; en: string; fr?: string };
  icon: string;
  systemInstruction: string;
}

export interface AppSettings {
  language: AppLanguage;
  personaId: PersonaId;
  temperature: number;
  ttsVoice: 'Kore' | 'Puck' | 'Charon' | 'Fenrir' | 'Zephyr';
  streamResponses: boolean;
}
