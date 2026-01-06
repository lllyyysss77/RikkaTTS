import React, { useState, useEffect } from 'react';
import { Send, Zap, BookOpen, Square } from 'lucide-react';
import { calculateCost, formatCost, getByteLength } from '../utils/audioUtils';

interface InputAreaProps {
  onGenerate: (text: string) => void;
  onStop: () => void;
  isLoading: boolean;
}

const CHUNIBYO_QUOTES = [
    "爆裂吧，现实！粉碎吧，精神！放逐这个世界！",
    "被漆黑烈焰吞噬殆尽吧！(Dark Flame Master!)",
    "错的不是我，是这个世界。",
    "以我之名，召唤古老的盟约，降临于此吧！",
    "沉睡在体内的黑龙啊，觉醒的时刻到了！",
    "这也是命运石之门的选择吗？El Psy Kongroo.",
    "邪王真眼是最强的！",
    "区区人类，竟敢直视神的威光？",
    "吾乃侍奉无上至尊之人，在此宣告汝之终焉。",
    "此时此刻，正是审判之时！",
    "不可视境界线正在发生变动...",
    "封印解除！Vanishment This World!",
    "我的右手...开始灼烧了..."
];

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
    if (text.trim()) {
      onGenerate(text);
      setText('');
    }
  };

  const handleRandomQuote = () => {
      const random = CHUNIBYO_QUOTES[Math.floor(Math.random() * CHUNIBYO_QUOTES.length)];
      setText(random);
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
            // Removed onKeyDown listener to allow Enter for new lines
            placeholder="在此输入咏唱咒语 (文字)... (按回车换行)"
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

             <div className="flex items-center gap-2">
                 {/* Grimoire Button */}
                <button
                    onClick={handleRandomQuote}
                    className="p-2 text-purple-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                    title="真理之书 (Random Quote)"
                >
                    <BookOpen className="w-4 h-4" />
                </button>

                <button
                  onClick={(e) => {
                      if (isLoading) {
                          e.preventDefault();
                          onStop();
                      } else {
                          handleSubmit(e);
                      }
                  }}
                  disabled={!text.trim() && !isLoading}
                  className={`flex items-center justify-center gap-2 px-4 py-1.5 rounded-lg font-medium transition-all duration-300 ${
                    isLoading
                      ? 'bg-red-500 text-white shadow-md shadow-red-200 hover:bg-red-600 active:scale-95'
                      : text.trim()
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-200 hover:shadow-lg hover:scale-105 active:scale-95' 
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {isLoading ? (
                    <>
                      <span>停止</span>
                      <Square className="w-3.5 h-3.5 fill-current" />
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
    </div>
  );
};