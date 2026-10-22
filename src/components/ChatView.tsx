import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Image as ImageIcon,
  X,
  Volume2,
  Copy,
  Check,
  RotateCcw,
  Sparkles,
  Bot,
  User,
  Loader2,
  ChevronDown,
  Trash2,
  Share2,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';
import { ChatMessage, Conversation, PersonaId, AppLanguage } from '../types';
import { PERSONAS, QUICK_PROMPTS } from '../constants/personas';
import { MarkdownRenderer } from './MarkdownRenderer';
import { ChatStatus, ChatStatusProps } from './ChatStatus';
import './chat-status.css';

interface ChatViewProps {
  conversation: Conversation;
  onUpdateConversation: (updated: Conversation) => void;
  language: AppLanguage;
  onPlayTts: (text: string) => void;
  isTtsLoading?: boolean;
}

export const ChatView: React.FC<ChatViewProps> = ({
  conversation,
  onUpdateConversation,
  language,
  onPlayTts,
  isTtsLoading,
}) => {
  const isAr = language === 'ar';
  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<{
    data: string;
    mimeType: string;
    previewUrl: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [chatStatus, setChatStatus] = useState<ChatStatusProps['status']>('preparing');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [currentPersona, setCurrentPersona] = useState<PersonaId>(
    (conversation.personaId as PersonaId) || 'general'
  );
  const [showPersonaMenu, setShowPersonaMenu] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversation.messages, isLoading]);

  // Adjust textarea height automatically
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  };

  // Image Upload Handler
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert(isAr ? 'حجم الصورة كبير جداً، يرجى اختيار صورة أقل من 10 ميغابايت.' : 'File too large (max 10MB).');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64Data = result.split(',')[1];
      setSelectedImage({
        data: base64Data,
        mimeType: file.type || 'image/jpeg',
        previewUrl: result,
      });
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Send Message
  const handleSend = async (customPrompt?: string) => {
    const textToSend = customPrompt || inputText;
    if ((!textToSend.trim() && !selectedImage) || isLoading) return;

    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      text: textToSend.trim(),
      timestamp: Date.now(),
      image: selectedImage
        ? {
            data: selectedImage.data,
            mimeType: selectedImage.mimeType,
            previewUrl: selectedImage.previewUrl,
          }
        : undefined,
    };

    const newMessages = [...conversation.messages, userMessage];
    const newTitle =
      conversation.messages.length === 0
        ? textToSend.slice(0, 30) || (isAr ? 'محادثة ذكية' : 'New Chat')
        : conversation.title;

    onUpdateConversation({
      ...conversation,
      title: newTitle,
      updatedAt: Date.now(),
      messages: newMessages,
      personaId: currentPersona,
    });

    setInputText('');
    setSelectedImage(null);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
    setIsLoading(true);
    setChatStatus("preparing");

    try {
      const activePersonaObj = PERSONAS[currentPersona];
      const payloadMessages = newMessages.map((m) => ({
        role: m.role,
        text: m.text,
        image: m.image
          ? {
              data: m.image.data,
              mimeType: m.image.mimeType,
            }
          : undefined,
      }));

      const botMsgId = `msg-${Date.now() + 1}`;
      let botText = '';

      const initialBotMessage: ChatMessage = {
        id: botMsgId,
        role: 'assistant',
        text: '',
        timestamp: Date.now(),
      };

      onUpdateConversation({
        ...conversation,
        title: newTitle,
        updatedAt: Date.now(),
        messages: [...newMessages, initialBotMessage],
      });

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      // إرسال السؤال إلى الخادم
      const sendMessage = async (message: ChatMessage) => {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: payloadMessages, message: message.text }),
          signal: abortController.signal,
        });

        if (!res.ok || !res.body) {
          throw new Error(isAr ? "تعذر الاتصال بالخدمة" : "Failed to connect to service");
        }

        return res;
      };

      // عرض الرد تدريجياً وتحليل أحداث SSE (كأحداث البحث والكتابة)
      const displayResponse = async (res: Response) => {
        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          let currentEvent = '';
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) {
              currentEvent = '';
              continue;
            }
            if (trimmed.startsWith('event:')) {
              currentEvent = trimmed.replace(/^event:\s*/, '').trim();
              if (currentEvent === 'searching') {
                setChatStatus('searching');
              } else if (currentEvent === 'writing') {
                setChatStatus('writing');
              }
            } else if (trimmed.startsWith('data:')) {
              const rawData = trimmed.replace(/^data:\s*/, '').trim();
              if (!rawData || rawData === '{}') continue;
              try {
                const parsed = JSON.parse(rawData);
                if (parsed.status === 'searching' || currentEvent === 'searching') {
                  setChatStatus('searching');
                } else if (parsed.status === 'writing' || currentEvent === 'writing') {
                  setChatStatus('writing');
                }

                if (parsed.text) {
                  botText += parsed.text;
                  setChatStatus('writing');
                  onUpdateConversation({
                    ...conversation,
                    title: newTitle,
                    updatedAt: Date.now(),
                    messages: [
                      ...newMessages,
                      {
                        id: botMsgId,
                        role: 'assistant',
                        text: botText,
                        timestamp: Date.now(),
                      },
                    ],
                  });
                }
              } catch {
                // Ignore invalid JSON chunk
              }
            }
          }
        }
      };

      // إذا كان السؤال يحتاج بحثًا، اجعل الخادم يرسل حدث "searching"
      // عند بداية البحث الحقيقي، لا لمجرد أن الطلب بدأ.
      const response = await sendMessage(userMessage);

      setChatStatus("writing");
      await displayResponse(response);
    } catch (err: any) {
      if (err?.name === 'AbortError') return;

      const errorMessage: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        text: isAr
          ? `⚠️ عذراً، تعذر إتمام الطلب: ${err.message}`
          : `⚠️ Request failed: ${err.message}`,
        timestamp: Date.now(),
        isError: true,
      };

      onUpdateConversation({
        ...conversation,
        title: newTitle,
        updatedAt: Date.now(),
        messages: [...newMessages, errorMessage],
      });
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const copyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const clearChat = () => {
    if (confirm(isAr ? 'هل أنت متأكد من مسح هذه المحادثة؟' : 'Clear this conversation?')) {
      onUpdateConversation({
        ...conversation,
        messages: [],
        updatedAt: Date.now(),
      });
    }
  };

  const handleRateMessage = async (msgId: string, ratingType: 'like' | 'dislike') => {
    const targetMsg = conversation.messages.find((m) => m.id === msgId);
    if (!targetMsg) return;

    const isTogglingOff = targetMsg.rating === ratingType;
    const newRating = isTogglingOff ? undefined : ratingType;

    const updatedMessages = conversation.messages.map((m) =>
      m.id === msgId ? { ...m, rating: newRating } : m
    );

    onUpdateConversation({
      ...conversation,
      messages: updatedMessages,
      updatedAt: Date.now(),
    });

    try {
      if (isTogglingOff) {
        await fetch(`/api/ratings/${msgId}`, { method: 'DELETE' });
      } else {
        await fetch('/api/ratings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messageId: msgId,
            query: targetMsg.userPromptText || '',
            response: targetMsg.text,
            rating: ratingType,
            agentId: conversation.personaId || currentPersona,
          }),
        });
      }
    } catch (err) {
      console.error('Failed to rate message:', err);
    }
  };

  const activePersonaObj = PERSONAS[currentPersona];

  return (
    <div className="flex flex-col h-full max-w-5xl mx-auto w-full">
      {/* Chat Top Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/80 bg-slate-900/40 backdrop-blur-md rounded-2xl mb-4 shrink-0 shadow-sm">
        {/* Persona Selector Pill */}
        <div className="relative">
          <button
            onClick={() => setShowPersonaMenu(!showPersonaMenu)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-xs font-medium text-slate-200 transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>{activePersonaObj.name[language]}</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {showPersonaMenu && (
            <div className="absolute top-full mt-2 w-72 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-2 z-50 space-y-1">
              {Object.values(PERSONAS).map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setCurrentPersona(p.id);
                    setShowPersonaMenu(false);
                    onUpdateConversation({ ...conversation, personaId: p.id });
                  }}
                  className={`w-full text-right p-2.5 rounded-xl text-xs flex flex-col items-start gap-1 transition-colors cursor-pointer ${
                    currentPersona === p.id
                      ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                      : 'hover:bg-slate-800/70 text-slate-300'
                  }`}
                >
                  <span className="font-semibold text-white">{p.name[language]}</span>
                  <span className="text-[11px] text-slate-400 line-clamp-1">{p.description[language]}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-400 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Gemini 3.8 Flash
          </div>

          {conversation.messages.length > 0 && (
            <button
              onClick={clearChat}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
              title={isAr ? 'مسح المحادثة' : 'Clear Chat'}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto px-2 sm:px-4 py-2 space-y-6">
        {conversation.messages.length === 0 ? (
          /* Empty State Hero */
          <div className="flex flex-col items-center justify-center min-h-[360px] text-center space-y-6 py-8">
            <div className="relative">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-2xl shadow-indigo-500/30 animate-pulse-glow">
                <Bot className="w-8 h-8 sm:w-10 sm:h-10" />
              </div>
              <div className="absolute -bottom-1 -right-1 p-1 bg-emerald-500 rounded-full border-2 border-slate-950">
                <Sparkles className="w-3.5 h-3.5 text-white" />
              </div>
            </div>

            <div className="max-w-md space-y-2">
              <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                {isAr ? 'كيف يمكنني مساعدتك اليوم؟' : 'How can I assist you today?'}
              </h3>
              <p className="text-sm text-slate-400 leading-relaxed">
                {isAr
                  ? 'اطرح أي سؤال، اطلب كتابة أو مراجعة كود، أو ارفع صورة لتحليلها بالذكاء الاصطناعي التوليدي الفائق.'
                  : 'Ask any question, brainstorm creative concepts, review code, or attach images for deep visual analysis.'}
              </p>
            </div>

            {/* Quick Inspiration Prompts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl text-right pt-2">
              {QUICK_PROMPTS.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSend(item.prompt[language])}
                  className="p-3.5 rounded-2xl bg-slate-900/60 hover:bg-slate-900 border border-slate-800/80 hover:border-indigo-500/50 transition-all text-right group cursor-pointer shadow-sm"
                >
                  <span className="text-xs font-semibold text-indigo-300 block mb-1 group-hover:text-indigo-200">
                    {item.title[language]}
                  </span>
                  <span className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {item.prompt[language]}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          conversation.messages.map((message) => {
            const isUser = message.role === 'user';
            const isCopied = copiedId === message.id;

            return (
              <div
                key={message.id}
                className={`flex gap-3 sm:gap-4 items-start ${
                  isUser ? 'flex-row-reverse' : 'flex-row'
                }`}
              >
                {/* Avatar */}
                <div
                  className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center shrink-0 shadow-md ${
                    isUser
                      ? 'bg-slate-800 text-indigo-400 border border-slate-700'
                      : 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white'
                  }`}
                >
                  {isUser ? <User className="w-4 h-4 sm:w-5 sm:h-5" /> : <Bot className="w-4 h-4 sm:w-5 sm:h-5" />}
                </div>

                {/* Message Content Bubble */}
                <div
                  className={`relative max-w-[85%] sm:max-w-[78%] rounded-2xl px-4 py-3.5 shadow-lg ${
                    isUser
                      ? 'bg-indigo-600 text-white rounded-tr-none'
                      : message.isError
                      ? 'bg-rose-950/40 border border-rose-800 text-rose-200 rounded-tl-none'
                      : 'bg-slate-900/80 border border-slate-800 text-slate-100 rounded-tl-none backdrop-blur-sm'
                  }`}
                >
                  {/* Attached Image Thumbnail */}
                  {message.image && (
                    <div className="mb-3 rounded-xl overflow-hidden border border-slate-700/60 max-w-sm">
                      <img
                        src={message.image.previewUrl || `data:${message.image.mimeType};base64,${message.image.data}`}
                        alt="Attached analysis"
                        className="w-full h-auto max-h-64 object-cover"
                      />
                    </div>
                  )}

                  {/* Text / Markdown */}
                  {isUser ? (
                    <p className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap font-sans">
                      {message.text}
                    </p>
                  ) : (
                    <MarkdownRenderer content={message.text} isRtl={isAr} />
                  )}

                  {/* Assistant Footer Actions (Copy / TTS) */}
                  {!isUser && !message.isError && (
                    <div className="flex items-center gap-2 mt-3 pt-2.5 border-t border-slate-800/80 text-slate-400 text-xs">
                      <button
                        onClick={() => onPlayTts(message.text)}
                        disabled={isTtsLoading}
                        className="flex items-center gap-1.5 hover:text-indigo-400 transition-colors cursor-pointer"
                        title={isAr ? 'استماع للصوت بالذكاء الاصطناعي' : 'Listen with Gemini TTS'}
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>{isAr ? 'استماع' : 'Listen'}</span>
                      </button>

                      <button
                        onClick={() => copyMessage(message.id, message.text)}
                        className="flex items-center gap-1.5 hover:text-white transition-colors ml-2 rtl:ml-0 rtl:mr-2 cursor-pointer"
                        title={isAr ? 'نسخ النص' : 'Copy Text'}
                      >
                        {isCopied ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400">{isAr ? 'تم النسخ' : 'Copied'}</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>{isAr ? 'نسخ' : 'Copy'}</span>
                          </>
                        )}
                      </button>

                      {/* Ratings Buttons */}
                      <div className="flex items-center gap-1 bg-slate-800/80 rounded-lg px-1.5 py-0.5 border border-slate-700/60 ml-2 rtl:ml-0 rtl:mr-2">
                        <button
                          onClick={() => handleRateMessage(message.id, 'like')}
                          className={`p-1 rounded hover:bg-slate-700 cursor-pointer transition-colors ${
                            message.rating === 'like' ? 'text-emerald-400 bg-emerald-500/20' : 'text-slate-400'
                          }`}
                          title={isAr ? 'أعجبني هذا الرد' : 'Like'}
                        >
                          <ThumbsUp className={`w-3 h-3 ${message.rating === 'like' ? 'fill-current' : ''}`} />
                        </button>
                        <button
                          onClick={() => handleRateMessage(message.id, 'dislike')}
                          className={`p-1 rounded hover:bg-slate-700 cursor-pointer transition-colors ${
                            message.rating === 'dislike' ? 'text-rose-400 bg-rose-500/20' : 'text-slate-400'
                          }`}
                          title={isAr ? 'لم يعجبني هذا الرد' : 'Dislike'}
                        >
                          <ThumbsDown className={`w-3 h-3 ${message.rating === 'dislike' ? 'fill-current' : ''}`} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex gap-3 sm:gap-4 items-start animate-in fade-in duration-200">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white flex items-center justify-center shrink-0 shadow-md">
              <Bot className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <ChatStatus status={chatStatus} />
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 sm:p-4 bg-slate-900/70 border border-slate-800/90 rounded-2xl backdrop-blur-md shadow-2xl mt-2 shrink-0">
        {/* Selected Image Preview Chip */}
        {selectedImage && (
          <div className="mb-2 inline-flex items-center gap-2 p-1.5 pr-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-200">
            <img
              src={selectedImage.previewUrl}
              alt="Thumbnail"
              className="w-7 h-7 rounded-lg object-cover"
            />
            <span>{isAr ? 'صورة مرفقة للتحليل البصري' : 'Image attached for vision analysis'}</span>
            <button
              onClick={() => setSelectedImage(null)}
              className="p-1 hover:bg-slate-700 text-slate-400 hover:text-white rounded-md cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        <div className="flex items-end gap-2">
          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImageSelect}
            accept="image/*"
            className="hidden"
          />

          {/* Attach Image Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-indigo-300 transition-colors cursor-pointer shrink-0"
            title={isAr ? 'إرفاق صورة للتحليل' : 'Attach image for vision'}
          >
            <ImageIcon className="w-5 h-5" />
          </button>

          {/* Text Area */}
          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder={
              isAr
                ? 'اكتب رسالتك أو استفسارك هنا... (Enter للإرسال، Shift+Enter لسطر جديد)'
                : 'Type your message or query here... (Enter to send, Shift+Enter for newline)'
            }
            className="flex-1 bg-slate-950/70 border border-slate-800 rounded-xl px-4 py-2.5 text-sm sm:text-base text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none max-h-44 leading-relaxed font-sans"
          />

          {/* Send Button */}
          <button
            type="button"
            onClick={() => handleSend()}
            disabled={(!inputText.trim() && !selectedImage) || isLoading}
            className="p-2.5 sm:px-4 sm:py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium shadow-lg shadow-indigo-600/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Send className="w-4 h-4 rtl:rotate-180" />
                <span className="hidden sm:inline text-xs">{isAr ? 'إرسال' : 'Send'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
