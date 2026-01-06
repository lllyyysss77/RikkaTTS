import React, { useState, useEffect } from 'react';
import { X, Upload, Key, ChevronLeft, RefreshCw, Wand2, Loader2, Terminal, Scissors, Zap, Eraser, Video, FileAudio } from 'lucide-react';
import { uploadCustomVoice, transcribeAudio } from '../services/geminiService';
import { extractAudioFromVideo } from '../utils/audioUtils';
import { TTS_MODELS, TTSModelId } from '../types';

interface SettingsMenuProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  setApiKey: (key: string) => void;
  onLog: (message: string, type: 'info' | 'error' | 'success' | 'warning') => void;
  showConsole: boolean;
  setShowConsole: (show: boolean) => void;
  enableSplit: boolean;
  setEnableSplit: (enable: boolean) => void;
  enableConcurrent: boolean;
  setEnableConcurrent: (enable: boolean) => void;
  initialView?: 'main' | 'upload';
  onClearCache: () => void;
}

export const SettingsMenu: React.FC<SettingsMenuProps> = ({ 
  isOpen, 
  onClose, 
  apiKey, 
  setApiKey, 
  onLog, 
  showConsole, 
  setShowConsole,
  enableSplit,
  setEnableSplit,
  enableConcurrent,
  setEnableConcurrent,
  initialView = 'main',
  onClearCache
}) => {
  const [view, setView] = useState<'main' | 'upload'>('main');
  const [loading, setLoading] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [extractingAudio, setExtractingAudio] = useState(false);
  const [confirmClearCache, setConfirmClearCache] = useState(false);
  
  // Upload State
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [originalFileName, setOriginalFileName] = useState<string>('');
  const [uploadName, setUploadName] = useState('');
  const [uploadText, setUploadText] = useState('');
  const [uploadModel, setUploadModel] = useState<TTSModelId>(TTS_MODELS[1].id);

  useEffect(() => {
    if (isOpen) {
      // If 'list' or other unknown views are passed, default to 'main' locally since we don't have a list view here
      if (initialView === 'upload') {
          setView('upload');
      } else {
          setView('main');
      }
      setConfirmClearCache(false);
    } else {
      setTimeout(() => setView('main'), 300);
    }
  }, [isOpen, initialView]);

  const handleTranscribe = async () => {
    if (!apiKey || !apiKey.trim()) {
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

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setOriginalFileName(file.name);
      
      // Check if it's a video file based on type or extension
      if (file.type.startsWith('video/') || /\.(mp4|mov|mkv|avi|webm)$/i.test(file.name)) {
          setExtractingAudio(true);
          onLog(`Video detected: ${file.name}. Extracting audio track...`, 'info');
          
          try {
              const audioFile = await extractAudioFromVideo(file);
              setUploadFile(audioFile);
              onLog('Audio extracted from video successfully.', 'success');
          } catch (err) {
              console.error(err);
              onLog('Failed to extract audio from video. Please try a standard audio file.', 'error');
              setUploadFile(null);
          } finally {
              setExtractingAudio(false);
          }
      } else {
          // Standard audio file
          setUploadFile(file);
      }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey || !apiKey.trim()) {
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
      setOriginalFileName('');
      setView('main');
    } catch (error) {
      console.error(error);
      onLog('Upload failed: ' + (error instanceof Error ? error.message : 'Error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleClearCacheConfirm = () => {
      if (!confirmClearCache) {
          setConfirmClearCache(true);
          setTimeout(() => setConfirmClearCache(false), 3000);
          return;
      }
      onClearCache();
      onLog('Cache cleared successfully.', 'success');
      setConfirmClearCache(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div 
        className="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-md h-full bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        
        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-[#F4F6FA]">
          <div className="flex items-center gap-2">
            {view !== 'main' && (
              <button onClick={() => setView('main')} className="p-1 -ml-2 rounded-full hover:bg-gray-200">
                <ChevronLeft className="w-5 h-5 text-gray-600" />
              </button>
            )}
            <h3 className="text-lg font-bold text-gray-800">
              {view === 'main' ? '设置 & 管理' : '上传参考素材'}
            </h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          
          {view === 'main' && (
            <div className="space-y-8">
              <div className="space-y-4">
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

                {/* Split Toggle */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="flex items-center gap-2">
                     <Scissors className="w-4 h-4 text-gray-500" />
                     <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-700">自动分段 (Auto Split)</span>
                        <span className="text-[10px] text-gray-400">按换行符将文本切分为多个任务</span>
                     </div>
                  </div>
                  <button 
                    onClick={() => setEnableSplit(!enableSplit)}
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-300 ${enableSplit ? 'bg-purple-600' : 'bg-gray-300'}`}
                  >
                    <div className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ${enableSplit ? 'translate-x-5' : ''}`}></div>
                  </button>
                </div>

                {/* Concurrent Toggle */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="flex items-center gap-2">
                     <Zap className="w-4 h-4 text-gray-500" />
                     <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-700">并发生成 (Concurrent)</span>
                        <span className="text-[10px] text-gray-400">开启后同时处理所有任务 (速度快但可能限流)</span>
                     </div>
                  </div>
                  <button 
                    onClick={() => setEnableConcurrent(!enableConcurrent)}
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-300 ${enableConcurrent ? 'bg-purple-600' : 'bg-gray-300'}`}
                  >
                    <div className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ${enableConcurrent ? 'translate-x-5' : ''}`}></div>
                  </button>
                </div>

                {/* Console Toggle */}
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="flex items-center gap-2">
                     <Terminal className="w-4 h-4 text-gray-500" />
                     <span className="text-sm font-medium text-gray-700">调试控制台 (Debug Console)</span>
                  </div>
                  <button 
                    onClick={() => setShowConsole(!showConsole)}
                    className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors duration-300 ${showConsole ? 'bg-purple-600' : 'bg-gray-300'}`}
                  >
                    <div className={`bg-white w-4 h-4 rounded-full shadow-md transform duration-300 ${showConsole ? 'translate-x-5' : ''}`}></div>
                  </button>
                </div>
              </div>

              {/* Upload Button */}
              <button 
                  onClick={() => setView('upload')}
                  className="w-full flex items-center justify-center gap-3 bg-purple-50 border border-purple-100 rounded-xl py-4 hover:bg-purple-100 hover:border-purple-200 transition-all group"
              >
                  <div className="w-8 h-8 bg-purple-200 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Upload className="w-4 h-4 text-purple-700" />
                  </div>
                  <span className="font-semibold text-purple-900 text-sm">上传素材 / 创建音色 (Clone)</span>
              </button>

               {/* Clear Cache Button */}
               <div className="border-t border-gray-100 pt-6 mt-2">
                  <button 
                    onClick={handleClearCacheConfirm}
                    className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-medium transition-all ${
                        confirmClearCache 
                        ? 'bg-red-600 text-white shadow-lg animate-pulse' 
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-red-500'
                    }`}
                  >
                    <Eraser className="w-4 h-4" />
                    {confirmClearCache ? '确认清空所有历史? (Confirm)' : '清空本地缓存 (Clear Cache)'}
                  </button>
               </div>
            </div>
          )}

          {view === 'upload' && (
             <form onSubmit={handleUpload} className="space-y-4">
               {/* ... (Upload form content is unchanged) ... */}
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
                 <label className="text-xs font-bold text-gray-500 uppercase flex justify-between">
                     <span>参考素材 (音频/视频)</span>
                     {extractingAudio && <span className="text-purple-600 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin"/> 视频音频提取中...</span>}
                 </label>
                 
                 <div className="relative">
                     <input 
                        type="file" 
                        accept=".wav,.mp3,.pcm,.opus,.webm,.mp4,.mov,.mkv,.avi"
                        required={!uploadFile}
                        onChange={handleFileChange}
                        className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 disabled:opacity-50"
                        disabled={extractingAudio}
                     />
                 </div>
                 
                 {uploadFile && !extractingAudio && (
                     <div className="mt-2 p-2 bg-green-50 border border-green-100 rounded-lg flex items-center gap-2 text-xs text-green-700 animate-in fade-in zoom-in">
                         {originalFileName.match(/\.(mp4|mov|mkv|avi|webm)$/i) ? <Video className="w-4 h-4"/> : <FileAudio className="w-4 h-4"/>}
                         <div className="flex flex-col min-w-0 flex-1">
                             <span className="font-bold truncate">{uploadFile.name}</span>
                             <span className="text-[10px] opacity-70">
                                 {originalFileName !== uploadFile.name ? `Extracted from: ${originalFileName}` : 'Ready to upload'}
                             </span>
                         </div>
                     </div>
                 )}
                 
                 <p className="text-[10px] text-gray-400 mt-1">Supported: Audio (wav, mp3, etc) OR Video (mp4, mov). Video audio is automatically extracted.</p>
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
                        disabled={transcribing || !uploadFile || extractingAudio}
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
                  disabled={loading || extractingAudio}
                  className="w-full bg-[#7F56D9] text-white py-3 rounded-xl font-medium shadow-lg shadow-purple-200 hover:bg-purple-700 transition-all disabled:opacity-50 mt-4 flex items-center justify-center gap-2"
               >
                 {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
                 {loading ? 'Uploading...' : 'Upload Voice'}
               </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};