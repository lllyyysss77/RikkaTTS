import React, { useState, useEffect } from 'react';
import { X, Upload, List, Copy, Trash2, Key, ChevronLeft, RefreshCw, Wand2, Loader2, AlertTriangle } from 'lucide-react';
import { uploadCustomVoice, fetchCustomVoices, deleteCustomVoice, transcribeAudio } from '../services/geminiService';
import { TTS_MODELS, TTSModelId, Voice } from '../types';

interface SettingsMenuProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  setApiKey: (key: string) => void;
  onLog: (message: string, type: 'info' | 'error' | 'success') => void;
}

export const SettingsMenu: React.FC<SettingsMenuProps> = ({ isOpen, onClose, apiKey, setApiKey, onLog }) => {
  const [view, setView] = useState<'main' | 'upload' | 'list'>('main');
  const [loading, setLoading] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  
  // Upload State
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadName, setUploadName] = useState('');
  const [uploadText, setUploadText] = useState('');
  const [uploadModel, setUploadModel] = useState<TTSModelId>(TTS_MODELS[1].id);

  // List State
  const [voiceList, setVoiceList] = useState<Voice[]>([]);

  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => setView('main'), 300);
      setConfirmDeleteId(null);
    }
  }, [isOpen]);

  const handleFetchList = async () => {
    if (!apiKey) {
      onLog('Please enter an API Key first.', 'error');
      return;
    }

    setLoading(true);
    try {
      const list = await fetchCustomVoices(apiKey);
      setVoiceList(list);
      setView('list');
      onLog(`Fetched ${list.length} voices successfully.`, 'success');
    } catch (e) {
      console.error(e);
      onLog('Failed to fetch list: ' + (e instanceof Error ? e.message : String(e)), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleTranscribe = async () => {
    if (!apiKey) {
      onLog('Please enter an API Key first.', 'error');
      return;
    }
    if (!uploadFile) {
      onLog('Please select an audio file first.', 'error');
      return;
    }

    setTranscribing(true);
    try {
      const text = await transcribeAudio(uploadFile, apiKey);
      if (text) {
        setUploadText(text);
        onLog('Text recognition successful!', 'success');
      } else {
        onLog('Recognition completed but no text was found.', 'info');
      }
    } catch (error) {
      console.error(error);
      onLog('Transcription failed: ' + (error instanceof Error ? error.message : 'Error'), 'error');
    } finally {
      setTranscribing(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey) {
      onLog('Please enter an API Key first.', 'error');
      return;
    }
    if (!uploadFile || !uploadName || !uploadText) {
      onLog('Please fill in all fields (Name, Text, and File).', 'error');
      return;
    }

    const nameRegex = /^[a-zA-Z0-9_-]{1,64}$/;
    if (!nameRegex.test(uploadName)) {
      onLog('Invalid name format. Only letters, numbers, underscores ("_") and hyphens ("-") are allowed. Max 64 characters.', 'error');
      return;
    }
    
    setLoading(true);
    try {
      await uploadCustomVoice(uploadFile, uploadText, uploadName, uploadModel, apiKey);
      onLog('Upload successful!', 'success');
      setUploadName('');
      setUploadText('');
      setUploadFile(null);
      setView('main');
    } catch (error) {
      console.error(error);
      onLog('Upload failed: ' + (error instanceof Error ? error.message : 'Error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent, uri: string) => {
    e.preventDefault();
    e.stopPropagation();

    // If currently deleting this one, do nothing
    if (deletingId === uri) return;

    // If clicking a different button while one is confirming, reset the other
    if (confirmDeleteId && confirmDeleteId !== uri) {
        setConfirmDeleteId(null);
    }

    // Step 1: Confirm
    if (confirmDeleteId !== uri) {
        setConfirmDeleteId(uri);
        // Auto-reset confirmation after 4 seconds
        setTimeout(() => {
            setConfirmDeleteId(prev => prev === uri ? null : prev);
        }, 4000);
        return;
    }

    // Step 2: Execute
    setConfirmDeleteId(null);
    setDeletingId(uri);
    onLog(`Attempting delete for: ${uri}`, 'info');

    try {
      const result = await deleteCustomVoice(uri, apiKey);
      onLog(`Deletion successful`, 'success');
      
      // Update local state
      setVoiceList(prev => prev.filter(v => v.id !== uri));
    } catch (error) {
      console.error("Delete API failed:", error);
      onLog('Delete failed: ' + (error instanceof Error ? error.message : 'Error'), 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    onLog('Copied ID to clipboard!', 'info');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div 
        className="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      {/* Added z-10 to content to ensure it sits above backdrop contextually if needed */}
      <div className="relative z-10 w-full max-w-md h-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        
        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-[#F4F6FA]">
          <div className="flex items-center gap-2">
            {view !== 'main' && (
              <button onClick={() => setView('main')} className="p-1 -ml-2 rounded-full hover:bg-gray-200">
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
            )}
            <h3 className="text-lg font-bold text-gray-800">
              {view === 'main' ? '设置 & 管理' : view === 'upload' ? '上传参考音频' : '参考音频列表'}
            </h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          
          {view === 'main' && (
            <div className="space-y-8">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-600 flex items-center gap-2">
                  <Key className="w-4 h-4" /> API Key
                </label>
                <input 
                  type="text" 
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-200 focus:border-purple-400 outline-none text-sm font-mono text-gray-700 transition-all bg-gray-50"
                />
                <p className="text-xs text-gray-400">
                  Required for accessing SiliconFlow API services.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 h-32">
                <button 
                  onClick={() => setView('upload')}
                  className="flex flex-col items-center justify-center gap-3 bg-purple-50 border border-purple-100 rounded-2xl hover:bg-purple-100 hover:border-purple-200 transition-all group"
                >
                  <div className="w-10 h-10 bg-purple-200 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Upload className="w-5 h-5 text-purple-700" />
                  </div>
                  <span className="font-semibold text-purple-900 text-sm">上传音频</span>
                </button>

                <button 
                  onClick={handleFetchList}
                  disabled={loading}
                  className="flex flex-col items-center justify-center gap-3 bg-blue-50 border border-blue-100 rounded-2xl hover:bg-blue-100 hover:border-blue-200 transition-all group"
                >
                  <div className="w-10 h-10 bg-blue-200 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                    {loading ? <RefreshCw className="w-5 h-5 text-blue-700 animate-spin" /> : <List className="w-5 h-5 text-blue-700" />}
                  </div>
                  <span className="font-semibold text-blue-900 text-sm">管理列表</span>
                </button>
              </div>
            </div>
          )}

          {view === 'upload' && (
            <form onSubmit={handleUpload} className="space-y-4">
               {/* ... form content remains same ... */}
               <div className="space-y-1">
                 <label className="text-xs font-bold text-gray-500 uppercase">模型</label>
                 <select 
                   value={uploadModel}
                   onChange={(e) => setUploadModel(e.target.value as TTSModelId)}
                   className="w-full p-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-purple-200 outline-none"
                 >
                   {TTS_MODELS.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                 </select>
               </div>

               <div className="space-y-1">
                 <label className="text-xs font-bold text-gray-500 uppercase">音频文件</label>
                 <input 
                    type="file" 
                    accept=".wav,.mp3,.pcm,.opus,.webm"
                    required
                    onChange={e => setUploadFile(e.target.files?.[0] || null)}
                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                 />
                 <p className="text-[10px] text-gray-400 mt-1">Supported formats: wav, mp3, pcm, opus, webm</p>
               </div>

               <div className="space-y-1">
                 <label className="text-xs font-bold text-gray-500 uppercase">音色名称</label>
                 <input 
                    type="text" 
                    placeholder="e.g. my-voice-1" 
                    required
                    value={uploadName}
                    onChange={e => setUploadName(e.target.value)}
                    className="w-full p-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-200 outline-none"
                 />
                 <p className="text-[10px] text-gray-400 mt-1">Only letters, numbers, _, - allowed. Max 64 chars.</p>
               </div>

               <div className="space-y-1">
                 <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-gray-500 uppercase">参考文本</label>
                    <button 
                        type="button"
                        onClick={handleTranscribe}
                        disabled={transcribing || !uploadFile}
                        className="text-[10px] flex items-center gap-1 text-purple-600 hover:text-purple-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {transcribing ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                        自动识别文本
                    </button>
                 </div>
                 <textarea 
                    placeholder="Input text matches the audio content..." 
                    required
                    value={uploadText}
                    onChange={e => setUploadText(e.target.value)}
                    className="w-full p-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-200 outline-none h-24 resize-none"
                 />
               </div>

               <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-[#7F56D9] text-white py-3 rounded-xl font-medium shadow-lg shadow-purple-200 hover:bg-purple-700 transition-all disabled:opacity-50 mt-4 flex items-center justify-center gap-2"
               >
                 {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
                 {loading ? 'Uploading...' : 'Upload Voice'}
               </button>
            </form>
          )}

          {view === 'list' && (
            <div className="space-y-3">
              {voiceList.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <List className="w-10 h-10 mx-auto mb-2 opacity-20" />
                  No custom voices found.
                </div>
              ) : (
                voiceList.map((voice) => (
                  <div key={voice.id} className="bg-gray-50 p-3 rounded-xl border border-gray-200 group hover:border-purple-200 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-bold text-gray-700 text-sm">{voice.name}</span>
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-[10px] rounded-full font-medium">Custom</span>
                    </div>
                    <div className="text-[10px] font-mono text-gray-400 break-all bg-white p-2 rounded border border-gray-100 mb-2">
                      {voice.id}
                    </div>
                    <div className="flex gap-2">
                      <button 
                        type="button"
                        onClick={() => copyToClipboard(voice.id)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:text-purple-600 hover:border-purple-200 transition-colors active:scale-95"
                      >
                        <Copy className="w-3.5 h-3.5" /> Copy ID
                      </button>
                      <button 
                        type="button"
                        onClick={(e) => handleDelete(e, voice.id)}
                        disabled={deletingId === voice.id}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 border rounded-lg text-xs font-medium transition-all active:scale-95 ${
                            confirmDeleteId === voice.id 
                            ? 'bg-red-500 text-white border-red-600 shadow-md animate-pulse' 
                            : 'bg-white border-gray-200 text-red-500 hover:bg-red-50 hover:border-red-200'
                        } ${deletingId === voice.id ? 'opacity-50 cursor-wait' : ''}`}
                      >
                         {deletingId === voice.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 
                          confirmDeleteId === voice.id ? <AlertTriangle className="w-3.5 h-3.5" /> : 
                          <Trash2 className="w-3.5 h-3.5" />}
                         
                         {deletingId === voice.id ? 'Deleting...' : 
                          confirmDeleteId === voice.id ? 'Confirm?' : 'Delete'}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};