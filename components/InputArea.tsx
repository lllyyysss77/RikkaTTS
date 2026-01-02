import React, { useState } from 'react';
import { Send, Loader2 } from 'lucide-react';

interface InputAreaProps {
  onGenerate: (text: string) => void;
  isLoading: boolean;
}

export const InputArea: React.FC<InputAreaProps> = ({ onGenerate, isLoading }) => {
  const [text, setText] = useState('');

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (text.trim() && !isLoading) {
      onGenerate(text);
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
    <div className="bg-white border-t border-gray-100 p-4 pb-6 w-full max-w-3xl mx-auto fixed bottom-0 left-0 right-0 z-20">
      <div className="relative w-full">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="请输入要生成的文字..."
          className="w-full h-14 pl-4 pr-12 py-3 rounded-xl border border-purple-200 focus:border-purple-400 focus:ring-1 focus:ring-purple-400 outline-none resize-none bg-white text-gray-700 placeholder-gray-300 text-sm shadow-sm transition-all"
        />
        <button
          onClick={() => handleSubmit()}
          disabled={!text.trim() || isLoading}
          className={`absolute right-2 bottom-3 p-1.5 rounded-lg transition-colors ${
            text.trim() && !isLoading 
              ? 'bg-[#E9D7FE] text-[#7F56D9] hover:bg-[#D6BBFB]' 
              : 'bg-gray-100 text-gray-400 cursor-not-allowed'
          }`}
        >
          {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
};