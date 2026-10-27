import type { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI, Modality } from '@google/genai';
import {
  learnLocalDialectAndMemoryFromTurn,
  buildVoiceAndChatMemoryContext,
} from './conversationMemoryEngine.ts';

export interface LiveSessionClientConfig {
  voiceName?: 'Aoede' | 'Puck' | 'Zephyr' | 'Charon' | 'Kore' | string;
  lang?: 'ar' | 'fr' | 'en';
  locationName?: string;
  conversationId?: string;
  userId?: string;
  customSystemInstruction?: string;
}

const ALLOWED_VOICES = new Set(['Kore', 'Aoede', 'Puck', 'Zephyr', 'Charon']);

const VOICE_PERSONA_MAP: Record<
  string,
  { nameAr: string; toneAr: string; styleDirectiveAr: string }
> = {
  Kore: {
    nameAr: 'مسعودة',
    toneAr: 'نبرة رسمية',
    styleDirectiveAr:
      'تحدثي بنبرة رسمية محترمة، رزينة، ومرتبة بمزيج متوازن من الدارجة الصحراوية الجزائرية (تيدكلت وعين صالح والجنوب الجزائري) والعربية البسيطة الواضحة للجميع.',
  },
  Aoede: {
    nameAr: 'مروة',
    toneAr: 'نبرة دافئة',
    styleDirectiveAr:
      'تحدثي بنبرة دافئة، بشوشة، ومضيافة بمزيج من الدارجة الصحراوية الجزائرية الأصيلة والعربية البسيطة الواضحة كأهل الواحة والقصور في تيدكلت.',
  },
  Puck: {
    nameAr: 'أسامة',
    toneAr: 'نبرة حيوية',
    styleDirectiveAr:
      'تحدث بنبرة شبابية حيوية، سريعة البديهة، ونشيطة بمزيج من الدارجة الصحراوية الجزائرية والعربية البسيطة الواضحة والمباشرة.',
  },
  Zephyr: {
    nameAr: 'عزة',
    toneAr: 'نبرة هادئة',
    styleDirectiveAr:
      'تحدثي بنبرة هادئة، مطمئنة، ومتزنة بمزيج من الدارجة الصحراوية الجزائرية والعربية البسيطة الواضحة التي تبعث على الراحة والسكينة.',
  },
  Charon: {
    nameAr: 'محمود',
    toneAr: 'نبرة رخيمة',
    styleDirectiveAr:
      'تحدث بنبرة رخيمة، عميقة، وحكيمة بمزيج من الدارجة الصحراوية الجزائرية الأصيلة والعربية البسيطة الواضحة ككبار وأعيان منطقة تيدكلت.',
  },
};

const LIVE_MODELS_PRIORITY = [
  'gemini-2.5-flash-native-audio-preview-09-2025',
  'gemini-2.5-flash-native-audio-preview-12-2025',
  'gemini-2.0-flash-exp',
];

function buildArabicPhoneCallSystemInstruction(
  config: LiveSessionClientConfig,
  selectedVoice: string
): string {
  const loc = config.locationName || 'عين صالح ومنطقة تديكلت والجزائر';
  const persona = VOICE_PERSONA_MAP[selectedVoice] || VOICE_PERSONA_MAP.Kore;
  const memoryAndDialectContext = buildVoiceAndChatMemoryContext({
    conversationId: config.conversationId || 'voice_live_default',
    userId: config.userId || 'default_user',
    recentTurnsLimit: 8,
  });

  const mandatoryIdentityAndDialectRules = [
    `هويتك الشخصية الثابتة في هذه المحادثة الصوتية: اسمك هو «${persona.nameAr}» (${persona.toneAr})، وأنت نموذج ذكي مطور من منصة تيدكلت AI.`,
    `قاعدة إلزامية صارمة: إذا سألك المستخدم في أي وقت "من أنت؟" أو "مع من أتحدث؟" أو "من يجري معي المحادثة؟" أو "ما اسمك؟" أو "من طورك؟" أو "ما هو النموذج؟"، يجب أن تجيب دائماً وبوضوح: «أنا ${persona.nameAr}، نموذج ذكي مطور من منصة تيدكلت AI».`,
    'يُمنع منعاً باتاً ذكر Google أو Gemini أو أي شركة أو نموذج آخر غير اسمك ومنصة تيدكلت AI.',
    `الأسلوب الصوتي واللهجة: ${persona.styleDirectiveAr}`,
    'اعتمد دائماً مزيجاً متوازناً من الدارجة الصحراوية الجزائرية (لهجة عين صالح وتيدكلت وأدرار وتمنراست والجنوب الجزائري حصراً) والعربية البسيطة الواضحة للجميع، وتعلّم فوراً من لهجة المستخدم ومفرداته الصحراوية الجزائرية واحفظ ما يخبرك به في ذاكرتك القصيرة والطويلة لتوظفه في ردودك.',
    memoryAndDialectContext,
  ].join('\n\n');

  if (config.customSystemInstruction && config.customSystemInstruction.trim()) {
    return `${mandatoryIdentityAndDialectRules}\n\n${config.customSystemInstruction.trim()}`;
  }

  return [
    mandatoryIdentityAndDialectRules,
    'أنت المساعد الصوتي والمرئي الذكي لمنصة «تيدكلت AI» في مكالمة هاتفية تفاعلية مباشرة مع المستخدم.',
    `الموقع المرجعي الحالي للمستخدم: ${loc}.`,
    'تحدث مع المستخدم بمزيج متوازن من الدارجة الصحراوية الجزائرية والعربية البسيطة الواضحة بأسلوب سلس، طبيعي، ودافئ كأنك ابن المنطقة في مكالمة هاتفية حية.',
    'كن موجزاً، واضحاً، ومباشراً في ردودك الصوتية، وتجنب قراءة رموز التنسيق مثل النجوم أو الهاشتاج.',
    'إذا شارك المستخدم الكاميرا الحية أو صورة، صف ما تراه بدقة بالدارجة الصحراوية الجزائرية المفهومة وساعده فوراً.',
    'إذا قاطعك المستخدم أثناء الحديث، توقف فوراً واستمع لما يقوله وتفاعل معه بمرونة.',
  ].join('\n');
}

export function attachGeminiLiveWebSocketServer(httpServer: HttpServer, sharedAi?: GoogleGenAI) {
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', (request, socket, head) => {
    try {
      const reqUrl = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
      if (reqUrl.pathname === '/ws/gemini-live') {
        wss.handleUpgrade(request, socket, head, (ws) => {
          wss.emit('connection', ws, request);
        });
      }
    } catch (err) {
      console.error('[GeminiLiveWS] Upgrade error:', err);
    }
  });

  wss.on('connection', (clientWs: WebSocket, request) => {
    let liveSession: any = null;
    let isClosing = false;
    let isConnecting = false;
    const pendingAudioChunks: Array<{ data: string; mimeType: string }> = [];

    const reqUrl = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
    const initialVoice = reqUrl.searchParams.get('voice') || 'Kore';
    const initialLang = (reqUrl.searchParams.get('lang') as 'ar' | 'fr' | 'en') || 'ar';
    const initialLocation = reqUrl.searchParams.get('location') || 'عين صالح';
    const initialConvId = reqUrl.searchParams.get('convId') || 'voice_live_default';
    let activePersonaName = (VOICE_PERSONA_MAP[initialVoice] || VOICE_PERSONA_MAP.Kore).nameAr;
    let accumTurnUserText = '';
    let accumTurnAiText = '';

    const safeSendToClient = (payload: Record<string, unknown>) => {
      if (clientWs.readyState === WebSocket.OPEN) {
        try {
          clientWs.send(JSON.stringify(payload));
        } catch (err) {
          console.error('[GeminiLiveWS] Failed sending to client:', err);
        }
      }
    };

    const connectToGeminiLive = async (clientConfig: LiveSessionClientConfig) => {
      if (isConnecting || liveSession || isClosing) return;
      isConnecting = true;

      const apiKey = process.env.GEMINI_API_KEY || '';
      if (!apiKey) {
        safeSendToClient({
          type: 'error',
          message: 'مفتاح GEMINI_API_KEY غير متوفر على الخادم لتشغيل المكالمة الصوتية المباشرة.',
        });
        isConnecting = false;
        return;
      }

      const aiClient =
        sharedAi ||
        new GoogleGenAI({
          apiKey,
          httpOptions: {
            headers: { 'User-Agent': 'aistudio-build' },
          },
        });

      const selectedVoice = ALLOWED_VOICES.has(clientConfig.voiceName || '')
        ? (clientConfig.voiceName as string)
        : 'Kore';
      activePersonaName = (VOICE_PERSONA_MAP[selectedVoice] || VOICE_PERSONA_MAP.Kore).nameAr;

      const systemText = buildArabicPhoneCallSystemInstruction(clientConfig, selectedVoice);

      let connectedSession: any = null;
      let lastError: any = null;

      for (const candidateModel of LIVE_MODELS_PRIORITY) {
        if (isClosing) break;
        try {
          connectedSession = await aiClient.live.connect({
            model: candidateModel,
            config: {
              responseModalities: [Modality.AUDIO],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName: selectedVoice,
                  },
                },
              },
              inputAudioTranscription: {},
              outputAudioTranscription: {},
              systemInstruction: {
                parts: [{ text: systemText }],
              },
            },
            callbacks: {
              onopen: () => {
                if (isClosing) return;
                safeSendToClient({
                  type: 'connected',
                  model: candidateModel,
                  voiceName: selectedVoice,
                  personaName: activePersonaName,
                });
              },
              onmessage: (message: any) => {
                if (isClosing) return;

                const serverContent = message?.serverContent;
                if (!serverContent) return;

                // 1. Extract PCM 24kHz audio chunks if present
                const parts = serverContent?.modelTurn?.parts;
                if (Array.isArray(parts)) {
                  for (const part of parts) {
                    if (
                      part?.inlineData?.data &&
                      typeof part.inlineData.mimeType === 'string' &&
                      part.inlineData.mimeType.startsWith('audio/pcm')
                    ) {
                      safeSendToClient({
                        type: 'audio',
                        data: part.inlineData.data,
                        mimeType: part.inlineData.mimeType,
                        serverContent: {
                          modelTurn: {
                            parts: [part],
                          },
                        },
                      });
                    }
                  }
                }

                // 2. Forward live input transcription (user speech) & accumulate for learning
                if (serverContent?.inputTranscription?.text) {
                  accumTurnUserText += serverContent.inputTranscription.text;
                  safeSendToClient({
                    type: 'input_transcription',
                    text: serverContent.inputTranscription.text,
                    finished: Boolean(serverContent.inputTranscription.finished),
                  });
                }

                // 3. Forward live output transcription (Gemini speech) & accumulate for memory
                if (serverContent?.outputTranscription?.text) {
                  accumTurnAiText += serverContent.outputTranscription.text;
                  safeSendToClient({
                    type: 'output_transcription',
                    text: serverContent.outputTranscription.text,
                    finished: Boolean(serverContent.outputTranscription.finished),
                  });
                }

                // 4. Forward instant interruption signal
                if (serverContent?.interrupted) {
                  safeSendToClient({
                    type: 'interrupted',
                    serverContent: { interrupted: true },
                  });
                }

                // 5. Forward turn complete signal & persist turn to Short-Term + Long-Term + Dialect Memory
                if (serverContent?.turnComplete) {
                  const committedUser = accumTurnUserText.trim();
                  const committedAi = accumTurnAiText.trim();
                  if (committedUser || committedAi) {
                    try {
                      learnLocalDialectAndMemoryFromTurn({
                        userText: committedUser,
                        assistantText: committedAi,
                        conversationId: clientConfig.conversationId || initialConvId,
                        userId: clientConfig.userId || 'default_user',
                        voicePersonaName: activePersonaName,
                      });
                    } catch (memErr) {
                      console.warn('[GeminiLiveWS] Memory save warning:', memErr);
                    }
                  }
                  accumTurnUserText = '';
                  accumTurnAiText = '';

                  safeSendToClient({
                    type: 'turn_complete',
                    serverContent: { turnComplete: true },
                  });
                }
              },
              onerror: (err: any) => {
                if (!liveSession || isClosing) return;
                console.error(`[GeminiLiveWS] Session error (${candidateModel}):`, err?.message || err);
                safeSendToClient({
                  type: 'error',
                  message: err?.message || 'حدث خطأ في قناة الاتصال الصوتي المباشر مع Gemini.',
                });
              },
              onclose: () => {
                if (!liveSession || isClosing) return;
                safeSendToClient({
                  type: 'closed',
                  message: 'انتهت جلسة المكالمة الصوتية المباشرة.',
                });
              },
            },
          });

          if (connectedSession) {
            liveSession = connectedSession;
            break;
          }
        } catch (err: any) {
          lastError = err;
          console.warn(
            `[GeminiLiveWS] Model ${candidateModel} failed to connect, trying fallback...`,
            err?.message || err
          );
        }
      }

      isConnecting = false;

      if (!liveSession && !isClosing) {
        safeSendToClient({
          type: 'error',
          message:
            lastError?.message ||
            'تعذر فتح خط المكالمة المباشرة مع Gemini في الوقت الحالي. يرجى المحاولة مرة أخرى.',
        });
        return;
      }

      // Flush any buffered audio chunks received while handshake was in progress
      while (pendingAudioChunks.length > 0 && liveSession && !isClosing) {
        const chunk = pendingAudioChunks.shift();
        if (chunk) {
          try {
            liveSession.sendRealtimeInput({
              audio: {
                data: chunk.data,
                mimeType: chunk.mimeType,
              },
            });
          } catch {}
        }
      }
    };

    // Fallback auto-start connection only if client does not send a setup frame within 1200ms
    const autoConnectTimer = setTimeout(() => {
      if (!liveSession && !isConnecting && !isClosing) {
        connectToGeminiLive({
          voiceName: initialVoice,
          lang: initialLang,
          locationName: initialLocation,
          conversationId: initialConvId,
        });
      }
    }, 1200);

    clientWs.on('message', async (rawData) => {
      try {
        const textData = typeof rawData === 'string' ? rawData : rawData.toString('utf-8');
        const msg = JSON.parse(textData);

        // 1. Handle initial setup message (both custom format & standard BidiGenerateContent setup format)
        if (msg.setup || msg.type === 'setup') {
          clearTimeout(autoConnectTimer);
          const voiceFromSetup =
            msg.voiceName ||
            msg.setup?.generationConfig?.speechConfig?.voiceConfig?.prebuiltVoiceConfig?.voiceName ||
            initialVoice;
          const sysFromSetup =
            msg.systemInstruction ||
            msg.setup?.systemInstruction?.parts?.[0]?.text ||
            undefined;

          await connectToGeminiLive({
            voiceName: voiceFromSetup,
            lang: msg.lang || initialLang,
            locationName: msg.locationName || initialLocation,
            conversationId: msg.conversationId || initialConvId,
            customSystemInstruction: sysFromSetup,
          });
          return;
        }

        // 2. Handle standard BidiGenerateContent realtimeInput.mediaChunks (from user's snippet)
        if (msg.realtimeInput?.mediaChunks && Array.isArray(msg.realtimeInput.mediaChunks)) {
          for (const chunk of msg.realtimeInput.mediaChunks) {
            if (!chunk?.data) continue;
            const mimeType = String(chunk.mimeType || 'audio/pcm;rate=16000');

            if (!liveSession) {
              if (mimeType.startsWith('audio/pcm') && pendingAudioChunks.length < 35) {
                pendingAudioChunks.push({ data: chunk.data, mimeType });
              }
              continue;
            }

            if (mimeType.startsWith('audio/pcm')) {
              liveSession.sendRealtimeInput({
                audio: {
                  data: chunk.data,
                  mimeType: 'audio/pcm;rate=16000',
                },
              });
            } else if (mimeType.startsWith('image/')) {
              liveSession.sendRealtimeInput({
                video: {
                  data: chunk.data,
                  mimeType,
                },
              });
            }
          }
          return;
        }

        // 3. Handle simplified audio frame: { type: 'audio', data: base64Pcm }
        if (msg.type === 'audio' && typeof msg.data === 'string') {
          if (!liveSession) {
            if (pendingAudioChunks.length < 35) {
              pendingAudioChunks.push({
                data: msg.data,
                mimeType: 'audio/pcm;rate=16000',
              });
            }
            return;
          }
          liveSession.sendRealtimeInput({
            audio: {
              data: msg.data,
              mimeType: 'audio/pcm;rate=16000',
            },
          });
          return;
        }

        // 4. Handle live camera or uploaded image frame: { type: 'video', data: base64Jpeg, mimeType: 'image/jpeg' }
        if (msg.type === 'video' && typeof msg.data === 'string' && liveSession) {
          liveSession.sendRealtimeInput({
            video: {
              data: msg.data,
              mimeType: msg.mimeType || 'image/jpeg',
            },
          });
          return;
        }

        // 5. Handle text prompt injection during call: { type: 'text', text: '...' }
        if (msg.type === 'text' && typeof msg.text === 'string' && msg.text.trim() && liveSession) {
          if (typeof liveSession.sendClientContent === 'function') {
            liveSession.sendClientContent({
              turns: [
                {
                  role: 'user',
                  parts: [{ text: msg.text.trim() }],
                },
              ],
              turnComplete: true,
            });
          } else {
            liveSession.sendRealtimeInput({
              text: msg.text.trim(),
            });
          }
          return;
        }
      } catch (err) {
        console.error('[GeminiLiveWS] Error processing client message:', err);
      }
    });

    const cleanupSession = () => {
      isClosing = true;
      clearTimeout(autoConnectTimer);
      pendingAudioChunks.length = 0;

      const residualUser = accumTurnUserText.trim();
      const residualAi = accumTurnAiText.trim();
      if (residualUser || residualAi) {
        try {
          learnLocalDialectAndMemoryFromTurn({
            userText: residualUser,
            assistantText: residualAi,
            conversationId: initialConvId,
            userId: 'default_user',
            voicePersonaName: activePersonaName,
          });
        } catch {}
        accumTurnUserText = '';
        accumTurnAiText = '';
      }

      if (liveSession) {
        try {
          liveSession.close();
        } catch {}
        liveSession = null;
      }
    };

    clientWs.on('close', cleanupSession);
    clientWs.on('error', cleanupSession);
  });
}
