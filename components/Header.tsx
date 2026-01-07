import React from 'react';
import { Menu, Repeat, SlidersHorizontal } from 'lucide-react';

interface HeaderProps {
  onMenuClick: () => void;
  onOpenSelector: () => void;
  onToggleAutoPlay: () => void;
  isAutoPlayEnabled: boolean;
  selectedModelName: string;
  selectedVoiceName: string;
}

export const Header: React.FC<HeaderProps> = ({ 
  onMenuClick, 
  onOpenSelector,
  onToggleAutoPlay,
  isAutoPlayEnabled,
  selectedModelName,
  selectedVoiceName
}) => {
  return (
    <header className="bg-[#7F56D9] text-white px-3 py-2 md:px-4 md:py-3 flex items-center justify-between shadow-md z-50 sticky top-0 shrink-0">
      {/* Left: Logo & Title */}
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-7 h-7 bg-white rounded-md flex items-center justify-center shrink-0 shadow-sm">
            <div className="w-3.5 h-3.5 bg-[#7F56D9] rounded-sm"></div>
        </div>
        <div className="flex flex-col leading-tight min-w-0">
            <span className="font-bold text-base md:text-lg tracking-wide whitespace-nowrap">Rikka-TTS</span>
            <span className="text-[10px] text-purple-200 font-mono hidden sm:inline-block tracking-wider">SILICONFLOW TERMINAL</span>
        </div>
      </div>

      {/* Right: Controls */}
      <div className="flex items-center gap-2 md:gap-3 pl-2">
        
        {/* Auto-Play Toggle */}
        <button 
            onClick={onToggleAutoPlay}
            className={`flex items-center justify-center w-8 h-8 rounded-full transition-all border ${
                isAutoPlayEnabled 
                ? 'bg-white text-[#7F56D9] border-white shadow-sm' 
                : 'bg-white/10 text-purple-200 border-white/20 hover:bg-white/20'
            }`}
            title={isAutoPlayEnabled ? "咏唱连锁 (Auto-Play): ON" : "咏唱连锁 (Auto-Play): OFF"}
        >
            <Repeat className="w-4 h-4" />
        </button>

        {/* Model/Voice Selector Pill (Compact) */}
        <button 
            onClick={onOpenSelector}
            className="flex items-center gap-2 bg-black/20 hover:bg-black/30 backdrop-blur-sm border border-white/10 rounded-full pl-3 pr-1.5 py-1 transition-all active:scale-95 group max-w-[140px] sm:max-w-[200px]"
        >
            <div className="flex flex-col items-end leading-none mr-0.5 overflow-hidden min-w-0 flex-1">
                <div className="flex items-center gap-1 w-full justify-end">
                    <span className="text-xs font-bold text-white truncate">
                        {selectedModelName.split('/')[1] || selectedModelName}
                    </span>
                </div>
                <div className="flex items-center gap-1 w-full justify-end mt-0.5">
                    <span className="text-[10px] text-purple-200 truncate opacity-90">
                        {selectedVoiceName}
                    </span>
                </div>
            </div>
            <div className="bg-white/20 p-1.5 rounded-full text-white shrink-0">
                <SlidersHorizontal className="w-3 h-3" />
            </div>
        </button>

        {/* Menu Button */}
        <button 
            onClick={onMenuClick}
            className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-white"
        >
            <Menu className="w-6 h-6" />
        </button>
      </div>
    </header>
  );
};