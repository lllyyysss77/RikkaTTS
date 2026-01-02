import React, { useState, useEffect } from 'react';
import { X, Check, Mic, Box, RefreshCw } from 'lucide-react';
import { TTS_MODELS, TTSModelId, Voice, SYSTEM_VOICES } from '../types';
import { fetchCustomVoices } from '../services/geminiService';

interface ModelVoiceSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  currentModel: TTSModelId;
  currentVoice: Voice;
  onSelectModel: (model: TTSModelId) => void;
  onSelectVoice: (voice: Voice) => void;
  apiKey: string;
}

export const ModelVoiceSelector: React.FC<ModelVoiceSelectorProps> = ({
  isOpen,
  onClose,
  currentModel,
  currentVoice,
  onSelectModel,
  onSelectVoice,
  apiKey,
}) => {
  const [activeTab, setActiveTab] = useState<'model' | 'voice'>('model');
  const [customVoices, setCustomVoices] = useState<Voice[]>([]);
  const [isLoadingVoices, setIsLoadingVoices] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadCustomVoices();
    }
  }, [isOpen]);

  const loadCustomVoices = async () => {
    if (!apiKey) {
        setVoiceError("API Key is missing");
        return;
    }
    setIsLoadingVoices(true);
    setVoiceError(null);
    try {
      const voices = await fetchCustomVoices(apiKey);
      setCustomVoices(voices);
    } catch (e) {
      console.error("Failed to load voices:", e);
      setVoiceError(e instanceof Error ? e.message : "Failed to load voices");
    } finally {
      setIsLoadingVoices(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-md md:max-w-xl bg-white rounded-t-2xl shadow-2xl flex flex-col max-h-[85vh] h-[500px] animate-in slide-in-from-bottom duration-300">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-800">配置选择</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex p-2 gap-2 bg-gray-50 mx-4 mt-4 rounded-lg shrink-0">
          <button
            onClick={() => setActiveTab('model')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
              activeTab === 'model' 
                ? 'bg-white text-purple-600 shadow-sm' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            选择模型
          </button>
          <button
            onClick={() => setActiveTab('voice')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
              activeTab === 'voice' 
                ? 'bg-white text-purple-600 shadow-sm' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            选择音色
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'model' && (
            <div className="space-y-2">
              {TTS_MODELS.map((model) => (
                <button
                  key={model.id}
                  onClick={() => onSelectModel(model.id)}
                  className={`w-full flex items-center justify-between p-4 rounded-xl border transition-all ${
                    currentModel === model.id 
                      ? 'border-purple-500 bg-purple-50' 
                      : 'border-gray-200 hover:border-purple-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                       currentModel === model.id ? 'bg-purple-200 text-purple-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      <Box className="w-5 h-5" />
                    </div>
                    <div className="text-left">
                      <div className={`font-semibold ${currentModel === model.id ? 'text-purple-900' : 'text-gray-700'}`}>
                        {model.name}
                      </div>
                      <div className="text-xs text-gray-500">{model.id}</div>
                    </div>
                  </div>
                  {currentModel === model.id && <Check className="w-5 h-5 text-purple-600" />}
                </button>
              ))}
            </div>
          )}

          {activeTab === 'voice' && (
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">我的音色 (API获取)</h4>
                  <button onClick={loadCustomVoices} disabled={isLoadingVoices}>
                    <RefreshCw className={`w-3.5 h-3.5 text-gray-400 ${isLoadingVoices ? 'animate-spin' : ''}`} />
                  </button>
                </div>
                
                {isLoadingVoices && customVoices.length === 0 ? (
                  <div className="text-sm text-gray-400 text-center py-4">加载中...</div>
                ) : voiceError ? (
                   <div className="text-sm text-red-400 text-center py-4 bg-red-50 rounded-lg border border-red-100">
                     {voiceError}
                   </div>
                ) : customVoices.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {customVoices.map(voice => (
                      <button
                        key={voice.id}
                        onClick={() => onSelectVoice(voice)}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          currentVoice.id === voice.id 
                            ? 'border-purple-500 bg-purple-50 ring-1 ring-purple-500' 
                            : 'border-gray-200 hover:border-purple-200 bg-white'
                        }`}
                      >
                         <div className="font-medium text-gray-800 truncate">{voice.name}</div>
                         <div className="text-[10px] text-gray-400 mt-1 truncate max-w-full opacity-60">{voice.id}</div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-400 text-center py-4 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                    暂无自定义音色，请先在设置中上传
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};