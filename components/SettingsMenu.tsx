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
  const [uploadModel, setUploadModel] = useState<TTSModelId>(TTS_MODELS[0].id);

  useEffect(() => {
    if (isOpen) {
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
    <div className="fixed inset-0 z-50 flex justify-end sm:justify-center sm:items-center sm:p-4">
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-md h-full sm:h-auto sm:max-h-[90vh] sm:rounded-[32px] bg-[#F2F2F7] shadow-2xl flex flex-col animate-in slide-in-from-right sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300 overflow-hidden">

        <div className="flex flex-col gap-1 items-center justify-center relative p-3.5 border-b border-[#3C3C43]/10 bg-[#F2F2F7] shrink-0">
          {view !== 'main' && (
            <button
              onClick={() => setView('main')}
              className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 px-2 py-1 text-[#007AFF] hover:opacity-70 transition-opacity"
            >
              <ChevronLeft className="w-5 h-5 -ml-1" />
              <span className="text-[17px]">返回</span>
            </button>
          )}
          <h3 className="text-[17px] font-semibold text-[#000000] tracking-tight">
            {view === 'main' ? '设置' : '上传音色'}
          </h3>
          <button
            onClick={onClose}
            className="absolute right-3 top-1/2 -translate-y-1/2 bg-[#E5E5EA] text-[#8E8E93] hover:bg-[#D1D1D6] rounded-full p-1 transition-colors"
          >
            <X className="w-4 h-4 md:w-5 md:h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">

          {view === 'main' && (
            <div className="space-y-8">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-[13px] font-normal text-[#8E8E93] uppercase ml-4 flex items-center gap-1.5">
                    API 密钥
                  </label>
                  <div className="bg-white rounded-[10px] overflow-hidden">
                    <input
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="在此输入您的 API 密钥..."
                      className="w-full px-4 py-3 text-[17px] text-[#000000] placeholder-[#C7C7CC] outline-none bg-transparent"
                    />
                  </div>
                  <p className="text-[13px] text-[#8E8E93] ml-4 mt-2">
                    访问硅基流动 (SiliconFlow) 服务所必需的凭据。
                  </p>
                </div>

                <div className="bg-white rounded-[10px] overflow-hidden">

                  {/* Split Toggle */}
                  <div className="flex items-center pl-4 bg-white active:bg-[#E5E5EA] transition-colors">
                    <div className="w-[28px] h-[28px] bg-[#007AFF] rounded-[7px] flex items-center justify-center shrink-0 mr-3.5">
                      <Scissors className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex flex-1 items-center justify-between py-2.5 pr-4 border-b border-[#3C3C43]/10 min-h-[44px]">
                      <div className="flex flex-col py-0.5 mr-2">
                        <span className="text-[17px] text-[#000000] tracking-tight">自动分段</span>
                        <span className="text-[13px] text-[#8E8E93] leading-tight mt-0.5">按换行符将文本切分为多个任务</span>
                      </div>
                      <button
                        onClick={() => setEnableSplit(!enableSplit)}
                        className={`w-[51px] h-[31px] rounded-full p-0.5 transition-colors duration-300 shrink-0 ${enableSplit ? 'bg-[#34C759]' : 'bg-[#E9E9EB]'}`}
                      >
                        <div className={`bg-white w-[27px] h-[27px] rounded-full shadow-[0_3px_8px_rgba(0,0,0,0.15)] transform duration-300 ease-out ${enableSplit ? 'translate-x-[20px]' : 'translate-x-0'}`}></div>
                      </button>
                    </div>
                  </div>

                  {/* Concurrent Toggle */}
                  <div className="flex items-center pl-4 bg-white active:bg-[#E5E5EA] transition-colors">
                    <div className="w-[28px] h-[28px] bg-[#FF9500] rounded-[7px] flex items-center justify-center shrink-0 mr-3.5">
                      <Zap className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex flex-1 items-center justify-between py-2.5 pr-4 border-b border-[#3C3C43]/10 min-h-[44px]">
                      <div className="flex flex-col py-0.5 mr-2">
                        <span className="text-[17px] text-[#000000] tracking-tight">并发生成</span>
                        <span className="text-[13px] text-[#8E8E93] leading-tight mt-0.5">开启后同时处理所有任务</span>
                      </div>
                      <button
                        onClick={() => setEnableConcurrent(!enableConcurrent)}
                        className={`w-[51px] h-[31px] rounded-full p-0.5 transition-colors duration-300 shrink-0 ${enableConcurrent ? 'bg-[#34C759]' : 'bg-[#E9E9EB]'}`}
                      >
                        <div className={`bg-white w-[27px] h-[27px] rounded-full shadow-[0_3px_8px_rgba(0,0,0,0.15)] transform duration-300 ease-out ${enableConcurrent ? 'translate-x-[20px]' : 'translate-x-0'}`}></div>
                      </button>
                    </div>
                  </div>

                  {/* Console Toggle (No Bottom Border) */}
                  <div className="flex items-center pl-4 bg-white active:bg-[#E5E5EA] transition-colors">
                    <div className="w-[28px] h-[28px] bg-[#5856D6] rounded-[7px] flex items-center justify-center shrink-0 mr-3.5">
                      <Terminal className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex flex-1 items-center justify-between py-2.5 pr-4 min-h-[44px]">
                      <div className="flex flex-col py-0.5 mr-2">
                        <span className="text-[17px] text-[#000000] tracking-tight">调试控制台</span>
                      </div>
                      <button
                        onClick={() => setShowConsole(!showConsole)}
                        className={`w-[51px] h-[31px] rounded-full p-0.5 transition-colors duration-300 shrink-0 ${showConsole ? 'bg-[#34C759]' : 'bg-[#E9E9EB]'}`}
                      >
                        <div className={`bg-white w-[27px] h-[27px] rounded-full shadow-[0_3px_8px_rgba(0,0,0,0.15)] transform duration-300 ease-out ${showConsole ? 'translate-x-[20px]' : 'translate-x-0'}`}></div>
                      </button>
                    </div>
                  </div>

                </div>
              </div>

              {/* Upload & Clear buttons - grouped closely */}
              <div className="space-y-4">
                <button
                  onClick={() => setView('upload')}
                  className="w-full flex items-center justify-center gap-2 bg-white rounded-[10px] py-3.5 hover:bg-[#E5E5EA] transition-colors active:opacity-70"
                >
                  <Upload className="w-5 h-5 text-[#007AFF]" />
                  <span className="font-semibold text-[#007AFF] text-[17px]">上传参考素材</span>
                </button>

                <div className="bg-white rounded-[10px] overflow-hidden">
                  <button
                    onClick={handleClearCacheConfirm}
                    className={`w-full flex items-center justify-center gap-2 py-3.5 font-semibold transition-colors active:opacity-70 ${confirmClearCache
                      ? 'bg-[#FF3B30] text-white'
                      : 'bg-white text-[#FF3B30] hover:bg-[#E5E5EA]'
                      }`}
                  >
                    {confirmClearCache ? '确认清空所有历史?' : '清空本地缓存'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {view === 'upload' && (
            <form onSubmit={handleUpload} className="space-y-4">
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
                  {extractingAudio && <span className="text-[#007AFF] flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> 视频音频提取中...</span>}
                </label>

                <div className="relative">
                  <input
                    type="file"
                    accept=".wav,.mp3,.pcm,.opus,.webm,.mp4,.mov,.mkv,.avi"
                    required={!uploadFile}
                    onChange={handleFileChange}
                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-[#007AFF] hover:file:bg-blue-100 disabled:opacity-50"
                    disabled={extractingAudio}
                  />
                </div>

                {uploadFile && !extractingAudio && (
                  <div className="mt-2 p-2 bg-green-50 border border-green-100 rounded-xl flex items-center gap-2 text-xs text-green-700 animate-in fade-in zoom-in">
                    {originalFileName.match(/\.(mp4|mov|mkv|avi|webm)$/i) ? <Video className="w-4 h-4" /> : <FileAudio className="w-4 h-4" />}
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
                  required
                  value={uploadName}
                  onChange={e => setUploadName(e.target.value)}
                  className="w-full p-2 border-none shadow-sm rounded-xl text-sm focus:ring-2 focus:ring-[#007AFF] outline-none"
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
                    className="text-[10px] flex items-center gap-1 text-[#007AFF] hover:text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {transcribing ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                    自动识别文本
                  </button>
                </div>
                <textarea
                  required
                  value={uploadText}
                  onChange={e => setUploadText(e.target.value)}
                  className="w-full p-2 border-none shadow-sm rounded-xl text-sm focus:ring-2 focus:ring-[#007AFF] outline-none h-24 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading || extractingAudio}
                className="w-full bg-[#007AFF] text-white py-3.5 rounded-2xl font-semibold shadow-sm hover:bg-blue-600 transition-all disabled:opacity-50 mt-4 flex items-center justify-center gap-2"
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