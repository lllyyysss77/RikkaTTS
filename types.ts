export interface AudioMessage {
  id: string;
  text: string;
  audioUrl: string; // Blob URL
  createdAt: number;
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
}

// System voices as a fallback/baseline
export const SYSTEM_VOICES: Voice[] = [
  { id: 'alex', name: '沉稳男声 (Alex)', type: 'system' },
  { id: 'benjamin', name: '低沉男声 (Benjamin)', type: 'system' },
  { id: 'charles', name: '磁性男声 (Charles)', type: 'system' },
  { id: 'david', name: '欢快男声 (David)', type: 'system' },
  { id: 'anna', name: '沉稳女声 (Anna)', type: 'system' },
  { id: 'bella', name: '激情女声 (Bella)', type: 'system' },
  { id: 'claire', name: '温柔女声 (Claire)', type: 'system' },
  { id: 'diana', name: '欢快女声 (Diana)', type: 'system' },
];

export interface VoiceConfig {
  name: string;
  id: string;
}