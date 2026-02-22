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
    const handleFullscreenToggle = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable fullscreen: ${err.message}`);
            });
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    };

    return (
        // Removed 'sticky top-0' to prevent scroll conflict with mobile keyboard/address bar. 
        // Now relies on App.tsx flex-col layout.
        <header className="bg-white/75 backdrop-blur-[20px] saturate-[180%] text-[#000000] px-3 py-2.5 md:px-4 md:py-3 flex items-center justify-between border-b border-[#3C3C43]/20 z-50 shrink-0">
            {/* Left: Logo & Title */}
            <div className="flex items-center gap-2.5 min-w-0">
                <button
                    onClick={handleFullscreenToggle}
                    className="w-7 h-7 sm:w-8 sm:h-8 bg-[#007AFF] hover:bg-[#0062CC] rounded-[8px] flex items-center justify-center shrink-0 transition-all active:scale-95 focus:outline-none"
                    title="切换全屏"
                >
                    <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 bg-white rounded-[4px] shadow-sm"></div>
                </button>
                <div className="flex flex-col leading-tight min-w-0 justify-center">
                    <span className="font-semibold text-[17px] tracking-tight whitespace-nowrap">Rikka-TTS</span>
                </div>
            </div>

            {/* Right: Controls */}
            <div className="flex items-center gap-1.5 sm:gap-2 pl-1">

                <button
                    onClick={onToggleAutoPlay}
                    className={`flex items-center justify-center gap-1 px-3 py-1.5 rounded-full transition-all text-[13px] sm:text-[14px] font-medium active:scale-95 ${isAutoPlayEnabled
                        ? 'bg-[#007AFF] text-white'
                        : 'bg-[#F2F2F7] text-[#8E8E93] hover:text-[#000000]'
                        }`}
                    title={isAutoPlayEnabled ? "咏唱连锁: 开启" : "咏唱连锁: 关闭"}
                >
                    <span className="whitespace-nowrap">连发</span>
                </button>

                {/* Model/Voice Selector Pill */}
                <button
                    onClick={onOpenSelector}
                    className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-[#F2F2F7] hover:bg-[#E5E5EA] rounded-full transition-colors active:scale-95 group max-w-[140px] sm:max-w-[200px]"
                    title="配置模型和音色"
                >
                    <SlidersHorizontal className="w-4 h-4 text-[#007AFF] shrink-0" />
                    <span className="text-[13px] sm:text-[14px] font-medium text-[#1C1C1E] truncate">
                        {selectedVoiceName}
                    </span>
                </button>

                {/* Menu Button */}
                <button
                    onClick={onMenuClick}
                    className="flex items-center justify-center p-2 hover:bg-[#F2F2F7] rounded-full transition-colors text-[#007AFF] active:opacity-50"
                >
                    <Menu className="w-6 h-6" />
                </button>
            </div>
        </header>
    );
};