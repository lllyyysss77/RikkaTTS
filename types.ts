
export interface AudioMessage {
  id: string;
  text: string;
  audioUrl: string; // Blob URL
  createdAt: number;
  cost?: number; // Cost in CNY
  generationTime?: number; // Generation duration in ms
  status?: 'pending' | 'success' | 'error';
  errorMessage?: string;
  voiceName?: string;
}

export const TTS_MODELS = [
  { id: 'IndexTeam/IndexTTS-2', name: 'IndexTTS-2' },
  { id: 'FunAudioLLM/CosyVoice2-0.5B', name: 'CosyVoice2-0.5B' },
  { id: 'fnlp/MOSS-TTSD-v0.5', name: 'MOSS-TTSD-v0.5' },
] as const;

export type TTSModelId = typeof TTS_MODELS[number]['id'];

export interface Voice {
  id: string; // 'alex' or 'speech:...'
  name: string;
  type: 'system' | 'custom';
  referenceText?: string; // Optional reference text for custom voices
}

// System voices as a fallback/baseline
export const SYSTEM_VOICES: Voice[] = [
  { id: 'alex', name: '沉稳男声', type: 'system' },
  { id: 'benjamin', name: '低沉男声', type: 'system' },
  { id: 'charles', name: '磁性男声', type: 'system' },
  { id: 'david', name: '欢快男声', type: 'system' },
  { id: 'anna', name: '沉稳女声', type: 'system' },
  { id: 'bella', name: '激情女声', type: 'system' },
  { id: 'claire', name: '温柔女声', type: 'system' },
  { id: 'diana', name: '欢快女声', type: 'system' },
];

export interface VoiceConfig {
  name: string;
  id: string;
}