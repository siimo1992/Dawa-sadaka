import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  PhoneOff,
  PhoneCall,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Camera,
  CameraOff,
  RefreshCw,
  MessageSquareText,
  Sparkles,
  Minimize2,
  Maximize2,
  Send,
  CheckCircle2,
  AlertCircle,
  Radio,
  X,
} from 'lucide-react';

export type GeminiLiveVoiceName = 'Aoede' | 'Puck' | 'Zephyr' | 'Charon' | 'Kore';

export interface VoiceOption {
  id: GeminiLiveVoiceName;
  labelAr: string;
  descAr: string;
  badge: string;
}

export const GEMINI_LIVE_VOICES: VoiceOption[] = [
  {
    id: 'Kore',
    labelAr: 'مسعودة — نبرة رسمية',
    descAr: 'صوت دقيق ومباشر للإرشادات والوثائق',
    badge: 'الافتراضي',
  },
  {
    id: 'Aoede',
    labelAr: 'مروة — نبرة دافئة',
    descAr: 'صوت بشري طبيعي ودافئ للمحادثات اليومية',
    badge: 'دافئ',
  },
  {
    id: 'Puck',
    labelAr: 'أسامة — نبرة حيوية',
    descAr: 'صوت تفاعلي سريع وواضح للشرح التقني',
    badge: 'حيوي',
  },
  {
    id: 'Zephyr',
    labelAr: 'عزة — نبرة هادئة',
    descAr: 'صوت متزن ومريح للاستشارات المطولة',
    badge: 'هادئ',
  },
  {
    id: 'Charon',
    labelAr: 'محمود — نبرة رخيمة',
    descAr: 'صوت عميق ورزين للتقارير والتحليلات',
    badge: 'رخيم',
  },
];

export interface CallTranscriptTurn {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
}

interface LiveVoiceCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  appName: string;
  locationName: string;
  lang: 'ar' | 'fr' | 'en';
  onSaveCallTurn?: (userText: string, assistantText: string) => void;
}

function float32ToInt16Base64(float32Array: Float32Array): string {
  const int16 = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  const bytes = new Uint8Array(int16.buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunkSize)));
  }
  return btoa(binary);
}

function base64ToInt16Float32(base64: string): Float32Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const int16 = new Int16Array(bytes.buffer);
  const float32 = new Float32Array(int16.length);
  for (let i = 0; i < int16.length; i++) {
    float32[i] = int16[i] / 32768.0;
  }
  return float32;
}

// Smoothly resample microphone Float32 PCM from native hardware sampleRate (e.g. 44.1kHz/48kHz) to exact 16kHz
function resampleTo16kHz(input: Float32Array, inputSampleRate: number): Float32Array {
  if (!inputSampleRate || inputSampleRate === 16000) {
    return input;
  }
  const ratio = inputSampleRate / 16000;
  const outputLength = Math.max(1, Math.round(input.length / ratio));
  const output = new Float32Array(outputLength);
  for (let i = 0; i < outputLength; i++) {
    const srcIndex = i * ratio;
    const idx0 = Math.floor(srcIndex);
    const idx1 = Math.min(input.length - 1, idx0 + 1);
    const frac = srcIndex - idx0;
    output[i] = input[idx0] * (1 - frac) + input[idx1] * frac;
  }
  return output;
}

export const LiveVoiceCallModal: React.FC<LiveVoiceCallModalProps> = ({
  isOpen,
  onClose,
  appName,
  locationName,
  lang,
  onSaveCallTurn,
}) => {
  const [callStatus, setCallStatus] = useState<'idle' | 'connecting' | 'connected' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedVoice, setSelectedVoice] = useState<GeminiLiveVoiceName>('Kore');
  const [activeModelName, setActiveModelName] = useState<string>('gemini-3.8-live');

  const [isMicMuted, setIsMicMuted] = useState<boolean>(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState<boolean>(false);
  const [isCameraOn, setIsCameraOn] = useState<boolean>(false);
  const [cameraFacingMode, setCameraFacingMode] = useState<'environment' | 'user'>('environment');

  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const [callSeconds, setCallSeconds] = useState<number>(0);

  // Real-time audio levels (0..1) for reactive App Icon visualizer (throttled for 60fps mobile smoothness)
  const [userAudioLevel, setUserAudioLevel] = useState<number>(0);
  const [aiAudioLevel, setAiAudioLevel] = useState<number>(0);
  const [isAiSpeaking, setIsAiSpeaking] = useState<boolean>(false);
  const lastUserLevelTsRef = useRef<number>(0);
  const lastUserLevelValRef = useRef<number>(0);
  const lastAiLevelTsRef = useRef<number>(0);

  // Live transcriptions (AI reply streams automatically behind the central icon)
  const [liveUserTranscript, setLiveUserTranscript] = useState<string>('');
  const [liveAiTranscript, setLiveAiTranscript] = useState<string>('');
  const [isAiCaptionFading, setIsAiCaptionFading] = useState<boolean>(false);
  const [transcriptTurns, setTranscriptTurns] = useState<CallTranscriptTurn[]>([]);

  // Refs for WebSocket, AudioContexts, MediaStreams, AnalyserNode, and Morphing Blobs
  const wsRef = useRef<WebSocket | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const micAudioCtxRef = useRef<AudioContext | null>(null);
  const micProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const micAnalyserRef = useRef<AnalyserNode | null>(null);
  const analyserDataRef = useRef<Uint8Array<ArrayBuffer> | null>(null);

  const morphContainerRef = useRef<HTMLDivElement | null>(null);
  const blob1ElRef = useRef<HTMLDivElement | null>(null);
  const blob2ElRef = useRef<HTMLDivElement | null>(null);
  const rafMorphRef = useRef<number | null>(null);
  const smoothedMicRef = useRef<number>(0);
  const blob1AngleRef = useRef<number>(0);
  const blob2AngleRef = useRef<number>(0);
  const lastFrameTsRef = useRef<number>(0);

  const playbackAudioCtxRef = useRef<AudioContext | null>(null);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const nextStartTimeRef = useRef<number>(0);

  const cameraStreamRef = useRef<MediaStream | null>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const frameCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const cameraIntervalRef = useRef<number | null>(null);

  const isMicMutedRef = useRef<boolean>(false);
  const isSpeakerMutedRef = useRef<boolean>(false);
  const accumUserTextRef = useRef<string>('');
  const accumAiTextRef = useRef<string>('');
  const aiTurnCompletedRef = useRef<boolean>(false);
  const aiCaptionFadeTimerRef = useRef<number | null>(null);
  const aiKineticStreamRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    isMicMutedRef.current = isMicMuted;
  }, [isMicMuted]);

  useEffect(() => {
    isSpeakerMutedRef.current = isSpeakerMuted;
  }, [isSpeakerMuted]);

  // Auto-scroll rising kinetic word stream upward behind the central icon as the assistant speaks
  useEffect(() => {
    if (aiKineticStreamRef.current) {
      aiKineticStreamRef.current.scrollTo({
        top: aiKineticStreamRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [liveAiTranscript]);

  // Call duration timer
  useEffect(() => {
    if (callStatus !== 'connected') return;
    const timer = window.setInterval(() => {
      setCallSeconds((prev) => prev + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [callStatus]);

  const formatDuration = (totalSec: number): string => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Stop all queued Gemini audio immediately (used on interruption or call end)
  const stopAudioPlayback = useCallback(() => {
    activeSourcesRef.current.forEach((source) => {
      try {
        source.stop();
        source.disconnect();
      } catch {}
    });
    activeSourcesRef.current.clear();
    if (playbackAudioCtxRef.current) {
      nextStartTimeRef.current = playbackAudioCtxRef.current.currentTime;
    } else {
      nextStartTimeRef.current = 0;
    }
    setIsAiSpeaking(false);
    setAiAudioLevel(0);
  }, []);

  // Play incoming PCM 24kHz Base64 chunk seamlessly with adaptive jitter buffer & de-click envelope
  const playRealtimeAudioChunk = useCallback((base64Audio: string) => {
    if (isSpeakerMutedRef.current) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!playbackAudioCtxRef.current || playbackAudioCtxRef.current.state === 'closed') {
        try {
          playbackAudioCtxRef.current = new AudioCtx({ sampleRate: 24000 });
        } catch {
          playbackAudioCtxRef.current = new AudioCtx();
        }
      }
      const ctx = playbackAudioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      const float32Samples = base64ToInt16Float32(base64Audio);
      if (float32Samples.length === 0) return;

      const now = ctx.currentTime;
      const isNewBurst = nextStartTimeRef.current <= now + 0.008;

      // Apply subtle 2ms micro-fade at the start of a new speech burst to prevent audible clicks/pops
      if (isNewBurst && float32Samples.length > 64) {
        const fadeLen = 48;
        for (let i = 0; i < fadeLen; i++) {
          float32Samples[i] *= i / fadeLen;
        }
      }

      // Compute RMS amplitude for the App Icon reactive aura (throttled to 200ms to prevent mobile GC jank)
      const nowPerf = performance.now();
      if (nowPerf - lastAiLevelTsRef.current > 200) {
        let sumSq = 0;
        const step = Math.max(1, Math.floor(float32Samples.length / 64));
        let count = 0;
        for (let i = 0; i < float32Samples.length; i += step) {
          sumSq += float32Samples[i] * float32Samples[i];
          count++;
        }
        const rms = Math.sqrt(sumSq / Math.max(1, count));
        const normalizedLevel = Math.min(1, rms * 4.2);
        lastAiLevelTsRef.current = nowPerf;
        setAiAudioLevel(normalizedLevel);
      }
      setIsAiSpeaking((prev) => (prev ? prev : true));

      const audioBuffer = ctx.createBuffer(1, float32Samples.length, 24000);
      audioBuffer.getChannelData(0).set(float32Samples);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);

      // 75ms initial jitter cushion when starting a new burst so network variance never causes underruns
      const startTime = isNewBurst
        ? now + 0.075
        : Math.max(now + 0.005, nextStartTimeRef.current);
      source.start(startTime);
      nextStartTimeRef.current = startTime + audioBuffer.duration;

      activeSourcesRef.current.add(source);
      source.onended = () => {
        activeSourcesRef.current.delete(source);
        if (activeSourcesRef.current.size === 0) {
          setIsAiSpeaking(false);
          setAiAudioLevel(0);
        }
      };
    } catch (err) {
      console.error('Error playing PCM chunk:', err);
    }
  }, []);

  // Send microphone PCM 16kHz chunk over WebSocket
  const sendMicrophoneAudioChunk = useCallback((base64PcmAudio: string) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    const audioMessage = {
      realtimeInput: {
        mediaChunks: [
          {
            mimeType: 'audio/pcm;rate=16000',
            data: base64PcmAudio,
          },
        ],
      },
    };
    ws.send(JSON.stringify(audioMessage));
  }, []);

  // Stop live camera stream
  const stopCameraStream = useCallback(() => {
    if (cameraIntervalRef.current) {
      window.clearInterval(cameraIntervalRef.current);
      cameraIntervalRef.current = null;
    }
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
    }
    if (videoElementRef.current) {
      videoElementRef.current.srcObject = null;
    }
    setIsCameraOn(false);
  }, []);

  // Start live camera stream (1 FPS JPEG frames to Gemini Live)
  const startCameraStream = useCallback(
    async (facing: 'environment' | 'user' = cameraFacingMode) => {
      try {
        stopCameraStream();
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: facing,
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
          audio: false,
        });
        cameraStreamRef.current = stream;
        setIsCameraOn(true);

        if (videoElementRef.current) {
          videoElementRef.current.srcObject = stream;
          await videoElementRef.current.play().catch(() => {});
        }

        cameraIntervalRef.current = window.setInterval(() => {
          const videoEl = videoElementRef.current;
          const ws = wsRef.current;
          if (!videoEl || !ws || ws.readyState !== WebSocket.OPEN || videoEl.readyState < 2) {
            return;
          }
          if (!frameCanvasRef.current) {
            frameCanvasRef.current = document.createElement('canvas');
          }
          const canvas = frameCanvasRef.current;
          canvas.width = 480;
          canvas.height = Math.round(
            (videoEl.videoHeight / Math.max(1, videoEl.videoWidth)) * 480
          ) || 360;
          const ctx = canvas.getContext('2d');
          if (!ctx) return;
          ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.68);
          const base64Jpeg = dataUrl.split(',')[1];
          if (base64Jpeg) {
            ws.send(
              JSON.stringify({
                realtimeInput: {
                  mediaChunks: [
                    {
                      mimeType: 'image/jpeg',
                      data: base64Jpeg,
                    },
                  ],
                },
              })
            );
          }
        }, 1000);
      } catch (err: any) {
        setErrorMessage('تعذر فتح الكاميرا. يرجى التأكد من منح صلاحية الكاميرا للمتصفح.');
        setIsCameraOn(false);
      }
    },
    [cameraFacingMode, stopCameraStream]
  );

  const handleToggleCamera = () => {
    if (isCameraOn) {
      stopCameraStream();
    } else {
      startCameraStream(cameraFacingMode);
    }
  };

  const handleFlipCamera = () => {
    const nextFacing = cameraFacingMode === 'environment' ? 'user' : 'environment';
    setCameraFacingMode(nextFacing);
    if (isCameraOn) {
      startCameraStream(nextFacing);
    }
  };

  // Full cleanup of microphone, WebSocket, and audio contexts
  const cleanupCall = useCallback(() => {
    stopCameraStream();
    stopAudioPlayback();

    if (micProcessorRef.current) {
      try {
        micProcessorRef.current.disconnect();
      } catch {}
      micProcessorRef.current = null;
    }
    if (micAnalyserRef.current) {
      try {
        micAnalyserRef.current.disconnect();
      } catch {}
      micAnalyserRef.current = null;
    }
    analyserDataRef.current = null;
    smoothedMicRef.current = 0;

    if (micAudioCtxRef.current) {
      try {
        micAudioCtxRef.current.close();
      } catch {}
      micAudioCtxRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }
    if (wsRef.current) {
      const oldWs = wsRef.current;
      wsRef.current = null;
      oldWs.onopen = null;
      oldWs.onmessage = null;
      oldWs.onerror = null;
      oldWs.onclose = null;
      try {
        oldWs.close();
      } catch {}
    }
    setUserAudioLevel(0);
    setAiAudioLevel(0);
    setIsAiSpeaking(false);
  }, [stopAudioPlayback, stopCameraStream]);

  // Start the live bidirectional call
  const startLiveCall = useCallback(
    async (voiceToUse: GeminiLiveVoiceName = selectedVoice) => {
      cleanupCall();
      setCallStatus('connecting');
      setErrorMessage(null);
      setLiveUserTranscript('');
      setLiveAiTranscript('');
      accumUserTextRef.current = '';
      accumAiTextRef.current = '';

      try {
        // 1. Request microphone stream (with echoCancellation & noiseSuppression)
        const micStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            sampleRate: 16000,
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
          video: false,
        });
        micStreamRef.current = micStream;

        // 2. Open WebSocket to our secure server bridge (/ws/gemini-live)
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/ws/gemini-live?voice=${encodeURIComponent(
          voiceToUse
        )}&lang=${encodeURIComponent(lang)}&location=${encodeURIComponent(
          locationName
        )}&convId=voice_live_default`;

        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (wsRef.current !== ws) return;
          const activeVoiceOption =
            GEMINI_LIVE_VOICES.find((v) => v.id === voiceToUse) || GEMINI_LIVE_VOICES[0];
          const personaShortName = activeVoiceOption.labelAr.split('—')[0].trim();

          const recentCallContext =
            transcriptTurns.length > 0
              ? `\n[سياق ما دار في هذه المكالمة حتى الآن]:\n${transcriptTurns
                  .slice(-6)
                  .map((t) => `${t.role === 'user' ? 'الزائر' : 'المساعد'}: ${t.text}`)
                  .join('\n')}`
              : '';

          const setupMessage = {
            conversationId: 'voice_live_default',
            setup: {
              model: 'models/gemini-2.5-flash-native-audio-preview-09-2025',
              generationConfig: {
                responseModalities: ['AUDIO'],
                speechConfig: {
                  voiceConfig: {
                    prebuiltVoiceConfig: {
                      voiceName: voiceToUse,
                    },
                  },
                },
              },
              systemInstruction: {
                parts: [
                  {
                    text: `اسمك في هذه المحادثة هو «${personaShortName}» (${activeVoiceOption.labelAr}) وأنت نموذج ذكي مطور من منصة تيدكلت AI داخل تطبيق «${appName}» (الموقع المرجعي: ${locationName}). إذا سألك المستخدم من أنت أو مع من يتحدث أو من طورك، أجب دائماً: «أنا ${personaShortName}، نموذج ذكي مطور من منصة تيدكلت AI». تحدث دائماً بمزيج متوازن من الدارجة الصحراوية الجزائرية (عين صالح وتيدكلت والجنوب الجزائري حصراً) والعربية البسيطة الواضحة للجميع بأسلوب سلس وطبيعي وحسب نبرتك (${activeVoiceOption.descAr})، وتعلّم من لهجة المستخدم ومفرداته الصحراوية الجزائرية واستفد من الذاكرة القصيرة والطويلة في ردودك.${recentCallContext}`,
                  },
                ],
              },
            },
          };
          ws.send(JSON.stringify(setupMessage));
        };

        ws.onmessage = async (event) => {
          if (wsRef.current !== ws) return;
          try {
            const rawText =
              typeof event.data === 'string' ? event.data : await event.data.text();
            const response = JSON.parse(rawText);

            if (response.type === 'connected') {
              setCallStatus('connected');
              if (response.model) {
                setActiveModelName(response.model);
              }
              return;
            }

            if (response.type === 'error') {
              setErrorMessage(response.message || 'تعذر الاتصال بخدمة المكالمة الصوتية المباشرة.');
              setCallStatus('error');
              return;
            }

            // Play real-time 24kHz PCM audio chunks from Gemini
            if (response.serverContent?.modelTurn?.parts) {
              for (const part of response.serverContent.modelTurn.parts) {
                if (part.inlineData && part.inlineData.mimeType?.startsWith('audio/pcm')) {
                  playRealtimeAudioChunk(part.inlineData.data);
                }
              }
            } else if (response.type === 'audio' && response.data) {
              playRealtimeAudioChunk(response.data);
            }

            // Instant interruption when user barges in
            if (response.serverContent?.interrupted || response.type === 'interrupted') {
              stopAudioPlayback();
              if (aiCaptionFadeTimerRef.current) {
                window.clearTimeout(aiCaptionFadeTimerRef.current);
                aiCaptionFadeTimerRef.current = null;
              }
              accumAiTextRef.current = '';
              aiTurnCompletedRef.current = false;
              setIsAiCaptionFading(false);
              setLiveAiTranscript('');
            }

            // Live user speech transcription (kept internally for memory & context)
            if (response.type === 'input_transcription' && response.text) {
              accumUserTextRef.current += response.text;
              setLiveUserTranscript(accumUserTextRef.current.trim());
            }

            // Live Gemini speech transcription — streams behind the central icon
            if (response.type === 'output_transcription' && response.text) {
              if (aiCaptionFadeTimerRef.current) {
                window.clearTimeout(aiCaptionFadeTimerRef.current);
                aiCaptionFadeTimerRef.current = null;
              }
              setIsAiCaptionFading(false);
              if (aiTurnCompletedRef.current) {
                accumAiTextRef.current = '';
                aiTurnCompletedRef.current = false;
              }
              accumAiTextRef.current += response.text;
              setLiveAiTranscript(accumAiTextRef.current.trim());
            }

            // Turn completion: commit transcripts to memory & smoothly fade out kinetic caption after speech ends
            if (response.type === 'turn_complete' || response.serverContent?.turnComplete) {
              const finalUser = accumUserTextRef.current.trim();
              const finalAi = accumAiTextRef.current.trim();

              if (finalUser || finalAi) {
                setTranscriptTurns((prev) => {
                  const next = [...prev];
                  if (finalUser) {
                    next.push({
                      id: `u-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                      role: 'user',
                      text: finalUser,
                      timestamp: Date.now(),
                    });
                  }
                  if (finalAi) {
                    next.push({
                      id: `a-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                      role: 'assistant',
                      text: finalAi,
                      timestamp: Date.now(),
                    });
                  }
                  return next;
                });

                if (onSaveCallTurn && (finalUser || finalAi)) {
                  onSaveCallTurn(finalUser, finalAi);
                }
              }

              accumUserTextRef.current = '';
              setLiveUserTranscript('');
              aiTurnCompletedRef.current = true;

              if (aiCaptionFadeTimerRef.current) {
                window.clearTimeout(aiCaptionFadeTimerRef.current);
              }
              aiCaptionFadeTimerRef.current = window.setTimeout(() => {
                setIsAiCaptionFading(true);
                aiCaptionFadeTimerRef.current = window.setTimeout(() => {
                  if (aiTurnCompletedRef.current) {
                    accumAiTextRef.current = '';
                    setLiveAiTranscript('');
                    setIsAiCaptionFading(false);
                  }
                }, 650);
              }, 2600);
            }
          } catch (err) {
            console.error('Failed parsing Live WS message:', err);
          }
        };

        ws.onerror = () => {
          if (wsRef.current !== ws) return;
          setErrorMessage('انقطع الاتصال المباشر بالخادم. يرجى إعادة المحاولة.');
          setCallStatus('error');
        };

        ws.onclose = () => {
          if (wsRef.current !== ws) return;
          setCallStatus((prev) => (prev === 'error' ? 'error' : 'idle'));
        };

        // 3. Set up AudioContext to capture & stream microphone PCM continuously at exact 16kHz
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        let micCtx: AudioContext;
        try {
          micCtx = new AudioCtx({ sampleRate: 16000 });
        } catch {
          micCtx = new AudioCtx();
        }
        micAudioCtxRef.current = micCtx;
        if (micCtx.state === 'suspended') {
          await micCtx.resume().catch(() => {});
        }

        const micSource = micCtx.createMediaStreamSource(micStream);

        // Web Audio API AnalyserNode for real-time ChatGPT-style Morphing Blobs reactivity
        const analyser = micCtx.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.82;
        micAnalyserRef.current = analyser;
        analyserDataRef.current = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));
        micSource.connect(analyser);

        const bufferSize = micCtx.sampleRate > 24000 ? 4096 : 2048;
        const processor = micCtx.createScriptProcessor(bufferSize, 1, 1);
        micProcessorRef.current = processor;

        // Silent gain node prevents microphone input from bleeding into local speakers
        const silentGain = micCtx.createGain();
        silentGain.gain.value = 0;

        processor.onaudioprocess = (audioEvent) => {
          if (isMicMutedRef.current) {
            if (lastUserLevelValRef.current !== 0) {
              lastUserLevelValRef.current = 0;
              setUserAudioLevel(0);
            }
            return;
          }
          const inputChannel = audioEvent.inputBuffer.getChannelData(0);

          // Calculate user speaking RMS level for UI indicators (throttled to 180ms for mobile smoothness)
          const nowPerf = performance.now();
          if (nowPerf - lastUserLevelTsRef.current > 180) {
            let sum = 0;
            const step = 16;
            let count = 0;
            for (let i = 0; i < inputChannel.length; i += step) {
              sum += inputChannel[i] * inputChannel[i];
              count++;
            }
            const rms = Math.sqrt(sum / Math.max(1, count));
            const level = Math.min(1, rms * 5.5);
            if (
              Math.abs(level - lastUserLevelValRef.current) > 0.04 ||
              (level === 0 && lastUserLevelValRef.current !== 0)
            ) {
              lastUserLevelValRef.current = level;
              lastUserLevelTsRef.current = nowPerf;
              setUserAudioLevel(level);
            }
          }

          const pcm16k = resampleTo16kHz(inputChannel, micCtx.sampleRate);
          const base64Pcm = float32ToInt16Base64(pcm16k);
          sendMicrophoneAudioChunk(base64Pcm);
        };

        micSource.connect(processor);
        processor.connect(silentGain);
        silentGain.connect(micCtx.destination);
      } catch (err: any) {
        setErrorMessage(
          'تعذر الوصول إلى الميكروفون. يرجى السماح بصلاحية الميكروفون في المتصفح لإجراء المكالمة.'
        );
        setCallStatus('error');
      }
    },
    [
      appName,
      cleanupCall,
      lang,
      locationName,
      onSaveCallTurn,
      playRealtimeAudioChunk,
      selectedVoice,
      sendMicrophoneAudioChunk,
      stopAudioPlayback,
    ]
  );

  // Open in pre-call ready state so all setup icons appear before starting the conversation
  useEffect(() => {
    if (isOpen) {
      setSelectedVoice('Kore');
      setCallSeconds(0);
      setCallStatus('idle');
      setErrorMessage(null);
    } else {
      cleanupCall();
      setCallStatus('idle');
      setIsMinimized(false);
    }
    return () => {
      cleanupCall();
    };
  }, [isOpen, cleanupCall]);

  // 60fps Web Audio API animation loop driving the two counter-rotating CSS Morphing Blobs
  useEffect(() => {
    if (!isOpen) return;
    lastFrameTsRef.current = performance.now();

    const updateMorphingBlobs = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastFrameTsRef.current) / 1000));
      lastFrameTsRef.current = now;

      let targetMicLevel = 0;
      const analyser = micAnalyserRef.current;
      const dataArray = analyserDataRef.current;

      if (analyser && dataArray && !isMicMutedRef.current) {
        analyser.getByteTimeDomainData(dataArray);
        let sumSq = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const normalized = (dataArray[i] - 128) / 128;
          sumSq += normalized * normalized;
        }
        const rms = Math.sqrt(sumSq / dataArray.length);
        targetMicLevel = Math.min(1, Math.max(0, (rms - 0.012) * 5.8));
      }

      // Smooth linear interpolation (attack faster than release for snappy voice feel)
      const smoothingFactor = targetMicLevel > smoothedMicRef.current ? 0.28 : 0.12;
      smoothedMicRef.current += (targetMicLevel - smoothedMicRef.current) * smoothingFactor;
      const micLevel = smoothedMicRef.current;

      // Calm breathing pulse when silent
      const calmBreath = Math.sin(now * 0.0024) * 0.035;

      // Opposite rotation speeds driven by microphone volume (deg/sec)
      const blob1AngularSpeed = 22 + micLevel * 185;
      const blob2AngularSpeed = 18 + micLevel * 160;
      blob1AngleRef.current = (blob1AngleRef.current + blob1AngularSpeed * dt) % 360;
      blob2AngleRef.current = (blob2AngleRef.current - blob2AngularSpeed * dt) % 360;

      // Dynamic scales for the two morphing blobs and central circular emblem
      const blob1Scale = 1.02 + calmBreath + micLevel * 0.56;
      const blob2Scale = 1.08 - calmBreath * 0.8 + micLevel * 0.72;
      const coreScale = 1.0 + calmBreath * 0.3 + micLevel * 0.16;

      if (morphContainerRef.current) {
        morphContainerRef.current.style.setProperty('--blob-1-rot', `${blob1AngleRef.current.toFixed(2)}deg`);
        morphContainerRef.current.style.setProperty('--blob-2-rot', `${blob2AngleRef.current.toFixed(2)}deg`);
        morphContainerRef.current.style.setProperty('--blob-1-scale', blob1Scale.toFixed(3));
        morphContainerRef.current.style.setProperty('--blob-2-scale', blob2Scale.toFixed(3));
        morphContainerRef.current.style.setProperty('--core-scale', coreScale.toFixed(3));
      }

      // Modulate CSS @keyframes morphing speed via Web Animations API
      const targetPlaybackRate = 1 + micLevel * 3.4;
      if (blob1ElRef.current?.getAnimations) {
        const anims1 = blob1ElRef.current.getAnimations();
        for (let i = 0; i < anims1.length; i++) {
          anims1[i].playbackRate = targetPlaybackRate;
        }
      }
      if (blob2ElRef.current?.getAnimations) {
        const anims2 = blob2ElRef.current.getAnimations();
        for (let i = 0; i < anims2.length; i++) {
          anims2[i].playbackRate = targetPlaybackRate;
        }
      }

      rafMorphRef.current = window.requestAnimationFrame(updateMorphingBlobs);
    };

    rafMorphRef.current = window.requestAnimationFrame(updateMorphingBlobs);
    return () => {
      if (rafMorphRef.current !== null) {
        window.cancelAnimationFrame(rafMorphRef.current);
        rafMorphRef.current = null;
      }
    };
  }, [isOpen]);

  const [swipeOffsetX, setSwipeOffsetX] = useState<number>(0);
  const [isTouchingSwipe, setIsTouchingSwipe] = useState<boolean>(false);
  const [isMidpointReached, setIsMidpointReached] = useState<boolean>(false);
  const [voiceSwipeFlash, setVoiceSwipeFlash] = useState<boolean>(false);
  const swipeStartXRef = useRef<number | null>(null);
  const didSwipeGestureRef = useRef<boolean>(false);
  const midpointHapticFiredRef = useRef<boolean>(false);
  const voiceFlashTimeoutRef = useRef<number | null>(null);

  // Trigger subtle Haptic Feedback on supported mobile devices
  const triggerHaptic = useCallback((pattern: number | number[] = 12) => {
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        navigator.vibrate(pattern);
      }
    } catch {}
  }, []);

  // Switch voice persona seamlessly
  const handleSelectVoice = (voice: GeminiLiveVoiceName) => {
    setSelectedVoice(voice);
    localStorage.setItem('tidikelt_live_voice', voice);
    triggerHaptic(15);
    setVoiceSwipeFlash(true);
    if (voiceFlashTimeoutRef.current) {
      window.clearTimeout(voiceFlashTimeoutRef.current);
    }
    voiceFlashTimeoutRef.current = window.setTimeout(() => {
      setVoiceSwipeFlash(false);
    }, 1800);

    if (isOpen && (callStatus === 'connected' || callStatus === 'connecting')) {
      startLiveCall(voice);
    }
  };

  // Cycle voice persona by direction (+1 or -1) when swiping the center icon
  const cycleVoiceBySwipe = (direction: 1 | -1) => {
    const currentIndex = GEMINI_LIVE_VOICES.findIndex((v) => v.id === selectedVoice);
    const nextIndex =
      (currentIndex + direction + GEMINI_LIVE_VOICES.length) % GEMINI_LIVE_VOICES.length;
    handleSelectVoice(GEMINI_LIVE_VOICES[nextIndex].id);
  };

  const SWIPE_MIDPOINT_PX = 34;

  const handleIconPointerDown = (clientX: number) => {
    swipeStartXRef.current = clientX;
    didSwipeGestureRef.current = false;
    midpointHapticFiredRef.current = false;
    setIsTouchingSwipe(true);
    setIsMidpointReached(false);
  };

  const handleIconPointerMove = (clientX: number) => {
    if (swipeStartXRef.current === null) return;
    const deltaX = clientX - swipeStartXRef.current;
    if (Math.abs(deltaX) > 8) {
      didSwipeGestureRef.current = true;
    }

    const crossedMidpoint = Math.abs(deltaX) >= SWIPE_MIDPOINT_PX;
    if (crossedMidpoint && !midpointHapticFiredRef.current) {
      midpointHapticFiredRef.current = true;
      setIsMidpointReached(true);
      triggerHaptic(10);
    } else if (!crossedMidpoint && midpointHapticFiredRef.current) {
      midpointHapticFiredRef.current = false;
      setIsMidpointReached(false);
      triggerHaptic(6);
    }

    const clamped = Math.max(-64, Math.min(64, deltaX * 0.65));
    setSwipeOffsetX(clamped);
  };

  const handleIconPointerEnd = (clientX?: number) => {
    if (swipeStartXRef.current === null) return;
    const deltaX = clientX !== undefined ? clientX - swipeStartXRef.current : swipeOffsetX;
    swipeStartXRef.current = null;
    midpointHapticFiredRef.current = false;
    setIsTouchingSwipe(false);
    setIsMidpointReached(false);
    setSwipeOffsetX(0);

    if (Math.abs(deltaX) >= SWIPE_MIDPOINT_PX) {
      didSwipeGestureRef.current = true;
      cycleVoiceBySwipe(deltaX < 0 ? 1 : -1);
    }
  };



  // Stop active conversation and return to pre-call setup state
  const handleStopActiveConversation = () => {
    const pendingUser = accumUserTextRef.current.trim();
    const pendingAi = accumAiTextRef.current.trim();
    if ((pendingUser || pendingAi) && onSaveCallTurn) {
      onSaveCallTurn(pendingUser, pendingAi);
    }
    cleanupCall();
    setCallStatus('idle');
    setCallSeconds(0);
  };

  const handleEndCall = () => {
    const pendingUser = accumUserTextRef.current.trim();
    const pendingAi = accumAiTextRef.current.trim();
    if ((pendingUser || pendingAi) && onSaveCallTurn) {
      onSaveCallTurn(pendingUser, pendingAi);
    }
    cleanupCall();
    onClose();
  };

  if (!isOpen) return null;

  const isConversationActive = callStatus === 'connecting' || callStatus === 'connected';
  const currentVoiceMeta =
    GEMINI_LIVE_VOICES.find((v) => v.id === selectedVoice) || GEMINI_LIVE_VOICES[0];

  // Dynamic scale & glow intensity driven by user & AI audio levels
  const combinedEnergy = Math.max(userAudioLevel, aiAudioLevel);

  // Minimized floating bar mode so user can browse the app while talking
  if (isMinimized) {
    return (
      <div
        dir={lang === 'ar' ? 'rtl' : 'ltr'}
        className="fixed bottom-20 end-3 sm:end-4 z-[95] flex items-center gap-2.5 p-2 pe-3 rounded-full bg-[var(--card)]/90 backdrop-blur-md text-[var(--ink)] border border-[var(--green)]/30 shadow-xl max-w-[calc(100vw-24px)]"
      >
        <div className="relative w-10 h-10 flex items-center justify-center shrink-0">
          <span
            className="absolute inset-0 rounded-full bg-[var(--green)]/30 blur-xs transition-transform duration-100"
            style={{ transform: `scale(${1 + combinedEnergy * 0.35})` }}
          />
          <div className="relative w-9 h-9 rounded-full overflow-hidden bg-[var(--card)] shadow-sm">
            <img
              src="/icon.svg"
              alt={appName}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover rounded-full"
            />
          </div>
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[var(--green)] animate-pulse shrink-0" />
            <span className="text-xs font-extrabold truncate text-[var(--ink)]">
              {isAiSpeaking ? 'يتحدث الآن...' : 'مكالمة مباشرة نشطة'}
            </span>
          </div>
          <div className="text-[11px] text-[var(--green)] font-mono font-bold tabular-nums">
            {formatDuration(callSeconds)} · {selectedVoice}
          </div>
        </div>

        <div className="flex items-center gap-1.5 ms-1 shrink-0">
          <button
            type="button"
            onClick={() => setIsMicMuted((prev) => !prev)}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer ${
              isMicMuted
                ? 'bg-[var(--bad)] text-white'
                : 'bg-[var(--bg)]/80 hover:bg-[var(--line)]/50 text-[var(--ink)]'
            }`}
            title={isMicMuted ? 'إلغاء كتم الميكروفون' : 'كتم الميكروفون'}
          >
            {isMicMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
          </button>

          <button
            type="button"
            onClick={() => setIsMinimized(false)}
            className="w-8 h-8 rounded-full bg-[var(--bg)]/80 hover:bg-[var(--line)]/50 text-[var(--ink)] flex items-center justify-center transition-colors cursor-pointer"
            title="تكبير شاشة المكالمة"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleEndCall}
            className="w-8 h-8 rounded-full bg-[var(--bad)] hover:opacity-90 text-white flex items-center justify-center transition-opacity cursor-pointer"
            title="إنهاء المكالمة"
          >
            <PhoneOff className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
      className="fixed inset-0 z-[100] bg-[var(--bg)] text-[var(--ink)] flex flex-col justify-between overflow-hidden select-none"
    >
      {/* Tidikelt AI Ambient Radial Aura */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden flex items-center justify-center">
        <div
          className="w-[340px] h-[340px] sm:w-[500px] sm:h-[500px] rounded-full opacity-90 transition-all duration-300"
          style={{
            background: isAiSpeaking
              ? 'radial-gradient(circle, color-mix(in srgb, var(--green) 26%, transparent) 0%, color-mix(in srgb, var(--gold) 12%, transparent) 52%, transparent 72%)'
              : userAudioLevel > 0.04
              ? 'radial-gradient(circle, color-mix(in srgb, var(--gold) 26%, transparent) 0%, color-mix(in srgb, var(--green) 12%, transparent) 52%, transparent 72%)'
              : 'radial-gradient(circle, color-mix(in srgb, var(--green) 12%, transparent) 0%, transparent 68%)',
          }}
        />
      </div>

      {/* Ultra-Minimal Transparent Floating Top Bar (No Top Voice Dropdown) */}
      <header className="relative z-20 flex items-center justify-between gap-2 px-3.5 sm:px-5 pt-2.5 pb-1 bg-transparent">
        {/* Element 3: Transparent Compact Status & Timer */}
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-transparent">
          <span
            className={`w-1.5 h-1.5 rounded-full shrink-0 ${
              callStatus === 'connected'
                ? 'bg-[var(--green)] animate-pulse shadow-[0_0_6px_var(--green)]'
                : callStatus === 'connecting'
                ? 'bg-[var(--gold)] animate-ping'
                : 'bg-[var(--mute)]/60'
            }`}
          />
          <span className="text-[10.5px] font-mono font-semibold text-[var(--ink)]/75 tabular-nums">
            {isConversationActive ? formatDuration(callSeconds) : 'جاهز'}
          </span>
        </div>

        {/* Element 2: Smaller Transparent Top Controls (Minimize & Close Only) */}
        <div className="flex items-center gap-1 shrink-0 bg-transparent">
          <button
            type="button"
            onClick={() => setIsMinimized(true)}
            className="w-7 h-7 rounded-full bg-transparent hover:bg-[var(--ink)]/10 flex items-center justify-center text-[var(--ink)]/75 hover:text-[var(--ink)] transition-all active:scale-95 cursor-pointer"
            title="تصغير النافذة مع استمرار المكالمة"
          >
            <Minimize2 className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleEndCall}
            className="w-7 h-7 rounded-full bg-transparent hover:bg-[var(--bad)]/15 flex items-center justify-center text-[var(--ink)]/75 hover:text-[var(--bad)] transition-all active:scale-95 cursor-pointer"
            title="إغلاق وإنهاء المكالمة"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* Main Call Stage: Centered Circular Floating App Icon with Rising Kinetic AI Text Stream Behind It */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 sm:px-6 py-2 overflow-hidden min-h-0">
        {/* Element 1: Center Stage with Background Rising AI Word Stream + Foreground Morphing Orb */}
        <div className="relative flex-1 flex flex-col items-center justify-center w-full max-w-xl mx-auto my-auto">
          {/* Background Layer (z-[5]): Rising Kinetic Word Stream of Assistant's Reply Behind the Central Icon */}
          {liveAiTranscript && (
            <div
              aria-live="polite"
              className={`pointer-events-none select-none absolute inset-x-0 -top-6 sm:-top-10 bottom-14 z-[5] flex flex-col items-center justify-center px-3 sm:px-6 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                isAiCaptionFading
                  ? 'opacity-0 -translate-y-4 scale-95'
                  : 'opacity-100 translate-y-0 scale-100'
              }`}
              style={{
                maskImage:
                  'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.92) 18%, rgba(0,0,0,1) 76%, transparent 100%)',
                WebkitMaskImage:
                  'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,0.92) 18%, rgba(0,0,0,1) 76%, transparent 100%)',
              }}
            >
              <div
                ref={aiKineticStreamRef}
                dir="rtl"
                className="w-full max-h-[250px] sm:max-h-[300px] overflow-y-auto no-scrollbar flex flex-col justify-end items-center text-center pt-6 pb-20 sm:pb-24 px-2"
              >
                <p className="m-0 max-w-md sm:max-w-lg text-base sm:text-xl font-extrabold leading-[1.85] tracking-normal flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1">
                  {(() => {
                    const words = liveAiTranscript.trim().split(/\s+/).filter(Boolean);
                    const total = words.length;
                    return words.map((word, idx) => {
                      const distFromEnd = total - 1 - idx;
                      const isActiveSpokenWord = distFromEnd <= 3;
                      const isRecentPhrase = distFromEnd > 3 && distFromEnd <= 11;
                      return (
                        <span
                          key={`${idx}-${word}`}
                          className={`inline-block transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                            isActiveSpokenWord
                              ? 'text-[var(--gold)] scale-[1.04] drop-shadow-[0_0_16px_color-mix(in_srgb,var(--gold)_65%,transparent)]'
                              : isRecentPhrase
                              ? 'text-[var(--ink)]/92 drop-shadow-[0_2px_12px_rgba(0,0,0,0.38)]'
                              : 'text-[var(--ink)]/52'
                          }`}
                        >
                          {word}
                        </span>
                      );
                    });
                  })()}
                </p>
              </div>
            </div>
          )}

          <div
            ref={morphContainerRef}
            onTouchStart={(e) => {
              if (e.touches[0]) handleIconPointerDown(e.touches[0].clientX);
            }}
            onTouchMove={(e) => {
              if (e.touches[0]) handleIconPointerMove(e.touches[0].clientX);
            }}
            onTouchEnd={(e) => {
              const endX = e.changedTouches[0]?.clientX;
              handleIconPointerEnd(endX);
            }}
            onMouseDown={(e) => handleIconPointerDown(e.clientX)}
            onMouseMove={(e) => {
              if (swipeStartXRef.current !== null) handleIconPointerMove(e.clientX);
            }}
            onMouseUp={(e) => handleIconPointerEnd(e.clientX)}
            onMouseLeave={() => {
              if (swipeStartXRef.current !== null) handleIconPointerEnd();
            }}
            onClick={() => {
              if (didSwipeGestureRef.current) {
                didSwipeGestureRef.current = false;
                return;
              }
              if (!isConversationActive) {
                startLiveCall(selectedVoice);
              }
            }}
            className="relative z-10 w-52 h-52 sm:w-64 sm:h-64 flex items-center justify-center cursor-grab active:cursor-grabbing touch-pan-y"
            title="اسحب الأيقونة يميناً أو يساراً لتغيير نبرة الصوت"
          >
            {/* Morphing Blob 2: Tidikelt Desert Gold Counter-Clockwise Fluid Aura */}
            <div
              ref={blob2ElRef}
              className="chatgpt-morph-blob-2 absolute inset-3 sm:inset-4 blur-xl pointer-events-none transition-opacity duration-300"
              style={{
                background:
                  'radial-gradient(circle at 38% 38%, color-mix(in srgb, var(--gold) 78%, transparent) 0%, color-mix(in srgb, var(--green) 42%, transparent) 62%, transparent 85%)',
                opacity: userAudioLevel > 0.02 || isAiSpeaking ? 0.92 : 0.65,
              }}
            />

            {/* Morphing Blob 1: Tidikelt Oasis Green Clockwise Fluid Aura */}
            <div
              ref={blob1ElRef}
              className="chatgpt-morph-blob-1 absolute inset-6 sm:inset-7 blur-lg pointer-events-none transition-opacity duration-300"
              style={{
                background:
                  'linear-gradient(135deg, color-mix(in srgb, var(--green) 85%, transparent) 0%, color-mix(in srgb, var(--gold) 65%, transparent) 100%)',
                opacity: userAudioLevel > 0.02 || isAiSpeaking ? 0.95 : 0.72,
              }}
            />

            {/* Central Circular Element (/icon.svg) — Responds to Touch Swipe, Midpoint Haptic Pop & Web Audio API Scale */}
            <div
              className={`relative z-10 w-28 h-28 sm:w-36 sm:h-36 rounded-full overflow-hidden bg-[var(--card)] flex items-center justify-center ${
                isTouchingSwipe
                  ? 'transition-shadow duration-150'
                  : 'transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]'
              } ${
                isMidpointReached
                  ? 'shadow-[0_0_55px_color-mix(in_srgb,var(--gold)_65%,transparent)] ring-2 ring-[var(--gold)]/60'
                  : 'shadow-[0_0_45px_color-mix(in_srgb,var(--green)_45%,transparent)]'
              }`}
              style={{
                transform: `translate3d(${swipeOffsetX}px, 0, 0) scale(calc(var(--core-scale, 1) * ${
                  isMidpointReached ? 1.06 : 1
                }))`,
              }}
            >
              <img
                src="/icon.svg"
                alt={appName}
                referrerPolicy="no-referrer"
                draggable={false}
                className="w-full h-full object-cover rounded-full select-none pointer-events-none"
              />
            </div>
          </div>

          {/* Minimal Subtle Acoustic Wave Dots + Smooth Touch-Responsive Voice Persona Bar */}
          <div className="relative z-10 mt-3 flex flex-col items-center gap-2">
            <div className="flex items-center justify-center gap-1.5 h-4">
              {[0.45, 0.75, 1, 0.85, 0.65, 0.9, 0.5].map((multiplier, idx) => {
                const activeHeight = Math.max(
                  4,
                  Math.min(18, Math.round((combinedEnergy * multiplier + 0.1) * 18))
                );
                return (
                  <span
                    key={idx}
                    className={`w-1.5 rounded-full transition-all duration-100 ${
                      isAiSpeaking
                        ? 'bg-[var(--green)] shadow-[0_0_8px_var(--green)]'
                        : userAudioLevel > 0.04
                        ? 'bg-[var(--gold)] shadow-[0_0_8px_var(--gold)]'
                        : 'bg-[var(--mute)]/30'
                    }`}
                    style={{ height: `${activeHeight}px` }}
                  />
                );
              })}
            </div>

            {/* Smooth CSS-Transitioned Voice Persona Bar & Interactive Midpoint Indicator */}
            <div
              className={`flex flex-col items-center gap-2 px-4 py-1.5 rounded-full transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                isTouchingSwipe || voiceSwipeFlash
                  ? 'opacity-100 scale-105 bg-[var(--card)]/55 backdrop-blur-md border border-[var(--line)]/60 shadow-sm'
                  : !isConversationActive
                  ? 'opacity-100 scale-100 bg-transparent'
                  : 'opacity-95 hover:opacity-100 scale-100 bg-transparent'
              }`}
              style={{
                transform: `translate3d(${(swipeOffsetX * 0.18).toFixed(1)}px, 0, 0)`,
              }}
            >
              <span
                className={`text-sm sm:text-base font-extrabold tracking-wide leading-snug drop-shadow-[0_2px_10px_rgba(0,0,0,0.45)] transition-colors duration-200 ${
                  isMidpointReached ? 'text-[var(--gold)]' : 'text-[#dbefe1]'
                }`}
                style={isMidpointReached ? undefined : { color: '#dbefe1' }}
              >
                {currentVoiceMeta.labelAr}
              </span>
              <div className="flex items-center gap-2">
                {GEMINI_LIVE_VOICES.map((v) => {
                  const isActive = v.id === selectedVoice;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => handleSelectVoice(v.id)}
                      aria-label={v.labelAr}
                      className={`h-2 rounded-full transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] cursor-pointer ${
                        isActive
                          ? isMidpointReached
                            ? 'w-6 bg-[var(--gold)] scale-110'
                            : 'w-5 bg-[var(--green)]'
                          : 'w-2 bg-[var(--mute)]/45 hover:bg-[var(--mute)]/75'
                      }`}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          {/* Error Banner with Instant Reconnect Button (Only visible on error) */}
          {errorMessage && (
            <div className="relative z-10 mt-4 px-3.5 py-2 rounded-full bg-[var(--bad)]/15 border border-[var(--bad)]/40 text-[var(--ink)] text-xs flex items-center gap-2 max-w-sm">
              <AlertCircle className="w-4 h-4 text-[var(--bad)] shrink-0" />
              <span className="flex-1 truncate">{errorMessage}</span>
              <button
                type="button"
                onClick={() => startLiveCall(selectedVoice)}
                className="px-2.5 py-1 rounded-full bg-[var(--bad)] hover:opacity-90 text-white font-bold cursor-pointer shrink-0"
              >
                إعادة
              </button>
            </div>
          )}

          {/* Live Camera Preview Card */}
          {isCameraOn && (
            <div className="relative z-10 mt-4 w-52 sm:w-64 rounded-2xl overflow-hidden border border-[var(--green)]/40 bg-[var(--card)]/90 shadow-xl">
              <video
                ref={videoElementRef}
                autoPlay
                playsInline
                muted
                className="w-full h-32 sm:h-40 object-cover"
              />

              <div className="absolute top-2 inset-x-2 flex items-center justify-between">
                <span className="px-2 py-0.5 rounded-full bg-[var(--card)]/90 text-[var(--green)] text-[10px] font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--green)] animate-ping" />
                  <span>كاميرا</span>
                </span>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleFlipCamera}
                    className="w-6 h-6 rounded-full bg-[var(--card)]/90 hover:bg-[var(--card)] text-[var(--ink)] flex items-center justify-center cursor-pointer"
                    title="تبديل الكاميرا الأمامية/الخلفية"
                  >
                    <RefreshCw className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      stopCameraStream();
                    }}
                    className="w-6 h-6 rounded-full bg-[var(--bad)] text-white flex items-center justify-center cursor-pointer"
                    title="إيقاف الكاميرا"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Glassmorphism Translucent Capsule Control Dock — 2 Small Circular Icons During Active Call, Additional Icons When Not Active */}
      <footer className="relative z-20 px-4 pb-6 pt-2 flex items-center justify-center">
        <div className="inline-flex items-center gap-2 sm:gap-2.5 px-2.5 py-1.5 rounded-full bg-[var(--card)]/35 backdrop-blur-xl border border-[var(--line)]/55 shadow-[0_8px_32px_rgba(0,0,0,0.12)] transition-all duration-300">
          {isConversationActive ? (
            <>
              {/* Active Call Icon 1: Mute / Unmute Microphone */}
              <button
                type="button"
                onClick={() => setIsMicMuted((prev) => !prev)}
                aria-label={isMicMuted ? 'تشغيل الميكروفون' : 'كتم الصوت'}
                className={`w-9 h-9 rounded-full flex items-center justify-center border transition-all active:scale-95 cursor-pointer ${
                  isMicMuted
                    ? 'bg-[var(--bad)]/85 border-[var(--bad)] text-white shadow-xs'
                    : 'bg-[var(--card)]/45 hover:bg-[var(--card)]/75 border-[var(--line)]/50 text-[var(--ink)]'
                }`}
                title={isMicMuted ? 'تشغيل الميكروفون' : 'كتم الصوت'}
              >
                {isMicMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>

              {/* Active Call Icon 2: End Conversation */}
              <button
                type="button"
                onClick={handleStopActiveConversation}
                aria-label="إنهاء المحادثة"
                className="w-9 h-9 rounded-full bg-[var(--bad)]/90 hover:bg-[var(--bad)] border border-[var(--bad)]/60 text-white flex items-center justify-center shadow-xs transition-all active:scale-95 cursor-pointer"
                title="إنهاء المحادثة"
              >
                <PhoneOff className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              {/* Pre-Call Icon 1: Start Conversation */}
              <button
                type="button"
                onClick={() => startLiveCall(selectedVoice)}
                aria-label="بدء المحادثة الصوتية"
                className="w-9 h-9 rounded-full flex items-center justify-center bg-[var(--green)]/90 hover:bg-[var(--green)] border border-[var(--green)]/50 text-white shadow-xs transition-all active:scale-95 cursor-pointer"
                title="بدء المحادثة الصوتية"
              >
                <Mic className="w-4 h-4" />
              </button>

              {/* Pre-Call Additional Icon 2: Mute / Unmute Microphone Preset */}
              <button
                type="button"
                onClick={() => setIsMicMuted((prev) => !prev)}
                aria-label={isMicMuted ? 'تشغيل الميكروفون' : 'كتم الصوت'}
                className={`w-9 h-9 rounded-full flex items-center justify-center border transition-all active:scale-95 cursor-pointer ${
                  isMicMuted
                    ? 'bg-[var(--bad)]/85 border-[var(--bad)] text-white'
                    : 'bg-[var(--card)]/45 hover:bg-[var(--card)]/75 border-[var(--line)]/50 text-[var(--ink)]/85'
                }`}
                title={isMicMuted ? 'إلغاء كتم الميكروفون' : 'كتم الصوت قبل البدء'}
              >
                {isMicMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-3.5 h-3.5 opacity-75" />}
              </button>

              {/* Pre-Call Additional Icon 3: Speaker Mute / Unmute */}
              <button
                type="button"
                onClick={() => {
                  setIsSpeakerMuted((prev) => {
                    const next = !prev;
                    if (next) stopAudioPlayback();
                    return next;
                  });
                }}
                aria-label={isSpeakerMuted ? 'تشغيل السماعة' : 'كتم السماعة'}
                className={`w-9 h-9 rounded-full flex items-center justify-center border transition-all active:scale-95 cursor-pointer ${
                  isSpeakerMuted
                    ? 'bg-[var(--gold)]/85 border-[var(--gold)] text-white'
                    : 'bg-[var(--card)]/45 hover:bg-[var(--card)]/75 border-[var(--line)]/50 text-[var(--ink)]/85'
                }`}
                title={isSpeakerMuted ? 'تشغيل السماعة' : 'كتم السماعة'}
              >
                {isSpeakerMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>

              {/* Pre-Call Additional Icon 4: Live Camera Sharing Toggle */}
              <button
                type="button"
                onClick={handleToggleCamera}
                aria-label={isCameraOn ? 'إيقاف الكاميرا' : 'تشغيل الكاميرا'}
                className={`w-9 h-9 rounded-full flex items-center justify-center border transition-all active:scale-95 cursor-pointer ${
                  isCameraOn
                    ? 'bg-[var(--green)]/85 border-[var(--green)] text-white'
                    : 'bg-[var(--card)]/45 hover:bg-[var(--card)]/75 border-[var(--line)]/50 text-[var(--ink)]/85'
                }`}
                title="مشاركة الكاميرا الحية"
              >
                {isCameraOn ? <CameraOff className="w-4 h-4" /> : <Camera className="w-4 h-4" />}
              </button>

              {/* Pre-Call Icon 5: End / Close Call Screen */}
              <button
                type="button"
                onClick={handleEndCall}
                aria-label="إنهاء المحادثة"
                className="w-9 h-9 rounded-full bg-[var(--bad)]/90 hover:bg-[var(--bad)] border border-[var(--bad)]/60 text-white flex items-center justify-center shadow-xs transition-all active:scale-95 cursor-pointer"
                title="إنهاء وإغلاق المحادثة"
              >
                <PhoneOff className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </footer>
    </div>
  );
};
