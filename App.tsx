import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { AudioPlayer } from './components/AudioPlayer';
import { InputArea } from './components/InputArea';
import { ModelVoiceSelector } from './components/ModelVoiceSelector';
import { SettingsMenu } from './components/SettingsMenu';
import { DebugConsole, LogEntry } from './components/DebugConsole';
import { generateSpeech } from './services/geminiService';
import { blobToBase64 } from './utils/audioUtils';
import { AudioMessage, TTS_MODELS, TTSModelId, Voice, SYSTEM_VOICES } from './types';
import { SlidersHorizontal } from 'lucide-react';

const STORAGE_KEYS = {
  API_KEY: 'SILICONFLOW_API_KEY',
  MESSAGES: 'SILICONFLOW_MESSAGES',
  SETTINGS_MODEL: 'SILICONFLOW_SETTINGS_MODEL',
  SETTINGS_VOICE: 'SILICONFLOW_SETTINGS_VOICE',
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

  // API Key State
  const [apiKey, setApiKey] = useState(() => {
    return localStorage.getItem(STORAGE_KEYS.API_KEY) || process.env.API_KEY || '';
  });

  // Helper to add logs
  const addLog = (message: string, type: 'info' | 'error' | 'success') => {
    const newLog: LogEntry = {
      id: Date.now().toString() + Math.random().toString(),
      timestamp: new Date().toLocaleTimeString(),
      message,
      type
    };
    setLogs(prev => [newLog, ...prev]);
  };

  // Load Settings and Messages from Local Storage on Mount
  useEffect(() => {
    // Load Model
    const savedModel = localStorage.getItem(STORAGE_KEYS.SETTINGS_MODEL);
    if (savedModel && TTS_MODELS.some(m => m.id === savedModel)) {
      setSelectedModel(savedModel as TTSModelId);
    }

    // Load Voice
    const savedVoiceJson = localStorage.getItem(STORAGE_KEYS.SETTINGS_VOICE);
    if (savedVoiceJson) {
      try {
        const parsedVoice = JSON.parse(savedVoiceJson);
        setSelectedVoice(parsedVoice);
      } catch (e) {
        console.error("Failed to parse saved voice", e);
      }
    }

    // Load Messages
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

  // Save Settings to Local Storage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SETTINGS_MODEL, selectedModel);
  }, [selectedModel]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SETTINGS_VOICE, JSON.stringify(selectedVoice));
  }, [selectedVoice]);

  // Save Messages to Local Storage
  useEffect(() => {
    // Saving potentially large base64 strings
    try {
      localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(messages));
    } catch (e) {
      console.error("Failed to save messages to localStorage (quota exceeded?)", e);
      addLog("Failed to save history: Local storage quota exceeded.", 'error');
    }
  }, [messages]);

  const handleSetApiKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem(STORAGE_KEYS.API_KEY, key);
  };

  const handleGenerate = async (text: string) => {
    if (!apiKey) {
      addLog('Please set your API Key in the settings menu first.', 'error');
      setIsSettingsOpen(true);
      return;
    }

    setIsLoading(true);
    addLog(`Generating speech for: "${text.substring(0, 20)}..."`, 'info');
    
    try {
      // 1. Generate Speech (returns Blob URL)
      const blobUrl = await generateSpeech(text, selectedModel, selectedVoice, apiKey);
      
      // 2. Fetch the Blob from the URL
      const response = await fetch(blobUrl);
      const blob = await response.blob();

      // 3. Convert Blob to Base64 for persistence
      const base64Audio = await blobToBase64(blob);

      const newMessage: AudioMessage = {
        id: Date.now().toString(),
        text,
        audioUrl: base64Audio, // Store base64 data URI
        createdAt: Date.now(),
      };
      
      setMessages(prev => [newMessage, ...prev]);
      addLog('Speech generated successfully.', 'success');
    } catch (error) {
      console.error(error);
      const msg = error instanceof Error ? error.message : 'Unknown error';
      addLog(`Generation failed: ${msg}`, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedModelName = TTS_MODELS.find(m => m.id === selectedModel)?.name || selectedModel;

  return (
    <div className="flex flex-col h-full bg-white font-sans relative">
      <Header onMenuClick={() => setIsSettingsOpen(true)} />
      
      {/* Sub Header / Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#F4F6FA] border-b border-gray-200 sticky top-0 z-20">
        <h2 className="text-xl font-bold text-slate-700 tracking-tight">语音生成</h2>
        
        {/* Configuration Trigger */}
        <button 
          onClick={() => setIsSelectorOpen(true)}
          className="flex items-center gap-2 bg-white border border-gray-200 rounded-full pl-4 pr-3 py-1.5 shadow-sm hover:border-purple-300 hover:shadow-md transition-all active:scale-95 group"
        >
          <div className="flex flex-col items-end leading-none mr-1">
             <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Model & Voice</span>
             <div className="flex items-center gap-1">
               <span className="text-sm font-bold text-slate-700 group-hover:text-purple-700 transition-colors">
                  {selectedModelName}
               </span>
               <span className="text-slate-300">|</span>
               <span className="text-xs font-medium text-slate-600 truncate max-w-[80px]">
                  {selectedVoice.name}
               </span>
             </div>
          </div>
          <div className="bg-gray-100 p-1.5 rounded-full group-hover:bg-purple-100 transition-colors">
             <SlidersHorizontal className="w-4 h-4 text-slate-500 group-hover:text-purple-600" />
          </div>
        </button>
      </div>

      {/* Settings Menu */}
      <SettingsMenu 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)}
        apiKey={apiKey}
        setApiKey={handleSetApiKey}
        onLog={addLog}
      />

      {/* Configuration Modal */}
      <ModelVoiceSelector 
        isOpen={isSelectorOpen}
        onClose={() => setIsSelectorOpen(false)}
        currentModel={selectedModel}
        currentVoice={selectedVoice}
        onSelectModel={(model) => setSelectedModel(model)}
        onSelectVoice={(voice) => setSelectedVoice(voice)}
        apiKey={apiKey}
      />

      {/* Content Area */}
      <main className="flex-1 overflow-y-auto px-4 py-6 pb-32 bg-white scroll-smooth">
        <div className="max-w-3xl mx-auto space-y-6">
            
          {/* Initial Demo Item matching screenshot if no history */}
          {messages.length === 0 && (
            <div className="text-center py-10 opacity-60">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">👋</div>
                <p className="text-gray-500">
                  {apiKey ? 'Select a model and voice, then type below.' : 'Please add your API Key in the menu to start.'}
                </p>
            </div>
          )}

          {/* Generated Messages */}
          {messages.map((msg) => (
            <AudioPlayer 
                key={msg.id} 
                text={msg.text} 
                audioUrl={msg.audioUrl} 
            />
          ))}

          {/* Padding for bottom input */}
          <div className="h-12"></div>
        </div>
      </main>

      <InputArea onGenerate={handleGenerate} isLoading={isLoading} />
      
      {/* Debug Console fixed at the bottom */}
      <DebugConsole logs={logs} onClear={() => setLogs([])} />
    </div>
  );
};

export default App;