import React, { useState, useEffect, useRef } from 'react';
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const calculatedCost = calculateCost(text);
    const calculatedBytes = getByteLength(text);
    setCost(calculatedCost);
    setBytes(calculatedBytes);

    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'; // Reset height to recalculate shrinking
      const scrollHeight = textareaRef.current.scrollHeight;
      // Min height 44px, Max height 160px
      const newHeight = Math.min(Math.max(scrollHeight, 44), 160);
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, [text]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (text.trim()) {
      onGenerate(text);
      setText('');
      // Reset height immediately after send
      if (textareaRef.current) {
        textareaRef.current.style.height = '44px';
      }
    }
  };

  const handleRandomQuote = () => {
    const random = CHUNIBYO_QUOTES[Math.floor(Math.random() * CHUNIBYO_QUOTES.length)];
    setText(random);
  };

  return (
    <div className="shrink-0 w-full z-30 p-2 md:p-3 relative pb-safe">

      <div className="max-w-3xl mx-auto relative group">

        <div className="relative bg-white/75 backdrop-blur-[20px] saturate-[180%] rounded-[24px] shadow-[0_4px_24px_rgba(0,0,0,0.04)] border border-[#3C3C43]/10 flex flex-col overflow-hidden transition-colors duration-300">

          <div className="flex items-end pr-2 md:pr-3 py-1.5 md:py-2">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="在此输入文本..."
              rows={1}
              className="w-full min-h-[40px] pl-4 py-2 bg-transparent border-none focus:ring-0 outline-none resize-none text-[#1C1C1E] placeholder-[#8E8E93] text-[16px] leading-relaxed font-normal disabled:opacity-50 overflow-y-auto"
            />

            {/* Action Buttons grouped on the right side */}
            <div className="flex items-center gap-1 mb-1 shrink-0">
              {/* Grimoire Button */}
              <button
                onClick={handleRandomQuote}
                className="p-2 text-gray-400 hover:text-[#007AFF] hover:bg-blue-50 rounded-full transition-all active:scale-95"
                title="随机示例"
              >
                <BookOpen className="w-5 h-5" />
              </button>

              <button
                onClick={(e) => {
                  if (isLoading && !text.trim()) {
                    e.preventDefault();
                    onStop();
                  } else {
                    handleSubmit(e);
                  }
                }}
                disabled={!text.trim() && !isLoading}
                className={`flex items-center justify-center w-8 h-8 md:w-[34px] md:h-[34px] rounded-full transition-all duration-300 ${(isLoading && !text.trim())
                  ? 'bg-[#FF3B30] text-white active:opacity-70 relative overflow-hidden'
                  : text.trim()
                    ? 'bg-[#007AFF] text-white active:opacity-70 relative overflow-hidden group/btn'
                    : 'bg-[#E5E5EA] text-[#8E8E93] cursor-not-allowed'
                  }`}
              >
                {(isLoading && !text.trim()) ? (
                  <Square className="w-4 h-4 fill-current animate-pulse" />
                ) : (
                  <>
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300"></div>
                    <Send className="w-4 h-4 ml-0.5 relative z-10" />
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Info Footer (Cost & Bytes) */}
          <div className="flex items-center justify-between px-4 pb-2.5 pt-0.5 bg-transparent transition-opacity duration-200">
            <div className="flex items-center gap-3 text-[11px]">
              <div className={`flex items-center gap-1 transition-colors ${text ? 'text-[#007AFF] font-medium' : 'text-[#8E8E93]'}`}>
                <Zap className="w-3 h-3" />
                <span className="font-mono">{formatCost(cost)}</span>
              </div>
              <div className={`transition-colors font-mono ${text ? 'text-[#8E8E93]' : 'text-[#8E8E93]/70'}`}>
                {bytes} bytes
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};