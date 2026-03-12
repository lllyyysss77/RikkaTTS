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

const NICKNAME_STORAGE_KEY = 'SILICONFLOW_VOICE_NICKNAMES'; // Kept as fallback during migration

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
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  useEffect(() => {
    if (isOpen) {
      loadCustomVoices();
      setActiveTab('voice');
      // Load global nicknames from API
      fetchNicknames();
    }
  }, [isOpen]);

  const fetchNicknames = async () => {
    setSyncStatus('loading');
    try {
      console.log('🔄 Syncing global nicknames...');
      const res = await fetch(`/api/nicknames?t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        console.log('✅ Global nicknames fetched:', Object.keys(data).length);
        setNicknames(data);
        setSyncStatus('success');
      } else {
        setSyncStatus('error');
        // Fallback to local storage if API fails
        const saved = localStorage.getItem(NICKNAME_STORAGE_KEY);
        if (saved) setNicknames(JSON.parse(saved));
      }
    } catch (e) {
      setSyncStatus('error');
      console.error("Failed to load global nicknames", e);
      const saved = localStorage.getItem(NICKNAME_STORAGE_KEY);
      if (saved) setNicknames(JSON.parse(saved));
    }
  };

  const loadCustomVoices = async () => {
    if (!apiKey || !apiKey.trim()) {
      setCustomVoices([]);
      setVoiceError(null);
      return;
    }

    setIsLoadingVoices(true);
    setVoiceError(null);
    try {
      // Also refresh nicknames when reloading voices
      fetchNicknames();
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

  const handleSaveNickname = async (id: string) => {
    const newNicknames = { ...nicknames, [id]: editNameValue };
    setNicknames(newNicknames);
    
    // Save to global DB via API
    try {
      const res = await fetch('/api/nicknames', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voice_id: id, nickname: editNameValue })
      });
      if (!res.ok) throw new Error('API Rejection');
      setSyncStatus('success');
    } catch (e) {
      console.error('Failed to sync nickname globally', e);
      setSyncStatus('error');
      alert('⚠️ 全局同步失败，名称仅保存在本地。请检查 Zeabur 数据库连接。');
    }

    // Local fallback
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

    const showSuccess = () => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    };

    navigator.clipboard.writeText(id).then(() => {
      showSuccess();
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
        showSuccess();
      } catch (fallbackErr) {
        console.error('Fallback copy failed', fallbackErr);
      }
      document.body.removeChild(textArea);
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="relative w-full max-w-md md:max-w-xl bg-white rounded-t-[32px] sm:rounded-3xl shadow-2xl flex flex-col max-h-[90vh] h-[650px] animate-in slide-in-from-bottom sm:zoom-in-95 duration-300">
        <div className="flex items-center justify-between p-3 md:p-4 border-b border-gray-100 shrink-0">
          <h3 className="text-[15px] md:text-base font-bold text-gray-800 ml-1">配置选择</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-full text-gray-500">
            <X className="w-4 h-4 md:w-5 md:h-5" />
          </button>
        </div>

        <div className="flex p-1 mx-3 md:mx-4 mt-3 rounded-lg shrink-0 bg-[#E5E5EA]">
          <button
            onClick={() => setActiveTab('voice')}
            className={`flex-1 py-1.5 md:py-2 px-3 md:px-4 rounded-md text-[13px] md:text-[14px] font-semibold transition-all ${activeTab === 'voice'
              ? 'bg-white text-[#1C1C1E] shadow-sm'
              : 'text-[#8E8E93] hover:text-[#1C1C1E]'
              }`}
          >
            选择音色
          </button>
          <button
            onClick={() => setActiveTab('model')}
            className={`flex-1 py-1.5 md:py-2 px-3 md:px-4 rounded-md text-[13px] md:text-[14px] font-semibold transition-all ${activeTab === 'model'
              ? 'bg-white text-[#1C1C1E] shadow-sm'
              : 'text-[#8E8E93] hover:text-[#1C1C1E]'
              }`}
          >
            选择模型
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 md:p-3 custom-scrollbar">

          {activeTab === 'voice' && (
            <div className="space-y-3 md:space-y-4 px-1">
              {/* Only Upload Button */}
              <button
                onClick={() => onOpenSettings('upload')}
                className="w-full flex items-center justify-center gap-2 py-3 bg-[#F2F2F7] text-[#007AFF] rounded-2xl text-[15px] font-semibold active:opacity-70 transition-opacity"
              >
                <Upload className="w-4 h-4" /> 上传音色
              </button>

              <div>
                <div className="flex items-center justify-between mb-2 px-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">我的音色库</h4>
                    {syncStatus === 'loading' && <Loader2 className="w-2.5 h-2.5 text-blue-400 animate-spin" />}
                    {syncStatus === 'success' && <div className="w-1.5 h-1.5 rounded-full bg-green-500" title="已连接云端数据库" />}
                    {syncStatus === 'error' && <div className="w-1.5 h-1.5 rounded-full bg-red-500" title="数据库连接失败" />}
                  </div>
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
                          className={`relative group rounded-2xl border transition-all duration-200 overflow-hidden shrink-0 ${isSelected
                            ? 'border-[#007AFF]/30 bg-[#F2F2F7] shadow-sm'
                            : 'border-gray-100 bg-white hover:bg-gray-50'
                            }`}
                        >
                          <div className="p-3 md:p-4 pr-8">
                            {/* Header: Name and Actions */}
                            <div className="flex justify-between items-start mb-2">
                              <div className="flex-1 min-w-0">
                                {isEditing ? (
                                  <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                    <input
                                      autoFocus
                                      className="w-full text-base font-bold border-b-2 border-[#007AFF]/50 focus:bg-blue-50/50 focus:outline-none bg-transparent py-1 px-1 rounded-sm transition-colors"
                                      value={editNameValue}
                                      onChange={e => setEditNameValue(e.target.value)}
                                      onBlur={() => handleSaveNickname(voice.id)} // Auto-save on blur
                                      onKeyDown={e => {
                                        if (e.key === 'Enter') {
                                          e.currentTarget.blur();
                                        }
                                        if (e.key === 'Escape') {
                                          setEditingId(null);
                                        }
                                      }}
                                    />
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-2">
                                    <span className={`font-semibold text-[15px] truncate ${isSelected ? 'text-[#1C1C1E]' : 'text-gray-700'}`}>
                                      {displayName}
                                    </span>
                                    {/* Edit Icon */}
                                    <button
                                      onClick={(e) => handleStartEdit(e, voice)}
                                      className="opacity-0 group-hover:opacity-100 transition-opacity p-2 -ml-1 text-[#8E8E93] hover:text-[#007AFF] hover:bg-blue-50 rounded-full active:scale-95"
                                      title="重命名"
                                    >
                                      <Edit3 className="w-4 h-4" />
                                    </button>
                                  </div>
                                )}
                              </div>

                              {/* Status / Selected Indicator */}
                              {isSelected && <div className="absolute top-3 right-3 pointer-events-none"><CheckCircle className="w-5 h-5 text-[#007AFF]" /></div>}
                            </div>

                            {/* ID - Fully clickable card row */}
                            <div
                              className="flex items-center gap-1.5 md:gap-2 mb-2 md:mb-3 mt-1 cursor-pointer group/copy active:opacity-70 w-fit"
                              title="点击复制 ID"
                              onClick={(e) => handleCopyId(e, voice.id)}
                            >
                              <code
                                className="text-[11px] md:text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded font-mono truncate max-w-[220px] group-hover/copy:bg-blue-100 group-hover/copy:text-[#007AFF] transition-colors"
                              >
                                {voice.id}
                              </code>
                              <span className="text-gray-400 group-hover/copy:text-[#007AFF] transition-colors flex items-center">
                                {copiedId === voice.id ? (
                                  <CheckCircle className="w-3.5 h-3.5 md:w-4 md:h-4 text-green-500" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5 md:w-4 md:h-4" />
                                )}
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
                              className="flex-1 py-2 md:py-2.5 text-xs font-medium text-red-500 hover:bg-red-50 hover:text-red-700 transition-colors flex items-center justify-center gap-1.5 md:gap-2"
                            >
                              {deletingId === voice.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
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
                      <span className="text-xs text-[#007AFF]">
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
                  className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${currentModel === model.id
                    ? 'border-[#007AFF]/30 bg-[#F2F2F7]'
                    : 'border-gray-200 hover:bg-gray-50'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${currentModel === model.id ? 'bg-[#007AFF] text-white shadow-sm' : 'bg-gray-100 text-gray-500'
                      }`}>
                      <Box className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <div className={`text-[15px] font-semibold ${currentModel === model.id ? 'text-[#1C1C1E]' : 'text-gray-700'}`}>
                        {model.name}
                      </div>
                      <div className="text-[11px] text-gray-500 mt-0.5">{model.id}</div>
                    </div>
                  </div>
                  {currentModel === model.id && <Check className="w-5 h-5 text-[#007AFF]" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};