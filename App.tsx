// Add type declaration for process to satisfy TypeScript in Vite environment
declare const process: { env: { [key: string]: string | undefined } };

import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { AudioPlayer } from './components/AudioPlayer';
import { InputArea } from './components/InputArea';
import { ModelVoiceSelector } from './components/ModelVoiceSelector';
import { SettingsMenu } from './components/SettingsMenu';
import { DebugConsole, LogEntry } from './components/DebugConsole';
import { generateSpeech } from './services/geminiService';
import { blobToBase64, calculateCost } from './utils/audioUtils';
import { AudioMessage, TTS_MODELS, TTSModelId, Voice, SYSTEM_VOICES } from './types';
import { SlidersHorizontal, Sparkles, Repeat } from 'lucide-react';

const STORAGE_KEYS = {
  API_KEY: 'SILICONFLOW_API_KEY',
  MESSAGES: 'SILICONFLOW_MESSAGES',
  SETTINGS_MODEL: 'SILICONFLOW_SETTINGS_MODEL',
  SETTINGS_VOICE: 'SILICONFLOW_SETTINGS_VOICE',
  SHOW_CONSOLE: 'SILICONFLOW_SHOW_CONSOLE',
  ENABLE_SPLIT: 'SILICONFLOW_ENABLE_SPLIT',
  ENABLE_CONCURRENT: 'SILICONFLOW_ENABLE_CONCURRENT',
  AUTO_PLAY: 'SILICONFLOW_AUTO_PLAY',
};

const App: React.FC = () => {
  const [messages, setMessages] = useState<AudioMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  
  // State for Model and Voice
  const [selectedModel, setSelectedModel] = useState<TTSModelId>(TTS_MODELS[0].id);
  const [selectedVoice, setSelectedVoice] = useState<Voice>(SYSTEM_VOICES[0]);
  
  // Settings
  const [enableSplit, setEnableSplit] = useState(() => {
     return localStorage.getItem(STORAGE_KEYS.ENABLE_SPLIT) === 'true';
  });
  const [enableConcurrent, setEnableConcurrent] = useState(() => {
     return localStorage.getItem(STORAGE_KEYS.ENABLE_CONCURRENT) === 'true';
  });
  
  // Auto-Play (Chain Casting) State
  const [isAutoPlayEnabled, setIsAutoPlayEnabled] = useState(() => {
    return localStorage.getItem(STORAGE_KEYS.AUTO_PLAY) === 'true';
  });
  const [activePlayingId, setActivePlayingId] = useState<string | null>(null);

  // UI State
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsInitialView, setSettingsInitialView] = useState<'main' | 'upload'>('main');

  // Debug Console Visibility
  const [showConsole, setShowConsole] = useState(() => {
    return localStorage.getItem(STORAGE_KEYS.SHOW_CONSOLE) === 'true';
  });

  // API Key State - Trim on init
  const [apiKey, setApiKey] = useState(() => {
    // Only load from localStorage to ensure input box is clean by default.
    const key = localStorage.getItem(STORAGE_KEYS.API_KEY) || '';
    return key.trim();
  });

  // Ref to control stopping the generation loop
  const stopGenerationRef = useRef(false);

  const addLog = (message: string, type: 'info' | 'error' | 'success' | 'warning') => {
    const newLog: LogEntry = {
      id: Date.now().toString() + Math.random().toString(),
      timestamp: new Date().toLocaleTimeString(),
      message,
      type
    };
    setLogs(prev => [newLog, ...prev]);
  };

  useEffect(() => {
    const savedModel = localStorage.getItem(STORAGE_KEYS.SETTINGS_MODEL);
    if (savedModel && TTS_MODELS.some(m => m.id === savedModel)) {
      setSelectedModel(savedModel as TTSModelId);
    }

    const savedVoiceJson = localStorage.getItem(STORAGE_KEYS.SETTINGS_VOICE);
    if (savedVoiceJson) {
      try {
        const parsedVoice = JSON.parse(savedVoiceJson);
        setSelectedVoice(parsedVoice);
      } catch (e) {
        console.error("Failed to parse saved voice", e);
      }
    }

    const savedMessages = localStorage.getItem(STORAGE_KEYS.MESSAGES);
    if (savedMessages) {
      try {
        const parsedMessages = JSON.parse(savedMessages);
        if (Array.isArray(parsedMessages)) {
           setMessages(parsedMessages);
        }
      } catch (e) {
        console.error("Failed to parse saved messages", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SETTINGS_MODEL, selectedModel);
  }, [selectedModel]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SETTINGS_VOICE, JSON.stringify(selectedVoice));
  }, [selectedVoice]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ENABLE_SPLIT, String(enableSplit));
  }, [enableSplit]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ENABLE_CONCURRENT, String(enableConcurrent));
  }, [enableConcurrent]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.AUTO_PLAY, String(isAutoPlayEnabled));
  }, [isAutoPlayEnabled]);

  // Handle message storage with circular buffer logic
  useEffect(() => {
    const saveMessagesToStorage = () => {
        try {
            // Only save success messages to storage to avoid saving pending states
            const messagesToSave = messages.filter(m => m.status !== 'pending' && m.status !== 'error');
            localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messagesToSave));
        } catch (e) {
            if (e instanceof DOMException && 
                (e.code === 22 || e.code === 1014 || e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
                
                if (messages.length > 0) {
                    setMessages(prev => {
                        // Find oldest successful message
                        const index = prev.slice().reverse().findIndex(m => m.status === 'success');
                        if (index !== -1) {
                           const actualIndex = prev.length - 1 - index;
                           const newArr = [...prev];
                           newArr.splice(actualIndex, 1);
                           return newArr;
                        }
                        return prev.slice(0, -1);
                    }); 
                    addLog("Local storage limit reached. Oldest history item removed.", 'warning');
                }
            } else {
                console.error("Failed to save messages to localStorage", e);
            }
        }
    };
    
    const timer = setTimeout(saveMessagesToStorage, 500);
    return () => clearTimeout(timer);
  }, [messages]);

  const handleSetApiKey = (key: string) => {
    const trimmedKey = key.trim();
    setApiKey(trimmedKey);
    localStorage.setItem(STORAGE_KEYS.API_KEY, trimmedKey);
  };

  const handleSetShowConsole = (show: boolean) => {
    setShowConsole(show);
    localStorage.setItem(STORAGE_KEYS.SHOW_CONSOLE, String(show));
  };

  const handleStop = () => {
    if (isLoading) {
        stopGenerationRef.current = true;
        addLog("Stopping generation request...", 'info');
    }
  };

  const handleDeleteMessage = (id: string) => {
      setMessages(prev => prev.filter(msg => msg.id !== id));
      if (activePlayingId === id) setActivePlayingId(null);
  };

  const handleClearCache = () => {
      setMessages([]);
      localStorage.removeItem(STORAGE_KEYS.MESSAGES);
      setActivePlayingId(null);
      addLog("All history cleared.", 'success');
  };

  const handleOpenSettings = (view: 'upload') => {
      setIsSelectorOpen(false);
      setSettingsInitialView(view);
      setIsSettingsOpen(true);
  };

  // Logic for Auto-Play / Chain Casting
  const handleAudioPlay = (id: string) => {
      setActivePlayingId(id);
  };

  const handleAudioEnded = (endedId: string) => {
      if (!isAutoPlayEnabled) {
          setActivePlayingId(null);
          return;
      }

      // Find current index
      const currentIndex = messages.findIndex(m => m.id === endedId);
      if (currentIndex === -1) return;

      // In the current list structure, index 0 is the NEWEST message.
      const nextIndex = currentIndex + 1;
      
      if (nextIndex < messages.length) {
          const nextMessage = messages[nextIndex];
          if (nextMessage.status === 'success') {
              addLog(`Auto-playing next: ${nextMessage.text.substring(0, 10)}...`, 'info');
              setActivePlayingId(nextMessage.id);
          } else {
              setActivePlayingId(null);
          }
      } else {
          setActivePlayingId(null);
          addLog("End of playlist reached.", 'info');
      }
  };

  const processSingleTask = async (task: {id: string, text: string}) => {
     const startTime = Date.now();
     const cost = calculateCost(task.text);
     let blobUrl: string | null = null;

     // Special Retry Logic for IndexTTS
     if (selectedModel.includes('IndexTTS')) {
          let attempt = 1;
          while (!stopGenerationRef.current) {
              try {
                  blobUrl = await generateSpeech(task.text, selectedModel, selectedVoice, apiKey);
                  break; 
              } catch (error) {
                  if (stopGenerationRef.current) throw new Error("User manually stopped generation.");
                  
                  const errMsg = error instanceof Error ? error.message : String(error);
                  
                  // If we are retrying, we might want to update status but 'pending' is fine.
                  addLog(`IndexTTS Attempt ${attempt} failed: ${errMsg}`, 'warning');
                  
                  await new Promise(resolve => setTimeout(resolve, 1000));
                  
                  if (stopGenerationRef.current) throw new Error("User manually stopped generation.");
                  attempt++;
              }
          }
      } else {
          blobUrl = await generateSpeech(task.text, selectedModel, selectedVoice, apiKey);
      }
      
      if (stopGenerationRef.current) throw new Error("Stopped");
      if (!blobUrl) throw new Error("Failed to generate audio url.");

      const response = await fetch(blobUrl);
      const blob = await response.blob();
      const base64Audio = await blobToBase64(blob);
      const endTime = Date.now();

      // Update message with success
      setMessages(prev => prev.map(msg => 
          msg.id === task.id ? {
            ...msg,
            audioUrl: base64Audio,
            cost: cost,
            generationTime: endTime - startTime,
            status: 'success'
          } : msg
      ));
      
      addLog(`Generated "${task.text.substring(0, 15)}..." (Time: ${((endTime - startTime)/1000).toFixed(2)}s)`, 'success');
  };

  const handleGenerate = async (text: string) => {
    // Strict check for empty or whitespace-only key
    if (!apiKey || !apiKey.trim()) {
      addLog('Please set your API Key in the settings menu first.', 'error');
      setIsSettingsOpen(true);
      return;
    }

    stopGenerationRef.current = false;
    setIsLoading(true);

    try {
        let textsToGenerate: string[] = [];

        if (enableSplit) {
            textsToGenerate = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
            if (textsToGenerate.length === 0) {
                 addLog("No valid text found after splitting lines.", 'warning');
                 setIsLoading(false);
                 return;
            }
            addLog(`Splitting enabled. Processing ${textsToGenerate.length} segments.`, 'info');
        } else {
            textsToGenerate = [text];
            addLog(`Generating speech...`, 'info');
        }

        // 1. Create Placeholder Cards Immediately
        const tasks = textsToGenerate.map(t => ({
            id: Date.now().toString() + Math.random().toString().slice(2, 6),
            text: t
        }));

        const newPlaceholders: AudioMessage[] = tasks.map(t => ({
            id: t.id,
            text: t.text,
            audioUrl: '',
            createdAt: Date.now(),
            status: 'pending'
        }));

        setMessages(prev => [...newPlaceholders, ...prev]);

        // 2. Execute Tasks (Concurrent or Sequential)
        if (enableConcurrent) {
             const promises = tasks.map(async (task) => {
                if (stopGenerationRef.current) return;
                try {
                    await processSingleTask(task);
                } catch (e) {
                    const msg = e instanceof Error ? e.message : 'Unknown error';
                    if (msg === "Stopped") return;
                    
                    setMessages(prev => prev.map(m => m.id === task.id ? {
                        ...m, status: 'error', errorMessage: msg
                    } : m));
                    
                    addLog(`Failed to generate: ${msg}`, 'error');
                }
             });
             
             await Promise.all(promises);

        } else {
             for (const task of tasks) {
                 if (stopGenerationRef.current) break;
                 try {
                     await processSingleTask(task);
                 } catch (e) {
                     const msg = e instanceof Error ? e.message : 'Unknown error';
                     if (msg === "Stopped" || msg.includes("stopped")) {
                         addLog("Generation stopped by user.", 'info');
                         break;
                     }
                     
                     setMessages(prev => prev.map(m => m.id === task.id ? {
                        ...m, status: 'error', errorMessage: msg
                     } : m));

                     addLog(`Failed to generate: ${msg}`, 'error');
                 }
             }
        }
        
        // Cleanup stopped items if necessary (optional)
        if (stopGenerationRef.current) {
            setMessages(prev => prev.filter(m => m.status !== 'pending'));
        }

    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
      stopGenerationRef.current = false;
    }
  };

  const selectedModelName = TTS_MODELS.find(m => m.id === selectedModel)?.name || selectedModel;

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-[#F5F7FA] via-[#F3F0FF] to-[#E6E6FA] font-sans relative overflow-hidden">
      
      {/* Background Ambience */}
      <div className="fixed top-0 left-0 w-full h-96 bg-gradient-to-b from-purple-100/50 to-transparent pointer-events-none z-0"></div>
      
      <div className="z-10 flex flex-col h-full">
        <Header onMenuClick={() => {
            setSettingsInitialView('main');
            setIsSettingsOpen(true);
        }} />
        
        {/* Toolbar - Optimized for Mobile */}
        <div className="flex items-center justify-between px-3 md:px-6 py-3 md:py-4 backdrop-blur-md bg-white/40 border-b border-white/50 sticky top-0 z-20 shrink-0 gap-2">
          <div className="flex items-center gap-2 text-slate-700 min-w-0 flex-1">
            <Sparkles className="w-5 h-5 text-purple-500 shrink-0" />
            <h2 className="text-base md:text-lg font-bold tracking-tight whitespace-nowrap overflow-hidden text-ellipsis">
              Rikka 语音终端
            </h2>
          </div>
          
          {/* Controls Group */}
          <div className="flex items-center gap-2">
            {/* Auto-Play Toggle */}
            <button 
                onClick={() => setIsAutoPlayEnabled(!isAutoPlayEnabled)}
                className={`flex items-center justify-center p-2 rounded-full transition-all border ${
                    isAutoPlayEnabled 
                    ? 'bg-purple-100 text-purple-600 border-purple-200 shadow-inner' 
                    : 'bg-white/70 text-gray-400 border-white/60 hover:text-purple-500'
                }`}
                title={isAutoPlayEnabled ? "咏唱连锁 (Auto-Play): ON" : "咏唱连锁 (Auto-Play): OFF"}
            >
                <Repeat className="w-4 h-4" />
            </button>

            {/* Model Config Button */}
            <button 
                onClick={() => setIsSelectorOpen(true)}
                className="flex items-center gap-2 md:gap-3 bg-white/70 backdrop-blur-sm border border-white/60 rounded-full pl-3 pr-1.5 md:pl-5 md:pr-2 py-1 md:py-1.5 shadow-sm hover:shadow-md hover:border-purple-200 transition-all active:scale-95 group ml-2 max-w-[140px] md:max-w-none"
            >
                <div className="flex flex-col items-end leading-none mr-1 overflow-hidden">
                    <span className="text-[9px] md:text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-0.5 hidden sm:block">Configuration</span>
                    <div className="flex items-center gap-1.5 w-full justify-end">
                        <span className="text-xs md:text-sm font-bold text-slate-700 group-hover:text-purple-700 transition-colors truncate">
                            {selectedModelName.split('/')[1] || selectedModelName}
                        </span>
                        <span className="text-slate-300 hidden sm:inline">/</span>
                        <span className="text-[10px] md:text-xs font-medium text-slate-600 truncate max-w-[60px] md:max-w-[100px] hidden sm:inline">
                            {selectedVoice.name}
                        </span>
                    </div>
                </div>
                <div className="bg-purple-50 p-1.5 md:p-2 rounded-full group-hover:bg-purple-100 text-purple-500 group-hover:text-purple-600 transition-colors shrink-0">
                    <SlidersHorizontal className="w-3.5 h-3.5 md:w-4 md:h-4" />
                </div>
            </button>
          </div>
        </div>

        <SettingsMenu 
          isOpen={isSettingsOpen} 
          onClose={() => setIsSettingsOpen(false)}
          apiKey={apiKey}
          setApiKey={handleSetApiKey}
          onLog={addLog}
          showConsole={showConsole}
          setShowConsole={handleSetShowConsole}
          enableSplit={enableSplit}
          setEnableSplit={setEnableSplit}
          enableConcurrent={enableConcurrent}
          setEnableConcurrent={setEnableConcurrent}
          initialView={settingsInitialView}
          onClearCache={handleClearCache}
        />

        <ModelVoiceSelector 
          isOpen={isSelectorOpen} 
          onClose={() => setIsSelectorOpen(false)}
          currentModel={selectedModel}
          currentVoice={selectedVoice}
          onSelectModel={(model) => setSelectedModel(model)}
          onSelectVoice={(voice) => setSelectedVoice(voice)}
          apiKey={apiKey}
          onOpenSettings={handleOpenSettings}
        />

        <main className="flex-1 overflow-y-auto px-3 md:px-4 py-4 md:py-8 pb-48 scroll-smooth custom-scrollbar">
          <div className="max-w-3xl mx-auto space-y-4 md:space-y-6">
            
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 md:py-20 text-center animate-in fade-in zoom-in duration-500 mt-10">
                  <div className="w-20 h-20 md:w-24 md:h-24 bg-gradient-to-tr from-purple-100 to-indigo-100 rounded-full flex items-center justify-center mb-6 shadow-inner relative overflow-hidden">
                    <div className="absolute inset-0 bg-white/30 backdrop-blur-sm"></div>
                    <span className="text-4xl md:text-5xl relative z-10">🔮</span>
                  </div>
                  <h3 className="text-lg md:text-xl font-bold text-gray-800 mb-2">等待咏唱指令</h3>
                  <p className="text-sm md:text-base text-gray-500 max-w-xs md:max-w-sm px-4">
                    {apiKey ? '请在下方输入文字，连接不可视境界线...' : '请先点击右上角菜单设置 API Key，开启魔力回路。'}
                  </p>
              </div>
            )}

            {messages.map((msg) => (
              <AudioPlayer 
                  key={msg.id}
                  id={msg.id}
                  text={msg.text} 
                  audioUrl={msg.audioUrl} 
                  cost={msg.cost}
                  generationTime={msg.generationTime}
                  status={msg.status}
                  errorMessage={msg.errorMessage}
                  onDelete={handleDeleteMessage}
                  // Auto-Play Props
                  isActive={activePlayingId === msg.id}
                  onPlay={() => handleAudioPlay(msg.id)}
                  onEnded={() => handleAudioEnded(msg.id)}
              />
            ))}

            <div className="h-12"></div>
          </div>
        </main>

        <InputArea 
            onGenerate={handleGenerate} 
            onStop={handleStop}
            isLoading={isLoading} 
        />
        
        {showConsole && <DebugConsole logs={logs} onClear={() => setLogs([])} />}
      </div>
    </div>
  );
};

export default App;