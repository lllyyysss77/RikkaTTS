import React from 'react';
import { Menu } from 'lucide-react';

interface HeaderProps {
  onMenuClick: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  return (
    <header className="bg-[#7F56D9] text-white px-4 py-3 flex items-center justify-between shadow-md z-10 relative">
      <div className="flex items-center gap-2">
        {/* Stylized Logo Icon */}
        <div className="w-6 h-6 bg-white rounded-sm flex items-center justify-center">
            <div className="w-3 h-3 bg-[#7F56D9]"></div>
        </div>
        <div className="font-bold text-lg tracking-wide">Rikka-TTS</div>
      </div>
      <button 
        onClick={onMenuClick}
        className="p-1 hover:bg-white/10 rounded-md transition-colors"
      >
        <Menu className="w-6 h-6" />
      </button>
    </header>
  );
};