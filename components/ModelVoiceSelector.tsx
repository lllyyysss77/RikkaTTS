import React, { useState, useEffect } from 'react';
import { X, Check, Box, RefreshCw, Upload, Edit3, Trash2, CheckCircle, Quote, Loader2, Copy } from 'lucide-react';
import { TTS_MODELS, TTSModelId, Voice } from '../types';
import { fetchCustomVoices, deleteCustomVoice } from '../services/geminiService';

interface ModelVoiceSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  currentModel: TTSModelId;
  currentVoice: Voice;
  onSelectModel: (model: TTSModelId) => void;
  onSelectVoice: (voice: Voice) => void;
  apiKey: string;
  onOpenSettings: (view: 'upload') => void;
}

const NICKNAME_STORAGE_KEY = 'SILICONFLOW_VOICE_NICKNAMES';

export const ModelVoiceSelector: React.FC<ModelVoiceSelectorProps> = ({
  isOpen,
  onClose,
  currentModel,
  currentVoice,
  onSelectModel,
  onSelectVoice,
  apiKey,
  onOpenSettings
}) => {
  const [activeTab, setActiveTab] = useState<'model' | 'voice'>('voice');
  const [customVoices, setCustomVoices] = useState<Voice[]>([]);
  const [isLoadingVoices, setIsLoadingVoices] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  
  // Nicknames management
  const [nicknames, setNicknames] = useState<Record<string, string>>({});
  
  // UI State for Actions
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editNameValue, setEditNameValue] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadCustomVoices();
      setActiveTab('voice');
      // Load nicknames
      try {
        const saved = localStorage.getItem(NICKNAME_STORAGE_KEY);
        if (saved) {
            setNicknames(JSON.parse(saved));
        }
      } catch (e) {
          console.error("Failed to load nicknames", e);
      }
    }
  }, [isOpen]);

  const loadCustomVoices = async () => {
    if (!apiKey || !apiKey.trim()) {
        setCustomVoices([]);
        setVoiceError(null);
        return;
    }
    
    setIsLoadingVoices(true);
    setVoiceError(null);
    try {
      const voices = await fetchCustomVoices(apiKey);
      setCustomVoices(voices);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load voices";
      if (msg.includes('401')) {
          setCustomVoices([]); 
      } else {
          console.error("Failed to load voices:", e); 
          setVoiceError(msg);
      }
    } finally {
      setIsLoadingVoices(false);
    }
  };

  const handleSaveNickname = (id: string) => {
      const newNicknames = { ...nicknames, [id]: editNameValue };
      setNicknames(newNicknames);
      localStorage.setItem(NICKNAME_STORAGE_KEY, JSON.stringify(newNicknames));
      setEditingId(null);
      
      // Update currently selected voice if it matches
      if (currentVoice.id === id) {
          onSelectVoice({ ...currentVoice, name: editNameValue });
      }
  };

  const handleStartEdit = (e: React.MouseEvent, voice: Voice) => {
      e.stopPropagation();
      setEditingId(voice.id);
      setEditNameValue(nicknames[voice.id] || voice.name);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if (deletingId === id) return; 
      
      setDeletingId(id);
      try {
          await deleteCustomVoice(id, apiKey);
          setCustomVoices(prev => prev.filter(v => v.id !== id));
          if (currentVoice.id === id) {
              onSelectVoice({ id: 'default', name: 'Default', type: 'system' }); // Reset if selected deleted
          }
      } catch (e) {
          alert("删除失败: " + (e instanceof Error ? e.message : "未知错误"));
      } finally {
          setDeletingId(null);
      }
  };

  const handleCopyId = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      navigator.clipboard.writeText(id).then(() => {
          // Visual feedback could be added here
      }).catch(err => {
          console.warn('Clipboard API failed', err);
          // Fallback mechanism
          const textArea = document.createElement("textarea");
          textArea.value = id;
          textArea.style.position = "fixed";
          textArea.style.left = "-9999px";
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          try {
              document.execCommand('copy');
          } catch (fallbackErr) {
              console.error('Fallback copy failed', fallbackErr);
          }
          document.body.removeChild(textArea);
      });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-md md:max-w-xl bg-white rounded-t-2xl shadow-2xl flex flex-col max-h-[90vh] h-[650px] animate-in slide-in-from-bottom duration-300">
        <div className="flex items-center justify-between p-3 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-800 ml-1">配置选择</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-full text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex p-2 gap-2 bg-gray-50 mx-3 mt-3 rounded-lg shrink-0">
          <button
            onClick={() => setActiveTab('voice')}
            className={`flex-1 py-1.5 px-4 rounded-md text-sm font-medium transition-all ${
              activeTab === 'voice' 
                ? 'bg-white text-purple-600 shadow-sm' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            选择音色
          </button>
          <button
            onClick={() => setActiveTab('model')}
            className={`flex-1 py-1.5 px-4 rounded-md text-sm font-medium transition-all ${
              activeTab === 'model' 
                ? 'bg-white text-purple-600 shadow-sm' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            选择模型
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
          
          {activeTab === 'voice' && (
            <div className="space-y-4">
              {/* Only Upload Button */}
              <button 
                onClick={() => onOpenSettings('upload')}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-purple-50 text-purple-700 rounded-xl border border-purple-100 text-sm font-medium hover:bg-purple-100 transition-colors"
              >
                 <Upload className="w-3.5 h-3.5" /> 上传音色 (Create Custom Voice)
              </button>

              <div>
                <div className="flex items-center justify-between mb-2 px-1">
                  <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">我的音色库</h4>
                  <button onClick={loadCustomVoices} disabled={isLoadingVoices}>
                    <RefreshCw className={`w-3 h-3 text-gray-400 ${isLoadingVoices ? 'animate-spin' : ''}`} />
                  </button>
                </div>
                
                {isLoadingVoices && customVoices.length === 0 ? (
                  <div className="text-sm text-gray-400 text-center py-4">加载中...</div>
                ) : voiceError ? (
                   <div className="text-sm text-red-400 text-center py-4 bg-red-50 rounded-lg border border-red-100">
                     {voiceError}
                   </div>
                ) : customVoices.length > 0 ? (
                  <div className="space-y-2">
                    {customVoices.map(voice => {
                      const isSelected = currentVoice.id === voice.id;
                      const displayName = nicknames[voice.id] || voice.name;
                      const isEditing = editingId === voice.id;

                      return (
                        <div 
                           key={voice.id}
                           onClick={() => !isEditing && onSelectVoice({ ...voice, name: displayName })}
                           className={`relative group rounded-xl border transition-all duration-200 overflow-hidden ${
                             isSelected 
                               ? 'border-purple-500 bg-purple-50/50 shadow-sm ring-1 ring-purple-200' 
                               : 'border-gray-200 hover:border-purple-200 bg-white hover:shadow-sm'
                           }`}
                        >
                            <div className="p-3 pr-8">
                                {/* Header: Name and Actions */}
                                <div className="flex justify-between items-start mb-1">
                                    <div className="flex-1 min-w-0">
                                        {isEditing ? (
                                            <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                                                <input 
                                                    autoFocus
                                                    className="w-full text-sm font-bold border-b border-purple-300 focus:outline-none bg-transparent py-0"
                                                    value={editNameValue}
                                                    onChange={e => setEditNameValue(e.target.value)}
                                                    onBlur={() => handleSaveNickname(voice.id)} // Auto-save on blur
                                                    onKeyDown={e => {
                                                        if(e.key === 'Enter') {
                                                            e.currentTarget.blur();
                                                        }
                                                        if(e.key === 'Escape') {
                                                            setEditingId(null);
                                                        }
                                                    }}
                                                />
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <span className={`font-bold text-sm truncate ${isSelected ? 'text-purple-900' : 'text-gray-700'}`}>
                                                    {displayName}
                                                </span>
                                                {/* Edit Icon */}
                                                <button 
                                                    onClick={(e) => handleStartEdit(e, voice)}
                                                    className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 text-gray-400 hover:text-purple-600"
                                                    title="Rename Locally"
                                                >
                                                    <Edit3 className="w-3 h-3" />
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    {/* Status / Selected Indicator */}
                                    {isSelected && <div className="absolute top-3 right-3 pointer-events-none"><CheckCircle className="w-4 h-4 text-purple-600" /></div>}
                                </div>

                                {/* ID - Only clickable on the code block itself */}
                                <div className="flex items-center gap-1.5 mb-2">
                                    <code 
                                        className="text-[9px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded font-mono truncate max-w-[180px] hover:bg-purple-100 hover:text-purple-600 cursor-pointer transition-colors" 
                                        title="Click to copy ID"
                                        onClick={(e) => handleCopyId(e, voice.id)}
                                    >
                                        {voice.id}
                                    </code>
                                    <span className="text-[9px] text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                        <Copy className="w-2.5 h-2.5 inline" />
                                    </span>
                                </div>

                                {/* Reference Text */}
                                {voice.referenceText && (
                                    <div className="flex gap-1.5 bg-white/60 p-1.5 rounded-md border border-gray-100/50">
                                        <Quote className="w-2.5 h-2.5 text-gray-300 shrink-0 mt-0.5" />
                                        <p className="text-[10px] text-gray-500 line-clamp-1 leading-snug select-text">
                                            {voice.referenceText}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Actions Footer */}
                            <div className="flex border-t border-gray-100 bg-gray-50/50">
                                <button 
                                    onClick={(e) => handleDelete(e, voice.id)}
                                    className="flex-1 py-1.5 text-[10px] font-medium text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors flex items-center justify-center gap-1.5"
                                >
                                    {deletingId === voice.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                                    {deletingId === voice.id ? '删除中...' : '删除音色'}
                                </button>
                            </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-sm text-gray-400 text-center py-4 bg-gray-50 rounded-lg border border-dashed border-gray-200 flex flex-col gap-2">
                    <span>暂无自定义音色</span>
                    {!apiKey && (
                        <span className="text-xs text-purple-500">
                            (请在设置菜单中配置有效的 API Key 以加载音色)
                        </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'model' && (
            <div className="space-y-2">
              {TTS_MODELS.map((model) => (
                <button
                  key={model.id}
                  onClick={() => onSelectModel(model.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                    currentModel === model.id 
                      ? 'border-purple-500 bg-purple-50' 
                      : 'border-gray-200 hover:border-purple-200 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                       currentModel === model.id ? 'bg-purple-200 text-purple-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                      <Box className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <div className={`text-sm font-semibold ${currentModel === model.id ? 'text-purple-900' : 'text-gray-700'}`}>
                        {model.name}
                      </div>
                      <div className="text-[10px] text-gray-500">{model.id}</div>
                    </div>
                  </div>
                  {currentModel === model.id && <Check className="w-4 h-4 text-purple-600" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};