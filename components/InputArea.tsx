import React, { useState, useEffect } from 'react';
import { Send, Loader2, Zap } from 'lucide-react';
import { calculateCost, formatCost, getByteLength } from '../utils/audioUtils';

interface InputAreaProps {
  onGenerate: (text: string) => void;
  onStop: () => void;
  isLoading: boolean;
}

export const InputArea: React.FC<InputAreaProps> = ({ onGenerate, onStop, isLoading }) => {
  const [text, setText] = useState('');
  const [cost, setCost] = useState(0);
  const [bytes, setBytes] = useState(0);

  useEffect(() => {
    const calculatedCost = calculateCost(text);
    const calculatedBytes = getByteLength(text);
    setCost(calculatedCost);
    setBytes(calculatedBytes);
  }, [text]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (isLoading) {
      onStop();
      return;
    }
    if (text.trim()) {
      onGenerate(text);
      // We don't clear text immediately in case of error/retry, 
      // but usually for TTS it's better to clear. 
      // Let's keep it cleared on success in App.tsx ideally, but here is fine for now.
      setText('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 p-4 bg-gradient-to-t from-white via-white/90 to-transparent pb-6 pt-10">
      <div className="max-w-3xl mx-auto relative group">
        
        {/* Glow Effect */}
        <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-400 to-indigo-400 rounded-2xl opacity-20 group-hover:opacity-40 transition duration-500 blur"></div>

        <div className="relative bg-white/80 backdrop-blur-xl rounded-xl shadow-lg border border-purple-100 flex flex-col">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="在此输入咏唱咒语 (文字)..."
            disabled={isLoading}
            className="w-full h-24 pl-5 pr-14 py-4 bg-transparent border-none focus:ring-0 outline-none resize-none text-gray-700 placeholder-gray-400/70 text-base font-medium disabled:opacity-50"
          />
          
          <div className="flex items-center justify-between px-4 pb-3 pt-1 border-t border-purple-50/50">
             {/* Billing Info */}
             <div className="flex items-center gap-3 text-xs">
                <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors ${text ? 'bg-purple-50 text-purple-700' : 'bg-gray-50 text-gray-400'}`}>
                    <Zap className="w-3 h-3" />
                    <span className="font-mono font-bold">{formatCost(cost)}</span>
                </div>
                <div className="text-gray-400 font-mono">
                    {bytes} bytes
                </div>
             </div>

             <button
              onClick={() => handleSubmit()}
              disabled={!text.trim() && !isLoading}
              className={`flex items-center justify-center gap-2 px-4 py-1.5 rounded-lg font-medium transition-all duration-300 ${
                isLoading 
                  ? 'bg-red-500 text-white shadow-md shadow-red-200 hover:bg-red-600 hover:scale-105 active:scale-95'
                  : text.trim()
                    ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-200 hover:shadow-lg hover:scale-105 active:scale-95' 
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>停止 (Stop)</span>
                </>
              ) : (
                <>
                  <span>生成</span>
                  <Send className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};