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
import { SlidersHorizontal, Sparkles } from 'lucide-react';

const STORAGE_KEYS = {
  API_KEY: 'SILICONFLOW_API_KEY',
  MESSAGES: 'SILICONFLOW_MESSAGES',
  SETTINGS_MODEL: 'SILICONFLOW_SETTINGS_MODEL',
  SETTINGS_VOICE: 'SILICONFLOW_SETTINGS_VOICE',
  SHOW_CONSOLE: 'SILICONFLOW_SHOW_CONSOLE',
};

const App: React.FC = () => {
  const [messages, setMessages] = useState<AudioMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  
  // State for Model and Voice
  const [selectedModel, setSelectedModel] = useState<TTSModelId>(TTS_MODELS[0].id);
  const [selectedVoice, setSelectedVoice] = useState<Voice>(SYSTEM_VOICES[0]);
  
  // UI State
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Debug Console Visibility
  const [showConsole, setShowConsole] = useState(() => {
    return localStorage.getItem(STORAGE_KEYS.SHOW_CONSOLE) === 'true';
  });

  // API Key State
  const [apiKey, setApiKey] = useState(() => {
    return localStorage.getItem(STORAGE_KEYS.API_KEY) || process.env.API_KEY || '';
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
    // Auto-switch model if custom voice is selected on IndexTTS (Fix logic)
    if (selectedModel.includes('IndexTTS') && selectedVoice.type === 'custom') {
       // IndexTTS actually supports custom voices now based on updated service logic, 
       // but we keep the UI logic flexible.
       // The previous fix to App.tsx logic was removed in the XML output, let's just ensure
       // we load saved states correctly.
    }

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
    try {
      localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages));
    } catch (e) {
      console.error("Failed to save messages to localStorage", e);
      addLog("Failed to save history: Local storage quota exceeded.", 'error');
    }
  }, [messages]);

  const handleSetApiKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem(STORAGE_KEYS.API_KEY, key);
  };

  const handleSetShowConsole = (show: boolean) => {
    setShowConsole(show);
    localStorage.setItem(STORAGE_KEYS.SHOW_CONSOLE, String(show));
  };

  const handleStop = () => {
    if (isLoading) {
        stopGenerationRef.current = true;
        addLog("Stopping generation request...", 'info');
        // We do not set isLoading(false) here immediately, 
        // we let the generate loop break and handle the cleanup.
    }
  };

  const handleGenerate = async (text: string) => {
    if (!apiKey) {
      addLog('Please set your API Key in the settings menu first.', 'error');
      setIsSettingsOpen(true);
      return;
    }

    // Reset stop signal
    stopGenerationRef.current = false;
    setIsLoading(true);
    addLog(`Generating speech for: "${text.substring(0, 20)}..."`, 'info');
    
    try {
      // Calculate Cost
      const cost = calculateCost(text);
      let blobUrl: string | null = null;

      // Special Retry Logic for IndexTTS
      if (selectedModel.includes('IndexTTS')) {
          let attempt = 1;
          while (!stopGenerationRef.current) {
              try {
                  blobUrl = await generateSpeech(text, selectedModel, selectedVoice, apiKey);
                  break; // Success, exit loop
              } catch (error) {
                  // If user pressed stop during the request
                  if (stopGenerationRef.current) {
                      throw new Error("User manually stopped generation.");
                  }

                  const errMsg = error instanceof Error ? error.message : String(error);
                  addLog(`IndexTTS Attempt ${attempt} failed: ${errMsg}`, 'warning');
                  addLog(`Retrying automatically in 1s... (Click Stop to cancel)`, 'info');
                  
                  // Wait 1 second before retrying, but allow check for stop
                  await new Promise(resolve => setTimeout(resolve, 1000));
                  
                  // Check stop signal again after wait
                  if (stopGenerationRef.current) {
                      throw new Error("User manually stopped generation.");
                  }
                  attempt++;
              }
          }
      } else {
          // Normal generation for other models
          blobUrl = await generateSpeech(text, selectedModel, selectedVoice, apiKey);
      }
      
      if (stopGenerationRef.current) {
          throw new Error("User manually stopped generation.");
      }

      if (!blobUrl) {
          throw new Error("Failed to generate audio url.");
      }

      const response = await fetch(blobUrl);
      const blob = await response.blob();
      const base64Audio = await blobToBase64(blob);

      const newMessage: AudioMessage = {
        id: Date.now().toString(),
        text,
        audioUrl: base64Audio,
        createdAt: Date.now(),
        cost: cost // Save cost record
      };
      
      setMessages(prev => [newMessage, ...prev]);
      addLog(`Speech generated successfully. Cost: ¥${cost.toFixed(4)}`, 'success');

    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Unknown error';
      if (msg.includes("stopped")) {
          addLog("Generation stopped by user.", 'info');
      } else {
          console.error(error);
          addLog(`Generation failed: ${msg}`, 'error');
      }
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
        <Header onMenuClick={() => setIsSettingsOpen(true)} />
        
        {/* Toolbar - Optimized for Mobile */}
        <div className="flex items-center justify-between px-3 md:px-6 py-3 md:py-4 backdrop-blur-md bg-white/40 border-b border-white/50 sticky top-0 z-20 shrink-0">
          <div className="flex items-center gap-2 text-slate-700 min-w-0">
            <Sparkles className="w-5 h-5 text-purple-500 shrink-0" />
            <h2 className="text-base md:text-lg font-bold tracking-tight whitespace-nowrap overflow-hidden text-ellipsis">
              Rikka 语音终端
            </h2>
          </div>
          
          <button 
            onClick={() => setIsSelectorOpen(true)}
            className="flex items-center gap-2 md:gap-3 bg-white/70 backdrop-blur-sm border border-white/60 rounded-full pl-3 pr-1.5 md:pl-5 md:pr-2 py-1 md:py-1.5 shadow-sm hover:shadow-md hover:border-purple-200 transition-all active:scale-95 group ml-2 max-w-[60%] md:max-w-none"
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

        <SettingsMenu 
          isOpen={isSettingsOpen} 
          onClose={() => setIsSettingsOpen(false)}
          apiKey={apiKey}
          setApiKey={handleSetApiKey}
          onLog={addLog}
          showConsole={showConsole}
          setShowConsole={handleSetShowConsole}
        />

        <ModelVoiceSelector 
          isOpen={isSelectorOpen} 
          onClose={() => setIsSelectorOpen(false)}
          currentModel={selectedModel}
          currentVoice={selectedVoice}
          onSelectModel={(model) => setSelectedModel(model)}
          onSelectVoice={(voice) => setSelectedVoice(voice)}
          apiKey={apiKey}
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
                  text={msg.text} 
                  audioUrl={msg.audioUrl} 
                  cost={msg.cost}
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